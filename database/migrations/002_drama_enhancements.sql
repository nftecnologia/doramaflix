-- =============================================
-- DORAMAFLIX - MIGRATION 002: DRAMA ENHANCEMENTS
-- Created: 2025-01-01
-- Description: Add drama-specific features and optimizations
-- =============================================

-- Add new enums for drama functionality
DO $$ BEGIN
    CREATE TYPE drama_origin AS ENUM ('korean', 'japanese', 'chinese', 'thai', 'taiwanese', 'filipino', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subtitle_language AS ENUM ('portuguese', 'english', 'spanish', 'korean', 'japanese', 'chinese', 'thai');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE video_quality AS ENUM ('SD_480p', 'HD_720p', 'FHD_1080p', 'UHD_4K');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE watch_status AS ENUM ('not_started', 'watching', 'completed', 'dropped', 'on_hold');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =============================================
-- ALTER EXISTING TABLES
-- =============================================

-- Enhance courses table with drama-specific fields
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS original_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS drama_origin drama_origin,
ADD COLUMN IF NOT EXISTS original_language VARCHAR(50),
ADD COLUMN IF NOT EXISTS production_year INTEGER,
ADD COLUMN IF NOT EXISTS total_episodes INTEGER,
ADD COLUMN IF NOT EXISTS age_rating VARCHAR(10),
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS popularity INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Add full-text search vector to courses
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(original_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(short_description, '')), 'C')
) STORED;

-- Enhance episodes table
ALTER TABLE episodes
ADD COLUMN IF NOT EXISTS original_title VARCHAR(255),
ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating BETWEEN 0 AND 5),
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS air_date DATE;

-- Enhance user reviews
ALTER TABLE user_reviews
ADD COLUMN IF NOT EXISTS helpful_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_votes INTEGER DEFAULT 0;

-- =============================================
-- NEW TABLES FOR ENHANCED FUNCTIONALITY
-- =============================================

-- Persons table for cast and crew
CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255),
    profile_url TEXT,
    biography TEXT,
    birth_date DATE,
    nationality VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cast members
CREATE TABLE IF NOT EXISTS cast_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    role VARCHAR(255) NOT NULL,
    is_lead BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(course_id, person_id, role)
);

-- Crew members
CREATE TABLE IF NOT EXISTS crew_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    UNIQUE(course_id, person_id, role)
);

-- Subtitles
CREATE TABLE IF NOT EXISTS subtitles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    language subtitle_language NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(episode_id, language)
);

-- Video qualities
CREATE TABLE IF NOT EXISTS video_qualities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    quality_type video_quality NOT NULL,
    video_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    bitrate INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(episode_id, quality_type)
);

-- Episode reviews
CREATE TABLE IF NOT EXISTS episode_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, episode_id)
);

-- User watch status
CREATE TABLE IF NOT EXISTS user_watch_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status watch_status DEFAULT 'not_started',
    score SMALLINT CHECK (score BETWEEN 1 AND 10),
    notes TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

-- Content analytics (partitioned by month)
CREATE TABLE IF NOT EXISTS content_analytics (
    id UUID DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_views INTEGER DEFAULT 0,
    unique_viewers INTEGER DEFAULT 0,
    watch_time_minutes INTEGER DEFAULT 0,
    completion_rate DECIMAL(5, 4) DEFAULT 0.0000,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    new_subscribers INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, date),
    UNIQUE(course_id, date)
) PARTITION BY RANGE (date);

-- User engagement
CREATE TABLE IF NOT EXISTS user_engagement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    sessions_count INTEGER DEFAULT 0,
    total_watch_time INTEGER DEFAULT 0,
    episodes_watched INTEGER DEFAULT 0,
    episodes_completed INTEGER DEFAULT 0,
    searches_count INTEGER DEFAULT 0,
    favorites_added INTEGER DEFAULT 0,
    reviews_written INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Trending content
CREATE TABLE IF NOT EXISTS trending_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    trending_score DECIMAL(10, 4) NOT NULL,
    period VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    rank INTEGER DEFAULT 0,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, period, period_start)
);

-- Search queries
CREATE TABLE IF NOT EXISTS search_queries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    query VARCHAR(500) NOT NULL,
    filters JSONB DEFAULT '{}',
    results INTEGER DEFAULT 0,
    clicked BOOLEAN DEFAULT FALSE,
    clicked_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CREATE PARTITIONS FOR ANALYTICS
-- =============================================

-- Create current year partition for content analytics
DO $$ 
DECLARE
    start_date DATE := date_trunc('year', CURRENT_DATE);
    end_date DATE := start_date + INTERVAL '1 year';
    partition_name TEXT := 'content_analytics_' || to_char(start_date, 'YYYY');
BEGIN
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF content_analytics FOR VALUES FROM (%L) TO (%L)',
                   partition_name, start_date, end_date);
END $$;

-- Create next year partition for content analytics
DO $$ 
DECLARE
    start_date DATE := date_trunc('year', CURRENT_DATE) + INTERVAL '1 year';
    end_date DATE := start_date + INTERVAL '1 year';
    partition_name TEXT := 'content_analytics_' || to_char(start_date, 'YYYY');
BEGIN
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF content_analytics FOR VALUES FROM (%L) TO (%L)',
                   partition_name, start_date, end_date);
END $$;

-- =============================================
-- CREATE INDEXES FOR PERFORMANCE
-- =============================================

-- Courses indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_search_vector ON courses USING gin(search_vector);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_drama_origin ON courses(drama_origin) WHERE drama_origin IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_production_year ON courses(production_year DESC) WHERE production_year IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_popularity ON courses(popularity DESC, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_rating_views ON courses(rating DESC, total_views DESC);

-- Episodes indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_episodes_air_date ON episodes(air_date DESC) WHERE air_date IS NOT NULL;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_episodes_rating ON episodes(rating DESC, rating_count DESC);

-- Cast and crew indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cast_members_course ON cast_members(course_id, is_lead DESC, sort_order);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cast_members_person ON cast_members(person_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crew_members_course ON crew_members(course_id, department, role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crew_members_person ON crew_members(person_id);

-- Subtitles and video quality indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subtitles_episode_lang ON subtitles(episode_id, language);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_qualities_episode ON video_qualities(episode_id, quality_type);

-- Analytics indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_content_analytics_course_date ON content_analytics(course_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_engagement_user_date ON user_engagement(user_id, date DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trending_period_rank ON trending_content(period, period_start DESC, rank);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_queries_user_time ON search_queries(user_id, created_at DESC) WHERE user_id IS NOT NULL;

-- Watch status indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_watch_status_user ON user_watch_status(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_watch_status_course ON user_watch_status(course_id, status);

-- =============================================
-- ADD TRIGGERS
-- =============================================

-- Add update triggers for new tables
CREATE TRIGGER update_persons_updated_at BEFORE UPDATE ON persons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_episode_reviews_updated_at BEFORE UPDATE ON episode_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- UPDATE EXISTING DATA
-- =============================================

-- Update rating data type in user_reviews if needed
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_reviews' AND column_name = 'rating' AND data_type = 'integer') THEN
        -- Convert integer rating to smallint if it's still integer
        ALTER TABLE user_reviews ALTER COLUMN rating TYPE SMALLINT;
    END IF;
END $$;

-- Update video_quality column in episodes to remove hardcoded default
ALTER TABLE episodes ALTER COLUMN video_quality DROP DEFAULT;

-- =============================================
-- CREATE MATERIALIZED VIEWS
-- =============================================

-- Popular content view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_popular_content AS
SELECT 
    c.id,
    c.title,
    c.original_title,
    c.thumbnail_url,
    c.content_type,
    c.drama_origin,
    c.rating,
    c.total_views,
    c.popularity,
    COUNT(uf.user_id) as favorites_count,
    AVG(ur.rating) as user_rating,
    COUNT(ur.id) as review_count
FROM courses c
LEFT JOIN user_favorites uf ON c.id = uf.course_id
LEFT JOIN user_reviews ur ON c.id = ur.course_id AND ur.is_approved = TRUE
WHERE c.status = 'published'
GROUP BY c.id, c.title, c.original_title, c.thumbnail_url, c.content_type, 
         c.drama_origin, c.rating, c.total_views, c.popularity
ORDER BY c.popularity DESC, c.total_views DESC
LIMIT 1000;

CREATE UNIQUE INDEX IF NOT EXISTS mv_popular_content_id_idx ON mv_popular_content (id);
CREATE INDEX IF NOT EXISTS mv_popular_content_type_origin_idx ON mv_popular_content (content_type, drama_origin);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Function to calculate trending scores
CREATE OR REPLACE FUNCTION calculate_trending_score(
    views_7d integer,
    favorites_7d integer,
    rating numeric,
    release_recency_days integer
)
RETURNS numeric AS $$
BEGIN
    RETURN (
        (views_7d * 0.4) +
        (favorites_7d * 0.3) +
        (rating * 20 * 0.2) +
        (GREATEST(0, 365 - release_recency_days) * 0.1)
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_content;
    -- Add other materialized views here when created
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Update migration log
INSERT INTO schema_migrations (version, applied_at) 
VALUES ('002_drama_enhancements', NOW())
ON CONFLICT (version) DO NOTHING;

-- Analyze tables for query planner
ANALYZE courses;
ANALYZE episodes;
ANALYZE persons;
ANALYZE cast_members;
ANALYZE crew_members;
ANALYZE subtitles;
ANALYZE video_qualities;

-- Log completion
DO $$ 
BEGIN 
    RAISE NOTICE 'Migration 002_drama_enhancements completed successfully at %', NOW();
END $$;