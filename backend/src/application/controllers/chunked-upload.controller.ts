/**
 * Chunked Upload Controller
 * Handles large file uploads with chunking, progress tracking and resume capabilities
 */

import { Request, Response, NextFunction } from 'express';
import { ChunkedUploadService } from '@/application/services/chunked-upload.service';
import { asyncHandler, ValidationAppError } from '@/application/middlewares/error-handler';
import { validateRequest } from '@/application/middlewares/validation.middleware';
import { chunkedUploadValidationSchemas } from '@/presentation/validators/chunked-upload.validators';
import { UserRole } from '@prisma/client';

export interface ChunkedUploadRequest extends Request {
  user?: { id: string; email: string; role: UserRole };
}

export class ChunkedUploadController {
  constructor(private chunkedUploadService: ChunkedUploadService) {}

  // POST /api/v1/chunked-uploads/initiate
  initiateUpload = asyncHandler(async (req: ChunkedUploadRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    const { fileName, fileSize, fileType, metadata } = req.body;

    const uploadSession = await this.chunkedUploadService.initiateUpload({
      fileName,
      fileSize,
      fileType,
      metadata,
      userId,
    });

    res.status(201).json({
      success: true,
      data: uploadSession,
      message: 'Upload session initiated successfully',
    });
  });

  // POST /api/v1/chunked-uploads/:sessionId/chunk
  uploadChunk = asyncHandler(async (req: ChunkedUploadRequest, res: Response, next: NextFunction) => {
    if (!req.file) {
      throw new ValidationAppError('Chunk data is required');
    }

    const { sessionId } = req.params;
    const { chunkIndex, chunkHash } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    const result = await this.chunkedUploadService.uploadChunk({
      sessionId,
      chunkIndex: parseInt(chunkIndex),
      chunkData: req.file.buffer,
      chunkHash,
      userId,
    });

    res.json({
      success: true,
      data: result,
      message: 'Chunk uploaded successfully',
    });
  });

  // POST /api/v1/chunked-uploads/:sessionId/complete
  completeUpload = asyncHandler(async (req: ChunkedUploadRequest, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const { totalChunks, finalHash } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    const result = await this.chunkedUploadService.completeUpload({
      sessionId,
      totalChunks,
      finalHash,
      userId,
    });

    res.json({
      success: true,
      data: result,
      message: 'Upload completed successfully',
    });
  });

  // GET /api/v1/chunked-uploads/:sessionId/status
  getUploadStatus = asyncHandler(async (req: ChunkedUploadRequest, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    const status = await this.chunkedUploadService.getUploadStatus(sessionId, userId);

    res.json({
      success: true,
      data: status,
      message: 'Upload status retrieved successfully',
    });
  });

  // POST /api/v1/chunked-uploads/:sessionId/resume
  resumeUpload = asyncHandler(async (req: ChunkedUploadRequest, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    const resumeInfo = await this.chunkedUploadService.resumeUpload(sessionId, userId);

    res.json({
      success: true,
      data: resumeInfo,
      message: 'Upload resume information retrieved successfully',
    });
  });

  // DELETE /api/v1/chunked-uploads/:sessionId
  cancelUpload = asyncHandler(async (req: ChunkedUploadRequest, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    await this.chunkedUploadService.cancelUpload(sessionId, userId);

    res.json({
      success: true,
      message: 'Upload cancelled successfully',
    });
  });

  // GET /api/v1/chunked-uploads/active
  getActiveUploads = asyncHandler(async (req: ChunkedUploadRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    const activeUploads = await this.chunkedUploadService.getActiveUploads(userId);

    res.json({
      success: true,
      data: activeUploads,
      message: 'Active uploads retrieved successfully',
    });
  });

  // POST /api/v1/chunked-uploads/:sessionId/retry-chunk
  retryChunk = asyncHandler(async (req: ChunkedUploadRequest, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const { chunkIndex } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    const retryInfo = await this.chunkedUploadService.retryChunk(sessionId, chunkIndex, userId);

    res.json({
      success: true,
      data: retryInfo,
      message: 'Chunk retry initiated successfully',
    });
  });

  // GET /api/v1/chunked-uploads/progress/:sessionId
  getUploadProgress = asyncHandler(async (req: ChunkedUploadRequest, res: Response, next: NextFunction) => {
    const { sessionId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    const progress = await this.chunkedUploadService.getUploadProgress(sessionId, userId);

    res.json({
      success: true,
      data: progress,
      message: 'Upload progress retrieved successfully',
    });
  });

  // POST /api/v1/chunked-uploads/batch-initiate
  batchInitiateUploads = asyncHandler(async (req: ChunkedUploadRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    const { files } = req.body;

    if (!Array.isArray(files) || files.length === 0) {
      throw new ValidationAppError('Files array is required for batch upload');
    }

    const batchSessions = await this.chunkedUploadService.batchInitiateUploads(files, userId);

    res.status(201).json({
      success: true,
      data: batchSessions,
      message: 'Batch upload sessions initiated successfully',
    });
  });
}

// Factory function with validation middleware
export const createChunkedUploadController = (chunkedUploadService: ChunkedUploadService) => {
  const controller = new ChunkedUploadController(chunkedUploadService);

  return {
    initiateUpload: [
      validateRequest(chunkedUploadValidationSchemas.initiateUpload),
      controller.initiateUpload,
    ],
    uploadChunk: [
      validateRequest(chunkedUploadValidationSchemas.uploadChunk),
      controller.uploadChunk,
    ],
    completeUpload: [
      validateRequest(chunkedUploadValidationSchemas.completeUpload),
      controller.completeUpload,
    ],
    getUploadStatus: controller.getUploadStatus,
    resumeUpload: controller.resumeUpload,
    cancelUpload: controller.cancelUpload,
    getActiveUploads: controller.getActiveUploads,
    retryChunk: [
      validateRequest(chunkedUploadValidationSchemas.retryChunk),
      controller.retryChunk,
    ],
    getUploadProgress: controller.getUploadProgress,
    batchInitiateUploads: [
      validateRequest(chunkedUploadValidationSchemas.batchInitiateUploads),
      controller.batchInitiateUploads,
    ],
  };
};