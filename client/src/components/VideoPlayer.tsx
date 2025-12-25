import { useEffect, useRef, useState } from 'react';
import './VideoPlayer.css';

// Resting video (mouth closed, natural idle)
const RESTING_VIDEO = '/videos/novo-resting.mp4';

// Available NoVo avatar videos for active states
const AVATAR_VIDEOS = {
  greeting: '/videos/greeting-2.mp4',
  acknowledgment: '/videos/acknowledgment-1.mp4',
  curiosity: '/videos/curiosity-1.mp4',
  empathyHappy: '/videos/empathy-happy-1.mp4',
  empathySad: '/videos/empathy-sad-1.mp4',
  reassurance: '/videos/elderly-reassurance.mp4',
  remembering: '/videos/remembering-1.mp4',
  validation: '/videos/validation-1.mp4',
};

interface VideoPlayerProps {
  isListening?: boolean;
  isSpeaking?: boolean;
  isConnected?: boolean;
  onClick?: () => void;
}

const VideoPlayer = ({
  isListening = false,
  isSpeaking = false,
  isConnected = false,
  onClick,
}: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentVideo, setCurrentVideo] = useState<string | null>(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Only show speaking video when actually speaking (audio playing)
  const shouldShowSpeakingVideo = isConnected && isSpeaking;

  // Play video when loaded
  useEffect(() => {
    if (videoRef.current && isVideoLoaded && shouldShowSpeakingVideo) {
      videoRef.current.play().catch((e) => console.log('Video autoplay blocked:', e));
    }
  }, [isVideoLoaded, currentVideo, shouldShowSpeakingVideo]);

  // Select appropriate video based on state
  // Only show lip-moving video when actually speaking
  useEffect(() => {
    if (isSpeaking) {
      // Only show speaking video when audio is actually playing
      setCurrentVideo(AVATAR_VIDEOS.acknowledgment);
    } else {
      // Show resting video for all other states (listening, idle, etc.)
      setCurrentVideo(null);
    }
  }, [isSpeaking]);

  const getPromptText = () => {
    if (!isConnected) return 'Tap to start a conversation with me';
    if (isSpeaking) return 'NoVo is speaking...';
    if (isListening) return 'Tap to end conversation';
    return 'Tap to end conversation';
  };

  const getContainerClass = () => {
    let classes = 'video-container';
    if (isSpeaking) classes += ' speaking';
    if (isListening) classes += ' listening';
    if (!isConnected) classes += ' disconnected';
    if (onClick) classes += ' clickable';
    return classes;
  };

  return (
    <button type="button" className="video-player" onClick={onClick}>
      <p className="video-prompt">{getPromptText()}</p>
      <div className={getContainerClass()}>
        {shouldShowSpeakingVideo && currentVideo ? (
          <video
            ref={videoRef}
            className="novo-video"
            src={currentVideo}
            loop
            muted
            playsInline
            onLoadedData={() => setIsVideoLoaded(true)}
          />
        ) : (
          <video className="novo-video" src={RESTING_VIDEO} loop muted autoPlay playsInline />
        )}
      </div>
    </button>
  );
};

export default VideoPlayer;
