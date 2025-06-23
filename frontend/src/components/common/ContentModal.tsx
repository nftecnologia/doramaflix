'use client'

import React, { useEffect, useState } from 'react'

interface ContentModalProps {
  isOpen: boolean
  onClose: () => void
  content: {
    id: number
    title: string
    description: string
    year: number
    rating: string
    duration: string
    genre: string[]
    cast: string[]
    director: string
    maturityRating: string
    episodes?: number
    seasons?: number
    trailer?: string
  }
  moreLikeThis: Array<{
    id: number
    title: string
    image: string
    rating: number
    year: number
    duration: string
  }>
}

export default function ContentModal({ isOpen, onClose, content, moreLikeThis }: ContentModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      document.body.style.overflow = 'hidden'
    } else {
      setIsVisible(false)
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 300)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(3px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        opacity: isClosing ? 0 : 1,
        transition: 'opacity 0.3s ease-in-out'
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          backgroundColor: '#181818',
          borderRadius: '6px',
          width: '100%',
          maxWidth: '850px',
          maxHeight: '90vh',
          overflowY: 'auto',
          position: 'relative',
          transform: isClosing ? 'scale(0.8)' : 'scale(1)',
          transition: 'transform 0.3s ease-in-out',
          boxShadow: '0 4px 32px rgba(0, 0, 0, 0.6)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            backgroundColor: '#181818',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 10,
            fontSize: '18px',
            color: 'white',
            transition: 'backgroundColor 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#333'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#181818'
          }}
        >
          ✕
        </button>

        {/* Hero Section with Trailer */}
        <div
          style={{
            position: 'relative',
            height: '480px',
            background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)), 
                        linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderTopLeftRadius: '6px',
            borderTopRightRadius: '6px'
          }}
        >
          {/* Trailer placeholder */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: '50%',
              width: '80px',
              height: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '24px',
              color: 'white',
              transition: 'transform 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'
            }}
          >
            ▶️
          </div>

          {/* Content Info Overlay */}
          <div
            style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              background: 'linear-gradient(transparent, rgba(24, 24, 24, 0.8), #181818)',
              padding: '60px 48px 24px',
            }}
          >
            <h1
              style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'white',
                marginBottom: '16px',
                lineHeight: '1.1'
              }}
            >
              {content.title}
            </h1>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px'
              }}
            >
              <button
                style={{
                  backgroundColor: 'white',
                  color: 'black',
                  border: 'none',
                  padding: '12px 32px',
                  borderRadius: '4px',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.75)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                }}
              >
                ▶️ Play
              </button>

              <button
                style={{
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  padding: '10px 12px',
                  borderRadius: '50%',
                  fontSize: '18px',
                  cursor: 'pointer',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'white'
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                +
              </button>

              <button
                style={{
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  padding: '10px 12px',
                  borderRadius: '50%',
                  fontSize: '18px',
                  cursor: 'pointer',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'white'
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                👍
              </button>

              <button
                style={{
                  backgroundColor: 'transparent',
                  color: 'white',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  padding: '10px 12px',
                  borderRadius: '50%',
                  fontSize: '18px',
                  cursor: 'pointer',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'white'
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)'
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                👎
              </button>
            </div>
          </div>
        </div>

        {/* Content Details */}
        <div style={{ padding: '0 48px 48px' }}>
          {/* Main Info */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr',
              gap: '32px',
              marginBottom: '48px'
            }}
          >
            {/* Left Column - Description */}
            <div>
              {/* Match and Meta Info */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: '#e5e5e5'
                }}
              >
                <span
                  style={{
                    color: '#46d369',
                    fontWeight: '700',
                    fontSize: '16px'
                  }}
                >
                  {content.rating}
                </span>
                <span>{content.year}</span>
                <span
                  style={{
                    border: '1px solid #808080',
                    padding: '2px 4px',
                    fontSize: '11px',
                    color: '#808080'
                  }}
                >
                  {content.maturityRating}
                </span>
                <span>{content.duration}</span>
                <span
                  style={{
                    border: '1px solid #808080',
                    padding: '2px 4px',
                    fontSize: '11px',
                    color: '#808080'
                  }}
                >
                  HD
                </span>
              </div>

              <p
                style={{
                  color: 'white',
                  fontSize: '16px',
                  lineHeight: '1.5',
                  marginBottom: '16px'
                }}
              >
                {content.description}
              </p>
            </div>

            {/* Right Column - Cast & Crew */}
            <div>
              <div style={{ marginBottom: '16px' }}>
                <span style={{ color: '#777', fontSize: '14px' }}>Cast: </span>
                <span style={{ color: 'white', fontSize: '14px' }}>
                  {content.cast.slice(0, 3).join(', ')}
                  {content.cast.length > 3 && <span style={{ color: '#46d369' }}>, more...</span>}
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ color: '#777', fontSize: '14px' }}>Genres: </span>
                <span style={{ color: 'white', fontSize: '14px' }}>
                  {content.genre.join(', ')}
                </span>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <span style={{ color: '#777', fontSize: '14px' }}>Director: </span>
                <span style={{ color: 'white', fontSize: '14px' }}>
                  {content.director}
                </span>
              </div>

              {content.episodes && (
                <div style={{ marginBottom: '16px' }}>
                  <span style={{ color: '#777', fontSize: '14px' }}>Episodes: </span>
                  <span style={{ color: 'white', fontSize: '14px' }}>
                    {content.episodes}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* More Like This Section */}
          <div>
            <h3
              style={{
                color: 'white',
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '20px'
              }}
            >
              More Like This
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '16px'
              }}
            >
              {moreLikeThis.slice(0, 9).map((item) => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: '#2f2f2f',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)'
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      height: '120px',
                      background: `linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '2rem'
                    }}
                  >
                    {item.image}
                  </div>

                  {/* Info */}
                  <div style={{ padding: '12px' }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}
                    >
                      <span
                        style={{
                          color: '#46d369',
                          fontSize: '14px',
                          fontWeight: '700'
                        }}
                      >
                        {item.rating}% Match
                      </span>
                      <span
                        style={{
                          border: '1px solid #808080',
                          padding: '2px 4px',
                          fontSize: '10px',
                          color: '#808080'
                        }}
                      >
                        HD
                      </span>
                    </div>

                    <h4
                      style={{
                        color: 'white',
                        fontSize: '14px',
                        fontWeight: '600',
                        marginBottom: '4px',
                        lineHeight: '1.2'
                      }}
                    >
                      {item.title}
                    </h4>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#999'
                      }}
                    >
                      <span>{item.year}</span>
                      <span>{item.duration}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}