// Storage utilities for user data persistence
import { MyListItem, WatchProgress, RecentlyWatched, UserPreferences, STORAGE_KEYS } from '@/types/user';

// Generic storage utility functions
class UserStorage {
  private static isClient = typeof window !== 'undefined';

  // Generic get/set methods with type safety
  private static getItem<T>(key: string, defaultValue: T): T {
    if (!UserStorage.isClient) return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      
      const parsed = JSON.parse(item);
      // Handle Date objects in parsed data
      return UserStorage.reviveDates(parsed);
    } catch (error) {
      console.error(`Error reading from localStorage (${key}):`, error);
      return defaultValue;
    }
  }

  private static setItem<T>(key: string, value: T): void {
    if (!UserStorage.isClient) return;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage (${key}):`, error);
    }
  }

  private static removeItem(key: string): void {
    if (!UserStorage.isClient) return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing from localStorage (${key}):`, error);
    }
  }

  // Helper to revive Date objects from JSON
  private static reviveDates(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => UserStorage.reviveDates(item));
    }
    
    const result: any = {};
    for (const key in obj) {
      const value = obj[key];
      
      // Convert date strings back to Date objects
      if (typeof value === 'string' && 
          (key.includes('Date') || key.includes('At') || key === 'lastWatched') &&
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
        result[key] = new Date(value);
      } else if (typeof value === 'object') {
        result[key] = UserStorage.reviveDates(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }

  // My List operations
  static getMyList(): MyListItem[] {
    return UserStorage.getItem(STORAGE_KEYS.MY_LIST, []);
  }

  static setMyList(myList: MyListItem[]): void {
    UserStorage.setItem(STORAGE_KEYS.MY_LIST, myList);
  }

  static addToMyList(item: MyListItem): void {
    const currentList = UserStorage.getMyList();
    const exists = currentList.some(existing => existing.show.id === item.show.id);
    
    if (!exists) {
      currentList.unshift(item); // Add to beginning
      UserStorage.setMyList(currentList);
    }
  }

  static removeFromMyList(showId: string | number): void {
    const currentList = UserStorage.getMyList();
    const filtered = currentList.filter(item => item.show.id !== showId);
    UserStorage.setMyList(filtered);
  }

  static isInMyList(showId: string | number): boolean {
    const myList = UserStorage.getMyList();
    return myList.some(item => item.show.id === showId);
  }

  // Continue Watching operations
  static getContinueWatching(): RecentlyWatched[] {
    return UserStorage.getItem(STORAGE_KEYS.CONTINUE_WATCHING, []);
  }

  static setContinueWatching(continueWatching: RecentlyWatched[]): void {
    UserStorage.setItem(STORAGE_KEYS.CONTINUE_WATCHING, continueWatching);
  }

  static addToContinueWatching(item: RecentlyWatched): void {
    const currentList = UserStorage.getContinueWatching();
    
    // Remove existing entry for this show
    const filtered = currentList.filter(existing => existing.show.id !== item.show.id);
    
    // Add to beginning
    filtered.unshift(item);
    
    // Keep only latest 20 items
    const trimmed = filtered.slice(0, 20);
    
    UserStorage.setContinueWatching(trimmed);
  }

  static removeFromContinueWatching(showId: string | number): void {
    const currentList = UserStorage.getContinueWatching();
    const filtered = currentList.filter(item => item.show.id !== showId);
    UserStorage.setContinueWatching(filtered);
  }

  // Watch Progress operations
  static getWatchProgress(): Record<string | number, WatchProgress> {
    return UserStorage.getItem(STORAGE_KEYS.WATCH_PROGRESS, {});
  }

  static setWatchProgress(progress: Record<string | number, WatchProgress>): void {
    UserStorage.setItem(STORAGE_KEYS.WATCH_PROGRESS, progress);
  }

  static updateWatchProgress(showId: string | number, progress: Partial<WatchProgress>): void {
    const allProgress = UserStorage.getWatchProgress();
    const existing = allProgress[showId] || {} as WatchProgress;
    
    const updated: WatchProgress = {
      ...existing,
      ...progress,
      showId,
      lastWatched: new Date(),
    };

    // Calculate percentage if duration is provided
    if (updated.duration && updated.currentTime) {
      updated.percentage = Math.min(100, Math.max(0, (updated.currentTime / updated.duration) * 100));
    }

    // Mark as completed if over 90%
    if (updated.percentage >= 90) {
      updated.completed = true;
    }

    allProgress[showId] = updated;
    UserStorage.setWatchProgress(allProgress);
  }

  static getShowProgress(showId: string | number): WatchProgress | null {
    const allProgress = UserStorage.getWatchProgress();
    return allProgress[showId] || null;
  }

  static markAsCompleted(showId: string | number): void {
    const allProgress = UserStorage.getWatchProgress();
    if (allProgress[showId]) {
      allProgress[showId].completed = true;
      allProgress[showId].percentage = 100;
      UserStorage.setWatchProgress(allProgress);
    }
  }

  // User Preferences operations
  static getUserPreferences(): UserPreferences {
    return UserStorage.getItem(STORAGE_KEYS.USER_PREFERENCES, {
      autoplay: true,
      subtitles: false,
      volume: 80,
      quality: 'auto' as const,
    });
  }

  static setUserPreferences(preferences: UserPreferences): void {
    UserStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, preferences);
  }

  static updateUserPreferences(updates: Partial<UserPreferences>): void {
    const current = UserStorage.getUserPreferences();
    const updated = { ...current, ...updates };
    UserStorage.setUserPreferences(updated);
  }

  // Utility operations
  static clearAllUserData(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      UserStorage.removeItem(key);
    });
  }

  static exportUserData(): string {
    const data = {
      myList: UserStorage.getMyList(),
      continueWatching: UserStorage.getContinueWatching(),
      watchProgress: UserStorage.getWatchProgress(),
      preferences: UserStorage.getUserPreferences(),
      exportedAt: new Date().toISOString(),
    };
    
    return JSON.stringify(data, null, 2);
  }

  static importUserData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.myList) UserStorage.setMyList(data.myList);
      if (data.continueWatching) UserStorage.setContinueWatching(data.continueWatching);
      if (data.watchProgress) UserStorage.setWatchProgress(data.watchProgress);
      if (data.preferences) UserStorage.setUserPreferences(data.preferences);
      
      return true;
    } catch (error) {
      console.error('Error importing user data:', error);
      return false;
    }
  }

  // Helper to calculate watch time statistics
  static getWatchTimeStats(): {
    totalWatchTime: number; // in minutes
    showsWatched: number;
    averageProgress: number;
    completedShows: number;
  } {
    const progress = UserStorage.getWatchProgress();
    const progressEntries = Object.values(progress);
    
    const totalWatchTime = progressEntries.reduce((total, p) => {
      return total + (p.currentTime / 60); // convert to minutes
    }, 0);
    
    const showsWatched = progressEntries.length;
    const completedShows = progressEntries.filter(p => p.completed).length;
    const averageProgress = showsWatched > 0 
      ? progressEntries.reduce((sum, p) => sum + p.percentage, 0) / showsWatched 
      : 0;
    
    return {
      totalWatchTime: Math.round(totalWatchTime),
      showsWatched,
      averageProgress: Math.round(averageProgress),
      completedShows,
    };
  }
}

export default UserStorage;