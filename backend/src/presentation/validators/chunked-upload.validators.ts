/**
 * Chunked Upload Validators
 * Validation schemas for chunked upload endpoints
 */

import { z } from 'zod';

// Initiate upload validation
export const initiateUploadSchema = z.object({
  body: z.object({
    fileName: z.string()
      .min(1, 'File name is required')
      .max(255, 'File name too long')
      .regex(/^[^<>:"/\\|?*]+$/, 'File name contains invalid characters'),
    
    fileSize: z.number()
      .int('File size must be an integer')
      .min(1, 'File size must be greater than 0')
      .max(10 * 1024 * 1024 * 1024, 'File size exceeds maximum limit (10GB)'), // 10GB max
    
    fileType: z.string()
      .min(1, 'File type is required')
      .regex(/^video\//, 'Only video files are allowed'),
    
    chunkSize: z.number()
      .int('Chunk size must be an integer')
      .min(1024 * 1024, 'Chunk size must be at least 1MB')
      .max(100 * 1024 * 1024, 'Chunk size cannot exceed 100MB')
      .optional()
      .default(5 * 1024 * 1024), // 5MB default
    
    metadata: z.object({
      courseId: z.string()
        .min(1, 'Course ID is required')
        .max(100, 'Course ID too long'),
      
      episodeId: z.string()
        .min(1, 'Episode ID is required')
        .max(100, 'Episode ID too long'),
      
      title: z.string()
        .min(1, 'Title is required')
        .max(200, 'Title too long'),
      
      description: z.string()
        .max(1000, 'Description too long')
        .optional(),
      
      tags: z.array(z.string().max(50))
        .max(10, 'Too many tags')
        .optional(),
      
      language: z.string()
        .length(2, 'Language must be a 2-character code')
        .optional(),
      
      season: z.number()
        .int('Season must be an integer')
        .min(1, 'Season must be at least 1')
        .max(1000, 'Season number too high')
        .optional(),
      
      episode: z.number()
        .int('Episode must be an integer')
        .min(1, 'Episode must be at least 1')
        .max(10000, 'Episode number too high')
        .optional(),
      
      processingOptions: z.object({
        qualities: z.array(z.enum(['360p', '720p', '1080p', '4K']))
          .min(1, 'At least one quality must be specified')
          .max(4, 'Too many qualities specified')
          .optional(),
        
        generateThumbnails: z.boolean()
          .optional()
          .default(true),
        
        thumbnailCount: z.number()
          .int('Thumbnail count must be an integer')
          .min(1, 'At least 1 thumbnail required')
          .max(10, 'Too many thumbnails')
          .optional()
          .default(3),
        
        generateHLS: z.boolean()
          .optional()
          .default(true),
        
        generateDASH: z.boolean()
          .optional()
          .default(false),
        
        videoCodec: z.enum(['h264', 'h265'])
          .optional()
          .default('h264'),
        
        audioCodec: z.enum(['aac', 'opus'])
          .optional()
          .default('aac'),
      }).optional(),
    }),
  }),
});

// Upload chunk validation
export const uploadChunkSchema = z.object({
  params: z.object({
    sessionId: z.string()
      .uuid('Invalid session ID format'),
  }),
  
  body: z.object({
    chunkIndex: z.string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val >= 0, 'Chunk index must be a non-negative integer'),
    
    chunkHash: z.string()
      .regex(/^[a-f0-9]{32}$/, 'Invalid chunk hash format')
      .optional(),
  }),
  
  // File validation is handled by multer middleware
});

// Complete upload validation
export const completeUploadSchema = z.object({
  params: z.object({
    sessionId: z.string()
      .uuid('Invalid session ID format'),
  }),
  
  body: z.object({
    totalChunks: z.number()
      .int('Total chunks must be an integer')
      .min(1, 'Total chunks must be at least 1')
      .max(10000, 'Too many chunks'),
    
    finalHash: z.string()
      .regex(/^[a-f0-9]{32}$/, 'Invalid final hash format')
      .optional(),
  }),
});

// Retry chunk validation
export const retryChunkSchema = z.object({
  params: z.object({
    sessionId: z.string()
      .uuid('Invalid session ID format'),
  }),
  
  body: z.object({
    chunkIndex: z.number()
      .int('Chunk index must be an integer')
      .min(0, 'Chunk index must be non-negative'),
  }),
});

// Batch initiate uploads validation
export const batchInitiateUploadsSchema = z.object({
  body: z.object({
    files: z.array(
      z.object({
        fileName: z.string()
          .min(1, 'File name is required')
          .max(255, 'File name too long'),
        
        fileSize: z.number()
          .int('File size must be an integer')
          .min(1, 'File size must be greater than 0')
          .max(10 * 1024 * 1024 * 1024, 'File size exceeds maximum limit (10GB)'),
        
        fileType: z.string()
          .min(1, 'File type is required')
          .regex(/^video\//, 'Only video files are allowed'),
        
        metadata: z.object({
          courseId: z.string().min(1).max(100),
          episodeId: z.string().min(1).max(100),
          title: z.string().min(1).max(200),
          description: z.string().max(1000).optional(),
          tags: z.array(z.string().max(50)).max(10).optional(),
          language: z.string().length(2).optional(),
          season: z.number().int().min(1).max(1000).optional(),
          episode: z.number().int().min(1).max(10000).optional(),
        }),
      })
    )
    .min(1, 'At least one file is required')
    .max(50, 'Too many files in batch'), // Limit batch size
    
    processingOptions: z.object({
      qualities: z.array(z.enum(['360p', '720p', '1080p', '4K']))
        .min(1, 'At least one quality must be specified')
        .optional(),
      
      generateThumbnails: z.boolean().optional().default(true),
      thumbnailCount: z.number().int().min(1).max(10).optional().default(3),
      generateHLS: z.boolean().optional().default(true),
      generateDASH: z.boolean().optional().default(false),
      autoPublish: z.boolean().optional().default(false),
    }).optional(),
  }),
});

// Session ID validation (for GET requests)
export const sessionIdParamSchema = z.object({
  params: z.object({
    sessionId: z.string()
      .uuid('Invalid session ID format'),
  }),
});

// Query parameters for listing uploads
export const listUploadsQuerySchema = z.object({
  query: z.object({
    status: z.enum(['initiated', 'uploading', 'completed', 'failed', 'cancelled'])
      .optional(),
    
    limit: z.string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val > 0 && val <= 100, 'Limit must be between 1 and 100')
      .optional()
      .default('20'),
    
    offset: z.string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => !isNaN(val) && val >= 0, 'Offset must be non-negative')
      .optional()
      .default('0'),
    
    sortBy: z.enum(['createdAt', 'updatedAt', 'fileName', 'fileSize'])
      .optional()
      .default('createdAt'),
    
    sortOrder: z.enum(['asc', 'desc'])
      .optional()
      .default('desc'),
  }),
});

// File validation helpers
export const validateVideoFile = (file: Express.Multer.File) => {
  const allowedMimeTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/avi',
    'video/x-msvideo',
    'video/quicktime',
    'video/x-ms-wmv',
    'video/x-flv',
    'video/x-matroska',
    'video/3gpp',
    'video/3gpp2',
  ];

  const maxChunkSize = 100 * 1024 * 1024; // 100MB per chunk

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error(`Unsupported video format: ${file.mimetype}`);
  }

  if (file.size > maxChunkSize) {
    throw new Error(`Chunk size exceeds maximum: ${file.size} > ${maxChunkSize}`);
  }

  return true;
};

// Export validation schemas
export const chunkedUploadValidationSchemas = {
  initiateUpload: initiateUploadSchema,
  uploadChunk: uploadChunkSchema,
  completeUpload: completeUploadSchema,
  retryChunk: retryChunkSchema,
  batchInitiateUploads: batchInitiateUploadsSchema,
  sessionIdParam: sessionIdParamSchema,
  listUploadsQuery: listUploadsQuerySchema,
};

// Error messages
export const chunkedUploadErrorMessages = {
  INVALID_SESSION: 'Invalid or expired upload session',
  CHUNK_OUT_OF_ORDER: 'Chunks must be uploaded in order',
  CHUNK_ALREADY_UPLOADED: 'Chunk has already been uploaded',
  HASH_MISMATCH: 'Chunk hash verification failed',
  SESSION_COMPLETED: 'Upload session already completed',
  SESSION_CANCELLED: 'Upload session has been cancelled',
  MISSING_CHUNKS: 'Some chunks are missing',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  INVALID_FILE_TYPE: 'Invalid file type for video upload',
  UPLOAD_TIMEOUT: 'Upload session has timed out',
  STORAGE_ERROR: 'Storage service error',
  PROCESSING_ERROR: 'Video processing error',
};