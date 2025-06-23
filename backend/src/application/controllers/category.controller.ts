/**
 * Category Controller
 * Handles category and tag management endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '@/application/services/category.service';
import { 
  CreateCategoryRequest,
  AuthenticatedRequest
} from '@/shared/types';
import { ResponseUtil } from '@/shared/utils/response.utils';
import { 
  createCategorySchema,
  updateCategorySchema,
  uuidSchema
} from '@/shared/validators/common.validators';

export class CategoryController {
  constructor(private categoryService: CategoryService) {}

  // =============================================
  // PUBLIC CATEGORY ENDPOINTS
  // =============================================

  // GET /api/v1/categories
  getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.categoryService.getAllCategories(req.query);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.paginated(res, result.data!.items, result.data!.meta, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/categories/:id
  getCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Validate ID
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'id',
          message: 'Invalid category ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.categoryService.getCategory(id);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Category retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/categories/slug/:slug
  getCategoryBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;

      if (!slug || slug.length < 1) {
        return ResponseUtil.validationError(res, [{
          field: 'slug',
          message: 'Slug is required',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.categoryService.getCategoryBySlug(slug);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Category retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // ADMIN CATEGORY MANAGEMENT ENDPOINTS
  // =============================================

  // POST /api/v1/categories
  createCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate request body
      const validationResult = createCategorySchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const data: CreateCategoryRequest = validationResult.data;

      const result = await this.categoryService.createCategory(data);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.created(res, result.data, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/v1/categories/:id
  updateCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate ID
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'id',
          message: 'Invalid category ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      // Validate request body
      const validationResult = updateCategorySchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const data = validationResult.data;

      const result = await this.categoryService.updateCategory(id, data);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/v1/categories/:id
  deleteCategory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate ID
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'id',
          message: 'Invalid category ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.categoryService.deleteCategory(id);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, undefined, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // PATCH /api/v1/categories/:id/toggle-status
  toggleCategoryStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate ID
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'id',
          message: 'Invalid category ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.categoryService.toggleCategoryStatus(id);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Category status updated successfully');
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // TAG ENDPOINTS
  // =============================================

  // GET /api/v1/categories/tags
  getAllTags = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.categoryService.getAllTags(req.query);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.paginated(res, result.data!.items, result.data!.meta, 'Tags retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/categories/tags/:id
  getTag = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Validate ID
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'id',
          message: 'Invalid tag ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.categoryService.getTag(id);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Tag retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // POST /api/v1/categories/tags
  createTag = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      const { name } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length < 1) {
        return ResponseUtil.validationError(res, [{
          field: 'name',
          message: 'Tag name is required',
          code: 'VALIDATION_ERROR'
        }]);
      }

      if (name.length > 50) {
        return ResponseUtil.validationError(res, [{
          field: 'name',
          message: 'Tag name must be less than 50 characters',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.categoryService.createTag(name.trim());

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.created(res, result.data, 'Tag created successfully');
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/v1/categories/tags/:id
  deleteTag = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate ID
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'id',
          message: 'Invalid tag ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.categoryService.deleteTag(id);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, undefined, 'Tag deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/categories/tags/popular
  getPopularTags = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { limit } = req.query;
      const tagLimit = limit ? parseInt(limit as string) : 20;

      if (isNaN(tagLimit) || tagLimit < 1 || tagLimit > 100) {
        return ResponseUtil.validationError(res, [{
          field: 'limit',
          message: 'Limit must be between 1 and 100',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.categoryService.getPopularTags(tagLimit);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Popular tags retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

// Create controller instance
const categoryService = new CategoryService();
export const categoryController = new CategoryController(categoryService);