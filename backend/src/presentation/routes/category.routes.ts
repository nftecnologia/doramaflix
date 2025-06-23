/**
 * Category Routes
 * Handles all category and tag related endpoints
 */

import { Router } from 'express';
import { categoryController } from '@/application/controllers/category.controller';
import { authMiddleware, adminOrManager } from '@/application/middlewares/auth.middleware';

const router = Router();

// =============================================
// PUBLIC CATEGORY ROUTES
// =============================================

/**
 * @route   GET /api/v1/categories
 * @desc    Get all active categories
 * @access  Public
 * @query   page?, limit?, includeInactive? (admin only)
 */
router.get('/', categoryController.getAllCategories);

/**
 * @route   GET /api/v1/categories/slug/:slug
 * @desc    Get category by slug
 * @access  Public
 * @param   slug - Category slug
 */
router.get('/slug/:slug', categoryController.getCategoryBySlug);

/**
 * @route   GET /api/v1/categories/:id
 * @desc    Get category by ID
 * @access  Public
 * @param   id - Category UUID
 */
router.get('/:id', categoryController.getCategory);

// =============================================
// TAG ROUTES
// =============================================

/**
 * @route   GET /api/v1/categories/tags
 * @desc    Get all tags with pagination and search
 * @access  Public
 * @query   page?, limit?, search?
 */
router.get('/tags', categoryController.getAllTags);

/**
 * @route   GET /api/v1/categories/tags/popular
 * @desc    Get popular tags based on usage
 * @access  Public
 * @query   limit?
 */
router.get('/tags/popular', categoryController.getPopularTags);

/**
 * @route   GET /api/v1/categories/tags/:id
 * @desc    Get tag by ID
 * @access  Public
 * @param   id - Tag UUID
 */
router.get('/tags/:id', categoryController.getTag);

/**
 * @route   POST /api/v1/categories/tags
 * @desc    Create new tag
 * @access  Protected (Admin/Manager)
 * @body    { name: string }
 */
router.post('/tags', authMiddleware, adminOrManager, categoryController.createTag);

/**
 * @route   DELETE /api/v1/categories/tags/:id
 * @desc    Delete tag
 * @access  Protected (Admin/Manager)
 * @param   id - Tag UUID
 */
router.delete('/tags/:id', authMiddleware, adminOrManager, categoryController.deleteTag);

// =============================================
// ADMIN CATEGORY MANAGEMENT ROUTES
// =============================================

/**
 * @route   POST /api/v1/categories
 * @desc    Create new category
 * @access  Protected (Admin/Manager)
 * @body    CreateCategoryRequest
 */
router.post('/', authMiddleware, adminOrManager, categoryController.createCategory);

/**
 * @route   PUT /api/v1/categories/:id
 * @desc    Update category
 * @access  Protected (Admin/Manager)
 * @param   id - Category UUID
 * @body    UpdateCategoryRequest
 */
router.put('/:id', authMiddleware, adminOrManager, categoryController.updateCategory);

/**
 * @route   DELETE /api/v1/categories/:id
 * @desc    Delete category
 * @access  Protected (Admin/Manager)
 * @param   id - Category UUID
 */
router.delete('/:id', authMiddleware, adminOrManager, categoryController.deleteCategory);

/**
 * @route   PATCH /api/v1/categories/:id/toggle-status
 * @desc    Toggle category active/inactive status
 * @access  Protected (Admin/Manager)
 * @param   id - Category UUID
 */
router.patch('/:id/toggle-status', authMiddleware, adminOrManager, categoryController.toggleCategoryStatus);

export { router as categoryRoutes };