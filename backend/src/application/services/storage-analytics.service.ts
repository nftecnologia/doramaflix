/**
 * Storage Analytics Service
 * Monitors storage usage, costs, and provides insights for optimization
 */

import { VercelBlobStorage } from '@/infrastructure/storage/vercel-blob-storage';
import { RedisConnection } from '@/infrastructure/cache/redis-connection';
import { logger } from '@/shared/utils/logger';
import { ValidationAppError } from '@/application/middlewares/error-handler';
import { config } from '@/shared/config/environment';

export interface StorageAnalytics {
  totalStorage: {
    size: number;
    files: number;
    cost: number;
  };
  breakdown: {
    videos: StorageBreakdown;
    images: StorageBreakdown;
    subtitles: StorageBreakdown;
    hls: StorageBreakdown;
    dash: StorageBreakdown;
    thumbnails: StorageBreakdown;
  };
  trends: {
    daily: StorageTrend[];
    weekly: StorageTrend[];
    monthly: StorageTrend[];
  };
  topConsumers: {
    users: UserStorageUsage[];
    videos: VideoStorageUsage[];
  };
  optimization: {
    duplicateFiles: DuplicateFile[];
    largeFiles: LargeFile[];
    unusedFiles: UnusedFile[];
    recommendations: OptimizationRecommendation[];
  };
  bandwidth: {
    total: number;
    cost: number;
    breakdown: BandwidthBreakdown;
  };
}

export interface StorageBreakdown {
  count: number;
  totalSize: number;
  averageSize: number;
  cost: number;
  growthRate: number; // percentage growth over last period
}

export interface StorageTrend {
  date: string;
  size: number;
  files: number;
  cost: number;
  bandwidth: number;
}

export interface UserStorageUsage {
  userId: string;
  username: string;
  totalSize: number;
  fileCount: number;
  cost: number;
  lastActivity: Date;
}

export interface VideoStorageUsage {
  videoId: string;
  title: string;
  totalSize: number; // includes all qualities + HLS/DASH
  originalSize: number;
  encodedSizes: { [quality: string]: number };
  streamingSizes: {
    hls?: number;
    dash?: number;
  };
  views: number;
  costPerView: number;
}

export interface DuplicateFile {
  hash: string;
  files: {
    url: string;
    size: number;
    uploadedAt: Date;
    uploadedBy: string;
  }[];
  potentialSavings: number;
}

export interface LargeFile {
  url: string;
  size: number;
  type: string;
  uploadedAt: Date;
  uploadedBy: string;
  compressionPotential: number;
}

export interface UnusedFile {
  url: string;
  size: number;
  type: string;
  uploadedAt: Date;
  lastAccessed?: Date;
  daysSinceLastAccess: number;
}

export interface OptimizationRecommendation {
  type: 'compression' | 'deletion' | 'archival' | 'cdn_optimization';
  title: string;
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  actions: string[];
}

export interface BandwidthBreakdown {
  video: number;
  image: number;
  subtitle: number;
  api: number;
}

export interface CostBreakdown {
  storage: {
    current: number;
    projected: number;
    currency: string;
  };
  bandwidth: {
    current: number;
    projected: number;
    currency: string;
  };
  processing: {
    current: number;
    projected: number;
    currency: string;
  };
  total: {
    current: number;
    projected: number;
    currency: string;
  };
}

export class StorageAnalyticsService {
  private storage: VercelBlobStorage;
  private redis: RedisConnection;
  private readonly analyticsPrefix = 'analytics:';
  private readonly cacheTTL = 3600; // 1 hour cache

  // Pricing constants (these would typically come from config or external API)
  private readonly pricing = {
    storage: {
      perGB: 0.15, // $0.15 per GB per month
      currency: 'USD',
    },
    bandwidth: {
      perGB: 0.12, // $0.12 per GB
      currency: 'USD',
    },
    processing: {
      perMinute: 0.05, // $0.05 per minute of video processed
      currency: 'USD',
    },
  };

  constructor() {
    this.storage = new VercelBlobStorage();
    this.redis = new RedisConnection();
  }

  /**
   * Get comprehensive storage analytics
   */
  async getStorageAnalytics(forceRefresh: boolean = false): Promise<StorageAnalytics> {
    const cacheKey = `${this.analyticsPrefix}full_analytics`;
    
    if (!forceRefresh) {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    }

    try {
      logger.info('Generating storage analytics');

      const [
        totalStorage,
        breakdown,
        trends,
        topConsumers,
        optimization,
        bandwidth,
      ] = await Promise.all([
        this.getTotalStorageStats(),
        this.getStorageBreakdown(),
        this.getStorageTrends(),
        this.getTopConsumers(),
        this.getOptimizationOpportunities(),
        this.getBandwidthStats(),
      ]);

      const analytics: StorageAnalytics = {
        totalStorage,
        breakdown,
        trends,
        topConsumers,
        optimization,
        bandwidth,
      };

      // Cache the results
      await this.redis.setex(cacheKey, this.cacheTTL, JSON.stringify(analytics));

      logger.info('Storage analytics generated', {
        totalSize: totalStorage.size,
        totalFiles: totalStorage.files,
        totalCost: totalStorage.cost,
      });

      return analytics;
    } catch (error) {
      logger.error('Failed to generate storage analytics', { error });
      throw new ValidationAppError('Failed to generate storage analytics');
    }
  }

  /**
   * Get detailed cost breakdown and projections
   */
  async getCostBreakdown(): Promise<CostBreakdown> {
    try {
      const analytics = await this.getStorageAnalytics();
      const trends = analytics.trends.monthly;
      
      // Calculate growth rate from trends
      const growthRate = this.calculateGrowthRate(trends);
      
      const currentStorage = analytics.totalStorage.size / (1024 ** 3); // Convert to GB
      const currentBandwidth = analytics.bandwidth.total / (1024 ** 3); // Convert to GB
      
      // Estimate processing costs based on video uploads
      const videoCount = analytics.breakdown.videos.count;
      const avgProcessingTime = 5; // Estimate 5 minutes per video
      const currentProcessing = videoCount * avgProcessingTime * this.pricing.processing.perMinute;

      // Project next month costs based on growth rate
      const projectedStorage = currentStorage * (1 + growthRate);
      const projectedBandwidth = currentBandwidth * (1 + growthRate);
      const projectedProcessing = currentProcessing * (1 + growthRate);

      return {
        storage: {
          current: currentStorage * this.pricing.storage.perGB,
          projected: projectedStorage * this.pricing.storage.perGB,
          currency: this.pricing.storage.currency,
        },
        bandwidth: {
          current: currentBandwidth * this.pricing.bandwidth.perGB,
          projected: projectedBandwidth * this.pricing.bandwidth.perGB,
          currency: this.pricing.bandwidth.currency,
        },
        processing: {
          current: currentProcessing,
          projected: projectedProcessing,
          currency: this.pricing.processing.currency,
        },
        total: {
          current: (currentStorage * this.pricing.storage.perGB) + 
                  (currentBandwidth * this.pricing.bandwidth.perGB) + 
                  currentProcessing,
          projected: (projectedStorage * this.pricing.storage.perGB) + 
                    (projectedBandwidth * this.pricing.bandwidth.perGB) + 
                    projectedProcessing,
          currency: 'USD',
        },
      };
    } catch (error) {
      logger.error('Failed to get cost breakdown', { error });
      throw error;
    }
  }

  /**
   * Track storage usage event
   */
  async trackStorageEvent(event: {
    type: 'upload' | 'delete' | 'access';
    fileType: string;
    size: number;
    userId: string;
    videoId?: string;
    url?: string;
  }): Promise<void> {
    try {
      const timestamp = new Date();
      const dayKey = timestamp.toISOString().split('T')[0];
      
      // Update daily stats
      await this.updateDailyStats(dayKey, event);
      
      // Update user stats
      await this.updateUserStats(event.userId, event);
      
      // Update video stats if applicable
      if (event.videoId) {
        await this.updateVideoStats(event.videoId, event);
      }

      // Track bandwidth for access events
      if (event.type === 'access') {
        await this.trackBandwidthUsage(event);
      }

      logger.debug('Storage event tracked', event);
    } catch (error) {
      logger.error('Failed to track storage event', { error, event });
      // Don't throw error here to avoid disrupting main operations
    }
  }

  /**
   * Generate optimization report
   */
  async generateOptimizationReport(): Promise<{
    summary: {
      potentialSavings: number;
      implementationEffort: string;
      recommendations: number;
    };
    recommendations: OptimizationRecommendation[];
  }> {
    try {
      const optimization = await this.getOptimizationOpportunities();
      
      const totalSavings = optimization.recommendations.reduce(
        (sum, rec) => sum + rec.potentialSavings, 0
      );
      
      const avgEffort = this.calculateAverageEffort(optimization.recommendations);
      
      return {
        summary: {
          potentialSavings: totalSavings,
          implementationEffort: avgEffort,
          recommendations: optimization.recommendations.length,
        },
        recommendations: optimization.recommendations.sort(
          (a, b) => b.potentialSavings - a.potentialSavings
        ),
      };
    } catch (error) {
      logger.error('Failed to generate optimization report', { error });
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async getTotalStorageStats(): Promise<{ size: number; files: number; cost: number }> {
    // This would typically query your storage provider's API
    // For now, we'll use aggregated data from our tracking
    const stats = await this.storage.getStorageStats();
    
    const sizeInGB = stats.totalSize / (1024 ** 3);
    const cost = sizeInGB * this.pricing.storage.perGB;
    
    return {
      size: stats.totalSize,
      files: stats.totalFiles,
      cost,
    };
  }

  private async getStorageBreakdown(): Promise<StorageAnalytics['breakdown']> {
    // Mock implementation - in reality, you'd aggregate from your file metadata
    return {
      videos: {
        count: 150,
        totalSize: 50 * 1024 ** 3, // 50GB
        averageSize: 333 * 1024 ** 2, // 333MB average
        cost: 7.5,
        growthRate: 0.15, // 15% growth
      },
      images: {
        count: 500,
        totalSize: 2 * 1024 ** 3, // 2GB
        averageSize: 4 * 1024 ** 2, // 4MB average
        cost: 0.3,
        growthRate: 0.08,
      },
      subtitles: {
        count: 200,
        totalSize: 50 * 1024 ** 2, // 50MB
        averageSize: 250 * 1024, // 250KB average
        cost: 0.01,
        growthRate: 0.12,
      },
      hls: {
        count: 150,
        totalSize: 75 * 1024 ** 3, // 75GB (1.5x original due to multiple qualities)
        averageSize: 500 * 1024 ** 2, // 500MB average
        cost: 11.25,
        growthRate: 0.18,
      },
      dash: {
        count: 50,
        totalSize: 25 * 1024 ** 3, // 25GB
        averageSize: 500 * 1024 ** 2, // 500MB average
        cost: 3.75,
        growthRate: 0.10,
      },
      thumbnails: {
        count: 900,
        totalSize: 500 * 1024 ** 2, // 500MB
        averageSize: 555 * 1024, // 555KB average
        cost: 0.075,
        growthRate: 0.15,
      },
    };
  }

  private async getStorageTrends(): Promise<StorageAnalytics['trends']> {
    const now = new Date();
    const trends = {
      daily: [] as StorageTrend[],
      weekly: [] as StorageTrend[],
      monthly: [] as StorageTrend[],
    };

    // Generate daily trends for last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dailyStats = await this.getDailyStats(dateStr);
      trends.daily.push({
        date: dateStr,
        size: dailyStats.totalSize,
        files: dailyStats.totalFiles,
        cost: dailyStats.totalCost,
        bandwidth: dailyStats.totalBandwidth,
      });
    }

    // Generate weekly trends for last 12 weeks
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (i * 7));
      const weekStats = await this.getWeeklyStats(weekStart);
      
      trends.weekly.push({
        date: weekStart.toISOString().split('T')[0],
        size: weekStats.totalSize,
        files: weekStats.totalFiles,
        cost: weekStats.totalCost,
        bandwidth: weekStats.totalBandwidth,
      });
    }

    // Generate monthly trends for last 12 months
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      const monthStats = await this.getMonthlyStats(monthStart);
      
      trends.monthly.push({
        date: monthStart.toISOString().split('T')[0],
        size: monthStats.totalSize,
        files: monthStats.totalFiles,
        cost: monthStats.totalCost,
        bandwidth: monthStats.totalBandwidth,
      });
    }

    return trends;
  }

  private async getTopConsumers(): Promise<StorageAnalytics['topConsumers']> {
    // Mock implementation - in reality, you'd query aggregated user and video stats
    return {
      users: [
        {
          userId: 'user_1',
          username: 'content_creator_1',
          totalSize: 10 * 1024 ** 3, // 10GB
          fileCount: 50,
          cost: 1.5,
          lastActivity: new Date(),
        },
        // Add more top users...
      ],
      videos: [
        {
          videoId: 'video_1',
          title: 'Popular Drama Episode 1',
          totalSize: 2 * 1024 ** 3, // 2GB total (all qualities + streaming)
          originalSize: 800 * 1024 ** 2, // 800MB original
          encodedSizes: {
            '360p': 200 * 1024 ** 2,
            '720p': 400 * 1024 ** 2,
            '1080p': 800 * 1024 ** 2,
          },
          streamingSizes: {
            hls: 600 * 1024 ** 2,
            dash: 200 * 1024 ** 2,
          },
          views: 10000,
          costPerView: 0.0002,
        },
        // Add more top videos...
      ],
    };
  }

  private async getOptimizationOpportunities(): Promise<StorageAnalytics['optimization']> {
    return {
      duplicateFiles: [
        // Mock duplicate files
      ],
      largeFiles: [
        // Mock large files
      ],
      unusedFiles: [
        // Mock unused files
      ],
      recommendations: [
        {
          type: 'compression',
          title: 'Optimize Video Encoding',
          description: 'Re-encode videos with improved compression settings',
          potentialSavings: 15000, // $150 per month
          effort: 'medium',
          impact: 'high',
          actions: [
            'Implement H.265 encoding for new uploads',
            'Re-encode top 20% most-viewed videos',
            'Use variable bitrate encoding',
          ],
        },
        {
          type: 'deletion',
          title: 'Remove Unused Files',
          description: 'Delete files that haven\'t been accessed in 90+ days',
          potentialSavings: 8000, // $80 per month
          effort: 'low',
          impact: 'medium',
          actions: [
            'Identify files with no access in 90 days',
            'Archive before deletion',
            'Implement automated cleanup policy',
          ],
        },
        {
          type: 'cdn_optimization',
          title: 'Optimize CDN Usage',
          description: 'Improve caching and reduce bandwidth costs',
          potentialSavings: 12000, // $120 per month
          effort: 'high',
          impact: 'high',
          actions: [
            'Implement intelligent caching strategies',
            'Use edge locations more effectively',
            'Optimize video delivery protocols',
          ],
        },
      ],
    };
  }

  private async getBandwidthStats(): Promise<StorageAnalytics['bandwidth']> {
    const totalBandwidth = 500 * 1024 ** 3; // 500GB per month
    const cost = (totalBandwidth / (1024 ** 3)) * this.pricing.bandwidth.perGB;
    
    return {
      total: totalBandwidth,
      cost,
      breakdown: {
        video: totalBandwidth * 0.8, // 80% video
        image: totalBandwidth * 0.15, // 15% images
        subtitle: totalBandwidth * 0.02, // 2% subtitles
        api: totalBandwidth * 0.03, // 3% API
      },
    };
  }

  private async updateDailyStats(day: string, event: any): Promise<void> {
    const key = `${this.analyticsPrefix}daily:${day}`;
    const field = `${event.type}_${event.fileType}`;
    
    await this.redis.hincrby(key, `${field}_count`, 1);
    await this.redis.hincrby(key, `${field}_size`, event.size);
    await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days TTL
  }

  private async updateUserStats(userId: string, event: any): Promise<void> {
    const key = `${this.analyticsPrefix}user:${userId}`;
    
    await this.redis.hincrby(key, 'total_uploads', event.type === 'upload' ? 1 : 0);
    await this.redis.hincrby(key, 'total_size', event.type === 'upload' ? event.size : 0);
    await this.redis.hset(key, 'last_activity', new Date().toISOString());
  }

  private async updateVideoStats(videoId: string, event: any): Promise<void> {
    const key = `${this.analyticsPrefix}video:${videoId}`;
    
    if (event.type === 'access') {
      await this.redis.hincrby(key, 'views', 1);
      await this.redis.hincrby(key, 'bandwidth', event.size);
    }
  }

  private async trackBandwidthUsage(event: any): Promise<void> {
    const dayKey = new Date().toISOString().split('T')[0];
    const key = `${this.analyticsPrefix}bandwidth:${dayKey}`;
    
    await this.redis.hincrby(key, event.fileType, event.size);
    await this.redis.expire(key, 30 * 24 * 60 * 60); // 30 days TTL
  }

  private async getDailyStats(date: string): Promise<any> {
    // Mock implementation
    return {
      totalSize: Math.random() * 1024 ** 3,
      totalFiles: Math.floor(Math.random() * 100),
      totalCost: Math.random() * 100,
      totalBandwidth: Math.random() * 10 * 1024 ** 3,
    };
  }

  private async getWeeklyStats(weekStart: Date): Promise<any> {
    // Aggregate daily stats for the week
    return {
      totalSize: Math.random() * 7 * 1024 ** 3,
      totalFiles: Math.floor(Math.random() * 700),
      totalCost: Math.random() * 700,
      totalBandwidth: Math.random() * 70 * 1024 ** 3,
    };
  }

  private async getMonthlyStats(monthStart: Date): Promise<any> {
    // Aggregate daily stats for the month
    return {
      totalSize: Math.random() * 30 * 1024 ** 3,
      totalFiles: Math.floor(Math.random() * 3000),
      totalCost: Math.random() * 3000,
      totalBandwidth: Math.random() * 300 * 1024 ** 3,
    };
  }

  private calculateGrowthRate(trends: StorageTrend[]): number {
    if (trends.length < 2) return 0;
    
    const latest = trends[trends.length - 1];
    const previous = trends[trends.length - 2];
    
    return (latest.size - previous.size) / previous.size;
  }

  private calculateAverageEffort(recommendations: OptimizationRecommendation[]): string {
    const effortValues = { low: 1, medium: 2, high: 3 };
    const avgValue = recommendations.reduce((sum, rec) => sum + effortValues[rec.effort], 0) / recommendations.length;
    
    if (avgValue <= 1.5) return 'low';
    if (avgValue <= 2.5) return 'medium';
    return 'high';
  }
}