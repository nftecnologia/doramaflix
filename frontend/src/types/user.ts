// User-related types for DoramaFlix Netflix-style features

export interface Show {
  id: string | number;
  title: string;
  description?: string;
  thumbnail?: string;
  category: string;
  rating: number;
  year: number;
  duration?: number; // duration in minutes
  episodes?: number;
  image?: string;
  videoUrl?: string;
}

export interface WatchProgress {
  showId: string | number;
  episodeId?: string | number;
  currentTime: number; // in seconds
  duration: number; // in seconds
  percentage: number; // 0-100
  lastWatched: Date;
  completed: boolean;
}

export interface MyListItem {
  show: Show;
  addedAt: Date;
}

export interface RecentlyWatched {
  show: Show;
  watchedAt: Date;
  progress?: WatchProgress;
}

export interface UserPreferences {
  autoplay: boolean;
  subtitles: boolean;
  volume: number;
  quality: 'auto' | '480p' | '720p' | '1080p' | '4k';
}

export interface UserState {
  myList: MyListItem[];
  continueWatching: RecentlyWatched[];
  watchProgress: Record<string | number, WatchProgress>;
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
}

export interface UserActions {
  // My List actions
  addToMyList: (show: Show) => void;
  removeFromMyList: (showId: string | number) => void;
  isInMyList: (showId: string | number) => boolean;
  
  // Continue Watching actions
  updateWatchProgress: (showId: string | number, progress: Partial<WatchProgress>) => void;
  removeFromContinueWatching: (showId: string | number) => void;
  markAsCompleted: (showId: string | number) => void;
  
  // Recently Watched actions
  addToRecentlyWatched: (show: Show) => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  
  // Utility
  clearUserData: () => void;
  exportUserData: () => UserState;
  importUserData: (data: UserState) => void;
}

export interface UserContextType extends UserState, UserActions {}

// Toast notification types
export interface ToastMessage {
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

// Storage keys
export const STORAGE_KEYS = {
  MY_LIST: 'doramaflix_my_list',
  CONTINUE_WATCHING: 'doramaflix_continue_watching',
  WATCH_PROGRESS: 'doramaflix_watch_progress',
  USER_PREFERENCES: 'doramaflix_user_preferences',
} as const;