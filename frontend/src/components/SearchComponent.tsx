'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface SearchResult {
  id: number
  title: string
  year: number
  type: 'movie' | 'series'
  image: string
  rating: number
}

interface SearchComponentProps {
  onClose?: () => void
}

// Mock data completo para demonstrar funcionalidade
const MOCK_SEARCH_DATA: SearchResult[] = [
  { id: 1, title: "Squid Game", year: 2021, type: "series", image: "🦑", rating: 95 },
  { id: 2, title: "Hotel Del Luna", year: 2019, type: "series", image: "🏨", rating: 92 },
  { id: 3, title: "The Glory", year: 2022, type: "series", image: "⚡", rating: 89 },
  { id: 4, title: "Business Proposal", year: 2022, type: "series", image: "💼", rating: 87 },
  { id: 5, title: "Twenty-Five Twenty-One", year: 2022, type: "series", image: "🏐", rating: 94 },
  { id: 6, title: "Hometown Cha-Cha-Cha", year: 2021, type: "series", image: "🏖️", rating: 91 },
  { id: 7, title: "Descendants of the Sun", year: 2016, type: "series", image: "☀️", rating: 96 },
  { id: 8, title: "Goblin", year: 2016, type: "series", image: "👻", rating: 98 },
  { id: 9, title: "Reply 1988", year: 2015, type: "series", image: "📻", rating: 99 },
  { id: 10, title: "My Love from the Star", year: 2013, type: "series", image: "⭐", rating: 93 },
  { id: 11, title: "Secret Garden", year: 2010, type: "series", image: "🌿", rating: 90 },
  { id: 12, title: "Boys Over Flowers", year: 2009, type: "series", image: "🌸", rating: 88 },
  { id: 13, title: "King the Land", year: 2023, type: "series", image: "👑", rating: 85 },
  { id: 14, title: "The Summer I Turned Pretty", year: 2022, type: "series", image: "🌊", rating: 86 },
  { id: 15, title: "Moving", year: 2023, type: "series", image: "🏃", rating: 92 },
  { id: 16, title: "See You in My 19th Life", year: 2023, type: "series", image: "🔄", rating: 88 },
  { id: 17, title: "Destined with You", year: 2023, type: "series", image: "💫", rating: 84 },
  { id: 18, title: "My Demon", year: 2023, type: "series", image: "😈", rating: 87 },
  { id: 19, title: "Crash Landing on You", year: 2019, type: "series", image: "🪂", rating: 97 },
  { id: 20, title: "Hospital Playlist", year: 2020, type: "series", image: "🏥", rating: 94 },
  { id: 21, title: "Vincenzo", year: 2021, type: "series", image: "🕴️", rating: 93 },
  { id: 22, title: "Start-Up", year: 2020, type: "series", image: "🚀", rating: 88 },
  { id: 23, title: "It's Okay to Not Be Okay", year: 2020, type: "series", image: "🦋", rating: 91 },
  { id: 24, title: "True Beauty", year: 2020, type: "series", image: "💄", rating: 86 }
]

const POPULAR_SEARCHES = [
  "Squid Game", "Crash Landing on You", "Goblin", "Reply 1988", "The Glory"
]

export default function SearchComponent({ onClose }: SearchComponentProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showDropdown, setShowDropdown] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounced search function
  const debounce = useCallback((func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout
    return (...args: any[]) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(null, args), delay)
    }
  }, [])

  // Search function
  const performSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const results = MOCK_SEARCH_DATA.filter(item =>
      item.title.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8) // Limit to 8 results

    setSearchResults(results)
  }, [])

  // Debounced search
  const debouncedSearch = useCallback(
    debounce(performSearch, 300),
    [performSearch]
  )

  // Load search history from localStorage
  useEffect(() => {
    const savedHistory = localStorage.getItem('doramaflix-search-history')
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory))
    }
  }, [])

  // Save to search history
  const saveToHistory = (query: string) => {
    if (!query.trim()) return
    
    const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, 5)
    setSearchHistory(newHistory)
    localStorage.setItem('doramaflix-search-history', JSON.stringify(newHistory))
  }

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    setSelectedIndex(-1)
    
    if (query.trim()) {
      debouncedSearch(query)
      setShowDropdown(true)
    } else {
      setSearchResults([])
      setShowDropdown(false)
    }
  }

  // Handle search submit
  const handleSearchSubmit = (query: string = searchQuery) => {
    if (!query.trim()) return
    
    saveToHistory(query)
    setShowDropdown(false)
    setIsExpanded(false)
    setSearchQuery('')
    
    // In a real app, navigate to search results page
    console.log('Searching for:', query)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return

    const totalItems = searchResults.length + searchHistory.length + POPULAR_SEARCHES.length
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % totalItems)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev <= 0 ? totalItems - 1 : prev - 1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          let selectedQuery = ''
          if (selectedIndex < searchResults.length) {
            selectedQuery = searchResults[selectedIndex].title
          } else if (selectedIndex < searchResults.length + searchHistory.length) {
            selectedQuery = searchHistory[selectedIndex - searchResults.length]
          } else {
            selectedQuery = POPULAR_SEARCHES[selectedIndex - searchResults.length - searchHistory.length]
          }
          handleSearchSubmit(selectedQuery)
        } else {
          handleSearchSubmit()
        }
        break
      case 'Escape':
        e.preventDefault()
        setShowDropdown(false)
        setIsExpanded(false)
        setSearchQuery('')
        onClose?.()
        break
    }
  }

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false)
        if (!searchQuery.trim()) {
          setIsExpanded(false)
          onClose?.()
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [searchQuery, onClose])

  // Handle search icon click
  const handleSearchIconClick = () => {
    if (!isExpanded) {
      setIsExpanded(true)
      setTimeout(() => {
        inputRef.current?.focus()
        if (!searchQuery.trim() && (searchHistory.length > 0 || POPULAR_SEARCHES.length > 0)) {
          setShowDropdown(true)
        }
      }, 100)
    } else {
      if (searchQuery.trim()) {
        handleSearchSubmit()
      } else {
        setIsExpanded(false)
        setShowDropdown(false)
        onClose?.()
      }
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Search Input Container */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: isExpanded ? 'rgba(0, 0, 0, 0.7)' : 'transparent',
        border: isExpanded ? '1px solid rgba(255, 255, 255, 0.85)' : 'none',
        borderRadius: isExpanded ? '2px' : '0',
        transition: 'all 0.3s ease',
        width: isExpanded ? '250px' : 'auto',
        height: '34px',
        position: 'relative'
      }}>
        {/* Search Icon */}
        <div 
          onClick={handleSearchIconClick}
          style={{
            padding: isExpanded ? '0 8px 0 10px' : '0',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
            transition: 'all 0.3s ease'
          }}
        >
          🔍
        </div>

        {/* Search Input */}
        {isExpanded && (
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (!searchQuery.trim() && (searchHistory.length > 0 || POPULAR_SEARCHES.length > 0)) {
                setShowDropdown(true)
              }
            }}
            placeholder="Search titles, people, genres"
            style={{
              flex: 1,
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'white',
              fontSize: '14px',
              padding: '0 10px 0 0',
              fontFamily: 'inherit'
            }}
          />
        )}

        {/* Clear Button */}
        {isExpanded && searchQuery && (
          <div
            onClick={() => {
              setSearchQuery('')
              setSearchResults([])
              setShowDropdown(false)
              inputRef.current?.focus()
            }}
            style={{
              padding: '0 10px',
              cursor: 'pointer',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '16px',
              transition: 'color 0.2s ease'
            }}
          >
            ✕
          </div>
        )}
      </div>

      {/* Search Dropdown */}
      {showDropdown && isExpanded && (
        <div
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            maxHeight: '400px',
            overflowY: 'auto',
            zIndex: 1000,
            backdropFilter: 'blur(10px)'
          }}
        >
          {/* Search Results */}
          {searchResults.length > 0 && (
            <div>
              <div style={{
                padding: '8px 12px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.6)',
                textTransform: 'uppercase',
                fontWeight: '600',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                Search Results
              </div>
              {searchResults.map((result, index) => (
                <div
                  key={result.id}
                  onClick={() => handleSearchSubmit(result.title)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: selectedIndex === index ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    transition: 'background-color 0.2s ease',
                    borderBottom: index < searchResults.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
                  }}
                >
                  <div style={{
                    width: '40px',
                    height: '22px',
                    backgroundColor: '#333',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '12px',
                    fontSize: '12px'
                  }}>
                    {result.image}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '2px'
                    }}>
                      {result.title}
                    </div>
                    <div style={{
                      color: 'rgba(255, 255, 255, 0.6)',
                      fontSize: '12px'
                    }}>
                      {result.year} • {result.type === 'series' ? 'Series' : 'Movie'}
                    </div>
                  </div>
                  <div style={{
                    color: '#46d369',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    {result.rating}% Match
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Search History */}
          {searchHistory.length > 0 && !searchQuery.trim() && (
            <div>
              <div style={{
                padding: '8px 12px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.6)',
                textTransform: 'uppercase',
                fontWeight: '600',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                Recent Searches
              </div>
              {searchHistory.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleSearchSubmit(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: selectedIndex === searchResults.length + index ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    transition: 'background-color 0.2s ease',
                    borderBottom: index < searchHistory.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
                  }}
                >
                  <div style={{ marginRight: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    🕐
                  </div>
                  <div style={{
                    color: 'white',
                    fontSize: '14px',
                    flex: 1
                  }}>
                    {item}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Popular Searches */}
          {!searchQuery.trim() && (
            <div>
              <div style={{
                padding: '8px 12px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.6)',
                textTransform: 'uppercase',
                fontWeight: '600',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                Popular Searches
              </div>
              {POPULAR_SEARCHES.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleSearchSubmit(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: selectedIndex === searchResults.length + searchHistory.length + index ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    transition: 'background-color 0.2s ease',
                    borderBottom: index < POPULAR_SEARCHES.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none'
                  }}
                >
                  <div style={{ marginRight: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
                    🔥
                  </div>
                  <div style={{
                    color: 'white',
                    fontSize: '14px',
                    flex: 1
                  }}>
                    {item}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results */}
          {searchQuery.trim() && searchResults.length === 0 && (
            <div style={{
              padding: '20px 12px',
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '14px'
            }}>
              No results found for "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}