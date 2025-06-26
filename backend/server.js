/**
 * DoramaFlix Backend - Simple Express Server
 * Minimal working server for immediate functionality
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { AuthService, authenticateJWT } = require('./src/middleware/jwt-auth');
const uploadRoutes = require('./upload-routes');
const adminRoutes = require('./admin-routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Prisma with error handling
let prisma = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
  console.log('✅ Prisma Client initialized successfully');
} catch (error) {
  console.warn('⚠️ Prisma Client initialization failed:', error.message);
  console.log('📡 Server will run without database, using mock data');
}

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000', 'https://videoflix-ypray.ondigitalocean.app'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend build
const frontendPath = path.join(__dirname, '../frontend/out');
const alternativeFrontendPath = path.join(process.cwd(), 'frontend/out');
const existsFrontendPath = require('fs').existsSync(frontendPath) ? frontendPath : alternativeFrontendPath;

console.log('🎨 Looking for frontend build at:', frontendPath);
console.log('🎨 Alternative frontend path:', alternativeFrontendPath);
console.log('🎨 Using frontend path:', existsFrontendPath);
console.log('🎨 Current working directory:', process.cwd());

app.use(express.static(existsFrontendPath));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Info
app.get('/api/v1', (req, res) => {
  res.json({
    name: 'DoramaFlix API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      courses: '/api/v1/courses',
      categories: '/api/v1/categories',
      episodes: '/api/v1/episodes',
      auth: '/api/v1/auth'
    }
  });
});

// Mock data for testing
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
  },
  {
    id: '3',
    title: 'Your Name Engraved Herein',
    description: 'Um drama taiwanês sobre amor adolescente em um colégio católico.',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519452575417-564c1401ecc0?w=300&h=400&fit=crop',
    bannerUrl: 'https://images.unsplash.com/photo-1519452575417-564c1401ecc0?w=1920&h=1080&fit=crop',
    year: 2020,
    rating: 8.5,
    genre: 'Romance, Drama',
    totalEpisodes: 1,
    status: 'completed',
    origin: 'taiwanese'
  }
];

const mockCategories = [
  { id: '1', name: 'K-Drama', slug: 'k-drama', count: 45 },
  { id: '2', name: 'J-Drama', slug: 'j-drama', count: 23 },
  { id: '3', name: 'C-Drama', slug: 'c-drama', count: 31 },
  { id: '4', name: 'Romance', slug: 'romance', count: 67 },
  { id: '5', name: 'Thriller', slug: 'thriller', count: 18 }
];

// Courses API
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

app.get('/api/v1/courses/:id', (req, res) => {
  const course = mockCourses.find(c => c.id === req.params.id);
  if (!course) {
    return res.status(404).json({
      success: false,
      error: 'Course not found'
    });
  }
  res.json({
    success: true,
    data: course
  });
});

// Categories API
app.get('/api/v1/categories', (req, res) => {
  res.json({
    success: true,
    data: mockCategories
  });
});

// Real Authentication with JWT - Agent 4
app.post('/api/v1/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email and password required'
      });
    }

    const result = await AuthService.login(email, password);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: error.message
    });
  }
});

app.post('/api/v1/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'All fields required'
      });
    }

    const result = await AuthService.register(req.body);
    
    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Registration failed',
      details: error.message
    });
  }
});

app.post('/api/v1/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const result = await AuthService.refreshToken(refreshToken);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Token refresh failed',
      details: error.message
    });
  }
});

app.post('/api/v1/auth/logout', authenticateJWT, (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

app.get('/api/v1/auth/me', authenticateJWT, (req, res) => {
  res.json({
    success: true,
    data: { user: req.user },
    message: 'User profile retrieved'
  });
});

// Search API
app.get('/api/v1/search', (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json({ success: true, data: [] });
  }
  
  const results = mockCourses.filter(course => 
    course.title.toLowerCase().includes(q.toLowerCase()) ||
    course.description.toLowerCase().includes(q.toLowerCase())
  );
  
  res.json({
    success: true,
    data: results,
    query: q,
    count: results.length
  });
});

// Mount upload routes - Agent 6
app.use('/api/v1/uploads', uploadRoutes);

// Mount admin routes - Agent 9
app.use('/api/v1/admin', adminRoutes);

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      error: 'API route not found',
      path: req.originalUrl
    });
  }
  
  // Serve index.html for all other routes (SPA)
  const indexPath = path.join(existsFrontendPath, 'index.html');
  console.log('🎯 Serving frontend from:', indexPath);
  console.log('🎯 Index file exists:', require('fs').existsSync(indexPath));
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Frontend serve error:', err);
      console.error('❌ Tried to serve from:', indexPath);
      console.error('❌ Directory contents:', require('fs').existsSync(existsFrontendPath) ? require('fs').readdirSync(existsFrontendPath) : 'Directory does not exist');
      res.status(404).json({
        success: false,
        error: 'Frontend not found - build may have failed',
        frontendPath: existsFrontendPath,
        indexPath: indexPath,
        indexExists: require('fs').existsSync(indexPath)
      });
    }
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
  console.log(`🚀 DoramaFlix Backend running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📋 API Info: http://localhost:${PORT}/api/v1`);
});