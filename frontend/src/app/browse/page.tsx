'use client'

import { useState } from 'react'

export default function BrowsePage() {
  const [selectedCategory, setSelectedCategory] = useState('all')

  const categories = [
    { id: 'all', name: 'All', emoji: '🎬' },
    { id: 'kdrama', name: 'K-Drama', emoji: '🇰🇷' },
    { id: 'jdrama', name: 'J-Drama', emoji: '🇯🇵' },
    { id: 'cdrama', name: 'C-Drama', emoji: '🇨🇳' },
    { id: 'romance', name: 'Romance', emoji: '💕' },
    { id: 'comedy', name: 'Comedy', emoji: '😄' },
    { id: 'thriller', name: 'Thriller', emoji: '🔥' },
  ]

  const mockShows = [
    { id: 1, title: 'Crash Landing on You', category: 'kdrama', rating: 9.2, year: 2019, image: '🇰🇷' },
    { id: 2, title: 'Hotel Del Luna', category: 'kdrama', rating: 8.9, year: 2019, image: '🏨' },
    { id: 3, title: 'Your Name Engraved Herein', category: 'jdrama', rating: 8.5, year: 2020, image: '🇯🇵' },
    { id: 4, title: 'The Untamed', category: 'cdrama', rating: 9.1, year: 2019, image: '🇨🇳' },
    { id: 5, title: 'Squid Game', category: 'kdrama', rating: 8.7, year: 2021, image: '🦑' },
    { id: 6, title: 'Alice in Borderland', category: 'jdrama', rating: 8.4, year: 2020, image: '🃏' },
  ]

  const filteredShows = selectedCategory === 'all' 
    ? mockShows 
    : mockShows.filter(show => show.category === selectedCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🎬 DoramaFlix
            </h1>
            <nav className="flex space-x-6">
              <a href="/" className="text-white hover:text-purple-400 transition-colors">Home</a>
              <a href="/browse" className="text-purple-400 font-semibold">Browse</a>
              <a href="#" className="text-white hover:text-purple-400 transition-colors">My List</a>
              <a href="/admin" className="text-white hover:text-purple-400 transition-colors">Admin</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Browse Collection</h2>
          <p className="text-gray-300">Discover amazing Asian dramas from around the world</p>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {category.emoji} {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative max-w-md">
            <input
              type="text"
              placeholder="Search dramas..."
              className="w-full bg-white/10 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
            />
            <div className="absolute right-3 top-2.5 text-gray-400">
              🔍
            </div>
          </div>
        </div>

        {/* Shows Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredShows.map((show) => (
            <div
              key={show.id}
              className="bg-white/5 backdrop-blur-sm rounded-lg overflow-hidden hover:bg-white/10 transition-all duration-300 hover:scale-105 cursor-pointer"
            >
              {/* Show Image Placeholder */}
              <div className="aspect-video bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-6xl">
                {show.image}
              </div>
              
              {/* Show Info */}
              <div className="p-4">
                <h3 className="text-lg font-semibold text-white mb-2 truncate">
                  {show.title}
                </h3>
                <div className="flex justify-between items-center text-sm text-gray-300">
                  <span>{show.year}</span>
                  <div className="flex items-center">
                    <span className="text-yellow-400">⭐</span>
                    <span className="ml-1">{show.rating}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <button className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium transition-colors">
                    ▶️ Watch Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <button className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-lg font-medium transition-colors">
            Load More Shows
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/50 backdrop-blur-sm border-t border-purple-500/30 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              &copy; 2024 DoramaFlix. Built with Next.js, TypeScript, and Vercel Blob.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}