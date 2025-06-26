#!/usr/bin/env node

/**
 * ========================================
 * DORAMAFLIX - PRE-MIGRATION BACKUP SCRIPT
 * ========================================
 * 
 * Creates a complete backup of the database before running the migration.
 * This ensures we can rollback in case of issues.
 * 
 * Features:
 * - Full database schema and data backup
 * - Table-specific URL inventory
 * - Compressed backup files
 * - Verification of backup integrity
 * - Storage usage analysis
 * 
 * Usage: node pre-migration-backup.js [--output-dir ./backups]
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { createWriteStream, existsSync, mkdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { createGzip } from 'zlib';
import { pipeline } from 'stream/promises';

// Third-party imports
import { Command } from 'commander';
import chalk from 'chalk';
import { config as dotenvConfig } from 'dotenv';

// Database connection
import pg from 'pg';
const { Pool } = pg;

// Load environment
dotenvConfig();

const execAsync = promisify(exec);

class BackupManager {
  constructor(outputDir = './backups') {
    this.outputDir = outputDir;
    this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    this.backupPrefix = `doramaflix-pre-migration-${this.timestamp}`;
    
    this.db = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
    });

    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }
  }

  async createDatabaseBackup() {
    console.log(chalk.blue('📦 Creating database backup...'));
    
    const backupFile = join(this.outputDir, `${this.backupPrefix}-database.sql`);
    const compressedFile = `${backupFile}.gz`;
    
    try {
      // Extract connection details from DATABASE_URL
      const dbUrl = new URL(process.env.DATABASE_URL);
      const host = dbUrl.hostname;
      const port = dbUrl.port || 5432;
      const database = dbUrl.pathname.slice(1);
      const username = dbUrl.username;
      const password = dbUrl.password;

      // Set PGPASSWORD environment variable for pg_dump
      const env = { ...process.env, PGPASSWORD: password };

      // Create pg_dump command
      const dumpCommand = [
        'pg_dump',
        `--host=${host}`,
        `--port=${port}`,
        `--username=${username}`,
        `--dbname=${database}`,
        '--verbose',
        '--clean',
        '--if-exists',
        '--create',
        '--format=plain',
        '--encoding=UTF8',
        '--no-password'
      ].join(' ');

      console.log(chalk.gray(`Executing: ${dumpCommand}`));

      // Execute pg_dump and compress
      const { stdout, stderr } = await execAsync(dumpCommand, { env, maxBuffer: 1024 * 1024 * 100 });
      
      if (stderr && !stderr.includes('NOTICE')) {
        console.warn(chalk.yellow('pg_dump warnings:'), stderr);
      }

      // Write and compress the backup
      await pipeline(
        Buffer.from(stdout),
        createGzip(),
        createWriteStream(compressedFile)
      );

      const stats = statSync(compressedFile);
      console.log(chalk.green(`✅ Database backup created: ${compressedFile}`));
      console.log(chalk.gray(`   Size: ${this.formatBytes(stats.size)}`));

      return compressedFile;

    } catch (error) {
      console.error(chalk.red('❌ Database backup failed:'), error.message);
      throw error;
    }
  }

  async createUrlInventory() {
    console.log(chalk.blue('📋 Creating URL inventory...'));
    
    const inventoryFile = join(this.outputDir, `${this.backupPrefix}-url-inventory.json`);
    
    try {
      const inventory = {};
      
      // Query all tables with URL columns
      const urlQueries = [
        {
          table: 'courses',
          columns: ['id', 'title', 'thumbnail_url', 'banner_url', 'trailer_url'],
          query: 'SELECT id, title, thumbnail_url, banner_url, trailer_url FROM courses WHERE thumbnail_url IS NOT NULL OR banner_url IS NOT NULL OR trailer_url IS NOT NULL'
        },
        {
          table: 'episodes',
          columns: ['id', 'title', 'video_url', 'thumbnail_url'],
          query: 'SELECT id, title, video_url, thumbnail_url FROM episodes WHERE video_url IS NOT NULL OR thumbnail_url IS NOT NULL'
        },
        {
          table: 'seasons',
          columns: ['id', 'title', 'thumbnail_url'],
          query: 'SELECT id, title, thumbnail_url FROM seasons WHERE thumbnail_url IS NOT NULL'
        },
        {
          table: 'users',
          columns: ['id', 'email', 'avatar_url'],
          query: 'SELECT id, email, avatar_url FROM users WHERE avatar_url IS NOT NULL'
        },
        {
          table: 'categories',
          columns: ['id', 'name', 'icon_url'],
          query: 'SELECT id, name, icon_url FROM categories WHERE icon_url IS NOT NULL'
        },
        {
          table: 'file_uploads',
          columns: ['id', 'original_filename', 'file_path', 'file_type'],
          query: 'SELECT id, original_filename, file_path, file_type FROM file_uploads'
        }
      ];

      for (const queryInfo of urlQueries) {
        const result = await this.db.query(queryInfo.query);
        inventory[queryInfo.table] = {
          count: result.rows.length,
          columns: queryInfo.columns,
          data: result.rows
        };
        
        console.log(chalk.gray(`   ${queryInfo.table}: ${result.rows.length} records with URLs`));
      }

      // Add summary statistics
      inventory.summary = {
        timestamp: new Date().toISOString(),
        totalTables: Object.keys(inventory).length - 1,
        totalRecords: Object.values(inventory)
          .filter(item => item.count !== undefined)
          .reduce((sum, item) => sum + item.count, 0)
      };

      // Write inventory to file
      const fs = await import('fs');
      fs.writeFileSync(inventoryFile, JSON.stringify(inventory, null, 2));

      console.log(chalk.green(`✅ URL inventory created: ${inventoryFile}`));
      console.log(chalk.gray(`   Total records with URLs: ${inventory.summary.totalRecords}`));

      return inventoryFile;

    } catch (error) {
      console.error(chalk.red('❌ URL inventory failed:'), error.message);
      throw error;
    }
  }

  async analyzeStorageUsage() {
    console.log(chalk.blue('📊 Analyzing storage usage...'));
    
    const analysisFile = join(this.outputDir, `${this.backupPrefix}-storage-analysis.json`);
    
    try {
      const analysis = {
        timestamp: new Date().toISOString(),
        tables: {},
        summary: {}
      };

      // Analyze file uploads table
      const fileUploadsQuery = `
        SELECT 
          file_type,
          COUNT(*) as file_count,
          SUM(file_size) as total_size,
          AVG(file_size) as avg_size,
          MIN(file_size) as min_size,
          MAX(file_size) as max_size
        FROM file_uploads 
        GROUP BY file_type
        ORDER BY total_size DESC
      `;

      const fileUploadsResult = await this.db.query(fileUploadsQuery);
      analysis.tables.file_uploads = fileUploadsResult.rows;

      // Analyze episodes (video files)
      const episodesQuery = `
        SELECT 
          COUNT(*) as video_count,
          SUM(COALESCE(video_size, 0)) as total_video_size,
          AVG(COALESCE(video_size, 0)) as avg_video_size,
          COUNT(*) FILTER (WHERE video_url IS NOT NULL) as videos_with_url,
          COUNT(*) FILTER (WHERE thumbnail_url IS NOT NULL) as videos_with_thumbnail
        FROM episodes
      `;

      const episodesResult = await this.db.query(episodesQuery);
      analysis.tables.episodes = episodesResult.rows[0];

      // Analyze courses
      const coursesQuery = `
        SELECT 
          COUNT(*) as total_courses,
          COUNT(*) FILTER (WHERE thumbnail_url IS NOT NULL) as courses_with_thumbnail,
          COUNT(*) FILTER (WHERE banner_url IS NOT NULL) as courses_with_banner,
          COUNT(*) FILTER (WHERE trailer_url IS NOT NULL) as courses_with_trailer
        FROM courses
      `;

      const coursesResult = await this.db.query(coursesQuery);
      analysis.tables.courses = coursesResult.rows[0];

      // Calculate summary
      const totalFiles = analysis.tables.file_uploads.reduce((sum, row) => sum + parseInt(row.file_count), 0);
      const totalSize = analysis.tables.file_uploads.reduce((sum, row) => sum + parseInt(row.total_size || 0), 0);

      analysis.summary = {
        totalFiles,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        avgFileSize: totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0,
        videoFiles: analysis.tables.file_uploads.find(row => row.file_type === 'video')?.file_count || 0,
        imageFiles: analysis.tables.file_uploads.find(row => row.file_type === 'image')?.file_count || 0,
        totalEpisodes: analysis.tables.episodes.video_count,
        episodesWithVideos: analysis.tables.episodes.videos_with_url,
        totalCourses: analysis.tables.courses.total_courses
      };

      // Write analysis to file
      const fs = await import('fs');
      fs.writeFileSync(analysisFile, JSON.stringify(analysis, null, 2));

      console.log(chalk.green(`✅ Storage analysis created: ${analysisFile}`));
      console.log(chalk.gray(`   Total files: ${totalFiles}`));
      console.log(chalk.gray(`   Total size: ${this.formatBytes(totalSize)}`));

      return analysisFile;

    } catch (error) {
      console.error(chalk.red('❌ Storage analysis failed:'), error.message);
      throw error;
    }
  }

  async createMigrationChecklist() {
    console.log(chalk.blue('📝 Creating migration checklist...'));
    
    const checklistFile = join(this.outputDir, `${this.backupPrefix}-migration-checklist.md`);
    
    const checklist = `# 🚀 DoramaFlix Migration Checklist

## Pre-Migration Backup - ${new Date().toLocaleString()}

### ✅ Backup Files Created
- [ ] Database backup: \`${this.backupPrefix}-database.sql.gz\`
- [ ] URL inventory: \`${this.backupPrefix}-url-inventory.json\`
- [ ] Storage analysis: \`${this.backupPrefix}-storage-analysis.json\`
- [ ] Migration checklist: \`${this.backupPrefix}-migration-checklist.md\`

### ✅ Pre-Migration Verification
- [ ] All environment variables configured
- [ ] DigitalOcean Spaces access verified
- [ ] Database connection tested
- [ ] Backup files created and verified
- [ ] Storage space available in DO Spaces
- [ ] Team notified about migration window

### ✅ Migration Execution
- [ ] Run dry-run migration: \`npm run migrate:dry-run\`
- [ ] Review dry-run results
- [ ] Execute small test migration: \`node migrate-vercel-to-spaces.js --max-files 10\`
- [ ] Verify test results in DO Spaces
- [ ] Execute full migration: \`npm run migrate\`
- [ ] Monitor migration progress
- [ ] Verify final migration report

### ✅ Post-Migration Verification
- [ ] Verify file accessibility in DO Spaces
- [ ] Test application functionality
- [ ] Check database URL updates
- [ ] Verify file integrity (checksums)
- [ ] Performance testing
- [ ] User acceptance testing

### ✅ Cleanup (After Verification)
- [ ] Remove files from Vercel Blob (if needed)
- [ ] Update DNS/CDN settings
- [ ] Update deployment configurations
- [ ] Archive migration logs
- [ ] Document lessons learned

### 🚨 Rollback Plan (If Needed)
1. Restore database from backup: \`${this.backupPrefix}-database.sql.gz\`
2. Update application configuration to use Vercel Blob
3. Verify application functionality
4. Communicate rollback to team

### 📞 Emergency Contacts
- **DevOps Team**: devops@doramaflix.com
- **Database Admin**: dba@doramaflix.com
- **Project Manager**: pm@doramaflix.com

### 📊 Expected Migration Stats
- **Estimated Duration**: 2-6 hours (depending on file count and size)
- **Expected Downtime**: Minimal (read-only during migration)
- **Backup Size**: Check actual backup file size
- **Success Rate Target**: >99%

---
**Generated on**: ${new Date().toISOString()}
**Migration Script Version**: 1.0.0
`;

    const fs = await import('fs');
    fs.writeFileSync(checklistFile, checklist);

    console.log(chalk.green(`✅ Migration checklist created: ${checklistFile}`));
    return checklistFile;
  }

  async verifyBackups(backupFiles) {
    console.log(chalk.blue('🔍 Verifying backup integrity...'));
    
    try {
      for (const file of backupFiles) {
        if (existsSync(file)) {
          const stats = statSync(file);
          if (stats.size > 0) {
            console.log(chalk.green(`✅ ${file} - ${this.formatBytes(stats.size)}`));
          } else {
            throw new Error(`Backup file is empty: ${file}`);
          }
        } else {
          throw new Error(`Backup file not found: ${file}`);
        }
      }

      console.log(chalk.green('✅ All backup files verified'));
      return true;

    } catch (error) {
      console.error(chalk.red('❌ Backup verification failed:'), error.message);
      return false;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async cleanup() {
    await this.db.end();
  }
}

async function main() {
  const program = new Command();
  
  program
    .name('pre-migration-backup')
    .description('Create comprehensive backup before migration')
    .version('1.0.0')
    .option('--output-dir <dir>', 'Output directory for backup files', './backups')
    .parse();

  const options = program.opts();

  console.log(chalk.bold.blue('🛡️  DoramaFlix Pre-Migration Backup\n'));

  try {
    const backup = new BackupManager(options.outputDir);
    const backupFiles = [];

    // Create all backups
    console.log(chalk.yellow('Starting backup process...\n'));

    const dbBackup = await backup.createDatabaseBackup();
    backupFiles.push(dbBackup);

    const urlInventory = await backup.createUrlInventory();
    backupFiles.push(urlInventory);

    const storageAnalysis = await backup.analyzeStorageUsage();
    backupFiles.push(storageAnalysis);

    const checklist = await backup.createMigrationChecklist();
    backupFiles.push(checklist);

    // Verify all backups
    console.log();
    const verified = await backup.verifyBackups(backupFiles);

    if (verified) {
      console.log('\n' + chalk.bold.green('🎉 Backup process completed successfully!'));
      console.log(chalk.yellow('📁 Backup files location:'), options.outputDir);
      console.log(chalk.yellow('📋 Next step:'), 'Review the migration checklist');
      console.log(chalk.gray('💡 Run the migration with:'), 'npm run migrate:dry-run');
    } else {
      throw new Error('Backup verification failed');
    }

    await backup.cleanup();

  } catch (error) {
    console.error(chalk.red('\n💥 Backup process failed:'), error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { BackupManager };