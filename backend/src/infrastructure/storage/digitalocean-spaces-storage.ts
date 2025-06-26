/**
 * DigitalOcean Spaces Storage Implementation
 * Handles file uploads to DigitalOcean Spaces using S3-compatible API
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '@/shared/config/environment';
import { logger, loggerHelpers } from '@/shared/utils/logger';

export interface UploadResult {
  url: string;
  downloadUrl: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
}

export interface FileMetadata {
  url: string;
  pathname: string;
  size: number;
  uploadedAt: Date;
  contentType?: string;
}

export class DigitalOceanSpacesStorage {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly endpoint: string;
  private readonly cdnUrl: string;

  constructor() {
    this.bucketName = config.storage.digitalOcean.bucket;
    this.endpoint = config.storage.digitalOcean.endpoint;
    this.cdnUrl = config.storage.digitalOcean.cdnUrl;

    if (!this.bucketName || !this.endpoint) {
      throw new Error('DigitalOcean Spaces configuration is required');
    }

    this.s3Client = new S3Client({
      endpoint: `https://${this.endpoint}`,
      region: config.storage.digitalOcean.region || 'nyc3',
      credentials: {
        accessKeyId: config.storage.digitalOcean.accessKey,
        secretAccessKey: config.storage.digitalOcean.secretKey,
      },
      forcePathStyle: false, // DigitalOcean Spaces uses virtual-hosted-style
    });
  }

  /**
   * Upload a video file
   */
  async uploadVideo(
    file: Buffer | File,
    filename: string,
    metadata?: { courseId: string; episodeId: string }
  ): Promise<UploadResult> {
    try {
      const key = `videos/${metadata?.courseId}/${metadata?.episodeId}/${filename}`;
      
      loggerHelpers.logFile('upload_start', key, file instanceof Buffer ? file.length : file.size);

      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: 'video/mp4',
        ACL: 'public-read',
        Metadata: {
          courseId: metadata?.courseId || '',
          episodeId: metadata?.episodeId || '',
          uploadedBy: 'doramaflix-backend',
          originalName: filename
        }
      });

      const result = await this.s3Client.send(uploadCommand);
      
      const uploadResult: UploadResult = {
        url: this.getPublicUrl(key),
        downloadUrl: this.getCdnUrl(key),
        pathname: key,
        size: file instanceof Buffer ? file.length : file.size,
        uploadedAt: new Date(),
      };

      loggerHelpers.logFile('upload_success', key, uploadResult.size);
      return uploadResult;
    } catch (error) {
      loggerHelpers.logFile('upload_error', filename, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Upload an image (thumbnail, banner, etc.)
   */
  async uploadImage(
    file: Buffer | File,
    filename: string,
    metadata?: { type: 'thumbnail' | 'banner' | 'avatar'; entityId: string }
  ): Promise<UploadResult> {
    try {
      const key = `images/${metadata?.type || 'misc'}/${metadata?.entityId}/${filename}`;
      
      loggerHelpers.logFile('upload_start', key, file instanceof Buffer ? file.length : file.size);

      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: this.getImageContentType(filename),
        ACL: 'public-read',
        Metadata: {
          type: metadata?.type || 'misc',
          entityId: metadata?.entityId || '',
          uploadedBy: 'doramaflix-backend',
          originalName: filename
        }
      });

      await this.s3Client.send(uploadCommand);

      const uploadResult: UploadResult = {
        url: this.getPublicUrl(key),
        downloadUrl: this.getCdnUrl(key),
        pathname: key,
        size: file instanceof Buffer ? file.length : file.size,
        uploadedAt: new Date(),
      };

      loggerHelpers.logFile('upload_success', key, uploadResult.size);
      return uploadResult;
    } catch (error) {
      loggerHelpers.logFile('upload_error', filename, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Upload subtitle file
   */
  async uploadSubtitle(
    file: Buffer | File,
    filename: string,
    metadata: { episodeId: string; language: string }
  ): Promise<UploadResult> {
    try {
      const key = `subtitles/${metadata.episodeId}/${metadata.language}/${filename}`;
      
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: 'text/vtt',
        ACL: 'public-read',
        Metadata: {
          episodeId: metadata.episodeId,
          language: metadata.language,
          uploadedBy: 'doramaflix-backend',
          originalName: filename
        }
      });

      await this.s3Client.send(uploadCommand);

      const uploadResult: UploadResult = {
        url: this.getPublicUrl(key),
        downloadUrl: this.getCdnUrl(key),
        pathname: key,
        size: file instanceof Buffer ? file.length : file.size,
        uploadedAt: new Date(),
      };

      loggerHelpers.logFile('upload_success', key, uploadResult.size);
      return uploadResult;
    } catch (error) {
      loggerHelpers.logFile('upload_error', filename, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(deleteCommand);
      loggerHelpers.logFile('delete_success', key);
    } catch (error) {
      loggerHelpers.logFile('delete_error', key, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(key: string): Promise<FileMetadata> {
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(headCommand);

      return {
        url: this.getPublicUrl(key),
        pathname: key,
        size: response.ContentLength || 0,
        uploadedAt: response.LastModified || new Date(),
        contentType: response.ContentType,
      };
    } catch (error) {
      logger.error('Failed to get file metadata', { key, error });
      throw error;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(prefix?: string, maxKeys?: number): Promise<FileMetadata[]> {
    try {
      const listCommand = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys || 1000,
      });

      const response = await this.s3Client.send(listCommand);

      return (response.Contents || []).map(object => ({
        url: this.getPublicUrl(object.Key!),
        pathname: object.Key!,
        size: object.Size || 0,
        uploadedAt: object.LastModified || new Date(),
      }));
    } catch (error) {
      logger.error('Failed to list files', { prefix, error });
      throw error;
    }
  }

  /**
   * Generate direct video URL for streaming
   */
  getVideoStreamUrl(key: string): string {
    return this.getCdnUrl(key);
  }

  /**
   * Generate optimized image URL with transformations
   * Note: DigitalOcean Spaces doesn't have built-in image optimization
   * Consider using an image service like ImageKit or Cloudinary for optimization
   */
  getOptimizedImageUrl(
    key: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'avif' | 'jpeg' | 'png';
    }
  ): string {
    // For now, return the CDN URL
    // TODO: Integrate with image optimization service if needed
    let url = this.getCdnUrl(key);
    
    if (options) {
      // Add query parameters for client-side handling or future optimization service
      const params = new URLSearchParams();
      
      if (options.width) params.append('w', options.width.toString());
      if (options.height) params.append('h', options.height.toString());
      if (options.quality) params.append('q', options.quality.toString());
      if (options.format) params.append('f', options.format);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
    }
    
    return url;
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.getFileMetadata(key);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    videoFiles: number;
    imageFiles: number;
  }> {
    try {
      const allFiles = await this.listFiles();
      
      const stats = {
        totalFiles: allFiles.length,
        totalSize: allFiles.reduce((sum, file) => sum + file.size, 0),
        videoFiles: allFiles.filter(file => file.pathname.startsWith('videos/')).length,
        imageFiles: allFiles.filter(file => file.pathname.startsWith('images/')).length,
      };

      return stats;
    } catch (error) {
      logger.error('Failed to get storage stats', { error });
      throw error;
    }
  }

  /**
   * Bulk delete files
   */
  async deleteMultipleFiles(keys: string[]): Promise<void> {
    try {
      const deletePromises = keys.map(key => this.deleteFile(key));
      await Promise.all(deletePromises);
      
      logger.info('Bulk delete completed', { fileCount: keys.length });
    } catch (error) {
      logger.error('Bulk delete failed', { fileCount: keys.length, error });
      throw error;
    }
  }

  /**
   * Generate signed URL for temporary access
   */
  async generateSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });

      return signedUrl;
    } catch (error) {
      logger.error('Failed to generate signed URL', { key, error });
      throw error;
    }
  }

  /**
   * Get public URL for a file
   */
  private getPublicUrl(key: string): string {
    return `https://${this.bucketName}.${this.endpoint}/${key}`;
  }

  /**
   * Get CDN URL for a file (faster delivery)
   */
  private getCdnUrl(key: string): string {
    if (this.cdnUrl) {
      return `${this.cdnUrl}/${key}`;
    }
    return this.getPublicUrl(key);
  }

  /**
   * Get content type for images
   */
  private getImageContentType(filename: string): string {
    const extension = filename.toLowerCase().split('.').pop();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      case 'gif':
        return 'image/gif';
      case 'svg':
        return 'image/svg+xml';
      case 'avif':
        return 'image/avif';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Copy file from one location to another within the same bucket
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      const copyCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: destinationKey,
        CopySource: `${this.bucketName}/${sourceKey}`,
        ACL: 'public-read',
      });

      await this.s3Client.send(copyCommand);
      logger.info('File copied successfully', { sourceKey, destinationKey });
    } catch (error) {
      logger.error('Failed to copy file', { sourceKey, destinationKey, error });
      throw error;
    }
  }

  /**
   * Move file from one location to another (copy + delete)
   */
  async moveFile(sourceKey: string, destinationKey: string): Promise<void> {
    try {
      await this.copyFile(sourceKey, destinationKey);
      await this.deleteFile(sourceKey);
      logger.info('File moved successfully', { sourceKey, destinationKey });
    } catch (error) {
      logger.error('Failed to move file', { sourceKey, destinationKey, error });
      throw error;
    }
  }
}

// Export singleton instance
export const digitalOceanSpacesStorage = new DigitalOceanSpacesStorage();