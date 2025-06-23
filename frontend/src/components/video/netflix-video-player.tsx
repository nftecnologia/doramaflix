'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import ReactPlayer from 'react-player'
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon, 
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Cog6ToothIcon,
  ForwardIcon,
  BackwardIcon,
  ChatBubbleBottomCenterTextIcon
} from '@heroicons/react/24/solid'

interface NetflixVideoPlayerProps {
  url: string
  title?: string
  episode?: {
    number: number
    title: string
    nextEpisode?: {
      url: string
      title: string
      thumbnail: string
    }
  }
  subtitles?: Array<{
    lang: string
    label: string
    src: string
  }>
  onNext?: () => void
  onPrevious?: () => void
  autoplay?: boolean
  startTime?: number
}

interface PlayerState {
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

const qualityOptions = [
  { value: 'auto', label: 'Auto' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
  { value: '360p', label: '360p' }
]

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2]

export default function NetflixVideoPlayer({
  url,
  title,
  episode,
  subtitles = [],
  onNext,
  onPrevious,
  autoplay = false,
  startTime = 0
}: NetflixVideoPlayerProps) {
  const playerRef = useRef<ReactPlayer>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout>()
  const progressRef = useRef<HTMLDivElement>(null)

  const [state, setState] = useState<PlayerState>({
    playing: autoplay,
    played: 0,
    loaded: 0,
    duration: 0,
    playbackRate: 1.0,
    volume: 0.8,
    muted: false,
    seeking: false,
    buffer: false,
    pip: false,
    fullscreen: false,
    showControls: true,
    showSettings: false,
    showSubtitles: false,
    selectedQuality: 'auto',
    selectedSubtitle: subtitles.length > 0 ? subtitles[0].lang : '',
    showSkipIntro: false,
    showSkipCredits: false,
    showNextEpisode: false,
    error: null
  })

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    setState(prev => ({ ...prev, showControls: true }))
    
    if (state.playing) {
      controlsTimeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, showControls: false, showSettings: false }))
      }, 3000)
    }
  }, [state.playing])

  useEffect(() => {
    resetControlsTimeout()
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [resetControlsTimeout])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target !== document.body) return
      
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          handlePlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleSeekBackward()
          break
        case 'ArrowRight':
          e.preventDefault()
          handleSeekForward()
          break
        case 'ArrowUp':
          e.preventDefault()
          handleVolumeUp()
          break
        case 'ArrowDown':
          e.preventDefault()
          handleVolumeDown()
          break
        case 'KeyM':
          handleMute()
          break
        case 'KeyF':
          handleFullscreen()
          break
        case 'KeyC':
          handleToggleSubtitles()
          break
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Skip intro/credits detection (mock logic - would be based on actual video analysis)
  useEffect(() => {
    const currentTime = state.played * state.duration
    
    // Mock skip intro detection (0:30 - 1:30)
    if (currentTime >= 30 && currentTime <= 90 && !state.showSkipIntro) {
      setState(prev => ({ ...prev, showSkipIntro: true }))
    } else if ((currentTime < 30 || currentTime > 90) && state.showSkipIntro) {
      setState(prev => ({ ...prev, showSkipIntro: false }))
    }

    // Mock skip credits detection (last 2 minutes)
    const remainingTime = state.duration - currentTime
    if (remainingTime <= 120 && remainingTime > 0 && !state.showSkipCredits) {
      setState(prev => ({ ...prev, showSkipCredits: true }))
    } else if (remainingTime > 120 && state.showSkipCredits) {
      setState(prev => ({ ...prev, showSkipCredits: false }))
    }

    // Show next episode in last 30 seconds
    if (remainingTime <= 30 && remainingTime > 0 && episode?.nextEpisode && !state.showNextEpisode) {
      setState(prev => ({ ...prev, showNextEpisode: true }))
    }
  }, [state.played, state.duration, episode?.nextEpisode])

  const handlePlayPause = () => {
    setState(prev => ({ ...prev, playing: !prev.playing }))
    resetControlsTimeout()
  }

  const handleSeekChange = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return
    
    const rect = progressRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    
    setState(prev => ({ ...prev, played: percentage }))
    playerRef.current?.seekTo(percentage)
  }

  const handleSeekForward = () => {
    const newPlayed = Math.min(state.played + (10 / state.duration), 1)
    setState(prev => ({ ...prev, played: newPlayed }))
    playerRef.current?.seekTo(newPlayed)
    resetControlsTimeout()
  }

  const handleSeekBackward = () => {
    const newPlayed = Math.max(state.played - (10 / state.duration), 0)
    setState(prev => ({ ...prev, played: newPlayed }))
    playerRef.current?.seekTo(newPlayed)
    resetControlsTimeout()
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const volume = parseFloat(e.target.value)
    setState(prev => ({ ...prev, volume, muted: volume === 0 }))
  }

  const handleVolumeUp = () => {
    const newVolume = Math.min(state.volume + 0.1, 1)
    setState(prev => ({ ...prev, volume: newVolume, muted: false }))
  }

  const handleVolumeDown = () => {
    const newVolume = Math.max(state.volume - 0.1, 0)
    setState(prev => ({ ...prev, volume: newVolume, muted: newVolume === 0 }))
  }

  const handleMute = () => {
    setState(prev => ({ ...prev, muted: !prev.muted }))
    resetControlsTimeout()
  }

  const handleFullscreen = () => {
    if (!state.fullscreen) {
      containerRef.current?.requestFullscreen()
    } else {
      document.exitFullscreen()
    }
    resetControlsTimeout()
  }

  const handlePictureInPicture = () => {
    setState(prev => ({ ...prev, pip: !prev.pip }))
    resetControlsTimeout()
  }

  const handleToggleSubtitles = () => {
    setState(prev => ({ ...prev, showSubtitles: !prev.showSubtitles }))
    resetControlsTimeout()
  }

  const handleQualityChange = (quality: string) => {
    setState(prev => ({ ...prev, selectedQuality: quality, showSettings: false }))
    resetControlsTimeout()
  }

  const handlePlaybackRateChange = (rate: number) => {
    setState(prev => ({ ...prev, playbackRate: rate, showSettings: false }))
    resetControlsTimeout()
  }

  const handleSkipIntro = () => {
    playerRef.current?.seekTo(90 / state.duration) // Skip to 1:30
    setState(prev => ({ ...prev, showSkipIntro: false }))
  }

  const handleSkipCredits = () => {
    if (onNext) {
      onNext()
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const playerStyles: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
    borderRadius: '8px',
    overflow: 'hidden'
  }

  const controlsStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
    padding: '60px 20px 20px',
    opacity: state.showControls ? 1 : 0,
    transition: 'opacity 0.3s ease',
    pointerEvents: state.showControls ? 'auto' : 'none'
  }

  const progressBarStyles: React.CSSProperties = {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: '2px',
    marginBottom: '12px',
    cursor: 'pointer',
    position: 'relative'
  }

  const progressFillStyles: React.CSSProperties = {
    height: '100%',
    backgroundColor: '#e50914',
    borderRadius: '2px',
    width: `${state.played * 100}%`,
    transition: state.seeking ? 'none' : 'width 0.1s ease'
  }

  const progressBufferStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: '2px',
    width: `${state.loaded * 100}%`
  }

  const controlsRowStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#ffffff'
  }

  const buttonStyles: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    transition: 'opacity 0.2s ease'
  }

  const volumeContainerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }

  const volumeSliderStyles: React.CSSProperties = {
    width: '80px',
    height: '4px',
    background: 'rgba(255,255,255,0.3)',
    borderRadius: '2px',
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer'
  }

  const skipButtonStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: '100px',
    right: '20px',
    backgroundColor: 'rgba(42,42,42,0.8)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '4px',
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }

  const nextEpisodeStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    backgroundColor: '#141414',
    border: '2px solid #ffffff',
    borderRadius: '8px',
    padding: '16px',
    maxWidth: '300px',
    color: '#ffffff'
  }

  const settingsMenuStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: '60px',
    right: '20px',
    backgroundColor: 'rgba(42,42,42,0.95)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '4px',
    padding: '8px 0',
    minWidth: '120px',
    color: '#ffffff'
  }

  const settingsItemStyles: React.CSSProperties = {
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s ease'
  }

  return (
    <div 
      ref={containerRef}
      style={playerStyles}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => setState(prev => ({ ...prev, showControls: false }))}
    >
      <ReactPlayer
        ref={playerRef}
        url={url}
        playing={state.playing}
        volume={state.muted ? 0 : state.volume}
        playbackRate={state.playbackRate}
        pip={state.pip}
        width="100%"
        height="100%"
        onReady={() => setState(prev => ({ ...prev, buffer: false }))}
        onStart={() => setState(prev => ({ ...prev, buffer: false }))}
        onPlay={() => setState(prev => ({ ...prev, playing: true }))}
        onPause={() => setState(prev => ({ ...prev, playing: false }))}
        onBuffer={() => setState(prev => ({ ...prev, buffer: true }))}
        onBufferEnd={() => setState(prev => ({ ...prev, buffer: false }))}
        onProgress={({ played, loaded }) => {
          if (!state.seeking) {
            setState(prev => ({ ...prev, played, loaded }))
          }
        }}
        onDuration={duration => setState(prev => ({ ...prev, duration }))}
        onEnded={() => {
          if (onNext) {
            onNext()
          }
        }}
        onError={(error) => setState(prev => ({ ...prev, error: error.toString() }))}
        config={{
          file: {
            attributes: {
              crossOrigin: 'anonymous'
            }
          }
        }}
      />

      {/* Loading overlay */}
      {state.buffer && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ffffff',
          fontSize: '18px'
        }}>
          Carregando...
        </div>
      )}

      {/* Skip intro button */}
      {state.showSkipIntro && (
        <button
          style={skipButtonStyles}
          onClick={handleSkipIntro}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(42,42,42,0.8)'
          }}
        >
          Pular Introdução
        </button>
      )}

      {/* Skip credits button */}
      {state.showSkipCredits && (
        <button
          style={{...skipButtonStyles, bottom: '160px'}}
          onClick={handleSkipCredits}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(42,42,42,0.8)'
          }}
        >
          Pular Créditos
        </button>
      )}

      {/* Next episode preview */}
      {state.showNextEpisode && episode?.nextEpisode && (
        <div style={nextEpisodeStyles}>
          <div style={{ marginBottom: '8px', fontSize: '12px', opacity: 0.8 }}>
            Próximo episódio
          </div>
          <div style={{ fontWeight: '600', marginBottom: '12px' }}>
            {episode.nextEpisode.title}
          </div>
          <button
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              border: 'none',
              borderRadius: '4px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%'
            }}
            onClick={onNext}
          >
            Reproduzir
          </button>
        </div>
      )}

      {/* Controls */}
      <div style={controlsStyles}>
        {/* Progress bar */}
        <div
          ref={progressRef}
          style={progressBarStyles}
          onClick={handleSeekChange}
        >
          <div style={progressBufferStyles} />
          <div style={progressFillStyles} />
        </div>

        {/* Control buttons */}
        <div style={controlsRowStyles}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button style={buttonStyles} onClick={handlePlayPause}>
              {state.playing ? (
                <PauseIcon style={{ width: '24px', height: '24px' }} />
              ) : (
                <PlayIcon style={{ width: '24px', height: '24px' }} />
              )}
            </button>

            {onPrevious && (
              <button style={buttonStyles} onClick={onPrevious}>
                <BackwardIcon style={{ width: '20px', height: '20px' }} />
              </button>
            )}

            {onNext && (
              <button style={buttonStyles} onClick={onNext}>
                <ForwardIcon style={{ width: '20px', height: '20px' }} />
              </button>
            )}

            <div style={volumeContainerStyles}>
              <button style={buttonStyles} onClick={handleMute}>
                {state.muted || state.volume === 0 ? (
                  <SpeakerXMarkIcon style={{ width: '20px', height: '20px' }} />
                ) : (
                  <SpeakerWaveIcon style={{ width: '20px', height: '20px' }} />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={state.muted ? 0 : state.volume}
                onChange={handleVolumeChange}
                style={volumeSliderStyles}
              />
            </div>

            <div style={{ fontSize: '14px', marginLeft: '16px' }}>
              {formatTime(state.played * state.duration)} / {formatTime(state.duration)}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {subtitles.length > 0 && (
              <button style={buttonStyles} onClick={handleToggleSubtitles}>
                <ChatBubbleBottomCenterTextIcon 
                  style={{ 
                    width: '20px', 
                    height: '20px',
                    opacity: state.showSubtitles ? 1 : 0.6
                  }} 
                />
              </button>
            )}

            <button 
              style={buttonStyles} 
              onClick={() => setState(prev => ({ ...prev, showSettings: !prev.showSettings }))}
            >
              <Cog6ToothIcon style={{ width: '20px', height: '20px' }} />
            </button>

            <button style={buttonStyles} onClick={handlePictureInPicture}>
              <div style={{ 
                width: '20px', 
                height: '20px', 
                border: '2px solid currentColor',
                borderRadius: '2px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '8px',
                  height: '6px',
                  border: '1px solid currentColor',
                  borderRadius: '1px',
                  backgroundColor: 'currentColor'
                }} />
              </div>
            </button>

            <button style={buttonStyles} onClick={handleFullscreen}>
              {state.fullscreen ? (
                <ArrowsPointingInIcon style={{ width: '20px', height: '20px' }} />
              ) : (
                <ArrowsPointingOutIcon style={{ width: '20px', height: '20px' }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Settings menu */}
      {state.showSettings && (
        <div style={settingsMenuStyles}>
          <div style={{ ...settingsItemStyles, fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            Qualidade
          </div>
          {qualityOptions.map(option => (
            <div
              key={option.value}
              style={{
                ...settingsItemStyles,
                backgroundColor: state.selectedQuality === option.value ? 'rgba(255,255,255,0.1)' : 'transparent'
              }}
              onClick={() => handleQualityChange(option.value)}
              onMouseEnter={(e) => {
                if (state.selectedQuality !== option.value) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (state.selectedQuality !== option.value) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {option.label}
            </div>
          ))}
          
          <div style={{ ...settingsItemStyles, fontWeight: '600', borderBottom: '1px solid rgba(255,255,255,0.1)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            Velocidade
          </div>
          {playbackRates.map(rate => (
            <div
              key={rate}
              style={{
                ...settingsItemStyles,
                backgroundColor: state.playbackRate === rate ? 'rgba(255,255,255,0.1)' : 'transparent'
              }}
              onClick={() => handlePlaybackRateChange(rate)}
              onMouseEnter={(e) => {
                if (state.playbackRate !== rate) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (state.playbackRate !== rate) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              {rate}x
            </div>
          ))}
        </div>
      )}

      {/* Title overlay */}
      {title && state.showControls && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: '#ffffff',
          fontSize: '24px',
          fontWeight: '600',
          textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
        }}>
          {title}
          {episode && (
            <div style={{ fontSize: '16px', fontWeight: '400', marginTop: '4px', opacity: 0.8 }}>
              Episódio {episode.number}: {episode.title}
            </div>
          )}
        </div>
      )}

      {/* Error overlay */}
      {state.error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: '#ffffff',
          padding: '20px',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '12px', fontSize: '18px', fontWeight: '600' }}>
            Erro na reprodução
          </div>
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            Não foi possível carregar o vídeo
          </div>
        </div>
      )}
    </div>
  )
}