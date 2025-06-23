import { User, AuthTokens } from '@/contexts/auth-context'

class Storage {
  private readonly keys = {
    tokens: 'doramaflix_tokens',
    user: 'doramaflix_user',
    theme: 'doramaflix_theme',
    preferences: 'doramaflix_preferences',
    watchHistory: 'doramaflix_watch_history',
    favorites: 'doramaflix_favorites',
    continueWatching: 'doramaflix_continue_watching',
  } as const

  // Generic storage methods
  private setItem(key: string, value: any): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value))
      }
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }

  private getItem<T>(key: string): T | null {
    try {
      if (typeof window !== 'undefined') {
        const item = localStorage.getItem(key)
        return item ? JSON.parse(item) : null
      }
    } catch (error) {
      console.error('Failed to read from localStorage:', error)
    }
    return null
  }

  private removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key)
      }
    } catch (error) {
      console.error('Failed to remove from localStorage:', error)
    }
  }

  // Auth-related storage
  setTokens(tokens: AuthTokens): void {
    this.setItem(this.keys.tokens, tokens)
  }

  getTokens(): AuthTokens | null {
    return this.getItem<AuthTokens>(this.keys.tokens)
  }

  setUser(user: User): void {
    this.setItem(this.keys.user, user)
  }

  getUser(): User | null {
    return this.getItem<User>(this.keys.user)
  }

  clearAuth(): void {
    this.removeItem(this.keys.tokens)
    this.removeItem(this.keys.user)
  }

  // Theme storage
  setTheme(theme: 'light' | 'dark'): void {
    this.setItem(this.keys.theme, theme)
  }

  getTheme(): 'light' | 'dark' | null {
    return this.getItem<'light' | 'dark'>(this.keys.theme)
  }

  // User preferences
  setPreferences(preferences: UserPreferences): void {
    this.setItem(this.keys.preferences, preferences)
  }

  getPreferences(): UserPreferences | null {
    return this.getItem<UserPreferences>(this.keys.preferences)
  }

  updatePreferences(updates: Partial<UserPreferences>): void {
    const current = this.getPreferences() || getDefaultPreferences()
    this.setPreferences({ ...current, ...updates })
  }

  // Watch history
  addToWatchHistory(item: WatchHistoryItem): void {
    const history = this.getWatchHistory()
    const existingIndex = history.findIndex(h => h.episodeId === item.episodeId)
    
    if (existingIndex >= 0) {
      history[existingIndex] = { ...history[existingIndex], ...item }
    } else {
      history.unshift(item)
    }

    // Keep only last 100 items
    const trimmedHistory = history.slice(0, 100)
    this.setItem(this.keys.watchHistory, trimmedHistory)
  }

  getWatchHistory(): WatchHistoryItem[] {
    return this.getItem<WatchHistoryItem[]>(this.keys.watchHistory) || []
  }

  removeFromWatchHistory(episodeId: string): void {
    const history = this.getWatchHistory()
    const filtered = history.filter(item => item.episodeId !== episodeId)
    this.setItem(this.keys.watchHistory, filtered)
  }

  clearWatchHistory(): void {
    this.removeItem(this.keys.watchHistory)
  }

  // Favorites
  addToFavorites(courseId: string): void {
    const favorites = this.getFavorites()
    if (!favorites.includes(courseId)) {
      favorites.push(courseId)
      this.setItem(this.keys.favorites, favorites)
    }
  }

  removeFromFavorites(courseId: string): void {
    const favorites = this.getFavorites()
    const filtered = favorites.filter(id => id !== courseId)
    this.setItem(this.keys.favorites, filtered)
  }

  getFavorites(): string[] {
    return this.getItem<string[]>(this.keys.favorites) || []
  }

  isFavorite(courseId: string): boolean {
    return this.getFavorites().includes(courseId)
  }

  // Continue watching
  updateContinueWatching(item: ContinueWatchingItem): void {
    const items = this.getContinueWatching()
    const existingIndex = items.findIndex(i => i.episodeId === item.episodeId)
    
    if (existingIndex >= 0) {
      items[existingIndex] = item
    } else {
      items.unshift(item)
    }

    // Keep only last 20 items
    const trimmedItems = items.slice(0, 20)
    this.setItem(this.keys.continueWatching, trimmedItems)
  }

  getContinueWatching(): ContinueWatchingItem[] {
    return this.getItem<ContinueWatchingItem[]>(this.keys.continueWatching) || []
  }

  removeFromContinueWatching(episodeId: string): void {
    const items = this.getContinueWatching()
    const filtered = items.filter(item => item.episodeId !== episodeId)
    this.setItem(this.keys.continueWatching, filtered)
  }

  // Clear all data
  clearAll(): void {
    Object.values(this.keys).forEach(key => {
      this.removeItem(key)
    })
  }

  // Get storage usage
  getStorageUsage(): StorageUsage {
    let totalSize = 0
    const itemSizes: Record<string, number> = {}

    Object.entries(this.keys).forEach(([name, key]) => {
      try {
        const item = localStorage.getItem(key)
        const size = item ? item.length : 0
        itemSizes[name] = size
        totalSize += size
      } catch {
        itemSizes[name] = 0
      }
    })

    return {
      totalSize,
      itemSizes,
      totalSizeFormatted: formatBytes(totalSize),
    }
  }
}

// Types
export interface UserPreferences {
  language: string
  autoplay: boolean
  quality: 'auto' | '480p' | '720p' | '1080p' | '1440p' | '2160p'
  subtitles: boolean
  subtitleLanguage: string
  volume: number
  notifications: boolean
  emailNotifications: boolean
  darkMode: boolean
}

export interface WatchHistoryItem {
  episodeId: string
  courseId: string
  courseName: string
  episodeName: string
  thumbnailUrl?: string
  watchedAt: string
  progress: number // seconds
  duration: number // seconds
}

export interface ContinueWatchingItem {
  episodeId: string
  courseId: string
  courseName: string
  episodeName: string
  thumbnailUrl?: string
  progress: number // seconds
  duration: number // seconds
  updatedAt: string
}

export interface StorageUsage {
  totalSize: number
  itemSizes: Record<string, number>
  totalSizeFormatted: string
}

// Default preferences
export function getDefaultPreferences(): UserPreferences {
  return {
    language: 'en',
    autoplay: true,
    quality: 'auto',
    subtitles: true,
    subtitleLanguage: 'en',
    volume: 0.8,
    notifications: true,
    emailNotifications: false,
    darkMode: true,
  }
}

// Utility function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Export singleton instance
export const storage = new Storage()