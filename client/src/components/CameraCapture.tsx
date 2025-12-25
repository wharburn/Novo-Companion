import { useEffect, useRef, useState } from 'react';
import './CameraCapture.css';

interface CameraCaptureProps {
  userId: string;
  onClose: () => void;
  onImageAnalyzed?: (description: string) => void;
}

const CameraCapture = ({ userId, onClose, onImageAnalyzed }: CameraCaptureProps) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Could not access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setAnalyzing(true);
    setResult('');

    try {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0);

      const imageData = canvas.toDataURL('image/jpeg', 0.8);

      const response = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData,
          context: 'general',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult(data.description);
        // Send the image context to Hume so NoVo can ask follow-up questions
        if (onImageAnalyzed) {
          onImageAnalyzed(data.description);
        }
        // Also send to backend to inject into Hume conversation
        try {
          await fetch('/api/vision/inject-context', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              imageDescription: data.description,
            }),
          });
        } catch (injectError) {
          console.error('Error injecting context:', injectError);
        }
      } else {
        setResult('Sorry, I could not analyze that image.');
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      setResult('An error occurred while analyzing the image.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="camera-capture">
      <div className="camera-modal">
        <div className="camera-header">
          <h2>Novo Camera</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="camera-view">
          <video ref={videoRef} autoPlay playsInline />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <div className="camera-controls">
          <button
            type="button"
            className="capture-btn"
            onClick={captureAndAnalyze}
            disabled={analyzing}
          >
            {analyzing ? 'Analyzing...' : 'Capture'}
          </button>
        </div>

        {result && (
          <div className="analysis-result">
            <strong>NoVo sees:</strong>
            <p>{result}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
