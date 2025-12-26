import express from 'express';
import multer from 'multer';
import * as localStorage from '../services/localStorage.js';
import { deletePhoto, listFamilyPhotos, uploadFamilyPhoto } from '../services/s3Storage.js';

const router = express.Router();

// Check if we should use local storage (default to true if S3 not configured)
const USE_LOCAL_STORAGE =
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.S3_BUCKET_NAME ||
  process.env.USE_LOCAL_STORAGE === 'true';

// Select storage service
const storage = USE_LOCAL_STORAGE
  ? localStorage
  : { uploadFamilyPhoto, listFamilyPhotos, deletePhoto };

console.log(`📦 Photo storage mode: ${USE_LOCAL_STORAGE ? 'LOCAL FILESYSTEM' : 'S3/R2'}`);

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

// Save photo from camera (base64) - MUST come before /:userId/:memberName route
router.post('/:userId/save-photo', async (req, res) => {
  try {
    const { userId } = req.params;
    const { image, description, subject } = req.body;

    console.log('📸 Photo save request received');
    console.log('  - userId:', userId);
    console.log('  - hasImage:', !!image);
    console.log('  - imageType:', typeof image);
    console.log('  - imageLength:', image?.length);
    console.log('  - description:', description?.substring(0, 50));
    console.log('  - subject:', subject);
    console.log('  - req.body keys:', Object.keys(req.body));

    if (!image) {
      console.error('❌ No image data in request body');
      console.error('   Request body:', JSON.stringify(req.body).substring(0, 200));
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    // Convert base64 to buffer
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    console.log(`📦 Buffer size: ${buffer.length} bytes`);

    // Use subject or 'general' as member name
    const memberName = subject || 'general';

    const result = await storage.uploadFamilyPhoto(
      userId,
      memberName,
      buffer,
      'image/jpeg',
      description
    );

    console.log('✅ Photo saved successfully:', result.key);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('❌ Error saving photo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Upload family photo (multipart form data)
router.post('/:userId/:memberName', upload.single('photo'), async (req, res) => {
  try {
    const { userId, memberName } = req.params;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const result = await storage.uploadFamilyPhoto(
      userId,
      memberName,
      req.file.buffer,
      req.file.mimetype
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve photo file (for local storage)
router.get('/serve/:key(*)', async (req, res) => {
  try {
    const key = decodeURIComponent(req.params.key);

    if (USE_LOCAL_STORAGE) {
      const filePath = await localStorage.getPhotoPath(key);
      res.sendFile(filePath);
    } else {
      return res.status(404).json({ success: false, error: 'Not using local storage' });
    }
  } catch (error) {
    console.error('Error serving photo:', error);
    res.status(404).json({ success: false, error: 'Photo not found' });
  }
});

// Get all photos for a user (all family members)
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // List all photos for this user across all members
    const allPhotos = await storage.listFamilyPhotos(userId, null);

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
    const photos = await storage.listFamilyPhotos(userId, memberName);

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

    await storage.deletePhoto(decodedKey);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
