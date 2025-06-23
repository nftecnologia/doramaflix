/**
 * Response Utilities
 * Standardized response formatting for consistent API responses
 */

import { Response } from 'express';
import { ApiResponse, ApiError, ApiMeta, PaginationMeta } from '../types/api.types';
import { AppError } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ResponseUtil {
  /**
   * Send successful response
   */
  static success<T>(
    res: Response,
    data?: T,
    message?: string,
    meta?: Partial<ApiMeta>,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
        ...meta,
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send error response
   */
  static error(
    res: Response,
    error: AppError | Error,
    requestId?: string,
    statusCode?: number
  ): Response {
    const isAppError = error instanceof AppError;
    const status = statusCode || (isAppError ? error.statusCode : 500);
    
    const apiError: ApiError = {
      code: isAppError ? error.code || 'INTERNAL_ERROR' : 'INTERNAL_ERROR',
      message: error.message,
      field: isAppError ? error.field : undefined,
    };

    const response: ApiResponse = {
      success: false,
      message: 'Request failed',
      errors: [apiError],
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId || uuidv4(),
      },
    };

    return res.status(status).json(response);
  }

  /**
   * Send validation error response
   */
  static validationError(
    res: Response,
    errors: Array<{ field: string; message: string; code?: string }>,
    requestId?: string
  ): Response {
    const apiErrors: ApiError[] = errors.map(err => ({
      field: err.field,
      code: err.code || 'VALIDATION_ERROR',
      message: err.message,
    }));

    const response: ApiResponse = {
      success: false,
      message: 'Validation failed',
      errors: apiErrors,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: requestId || uuidv4(),
      },
    };

    return res.status(400).json(response);
  }

  /**
   * Send paginated response
   */
  static paginated<T>(
    res: Response,
    data: T[],
    pagination: PaginationMeta,
    message?: string,
    statusCode: number = 200
  ): Response {
    const response: ApiResponse<T[]> = {
      success: true,
      data,
      message,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: uuidv4(),
        pagination,
        count: data.length,
        total: pagination.total,
      },
    };

    return res.status(statusCode).json(response);
  }

  /**
   * Send created response
   */
  static created<T>(
    res: Response,
    data: T,
    message?: string,
    location?: string
  ): Response {
    if (location) {
      res.location(location);
    }

    return this.success(res, data, message || 'Resource created successfully', undefined, 201);
  }

  /**
   * Send no content response
   */
  static noContent(res: Response): Response {
    return res.status(204).send();
  }

  /**
   * Send not found response
   */
  static notFound(res: Response, resource: string = 'Resource', requestId?: string): Response {
    const error = new AppError(`${resource} not found`, 404, true, 'NOT_FOUND');
    return this.error(res, error, requestId);
  }

  /**
   * Send unauthorized response
   */
  static unauthorized(res: Response, message?: string, requestId?: string): Response {
    const error = new AppError(message || 'Authentication required', 401, true, 'UNAUTHORIZED');
    return this.error(res, error, requestId);
  }

  /**
   * Send forbidden response
   */
  static forbidden(res: Response, message?: string, requestId?: string): Response {
    const error = new AppError(message || 'Insufficient permissions', 403, true, 'FORBIDDEN');
    return this.error(res, error, requestId);
  }

  /**
   * Send conflict response
   */
  static conflict(res: Response, message: string, requestId?: string): Response {
    const error = new AppError(message, 409, true, 'CONFLICT');
    return this.error(res, error, requestId);
  }

  /**
   * Send rate limit response
   */
  static rateLimit(res: Response, message?: string, requestId?: string): Response {
    const error = new AppError(message || 'Too many requests', 429, true, 'RATE_LIMIT');
    return this.error(res, error, requestId);
  }

  /**
   * Send server error response
   */
  static serverError(res: Response, message?: string, requestId?: string): Response {
    const error = new AppError(message || 'Internal server error', 500, true, 'INTERNAL_ERROR');
    return this.error(res, error, requestId);
  }
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * Parse pagination query parameters
 */
export function parsePaginationQuery(query: any): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Parse sort query parameters
 */
export function parseSortQuery(query: any, allowedFields: string[] = []): Record<string, 'asc' | 'desc'> | undefined {
  if (!query.sort) return undefined;

  const sortField = query.sort;
  const sortOrder = (query.order?.toLowerCase() === 'desc') ? 'desc' : 'asc';

  // Validate sort field if allowed fields are specified
  if (allowedFields.length > 0 && !allowedFields.includes(sortField)) {
    return undefined;
  }

  return { [sortField]: sortOrder };
}

/**
 * Transform database entity to API response
 */
export function transformEntity<T, R>(
  entity: T,
  transformer: (entity: T) => R
): R {
  return transformer(entity);
}

/**
 * Transform array of database entities to API response
 */
export function transformEntities<T, R>(
  entities: T[],
  transformer: (entity: T) => R
): R[] {
  return entities.map(transformer);
}

/**
 * Safe JSON stringify for logging
 */
export function safeStringify(obj: any): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch (error) {
    return '[Circular Reference or Invalid JSON]';
  }
}

/**
 * Extract request metadata for logging
 */
export function extractRequestMeta(req: any): Record<string, any> {
  return {
    method: req.method,
    url: req.originalUrl || req.url,
    ip: req.ip || req.connection?.remoteAddress,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
  };
}