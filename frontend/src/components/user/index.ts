// User components barrel exports
export { MyList } from './my-list';
export { 
  ContinueWatching, 
  ContinueWatchingRow 
} from './continue-watching';
export { 
  MyListButton, 
  MyListIconButton, 
  MyListCompactButton, 
  MyListFloatingButton 
} from './my-list-button';

// Re-export hooks for convenience
export { useMyList } from '@/hooks/use-my-list';
export { useWatchProgress } from '@/hooks/use-watch-progress';
export { useUser } from '@/contexts/user-context';

// Re-export types
export type { 
  Show, 
  WatchProgress, 
  MyListItem, 
  RecentlyWatched, 
  UserPreferences,
  UserState,
  UserActions,
  UserContextType 
} from '@/types/user';