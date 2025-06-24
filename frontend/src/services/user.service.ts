/**
 * User Service
 * Service for user-related functionality like My List, Continue Watching, etc.
 */

import { apiClient } from '@/lib/api-client'
import { Course } from './content.service'

export interface WatchProgress {
  id: string
  courseId: string
  episodeId?: string
  currentTime: number
  duration: number
  percentageWatched: number
  lastWatchedAt: string
  course?: Course
}

export interface UserFavorite {
  id: string
  courseId: string
  addedAt: string
  course?: Course
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

class UserService {
  // My List functionality
  async getMyList(): Promise<Course[]> {
    try {
      // If user is not authenticated, use localStorage
      if (!this.isAuthenticated()) {
        return this.getMyListFromStorage()
      }

      const response = await apiClient.get<ApiResponse<UserFavorite[]>>('/users/me/favorites')
      return response.data.data?.map(fav => fav.course).filter(Boolean) || []
    } catch (error) {
      console.error('Error fetching My List:', error)
      // Fallback to localStorage
      return this.getMyListFromStorage()
    }
  }

  async addToMyList(courseId: string): Promise<boolean> {
    try {
      // If user is authenticated, save to backend
      if (this.isAuthenticated()) {
        await apiClient.post(`/courses/${courseId}/favorite`)
      }
      
      // Also save to localStorage for offline access
      this.addToMyListInStorage(courseId)
      return true
    } catch (error) {
      console.error('Error adding to My List:', error)
      // Fallback to localStorage only
      this.addToMyListInStorage(courseId)
      return false
    }
  }

  async removeFromMyList(courseId: string): Promise<boolean> {
    try {
      // If user is authenticated, remove from backend
      if (this.isAuthenticated()) {
        await apiClient.delete(`/courses/${courseId}/favorite`)
      }
      
      // Also remove from localStorage
      this.removeFromMyListInStorage(courseId)
      return true
    } catch (error) {
      console.error('Error removing from My List:', error)
      // Fallback to localStorage only
      this.removeFromMyListInStorage(courseId)
      return false
    }
  }

  async isInMyList(courseId: string): Promise<boolean> {
    try {
      // Check localStorage first for quick response
      const storageList = this.getMyListIdsFromStorage()
      return storageList.includes(courseId)
    } catch (error) {
      console.error('Error checking My List:', error)
      return false
    }
  }

  // Continue Watching functionality
  async getContinueWatching(): Promise<WatchProgress[]> {
    try {
      // If user is not authenticated, use localStorage
      if (!this.isAuthenticated()) {
        return this.getContinueWatchingFromStorage()
      }

      const response = await apiClient.get<ApiResponse<WatchProgress[]>>('/users/me/progress')
      return response.data.data || []
    } catch (error) {
      console.error('Error fetching Continue Watching:', error)
      // Fallback to localStorage
      return this.getContinueWatchingFromStorage()
    }
  }

  async updateWatchProgress(
    courseId: string, 
    episodeId: string | null, 
    currentTime: number, 
    duration: number
  ): Promise<boolean> {
    try {
      const percentageWatched = Math.round((currentTime / duration) * 100)

      // If user is authenticated, save to backend
      if (this.isAuthenticated()) {
        await apiClient.post(`/episodes/${episodeId || courseId}/progress`, {
          currentTime,
          duration,
          percentageWatched
        })
      }
      
      // Also save to localStorage for offline access
      this.updateWatchProgressInStorage(courseId, episodeId, currentTime, duration)
      return true
    } catch (error) {
      console.error('Error updating watch progress:', error)
      // Fallback to localStorage only
      this.updateWatchProgressInStorage(courseId, episodeId, currentTime, duration)
      return false
    }
  }

  // LocalStorage helper methods
  private getMyListFromStorage(): Course[] {
    try {
      const myListIds = JSON.parse(localStorage.getItem('doramaflix_mylist') || '[]')
      // Return empty array for now, would need to fetch course details
      return []
    } catch {
      return []
    }
  }

  private getMyListIdsFromStorage(): string[] {
    try {
      return JSON.parse(localStorage.getItem('doramaflix_mylist') || '[]')
    } catch {
      return []
    }
  }

  private addToMyListInStorage(courseId: string): void {
    try {
      const myList = this.getMyListIdsFromStorage()
      if (!myList.includes(courseId)) {
        myList.push(courseId)
        localStorage.setItem('doramaflix_mylist', JSON.stringify(myList))
      }
    } catch (error) {
      console.error('Error saving to My List storage:', error)
    }
  }

  private removeFromMyListInStorage(courseId: string): void {
    try {
      const myList = this.getMyListIdsFromStorage()
      const updatedList = myList.filter(id => id !== courseId)
      localStorage.setItem('doramaflix_mylist', JSON.stringify(updatedList))
    } catch (error) {
      console.error('Error removing from My List storage:', error)
    }
  }

  private getContinueWatchingFromStorage(): WatchProgress[] {
    try {
      return JSON.parse(localStorage.getItem('doramaflix_continue_watching') || '[]')
    } catch {
      return []
    }
  }

  private updateWatchProgressInStorage(
    courseId: string, 
    episodeId: string | null, 
    currentTime: number, 
    duration: number
  ): void {
    try {
      const progressList = this.getContinueWatchingFromStorage()
      const percentageWatched = Math.round((currentTime / duration) * 100)
      
      const existingIndex = progressList.findIndex(p => 
        p.courseId === courseId && p.episodeId === episodeId
      )

      const progressItem: WatchProgress = {
        id: `${courseId}-${episodeId || 'main'}`,
        courseId,
        episodeId: episodeId || undefined,
        currentTime,
        duration,
        percentageWatched,
        lastWatchedAt: new Date().toISOString()
      }

      if (existingIndex >= 0) {
        progressList[existingIndex] = progressItem
      } else {
        progressList.push(progressItem)
      }

      // Keep only last 20 items and remove completed ones (>95%)
      const filteredList = progressList
        .filter(p => p.percentageWatched < 95)
        .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime())
        .slice(0, 20)

      localStorage.setItem('doramaflix_continue_watching', JSON.stringify(filteredList))
    } catch (error) {
      console.error('Error saving watch progress to storage:', error)
    }
  }

  private isAuthenticated(): boolean {
    try {
      const tokens = localStorage.getItem('doramaflix_tokens')
      return !!(tokens && JSON.parse(tokens).accessToken)
    } catch {
      return false
    }
  }
}

// Create and export singleton instance
export const userService = new UserService()
export default userService