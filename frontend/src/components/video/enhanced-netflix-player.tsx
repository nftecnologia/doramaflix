'use client'

import React from 'react'
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
import { useNetflixPlayer, UseNetflixPlayerOptions } from '@/hooks/use-netflix-player'

interface EnhancedNetflixPlayerProps extends UseNetflixPlayerOptions {
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
  onEnded?: () => void
  width?: string | number
  height?: string | number
  className?: string
}

const qualityOptions = [
  { value: 'auto', label: 'Auto' },
  { value: '1080p', label: '1080p' },
  { value: '720p', label: '720p' },
  { value: '480p', label: '480p' },
  { value: '360p', label: '360p' }
]

const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2]

export default function EnhancedNetflixPlayer({
  url,
  title,
  episode,
  subtitles = [],
  onNext,
  onPrevious,
  onEnded,
  width = '100%',
  height = '100%',
  className = '',
  ...playerOptions
}: EnhancedNetflixPlayerProps) {
  const {
    state,
    actions,
    containerRef,
    updateProgress,
    updateDuration,
    setBuffer,
    setError,
    resetControlsTimeout
  } = useNetflixPlayer(playerOptions)

  const playerRef = React.useRef<ReactPlayer>(null)

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = clickX / rect.width
    
    actions.seekTo(percentage)
    playerRef.current?.seekTo(percentage)
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    actions.setVolume(parseFloat(e.target.value))
  }

  const handleQualityChange = (quality: string) => {
    actions.setQuality(quality)
    actions.toggleSettings()
  }

  const handlePlaybackRateChange = (rate: number) => {
    actions.setPlaybackRate(rate)
    actions.toggleSettings()
  }

  const handleSkipIntro = () => {
    actions.skipIntro()
    playerRef.current?.seekTo(90 / state.duration)
  }

  const handleSkipCredits = () => {
    actions.skipCredits()
    if (onNext) {
      onNext()
    }
  }

  const handleSeekForward = () => {
    actions.seekForward()
    playerRef.current?.seekTo(state.played + (10 / state.duration))
  }

  const handleSeekBackward = () => {
    actions.seekBackward()
    playerRef.current?.seekTo(state.played - (10 / state.duration))
  }

  const handleEnded = () => {
    if (onEnded) {
      onEnded()
    } else if (onNext) {
      onNext()
    }
  }

  // Inline styles using Netflix design system
  const containerStyles: React.CSSProperties = {
    position: 'relative',
    width,
    height,
    backgroundColor: '#141414',
    borderRadius: '8px',
    overflow: 'hidden',
    fontFamily: 'Netflix Sans, Helvetica, Arial, sans-serif'
  }

  const controlsOverlayStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 40%, transparent 100%)',
    padding: '60px 24px 24px',
    opacity: state.showControls ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out',
    pointerEvents: state.showControls ? 'auto' : 'none'
  }

  const progressContainerStyles: React.CSSProperties = {
    width: '100%',
    height: '4px',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: '2px',
    marginBottom: '16px',
    cursor: 'pointer',
    position: 'relative'
  }

  const progressBufferStyles: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: '2px',
    width: `${state.loaded * 100}%`,
    transition: 'width 0.2s ease'
  }

  const progressFillStyles: React.CSSProperties = {
    height: '100%',
    backgroundColor: '#e50914',
    borderRadius: '2px',
    width: `${state.played * 100}%`,
    transition: state.seeking ? 'none' : 'width 0.2s ease',
    position: 'relative'
  }

  const progressThumbStyles: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    right: '-6px',
    width: '12px',
    height: '12px',
    backgroundColor: '#e50914',
    borderRadius: '50%',
    transform: 'translateY(-50%)',
    opacity: state.showControls ? 1 : 0,
    transition: 'opacity 0.3s ease'
  }

  const controlsRowStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: '#ffffff'
  }

  const controlGroupStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  }

  const buttonStyles: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    outline: 'none'
  }

  const volumeContainerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  }

  const volumeSliderStyles: React.CSSProperties = {
    width: '80px',
    height: '4px',
    background: 'rgba(255,255,255,0.25)',
    borderRadius: '2px',
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer'
  }

  const timeDisplayStyles: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: '500',
    color: '#e5e5e5',
    minWidth: '100px'
  }

  const skipButtonStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: '120px',
    right: '24px',
    backgroundColor: 'rgba(42,42,42,0.8)',
    color: '#ffffff',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '6px',
    padding: '12px 20px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backdropFilter: 'blur(10px)'
  }

  const nextEpisodeCardStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    backgroundColor: '#141414',
    border: '2px solid #ffffff',
    borderRadius: '8px',
    padding: '20px',
    maxWidth: '320px',
    color: '#ffffff',
    boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
  }

  const settingsMenuStyles: React.CSSProperties = {
    position: 'absolute',
    bottom: '70px',
    right: '24px',
    backgroundColor: 'rgba(42,42,42,0.95)',
    border: '1px solid rgba(255,255,255,0.25)',
    borderRadius: '8px',
    padding: '8px 0',
    minWidth: '160px',
    color: '#ffffff',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
  }

  const settingsItemStyles: React.CSSProperties = {
    padding: '12px 20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s ease'
  }

  const titleOverlayStyles: React.CSSProperties = {
    position: 'absolute',
    top: '24px',
    left: '24px',
    color: '#ffffff',
    fontSize: '28px',
    fontWeight: '700',
    textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
    maxWidth: '60%'
  }

  const episodeInfoStyles: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '500',
    marginTop: '8px',
    opacity: 0.9
  }

  return (
    <div 
      ref={containerRef}
      className={className}
      style={containerStyles}
      onMouseMove={resetControlsTimeout}
      onMouseEnter={actions.showControls}
      onMouseLeave={actions.hideControls}
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
        onReady={() => setBuffer(false)}
        onStart={() => setBuffer(false)}
        onPlay={() => actions.play()}
        onPause={() => actions.pause()}
        onBuffer={() => setBuffer(true)}
        onBufferEnd={() => setBuffer(false)}
        onProgress={updateProgress}
        onDuration={updateDuration}
        onEnded={handleEnded}
        onError={(error) => setError(error.toString())}
        config={{
          file: {
            attributes: {
              crossOrigin: 'anonymous'
            }
          }
        }}
      />

      {/* Loading indicator */}
      {state.buffer && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: '#ffffff',
          fontSize: '18px',
          fontWeight: '500'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255,255,255,0.3)',
            borderTop: '3px solid #e50914',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          Carregando...
        </div>
      )}

      {/* Title overlay */}
      {title && state.showControls && (
        <div style={titleOverlayStyles}>
          {title}
          {episode && (
            <div style={episodeInfoStyles}>
              Episódio {episode.number}: {episode.title}
            </div>
          )}
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
          style={{...skipButtonStyles, bottom: '180px'}}
          onClick={handleSkipCredits}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(42,42,42,0.8)'
          }}
        >
          Próximo Episódio
        </button>
      )}

      {/* Next episode card */}
      {state.showNextEpisode && episode?.nextEpisode && (
        <div style={nextEpisodeCardStyles}>
          <div style={{ marginBottom: '12px', fontSize: '14px', opacity: 0.8 }}>
            Próximo episódio
          </div>
          <div style={{ fontWeight: '600', marginBottom: '16px', fontSize: '16px' }}>
            {episode.nextEpisode.title}
          </div>
          <button
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.2s ease'
            }}
            onClick={onNext}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e5e5'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff'
            }}
          >
            Reproduzir
          </button>
        </div>
      )}

      {/* Controls overlay */}
      <div style={controlsOverlayStyles}>
        {/* Progress bar */}
        <div
          style={progressContainerStyles}
          onClick={handleSeekClick}
          onMouseEnter={(e) => {
            e.currentTarget.style.height = '6px'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.height = '4px'
          }}
        >
          <div style={progressBufferStyles} />
          <div style={progressFillStyles}>
            <div style={progressThumbStyles} />
          </div>
        </div>

        {/* Control buttons */}
        <div style={controlsRowStyles}>
          <div style={controlGroupStyles}>
            <button 
              style={{...buttonStyles, padding: '12px'}} 
              onClick={actions.togglePlay}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {state.playing ? (
                <PauseIcon style={{ width: '32px', height: '32px' }} />
              ) : (
                <PlayIcon style={{ width: '32px', height: '32px' }} />
              )}
            </button>

            {onPrevious && (
              <button 
                style={buttonStyles} 
                onClick={onPrevious}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <BackwardIcon style={{ width: '24px', height: '24px' }} />
              </button>
            )}

            {onNext && (
              <button 
                style={buttonStyles} 
                onClick={onNext}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <ForwardIcon style={{ width: '24px', height: '24px' }} />
              </button>
            )}

            <div style={volumeContainerStyles}>
              <button 
                style={buttonStyles} 
                onClick={actions.toggleMute}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                {state.muted || state.volume === 0 ? (
                  <SpeakerXMarkIcon style={{ width: '24px', height: '24px' }} />
                ) : (
                  <SpeakerWaveIcon style={{ width: '24px', height: '24px' }} />
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

            <div style={timeDisplayStyles}>
              {formatTime(state.played * state.duration)} / {formatTime(state.duration)}
            </div>
          </div>

          <div style={controlGroupStyles}>
            {subtitles.length > 0 && (
              <button 
                style={{
                  ...buttonStyles,
                  opacity: state.showSubtitles ? 1 : 0.7
                }} 
                onClick={actions.toggleSubtitles}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <ChatBubbleBottomCenterTextIcon style={{ width: '24px', height: '24px' }} />
              </button>
            )}

            <button 
              style={buttonStyles} 
              onClick={actions.toggleSettings}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <Cog6ToothIcon style={{ width: '24px', height: '24px' }} />
            </button>

            <button 
              style={buttonStyles} 
              onClick={actions.togglePictureInPicture}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <div style={{ 
                width: '24px', 
                height: '24px', 
                border: '2px solid currentColor',
                borderRadius: '3px',
                position: 'relative'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '10px',
                  height: '8px',
                  border: '1px solid currentColor',
                  borderRadius: '2px',
                  backgroundColor: 'currentColor'
                }} />
              </div>
            </button>

            <button 
              style={buttonStyles} 
              onClick={actions.toggleFullscreen}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              {state.fullscreen ? (
                <ArrowsPointingInIcon style={{ width: '24px', height: '24px' }} />
              ) : (
                <ArrowsPointingOutIcon style={{ width: '24px', height: '24px' }} />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Settings menu */}
      {state.showSettings && (
        <div style={settingsMenuStyles}>
          <div style={{ 
            ...settingsItemStyles, 
            fontWeight: '600', 
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            color: '#e5e5e5'
          }}>
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
          
          <div style={{ 
            ...settingsItemStyles, 
            fontWeight: '600', 
            borderBottom: '1px solid rgba(255,255,255,0.1)', 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            color: '#e5e5e5'
          }}>
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

      {/* Error overlay */}
      {state.error && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          backgroundColor: 'rgba(0,0,0,0.9)',
          color: '#ffffff',
          padding: '32px',
          borderRadius: '12px',
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          <div style={{ marginBottom: '16px', fontSize: '20px', fontWeight: '600' }}>
            Erro na reprodução
          </div>
          <div style={{ fontSize: '16px', opacity: 0.8, lineHeight: '1.5' }}>
            Não foi possível carregar o vídeo. Verifique sua conexão e tente novamente.
          </div>
        </div>
      )}

      {/* CSS for spin animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}