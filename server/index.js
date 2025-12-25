// MUST BE FIRST: Load environment variables before any other imports
import './loadEnv.js';

import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';

// Import routes
import familyRouter from './routes/family.js';
import healthRouter from './routes/health.js';
import photoRouter from './routes/photo.js';
import userRouter from './routes/user.js';
import visionRouter from './routes/vision.js';

// Import services
import { setupHumeWebSocket } from './services/humeEVI.js';
import { initializeRedis } from './services/upstashRedis.js';
import { initializeVector } from './services/upstashVector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/health', healthRouter);
app.use('/api/user', userRouter);
app.use('/api/family', familyRouter);
app.use('/api/photos', photoRouter);
app.use('/api/vision', visionRouter);

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server for Hume EVI
const wss = new WebSocketServer({ server, path: '/ws/hume' });
setupHumeWebSocket(wss);

// Initialize services
async function initializeServices() {
  try {
    console.log('🔧 Initializing services...');
    await initializeRedis();
    await initializeVector();
    console.log('✅ All services initialized');
  } catch (error) {
    console.error('❌ Service initialization failed:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  await initializeServices();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 NoVo Server Running`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📡 Port: ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health: http://localhost:${PORT}/api/health`);
    console.log(`${'='.repeat(60)}\n`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
