'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { FreeMode, Navigation, Autoplay } from 'swiper/modules'
import LazyLoad from '@/components/common/LazyLoad'
import LazySwiper, { LazySwiperSlide } from '@/components/common/LazySwiper'
import { ContentModalLazy, SearchComponentLazy } from '@/components/common/LazyComponents'
import { useContent } from '@/hooks/use-content'
import { motion, AnimatePresence } from 'framer-motion'

// Import Swiper styles
import 'swiper/css'
import 'swiper/css/free-mode'
import 'swiper/css/navigation'

export default function HomePage() {
  const [apiStatus, setApiStatus] = useState<string>('checking...')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedContent, setSelectedContent] = useState<any>(null)
  const [activeCategory, setActiveCategory] = useState(0)
  const [scrollY, setScrollY] = useState(0)
  
  // Use real content from API with loading states
  const { courses, categories: apiCategories, featuredContent, loading } = useContent()

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
    
    const handleScroll = () => {
      setScrollY(window.scrollY)
    }
    
    checkMobile()
    window.addEventListener('scroll', handleScroll)
    
    // Throttled resize listener for performance
    let timeoutId: NodeJS.Timeout
    const throttledResize = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(checkMobile, 150)
    }
    
    window.addEventListener('resize', throttledResize)
    
    return () => {
      window.removeEventListener('resize', throttledResize)
      window.removeEventListener('scroll', handleScroll)
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

  // Memoized category data to prevent unnecessary re-renders
  const categoryData = useMemo(() => {
    if (loading || courses.length === 0) return []
    
    const transformCourse = (course: any) => ({
      id: course.id,
      title: course.title,
      image: course.thumbnailUrl || 'https://via.placeholder.com/300x200?text=No+Image',
      rating: Math.round((course.rating || 0) * 10),
      year: course.year || new Date().getFullYear(),
      duration: `${course.totalEpisodes || 0} Episodes`
    })

    return [
      {
        title: "Trending Now",
        shows: courses.slice(0, 6).map(transformCourse)
      },
      {
        title: "K-Dramas for You", 
        shows: courses.filter(c => c.origin === 'korean').slice(0, 6).map(transformCourse)
      },
      {
        title: "Popular on DoramaFlix",
        shows: courses.slice(6, 12).map(transformCourse)
      }
    ]
  }, [courses, loading])

  // Optimized functions with useCallback to prevent unnecessary re-renders
  const getContentDetails = useCallback((id: number | string) => {
    if (id === 0 || id === '0') {
      return featuredContent
    }
    
    // Find content in courses
    const course = courses.find(c => c.id === id || c.id === id.toString())
    if (course) {
      return {
        id: course.id,
        title: course.title,
        description: course.description,
        year: course.year,
        rating: `${Math.round(course.rating * 10)}% Match`,
        duration: `${course.totalEpisodes} Episodes`,
        genre: course.genre ? course.genre.split(',') : ["Drama"],
        cast: ["Leading Actor", "Supporting Actor", "Guest Star"],
        director: "Director",
        maturityRating: "13+",
        episodes: course.totalEpisodes,
        seasons: 1
      }
    }
    
    // Default fallback
    return {
      id,
      title: "Unknown Title",
      description: "An amazing K-Drama that will captivate you with its compelling storyline, exceptional acting, and beautiful cinematography.",
      year: 2023,
      rating: "85% Match",
      duration: "16 Episodes",
      genre: ["Drama", "Romance", "Comedy"],
      cast: ["Actor 1", "Actor 2", "Actor 3"],
      director: "Director Name",
      maturityRating: "13+",
      episodes: 16,
      seasons: 1
    }
  }, [featuredContent, courses])

  const getMoreLikeThis = useCallback((currentId: number | string) => {
    return categoryData
      .flatMap(category => category.shows)
      .filter(show => show.id.toString() !== currentId.toString())
      .slice(0, 9)
  }, [categoryData])

  const openModal = useCallback((contentId: number | string) => {
    const content = getContentDetails(contentId)
    setSelectedContent(content)
    setIsModalOpen(true)
  }, [getContentDetails])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedContent(null)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white overflow-x-hidden">
      {/* Background gradient overlay */}
      <div className="fixed inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30 pointer-events-none" />
      
      {/* Modern Header */}
      <motion.header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrollY > 50 
            ? 'bg-black/95 backdrop-blur-xl border-b border-purple-500/20' 
            : 'bg-gradient-to-b from-black/80 via-black/20 to-transparent'
        }`}
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className={`flex items-center justify-between px-6 lg:px-12 transition-all duration-300 ${
          isMobile ? 'h-16' : 'h-20'
        }`}>
          {isMobile ? (
            <>
              <div className="flex items-center gap-4">
                <motion.button 
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="p-2 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-300"
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-2xl">{isMobileMenuOpen ? '✕' : '☰'}</span>
                </motion.button>
                <motion.h1 
                  className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  DORAMAFLIX
                </motion.h1>
              </div>
              
              <div className="flex items-center gap-3">
                <SearchComponentLazy />
                <motion.div 
                  className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center font-bold cursor-pointer shadow-lg hover:shadow-purple-500/25 transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  U
                </motion.div>
              </div>
            </>
          ) : (
            <>
              {/* Desktop Header */}
              <div className="flex items-center gap-8">
                <motion.h1 
                  className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent cursor-pointer"
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  DORAMAFLIX
                </motion.h1>
                
                {/* Navigation */}
                <nav className="flex gap-8">
                  {['Home', 'TV Shows', 'Movies', 'New & Popular', 'My List'].map((item, index) => (
                    <motion.a 
                      key={item}
                      href={item === 'Home' ? '/' : '/browse'}
                      className={`text-sm font-medium transition-all duration-300 hover:text-purple-400 relative group ${
                        item === 'Home' ? 'text-white' : 'text-gray-400'
                      }`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                    >
                      {item}
                      <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-500 group-hover:w-full transition-all duration-300" />
                    </motion.a>
                  ))}
                </nav>
              </div>

              {/* Right side */}
              <div className="flex items-center gap-6">
                {/* Search */}
                <SearchComponentLazy />
                
                {/* Notifications */}
                <motion.div 
                  className="relative cursor-pointer p-2 rounded-lg hover:bg-white/10 transition-all duration-300"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="text-xl">🔔</span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                </motion.div>
                
                {/* Profile */}
                <motion.div 
                  className="flex items-center gap-2 cursor-pointer group"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center font-bold shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                    U
                  </div>
                  <motion.span 
                    className="text-sm group-hover:rotate-180 transition-transform duration-300"
                    initial={{ rotate: 0 }}
                  >
                    ▼
                  </motion.span>
                </motion.div>
              </div>
            </>
          )}
        </div>
        
        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobile && isMobileMenuOpen && (
            <motion.div 
              className="absolute top-16 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-purple-500/20 shadow-2xl"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="p-6">
                <nav className="flex flex-col gap-2">
                  {['Home', 'TV Shows', 'Movies', 'New & Popular', 'My List'].map((item, index) => (
                    <motion.a 
                      key={item}
                      href={item === 'Home' ? '/' : '/browse'}
                      className={`text-lg font-medium py-4 px-4 rounded-xl transition-all duration-300 hover:bg-purple-500/20 hover:text-purple-400 border-b border-white/10 last:border-b-0 ${
                        item === 'Home' ? 'text-white bg-purple-500/10' : 'text-gray-400'
                      }`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 10 }}
                    >
                      {item}
                    </motion.a>
                  ))}
                </nav>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/50 via-black/30 to-pink-900/50" />
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
          <motion.div 
            className="absolute inset-0 bg-gradient-to-r from-purple-600/20 via-transparent to-pink-600/20"
            animate={{
              background: [
                'linear-gradient(45deg, rgba(147, 51, 234, 0.2), transparent, rgba(236, 72, 153, 0.2))',
                'linear-gradient(90deg, rgba(236, 72, 153, 0.2), transparent, rgba(147, 51, 234, 0.2))',
                'linear-gradient(135deg, rgba(147, 51, 234, 0.2), transparent, rgba(236, 72, 153, 0.2))'
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        <div className={`relative z-10 ${isMobile ? 'px-6 text-center' : 'px-12 max-w-4xl'} w-full`}>
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="space-y-6"
          >
            <motion.h1 
              className={`font-bold leading-tight bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent ${
                isMobile ? 'text-4xl md:text-5xl text-center' : 'text-6xl lg:text-7xl text-left'
              }`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
            >
              {featuredContent?.title || 'Discover Amazing'}
              <br />
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                {featuredContent?.title ? 'Content' : 'Asian Dramas'}
              </span>
            </motion.h1>

            <motion.div 
              className={`flex items-center gap-4 text-lg font-medium ${
                isMobile ? 'justify-center flex-wrap' : 'justify-start'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <div className="flex items-center gap-2 bg-green-500/20 px-3 py-1 rounded-full border border-green-500/30">
                <span className="text-green-400 font-bold">
                  {featuredContent?.rating ? `${featuredContent.rating}★` : '9.2★'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                <span className="text-purple-300">
                  {featuredContent?.year || '2024'}
                </span>
              </div>
              <div className="flex items-center gap-2 bg-pink-500/20 px-3 py-1 rounded-full border border-pink-500/30">
                <span className="text-pink-300">
                  {featuredContent?.totalEpisodes ? `${featuredContent.totalEpisodes} Episodes` : '16 Episodes'}
                </span>
              </div>
            </motion.div>

            <motion.p 
              className={`text-gray-300 leading-relaxed max-w-2xl ${
                isMobile ? 'text-base text-center line-clamp-3' : 'text-lg text-left'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              {featuredContent?.description || 
                'Immerse yourself in captivating stories, unforgettable characters, and stunning cinematography. Discover your next obsession with our curated collection of premium Asian dramas.'}
            </motion.p>

            <motion.div 
              className={`flex gap-4 ${isMobile ? 'flex-col items-center w-full' : 'flex-row items-center'}`}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <motion.button 
                className={`bg-white text-black font-bold py-4 px-8 rounded-xl flex items-center gap-3 hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl group ${
                  isMobile ? 'w-72' : 'w-auto'
                }`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1, duration: 0.6 }}
              >
                <div className="w-6 h-6 bg-black rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white text-sm">▶</span>
                </div>
                <span className="text-lg">Play Now</span>
              </motion.button>

              <motion.button 
                onClick={() => openModal(0)}
                className={`bg-white/20 backdrop-blur-sm text-white font-bold py-4 px-8 rounded-xl flex items-center gap-3 border border-white/30 hover:bg-white/30 hover:border-white/50 transition-all duration-300 group ${
                  isMobile ? 'w-72' : 'w-auto'
                }`}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2, duration: 0.6 }}
              >
                <div className="w-6 h-6 border-2 border-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white text-sm">i</span>
                </div>
                <span className="text-lg">More Info</span>
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* Gradient overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black via-black/50 to-transparent z-5" />
      </section>

      {/* Content Categories */}
      <main className="relative z-10 pt-8">
        {categoryData.map((category, categoryIndex) => (
          <motion.section 
            key={category.title} 
            className="mb-12"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: categoryIndex * 0.2, duration: 0.6 }}
          >
            <div className="px-6 lg:px-12 mb-6">
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                {category.title}
              </h2>
              <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
            </div>
            
            {isMobile ? (
              // Mobile: Swiper carousel
              <LazyLoad>
                <div className="px-6">
                  <LazySwiper
                    modules={[FreeMode]}
                    spaceBetween={12}
                    slidesPerView={2.2}
                    freeMode={true}
                    grabCursor={true}
                    breakpoints={{
                    480: {
                      slidesPerView: 2.5,
                      spaceBetween: 16
                    },
                    640: {
                      slidesPerView: 3.2,
                      spaceBetween: 20
                    }
                  }}
                >
                  {category.shows.map((show, index) => (
                    <LazySwiperSlide key={show.id}>
                      <motion.div 
                        onClick={() => openModal(show.id)}
                        className="relative group cursor-pointer"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="aspect-[2/3] bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl overflow-hidden shadow-lg group-hover:shadow-2xl group-hover:shadow-purple-500/25 transition-all duration-300">
                          <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white font-bold">
                            {show.title}
                          </div>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-3 rounded-b-xl">
                          <h3 className="text-white font-semibold text-sm mb-1 line-clamp-1">
                            {show.title}
                          </h3>
                          <div className="text-green-400 text-xs font-medium">
                            {show.rating}% Match
                          </div>
                        </div>
                      </motion.div>
                    </LazySwiperSlide>
                  ))}
                  </LazySwiper>
                </div>
              </LazyLoad>
            ) : (
              // Desktop: Grid layout
              <div className="px-6 lg:px-12">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {category.shows.map((show, index) => (
                    <motion.div 
                      key={show.id}
                      onClick={() => openModal(show.id)}
                      className="relative group cursor-pointer"
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <div className="aspect-[2/3] bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl overflow-hidden shadow-lg group-hover:shadow-2xl group-hover:shadow-purple-500/25 transition-all duration-300">
                        <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white font-bold p-4 text-center">
                          {show.title}
                        </div>
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 rounded-b-xl opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <h3 className="text-white font-semibold text-sm mb-2 line-clamp-2">
                          {show.title}
                        </h3>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-green-400 font-medium">
                            {show.rating}% Match
                          </span>
                          <span className="text-gray-300">
                            {show.year}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>
        ))}

        {/* System Status */}
        <motion.section 
          className="mx-6 lg:mx-12 my-16 p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            System Status
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'API', status: apiStatus, color: apiStatus.includes('✅') ? 'text-green-400' : 'text-red-400' },
              { label: 'Frontend', status: 'Running ✅', color: 'text-green-400' },
              { label: 'Database', status: 'Connected ✅', color: 'text-green-400' },
              { label: 'Upload', status: 'Ready ✅', color: 'text-green-400' }
            ].map((item, index) => (
              <motion.div 
                key={item.label}
                className="text-center p-4 bg-white/5 rounded-xl border border-white/10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1 + index * 0.1 }}
              >
                <div className="text-gray-400 text-sm mb-2">{item.label}</div>
                <div className={`font-medium ${item.color}`}>{item.status}</div>
              </motion.div>
            ))}
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="relative mt-20 bg-black/50 backdrop-blur-sm border-t border-purple-500/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-12">
          <div className="text-center">
            <motion.h2 
              className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              DORAMAFLIX
            </motion.h2>
            <p className="text-gray-400 mb-2">
              © 2024 DoramaFlix. Built with Next.js, TypeScript, and modern web technologies.
            </p>
            <p className="text-gray-500 text-sm">
              Frontend running on localhost:3001 | Backend API on localhost:3002
            </p>
          </div>
        </div>
        {isMobile && <div className="h-20" />}
      </footer>

      {/* Modal */}
      {isModalOpen && selectedContent && (
        <ContentModalLazy
          isOpen={isModalOpen}
          onClose={closeModal}
          content={selectedContent}
          moreLikeThis={getMoreLikeThis(selectedContent.id)}
        />
      )}
    </div>
  )
}