'use client'

import { useState, useEffect, useRef } from 'react'
import { Swiper, SwiperSlide } from 'swiper/react'
import { FreeMode, Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/pagination'
import ContentModal from '../components/common/ContentModal'
import SearchComponent from '@/components/SearchComponent'
import { useContent } from '@/hooks/use-content'

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<string>('checking...')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<any>(null)
  
  // Use real content from API  
  const { courses, categories: apiCategories, featuredContent } = useContent()

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1'
    const healthUrl = baseUrl.replace('/api/v1', '/health')
    
    fetch(healthUrl)
      .then(response => response.json())
      .then(data => {
        setApiStatus('connected ✅')
      })
      .catch(error => {
        setApiStatus('disconnected ❌')
      })
  }, [])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    
    // Throttled resize listener for performance
    let timeoutId: NodeJS.Timeout
    const throttledResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkMobile, 150)
    }
    
    window.addEventListener('resize', throttledResize)
    
    return () => {
      window.removeEventListener('resize', throttledResize)
      clearTimeout(timeoutId)
    }
  }, [])

  // Performance optimization: Close mobile menu when clicking outside
  useEffect(() => {
    if (!isMobile || !isMobileMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('header')) {
        setIsMobileMenuOpen(false)
      }
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isMobile, isMobileMenuOpen])

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (isMobile && isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobile, isMobileMenuOpen])

  // Format courses for category display
  const categoryData = [
    {
      title: "Trending Now",
      shows: courses.slice(0, 6).map(course => ({
        id: course.id,
        title: course.title,
        image: course.thumbnailUrl,
        rating: Math.round(course.rating * 10),
        year: course.year,
        duration: `${course.totalEpisodes} Episodes`
      }))
    },
    {
      title: "K-Dramas for You", 
      shows: courses.filter(c => c.origin === 'korean').slice(0, 6).map(course => ({
        id: course.id,
        title: course.title,
        image: course.thumbnailUrl,
        rating: Math.round(course.rating * 10),
        year: course.year,
        duration: `${course.totalEpisodes} Episodes`
      }))
    },
    {
      title: "Popular on DoramaFlix",
      shows: courses.slice(0, 6).map(course => ({
        id: course.id,
        title: course.title,
        image: course.thumbnailUrl,
        rating: Math.round(course.rating * 10),
        year: course.year,
        duration: `${course.totalEpisodes} Episodes`
      }))
    }
  ]

  const mockCategories = [
    {
      title: "Trending Now",
      shows: [
        { id: 1, title: "Squid Game", image: "🦑", rating: 95, year: 2021, duration: "9 Episodes" },
        { id: 2, title: "Hotel Del Luna", image: "🏨", rating: 92, year: 2019, duration: "16 Episodes" },
        { id: 3, title: "The Glory", image: "⚡", rating: 89, year: 2022, duration: "16 Episodes" },
        { id: 4, title: "Business Proposal", image: "💼", rating: 87, year: 2022, duration: "12 Episodes" },
        { id: 5, title: "Twenty-Five Twenty-One", image: "🏐", rating: 94, year: 2022, duration: "16 Episodes" },
        { id: 6, title: "Hometown Cha-Cha-Cha", image: "🏖️", rating: 91, year: 2021, duration: "16 Episodes" }
      ]
    },
    {
      title: "K-Dramas for You",
      shows: [
        { id: 7, title: "Descendants of the Sun", image: "☀️", rating: 96, year: 2016, duration: "16 Episodes" },
        { id: 8, title: "Goblin", image: "👻", rating: 98, year: 2016, duration: "16 Episodes" },
        { id: 9, title: "Reply 1988", image: "📻", rating: 99, year: 2015, duration: "20 Episodes" },
        { id: 10, title: "My Love from the Star", image: "⭐", rating: 93, year: 2013, duration: "21 Episodes" },
        { id: 11, title: "Secret Garden", image: "🌿", rating: 90, year: 2010, duration: "20 Episodes" },
        { id: 12, title: "Boys Over Flowers", image: "🌸", rating: 88, year: 2009, duration: "25 Episodes" }
      ]
    },
    {
      title: "New Releases",
      shows: [
        { id: 13, title: "King the Land", image: "👑", rating: 85, year: 2023, duration: "16 Episodes" },
        { id: 14, title: "The Summer I Turned Pretty", image: "🌊", rating: 86, year: 2022, duration: "14 Episodes" },
        { id: 15, title: "Moving", image: "🏃", rating: 92, year: 2023, duration: "20 Episodes" },
        { id: 16, title: "See You in My 19th Life", image: "🔄", rating: 88, year: 2023, duration: "12 Episodes" },
        { id: 17, title: "Destined with You", image: "💫", rating: 84, year: 2023, duration: "16 Episodes" },
        { id: 18, title: "My Demon", image: "😈", rating: 87, year: 2023, duration: "16 Episodes" }
      ]
    }
  ]

  // Dados detalhados para o modal - simulando dados de API
  const getContentDetails = (id: number | string) => {
    const contentDetails: { [key: number | string]: any } = {
      0: featuredContent, // Featured content
      1: {
        id: 1,
        title: "Squid Game",
        description: "Players compete in children's games with deadly consequences for a massive cash prize. 456 cash-strapped players accept a mysterious invitation to compete in children's games. Inside, a tempting prize awaits — with deadly high stakes.",
        year: 2021,
        rating: "95% Match",
        duration: "9 Episodes",
        genre: ["Thriller", "Drama", "Mystery"],
        cast: ["Lee Jung-jae", "Park Hae-soo", "Wi Ha-jun", "HoYeon Jung", "O Yeong-su", "Heo Sung-tae"],
        director: "Hwang Dong-hyuk",
        maturityRating: "18+",
        episodes: 9,
        seasons: 1
      },
      2: {
        id: 2,
        title: "Hotel Del Luna",
        description: "When he's invited to manage a hotel for dead souls, an elite hotelier gets to know the establishment's ancient owner and her strange world. A supernatural romance that follows a CEO who becomes the manager of a mysterious hotel that caters to ghosts.",
        year: 2019,
        rating: "92% Match",
        duration: "16 Episodes",
        genre: ["Fantasy", "Romance", "Comedy"],
        cast: ["IU", "Yeo Jin-goo", "Shin Jung-keun", "Bae Hae-seon", "Pyo Ye-jin", "Kim Jun-hyun"],
        director: "Oh Choong-hwan",
        maturityRating: "15+",
        episodes: 16,
        seasons: 1
      },
      8: {
        id: 8,
        title: "Goblin",
        description: "A goblin who needs a human bride to end his immortal life meets a grim reaper and a sprightly student in this fantasy romance. In his quest for a bride to break his immortal curse, a 939-year-old guardian of souls meets a grim reaper and a sprightly student with a tragic past.",
        year: 2016,
        rating: "98% Match",
        duration: "16 Episodes",
        genre: ["Fantasy", "Romance", "Drama"],
        cast: ["Gong Yoo", "Kim Go-eun", "Lee Dong-wook", "Yoo In-na", "Yook Sung-jae", "Lee El"],
        director: "Lee Eung-bok",
        maturityRating: "15+",
        episodes: 16,
        seasons: 1
      }
    }
    
    // Retorna dados detalhados se existir, senão retorna dados básicos
    return contentDetails[id] || {
      id,
      title: mockCategories.flatMap(c => c.shows).find(s => s.id.toString() === id.toString())?.title || "Unknown Title",
      description: "An amazing K-Drama that will captivate you with its compelling storyline, exceptional acting, and beautiful cinematography. This series explores themes of love, friendship, and personal growth in a uniquely Korean cultural context.",
      year: mockCategories.flatMap(c => c.shows).find(s => s.id.toString() === id.toString())?.year || 2023,
      rating: `${mockCategories.flatMap(c => c.shows).find(s => s.id.toString() === id.toString())?.rating || 85}% Match`,
      duration: mockCategories.flatMap(c => c.shows).find(s => s.id.toString() === id.toString())?.duration || "16 Episodes",
      genre: ["Drama", "Romance", "Comedy"],
      cast: ["Actor 1", "Actor 2", "Actor 3", "Actor 4", "Actor 5"],
      director: "Director Name",
      maturityRating: "13+",
      episodes: 16,
      seasons: 1
    }
  }

  // Função para obter conteúdos similares
  const getMoreLikeThis = (currentId: number | string) => {
    const allShows = mockCategories.flatMap(category => category.shows)
    return allShows.filter(show => show.id.toString() !== currentId.toString()).slice(0, 9)
  }

  // Função para abrir o modal
  const openModal = (contentId: number | string) => {
    const content = getContentDetails(contentId)
    setSelectedContent(content)
    setIsModalOpen(true)
  }

  // Função para fechar o modal
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedContent(null)
  }

  return (
    <div style={{ 
      backgroundColor: '#141414',
      minHeight: '100vh',
      color: 'white',
      // Mobile optimization: disable text selection for better touch experience
      userSelect: isMobile ? 'none' : 'auto',
      WebkitUserSelect: isMobile ? 'none' : 'auto',
      // Improve touch responsiveness
      touchAction: 'manipulation'
    }}>
      {/* Mobile-First Netflix Header */}
      <header style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 10%, transparent)',
        zIndex: 50,
        transition: 'background-color 0.4s ease'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: isMobile ? '0 4%' : '0 4% 0 4%',
          height: isMobile ? '56px' : '68px'
        }}>
          {/* Mobile Logo + Hamburger */}
          {isMobile ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  style={{ 
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    fontSize: '24px',
                    cursor: 'pointer',
                    padding: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: '44px',
                    minHeight: '44px'
                  }}
                >
                  {isMobileMenuOpen ? '✕' : '☰'}
                </button>
                <h1 style={{ 
                  fontSize: '1.4rem', 
                  fontWeight: 'bold',
                  color: '#E50914',
                  fontFamily: 'Netflix Sans, Arial, sans-serif',
                  margin: 0
                }}>
                  DORAMAFLIX
                </h1>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <SearchComponent />
                <div style={{ 
                  width: '32px', 
                  height: '32px', 
                  backgroundColor: '#E50914',
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}>
                  U
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Desktop Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '25px' }}>
                <h1 style={{ 
                  fontSize: '1.75rem', 
                  fontWeight: 'bold',
                  color: '#E50914',
                  fontFamily: 'Netflix Sans, Arial, sans-serif'
                }}>
                  DORAMAFLIX
                </h1>
                
                {/* Navigation */}
                <nav style={{ display: 'flex', gap: '20px' }}>
                  <a href="/" style={{ 
                    color: 'white', 
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '400',
                    transition: 'color 0.4s'
                  }}>Home</a>
                  <a href="/browse" style={{ 
                    color: '#b3b3b3', 
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.4s'
                  }}>TV Shows</a>
                  <a href="/browse" style={{ 
                    color: '#b3b3b3', 
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.4s'
                  }}>Movies</a>
                  <a href="/browse" style={{ 
                    color: '#b3b3b3', 
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.4s'
                  }}>New & Popular</a>
                  <a href="#" style={{ 
                    color: '#b3b3b3', 
                    textDecoration: 'none',
                    fontSize: '14px',
                    transition: 'color 0.4s'
                  }}>My List</a>
                </nav>
              </div>

              {/* Right side */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                {/* Search */}
                <SearchComponent />
                
                {/* Notifications */}
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '18px', cursor: 'pointer' }}>🔔</span>
                </div>
                
                {/* Profile */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    backgroundColor: '#E50914',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    U
                  </div>
                  <span style={{ fontSize: '12px' }}>▼</span>
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Mobile Menu Overlay */}
        {isMobile && isMobileMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '56px',
            left: 0,
            right: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            backdropFilter: 'blur(10px)',
            padding: '20px 4%',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <a href="/" style={{ 
                color: 'white', 
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: '500',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>Home</a>
              <a href="/browse" style={{ 
                color: '#b3b3b3', 
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: '500',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>TV Shows</a>
              <a href="/browse" style={{ 
                color: '#b3b3b3', 
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: '500',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>Movies</a>
              <a href="/browse" style={{ 
                color: '#b3b3b3', 
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: '500',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
              }}>New & Popular</a>
              <a href="#" style={{ 
                color: '#b3b3b3', 
                textDecoration: 'none',
                fontSize: '16px',
                fontWeight: '500',
                padding: '12px 0'
              }}>My List</a>
            </nav>
          </div>
        )}
      </header>

      {/* Mobile-Optimized Hero Section */}
      <section style={{
        position: 'relative',
        height: isMobile ? '80vh' : '100vh',
        backgroundImage: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.7)), url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'1920\' height=\'1080\' viewBox=\'0 0 1920 1080\'%3E%3Cdefs%3E%3ClinearGradient id=\'grad\' x1=\'0%25\' y1=\'0%25\' x2=\'100%25\' y2=\'100%25\'%3E%3Cstop offset=\'0%25\' style=\'stop-color:%23ff6b6b;stop-opacity:1\' /%3E%3Cstop offset=\'50%25\' style=\'stop-color:%234ecdc4;stop-opacity:1\' /%3E%3Cstop offset=\'100%25\' style=\'stop-color:%2345b7d1;stop-opacity:1\' /%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width=\'100%25\' height=\'100%25\' fill=\'url(%23grad)\' /%3E%3C/svg%3E")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: isMobile ? 'flex-end' : 'center',
        paddingTop: isMobile ? '56px' : '68px',
        paddingBottom: isMobile ? '40px' : '0'
      }}>
        <div style={{ 
          padding: isMobile ? '0 4%' : '0 4%',
          maxWidth: isMobile ? '100%' : '36%',
          zIndex: 2,
          width: isMobile ? '100%' : 'auto'
        }}>
          <h1 style={{
            fontSize: isMobile ? 'clamp(1.8rem, 8vw, 2.5rem)' : 'clamp(2rem, 5vw, 3.5rem)',
            fontWeight: '700',
            marginBottom: isMobile ? '0.8rem' : '1rem',
            lineHeight: '1.1',
            color: 'white',
            textShadow: '2px 2px 4px rgba(0,0,0,0.45)',
            textAlign: isMobile ? 'center' : 'left'
          }}>
            {featuredContent?.title || 'Loading...'}
          </h1>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '12px' : '16px',
            marginBottom: isMobile ? '0.8rem' : '1rem',
            color: 'white',
            fontSize: isMobile ? '0.9rem' : '1.1rem',
            justifyContent: isMobile ? 'center' : 'flex-start',
            flexWrap: 'wrap'
          }}>
            <span style={{ 
              color: '#46d369',
              fontWeight: '700'
            }}>
              {featuredContent?.rating ? `${featuredContent.rating}★` : 'N/A'}
            </span>
            <span>{featuredContent?.year}</span>
            <span>{featuredContent?.totalEpisodes ? `${featuredContent.totalEpisodes} Episodes` : ''}</span>
          </div>

          <p style={{
            fontSize: isMobile ? '0.9rem' : 'clamp(0.9rem, 1.4vw, 1.4rem)',
            lineHeight: '1.4',
            marginBottom: isMobile ? '1.5rem' : '2rem',
            maxWidth: isMobile ? '100%' : '90%',
            color: 'white',
            textShadow: '2px 2px 4px rgba(0,0,0,0.45)',
            textAlign: isMobile ? 'center' : 'left',
            display: isMobile ? '-webkit-box' : 'block',
            WebkitLineClamp: isMobile ? 3 : 'none',
            WebkitBoxOrient: isMobile ? 'vertical' : 'initial',
            overflow: isMobile ? 'hidden' : 'visible'
          }}>
            {featuredContent?.description || 'Loading content...'}
          </p>

          <div style={{
            display: 'flex',
            gap: isMobile ? '8px' : '12px',
            alignItems: 'center',
            justifyContent: isMobile ? 'center' : 'flex-start',
            flexDirection: isMobile ? 'column' : 'row',
            width: '100%'
          }}>
            <button style={{
              backgroundColor: 'white',
              color: 'black',
              border: 'none',
              padding: isMobile ? '16px 40px' : '12px 32px',
              borderRadius: '6px',
              fontSize: isMobile ? '1rem' : '1.1rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              minHeight: isMobile ? '48px' : 'auto',
              width: isMobile ? '280px' : 'auto',
              touchAction: 'manipulation'
            }}>
              ▶️ Play
            </button>
            
            <button 
              onClick={() => openModal(0)}
              style={{
                backgroundColor: 'rgba(109, 109, 110, 0.7)',
                color: 'white',
                border: 'none',
                padding: isMobile ? '16px 40px' : '12px 32px',
                borderRadius: '6px',
                fontSize: isMobile ? '1rem' : '1.1rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                minHeight: isMobile ? '48px' : 'auto',
                width: isMobile ? '280px' : 'auto',
                touchAction: 'manipulation'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(109, 109, 110, 0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(109, 109, 110, 0.7)'
              }}
            >
              ℹ️ More Info
            </button>
          </div>
        </div>

        {/* Fade to black */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: isMobile ? '4rem' : '7.4rem',
          background: 'linear-gradient(180deg, transparent, rgba(20,20,20,0.6), #141414)',
          zIndex: 1
        }} />
      </section>

      {/* Mobile-Optimized Content Rows with Swiper */}
      <main style={{ 
        backgroundColor: '#141414',
        position: 'relative',
        zIndex: 5
      }}>
        {categoryData.map((category, index) => (
          <section key={category.title} style={{ 
            marginBottom: isMobile ? '2rem' : '3rem',
            paddingLeft: isMobile ? '0' : '4%'
          }}>
            <h2 style={{
              color: '#e5e5e5',
              fontSize: isMobile ? '1.2rem' : '1.4rem',
              fontWeight: '700',
              marginBottom: '0.8rem',
              paddingLeft: isMobile ? '4%' : '0'
            }}>
              {category.title}
            </h2>
            
            {isMobile ? (
              // Mobile: Swiper with touch gestures
              <Swiper
                modules={[FreeMode]}
                spaceBetween={8}
                slidesPerView={2.2}
                freeMode={true}
                grabCursor={true}
                touchStartPreventDefault={false}
                style={{
                  paddingLeft: '4%',
                  paddingRight: '4%',
                  paddingBottom: '1rem'
                }}
                breakpoints={{
                  480: {
                    slidesPerView: 2.5,
                    spaceBetween: 10
                  },
                  640: {
                    slidesPerView: 3.2,
                    spaceBetween: 12
                  }
                }}
              >
                {category.shows.map((show) => (
                  <SwiperSlide key={show.id}>
                    <div 
                      onClick={() => openModal(show.id)}
                      style={{
                        width: '100%',
                        height: '120px',
                        backgroundColor: '#333',
                        borderRadius: '6px',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                        background: `linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexDirection: 'column',
                        touchAction: 'manipulation'
                      }}
                      onTouchStart={(e) => {
                        e.currentTarget.style.transform = 'scale(0.95)';
                      }}
                      onTouchEnd={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <div style={{ 
                        width: '100%', 
                        height: '70%', 
                        backgroundImage: `url(${show.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderTopLeftRadius: '6px',
                        borderTopRightRadius: '6px'
                      }}>
                      </div>
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.9))',
                        padding: '0.8rem 0.5rem 0.4rem',
                        borderBottomLeftRadius: '6px',
                        borderBottomRightRadius: '6px'
                      }}>
                        <h3 style={{
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          marginBottom: '0.2rem',
                          lineHeight: '1.2',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {show.title}
                        </h3>
                        <div style={{
                          color: '#46d369',
                          fontSize: '0.7rem',
                          fontWeight: '600'
                        }}>
                          {show.rating}% Match
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            ) : (
              // Desktop: Original scrollable design
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                overflowX: 'auto',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                paddingBottom: '1rem'
              }}>
                {category.shows.map((show) => (
                  <div 
                    key={show.id}
                    onClick={() => openModal(show.id)}
                    style={{
                      minWidth: '250px',
                      height: '141px',
                      backgroundColor: '#333',
                      borderRadius: '4px',
                      position: 'relative',
                      cursor: 'pointer',
                      transition: 'transform 0.3s ease',
                      background: `linear-gradient(135deg, #${Math.floor(Math.random()*16777215).toString(16)}, #${Math.floor(Math.random()*16777215).toString(16)})`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                      {show.image}
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                      padding: '1rem 0.75rem 0.5rem',
                      borderBottomLeftRadius: '4px',
                      borderBottomRightRadius: '4px'
                    }}>
                      <h3 style={{
                        color: 'white',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        marginBottom: '0.25rem',
                        lineHeight: '1.2'
                      }}>
                        {show.title}
                      </h3>
                      <div style={{
                        color: '#46d369',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {show.rating}% Match
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}

        {/* System Status - Minimal */}
        <section style={{ 
          padding: '2rem 4%',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          margin: '3rem 0'
        }}>
          <h2 style={{
            color: '#e5e5e5',
            fontSize: '1.4rem',
            fontWeight: '700',
            marginBottom: '1rem'
          }}>
            System Status
          </h2>
          <div style={{
            display: 'flex',
            gap: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{ color: '#b3b3b3', fontSize: '0.9rem' }}>
              API: <span style={{ color: apiStatus.includes('✅') ? '#46d369' : '#f40612' }}>{apiStatus}</span>
            </div>
            <div style={{ color: '#b3b3b3', fontSize: '0.9rem' }}>
              Frontend: <span style={{ color: '#46d369' }}>Running ✅</span>
            </div>
            <div style={{ color: '#b3b3b3', fontSize: '0.9rem' }}>
              Database: <span style={{ color: '#46d369' }}>Connected ✅</span>
            </div>
            <div style={{ color: '#b3b3b3', fontSize: '0.9rem' }}>
              Upload: <span style={{ color: '#46d369' }}>Ready ✅</span>
            </div>
          </div>
        </section>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.95)',
          backdropFilter: 'blur(10px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 40,
          padding: '8px 0',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom))'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center'
          }}>
            <button style={{
              background: 'none',
              border: 'none',
              color: 'white',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              minHeight: '48px',
              touchAction: 'manipulation'
            }}>
              <span style={{ fontSize: '20px' }}>🏠</span>
              Home
            </button>
            
            <button style={{
              background: 'none',
              border: 'none',
              color: '#b3b3b3',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              minHeight: '48px',
              touchAction: 'manipulation'
            }}>
              <span style={{ fontSize: '20px' }}>🔍</span>
              Search
            </button>
            
            <button style={{
              background: 'none',
              border: 'none',
              color: '#b3b3b3',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              minHeight: '48px',
              touchAction: 'manipulation'
            }}>
              <span style={{ fontSize: '20px' }}>📱</span>
              Downloads
            </button>
            
            <button style={{
              background: 'none',
              border: 'none',
              color: '#b3b3b3',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              minHeight: '48px',
              touchAction: 'manipulation'
            }}>
              <span style={{ fontSize: '20px' }}>👤</span>
              Profile
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(8px)',
        borderTop: '1px solid rgba(147, 51, 234, 0.3)',
        marginTop: '4rem',
        paddingBottom: isMobile ? '80px' : '0'
      }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '2rem 1rem' }}>
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#9ca3af' }}>
              &copy; 2024 DoramaFlix. Built with Next.js, TypeScript, and Vercel Blob.
            </p>
            <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              Frontend running on localhost:3003 | Backend API on localhost:3002
            </p>
          </div>
        </div>
      </footer>

      {/* Modal */}
      {isModalOpen && selectedContent && (
        <ContentModal
          isOpen={isModalOpen}
          onClose={closeModal}
          content={selectedContent}
          moreLikeThis={getMoreLikeThis(selectedContent.id)}
        />
      )}
    </div>
  )
}