-- =============================================
-- DORAMAFLIX - MIGRATION 003: ANALYTICS & MATERIALIZED VIEWS
-- Created: 2025-01-01
-- Description: Create analytics tables and materialized views for performance
-- =============================================

-- =============================================
-- ADVANCED MATERIALIZED VIEWS
-- =============================================

-- User recommendations materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_recommendations AS
WITH user_preferences AS (
    SELECT 
        u.id as user_id,
        u.favorite_genres,
        array_agg(DISTINCT cc.category_id) FILTER (WHERE cc.category_id IS NOT NULL) as watched_categories,
        array_agg(DISTINCT c.drama_origin) FILTER (WHERE c.drama_origin IS NOT NULL) as watched_origins,
        AVG(ur.rating) as avg_user_rating
    FROM users u
    LEFT JOIN watch_history wh ON u.id = wh.user_id
    LEFT JOIN episodes e ON wh.episode_id = e.id
    LEFT JOIN courses c ON e.course_id = c.id
    LEFT JOIN course_categories cc ON c.id = cc.course_id
    LEFT JOIN user_reviews ur ON u.id = ur.user_id AND ur.is_approved = true
    WHERE wh.watched_at > NOW() - INTERVAL '6 months'
    GROUP BY u.id, u.favorite_genres
),
content_scores AS (
    SELECT 
        c.id as course_id,
        c.title,
        c.drama_origin,
        c.rating,
        c.popularity,
        c.total_views,
        COUNT(uf.user_id) as favorites_count,
        AVG(ur.rating) as user_rating,
        COUNT(ur.id) as review_count
    FROM courses c
    LEFT JOIN user_favorites uf ON c.id = uf.course_id
    LEFT JOIN user_reviews ur ON c.id = ur.course_id AND ur.is_approved = true
    WHERE c.status = 'published'
    GROUP BY c.id, c.title, c.drama_origin, c.rating, c.popularity, c.total_views
)
SELECT 
    up.user_id,
    cs.course_id,
    cs.title,
    cs.drama_origin,
    cs.rating,
    cs.popularity,
    cs.favorites_count,
    cs.user_rating,
    cs.review_count,
    (
        -- Origin preference match (30%)
        CASE 
            WHEN cs.drama_origin = ANY(up.watched_origins) THEN 0.30
            ELSE 0
        END +
        -- Category preference match (25%)
        CASE 
            WHEN EXISTS(
                SELECT 1 FROM course_categories cc 
                WHERE cc.course_id = cs.course_id 
                AND cc.category_id = ANY(up.watched_categories)
            ) THEN 0.25
            ELSE 0
        END +
        -- Content quality score (25%)
        (COALESCE(cs.rating, 0) / 5.0) * 0.25 +
        -- Popularity score (10%)
        (LEAST(cs.popularity, 100000) / 100000.0) * 0.10 +
        -- Community engagement (10%)
        (LEAST(cs.favorites_count, 1000) / 1000.0) * 0.10
    ) as recommendation_score,
    CASE
        WHEN cs.drama_origin = ANY(up.watched_origins) THEN 'similar_origin'
        WHEN EXISTS(
            SELECT 1 FROM course_categories cc 
            WHERE cc.course_id = cs.course_id 
            AND cc.category_id = ANY(up.watched_categories)
        ) THEN 'similar_genre'
        WHEN cs.rating >= 4.5 THEN 'highly_rated'
        WHEN cs.popularity >= 50000 THEN 'trending'
        ELSE 'discovery'
    END as recommendation_type
FROM user_preferences up
CROSS JOIN content_scores cs
WHERE NOT EXISTS (
    SELECT 1 FROM user_favorites uf 
    WHERE uf.user_id = up.user_id AND uf.course_id = cs.course_id
)
AND NOT EXISTS (
    SELECT 1 FROM user_watch_status uws 
    WHERE uws.user_id = up.user_id AND uws.course_id = cs.course_id 
    AND uws.status IN ('completed', 'dropped')
);

CREATE INDEX ON mv_user_recommendations (user_id, recommendation_score DESC);
CREATE INDEX ON mv_user_recommendations (recommendation_type, recommendation_score DESC);
CREATE INDEX ON mv_user_recommendations (drama_origin, recommendation_score DESC);

-- Content performance dashboard view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_content_dashboard AS
WITH recent_analytics AS (
    SELECT 
        course_id,
        SUM(total_views) as views_7d,
        SUM(unique_viewers) as unique_viewers_7d,
        SUM(watch_time_minutes) as watch_time_7d,
        AVG(completion_rate) as avg_completion_rate,
        SUM(new_subscribers) as new_subscribers_7d
    FROM content_analytics
    WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY course_id
),
content_metrics AS (
    SELECT 
        c.id,
        c.title,
        c.original_title,
        c.drama_origin,
        c.content_type,
        c.production_year,
        c.rating,
        c.rating_count,
        c.total_views,
        c.popularity,
        COUNT(DISTINCT uf.user_id) as total_favorites,
        COUNT(DISTINCT ur.user_id) as total_reviews,
        COUNT(DISTINCT e.id) as episode_count,
        AVG(e.rating) as avg_episode_rating
    FROM courses c
    LEFT JOIN user_favorites uf ON c.id = uf.course_id
    LEFT JOIN user_reviews ur ON c.id = ur.course_id AND ur.is_approved = true
    LEFT JOIN episodes e ON c.id = e.course_id
    WHERE c.status = 'published'
    GROUP BY c.id, c.title, c.original_title, c.drama_origin, c.content_type, 
             c.production_year, c.rating, c.rating_count, c.total_views, c.popularity
)
SELECT 
    cm.*,
    COALESCE(ra.views_7d, 0) as views_7d,
    COALESCE(ra.unique_viewers_7d, 0) as unique_viewers_7d,
    COALESCE(ra.watch_time_7d, 0) as watch_time_7d,
    COALESCE(ra.avg_completion_rate, 0) as avg_completion_rate_7d,
    COALESCE(ra.new_subscribers_7d, 0) as new_subscribers_7d,
    -- Performance metrics
    CASE 
        WHEN ra.views_7d > 10000 THEN 'viral'
        WHEN ra.views_7d > 5000 THEN 'trending'
        WHEN ra.views_7d > 1000 THEN 'popular'
        WHEN ra.views_7d > 100 THEN 'normal'
        ELSE 'low'
    END as performance_tier,
    -- Engagement score
    (
        (COALESCE(ra.views_7d, 0) * 0.3) +
        (cm.total_favorites * 0.2) +
        (cm.total_reviews * 0.2) +
        (cm.rating * 1000 * 0.2) +
        (COALESCE(ra.avg_completion_rate, 0) * 10000 * 0.1)
    ) as engagement_score
FROM content_metrics cm
LEFT JOIN recent_analytics ra ON cm.id = ra.course_id
ORDER BY engagement_score DESC;

CREATE UNIQUE INDEX ON mv_content_dashboard (id);
CREATE INDEX ON mv_content_dashboard (drama_origin, engagement_score DESC);
CREATE INDEX ON mv_content_dashboard (performance_tier, engagement_score DESC);
CREATE INDEX ON mv_content_dashboard (production_year DESC, engagement_score DESC);

-- User engagement insights view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_insights AS
WITH user_activity AS (
    SELECT 
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.subscription_tier,
        u.total_watch_time,
        u.favorite_genres,
        u.created_at as user_since,
        COUNT(DISTINCT uf.course_id) as favorites_count,
        COUNT(DISTINCT ur.course_id) as reviews_count,
        COUNT(DISTINCT uws.course_id) as watching_count,
        COUNT(DISTINCT CASE WHEN uws.status = 'completed' THEN uws.course_id END) as completed_count,
        AVG(ur.rating) as avg_rating_given
    FROM users u
    LEFT JOIN user_favorites uf ON u.id = uf.user_id
    LEFT JOIN user_reviews ur ON u.id = ur.user_id AND ur.is_approved = true
    LEFT JOIN user_watch_status uws ON u.id = uws.user_id
    WHERE u.role = 'student' AND u.status = 'active'
    GROUP BY u.id, u.email, u.first_name, u.last_name, u.subscription_tier, 
             u.total_watch_time, u.favorite_genres, u.created_at
),
recent_activity AS (
    SELECT 
        user_id,
        SUM(sessions_count) as sessions_7d,
        SUM(total_watch_time) as watch_time_7d,
        SUM(episodes_watched) as episodes_watched_7d,
        SUM(episodes_completed) as episodes_completed_7d,
        SUM(searches_count) as searches_7d
    FROM user_engagement
    WHERE date >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY user_id
)
SELECT 
    ua.*,
    COALESCE(ra.sessions_7d, 0) as sessions_7d,
    COALESCE(ra.watch_time_7d, 0) as watch_time_7d,
    COALESCE(ra.episodes_watched_7d, 0) as episodes_watched_7d,
    COALESCE(ra.episodes_completed_7d, 0) as episodes_completed_7d,
    COALESCE(ra.searches_7d, 0) as searches_7d,
    -- User engagement level
    CASE 
        WHEN ra.sessions_7d >= 20 THEN 'super_active'
        WHEN ra.sessions_7d >= 10 THEN 'very_active'
        WHEN ra.sessions_7d >= 5 THEN 'active'
        WHEN ra.sessions_7d >= 1 THEN 'casual'
        ELSE 'inactive'
    END as engagement_level,
    -- Lifetime value indicators
    (
        (ua.total_watch_time * 0.1) +
        (ua.favorites_count * 10) +
        (ua.reviews_count * 20) +
        (ua.completed_count * 15) +
        (COALESCE(ra.sessions_7d, 0) * 5)
    ) as engagement_score,
    -- Content preferences
    CASE 
        WHEN 'korean' = ANY(ua.favorite_genres) THEN 'kdrama_fan'
        WHEN 'japanese' = ANY(ua.favorite_genres) THEN 'jdrama_fan'
        WHEN 'chinese' = ANY(ua.favorite_genres) THEN 'cdrama_fan'
        WHEN 'romance' = ANY(ua.favorite_genres) THEN 'romance_lover'
        WHEN 'action' = ANY(ua.favorite_genres) THEN 'action_fan'
        ELSE 'general'
    END as user_type
FROM user_activity ua
LEFT JOIN recent_activity ra ON ua.user_id = ra.user_id;

CREATE UNIQUE INDEX ON mv_user_insights (user_id);
CREATE INDEX ON mv_user_insights (engagement_level, engagement_score DESC);
CREATE INDEX ON mv_user_insights (user_type, engagement_score DESC);
CREATE INDEX ON mv_user_insights (subscription_tier, engagement_score DESC);

-- Search analytics view
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_search_analytics AS
WITH search_metrics AS (
    SELECT 
        query,
        COUNT(*) as search_count,
        COUNT(DISTINCT user_id) as unique_users,
        AVG(results) as avg_results,
        COUNT(CASE WHEN clicked = true THEN 1 END) as click_count,
        ROUND(
            (COUNT(CASE WHEN clicked = true THEN 1 END)::numeric / COUNT(*)) * 100, 2
        ) as click_through_rate,
        array_agg(DISTINCT clicked_id) FILTER (WHERE clicked_id IS NOT NULL) as clicked_content
    FROM search_queries
    WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY query
    HAVING COUNT(*) >= 3  -- Only include queries with at least 3 searches
),
trending_searches AS (
    SELECT 
        query,
        COUNT(*) as recent_count
    FROM search_queries
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY query
    HAVING COUNT(*) >= 2
)
SELECT 
    sm.query,
    sm.search_count,
    sm.unique_users,
    sm.avg_results,
    sm.click_count,
    sm.click_through_rate,
    sm.clicked_content,
    COALESCE(ts.recent_count, 0) as recent_searches,
    CASE 
        WHEN sm.click_through_rate > 50 THEN 'high_engagement'
        WHEN sm.click_through_rate > 20 THEN 'medium_engagement'
        WHEN sm.click_through_rate > 5 THEN 'low_engagement'
        ELSE 'very_low_engagement'
    END as engagement_category,
    CASE 
        WHEN sm.avg_results = 0 THEN 'no_results'
        WHEN sm.avg_results < 5 THEN 'few_results'
        WHEN sm.avg_results < 20 THEN 'moderate_results'
        ELSE 'many_results'
    END as results_category
FROM search_metrics sm
LEFT JOIN trending_searches ts ON sm.query = ts.query
ORDER BY sm.search_count DESC, sm.click_through_rate DESC;

CREATE INDEX ON mv_search_analytics (search_count DESC);
CREATE INDEX ON mv_search_analytics (click_through_rate DESC);
CREATE INDEX ON mv_search_analytics (engagement_category, search_count DESC);

-- =============================================
-- ANALYTICS FUNCTIONS
-- =============================================

-- Function to get top content by period
CREATE OR REPLACE FUNCTION get_top_content_by_period(
    period_type TEXT DEFAULT 'daily',
    category_filter TEXT DEFAULT NULL,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    course_id UUID,
    title VARCHAR(255),
    drama_origin drama_origin,
    views INTEGER,
    unique_viewers INTEGER,
    rating DECIMAL(3,2),
    rank INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tc.course_id,
        c.title,
        c.drama_origin,
        ca.total_views,
        ca.unique_viewers,
        c.rating,
        tc.rank
    FROM trending_content tc
    JOIN courses c ON tc.course_id = c.id
    JOIN content_analytics ca ON tc.course_id = ca.course_id
    WHERE tc.period = period_type
        AND tc.period_start = CURRENT_DATE - 1
        AND (category_filter IS NULL OR tc.category = category_filter)
        AND ca.date = CURRENT_DATE - 1
    ORDER BY tc.rank
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user viewing patterns
CREATE OR REPLACE FUNCTION get_user_viewing_patterns(user_uuid UUID)
RETURNS TABLE (
    most_watched_origin drama_origin,
    favorite_time_slot TEXT,
    avg_session_duration INTEGER,
    completion_rate DECIMAL(5,4),
    binge_score INTEGER
) AS $$
DECLARE
    peak_hour INTEGER;
BEGIN
    -- Get peak viewing hour
    SELECT EXTRACT(hour FROM watched_at)::INTEGER INTO peak_hour
    FROM watch_history 
    WHERE user_id = user_uuid 
        AND watched_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY EXTRACT(hour FROM watched_at)
    ORDER BY COUNT(*) DESC
    LIMIT 1;

    RETURN QUERY
    WITH user_stats AS (
        SELECT 
            c.drama_origin,
            AVG(wh.watch_duration) as avg_duration,
            COUNT(*) as watch_count,
            COUNT(CASE WHEN up.completed = true THEN 1 END) as completed_count
        FROM watch_history wh
        JOIN episodes e ON wh.episode_id = e.id
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN user_progress up ON wh.user_id = up.user_id AND wh.episode_id = up.episode_id
        WHERE wh.user_id = user_uuid
            AND wh.watched_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY c.drama_origin
    ),
    binge_analysis AS (
        SELECT COUNT(*) as binge_sessions
        FROM (
            SELECT DATE_TRUNC('day', watched_at) as watch_date,
                   COUNT(*) as episodes_per_day
            FROM watch_history
            WHERE user_id = user_uuid
                AND watched_at >= CURRENT_DATE - INTERVAL '30 days'
            GROUP BY DATE_TRUNC('day', watched_at)
            HAVING COUNT(*) >= 3
        ) binge_days
    )
    SELECT 
        us.drama_origin,
        CASE 
            WHEN peak_hour BETWEEN 6 AND 11 THEN 'morning'
            WHEN peak_hour BETWEEN 12 AND 17 THEN 'afternoon'
            WHEN peak_hour BETWEEN 18 AND 22 THEN 'evening'
            ELSE 'night'
        END,
        us.avg_duration::INTEGER,
        ROUND(us.completed_count::NUMERIC / NULLIF(us.watch_count, 0), 4),
        COALESCE(ba.binge_sessions, 0)
    FROM user_stats us
    CROSS JOIN binge_analysis ba
    ORDER BY us.watch_count DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate content similarity
CREATE OR REPLACE FUNCTION calculate_content_similarity(
    course_id_1 UUID,
    course_id_2 UUID
)
RETURNS DECIMAL(5,4) AS $$
DECLARE
    similarity_score DECIMAL(5,4) := 0;
    shared_categories INTEGER;
    shared_tags INTEGER;
    origin_match BOOLEAN;
    year_diff INTEGER;
BEGIN
    -- Check shared categories
    SELECT COUNT(*) INTO shared_categories
    FROM course_categories cc1
    JOIN course_categories cc2 ON cc1.category_id = cc2.category_id
    WHERE cc1.course_id = course_id_1 AND cc2.course_id = course_id_2;
    
    -- Check shared tags
    SELECT COUNT(*) INTO shared_tags
    FROM course_tags ct1
    JOIN course_tags ct2 ON ct1.tag_id = ct2.tag_id
    WHERE ct1.course_id = course_id_1 AND ct2.course_id = course_id_2;
    
    -- Check origin match
    SELECT (c1.drama_origin = c2.drama_origin) INTO origin_match
    FROM courses c1, courses c2
    WHERE c1.id = course_id_1 AND c2.id = course_id_2;
    
    -- Check production year difference
    SELECT ABS(COALESCE(c1.production_year, 0) - COALESCE(c2.production_year, 0)) INTO year_diff
    FROM courses c1, courses c2
    WHERE c1.id = course_id_1 AND c2.id = course_id_2;
    
    -- Calculate similarity score
    similarity_score := (
        (shared_categories * 0.3) +
        (shared_tags * 0.2) +
        (CASE WHEN origin_match THEN 0.3 ELSE 0 END) +
        (CASE WHEN year_diff <= 2 THEN 0.2 WHEN year_diff <= 5 THEN 0.1 ELSE 0 END)
    );
    
    RETURN LEAST(similarity_score, 1.0);
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- REFRESH FUNCTIONS
-- =============================================

-- Function to refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_all_analytics_views()
RETURNS TEXT AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    result TEXT;
BEGIN
    start_time := NOW();
    
    -- Refresh views concurrently
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_content;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_recommendations;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_content_dashboard;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_insights;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_search_analytics;
    
    end_time := NOW();
    
    result := format('All analytics views refreshed successfully in %s seconds', 
                     EXTRACT(EPOCH FROM (end_time - start_time)));
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to refresh specific view
CREATE OR REPLACE FUNCTION refresh_analytics_view(view_name TEXT)
RETURNS TEXT AS $$
DECLARE
    start_time TIMESTAMP;
    end_time TIMESTAMP;
    result TEXT;
BEGIN
    start_time := NOW();
    
    CASE view_name
        WHEN 'popular_content' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_popular_content;
        WHEN 'user_recommendations' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_recommendations;
        WHEN 'content_dashboard' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_content_dashboard;
        WHEN 'user_insights' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_insights;
        WHEN 'search_analytics' THEN
            REFRESH MATERIALIZED VIEW CONCURRENTLY mv_search_analytics;
        ELSE
            RAISE EXCEPTION 'Unknown view name: %', view_name;
    END CASE;
    
    end_time := NOW();
    
    result := format('View %s refreshed successfully in %s seconds', 
                     view_name, EXTRACT(EPOCH FROM (end_time - start_time)));
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- SCHEDULED REFRESH SETUP
-- =============================================

-- Note: In production, you would set up cron jobs or use pg_cron extension
-- Example cron jobs:
-- # Refresh popular content every 15 minutes
-- */15 * * * * psql -d doramaflix -c "SELECT refresh_analytics_view('popular_content');"
-- 
-- # Refresh user recommendations every hour
-- 0 * * * * psql -d doramaflix -c "SELECT refresh_analytics_view('user_recommendations');"
-- 
-- # Refresh all views daily at 2 AM
-- 0 2 * * * psql -d doramaflix -c "SELECT refresh_all_analytics_views();"

-- =============================================
-- PERFORMANCE MONITORING
-- =============================================

-- View to monitor materialized view sizes and refresh times
CREATE OR REPLACE VIEW v_materialized_view_stats AS
SELECT 
    schemaname,
    matviewname as view_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size,
    ispopulated,
    CASE 
        WHEN ispopulated THEN 'Yes'
        ELSE 'No'
    END as is_populated
FROM pg_matviews
WHERE schemaname = 'public'
    AND matviewname LIKE 'mv_%'
ORDER BY pg_total_relation_size(schemaname||'.'||matviewname) DESC;

-- =============================================
-- RECORD MIGRATION
-- =============================================

-- Record this migration
INSERT INTO schema_migrations (version, description, rollback_sql)
VALUES (
    '003_analytics_views',
    'Create analytics tables and materialized views for performance',
    '
    DROP MATERIALIZED VIEW IF EXISTS mv_search_analytics;
    DROP MATERIALIZED VIEW IF EXISTS mv_user_insights;
    DROP MATERIALIZED VIEW IF EXISTS mv_content_dashboard;
    DROP MATERIALIZED VIEW IF EXISTS mv_user_recommendations;
    DROP FUNCTION IF EXISTS get_top_content_by_period;
    DROP FUNCTION IF EXISTS get_user_viewing_patterns;
    DROP FUNCTION IF EXISTS calculate_content_similarity;
    DROP FUNCTION IF EXISTS refresh_all_analytics_views;
    DROP FUNCTION IF EXISTS refresh_analytics_view;
    DROP VIEW IF EXISTS v_materialized_view_stats;
    '
) ON CONFLICT (version) DO NOTHING;

-- Log completion
DO $$ 
BEGIN 
    RAISE NOTICE 'Migration 003_analytics_views completed successfully at %', NOW();
    RAISE NOTICE 'Created materialized views: mv_user_recommendations, mv_content_dashboard, mv_user_insights, mv_search_analytics';
    RAISE NOTICE 'Created analytics functions: get_top_content_by_period, get_user_viewing_patterns, calculate_content_similarity';
    RAISE NOTICE 'Use SELECT refresh_all_analytics_views() to refresh all views';
END $$;