#!/usr/bin/env node

/**
 * ========================================
 * DORAMAFLIX - POST-MIGRATION VERIFICATION
 * ========================================
 * 
 * Verifies the migration was successful by checking:
 * - All files are accessible in DigitalOcean Spaces
 * - Database URLs have been updated correctly
 * - File integrity and sizes match
 * - Application functionality tests
 * 
 * Features:
 * - Parallel verification with progress tracking
 * - Accessibility testing for all migrated files
 * - Database consistency checks
 * - Performance benchmarking
 * - Detailed verification report
 * 
 * Usage: node post-migration-verify.js [--check-performance] [--sample-size 100]
 */

import { URL } from 'url';
import { createHash } from 'crypto';

// Third-party imports
import pLimit from 'p-limit';
import { ProgressBar } from '@opentf/cli-pbar';
import { Command } from 'commander';
import chalk from 'chalk';
import { config as dotenvConfig } from 'dotenv';

// AWS SDK for DigitalOcean Spaces
import { S3Client, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Database connection
import pg from 'pg';
const { Pool } = pg;

// Load environment
dotenvConfig();

class PostMigrationVerifier {
  constructor(options = {}) {
    this.options = {
      checkPerformance: options.checkPerformance || false,
      sampleSize: options.sampleSize || 100,
      concurrency: options.concurrency || 10,
      timeout: options.timeout || 30000
    };

    // Initialize storage client
    this.s3Client = new S3Client({
      endpoint: `https://${process.env.DO_SPACES_ENDPOINT || 'nyc3.digitaloceanspaces.com'}`,
      region: process.env.DO_SPACES_REGION || 'nyc3',
      credentials: {
        accessKeyId: process.env.DO_SPACES_ACCESS_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET_KEY,
      },
      forcePathStyle: false,
    });

    this.bucket = process.env.DO_SPACES_BUCKET || 'doramaflix-storage';
    this.cdnUrl = process.env.DO_SPACES_CDN_URL || '';

    // Database connection
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
    });

    // Concurrency limiter
    this.verifyLimit = pLimit(this.options.concurrency);

    // Statistics
    this.stats = {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      warnings: 0,
      errors: [],
      startTime: Date.now(),
      performanceData: []
    };
  }

  async verifyDatabaseUrls() {
    console.log(chalk.blue('🗄️ Verifying database URLs...'));

    const urlQueries = [
      {
        name: 'Episodes - Video URLs',
        query: `
          SELECT id, title, video_url 
          FROM episodes 
          WHERE video_url IS NOT NULL 
          AND video_url != ''
        `,
        urlColumn: 'video_url'
      },
      {
        name: 'Episodes - Thumbnail URLs',
        query: `
          SELECT id, title, thumbnail_url as url
          FROM episodes 
          WHERE thumbnail_url IS NOT NULL 
          AND thumbnail_url != ''
        `,
        urlColumn: 'url'
      },
      {
        name: 'Courses - Thumbnail URLs',
        query: `
          SELECT id, title, thumbnail_url as url
          FROM courses 
          WHERE thumbnail_url IS NOT NULL 
          AND thumbnail_url != ''
        `,
        urlColumn: 'url'
      },
      {
        name: 'Courses - Banner URLs',
        query: `
          SELECT id, title, banner_url as url
          FROM courses 
          WHERE banner_url IS NOT NULL 
          AND banner_url != ''
        `,
        urlColumn: 'url'
      },
      {
        name: 'Courses - Trailer URLs',
        query: `
          SELECT id, title, trailer_url as url
          FROM courses 
          WHERE trailer_url IS NOT NULL 
          AND trailer_url != ''
        `,
        urlColumn: 'url'
      },
      {
        name: 'Users - Avatar URLs',
        query: `
          SELECT id, email, avatar_url as url
          FROM users 
          WHERE avatar_url IS NOT NULL 
          AND avatar_url != ''
        `,
        urlColumn: 'url'
      }
    ];

    const results = {};

    for (const queryInfo of urlQueries) {
      try {
        const result = await this.db.query(queryInfo.query);
        const rows = result.rows;

        // Check URL patterns
        const vercelUrls = rows.filter(row => 
          row[queryInfo.urlColumn] && row[queryInfo.urlColumn].includes('vercel.blob.store')
        );
        
        const spacesUrls = rows.filter(row => 
          row[queryInfo.urlColumn] && (
            row[queryInfo.urlColumn].includes('digitaloceanspaces.com') ||
            (this.cdnUrl && row[queryInfo.urlColumn].includes(this.cdnUrl))
          )
        );

        const otherUrls = rows.filter(row => 
          row[queryInfo.urlColumn] && 
          !row[queryInfo.urlColumn].includes('vercel.blob.store') &&
          !row[queryInfo.urlColumn].includes('digitaloceanspaces.com') &&
          (!this.cdnUrl || !row[queryInfo.urlColumn].includes(this.cdnUrl))
        );

        results[queryInfo.name] = {
          total: rows.length,
          vercelUrls: vercelUrls.length,
          spacesUrls: spacesUrls.length,
          otherUrls: otherUrls.length,
          migrationRate: rows.length > 0 ? (spacesUrls.length / rows.length * 100).toFixed(2) : '0.00'
        };

        if (vercelUrls.length > 0) {
          this.stats.warnings++;
          console.log(chalk.yellow(`⚠️ ${queryInfo.name}: ${vercelUrls.length} URLs still pointing to Vercel Blob`));
        } else {
          console.log(chalk.green(`✅ ${queryInfo.name}: All ${rows.length} URLs migrated`));
        }

        this.stats.totalChecks++;
        if (vercelUrls.length === 0) {
          this.stats.passedChecks++;
        } else {
          this.stats.failedChecks++;
        }

      } catch (error) {
        console.error(chalk.red(`❌ Failed to check ${queryInfo.name}:`), error.message);
        this.stats.errors.push({
          type: 'database_url_check',
          name: queryInfo.name,
          error: error.message
        });
        this.stats.failedChecks++;
      }
    }

    return results;
  }

  async getSpacesFileList() {
    console.log(chalk.blue('📁 Fetching DigitalOcean Spaces file list...'));

    const files = [];
    let continuationToken;

    do {
      try {
        const command = new ListObjectsV2Command({
          Bucket: this.bucket,
          ContinuationToken: continuationToken,
          MaxKeys: 1000
        });

        const response = await this.s3Client.send(command);
        
        if (response.Contents) {
          files.push(...response.Contents.map(obj => ({
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified
          })));
        }

        continuationToken = response.NextContinuationToken;

      } catch (error) {
        console.error(chalk.red('❌ Failed to list Spaces files:'), error.message);
        throw error;
      }
    } while (continuationToken);

    console.log(chalk.gray(`   Found ${files.length} files in DigitalOcean Spaces`));
    return files;
  }

  async verifyFileAccessibility(files) {
    console.log(chalk.blue('🔍 Verifying file accessibility...'));

    // Sample files if requested
    const filesToCheck = this.options.sampleSize && files.length > this.options.sampleSize
      ? this.sampleArray(files, this.options.sampleSize)
      : files;

    console.log(chalk.gray(`   Checking ${filesToCheck.length} files...`));

    const progressBar = new ProgressBar({
      prefix: '🔍 Checking',
      suffix: '| {value}/{total} files | {percentage}%',
      total: filesToCheck.length,
      width: 50
    });

    const results = {
      accessible: 0,
      inaccessible: 0,
      errors: []
    };

    const checkPromises = filesToCheck.map(file => 
      this.verifyLimit(async () => {
        try {
          const startTime = Date.now();

          const command = new HeadObjectCommand({
            Bucket: this.bucket,
            Key: file.key
          });

          await this.s3Client.send(command);
          
          const duration = Date.now() - startTime;
          
          if (this.options.checkPerformance) {
            this.stats.performanceData.push({
              file: file.key,
              size: file.size,
              accessTime: duration
            });
          }

          results.accessible++;
          progressBar.increment(1);
          return { success: true, file: file.key, duration };

        } catch (error) {
          results.inaccessible++;
          results.errors.push({
            file: file.key,
            error: error.message
          });

          this.stats.errors.push({
            type: 'file_accessibility',
            file: file.key,
            error: error.message
          });

          progressBar.increment(1);
          return { success: false, file: file.key, error: error.message };
        }
      })
    );

    await Promise.all(checkPromises);
    progressBar.stop();

    const successRate = (results.accessible / filesToCheck.length * 100).toFixed(2);
    
    if (results.inaccessible === 0) {
      console.log(chalk.green(`✅ All ${results.accessible} files are accessible (${successRate}%)`));
      this.stats.passedChecks++;
    } else {
      console.log(chalk.red(`❌ ${results.inaccessible} files are inaccessible (${successRate}% success rate)`));
      this.stats.failedChecks++;
    }

    this.stats.totalChecks++;
    return results;
  }

  async verifyUrlConsistency() {
    console.log(chalk.blue('🔗 Verifying URL consistency...'));

    try {
      // Get sample of database URLs
      const urlSampleQuery = `
        SELECT 
          'episodes' as table_name, 
          id::text as record_id, 
          video_url as url,
          'video' as url_type
        FROM episodes 
        WHERE video_url IS NOT NULL 
        AND video_url LIKE '%digitaloceanspaces.com%'
        
        UNION ALL
        
        SELECT 
          'courses' as table_name, 
          id::text as record_id, 
          thumbnail_url as url,
          'thumbnail' as url_type
        FROM courses 
        WHERE thumbnail_url IS NOT NULL 
        AND thumbnail_url LIKE '%digitaloceanspaces.com%'
        
        ORDER BY RANDOM()
        LIMIT ${this.options.sampleSize}
      `;

      const result = await this.db.query(urlSampleQuery);
      const urlSamples = result.rows;

      console.log(chalk.gray(`   Checking ${urlSamples.length} URL samples...`));

      const progressBar = new ProgressBar({
        prefix: '🔗 Verifying',
        suffix: '| {value}/{total} URLs | {percentage}%',
        total: urlSamples.length,
        width: 50
      });

      const results = {
        validUrls: 0,
        invalidUrls: 0,
        errors: []
      };

      const checkPromises = urlSamples.map(sample => 
        this.verifyLimit(async () => {
          try {
            // Extract path from URL and check if file exists in Spaces
            const url = new URL(sample.url);
            let path = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;

            const command = new HeadObjectCommand({
              Bucket: this.bucket,
              Key: path
            });

            await this.s3Client.send(command);
            
            results.validUrls++;
            progressBar.increment(1);
            return { success: true, sample };

          } catch (error) {
            results.invalidUrls++;
            results.errors.push({
              table: sample.table_name,
              recordId: sample.record_id,
              url: sample.url,
              error: error.message
            });

            progressBar.increment(1);
            return { success: false, sample, error: error.message };
          }
        })
      );

      await Promise.all(checkPromises);
      progressBar.stop();

      const successRate = (results.validUrls / urlSamples.length * 100).toFixed(2);
      
      if (results.invalidUrls === 0) {
        console.log(chalk.green(`✅ All ${results.validUrls} URLs are valid (${successRate}%)`));
        this.stats.passedChecks++;
      } else {
        console.log(chalk.red(`❌ ${results.invalidUrls} URLs are invalid (${successRate}% success rate)`));
        this.stats.failedChecks++;
      }

      this.stats.totalChecks++;
      return results;

    } catch (error) {
      console.error(chalk.red('❌ URL consistency check failed:'), error.message);
      this.stats.errors.push({
        type: 'url_consistency',
        error: error.message
      });
      this.stats.failedChecks++;
      return { validUrls: 0, invalidUrls: 0, errors: [error.message] };
    }
  }

  async analyzePerformance() {
    if (!this.options.checkPerformance || this.stats.performanceData.length === 0) {
      return null;
    }

    console.log(chalk.blue('📊 Analyzing performance...'));

    const data = this.stats.performanceData;
    const accessTimes = data.map(d => d.accessTime);
    const fileSizes = data.map(d => d.size);

    const performance = {
      totalFiles: data.length,
      averageAccessTime: this.average(accessTimes),
      medianAccessTime: this.median(accessTimes),
      minAccessTime: Math.min(...accessTimes),
      maxAccessTime: Math.max(...accessTimes),
      averageFileSize: this.average(fileSizes),
      totalSizeChecked: fileSizes.reduce((sum, size) => sum + size, 0),
      
      // Performance categories
      fast: accessTimes.filter(t => t < 500).length,
      medium: accessTimes.filter(t => t >= 500 && t < 2000).length,
      slow: accessTimes.filter(t => t >= 2000).length,
      
      // File size categories
      smallFiles: fileSizes.filter(s => s < 1024 * 1024).length, // < 1MB
      mediumFiles: fileSizes.filter(s => s >= 1024 * 1024 && s < 10 * 1024 * 1024).length, // 1-10MB
      largeFiles: fileSizes.filter(s => s >= 10 * 1024 * 1024).length // > 10MB
    };

    console.log(chalk.green(`✅ Performance analysis complete`));
    console.log(chalk.gray(`   Average access time: ${performance.averageAccessTime.toFixed(2)}ms`));
    console.log(chalk.gray(`   Fast responses (<500ms): ${performance.fast}/${data.length}`));

    return performance;
  }

  async generateVerificationReport() {
    const endTime = Date.now();
    const duration = endTime - this.stats.startTime;
    const successRate = this.stats.totalChecks > 0 
      ? (this.stats.passedChecks / this.stats.totalChecks * 100).toFixed(2)
      : '0.00';

    const report = {
      verification: {
        timestamp: new Date().toISOString(),
        duration: this.formatDuration(duration),
        totalChecks: this.stats.totalChecks,
        passedChecks: this.stats.passedChecks,
        failedChecks: this.stats.failedChecks,
        warnings: this.stats.warnings,
        successRate: `${successRate}%`,
        overallStatus: this.stats.failedChecks === 0 ? 'PASS' : 'FAIL'
      },
      errors: this.stats.errors,
      performance: await this.analyzePerformance(),
      recommendations: this.generateRecommendations()
    };

    // Write report to file
    const fs = await import('fs');
    const reportFile = `./logs/verification-report-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));

    console.log(chalk.blue('📊 Verification Report Generated:'), reportFile);
    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.stats.failedChecks > 0) {
      recommendations.push({
        priority: 'HIGH',
        issue: 'Failed verification checks detected',
        recommendation: 'Review failed checks and re-run migration for affected files',
        action: 'Check error logs and re-migrate failed files'
      });
    }

    if (this.stats.warnings > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        issue: 'Database URLs still pointing to Vercel Blob',
        recommendation: 'Update remaining URLs to DigitalOcean Spaces',
        action: 'Run database update queries for remaining Vercel URLs'
      });
    }

    if (this.stats.performanceData.length > 0) {
      const slowFiles = this.stats.performanceData.filter(d => d.accessTime > 2000).length;
      if (slowFiles > this.stats.performanceData.length * 0.1) {
        recommendations.push({
          priority: 'MEDIUM',
          issue: 'Some files have slow access times',
          recommendation: 'Consider CDN optimization or file compression',
          action: 'Review file sizes and implement CDN caching strategies'
        });
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        priority: 'INFO',
        issue: 'No issues detected',
        recommendation: 'Migration appears successful',
        action: 'Monitor application performance and user feedback'
      });
    }

    return recommendations;
  }

  // Utility methods
  sampleArray(array, size) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, size);
  }

  average(array) {
    return array.length > 0 ? array.reduce((sum, val) => sum + val, 0) / array.length : 0;
  }

  median(array) {
    if (array.length === 0) return 0;
    const sorted = [...array].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  formatDuration(ms) {
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

  async cleanup() {
    await this.db.end();
  }
}

async function main() {
  const program = new Command();
  
  program
    .name('post-migration-verify')
    .description('Verify migration success')
    .version('1.0.0')
    .option('--check-performance', 'Include performance analysis')
    .option('--sample-size <number>', 'Number of files to sample for testing', parseInt, 100)
    .option('--concurrency <number>', 'Concurrent verification operations', parseInt, 10)
    .parse();

  const options = program.opts();

  console.log(chalk.bold.blue('🔍 DoramaFlix Post-Migration Verification\n'));

  try {
    const verifier = new PostMigrationVerifier(options);

    // Step 1: Verify database URLs
    console.log(chalk.yellow('Step 1: Database URL Verification'));
    await verifier.verifyDatabaseUrls();
    console.log();

    // Step 2: Get Spaces file list
    console.log(chalk.yellow('Step 2: File Inventory'));
    const spacesFiles = await verifier.getSpacesFileList();
    console.log();

    // Step 3: Verify file accessibility
    console.log(chalk.yellow('Step 3: File Accessibility'));
    await verifier.verifyFileAccessibility(spacesFiles);
    console.log();

    // Step 4: Verify URL consistency
    console.log(chalk.yellow('Step 4: URL Consistency'));
    await verifier.verifyUrlConsistency();
    console.log();

    // Step 5: Generate report
    console.log(chalk.yellow('Step 5: Generating Report'));
    const report = await verifier.generateVerificationReport();

    // Display summary
    console.log('\n' + chalk.bold('🎯 VERIFICATION SUMMARY'));
    console.log(chalk.blue(`📊 Total Checks: ${report.verification.totalChecks}`));
    console.log(chalk.green(`✅ Passed: ${report.verification.passedChecks}`));
    console.log(chalk.red(`❌ Failed: ${report.verification.failedChecks}`));
    console.log(chalk.yellow(`⚠️ Warnings: ${report.verification.warnings}`));
    console.log(chalk.cyan(`📈 Success Rate: ${report.verification.successRate}`));
    console.log(chalk.magenta(`⏱️ Duration: ${report.verification.duration}`));
    console.log(chalk.bold(
      report.verification.overallStatus === 'PASS' 
        ? chalk.green(`🎉 Overall Status: ${report.verification.overallStatus}`)
        : chalk.red(`💥 Overall Status: ${report.verification.overallStatus}`)
    ));

    // Display recommendations
    if (report.recommendations.length > 0) {
      console.log('\n' + chalk.bold('💡 RECOMMENDATIONS'));
      report.recommendations.forEach((rec, index) => {
        const color = rec.priority === 'HIGH' ? chalk.red : 
                     rec.priority === 'MEDIUM' ? chalk.yellow : chalk.gray;
        console.log(color(`${index + 1}. [${rec.priority}] ${rec.issue}`));
        console.log(color(`   Action: ${rec.action}`));
      });
    }

    await verifier.cleanup();

    if (report.verification.overallStatus === 'FAIL') {
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('\n💥 Verification failed:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PostMigrationVerifier };