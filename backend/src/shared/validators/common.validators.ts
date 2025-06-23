/**
 * Common Validation Schemas
 * Reusable validation schemas using Zod
 */

import { z } from 'zod';

// =============================================
// COMMON SCHEMAS
// =============================================

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email must be less than 255 characters');

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
    'Password must contain at least one lowercase letter, one uppercase letter, and one number');

export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens and apostrophes');

export const slugSchema = z.string()
  .min(1, 'Slug is required')
  .max(255, 'Slug must be less than 255 characters')
  .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens');

export const urlSchema = z.string()
  .url('Invalid URL format')
  .max(2048, 'URL must be less than 2048 characters');

export const colorSchema = z.string()
  .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format');

// =============================================
// PAGINATION SCHEMAS
// =============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// =============================================
// AUTHENTICATION SCHEMAS
// =============================================

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'You must accept the terms and conditions',
  }),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string().min(1, 'Password confirmation is required'),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

// =============================================
// USER SCHEMAS
// =============================================

export const updateUserProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  avatarUrl: urlSchema.optional(),
});

export const userPreferencesSchema = z.object({
  language: z.string().min(2).max(5).default('en'),
  theme: z.enum(['light', 'dark', 'auto']).default('auto'),
  autoplay: z.boolean().default(true),
  subtitles: z.boolean().default(false),
  quality: z.enum(['auto', '480p', '720p', '1080p', '1440p', '2160p']).default('auto'),
  volume: z.number().min(0).max(100).default(100),
  notifications: z.object({
    email: z.boolean().default(true),
    push: z.boolean().default(true),
    newContent: z.boolean().default(true),
    recommendations: z.boolean().default(true),
    marketing: z.boolean().default(false),
  }).default({}),
});

// =============================================
// CONTENT SCHEMAS
// =============================================

export const contentTypeSchema = z.enum(['course', 'series', 'movie', 'documentary']);
export const contentStatusSchema = z.enum(['draft', 'published', 'archived', 'coming_soon']);

export const createContentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title must be less than 255 characters'),
  description: z.string().max(5000, 'Description must be less than 5000 characters').optional(),
  shortDescription: z.string().max(500, 'Short description must be less than 500 characters').optional(),
  thumbnailUrl: urlSchema.optional(),
  bannerUrl: urlSchema.optional(),
  trailerUrl: urlSchema.optional(),
  contentType: contentTypeSchema,
  isPremium: z.boolean().default(true),
  price: z.number().min(0).max(999999.99).default(0),
  releaseDate: z.string().datetime().optional(),
  categoryIds: z.array(uuidSchema).min(1, 'At least one category is required'),
  tagNames: z.array(z.string().min(1).max(50)).max(10, 'Maximum 10 tags allowed'),
});

export const updateContentSchema = createContentSchema.partial().extend({
  status: contentStatusSchema.optional(),
});

export const createSeasonSchema = z.object({
  courseId: uuidSchema,
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  seasonNumber: z.number().int().min(1),
  thumbnailUrl: urlSchema.optional(),
});

export const createEpisodeSchema = z.object({
  courseId: uuidSchema,
  seasonId: uuidSchema.optional(),
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().max(2000).optional(),
  episodeNumber: z.number().int().min(1),
  videoUrl: urlSchema.optional(),
  thumbnailUrl: urlSchema.optional(),
  isFree: z.boolean().default(false),
});

// =============================================
// CATEGORY SCHEMAS
// =============================================

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  iconUrl: urlSchema.optional(),
  color: colorSchema.default('#000000'),
  sortOrder: z.number().int().min(0).default(0),
});

export const updateCategorySchema = createCategorySchema.partial();

// =============================================
// SEARCH SCHEMAS
// =============================================

export const searchSchema = z.object({
  query: z.string().max(255).optional(),
  type: contentTypeSchema.optional(),
  categories: z.array(uuidSchema).optional(),
  tags: z.array(z.string()).optional(),
  isPremium: z.boolean().optional(),
  minRating: z.number().min(0).max(5).optional(),
  minDuration: z.number().int().min(0).optional(),
  maxDuration: z.number().int().min(0).optional(),
  releaseYear: z.number().int().min(1900).max(new Date().getFullYear() + 10).optional(),
  status: z.enum(['published', 'coming_soon']).optional(),
}).merge(paginationSchema);

// =============================================
// USER ACTIVITY SCHEMAS
// =============================================

export const updateProgressSchema = z.object({
  episodeId: uuidSchema,
  progressSeconds: z.number().int().min(0),
  completed: z.boolean().optional(),
});

export const createReviewSchema = z.object({
  courseId: uuidSchema,
  rating: z.number().int().min(1).max(5),
  reviewText: z.string().max(2000).optional(),
});

// =============================================
// SUBSCRIPTION SCHEMAS
// =============================================

export const createSubscriptionSchema = z.object({
  planId: uuidSchema,
  paymentMethodId: z.string().optional(),
});

export const createPaymentSchema = z.object({
  subscriptionId: uuidSchema,
  paymentMethodId: z.string().min(1, 'Payment method is required'),
  amount: z.number().min(0.01),
  currency: z.string().length(3).default('USD'),
});

// =============================================
// ADMIN SCHEMAS
// =============================================

export const bulkActionSchema = z.object({
  action: z.enum(['delete', 'activate', 'deactivate', 'archive']),
  ids: z.array(uuidSchema).min(1, 'At least one ID is required'),
  reason: z.string().max(500).optional(),
});

// =============================================
// UPLOAD SCHEMAS
// =============================================

export const uploadMetadataSchema = z.object({
  type: z.enum(['video', 'image', 'audio', 'document', 'subtitle']),
  title: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).optional(),
  courseId: uuidSchema.optional(),
  episodeId: uuidSchema.optional(),
});

// =============================================
// VALIDATION HELPERS
// =============================================

export function validateUUID(id: string): boolean {
  return uuidSchema.safeParse(id).success;
}

export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validatePassword(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}

export function sanitizeString(str: string): string {
  return str.trim().replace(/\s+/g, ' ');
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
}

// =============================================
// CUSTOM VALIDATION FUNCTIONS
// =============================================

export const isValidContentType = (type: string): type is 'course' | 'series' | 'movie' | 'documentary' => {
  return ['course', 'series', 'movie', 'documentary'].includes(type);
};

export const isValidUserRole = (role: string): role is 'admin' | 'manager' | 'student' => {
  return ['admin', 'manager', 'student'].includes(role);
};

export const isValidFileType = (type: string): type is 'video' | 'image' | 'audio' | 'document' | 'subtitle' => {
  return ['video', 'image', 'audio', 'document', 'subtitle'].includes(type);
};

export const isValidVideoQuality = (quality: string): boolean => {
  return ['480p', '720p', '1080p', '1440p', '2160p'].includes(quality);
};

export const isValidCurrency = (currency: string): boolean => {
  return ['USD', 'EUR', 'BRL', 'GBP', 'JPY', 'CAD', 'AUD'].includes(currency);
};

export const isValidLanguage = (language: string): boolean => {
  return /^[a-z]{2}(-[A-Z]{2})?$/.test(language);
};