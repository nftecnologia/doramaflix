/**
 * Content Routes
 * Handles all content-related endpoints (courses, shows, movies, episodes)
 */

import { Router } from 'express';
import { contentController } from '@/application/controllers/content.controller';
import { authMiddleware, adminOrManager, optionalAuthMiddleware } from '@/application/middlewares/auth.middleware';

const router = Router();

// =============================================
// PUBLIC CONTENT ROUTES
// =============================================

/**
 * @route   GET /api/v1/content
 * @desc    Get all published content with pagination and filtering
 * @access  Public
 * @query   page?, limit?, sort?, order?, type?, isPremium?
 */
router.get('/', optionalAuthMiddleware, contentController.getAllContent);

/**
 * @route   GET /api/v1/content/featured
 * @desc    Get featured content
 * @access  Public
 * @query   limit?
 */
router.get('/featured', contentController.getFeaturedContent);

/**
 * @route   GET /api/v1/content/popular
 * @desc    Get popular content based on views
 * @access  Public
 * @query   limit?
 */
router.get('/popular', contentController.getPopularContent);

/**
 * @route   GET /api/v1/content/recent
 * @desc    Get recently added content
 * @access  Public
 * @query   limit?
 */
router.get('/recent', contentController.getRecentContent);

/**
 * @route   GET /api/v1/content/slug/:slug
 * @desc    Get content by slug
 * @access  Public
 * @param   slug - Content slug
 */
router.get('/slug/:slug', optionalAuthMiddleware, contentController.getContentBySlug);

/**
 * @route   GET /api/v1/content/episodes/:id
 * @desc    Get episode details
 * @access  Public (but may require subscription for premium content)
 * @param   id - Episode UUID
 */
router.get('/episodes/:id', optionalAuthMiddleware, contentController.getEpisode);

/**
 * @route   GET /api/v1/content/:courseId/episodes
 * @desc    Get episodes for a course
 * @access  Public
 * @param   courseId - Course UUID
 * @query   page?, limit?, sort?, order?
 */
router.get('/:courseId/episodes', optionalAuthMiddleware, contentController.getEpisodesByCourse);

/**
 * @route   GET /api/v1/content/:id
 * @desc    Get content details by ID
 * @access  Public
 * @param   id - Content UUID
 */
router.get('/:id', optionalAuthMiddleware, contentController.getContent);

// =============================================
// ADMIN/MANAGER CONTENT MANAGEMENT ROUTES
// =============================================

/**
 * @route   GET /api/v1/content/admin/all
 * @desc    Get all content including drafts and inactive (admin only)
 * @access  Protected (Admin/Manager)
 * @query   page?, limit?, sort?, order?, type?, status?
 */
router.get('/admin/all', authMiddleware, adminOrManager, contentController.getAllContentAdmin);

/**
 * @route   POST /api/v1/content
 * @desc    Create new content
 * @access  Protected (Admin/Manager)
 * @body    CreateContentRequest
 */
router.post('/', authMiddleware, adminOrManager, contentController.createContent);

/**
 * @route   PUT /api/v1/content/:id
 * @desc    Update content
 * @access  Protected (Admin/Manager)
 * @param   id - Content UUID
 * @body    UpdateContentRequest
 */
router.put('/:id', authMiddleware, adminOrManager, contentController.updateContent);

/**
 * @route   DELETE /api/v1/content/:id
 * @desc    Delete content
 * @access  Protected (Admin/Manager)
 * @param   id - Content UUID
 */
router.delete('/:id', authMiddleware, adminOrManager, contentController.deleteContent);

/**
 * @route   POST /api/v1/content/episodes
 * @desc    Create new episode
 * @access  Protected (Admin/Manager)
 * @body    CreateEpisodeRequest
 */
router.post('/episodes', authMiddleware, adminOrManager, contentController.createEpisode);

export { router as contentRoutes };