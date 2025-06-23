'use client';

import React, { useState } from 'react';
import { 
  MyList, 
  ContinueWatching, 
  ContinueWatchingRow,
  MyListButton,
  MyListIconButton,
  MyListCompactButton,
  useUser,
  useWatchProgress 
} from '@/components/user';
import { Show } from '@/types/user';

// Mock data for demonstration
const mockShows: Show[] = [
  {
    id: 1,
    title: 'Crash Landing on You',
    description: 'A South Korean heiress crash lands in North Korea and falls in love with a North Korean army officer.',
    category: 'kdrama',
    rating: 9.2,
    year: 2019,
    duration: 80,
    episodes: 16,
    image: '🇰🇷'
  },
  {
    id: 2,
    title: 'Hotel Del Luna',
    description: 'A supernatural romance about a hotel for ghosts and the cynical manager who runs it.',
    category: 'kdrama',
    rating: 8.9,
    year: 2019,
    duration: 90,
    episodes: 16,
    image: '🏨'
  },
  {
    id: 3,
    title: 'Your Name Engraved Herein',
    description: 'A coming-of-age story about two young men discovering their feelings for each other.',
    category: 'jdrama',
    rating: 8.5,
    year: 2020,
    duration: 114,
    image: '🇯🇵'
  },
  {
    id: 4,
    title: 'The Untamed',
    description: 'Two soulmates with different ideals find themselves in a battle between clans.',
    category: 'cdrama',
    rating: 9.1,
    year: 2019,
    duration: 45,
    episodes: 50,
    image: '🇨🇳'
  },
  {
    id: 5,
    title: 'Squid Game',
    description: 'Desperate people compete in childhood games for a chance to win a huge cash prize.',
    category: 'kdrama',
    rating: 8.7,
    year: 2021,
    duration: 60,
    episodes: 9,
    image: '🦑'
  },
  {
    id: 6,
    title: 'Alice in Borderland',
    description: 'A group of friends find themselves in an abandoned Tokyo where they must play deadly games.',
    category: 'jdrama',
    rating: 8.4,
    year: 2020,
    duration: 55,
    episodes: 8,
    image: '🃏'
  }
];

export function UserFeaturesDemo() {
  const [selectedTab, setSelectedTab] = useState<'mylist' | 'continue' | 'demo'>('mylist');
  const { myList, continueWatching, clearUserData, exportUserData } = useUser();
  const { startWatching, updateProgress } = useWatchProgress();

  // Add some demo data
  const addDemoData = () => {
    // Add shows to watch progress with different progress levels
    startWatching(mockShows[0], 4800); // 80 minutes * 60 seconds
    updateProgress(mockShows[0].id, 1200); // 20 minutes watched (25%)
    
    startWatching(mockShows[1], 5400); // 90 minutes * 60 seconds  
    updateProgress(mockShows[1].id, 3240); // 54 minutes watched (60%)
    
    startWatching(mockShows[4], 3600); // 60 minutes * 60 seconds
    updateProgress(mockShows[4].id, 3240); // 54 minutes watched (90%)
  };

  const exportData = () => {
    const data = exportUserData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'doramaflix-user-data.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1f2937 0%, #4c1d95 50%, #1f2937 100%)',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '32px',
      }}>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 'bold',
          color: 'white',
          textAlign: 'center',
          marginBottom: '16px',
          background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          DoramaFlix User Features Demo
        </h1>
        
        <p style={{
          color: 'rgba(255, 255, 255, 0.8)',
          textAlign: 'center',
          marginBottom: '24px',
          fontSize: '16px',
        }}>
          Netflix-style My List and Continue Watching functionality
        </p>

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          marginBottom: '24px',
        }}>
          {[
            { id: 'mylist', label: 'My List', count: myList.length },
            { id: 'continue', label: 'Continue Watching', count: continueWatching.length },
            { id: 'demo', label: 'Demo Controls', count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              style={{
                padding: '12px 20px',
                backgroundColor: selectedTab === tab.id 
                  ? '#7c3aed' 
                  : 'rgba(255, 255, 255, 0.1)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {tab.label}
              {tab.count !== null && (
                <span style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
      }}>
        {/* My List Tab */}
        {selectedTab === 'mylist' && (
          <div>
            <MyList showAll={true} />
          </div>
        )}

        {/* Continue Watching Tab */}
        {selectedTab === 'continue' && (
          <div>
            <ContinueWatching showAll={true} />
            <div style={{ marginTop: '48px' }}>
              <ContinueWatchingRow />
            </div>
          </div>
        )}

        {/* Demo Controls Tab */}
        {selectedTab === 'demo' && (
          <div>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '32px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}>
              <h2 style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '16px',
              }}>
                Demo Controls
              </h2>
              
              <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '24px',
              }}>
                <button
                  onClick={addDemoData}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Add Demo Progress Data
                </button>
                
                <button
                  onClick={exportData}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Export User Data
                </button>
                
                <button
                  onClick={clearUserData}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  Clear All Data
                </button>
              </div>
            </div>

            {/* Available Shows */}
            <div>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '16px',
              }}>
                Available Shows
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '16px',
              }}>
                {mockShows.map((show) => (
                  <div
                    key={show.id}
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                  >
                    <div style={{
                      aspectRatio: '16/9',
                      background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '48px',
                    }}>
                      {show.image}
                    </div>
                    
                    <div style={{ padding: '16px' }}>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: 'white',
                        marginBottom: '8px',
                      }}>
                        {show.title}
                      </h4>
                      
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

                      <p style={{
                        fontSize: '13px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        marginBottom: '16px',
                        lineHeight: '1.4',
                      }}>
                        {show.description}
                      </p>
                      
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                      }}>
                        <MyListButton show={show} variant="default" size="small" />
                        <MyListIconButton show={show} />
                        <MyListCompactButton show={show} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}