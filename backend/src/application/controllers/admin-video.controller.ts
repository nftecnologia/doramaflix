/**
 * Admin Video Controller
 * Handles admin-specific video operations including batch uploads and content moderation
 */

import { Request, Response, NextFunction } from 'express';
import { VideoProcessingQueue } from '@/infrastructure/queues/video-processing-queue';
import { ChunkedUploadService } from '@/application/services/chunked-upload.service';
import { VideoProcessingService } from '@/application/services/video-processing.service';
import { UploadService } from '@/application/services/upload.service';
import { asyncHandler, ValidationAppError } from '@/application/middlewares/error-handler';
import { validateRequest } from '@/application/middlewares/validation.middleware';
import { logger } from '@/shared/utils/logger';

export interface AdminRequest extends Request {
  user?: { id: string; role: string };
}

export interface BatchUploadRequest {
  files: {
    fileName: string;
    fileSize: number;
    fileType: string;
    metadata: {
      courseId: string;
      episodeId: string;
      title: string;
      description?: string;
      tags?: string[];
      language?: string;
      season?: number;
      episode?: number;
    };
  }[];
  processingOptions?: {
    qualities: ('360p' | '720p' | '1080p' | '4K')[];
    generateThumbnails: boolean;
    thumbnailCount: number;
    generateHLS: boolean;
    generateDASH: boolean;
    autoPublish: boolean;
  };
}

export interface ContentModerationAction {
  videoId: string;
  action: 'approve' | 'reject' | 'flag' | 'unflag';
  reason?: string;
  moderatorNotes?: string;
}

export class AdminVideoController {
  constructor(
    private videoProcessingQueue: VideoProcessingQueue,
    private chunkedUploadService: ChunkedUploadService,
    private videoProcessingService: VideoProcessingService,
    private uploadService: UploadService
  ) {}

  // POST /api/v1/admin/videos/batch-upload
  batchUploadInitiate = asyncHandler(async (req: AdminRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'admin') {
      throw new ValidationAppError('Admin access required');
    }

    const { files, processingOptions }: BatchUploadRequest = req.body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new ValidationAppError('Files array is required');
    }

    try {
      // Initiate chunked uploads for all files
      const uploadSessions = await Promise.all(
        files.map(file => 
          this.chunkedUploadService.initiateUpload({
            fileName: file.fileName,
            fileSize: file.fileSize,
            fileType: file.fileType,
            metadata: {
              ...file.metadata,
              batchUpload: true,
              processingOptions: processingOptions || {},
              status: 'pending_upload',
            },
            userId,
          })
        )
      );

      // Create batch tracking record
      const batchId = `batch_${Date.now()}_${userId}`;
      const batchInfo = {
        batchId,
        totalFiles: files.length,
        uploadSessions: uploadSessions.map(session => ({
          sessionId: session.id,
          fileName: session.fileName,
          status: 'initiated',
        })),
        processingOptions,
        createdBy: userId,
        createdAt: new Date(),
        status: 'initiated',
      };

      // Store batch info (you might want to use a database for persistence)
      await this.storeBatchInfo(batchId, batchInfo);

      logger.info('Batch upload initiated', {
        batchId,
        fileCount: files.length,
        userId,
      });

      res.status(201).json({
        success: true,
        data: {
          batchId,
          uploadSessions,
          processingOptions,
        },
        message: 'Batch upload initiated successfully',
      });
    } catch (error) {
      logger.error('Failed to initiate batch upload', { error, userId });
      throw error;
    }
  });

  // GET /api/v1/admin/videos/batch-status/:batchId
  getBatchStatus = asyncHandler(async (req: AdminRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'admin') {
      throw new ValidationAppError('Admin access required');
    }

    const { batchId } = req.params;
    
    try {
      const batchInfo = await this.getBatchInfo(batchId);
      
      if (!batchInfo) {
        throw new ValidationAppError('Batch not found');
      }

      // Get current status of all upload sessions
      const sessionStatuses = await Promise.all(
        batchInfo.uploadSessions.map(async (session: any) => {
          try {
            const status = await this.chunkedUploadService.getUploadStatus(session.sessionId, userId);
            const processingJob = status.status === 'completed' ? 
              await this.videoProcessingService.getJob(session.sessionId) : null;

            return {
              sessionId: session.sessionId,
              fileName: session.fileName,
              uploadStatus: status.status,
              uploadProgress: status.uploadProgress,
              processingStatus: processingJob?.status || 'not_started',
              processingProgress: processingJob?.progress || 0,
            };
          } catch (error) {
            return {
              sessionId: session.sessionId,
              fileName: session.fileName,
              uploadStatus: 'error',
              uploadProgress: 0,
              processingStatus: 'error',
              processingProgress: 0,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      // Calculate overall batch progress
      const totalUploadProgress = sessionStatuses.reduce((sum, status) => sum + status.uploadProgress, 0);
      const totalProcessingProgress = sessionStatuses.reduce((sum, status) => sum + status.processingProgress, 0);
      const overallProgress = (totalUploadProgress + totalProcessingProgress) / (sessionStatuses.length * 2);

      const batchStatus = {
        ...batchInfo,
        overallProgress,
        sessionStatuses,
        completedUploads: sessionStatuses.filter(s => s.uploadStatus === 'completed').length,
        completedProcessing: sessionStatuses.filter(s => s.processingStatus === 'completed').length,
        failedUploads: sessionStatuses.filter(s => s.uploadStatus === 'failed').length,
        failedProcessing: sessionStatuses.filter(s => s.processingStatus === 'failed').length,
      };

      res.json({
        success: true,
        data: batchStatus,
        message: 'Batch status retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get batch status', { error, batchId });
      throw error;
    }
  });

  // GET /api/v1/admin/videos/processing-queue/stats
  getProcessingQueueStats = asyncHandler(async (req: AdminRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      throw new ValidationAppError('Admin access required');
    }

    try {
      const queueStats = await this.videoProcessingQueue.getQueueStats();
      
      res.json({
        success: true,
        data: queueStats,
        message: 'Processing queue stats retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get processing queue stats', { error });
      throw error;
    }
  });

  // GET /api/v1/admin/videos/failed-jobs
  getFailedJobs = asyncHandler(async (req: AdminRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      throw new ValidationAppError('Admin access required');
    }

    const { limit = '50' } = req.query;

    try {
      const failedJobs = await this.videoProcessingQueue.getFailedJobs(parseInt(limit as string));
      
      res.json({
        success: true,
        data: failedJobs,
        message: 'Failed jobs retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get failed jobs', { error });
      throw error;
    }
  });

  // POST /api/v1/admin/videos/retry-job/:jobId
  retryFailedJob = asyncHandler(async (req: AdminRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      throw new ValidationAppError('Admin access required');
    }

    const { jobId } = req.params;

    try {
      const success = await this.videoProcessingQueue.retryJob(jobId);
      
      res.json({
        success,
        message: success ? 'Job retry scheduled successfully' : 'Failed to schedule job retry',
      });
    } catch (error) {
      logger.error('Failed to retry job', { error, jobId });
      throw error;
    }
  });

  // POST /api/v1/admin/videos/moderate
  moderateContent = asyncHandler(async (req: AdminRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;

    if (!userId || userRole !== 'admin') {
      throw new ValidationAppError('Admin access required');
    }

    const actions: ContentModerationAction[] = req.body.actions;

    if (!Array.isArray(actions) || actions.length === 0) {
      throw new ValidationAppError('Actions array is required');
    }

    try {
      const results = await Promise.all(
        actions.map(async (action) => {
          try {
            await this.processContentModerationAction(action, userId);
            return {
              videoId: action.videoId,
              action: action.action,
              success: true,
            };
          } catch (error) {
            return {
              videoId: action.videoId,
              action: action.action,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;

      logger.info('Content moderation actions processed', {
        totalActions: results.length,
        successCount,
        failureCount,
        moderatorId: userId,
      });

      res.json({
        success: true,
        data: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: failureCount,
          },
        },
        message: 'Content moderation actions processed',
      });
    } catch (error) {
      logger.error('Failed to process moderation actions', { error, userId });
      throw error;
    }
  });

  // GET /api/v1/admin/videos/pending-moderation
  getPendingModerationContent = asyncHandler(async (req: AdminRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      throw new ValidationAppError('Admin access required');
    }

    const { limit = '50', offset = '0', status = 'pending' } = req.query;

    try {
      // This would typically query your database for content pending moderation
      const pendingContent = await this.getPendingContent({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        status: status as string,
      });

      res.json({
        success: true,
        data: pendingContent,
        message: 'Pending moderation content retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get pending moderation content', { error });
      throw error;
    }
  });

  // GET /api/v1/admin/videos/storage-usage
  getStorageUsage = asyncHandler(async (req: AdminRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      throw new ValidationAppError('Admin access required');
    }

    try {
      const storageStats = await this.uploadService.getStorageStats();
      
      // Add more detailed analytics
      const detailedStats = {
        ...storageStats,
        breakdown: {
          videos: await this.getStorageBreakdown('video'),
          images: await this.getStorageBreakdown('image'),
          subtitles: await this.getStorageBreakdown('subtitle'),
          hls: await this.getStorageBreakdown('hls'),
          dash: await this.getStorageBreakdown('dash'),
        },
      };

      res.json({
        success: true,
        data: detailedStats,
        message: 'Storage usage statistics retrieved successfully',
      });
    } catch (error) {
      logger.error('Failed to get storage usage', { error });
      throw error;
    }
  });

  // POST /api/v1/admin/videos/cleanup-old
  cleanupOldContent = asyncHandler(async (req: AdminRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;

    if (userRole !== 'admin') {
      throw new ValidationAppError('Admin access required');
    }

    const { olderThanDays = 30, dryRun = true } = req.body;

    try {
      // Clean up old processing jobs
      const cleanedJobs = await this.videoProcessingQueue.cleanupOldJobs(olderThanDays);
      
      // You would also implement cleanup for old uploaded files, temp files, etc.
      const cleanupResults = {
        cleanedJobs,
        cleanedTempFiles: 0, // Implement temp file cleanup
        cleanedLogs: 0, // Implement log cleanup
        freedSpace: 0, // Calculate freed space
      };

      res.json({
        success: true,
        data: {
          ...cleanupResults,
          dryRun,
          olderThanDays,
        },
        message: dryRun ? 'Cleanup simulation completed' : 'Cleanup completed successfully',
      });
    } catch (error) {
      logger.error('Failed to cleanup old content', { error });
      throw error;
    }
  });

  /**
   * Private helper methods
   */
  private async storeBatchInfo(batchId: string, batchInfo: any): Promise<void> {
    // In a real implementation, you'd store this in a database
    // For now, we'll use Redis with a longer TTL
    const redis = new (await import('@/infrastructure/cache/redis-connection')).RedisConnection();
    await redis.setex(`batch_info:${batchId}`, 7 * 24 * 60 * 60, JSON.stringify(batchInfo)); // 7 days
  }

  private async getBatchInfo(batchId: string): Promise<any> {
    const redis = new (await import('@/infrastructure/cache/redis-connection')).RedisConnection();
    const batchData = await redis.get(`batch_info:${batchId}`);
    return batchData ? JSON.parse(batchData) : null;
  }

  private async processContentModerationAction(action: ContentModerationAction, moderatorId: string): Promise<void> {
    // This would typically update your database with the moderation decision
    // For now, we'll just log the action
    logger.info('Content moderation action processed', {
      videoId: action.videoId,
      action: action.action,
      reason: action.reason,
      moderatorNotes: action.moderatorNotes,
      moderatorId,
      timestamp: new Date(),
    });

    // You would implement actual database updates here
    // Example: Update video status, send notifications, etc.
  }

  private async getPendingContent(options: {
    limit: number;
    offset: number;
    status: string;
  }): Promise<any[]> {
    // This would typically query your database
    // For now, return mock data
    return [
      {
        videoId: 'video_1',
        title: 'Sample Video 1',
        uploadedAt: new Date(),
        uploadedBy: 'user_123',
        status: 'pending_moderation',
        metadata: {
          duration: 1800,
          fileSize: 500000000,
          resolution: '1920x1080',
        },
      },
      // Add more mock data as needed
    ];
  }

  private async getStorageBreakdown(type: string): Promise<{ count: number; totalSize: number }> {
    // This would query your storage system for detailed breakdown
    // For now, return mock data
    return {
      count: 0,
      totalSize: 0,
    };
  }
}

// Factory function
export const createAdminVideoController = (
  videoProcessingQueue: VideoProcessingQueue,
  chunkedUploadService: ChunkedUploadService,
  videoProcessingService: VideoProcessingService,
  uploadService: UploadService
) => {
  return new AdminVideoController(
    videoProcessingQueue,
    chunkedUploadService,
    videoProcessingService,
    uploadService
  );
};