'use client'

import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { uploadClient, VideoUploadData, UploadProgress } from '@/lib/upload-client'
import { toast } from 'react-hot-toast'
import { Upload, Video, X, CheckCircle, AlertCircle } from 'lucide-react'

interface VideoUploadProps {
  courseId: string
  episodeId: string
  onUploadComplete?: (result: any) => void
  onUploadError?: (error: string) => void
}

export function VideoUpload({
  courseId,
  episodeId,
  onUploadComplete,
  onUploadError,
}: VideoUploadProps) {
  const [uploadState, setUploadState] = useState<{
    status: 'idle' | 'uploading' | 'success' | 'error'
    progress?: UploadProgress
    file?: File
    result?: any
    error?: string
  }>({ status: 'idle' })

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      // Validate file
      const validation = uploadClient.validateFile(file, 'video')
      if (!validation.valid) {
        toast.error(validation.error || 'Invalid file')
        onUploadError?.(validation.error || 'Invalid file')
        return
      }

      setUploadState({
        status: 'uploading',
        file,
        progress: { loaded: 0, total: file.size, percentage: 0 },
      })

      try {
        const data: VideoUploadData = {
          courseId,
          episodeId,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          description: `Video upload for episode ${episodeId}`,
        }

        const result = await uploadClient.uploadVideo(
          file,
          data,
          (progress) => {
            setUploadState(prev => ({
              ...prev,
              progress,
            }))
          }
        )

        setUploadState({
          status: 'success',
          file,
          result,
        })

        toast.success('Video uploaded successfully!')
        onUploadComplete?.(result)
      } catch (error: any) {
        const errorMessage = error.response?.data?.error?.message || 'Upload failed'
        
        setUploadState({
          status: 'error',
          file,
          error: errorMessage,
        })

        toast.error(errorMessage)
        onUploadError?.(errorMessage)
      }
    },
    [courseId, episodeId, onUploadComplete, onUploadError]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv'],
    },
    maxFiles: 1,
    maxSize: 100 * 1024 * 1024, // 100MB
  })

  const resetUpload = () => {
    setUploadState({ status: 'idle' })
  }

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'uploading':
        return (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
        )
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-500" />
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-500" />
      default:
        return <Video className="h-8 w-8 text-gray-400" />
    }
  }

  const getStatusText = () => {
    switch (uploadState.status) {
      case 'uploading':
        return `Uploading... ${uploadState.progress?.percentage || 0}%`
      case 'success':
        return 'Upload successful!'
      case 'error':
        return uploadState.error || 'Upload failed'
      default:
        return 'Drag and drop a video file here, or click to select'
    }
  }

  const getStatusColor = () => {
    switch (uploadState.status) {
      case 'uploading':
        return 'text-blue-500'
      case 'success':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 min-h-[200px] flex flex-col items-center justify-center
          ${isDragActive 
            ? 'border-brand-500 bg-brand-500/5' 
            : uploadState.status === 'success'
            ? 'border-green-500 bg-green-500/5'
            : uploadState.status === 'error'
            ? 'border-red-500 bg-red-500/5'
            : 'border-gray-600 hover:border-gray-500 bg-gray-900/50'
          }
          ${uploadState.status === 'uploading' ? 'pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {/* Status Icon */}
        <div className="mb-4">
          {getStatusIcon()}
        </div>

        {/* File Info */}
        {uploadState.file && (
          <div className="mb-4 text-sm">
            <p className="font-medium text-white">{uploadState.file.name}</p>
            <p className="text-gray-400">
              {uploadClient.formatFileSize(uploadState.file.size)}
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {uploadState.status === 'uploading' && uploadState.progress && (
          <div className="w-full mb-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{uploadClient.formatFileSize(uploadState.progress.loaded)}</span>
              <span>{uploadClient.formatFileSize(uploadState.progress.total)}</span>
            </div>
          </div>
        )}

        {/* Status Text */}
        <p className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </p>

        {/* Upload Instructions */}
        {uploadState.status === 'idle' && (
          <div className="mt-4 text-xs text-gray-400">
            <p>Supported formats: MP4, WebM, AVI, MOV</p>
            <p>Maximum file size: 100MB</p>
          </div>
        )}

        {/* Success Info */}
        {uploadState.status === 'success' && uploadState.result && (
          <div className="mt-4 text-xs text-gray-400">
            <p>File ID: {uploadState.result.id}</p>
            <p>Uploaded at: {new Date(uploadState.result.uploadedAt).toLocaleString()}</p>
          </div>
        )}

        {/* Reset Button */}
        {(uploadState.status === 'success' || uploadState.status === 'error') && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              resetUpload()
            }}
            className="mt-4 inline-flex items-center px-3 py-1 text-xs font-medium text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-3 w-3 mr-1" />
            Reset
          </button>
        )}
      </div>

      {/* Upload Result */}
      {uploadState.status === 'success' && uploadState.result && (
        <div className="mt-4 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-green-400 mb-2">Upload Details</h4>
          <div className="space-y-1 text-xs text-gray-300">
            <p><span className="text-gray-400">URL:</span> {uploadState.result.url}</p>
            <p><span className="text-gray-400">Size:</span> {uploadClient.formatFileSize(uploadState.result.size)}</p>
            <p><span className="text-gray-400">Type:</span> {uploadState.result.type}</p>
          </div>
        </div>
      )}
    </div>
  )
}