import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import FamilyAlbum from './components/FamilyAlbum';
import PhotoAlbum from './components/PhotoAlbum';
import SettingsPanel from './components/SettingsPanel';
import VideoPlayer from './components/VideoPlayer';
import VoiceControl from './components/VoiceControl';

const USER_ID = 'demo-user'; // In production, this would come from authentication
const LONG_PRESS_DURATION = 5000; // 5 seconds to open settings

function App() {
  const [activeView, setActiveView] = useState<'main' | 'family' | 'settings' | 'photos'>('main');
  const [_showCamera, _setShowCamera] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [voiceState, setVoiceState] = useState({
    isConnected: false,
    isListening: false,
    isSpeaking: false,
  });
  const [longPressProgress, setLongPressProgress] = useState(0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const disconnectRef = useRef<(() => void) | null>(null);

  // Suppress unused variable warnings
  void _showCamera;
  void _setShowCamera;

  useEffect(() => {
    loadUserProfile();
  }, []);

  const startLongPress = useCallback(() => {
    // If settings is open, a tap will close it (handled in handleHeaderClick)
    if (activeView === 'settings') return;

    setLongPressProgress(0);

    // Start progress animation
    const startTime = Date.now();
    progressInterval.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100);
      setLongPressProgress(progress);
    }, 50);

    // Set timer to open settings after 5 seconds
    longPressTimer.current = setTimeout(() => {
      setActiveView('settings');
      setLongPressProgress(0);
      if (progressInterval.current) clearInterval(progressInterval.current);
    }, LONG_PRESS_DURATION);
  }, [activeView]);

  const endLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
    setLongPressProgress(0);
  }, []);

  const handleHeaderClick = useCallback(() => {
    // If settings is open, close it on tap
    if (activeView === 'settings') {
      setActiveView('main');
    }
  }, [activeView]);

  const loadUserProfile = async () => {
    try {
      const response = await fetch(`/api/user/${USER_ID}`);
      if (!response.ok) {
        // API server not running - use defaults
        return;
      }
      const data = await response.json();
      if (data.success) {
        setUserProfile(data.data);
      }
    } catch {
      // API server not running - silently use defaults
    }
  };

  const handleSettingsUpdate = async (newSettings: any) => {
    try {
      const response = await fetch(`/api/user/${USER_ID}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings),
      });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      if (data.success) {
        setUserProfile(data.data);
      }
    } catch {
      // API server not running - silently ignore
    }
  };

  return (
    <div className="app">
      <header
        className={`app-header ${activeView === 'settings' ? 'settings-open' : ''}`}
        onMouseDown={startLongPress}
        onMouseUp={endLongPress}
        onMouseLeave={endLongPress}
        onTouchStart={startLongPress}
        onTouchEnd={endLongPress}
        onClick={handleHeaderClick}
      >
        <div className="header-logo">
          <img src="/images/NOVOC.png" alt="NoVo" draggable="false" />
          {longPressProgress > 0 && (
            <div className="long-press-indicator">
              <div className="long-press-progress" style={{ width: `${longPressProgress}%` }} />
            </div>
          )}
        </div>
      </header>

      <main className="app-main">
        {activeView === 'main' && (
          <div className="main-view">
            <VideoPlayer
              isConnected={voiceState.isConnected}
              isListening={voiceState.isListening}
              isSpeaking={voiceState.isSpeaking}
              onClick={() => {
                if (voiceState.isConnected) {
                  disconnectRef.current?.();
                } else {
                  connectRef.current?.();
                }
              }}
            />
            <VoiceControl
              userId={USER_ID}
              onStateChange={setVoiceState}
              onConnectRef={connectRef}
              onDisconnectRef={disconnectRef}
              onViewPhotos={() => setActiveView('photos')}
            />
          </div>
        )}

        {activeView === 'family' && <FamilyAlbum userId={USER_ID} />}

        {activeView === 'photos' && <PhotoAlbum userId={USER_ID} onClose={() => setActiveView('main')} />}

        {activeView === 'settings' && userProfile && (
          <SettingsPanel
            settings={userProfile.settings}
            onUpdate={handleSettingsUpdate}
            userId={USER_ID}
          />
        )}
      </main>
    </div>
  );
}

export default App;
