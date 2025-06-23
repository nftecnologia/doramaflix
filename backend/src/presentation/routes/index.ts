/**
 * API Routes Index
 * Main routing configuration
 */

import { Router } from 'express';
import { config } from '@/shared/config/environment';

// Import route modules
import { authRoutes } from './auth.routes';
import { userRoutes } from './user.routes';
import { contentRoutes } from './content.routes';
import { categoryRoutes } from './category.routes';
import { searchRoutes } from './search.routes';
// import { subscriptionRoutes } from './subscription.routes';
// import { paymentRoutes } from './payment.routes';
import { uploadRoutes } from './upload.routes';
import chunkedUploadRoutes from './chunked-upload.routes';
import adminVideoRoutes from './admin-video.routes';
// import { adminRoutes } from './admin.routes';

const router = Router();

// API version prefix
const v1Router = Router();

// Health check endpoint
v1Router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: config.server.apiVersion,
    environment: config.app.environment,
  });
});

// API info endpoint
v1Router.get('/', (req, res) => {
  res.json({
    name: config.app.name,
    version: config.server.apiVersion,
    environment: config.app.environment,
    documentation: config.app.enableApiDocs ? '/api/v1/docs' : null,
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      content: '/api/v1/content',
      categories: '/api/v1/categories',
      search: '/api/v1/search',
      subscriptions: '/api/v1/subscriptions',
      payments: '/api/v1/payments',
      uploads: '/api/v1/uploads',
      chunkedUploads: '/api/v1/chunked-uploads',
      admin: '/api/v1/admin',
    },
  });
});

// Mount route modules
v1Router.use('/auth', authRoutes);
v1Router.use('/users', userRoutes);
v1Router.use('/content', contentRoutes);
v1Router.use('/categories', categoryRoutes);
v1Router.use('/search', searchRoutes);
// v1Router.use('/subscriptions', subscriptionRoutes);
// v1Router.use('/payments', paymentRoutes);
v1Router.use('/uploads', uploadRoutes);
v1Router.use('/chunked-uploads', chunkedUploadRoutes);
v1Router.use('/admin/videos', adminVideoRoutes);
// v1Router.use('/admin', adminRoutes);

// Temporary placeholder routes for development (only for unimplemented features)
v1Router.get('/subscriptions', (req, res) => {
  res.json({ message: 'Subscription routes - Coming soon' });
});

v1Router.get('/payments', (req, res) => {
  res.json({ message: 'Payment routes - Coming soon' });
});

v1Router.get('/admin', (req, res) => {
  res.json({ message: 'Admin dashboard routes - Coming soon' });
});

// API documentation endpoint (placeholder)
if (config.app.enableApiDocs) {
  v1Router.get('/docs', (req, res) => {
    res.json({
      message: 'API Documentation',
      note: 'This will be replaced with Swagger/OpenAPI documentation',
      endpoints: {
        'GET /api/v1/': 'API information',
        'GET /api/v1/health': 'Health check',
        'POST /api/v1/auth/login': 'User login',
        'POST /api/v1/auth/register': 'User registration',
        'GET /api/v1/courses': 'List courses',
        'GET /api/v1/courses/:id': 'Get course details',
        'GET /api/v1/categories': 'List categories',
        'GET /api/v1/episodes/:id': 'Get episode details',
      },
    });
  });
}

// Mount v1 routes
router.use('/v1', v1Router);

// Default API route (latest version)
router.use('/', v1Router);

export { router as apiRoutes };