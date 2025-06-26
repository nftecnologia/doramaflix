/**
 * useContent Hook
 * Custom hook for managing content data with React Query cache
 */

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { contentService, Course, Category } from '@/services/content.service'

export function useContent() {
  // Parallel queries with React Query cache
  const {
    data: courses = [],
    isLoading: coursesLoading,
    error: coursesError
  } = useQuery({
    queryKey: ['courses'],
    queryFn: () => contentService.getCourses(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  })

  const {
    data: categories = [],
    isLoading: categoriesLoading,
    error: categoriesError
  } = useQuery({
    queryKey: ['categories'],
    queryFn: () => contentService.getCategories(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  })

  const {
    data: featuredContent = null,
    isLoading: featuredLoading,
    error: featuredError
  } = useQuery({
    queryKey: ['featured-content'],
    queryFn: () => contentService.getFeaturedContent(),
    staleTime: 3 * 60 * 1000, // 3 minutes
    refetchOnWindowFocus: false
  })

  // Memoized derived state
  const loading = coursesLoading || categoriesLoading || featuredLoading
  const error = coursesError || categoriesError || featuredError

  // Memoized functions to prevent unnecessary re-renders
  const searchContent = useMemo(() => 
    async (query: string): Promise<Course[]> => {
      try {
        return await contentService.searchContent(query)
      } catch (err) {
        console.error('Search error:', err)
        return []
      }
    }, [])

  const getContentByCategory = useMemo(() =>
    async (category: string): Promise<Course[]> => {
      try {
        return await contentService.getContentByCategory(category)
      } catch (err) {
        console.error('Error getting content by category:', err)
        return []
      }
    }, [])

  const getContentByOrigin = useMemo(() =>
    async (origin: string): Promise<Course[]> => {
      try {
        return await contentService.getContentByOrigin(origin)
      } catch (err) {
        console.error('Error getting content by origin:', err)
        return []
      }
    }, [])

  return useMemo(() => ({
    courses,
    categories,
    featuredContent,
    loading,
    error: error ? 'Failed to load content' : null,
    searchContent,
    getContentByCategory,
    getContentByOrigin,
    refetch: () => {
      // Invalidate all queries to trigger refetch
      // This would require access to queryClient, for now keeping it simple
    }
  }), [courses, categories, featuredContent, loading, error, searchContent, getContentByCategory, getContentByOrigin])
}

export function useCourse(id: string) {
  const {
    data: course = null,
    isLoading: loading,
    error,
    refetch
  } = useQuery({
    queryKey: ['course', id],
    queryFn: () => contentService.getCourse(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  })

  return useMemo(() => ({
    course,
    loading,
    error: error ? 'Failed to load course' : null,
    refetch
  }), [course, loading, error, refetch])
}