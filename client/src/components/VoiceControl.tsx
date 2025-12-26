import {
  convertBlobToBase64,
  ensureSingleValidAudioTrack,
  EVIWebAudioPlayer,
  getAudioStream,
  getBrowserSupportedMimeType,
  Hume,
  HumeClient,
  MimeType,
} from 'hume';
import { useCallback, useEffect, useRef, useState } from 'react';
import './VoiceControl.css';

// Type aliases for Hume SDK types
type SubscribeEvent = Hume.empathicVoice.SubscribeEvent;
type ChatSocket = Awaited<ReturnType<HumeClient['empathicVoice']['chat']['connect']>>;

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

const FRAME_INTERVAL_MS = 1000; // Send a frame every 1 second

// Get API base URL for server calls (vision, etc.)
const getApiBaseUrl = () => {
  if (import.meta.env?.DEV) {
    return 'http://localhost:3000';
  }
  return '';
};

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

  // Camera refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pictureVideoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const pictureStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<number | null>(null);

  // Hume SDK refs
  const socketRef = useRef<ChatSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const playerRef = useRef<EVIWebAudioPlayer | null>(null);

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

  // Start audio capture using Hume SDK utilities
  const startAudioCapture = useCallback(async (socket: ChatSocket) => {
    const mimeTypeResult = getBrowserSupportedMimeType();
    const mimeType = mimeTypeResult.success ? mimeTypeResult.mimeType : MimeType.WEBM;

    const micAudioStream = await getAudioStream();
    ensureSingleValidAudioTrack(micAudioStream);

    const recorder = new MediaRecorder(micAudioStream, { mimeType });
    recorder.ondataavailable = async (e: BlobEvent) => {
      if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
        const data = await convertBlobToBase64(e.data);
        socket.sendAudioInput({ data });
      }
    };
    recorder.onerror = (e) => console.error('MediaRecorder error:', e);
    recorder.start(100); // Send audio every 100ms

    recorderRef.current = recorder;
    setIsListening(true);
    console.log('🎤 Audio capture started (Hume SDK)');

    return recorder;
  }, []);

  // Stop audio capture
  const stopAudioCapture = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.stream.getTracks().forEach((t) => t.stop());
      recorderRef.current.stop();
      recorderRef.current = null;
    }
    setIsListening(false);
  }, []);

  // Handle messages from Hume EVI
  const handleMessage = useCallback(
    async (message: SubscribeEvent) => {
      switch (message.type) {
        case 'chat_metadata':
          console.log('📋 Chat ID:', message.chatId);
          break;

        case 'user_message': {
          let content = message.message?.content || '';
          // Strip [SYSTEM CONTEXT: ...] prefix if present
          const contextMatch = content.match(/^\[SYSTEM CONTEXT:.*?\]\s*/);
          if (contextMatch) {
            content = content.substring(contextMatch[0].length);
          }
          if (content) {
            setTranscript((prev) => [...prev, `You: ${content}`]);
          }
          // Extract emotions from prosody if available
          if (message.models?.prosody?.scores) {
            const scores = message.models.prosody.scores as unknown as Record<string, number>;
            const sorted = Object.entries(scores)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 3)
              .map(([name, score]) => ({ name, score }));
            setTopEmotions(sorted);
            if (onEmotionsDetected) {
              onEmotionsDetected(sorted);
            }
          }
          break;
        }

        case 'assistant_message': {
          const content = message.message?.content || '';
          if (content) {
            setTranscript((prev) => [...prev, `NoVo: ${content}`]);
          }
          setIsSpeaking(true);
          setIsListening(false);
          break;
        }

        case 'audio_output':
          // Use Hume's EVIWebAudioPlayer for smooth playback
          if (playerRef.current) {
            await playerRef.current.enqueue(message);
          }
          break;

        case 'user_interruption':
          // User interrupted - stop playback
          if (playerRef.current) {
            playerRef.current.stop();
          }
          setIsSpeaking(false);
          setIsListening(true);
          break;

        case 'assistant_end':
          setIsSpeaking(false);
          setIsListening(true);
          break;

        case 'error':
          console.error('Hume error:', message);
          break;

        default:
          console.log('📥 Hume:', message.type);
      }
    },
    [onEmotionsDetected]
  );

  // Send image to server for vision analysis (camera or picture)
  const sendImageToServer = useCallback(
    async (imageData: string, type: 'camera_frame' | 'picture') => {
      try {
        const response = await fetch(`${getApiBaseUrl()}/api/vision/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: imageData, type }),
        });
        const result = await response.json();
        if (result.success && result.data?.context && socketRef.current) {
          // Inject vision context into EVI conversation
          socketRef.current.sendUserInput(result.data.context);
        }
      } catch (error) {
        console.error('Error sending image to server:', error);
      }
    },
    []
  );

  // Capture and send webcam frame for expression analysis
  const captureAndSendFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isConnected) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 240;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const base64Data = dataUrl.split(',')[1];

    sendImageToServer(base64Data, 'camera_frame');
  }, [isConnected, sendImageToServer]);

  // Start webcam for facial expression detection (front camera)
  const startExpressionCamera = useCallback(async () => {
    try {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });
      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCameraOn(true);

      // Wait for video to be ready, then capture first frame
      await new Promise((resolve) => setTimeout(resolve, 300));
      captureAndSendFrame();

      // Start sending frames periodically
      frameIntervalRef.current = window.setInterval(captureAndSendFrame, FRAME_INTERVAL_MS);
      console.log('📷 Expression camera started');
    } catch (error) {
      console.error('Error starting expression camera:', error);
    }
  }, [captureAndSendFrame]);

  // Open picture modal with rear camera viewfinder
  const openPictureModal = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'environment' },
      });
      pictureStreamRef.current = stream;
      setShowPictureModal(true);

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

  // Close picture modal
  const closePictureModal = () => {
    if (pictureStreamRef.current) {
      pictureStreamRef.current.getTracks().forEach((track) => track.stop());
      pictureStreamRef.current = null;
    }
    setShowPictureModal(false);
  };

  // Capture picture and send to server for analysis
  const capturePicture = useCallback(() => {
    if (pictureVideoRef.current && canvasRef.current) {
      const video = pictureVideoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        const base64Data = dataUrl.split(',')[1];

        sendImageToServer(base64Data, 'picture');
        console.log('📸 Picture captured and sent');
      }
    }
    closePictureModal();
  }, [sendImageToServer]);

  // Stop webcam capture
  const stopWebcam = useCallback(() => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, []);

  // Connect to Hume EVI using TypeScript SDK
  const connect = useCallback(async () => {
    try {
      console.log('🔄 Connect function called...');
      setStatus('Getting access token...');

      // Fetch access token from our server
      console.log('🔑 Fetching access token from:', `${getApiBaseUrl()}/api/hume/access-token`);
      const tokenResponse = await fetch(`${getApiBaseUrl()}/api/hume/access-token`);
      const tokenData = await tokenResponse.json();
      console.log('🔑 Token response:', tokenData);

      if (!tokenData.success || !tokenData.data?.accessToken) {
        throw new Error('Failed to get access token');
      }

      const { accessToken, configId } = tokenData.data;
      setStatus('Connecting to Hume...');

      // Create Hume client with access token
      const client = new HumeClient({ accessToken });

      // Initialize audio player
      const player = new EVIWebAudioPlayer();
      await player.init();
      playerRef.current = player;

      // Connect to EVI
      console.log('🔌 Connecting to EVI with configId:', configId);
      const socket = await client.empathicVoice.chat.connect({
        configId,
      });
      console.log('🔌 Socket created:', socket);
      socketRef.current = socket;

      // Set up event handlers
      socket.on('open', async () => {
        console.log('✅ Connected to Hume EVI - WebSocket open');
        setIsConnected(true);
        setStatus('Connected - Speak now!');

        // Start audio capture
        await startAudioCapture(socket);
      });

      socket.on('message', handleMessage);

      socket.on('error', (err: Error) => {
        console.error('Hume error:', err);
        setStatus('Connection error');
      });

      socket.on('close', () => {
        console.log('🔌 Disconnected from Hume');
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        setStatus('Disconnected');
        stopAudioCapture();
        stopWebcam();
      });
    } catch (error) {
      console.error('Error connecting:', error);
      setStatus('Failed to connect');
    }
  }, [handleMessage, startAudioCapture, stopAudioCapture, stopWebcam]);

  // Disconnect from Hume EVI
  const disconnect = useCallback(() => {
    stopWebcam();
    stopAudioCapture();

    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    setTopEmotions([]);
    setStatus('Disconnected');
  }, [stopAudioCapture, stopWebcam]);

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
