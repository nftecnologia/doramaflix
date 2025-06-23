/**
 * Category Service
 * Handles category and tag management operations
 */

import { PrismaClient } from '@prisma/client';
import { 
  Category,
  Tag,
  CreateCategoryRequest,
  ServiceResult,
  NotFoundError,
  ConflictError
} from '@/shared/types';
import { logger } from '@/shared/utils/logger';
import { parsePaginationQuery, createPaginationMeta } from '@/shared/utils/response.utils';
import { generateSlug } from '@/shared/validators/common.validators';

const prisma = new PrismaClient();

export class CategoryService {
  // =============================================
  // CATEGORY OPERATIONS
  // =============================================

  async createCategory(data: CreateCategoryRequest): Promise<ServiceResult<Category>> {
    try {
      const { name, description, iconUrl, color = '#000000', sortOrder = 0 } = data;

      // Generate slug from name
      const slug = generateSlug(name);

      // Check if slug already exists
      const existingCategory = await prisma.category.findUnique({
        where: { slug }
      });

      if (existingCategory) {
        throw new ConflictError(`Category with slug "${slug}" already exists`);
      }

      const category = await prisma.category.create({
        data: {
          name,
          slug,
          description,
          iconUrl,
          color,
          sortOrder,
          isActive: true,
        }
      });

      logger.info('Category created', { categoryId: category.id, name, slug });

      return {
        success: true,
        data: this.toCategory(category)
      };
    } catch (error) {
      logger.error('Failed to create category', { error: error.message, name: data.name });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create category')
      };
    }
  }

  async getCategory(id: string): Promise<ServiceResult<Category>> {
    try {
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        }
      });

      if (!category) {
        throw new NotFoundError('Category');
      }

      return {
        success: true,
        data: this.toCategory(category)
      };
    } catch (error) {
      logger.error('Failed to get category', { error: error.message, categoryId: id });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get category')
      };
    }
  }

  async getCategoryBySlug(slug: string): Promise<ServiceResult<Category>> {
    try {
      const category = await prisma.category.findUnique({
        where: { slug },
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        }
      });

      if (!category) {
        throw new NotFoundError('Category');
      }

      return {
        success: true,
        data: this.toCategory(category)
      };
    } catch (error) {
      logger.error('Failed to get category by slug', { error: error.message, slug });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get category')
      };
    }
  }

  async getAllCategories(query: any = {}): Promise<ServiceResult<{ items: Category[], meta: any }>> {
    try {
      const { page, limit, skip } = parsePaginationQuery(query);
      const includeInactive = query.includeInactive === 'true';

      const whereClause: any = {};
      if (!includeInactive) {
        whereClause.isActive = true;
      }

      const [categories, total] = await Promise.all([
        prisma.category.findMany({
          where: whereClause,
          include: {
            _count: {
              select: {
                courses: true
              }
            }
          },
          orderBy: [
            { sortOrder: 'asc' },
            { name: 'asc' }
          ],
          take: limit,
          skip
        }),
        prisma.category.count({
          where: whereClause
        })
      ]);

      const paginationMeta = createPaginationMeta(page, limit, total);

      return {
        success: true,
        data: {
          items: categories.map(this.toCategory),
          meta: paginationMeta
        }
      };
    } catch (error) {
      logger.error('Failed to get all categories', { error: error.message });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get all categories')
      };
    }
  }

  async updateCategory(id: string, data: Partial<CreateCategoryRequest>): Promise<ServiceResult<Category>> {
    try {
      // Check if category exists
      const existingCategory = await prisma.category.findUnique({
        where: { id }
      });

      if (!existingCategory) {
        throw new NotFoundError('Category');
      }

      // Generate new slug if name changed
      let slug = existingCategory.slug;
      if (data.name && data.name !== existingCategory.name) {
        slug = generateSlug(data.name);
        
        // Check if new slug already exists
        const slugExists = await prisma.category.findFirst({
          where: { slug, id: { not: id } }
        });

        if (slugExists) {
          throw new ConflictError(`Category with slug "${slug}" already exists`);
        }
      }

      const category = await prisma.category.update({
        where: { id },
        data: {
          ...data,
          slug
        },
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        }
      });

      logger.info('Category updated', { categoryId: id });

      return {
        success: true,
        data: this.toCategory(category)
      };
    } catch (error) {
      logger.error('Failed to update category', { error: error.message, categoryId: id });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to update category')
      };
    }
  }

  async deleteCategory(id: string): Promise<ServiceResult<void>> {
    try {
      // Check if category exists
      const category = await prisma.category.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        }
      });

      if (!category) {
        throw new NotFoundError('Category');
      }

      // Check if category has associated courses
      if (category._count.courses > 0) {
        throw new ConflictError('Cannot delete category that has associated courses');
      }

      await prisma.category.delete({
        where: { id }
      });

      logger.info('Category deleted', { categoryId: id });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete category', { error: error.message, categoryId: id });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete category')
      };
    }
  }

  async toggleCategoryStatus(id: string): Promise<ServiceResult<Category>> {
    try {
      const category = await prisma.category.findUnique({
        where: { id }
      });

      if (!category) {
        throw new NotFoundError('Category');
      }

      const updatedCategory = await prisma.category.update({
        where: { id },
        data: {
          isActive: !category.isActive
        },
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        }
      });

      logger.info('Category status toggled', { categoryId: id, isActive: updatedCategory.isActive });

      return {
        success: true,
        data: this.toCategory(updatedCategory)
      };
    } catch (error) {
      logger.error('Failed to toggle category status', { error: error.message, categoryId: id });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to toggle category status')
      };
    }
  }

  // =============================================
  // TAG OPERATIONS
  // =============================================

  async getAllTags(query: any = {}): Promise<ServiceResult<{ items: Tag[], meta: any }>> {
    try {
      const { page, limit, skip } = parsePaginationQuery(query);
      const search = query.search;

      const whereClause: any = {};
      if (search) {
        whereClause.name = {
          contains: search,
          mode: 'insensitive'
        };
      }

      const [tags, total] = await Promise.all([
        prisma.tag.findMany({
          where: whereClause,
          include: {
            _count: {
              select: {
                courses: true
              }
            }
          },
          orderBy: { name: 'asc' },
          take: limit,
          skip
        }),
        prisma.tag.count({
          where: whereClause
        })
      ]);

      const paginationMeta = createPaginationMeta(page, limit, total);

      return {
        success: true,
        data: {
          items: tags.map(this.toTag),
          meta: paginationMeta
        }
      };
    } catch (error) {
      logger.error('Failed to get all tags', { error: error.message });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get all tags')
      };
    }
  }

  async getTag(id: string): Promise<ServiceResult<Tag>> {
    try {
      const tag = await prisma.tag.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        }
      });

      if (!tag) {
        throw new NotFoundError('Tag');
      }

      return {
        success: true,
        data: this.toTag(tag)
      };
    } catch (error) {
      logger.error('Failed to get tag', { error: error.message, tagId: id });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get tag')
      };
    }
  }

  async createTag(name: string): Promise<ServiceResult<Tag>> {
    try {
      const slug = generateSlug(name);

      // Check if tag already exists
      const existingTag = await prisma.tag.findUnique({
        where: { slug }
      });

      if (existingTag) {
        return {
          success: true,
          data: this.toTag(existingTag)
        };
      }

      const tag = await prisma.tag.create({
        data: {
          name,
          slug
        },
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        }
      });

      logger.info('Tag created', { tagId: tag.id, name, slug });

      return {
        success: true,
        data: this.toTag(tag)
      };
    } catch (error) {
      logger.error('Failed to create tag', { error: error.message, name });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to create tag')
      };
    }
  }

  async deleteTag(id: string): Promise<ServiceResult<void>> {
    try {
      // Check if tag exists
      const tag = await prisma.tag.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        }
      });

      if (!tag) {
        throw new NotFoundError('Tag');
      }

      // Check if tag has associated courses
      if (tag._count.courses > 0) {
        throw new ConflictError('Cannot delete tag that has associated courses');
      }

      await prisma.tag.delete({
        where: { id }
      });

      logger.info('Tag deleted', { tagId: id });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete tag', { error: error.message, tagId: id });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to delete tag')
      };
    }
  }

  async getPopularTags(limit = 20): Promise<ServiceResult<Tag[]>> {
    try {
      const tags = await prisma.tag.findMany({
        include: {
          _count: {
            select: {
              courses: true
            }
          }
        },
        orderBy: {
          courses: {
            _count: 'desc'
          }
        },
        take: limit
      });

      return {
        success: true,
        data: tags.map(this.toTag)
      };
    } catch (error) {
      logger.error('Failed to get popular tags', { error: error.message });
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Failed to get popular tags')
      };
    }
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private toCategory(category: any): Category {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      iconUrl: category.iconUrl,
      color: category.color,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt.toISOString(),
      updatedAt: category.updatedAt.toISOString(),
      courseCount: category._count?.courses || 0
    };
  }

  private toTag(tag: any): Tag {
    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      createdAt: tag.createdAt.toISOString(),
      courseCount: tag._count?.courses || 0
    };
  }
}