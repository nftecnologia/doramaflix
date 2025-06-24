/**
 * useUserFeatures Hook
 * Custom hook for managing user features like My List and Continue Watching
 */

import { useState, useEffect, useCallback } from 'react'
import { userService, WatchProgress } from '@/services/user.service'
import { Course } from '@/services/content.service'

export function useMyList() {
  const [myList, setMyList] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadMyList()
  }, [])

  const loadMyList = async () => {
    try {
      setLoading(true)
      setError(null)
      const list = await userService.getMyList()
      setMyList(list)
    } catch (err) {
      setError('Failed to load My List')
      console.error('Error loading My List:', err)
    } finally {
      setLoading(false)
    }
  }

  const addToMyList = useCallback(async (courseId: string) => {
    try {
      const success = await userService.addToMyList(courseId)
      if (success) {
        await loadMyList() // Refresh the list
      }
      return success
    } catch (err) {
      console.error('Error adding to My List:', err)
      return false
    }
  }, [])

  const removeFromMyList = useCallback(async (courseId: string) => {
    try {
      const success = await userService.removeFromMyList(courseId)
      if (success) {
        await loadMyList() // Refresh the list
      }
      return success
    } catch (err) {
      console.error('Error removing from My List:', err)
      return false
    }
  }, [])

  const isInMyList = useCallback(async (courseId: string) => {
    try {
      return await userService.isInMyList(courseId)
    } catch (err) {
      console.error('Error checking My List:', err)
      return false
    }
  }, [])

  const toggleMyList = useCallback(async (courseId: string) => {
    const inList = await isInMyList(courseId)
    if (inList) {
      return await removeFromMyList(courseId)
    } else {
      return await addToMyList(courseId)
    }
  }, [isInMyList, addToMyList, removeFromMyList])

  return {
    myList,
    loading,
    error,
    addToMyList,
    removeFromMyList,
    isInMyList,
    toggleMyList,
    refetch: loadMyList
  }
}

export function useContinueWatching() {
  const [continueWatching, setContinueWatching] = useState<WatchProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadContinueWatching()
  }, [])

  const loadContinueWatching = async () => {
    try {
      setLoading(true)
      setError(null)
      const progress = await userService.getContinueWatching()
      setContinueWatching(progress)
    } catch (err) {
      setError('Failed to load Continue Watching')
      console.error('Error loading Continue Watching:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateWatchProgress = useCallback(async (
    courseId: string,
    episodeId: string | null,
    currentTime: number,
    duration: number
  ) => {
    try {
      const success = await userService.updateWatchProgress(courseId, episodeId, currentTime, duration)
      if (success) {
        await loadContinueWatching() // Refresh the list
      }
      return success
    } catch (err) {
      console.error('Error updating watch progress:', err)
      return false
    }
  }, [])

  return {
    continueWatching,
    loading,
    error,
    updateWatchProgress,
    refetch: loadContinueWatching
  }
}

export function useWatchProgress(courseId: string, episodeId?: string) {
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [percentageWatched, setPercentageWatched] = useState(0)
  const { updateWatchProgress } = useContinueWatching()

  const saveProgress = useCallback(async (time: number, totalDuration: number) => {
    setCurrentTime(time)
    setDuration(totalDuration)
    const percentage = Math.round((time / totalDuration) * 100)
    setPercentageWatched(percentage)

    // Save progress every 10 seconds or when percentage changes by 5%
    const shouldSave = 
      time % 10 === 0 || 
      Math.abs(percentage - percentageWatched) >= 5 ||
      percentage >= 95 // Always save when near completion

    if (shouldSave) {
      await updateWatchProgress(courseId, episodeId || null, time, totalDuration)
    }
  }, [courseId, episodeId, percentageWatched, updateWatchProgress])

  const markAsCompleted = useCallback(async () => {
    if (duration > 0) {
      await updateWatchProgress(courseId, episodeId || null, duration, duration)
      setPercentageWatched(100)
    }
  }, [courseId, episodeId, duration, updateWatchProgress])

  return {
    currentTime,
    duration,
    percentageWatched,
    saveProgress,
    markAsCompleted
  }
}