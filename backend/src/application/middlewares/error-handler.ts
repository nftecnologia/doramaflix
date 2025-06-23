/**
 * Error Handler Middleware
 * Global error handling for the application
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/shared/utils/logger';
import { config } from '@/shared/config/environment';
import { ZodError } from 'zod';
import { ValidationError } from 'joi';

// Custom error types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode?: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    errorCode?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.errorCode = errorCode;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationAppError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, true, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, true, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, true, 'NOT_FOUND_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, true, 'CONFLICT_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests') {
    super(message, 429, true, 'RATE_LIMIT_ERROR');
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service temporarily unavailable') {
    super(message, 503, true, 'SERVICE_UNAVAILABLE_ERROR');
  }
}

// Error response interface
interface ErrorResponse {
  success: false;
  message: string;
  errors: Array<{
    code: string;
    message: string;
    field?: string;
    details?: any;
  }>;
  meta: {
    timestamp: string;
    requestId: string;
    path?: string;
    statusCode?: number;
    stack?: string;
  };
}

// Handle different error types
const handleDatabaseError = (error: any): AppError => {
  // Prisma errors
  if (error.code === 'P2002') {
    const field = error.meta?.target?.[0] || 'field';
    return new ConflictError(`${field} already exists`);
  }
  
  if (error.code === 'P2025') {
    return new NotFoundError('Record');
  }

  if (error.code === 'P2003') {
    return new ValidationAppError('Invalid reference in request data');
  }

  // Generic database error
  return new AppError('Database operation failed', 500, true, 'DATABASE_ERROR');
};

const handleValidationError = (error: ZodError | ValidationError): ValidationAppError => {
  if (error instanceof ZodError) {
    const details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code,
    }));
    
    return new ValidationAppError('Validation failed', details);
  }

  // Joi validation error
  const details = error.details?.map(detail => ({
    field: detail.path.join('.'),
    message: detail.message,
    type: detail.type,
  }));

  return new ValidationAppError('Validation failed', details);
};

const handleJWTError = (error: any): AuthenticationError => {
  if (error.name === 'TokenExpiredError') {
    return new AuthenticationError('Token has expired');
  }
  
  if (error.name === 'JsonWebTokenError') {
    return new AuthenticationError('Invalid token');
  }

  return new AuthenticationError('Authentication failed');
};

// Generate unique request ID
const generateRequestId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Main error handler middleware
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = generateRequestId();
  
  // Add request ID to response headers for tracking
  res.setHeader('X-Request-ID', requestId);

  let appError: AppError;

  // Handle known error types
  if (error instanceof AppError) {
    appError = error;
  } else if (error instanceof ZodError || error.name === 'ValidationError') {
    appError = handleValidationError(error as ZodError | ValidationError);
  } else if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
    appError = handleJWTError(error);
  } else if (error.message?.includes('P2002') || error.message?.includes('P2025')) {
    appError = handleDatabaseError(error);
  } else {
    // Unknown error - treat as internal server error
    appError = new AppError(
      config.app.environment === 'production' 
        ? 'Internal server error' 
        : error.message,
      500,
      false,
      'INTERNAL_SERVER_ERROR'
    );
  }

  // Log error details
  const logLevel = appError.statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]('Error Handler', {
    requestId,
    message: appError.message,
    statusCode: appError.statusCode,
    errorCode: appError.errorCode,
    isOperational: appError.isOperational,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    details: appError.details,
    stack: config.app.environment !== 'production' ? appError.stack : undefined,
  });

  // Prepare error response
  const errorResponse: ErrorResponse = {
    success: false,
    message: 'Request failed',
    errors: [{
      code: appError.errorCode || 'INTERNAL_ERROR',
      message: appError.message,
      details: appError.details
    }],
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
      path: req.originalUrl,
      statusCode: appError.statusCode,
    },
  };

  // Add stack trace in development mode
  if (config.app.environment !== 'production') {
    errorResponse.meta.stack = appError.stack;
  }

  // Send error response
  res.status(appError.statusCode).json(errorResponse);
};

// Async error wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404 handler should be in a separate file, but including here for completeness
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  const error = new NotFoundError(`Route ${req.originalUrl}`);
  next(error);
};