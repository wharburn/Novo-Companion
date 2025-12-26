import express from 'express';
import multer from 'multer';
import { deletePhoto, listFamilyPhotos, uploadFamilyPhoto } from '../services/s3Storage.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Upload family photo
router.post('/:userId/:memberName', upload.single('photo'), async (req, res) => {
  try {
    // Check if storage is configured
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.S3_BUCKET_NAME) {
      return res.status(503).json({
        success: false,
        error: 'Photo storage not configured. Please set up Cloudflare R2 or Backblaze B2.',
      });
    }

    const { userId, memberName } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const result = await uploadFamilyPhoto(userId, memberName, req.file.buffer, req.file.mimetype);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Save photo from camera (base64)
router.post('/:userId/save-photo', async (req, res) => {
  try {
    const { userId } = req.params;
    const { image, description, subject } = req.body;

    if (!image) {
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    // Convert base64 to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Use subject or 'general' as member name
    const memberName = subject || 'general';
    
    const result = await uploadFamilyPhoto(userId, memberName, buffer, 'image/jpeg', description);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error saving photo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all photos for a user (all family members)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // List all photos for this user across all members
    const allPhotos = await listFamilyPhotos(userId, null);

    res.json({ success: true, data: allPhotos });
  } catch (error) {
    console.error('Error getting photos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all photos for a family member
router.get('/:userId/:memberName', async (req, res) => {
  try {
    const { userId, memberName } = req.params;
    const photos = await listFamilyPhotos(userId, memberName);

    res.json({ success: true, data: photos });
  } catch (error) {
    console.error('Error getting photos:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete photo
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const decodedKey = decodeURIComponent(key);

    await deletePhoto(decodedKey);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
