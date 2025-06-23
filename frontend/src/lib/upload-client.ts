/**
 * Upload Client
 * Frontend client for file uploads to Vercel Blob
 */

import { apiClient } from './api-client';

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

export interface UploadResult {
  id: string;
  url: string;
  downloadUrl: string;
  pathname: string;
  size: number;
  type: 'video' | 'image' | 'subtitle';
  metadata: any;
  uploadedAt: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export class UploadClient {
  /**
   * Upload video file
   */
  async uploadVideo(
    file: File,
    data: VideoUploadData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('courseId', data.courseId);
    formData.append('episodeId', data.episodeId);
    formData.append('title', data.title);
    if (data.description) {
      formData.append('description', data.description);
    }

    const response = await apiClient.post('/uploads/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          };
          onProgress(progress);
        }
      },
    });

    return response.data.data;
  }

  /**
   * Upload image file
   */
  async uploadImage(
    file: File,
    data: ImageUploadData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', data.type);
    formData.append('entityId', data.entityId);
    if (data.alt) {
      formData.append('alt', data.alt);
    }

    const response = await apiClient.post('/uploads/image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          };
          onProgress(progress);
        }
      },
    });

    return response.data.data;
  }

  /**
   * Upload subtitle file
   */
  async uploadSubtitle(
    file: File,
    data: SubtitleUploadData,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('episodeId', data.episodeId);
    formData.append('language', data.language);
    formData.append('label', data.label);

    const response = await apiClient.post('/uploads/subtitle', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress: UploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
          };
          onProgress(progress);
        }
      },
    });

    return response.data.data;
  }

  /**
   * Delete file
   */
  async deleteFile(url: string): Promise<void> {
    await apiClient.post('/uploads/file', { url });
  }

  /**
   * Bulk delete files
   */
  async bulkDeleteFiles(urls: string[]): Promise<{ deletedCount: number }> {
    const response = await apiClient.post('/uploads/bulk-delete', { urls });
    return response.data.data;
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(url: string): Promise<any> {
    const response = await apiClient.get('/uploads/metadata', {
      params: { url },
    });
    return response.data.data;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<any> {
    const response = await apiClient.get('/uploads/stats');
    return response.data.data;
  }

  /**
   * Get optimized image URL
   */
  async getOptimizedImageUrl(
    pathname: string,
    options?: {
      width?: number;
      height?: number;
      quality?: number;
    }
  ): Promise<string> {
    const response = await apiClient.get('/uploads/optimize-image', {
      params: {
        pathname,
        ...options,
      },
    });
    return response.data.data.url;
  }

  /**
   * Get video stream URL
   */
  async getVideoStreamUrl(pathname: string): Promise<string> {
    const response = await apiClient.get('/uploads/video-stream', {
      params: { pathname },
    });
    return response.data.data.url;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File, type: 'video' | 'image' | 'subtitle'): { valid: boolean; error?: string } {
    const maxSizes = {
      video: 100 * 1024 * 1024, // 100MB
      image: 10 * 1024 * 1024,  // 10MB
      subtitle: 5 * 1024 * 1024, // 5MB
    };

    const allowedTypes = {
      video: [
        'video/mp4',
        'video/webm',
        'video/ogg',
        'video/avi',
        'video/mov',
        'video/wmv',
        'video/flv',
        'video/mkv',
      ],
      image: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/svg+xml',
      ],
      subtitle: [
        'text/vtt',
        'application/x-subrip',
        'text/plain',
      ],
    };

    // Check file size
    if (file.size > maxSizes[type]) {
      return {
        valid: false,
        error: `File too large. Maximum size: ${maxSizes[type] / (1024 * 1024)}MB`,
      };
    }

    // Check file type
    const isValidType = allowedTypes[type].includes(file.type) || 
      (type === 'subtitle' && file.name.match(/\.(vtt|srt|ass)$/i));

    if (!isValidType) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${allowedTypes[type].join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Generate thumbnail from video file
   */
  async generateVideoThumbnail(file: File): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      video.onloadedmetadata = () => {
        // Seek to 10% of video duration for thumbnail
        video.currentTime = video.duration * 0.1;
      };

      video.onseeked = () => {
        // Set canvas size to video dimensions
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        if (ctx) {
          ctx.drawImage(video, 0, 0);
          
          // Convert canvas to blob
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail'));
            }
          }, 'image/jpeg', 0.8);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      };

      video.onerror = () => {
        reject(new Error('Failed to load video'));
      };

      // Load video file
      video.src = URL.createObjectURL(file);
    });
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get file extension
   */
  getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || '';
  }

  /**
   * Generate unique filename
   */
  generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    const extension = this.getFileExtension(originalName);
    
    return `${timestamp}_${random}.${extension}`;
  }
}

// Export singleton instance
export const uploadClient = new UploadClient();