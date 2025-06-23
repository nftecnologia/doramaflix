/**
 * User Service
 * Handles user profile management, preferences, and activity tracking
 */

import { PrismaClient } from '@prisma/client';
import { 
  UserProfile,
  UpdateUserProfileRequest,
  UserPreferences,
  UserStats,
  WatchProgress,
  WatchHistoryItem,
  UpdateProgressRequest,
  UserFavorite,
  UserReview,
  CreateReviewRequest,
  ServiceResult,
  NotFoundError,
  ConflictError,
  ValidationError
} from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { parsePaginationQuery, createPaginationMeta } from '@/shared/utils/response.utils';

const prisma = new PrismaClient();

export class UserService {
  // =============================================
  // USER PROFILE MANAGEMENT
  // =============================================

  async getUserProfile(userId: string): Promise<ServiceResult<UserProfile>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        throw new NotFoundError('User');
      }

      return {
        success: true,
        data: this.toUserProfile(user)
      };
    } catch (error) {
      logger.error('Failed to get user profile', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get user profile')
      };
    }
  }

  async updateUserProfile(userId: string, data: UpdateUserProfileRequest): Promise<ServiceResult<UserProfile>> {
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          avatarUrl: data.avatarUrl,
        }
      });

      logger.info('User profile updated', { userId });

      return {
        success: true,
        data: this.toUserProfile(user)
      };
    } catch (error) {
      logger.error('Failed to update user profile', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update user profile')
      };
    }
  }

  async deleteUserAccount(userId: string): Promise<ServiceResult<void>> {
    try {
      // In production, you might want to soft delete or anonymize data
      await prisma.user.delete({
        where: { id: userId }
      });

      logger.info('User account deleted', { userId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete user account', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete user account')
      };
    }
  }

  // =============================================
  // USER PREFERENCES
  // =============================================

  async getUserPreferences(userId: string): Promise<ServiceResult<UserPreferences>> {
    try {
      // For now, return default preferences. In production, store in separate table
      const defaultPreferences: UserPreferences = {
        language: 'en',
        theme: 'auto',
        autoplay: true,
        subtitles: false,
        quality: 'auto',
        volume: 100,
        notifications: {
          email: true,
          push: true,
          newContent: true,
          recommendations: true,
          marketing: false,
        },
      };

      return {
        success: true,
        data: defaultPreferences
      };
    } catch (error) {
      logger.error('Failed to get user preferences', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get user preferences')
      };
    }
  }

  async updateUserPreferences(userId: string, preferences: UserPreferences): Promise<ServiceResult<UserPreferences>> {
    try {
      // In production, store preferences in a separate table
      logger.info('User preferences updated', { userId, preferences });

      return {
        success: true,
        data: preferences
      };
    } catch (error) {
      logger.error('Failed to update user preferences', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update user preferences')
      };
    }
  }

  // =============================================
  // WATCH PROGRESS & HISTORY
  // =============================================

  async updateWatchProgress(userId: string, data: UpdateProgressRequest): Promise<ServiceResult<WatchProgress>> {
    try {
      const { episodeId, progressSeconds, completed } = data;

      // Check if episode exists
      const episode = await prisma.episode.findUnique({
        where: { id: episodeId },
        include: { course: true }
      });

      if (!episode) {
        throw new NotFoundError('Episode');
      }

      // Update or create progress record
      const progress = await prisma.userProgress.upsert({
        where: {
          userId_episodeId: {
            userId,
            episodeId
          }
        },
        update: {
          progressSeconds,
          completed: completed || false,
          completedAt: completed ? new Date() : null,
          lastWatchedAt: new Date(),
        },
        create: {
          userId,
          episodeId,
          progressSeconds,
          completed: completed || false,
          completedAt: completed ? new Date() : null,
          lastWatchedAt: new Date(),
        },
        include: {
          episode: {
            include: {
              course: true
            }
          }
        }
      });

      // Add to watch history
      await prisma.watchHistory.create({
        data: {
          userId,
          episodeId,
          watchDuration: progressSeconds,
          watchedAt: new Date(),
          deviceInfo: {}, // Add device info if available
        }
      });

      logger.info('Watch progress updated', { userId, episodeId, progressSeconds, completed });

      return {
        success: true,
        data: this.toWatchProgress(progress)
      };
    } catch (error) {
      logger.error('Failed to update watch progress', { error: error.message, userId, episodeId: data.episodeId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update watch progress')
      };
    }
  }

  async getUserProgress(userId: string, query: any): Promise<ServiceResult<{ items: WatchProgress[], meta: any }>> {
    try {
      const { page, limit, skip } = parsePaginationQuery(query);

      const [progress, total] = await Promise.all([
        prisma.userProgress.findMany({
          where: { userId },
          include: {
            episode: {
              include: {
                course: true
              }
            }
          },
          orderBy: { lastWatchedAt: 'desc' },
          take: limit,
          skip,
        }),
        prisma.userProgress.count({
          where: { userId }
        })
      ]);

      const paginationMeta = createPaginationMeta(page, limit, total);

      return {
        success: true,
        data: {
          items: progress.map(this.toWatchProgress),
          meta: paginationMeta
        }
      };
    } catch (error) {
      logger.error('Failed to get user progress', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get user progress')
      };
    }
  }

  async getWatchHistory(userId: string, query: any): Promise<ServiceResult<{ items: WatchHistoryItem[], meta: any }>> {
    try {
      const { page, limit, skip } = parsePaginationQuery(query);

      const [history, total] = await Promise.all([
        prisma.watchHistory.findMany({
          where: { userId },
          include: {
            episode: {
              include: {
                course: true
              }
            }
          },
          orderBy: { watchedAt: 'desc' },
          take: limit,
          skip,
        }),
        prisma.watchHistory.count({
          where: { userId }
        })
      ]);

      const paginationMeta = createPaginationMeta(page, limit, total);

      return {
        success: true,
        data: {
          items: history.map(this.toWatchHistoryItem),
          meta: paginationMeta
        }
      };
    } catch (error) {
      logger.error('Failed to get watch history', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get watch history')
      };
    }
  }

  async getContinueWatching(userId: string): Promise<ServiceResult<WatchProgress[]>> {
    try {
      const progress = await prisma.userProgress.findMany({
        where: {
          userId,
          completed: false,
          progressSeconds: { gt: 0 }
        },
        include: {
          episode: {
            include: {
              course: true
            }
          }
        },
        orderBy: { lastWatchedAt: 'desc' },
        take: 10,
      });

      return {
        success: true,
        data: progress.map(this.toWatchProgress)
      };
    } catch (error) {
      logger.error('Failed to get continue watching', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get continue watching')
      };
    }
  }

  // =============================================
  // USER FAVORITES
  // =============================================

  async addToFavorites(userId: string, courseId: string): Promise<ServiceResult<UserFavorite>> {
    try {
      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });

      if (!course) {
        throw new NotFoundError('Course');
      }

      // Check if already in favorites
      const existing = await prisma.userFavorite.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      });

      if (existing) {
        throw new ConflictError('Course already in favorites');
      }

      const favorite = await prisma.userFavorite.create({
        data: {
          userId,
          courseId
        },
        include: {
          course: {
            include: {
              categories: {
                include: {
                  category: true
                }
              },
              tags: {
                include: {
                  tag: true
                }
              }
            }
          }
        }
      });

      logger.info('Course added to favorites', { userId, courseId });

      return {
        success: true,
        data: this.toUserFavorite(favorite)
      };
    } catch (error) {
      logger.error('Failed to add to favorites', { error: error.message, userId, courseId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to add to favorites')
      };
    }
  }

  async removeFromFavorites(userId: string, courseId: string): Promise<ServiceResult<void>> {
    try {
      await prisma.userFavorite.delete({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      });

      logger.info('Course removed from favorites', { userId, courseId });

      return { success: true };
    } catch (error) {
      logger.error('Failed to remove from favorites', { error: error.message, userId, courseId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to remove from favorites')
      };
    }
  }

  async getUserFavorites(userId: string, query: any): Promise<ServiceResult<{ items: UserFavorite[], meta: any }>> {
    try {
      const { page, limit, skip } = parsePaginationQuery(query);

      const [favorites, total] = await Promise.all([
        prisma.userFavorite.findMany({
          where: { userId },
          include: {
            course: {
              include: {
                categories: {
                  include: {
                    category: true
                  }
                },
                tags: {
                  include: {
                    tag: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        prisma.userFavorite.count({
          where: { userId }
        })
      ]);

      const paginationMeta = createPaginationMeta(page, limit, total);

      return {
        success: true,
        data: {
          items: favorites.map(this.toUserFavorite),
          meta: paginationMeta
        }
      };
    } catch (error) {
      logger.error('Failed to get user favorites', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get user favorites')
      };
    }
  }

  // =============================================
  // USER REVIEWS
  // =============================================

  async createReview(userId: string, data: CreateReviewRequest): Promise<ServiceResult<UserReview>> {
    try {
      const { courseId, rating, reviewText } = data;

      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId }
      });

      if (!course) {
        throw new NotFoundError('Course');
      }

      // Check if user already reviewed this course
      const existing = await prisma.userReview.findUnique({
        where: {
          userId_courseId: {
            userId,
            courseId
          }
        }
      });

      if (existing) {
        throw new ConflictError('You have already reviewed this course');
      }

      const review = await prisma.userReview.create({
        data: {
          userId,
          courseId,
          rating,
          reviewText,
          isApproved: false, // Reviews need approval
        },
        include: {
          user: true,
          course: true
        }
      });

      logger.info('Review created', { userId, courseId, rating });

      return {
        success: true,
        data: this.toUserReview(review)
      };
    } catch (error) {
      logger.error('Failed to create review', { error: error.message, userId, courseId: data.courseId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create review')
      };
    }
  }

  async getUserReviews(userId: string, query: any): Promise<ServiceResult<{ items: UserReview[], meta: any }>> {
    try {
      const { page, limit, skip } = parsePaginationQuery(query);

      const [reviews, total] = await Promise.all([
        prisma.userReview.findMany({
          where: { userId },
          include: {
            user: true,
            course: true
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        prisma.userReview.count({
          where: { userId }
        })
      ]);

      const paginationMeta = createPaginationMeta(page, limit, total);

      return {
        success: true,
        data: {
          items: reviews.map(this.toUserReview),
          meta: paginationMeta
        }
      };
    } catch (error) {
      logger.error('Failed to get user reviews', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get user reviews')
      };
    }
  }

  // =============================================
  // USER STATISTICS
  // =============================================

  async getUserStats(userId: string): Promise<ServiceResult<UserStats>> {
    try {
      const [
        totalWatchTimeResult,
        completedCoursesCount,
        favoriteCount,
        user
      ] = await Promise.all([
        prisma.watchHistory.aggregate({
          where: { userId },
          _sum: { watchDuration: true }
        }),
        prisma.userProgress.count({
          where: { userId, completed: true }
        }),
        prisma.userFavorite.count({
          where: { userId }
        }),
        prisma.user.findUnique({
          where: { id: userId }
        })
      ]);

      const stats: UserStats = {
        totalWatchTime: totalWatchTimeResult._sum.watchDuration || 0,
        completedCourses: completedCoursesCount,
        favoriteCount,
        currentStreak: 0, // Calculate based on consecutive days of activity
        longestStreak: 0, // Calculate from historical data
        joinedAt: user?.createdAt.toISOString() || '',
      };

      return {
        success: true,
        data: stats
      };
    } catch (error) {
      logger.error('Failed to get user stats', { error: error.message, userId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get user stats')
      };
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private toUserProfile(user: any): UserProfile {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      role: user.role,
      status: user.status,
      emailVerified: user.emailVerified,
      lastLoginAt: user.lastLoginAt?.toISOString(),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private toWatchProgress(progress: any): WatchProgress {
    return {
      id: progress.id,
      userId: progress.userId,
      episodeId: progress.episodeId,
      progressSeconds: progress.progressSeconds,
      completed: progress.completed,
      completedAt: progress.completedAt?.toISOString(),
      lastWatchedAt: progress.lastWatchedAt.toISOString(),
      episode: {
        id: progress.episode.id,
        courseId: progress.episode.courseId,
        seasonId: progress.episode.seasonId,
        title: progress.episode.title,
        description: progress.episode.description,
        episodeNumber: progress.episode.episodeNumber,
        videoUrl: progress.episode.videoUrl,
        videoDuration: progress.episode.videoDuration,
        videoSize: progress.episode.videoSize,
        videoQuality: progress.episode.videoQuality,
        thumbnailUrl: progress.episode.thumbnailUrl,
        isFree: progress.episode.isFree,
        isActive: progress.episode.isActive,
        viewCount: progress.episode.viewCount,
        createdAt: progress.episode.createdAt.toISOString(),
        updatedAt: progress.episode.updatedAt.toISOString(),
      },
    };
  }

  private toWatchHistoryItem(history: any): WatchHistoryItem {
    return {
      id: history.id,
      userId: history.userId,
      episodeId: history.episodeId,
      watchedAt: history.watchedAt.toISOString(),
      watchDuration: history.watchDuration,
      episode: {
        id: history.episode.id,
        courseId: history.episode.courseId,
        seasonId: history.episode.seasonId,
        title: history.episode.title,
        description: history.episode.description,
        episodeNumber: history.episode.episodeNumber,
        videoUrl: history.episode.videoUrl,
        videoDuration: history.episode.videoDuration,
        videoSize: history.episode.videoSize,
        videoQuality: history.episode.videoQuality,
        thumbnailUrl: history.episode.thumbnailUrl,
        isFree: history.episode.isFree,
        isActive: history.episode.isActive,
        viewCount: history.episode.viewCount,
        createdAt: history.episode.createdAt.toISOString(),
        updatedAt: history.episode.updatedAt.toISOString(),
      },
      course: {
        id: history.episode.course.id,
        title: history.episode.course.title,
        slug: history.episode.course.slug,
        description: history.episode.course.description,
        shortDescription: history.episode.course.shortDescription,
        thumbnailUrl: history.episode.course.thumbnailUrl,
        bannerUrl: history.episode.course.bannerUrl,
        trailerUrl: history.episode.course.trailerUrl,
        contentType: history.episode.course.contentType,
        status: history.episode.course.status,
        isPremium: history.episode.course.isPremium,
        price: Number(history.episode.course.price),
        durationMinutes: history.episode.course.durationMinutes,
        rating: Number(history.episode.course.rating),
        totalViews: history.episode.course.totalViews,
        releaseDate: history.episode.course.releaseDate?.toISOString(),
        createdAt: history.episode.course.createdAt.toISOString(),
        updatedAt: history.episode.course.updatedAt.toISOString(),
        categories: [],
        tags: [],
      },
    };
  }

  private toUserFavorite(favorite: any): UserFavorite {
    return {
      userId: favorite.userId,
      courseId: favorite.courseId,
      createdAt: favorite.createdAt.toISOString(),
      course: {
        id: favorite.course.id,
        title: favorite.course.title,
        slug: favorite.course.slug,
        description: favorite.course.description,
        shortDescription: favorite.course.shortDescription,
        thumbnailUrl: favorite.course.thumbnailUrl,
        bannerUrl: favorite.course.bannerUrl,
        trailerUrl: favorite.course.trailerUrl,
        contentType: favorite.course.contentType,
        status: favorite.course.status,
        isPremium: favorite.course.isPremium,
        price: Number(favorite.course.price),
        durationMinutes: favorite.course.durationMinutes,
        rating: Number(favorite.course.rating),
        totalViews: favorite.course.totalViews,
        releaseDate: favorite.course.releaseDate?.toISOString(),
        createdAt: favorite.course.createdAt.toISOString(),
        updatedAt: favorite.course.updatedAt.toISOString(),
        categories: favorite.course.categories?.map((cc: any) => ({
          id: cc.category.id,
          name: cc.category.name,
          slug: cc.category.slug,
          description: cc.category.description,
          iconUrl: cc.category.iconUrl,
          color: cc.category.color,
          sortOrder: cc.category.sortOrder,
          isActive: cc.category.isActive,
          createdAt: cc.category.createdAt.toISOString(),
          updatedAt: cc.category.updatedAt.toISOString(),
        })) || [],
        tags: favorite.course.tags?.map((ct: any) => ({
          id: ct.tag.id,
          name: ct.tag.name,
          slug: ct.tag.slug,
          createdAt: ct.tag.createdAt.toISOString(),
        })) || [],
      },
    };
  }

  private toUserReview(review: any): UserReview {
    return {
      id: review.id,
      userId: review.userId,
      courseId: review.courseId,
      rating: review.rating,
      reviewText: review.reviewText,
      isApproved: review.isApproved,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
      user: this.toUserProfile(review.user),
      course: {
        id: review.course.id,
        title: review.course.title,
        slug: review.course.slug,
        description: review.course.description,
        shortDescription: review.course.shortDescription,
        thumbnailUrl: review.course.thumbnailUrl,
        bannerUrl: review.course.bannerUrl,
        trailerUrl: review.course.trailerUrl,
        contentType: review.course.contentType,
        status: review.course.status,
        isPremium: review.course.isPremium,
        price: Number(review.course.price),
        durationMinutes: review.course.durationMinutes,
        rating: Number(review.course.rating),
        totalViews: review.course.totalViews,
        releaseDate: review.course.releaseDate?.toISOString(),
        createdAt: review.course.createdAt.toISOString(),
        updatedAt: review.course.updatedAt.toISOString(),
        categories: [],
        tags: [],
      },
    };
  }
}