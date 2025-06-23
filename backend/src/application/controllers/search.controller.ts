/**
 * Search Controller
 * Handles search and filtering endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { SearchService } from '@/application/services/search.service';
import { SearchRequest } from '@/shared/types';
import { ResponseUtil } from '@/shared/utils/response.utils';
import { searchSchema, uuidSchema } from '@/shared/validators/common.validators';

export class SearchController {
  constructor(private searchService: SearchService) {}

  // =============================================
  // MAIN SEARCH ENDPOINTS
  // =============================================

  // GET /api/v1/search
  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate search parameters
      const validationResult = searchSchema.safeParse(req.query);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const searchParams: SearchRequest = validationResult.data;

      const result = await this.searchService.search(searchParams);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Search completed successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/search/quick
  quickSearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, limit } = req.query;

      if (!q || typeof q !== 'string') {
        return ResponseUtil.validationError(res, [{
          field: 'q',
          message: 'Search query is required',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const searchLimit = limit ? parseInt(limit as string) : 10;

      if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 50) {
        return ResponseUtil.validationError(res, [{
          field: 'limit',
          message: 'Limit must be between 1 and 50',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.searchService.quickSearch(q, searchLimit);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Quick search completed successfully');
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // CATEGORY & TAG SEARCH ENDPOINTS
  // =============================================

  // GET /api/v1/search/category/:categoryId
  searchByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categoryId } = req.params;

      // Validate categoryId
      const categoryIdValidation = uuidSchema.safeParse(categoryId);
      if (!categoryIdValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'categoryId',
          message: 'Invalid category ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.searchService.searchByCategory(categoryId, req.query);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.paginated(
        res, 
        result.data!.items, 
        result.data!.meta, 
        'Category search completed successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/search/tag/:tagId
  searchByTag = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tagId } = req.params;

      // Validate tagId
      const tagIdValidation = uuidSchema.safeParse(tagId);
      if (!tagIdValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'tagId',
          message: 'Invalid tag ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.searchService.searchByTag(tagId, req.query);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.paginated(
        res, 
        result.data!.items, 
        result.data!.meta, 
        'Tag search completed successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // TRENDING & SUGGESTIONS ENDPOINTS
  // =============================================

  // GET /api/v1/search/trending
  getTrendingSearches = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit } = req.query;
      const searchLimit = limit ? parseInt(limit as string) : 10;

      if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 50) {
        return ResponseUtil.validationError(res, [{
          field: 'limit',
          message: 'Limit must be between 1 and 50',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.searchService.getTrendingSearches(searchLimit);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Trending searches retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/search/suggestions
  getSearchSuggestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q, limit } = req.query;

      if (!q || typeof q !== 'string') {
        return ResponseUtil.validationError(res, [{
          field: 'q',
          message: 'Search query is required',
          code: 'VALIDATION_ERROR'
        }]);
      }

      if (q.length < 2) {
        return ResponseUtil.success(res, [], 'Query too short for suggestions');
      }

      const searchLimit = limit ? parseInt(limit as string) : 5;

      if (isNaN(searchLimit) || searchLimit < 1 || searchLimit > 20) {
        return ResponseUtil.validationError(res, [{
          field: 'limit',
          message: 'Limit must be between 1 and 20',
          code: 'VALIDATION_ERROR'
        }]);
      }

      // For suggestions, we'll use quick search
      const result = await this.searchService.quickSearch(q, searchLimit);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      // Extract just the titles for suggestions
      const suggestions = result.data!.map(item => item.title);

      return ResponseUtil.success(res, suggestions, 'Search suggestions retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // ADVANCED SEARCH ENDPOINTS
  // =============================================

  // POST /api/v1/search/advanced
  advancedSearch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate search parameters from request body
      const validationResult = searchSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const searchParams: SearchRequest = validationResult.data;

      const result = await this.searchService.search(searchParams);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Advanced search completed successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/search/filters
  getSearchFilters = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = req.query;
      const query = q ? String(q) : undefined;

      // Create a minimal search to get filters
      const searchParams: SearchRequest = {
        query,
        page: 1,
        limit: 1
      };

      const result = await this.searchService.search(searchParams);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data!.filters, 'Search filters retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

// Create controller instance
const searchService = new SearchService();
export const searchController = new SearchController(searchService);