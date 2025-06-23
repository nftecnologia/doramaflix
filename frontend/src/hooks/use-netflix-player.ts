'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface UseNetflixPlayerOptions {
  autoplay?: boolean
  startTime?: number
  volume?: number
  playbackRate?: number
  enableKeyboardShortcuts?: boolean
  autoHideControls?: boolean
  autoHideDelay?: number
}

export interface PlayerState {
  playing: boolean
  played: number
  loaded: number
  duration: number
  playbackRate: number
  volume: number
  muted: boolean
  seeking: boolean
  buffer: boolean
  pip: boolean
  fullscreen: boolean
  showControls: boolean
  showSettings: boolean
  showSubtitles: boolean
  selectedQuality: string
  selectedSubtitle: string
  showSkipIntro: boolean
  showSkipCredits: boolean
  showNextEpisode: boolean
  error: string | null
}

export interface PlayerActions {
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  seekTo: (percentage: number) => void
  seekForward: (seconds?: number) => void
  seekBackward: (seconds?: number) => void
  setVolume: (volume: number) => void
  volumeUp: (step?: number) => void
  volumeDown: (step?: number) => void
  toggleMute: () => void
  setPlaybackRate: (rate: number) => void
  setQuality: (quality: string) => void
  setSubtitle: (subtitle: string) => void
  toggleSubtitles: () => void
  toggleFullscreen: () => void
  togglePictureInPicture: () => void
  showControls: () => void
  hideControls: () => void
  toggleSettings: () => void
  skipIntro: () => void
  skipCredits: () => void
  resetControlsTimeout: () => void
}

const DEFAULT_OPTIONS: Required<UseNetflixPlayerOptions> = {
  autoplay: false,
  startTime: 0,
  volume: 0.8,
  playbackRate: 1.0,
  enableKeyboardShortcuts: true,
  autoHideControls: true,
  autoHideDelay: 3000
}

export function useNetflixPlayer(options: UseNetflixPlayerOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options }
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const containerRef = useRef<HTMLDivElement>(null)

  const [state, setState] = useState<PlayerState>({
    playing: config.autoplay,
    played: config.startTime,
    loaded: 0,
    duration: 0,
    playbackRate: config.playbackRate,
    volume: config.volume,
    muted: false,
    seeking: false,
    buffer: false,
    pip: false,
    fullscreen: false,
    showControls: true,
    showSettings: false,
    showSubtitles: false,
    selectedQuality: 'auto',
    selectedSubtitle: '',
    showSkipIntro: false,
    showSkipCredits: false,
    showNextEpisode: false,
    error: null
  })

  // Auto-hide controls logic
  const resetControlsTimeout = useCallback(() => {
    if (!config.autoHideControls) return

    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    
    setState(prev => ({ ...prev, showControls: true }))
    
    if (state.playing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ 
          ...prev, 
          showControls: false, 
          showSettings: false 
        }))
      }, config.autoHideDelay)
    }
  }, [state.playing, config.autoHideControls, config.autoHideDelay])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [])

  // Fullscreen event listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setState(prev => ({ 
        ...prev, 
        fullscreen: !!document.fullscreenElement 
      }))
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    if (!config.enableKeyboardShortcuts) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Only handle shortcuts when focus is on body or player container
      if (e.target !== document.body && e.target !== containerRef.current) return
      
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          actions.togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          actions.seekBackward()
          break
        case 'ArrowRight':
          e.preventDefault()
          actions.seekForward()
          break
        case 'ArrowUp':
          e.preventDefault()
          actions.volumeUp()
          break
        case 'ArrowDown':
          e.preventDefault()
          actions.volumeDown()
          break
        case 'KeyM':
          e.preventDefault()
          actions.toggleMute()
          break
        case 'KeyF':
          e.preventDefault()
          actions.toggleFullscreen()
          break
        case 'KeyC':
          e.preventDefault()
          actions.toggleSubtitles()
          break
        case 'Escape':
          if (state.fullscreen) {
            actions.toggleFullscreen()
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [config.enableKeyboardShortcuts, state.fullscreen])

  // Skip detection logic
  useEffect(() => {
    const currentTime = state.played * state.duration
    
    // Skip intro detection (30s - 90s)
    if (currentTime >= 30 && currentTime <= 90 && !state.showSkipIntro) {
      setState(prev => ({ ...prev, showSkipIntro: true }))
    } else if ((currentTime < 30 || currentTime > 90) && state.showSkipIntro) {
      setState(prev => ({ ...prev, showSkipIntro: false }))
    }

    // Skip credits detection (last 2 minutes)
    const remainingTime = state.duration - currentTime
    if (remainingTime <= 120 && remainingTime > 0 && !state.showSkipCredits) {
      setState(prev => ({ ...prev, showSkipCredits: true }))
    } else if (remainingTime > 120 && state.showSkipCredits) {
      setState(prev => ({ ...prev, showSkipCredits: false }))
    }

    // Show next episode (last 30 seconds)
    if (remainingTime <= 30 && remainingTime > 0 && !state.showNextEpisode) {
      setState(prev => ({ ...prev, showNextEpisode: true }))
    } else if (remainingTime > 30 && state.showNextEpisode) {
      setState(prev => ({ ...prev, showNextEpisode: false }))
    }
  }, [state.played, state.duration])

  const actions: PlayerActions = {
    play: () => setState(prev => ({ ...prev, playing: true })),
    
    pause: () => setState(prev => ({ ...prev, playing: false })),
    
    togglePlay: () => {
      setState(prev => ({ ...prev, playing: !prev.playing }))
      resetControlsTimeout()
    },
    
    seek: (time: number) => {
      const percentage = time / state.duration
      setState(prev => ({ ...prev, played: percentage }))
    },
    
    seekTo: (percentage: number) => {
      setState(prev => ({ ...prev, played: Math.max(0, Math.min(1, percentage)) }))
    },
    
    seekForward: (seconds = 10) => {
      const newPlayed = Math.min(state.played + (seconds / state.duration), 1)
      setState(prev => ({ ...prev, played: newPlayed }))
      resetControlsTimeout()
    },
    
    seekBackward: (seconds = 10) => {
      const newPlayed = Math.max(state.played - (seconds / state.duration), 0)
      setState(prev => ({ ...prev, played: newPlayed }))
      resetControlsTimeout()
    },
    
    setVolume: (volume: number) => {
      const clampedVolume = Math.max(0, Math.min(1, volume))
      setState(prev => ({ 
        ...prev, 
        volume: clampedVolume, 
        muted: clampedVolume === 0 
      }))
    },
    
    volumeUp: (step = 0.1) => {
      const newVolume = Math.min(state.volume + step, 1)
      setState(prev => ({ 
        ...prev, 
        volume: newVolume, 
        muted: false 
      }))
    },
    
    volumeDown: (step = 0.1) => {
      const newVolume = Math.max(state.volume - step, 0)
      setState(prev => ({ 
        ...prev, 
        volume: newVolume, 
        muted: newVolume === 0 
      }))
    },
    
    toggleMute: () => {
      setState(prev => ({ ...prev, muted: !prev.muted }))
      resetControlsTimeout()
    },
    
    setPlaybackRate: (rate: number) => {
      setState(prev => ({ ...prev, playbackRate: rate }))
    },
    
    setQuality: (quality: string) => {
      setState(prev => ({ ...prev, selectedQuality: quality }))
    },
    
    setSubtitle: (subtitle: string) => {
      setState(prev => ({ ...prev, selectedSubtitle: subtitle }))
    },
    
    toggleSubtitles: () => {
      setState(prev => ({ ...prev, showSubtitles: !prev.showSubtitles }))
      resetControlsTimeout()
    },
    
    toggleFullscreen: () => {
      if (!state.fullscreen && containerRef.current) {
        containerRef.current.requestFullscreen()
      } else if (state.fullscreen) {
        document.exitFullscreen()
      }
      resetControlsTimeout()
    },
    
    togglePictureInPicture: () => {
      setState(prev => ({ ...prev, pip: !prev.pip }))
      resetControlsTimeout()
    },
    
    showControls: () => {
      setState(prev => ({ ...prev, showControls: true }))
    },
    
    hideControls: () => {
      setState(prev => ({ ...prev, showControls: false }))
    },
    
    toggleSettings: () => {
      setState(prev => ({ ...prev, showSettings: !prev.showSettings }))
      resetControlsTimeout()
    },
    
    skipIntro: () => {
      actions.seekTo(90 / state.duration) // Skip to 1:30
      setState(prev => ({ ...prev, showSkipIntro: false }))
    },
    
    skipCredits: () => {
      setState(prev => ({ ...prev, showSkipCredits: false }))
    },
    
    resetControlsTimeout
  }

  // Internal state updaters for ReactPlayer callbacks
  const updateProgress = useCallback(({ played, loaded }: { played: number, loaded: number }) => {
    if (!state.seeking) {
      setState(prev => ({ ...prev, played, loaded }))
    }
  }, [state.seeking])

  const updateDuration = useCallback((duration: number) => {
    setState(prev => ({ ...prev, duration }))
  }, [])

  const setBuffer = useCallback((buffer: boolean) => {
    setState(prev => ({ ...prev, buffer }))
  }, [])

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }))
  }, [])

  const setSeeking = useCallback((seeking: boolean) => {
    setState(prev => ({ ...prev, seeking }))
  }, [])

  return {
    state,
    actions,
    containerRef,
    // Utility functions for ReactPlayer integration
    updateProgress,
    updateDuration,
    setBuffer,
    setError,
    setSeeking,
    resetControlsTimeout
  }
}