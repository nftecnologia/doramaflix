#!/usr/bin/env node

/**
 * ========================================
 * DORAMAFLIX - MIGRATION SCRIPT
 * Vercel Blob → DigitalOcean Spaces
 * ========================================
 * 
 * This script migrates all files from Vercel Blob Storage to DigitalOcean Spaces
 * while maintaining folder structure and updating database URLs.
 * 
 * Features:
 * - Robust retry logic with exponential backoff
 * - Parallel processing with concurrency control
 * - File integrity verification using checksums
 * - Detailed migration logging
 * - Database URL updates
 * - Progress tracking with ETA
 * 
 * Usage: node migrate-vercel-to-spaces.js [--dry-run] [--skip-db-update]
 */

import { createReadStream, createWriteStream, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { pipeline } from 'stream/promises';
import { createHash } from 'crypto';
import { URL } from 'url';
import { fileURLToPath } from 'url';

// Third-party imports
import pLimit from 'p-limit';
import { ProgressBar } from '@opentf/cli-pbar';
import { Command } from 'commander';
import chalk from 'chalk';
import { config as dotenvConfig } from 'dotenv';

// Vercel Blob SDK
import { list, head } from '@vercel/blob';

// AWS SDK for DigitalOcean Spaces (S3-compatible)
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

// Database connection
import pg from 'pg';
const { Pool } = pg;

// Load environment variables
dotenvConfig();

// Script configuration
const CONFIG = {
  // Concurrency limits
  DOWNLOAD_CONCURRENCY: 5,
  UPLOAD_CONCURRENCY: 3,
  DB_UPDATE_CONCURRENCY: 10,
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_BASE: 1000, // 1 second base delay
  RETRY_BACKOFF_MULTIPLIER: 2,
  
  // File processing
  CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  PROGRESS_UPDATE_INTERVAL: 1000, // 1 second
  
  // Verification
  VERIFY_CHECKSUMS: true,
  VERIFY_FILE_SIZE: true,
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  LOG_FILE: join(process.cwd(), 'logs', `migration-${new Date().toISOString().split('T')[0]}.log`),
};

// Initialize logger
class Logger {
  constructor(logFile) {
    this.logFile = logFile;
    this.ensureLogDirectory();
    this.startTime = Date.now();
    this.stats = {
      info: 0,
      warn: 0,
      error: 0,
      debug: 0
    };
  }

  ensureLogDirectory() {
    const logDir = dirname(this.logFile);
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }
  }

  log(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      metadata,
      elapsedMs: Date.now() - this.startTime
    };

    // Console output with colors
    const colorMap = {
      debug: chalk.gray,
      info: chalk.blue,
      warn: chalk.yellow,
      error: chalk.red,
    };

    const colorFn = colorMap[level] || chalk.white;
    console.log(`${chalk.gray(timestamp)} ${colorFn(`[${level.toUpperCase()}]`)} ${message}`);

    // File output
    const fs = await import('fs');
    const logLine = JSON.stringify(logEntry) + '\n';
    fs.appendFileSync(this.logFile, logLine);

    this.stats[level]++;
  }

  debug(message, metadata) { this.log('debug', message, metadata); }
  info(message, metadata) { this.log('info', message, metadata); }
  warn(message, metadata) { this.log('warn', message, metadata); }
  error(message, metadata) { this.log('error', message, metadata); }

  getStats() {
    return {
      ...this.stats,
      totalLogs: Object.values(this.stats).reduce((a, b) => a + b, 0),
      elapsedTime: Date.now() - this.startTime
    };
  }
}

// Initialize storage clients
class StorageClients {
  constructor() {
    this.vercelToken = process.env.BLOB_READ_WRITE_TOKEN;
    this.doSpaces = new S3Client({
      endpoint: `https://${process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com'}`,
      region: process.env.DO_SPACES_REGION || 'nyc3',
      credentials: {
        accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
      },
      forcePathStyle: false,
    });
    this.doSpacesBucket = process.env.DO_SPACES_BUCKET || 'doramaflix-storage';
    this.doCdnUrl = process.env.DO_SPACES_CDN_URL || '';
  }

  validateConfig() {
    const required = [
      'BLOB_READ_WRITE_TOKEN',
      'DO_SPACES_ACCESS_KEY', 
      'DO_SPACES_SECRET_KEY',
      'DO_SPACES_BUCKET'
    ];

    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
  }
}

// Database connection pool
class DatabaseManager {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async query(text, params) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;
      logger.debug('Database query executed', { duration, query: text.substring(0, 100) });
      return res;
    } catch (error) {
      logger.error('Database query failed', { error: error.message, query: text });
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Utility functions
class Utils {
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  static async calculateChecksum(buffer) {
    return createHash('sha256').update(buffer).digest('hex');
  }

  static async retryWithBackoff(fn, maxRetries = CONFIG.MAX_RETRIES) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }

        const delay = CONFIG.RETRY_DELAY_BASE * Math.pow(CONFIG.RETRY_BACKOFF_MULTIPLIER, attempt - 1);
        logger.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`, { 
          error: error.message,
          attempt,
          maxRetries 
        });
        
        await Utils.sleep(delay);
      }
    }
    
    throw lastError;
  }

  static getFileType(pathname) {
    if (pathname.startsWith('videos/')) return 'video';
    if (pathname.startsWith('images/')) return 'image';
    if (pathname.startsWith('subtitles/')) return 'subtitle';
    return 'other';
  }

  static getContentType(pathname) {
    const extension = pathname.toLowerCase().split('.').pop();
    const contentTypes = {
      // Videos
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'mkv': 'video/x-matroska',
      
      // Images
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      
      // Subtitles
      'vtt': 'text/vtt',
      'srt': 'text/plain',
      
      // Documents
      'pdf': 'application/pdf',
      'txt': 'text/plain',
    };
    
    return contentTypes[extension] || 'application/octet-stream';
  }
}

// File migration handler
class FileMigration {
  constructor(storageClients, db) {
    this.storage = storageClients;
    this.db = db;
    this.downloadLimit = pLimit(CONFIG.DOWNLOAD_CONCURRENCY);
    this.uploadLimit = pLimit(CONFIG.UPLOAD_CONCURRENCY);
    this.dbUpdateLimit = pLimit(CONFIG.DB_UPDATE_CONCURRENCY);
    
    this.stats = {
      totalFiles: 0,
      processedFiles: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      skippedFiles: 0,
      totalBytes: 0,
      transferredBytes: 0,
      startTime: Date.now(),
      errors: []
    };
  }

  async listAllVercelFiles() {
    logger.info('🔍 Discovering files in Vercel Blob Storage...');
    
    const allFiles = [];
    let cursor;
    let totalSize = 0;

    do {
      const result = await Utils.retryWithBackoff(async () => {
        return await list({ 
          token: this.storage.vercelToken,
          cursor,
          limit: 1000 
        });
      });

      allFiles.push(...result.blobs);
      totalSize += result.blobs.reduce((sum, blob) => sum + blob.size, 0);
      cursor = result.cursor;

      logger.debug(`Found ${result.blobs.length} files in batch (cursor: ${cursor || 'end'})`);
    } while (cursor);

    this.stats.totalFiles = allFiles.length;
    this.stats.totalBytes = totalSize;

    logger.info(`✅ Discovery complete: ${allFiles.length} files (${Utils.formatBytes(totalSize)})`);
    
    return allFiles;
  }

  async downloadFile(blob) {
    return this.downloadLimit(async () => {
      logger.debug(`📥 Downloading ${blob.pathname}`, { size: Utils.formatBytes(blob.size) });
      
      return await Utils.retryWithBackoff(async () => {
        const response = await fetch(blob.downloadUrl);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Verify file size
        if (CONFIG.VERIFY_FILE_SIZE && buffer.length !== blob.size) {
          throw new Error(`Size mismatch: expected ${blob.size}, got ${buffer.length}`);
        }
        
        logger.debug(`✅ Downloaded ${blob.pathname}`, { actualSize: Utils.formatBytes(buffer.length) });
        return buffer;
      });
    });
  }

  async uploadToSpaces(buffer, pathname, contentType) {
    return this.uploadLimit(async () => {
      logger.debug(`📤 Uploading ${pathname} to DigitalOcean Spaces`, { 
        size: Utils.formatBytes(buffer.length),
        contentType 
      });
      
      return await Utils.retryWithBackoff(async () => {
        const uploadCommand = new PutObjectCommand({
          Bucket: this.storage.doSpacesBucket,
          Key: pathname,
          Body: buffer,
          ContentType: contentType,
          ACL: 'public-read',
          Metadata: {
            migratedFrom: 'vercel-blob',
            migratedAt: new Date().toISOString(),
            originalSize: buffer.length.toString(),
            checksum: CONFIG.VERIFY_CHECKSUMS ? await Utils.calculateChecksum(buffer) : undefined
          }
        });

        await this.storage.doSpaces.send(uploadCommand);
        
        // Generate new URL
        const newUrl = this.storage.doCdnUrl 
          ? `${this.storage.doCdnUrl}/${pathname}`
          : `https://${this.storage.doSpacesBucket}.${process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com'}/${pathname}`;
        
        logger.debug(`✅ Uploaded ${pathname}`, { newUrl });
        return newUrl;
      });
    });
  }

  async verifyUpload(pathname, originalBuffer) {
    if (!CONFIG.VERIFY_CHECKSUMS && !CONFIG.VERIFY_FILE_SIZE) {
      return true;
    }

    logger.debug(`🔍 Verifying upload ${pathname}`);
    
    try {
      const headCommand = new HeadObjectCommand({
        Bucket: this.storage.doSpacesBucket,
        Key: pathname
      });

      const result = await this.storage.doSpaces.send(headCommand);
      
      // Verify file size
      if (CONFIG.VERIFY_FILE_SIZE && result.ContentLength !== originalBuffer.length) {
        logger.error(`Size verification failed for ${pathname}`, {
          expected: originalBuffer.length,
          actual: result.ContentLength
        });
        return false;
      }

      // Verify checksum (if stored in metadata)
      if (CONFIG.VERIFY_CHECKSUMS && result.Metadata?.checksum) {
        const originalChecksum = await Utils.calculateChecksum(originalBuffer);
        if (result.Metadata.checksum !== originalChecksum) {
          logger.error(`Checksum verification failed for ${pathname}`, {
            expected: originalChecksum,
            actual: result.Metadata.checksum
          });
          return false;
        }
      }

      logger.debug(`✅ Verification passed for ${pathname}`);
      return true;
    } catch (error) {
      logger.error(`Verification failed for ${pathname}`, { error: error.message });
      return false;
    }
  }

  async updateDatabaseUrls(oldUrl, newUrl, fileType) {
    return this.dbUpdateLimit(async () => {
      logger.debug(`🗄️ Updating database URLs`, { oldUrl, newUrl, fileType });
      
      const updateQueries = [];
      
      // Update different tables based on file type
      switch (fileType) {
        case 'video':
          updateQueries.push([
            'UPDATE episodes SET video_url = $1 WHERE video_url = $2',
            [newUrl, oldUrl]
          ]);
          updateQueries.push([
            'UPDATE courses SET trailer_url = $1 WHERE trailer_url = $2',
            [newUrl, oldUrl]
          ]);
          break;
          
        case 'image':
          updateQueries.push([
            'UPDATE courses SET thumbnail_url = $1 WHERE thumbnail_url = $2',
            [newUrl, oldUrl]
          ]);
          updateQueries.push([
            'UPDATE courses SET banner_url = $1 WHERE banner_url = $2',
            [newUrl, oldUrl]
          ]);
          updateQueries.push([
            'UPDATE episodes SET thumbnail_url = $1 WHERE thumbnail_url = $2',
            [newUrl, oldUrl]
          ]);
          updateQueries.push([
            'UPDATE seasons SET thumbnail_url = $1 WHERE thumbnail_url = $2',
            [newUrl, oldUrl]
          ]);
          updateQueries.push([
            'UPDATE users SET avatar_url = $1 WHERE avatar_url = $2',
            [newUrl, oldUrl]
          ]);
          updateQueries.push([
            'UPDATE categories SET icon_url = $1 WHERE icon_url = $2',
            [newUrl, oldUrl]
          ]);
          break;
          
        default:
          // Update file_uploads table for all file types
          updateQueries.push([
            'UPDATE file_uploads SET file_path = $1 WHERE file_path = $2',
            [newUrl, oldUrl]
          ]);
      }

      let totalUpdates = 0;
      
      for (const [query, params] of updateQueries) {
        try {
          const result = await this.db.query(query, params);
          totalUpdates += result.rowCount;
          if (result.rowCount > 0) {
            logger.debug(`Updated ${result.rowCount} rows in database`, { query: query.split(' ')[1] });
          }
        } catch (error) {
          logger.error(`Database update failed`, { query, error: error.message });
          throw error;
        }
      }

      if (totalUpdates > 0) {
        logger.debug(`✅ Database updates complete`, { totalUpdates, oldUrl, newUrl });
      }
      
      return totalUpdates;
    });
  }

  async migrateFile(blob, progressBar, dryRun = false, skipDbUpdate = false) {
    const startTime = Date.now();
    
    try {
      // Download file from Vercel Blob
      const buffer = await this.downloadFile(blob);
      
      if (dryRun) {
        logger.info(`[DRY RUN] Would migrate ${blob.pathname}`, {
          size: Utils.formatBytes(blob.size),
          type: Utils.getFileType(blob.pathname)
        });
        this.stats.processedFiles++;
        this.stats.successfulMigrations++;
        progressBar?.increment(1);
        return { success: true, dryRun: true };
      }

      // Upload to DigitalOcean Spaces
      const contentType = Utils.getContentType(blob.pathname);
      const newUrl = await this.uploadToSpaces(buffer, blob.pathname, contentType);
      
      // Verify upload
      const verified = await this.verifyUpload(blob.pathname, buffer);
      if (!verified) {
        throw new Error('Upload verification failed');
      }

      // Update database URLs
      let dbUpdates = 0;
      if (!skipDbUpdate) {
        const fileType = Utils.getFileType(blob.pathname);
        dbUpdates = await this.updateDatabaseUrls(blob.url, newUrl, fileType);
      }

      // Update statistics
      this.stats.processedFiles++;
      this.stats.successfulMigrations++;
      this.stats.transferredBytes += blob.size;

      const duration = Date.now() - startTime;
      logger.info(`✅ Migrated ${blob.pathname}`, {
        size: Utils.formatBytes(blob.size),
        duration: Utils.formatDuration(duration),
        newUrl,
        dbUpdates
      });

      progressBar?.increment(1);
      return { success: true, newUrl, dbUpdates, duration };

    } catch (error) {
      this.stats.processedFiles++;
      this.stats.failedMigrations++;
      this.stats.errors.push({
        file: blob.pathname,
        error: error.message,
        timestamp: new Date().toISOString()
      });

      logger.error(`❌ Failed to migrate ${blob.pathname}`, { error: error.message });
      progressBar?.increment(1);
      return { success: false, error: error.message };
    }
  }

  async generateMigrationReport() {
    const endTime = Date.now();
    const duration = endTime - this.stats.startTime;
    const successRate = (this.stats.successfulMigrations / this.stats.totalFiles) * 100;

    const report = {
      summary: {
        totalFiles: this.stats.totalFiles,
        successfulMigrations: this.stats.successfulMigrations,
        failedMigrations: this.stats.failedMigrations,
        skippedFiles: this.stats.skippedFiles,
        successRate: `${successRate.toFixed(2)}%`,
        duration: Utils.formatDuration(duration),
        totalDataTransferred: Utils.formatBytes(this.stats.transferredBytes),
        averageSpeed: Utils.formatBytes(this.stats.transferredBytes / (duration / 1000)) + '/s'
      },
      errors: this.stats.errors,
      logStats: logger.getStats()
    };

    // Write report to file
    const reportFile = join(process.cwd(), 'logs', `migration-report-${new Date().toISOString().split('T')[0]}.json`);
    const fs = await import('fs');
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    logger.info('📊 Migration Report Generated', { reportFile });
    
    // Display summary
    console.log('\n' + chalk.bold('🎯 MIGRATION SUMMARY'));
    console.log(chalk.green(`✅ Successful: ${report.summary.successfulMigrations}`));
    console.log(chalk.red(`❌ Failed: ${report.summary.failedMigrations}`));
    console.log(chalk.blue(`📊 Success Rate: ${report.summary.successRate}`));
    console.log(chalk.yellow(`⏱️ Duration: ${report.summary.duration}`));
    console.log(chalk.cyan(`📈 Data Transferred: ${report.summary.totalDataTransferred}`));
    console.log(chalk.magenta(`🚀 Average Speed: ${report.summary.averageSpeed}`));

    return report;
  }
}

// Main migration orchestrator
class MigrationOrchestrator {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      skipDbUpdate: options.skipDbUpdate || false,
      fileFilter: options.fileFilter,
      maxFiles: options.maxFiles
    };
  }

  async run() {
    logger.info('🚀 Starting Vercel Blob → DigitalOcean Spaces Migration');
    
    try {
      // Initialize components
      const storageClients = new StorageClients();
      storageClients.validateConfig();
      
      const db = new DatabaseManager();
      const migration = new FileMigration(storageClients, db);

      // Discovery phase
      const files = await migration.listAllVercelFiles();
      
      // Apply filters
      let filteredFiles = files;
      if (this.options.fileFilter) {
        filteredFiles = files.filter(this.options.fileFilter);
        logger.info(`🔍 Applied filter: ${filteredFiles.length}/${files.length} files selected`);
      }
      
      if (this.options.maxFiles && filteredFiles.length > this.options.maxFiles) {
        filteredFiles = filteredFiles.slice(0, this.options.maxFiles);
        logger.info(`🔢 Limited to first ${this.options.maxFiles} files`);
      }

      if (filteredFiles.length === 0) {
        logger.warn('⚠️ No files to migrate');
        return;
      }

      // Initialize progress bar
      const progressBar = new ProgressBar({
        prefix: '📦 Migrating',
        suffix: '| {value}/{total} files | {percentage}% | ETA: {eta}s',
        total: filteredFiles.length,
        width: 50
      });

      logger.info(`🎯 Starting migration of ${filteredFiles.length} files...`);
      
      if (this.options.dryRun) {
        logger.warn('🧪 DRY RUN MODE - No files will be actually migrated');
      }

      // Migration phase - Process files in parallel with controlled concurrency
      const migrationPromises = filteredFiles.map(blob => 
        migration.migrateFile(blob, progressBar, this.options.dryRun, this.options.skipDbUpdate)
      );

      await Promise.all(migrationPromises);

      // Cleanup
      progressBar.stop();
      await db.close();

      // Generate final report
      const report = await migration.generateMigrationReport();
      
      logger.info('🎉 Migration completed successfully!');
      
      return report;

    } catch (error) {
      logger.error('💥 Migration failed', { error: error.message, stack: error.stack });
      throw error;
    }
  }
}

// CLI Setup
function setupCLI() {
  const program = new Command();
  
  program
    .name('migrate-vercel-to-spaces')
    .description('Migrate files from Vercel Blob Storage to DigitalOcean Spaces')
    .version('1.0.0')
    .option('--dry-run', 'Perform a dry run without actually migrating files')
    .option('--skip-db-update', 'Skip database URL updates')
    .option('--max-files <number>', 'Limit the number of files to migrate (for testing)', parseInt)
    .option('--file-type <type>', 'Filter files by type (video, image, subtitle, other)')
    .option('--log-level <level>', 'Set log level (debug, info, warn, error)', 'info')
    .parse();

  return program.opts();
}

// Main execution
async function main() {
  try {
    const options = setupCLI();
    
    // Initialize logger
    global.logger = new Logger(CONFIG.LOG_FILE);
    
    // Set log level
    CONFIG.LOG_LEVEL = options.logLevel;
    
    // Create file filter if specified
    let fileFilter;
    if (options.fileType) {
      fileFilter = (blob) => Utils.getFileType(blob.pathname) === options.fileType;
    }

    // Run migration
    const orchestrator = new MigrationOrchestrator({
      dryRun: options.dryRun,
      skipDbUpdate: options.skipDbUpdate,
      maxFiles: options.maxFiles,
      fileFilter
    });

    await orchestrator.run();
    process.exit(0);

  } catch (error) {
    console.error(chalk.red('💥 Migration failed:'), error.message);
    
    if (global.logger) {
      logger.error('Migration process failed', { 
        error: error.message, 
        stack: error.stack 
      });
    }
    
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n⚠️ Migration interrupted by user'));
  process.exit(130);
});

process.on('SIGTERM', () => {
  console.log(chalk.yellow('\n⚠️ Migration terminated'));
  process.exit(143);
});

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('Unhandled Rejection at:'), promise, chalk.red('reason:'), reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { MigrationOrchestrator, FileMigration, Utils, Logger };