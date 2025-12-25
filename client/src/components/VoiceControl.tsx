import { useCallback, useEffect, useRef, useState } from 'react';
import './VoiceControl.css';

interface VoiceControlProps {
  userId: string;
  onStateChange?: (state: {
    isConnected: boolean;
    isListening: boolean;
    isSpeaking: boolean;
  }) => void;
  onEmotionsDetected?: (emotions: Array<{ name: string; score: number }>) => void;
  onConnectRef?: React.MutableRefObject<(() => void) | null>;
  onDisconnectRef?: React.MutableRefObject<(() => void) | null>;
}

// WebSocket URL - Python server for local dev, Node.js server for production
const getWebSocketUrl = () => {
  // Check if we're in development mode
  const isDev = import.meta.env?.DEV ?? window.location.hostname === 'localhost';
  if (isDev) {
    // Local development: use Python server
    return 'ws://localhost:8765';
  }
  // Production: use Node.js WebSocket at /ws/hume
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/hume`;
};
const WS_URL = getWebSocketUrl();
const FRAME_INTERVAL_MS = 1000; // Send a frame every 1 second

const VoiceControl = ({
  userId: _userId,
  onStateChange,
  onEmotionsDetected,
  onConnectRef,
  onDisconnectRef,
}: VoiceControlProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [showPictureModal, setShowPictureModal] = useState(false);
  const [transcript, setTranscript] = useState<string[]>([]);
  const [_status, setStatus] = useState('Tap avatar to connect');
  const [topEmotions, setTopEmotions] = useState<Array<{ name: string; score: number }>>([]);

  const wsRef = useRef<WebSocket | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pictureVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pictureStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  // Audio refs for production mode
  const audioContextRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const nextPlayTimeRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  // Notify parent component of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange({ isConnected, isListening, isSpeaking });
    }
  }, [isConnected, isListening, isSpeaking, onStateChange]);

  // Expose connect/disconnect functions to parent
  useEffect(() => {
    if (onConnectRef) {
      onConnectRef.current = connect;
    }
    if (onDisconnectRef) {
      onDisconnectRef.current = disconnect;
    }
  });

  // Check if we're in production (not using Python server)
  const isProduction = !WS_URL.includes('localhost:8765');

  // Resample audio from source rate to target rate
  const resampleAudio = useCallback(
    (inputData: Float32Array, sourceRate: number, targetRate: number): Float32Array => {
      if (sourceRate === targetRate) return inputData;
      const ratio = sourceRate / targetRate;
      const outputLength = Math.floor(inputData.length / ratio);
      const output = new Float32Array(outputLength);
      for (let i = 0; i < outputLength; i++) {
        output[i] = inputData[Math.floor(i * ratio)];
      }
      return output;
    },
    []
  );

  // Start microphone capture for production mode
  // Hume EVI expects: linear16 PCM, 16kHz, mono
  const startMicrophoneCapture = useCallback(async () => {
    if (!isProduction) return; // Python server handles audio in dev

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;

      // Use device's native sample rate (browser may not support 16kHz)
      audioContextRef.current = new AudioContext();
      const actualSampleRate = audioContextRef.current.sampleRate;
      console.log(`🎤 Audio context sample rate: ${actualSampleRate}Hz`);

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const rawData = e.inputBuffer.getChannelData(0);

        // Resample to 16kHz if needed (Hume expects 16kHz)
        const inputData: Float32Array =
          actualSampleRate !== 16000
            ? resampleAudio(rawData, actualSampleRate, 16000)
            : new Float32Array(rawData);

        // Convert Float32 to Int16 (little-endian)
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }

        // Convert to base64
        const bytes = new Uint8Array(int16Data.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);

        wsRef.current.send(
          JSON.stringify({
            type: 'audio_input',
            data: base64,
          })
        );
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);
      setIsListening(true);
      console.log('🎤 Microphone capture started');
    } catch (err) {
      console.error('Failed to start microphone:', err);
    }
  }, [isProduction, resampleAudio]);

  // Stop microphone capture
  const stopMicrophoneCapture = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Process audio queue for smooth playback
  const processAudioQueue = useCallback(() => {
    if (!audioContextRef.current || audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }

    isPlayingRef.current = true;
    setIsSpeaking(true);

    const floatData = audioQueueRef.current.shift()!;
    const audioBuffer = audioContextRef.current.createBuffer(1, floatData.length, 24000);
    audioBuffer.getChannelData(0).set(floatData);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);

    // Schedule playback to avoid gaps
    const currentTime = audioContextRef.current.currentTime;
    const startTime = Math.max(currentTime, nextPlayTimeRef.current);
    source.start(startTime);
    nextPlayTimeRef.current = startTime + audioBuffer.duration;

    source.onended = () => {
      if (audioQueueRef.current.length > 0) {
        processAudioQueue();
      } else {
        isPlayingRef.current = false;
        setIsSpeaking(false);
      }
    };
  }, []);

  // Play audio from Hume (production mode)
  // Hume sends audio at 24kHz sample rate as raw PCM Int16 little-endian
  const playAudioChunk = useCallback(
    async (base64Audio: string) => {
      if (!isProduction) return; // Python server handles audio in dev

      try {
        // Decode base64 to ArrayBuffer
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Create audio context if needed
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioContext();
          nextPlayTimeRef.current = 0;
        }

        // Hume sends raw PCM Int16 at 24kHz, convert to Float32
        const int16Data = new Int16Array(bytes.buffer);
        const floatData = new Float32Array(int16Data.length);
        for (let i = 0; i < int16Data.length; i++) {
          floatData[i] = int16Data[i] / 32768;
        }

        // Add to queue
        audioQueueRef.current.push(floatData);

        // Start processing if not already
        if (!isPlayingRef.current) {
          processAudioQueue();
        }
      } catch (err) {
        console.error('Error playing audio:', err);
      }
    },
    [isProduction, processAudioQueue]
  );

  // Capture and send webcam frame
  const captureAndSendFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 JPEG
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const base64Data = dataUrl.split(',')[1];

    // Send to Python server for expression analysis
    wsRef.current.send(
      JSON.stringify({
        type: 'face_frame',
        data: base64Data,
      })
    );
  }, []);

  // Start webcam for facial expression detection (front camera)
  const startExpressionCamera = async () => {
    try {
      // Stop any existing frame interval
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      // Stop existing stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraOn(true);

      // Notify server that camera was just enabled
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'camera_enabled' }));
        console.log('📷 Sent camera_enabled to server');
      }

      // Wait a moment for video to be ready, then capture first frame immediately
      await new Promise((resolve) => setTimeout(resolve, 300));
      captureAndSendFrame();

      // Start sending frames periodically for expression analysis
      frameIntervalRef.current = window.setInterval(captureAndSendFrame, FRAME_INTERVAL_MS);
      console.log('📷 Expression camera started (front)');
    } catch (error) {
      console.error('Error starting expression camera:', error);
    }
  };

  // Open picture modal with rear camera viewfinder
  const openPictureModal = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'environment' },
      });
      pictureStreamRef.current = stream;
      setShowPictureModal(true);

      // Wait for modal to render, then attach stream to video
      setTimeout(() => {
        if (pictureVideoRef.current) {
          pictureVideoRef.current.srcObject = stream;
          pictureVideoRef.current.play();
        }
      }, 100);
    } catch (error) {
      console.error('Error opening picture camera:', error);
    }
  };

  // Close picture modal and stop camera
  const closePictureModal = () => {
    if (pictureStreamRef.current) {
      pictureStreamRef.current.getTracks().forEach((track) => track.stop());
      pictureStreamRef.current = null;
    }
    setShowPictureModal(false);
  };

  // Capture the picture and send to Novo
  const capturePicture = () => {
    if (pictureVideoRef.current && canvasRef.current && wsRef.current) {
      const video = pictureVideoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const base64Data = dataUrl.split(',')[1];

        wsRef.current.send(
          JSON.stringify({
            type: 'picture',
            data: base64Data,
          })
        );
        console.log('📸 Picture captured and sent to Novo');
      }
    }
    closePictureModal();
  };

  // Stop webcam capture
  const stopWebcam = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  };

  const connect = async () => {
    try {
      setStatus('Connecting to NoVo...');
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('✅ Connected to NoVo server');
        setStatus('Waiting for Hume...');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Don't log noisy messages
          if (!['emotions_detected', 'audio_output'].includes(data.type)) {
            console.log('📥 Server:', data.type);
          }

          switch (data.type) {
            // Python server events (dev mode)
            case 'connected':
              setIsConnected(true);
              setIsListening(true);
              setStatus('Connected - Speak now!');
              break;
            case 'speaking_start':
              setIsSpeaking(true);
              setIsListening(false);
              setStatus('NoVo is speaking...');
              break;
            case 'speaking_end':
              setIsSpeaking(false);
              setIsListening(true);
              setStatus('Listening...');
              break;
            // Node.js server events (production mode)
            case 'connection_status':
              if (data.status === 'connected') {
                setIsConnected(true);
                setStatus('Connected - Speak now!');
                startMicrophoneCapture();
              } else {
                setIsConnected(false);
                setStatus('Disconnected');
                stopMicrophoneCapture();
              }
              break;
            case 'audio_output':
              // Play audio from Hume (production mode)
              if (data.data) {
                playAudioChunk(data.data);
              }
              break;
            case 'user_message': {
              // Strip out [SYSTEM CONTEXT: ...] prefix if present
              let content = data.message?.content || data.content || '';
              const contextMatch = content.match(/^\[SYSTEM CONTEXT:.*?\]\s*/);
              if (contextMatch) {
                content = content.substring(contextMatch[0].length);
              }
              if (content) {
                setTranscript((prev) => [...prev, `You: ${content}`]);
              }
              break;
            }
            case 'assistant_message':
              // Hume sends content in data.message.content
              const assistantContent = data.message?.content || data.content || '';
              if (assistantContent) {
                setTranscript((prev) => [...prev, `NoVo: ${assistantContent}`]);
              }
              break;
            case 'emotions_detected':
              // Update top emotions display
              if (data.emotions && data.emotions.length > 0) {
                setTopEmotions(data.emotions.slice(0, 3));
                if (onEmotionsDetected) {
                  onEmotionsDetected(data.emotions);
                }
              }
              break;
            case 'assistant_end':
              setIsSpeaking(false);
              setIsListening(true);
              break;
            case 'error':
              console.error('Error:', data.message);
              break;
          }
        } catch (error) {
          console.error('Error parsing message:', error);
        }
      };

      ws.onerror = () => {
        setStatus('Connection error');
        setIsConnected(false);
        stopWebcam();
        stopMicrophoneCapture();
      };

      ws.onclose = () => {
        setStatus('Disconnected');
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        stopWebcam();
        stopMicrophoneCapture();
      };
    } catch (error) {
      console.error('Error connecting:', error);
      setStatus('Failed to connect');
    }
  };

  const disconnect = () => {
    stopWebcam();
    stopMicrophoneCapture();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setTopEmotions([]);
    setStatus('Disconnected');
  };

  return (
    <div className="voice-control">
      {/* Hidden video and canvas for webcam capture */}
      <video ref={videoRef} className="hidden-video" playsInline muted />
      <canvas ref={canvasRef} className="hidden-canvas" />

      {/* Camera buttons */}
      <div className="camera-buttons">
        <button
          type="button"
          className={`camera-btn ${isCameraOn ? 'active' : ''}`}
          onClick={isCameraOn ? stopWebcam : startExpressionCamera}
          disabled={!isConnected}
        >
          {isCameraOn ? 'Stop Seeing Me' : 'Let NoVo See Me'}
          <span className="btn-icon">👁️</span>
        </button>

        <button
          type="button"
          className="picture-btn"
          onClick={openPictureModal}
          disabled={!isConnected}
        >
          Take a Picture for Me
          <span className="btn-icon">📷</span>
        </button>
      </div>

      {/* Picture Modal with viewfinder */}
      {showPictureModal && (
        <div className="picture-modal-overlay">
          <div className="picture-modal">
            <div className="picture-modal-header">
              <h3>📷 Frame Your Shot</h3>
              <button type="button" className="close-modal-btn" onClick={closePictureModal}>
                ✕
              </button>
            </div>
            <div className="picture-viewfinder">
              <video ref={pictureVideoRef} autoPlay playsInline muted />
            </div>
            <div className="picture-modal-controls">
              <button type="button" className="capture-btn" onClick={capturePicture}>
                📸 Capture
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show detected emotions */}
      {isConnected && isCameraOn && topEmotions.length > 0 && (
        <div className="emotions-display">
          <p className="emotions-label">Your emotions:</p>
          <div className="emotions-list">
            {topEmotions.map((emotion, idx) => (
              <span key={idx} className="emotion-tag">
                {emotion.name}: {(emotion.score * 100).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Conversation transcript */}
      {transcript.length > 0 && (
        <div className="transcript">
          <h3>Conversation:</h3>
          <div className="transcript-messages">
            {[...transcript].reverse().map((msg, idx) => (
              <div key={idx} className={`message ${msg.startsWith('You:') ? 'user' : 'assistant'}`}>
                {msg}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceControl;
