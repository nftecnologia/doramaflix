/**
 * Authentication Routes - Simple Version
 * Basic authentication routes for testing
 */

import { Router } from 'express';
import { authController } from '@/application/controllers/auth.controller';

const router = Router();

// ===========================
// PUBLIC ROUTES ONLY (for now)
// ===========================

// Authentication
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', authController.forgotPassword);

// ===========================
// HEALTH CHECK
// ===========================

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Auth service is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;