/**
 * Search Service
 * Handles advanced search and filtering for content
 */

import { PrismaClient } from '@prisma/client';
import { 
  SearchRequest,
  SearchResponse,
  SearchFilters,
  ContentItem,
  ServiceResult
} from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { parsePaginationQuery, createPaginationMeta } from '@/shared/utils/response.utils';

const prisma = new PrismaClient();

export class SearchService {
  // =============================================
  // MAIN SEARCH FUNCTIONALITY
  // =============================================

  async search(searchParams: SearchRequest): Promise<ServiceResult<SearchResponse>> {
    try {
      const { 
        query, 
        type, 
        categories, 
        tags, 
        isPremium, 
        minRating, 
        minDuration, 
        maxDuration, 
        releaseYear, 
        status,
        page = 1,
        limit = 20,
        sort = 'relevance',
        order = 'desc'
      } = searchParams;

      const { skip } = parsePaginationQuery({ page, limit });

      // Build where clause
      const whereClause = await this.buildWhereClause({
        query,
        type,
        categories,
        tags,
        isPremium,
        minRating,
        minDuration,
        maxDuration,
        releaseYear,
        status
      });

      // Build order by clause
      const orderBy = this.buildOrderByClause(sort, order);

      // Execute search with count
      const [items, total, filters, suggestions] = await Promise.all([
        this.executeSearch(whereClause, orderBy, limit, skip),
        this.getSearchCount(whereClause),
        this.getSearchFilters(query),
        this.getSearchSuggestions(query)
      ]);

      const paginationMeta = createPaginationMeta(page, limit, total);

      logger.info('Search executed', { 
        query, 
        total, 
        page, 
        limit,
        filters: Object.keys(whereClause)
      });

      return {
        success: true,
        data: {
          items: items.map(this.toContentItem),
          filters,
          suggestions,
          meta: paginationMeta
        }
      };
    } catch (error) {
      logger.error('Search failed', { error: error.message, searchParams });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Search failed')
      };
    }
  }

  // =============================================
  // QUICK SEARCH (for autocomplete)
  // =============================================

  async quickSearch(query: string, limit = 10): Promise<ServiceResult<ContentItem[]>> {
    try {
      if (!query || query.length < 2) {
        return {
          success: true,
          data: []
        };
      }

      const items = await prisma.course.findMany({
        where: {
          status: { in: ['published', 'coming_soon'] },
          OR: [
            {
              title: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              description: {
                contains: query,
                mode: 'insensitive'
              }
            }
          ]
        },
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
        },
        take: limit,
        orderBy: [
          { totalViews: 'desc' },
          { rating: 'desc' }
        ]
      });

      return {
        success: true,
        data: items.map(this.toContentItem)
      };
    } catch (error) {
      logger.error('Quick search failed', { error: error.message, query });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Quick search failed')
      };
    }
  }

  // =============================================
  // SEARCH BY CATEGORY
  // =============================================

  async searchByCategory(categoryId: string, query: any): Promise<ServiceResult<{ items: ContentItem[], meta: any }>> {
    try {
      const { page, limit, skip } = parsePaginationQuery(query);

      const [items, total] = await Promise.all([
        prisma.course.findMany({
          where: {
            status: { in: ['published', 'coming_soon'] },
            categories: {
              some: {
                categoryId
              }
            }
          },
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
          },
          take: limit,
          skip,
          orderBy: { totalViews: 'desc' }
        }),
        prisma.course.count({
          where: {
            status: { in: ['published', 'coming_soon'] },
            categories: {
              some: {
                categoryId
              }
            }
          }
        })
      ]);

      const paginationMeta = createPaginationMeta(page, limit, total);

      return {
        success: true,
        data: {
          items: items.map(this.toContentItem),
          meta: paginationMeta
        }
      };
    } catch (error) {
      logger.error('Category search failed', { error: error.message, categoryId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Category search failed')
      };
    }
  }

  // =============================================
  // SEARCH BY TAG
  // =============================================

  async searchByTag(tagId: string, query: any): Promise<ServiceResult<{ items: ContentItem[], meta: any }>> {
    try {
      const { page, limit, skip } = parsePaginationQuery(query);

      const [items, total] = await Promise.all([
        prisma.course.findMany({
          where: {
            status: { in: ['published', 'coming_soon'] },
            tags: {
              some: {
                tagId
              }
            }
          },
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
          },
          take: limit,
          skip,
          orderBy: { totalViews: 'desc' }
        }),
        prisma.course.count({
          where: {
            status: { in: ['published', 'coming_soon'] },
            tags: {
              some: {
                tagId
              }
            }
          }
        })
      ]);

      const paginationMeta = createPaginationMeta(page, limit, total);

      return {
        success: true,
        data: {
          items: items.map(this.toContentItem),
          meta: paginationMeta
        }
      };
    } catch (error) {
      logger.error('Tag search failed', { error: error.message, tagId });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Tag search failed')
      };
    }
  }

  // =============================================
  // TRENDING SEARCH TERMS
  // =============================================

  async getTrendingSearches(limit = 10): Promise<ServiceResult<string[]>> {
    try {
      // In production, this would come from a search analytics table
      // For now, return popular content titles as trending searches
      const popularContent = await prisma.course.findMany({
        where: {
          status: 'published'
        },
        select: {
          title: true
        },
        orderBy: { totalViews: 'desc' },
        take: limit
      });

      const trendingTerms = popularContent.map(content => content.title);

      return {
        success: true,
        data: trendingTerms
      };
    } catch (error) {
      logger.error('Failed to get trending searches', { error: error.message });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get trending searches')
      };
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private async buildWhereClause(params: any): Promise<any> {
    const where: any = {
      status: { in: ['published', 'coming_soon'] }
    };

    // Text search
    if (params.query) {
      where.OR = [
        {
          title: {
            contains: params.query,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: params.query,
            mode: 'insensitive'
          }
        },
        {
          shortDescription: {
            contains: params.query,
            mode: 'insensitive'
          }
        }
      ];
    }

    // Content type filter
    if (params.type) {
      where.contentType = params.type;
    }

    // Premium filter
    if (params.isPremium !== undefined) {
      where.isPremium = params.isPremium;
    }

    // Rating filter
    if (params.minRating) {
      where.rating = {
        gte: params.minRating
      };
    }

    // Duration filters
    if (params.minDuration || params.maxDuration) {
      where.durationMinutes = {};
      if (params.minDuration) {
        where.durationMinutes.gte = params.minDuration;
      }
      if (params.maxDuration) {
        where.durationMinutes.lte = params.maxDuration;
      }
    }

    // Release year filter
    if (params.releaseYear) {
      const startOfYear = new Date(`${params.releaseYear}-01-01`);
      const endOfYear = new Date(`${params.releaseYear}-12-31`);
      
      where.releaseDate = {
        gte: startOfYear,
        lte: endOfYear
      };
    }

    // Status filter
    if (params.status) {
      where.status = params.status;
    }

    // Categories filter
    if (params.categories && params.categories.length > 0) {
      where.categories = {
        some: {
          categoryId: {
            in: params.categories
          }
        }
      };
    }

    // Tags filter
    if (params.tags && params.tags.length > 0) {
      where.tags = {
        some: {
          tag: {
            name: {
              in: params.tags,
              mode: 'insensitive'
            }
          }
        }
      };
    }

    return where;
  }

  private buildOrderByClause(sort: string, order: string): any {
    const orderDirection = order === 'asc' ? 'asc' : 'desc';

    switch (sort) {
      case 'title':
        return { title: orderDirection };
      case 'rating':
        return { rating: orderDirection };
      case 'views':
        return { totalViews: orderDirection };
      case 'date':
        return { createdAt: orderDirection };
      case 'release':
        return { releaseDate: orderDirection };
      case 'relevance':
      default:
        return [
          { rating: 'desc' },
          { totalViews: 'desc' },
          { createdAt: 'desc' }
        ];
    }
  }

  private async executeSearch(where: any, orderBy: any, limit: number, skip: number): Promise<any[]> {
    return prisma.course.findMany({
      where,
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
        },
        creator: true
      },
      orderBy,
      take: limit,
      skip
    });
  }

  private async getSearchCount(where: any): Promise<number> {
    return prisma.course.count({ where });
  }

  private async getSearchFilters(query?: string): Promise<SearchFilters> {
    try {
      // Get base filter for search context
      const baseWhere: any = {
        status: { in: ['published', 'coming_soon'] }
      };

      if (query) {
        baseWhere.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ];
      }

      const [
        categoryCounts,
        tagCounts,
        typeCounts,
        ratingCounts,
        yearCounts
      ] = await Promise.all([
        // Categories with counts
        prisma.courseCategory.groupBy({
          by: ['categoryId'],
          _count: true,
          where: {
            course: baseWhere
          }
        }),
        // Tags with counts
        prisma.courseTag.groupBy({
          by: ['tagId'],
          _count: true,
          where: {
            course: baseWhere
          }
        }),
        // Content types with counts
        prisma.course.groupBy({
          by: ['contentType'],
          _count: true,
          where: baseWhere
        }),
        // Rating distribution
        prisma.course.groupBy({
          by: ['rating'],
          _count: true,
          where: baseWhere
        }),
        // Release years
        prisma.$queryRaw`
          SELECT EXTRACT(YEAR FROM release_date) as year, COUNT(*) as count
          FROM courses
          WHERE status IN ('published', 'coming_soon')
          AND release_date IS NOT NULL
          GROUP BY EXTRACT(YEAR FROM release_date)
          ORDER BY year DESC
        `
      ]);

      // Fetch category and tag details
      const [categories, tags] = await Promise.all([
        prisma.category.findMany({
          where: {
            id: {
              in: categoryCounts.map(c => c.categoryId)
            }
          }
        }),
        prisma.tag.findMany({
          where: {
            id: {
              in: tagCounts.map(t => t.tagId)
            }
          }
        })
      ]);

      return {
        categories: categoryCounts.map(cc => {
          const category = categories.find(c => c.id === cc.categoryId);
          return {
            id: cc.categoryId,
            name: category?.name || 'Unknown',
            count: cc._count
          };
        }),
        tags: tagCounts.map(tc => {
          const tag = tags.find(t => t.id === tc.tagId);
          return {
            id: tc.tagId,
            name: tag?.name || 'Unknown',
            count: tc._count
          };
        }),
        types: typeCounts.map(tc => ({
          type: tc.contentType,
          count: tc._count
        })),
        ratings: ratingCounts.map(rc => ({
          rating: Number(rc.rating),
          count: rc._count
        })).sort((a, b) => b.rating - a.rating),
        years: (yearCounts as any[]).map(yc => ({
          year: Number(yc.year),
          count: Number(yc.count)
        })).filter(y => y.year && y.year > 1900)
      };
    } catch (error) {
      logger.error('Failed to get search filters', { error: error.message });
      return {
        categories: [],
        tags: [],
        types: [],
        ratings: [],
        years: []
      };
    }
  }

  private async getSearchSuggestions(query?: string): Promise<string[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      // Get content titles that partially match the query
      const suggestions = await prisma.course.findMany({
        where: {
          status: { in: ['published', 'coming_soon'] },
          title: {
            contains: query,
            mode: 'insensitive'
          }
        },
        select: {
          title: true
        },
        take: 5,
        orderBy: { totalViews: 'desc' }
      });

      return suggestions.map(s => s.title);
    } catch (error) {
      logger.error('Failed to get search suggestions', { error: error.message });
      return [];
    }
  }

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
}