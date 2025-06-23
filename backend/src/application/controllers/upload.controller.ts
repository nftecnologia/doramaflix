/**
 * Upload Controller
 * Handles file upload HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { UploadService, VideoUploadData, ImageUploadData, SubtitleUploadData } from '@/application/services/upload.service';
import { asyncHandler, ValidationAppError } from '@/application/middlewares/error-handler';
import { validateRequest } from '@/application/middlewares/validation.middleware';
import { uploadValidationSchemas } from '@/presentation/validators/upload.validators';

export class UploadController {
  constructor(private uploadService: UploadService) {}

  // POST /api/v1/uploads/video
  uploadVideo = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      throw new ValidationAppError('Video file is required');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    const data: VideoUploadData = req.body;
    
    const result = await this.uploadService.uploadVideo(req.file, data, userId);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Video uploaded successfully',
    });
  });

  // POST /api/v1/uploads/image
  uploadImage = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      throw new ValidationAppError('Image file is required');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    const data: ImageUploadData = req.body;
    
    const result = await this.uploadService.uploadImage(req.file, data, userId);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Image uploaded successfully',
    });
  });

  // POST /api/v1/uploads/subtitle
  uploadSubtitle = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.file) {
      throw new ValidationAppError('Subtitle file is required');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    const data: SubtitleUploadData = req.body;
    
    const result = await this.uploadService.uploadSubtitle(req.file, data, userId);

    res.status(201).json({
      success: true,
      data: result,
      message: 'Subtitle uploaded successfully',
    });
  });

  // DELETE /api/v1/uploads/:id
  deleteFile = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { url } = req.body;
    const userId = req.user?.id;

    if (!url) {
      throw new ValidationAppError('File URL is required');
    }

    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    await this.uploadService.deleteFile(url, userId);

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  });

  // GET /api/v1/uploads/metadata
  getFileMetadata = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { url } = req.query as { url: string };

    if (!url) {
      throw new ValidationAppError('File URL is required');
    }

    const metadata = await this.uploadService.getFileMetadata(url);

    res.json({
      success: true,
      data: metadata,
      message: 'File metadata retrieved successfully',
    });
  });

  // GET /api/v1/uploads/stats
  getStorageStats = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const stats = await this.uploadService.getStorageStats();

    res.json({
      success: true,
      data: stats,
      message: 'Storage statistics retrieved successfully',
    });
  });

  // GET /api/v1/uploads/optimize-image
  getOptimizedImageUrl = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { pathname, width, height, quality } = req.query as {
      pathname: string;
      width?: string;
      height?: string;
      quality?: string;
    };

    if (!pathname) {
      throw new ValidationAppError('Image pathname is required');
    }

    const options = {
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      quality: quality ? parseInt(quality) : undefined,
    };

    const optimizedUrl = this.uploadService.getOptimizedImageUrl(pathname, options);

    res.json({
      success: true,
      data: { url: optimizedUrl },
      message: 'Optimized image URL generated successfully',
    });
  });

  // GET /api/v1/uploads/video-stream
  getVideoStreamUrl = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { pathname } = req.query as { pathname: string };

    if (!pathname) {
      throw new ValidationAppError('Video pathname is required');
    }

    const streamUrl = this.uploadService.getVideoStreamUrl(pathname);

    res.json({
      success: true,
      data: { url: streamUrl },
      message: 'Video stream URL generated successfully',
    });
  });

  // POST /api/v1/uploads/bulk-delete
  bulkDeleteFiles = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { urls } = req.body as { urls: string[] };
    const userId = req.user?.id;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      throw new ValidationAppError('URLs array is required');
    }

    if (!userId) {
      throw new ValidationAppError('User authentication required');
    }

    // Delete files one by one (could be optimized with bulk delete)
    const deletePromises = urls.map(url => this.uploadService.deleteFile(url, userId));
    await Promise.all(deletePromises);

    res.json({
      success: true,
      data: { deletedCount: urls.length },
      message: `${urls.length} files deleted successfully`,
    });
  });
}

// Factory function with validation middleware
export const createUploadController = (uploadService: UploadService) => {
  const controller = new UploadController(uploadService);

  return {
    uploadVideo: [
      validateRequest(uploadValidationSchemas.uploadVideo),
      controller.uploadVideo,
    ],
    uploadImage: [
      validateRequest(uploadValidationSchemas.uploadImage),
      controller.uploadImage,
    ],
    uploadSubtitle: [
      validateRequest(uploadValidationSchemas.uploadSubtitle),
      controller.uploadSubtitle,
    ],
    deleteFile: controller.deleteFile,
    getFileMetadata: controller.getFileMetadata,
    getStorageStats: controller.getStorageStats,
    getOptimizedImageUrl: controller.getOptimizedImageUrl,
    getVideoStreamUrl: controller.getVideoStreamUrl,
    bulkDeleteFiles: controller.bulkDeleteFiles,
  };
};