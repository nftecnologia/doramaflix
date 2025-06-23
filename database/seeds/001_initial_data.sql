-- =============================================
-- DORAMAFLIX - SEED DATA
-- =============================================

-- Clear existing data (be careful with this in production!)
TRUNCATE TABLE user_audit, system_logs, notifications, file_uploads, 
               user_reviews, user_favorites, watch_history, user_progress,
               payments, subscriptions, subscription_plans,
               course_tags, tags, episodes, seasons, course_categories,
               courses, categories, refresh_tokens, users
               RESTART IDENTITY CASCADE;

-- =============================================
-- USERS SEED DATA
-- =============================================

-- Admin user (password: admin123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@doramaflix.com', '$2b$12$LQv3c1yqBkVHdEPyOHFyTOZQ6PtUTFqSgqA0s4xOGOyHyoqN2qR9W', 'Admin', 'DoramaFlix', 'admin', 'active', true);

-- Manager user (password: manager123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'manager@doramaflix.com', '$2b$12$LQv3c1yqBkVHdEPyOHFyTOZQ6PtUTFqSgqA0s4xOGOyHyoqN2qR9W', 'Manager', 'Content', 'manager', 'active', true);

-- Sample students (password: student123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'student1@example.com', '$2b$12$LQv3c1yqBkVHdEPyOHFyTOZQ6PtUTFqSgqA0s4xOGOyHyoqN2qR9W', 'João', 'Silva', 'student', 'active', true),
('550e8400-e29b-41d4-a716-446655440003', 'student2@example.com', '$2b$12$LQv3c1yqBkVHdEPyOHFyTOZQ6PtUTFqSgqA0s4xOGOyHyoqN2qR9W', 'Maria', 'Santos', 'student', 'active', true),
('550e8400-e29b-41d4-a716-446655440004', 'student3@example.com', '$2b$12$LQv3c1yqBkVHdEPyOHFyTOZQ6PtUTFqSgqA0s4xOGOyHyoqN2qR9W', 'Pedro', 'Costa', 'student', 'active', true);

-- =============================================
-- SUBSCRIPTION PLANS
-- =============================================

INSERT INTO subscription_plans (id, name, description, price, currency, billing_interval, trial_days, features) VALUES
('660e8400-e29b-41d4-a716-446655440000', 'Gratuito', 'Acesso limitado a conteúdos gratuitos', 0.00, 'BRL', 'monthly', 0, '["Conteúdo gratuito", "Anúncios", "Qualidade SD"]'::jsonb),
('660e8400-e29b-41d4-a716-446655440001', 'Premium Mensal', 'Acesso completo a todo conteúdo', 29.90, 'BRL', 'monthly', 7, '["Todo conteúdo", "Sem anúncios", "Qualidade HD/4K", "Download offline", "Múltiplas telas"]'::jsonb),
('660e8400-e29b-41d4-a716-446655440002', 'Premium Anual', 'Acesso completo com desconto anual', 299.90, 'BRL', 'yearly', 7, '["Todo conteúdo", "Sem anúncios", "Qualidade HD/4K", "Download offline", "Múltiplas telas", "Desconto anual"]'::jsonb);

-- =============================================
-- CATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, description, icon_url, color, sort_order) VALUES
('770e8400-e29b-41d4-a716-446655440000', 'K-Drama', 'k-drama', 'Dramas coreanos populares', '/icons/k-drama.svg', '#FF6B6B', 1),
('770e8400-e29b-41d4-a716-446655440001', 'J-Drama', 'j-drama', 'Dramas japoneses', '/icons/j-drama.svg', '#4ECDC4', 2),
('770e8400-e29b-41d4-a716-446655440002', 'C-Drama', 'c-drama', 'Dramas chineses', '/icons/c-drama.svg', '#45B7D1', 3),
('770e8400-e29b-41d4-a716-446655440003', 'Romance', 'romance', 'Histórias românticas', '/icons/romance.svg', '#FF69B4', 4),
('770e8400-e29b-41d4-a716-446655440004', 'Ação', 'acao', 'Séries de ação e aventura', '/icons/action.svg', '#FF8C00', 5),
('770e8400-e29b-41d4-a716-446655440005', 'Comédia', 'comedia', 'Conteúdo divertido e engraçado', '/icons/comedy.svg', '#32CD32', 6),
('770e8400-e29b-41d4-a716-446655440006', 'Histórico', 'historico', 'Dramas históricos e de época', '/icons/historical.svg', '#8B4513', 7),
('770e8400-e29b-41d4-a716-446655440007', 'Thriller', 'thriller', 'Suspense e mistério', '/icons/thriller.svg', '#800080', 8);

-- =============================================
-- TAGS
-- =============================================

INSERT INTO tags (id, name, slug) VALUES
('880e8400-e29b-41d4-a716-446655440000', 'Popular', 'popular'),
('880e8400-e29b-41d4-a716-446655440001', 'Legendado', 'legendado'),
('880e8400-e29b-41d4-a716-446655440002', 'Dublado', 'dublado'),
('880e8400-e29b-41d4-a716-446655440003', 'Novo', 'novo'),
('880e8400-e29b-41d4-a716-446655440004', 'Completo', 'completo'),
('880e8400-e29b-41d4-a716-446655440005', 'Em Andamento', 'em-andamento'),
('880e8400-e29b-41d4-a716-446655440006', 'Alta Avaliação', 'alta-avaliacao');

-- =============================================
-- SAMPLE COURSES/SERIES
-- =============================================

-- K-Drama Series
INSERT INTO courses (id, title, slug, description, short_description, thumbnail_url, banner_url, content_type, status, is_premium, price, duration_minutes, difficulty_level, rating, total_views, release_date, created_by) VALUES
('990e8400-e29b-41d4-a716-446655440000', 'Descendentes do Sol', 'descendentes-do-sol', 'Uma história de amor entre um capitão das forças especiais e uma médica cirurgiã que trabalham juntos em uma zona de guerra.', 'Romance militar emocionante', '/thumbnails/descendants-of-the-sun.jpg', '/banners/descendants-of-the-sun.jpg', 'series', 'published', true, 0.00, 960, 3, 4.8, 125000, '2024-01-15', '550e8400-e29b-41d4-a716-446655440001'),

('990e8400-e29b-41d4-a716-446655440001', 'Lição de Casa', 'licao-de-casa', 'Drama sobre estudantes do ensino médio enfrentando pressões acadêmicas e sociais na Coreia do Sul.', 'Drama escolar coreano', '/thumbnails/class-of-lies.jpg', '/banners/class-of-lies.jpg', 'series', 'published', true, 0.00, 800, 2, 4.6, 89000, '2024-02-01', '550e8400-e29b-41d4-a716-446655440001'),

('990e8400-e29b-41d4-a716-446655440002', 'Hotel Del Luna', 'hotel-del-luna', 'Uma história sobrenatural sobre um hotel que hospeda espíritos e fantasmas.', 'Fantasy romance drama', '/thumbnails/hotel-del-luna.jpg', '/banners/hotel-del-luna.jpg', 'series', 'published', true, 0.00, 1120, 4, 4.9, 200000, '2024-01-20', '550e8400-e29b-41d4-a716-446655440001');

-- J-Drama Series
INSERT INTO courses (id, title, slug, description, short_description, thumbnail_url, banner_url, content_type, status, is_premium, price, duration_minutes, difficulty_level, rating, total_views, release_date, created_by) VALUES
('990e8400-e29b-41d4-a716-446655440003', 'Hana Yori Dango', 'hana-yori-dango', 'Uma garota comum se envolve com os garotos mais populares da escola.', 'Romance escolar clássico', '/thumbnails/hana-yori-dango.jpg', '/banners/hana-yori-dango.jpg', 'series', 'published', true, 0.00, 720, 2, 4.5, 75000, '2024-01-25', '550e8400-e29b-41d4-a716-446655440001'),

('990e8400-e29b-41d4-a716-446655440004', 'Good Morning Call', 'good-morning-call', 'Dois estudantes são forçados a dividir o mesmo apartamento.', 'Comédia romântica', '/thumbnails/good-morning-call.jpg', '/banners/good-morning-call.jpg', 'series', 'published', false, 0.00, 600, 1, 4.2, 45000, '2024-02-10', '550e8400-e29b-41d4-a716-446655440001');

-- Movie examples
INSERT INTO courses (id, title, slug, description, short_description, thumbnail_url, banner_url, content_type, status, is_premium, price, duration_minutes, difficulty_level, rating, total_views, release_date, created_by) VALUES
('990e8400-e29b-41d4-a716-446655440005', 'Parasita', 'parasita', 'Filme premiado sobre desigualdade social na Coreia do Sul.', 'Thriller social premiado', '/thumbnails/parasite.jpg', '/banners/parasite.jpg', 'movie', 'published', true, 0.00, 132, 4, 4.9, 300000, '2024-01-01', '550e8400-e29b-41d4-a716-446655440001');

-- =============================================
-- COURSE CATEGORIES RELATIONSHIPS
-- =============================================

INSERT INTO course_categories (course_id, category_id) VALUES
-- Descendentes do Sol: K-Drama, Romance, Ação
('990e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440000'),
('990e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440003'),
('990e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440004'),

-- Lição de Casa: K-Drama
('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440000'),

-- Hotel Del Luna: K-Drama, Romance
('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440000'),
('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440003'),

-- Hana Yori Dango: J-Drama, Romance
('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440003'),

-- Good Morning Call: J-Drama, Romance, Comédia
('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440003'),
('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440005'),

-- Parasita: Thriller
('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440007');

-- =============================================
-- COURSE TAGS RELATIONSHIPS
-- =============================================

INSERT INTO course_tags (course_id, tag_id) VALUES
-- Popular series
('990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000'),
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440000'),
('990e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440000'),

-- Legendado
('990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440001'),

-- Completo
('990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440004'),
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440004'),
('990e8400-e29b-41d4-a716-446655440003', '880e8400-e29b-41d4-a716-446655440004'),
('990e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440004'),

-- Alta Avaliação
('990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440006'),
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440006'),
('990e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440006');

-- =============================================
-- SEASONS (for series)
-- =============================================

-- Descendentes do Sol - Season 1
INSERT INTO seasons (id, course_id, title, description, season_number, thumbnail_url) VALUES
('aa0e8400-e29b-41d4-a716-446655440000', '990e8400-e29b-41d4-a716-446655440000', 'Primeira Temporada', 'A história completa do amor entre Yoo Shi-jin e Kang Mo-yeon', 1, '/thumbnails/descendants-s1.jpg');

-- Hotel Del Luna - Season 1
INSERT INTO seasons (id, course_id, title, description, season_number, thumbnail_url) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440002', 'Primeira Temporada', 'A misteriosa história do Hotel Del Luna e seus hóspedes especiais', 1, '/thumbnails/hotel-del-luna-s1.jpg');

-- =============================================
-- SAMPLE EPISODES
-- =============================================

-- Episodes for Descendentes do Sol
INSERT INTO episodes (id, course_id, season_id, title, description, episode_number, video_url, video_duration, video_size, thumbnail_url, is_free, view_count) VALUES
('bb0e8400-e29b-41d4-a716-446655440000', '990e8400-e29b-41d4-a716-446655440000', 'aa0e8400-e29b-41d4-a716-446655440000', 'O Encontro', 'Shi-jin conhece Mo-yeon em um primeiro encontro inesperado', 1, '/videos/descendants-ep1.mp4', 3600, 1073741824, '/thumbnails/descendants-ep1.jpg', true, 50000),
('bb0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440000', 'aa0e8400-e29b-41d4-a716-446655440000', 'Missão Perigosa', 'A primeira missão militar que testa os limites do relacionamento', 2, '/videos/descendants-ep2.mp4', 3600, 1073741824, '/thumbnails/descendants-ep2.jpg', false, 45000),
('bb0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440000', 'aa0e8400-e29b-41d4-a716-446655440000', 'Zona de Guerra', 'Shi-jin e Mo-yeon se reencontram em território hostil', 3, '/videos/descendants-ep3.mp4', 3600, 1073741824, '/thumbnails/descendants-ep3.jpg', false, 42000);

-- Episodes for Hotel Del Luna
INSERT INTO episodes (id, course_id, season_id, title, description, episode_number, video_url, video_duration, video_size, thumbnail_url, is_free, view_count) VALUES
('bb0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440002', 'aa0e8400-e29b-41d4-a716-446655440001', 'O Hotel Maldito', 'Chan-sung descobril a verdadeira natureza do Hotel Del Luna', 1, '/videos/hotel-del-luna-ep1.mp4', 4200, 1073741824, '/thumbnails/hotel-del-luna-ep1.jpg', true, 80000),
('bb0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440002', 'aa0e8400-e29b-41d4-a716-446655440001', 'Hóspedes Especiais', 'Os primeiros hóspedes fantasmas e suas histórias', 2, '/videos/hotel-del-luna-ep2.mp4', 4200, 1073741824, '/thumbnails/hotel-del-luna-ep2.jpg', false, 75000);

-- Movie episode (full movie)
INSERT INTO episodes (id, course_id, title, description, episode_number, video_url, video_duration, video_size, thumbnail_url, is_free, view_count) VALUES
('bb0e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440005', 'Parasita - Filme Completo', 'O filme completo vencedor do Oscar', 1, '/videos/parasite-full.mp4', 7920, 2147483648, '/thumbnails/parasite-full.jpg', false, 150000);

-- =============================================
-- SAMPLE SUBSCRIPTIONS
-- =============================================

-- Give sample users subscriptions
INSERT INTO subscriptions (id, user_id, plan_id, status, starts_at, ends_at, trial_ends_at) VALUES
('cc0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', NOW() - INTERVAL '3 days'),
('cc0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', 'trial', NOW() - INTERVAL '2 days', NOW() + INTERVAL '358 days', NOW() + INTERVAL '5 days'),
('cc0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440000', 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '330 days', NULL);

-- =============================================
-- SAMPLE USER PROGRESS
-- =============================================

-- User 1 watching Descendentes do Sol
INSERT INTO user_progress (user_id, episode_id, progress_seconds, completed, completed_at, last_watched_at) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440000', 3600, true, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('550e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440001', 1800, false, NULL, NOW() - INTERVAL '2 days');

-- User 2 watching Hotel Del Luna
INSERT INTO user_progress (user_id, episode_id, progress_seconds, completed, completed_at, last_watched_at) VALUES
('550e8400-e29b-41d4-a716-446655440003', 'bb0e8400-e29b-41d4-a716-446655440003', 4200, true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440003', 'bb0e8400-e29b-41d4-a716-446655440004', 2100, false, NULL, NOW() - INTERVAL '1 day');

-- =============================================
-- SAMPLE FAVORITES
-- =============================================

INSERT INTO user_favorites (user_id, course_id) VALUES
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440002'),
('550e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440002'),
('550e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440005'),
('550e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440003');

-- =============================================
-- SAMPLE REVIEWS
-- =============================================

INSERT INTO user_reviews (user_id, course_id, rating, review_text, is_approved) VALUES
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440000', 5, 'Série incrível! A química entre os protagonistas é perfeita.', true),
('550e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440002', 5, 'Hotel Del Luna é uma obra-prima. Mistura fantasia e romance de forma única.', true),
('550e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440005', 5, 'Parasita merece todos os prêmios que ganhou. Filme genial!', true),
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440003', 4, 'Clássico do J-Drama. Um pouco datado mas ainda divertido.', true);

-- =============================================
-- SAMPLE WATCH HISTORY
-- =============================================

INSERT INTO watch_history (user_id, episode_id, watched_at, watch_duration, device_info) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440000', NOW() - INTERVAL '5 days', 3600, '{"device": "desktop", "browser": "chrome", "os": "windows"}'::jsonb),
('550e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '2 days', 1800, '{"device": "mobile", "browser": "safari", "os": "ios"}'::jsonb),
('550e8400-e29b-41d4-a716-446655440003', 'bb0e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '3 days', 4200, '{"device": "tablet", "browser": "chrome", "os": "android"}'::jsonb),
('550e8400-e29b-41d4-a716-446655440003', 'bb0e8400-e29b-41d4-a716-446655440004', NOW() - INTERVAL '1 day', 2100, '{"device": "smart_tv", "app": "doramaflix_tv", "os": "android_tv"}'::jsonb);

-- =============================================
-- UPDATE STATISTICS
-- =============================================

-- Update course ratings based on reviews
UPDATE courses SET rating = (
    SELECT AVG(rating::numeric)
    FROM user_reviews 
    WHERE course_id = courses.id AND is_approved = true
) WHERE id IN (
    SELECT DISTINCT course_id FROM user_reviews WHERE is_approved = true
);

-- Update episode view counts
UPDATE episodes SET view_count = (
    SELECT COUNT(*)
    FROM watch_history
    WHERE episode_id = episodes.id
) WHERE id IN (
    SELECT DISTINCT episode_id FROM watch_history
);

-- Update course total views
UPDATE courses SET total_views = (
    SELECT SUM(episodes.view_count)
    FROM episodes
    WHERE episodes.course_id = courses.id
) WHERE id IN (
    SELECT DISTINCT course_id FROM episodes
);

-- =============================================
-- REFRESH SEQUENCES
-- =============================================

-- This ensures that auto-generated IDs continue from the right point
-- SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

ANALYZE;