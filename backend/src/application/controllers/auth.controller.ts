/**
 * Authentication Controller
 * Handles authentication-related HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/application/services/auth.service';
import { 
  LoginRequest, 
  RegisterRequest, 
  RefreshTokenRequest,
  ChangePasswordRequest,
  ForgotPasswordRequest,
  AuthenticatedRequest
} from '@/shared/types';
import { ResponseUtil } from '@/shared/utils/response.utils';
import { 
  loginSchema, 
  registerSchema, 
  refreshTokenSchema,
  changePasswordSchema,
  forgotPasswordSchema
} from '@/shared/validators/common.validators';

export class AuthController {
  constructor(private authService: AuthService) {}

  // POST /api/v1/auth/register
  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const data: RegisterRequest = validationResult.data;
      const ip = req.ip;

      const result = await this.authService.register(data, ip);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.created(res, result.data, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  };

  // POST /api/v1/auth/login
  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const credentials: LoginRequest = validationResult.data;
      const ip = req.ip;

      const result = await this.authService.login(credentials, ip);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  // POST /api/v1/auth/refresh
  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validationResult = refreshTokenSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const request: RefreshTokenRequest = validationResult.data;

      const result = await this.authService.refreshToken(request);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, result.data, 'Tokens refreshed successfully');
    } catch (error) {
      next(error);
    }
  };

  // POST /api/v1/auth/logout
  logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const refreshToken = req.body?.refreshToken;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      const result = await this.authService.logout(userId, refreshToken);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, undefined, 'Logout successful');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/auth/me
  getProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      return ResponseUtil.success(res, { user }, 'Profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  // POST /api/v1/auth/change-password
  changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return ResponseUtil.unauthorized(res, 'User not authenticated');
      }

      // Validate request body
      const validationResult = changePasswordSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const request: ChangePasswordRequest = validationResult.data;

      const result = await this.authService.changePassword(userId, request);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, undefined, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  };

  // POST /api/v1/auth/forgot-password
  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validationResult = forgotPasswordSchema.safeParse(req.body);
      if (!validationResult.success) {
        return ResponseUtil.validationError(res, 
          validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: 'VALIDATION_ERROR'
          }))
        );
      }

      const request: ForgotPasswordRequest = validationResult.data;

      const result = await this.authService.forgotPassword(request);

      if (!result.success) {
        return ResponseUtil.error(res, result.error!);
      }

      return ResponseUtil.success(res, undefined, 
        'If an account with that email exists, a password reset link has been sent');
    } catch (error) {
      next(error);
    }
  };

  // GET /api/v1/auth/verify-token
  verifyToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        return ResponseUtil.unauthorized(res, 'Invalid token');
      }

      return ResponseUtil.success(res, { valid: true, user }, 'Token is valid');
    } catch (error) {
      next(error);
    }
  };
}

// Create controller instance
const authService = new AuthService();
export const authController = new AuthController(authService);