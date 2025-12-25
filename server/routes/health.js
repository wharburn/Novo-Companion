import express from 'express';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'NoVo AI Companion',
      version: '1.0.0'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

export default router;

