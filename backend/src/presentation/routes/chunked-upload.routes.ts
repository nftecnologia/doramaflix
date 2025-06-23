/**
 * Chunked Upload Routes
 * API routes for chunked file upload functionality
 */

import { Router } from 'express';
import multer from 'multer';
import { authMiddleware } from '@/application/middlewares/auth.middleware';
import { validateRequest } from '@/application/middlewares/validation.middleware';
import { rateLimiter } from '@/application/middlewares/rate-limiter';
import { createChunkedUploadController } from '@/application/controllers/chunked-upload.controller';
import { ChunkedUploadService } from '@/application/services/chunked-upload.service';
import { chunkedUploadValidationSchemas, validateVideoFile } from '@/presentation/validators/chunked-upload.validators';
import { logger } from '@/shared/utils/logger';

// Configure multer for chunk upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB per chunk
  },
  fileFilter: (req, file, cb) => {
    try {
      validateVideoFile(file);
      cb(null, true);
    } catch (error) {
      cb(error as Error);
    }
  },
});

// Create service and controller instances
const chunkedUploadService = new ChunkedUploadService();
const chunkedUploadController = createChunkedUploadController(chunkedUploadService);

// Create router
const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply rate limiting
const uploadRateLimit = rateLimiter.createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each user to 100 requests per windowMs
  message: 'Too many upload requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

const chunkRateLimit = rateLimiter.createRateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // High limit for chunk uploads
  message: 'Too many chunk upload requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes

/**
 * @route   POST /api/v1/chunked-uploads/initiate
 * @desc    Initiate a new chunked upload session
 * @access  Private
 * @body    { fileName, fileSize, fileType, metadata }
 */
router.post(
  '/initiate',
  uploadRateLimit,
  validateRequest(chunkedUploadValidationSchemas.initiateUpload),
  chunkedUploadController.initiateUpload
);

/**
 * @route   POST /api/v1/chunked-uploads/:sessionId/chunk
 * @desc    Upload a single chunk
 * @access  Private
 * @params  sessionId - Upload session ID
 * @body    FormData with chunk file, chunkIndex, chunkHash
 */
router.post(
  '/:sessionId/chunk',
  chunkRateLimit,
  upload.single('chunk'),
  validateRequest(chunkedUploadValidationSchemas.uploadChunk),
  chunkedUploadController.uploadChunk
);

/**
 * @route   POST /api/v1/chunked-uploads/:sessionId/complete
 * @desc    Complete the chunked upload
 * @access  Private
 * @params  sessionId - Upload session ID
 * @body    { totalChunks, finalHash }
 */
router.post(
  '/:sessionId/complete',
  uploadRateLimit,
  validateRequest(chunkedUploadValidationSchemas.completeUpload),
  chunkedUploadController.completeUpload
);

/**
 * @route   GET /api/v1/chunked-uploads/:sessionId/status
 * @desc    Get upload session status
 * @access  Private
 * @params  sessionId - Upload session ID
 */
router.get(
  '/:sessionId/status',
  validateRequest(chunkedUploadValidationSchemas.sessionIdParam),
  chunkedUploadController.getUploadStatus
);

/**
 * @route   POST /api/v1/chunked-uploads/:sessionId/resume
 * @desc    Resume an interrupted upload
 * @access  Private
 * @params  sessionId - Upload session ID
 */
router.post(
  '/:sessionId/resume',
  uploadRateLimit,
  validateRequest(chunkedUploadValidationSchemas.sessionIdParam),
  chunkedUploadController.resumeUpload
);

/**
 * @route   DELETE /api/v1/chunked-uploads/:sessionId
 * @desc    Cancel an upload session
 * @access  Private
 * @params  sessionId - Upload session ID
 */
router.delete(
  '/:sessionId',
  validateRequest(chunkedUploadValidationSchemas.sessionIdParam),
  chunkedUploadController.cancelUpload
);

/**
 * @route   GET /api/v1/chunked-uploads/active
 * @desc    Get user's active upload sessions
 * @access  Private
 * @query   status, limit, offset, sortBy, sortOrder
 */
router.get(
  '/active',
  validateRequest(chunkedUploadValidationSchemas.listUploadsQuery),
  chunkedUploadController.getActiveUploads
);

/**
 * @route   POST /api/v1/chunked-uploads/:sessionId/retry-chunk
 * @desc    Retry a failed chunk upload
 * @access  Private
 * @params  sessionId - Upload session ID
 * @body    { chunkIndex }
 */
router.post(
  '/:sessionId/retry-chunk',
  uploadRateLimit,
  validateRequest(chunkedUploadValidationSchemas.retryChunk),
  chunkedUploadController.retryChunk
);

/**
 * @route   GET /api/v1/chunked-uploads/progress/:sessionId
 * @desc    Get detailed upload progress
 * @access  Private
 * @params  sessionId - Upload session ID
 */
router.get(
  '/progress/:sessionId',
  validateRequest(chunkedUploadValidationSchemas.sessionIdParam),
  chunkedUploadController.getUploadProgress
);

/**
 * @route   POST /api/v1/chunked-uploads/batch-initiate
 * @desc    Initiate multiple upload sessions (admin feature)
 * @access  Private
 * @body    { files, processingOptions }
 */
router.post(
  '/batch-initiate',
  uploadRateLimit,
  validateRequest(chunkedUploadValidationSchemas.batchInitiateUploads),
  chunkedUploadController.batchInitiateUploads
);

// Error handling middleware for multer errors
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    logger.error('Multer error in chunked upload:', error);
    
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'Chunk size exceeds maximum limit',
          },
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          error: {
            code: 'UNEXPECTED_FILE',
            message: 'Unexpected file field',
          },
        });
      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'UPLOAD_ERROR',
            message: error.message || 'File upload error',
          },
        });
    }
  }
  
  next(error);
});

export default router;