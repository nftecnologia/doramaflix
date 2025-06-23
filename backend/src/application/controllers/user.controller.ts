/**
 * User Controller
 * Handles user profile, preferences, and activity endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { UserService } from '@/application/services/user.service';
import { 
  UpdateUserProfileRequest,
  UserPreferences,
  UpdateProgressRequest,
  CreateReviewRequest,
  AuthenticatedRequest
} from '@/shared/types';
import { ResponseUtil } from '@/shared/utils/response.utils';
import { 
  updateUserProfileSchema,
  userPreferencesSchema,
  updateProgressSchema,
  createReviewSchema,
  uuidSchema
} from '@/shared/validators/common.validators';

export class UserController {
  constructor(private userService: UserService) {}

  // =============================================
  // USER PROFILE ENDPOINTS
  // =============================================

  // GET /api/v1/users/profile
  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      const result = await this.userService.getUserProfile(userId);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/v1/users/profile
  updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate request body
      const validationResult = updateUserProfileSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const data: UpdateUserProfileRequest = validationResult.data;

      const result = await this.userService.updateUserProfile(userId, data);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/v1/users/profile
  deleteAccount = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      const result = await this.userService.deleteUserAccount(userId);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, undefined, 'Account deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // USER PREFERENCES ENDPOINTS
  // =============================================

  // GET /api/v1/users/preferences
  getPreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      const result = await this.userService.getUserPreferences(userId);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Preferences retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // PUT /api/v1/users/preferences
  updatePreferences = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate request body
      const validationResult = userPreferencesSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const preferences: UserPreferences = validationResult.data;

      const result = await this.userService.updateUserPreferences(userId, preferences);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Preferences updated successfully');
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // WATCH PROGRESS & HISTORY ENDPOINTS
  // =============================================

  // POST /api/v1/users/progress
  updateProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate request body
      const validationResult = updateProgressSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const data: UpdateProgressRequest = validationResult.data;

      const result = await this.userService.updateWatchProgress(userId, data);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Progress updated successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/users/progress
  getProgress = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      const result = await this.userService.getUserProgress(userId, req.query);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.paginated(res, result.data!.items, result.data!.meta, 'Progress retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/users/history
  getWatchHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      const result = await this.userService.getWatchHistory(userId, req.query);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.paginated(res, result.data!.items, result.data!.meta, 'Watch history retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/users/continue-watching
  getContinueWatching = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      const result = await this.userService.getContinueWatching(userId);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Continue watching retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // FAVORITES ENDPOINTS
  // =============================================

  // POST /api/v1/users/favorites/:courseId
  addToFavorites = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { courseId } = req.params;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate courseId
      const courseIdValidation = uuidSchema.safeParse(courseId);
      if (!courseIdValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'courseId',
          message: 'Invalid course ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.userService.addToFavorites(userId, courseId);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.created(res, result.data, 'Added to favorites successfully');
    } catch (error) {
      next(error);
    }
  };

  // DELETE /api/v1/users/favorites/:courseId
  removeFromFavorites = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const { courseId } = req.params;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate courseId
      const courseIdValidation = uuidSchema.safeParse(courseId);
      if (!courseIdValidation.success) {
        return ResponseUtil.validationError(res, [{
          field: 'courseId',
          message: 'Invalid course ID format',
          code: 'VALIDATION_ERROR'
        }]);
      }

      const result = await this.userService.removeFromFavorites(userId, courseId);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, undefined, 'Removed from favorites successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/users/favorites
  getFavorites = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      const result = await this.userService.getUserFavorites(userId, req.query);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.paginated(res, result.data!.items, result.data!.meta, 'Favorites retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // REVIEWS ENDPOINTS
  // =============================================

  // POST /api/v1/users/reviews
  createReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate request body
      const validationResult = createReviewSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const data: CreateReviewRequest = validationResult.data;

      const result = await this.userService.createReview(userId, data);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.created(res, result.data, 'Review created successfully');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/users/reviews
  getReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      const result = await this.userService.getUserReviews(userId, req.query);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.paginated(res, result.data!.items, result.data!.meta, 'Reviews retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // =============================================
  // STATISTICS ENDPOINTS
  // =============================================

  // GET /api/v1/users/stats
  getStats = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      const result = await this.userService.getUserStats(userId);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  };
}

// Create controller instance
const userService = new UserService();
export const userController = new UserController(userService);