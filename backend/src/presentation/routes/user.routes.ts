/**
 * User Routes
 * Handles all user-related endpoints (profile, preferences, activity)
 */

import { Router } from 'express';
import { userController } from '@/application/controllers/user.controller';
import { authMiddleware } from '@/application/middlewares/auth.middleware';

const router = Router();

// All user routes require authentication
router.use(authMiddleware);

// =============================================
// USER PROFILE ROUTES
// =============================================

/**
 * @route   GET /api/v1/users/profile
 * @desc    Get current user profile
 * @access  Protected
 */
router.get('/profile', userController.getProfile);

/**
 * @route   PUT /api/v1/users/profile
 * @desc    Update user profile
 * @access  Protected
 * @body    { firstName?: string, lastName?: string, avatarUrl?: string }
 */
router.put('/profile', userController.updateProfile);

/**
 * @route   DELETE /api/v1/users/profile
 * @desc    Delete user account
 * @access  Protected
 */
router.delete('/profile', userController.deleteAccount);

// =============================================
// USER PREFERENCES ROUTES
// =============================================

/**
 * @route   GET /api/v1/users/preferences
 * @desc    Get user preferences
 * @access  Protected
 */
router.get('/preferences', userController.getPreferences);

/**
 * @route   PUT /api/v1/users/preferences
 * @desc    Update user preferences
 * @access  Protected
 * @body    UserPreferences object
 */
router.put('/preferences', userController.updatePreferences);

// =============================================
// WATCH PROGRESS & HISTORY ROUTES
// =============================================

/**
 * @route   POST /api/v1/users/progress
 * @desc    Update watch progress for an episode
 * @access  Protected
 * @body    { episodeId: string, progressSeconds: number, completed?: boolean }
 */
router.post('/progress', userController.updateProgress);

/**
 * @route   GET /api/v1/users/progress
 * @desc    Get user's watch progress
 * @access  Protected
 * @query   page?, limit?, sort?, order?
 */
router.get('/progress', userController.getProgress);

/**
 * @route   GET /api/v1/users/history
 * @desc    Get user's watch history
 * @access  Protected
 * @query   page?, limit?, sort?, order?
 */
router.get('/history', userController.getWatchHistory);

/**
 * @route   GET /api/v1/users/continue-watching
 * @desc    Get episodes to continue watching
 * @access  Protected
 */
router.get('/continue-watching', userController.getContinueWatching);

// =============================================
// FAVORITES ROUTES
// =============================================

/**
 * @route   GET /api/v1/users/favorites
 * @desc    Get user's favorite courses
 * @access  Protected
 * @query   page?, limit?, sort?, order?
 */
router.get('/favorites', userController.getFavorites);

/**
 * @route   POST /api/v1/users/favorites/:courseId
 * @desc    Add course to favorites
 * @access  Protected
 * @param   courseId - Course UUID
 */
router.post('/favorites/:courseId', userController.addToFavorites);

/**
 * @route   DELETE /api/v1/users/favorites/:courseId
 * @desc    Remove course from favorites
 * @access  Protected
 * @param   courseId - Course UUID
 */
router.delete('/favorites/:courseId', userController.removeFromFavorites);

// =============================================
// REVIEWS ROUTES
// =============================================

/**
 * @route   GET /api/v1/users/reviews
 * @desc    Get user's reviews
 * @access  Protected
 * @query   page?, limit?, sort?, order?
 */
router.get('/reviews', userController.getReviews);

/**
 * @route   POST /api/v1/users/reviews
 * @desc    Create a review for a course
 * @access  Protected
 * @body    { courseId: string, rating: number, reviewText?: string }
 */
router.post('/reviews', userController.createReview);

// =============================================
// STATISTICS ROUTES
// =============================================

/**
 * @route   GET /api/v1/users/stats
 * @desc    Get user statistics
 * @access  Protected
 */
router.get('/stats', userController.getStats);

export { router as userRoutes };