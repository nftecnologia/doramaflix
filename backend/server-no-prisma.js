/**
 * DoramaFlix Backend - No Prisma Fallback Server
 * Emergency server without database dependencies
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration  
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', process.env.FRONTEND_URL],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'disconnected',
    mode: 'no-prisma-fallback'
  });
});

// API Info
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'DoramaFlix API',
    version: '1.0.0',
    status: 'running',
    mode: 'fallback',
    endpoints: {
      health: '/health',
      courses: '/api/v1/courses',
      categories: '/api/v1/categories'
    }
  });
});

// Mock courses data
const mockCourses = [
  {
    id: '1',
    title: 'Descendentes do Sol',
    description: 'Um drama militar romântico que segue a história de amor entre um capitão e uma médica.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=400&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1920&h=1080&fit=crop',
    year: 2016,
    rating: 8.7,
    genre: 'Romance, Drama, Militar',
    totalEpisodes: 16,
    status: 'completed',
    origin: 'korean'
  },
  {
    id: '2', 
    title: 'Hotel Del Luna',
    description: 'Uma história sobrenatural sobre um hotel que hospeda apenas fantasmas.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=300&h=400&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1920&h=1080&fit=crop',
    year: 2019,
    rating: 8.9,
    genre: 'Fantasy, Romance, Drama',
    totalEpisodes: 16,
    status: 'completed',
    origin: 'korean'
  }
];

const mockCategories = [
  { id: '1', name: 'K-Drama', slug: 'k-drama', count: 45 },
  { id: '2', name: 'J-Drama', slug: 'j-drama', count: 23 },
  { id: '3', name: 'C-Drama', slug: 'c-drama', count: 31 }
];

// Mock APIs
app.get('/api/v1/courses', (req, res) => {
  res.json({
    success: true,
    data: mockCourses,
    pagination: {
      total: mockCourses.length,
      page: 1,
      limit: 20
    }
  });
});

app.get('/api/v1/categories', (req, res) => {
  res.json({
    success: true,
    data: mockCategories
  });
});

// Mock auth endpoint
app.post('/api/v1/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@doramaflix.com' && password === 'admin123') {
    res.json({
      success: true,
      data: {
        user: {
          id: '1',
          email: 'admin@doramaflix.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin'
        },
        accessToken: 'mock_jwt_token_for_testing',
        refreshToken: 'mock_refresh_token'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DoramaFlix No-Prisma Server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`⚠️  Running in fallback mode without database`);
});