'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { toast } from 'react-hot-toast'
import { 
  Upload, 
  Video, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Pause, 
  Play, 
  RefreshCw,
  Clock,
  HardDrive,
  Zap,
  Settings
} from 'lucide-react'
import { chunkedUploadClient, ChunkedUploadProgress, ChunkedUploadOptions } from '@/lib/chunked-upload-client'
import { videoProcessingClient } from '@/lib/video-processing-client'

interface EnhancedVideoUploadProps {
  courseId: string
  episodeId: string
  onUploadComplete?: (result: any) => void
  onUploadError?: (error: string) => void
  onProcessingComplete?: (result: any) => void
  enableProcessing?: boolean
  processingOptions?: {
    qualities: ('360p' | '720p' | '1080p' | '4K')[]
    generateThumbnails: boolean
    thumbnailCount: number
    generateHLS: boolean
    generateDASH: boolean
  }
}

interface UploadState {
  status: 'idle' | 'uploading' | 'paused' | 'completed' | 'processing' | 'success' | 'error'
  file?: File
  sessionId?: string
  progress?: ChunkedUploadProgress
  processingProgress?: number
  processingStatus?: string
  result?: any
  error?: string
  canResume?: boolean
  uploadSpeed?: number
  eta?: number
  processingJobId?: string
}

export function EnhancedVideoUpload({
  courseId,
  episodeId,
  onUploadComplete,
  onUploadError,
  onProcessingComplete,
  enableProcessing = true,
  processingOptions = {
    qualities: ['360p', '720p', '1080p'],
    generateThumbnails: true,
    thumbnailCount: 3,
    generateHLS: true,
    generateDASH: false,
  },
}: EnhancedVideoUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' })
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false)
  const [chunkSize, setChunkSize] = useState(5 * 1024 * 1024) // 5MB default
  const [maxRetries, setMaxRetries] = useState(3)
  const uploadRef = useRef<{ abort: () => void } | null>(null)
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current)
      }
    }
  }, [])

  const startProcessingMonitor = useCallback((jobId: string) => {
    processingIntervalRef.current = setInterval(async () => {
      try {
        const progress = await videoProcessingClient.getProcessingProgress(jobId)
        
        setUploadState(prev => ({
          ...prev,
          processingProgress: progress.progress,
          processingStatus: progress.status,
        }))

        if (progress.status === 'completed') {
          const result = await videoProcessingClient.getProcessingJob(jobId)
          setUploadState(prev => ({
            ...prev,
            status: 'success',
            result,
          }))
          
          if (processingIntervalRef.current) {
            clearInterval(processingIntervalRef.current)
          }
          
          toast.success('Video processing completed!')
          onProcessingComplete?.(result)
        } else if (progress.status === 'failed') {
          setUploadState(prev => ({
            ...prev,
            status: 'error',
            error: progress.error || 'Processing failed',
          }))
          
          if (processingIntervalRef.current) {
            clearInterval(processingIntervalRef.current)
          }
          
          toast.error('Video processing failed')
          onUploadError?.(progress.error || 'Processing failed')
        }
      } catch (error) {
        console.error('Failed to get processing progress:', error)
      }
    }, 2000) // Poll every 2 seconds
  }, [onProcessingComplete, onUploadError])

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      // Validate file
      if (!file.type.startsWith('video/')) {
        toast.error('Please select a video file')
        onUploadError?.('Please select a video file')
        return
      }

      // Check file size (adjust max size for chunked upload - much larger files are supported)
      const maxSize = 10 * 1024 * 1024 * 1024 // 10GB
      if (file.size > maxSize) {
        toast.error('File size exceeds maximum limit (10GB)')
        onUploadError?.('File size exceeds maximum limit (10GB)')
        return
      }

      setUploadState({
        status: 'uploading',
        file,
        progress: {
          uploadedChunks: 0,
          totalChunks: Math.ceil(file.size / chunkSize),
          percentage: 0,
          uploadedBytes: 0,
          totalBytes: file.size,
          speed: 0,
          eta: 0,
        },
      })

      try {
        const uploadOptions: ChunkedUploadOptions = {
          chunkSize,
          maxRetries,
          onProgress: (progress) => {
            setUploadState(prev => ({
              ...prev,
              progress,
              uploadSpeed: progress.speed,
              eta: progress.eta,
            }))
          },
          onChunkComplete: (chunkIndex, totalChunks) => {
            console.log(`Chunk ${chunkIndex + 1}/${totalChunks} uploaded`)
          },
          onError: (error) => {
            console.error('Chunk upload error:', error)
          },
        }

        const metadata = {
          courseId,
          episodeId,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          description: `Video upload for episode ${episodeId}`,
          tags: [],
          language: 'en',
          processingOptions: enableProcessing ? processingOptions : undefined,
        }

        // Start chunked upload
        const uploadController = chunkedUploadClient.uploadVideo(file, metadata, uploadOptions)
        uploadRef.current = uploadController

        const uploadResult = await uploadController.promise

        setUploadState(prev => ({
          ...prev,
          status: enableProcessing ? 'processing' : 'success',
          sessionId: uploadResult.sessionId,
          result: uploadResult,
        }))

        toast.success('Video uploaded successfully!')
        onUploadComplete?.(uploadResult)

        // Start processing if enabled
        if (enableProcessing && uploadResult.processingJobId) {
          startProcessingMonitor(uploadResult.processingJobId)
        }

      } catch (error: any) {
        const errorMessage = error.message || 'Upload failed'
        
        setUploadState(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage,
          canResume: error.canResume || false,
        }))

        toast.error(errorMessage)
        onUploadError?.(errorMessage)
      }
    },
    [courseId, episodeId, chunkSize, maxRetries, enableProcessing, processingOptions, onUploadComplete, onUploadError, startProcessingMonitor]
  )

  const pauseUpload = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort()
      setUploadState(prev => ({
        ...prev,
        status: 'paused',
      }))
      toast('Upload paused')
    }
  }, [])

  const resumeUpload = useCallback(async () => {
    if (!uploadState.sessionId || !uploadState.file) return

    try {
      setUploadState(prev => ({
        ...prev,
        status: 'uploading',
      }))

      const resumeInfo = await chunkedUploadClient.resumeUpload(uploadState.sessionId)
      
      const uploadOptions: ChunkedUploadOptions = {
        chunkSize,
        maxRetries,
        resumeFromChunk: resumeInfo.nextChunkIndex,
        onProgress: (progress) => {
          setUploadState(prev => ({
            ...prev,
            progress,
            uploadSpeed: progress.speed,
            eta: progress.eta,
          }))
        },
      }

      const metadata = {
        courseId,
        episodeId,
        title: uploadState.file.name.replace(/\.[^/.]+$/, ''),
        description: `Video upload for episode ${episodeId}`,
        tags: [],
        language: 'en',
        processingOptions: enableProcessing ? processingOptions : undefined,
      }

      const uploadController = chunkedUploadClient.uploadVideo(uploadState.file, metadata, uploadOptions)
      uploadRef.current = uploadController

      const uploadResult = await uploadController.promise

      setUploadState(prev => ({
        ...prev,
        status: enableProcessing ? 'processing' : 'success',
        result: uploadResult,
      }))

      toast.success('Upload resumed and completed!')
      onUploadComplete?.(uploadResult)

      if (enableProcessing && uploadResult.processingJobId) {
        startProcessingMonitor(uploadResult.processingJobId)
      }

    } catch (error: any) {
      const errorMessage = error.message || 'Resume failed'
      
      setUploadState(prev => ({
        ...prev,
        status: 'error',
        error: errorMessage,
      }))

      toast.error(errorMessage)
      onUploadError?.(errorMessage)
    }
  }, [uploadState.sessionId, uploadState.file, chunkSize, maxRetries, courseId, episodeId, enableProcessing, processingOptions, onUploadComplete, onUploadError, startProcessingMonitor])

  const retryUpload = useCallback(() => {
    if (uploadState.file) {
      onDrop([uploadState.file])
    }
  }, [uploadState.file, onDrop])

  const resetUpload = useCallback(() => {
    if (uploadRef.current) {
      uploadRef.current.abort()
    }
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current)
    }
    setUploadState({ status: 'idle' })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.m4v'],
    },
    maxFiles: 1,
    disabled: uploadState.status === 'uploading' || uploadState.status === 'processing',
  })

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatSpeed = (bytesPerSecond: number) => {
    return formatFileSize(bytesPerSecond) + '/s'
  }

  const formatTime = (seconds: number) => {
    if (seconds === 0 || !isFinite(seconds)) return '0s'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
    if (minutes > 0) return `${minutes}m ${secs}s`
    return `${secs}s`
  }

  const getStatusIcon = () => {
    switch (uploadState.status) {
      case 'uploading':
        return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      case 'paused':
        return <Pause className="h-8 w-8 text-yellow-500" />
      case 'processing':
        return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
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
      case 'paused':
        return 'Upload paused'
      case 'processing':
        return `Processing... ${uploadState.processingProgress || 0}%`
      case 'success':
        return 'Upload and processing completed!'
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
      case 'paused':
        return 'text-yellow-500'
      case 'processing':
        return 'text-purple-500'
      case 'success':
        return 'text-green-500'
      case 'error':
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Advanced Options Toggle */}
      <div className="mb-4 flex justify-end">
        <button
          onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
          className="inline-flex items-center px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <Settings className="h-4 w-4 mr-1" />
          Advanced Options
        </button>
      </div>

      {/* Advanced Options Panel */}
      {showAdvancedOptions && (
        <div className="mb-6 p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
          <h3 className="text-sm font-medium text-white mb-3">Upload Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Chunk Size</label>
              <select
                value={chunkSize}
                onChange={(e) => setChunkSize(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                disabled={uploadState.status !== 'idle'}
              >
                <option value={1024 * 1024}>1MB</option>
                <option value={5 * 1024 * 1024}>5MB</option>
                <option value={10 * 1024 * 1024}>10MB</option>
                <option value={20 * 1024 * 1024}>20MB</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Max Retries</label>
              <select
                value={maxRetries}
                onChange={(e) => setMaxRetries(parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                disabled={uploadState.status !== 'idle'}
              >
                <option value={1}>1</option>
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-all duration-200 min-h-[250px] flex flex-col items-center justify-center
          ${isDragActive 
            ? 'border-blue-500 bg-blue-500/5' 
            : uploadState.status === 'success'
            ? 'border-green-500 bg-green-500/5'
            : uploadState.status === 'error'
            ? 'border-red-500 bg-red-500/5'
            : uploadState.status === 'processing'
            ? 'border-purple-500 bg-purple-500/5'
            : 'border-gray-600 hover:border-gray-500 bg-gray-900/50'
          }
          ${['uploading', 'processing'].includes(uploadState.status) ? 'pointer-events-none' : ''}
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
              {formatFileSize(uploadState.file.size)}
            </p>
          </div>
        )}

        {/* Upload Progress */}
        {uploadState.status === 'uploading' && uploadState.progress && (
          <div className="w-full mb-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.progress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Chunk {uploadState.progress.uploadedChunks}/{uploadState.progress.totalChunks}</span>
              <span>{uploadState.progress.percentage.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{formatFileSize(uploadState.progress.uploadedBytes)}</span>
              <span>{formatFileSize(uploadState.progress.totalBytes)}</span>
            </div>
            {uploadState.uploadSpeed && uploadState.eta && (
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span className="flex items-center">
                  <Zap className="h-3 w-3 mr-1" />
                  {formatSpeed(uploadState.uploadSpeed)}
                </span>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(uploadState.eta)} remaining
                </span>
              </div>
            )}
          </div>
        )}

        {/* Processing Progress */}
        {uploadState.status === 'processing' && (
          <div className="w-full mb-4">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadState.processingProgress || 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>Processing video...</span>
              <span>{(uploadState.processingProgress || 0).toFixed(1)}%</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Status: {uploadState.processingStatus || 'Starting...'}
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
            <p>Supported formats: MP4, WebM, AVI, MOV, MKV, and more</p>
            <p>Maximum file size: 10GB (chunked upload)</p>
            <p>Uploads can be paused and resumed</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap gap-2 justify-center">
          {uploadState.status === 'uploading' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                pauseUpload()
              }}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-yellow-400 hover:text-yellow-300 transition-colors"
            >
              <Pause className="h-3 w-3 mr-1" />
              Pause
            </button>
          )}

          {uploadState.status === 'paused' && uploadState.canResume && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                resumeUpload()
              }}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Play className="h-3 w-3 mr-1" />
              Resume
            </button>
          )}

          {uploadState.status === 'error' && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                retryUpload()
              }}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </button>
          )}

          {(['success', 'error', 'paused'].includes(uploadState.status)) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                resetUpload()
              }}
              className="inline-flex items-center px-3 py-1 text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-3 w-3 mr-1" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Upload Result Details */}
      {uploadState.status === 'success' && uploadState.result && (
        <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-green-400 mb-3">Upload & Processing Complete</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
            <div>
              <p className="text-gray-400 mb-1">Upload Details:</p>
              <p><span className="text-gray-400">File:</span> {uploadState.file?.name}</p>
              <p><span className="text-gray-400">Size:</span> {formatFileSize(uploadState.result.size)}</p>
              <p><span className="text-gray-400">URL:</span> {uploadState.result.url}</p>
            </div>
            {uploadState.result.processingResult && (
              <div>
                <p className="text-gray-400 mb-1">Processing Results:</p>
                <p><span className="text-gray-400">Qualities:</span> {Object.keys(uploadState.result.processingResult.outputUrls).join(', ')}</p>
                <p><span className="text-gray-400">Thumbnails:</span> {uploadState.result.processingResult.thumbnailUrls?.length || 0} generated</p>
                {uploadState.result.processingResult.hlsUrl && (
                  <p><span className="text-gray-400">HLS:</span> Available</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Details */}
      {uploadState.status === 'error' && (
        <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <h4 className="text-sm font-medium text-red-400 mb-2">Upload Error</h4>
          <p className="text-xs text-gray-300">{uploadState.error}</p>
          {uploadState.canResume && (
            <p className="text-xs text-yellow-400 mt-2">
              This upload can be resumed. Click "Resume" to continue from where it left off.
            </p>
          )}
        </div>
      )}
    </div>
  )
}