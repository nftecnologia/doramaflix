/**
 * Vercel Blob Storage Implementation
 * Handles file uploads to Vercel Blob Storage
 */

import { put, del, head, list } from '@vercel/blob';
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

export class VercelBlobStorage {
  private readonly token: string;

  constructor() {
    this.token = config.storage.vercelBlob.token;
    if (!this.token) {
      throw new Error('BLOB_READ_WRITE_TOKEN is required for Vercel Blob storage');
    }
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
      const pathname = `videos/${metadata?.courseId}/${metadata?.episodeId}/${filename}`;
      
      loggerHelpers.logFile('upload_start', pathname, file instanceof Buffer ? file.length : file.size);

      const blob = await put(pathname, file, {
        access: 'public',
        token: this.token,
        contentType: 'video/mp4',
        multipart: true, // Enable for large files
      });

      const result: UploadResult = {
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt),
      };

      loggerHelpers.logFile('upload_success', pathname, blob.size);
      return result;
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
      const pathname = `images/${metadata?.type || 'misc'}/${metadata?.entityId}/${filename}`;
      
      loggerHelpers.logFile('upload_start', pathname, file instanceof Buffer ? file.length : file.size);

      const blob = await put(pathname, file, {
        access: 'public',
        token: this.token,
        contentType: this.getImageContentType(filename),
      });

      const result: UploadResult = {
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt),
      };

      loggerHelpers.logFile('upload_success', pathname, blob.size);
      return result;
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
      const pathname = `subtitles/${metadata.episodeId}/${metadata.language}/${filename}`;
      
      const blob = await put(pathname, file, {
        access: 'public',
        token: this.token,
        contentType: 'text/vtt',
      });

      const result: UploadResult = {
        url: blob.url,
        downloadUrl: blob.downloadUrl,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt),
      };

      loggerHelpers.logFile('upload_success', pathname, blob.size);
      return result;
    } catch (error) {
      loggerHelpers.logFile('upload_error', filename, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(url: string): Promise<void> {
    try {
      await del(url, {
        token: this.token,
      });

      loggerHelpers.logFile('delete_success', url);
    } catch (error) {
      loggerHelpers.logFile('delete_error', url, undefined, error as Error);
      throw error;
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(url: string): Promise<FileMetadata> {
    try {
      const metadata = await head(url, {
        token: this.token,
      });

      return {
        url: metadata.url,
        pathname: metadata.pathname,
        size: metadata.size,
        uploadedAt: new Date(metadata.uploadedAt),
        contentType: metadata.contentType,
      };
    } catch (error) {
      logger.error('Failed to get file metadata', { url, error });
      throw error;
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(prefix?: string, limit?: number): Promise<FileMetadata[]> {
    try {
      const { blobs } = await list({
        prefix,
        limit,
        token: this.token,
      });

      return blobs.map(blob => ({
        url: blob.url,
        pathname: blob.pathname,
        size: blob.size,
        uploadedAt: new Date(blob.uploadedAt),
        contentType: blob.contentType,
      }));
    } catch (error) {
      logger.error('Failed to list files', { prefix, error });
      throw error;
    }
  }

  /**
   * Generate direct video URL for streaming
   */
  getVideoStreamUrl(pathname: string): string {
    return `https://vercel.blob.store/${pathname}`;
  }

  /**
   * Generate optimized image URL with transformations
   */
  getOptimizedImageUrl(
    pathname: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
      format?: 'webp' | 'avif' | 'jpeg' | 'png';
    }
  ): string {
    let url = `https://vercel.blob.store/${pathname}`;
    
    if (options) {
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
  async fileExists(url: string): Promise<boolean> {
    try {
      await this.getFileMetadata(url);
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
  async deleteMultipleFiles(urls: string[]): Promise<void> {
    try {
      const deletePromises = urls.map(url => this.deleteFile(url));
      await Promise.all(deletePromises);
      
      logger.info('Bulk delete completed', { fileCount: urls.length });
    } catch (error) {
      logger.error('Bulk delete failed', { fileCount: urls.length, error });
      throw error;
    }
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
   * Generate signed URL for temporary access (if needed)
   */
  generateSignedUrl(pathname: string, expiresIn: number = 3600): string {
    // Vercel Blob URLs are already public, but we can add cache control
    const url = new URL(`https://vercel.blob.store/${pathname}`);
    url.searchParams.set('expires', (Date.now() + expiresIn * 1000).toString());
    return url.toString();
  }
}