'use client';

import React, { useState } from 'react';
import { useMyList } from '@/hooks/use-my-list';
import { useWatchProgress } from '@/hooks/use-watch-progress';
import { Show } from '@/types/user';

interface MyListProps {
  title?: string;
  showAll?: boolean;
  maxItems?: number;
  className?: string;
}

export function MyList({ 
  title = "My List", 
  showAll = true, 
  maxItems = 20,
  className = "" 
}: MyListProps) {
  const { myList, removeFromMyList, getMyListByCategory, searchMyList } = useMyList();
  const { getProgressPercentage, isCompleted } = useWatchProgress();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Get filtered and searched items
  const getFilteredItems = () => {
    let items = searchQuery 
      ? searchMyList(searchQuery)
      : getMyListByCategory(selectedCategory);
    
    if (!showAll && maxItems) {
      items = items.slice(0, maxItems);
    }
    
    return items;
  };

  const filteredItems = getFilteredItems();

  // Get unique categories from my list
  const getCategories = () => {
    const categories = ['all'];
    const categorySet = new Set(myList.map(item => item.show.category));
    categories.push(...Array.from(categorySet));
    return categories;
  };

  const categories = getCategories();

  if (myList.length === 0) {
    return (
      <div className={`my-list-empty ${className}`}>
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(124, 58, 237, 0.2)',
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '16px',
          }}>
            📚
          </div>
          <h3 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '8px',
          }}>
            Your list is empty
          </h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '16px',
          }}>
            Add shows and movies to keep track of what you want to watch
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`my-list ${className}`}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <h2 style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: 'white',
          margin: 0,
        }}>
          {title}
          <span style={{
            marginLeft: '12px',
            fontSize: '16px',
            fontWeight: 'normal',
            color: 'rgba(255, 255, 255, 0.6)',
          }}>
            ({myList.length} {myList.length === 1 ? 'item' : 'items'})
          </span>
        </h2>
      </div>

      {/* Search and Filter */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '24px',
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search your list..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 40px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s ease',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#7c3aed';
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
          />
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '16px',
          }}>
            🔍
          </div>
        </div>

        {/* Category Filter */}
        <div style={{
          display: 'flex',
          gap: '8px',
          flexWrap: 'wrap',
        }}>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              style={{
                padding: '8px 16px',
                backgroundColor: selectedCategory === category 
                  ? '#7c3aed' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize',
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== category) {
                  (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== category) {
                  (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
            >
              {category === 'all' ? 'All' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Items Grid */}
      {filteredItems.length === 0 ? (
        <div style={{
          padding: '32px',
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.6)',
          fontSize: '16px',
        }}>
          {searchQuery ? 'No items match your search' : 'No items in this category'}
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
        }}>
          {filteredItems.map((item) => (
            <MyListCard
              key={item.show.id}
              show={item.show}
              addedAt={item.addedAt}
              progress={getProgressPercentage(item.show.id)}
              isCompleted={isCompleted(item.show.id)}
              onRemove={() => removeFromMyList(item.show.id)}
            />
          ))}
        </div>
      )}

      {/* Load More Button */}
      {!showAll && myList.length > maxItems && (
        <div style={{
          textAlign: 'center',
          marginTop: '32px',
        }}>
          <button
            style={{
              padding: '12px 24px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
          >
            View All ({myList.length} items)
          </button>
        </div>
      )}
    </div>
  );
}

// Individual card component
interface MyListCardProps {
  show: Show;
  addedAt: Date;
  progress: number;
  isCompleted: boolean;
  onRemove: () => void;
}

function MyListCard({ show, addedAt, progress, isCompleted, onRemove }: MyListCardProps) {
  const [isHovered, setIsHovered] = useState(false);

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
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail */}
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
        
        {/* Progress Bar */}
        {progress > 0 && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
          }}>
            <div
              style={{
                height: '100%',
                backgroundColor: isCompleted ? '#10b981' : '#ef4444',
                width: `${progress}%`,
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        )}

        {/* Completed Badge */}
        {isCompleted && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
          }}>
            ✓ Completed
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '8px',
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'white',
            margin: 0,
            lineHeight: '1.4',
            flex: 1,
          }}>
            {show.title}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            style={{
              marginLeft: '8px',
              padding: '4px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              cursor: 'pointer',
              borderRadius: '4px',
              fontSize: '16px',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.color = '#ef4444';
              (e.target as HTMLElement).style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.color = 'rgba(255, 255, 255, 0.6)';
              (e.target as HTMLElement).style.backgroundColor = 'transparent';
            }}
            title="Remove from My List"
          >
            ✕
          </button>
        </div>

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

        <div style={{
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.5)',
          marginBottom: '12px',
        }}>
          Added {new Date(addedAt).toLocaleDateString()}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
        }}>
          <button
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#6d28d9';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = '#7c3aed';
            }}
          >
            {progress > 0 && !isCompleted ? '▶️ Continue' : '▶️ Watch'}
          </button>
          
          <button
            style={{
              padding: '8px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            title="More options"
          >
            ⋯
          </button>
        </div>
      </div>
    </div>
  );
}