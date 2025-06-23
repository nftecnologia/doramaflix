/**
 * Content Service
 * Handles CRUD operations for courses, seasons, and episodes
 */

import { PrismaClient } from '@prisma/client';
import { 
  ContentItem,
  CreateContentRequest,
  UpdateContentRequest,
  Season,
  Episode,
  CreateEpisodeRequest,
  ServiceResult,
  NotFoundError,
  ConflictError,
  ValidationError
} from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { parsePaginationQuery, createPaginationMeta, parseSortQuery } from '@/shared/utils/response.utils';
import { generateSlug } from '@/shared/validators/common.validators';

const prisma = new PrismaClient();

export class ContentService {
  // =============================================
  // CONTENT CRUD OPERATIONS
  // =============================================

  async createContent(data: CreateContentRequest, createdBy?: string): Promise<ServiceResult<ContentItem>> {
    try {
      const { title, categoryIds, tagNames, ...contentData } = data;

      // Generate slug from title
      const slug = generateSlug(title);

      // Check if slug already exists
      const existingContent = await prisma.course.findUnique({
        where: { slug }
      });

      if (existingContent) {
        throw new ConflictError(`Content with slug "${slug}" already exists`);
      }

      // Verify categories exist
      const categories = await prisma.category.findMany({
        where: { id: { in: categoryIds } }
      });

      if (categories.length !== categoryIds.length) {
        throw new ValidationError('One or more categories do not exist');
      }

      // Create or find tags
      const tags = await Promise.all(
        tagNames.map(async (name) => {
          const tagSlug = generateSlug(name);
          return prisma.tag.upsert({
            where: { slug: tagSlug },
            update: {},
            create: {
              name,
              slug: tagSlug,
            },
          });
        })
      );

      // Create content
      const content = await prisma.course.create({
        data: {
          title,
          slug,
          description: contentData.description,
          shortDescription: contentData.shortDescription,
          thumbnailUrl: contentData.thumbnailUrl,
          bannerUrl: contentData.bannerUrl,
          trailerUrl: contentData.trailerUrl,
          contentType: contentData.contentType,
          isPremium: contentData.isPremium || true,
          price: contentData.price || 0,
          releaseDate: contentData.releaseDate ? new Date(contentData.releaseDate) : null,
          createdBy,
          categories: {
            create: categoryIds.map(categoryId => ({
              categoryId,
            })),
          },
          tags: {
            create: tags.map(tag => ({
              tagId: tag.id,
            })),
          },
        },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          creator: true,
        },
      });

      logger.info('Content created', { contentId: content.id, title, createdBy });

      return {
        success: true,
        data: this.toContentItem(content),
      };
    } catch (error) {
      logger.error('Failed to create content', { error: error.message, title: data.title });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create content'),
      };
    }
  }

  async getContent(id: string, includeInactive = false): Promise<ServiceResult<ContentItem>> {
    try {
      const whereClause: any = { id };
      if (!includeInactive) {
        whereClause.status = { in: ['published', 'coming_soon'] };
      }

      const content = await prisma.course.findUnique({
        where: whereClause,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          seasons: {
            include: {
              episodes: true,
            },
            orderBy: { seasonNumber: 'asc' },
          },
          episodes: {
            where: { isActive: true },
            orderBy: { episodeNumber: 'asc' },
          },
          creator: true,
        },
      });

      if (!content) {
        throw new NotFoundError('Content');
      }

      // Increment view count
      await prisma.course.update({
        where: { id },
        data: {
          totalViews: {
            increment: 1,
          },
        },
      });

      return {
        success: true,
        data: this.toContentItem(content),
      };
    } catch (error) {
      logger.error('Failed to get content', { error: error.message, contentId: id });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get content'),
      };
    }
  }

  async getContentBySlug(slug: string, includeInactive = false): Promise<ServiceResult<ContentItem>> {
    try {
      const whereClause: any = { slug };
      if (!includeInactive) {
        whereClause.status = { in: ['published', 'coming_soon'] };
      }

      const content = await prisma.course.findUnique({
        where: whereClause,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          seasons: {
            include: {
              episodes: true,
            },
            orderBy: { seasonNumber: 'asc' },
          },
          episodes: {
            where: { isActive: true },
            orderBy: { episodeNumber: 'asc' },
          },
          creator: true,
        },
      });

      if (!content) {
        throw new NotFoundError('Content');
      }

      // Increment view count
      await prisma.course.update({
        where: { id: content.id },
        data: {
          totalViews: {
            increment: 1,
          },
        },
      });

      return {
        success: true,
        data: this.toContentItem(content),
      };
    } catch (error) {
      logger.error('Failed to get content by slug', { error: error.message, slug });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get content'),
      };
    }
  }

  async updateContent(id: string, data: UpdateContentRequest, updatedBy?: string): Promise<ServiceResult<ContentItem>> {
    try {
      // Check if content exists
      const existingContent = await prisma.course.findUnique({
        where: { id },
      });

      if (!existingContent) {
        throw new NotFoundError('Content');
      }

      // Update slug if title changed
      let slug = existingContent.slug;
      if (data.title && data.title !== existingContent.title) {
        slug = generateSlug(data.title);
        
        // Check if new slug already exists
        const slugExists = await prisma.course.findFirst({
          where: { slug, id: { not: id } },
        });

        if (slugExists) {
          throw new ConflictError(`Content with slug "${slug}" already exists`);
        }
      }

      // Prepare update data
      const updateData: any = {
        ...data,
        slug,
        releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined,
      };

      // Remove relationships from update data
      const { categoryIds, tagNames, ...coreUpdateData } = updateData;

      // Update content
      const content = await prisma.course.update({
        where: { id },
        data: coreUpdateData,
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          creator: true,
        },
      });

      // Update categories if provided
      if (categoryIds) {
        await prisma.courseCategory.deleteMany({
          where: { courseId: id },
        });

        await prisma.courseCategory.createMany({
          data: categoryIds.map((categoryId: string) => ({
            courseId: id,
            categoryId,
          })),
        });
      }

      // Update tags if provided
      if (tagNames) {
        await prisma.courseTag.deleteMany({
          where: { courseId: id },
        });

        const tags = await Promise.all(
          tagNames.map(async (name: string) => {
            const tagSlug = generateSlug(name);
            return prisma.tag.upsert({
              where: { slug: tagSlug },
              update: {},
              create: {
                name,
                slug: tagSlug,
              },
            });
          })
        );

        await prisma.courseTag.createMany({
          data: tags.map(tag => ({
            courseId: id,
            tagId: tag.id,
          })),
        });
      }

      // Fetch updated content with relations
      const updatedContent = await prisma.course.findUnique({
        where: { id },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          creator: true,
        },
      });

      logger.info('Content updated', { contentId: id, updatedBy });

      return {
        success: true,
        data: this.toContentItem(updatedContent!),
      };
    } catch (error) {
      logger.error('Failed to update content', { error: error.message, contentId: id });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update content'),
      };
    }
  }

  async deleteContent(id: string, deletedBy?: string): Promise<ServiceResult<void>> {
    try {
      // Check if content exists
      const content = await prisma.course.findUnique({
        where: { id },
      });

      if (!content) {
        throw new NotFoundError('Content');
      }

      // In production, you might want to soft delete or archive
      await prisma.course.delete({
        where: { id },
      });

      logger.info('Content deleted', { contentId: id, deletedBy });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete content', { error: error.message, contentId: id });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete content'),
      };
    }
  }

  async getAllContent(query: any, includeInactive = false): Promise<ServiceResult<{ items: ContentItem[], meta: any }>> {
    try {
      const { page, limit, skip } = parsePaginationQuery(query);
      const sortOrder = parseSortQuery(query, ['title', 'createdAt', 'totalViews', 'rating']);

      const whereClause: any = {};
      
      if (!includeInactive) {
        whereClause.status = { in: ['published', 'coming_soon'] };
      }

      if (query.type) {
        whereClause.contentType = query.type;
      }

      if (query.isPremium !== undefined) {
        whereClause.isPremium = query.isPremium === 'true';
      }

      const [content, total] = await Promise.all([
        prisma.course.findMany({
          where: whereClause,
          include: {
            categories: {
              include: {
                category: true,
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
            creator: true,
          },
          orderBy: sortOrder || { createdAt: 'desc' },
          take: limit,
          skip,
        }),
        prisma.course.count({
          where: whereClause,
        }),
      ]);

      const paginationMeta = createPaginationMeta(page, limit, total);

      return {
        success: true,
        data: {
          items: content.map(this.toContentItem),
          meta: paginationMeta,
        },
      };
    } catch (error) {
      logger.error('Failed to get all content', { error: error.message });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get all content'),
      };
    }
  }

  // =============================================
  // EPISODE OPERATIONS
  // =============================================

  async createEpisode(data: CreateEpisodeRequest, createdBy?: string): Promise<ServiceResult<Episode>> {
    try {
      const { courseId, seasonId, ...episodeData } = data;

      // Check if course exists
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });

      if (!course) {
        throw new NotFoundError('Course');
      }

      // Check if season exists (if seasonId provided)
      if (seasonId) {
        const season = await prisma.season.findUnique({
          where: { id: seasonId },
        });

        if (!season) {
          throw new NotFoundError('Season');
        }
      }

      // Check if episode number already exists in the course/season
      const existingEpisode = await prisma.episode.findFirst({
        where: {
          courseId,
          seasonId: seasonId || null,
          episodeNumber: episodeData.episodeNumber,
        },
      });

      if (existingEpisode) {
        throw new ConflictError(
          `Episode ${episodeData.episodeNumber} already exists in this ${seasonId ? 'season' : 'course'}`
        );
      }

      const episode = await prisma.episode.create({
        data: {
          ...episodeData,
          courseId,
          seasonId,
        },
        include: {
          course: true,
          season: true,
        },
      });

      logger.info('Episode created', { episodeId: episode.id, courseId, createdBy });

      return {
        success: true,
        data: this.toEpisode(episode),
      };
    } catch (error) {
      logger.error('Failed to create episode', { error: error.message, courseId: data.courseId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create episode'),
      };
    }
  }

  async getEpisode(id: string): Promise<ServiceResult<Episode>> {
    try {
      const episode = await prisma.episode.findUnique({
        where: { id },
        include: {
          course: true,
          season: true,
        },
      });

      if (!episode) {
        throw new NotFoundError('Episode');
      }

      // Increment view count
      await prisma.episode.update({
        where: { id },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });

      return {
        success: true,
        data: this.toEpisode(episode),
      };
    } catch (error) {
      logger.error('Failed to get episode', { error: error.message, episodeId: id });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get episode'),
      };
    }
  }

  async getEpisodesByCourse(courseId: string, query: any): Promise<ServiceResult<{ items: Episode[], meta: any }>> {
    try {
      const { page, limit, skip } = parsePaginationQuery(query);

      const [episodes, total] = await Promise.all([
        prisma.episode.findMany({
          where: {
            courseId,
            isActive: true,
          },
          include: {
            course: true,
            season: true,
          },
          orderBy: [
            { seasonId: 'asc' },
            { episodeNumber: 'asc' },
          ],
          take: limit,
          skip,
        }),
        prisma.episode.count({
          where: {
            courseId,
            isActive: true,
          },
        }),
      ]);

      const paginationMeta = createPaginationMeta(page, limit, total);

      return {
        success: true,
        data: {
          items: episodes.map(this.toEpisode),
          meta: paginationMeta,
        },
      };
    } catch (error) {
      logger.error('Failed to get episodes by course', { error: error.message, courseId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get episodes'),
      };
    }
  }

  // =============================================
  // FEATURED & POPULAR CONTENT
  // =============================================

  async getFeaturedContent(limit = 10): Promise<ServiceResult<ContentItem[]>> {
    try {
      const content = await prisma.course.findMany({
        where: {
          status: 'published',
          isPremium: true,
        },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          creator: true,
        },
        orderBy: [
          { rating: 'desc' },
          { totalViews: 'desc' },
        ],
        take: limit,
      });

      return {
        success: true,
        data: content.map(this.toContentItem),
      };
    } catch (error) {
      logger.error('Failed to get featured content', { error: error.message });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get featured content'),
      };
    }
  }

  async getPopularContent(limit = 10): Promise<ServiceResult<ContentItem[]>> {
    try {
      const content = await prisma.course.findMany({
        where: {
          status: 'published',
        },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          creator: true,
        },
        orderBy: { totalViews: 'desc' },
        take: limit,
      });

      return {
        success: true,
        data: content.map(this.toContentItem),
      };
    } catch (error) {
      logger.error('Failed to get popular content', { error: error.message });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get popular content'),
      };
    }
  }

  async getRecentContent(limit = 10): Promise<ServiceResult<ContentItem[]>> {
    try {
      const content = await prisma.course.findMany({
        where: {
          status: 'published',
        },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          creator: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return {
        success: true,
        data: content.map(this.toContentItem),
      };
    } catch (error) {
      logger.error('Failed to get recent content', { error: error.message });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get recent content'),
      };
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private toContentItem(content: any): ContentItem {
    return {
      id: content.id,
      title: content.title,
      slug: content.slug,
      description: content.description,
      shortDescription: content.shortDescription,
      thumbnailUrl: content.thumbnailUrl,
      bannerUrl: content.bannerUrl,
      trailerUrl: content.trailerUrl,
      contentType: content.contentType,
      status: content.status,
      isPremium: content.isPremium,
      price: Number(content.price),
      durationMinutes: content.durationMinutes,
      rating: Number(content.rating),
      totalViews: content.totalViews,
      releaseDate: content.releaseDate?.toISOString(),
      createdAt: content.createdAt.toISOString(),
      updatedAt: content.updatedAt.toISOString(),
      categories: content.categories?.map((cc: any) => ({
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
      tags: content.tags?.map((ct: any) => ({
        id: ct.tag.id,
        name: ct.tag.name,
        slug: ct.tag.slug,
        createdAt: ct.tag.createdAt.toISOString(),
      })) || [],
      seasons: content.seasons?.map((season: any) => ({
        id: season.id,
        courseId: season.courseId,
        title: season.title,
        description: season.description,
        seasonNumber: season.seasonNumber,
        thumbnailUrl: season.thumbnailUrl,
        isActive: season.isActive,
        createdAt: season.createdAt.toISOString(),
        updatedAt: season.updatedAt.toISOString(),
        episodes: season.episodes?.map(this.toEpisode) || [],
      })) || [],
      episodes: content.episodes?.map(this.toEpisode) || [],
      creator: content.creator ? {
        id: content.creator.id,
        email: content.creator.email,
        firstName: content.creator.firstName,
        lastName: content.creator.lastName,
        avatarUrl: content.creator.avatarUrl,
        role: content.creator.role,
        status: content.creator.status,
        emailVerified: content.creator.emailVerified,
        lastLoginAt: content.creator.lastLoginAt?.toISOString(),
        createdAt: content.creator.createdAt.toISOString(),
        updatedAt: content.creator.updatedAt.toISOString(),
      } : undefined,
    };
  }

  private toEpisode(episode: any): Episode {
    return {
      id: episode.id,
      courseId: episode.courseId,
      seasonId: episode.seasonId,
      title: episode.title,
      description: episode.description,
      episodeNumber: episode.episodeNumber,
      videoUrl: episode.videoUrl,
      videoDuration: episode.videoDuration,
      videoSize: episode.videoSize,
      videoQuality: episode.videoQuality,
      thumbnailUrl: episode.thumbnailUrl,
      isFree: episode.isFree,
      isActive: episode.isActive,
      viewCount: episode.viewCount,
      createdAt: episode.createdAt.toISOString(),
      updatedAt: episode.updatedAt.toISOString(),
      course: episode.course ? this.toContentItem(episode.course) : undefined,
      season: episode.season ? {
        id: episode.season.id,
        courseId: episode.season.courseId,
        title: episode.season.title,
        description: episode.season.description,
        seasonNumber: episode.season.seasonNumber,
        thumbnailUrl: episode.season.thumbnailUrl,
        isActive: episode.season.isActive,
        createdAt: episode.season.createdAt.toISOString(),
        updatedAt: episode.season.updatedAt.toISOString(),
        episodes: [],
      } : undefined,
    };
  }
}