'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { 
  UserState, 
  UserActions, 
  UserContextType, 
  Show, 
  WatchProgress, 
  UserPreferences,
  MyListItem,
  RecentlyWatched
} from '@/types/user';
import UserStorage from '@/utils/user-storage';

// Action types for reducer
type UserAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'INITIALIZE_USER_DATA'; payload: Partial<UserState> }
  | { type: 'ADD_TO_MY_LIST'; payload: Show }
  | { type: 'REMOVE_FROM_MY_LIST'; payload: string | number }
  | { type: 'UPDATE_WATCH_PROGRESS'; payload: { showId: string | number; progress: Partial<WatchProgress> } }
  | { type: 'ADD_TO_RECENTLY_WATCHED'; payload: Show }
  | { type: 'REMOVE_FROM_CONTINUE_WATCHING'; payload: string | number }
  | { type: 'MARK_AS_COMPLETED'; payload: string | number }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'CLEAR_USER_DATA' }
  | { type: 'IMPORT_USER_DATA'; payload: UserState };

// Initial state
const initialState: UserState = {
  myList: [],
  continueWatching: [],
  watchProgress: {},
  preferences: {
    autoplay: true,
    subtitles: false,
    volume: 80,
    quality: 'auto',
  },
  isLoading: false,
  error: null,
};

// Reducer
function userReducer(state: UserState, action: UserAction): UserState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'INITIALIZE_USER_DATA':
      return { ...state, ...action.payload, isLoading: false };

    case 'ADD_TO_MY_LIST': {
      const show = action.payload;
      const newItem: MyListItem = {
        show,
        addedAt: new Date(),
      };
      
      // Check if already exists
      const exists = state.myList.some(item => item.show.id === show.id);
      if (exists) return state;
      
      const updatedMyList = [newItem, ...state.myList];
      
      return {
        ...state,
        myList: updatedMyList,
      };
    }

    case 'REMOVE_FROM_MY_LIST': {
      const showId = action.payload;
      const updatedMyList = state.myList.filter(item => item.show.id !== showId);
      
      return {
        ...state,
        myList: updatedMyList,
      };
    }

    case 'UPDATE_WATCH_PROGRESS': {
      const { showId, progress } = action.payload;
      const existing = state.watchProgress[showId] || {} as WatchProgress;
      
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

      return {
        ...state,
        watchProgress: {
          ...state.watchProgress,
          [showId]: updated,
        },
      };
    }

    case 'ADD_TO_RECENTLY_WATCHED': {
      const show = action.payload;
      const watchProgress = state.watchProgress[show.id];
      
      const newItem: RecentlyWatched = {
        show,
        watchedAt: new Date(),
        progress: watchProgress,
      };
      
      // Remove existing entry for this show
      const filtered = state.continueWatching.filter(item => item.show.id !== show.id);
      
      // Add to beginning
      const updatedContinueWatching = [newItem, ...filtered].slice(0, 20); // Keep only latest 20
      
      return {
        ...state,
        continueWatching: updatedContinueWatching,
      };
    }

    case 'REMOVE_FROM_CONTINUE_WATCHING': {
      const showId = action.payload;
      const updatedContinueWatching = state.continueWatching.filter(item => item.show.id !== showId);
      
      return {
        ...state,
        continueWatching: updatedContinueWatching,
      };
    }

    case 'MARK_AS_COMPLETED': {
      const showId = action.payload;
      const existing = state.watchProgress[showId];
      
      if (!existing) return state;
      
      const updated: WatchProgress = {
        ...existing,
        completed: true,
        percentage: 100,
        lastWatched: new Date(),
      };
      
      return {
        ...state,
        watchProgress: {
          ...state.watchProgress,
          [showId]: updated,
        },
      };
    }

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        },
      };

    case 'CLEAR_USER_DATA':
      return {
        ...initialState,
        preferences: state.preferences, // Keep preferences
      };

    case 'IMPORT_USER_DATA':
      return {
        ...action.payload,
        isLoading: false,
        error: null,
      };

    default:
      return state;
  }
}

// Context
const UserContext = createContext<UserContextType | null>(null);

// Provider component
interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [state, dispatch] = useReducer(userReducer, initialState);

  // Initialize user data from localStorage on mount
  useEffect(() => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const myList = UserStorage.getMyList();
      const continueWatching = UserStorage.getContinueWatching();
      const watchProgress = UserStorage.getWatchProgress();
      const preferences = UserStorage.getUserPreferences();
      
      dispatch({
        type: 'INITIALIZE_USER_DATA',
        payload: {
          myList,
          continueWatching,
          watchProgress,
          preferences,
        },
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to load user data' });
      toast.error('Failed to load your data');
    }
  }, []);

  // Sync state changes to localStorage
  useEffect(() => {
    if (!state.isLoading && state.myList.length >= 0) {
      UserStorage.setMyList(state.myList);
    }
  }, [state.myList, state.isLoading]);

  useEffect(() => {
    if (!state.isLoading && state.continueWatching.length >= 0) {
      UserStorage.setContinueWatching(state.continueWatching);
    }
  }, [state.continueWatching, state.isLoading]);

  useEffect(() => {
    if (!state.isLoading && Object.keys(state.watchProgress).length >= 0) {
      UserStorage.setWatchProgress(state.watchProgress);
    }
  }, [state.watchProgress, state.isLoading]);

  useEffect(() => {
    if (!state.isLoading) {
      UserStorage.setUserPreferences(state.preferences);
    }
  }, [state.preferences, state.isLoading]);

  // Actions
  const actions: UserActions = {
    // My List actions
    addToMyList: (show: Show) => {
      dispatch({ type: 'ADD_TO_MY_LIST', payload: show });
      toast.success(`Added "${show.title}" to My List`, {
        icon: '➕',
        duration: 3000,
        style: {
          background: '#1f2937',
          color: '#fff',
          border: '1px solid #7c3aed',
        },
      });
    },

    removeFromMyList: (showId: string | number) => {
      const show = state.myList.find(item => item.show.id === showId)?.show;
      dispatch({ type: 'REMOVE_FROM_MY_LIST', payload: showId });
      
      if (show) {
        toast.success(`Removed "${show.title}" from My List`, {
          icon: '➖',
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #ef4444',
          },
        });
      }
    },

    isInMyList: (showId: string | number) => {
      return state.myList.some(item => item.show.id === showId);
    },

    // Continue Watching actions
    updateWatchProgress: (showId: string | number, progress: Partial<WatchProgress>) => {
      dispatch({ type: 'UPDATE_WATCH_PROGRESS', payload: { showId, progress } });
      
      // Add to recently watched when progress is updated
      const show = state.myList.find(item => item.show.id === showId)?.show ||
                   state.continueWatching.find(item => item.show.id === showId)?.show;
      
      if (show) {
        dispatch({ type: 'ADD_TO_RECENTLY_WATCHED', payload: show });
      }
    },

    removeFromContinueWatching: (showId: string | number) => {
      dispatch({ type: 'REMOVE_FROM_CONTINUE_WATCHING', payload: showId });
    },

    markAsCompleted: (showId: string | number) => {
      const show = state.continueWatching.find(item => item.show.id === showId)?.show;
      dispatch({ type: 'MARK_AS_COMPLETED', payload: showId });
      
      if (show) {
        toast.success(`Marked "${show.title}" as completed`, {
          icon: '✅',
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #10b981',
          },
        });
      }
    },

    // Recently Watched actions
    addToRecentlyWatched: (show: Show) => {
      dispatch({ type: 'ADD_TO_RECENTLY_WATCHED', payload: show });
    },

    // Preferences
    updatePreferences: (preferences: Partial<UserPreferences>) => {
      dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
      toast.success('Preferences updated', {
        icon: '⚙️',
        duration: 2000,
        style: {
          background: '#1f2937',
          color: '#fff',
          border: '1px solid #3b82f6',
        },
      });
    },

    // Utility
    clearUserData: () => {
      dispatch({ type: 'CLEAR_USER_DATA' });
      UserStorage.clearAllUserData();
      toast.success('All data cleared', {
        icon: '🗑️',
        duration: 3000,
        style: {
          background: '#1f2937',
          color: '#fff',
          border: '1px solid #f59e0b',
        },
      });
    },

    exportUserData: () => {
      return state;
    },

    importUserData: (data: UserState) => {
      dispatch({ type: 'IMPORT_USER_DATA', payload: data });
      toast.success('Data imported successfully', {
        icon: '📥',
        duration: 3000,
        style: {
          background: '#1f2937',
          color: '#fff',
          border: '1px solid #10b981',
        },
      });
    },
  };

  const contextValue: UserContextType = {
    ...state,
    ...actions,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
}

// Hook to use user context
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  
  return context;
}

// Export context for advanced use cases
export { UserContext };