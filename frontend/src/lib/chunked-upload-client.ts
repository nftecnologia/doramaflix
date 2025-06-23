/**
 * Chunked Upload Client
 * Handles large file uploads with chunking, progress tracking and resume capabilities
 */

import { apiClient } from './api-client'
import { createHash } from 'crypto'

export interface ChunkedUploadProgress {
  uploadedChunks: number
  totalChunks: number
  percentage: number
  uploadedBytes: number
  totalBytes: number
  speed: number // bytes per second
  eta: number // seconds remaining
}

export interface ChunkedUploadOptions {
  chunkSize?: number
  maxRetries?: number
  resumeFromChunk?: number
  onProgress?: (progress: ChunkedUploadProgress) => void
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void
  onError?: (error: Error) => void
}

export interface ChunkedUploadSession {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  totalChunks: number
  chunkSize: number
  uploadedChunks: number[]
  status: string
  createdAt: string
}

export interface ChunkedUploadResult {
  sessionId: string
  url: string
  size: number
  uploadedAt: string
  processingJobId?: string
  processingResult?: any
}

export interface VideoMetadata {
  courseId: string
  episodeId: string
  title: string
  description?: string
  tags?: string[]
  language?: string
  season?: number
  episode?: number
  processingOptions?: {
    qualities: ('360p' | '720p' | '1080p' | '4K')[]
    generateThumbnails: boolean
    thumbnailCount: number
    generateHLS: boolean
    generateDASH: boolean
  }
}

class ChunkedUploadController {
  private aborted = false

  constructor(
    private file: File,
    private metadata: VideoMetadata,
    private options: ChunkedUploadOptions,
    public promise: Promise<ChunkedUploadResult>
  ) {}

  abort() {
    this.aborted = true
  }

  get isAborted() {
    return this.aborted
  }
}

class ChunkedUploadClient {
  private readonly baseURL: string
  private readonly defaultChunkSize = 5 * 1024 * 1024 // 5MB
  private readonly defaultMaxRetries = 3

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  }

  /**
   * Upload a video file using chunked upload
   */
  uploadVideo(
    file: File,
    metadata: VideoMetadata,
    options: ChunkedUploadOptions = {}
  ): ChunkedUploadController {
    const uploadPromise = this.performChunkedUpload(file, metadata, options)
    return new ChunkedUploadController(file, metadata, options, uploadPromise)
  }

  /**
   * Resume an interrupted upload
   */
  async resumeUpload(sessionId: string): Promise<{
    session: ChunkedUploadSession
    missingChunks: number[]
    nextChunkIndex: number
  }> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/chunked-uploads/${sessionId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Resume failed: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to resume upload:', error)
      throw error
    }
  }

  /**
   * Get upload session status
   */
  async getUploadStatus(sessionId: string): Promise<ChunkedUploadSession> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/chunked-uploads/${sessionId}/status`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get status: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to get upload status:', error)
      throw error
    }
  }

  /**
   * Cancel an upload
   */
  async cancelUpload(sessionId: string): Promise<void> {
    try {
      await fetch(`${this.baseURL}/api/v1/chunked-uploads/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })
    } catch (error) {
      console.error('Failed to cancel upload:', error)
      throw error
    }
  }

  /**
   * Get active uploads for current user
   */
  async getActiveUploads(): Promise<ChunkedUploadSession[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/chunked-uploads/active`, {
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to get active uploads: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to get active uploads:', error)
      throw error
    }
  }

  /**
   * Perform the actual chunked upload
   */
  private async performChunkedUpload(
    file: File,
    metadata: VideoMetadata,
    options: ChunkedUploadOptions
  ): Promise<ChunkedUploadResult> {
    const chunkSize = options.chunkSize || this.defaultChunkSize
    const maxRetries = options.maxRetries || this.defaultMaxRetries
    const totalChunks = Math.ceil(file.size / chunkSize)

    // Initiate upload session
    const session = await this.initiateUpload(file, metadata, chunkSize)
    
    let uploadedBytes = 0
    const startTime = Date.now()

    try {
      // Upload chunks
      for (let chunkIndex = options.resumeFromChunk || 0; chunkIndex < totalChunks; chunkIndex++) {
        const start = chunkIndex * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        const chunk = file.slice(start, end)
        
        // Calculate chunk hash for verification
        const chunkHash = await this.calculateHash(chunk)
        
        let retryCount = 0
        let chunkUploaded = false

        while (!chunkUploaded && retryCount < maxRetries) {
          try {
            await this.uploadChunk(session.id, chunkIndex, chunk, chunkHash)
            chunkUploaded = true
            uploadedBytes += chunk.size

            // Calculate progress
            const currentTime = Date.now()
            const elapsed = (currentTime - startTime) / 1000 // seconds
            const speed = uploadedBytes / elapsed
            const remainingBytes = file.size - uploadedBytes
            const eta = speed > 0 ? remainingBytes / speed : 0

            const progress: ChunkedUploadProgress = {
              uploadedChunks: chunkIndex + 1,
              totalChunks,
              percentage: ((chunkIndex + 1) / totalChunks) * 100,
              uploadedBytes,
              totalBytes: file.size,
              speed,
              eta,
            }

            options.onProgress?.(progress)
            options.onChunkComplete?.(chunkIndex, totalChunks)

          } catch (error) {
            retryCount++
            if (retryCount >= maxRetries) {
              options.onError?.(error as Error)
              throw new Error(`Chunk ${chunkIndex} failed after ${maxRetries} retries: ${error}`)
            }
            
            // Exponential backoff
            const delay = Math.pow(2, retryCount) * 1000
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }

      // Complete upload
      const result = await this.completeUpload(session.id, totalChunks, file)
      return result

    } catch (error) {
      // Cancel upload on error
      await this.cancelUpload(session.id).catch(() => {})
      throw error
    }
  }

  /**
   * Initiate upload session
   */
  private async initiateUpload(
    file: File,
    metadata: VideoMetadata,
    chunkSize: number
  ): Promise<ChunkedUploadSession> {
    try {
      const response = await fetch(`${this.baseURL}/api/v1/chunked-uploads/initiate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          chunkSize,
          metadata,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to initiate upload: ${response.statusText}`)
      }

      const result = await response.json()
      return result.data
    } catch (error) {
      console.error('Failed to initiate upload:', error)
      throw error
    }
  }

  /**
   * Upload a single chunk
   */
  private async uploadChunk(
    sessionId: string,
    chunkIndex: number,
    chunk: Blob,
    chunkHash: string
  ): Promise<void> {
    const formData = new FormData()
    formData.append('chunk', chunk, `chunk_${chunkIndex}`)
    formData.append('chunkIndex', chunkIndex.toString())
    formData.append('chunkHash', chunkHash)

    try {
      const response = await fetch(`${this.baseURL}/api/v1/chunked-uploads/${sessionId}/chunk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Chunk upload failed: ${response.statusText}`)
      }
    } catch (error) {
      console.error(`Failed to upload chunk ${chunkIndex}:`, error)
      throw error
    }
  }

  /**
   * Complete the upload
   */
  private async completeUpload(
    sessionId: string,
    totalChunks: number,
    file: File
  ): Promise<ChunkedUploadResult> {
    try {
      // Calculate final file hash for verification
      const finalHash = await this.calculateHash(file)

      const response = await fetch(`${this.baseURL}/api/v1/chunked-uploads/${sessionId}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.getAuthToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          totalChunks,
          finalHash,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to complete upload: ${response.statusText}`)
      }

      const result = await response.json()
      return {
        sessionId,
        ...result.data,
      }
    } catch (error) {
      console.error('Failed to complete upload:', error)
      throw error
    }
  }

  /**
   * Calculate hash of a blob for verification
   */
  private async calculateHash(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer()
    const hash = createHash('md5')
    hash.update(Buffer.from(buffer))
    return hash.digest('hex')
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
   * Utility function to format file sizes
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
}

export const chunkedUploadClient = new ChunkedUploadClient()