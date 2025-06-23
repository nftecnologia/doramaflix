/**
 * Authentication Middleware
 * JWT token verification and user authentication
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '@/application/services/auth.service';
import { 
  AuthenticationError, 
  AuthorizationError,
  UserRole,
  AuthenticatedRequest
} from '@/shared/types';
import { ResponseUtil } from '@/shared/utils/response.utils';

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

// Verify JWT token and set user in request
export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ResponseUtil.unauthorized(res, 'Access token required');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token and get user
    const authService = new AuthService();
    const result = await authService.verifyToken(token);
    
    if (!result.success || !result.data) {
      return ResponseUtil.unauthorized(res, 'Invalid or expired token');
    }

    // Set user in request
    req.user = {
      id: result.data.id,
      email: result.data.email,
      role: result.data.role,
    };

    next();
  } catch (error) {
    return ResponseUtil.unauthorized(res, 'Authentication failed');
  }
};

// Optional authentication - doesn't throw if no token
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const authService = new AuthService();
      const result = await authService.verifyToken(token);
      
      if (result.success && result.data) {
        req.user = {
          id: result.data.id,
          email: result.data.email,
          role: result.data.role,
        };
      }
    }

    next();
  } catch (error) {
    // For optional auth, continue without user if token is invalid
    next();
  }
};

// Authorize specific roles
export const authorize = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return ResponseUtil.unauthorized(res, 'Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      return ResponseUtil.forbidden(res, 'Insufficient permissions');
    }

    next();
  };
};

// Role-based middleware functions
export const adminOnly = authorize(['admin']);
export const adminOrManager = authorize(['admin', 'manager']);
export const authenticatedUser = authMiddleware;