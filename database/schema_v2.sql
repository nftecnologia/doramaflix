-- =============================================
-- DORAMAFLIX - ENHANCED POSTGRESQL DATABASE SCHEMA v2.0
-- =============================================

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text similarity searches
CREATE EXTENSION IF NOT EXISTS "unaccent"; -- For accent-insensitive searches
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"; -- For query performance monitoring

-- =============================================
-- ENUMS
-- =============================================

-- User management enums
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'student');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');

-- Content management enums
CREATE TYPE content_type AS ENUM ('series', 'movie', 'documentary', 'special', 'ova');
CREATE TYPE content_status AS ENUM ('draft', 'published', 'archived', 'coming_soon');
CREATE TYPE drama_origin AS ENUM ('korean', 'japanese', 'chinese', 'thai', 'taiwanese', 'filipino', 'other');
CREATE TYPE subtitle_language AS ENUM ('portuguese', 'english', 'spanish', 'korean', 'japanese', 'chinese', 'thai');
CREATE TYPE video_quality AS ENUM ('SD_480p', 'HD_720p', 'FHD_1080p', 'UHD_4K');
CREATE TYPE watch_status AS ENUM ('not_started', 'watching', 'completed', 'dropped', 'on_hold');

-- Payment and subscription enums
CREATE TYPE subscription_status AS ENUM ('active', 'cancelled', 'expired', 'trial', 'suspended');
CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded', 'cancelled');
CREATE TYPE payment_method AS ENUM ('stripe', 'mercadopago', 'paypal', 'bank_transfer');

-- System enums
CREATE TYPE notification_type AS ENUM ('email', 'push', 'sms', 'in_app');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'read');
CREATE TYPE log_level AS ENUM ('debug', 'info', 'warn', 'error', 'fatal');
CREATE TYPE file_type AS ENUM ('video', 'image', 'audio', 'document', 'subtitle');
CREATE TYPE upload_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- =============================================
-- USERS & AUTHENTICATION
-- =============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    role user_role DEFAULT 'student',
    status user_status DEFAULT 'pending_verification',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verified_at TIMESTAMP WITH TIME ZONE,
    last_login_at TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    email_verification_token VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_secret VARCHAR(255),
    backup_codes TEXT[],
    subscription_tier VARCHAR(20) DEFAULT 'free',
    max_profiles INTEGER DEFAULT 1,
    is_main_profile BOOLEAN DEFAULT TRUE,
    parent_user_id UUID REFERENCES users(id),
    
    -- User preferences
    preferences JSONB DEFAULT '{}',
    watchlist_private BOOLEAN DEFAULT FALSE,
    allow_notifications BOOLEAN DEFAULT TRUE,
    display_name VARCHAR(100),
    bio VARCHAR(500),
    location VARCHAR(100),
    timezone VARCHAR(50),
    date_of_birth DATE,
    total_watch_time INTEGER DEFAULT 0, -- in minutes
    favorite_genres VARCHAR(50)[] DEFAULT '{}',
    
    -- Parental controls
    is_parental_controlled BOOLEAN DEFAULT FALSE,
    max_content_rating VARCHAR(10),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CONTENT MANAGEMENT (ENHANCED FOR DRAMAS)
-- =============================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon_url TEXT,
    color VARCHAR(7) DEFAULT '#000000',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255),
    slug VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    thumbnail_url TEXT,
    banner_url TEXT,
    trailer_url TEXT,
    content_type content_type NOT NULL,
    drama_origin drama_origin,
    original_language VARCHAR(50),
    production_year INTEGER,
    status content_status DEFAULT 'draft',
    is_premium BOOLEAN DEFAULT TRUE,
    price DECIMAL(10, 2) DEFAULT 0.00,
    duration_minutes INTEGER DEFAULT 0,
    total_episodes INTEGER,
    age_rating VARCHAR(10),
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating BETWEEN 0 AND 5),
    rating_count INTEGER DEFAULT 0,
    total_views INTEGER DEFAULT 0,
    popularity INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    release_date DATE,
    end_date DATE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Full-text search vector
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(original_title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(short_description, '')), 'C')
    ) STORED
);

CREATE TABLE course_categories (
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, category_id)
);

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE course_tags (
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, tag_id)
);

CREATE TABLE seasons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    season_number INTEGER NOT NULL,
    thumbnail_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(course_id, season_number)
);

CREATE TABLE episodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    original_title VARCHAR(255),
    description TEXT,
    episode_number INTEGER NOT NULL,
    video_url TEXT,
    video_duration INTEGER, -- in seconds
    video_size BIGINT, -- in bytes
    thumbnail_url TEXT,
    is_free BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    view_count INTEGER DEFAULT 0,
    rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating BETWEEN 0 AND 5),
    rating_count INTEGER DEFAULT 0,
    air_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- CAST & CREW TABLES
-- =============================================

CREATE TABLE persons (
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

CREATE TABLE cast_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    role VARCHAR(255) NOT NULL,
    is_lead BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    UNIQUE(course_id, person_id, role)
);

CREATE TABLE crew_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    role VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL,
    UNIQUE(course_id, person_id, role)
);

-- =============================================
-- SUBTITLES & VIDEO QUALITY
-- =============================================

CREATE TABLE subtitles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    language subtitle_language NOT NULL,
    file_url TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(episode_id, language)
);

CREATE TABLE video_qualities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    quality_type video_quality NOT NULL,
    video_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    bitrate INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(episode_id, quality_type)
);

-- =============================================
-- SUBSCRIPTIONS & PAYMENTS
-- =============================================

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    billing_interval VARCHAR(20) NOT NULL, -- monthly, yearly
    trial_days INTEGER DEFAULT 0,
    features JSONB DEFAULT '[]',
    max_concurrent_streams INTEGER DEFAULT 1,
    max_download_quality video_quality DEFAULT 'HD_720p',
    ads_supported BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status subscription_status DEFAULT 'trial',
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    external_subscription_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    subscription_id UUID REFERENCES subscriptions(id),
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'BRL',
    status payment_status DEFAULT 'pending',
    payment_method payment_method NOT NULL,
    external_payment_id VARCHAR(255),
    external_customer_id VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- USER ACTIVITY & ENGAGEMENT (PARTITIONED)
-- =============================================

-- Partitioned table for user progress (by year)
CREATE TABLE user_progress (
    id UUID DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    progress_seconds INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, last_watched_at),
    UNIQUE(user_id, episode_id, last_watched_at)
) PARTITION BY RANGE (last_watched_at);

-- Create partitions for current and next years
CREATE TABLE user_progress_2024 PARTITION OF user_progress
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
CREATE TABLE user_progress_2025 PARTITION OF user_progress
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
CREATE TABLE user_progress_2026 PARTITION OF user_progress
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Partitioned table for watch history (by month)
CREATE TABLE watch_history (
    id UUID DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    watch_duration INTEGER DEFAULT 0,
    device_info JSONB DEFAULT '{}',
    quality_watched video_quality DEFAULT 'HD_720p',
    subtitles_used subtitle_language,
    PRIMARY KEY (id, watched_at)
) PARTITION BY RANGE (watched_at);

-- Create monthly partitions for watch history
CREATE TABLE watch_history_2024_12 PARTITION OF watch_history
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE watch_history_2025_01 PARTITION OF watch_history
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE watch_history_2025_02 PARTITION OF watch_history
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE user_favorites (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, course_id)
);

CREATE TABLE user_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    is_approved BOOLEAN DEFAULT FALSE,
    helpful_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, course_id)
);

CREATE TABLE episode_reviews (
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

CREATE TABLE user_watch_status (
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

-- =============================================
-- ANALYTICS & PERFORMANCE TRACKING
-- =============================================

-- Partitioned analytics table (by month)
CREATE TABLE content_analytics (
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

-- Create monthly analytics partitions
CREATE TABLE content_analytics_2024_12 PARTITION OF content_analytics
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE content_analytics_2025_01 PARTITION OF content_analytics
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE user_engagement (
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

-- =============================================
-- TRENDING & SEARCH
-- =============================================

CREATE TABLE trending_content (
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

CREATE TABLE search_queries (
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
-- NOTIFICATIONS & SYSTEM
-- =============================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status notification_status DEFAULT 'pending',
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Partitioned system logs (by month)
CREATE TABLE system_logs (
    id UUID DEFAULT uuid_generate_v4(),
    level log_level NOT NULL,
    message TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    status_code INTEGER,
    response_time INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly log partitions
CREATE TABLE system_logs_2024_12 PARTITION OF system_logs
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
CREATE TABLE system_logs_2025_01 PARTITION OF system_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE user_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type file_type NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    status upload_status DEFAULT 'pending',
    upload_progress INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================

-- Users indexes
CREATE INDEX CONCURRENTLY idx_users_email_hash ON users USING hash(email);
CREATE INDEX CONCURRENTLY idx_users_role_status ON users(role, status);
CREATE INDEX CONCURRENTLY idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX CONCURRENTLY idx_users_parent_id ON users(parent_user_id) WHERE parent_user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_users_created_at ON users(created_at);

-- Courses indexes (optimized for drama searches)
CREATE INDEX CONCURRENTLY idx_courses_search_vector ON courses USING gin(search_vector);
CREATE INDEX CONCURRENTLY idx_courses_status_type ON courses(status, content_type);
CREATE INDEX CONCURRENTLY idx_courses_drama_origin ON courses(drama_origin) WHERE drama_origin IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_courses_rating_views ON courses(rating DESC, total_views DESC);
CREATE INDEX CONCURRENTLY idx_courses_popularity ON courses(popularity DESC, created_at DESC);
CREATE INDEX CONCURRENTLY idx_courses_release_date ON courses(release_date DESC) WHERE release_date IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_courses_production_year ON courses(production_year DESC) WHERE production_year IS NOT NULL;

-- Episodes indexes
CREATE INDEX CONCURRENTLY idx_episodes_course_season ON episodes(course_id, season_id, episode_number);
CREATE INDEX CONCURRENTLY idx_episodes_air_date ON episodes(air_date DESC) WHERE air_date IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_episodes_rating ON episodes(rating DESC, rating_count DESC);

-- User activity indexes (with partial indexes for active data)
CREATE INDEX CONCURRENTLY idx_user_progress_active ON user_progress(user_id, last_watched_at DESC) 
    WHERE completed = FALSE;
CREATE INDEX CONCURRENTLY idx_user_progress_completed ON user_progress(user_id, completed_at DESC) 
    WHERE completed = TRUE;

-- Watch history indexes (on partitioned table)
CREATE INDEX CONCURRENTLY idx_watch_history_user_recent ON watch_history(user_id, watched_at DESC);
CREATE INDEX CONCURRENTLY idx_watch_history_episode ON watch_history(episode_id, watched_at DESC);
CREATE INDEX CONCURRENTLY idx_watch_history_quality ON watch_history(quality_watched, watched_at DESC);

-- Analytics indexes
CREATE INDEX CONCURRENTLY idx_content_analytics_course_date ON content_analytics(course_id, date DESC);
CREATE INDEX CONCURRENTLY idx_content_analytics_views ON content_analytics(total_views DESC, date DESC);
CREATE INDEX CONCURRENTLY idx_user_engagement_date ON user_engagement(user_id, date DESC);

-- Trending and search indexes
CREATE INDEX CONCURRENTLY idx_trending_period_rank ON trending_content(period, period_start DESC, rank);
CREATE INDEX CONCURRENTLY idx_search_queries_user_time ON search_queries(user_id, created_at DESC) 
    WHERE user_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_search_queries_text ON search_queries USING gin(to_tsvector('english', query));

-- Reviews and ratings indexes
CREATE INDEX CONCURRENTLY idx_user_reviews_course_rating ON user_reviews(course_id, rating DESC, created_at DESC) 
    WHERE is_approved = TRUE;
CREATE INDEX CONCURRENTLY idx_episode_reviews_rating ON episode_reviews(episode_id, rating DESC) 
    WHERE is_approved = TRUE;

-- Subscription and payment indexes
CREATE INDEX CONCURRENTLY idx_subscriptions_user_status ON subscriptions(user_id, status, ends_at);
CREATE INDEX CONCURRENTLY idx_subscriptions_expiring ON subscriptions(ends_at) 
    WHERE status IN ('active', 'trial');
CREATE INDEX CONCURRENTLY idx_payments_user_date ON payments(user_id, payment_date DESC);
CREATE INDEX CONCURRENTLY idx_payments_status_method ON payments(status, payment_method, created_at DESC);

-- =============================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- =============================================

-- Popular content view (refreshed hourly)
CREATE MATERIALIZED VIEW mv_popular_content AS
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

CREATE UNIQUE INDEX ON mv_popular_content (id);
CREATE INDEX ON mv_popular_content (content_type, drama_origin);

-- User recommendations view
CREATE MATERIALIZED VIEW mv_user_recommendations AS
WITH user_preferences AS (
    SELECT 
        u.id as user_id,
        u.favorite_genres,
        array_agg(DISTINCT cc.category_id) as watched_categories,
        array_agg(DISTINCT c.drama_origin) as watched_origins
    FROM users u
    LEFT JOIN watch_history wh ON u.id = wh.user_id
    LEFT JOIN episodes e ON wh.episode_id = e.id
    LEFT JOIN courses c ON e.course_id = c.id
    LEFT JOIN course_categories cc ON c.id = cc.course_id
    WHERE wh.watched_at > NOW() - INTERVAL '6 months'
    GROUP BY u.id, u.favorite_genres
)
SELECT 
    up.user_id,
    c.id as course_id,
    c.title,
    c.drama_origin,
    c.rating,
    c.popularity,
    (CASE 
        WHEN c.drama_origin = ANY(up.watched_origins) THEN 0.3
        ELSE 0
    END +
    CASE 
        WHEN EXISTS(SELECT 1 FROM course_categories cc WHERE cc.course_id = c.id AND cc.category_id = ANY(up.watched_categories)) THEN 0.4
        ELSE 0
    END +
    (c.rating / 5.0) * 0.2 +
    (c.popularity / 100000.0) * 0.1) as recommendation_score
FROM user_preferences up
CROSS JOIN courses c
WHERE c.status = 'published'
    AND NOT EXISTS (
        SELECT 1 FROM user_favorites uf 
        WHERE uf.user_id = up.user_id AND uf.course_id = c.id
    )
    AND NOT EXISTS (
        SELECT 1 FROM user_watch_status uws 
        WHERE uws.user_id = up.user_id AND uws.course_id = c.id 
        AND uws.status IN ('completed', 'dropped')
    );

CREATE INDEX ON mv_user_recommendations (user_id, recommendation_score DESC);

-- =============================================
-- TRIGGERS FOR AUTO-UPDATED TIMESTAMPS
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_seasons_updated_at BEFORE UPDATE ON seasons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON episodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_persons_updated_at BEFORE UPDATE ON persons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_reviews_updated_at BEFORE UPDATE ON user_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_episode_reviews_updated_at BEFORE UPDATE ON episode_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_file_uploads_updated_at BEFORE UPDATE ON file_uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- FUNCTIONS FOR ANALYTICS AND MAINTENANCE
-- =============================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_content;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_recommendations;
END;
$$ LANGUAGE plpgsql;

-- Function to create new monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partitions(table_name text, start_date date)
RETURNS void AS $$
DECLARE
    partition_name text;
    end_date date;
BEGIN
    end_date := start_date + INTERVAL '1 month';
    partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                   partition_name, table_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

-- =============================================
-- INITIAL DATA SETUP
-- =============================================

-- Enable row level security for multi-tenant features
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Create policies for family accounts
CREATE POLICY users_own_data ON users FOR ALL USING (id = current_setting('app.current_user_id')::uuid OR parent_user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY user_progress_own_data ON user_progress FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY watch_history_own_data ON watch_history FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);
CREATE POLICY user_favorites_own_data ON user_favorites FOR ALL USING (user_id = current_setting('app.current_user_id')::uuid);

ANALYZE;