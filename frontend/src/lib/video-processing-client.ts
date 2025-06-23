/**
 * Video Processing Client
 * Handles video processing job monitoring and management
 */

export interface ProcessingJob {
  id: string
  videoId: string
  originalUrl: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  startedAt?: string
  completedAt?: string
  errorMessage?: string
  outputUrls: {
    [quality: string]: string
  }
  thumbnailUrls: string[]
  hlsUrl?: string
  dashUrl?: string
  metadata?: VideoMetadata
}

export interface VideoMetadata {
  duration: number
  width: number
  height: number
  fps: number
  bitrate: number
  codec: string
  audioCodec: string
  fileSize: number
  aspectRatio: string
}

export interface ProcessingProgress {
  progress: number
  status: string
  error?: string
}

export interface EncodingOptions {
  qualities: ('360p' | '720p' | '1080p' | '4K')[]
  generateThumbnails: boolean
  thumbnailCount: number
  generateHLS: boolean
  generateDASH: boolean
  videoCodec: 'h264' | 'h265'
  audioCodec: 'aac' | 'opus'
}

class VideoProcessingClient {
  private readonly baseURL: string

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  }

  /**
   * Start video processing
   */
  async startProcessing(
    videoUrl: string,
    videoId: string,
    options: Partial<EncodingOptions> = {}
  ): Promise<ProcessingJob> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/video-processing/process`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          videoUrl,
          videoId,
          options: {
            qualities: ['360p', '720p', '1080p'],
            generateThumbnails: true,
            thumbnailCount: 3,
            generateHLS: true,
            generateDASH: false,
            videoCodec: 'h264',
            audioCodec: 'aac',
            ...options,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to start processing: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to start video processing:', error)
      throw error
    }
  }

  /**
   * Get processing job details
   */
  async getProcessingJob(jobId: string): Promise<ProcessingJob> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/video-processing/jobs/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get processing job: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to get processing job:', error)
      throw error
    }
  }

  /**
   * Get processing progress
   */
  async getProcessingProgress(jobId: string): Promise<ProcessingProgress> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/video-processing/jobs/${jobId}/progress`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get processing progress: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to get processing progress:', error)
      throw error
    }
  }

  /**
   * Cancel processing job
   */
  async cancelProcessing(jobId: string): Promise<void> {
    try {
      await fetch(`${this.baseURL}/api/v1/video-processing/jobs/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })
    } catch (error) {
      console.error('Failed to cancel processing:', error)
      throw error
    }
  }

  /**
   * Get user's processing jobs
   */
  async getUserProcessingJobs(status?: string): Promise<ProcessingJob[]> {
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)

      const response = await fetch(`${this.baseURL}/api/v1/video-processing/jobs?${params}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get processing jobs: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to get processing jobs:', error)
      throw error
    }
  }

  /**
   * Retry failed processing job
   */
  async retryProcessing(jobId: string): Promise<ProcessingJob> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/video-processing/jobs/${jobId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to retry processing: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to retry processing:', error)
      throw error
    }
  }

  /**
   * Get processing queue statistics (admin only)
   */
  async getQueueStats(): Promise<{
    pending: number
    processing: number
    failed: number
    completed: number
  }> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/admin/videos/processing-queue/stats`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get queue stats: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to get queue stats:', error)
      throw error
    }
  }

  /**
   * Monitor processing job with real-time updates
   */
  monitorProcessingJob(
    jobId: string,
    onProgress: (progress: ProcessingProgress) => void,
    onComplete: (job: ProcessingJob) => void,
    onError: (error: string) => void,
    interval: number = 2000
  ): () => void {
    let isMonitoring = true

    const checkProgress = async () => {
      if (!isMonitoring) return

      try {
        const progress = await this.getProcessingProgress(jobId)
        onProgress(progress)

        if (progress.status === 'completed') {
          const job = await this.getProcessingJob(jobId)
          onComplete(job)
          isMonitoring = false
        } else if (progress.status === 'failed') {
          onError(progress.error || 'Processing failed')
          isMonitoring = false
        } else {
          // Continue monitoring
          setTimeout(checkProgress, interval)
        }
      } catch (error) {
        onError(error instanceof Error ? error.message : 'Unknown error')
        isMonitoring = false
      }
    }

    // Start monitoring
    checkProgress()

    // Return stop function
    return () => {
      isMonitoring = false
    }
  }

  /**
   * Get processing cost estimation
   */
  async getProcessingCostEstimate(
    fileSize: number,
    duration: number,
    options: Partial<EncodingOptions> = {}
  ): Promise<{
    estimatedCost: number
    estimatedTime: number
    breakdown: {
      encoding: number
      storage: number
      bandwidth: number
    }
  }> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/video-processing/cost-estimate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileSize,
          duration,
          options,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get cost estimate: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to get processing cost estimate:', error)
      throw error
    }
  }

  /**
   * Get supported video formats and quality options
   */
  async getSupportedFormats(): Promise<{
    inputFormats: string[]
    outputQualities: string[]
    codecs: {
      video: string[]
      audio: string[]
    }
  }> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/video-processing/supported-formats`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get supported formats: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to get supported formats:', error)
      throw error
    }
  }

  /**
   * Download processed video
   */
  async getDownloadUrl(jobId: string, quality: string): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/video-processing/jobs/${jobId}/download/${quality}`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get download URL: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data.url
    } catch (error) {
      console.error('Failed to get download URL:', error)
      throw error
    }
  }

  /**
   * Get streaming URLs for different protocols
   */
  async getStreamingUrls(jobId: string): Promise<{
    hls?: string
    dash?: string
    directUrls: {
      [quality: string]: string
    }
  }> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/video-processing/jobs/${jobId}/streaming`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get streaming URLs: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to get streaming URLs:', error)
      throw error
    }
  }

  /**
   * Get thumbnail URLs
   */
  async getThumbnailUrls(jobId: string): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/video-processing/jobs/${jobId}/thumbnails`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get thumbnail URLs: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to get thumbnail URLs:', error)
      throw error
    }
  }

  /**
   * Get auth token from storage
   */
  private getAuthToken(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || ''
    }
    return ''
  }

  /**
   * Utility functions
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  formatBitrate(bps: number): string {
    if (bps >= 1000000) {
      return `${(bps / 1000000).toFixed(1)} Mbps`
    } else if (bps >= 1000) {
      return `${(bps / 1000).toFixed(0)} Kbps`
    }
    return `${bps} bps`
  }
}

export const videoProcessingClient = new VideoProcessingClient()