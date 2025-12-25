import express from 'express';
import {
  getFamilyMembers,
  saveFamilyMember,
  searchFamilyMembers,
} from '../services/upstashVector.js';

const router = express.Router();

// Get all family members
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const members = await getFamilyMembers(userId);

    res.json({ success: true, data: members });
  } catch (error) {
    console.error('Error getting family members:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Add or update family member
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const memberData = req.body;

    const result = await saveFamilyMember(userId, memberData);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving family member:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search family members
router.get('/:userId/search', async (req, res) => {
  try {
    const { userId } = req.params;
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ success: false, error: 'Query parameter required' });
    }

    const results = await searchFamilyMembers(userId, q);

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('Error searching family members:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
