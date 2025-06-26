/**
 * Upload Service
 * Handles file uploads with DigitalOcean Spaces Storage
 */

import { DigitalOceanSpacesStorage, UploadResult } from '@/infrastructure/storage/digitalocean-spaces-storage';
import { config } from '@/shared/config/environment';
import { logger, loggerHelpers } from '@/shared/utils/logger';
import { ValidationAppError } from '@/application/middlewares/error-handler';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export interface VideoUploadData {
  courseId: string;
  episodeId: string;
  title: string;
  description?: string;
}

export interface ImageUploadData {
  type: 'thumbnail' | 'banner' | 'avatar';
  entityId: string;
  alt?: string;
}

export interface SubtitleUploadData {
  episodeId: string;
  language: string;
  label: string;
}

export interface ProcessedUpload {
  id: string;
  url: string;
  downloadUrl: string;
  pathname: string;
  size: number;
  type: 'video' | 'image' | 'subtitle';
  metadata: any;
  uploadedAt: Date;
}

export class UploadService {
  private storage: DigitalOceanSpacesStorage;

  constructor() {
    this.storage = new DigitalOceanSpacesStorage();
  }

  /**
   * Upload video file for episode
   */
  async uploadVideo(
    file: Express.Multer.File,
    data: VideoUploadData,
    userId: string
  ): Promise<ProcessedUpload> {
    try {
      // Validate video file
      this.validateVideoFile(file);

      // Generate unique filename
      const fileExtension = file.originalname.split('.').pop();
      const filename = `${data.episodeId}_${Date.now()}.${fileExtension}`;

      // Upload to DigitalOcean Spaces
      const result = await this.storage.uploadVideo(
        file.buffer,
        filename,
        {
          courseId: data.courseId,
          episodeId: data.episodeId,
        }
      );

      // Log upload
      loggerHelpers.logFile('video_upload', filename, file.size);

      return {
        id: uuidv4(),
        url: result.url,
        downloadUrl: result.downloadUrl,
        pathname: result.pathname,
        size: result.size,
        type: 'video',
        metadata: {
          ...data,
          originalName: file.originalname,
          mimeType: file.mimetype,
          uploadedBy: userId,
        },
        uploadedAt: result.uploadedAt,
      };
    } catch (error) {
      logger.error('Video upload failed', { error, userId, episodeId: data.episodeId });
      throw error;
    }
  }

  /**
   * Upload and process image
   */
  async uploadImage(
    file: Express.Multer.File,
    data: ImageUploadData,
    userId: string
  ): Promise<ProcessedUpload> {
    try {
      // Validate image file
      this.validateImageFile(file);

      // Process image with sharp
      const processedImage = await this.processImage(file, data.type);

      // Generate unique filename
      const filename = `${data.entityId}_${Date.now()}.webp`;

      // Upload to DigitalOcean Spaces
      const result = await this.storage.uploadImage(
        processedImage,
        filename,
        {
          type: data.type,
          entityId: data.entityId,
        }
      );

      // Log upload
      loggerHelpers.logFile('image_upload', filename, processedImage.length);

      return {
        id: uuidv4(),
        url: result.url,
        downloadUrl: result.downloadUrl,
        pathname: result.pathname,
        size: result.size,
        type: 'image',
        metadata: {
          ...data,
          originalName: file.originalname,
          mimeType: 'image/webp',
          uploadedBy: userId,
        },
        uploadedAt: result.uploadedAt,
      };
    } catch (error) {
      logger.error('Image upload failed', { error, userId, entityId: data.entityId });
      throw error;
    }
  }

  /**
   * Upload subtitle file
   */
  async uploadSubtitle(
    file: Express.Multer.File,
    data: SubtitleUploadData,
    userId: string
  ): Promise<ProcessedUpload> {
    try {
      // Validate subtitle file
      this.validateSubtitleFile(file);

      // Convert to VTT if needed
      const processedSubtitle = await this.processSubtitle(file);

      // Generate unique filename
      const filename = `${data.language}_${Date.now()}.vtt`;

      // Upload to DigitalOcean Spaces
      const result = await this.storage.uploadSubtitle(
        processedSubtitle,
        filename,
        {
          episodeId: data.episodeId,
          language: data.language,
        }
      );

      // Log upload
      loggerHelpers.logFile('subtitle_upload', filename, processedSubtitle.length);

      return {
        id: uuidv4(),
        url: result.url,
        downloadUrl: result.downloadUrl,
        pathname: result.pathname,
        size: result.size,
        type: 'subtitle',
        metadata: {
          ...data,
          originalName: file.originalname,
          mimeType: 'text/vtt',
          uploadedBy: userId,
        },
        uploadedAt: result.uploadedAt,
      };
    } catch (error) {
      logger.error('Subtitle upload failed', { error, userId, episodeId: data.episodeId });
      throw error;
    }
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(url: string, userId: string): Promise<void> {
    try {
      // Extract key from URL for DigitalOcean Spaces
      const key = this.extractKeyFromUrl(url);
      await this.storage.deleteFile(key);
      loggerHelpers.logFile('file_deleted', url);
      
      logger.info('File deleted successfully', { url, userId });
    } catch (error) {
      logger.error('File deletion failed', { error, url, userId });
      throw error;
    }
  }

  /**
   * Get upload status and metadata
   */
  async getFileMetadata(url: string): Promise<any> {
    try {
      const key = this.extractKeyFromUrl(url);
      return await this.storage.getFileMetadata(key);
    } catch (error) {
      logger.error('Failed to get file metadata', { error, url });
      throw error;
    }
  }

  /**
   * Get optimized image URL
   */
  getOptimizedImageUrl(
    pathname: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
    }
  ): string {
    return this.storage.getOptimizedImageUrl(pathname, {
      ...options,
      format: 'webp',
    });
  }

  /**
   * Get direct video streaming URL
   */
  getVideoStreamUrl(pathname: string): string {
    return this.storage.getVideoStreamUrl(pathname);
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<any> {
    try {
      return await this.storage.getStorageStats();
    } catch (error) {
      logger.error('Failed to get storage stats', { error });
      throw error;
    }
  }

  /**
   * Extract key from DigitalOcean Spaces URL
   */
  private extractKeyFromUrl(url: string): string {
    try {
      // Handle both public URL and CDN URL formats
      // Public URL: https://bucket.region.digitaloceanspaces.com/path/to/file
      // CDN URL: https://cdn.example.com/path/to/file
      const urlObj = new URL(url);
      
      // Remove leading slash and return the path
      return urlObj.pathname.substring(1);
    } catch (error) {
      // If URL parsing fails, assume it's already a key
      return url;
    }
  }

  /**
   * Validate video file
   */
  private validateVideoFile(file: Express.Multer.File): void {
    const allowedTypes = config.fileUpload.allowedVideoTypes;
    const maxSize = config.fileUpload.maxFileSize;

    if (!allowedTypes.includes(file.mimetype)) {
      throw new ValidationAppError(`Invalid video format. Allowed types: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new ValidationAppError(`File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
    }
  }

  /**
   * Validate image file
   */
  private validateImageFile(file: Express.Multer.File): void {
    const allowedTypes = config.fileUpload.allowedImageTypes;
    const maxSize = 10 * 1024 * 1024; // 10MB for images

    if (!allowedTypes.includes(file.mimetype)) {
      throw new ValidationAppError(`Invalid image format. Allowed types: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new ValidationAppError(`Image too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
    }
  }

  /**
   * Validate subtitle file
   */
  private validateSubtitleFile(file: Express.Multer.File): void {
    const allowedTypes = ['text/vtt', 'application/x-subrip', 'text/plain'];
    const maxSize = 5 * 1024 * 1024; // 5MB for subtitles

    if (!allowedTypes.includes(file.mimetype) && !file.originalname.match(/\.(vtt|srt|ass)$/i)) {
      throw new ValidationAppError('Invalid subtitle format. Allowed: VTT, SRT, ASS');
    }

    if (file.size > maxSize) {
      throw new ValidationAppError(`Subtitle file too large. Maximum size: ${maxSize / (1024 * 1024)}MB`);
    }
  }

  /**
   * Process image with sharp
   */
  private async processImage(file: Express.Multer.File, type: string): Promise<Buffer> {
    let width: number;
    let height: number;

    // Set dimensions based on image type
    switch (type) {
      case 'thumbnail':
        width = 400;
        height = 225; // 16:9 aspect ratio
        break;
      case 'banner':
        width = 1920;
        height = 1080;
        break;
      case 'avatar':
        width = 200;
        height = 200;
        break;
      default:
        width = 800;
        height = 600;
    }

    try {
      return await sharp(file.buffer)
        .resize(width, height, {
          fit: 'cover',
          position: 'center',
        })
        .webp({
          quality: 85,
          effort: 4,
        })
        .toBuffer();
    } catch (error) {
      logger.error('Image processing failed', { error, type });
      throw new ValidationAppError('Failed to process image');
    }
  }

  /**
   * Process subtitle file (convert to VTT if needed)
   */
  private async processSubtitle(file: Express.Multer.File): Promise<Buffer> {
    try {
      const content = file.buffer.toString('utf-8');
      
      // If already VTT, return as is
      if (content.startsWith('WEBVTT')) {
        return file.buffer;
      }

      // Convert SRT to VTT (basic conversion)
      if (file.originalname.toLowerCase().endsWith('.srt')) {
        const vttContent = this.convertSrtToVtt(content);
        return Buffer.from(vttContent, 'utf-8');
      }

      // For other formats, return as is (you might want to add more converters)
      return file.buffer;
    } catch (error) {
      logger.error('Subtitle processing failed', { error });
      throw new ValidationAppError('Failed to process subtitle file');
    }
  }

  /**
   * Convert SRT to VTT format
   */
  private convertSrtToVtt(srtContent: string): string {
    let vttContent = 'WEBVTT\n\n';
    
    // Replace timestamp format: 00:00:00,000 -> 00:00:00.000
    vttContent += srtContent.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
    
    return vttContent;
  }
}