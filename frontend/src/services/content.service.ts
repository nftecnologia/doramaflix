/**
 * Content Service
 * Service for managing courses/content data from API
 */

import { apiClient } from '@/lib/api-client'

export interface Course {
  id: string
  title: string
  description: string
  thumbnailUrl: string
  bannerUrl: string
  year: number
  rating: number
  genre: string
  totalEpisodes: number
  status: 'draft' | 'published' | 'completed' | 'archived'
  origin: 'korean' | 'japanese' | 'chinese' | 'thai' | 'taiwanese' | 'other'
}

export interface Category {
  id: string
  name: string
  slug: string
  count?: number
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  pagination?: {
    total: number
    page: number
    limit: number
  }
}

class ContentService {
  // Get all courses
  async getCourses(params?: {
    page?: number
    limit?: number
    category?: string
    search?: string
    origin?: string
  }): Promise<Course[]> {
    try {
      const response = await apiClient.get<ApiResponse<Course[]>>('/courses', { params })
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching courses:', error)
      return []
    }
  }

  // Get course by ID
  async getCourse(id: string): Promise<Course | null> {
    try {
      const response = await apiClient.get<ApiResponse<Course>>(`/courses/${id}`)
      return response.data.data
    } catch (error) {
      console.error('Error fetching course:', error)
      return null
    }
  }

  // Get categories
  async getCategories(): Promise<Category[]> {
    try {
      const response = await apiClient.get<ApiResponse<Category[]>>('/categories')
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching categories:', error)
      return []
    }
  }

  // Search content
  async searchContent(query: string): Promise<Course[]> {
    try {
      const response = await apiClient.get<ApiResponse<Course[]>>('/search', {
        params: { q: query }
      })
      return response.data.data || []
    } catch (error) {
      console.error('Error searching content:', error)
      return []
    }
  }

  // Get featured content (for hero section)
  async getFeaturedContent(): Promise<Course | null> {
    try {
      const courses = await this.getCourses({ limit: 1 })
      return courses.length > 0 ? courses[0] : null
    } catch (error) {
      console.error('Error fetching featured content:', error)
      return null
    }
  }

  // Get popular content
  async getPopularContent(): Promise<Course[]> {
    try {
      // For now, just get regular courses - can be enhanced with popularity sorting
      return await this.getCourses({ limit: 10 })
    } catch (error) {
      console.error('Error fetching popular content:', error)
      return []
    }
  }

  // Get content by origin
  async getContentByOrigin(origin: string): Promise<Course[]> {
    try {
      return await this.getCourses({ origin, limit: 20 })
    } catch (error) {
      console.error('Error fetching content by origin:', error)
      return []
    }
  }

  // Get content by category
  async getContentByCategory(category: string): Promise<Course[]> {
    try {
      return await this.getCourses({ category, limit: 20 })
    } catch (error) {
      console.error('Error fetching content by category:', error)
      return []
    }
  }
}

// Create and export singleton instance
export const contentService = new ContentService()
export default contentService