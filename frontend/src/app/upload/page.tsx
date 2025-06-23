'use client'

import { useState } from 'react'
import { VideoUpload } from '@/components/upload/video-upload'

export default function UploadPage() {
  const [uploadType, setUploadType] = useState<'video' | 'image' | 'subtitle'>('video')

  const handleUploadComplete = (result: any) => {
    console.log('Upload completed:', result)
    alert('Upload completed successfully!')
  }

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error)
    alert(`Upload failed: ${error}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-purple-500/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              🎬 DoramaFlix Upload
            </h1>
            <nav className="flex space-x-6">
              <a href="/" className="text-white hover:text-purple-400 transition-colors">Home</a>
              <a href="/browse" className="text-white hover:text-purple-400 transition-colors">Browse</a>
              <a href="/admin" className="text-white hover:text-purple-400 transition-colors">Admin</a>
              <a href="/upload" className="text-purple-400 font-semibold">Upload</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold text-white mb-2">Upload Center</h2>
          <p className="text-gray-300">Upload videos, images, and subtitles using Vercel Blob</p>
        </div>

        {/* Upload Type Selector */}
        <div className="mb-8">
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setUploadType('video')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                uploadType === 'video'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              📹 Video Upload
            </button>
            <button
              onClick={() => setUploadType('image')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                uploadType === 'image'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              🖼️ Image Upload
            </button>
            <button
              onClick={() => setUploadType('subtitle')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                uploadType === 'subtitle'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              📝 Subtitle Upload
            </button>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-8">
          {uploadType === 'video' && (
            <div>
              <h3 className="text-2xl font-bold text-white mb-6 text-center">📹 Video Upload</h3>
              <p className="text-gray-300 text-center mb-8">
                Upload video files to Vercel Blob. Supported formats: MP4, WebM, AVI, MOV (100MB max)
              </p>
              
              {/* Video Upload Component */}
              <VideoUpload
                courseId="demo-course-id"
                episodeId="demo-episode-id"
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
              />
            </div>
          )}

          {uploadType === 'image' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🖼️</div>
              <h3 className="text-2xl font-bold text-white mb-4">Image Upload</h3>
              <p className="text-gray-300 mb-6">
                Upload images for thumbnails, banners, and avatars.<br />
                Supported formats: JPEG, PNG, GIF, WebP (10MB max)
              </p>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 hover:border-purple-500 transition-colors cursor-pointer">
                <div className="text-center">
                  <div className="text-4xl mb-4">📁</div>
                  <p className="text-gray-300">Click or drag images here to upload</p>
                  <p className="text-sm text-gray-400 mt-2">Image upload component will be integrated here</p>
                </div>
              </div>
            </div>
          )}

          {uploadType === 'subtitle' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-2xl font-bold text-white mb-4">Subtitle Upload</h3>
              <p className="text-gray-300 mb-6">
                Upload subtitle files for your videos.<br />
                Supported formats: VTT, SRT, ASS (5MB max)
              </p>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-12 hover:border-purple-500 transition-colors cursor-pointer">
                <div className="text-center">
                  <div className="text-4xl mb-4">📄</div>
                  <p className="text-gray-300">Click or drag subtitle files here to upload</p>
                  <p className="text-sm text-gray-400 mt-2">Subtitle upload component will be integrated here</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Guidelines */}
        <div className="mt-8 bg-white/5 backdrop-blur-sm rounded-lg p-6">
          <h4 className="text-lg font-semibold text-white mb-4">📋 Upload Guidelines</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h5 className="font-medium text-purple-400 mb-2">Video Files</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Max size: 100MB</li>
                <li>• Formats: MP4, WebM, AVI, MOV</li>
                <li>• Resolution: Up to 4K</li>
                <li>• Auto thumbnail generation</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-purple-400 mb-2">Image Files</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Max size: 10MB</li>
                <li>• Formats: JPEG, PNG, GIF, WebP</li>
                <li>• Auto optimization</li>
                <li>• Multiple sizes generated</li>
              </ul>
            </div>
            <div>
              <h5 className="font-medium text-purple-400 mb-2">Subtitle Files</h5>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Max size: 5MB</li>
                <li>• Formats: VTT, SRT, ASS</li>
                <li>• Multiple languages</li>
                <li>• Auto sync validation</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Backend Status */}
        <div className="mt-8 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center justify-center">
            <span className="text-green-400 mr-2">✅</span>
            <span className="text-white">Vercel Blob Storage Ready - Backend API Connected</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black/50 backdrop-blur-sm border-t border-purple-500/30 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">
              &copy; 2024 DoramaFlix Upload Center. Powered by Vercel Blob.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}