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
        'Describe what you see in detail: the person (their clothing, appearance, expression), the room (lighting, colors, objects visible), and the overall atmosphere. Be warm, personal, and detailed - as if greeting someone you care about. Include 3-4 specific observations.'
      );
      if (result.success && result.description) {
        // Send as invisible assistant context - just the observations, NoVo will respond naturally
        contextForEVI = `[VISUAL INPUT] ${result.description}`;
      }
    } else if (type === 'picture') {
      // User took a picture - describe it in detail
      result = await analyzeImage(
        imgData,
        'Describe this image in rich detail: identify people (their clothing, expressions, activities), objects, colors, text, setting, lighting, and mood. Provide 4-5 specific observations that would help someone understand exactly what is captured in this photo. Be warm and descriptive.'
      );
      if (result.success && result.description) {
        contextForEVI = `A photo was just taken. Here's what it shows: ${result.description}`;
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
