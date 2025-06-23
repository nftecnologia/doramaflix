/**
 * Content Controller
 * Handles content (courses/shows/movies) related endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ContentService } from '@/application/services/content.service';
import { 
  CreateContentRequest,
  UpdateContentRequest,
  CreateEpisodeRequest,
  AuthenticatedRequest
} from '@/shared/types';
import { ResponseUtil } from '@/shared/utils/response.utils';
import { 
  createContentSchema,
  updateContentSchema,
  createEpisodeSchema,
  uuidSchema
} from '@/shared/validators/common.validators';
import { adminOrManager } from '@/application/middlewares/auth.middleware';

export class ContentController {
  constructor(private contentService: ContentService) {}

  // =============================================
  // PUBLIC CONTENT ENDPOINTS
  // =============================================

  // GET /api/v1/content
  getAllContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.contentService.getAllContent(req.query, false);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.paginated(res, result.data!.items, result.data!.meta, 'Content retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/content/:id
  getContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Validate ID
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'id',
          message: 'Invalid content ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.contentService.getContent(id, false);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Content retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/content/slug/:slug
  getContentBySlug = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { slug } = req.params;

      if (!slug || slug.length < 1) {
        return ResponseUtil.validationError(res, [{
          field: 'slug',
          message: 'Slug is required',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.contentService.getContentBySlug(slug, false);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Content retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/content/featured
  getFeaturedContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await this.contentService.getFeaturedContent(limit);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Featured content retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/content/popular
  getPopularContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await this.contentService.getPopularContent(limit);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Popular content retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/content/recent
  getRecentContent = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await this.contentService.getRecentContent(limit);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Recent content retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // EPISODE ENDPOINTS
  // =============================================

  // GET /api/v1/content/:courseId/episodes
  getEpisodesByCourse = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;

      // Validate courseId
      const courseIdValidation = uuidSchema.safeParse(courseId);
      if (!courseIdValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'courseId',
          message: 'Invalid course ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.contentService.getEpisodesByCourse(courseId, req.query);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.paginated(res, result.data!.items, result.data!.meta, 'Episodes retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/content/episodes/:id
  getEpisode = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      // Validate ID
      const idValidation = uuidSchema.safeParse(id);
      if (!idValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'id',
          message: 'Invalid episode ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.contentService.getEpisode(id);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Episode retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // ADMIN/MANAGER CONTENT MANAGEMENT ENDPOINTS
  // =============================================

  // POST /api/v1/content
  createContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate request body
      const validationResult = createContentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const data: CreateContentRequest = validationResult.data;

      const result = await this.contentService.createContent(data, userId);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.created(res, result.data, 'Content created successfully');
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/v1/content/:id
  updateContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
          message: 'Invalid content ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      // Validate request body
      const validationResult = updateContentSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const data: UpdateContentRequest = validationResult.data;

      const result = await this.contentService.updateContent(id, data, userId);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Content updated successfully');
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/v1/content/:id
  deleteContent = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
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
          message: 'Invalid content ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.contentService.deleteContent(id, userId);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, undefined, 'Content deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/content/admin/all
  getAllContentAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Include inactive content for admin view
      const result = await this.contentService.getAllContent(req.query, true);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.paginated(res, result.data!.items, result.data!.meta, 'Content retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // EPISODE MANAGEMENT ENDPOINTS
  // =============================================

  // POST /api/v1/content/episodes
  createEpisode = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate request body
      const validationResult = createEpisodeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const data: CreateEpisodeRequest = validationResult.data;

      const result = await this.contentService.createEpisode(data, userId);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.created(res, result.data, 'Episode created successfully');
    } catch (error) {
      next(error);
    }
  };
}

// Create controller instance
const contentService = new ContentService();
export const contentController = new ContentController(contentService);