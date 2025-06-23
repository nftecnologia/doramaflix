/**
 * Course Entity
 * Domain model for courses/series management
 */

export type ContentType = 'course' | 'series' | 'movie' | 'documentary';
export type ContentStatus = 'draft' | 'published' | 'archived' | 'coming_soon';

export interface CourseEntity {
  id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  trailerUrl?: string;
  contentType: ContentType;
  status: ContentStatus;
  isPremium: boolean;
  price: number;
  durationMinutes: number;
  difficultyLevel: number;
  rating: number;
  totalViews: number;
  sortOrder: number;
  releaseDate?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCourseData {
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  trailerUrl?: string;
  contentType: ContentType;
  status?: ContentStatus;
  isPremium?: boolean;
  price?: number;
  durationMinutes?: number;
  difficultyLevel?: number;
  releaseDate?: Date;
  categoryIds?: string[];
  tagIds?: string[];
}

export interface UpdateCourseData {
  title?: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  trailerUrl?: string;
  status?: ContentStatus;
  isPremium?: boolean;
  price?: number;
  durationMinutes?: number;
  difficultyLevel?: number;
  releaseDate?: Date;
}