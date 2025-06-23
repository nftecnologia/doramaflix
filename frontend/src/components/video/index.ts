// Video Player Components
export { default as NetflixVideoPlayer } from './netflix-video-player'
export { default as EnhancedNetflixPlayer } from './enhanced-netflix-player'
export { default as VideoPlayerExample } from './video-player-example'

// Hooks
export { useNetflixPlayer } from '@/hooks/use-netflix-player'
export type { 
  UseNetflixPlayerOptions, 
  PlayerState, 
  PlayerActions 
} from '@/hooks/use-netflix-player'

// Types
export interface VideoPlayerProps {
  url: string
  title?: string
  episode?: {
    number: number
    title: string
    nextEpisode?: {
      url: string
      title: string
      thumbnail: string
    }
  }
  subtitles?: Array<{
    lang: string
    label: string
    src: string
  }>
  onNext?: () => void
  onPrevious?: () => void
  onEnded?: () => void
  autoplay?: boolean
  startTime?: number
  width?: string | number
  height?: string | number
  className?: string
}

export interface QualityOption {
  value: string
  label: string
}

export interface SubtitleTrack {
  lang: string
  label: string
  src: string
}

export const QUALITY_OPTIONS: QualityOption[] = [
  { value: 'auto', label: 'Auto' },
  { value: '1080p', label: '1080p HD' },
  { value: '720p', label: '720p HD' },
  { value: '480p', label: '480p' },
  { value: '360p', label: '360p' }
]

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

export const NETFLIX_COLORS = {
  primary: '#e50914',
  background: '#141414',
  text: '#ffffff',
  textSecondary: '#e5e5e5',
  surface: '#2a2a2a',
  surfaceTransparent: 'rgba(42,42,42,0.8)',
  overlay: 'rgba(0,0,0,0.8)',
  border: 'rgba(255,255,255,0.25)'
} as const