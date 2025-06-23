/**
 * Search Routes
 * Handles all search and filtering endpoints
 */

import { Router } from 'express';
import { searchController } from '@/application/controllers/search.controller';
import { optionalAuthMiddleware } from '@/application/middlewares/auth.middleware';

const router = Router();

// Apply optional authentication to track user search behavior
router.use(optionalAuthMiddleware);

// =============================================
// MAIN SEARCH ROUTES
// =============================================

/**
 * @route   GET /api/v1/search
 * @desc    Main search endpoint with advanced filtering
 * @access  Public
 * @query   query?, type?, categories?, tags?, isPremium?, minRating?, minDuration?, maxDuration?, releaseYear?, status?, page?, limit?, sort?, order?
 */
router.get('/', searchController.search);

/**
 * @route   GET /api/v1/search/quick
 * @desc    Quick search for autocomplete functionality
 * @access  Public
 * @query   q (required), limit?
 */
router.get('/quick', searchController.quickSearch);

/**
 * @route   POST /api/v1/search/advanced
 * @desc    Advanced search with complex filtering (alternative to GET with body)
 * @access  Public
 * @body    SearchRequest object
 */
router.post('/advanced', searchController.advancedSearch);

// =============================================
// CATEGORY & TAG SEARCH ROUTES
// =============================================

/**
 * @route   GET /api/v1/search/category/:categoryId
 * @desc    Search content by category
 * @access  Public
 * @param   categoryId - Category UUID
 * @query   page?, limit?, sort?, order?
 */
router.get('/category/:categoryId', searchController.searchByCategory);

/**
 * @route   GET /api/v1/search/tag/:tagId
 * @desc    Search content by tag
 * @access  Public
 * @param   tagId - Tag UUID
 * @query   page?, limit?, sort?, order?
 */
router.get('/tag/:tagId', searchController.searchByTag);

// =============================================
// SUGGESTIONS & TRENDING ROUTES
// =============================================

/**
 * @route   GET /api/v1/search/suggestions
 * @desc    Get search suggestions for autocomplete
 * @access  Public
 * @query   q (required), limit?
 */
router.get('/suggestions', searchController.getSearchSuggestions);

/**
 * @route   GET /api/v1/search/trending
 * @desc    Get trending search terms
 * @access  Public
 * @query   limit?
 */
router.get('/trending', searchController.getTrendingSearches);

/**
 * @route   GET /api/v1/search/filters
 * @desc    Get available search filters and their counts
 * @access  Public
 * @query   q? (optional search context)
 */
router.get('/filters', searchController.getSearchFilters);

export { router as searchRoutes };