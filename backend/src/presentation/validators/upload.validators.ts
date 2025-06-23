/**
 * Upload Validation Schemas
 * Zod schemas for upload endpoint validation
 */

import { z } from 'zod';

// UUID validation
const uuidSchema = z.string().uuid('Invalid UUID format');

// Video upload validation
const videoUploadSchema = z.object({
  courseId: uuidSchema,
  episodeId: uuidSchema,
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must not exceed 255 characters'),
  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
});

// Image upload validation
const imageUploadSchema = z.object({
  type: z.enum(['thumbnail', 'banner', 'avatar'], {
    errorMap: () => ({ message: 'Type must be thumbnail, banner, or avatar' }),
  }),
  entityId: uuidSchema,
  alt: z.string()
    .max(255, 'Alt text must not exceed 255 characters')
    .optional(),
});

// Subtitle upload validation
const subtitleUploadSchema = z.object({
  episodeId: uuidSchema,
  language: z.string()
    .min(2, 'Language code must be at least 2 characters')
    .max(5, 'Language code must not exceed 5 characters')
    .regex(/^[a-z]{2}(-[A-Z]{2})?$/, 'Invalid language code format (e.g., en, pt-BR)'),
  label: z.string()
    .min(1, 'Label is required')
    .max(100, 'Label must not exceed 100 characters'),
});

// File deletion validation
const deleteFileSchema = z.object({
  url: z.string()
    .url('Invalid URL format')
    .startsWith('https://vercel.blob.store/', 'Must be a Vercel Blob URL'),
});

// Bulk delete validation
const bulkDeleteSchema = z.object({
  urls: z.array(
    z.string()
      .url('Invalid URL format')
      .startsWith('https://vercel.blob.store/', 'Must be a Vercel Blob URL')
  )
    .min(1, 'At least one URL is required')
    .max(50, 'Maximum 50 files can be deleted at once'),
});

// Image optimization validation
const optimizeImageSchema = z.object({
  pathname: z.string().min(1, 'Pathname is required'),
  width: z.string()
    .regex(/^\d+$/, 'Width must be a number')
    .transform(Number)
    .refine(val => val > 0 && val <= 3840, 'Width must be between 1 and 3840')
    .optional(),
  height: z.string()
    .regex(/^\d+$/, 'Height must be a number')
    .transform(Number)
    .refine(val => val > 0 && val <= 2160, 'Height must be between 1 and 2160')
    .optional(),
  quality: z.string()
    .regex(/^\d+$/, 'Quality must be a number')
    .transform(Number)
    .refine(val => val >= 1 && val <= 100, 'Quality must be between 1 and 100')
    .optional(),
});

// Video stream validation
const videoStreamSchema = z.object({
  pathname: z.string()
    .min(1, 'Pathname is required')
    .startsWith('videos/', 'Must be a video pathname'),
});

// File metadata validation
const fileMetadataSchema = z.object({
  url: z.string()
    .url('Invalid URL format')
    .startsWith('https://vercel.blob.store/', 'Must be a Vercel Blob URL'),
});

export const uploadValidationSchemas = {
  uploadVideo: videoUploadSchema,
  uploadImage: imageUploadSchema,
  uploadSubtitle: subtitleUploadSchema,
  deleteFile: deleteFileSchema,
  bulkDelete: bulkDeleteSchema,
  optimizeImage: optimizeImageSchema,
  videoStream: videoStreamSchema,
  fileMetadata: fileMetadataSchema,
};