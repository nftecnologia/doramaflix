'use client'

import { useState } from 'react'

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('overview')

  const tabs = [
    { id: 'overview', name: 'Overview', emoji: '📊' },
    { id: 'content', name: 'Content Management', emoji: '🎬' },
    { id: 'uploads', name: 'Upload Center', emoji: '📤' },
    { id: 'users', name: 'User Management', emoji: '👥' },
    { id: 'analytics', name: 'Analytics', emoji: '📈' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🎬 DoramaFlix Admin
            </h1>
            <nav className="flex space-x-6">
              <a href="/" className="text-white hover:text-purple-400 transition-colors">Home</a>
              <a href="/browse" className="text-white hover:text-purple-400 transition-colors">Browse</a>
              <a href="#" className="text-white hover:text-purple-400 transition-colors">My List</a>
              <a href="/admin" className="text-purple-400 font-semibold">Admin</a>
            </nav>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h2>
          <p className="text-gray-300">Manage your DoramaFlix platform</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                {tab.emoji} {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6">
          {activeTab === 'overview' && (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Platform Overview</h3>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-purple-600/20 rounded-lg p-4">
                  <div className="text-3xl mb-2">📺</div>
                  <div className="text-2xl font-bold text-white">156</div>
                  <div className="text-sm text-gray-300">Total Shows</div>
                </div>
                <div className="bg-blue-600/20 rounded-lg p-4">
                  <div className="text-3xl mb-2">👥</div>
                  <div className="text-2xl font-bold text-white">2,847</div>
                  <div className="text-sm text-gray-300">Active Users</div>
                </div>
                <div className="bg-green-600/20 rounded-lg p-4">
                  <div className="text-3xl mb-2">⭐</div>
                  <div className="text-2xl font-bold text-white">4.8</div>
                  <div className="text-sm text-gray-300">Avg Rating</div>
                </div>
                <div className="bg-orange-600/20 rounded-lg p-4">
                  <div className="text-3xl mb-2">📊</div>
                  <div className="text-2xl font-bold text-white">89%</div>
                  <div className="text-sm text-gray-300">Uptime</div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-white mb-4">Recent Activity</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">New user registered</span>
                    <span className="text-sm text-gray-400">2 minutes ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Video uploaded: "Hotel Del Luna Ep 1"</span>
                    <span className="text-sm text-gray-400">15 minutes ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">System backup completed</span>
                    <span className="text-sm text-gray-400">1 hour ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Content Management</h3>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎬</div>
                <h4 className="text-xl font-semibold text-white mb-2">Content Management System</h4>
                <p className="text-gray-300 mb-6">Manage your drama collection, episodes, and metadata</p>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  Add New Content
                </button>
              </div>
            </div>
          )}

          {activeTab === 'uploads' && (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Upload Center</h3>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📤</div>
                <h4 className="text-xl font-semibold text-white mb-2">Vercel Blob Upload System</h4>
                <p className="text-gray-300 mb-6">Upload videos, images, and subtitles to your platform</p>
                <div className="space-y-3">
                  <button className="block w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    📹 Upload Video
                  </button>
                  <button className="block w-full bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    🖼️ Upload Image
                  </button>
                  <button className="block w-full bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                    📝 Upload Subtitles
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">User Management</h3>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <h4 className="text-xl font-semibold text-white mb-2">User Administration</h4>
                <p className="text-gray-300 mb-6">Manage user accounts, subscriptions, and permissions</p>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  View All Users
                </button>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Analytics & Insights</h3>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📈</div>
                <h4 className="text-xl font-semibold text-white mb-2">Platform Analytics</h4>
                <p className="text-gray-300 mb-6">View detailed statistics and user behavior insights</p>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
                  View Analytics Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black/50 backdrop-blur-sm border-t border-purple-500/30 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              &copy; 2024 DoramaFlix Admin Panel. Built with Next.js and TypeScript.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}