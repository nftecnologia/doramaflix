'use client';

import React, { useState } from 'react';
import { useWatchProgress } from '@/hooks/use-watch-progress';
import { Show, RecentlyWatched } from '@/types/user';

interface ContinueWatchingProps {
  title?: string;
  maxItems?: number;
  showAll?: boolean;
  className?: string;
}

export function ContinueWatching({ 
  title = "Continue Watching", 
  maxItems = 6,
  showAll = false,
  className = "" 
}: ContinueWatchingProps) {
  const { 
    getContinueWatchingShows, 
    getProgressPercentage, 
    formatTime, 
    getRemainingTime,
    removeFromContinueWatching,
    markAsCompleted 
  } = useWatchProgress();

  const continueWatchingShows = getContinueWatchingShows();
  const displayShows = showAll ? continueWatchingShows : continueWatchingShows.slice(0, maxItems);

  if (continueWatchingShows.length === 0) {
    return (
      <div className={`continue-watching-empty ${className}`}>
        <div style={{
          padding: '32px 24px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(124, 58, 237, 0.2)',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
          }}>
            ⏯️
          </div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '8px',
          }}>
            No shows in progress
          </h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '14px',
          }}>
            Start watching something to see your progress here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`continue-watching ${className}`}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
      }}>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 'bold',
          color: 'white',
          margin: 0,
        }}>
          {title}
        </h2>
        
        {continueWatchingShows.length > maxItems && !showAll && (
          <button
            style={{
              color: 'rgba(255, 255, 255, 0.8)',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '4px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.color = '#7c3aed';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.8)';
            }}
          >
            View All →
          </button>
        )}
      </div>

      {/* Shows Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '16px',
      }}>
        {displayShows.map((item) => (
          <ContinueWatchingCard
            key={item.show.id}
            item={item}
            progress={getProgressPercentage(item.show.id)}
            remainingTime={getRemainingTime(item.show.id)}
            formatTime={formatTime}
            onRemove={() => removeFromContinueWatching(item.show.id)}
            onMarkCompleted={() => markAsCompleted(item.show.id)}
          />
        ))}
      </div>
    </div>
  );
}

// Individual card component for continue watching
interface ContinueWatchingCardProps {
  item: RecentlyWatched;
  progress: number;
  remainingTime: number;
  formatTime: (seconds: number) => string;
  onRemove: () => void;
  onMarkCompleted: () => void;
}

function ContinueWatchingCard({ 
  item, 
  progress, 
  remainingTime, 
  formatTime, 
  onRemove, 
  onMarkCompleted 
}: ContinueWatchingCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const { show } = item;

  return (
    <div
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '12px',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transform: isHovered ? 'scale(1.02)' : 'scale(1)',
        position: 'relative',
      }}
      onMouseEnter={() => {
        setIsHovered(true);
        setShowActions(true);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        setShowActions(false);
      }}
    >
      {/* Thumbnail with Progress */}
      <div style={{
        aspectRatio: '16/9',
        background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '48px',
        position: 'relative',
      }}>
        {show.image || '🎬'}
        
        {/* Play Button Overlay */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '60px',
          height: '60px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          color: 'white',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.2s ease',
        }}>
          ▶️
        </div>

        {/* Progress Bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '6px',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
        }}>
          <div
            style={{
              height: '100%',
              backgroundColor: '#ef4444',
              width: `${progress}%`,
              transition: 'width 0.3s ease',
              position: 'relative',
            }}
          >
            {/* Progress indicator dot */}
            <div
              style={{
                position: 'absolute',
                right: '-3px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '12px',
                height: '12px',
                backgroundColor: '#ef4444',
                borderRadius: '50%',
                border: '2px solid white',
                opacity: isHovered ? 1 : 0,
                transition: 'opacity 0.2s ease',
              }}
            />
          </div>
        </div>

        {/* Progress Percentage */}
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '12px',
          fontSize: '12px',
          fontWeight: '600',
        }}>
          {Math.round(progress)}% watched
        </div>

        {/* Actions Menu */}
        {showActions && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            gap: '4px',
          }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMarkCompleted();
              }}
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'rgba(16, 185, 129, 0.9)',
                border: 'none',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              title="Mark as completed"
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = '#10b981';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(16, 185, 129, 0.9)';
              }}
            >
              ✓
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                border: 'none',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
              title="Remove from continue watching"
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.backgroundColor = '#ef4444';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.backgroundColor = 'rgba(239, 68, 68, 0.9)';
              }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          color: 'white',
          margin: '0 0 8px 0',
          lineHeight: '1.4',
        }}>
          {show.title}
        </h3>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '14px',
          color: 'rgba(255, 255, 255, 0.7)',
          marginBottom: '12px',
        }}>
          <span>{show.year}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>⭐</span>
            <span>{show.rating}</span>
          </div>
        </div>

        {/* Progress Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.5)',
          marginBottom: '16px',
        }}>
          <span>
            Last watched {new Date(item.watchedAt).toLocaleDateString()}
          </span>
          {remainingTime > 0 && (
            <span>
              {formatTime(remainingTime)} left
            </span>
          )}
        </div>

        {/* Action Button */}
        <button
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.backgroundColor = '#6d28d9';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.backgroundColor = '#7c3aed';
          }}
        >
          <span>▶️</span>
          <span>Continue Watching</span>
        </button>
      </div>
    </div>
  );
}

// Horizontal scrolling version for hero sections
export function ContinueWatchingRow({ 
  title = "Continue Watching", 
  className = "" 
}: { title?: string; className?: string }) {
  const { getContinueWatchingShows } = useWatchProgress();
  const continueWatchingShows = getContinueWatchingShows().slice(0, 10);

  if (continueWatchingShows.length === 0) {
    return null;
  }

  return (
    <div className={`continue-watching-row ${className}`}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: 'bold',
        color: 'white',
        marginBottom: '16px',
      }}>
        {title}
      </h2>
      
      <div style={{
        display: 'flex',
        gap: '16px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
        paddingBottom: '8px',
      }}>
        {continueWatchingShows.map((item) => (
          <ContinueWatchingRowCard key={item.show.id} item={item} />
        ))}
      </div>
    </div>
  );
}

// Compact card for horizontal row
function ContinueWatchingRowCard({ item }: { item: RecentlyWatched }) {
  const { getProgressPercentage } = useWatchProgress();
  const [isHovered, setIsHovered] = useState(false);
  const progress = getProgressPercentage(item.show.id);

  return (
    <div
      style={{
        minWidth: '200px',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={{
        aspectRatio: '16/9',
        background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '32px',
        position: 'relative',
      }}>
        {item.show.image || '🎬'}
        
        {/* Progress Bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
        }}>
          <div
            style={{
              height: '100%',
              backgroundColor: '#ef4444',
              width: `${progress}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>
      
      <div style={{ padding: '12px' }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'white',
          margin: '0 0 4px 0',
          lineHeight: '1.3',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.show.title}
        </h4>
        <p style={{
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.6)',
          margin: 0,
        }}>
          {Math.round(progress)}% watched
        </p>
      </div>
    </div>
  );
}