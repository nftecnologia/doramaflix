'use client';

import React, { useState } from 'react';
import { useMyList } from '@/hooks/use-my-list';
import { Show } from '@/types/user';

interface MyListButtonProps {
  show: Show;
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function MyListButton({ 
  show, 
  variant = 'default', 
  className = "",
  size = 'medium'
}: MyListButtonProps) {
  const { isInMyList, toggleMyList } = useMyList();
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const inMyList = isInMyList(show.id);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    setIsLoading(true);
    try {
      toggleMyList(show);
    } finally {
      // Small delay to show loading state
      setTimeout(() => setIsLoading(false), 200);
    }
  };

  // Size configurations
  const sizeConfig = {
    small: {
      padding: '6px 12px',
      fontSize: '12px',
      iconSize: '14px',
      minWidth: '80px',
    },
    medium: {
      padding: '8px 16px',
      fontSize: '14px',
      iconSize: '16px',
      minWidth: '120px',
    },
    large: {
      padding: '12px 20px',
      fontSize: '16px',
      iconSize: '18px',
      minWidth: '140px',
    },
  };

  const config = sizeConfig[size];

  // Base button styles
  const baseStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    border: 'none',
    borderRadius: '6px',
    cursor: isLoading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    fontWeight: '500',
    opacity: isLoading ? 0.7 : 1,
    transform: isHovered && !isLoading ? 'scale(1.02)' : 'scale(1)',
    ...config,
  };

  // Variant-specific styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'compact':
        return {
          ...baseStyles,
          backgroundColor: inMyList 
            ? 'rgba(239, 68, 68, 0.9)' 
            : 'rgba(124, 58, 237, 0.9)',
          color: 'white',
          backdropFilter: 'blur(10px)',
          border: inMyList 
            ? '1px solid rgba(239, 68, 68, 0.3)' 
            : '1px solid rgba(124, 58, 237, 0.3)',
          minWidth: config.minWidth,
        };
      
      case 'icon-only':
        return {
          ...baseStyles,
          width: '40px',
          height: '40px',
          padding: '8px',
          borderRadius: '50%',
          backgroundColor: inMyList 
            ? 'rgba(239, 68, 68, 0.9)' 
            : 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          minWidth: 'auto',
        };
      
      default:
        return {
          ...baseStyles,
          backgroundColor: inMyList 
            ? 'rgba(255, 255, 255, 0.1)' 
            : 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          backdropFilter: 'blur(10px)',
          border: inMyList 
            ? '1px solid rgba(239, 68, 68, 0.5)' 
            : '1px solid rgba(255, 255, 255, 0.3)',
        };
    }
  };

  const buttonStyles = getVariantStyles();

  // Hover effect
  const handleMouseEnter = () => {
    if (!isLoading) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  // Get button content based on variant
  const getButtonContent = () => {
    if (variant === 'icon-only') {
      return (
        <span style={{ fontSize: config.iconSize }}>
          {isLoading ? '⏳' : inMyList ? '✓' : '+'}
        </span>
      );
    }

    return (
      <>
        <span style={{ fontSize: config.iconSize }}>
          {isLoading ? '⏳' : inMyList ? '✓' : '+'}
        </span>
        {variant !== 'compact' && (
          <span>
            {isLoading 
              ? 'Loading...' 
              : inMyList 
                ? 'In My List' 
                : 'My List'
            }
          </span>
        )}
        {variant === 'compact' && (
          <span>
            {isLoading 
              ? '...' 
              : inMyList 
                ? 'Added' 
                : 'Add'
            }
          </span>
        )}
      </>
    );
  };

  // Dynamic hover styles
  const getHoverStyles = () => {
    if (!isHovered || isLoading) return {};

    switch (variant) {
      case 'compact':
        return {
          backgroundColor: inMyList 
            ? '#ef4444' 
            : '#7c3aed',
        };
      
      case 'icon-only':
        return {
          backgroundColor: inMyList 
            ? '#ef4444' 
            : 'rgba(255, 255, 255, 0.2)',
        };
      
      default:
        return {
          backgroundColor: inMyList 
            ? 'rgba(239, 68, 68, 0.1)' 
            : 'rgba(255, 255, 255, 0.2)',
          borderColor: inMyList 
            ? 'rgba(239, 68, 68, 0.7)' 
            : 'rgba(255, 255, 255, 0.5)',
        };
    }
  };

  return (
    <button
      className={className}
      style={{
        ...buttonStyles,
        ...getHoverStyles(),
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      disabled={isLoading}
      title={
        isLoading 
          ? 'Loading...' 
          : inMyList 
            ? `Remove "${show.title}" from My List` 
            : `Add "${show.title}" to My List`
      }
    >
      {getButtonContent()}
    </button>
  );
}

// Specialized variants as separate components for convenience
export function MyListIconButton({ show, className = "" }: { show: Show; className?: string }) {
  return <MyListButton show={show} variant="icon-only" className={className} />;
}

export function MyListCompactButton({ show, className = "" }: { show: Show; className?: string }) {
  return <MyListButton show={show} variant="compact" size="small" className={className} />;
}

// Floating action button version
export function MyListFloatingButton({ show, className = "" }: { show: Show; className?: string }) {
  const { isInMyList } = useMyList();
  const inMyList = isInMyList(show.id);

  return (
    <div
      className={className}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1000,
      }}
    >
      <MyListButton 
        show={show} 
        variant="icon-only" 
        size="large"
        className="floating-my-list-btn"
      />
      
      {/* Tooltip */}
      <div
        style={{
          position: 'absolute',
          bottom: '100%',
          right: '0',
          marginBottom: '8px',
          padding: '6px 12px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          fontSize: '12px',
          borderRadius: '6px',
          whiteSpace: 'nowrap',
          opacity: 0,
          pointerEvents: 'none',
          transition: 'opacity 0.2s ease',
        }}
        className="floating-tooltip"
      >
        {inMyList ? 'Remove from My List' : 'Add to My List'}
      </div>
      
      <style jsx>{`
        .floating-my-list-btn:hover + .floating-tooltip {
          opacity: 1;
        }
      `}</style>
    </div>
  );
}