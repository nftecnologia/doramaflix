/**
 * Video Processing Service
 * Handles video encoding, transcoding, thumbnail generation and adaptive streaming
 */

import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { promisify } from 'util';
import { mkdir, writeFile, readdir, unlink, stat } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { createReadStream, createWriteStream } from 'fs';
import { VercelBlobStorage } from '@/infrastructure/storage/vercel-blob-storage';
import { RedisConnection } from '@/infrastructure/cache/redis-connection';
import { logger } from '@/shared/utils/logger';
import { ValidationAppError } from '@/application/middlewares/error-handler';
import { v4 as uuidv4 } from 'uuid';
import { config } from '@/shared/config/environment';
import sharp from 'sharp';

// Set FFmpeg binary path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
  audioCodec: string;
  fileSize: number;
  aspectRatio: string;
}

export interface ProcessingJob {
  id: string;
  videoId: string;
  originalUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  outputUrls: {
    [quality: string]: string;
  };
  thumbnailUrls: string[];
  hlsUrl?: string;
  dashUrl?: string;
  metadata?: VideoMetadata;
}

export interface EncodingOptions {
  qualities: ('360p' | '720p' | '1080p' | '4K')[];
  generateThumbnails: boolean;
  thumbnailCount: number;
  generateHLS: boolean;
  generateDASH: boolean;
  videoCodec: 'h264' | 'h265';
  audioCodec: 'aac' | 'opus';
}

export interface ThumbnailOptions {
  count: number;
  width: number;
  height: number;
  timestamps?: number[]; // specific timestamps in seconds
}

export class VideoProcessingService {
  private storage: VercelBlobStorage;
  private redis: RedisConnection;
  private tempDir: string;

  constructor() {
    this.storage = new VercelBlobStorage();
    this.redis = new RedisConnection();
    this.tempDir = join(process.cwd(), 'temp', 'video-processing');
  }

  /**
   * Process uploaded video with multiple quality encoding
   */
  async processVideo(
    videoUrl: string,
    videoId: string,
    options: EncodingOptions = this.getDefaultEncodingOptions()
  ): Promise<ProcessingJob> {
    const jobId = uuidv4();
    
    const job: ProcessingJob = {
      id: jobId,
      videoId,
      originalUrl: videoUrl,
      status: 'pending',
      progress: 0,
      outputUrls: {},
      thumbnailUrls: [],
    };

    try {
      // Store initial job state
      await this.saveJob(job);

      // Queue the processing job
      await this.queueProcessingJob(jobId, videoUrl, videoId, options);

      logger.info('Video processing job queued', {
        jobId,
        videoId,
        videoUrl,
        options,
      });

      return job;
    } catch (error) {
      logger.error('Failed to queue video processing job', { error, videoId, videoUrl });
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.saveJob(job);
      throw error;
    }
  }

  /**
   * Process video job (called by queue worker)
   */
  async processVideoJob(jobId: string): Promise<void> {
    let job = await this.getJob(jobId);
    
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    try {
      job.status = 'processing';
      job.startedAt = new Date();
      await this.saveJob(job);

      // Create temp directories
      const jobTempDir = join(this.tempDir, jobId);
      await mkdir(jobTempDir, { recursive: true });

      // Download original video
      const originalVideoPath = join(jobTempDir, 'original.mp4');
      await this.downloadVideo(job.originalUrl, originalVideoPath);

      // Extract metadata
      job.metadata = await this.extractVideoMetadata(originalVideoPath);
      job.progress = 10;
      await this.saveJob(job);

      // Get processing options from Redis
      const optionsData = await this.redis.get(`job_options:${jobId}`);
      const options: EncodingOptions = optionsData ? JSON.parse(optionsData) : this.getDefaultEncodingOptions();

      // Generate thumbnails
      if (options.generateThumbnails) {
        job.thumbnailUrls = await this.generateThumbnails(originalVideoPath, jobId, {
          count: options.thumbnailCount,
          width: 400,
          height: 225,
        });
        job.progress = 25;
        await this.saveJob(job);
      }

      // Encode different quality versions
      const totalQualities = options.qualities.length;
      for (let i = 0; i < totalQualities; i++) {
        const quality = options.qualities[i];
        const outputPath = join(jobTempDir, `${quality}.mp4`);
        
        await this.encodeVideo(originalVideoPath, outputPath, quality, options);
        
        // Upload encoded video
        const encodedVideoBuffer = await this.readFileAsBuffer(outputPath);
        const filename = `${job.videoId}_${quality}.mp4`;
        const uploadResult = await this.storage.uploadVideo(encodedVideoBuffer, filename, {
          videoId: job.videoId,
          quality,
          jobId,
        });
        
        job.outputUrls[quality] = uploadResult.url;
        job.progress = 25 + ((i + 1) / totalQualities) * 50;
        await this.saveJob(job);
      }

      // Generate HLS adaptive streaming
      if (options.generateHLS) {
        job.hlsUrl = await this.generateHLS(jobTempDir, job.videoId, options.qualities);
        job.progress = 85;
        await this.saveJob(job);
      }

      // Generate DASH adaptive streaming
      if (options.generateDASH) {
        job.dashUrl = await this.generateDASH(jobTempDir, job.videoId, options.qualities);
        job.progress = 95;
        await this.saveJob(job);
      }

      // Clean up temp files
      await this.cleanupTempFiles(jobTempDir);

      // Mark job as completed
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = new Date();
      await this.saveJob(job);

      logger.info('Video processing completed', { jobId, videoId: job.videoId });

    } catch (error) {
      logger.error('Video processing failed', { error, jobId, videoId: job.videoId });
      
      job.status = 'failed';
      job.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.saveJob(job);

      throw error;
    }
  }

  /**
   * Extract video metadata using FFprobe
   */
  async extractVideoMetadata(videoPath: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          return reject(new Error(`Failed to extract metadata: ${err.message}`));
        }

        try {
          const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
          const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');

          if (!videoStream) {
            return reject(new Error('No video stream found'));
          }

          const stats = require('fs').statSync(videoPath);

          resolve({
            duration: parseFloat(metadata.format.duration || '0'),
            width: videoStream.width || 0,
            height: videoStream.height || 0,
            fps: parseFloat(videoStream.avg_frame_rate?.split('/')[0] || '0') / 
                 parseFloat(videoStream.avg_frame_rate?.split('/')[1] || '1'),
            bitrate: parseInt(metadata.format.bit_rate || '0'),
            codec: videoStream.codec_name || 'unknown',
            audioCodec: audioStream?.codec_name || 'unknown',
            fileSize: stats.size,
            aspectRatio: videoStream.display_aspect_ratio || `${videoStream.width}:${videoStream.height}`,
          });
        } catch (error) {
          reject(new Error(`Failed to parse metadata: ${error}`));
        }
      });
    });
  }

  /**
   * Generate video thumbnails at different timestamps
   */
  async generateThumbnails(videoPath: string, jobId: string, options: ThumbnailOptions): Promise<string[]> {
    const thumbnailUrls: string[] = [];
    const tempDir = join(this.tempDir, jobId, 'thumbnails');
    await mkdir(tempDir, { recursive: true });

    try {
      // Get video duration
      const metadata = await this.extractVideoMetadata(videoPath);
      const duration = metadata.duration;

      // Calculate timestamps if not provided
      const timestamps = options.timestamps || 
        Array.from({ length: options.count }, (_, i) => (duration / (options.count + 1)) * (i + 1));

      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        const thumbnailPath = join(tempDir, `thumbnail_${i}.jpg`);

        await this.generateThumbnailAtTimestamp(videoPath, thumbnailPath, timestamp, options);

        // Optimize thumbnail with Sharp
        const optimizedBuffer = await sharp(thumbnailPath)
          .resize(options.width, options.height, { fit: 'cover' })
          .jpeg({ quality: 85 })
          .toBuffer();

        // Upload thumbnail
        const filename = `thumbnail_${jobId}_${i}.jpg`;
        const uploadResult = await this.storage.uploadImage(optimizedBuffer, filename, {
          type: 'thumbnail',
          jobId,
          timestamp,
        });

        thumbnailUrls.push(uploadResult.url);
      }

      return thumbnailUrls;
    } catch (error) {
      logger.error('Failed to generate thumbnails', { error, videoPath, jobId });
      throw error;
    }
  }

  /**
   * Generate thumbnail at specific timestamp
   */
  private async generateThumbnailAtTimestamp(
    videoPath: string,
    outputPath: string,
    timestamp: number,
    options: ThumbnailOptions
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          timestamps: [timestamp],
          filename: basename(outputPath),
          folder: dirname(outputPath),
          size: `${options.width}x${options.height}`,
        })
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Thumbnail generation failed: ${err.message}`)));
    });
  }

  /**
   * Encode video to specific quality
   */
  private async encodeVideo(
    inputPath: string,
    outputPath: string,
    quality: '360p' | '720p' | '1080p' | '4K',
    options: EncodingOptions
  ): Promise<void> {
    const qualitySettings = this.getQualitySettings(quality);
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg(inputPath)
        .videoCodec(options.videoCodec === 'h265' ? 'libx265' : 'libx264')
        .audioCodec(options.audioCodec === 'opus' ? 'libopus' : 'aac')
        .size(qualitySettings.resolution)
        .videoBitrate(qualitySettings.videoBitrate)
        .audioBitrate(qualitySettings.audioBitrate)
        .outputOptions([
          '-preset', 'medium',
          '-crf', qualitySettings.crf.toString(),
          '-movflags', '+faststart', // Enable progressive download
        ]);

      command
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`Video encoding failed: ${err.message}`)))
        .run();
    });
  }

  /**
   * Generate HLS adaptive streaming
   */
  private async generateHLS(tempDir: string, videoId: string, qualities: string[]): Promise<string> {
    const hlsDir = join(tempDir, 'hls');
    await mkdir(hlsDir, { recursive: true });

    const masterPlaylistPath = join(hlsDir, 'master.m3u8');
    let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n\n';

    for (const quality of qualities) {
      const qualitySettings = this.getQualitySettings(quality as any);
      const videoPath = join(tempDir, `${quality}.mp4`);
      const playlistPath = join(hlsDir, `${quality}.m3u8`);
      
      // Generate HLS playlist for this quality
      await this.generateHLSPlaylist(videoPath, playlistPath, quality);

      // Add to master playlist
      masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${qualitySettings.videoBitrate * 1000},RESOLUTION=${qualitySettings.resolution}\n`;
      masterPlaylist += `${quality}.m3u8\n\n`;
    }

    await writeFile(masterPlaylistPath, masterPlaylist);

    // Upload HLS files
    const hlsFiles = await readdir(hlsDir);
    for (const file of hlsFiles) {
      const filePath = join(hlsDir, file);
      const fileBuffer = await this.readFileAsBuffer(filePath);
      const filename = `hls/${videoId}/${file}`;
      
      await this.storage.uploadVideo(fileBuffer, filename, {
        videoId,
        type: 'hls',
        quality: file.includes('.m3u8') ? 'playlist' : 'segment',
      });
    }

    return `hls/${videoId}/master.m3u8`;
  }

  /**
   * Generate HLS playlist for a single quality
   */
  private async generateHLSPlaylist(videoPath: string, playlistPath: string, quality: string): Promise<void> {
    const segmentDir = dirname(playlistPath);
    const segmentPrefix = `${quality}_segment_%03d.ts`;

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .outputOptions([
          '-c:v', 'libx264',
          '-c:a', 'aac',
          '-hls_time', '10', // 10 second segments
          '-hls_list_size', '0',
          '-hls_segment_filename', join(segmentDir, segmentPrefix),
          '-f', 'hls',
        ])
        .output(playlistPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(new Error(`HLS generation failed: ${err.message}`)))
        .run();
    });
  }

  /**
   * Generate DASH adaptive streaming
   */
  private async generateDASH(tempDir: string, videoId: string, qualities: string[]): Promise<string> {
    const dashDir = join(tempDir, 'dash');
    await mkdir(dashDir, { recursive: true });

    const manifestPath = join(dashDir, 'manifest.mpd');
    
    // Use ffmpeg to generate DASH manifest
    const inputFiles = qualities.map(quality => join(tempDir, `${quality}.mp4`));
    
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      
      // Add all input files
      inputFiles.forEach(file => command.input(file));
      
      command
        .outputOptions([
          '-f', 'dash',
          '-seg_duration', '10',
          '-use_template', '1',
          '-use_timeline', '1',
        ])
        .output(manifestPath)
        .on('end', async () => {
          try {
            // Upload DASH files
            const dashFiles = await readdir(dashDir);
            for (const file of dashFiles) {
              const filePath = join(dashDir, file);
              const fileBuffer = await this.readFileAsBuffer(filePath);
              const filename = `dash/${videoId}/${file}`;
              
              await this.storage.uploadVideo(fileBuffer, filename, {
                videoId,
                type: 'dash',
              });
            }
            
            resolve(`dash/${videoId}/manifest.mpd`);
          } catch (error) {
            reject(error);
          }
        })
        .on('error', (err) => reject(new Error(`DASH generation failed: ${err.message}`)))
        .run();
    });
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<ProcessingJob | null> {
    try {
      const jobData = await this.redis.get(`processing_job:${jobId}`);
      if (!jobData) return null;
      
      const job = JSON.parse(jobData);
      
      // Convert date strings back to Date objects
      if (job.startedAt) job.startedAt = new Date(job.startedAt);
      if (job.completedAt) job.completedAt = new Date(job.completedAt);
      
      return job;
    } catch (error) {
      logger.error('Failed to get job', { error, jobId });
      return null;
    }
  }

  /**
   * Get processing progress
   */
  async getProcessingProgress(jobId: string): Promise<{ progress: number; status: string; error?: string }> {
    const job = await this.getJob(jobId);
    
    if (!job) {
      throw new ValidationAppError('Job not found');
    }

    return {
      progress: job.progress,
      status: job.status,
      error: job.errorMessage,
    };
  }

  /**
   * Private helper methods
   */
  private getDefaultEncodingOptions(): EncodingOptions {
    return {
      qualities: ['360p', '720p', '1080p'],
      generateThumbnails: true,
      thumbnailCount: 3,
      generateHLS: true,
      generateDASH: false,
      videoCodec: 'h264',
      audioCodec: 'aac',
    };
  }

  private getQualitySettings(quality: '360p' | '720p' | '1080p' | '4K') {
    const settings = {
      '360p': { resolution: '640x360', videoBitrate: '800k', audioBitrate: '96k', crf: 28 },
      '720p': { resolution: '1280x720', videoBitrate: '2500k', audioBitrate: '128k', crf: 25 },
      '1080p': { resolution: '1920x1080', videoBitrate: '5000k', audioBitrate: '192k', crf: 23 },
      '4K': { resolution: '3840x2160', videoBitrate: '15000k', audioBitrate: '256k', crf: 20 },
    };
    
    return settings[quality];
  }

  private async saveJob(job: ProcessingJob): Promise<void> {
    await this.redis.setex(`processing_job:${job.id}`, 24 * 60 * 60, JSON.stringify(job));
  }

  private async queueProcessingJob(jobId: string, videoUrl: string, videoId: string, options: EncodingOptions): Promise<void> {
    // Store options separately
    await this.redis.setex(`job_options:${jobId}`, 24 * 60 * 60, JSON.stringify(options));
    
    // Add to processing queue (you'll implement the actual queue system)
    await this.redis.lpush('video_processing_queue', JSON.stringify({
      jobId,
      videoUrl,
      videoId,
      timestamp: new Date().toISOString(),
    }));
  }

  private async downloadVideo(url: string, outputPath: string): Promise<void> {
    // Implementation depends on your storage system
    // For now, assuming it's a direct URL that can be streamed
    return new Promise((resolve, reject) => {
      const https = require('https');
      const http = require('http');
      const fs = require('fs');
      
      const client = url.startsWith('https:') ? https : http;
      
      client.get(url, (response: any) => {
        if (response.statusCode === 200) {
          const writeStream = fs.createWriteStream(outputPath);
          response.pipe(writeStream);
          
          writeStream.on('finish', () => resolve());
          writeStream.on('error', reject);
        } else {
          reject(new Error(`Failed to download video: ${response.statusCode}`));
        }
      }).on('error', reject);
    });
  }

  private async readFileAsBuffer(filePath: string): Promise<Buffer> {
    const fs = require('fs').promises;
    return await fs.readFile(filePath);
  }

  private async cleanupTempFiles(dirPath: string): Promise<void> {
    try {
      const files = await readdir(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = join(dirPath, file.name);
        if (file.isDirectory()) {
          await this.cleanupTempFiles(filePath);
        } else {
          await unlink(filePath);
        }
      }
      
      await require('fs').promises.rmdir(dirPath);
    } catch (error) {
      logger.warn('Failed to cleanup temp files', { error, dirPath });
    }
  }
}