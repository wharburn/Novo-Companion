import { useState } from 'react';
import FamilyTreeEditor from './FamilyTreeEditor';
import './SettingsPanel.css';

interface Settings {
  conversationMode: 'proactive' | 'reactive' | 'scheduled';
  checkInTimes: {
    morning: string;
    afternoon: string;
    evening: string;
  };
  chattiness: 'concise' | 'moderate' | 'conversational';
  questionFrequency: 'low' | 'medium' | 'high';
  enablePhotos: boolean;
  enableCamera: boolean;
  enableFamilyTree: boolean;
  visionProvider: 'gpt4' | 'claude';
  videoQuality: '360p' | '480p' | '720p';
  voiceSpeed: number;
}

interface SettingsPanelProps {
  settings: Settings;
  onUpdate: (settings: Settings) => void;
  userId: string;
}

const SettingsPanel = ({ settings, onUpdate, userId }: SettingsPanelProps) => {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

  const handleChange = (key: keyof Settings, value: any) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
  };

  const handleNestedChange = (parent: string, key: string, value: any) => {
    const updated = {
      ...localSettings,
      [parent]: {
        ...(localSettings as any)[parent],
        [key]: value,
      },
    };
    setLocalSettings(updated);
  };

  const saveSettings = () => {
    onUpdate(localSettings);
    alert('Settings saved!');
  };

  return (
    <div className="settings-panel">
      <h2>Settings</h2>

      <div className="settings-section">
        <h3>Conversation Settings</h3>

        <div className="setting-item">
          <label>Conversation Mode</label>
          <select
            value={localSettings.conversationMode}
            onChange={(e) => handleChange('conversationMode', e.target.value)}
          >
            <option value="reactive">Reactive (I start conversations)</option>
            <option value="proactive">Proactive (NoVo starts conversations)</option>
            <option value="scheduled">Scheduled Check-ins</option>
          </select>
        </div>

        {(localSettings.conversationMode === 'proactive' ||
          localSettings.conversationMode === 'scheduled') && (
          <>
            <div className="setting-item">
              <label>Morning Check-in</label>
              <input
                type="time"
                value={localSettings.checkInTimes.morning}
                onChange={(e) => handleNestedChange('checkInTimes', 'morning', e.target.value)}
              />
            </div>
            <div className="setting-item">
              <label>Afternoon Check-in</label>
              <input
                type="time"
                value={localSettings.checkInTimes.afternoon}
                onChange={(e) => handleNestedChange('checkInTimes', 'afternoon', e.target.value)}
              />
            </div>
            <div className="setting-item">
              <label>Evening Check-in</label>
              <input
                type="time"
                value={localSettings.checkInTimes.evening}
                onChange={(e) => handleNestedChange('checkInTimes', 'evening', e.target.value)}
              />
            </div>
          </>
        )}

        <div className="setting-item">
          <label>Chattiness</label>
          <select
            value={localSettings.chattiness}
            onChange={(e) => handleChange('chattiness', e.target.value)}
          >
            <option value="concise">Concise</option>
            <option value="moderate">Moderate</option>
            <option value="conversational">Conversational</option>
          </select>
        </div>

        <div className="setting-item">
          <label>Question Frequency</label>
          <select
            value={localSettings.questionFrequency}
            onChange={(e) => handleChange('questionFrequency', e.target.value)}
          >
            <option value="low">Low (1-2 per conversation)</option>
            <option value="medium">Medium (3-4 per conversation)</option>
            <option value="high">High (5+ per conversation)</option>
          </select>
        </div>
      </div>

      <div className="settings-section">
        <h3>Features</h3>

        <div className="setting-item checkbox">
          <label>
            <input
              type="checkbox"
              checked={localSettings.enablePhotos}
              onChange={(e) => handleChange('enablePhotos', e.target.checked)}
            />
            Enable Photo Uploads
          </label>
        </div>

        <div className="setting-item checkbox">
          <label>
            <input
              type="checkbox"
              checked={localSettings.enableCamera}
              onChange={(e) => handleChange('enableCamera', e.target.checked)}
            />
            Enable "Show NoVo" Camera Feature
          </label>
        </div>

        <div className="setting-item checkbox">
          <label>
            <input
              type="checkbox"
              checked={localSettings.enableFamilyTree}
              onChange={(e) => handleChange('enableFamilyTree', e.target.checked)}
            />
            Enable Family Tree Building
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Visual & Audio</h3>

        <div className="setting-item">
          <label>Vision AI Provider</label>
          <select
            value={localSettings.visionProvider}
            onChange={(e) => handleChange('visionProvider', e.target.value)}
          >
            <option value="gpt4">GPT-4 Vision</option>
            <option value="claude">Claude 3.5 Sonnet</option>
          </select>
        </div>

        <div className="setting-item">
          <label>Video Quality</label>
          <select
            value={localSettings.videoQuality}
            onChange={(e) => handleChange('videoQuality', e.target.value)}
          >
            <option value="360p">360p (Low bandwidth)</option>
            <option value="480p">480p (Medium)</option>
            <option value="720p">720p (High quality)</option>
          </select>
        </div>

        <div className="setting-item">
          <label>Voice Speed: {localSettings.voiceSpeed}x</label>
          <input
            type="range"
            min="0.8"
            max="1.2"
            step="0.1"
            value={localSettings.voiceSpeed}
            onChange={(e) => handleChange('voiceSpeed', parseFloat(e.target.value))}
          />
        </div>
      </div>

      <button type="button" className="save-btn" onClick={saveSettings}>
        Save Settings
      </button>

      {localSettings.enableFamilyTree && <FamilyTreeEditor userId={userId} />}
    </div>
  );
};

export default SettingsPanel;
