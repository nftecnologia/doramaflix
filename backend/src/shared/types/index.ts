/**
 * Shared Types Export Index
 * Centralizes all type exports for easy importing
 */

import { Request } from 'express';
import { UserRole } from '@prisma/client';

// API Types
export * from './api.types';

// Domain Entity Types (re-export from Prisma)
export type {
  User,
  RefreshToken,
  Category,
  Course,
  Season,
  Episode,
  Tag,
  SubscriptionPlan,
  Subscription,
  Payment,
  UserProgress,
  WatchHistory,
  UserFavorite,
  UserReview,
  Notification,
  SystemLog,
  UserAudit,
  FileUpload,
  UserRole,
  UserStatus,
  ContentType,
  ContentStatus,
  SubscriptionStatus,
  PaymentStatus,
  PaymentMethod,
  NotificationType,
  NotificationStatus,
  LogLevel,
  FileType,
  UploadStatus,
} from '@prisma/client';

// Common utility types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimestampEntity {
  createdAt: Date;
  updatedAt: Date;
}

export interface SoftDeleteEntity extends TimestampEntity {
  deletedAt?: Date;
}

// Request/Response wrappers
export interface ApiRequest<T = any> extends Request {
  body: T;
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
}

export interface AuthenticatedRequest<T = any> extends Request {
  body: T;
  user: {
    id: string;
    email: string;
    role: UserRole;
  };
}

// Error types
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly field?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    field?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.field = field;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super(message, 400, true, 'VALIDATION_ERROR', field);
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

// Service response wrapper
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  message?: string;
}

// Database query options
export interface QueryOptions {
  include?: Record<string, boolean | QueryOptions>;
  select?: Record<string, boolean>;
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'> | Array<Record<string, 'asc' | 'desc'>>;
  take?: number;
  skip?: number;
}

// Cache configuration
export interface CacheConfig {
  key: string;
  ttl: number;
  tags?: string[];
}

// Event types for notifications/webhooks
export interface AppEvent<T = any> {
  type: string;
  timestamp: Date;
  userId?: string;
  data: T;
  metadata?: Record<string, any>;
}

// Content processing job types
export interface ProcessingJob {
  id: string;
  type: 'video_processing' | 'thumbnail_generation' | 'subtitle_processing';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  fileId: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

// Webhook types
export interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: string;
  signature: string;
}

// Search index types
export interface SearchDocument {
  id: string;
  type: 'course' | 'episode' | 'user';
  title: string;
  description?: string;
  keywords: string[];
  categories: string[];
  tags: string[];
  metadata: Record<string, any>;
  indexedAt: Date;
}

// Recommendation engine types
export interface RecommendationContext {
  userId: string;
  sessionId?: string;
  currentContent?: string;
  watchHistory: string[];
  preferences: {
    categories: string[];
    tags: string[];
    languages: string[];
  };
  demographicData?: {
    age?: number;
    location?: string;
    timezone?: string;
  };
}

// Analytics event types
export interface AnalyticsEvent {
  eventType: 'view' | 'play' | 'pause' | 'complete' | 'skip' | 'like' | 'share';
  userId?: string;
  sessionId: string;
  contentId?: string;
  episodeId?: string;
  timestamp: Date;
  duration?: number;
  position?: number;
  deviceInfo: {
    userAgent: string;
    ip: string;
    country?: string;
    city?: string;
  };
  metadata?: Record<string, any>;
}