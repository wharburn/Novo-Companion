import express from 'express';
import { injectImageContext } from '../services/humeEVI.js';
import { analyzeForElderly, analyzeImage } from '../services/visionAI.js';

const router = express.Router();

// Analyze image
router.post('/analyze', async (req, res) => {
  try {
    // Accept both 'image' and 'imageData' for compatibility
    const { image, imageData, prompt, provider, context, type } = req.body;
    const imgData = image || imageData;

    if (!imgData) {
      return res.status(400).json({ success: false, error: 'Image data required' });
    }

    let result;
    let contextForEVI = null;

    if (type === 'camera_frame') {
      // Camera enabled - describe what we see and generate EVI context
      result = await analyzeImage(
        imgData,
        'Briefly describe what you see in this image in 1-2 sentences. Focus on the person and their surroundings. Be warm and friendly.'
      );
      if (result.success && result.description) {
        contextForEVI = `[SYSTEM CONTEXT: The user just enabled their camera. ${result.description} Acknowledge that you can now see them and comment warmly on what you observe.]`;
      }
    } else if (type === 'picture') {
      // User took a picture - describe it
      result = await analyzeImage(
        imgData,
        'Describe what you see in this image in detail. Be specific about objects, people, text, and context. Be warm and friendly.'
      );
      if (result.success && result.description) {
        contextForEVI = result.description;
      }
    } else if (context) {
      // Use specialized analysis for elderly users
      result = await analyzeForElderly(imgData, context);
      if (result.success && result.description) {
        contextForEVI = result.description;
      }
    } else {
      // General analysis
      result = await analyzeImage(imgData, prompt, provider);
      if (result.success && result.description) {
        contextForEVI = result.description;
      }
    }

    // Add context for EVI
    if (contextForEVI && result.success) {
      result.data = {
        context: contextForEVI,
        analysis: result.description,
        provider: result.provider,
      };
    } else if (!result.success) {
      return res.status(500).json(result);
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
