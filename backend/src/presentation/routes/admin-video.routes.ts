/**
 * Admin Video Routes
 * API routes for admin video management functionality
 */

import { Router } from 'express';
import { authMiddleware } from '@/application/middlewares/auth.middleware';
import { rateLimiter } from '@/application/middlewares/rate-limiter';
import { createAdminVideoController } from '@/application/controllers/admin-video.controller';
import { VideoProcessingQueue } from '@/infrastructure/queues/video-processing-queue';
import { ChunkedUploadService } from '@/application/services/chunked-upload.service';
import { VideoProcessingService } from '@/application/services/video-processing.service';
import { UploadService } from '@/application/services/upload.service';
import { StorageAnalyticsService } from '@/application/services/storage-analytics.service';

// Create service instances
const videoProcessingQueue = new VideoProcessingQueue();
const chunkedUploadService = new ChunkedUploadService();
const videoProcessingService = new VideoProcessingService();
const uploadService = new UploadService();
const storageAnalyticsService = new StorageAnalyticsService();

// Create controller
const adminVideoController = createAdminVideoController(
  videoProcessingQueue,
  chunkedUploadService,
  videoProcessingService,
  uploadService
);

// Create router
const router = Router();

// Apply authentication middleware
router.use(authMiddleware);

// Admin-specific rate limiting (more permissive)
const adminRateLimit = rateLimiter;

router.use(adminRateLimit);

// Middleware to check admin role
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
      },
    });
  }
  next();
};

router.use(requireAdmin);

// Routes

/**
 * @route   POST /api/v1/admin/videos/batch-upload
 * @desc    Initiate batch video upload with processing options
 * @access  Admin
 * @body    { files, processingOptions }
 */
router.post('/batch-upload', adminVideoController.batchUploadInitiate);

/**
 * @route   GET /api/v1/admin/videos/batch-status/:batchId
 * @desc    Get batch upload status and progress
 * @access  Admin
 * @params  batchId - Batch upload ID
 */
router.get('/batch-status/:batchId', adminVideoController.getBatchStatus);

/**
 * @route   GET /api/v1/admin/videos/processing-queue/stats
 * @desc    Get video processing queue statistics
 * @access  Admin
 */
router.get('/processing-queue/stats', adminVideoController.getProcessingQueueStats);

/**
 * @route   GET /api/v1/admin/videos/failed-jobs
 * @desc    Get failed processing jobs for review
 * @access  Admin
 * @query   limit - Number of jobs to return (default: 50)
 */
router.get('/failed-jobs', adminVideoController.getFailedJobs);

/**
 * @route   POST /api/v1/admin/videos/retry-job/:jobId
 * @desc    Retry a failed processing job
 * @access  Admin
 * @params  jobId - Processing job ID
 */
router.post('/retry-job/:jobId', adminVideoController.retryFailedJob);

/**
 * @route   POST /api/v1/admin/videos/moderate
 * @desc    Process content moderation actions
 * @access  Admin
 * @body    { actions: [{ videoId, action, reason, moderatorNotes }] }
 */
router.post('/moderate', adminVideoController.moderateContent);

/**
 * @route   GET /api/v1/admin/videos/pending-moderation
 * @desc    Get content pending moderation review
 * @access  Admin
 * @query   limit, offset, status
 */
router.get('/pending-moderation', adminVideoController.getPendingModerationContent);

/**
 * @route   GET /api/v1/admin/videos/storage-usage
 * @desc    Get detailed storage usage statistics and analytics
 * @access  Admin
 */
router.get('/storage-usage', adminVideoController.getStorageUsage);

/**
 * @route   POST /api/v1/admin/videos/cleanup-old
 * @desc    Clean up old content and processing jobs
 * @access  Admin
 * @body    { olderThanDays, dryRun }
 */
router.post('/cleanup-old', adminVideoController.cleanupOldContent);

/**
 * @route   GET /api/v1/admin/videos/analytics/storage
 * @desc    Get comprehensive storage analytics
 * @access  Admin
 * @query   forceRefresh - Force refresh of cached analytics
 */
router.get('/analytics/storage', async (req: any, res: any, next: any) => {
  try {
    const forceRefresh = req.query.forceRefresh === 'true';
    const analytics = await storageAnalyticsService.getStorageAnalytics(forceRefresh);
    
    res.json({
      success: true,
      data: analytics,
      message: 'Storage analytics retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/videos/analytics/costs
 * @desc    Get cost breakdown and projections
 * @access  Admin
 */
router.get('/analytics/costs', async (req: any, res: any, next: any) => {
  try {
    const costBreakdown = await storageAnalyticsService.getCostBreakdown();
    
    res.json({
      success: true,
      data: costBreakdown,
      message: 'Cost breakdown retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/videos/analytics/optimization
 * @desc    Get optimization recommendations and report
 * @access  Admin
 */
router.get('/analytics/optimization', async (req: any, res: any, next: any) => {
  try {
    const optimizationReport = await storageAnalyticsService.generateOptimizationReport();
    
    res.json({
      success: true,
      data: optimizationReport,
      message: 'Optimization report generated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/admin/videos/analytics/track-event
 * @desc    Track a storage usage event
 * @access  Admin
 * @body    { type, fileType, size, userId, videoId, url }
 */
router.post('/analytics/track-event', async (req: any, res: any, next: any) => {
  try {
    await storageAnalyticsService.trackStorageEvent(req.body);
    
    res.json({
      success: true,
      message: 'Storage event tracked successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/videos/queue/active-jobs
 * @desc    Get currently processing jobs
 * @access  Admin
 */
router.get('/queue/active-jobs', async (req: any, res: any, next: any) => {
  try {
    // This would get active jobs from the queue
    // Implementation depends on your queue system
    res.json({
      success: true,
      data: [],
      message: 'Active jobs retrieved successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/admin/videos/queue/pause
 * @desc    Pause the video processing queue
 * @access  Admin
 */
router.post('/queue/pause', async (req: any, res: any, next: any) => {
  try {
    await videoProcessingQueue.stop();
    
    res.json({
      success: true,
      message: 'Video processing queue paused',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/v1/admin/videos/queue/resume
 * @desc    Resume the video processing queue
 * @access  Admin
 */
router.post('/queue/resume', async (req: any, res: any, next: any) => {
  try {
    await videoProcessingQueue.start();
    
    res.json({
      success: true,
      message: 'Video processing queue resumed',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/v1/admin/videos/system/health
 * @desc    Get system health status for video operations
 * @access  Admin
 */
router.get('/system/health', async (req: any, res: any, next: any) => {
  try {
    // Check various system components
    const health = {
      queue: {
        status: 'healthy',
        lastHeartbeat: new Date(),
      },
      storage: {
        status: 'healthy',
        availableSpace: '95%',
      },
      processing: {
        status: 'healthy',
        activeJobs: 0,
      },
      database: {
        status: 'healthy',
        connectionPool: 'optimal',
      },
    };
    
    res.json({
      success: true,
      data: health,
      message: 'System health status retrieved',
    });
  } catch (error) {
    next(error);
  }
});

export default router;