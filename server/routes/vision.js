import express from 'express';
import { injectImageContext } from '../services/humeEVI.js';
import { analyzeForElderly, analyzeImage } from '../services/visionAI.js';

const router = express.Router();

// Analyze image
router.post('/analyze', async (req, res) => {
  try {
    const { imageData, prompt, provider, context } = req.body;

    if (!imageData) {
      return res.status(400).json({ success: false, error: 'Image data required' });
    }

    let result;

    if (context) {
      // Use specialized analysis for elderly users
      result = await analyzeForElderly(imageData, context);
    } else {
      // General analysis
      result = await analyzeImage(imageData, prompt, provider);
    }

    res.json(result);
  } catch (error) {
    console.error('Error analyzing image:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Inject image context into Hume conversation
router.post('/inject-context', async (req, res) => {
  try {
    const { userId, imageDescription } = req.body;

    if (!userId || !imageDescription) {
      return res
        .status(400)
        .json({ success: false, error: 'userId and imageDescription required' });
    }

    const success = await injectImageContext(userId, imageDescription);

    res.json({ success });
  } catch (error) {
    console.error('Error injecting image context:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
