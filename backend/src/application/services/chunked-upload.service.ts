/**
 * Chunked Upload Service
 * Handles large file uploads with chunking, progress tracking and resume capabilities
 */

import { RedisConnection } from '@/infrastructure/cache/redis-connection';
import { DigitalOceanSpacesStorage } from '@/infrastructure/storage/digitalocean-spaces-storage';
import { logger } from '@/shared/utils/logger';
import { ValidationAppError } from '@/application/middlewares/error-handler';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';
import { config } from '@/shared/config/environment';

export interface UploadSession {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  metadata: any;
  userId: string;
  chunkSize: number;
  totalChunks: number;
  uploadedChunks: number[];
  status: 'initiated' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  finalUrl?: string;
  uploadProgress: number;
  failedChunks: number[];
  retryCount: number;
  maxRetries: number;
}

export interface ChunkUploadData {
  sessionId: string;
  chunkIndex: number;
  chunkData: Buffer;
  chunkHash?: string;
  userId: string;
}

export interface CompleteUploadData {
  sessionId: string;
  totalChunks: number;
  finalHash?: string;
  userId: string;
}

export interface InitiateUploadData {
  fileName: string;
  fileSize: number;
  fileType: string;
  metadata: any;
  userId: string;
}

export interface UploadProgress {
  sessionId: string;
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  totalChunks: number;
  uploadedChunks: number;
  failedChunks: number;
  progress: number;
  status: string;
  speed: number; // bytes per second
  eta: number; // estimated time remaining in seconds
  lastChunkUploadedAt?: Date;
}

export class ChunkedUploadService {
  private redis: RedisConnection;
  private storage: DigitalOceanSpacesStorage;
  private readonly chunkSize: number = 5 * 1024 * 1024; // 5MB chunks
  private readonly maxRetries: number = 3;
  private readonly sessionTTL: number = 24 * 60 * 60; // 24 hours in seconds

  constructor() {
    this.redis = new RedisConnection();
    this.storage = new DigitalOceanSpacesStorage();
  }

  /**
   * Initiate a new chunked upload session
   */
  async initiateUpload(data: InitiateUploadData): Promise<UploadSession> {
    try {
      const sessionId = uuidv4();
      const totalChunks = Math.ceil(data.fileSize / this.chunkSize);

      const session: UploadSession = {
        id: sessionId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        metadata: data.metadata,
        userId: data.userId,
        chunkSize: this.chunkSize,
        totalChunks,
        uploadedChunks: [],
        status: 'initiated',
        createdAt: new Date(),
        updatedAt: new Date(),
        uploadProgress: 0,
        failedChunks: [],
        retryCount: 0,
        maxRetries: this.maxRetries,
      };

      // Store session in Redis
      await this.redis.setex(
        `upload_session:${sessionId}`,
        this.sessionTTL,
        JSON.stringify(session)
      );

      // Track user's active uploads
      await this.redis.sadd(`user_uploads:${data.userId}`, sessionId);

      logger.info('Upload session initiated', {
        sessionId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        totalChunks,
        userId: data.userId,
      });

      return session;
    } catch (error) {
      logger.error('Failed to initiate upload session', { error, data });
      throw new ValidationAppError('Failed to initiate upload session');
    }
  }

  /**
   * Upload a single chunk
   */
  async uploadChunk(data: ChunkUploadData): Promise<{ chunkIndex: number; uploaded: boolean; progress: number }> {
    try {
      const session = await this.getSession(data.sessionId, data.userId);

      if (session.status === 'completed') {
        throw new ValidationAppError('Upload already completed');
      }

      if (session.status === 'cancelled') {
        throw new ValidationAppError('Upload has been cancelled');
      }

      // Validate chunk hash if provided
      if (data.chunkHash) {
        const calculatedHash = createHash('md5').update(data.chunkData).digest('hex');
        if (calculatedHash !== data.chunkHash) {
          throw new ValidationAppError('Chunk hash mismatch');
        }
      }

      // Store chunk temporarily
      const chunkKey = `chunk:${data.sessionId}:${data.chunkIndex}`;
      await this.redis.setex(chunkKey, 3600, data.chunkData.toString('base64')); // 1 hour TTL

      // Update session with uploaded chunk
      session.uploadedChunks.push(data.chunkIndex);
      session.uploadedChunks.sort((a, b) => a - b);
      session.status = 'uploading';
      session.updatedAt = new Date();
      session.uploadProgress = (session.uploadedChunks.length / session.totalChunks) * 100;

      // Remove from failed chunks if it was there
      session.failedChunks = session.failedChunks.filter(chunk => chunk !== data.chunkIndex);

      await this.updateSession(session);

      logger.info('Chunk uploaded', {
        sessionId: data.sessionId,
        chunkIndex: data.chunkIndex,
        progress: session.uploadProgress,
        uploadedChunks: session.uploadedChunks.length,
        totalChunks: session.totalChunks,
      });

      return {
        chunkIndex: data.chunkIndex,
        uploaded: true,
        progress: session.uploadProgress,
      };
    } catch (error) {
      logger.error('Failed to upload chunk', { error, sessionId: data.sessionId, chunkIndex: data.chunkIndex });
      
      // Mark chunk as failed
      const session = await this.getSession(data.sessionId, data.userId);
      if (!session.failedChunks.includes(data.chunkIndex)) {
        session.failedChunks.push(data.chunkIndex);
        await this.updateSession(session);
      }

      throw error;
    }
  }

  /**
   * Complete the upload by assembling all chunks
   */
  async completeUpload(data: CompleteUploadData): Promise<{ url: string; size: number; uploadedAt: Date }> {
    try {
      const session = await this.getSession(data.sessionId, data.userId);

      if (session.uploadedChunks.length !== data.totalChunks) {
        throw new ValidationAppError(
          `Missing chunks. Expected: ${data.totalChunks}, Uploaded: ${session.uploadedChunks.length}`
        );
      }

      // Retrieve and assemble all chunks
      const chunks: Buffer[] = [];
      for (let i = 0; i < data.totalChunks; i++) {
        const chunkKey = `chunk:${data.sessionId}:${i}`;
        const chunkData = await this.redis.get(chunkKey);
        
        if (!chunkData) {
          throw new ValidationAppError(`Missing chunk ${i}`);
        }

        chunks.push(Buffer.from(chunkData, 'base64'));
      }

      // Combine all chunks
      const finalFile = Buffer.concat(chunks);

      // Validate final file hash if provided
      if (data.finalHash) {
        const calculatedHash = createHash('md5').update(finalFile).digest('hex');
        if (calculatedHash !== data.finalHash) {
          throw new ValidationAppError('Final file hash mismatch');
        }
      }

      // Generate unique filename
      const fileExtension = session.fileName.split('.').pop();
      const filename = `${session.metadata?.episodeId || 'upload'}_${Date.now()}.${fileExtension}`;

      // Upload to storage
      const uploadResult = await this.storage.uploadVideo(finalFile, filename, session.metadata);

      // Update session as completed
      session.status = 'completed';
      session.completedAt = new Date();
      session.updatedAt = new Date();
      session.finalUrl = uploadResult.url;
      session.uploadProgress = 100;

      await this.updateSession(session);

      // Clean up chunks
      await this.cleanupChunks(data.sessionId, data.totalChunks);

      // Remove from user's active uploads
      await this.redis.srem(`user_uploads:${session.userId}`, data.sessionId);

      logger.info('Upload completed successfully', {
        sessionId: data.sessionId,
        fileName: session.fileName,
        finalUrl: uploadResult.url,
        fileSize: uploadResult.size,
      });

      return {
        url: uploadResult.url,
        size: uploadResult.size,
        uploadedAt: uploadResult.uploadedAt,
      };
    } catch (error) {
      logger.error('Failed to complete upload', { error, sessionId: data.sessionId });
      
      // Mark session as failed
      const session = await this.getSession(data.sessionId, data.userId);
      session.status = 'failed';
      session.updatedAt = new Date();
      await this.updateSession(session);

      throw error;
    }
  }

  /**
   * Get upload session status
   */
  async getUploadStatus(sessionId: string, userId: string): Promise<UploadSession> {
    return await this.getSession(sessionId, userId);
  }

  /**
   * Resume an interrupted upload
   */
  async resumeUpload(sessionId: string, userId: string): Promise<{
    session: UploadSession;
    missingChunks: number[];
    nextChunkIndex: number;
  }> {
    try {
      const session = await this.getSession(sessionId, userId);

      if (session.status === 'completed') {
        throw new ValidationAppError('Upload already completed');
      }

      if (session.status === 'cancelled') {
        throw new ValidationAppError('Upload has been cancelled');
      }

      // Find missing chunks
      const allChunks = Array.from({ length: session.totalChunks }, (_, i) => i);
      const missingChunks = allChunks.filter(chunk => !session.uploadedChunks.includes(chunk));

      const nextChunkIndex = missingChunks.length > 0 ? missingChunks[0] : session.totalChunks;

      logger.info('Upload resume requested', {
        sessionId,
        missingChunks: missingChunks.length,
        uploadedChunks: session.uploadedChunks.length,
        totalChunks: session.totalChunks,
      });

      return {
        session,
        missingChunks,
        nextChunkIndex,
      };
    } catch (error) {
      logger.error('Failed to resume upload', { error, sessionId });
      throw error;
    }
  }

  /**
   * Cancel an upload session
   */
  async cancelUpload(sessionId: string, userId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId, userId);

      // Update session status
      session.status = 'cancelled';
      session.updatedAt = new Date();
      await this.updateSession(session);

      // Clean up chunks
      await this.cleanupChunks(sessionId, session.totalChunks);

      // Remove from user's active uploads
      await this.redis.srem(`user_uploads:${userId}`, sessionId);

      logger.info('Upload cancelled', { sessionId, userId });
    } catch (error) {
      logger.error('Failed to cancel upload', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get user's active uploads
   */
  async getActiveUploads(userId: string): Promise<UploadSession[]> {
    try {
      const sessionIds = await this.redis.smembers(`user_uploads:${userId}`);
      const sessions: UploadSession[] = [];

      for (const sessionId of sessionIds) {
        try {
          const session = await this.getSession(sessionId, userId);
          if (session.status !== 'completed' && session.status !== 'cancelled') {
            sessions.push(session);
          }
        } catch (error) {
          // Remove invalid session from set
          await this.redis.srem(`user_uploads:${userId}`, sessionId);
        }
      }

      return sessions;
    } catch (error) {
      logger.error('Failed to get active uploads', { error, userId });
      throw error;
    }
  }

  /**
   * Retry a failed chunk
   */
  async retryChunk(sessionId: string, chunkIndex: number, userId: string): Promise<{ canRetry: boolean; retryCount: number }> {
    try {
      const session = await this.getSession(sessionId, userId);

      if (session.retryCount >= session.maxRetries) {
        throw new ValidationAppError('Maximum retry attempts exceeded');
      }

      // Remove chunk from failed list
      session.failedChunks = session.failedChunks.filter(chunk => chunk !== chunkIndex);
      session.retryCount += 1;
      session.updatedAt = new Date();

      await this.updateSession(session);

      return {
        canRetry: true,
        retryCount: session.retryCount,
      };
    } catch (error) {
      logger.error('Failed to retry chunk', { error, sessionId, chunkIndex });
      throw error;
    }
  }

  /**
   * Get detailed upload progress
   */
  async getUploadProgress(sessionId: string, userId: string): Promise<UploadProgress> {
    try {
      const session = await this.getSession(sessionId, userId);
      const uploadedBytes = session.uploadedChunks.length * session.chunkSize;
      
      // Calculate upload speed (very basic implementation)
      const timeDiff = new Date().getTime() - session.createdAt.getTime();
      const speed = uploadedBytes / (timeDiff / 1000); // bytes per second
      
      // Calculate ETA
      const remainingBytes = session.fileSize - uploadedBytes;
      const eta = speed > 0 ? remainingBytes / speed : 0;

      return {
        sessionId: session.id,
        fileName: session.fileName,
        fileSize: session.fileSize,
        uploadedBytes,
        totalChunks: session.totalChunks,
        uploadedChunks: session.uploadedChunks.length,
        failedChunks: session.failedChunks.length,
        progress: session.uploadProgress,
        status: session.status,
        speed: Math.round(speed),
        eta: Math.round(eta),
        lastChunkUploadedAt: session.updatedAt,
      };
    } catch (error) {
      logger.error('Failed to get upload progress', { error, sessionId });
      throw error;
    }
  }

  /**
   * Batch initiate multiple uploads
   */
  async batchInitiateUploads(files: InitiateUploadData[], userId: string): Promise<UploadSession[]> {
    try {
      const sessions: UploadSession[] = [];

      for (const fileData of files) {
        const session = await this.initiateUpload({ ...fileData, userId });
        sessions.push(session);
      }

      logger.info('Batch upload sessions initiated', {
        userId,
        fileCount: files.length,
        sessionIds: sessions.map(s => s.id),
      });

      return sessions;
    } catch (error) {
      logger.error('Failed to batch initiate uploads', { error, userId });
      throw error;
    }
  }

  /**
   * Private method to get session
   */
  private async getSession(sessionId: string, userId: string): Promise<UploadSession> {
    const sessionData = await this.redis.get(`upload_session:${sessionId}`);
    
    if (!sessionData) {
      throw new ValidationAppError('Upload session not found');
    }

    const session: UploadSession = JSON.parse(sessionData);
    
    if (session.userId !== userId) {
      throw new ValidationAppError('Unauthorized access to upload session');
    }

    // Convert date strings back to Date objects
    session.createdAt = new Date(session.createdAt);
    session.updatedAt = new Date(session.updatedAt);
    if (session.completedAt) {
      session.completedAt = new Date(session.completedAt);
    }

    return session;
  }

  /**
   * Private method to update session
   */
  private async updateSession(session: UploadSession): Promise<void> {
    await this.redis.setex(
      `upload_session:${session.id}`,
      this.sessionTTL,
      JSON.stringify(session)
    );
  }

  /**
   * Private method to cleanup chunks
   */
  private async cleanupChunks(sessionId: string, totalChunks: number): Promise<void> {
    const deletePromises = [];
    
    for (let i = 0; i < totalChunks; i++) {
      const chunkKey = `chunk:${sessionId}:${i}`;
      deletePromises.push(this.redis.del(chunkKey));
    }

    await Promise.all(deletePromises);
    logger.info('Chunks cleaned up', { sessionId, totalChunks });
  }
}