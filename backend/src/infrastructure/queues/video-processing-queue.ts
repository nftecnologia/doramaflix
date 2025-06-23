/**
 * Video Processing Queue
 * Redis-based queue system for background video processing jobs
 */

import { RedisConnection } from '@/infrastructure/cache/redis-connection';
import { VideoProcessingService } from '@/application/services/video-processing.service';
import { logger } from '@/shared/utils/logger';
import { config } from '@/shared/config/environment';

export interface QueueJob {
  id: string;
  type: 'video_processing' | 'thumbnail_generation' | 'hls_generation';
  data: any;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  error?: string;
}

export interface VideoProcessingQueueData {
  jobId: string;
  videoUrl: string;
  videoId: string;
  userId: string;
  options: any;
}

export class VideoProcessingQueue {
  private redis: RedisConnection;
  private videoProcessingService: VideoProcessingService;
  private isProcessing: boolean = false;
  private maxConcurrentJobs: number = 3;
  private currentJobs: Set<string> = new Set();
  private queueName: string = 'video_processing_queue';
  private processingQueueName: string = 'video_processing_active';
  private deadLetterQueueName: string = 'video_processing_failed';

  constructor() {
    this.redis = new RedisConnection();
    this.videoProcessingService = new VideoProcessingService();
  }

  /**
   * Start the queue processor
   */
  async start(): Promise<void> {
    if (this.isProcessing) {
      logger.warn('Video processing queue is already running');
      return;
    }

    this.isProcessing = true;
    logger.info('Starting video processing queue');

    // Process existing jobs that might have been interrupted
    await this.recoverInterruptedJobs();

    // Start the main processing loop
    this.processLoop();
  }

  /**
   * Stop the queue processor
   */
  async stop(): Promise<void> {
    this.isProcessing = false;
    logger.info('Stopping video processing queue');

    // Wait for current jobs to complete
    while (this.currentJobs.size > 0) {
      await this.sleep(1000);
    }

    logger.info('Video processing queue stopped');
  }

  /**
   * Add a video processing job to the queue
   */
  async addVideoProcessingJob(data: VideoProcessingQueueData, priority: number = 1): Promise<string> {
    const jobId = data.jobId;
    
    const job: QueueJob = {
      id: jobId,
      type: 'video_processing',
      data,
      priority,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
    };

    try {
      // Store job metadata
      await this.redis.setex(`job:${jobId}`, 24 * 60 * 60, JSON.stringify(job));

      // Add to priority queue
      await this.redis.zadd(this.queueName, priority, JSON.stringify({ jobId, timestamp: Date.now() }));

      logger.info('Video processing job added to queue', {
        jobId,
        videoId: data.videoId,
        priority,
      });

      return jobId;
    } catch (error) {
      logger.error('Failed to add job to queue', { error, jobId });
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    failed: number;
    completed: number;
  }> {
    try {
      const pending = await this.redis.zcard(this.queueName);
      const processing = await this.redis.scard(this.processingQueueName);
      const failed = await this.redis.llen(this.deadLetterQueueName);
      
      // Count completed jobs (you might want to track this separately)
      const completed = await this.redis.get('completed_jobs_count') || '0';

      return {
        pending,
        processing,
        failed,
        completed: parseInt(completed),
      };
    } catch (error) {
      logger.error('Failed to get queue stats', { error });
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<QueueJob | null> {
    try {
      const jobData = await this.redis.get(`job:${jobId}`);
      if (!jobData) return null;

      const job = JSON.parse(jobData);
      
      // Convert date strings back to Date objects
      job.createdAt = new Date(job.createdAt);
      if (job.processedAt) job.processedAt = new Date(job.processedAt);
      if (job.completedAt) job.completedAt = new Date(job.completedAt);
      if (job.failedAt) job.failedAt = new Date(job.failedAt);

      return job;
    } catch (error) {
      logger.error('Failed to get job status', { error, jobId });
      return null;
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    try {
      const job = await this.getJobStatus(jobId);
      if (!job) {
        throw new Error('Job not found');
      }

      if (job.attempts >= job.maxAttempts) {
        throw new Error('Job has exceeded maximum retry attempts');
      }

      // Reset job status
      job.attempts += 1;
      job.failedAt = undefined;
      job.error = undefined;

      // Save updated job
      await this.redis.setex(`job:${jobId}`, 24 * 60 * 60, JSON.stringify(job));

      // Re-add to queue
      await this.redis.zadd(this.queueName, job.priority, JSON.stringify({ 
        jobId, 
        timestamp: Date.now() 
      }));

      // Remove from dead letter queue if it's there
      await this.redis.lrem(this.deadLetterQueueName, 0, jobId);

      logger.info('Job retry scheduled', { jobId, attempts: job.attempts });
      return true;
    } catch (error) {
      logger.error('Failed to retry job', { error, jobId });
      throw error;
    }
  }

  /**
   * Get failed jobs for admin review
   */
  async getFailedJobs(limit: number = 50): Promise<QueueJob[]> {
    try {
      const failedJobIds = await this.redis.lrange(this.deadLetterQueueName, 0, limit - 1);
      const jobs: QueueJob[] = [];

      for (const jobId of failedJobIds) {
        const job = await this.getJobStatus(jobId);
        if (job) {
          jobs.push(job);
        }
      }

      return jobs;
    } catch (error) {
      logger.error('Failed to get failed jobs', { error });
      throw error;
    }
  }

  /**
   * Main processing loop
   */
  private async processLoop(): Promise<void> {
    while (this.isProcessing) {
      try {
        // Check if we can process more jobs
        if (this.currentJobs.size >= this.maxConcurrentJobs) {
          await this.sleep(1000);
          continue;
        }

        // Get next job with highest priority
        const jobData = await this.redis.bzpopmax(this.queueName, 5); // 5 second timeout
        
        if (!jobData || jobData.length === 0) {
          continue;
        }

        const [queueName, jobInfo, priority] = jobData;
        const { jobId } = JSON.parse(jobInfo);

        // Process job asynchronously
        this.processJob(jobId).catch(error => {
          logger.error('Unhandled error in job processing', { error, jobId });
        });

      } catch (error) {
        logger.error('Error in processing loop', { error });
        await this.sleep(5000); // Wait 5 seconds before retrying
      }
    }
  }

  /**
   * Process a single job
   */
  private async processJob(jobId: string): Promise<void> {
    this.currentJobs.add(jobId);

    try {
      // Get job details
      const job = await this.getJobStatus(jobId);
      if (!job) {
        logger.error('Job not found', { jobId });
        return;
      }

      // Mark job as processing
      job.processedAt = new Date();
      job.attempts += 1;
      await this.redis.setex(`job:${jobId}`, 24 * 60 * 60, JSON.stringify(job));
      await this.redis.sadd(this.processingQueueName, jobId);

      logger.info('Processing job', { jobId, type: job.type, attempts: job.attempts });

      // Process based on job type
      switch (job.type) {
        case 'video_processing':
          await this.videoProcessingService.processVideoJob(jobId);
          break;
        default:
          throw new Error(`Unknown job type: ${job.type}`);
      }

      // Mark job as completed
      job.completedAt = new Date();
      await this.redis.setex(`job:${jobId}`, 24 * 60 * 60, JSON.stringify(job));
      await this.redis.srem(this.processingQueueName, jobId);

      // Increment completed jobs counter
      await this.redis.incr('completed_jobs_count');

      logger.info('Job completed successfully', { jobId, processingTime: job.completedAt.getTime() - job.processedAt!.getTime() });

    } catch (error) {
      logger.error('Job processing failed', { error, jobId });

      try {
        const job = await this.getJobStatus(jobId);
        if (job) {
          job.failedAt = new Date();
          job.error = error instanceof Error ? error.message : 'Unknown error';

          // Check if we should retry or move to dead letter queue
          if (job.attempts < job.maxAttempts) {
            // Schedule retry with exponential backoff
            const delay = Math.pow(2, job.attempts) * 1000; // 2^attempts seconds
            setTimeout(async () => {
              await this.redis.zadd(this.queueName, job.priority, JSON.stringify({ 
                jobId, 
                timestamp: Date.now() 
              }));
            }, delay);

            logger.info('Job scheduled for retry', { jobId, attempts: job.attempts, delayMs: delay });
          } else {
            // Move to dead letter queue
            await this.redis.lpush(this.deadLetterQueueName, jobId);
            logger.error('Job moved to dead letter queue', { jobId, attempts: job.attempts });
          }

          await this.redis.setex(`job:${jobId}`, 24 * 60 * 60, JSON.stringify(job));
        }

        await this.redis.srem(this.processingQueueName, jobId);
      } catch (cleanupError) {
        logger.error('Failed to cleanup failed job', { error: cleanupError, jobId });
      }
    } finally {
      this.currentJobs.delete(jobId);
    }
  }

  /**
   * Recover jobs that were interrupted (e.g., server restart)
   */
  private async recoverInterruptedJobs(): Promise<void> {
    try {
      const processingJobs = await this.redis.smembers(this.processingQueueName);
      
      for (const jobId of processingJobs) {
        const job = await this.getJobStatus(jobId);
        if (job) {
          // Reset job status and re-queue
          job.processedAt = undefined;
          await this.redis.setex(`job:${jobId}`, 24 * 60 * 60, JSON.stringify(job));
          await this.redis.zadd(this.queueName, job.priority, JSON.stringify({ 
            jobId, 
            timestamp: Date.now() 
          }));
        }
        
        // Remove from processing set
        await this.redis.srem(this.processingQueueName, jobId);
      }

      if (processingJobs.length > 0) {
        logger.info('Recovered interrupted jobs', { count: processingJobs.length });
      }
    } catch (error) {
      logger.error('Failed to recover interrupted jobs', { error });
    }
  }

  /**
   * Utility function for delays
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clean up old completed jobs
   */
  async cleanupOldJobs(olderThanDays: number = 7): Promise<number> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setDate(cutoffTime.getDate() - olderThanDays);

      const pattern = 'job:*';
      const keys = await this.redis.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        const jobData = await this.redis.get(key);
        if (jobData) {
          const job = JSON.parse(jobData);
          const completedAt = job.completedAt ? new Date(job.completedAt) : null;
          
          if (completedAt && completedAt < cutoffTime) {
            await this.redis.del(key);
            cleanedCount++;
          }
        }
      }

      logger.info('Cleaned up old jobs', { cleanedCount, olderThanDays });
      return cleanedCount;
    } catch (error) {
      logger.error('Failed to cleanup old jobs', { error });
      throw error;
    }
  }
}