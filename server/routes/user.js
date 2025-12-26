import express from 'express';
import { getUserProfile, saveUserProfile, updateUserSettings } from '../services/upstashRedis.js';

const router = express.Router();

// Get user profile
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profile = await getUserProfile(userId);

    if (!profile) {
      // Create default profile
      const defaultProfile = {
        userId,
        settings: {
          conversationMode: 'reactive',
          checkInTimes: {
            morning: '09:00',
            afternoon: '14:00',
            evening: '19:00',
          },
          chattiness: 'moderate',
          questionFrequency: 'medium',
          enablePhotos: true,
          enableCamera: true,
          enableFamilyTree: true,
          visionProvider: 'gpt4',
          videoQuality: '720p',
          voiceSpeed: 1.0,
          language: 'en',
        },
        knownInfo: {
          medical: [],
          medications: [],
          routines: {},
          preferences: {},
        },
        createdAt: new Date().toISOString(),
      };

      await saveUserProfile(userId, defaultProfile);
      return res.json({ success: true, data: defaultProfile });
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user settings
router.put('/:userId/settings', async (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;

    const updatedProfile = await updateUserSettings(userId, settings);

    res.json({ success: true, data: updatedProfile });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update user profile
router.put('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const profileData = req.body;

    await saveUserProfile(userId, {
      ...profileData,
      userId,
      lastUpdated: new Date().toISOString(),
    });

    res.json({ success: true, data: profileData });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
