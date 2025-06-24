/**
 * useContent Hook
 * Custom hook for managing content data
 */

import { useState, useEffect } from 'react'
import { contentService, Course, Category } from '@/services/content.service'

export function useContent() {
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [featuredContent, setFeaturedContent] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadContent()
  }, [])

  const loadContent = async () => {
    try {
      setLoading(true)
      setError(null)

      // Load data in parallel
      const [coursesData, categoriesData, featuredData] = await Promise.all([
        contentService.getCourses(),
        contentService.getCategories(),
        contentService.getFeaturedContent()
      ])

      setCourses(coursesData)
      setCategories(categoriesData)
      setFeaturedContent(featuredData)
    } catch (err) {
      setError('Failed to load content')
      console.error('Error loading content:', err)
    } finally {
      setLoading(false)
    }
  }

  const searchContent = async (query: string): Promise<Course[]> => {
    try {
      return await contentService.searchContent(query)
    } catch (err) {
      console.error('Search error:', err)
      return []
    }
  }

  const getContentByCategory = async (category: string): Promise<Course[]> => {
    try {
      return await contentService.getContentByCategory(category)
    } catch (err) {
      console.error('Error getting content by category:', err)
      return []
    }
  }

  const getContentByOrigin = async (origin: string): Promise<Course[]> => {
    try {
      return await contentService.getContentByOrigin(origin)
    } catch (err) {
      console.error('Error getting content by origin:', err)
      return []
    }
  }

  return {
    courses,
    categories,
    featuredContent,
    loading,
    error,
    searchContent,
    getContentByCategory,
    getContentByOrigin,
    refetch: loadContent
  }
}

export function useCourse(id: string) {
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadCourse(id)
    }
  }, [id])

  const loadCourse = async (courseId: string) => {
    try {
      setLoading(true)
      setError(null)
      const courseData = await contentService.getCourse(courseId)
      setCourse(courseData)
    } catch (err) {
      setError('Failed to load course')
      console.error('Error loading course:', err)
    } finally {
      setLoading(false)
    }
  }

  return {
    course,
    loading,
    error,
    refetch: () => loadCourse(id)
  }
}