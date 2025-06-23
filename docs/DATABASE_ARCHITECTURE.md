# DORAMAFLIX - DATABASE ARCHITECTURE DOCUMENTATION

## Overview

This document describes the comprehensive database architecture for Doramaflix, a streaming platform specialized in Asian dramas (K-dramas, J-dramas, C-dramas). The architecture is designed to handle millions of users with high performance, scalability, and drama-specific features.

## Table of Contents

- [Technology Stack](#technology-stack)
- [Database Schema](#database-schema)
- [Performance Optimizations](#performance-optimizations)
- [Caching Strategy](#caching-strategy)
- [Analytics & Insights](#analytics--insights)
- [Migration System](#migration-system)
- [Deployment Guide](#deployment-guide)
- [API Integration](#api-integration)

## Technology Stack

### Core Technologies
- **Database**: PostgreSQL 15+ with advanced extensions
- **ORM**: Prisma (primary) with TypeORM fallback
- **Cache**: Redis 7+ with persistence
- **Search**: PostgreSQL Full-Text Search with GIN indexes
- **Analytics**: Custom materialized views and functions

### Extensions Used
- `uuid-ossp` - UUID generation
- `pgcrypto` - Cryptographic functions
- `pg_trgm` - Text similarity searches
- `unaccent` - Accent-insensitive searches
- `pg_stat_statements` - Query performance monitoring

## Database Schema

### Core Entities

#### Users & Authentication
```sql
-- Users with enhanced drama preferences
users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  subscription_tier VARCHAR(20),
  favorite_genres VARCHAR(50)[],
  total_watch_time INTEGER,
  -- Drama-specific fields
  display_name VARCHAR(100),
  bio VARCHAR(500),
  preferred_subtitle_language TEXT,
  max_content_rating VARCHAR(10)
)
```

#### Content Management
```sql
-- Enhanced courses/series table
courses (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  original_title VARCHAR(255),     -- Original language title
  drama_origin drama_origin,       -- korean, japanese, chinese, etc.
  original_language VARCHAR(50),
  production_year INTEGER,
  total_episodes INTEGER,
  age_rating VARCHAR(10),
  rating DECIMAL(3,2),
  popularity INTEGER,
  search_vector TSVECTOR,          -- Full-text search
  -- Standard fields
  description TEXT,
  thumbnail_url TEXT,
  status content_status
)
```

#### Episodes with Multi-Quality Support
```sql
episodes (
  id UUID PRIMARY KEY,
  course_id UUID,
  season_id UUID,
  title VARCHAR(255),
  original_title VARCHAR(255),
  episode_number INTEGER,
  video_duration INTEGER,
  rating DECIMAL(3,2),
  air_date DATE
)

-- Multiple video qualities per episode
video_qualities (
  id UUID PRIMARY KEY,
  episode_id UUID,
  quality_type video_quality,     -- SD_480p, HD_720p, FHD_1080p, UHD_4K
  video_url TEXT,
  file_size BIGINT,
  bitrate INTEGER
)

-- Multi-language subtitles
subtitles (
  id UUID PRIMARY KEY,
  episode_id UUID,
  language subtitle_language,     -- portuguese, english, spanish, etc.
  file_url TEXT,
  is_default BOOLEAN
)
```

#### Cast & Crew
```sql
persons (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  original_name VARCHAR(255),
  profile_url TEXT,
  biography TEXT,
  birth_date DATE,
  nationality VARCHAR(100)
)

cast_members (
  course_id UUID,
  person_id UUID,
  role VARCHAR(255),
  is_lead BOOLEAN,
  sort_order INTEGER
)

crew_members (
  course_id UUID,
  person_id UUID,
  role VARCHAR(100),
  department VARCHAR(100)
)
```

### User Activity & Engagement

#### Watch Progress & History
```sql
-- Partitioned by date for performance
user_progress (
  user_id UUID,
  episode_id UUID,
  progress_seconds INTEGER,
  completed BOOLEAN,
  last_watched_at TIMESTAMPTZ
) PARTITION BY RANGE (last_watched_at);

-- Detailed watch history with device info
watch_history (
  user_id UUID,
  episode_id UUID,
  watched_at TIMESTAMPTZ,
  watch_duration INTEGER,
  device_info JSONB,
  quality_watched video_quality,
  subtitles_used subtitle_language
) PARTITION BY RANGE (watched_at);
```

#### User Preferences & Status
```sql
user_watch_status (
  user_id UUID,
  course_id UUID,
  status watch_status,            -- not_started, watching, completed, dropped, on_hold
  score SMALLINT,                 -- User's personal rating 1-10
  notes TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)

user_favorites (
  user_id UUID,
  course_id UUID,
  created_at TIMESTAMPTZ
)
```

### Analytics & Insights

#### Content Analytics (Partitioned)
```sql
content_analytics (
  course_id UUID,
  date DATE,
  total_views INTEGER,
  unique_viewers INTEGER,
  watch_time_minutes INTEGER,
  completion_rate DECIMAL(5,4),
  average_rating DECIMAL(3,2),
  new_subscribers INTEGER
) PARTITION BY RANGE (date);
```

#### User Engagement Tracking
```sql
user_engagement (
  user_id UUID,
  date DATE,
  sessions_count INTEGER,
  total_watch_time INTEGER,
  episodes_watched INTEGER,
  episodes_completed INTEGER,
  searches_count INTEGER,
  favorites_added INTEGER,
  reviews_written INTEGER
)
```

#### Trending & Search Analytics
```sql
trending_content (
  course_id UUID,
  trending_score DECIMAL(10,4),
  period VARCHAR(20),             -- daily, weekly, monthly
  period_start DATE,
  period_end DATE,
  rank INTEGER,
  category VARCHAR(100)
)

search_queries (
  user_id UUID,
  query VARCHAR(500),
  filters JSONB,
  results INTEGER,
  clicked BOOLEAN,
  clicked_id UUID
)
```

## Performance Optimizations

### Indexing Strategy

#### Primary Indexes
```sql
-- Full-text search for content discovery
CREATE INDEX idx_courses_search_vector ON courses USING gin(search_vector);

-- Drama origin filtering (very common)
CREATE INDEX idx_courses_drama_origin ON courses(drama_origin) WHERE drama_origin IS NOT NULL;

-- Popularity and rating sorting
CREATE INDEX idx_courses_popularity ON courses(popularity DESC, created_at DESC);
CREATE INDEX idx_courses_rating_views ON courses(rating DESC, total_views DESC);

-- User activity (hot data)
CREATE INDEX idx_user_progress_active ON user_progress(user_id, last_watched_at DESC) 
    WHERE completed = FALSE;

-- Watch history by user and recency
CREATE INDEX idx_watch_history_user_recent ON watch_history(user_id, watched_at DESC);
```

#### Composite Indexes for Complex Queries
```sql
-- Episode navigation
CREATE INDEX idx_episodes_course_season ON episodes(course_id, season_id, episode_number);

-- Cast member lookup
CREATE INDEX idx_cast_members_course ON cast_members(course_id, is_lead DESC, sort_order);

-- Analytics aggregations
CREATE INDEX idx_content_analytics_course_date ON content_analytics(course_id, date DESC);

-- Trending content ranking
CREATE INDEX idx_trending_period_rank ON trending_content(period, period_start DESC, rank);
```

### Partitioning Strategy

#### Time-Based Partitioning
```sql
-- User progress partitioned by year
CREATE TABLE user_progress_2025 PARTITION OF user_progress
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

-- Watch history partitioned by month
CREATE TABLE watch_history_2025_01 PARTITION OF watch_history
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Content analytics partitioned by month
CREATE TABLE content_analytics_2025_01 PARTITION OF content_analytics
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### Query Optimization

#### Materialized Views for Heavy Queries
```sql
-- Popular content (refreshed every 15 minutes)
CREATE MATERIALIZED VIEW mv_popular_content AS
SELECT 
    c.id, c.title, c.drama_origin, c.rating,
    COUNT(uf.user_id) as favorites_count,
    AVG(ur.rating) as user_rating
FROM courses c
LEFT JOIN user_favorites uf ON c.id = uf.course_id
LEFT JOIN user_reviews ur ON c.id = ur.course_id AND ur.is_approved = TRUE
WHERE c.status = 'published'
GROUP BY c.id, c.title, c.drama_origin, c.rating
ORDER BY c.popularity DESC;

-- User recommendations (refreshed hourly)
CREATE MATERIALIZED VIEW mv_user_recommendations AS
-- Complex recommendation algorithm...
```

## Caching Strategy

### Redis Cache Layers

#### Content Caching
```typescript
// Popular content by origin (30 min TTL)
const popularKDramas = await cacheManager.getPopularContent('korean', 50);

// Individual content details (2 hour TTL)
const courseDetails = await cacheManager.getCourse(courseId);

// Episode details with video URLs (1 hour TTL)
const episodeData = await cacheManager.getEpisode(episodeId);
```

#### User-Specific Caching
```typescript
// User progress (5 min TTL)
const progress = await cacheManager.getUserProgress(userId, courseId);

// User favorites (30 min TTL)
const favorites = await cacheManager.getUserFavorites(userId);

// Personalized recommendations (1 hour TTL)
const recommendations = await cacheManager.getUserRecommendations(userId);
```

#### Search Result Caching
```typescript
// Search results (15 min TTL)
const searchKey = CacheKeys.searchResults(query, filters);
const results = await cacheManager.get('search', searchKey);
```

### Cache Invalidation Strategy

#### Content Updates
```typescript
// When content is updated, invalidate related caches
await cacheInvalidation.invalidateContentRelatedCaches(contentId);
// Invalidates: content details, popular lists, search results, trending
```

#### User Activity
```typescript
// When user interacts with content
await cacheInvalidation.invalidateUserRelatedCaches(userId);
// Invalidates: progress, favorites, recommendations
```

## Analytics & Insights

### Real-Time Analytics

#### Content Performance Dashboard
```sql
-- Get content performance metrics
SELECT * FROM mv_content_dashboard 
WHERE drama_origin = 'korean' 
ORDER BY engagement_score DESC LIMIT 20;
```

#### User Engagement Insights
```sql
-- Get user engagement levels
SELECT engagement_level, COUNT(*) as user_count
FROM mv_user_insights 
GROUP BY engagement_level;
```

### Recommendation Engine

#### Collaborative Filtering
```sql
-- Find similar users based on viewing patterns
SELECT calculate_content_similarity(course_id_1, course_id_2);
```

#### Content-Based Recommendations
```sql
-- Get personalized recommendations
SELECT * FROM mv_user_recommendations 
WHERE user_id = $1 
ORDER BY recommendation_score DESC LIMIT 20;
```

### Trending Analysis

#### Real-Time Trending
```sql
-- Get current trending content
SELECT * FROM get_top_content_by_period('daily', 'korean', 10);
```

#### Search Analytics
```sql
-- Analyze search patterns
SELECT * FROM mv_search_analytics 
WHERE engagement_category = 'high_engagement'
ORDER BY search_count DESC;
```

## Migration System

### Version Control
```sql
-- Track all schema changes
schema_migrations (
  version VARCHAR(255) UNIQUE,
  description TEXT,
  applied_at TIMESTAMPTZ,
  rollback_sql TEXT
)
```

### Migration Functions
```sql
-- Check if migration applied
SELECT migration_applied('002_drama_enhancements');

-- Apply new migration
SELECT apply_migration('003_analytics_views', 'Add analytics tables');

-- Rollback if needed
SELECT rollback_migration('003_analytics_views');
```

### Automated Partition Management
```sql
-- Create monthly partitions automatically
SELECT create_monthly_partition('watch_history', '2025-02-01');
SELECT create_yearly_partition('user_progress', '2026-01-01');
```

## Deployment Guide

### Docker Setup

#### Database Container
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: doramaflix
      POSTGRES_USER: doramaflix_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema_v2.sql:/docker-entrypoint-initdb.d/01-schema.sql
    command: >
      postgres
      -c shared_preload_libraries=pg_stat_statements
      -c track_activity_query_size=2048
```

#### Redis Cache Container
```yaml
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
      - ./docker/redis/redis.conf:/etc/redis/redis.conf
    command: redis-server /etc/redis/redis.conf
```

### Production Configuration

#### PostgreSQL Tuning
```conf
# Memory settings (adjust for your server)
shared_buffers = 256MB              # 25% of RAM
effective_cache_size = 1GB          # 75% of RAM
work_mem = 4MB                      # Per-operation memory
maintenance_work_mem = 64MB         # For vacuum, index creation

# Performance tuning
random_page_cost = 1.1              # SSD-optimized
effective_io_concurrency = 200      # For SSDs
max_parallel_workers_per_gather = 2
```

#### Redis Configuration
```conf
# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
appendonly yes
```

### Monitoring Setup

#### Performance Monitoring
```sql
-- Enable query performance tracking
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Monitor slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY total_time DESC LIMIT 10;
```

#### Cache Health Monitoring
```typescript
const healthStatus = await cacheHealth.getHealthStatus();
const cacheStats = await cacheHealth.getCacheStatistics();
```

## API Integration

### Prisma Schema Integration
```typescript
// Enhanced Prisma client with drama-specific types
const course = await prisma.course.findUnique({
  where: { id: courseId },
  include: {
    cast: {
      include: { person: true },
      where: { isLead: true },
      orderBy: { sortOrder: 'asc' }
    },
    episodes: {
      include: {
        subtitles: true,
        videoQualities: true
      },
      orderBy: { episodeNumber: 'asc' }
    },
    categories: {
      include: { category: true }
    }
  }
});
```

### Cache Integration Examples
```typescript
@Cacheable(
  CacheKeys.course,
  { ttl: 7200 } // 2 hours
)
async getCourseDetails(courseId: string) {
  return await this.prisma.course.findUnique({
    where: { id: courseId },
    include: { /* ... */ }
  });
}

@Cacheable(
  CacheKeys.popularContent,
  { ttl: 1800 } // 30 minutes
)
async getPopularContentByOrigin(origin: string, limit: number) {
  return await this.prisma.course.findMany({
    where: { 
      dramaOrigin: origin,
      status: 'published' 
    },
    orderBy: { popularity: 'desc' },
    take: limit
  });
}
```

### Analytics Queries
```typescript
// Get user viewing patterns
const patterns = await prisma.$queryRaw`
  SELECT * FROM get_user_viewing_patterns(${userId})
`;

// Get trending content
const trending = await prisma.$queryRaw`
  SELECT * FROM get_top_content_by_period('daily', 'korean', 10)
`;

// Refresh analytics views
await prisma.$queryRaw`SELECT refresh_all_analytics_views()`;
```

## Best Practices

### Performance
1. **Use prepared statements** for frequently executed queries
2. **Implement connection pooling** with appropriate pool sizes
3. **Monitor query performance** using pg_stat_statements
4. **Use partial indexes** for filtered queries
5. **Implement proper cache invalidation** strategies

### Scalability
1. **Partition large tables** by time or user ID
2. **Use materialized views** for complex aggregations
3. **Implement read replicas** for read-heavy workloads
4. **Use Redis clustering** for cache scaling
5. **Monitor and tune** PostgreSQL configuration

### Security
1. **Use row-level security** for multi-tenant features
2. **Implement proper authentication** and authorization
3. **Encrypt sensitive data** at rest and in transit
4. **Regular security audits** and updates
5. **Backup and disaster recovery** procedures

### Maintenance
1. **Regular VACUUM and ANALYZE** operations
2. **Monitor index usage** and remove unused indexes
3. **Automated partition creation** for time-series data
4. **Regular cache warming** for popular content
5. **Performance testing** and optimization

## Troubleshooting

### Common Issues

#### Slow Queries
```sql
-- Identify slow queries
SELECT query, calls, total_time, mean_time, rows
FROM pg_stat_statements 
WHERE mean_time > 1000  -- Queries taking more than 1 second
ORDER BY total_time DESC;
```

#### Cache Misses
```typescript
// Check cache hit rates
const stats = await cacheHealth.getCacheStatistics();
if (stats.hitRate < 80) {
  // Investigate cache configuration or TTL settings
}
```

#### High Memory Usage
```sql
-- Check table and index sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Performance Tuning

#### Index Optimization
```sql
-- Find missing indexes
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1;
```

#### Query Optimization
```sql
-- Analyze query execution plans
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM courses 
WHERE drama_origin = 'korean' 
ORDER BY popularity DESC 
LIMIT 20;
```

This comprehensive database architecture provides a solid foundation for a high-performance drama streaming platform with advanced analytics, caching, and scalability features.