/**
 * Upload Routes
 * File upload endpoints with Vercel Blob Storage
 */

import { Router } from 'express';
import multer from 'multer';
import { createUploadController } from '@/application/controllers/upload.controller';
import { UploadService } from '@/application/services/upload.service';
import { createAuthMiddleware } from '@/application/middlewares/auth.middleware';
import { AuthService } from '@/application/services/auth.service';
import { UserRepositoryImpl } from '@/infrastructure/repositories/user.repository.impl';
import { uploadRateLimiter } from '@/application/middlewares/rate-limiter';
import { config } from '@/shared/config/environment';

// Create dependencies
const userRepository = new UserRepositoryImpl();
const authService = new AuthService(userRepository);
const authMiddleware = createAuthMiddleware(authService, userRepository);
const uploadService = new UploadService();
const uploadController = createUploadController(uploadService);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.fileUpload.maxFileSize, // 100MB
    files: 1, // Single file upload
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation (detailed validation in service)
    const allowedTypes = [
      ...config.fileUpload.allowedVideoTypes,
      ...config.fileUpload.allowedImageTypes,
      ...config.fileUpload.allowedDocumentTypes,
      'text/vtt',
      'application/x-subrip',
    ];

    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(vtt|srt|ass)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  },
});

// Specific multer configs for different file types
const uploadVideo = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.fileUpload.maxFileSize, // 100MB for videos
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (config.fileUpload.allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed'), false);
    }
  },
});

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB for images
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (config.fileUpload.allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  },
});

const uploadSubtitle = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB for subtitles
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/vtt', 'application/x-subrip', 'text/plain'];
    if (allowedTypes.includes(file.mimetype) || 
        file.originalname.match(/\.(vtt|srt|ass)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only subtitle files (VTT, SRT, ASS) are allowed'), false);
    }
  },
});

const router = Router();

// Apply rate limiting to all upload routes
router.use(uploadRateLimiter);

// Apply authentication to all upload routes
router.use(authMiddleware.authenticated);

// Video upload routes
router.post(
  '/video',
  authMiddleware.adminOrManager, // Only admins and managers can upload videos
  uploadVideo.single('file'),
  ...uploadController.uploadVideo
);

// Image upload routes
router.post(
  '/image',
  uploadImage.single('file'),
  ...uploadController.uploadImage
);

// Subtitle upload routes
router.post(
  '/subtitle',
  authMiddleware.adminOrManager, // Only admins and managers can upload subtitles
  uploadSubtitle.single('file'),
  ...uploadController.uploadSubtitle
);

// File management routes
router.delete(
  '/file',
  authMiddleware.adminOrManager, // Only admins and managers can delete files
  uploadController.deleteFile
);

router.post(
  '/bulk-delete',
  authMiddleware.adminOnly, // Only admins can bulk delete
  uploadController.bulkDeleteFiles
);

// File information routes
router.get(
  '/metadata',
  uploadController.getFileMetadata
);

router.get(
  '/stats',
  authMiddleware.adminOrManager, // Only admins and managers can view stats
  uploadController.getStorageStats
);

// URL generation routes
router.get(
  '/optimize-image',
  uploadController.getOptimizedImageUrl
);

router.get(
  '/video-stream',
  uploadController.getVideoStreamUrl
);

// Health check for upload service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'Upload Service',
    storage: 'Vercel Blob',
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware for multer
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'File too large',
          code: 'FILE_TOO_LARGE',
          maxSize: config.fileUpload.maxFileSize,
        },
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Too many files',
          code: 'TOO_MANY_FILES',
          maxFiles: 1,
        },
      });
    }
  }

  if (error.message === 'File type not allowed' || 
      error.message.includes('Only') || 
      error.message.includes('files are allowed')) {
    return res.status(400).json({
      success: false,
      error: {
        message: error.message,
        code: 'INVALID_FILE_TYPE',
      },
    });
  }

  next(error);
});

export { router as uploadRoutes };