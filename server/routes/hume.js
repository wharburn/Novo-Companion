import express from 'express';
import { fetchAccessToken } from 'hume';

const router = express.Router();

// GET /api/hume/access-token - Generate a short-lived access token for the client
router.get('/access-token', async (req, res) => {
  try {
    const accessToken = await fetchAccessToken({
      apiKey: process.env.HUME_API_KEY,
      secretKey: process.env.HUME_SECRET_KEY,
    });

    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate access token',
      });
    }

    res.json({
      success: true,
      data: {
        accessToken,
        configId: process.env.NEXT_PUBLIC_HUME_CONFIG_ID,
      },
    });
  } catch (error) {
    console.error('Error generating Hume access token:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate access token',
    });
  }
});

export default router;

