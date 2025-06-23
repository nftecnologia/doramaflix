'use client'

import React, { useState } from 'react'
import EnhancedNetflixPlayer from './enhanced-netflix-player'

// Example usage component
export default function VideoPlayerExample() {
  const [currentEpisode, setCurrentEpisode] = useState(0)

  // Example episodes data
  const episodes = [
    {
      id: 1,
      number: 1,
      title: "Pilot",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
      nextEpisode: {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        title: "The Escape",
        thumbnail: "/thumbnails/episode-2.jpg"
      }
    },
    {
      id: 2,
      number: 2,
      title: "The Escape",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
      nextEpisode: {
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
        title: "New Beginnings",
        thumbnail: "/thumbnails/episode-3.jpg"
      }
    },
    {
      id: 3,
      number: 3,
      title: "New Beginnings",
      url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
      nextEpisode: undefined
    }
  ]

  // Example subtitles
  const subtitles = [
    {
      lang: 'pt-BR',
      label: 'Português (Brasil)',
      src: '/subtitles/pt-br.vtt'
    },
    {
      lang: 'en',
      label: 'English',
      src: '/subtitles/en.vtt'
    },
    {
      lang: 'es',
      label: 'Español',
      src: '/subtitles/es.vtt'
    }
  ]

  const handleNext = () => {
    if (currentEpisode < episodes.length - 1) {
      setCurrentEpisode(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentEpisode > 0) {
      setCurrentEpisode(prev => prev - 1)
    }
  }

  const handleEnded = () => {
    console.log('Episódio finalizado!')
    // Auto-play next episode or show recommendations
    if (currentEpisode < episodes.length - 1) {
      setTimeout(() => {
        handleNext()
      }, 1000)
    }
  }

  const currentEpisodeData = episodes[currentEpisode]

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#141414',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1200px',
        aspectRatio: '16/9',
        backgroundColor: '#000000',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 10px 50px rgba(0,0,0,0.5)'
      }}>
        <EnhancedNetflixPlayer
          url={currentEpisodeData.url}
          title="Mystery Drama Series"
          episode={currentEpisodeData}
          subtitles={subtitles}
          onNext={handleNext}
          onPrevious={currentEpisode > 0 ? handlePrevious : undefined}
          onEnded={handleEnded}
          autoplay={false}
          volume={0.8}
          autoHideControls={true}
          autoHideDelay={3000}
          enableKeyboardShortcuts={true}
          width="100%"
          height="100%"
        />
      </div>

      {/* Episode selector (for demo purposes) */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: 'rgba(42,42,42,0.9)',
        padding: '16px',
        borderRadius: '8px',
        color: '#ffffff',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ marginBottom: '12px', fontWeight: '600' }}>
          Episódios
        </div>
        {episodes.map((episode, index) => (
          <button
            key={episode.id}
            onClick={() => setCurrentEpisode(index)}
            style={{
              display: 'block',
              width: '100%',
              padding: '8px 12px',
              marginBottom: '4px',
              backgroundColor: currentEpisode === index ? '#e50914' : 'transparent',
              color: '#ffffff',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              if (currentEpisode !== index) {
                e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
              }
            }}
            onMouseLeave={(e) => {
              if (currentEpisode !== index) {
                e.currentTarget.style.backgroundColor = 'transparent'
              }
            }}
          >
            Ep. {episode.number}: {episode.title}
          </button>
        ))}
      </div>

      {/* Keyboard shortcuts info */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        backgroundColor: 'rgba(42,42,42,0.9)',
        padding: '16px',
        borderRadius: '8px',
        color: '#ffffff',
        backdropFilter: 'blur(10px)',
        fontSize: '12px',
        maxWidth: '300px'
      }}>
        <div style={{ marginBottom: '8px', fontWeight: '600' }}>
          Atalhos do Teclado:
        </div>
        <div>Espaço - Play/Pause</div>
        <div>← → - Avançar/Retroceder 10s</div>
        <div>↑ ↓ - Volume</div>
        <div>M - Silenciar</div>
        <div>F - Tela cheia</div>
        <div>C - Legendas</div>
      </div>
    </div>
  )
}