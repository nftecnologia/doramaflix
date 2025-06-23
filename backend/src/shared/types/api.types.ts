/**
 * Shared API Types
 * Common types used across the application for API requests and responses
 */

// =============================================
// COMMON API TYPES
// =============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ApiError[];
  meta?: ApiMeta;
}

export interface ApiError {
  field?: string;
  code: string;
  message: string;
  details?: any;
}

export interface ApiMeta {
  timestamp: string;
  requestId?: string;
  pagination?: PaginationMeta;
  count?: number;
  total?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// =============================================
// AUTHENTICATION TYPES
// =============================================

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
}

export interface AuthResponse {
  user: UserProfile;
  tokens: TokenPair;
  subscription?: UserSubscription;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

// =============================================
// USER TYPES
// =============================================

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: 'admin' | 'manager' | 'student';
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileRequest {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'auto';
  autoplay: boolean;
  subtitles: boolean;
  quality: 'auto' | '480p' | '720p' | '1080p' | '1440p' | '2160p';
  volume: number;
  notifications: {
    email: boolean;
    push: boolean;
    newContent: boolean;
    recommendations: boolean;
    marketing: boolean;
  };
}

export interface UserStats {
  totalWatchTime: number;
  completedCourses: number;
  favoriteCount: number;
  currentStreak: number;
  longestStreak: number;
  joinedAt: string;
}

// =============================================
// CONTENT TYPES
// =============================================

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  trailerUrl?: string;
  contentType: 'course' | 'series' | 'movie' | 'documentary';
  status: 'draft' | 'published' | 'archived' | 'coming_soon';
  isPremium: boolean;
  price: number;
  durationMinutes: number;
  rating: number;
  totalViews: number;
  releaseDate?: string;
  createdAt: string;
  updatedAt: string;
  categories: Category[];
  tags: Tag[];
  seasons?: Season[];
  episodes?: Episode[];
  creator?: UserProfile;
}

export interface CreateContentRequest {
  title: string;
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  bannerUrl?: string;
  trailerUrl?: string;
  contentType: 'course' | 'series' | 'movie' | 'documentary';
  isPremium?: boolean;
  price?: number;
  releaseDate?: string;
  categoryIds: string[];
  tagNames: string[];
}

export interface UpdateContentRequest extends Partial<CreateContentRequest> {
  status?: 'draft' | 'published' | 'archived' | 'coming_soon';
}

export interface Season {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  seasonNumber: number;
  thumbnailUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  episodes: Episode[];
}

export interface Episode {
  id: string;
  courseId: string;
  seasonId?: string;
  title: string;
  description?: string;
  episodeNumber: number;
  videoUrl?: string;
  videoDuration?: number;
  videoSize?: number;
  videoQuality: string;
  thumbnailUrl?: string;
  isFree: boolean;
  isActive: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  course?: ContentItem;
  season?: Season;
}

export interface CreateEpisodeRequest {
  courseId: string;
  seasonId?: string;
  title: string;
  description?: string;
  episodeNumber: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  isFree?: boolean;
}

// =============================================
// CATEGORY TYPES
// =============================================

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  iconUrl?: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  courseCount?: number;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
  iconUrl?: string;
  color?: string;
  sortOrder?: number;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  courseCount?: number;
}

// =============================================
// SEARCH & FILTER TYPES
// =============================================

export interface SearchRequest extends PaginationQuery {
  query?: string;
  type?: 'course' | 'series' | 'movie' | 'documentary';
  categories?: string[];
  tags?: string[];
  isPremium?: boolean;
  minRating?: number;
  minDuration?: number;
  maxDuration?: number;
  releaseYear?: number;
  status?: 'published' | 'coming_soon';
}

export interface SearchResponse {
  items: ContentItem[];
  filters: SearchFilters;
  suggestions: string[];
  meta: PaginationMeta;
}

export interface SearchFilters {
  categories: Array<{ id: string; name: string; count: number }>;
  tags: Array<{ id: string; name: string; count: number }>;
  types: Array<{ type: string; count: number }>;
  ratings: Array<{ rating: number; count: number }>;
  years: Array<{ year: number; count: number }>;
}

// =============================================
// USER ACTIVITY TYPES
// =============================================

export interface WatchProgress {
  id: string;
  userId: string;
  episodeId: string;
  progressSeconds: number;
  completed: boolean;
  completedAt?: string;
  lastWatchedAt: string;
  episode: Episode;
}

export interface WatchHistoryItem {
  id: string;
  userId: string;
  episodeId: string;
  watchedAt: string;
  watchDuration: number;
  episode: Episode;
  course: ContentItem;
}

export interface UpdateProgressRequest {
  episodeId: string;
  progressSeconds: number;
  completed?: boolean;
}

export interface UserFavorite {
  userId: string;
  courseId: string;
  createdAt: string;
  course: ContentItem;
}

export interface UserReview {
  id: string;
  userId: string;
  courseId: string;
  rating: number;
  reviewText?: string;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;
  user: UserProfile;
  course: ContentItem;
}

export interface CreateReviewRequest {
  courseId: string;
  rating: number;
  reviewText?: string;
}

// =============================================
// SUBSCRIPTION TYPES
// =============================================

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingInterval: 'monthly' | 'yearly';
  trialDays: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'trial' | 'suspended';
  startsAt: string;
  endsAt: string;
  trialEndsAt?: string;
  cancelledAt?: string;
  plan: SubscriptionPlan;
}

export interface CreateSubscriptionRequest {
  planId: string;
  paymentMethodId?: string;
}

// =============================================
// PAYMENT TYPES
// =============================================

export interface Payment {
  id: string;
  userId: string;
  subscriptionId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  paymentMethod: 'stripe' | 'mercadopago' | 'paypal' | 'bank_transfer';
  externalPaymentId?: string;
  paymentDate?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentRequest {
  subscriptionId: string;
  paymentMethodId: string;
  amount: number;
  currency?: string;
}

// =============================================
// RECOMMENDATION TYPES
// =============================================

export interface RecommendationRequest {
  userId: string;
  type?: 'similar' | 'trending' | 'for_you' | 'continue_watching';
  limit?: number;
  excludeWatched?: boolean;
}

export interface RecommendationResponse {
  items: ContentItem[];
  reason: string;
  confidence: number;
  type: 'similar' | 'trending' | 'for_you' | 'continue_watching';
}

// =============================================
// ANALYTICS TYPES
// =============================================

export interface AnalyticsOverview {
  totalUsers: number;
  activeUsers: number;
  totalContent: number;
  totalViews: number;
  totalWatchTime: number;
  subscriptionRevenue: number;
  topCategories: Array<{ name: string; count: number }>;
  recentActivity: WatchHistoryItem[];
}

export interface ContentAnalytics {
  contentId: string;
  title: string;
  views: number;
  uniqueViewers: number;
  totalWatchTime: number;
  averageWatchTime: number;
  completionRate: number;
  rating: number;
  reviewCount: number;
  viewsByDay: Array<{ date: string; views: number }>;
  viewerRetention: Array<{ timestamp: number; percentage: number }>;
}

export interface UserAnalytics {
  userId: string;
  totalWatchTime: number;
  sessionsCount: number;
  favoriteGenres: string[];
  watchingPatterns: {
    hourDistribution: Array<{ hour: number; count: number }>;
    dayDistribution: Array<{ day: string; count: number }>;
  };
  deviceStats: Array<{ device: string; count: number }>;
}

// =============================================
// ADMIN TYPES
// =============================================

export interface AdminDashboard {
  overview: AnalyticsOverview;
  recentUsers: UserProfile[];
  recentContent: ContentItem[];
  systemHealth: {
    database: 'healthy' | 'warning' | 'error';
    redis: 'healthy' | 'warning' | 'error';
    storage: 'healthy' | 'warning' | 'error';
    payments: 'healthy' | 'warning' | 'error';
  };
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    message: string;
    createdAt: string;
  }>;
}

export interface BulkAction {
  action: 'delete' | 'activate' | 'deactivate' | 'archive';
  ids: string[];
  reason?: string;
}

// =============================================
// FILE UPLOAD TYPES
// =============================================

export interface FileUpload {
  id: string;
  userId: string;
  originalFilename: string;
  storedFilename: string;
  filePath: string;
  fileSize: number;
  fileType: 'video' | 'image' | 'audio' | 'document' | 'subtitle';
  mimeType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  uploadProgress: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface UploadRequest {
  file: File;
  type: 'video' | 'image' | 'audio' | 'document' | 'subtitle';
  metadata?: Record<string, any>;
}

export interface UploadResponse {
  upload: FileUpload;
  signedUrl?: string;
  downloadUrl?: string;
}