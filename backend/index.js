const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    message: 'DoramaFlix Backend API is running!'
  });
});

// API info
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'DoramaFlix API',
    version: '1.0.0',
    environment: 'development',
    message: 'Welcome to DoramaFlix - Your Asian Drama Streaming Platform!',
    endpoints: {
      health: '/health',
      upload: '/api/v1/uploads',
      auth: '/api/v1/auth (coming soon)',
      courses: '/api/v1/courses (coming soon)',
      episodes: '/api/v1/episodes (coming soon)'
    }
  });
});

// Uploads placeholder
app.get('/api/v1/uploads', (req, res) => {
  res.json({
    message: 'Upload endpoints - Vercel Blob integration ready!',
    features: [
      'Video upload support (MP4, WebM, AVI, MOV)',
      'Image upload support (JPEG, PNG, GIF, WebP)',
      'Subtitle upload support (VTT, SRT, ASS)',
      'Progress tracking',
      'File validation',
      'Thumbnail generation'
    ]
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 DoramaFlix Backend started successfully!');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API info: http://localhost:${PORT}/api/v1`);
  console.log('🎬 Welcome to DoramaFlix - Your Asian Drama Streaming Platform!');
});