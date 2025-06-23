// Custom hook for watch progress functionality
import { useUser } from '@/contexts/user-context';
import { Show, WatchProgress } from '@/types/user';

export function useWatchProgress() {
  const { 
    continueWatching, 
    watchProgress, 
    updateWatchProgress, 
    removeFromContinueWatching,
    markAsCompleted,
    addToRecentlyWatched
  } = useUser();

  // Get progress for a specific show
  const getShowProgress = (showId: string | number): WatchProgress | null => {
    return watchProgress[showId] || null;
  };

  // Get progress percentage for a show
  const getProgressPercentage = (showId: string | number): number => {
    const progress = getShowProgress(showId);
    return progress?.percentage || 0;
  };

  // Check if show is completed
  const isCompleted = (showId: string | number): boolean => {
    const progress = getShowProgress(showId);
    return progress?.completed || false;
  };

  // Start watching a show
  const startWatching = (show: Show, duration?: number) => {
    const progress: Partial<WatchProgress> = {
      currentTime: 0,
      duration: duration || 0,
      percentage: 0,
      completed: false,
    };
    
    updateWatchProgress(show.id, progress);
    addToRecentlyWatched(show);
  };

  // Update progress during playback
  const updateProgress = (showId: string | number, currentTime: number, duration?: number) => {
    const progress: Partial<WatchProgress> = {
      currentTime,
    };
    
    if (duration !== undefined) {
      progress.duration = duration;
    }
    
    updateWatchProgress(showId, progress);
  };

  // Resume watching (get resume time)
  const getResumeTime = (showId: string | number): number => {
    const progress = getShowProgress(showId);
    return progress?.currentTime || 0;
  };

  // Get continue watching shows (not completed, has progress)
  const getContinueWatchingShows = () => {
    return continueWatching.filter(item => {
      const progress = getShowProgress(item.show.id);
      return progress && !progress.completed && progress.percentage > 0;
    });
  };

  // Get recently completed shows
  const getRecentlyCompleted = () => {
    return continueWatching.filter(item => {
      const progress = getShowProgress(item.show.id);
      return progress && progress.completed;
    });
  };

  // Get watch time statistics
  const getWatchStats = () => {
    const allProgress = Object.values(watchProgress);
    
    const totalWatchTime = allProgress.reduce((total, p) => {
      return total + (p.currentTime / 60); // convert to minutes
    }, 0);
    
    const showsWatched = allProgress.length;
    const completedShows = allProgress.filter(p => p.completed).length;
    const averageProgress = showsWatched > 0 
      ? allProgress.reduce((sum, p) => sum + p.percentage, 0) / showsWatched 
      : 0;
    
    return {
      totalWatchTime: Math.round(totalWatchTime),
      showsWatched,
      averageProgress: Math.round(averageProgress),
      completedShows,
    };
  };

  // Format time for display
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Get remaining time
  const getRemainingTime = (showId: string | number): number => {
    const progress = getShowProgress(showId);
    if (!progress || !progress.duration) return 0;
    
    return progress.duration - progress.currentTime;
  };

  // Check if show should be removed from continue watching (too old or completed)
  const shouldShowInContinueWatching = (showId: string | number): boolean => {
    const progress = getShowProgress(showId);
    if (!progress) return false;
    
    // Don't show completed items
    if (progress.completed) return false;
    
    // Don't show items with no progress
    if (progress.percentage === 0) return false;
    
    // Don't show items older than 30 days
    const daysSinceLastWatched = (Date.now() - new Date(progress.lastWatched).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceLastWatched > 30) return false;
    
    return true;
  };

  return {
    continueWatching,
    watchProgress,
    getShowProgress,
    getProgressPercentage,
    isCompleted,
    startWatching,
    updateProgress,
    getResumeTime,
    getContinueWatchingShows,
    getRecentlyCompleted,
    getWatchStats,
    formatTime,
    getRemainingTime,
    shouldShowInContinueWatching,
    updateWatchProgress,
    removeFromContinueWatching,
    markAsCompleted,
  };
}