'use client'

import React, { createContext, useContext, useState, useRef } from 'react'

interface VideoPlayerState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  playbackRate: number
  quality: string
  subtitles: boolean
  loading: boolean
}

interface VideoPlayerContextType {
  state: VideoPlayerState
  videoRef: React.RefObject<HTMLVideoElement>
  play: () => void
  pause: () => void
  togglePlay: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  setPlaybackRate: (rate: number) => void
  setQuality: (quality: string) => void
  toggleSubtitles: () => void
  toggleFullscreen: () => void
  updateProgress: (currentTime: number, duration: number) => void
  setLoading: (loading: boolean) => void
}

const VideoPlayerContext = createContext<VideoPlayerContextType | undefined>(undefined)

export function VideoPlayerProvider({ children }: { children: React.ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  
  const [state, setState] = useState<VideoPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    playbackRate: 1,
    quality: '1080p',
    subtitles: false,
    loading: false,
  })

  const play = () => {
    if (videoRef.current) {
      videoRef.current.play()
      setState(prev => ({ ...prev, isPlaying: true }))
    }
  }

  const pause = () => {
    if (videoRef.current) {
      videoRef.current.pause()
      setState(prev => ({ ...prev, isPlaying: false }))
    }
  }

  const togglePlay = () => {
    if (state.isPlaying) {
      pause()
    } else {
      play()
    }
  }

  const seek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setState(prev => ({ ...prev, currentTime: time }))
    }
  }

  const setVolume = (volume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = volume
      setState(prev => ({ ...prev, volume, isMuted: volume === 0 }))
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !state.isMuted
      videoRef.current.muted = newMuted
      setState(prev => ({ ...prev, isMuted: newMuted }))
    }
  }

  const setPlaybackRate = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate
      setState(prev => ({ ...prev, playbackRate: rate }))
    }
  }

  const setQuality = (quality: string) => {
    setState(prev => ({ ...prev, quality }))
  }

  const toggleSubtitles = () => {
    setState(prev => ({ ...prev, subtitles: !prev.subtitles }))
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen()
      setState(prev => ({ ...prev, isFullscreen: true }))
    } else {
      document.exitFullscreen()
      setState(prev => ({ ...prev, isFullscreen: false }))
    }
  }

  const updateProgress = (currentTime: number, duration: number) => {
    setState(prev => ({ ...prev, currentTime, duration }))
  }

  const setLoading = (loading: boolean) => {
    setState(prev => ({ ...prev, loading }))
  }

  const value: VideoPlayerContextType = {
    state,
    videoRef,
    play,
    pause,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setPlaybackRate,
    setQuality,
    toggleSubtitles,
    toggleFullscreen,
    updateProgress,
    setLoading,
  }

  return (
    <VideoPlayerContext.Provider value={value}>
      {children}
    </VideoPlayerContext.Provider>
  )
}

export function useVideoPlayer() {
  const context = useContext(VideoPlayerContext)
  if (context === undefined) {
    throw new Error('useVideoPlayer must be used within a VideoPlayerProvider')
  }
  return context
}