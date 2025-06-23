-- =============================================
-- DORAMAFLIX - COMPREHENSIVE DRAMA SEED DATA
-- =============================================

-- Clear existing data (be careful with this in production!)
TRUNCATE TABLE user_audit, system_logs, notifications, file_uploads, 
               trending_content, search_queries, user_engagement, 
               episode_reviews, user_watch_status, subtitles, video_qualities,
               cast_members, crew_members, persons,
               user_reviews, user_favorites, watch_history, user_progress,
               payments, subscriptions, subscription_plans,
               course_tags, tags, episodes, seasons, course_categories,
               courses, categories, refresh_tokens, users
               RESTART IDENTITY CASCADE;

-- =============================================
-- USERS SEED DATA
-- =============================================

-- Admin user (password: admin123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified, subscription_tier) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin@doramaflix.com', '$2b$12$LQv3c1yqBkVHdEPyOHFyTOZQ6PtUTFqSgqA0s4xOGOyHyoqN2qR9W', 'Admin', 'DoramaFlix', 'admin', 'active', true, 'premium');

-- Manager user (password: manager123)
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified, subscription_tier) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'manager@doramaflix.com', '$2b$12$LQv3c1yqBkVHdEPyOHFyTOZQ6PtUTFqSgqA0s4xOGOyHyoqN2qR9W', 'Manager', 'Content', 'manager', 'active', true, 'premium');

-- Sample users with different preferences
INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, email_verified, subscription_tier, display_name, bio, favorite_genres, total_watch_time) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'ana.silva@example.com', '$2b$12$LQv3c1yqBkVHdEPyOHFyTOZQ6PtUTFqSgqA0s4xOGOyHyoqN2qR9W', 'Ana', 'Silva', 'student', 'active', true, 'premium', 'Ana K-Drama Lover', 'Apaixonada por dramas coreanos e romance', ARRAY['korean', 'romance'], 1250),
('550e8400-e29b-41d4-a716-446655440003', 'carlos.matsui@example.com', '$2b$12$LQv3c1yqBkVHdEPyOHFyTOZQ6PtUTFqSgqA0s4xOGOyHyoqN2qR9W', 'Carlos', 'Matsui', 'student', 'active', true, 'basic', 'Carlos Otaku', 'Fã de animes e J-dramas', ARRAY['japanese', 'action'], 800),
('550e8400-e29b-41d4-a716-446655440004', 'maria.wong@example.com', '$2b$12$LQv3c1yqBkVHdEPyOHFyTOZQ6PtUTFqSgqA0s4xOGOyHyoqN2qR9W', 'Maria', 'Wong', 'student', 'active', true, 'premium', 'Maria Chen', 'Estudante de mandarim e amante de C-dramas', ARRAY['chinese', 'historical'], 950),
('550e8400-e29b-41d4-a716-446655440005', 'pedro.costa@example.com', '$2b$12$LQv3c1yqBkVHdEPyOHFyTOZQ6PtUTFqSgqA0s4xOGOyHyoqN2qR9W', 'Pedro', 'Costa', 'student', 'active', true, 'free', 'Pedro Casual', 'Assisto quando tenho tempo livre', ARRAY['action', 'thriller'], 320),
('550e8400-e29b-41d4-a716-446655440006', 'julia.kim@example.com', '$2b$12$LQv3c1yqBkVHdEPyOHFyTOZQ6PtUTFqSgqA0s4xOGOyHyoqN2qR9W', 'Julia', 'Kim', 'student', 'active', true, 'premium', 'Julia Hallyu', 'Completamente viciada na Onda Coreana', ARRAY['korean', 'comedy'], 2100);

-- =============================================
-- SUBSCRIPTION PLANS
-- =============================================

INSERT INTO subscription_plans (id, name, description, price, currency, billing_interval, trial_days, features, max_concurrent_streams, max_download_quality, ads_supported) VALUES
('660e8400-e29b-41d4-a716-446655440000', 'Gratuito', 'Acesso limitado a conteúdos gratuitos', 0.00, 'BRL', 'monthly', 0, '["Conteúdo gratuito", "Anúncios", "Qualidade SD"]'::jsonb, 1, 'SD_480p', true),
('660e8400-e29b-41d4-a716-446655440001', 'Basic', 'Acesso básico sem anúncios', 19.90, 'BRL', 'monthly', 7, '["Sem anúncios", "Qualidade HD", "1 tela simultânea"]'::jsonb, 1, 'HD_720p', false),
('660e8400-e29b-41d4-a716-446655440002', 'Premium', 'Acesso completo premium', 29.90, 'BRL', 'monthly', 7, '["Todo conteúdo", "Sem anúncios", "Qualidade 4K", "Download offline", "4 telas simultâneas"]'::jsonb, 4, 'UHD_4K', false),
('660e8400-e29b-41d4-a716-446655440003', 'Premium Anual', 'Premium com desconto anual', 299.90, 'BRL', 'yearly', 7, '["Todo conteúdo", "Sem anúncios", "Qualidade 4K", "Download offline", "4 telas simultâneas", "Desconto anual"]'::jsonb, 4, 'UHD_4K', false);

-- =============================================
-- CATEGORIES
-- =============================================

INSERT INTO categories (id, name, slug, description, icon_url, color, sort_order) VALUES
('770e8400-e29b-41d4-a716-446655440000', 'K-Drama', 'k-drama', 'Dramas coreanos populares', '/icons/k-drama.svg', '#FF6B6B', 1),
('770e8400-e29b-41d4-a716-446655440001', 'J-Drama', 'j-drama', 'Dramas japoneses', '/icons/j-drama.svg', '#4ECDC4', 2),
('770e8400-e29b-41d4-a716-446655440002', 'C-Drama', 'c-drama', 'Dramas chineses', '/icons/c-drama.svg', '#45B7D1', 3),
('770e8400-e29b-41d4-a716-446655440003', 'Romance', 'romance', 'Histórias românticas de tirar o fôlego', '/icons/romance.svg', '#FF69B4', 4),
('770e8400-e29b-41d4-a716-446655440004', 'Ação', 'acao', 'Séries de ação e aventura', '/icons/action.svg', '#FF8C00', 5),
('770e8400-e29b-41d4-a716-446655440005', 'Comédia', 'comedia', 'Conteúdo divertido e engraçado', '/icons/comedy.svg', '#32CD32', 6),
('770e8400-e29b-41d4-a716-446655440006', 'Histórico', 'historico', 'Dramas históricos e de época', '/icons/historical.svg', '#8B4513', 7),
('770e8400-e29b-41d4-a716-446655440007', 'Thriller', 'thriller', 'Suspense e mistério', '/icons/thriller.svg', '#800080', 8),
('770e8400-e29b-41d4-a716-446655440008', 'Escola', 'escola', 'Dramas escolares e universitários', '/icons/school.svg', '#87CEEB', 9),
('770e8400-e29b-41d4-a716-446655440009', 'Médico', 'medico', 'Dramas médicos e hospitalares', '/icons/medical.svg', '#FF6347', 10),
('770e8400-e29b-41d4-a716-446655440010', 'BL', 'bl', 'Boys Love / Romance entre homens', '/icons/bl.svg', '#DA70D6', 11),
('770e8400-e29b-41d4-a716-446655440011', 'GL', 'gl', 'Girls Love / Romance entre mulheres', '/icons/gl.svg', '#FF1493', 12);

-- =============================================
-- TAGS
-- =============================================

INSERT INTO tags (id, name, slug) VALUES
('880e8400-e29b-41d4-a716-446655440000', 'Popular', 'popular'),
('880e8400-e29b-41d4-a716-446655440001', 'Legendado PT-BR', 'legendado-pt'),
('880e8400-e29b-41d4-a716-446655440002', 'Dublado', 'dublado'),
('880e8400-e29b-41d4-a716-446655440003', 'Novo Episódio', 'novo-episodio'),
('880e8400-e29b-41d4-a716-446655440004', 'Série Completa', 'serie-completa'),
('880e8400-e29b-41d4-a716-446655440005', 'Em Andamento', 'em-andamento'),
('880e8400-e29b-41d4-a716-446655440006', 'Alta Avaliação', 'alta-avaliacao'),
('880e8400-e29b-41d4-a716-446655440007', 'Tendência', 'tendencia'),
('880e8400-e29b-41d4-a716-446655440008', 'Remake', 'remake'),
('880e8400-e29b-41d4-a716-446655440009', 'Baseado em Webtoon', 'webtoon'),
('880e8400-e29b-41d4-a716-446655440010', 'Idol Drama', 'idol'),
('880e8400-e29b-41d4-a716-446655440011', 'Chaebol', 'chaebol'),
('880e8400-e29b-41d4-a716-446655440012', 'Segundo Chance', 'segunda-chance'),
('880e8400-e29b-41d4-a716-446655440013', 'Diferença de Idade', 'diferenca-idade'),
('880e8400-e29b-41d4-a716-446655440014', 'Triângulo Amoroso', 'triangulo-amoroso');

-- =============================================
-- PERSONS (CAST & CREW)
-- =============================================

INSERT INTO persons (id, name, original_name, profile_url, biography, birth_date, nationality) VALUES
-- Korean Actors
('990e8400-e29b-41d4-a716-446655440000', 'Song Joong-ki', '송중기', '/profiles/song-joong-ki.jpg', 'Ator sul-coreano conhecido por seus papéis em Descendentes do Sol e Vincenzo.', '1985-09-19', 'South Korea'),
('990e8400-e29b-41d4-a716-446655440001', 'Song Hye-kyo', '송혜교', '/profiles/song-hye-kyo.jpg', 'Atriz sul-coreana famosa por Descendentes do Sol e Full House.', '1981-11-22', 'South Korea'),
('990e8400-e29b-41d4-a716-446655440002', 'IU', '아이유', '/profiles/iu.jpg', 'Cantora e atriz sul-coreana, conhecida por Hotel Del Luna e My Mister.', '1993-05-16', 'South Korea'),
('990e8400-e29b-41d4-a716-446655440003', 'Yeo Jin-goo', '여진구', '/profiles/yeo-jin-goo.jpg', 'Ator sul-coreano conhecido por Hotel Del Luna e Beyond Evil.', '1997-08-13', 'South Korea'),
('990e8400-e29b-41d4-a716-446655440004', 'Park Seo-joon', '박서준', '/profiles/park-seo-joon.jpg', 'Ator sul-coreano popular por Itaewon Class e What\'s Wrong with Secretary Kim.', '1988-12-16', 'South Korea'),
('990e8400-e29b-41d4-a716-446655440005', 'Jun Ji-hyun', '전지현', '/profiles/jun-ji-hyun.jpg', 'Atriz sul-coreana famosa por My Sassy Girl e Kingdom.', '1981-10-30', 'South Korea'),

-- Japanese Actors  
('990e8400-e29b-41d4-a716-446655440006', 'Mao Inoue', '井上真央', '/profiles/mao-inoue.jpg', 'Atriz japonesa conhecida por Hana Yori Dango.', '1987-01-09', 'Japan'),
('990e8400-e29b-41d4-a716-446655440007', 'Matsumoto Jun', '松本潤', '/profiles/matsumoto-jun.jpg', 'Ator e membro do grupo Arashi, conhecido por Hana Yori Dango.', '1983-08-30', 'Japan'),
('990e8400-e29b-41d4-a716-446655440008', 'Haruka Fukuhara', '福原遥', '/profiles/haruka-fukuhara.jpg', 'Atriz japonesa conhecida por Good Morning Call.', '1998-08-28', 'Japan'),
('990e8400-e29b-41d4-a716-446655440009', 'Shiraishi Shunya', '白石隼也', '/profiles/shiraishi-shunya.jpg', 'Ator japonês conhecido por Good Morning Call.', '1990-08-03', 'Japan'),

-- Chinese Actors
('990e8400-e29b-41d4-a716-446655440010', 'Yang Yang', '杨洋', '/profiles/yang-yang.jpg', 'Ator chinês popular em Love O2O e The King\'s Avatar.', '1991-09-09', 'China'),
('990e8400-e29b-41d4-a716-446655440011', 'Zhao Liying', '赵丽颖', '/profiles/zhao-liying.jpg', 'Atriz chinesa conhecida por Story of Yanxi Palace.', '1987-10-16', 'China'),

-- Directors
('990e8400-e29b-41d4-a716-446655440012', 'Lee Eung-bok', '이응복', '/profiles/lee-eung-bok.jpg', 'Diretor sul-coreano conhecido por Descendentes do Sol e Goblin.', '1966-01-01', 'South Korea'),
('990e8400-e29b-41d4-a716-446655440013', 'Oh Choong-hwan', '오충환', '/profiles/oh-choong-hwan.jpg', 'Diretor sul-coreano conhecido por Hotel Del Luna.', '1970-01-01', 'South Korea');

-- =============================================
-- SAMPLE COURSES/SERIES (COMPREHENSIVE)
-- =============================================

-- K-Drama Series
INSERT INTO courses (id, title, original_title, slug, description, short_description, thumbnail_url, banner_url, content_type, drama_origin, original_language, production_year, status, is_premium, price, duration_minutes, total_episodes, age_rating, rating, rating_count, total_views, popularity, release_date, end_date, created_by) VALUES

-- Descendentes do Sol
('990e8400-e29b-41d4-a716-446655440000', 'Descendentes do Sol', '태양의 후예', 'descendentes-do-sol', 
'Uma história de amor épica entre um capitão das forças especiais sul-coreanas e uma médica cirurgiã que trabalham juntos em uma zona de conflito. Este drama combina romance, ação e drama militar de forma magistral, mostrando como o amor pode florescer mesmo nas circunstâncias mais perigosas.',
'Romance militar emocionante entre um soldado e uma médica', 
'/thumbnails/descendants-of-the-sun.jpg', '/banners/descendants-of-the-sun.jpg', 'series', 'korean', 'Korean', 2016, 'published', true, 0.00, 960, 16, '14+', 4.8, 15420, 125000, 95000, '2016-02-24', '2016-04-14', '550e8400-e29b-41d4-a716-446655440001'),

-- Hotel Del Luna
('990e8400-e29b-41d4-a716-446655440001', 'Hotel Del Luna', '호텔 델루나', 'hotel-del-luna',
'Um hotel luxuoso e misterioso localizado no coração de Seul, que serve exclusivamente hóspedes fantasmas. A história segue a proprietária imortal do hotel e um novo gerente humano enquanto eles lidam com almas perdidas e segredos do passado. Uma mistura única de fantasia, romance e drama sobrenatural.',
'Hotel sobrenatural que hospeda espíritos e fantasmas',
'/thumbnails/hotel-del-luna.jpg', '/banners/hotel-del-luna.jpg', 'series', 'korean', 'Korean', 2019, 'published', true, 0.00, 1120, 16, '16+', 4.9, 18930, 200000, 98500, '2019-07-13', '2019-09-01', '550e8400-e29b-41d4-a716-446655440001'),

-- Crash Landing on You
('990e8400-e29b-41d4-a716-446655440002', 'Pousando no Amor', '사랑의 불시착', 'pousando-no-amor',
'Uma herdeira sul-coreana sofre um acidente de parapente e aterrissa na Coreia do Norte, onde conhece um oficial do exército que a ajuda a esconder sua identidade e encontrar uma forma de voltar para casa. Uma história de amor impossível que transcende fronteiras.',
'Romance impossível entre Coreia do Sul e do Norte',
'/thumbnails/crash-landing-on-you.jpg', '/banners/crash-landing-on-you.jpg', 'series', 'korean', 'Korean', 2019, 'published', true, 0.00, 1200, 16, '14+', 4.9, 22100, 280000, 99200, '2019-12-14', '2020-02-16', '550e8400-e29b-41d4-a716-446655440001'),

-- Sky Castle
('990e8400-e29b-41d4-a716-446655440003', 'Sky Castle', '스카이 캐슬', 'sky-castle',
'Um drama satírico que retrata a vida de famílias de elite que vivem em um condomínio exclusivo chamado Sky Castle. A série explora a pressão educacional extrema na Coreia do Sul e as consequências da obsessão por status social e sucesso acadêmico.',
'Sátira sobre famílias de elite e pressão educacional',
'/thumbnails/sky-castle.jpg', '/banners/sky-castle.jpg', 'series', 'korean', 'Korean', 2018, 'published', true, 0.00, 1200, 20, '16+', 4.7, 19850, 195000, 94500, '2018-11-23', '2019-02-01', '550e8400-e29b-41d4-a716-446655440001');

-- J-Drama Series
INSERT INTO courses (id, title, original_title, slug, description, short_description, thumbnail_url, banner_url, content_type, drama_origin, original_language, production_year, status, is_premium, price, duration_minutes, total_episodes, age_rating, rating, rating_count, total_views, popularity, release_date, end_date, created_by) VALUES

-- Hana Yori Dango
('990e8400-e29b-41d4-a716-446655440004', 'Hana Yori Dango', '花より男子', 'hana-yori-dango',
'Uma garota de classe trabalhadora se matricula em uma escola de elite dominada por um grupo de quatro garotos ricos conhecidos como F4. Quando ela ousa enfrentá-los, sua vida vira de cabeça para baixo neste clássico drama romântico japonês baseado no mangá.',
'Romance escolar clássico com F4',
'/thumbnails/hana-yori-dango.jpg', '/banners/hana-yori-dango.jpg', 'series', 'japanese', 'Japanese', 2005, 'published', true, 0.00, 720, 9, '12+', 4.5, 12300, 75000, 87000, '2005-10-21', '2005-12-16', '550e8400-e29b-41d4-a716-446655440001'),

-- Good Morning Call
('990e8400-e29b-41d4-a716-446655440005', 'Good Morning Call', 'グッドモーニング・コール', 'good-morning-call',
'Dois estudantes do ensino médio são forçados a dividir o mesmo apartamento devido a um mal-entendido imobiliário. O que começa como uma situação embaraçosa se transforma em uma doce história de amor e amadurecimento.',
'Comédia romântica sobre coabitação forçada',
'/thumbnails/good-morning-call.jpg', '/banners/good-morning-call.jpg', 'series', 'japanese', 'Japanese', 2016, 'published', false, 0.00, 600, 17, '12+', 4.2, 8950, 45000, 82500, '2016-02-12', '2016-06-24', '550e8400-e29b-41d4-a716-446655440001');

-- C-Drama Series  
INSERT INTO courses (id, title, original_title, slug, description, short_description, thumbnail_url, banner_url, content_type, drama_origin, original_language, production_year, status, is_premium, price, duration_minutes, total_episodes, age_rating, rating, rating_count, total_views, popularity, release_date, end_date, created_by) VALUES

-- Story of Yanxi Palace
('990e8400-e29b-41d4-a716-446655440006', 'História do Palácio Yanxi', '延禧攻略', 'historia-palacio-yanxi',
'Ambientado durante a dinastia Qing, segue a jornada de Wei Yingluo, uma jovem determinada que entra no Palácio Proibido como serva com o objetivo de descobrir a verdade sobre a morte misteriosa de sua irmã. Um drama histórico cheio de intrigas palacianas.',
'Drama histórico chinês sobre intrigas palacianas',
'/thumbnails/story-yanxi-palace.jpg', '/banners/story-yanxi-palace.jpg', 'series', 'chinese', 'Chinese', 2018, 'published', true, 0.00, 2800, 70, '14+', 4.6, 16700, 180000, 91000, '2018-07-19', '2018-08-29', '550e8400-e29b-41d4-a716-446655440001');

-- Movies
INSERT INTO courses (id, title, original_title, slug, description, short_description, thumbnail_url, banner_url, content_type, drama_origin, original_language, production_year, status, is_premium, price, duration_minutes, total_episodes, age_rating, rating, rating_count, total_views, popularity, release_date, created_by) VALUES

-- Parasita
('990e8400-e29b-41d4-a716-446655440007', 'Parasita', '기생충', 'parasita',
'Um thriller social brilhante que retrata a crescente desigualdade social na Coreia do Sul através da história de duas famílias - uma rica e uma pobre. O filme vencedor do Oscar explora temas de classe, ganância e sobrevivência de forma magistral.',
'Thriller social premiado sobre desigualdade',
'/thumbnails/parasite.jpg', '/banners/parasite.jpg', 'movie', 'korean', 'Korean', 2019, 'published', true, 0.00, 132, 1, '16+', 4.9, 28500, 300000, 99800, '2019-05-30', '550e8400-e29b-41d4-a716-446655440001');

-- =============================================
-- COURSE CATEGORIES RELATIONSHIPS
-- =============================================

INSERT INTO course_categories (course_id, category_id) VALUES
-- Descendentes do Sol: K-Drama, Romance, Ação, Médico
('990e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440000'),
('990e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440003'),
('990e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440004'),
('990e8400-e29b-41d4-a716-446655440000', '770e8400-e29b-41d4-a716-446655440009'),

-- Hotel Del Luna: K-Drama, Romance, Thriller
('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440000'),
('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440003'),
('990e8400-e29b-41d4-a716-446655440001', '770e8400-e29b-41d4-a716-446655440007'),

-- Crash Landing on You: K-Drama, Romance
('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440000'),
('990e8400-e29b-41d4-a716-446655440002', '770e8400-e29b-41d4-a716-446655440003'),

-- Sky Castle: K-Drama, Thriller
('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440000'),
('990e8400-e29b-41d4-a716-446655440003', '770e8400-e29b-41d4-a716-446655440007'),

-- Hana Yori Dango: J-Drama, Romance, Escola
('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440003'),
('990e8400-e29b-41d4-a716-446655440004', '770e8400-e29b-41d4-a716-446655440008'),

-- Good Morning Call: J-Drama, Romance, Comédia
('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440003'),
('990e8400-e29b-41d4-a716-446655440005', '770e8400-e29b-41d4-a716-446655440005'),

-- Story of Yanxi Palace: C-Drama, Histórico
('990e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440002'),
('990e8400-e29b-41d4-a716-446655440006', '770e8400-e29b-41d4-a716-446655440006'),

-- Parasita: Thriller
('990e8400-e29b-41d4-a716-446655440007', '770e8400-e29b-41d4-a716-446655440007');

-- =============================================
-- COURSE TAGS RELATIONSHIPS
-- =============================================

INSERT INTO course_tags (course_id, tag_id) VALUES
-- Popular series
('990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440000'),
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440000'),
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440000'),
('990e8400-e29b-41d4-a716-446655440007', '880e8400-e29b-41d4-a716-446655440000'),

-- High ratings
('990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440006'),
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440006'),
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440006'),
('990e8400-e29b-41d4-a716-446655440007', '880e8400-e29b-41d4-a716-446655440006'),

-- Completed series
('990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440004'),
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440004'),
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440004'),
('990e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440004'),
('990e8400-e29b-41d4-a716-446655440007', '880e8400-e29b-41d4-a716-446655440004'),

-- Subtitled content
('990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440005', '880e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440006', '880e8400-e29b-41d4-a716-446655440001'),
('990e8400-e29b-41d4-a716-446655440007', '880e8400-e29b-41d4-a716-446655440001'),

-- Trending
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440007'),
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440007'),

-- Chaebol theme
('990e8400-e29b-41d4-a716-446655440000', '880e8400-e29b-41d4-a716-446655440011'),
('990e8400-e29b-41d4-a716-446655440004', '880e8400-e29b-41d4-a716-446655440011');

-- =============================================
-- CAST & CREW ASSIGNMENTS
-- =============================================

-- Descendentes do Sol cast
INSERT INTO cast_members (course_id, person_id, role, is_lead, sort_order) VALUES
('990e8400-e29b-41d4-a716-446655440000', '990e8400-e29b-41d4-a716-446655440000', 'Yoo Shi-jin', true, 1),
('990e8400-e29b-41d4-a716-446655440000', '990e8400-e29b-41d4-a716-446655440001', 'Kang Mo-yeon', true, 2);

-- Hotel Del Luna cast
INSERT INTO cast_members (course_id, person_id, role, is_lead, sort_order) VALUES
('990e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440002', 'Jang Man-wol', true, 1),
('990e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440003', 'Gu Chan-sung', true, 2);

-- Hana Yori Dango cast
INSERT INTO cast_members (course_id, person_id, role, is_lead, sort_order) VALUES
('990e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440006', 'Makino Tsukushi', true, 1),
('990e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440007', 'Hanazawa Rui', true, 2);

-- Good Morning Call cast
INSERT INTO cast_members (course_id, person_id, role, is_lead, sort_order) VALUES
('990e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440008', 'Yoshikawa Nao', true, 1),
('990e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440009', 'Uehara Hisashi', true, 2);

-- Directors
INSERT INTO crew_members (course_id, person_id, role, department) VALUES
('990e8400-e29b-41d4-a716-446655440000', '990e8400-e29b-41d4-a716-446655440012', 'Director', 'Directing'),
('990e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440013', 'Director', 'Directing');

-- =============================================
-- SEASONS AND EPISODES
-- =============================================

-- Descendentes do Sol - Season 1
INSERT INTO seasons (id, course_id, title, description, season_number, thumbnail_url) VALUES
('aa0e8400-e29b-41d4-a716-446655440000', '990e8400-e29b-41d4-a716-446655440000', 'Primeira Temporada', 'A história completa do amor entre Yoo Shi-jin e Kang Mo-yeon na zona de conflito', 1, '/thumbnails/descendants-s1.jpg');

-- Hotel Del Luna - Season 1
INSERT INTO seasons (id, course_id, title, description, season_number, thumbnail_url) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 'Primeira Temporada', 'A misteriosa história do Hotel Del Luna e seus hóspedes especiais', 1, '/thumbnails/hotel-del-luna-s1.jpg');

-- Sample episodes for Descendentes do Sol
INSERT INTO episodes (id, course_id, season_id, title, original_title, description, episode_number, video_url, video_duration, video_size, thumbnail_url, is_free, view_count, rating, rating_count, air_date) VALUES
('bb0e8400-e29b-41d4-a716-446655440000', '990e8400-e29b-41d4-a716-446655440000', 'aa0e8400-e29b-41d4-a716-446655440000', 'O Encontro', '첫 만남', 'Shi-jin conhece Mo-yeon em um primeiro encontro inesperado', 1, '/videos/descendants-ep1.mp4', 3600, 1073741824, '/thumbnails/descendants-ep1.jpg', true, 50000, 4.8, 2100, '2016-02-24'),
('bb0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440000', 'aa0e8400-e29b-41d4-a716-446655440000', 'Missão Perigosa', '위험한 임무', 'A primeira missão militar que testa os limites do relacionamento', 2, '/videos/descendants-ep2.mp4', 3600, 1073741824, '/thumbnails/descendants-ep2.jpg', false, 45000, 4.7, 1950, '2016-02-25'),
('bb0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440000', 'aa0e8400-e29b-41d4-a716-446655440000', 'Zona de Guerra', '전쟁 지역', 'Shi-jin e Mo-yeon se reencontram em território hostil', 3, '/videos/descendants-ep3.mp4', 3600, 1073741824, '/thumbnails/descendants-ep3.jpg', false, 42000, 4.9, 1800, '2016-03-02');

-- Sample episodes for Hotel Del Luna
INSERT INTO episodes (id, course_id, season_id, title, original_title, description, episode_number, video_url, video_duration, video_size, thumbnail_url, is_free, view_count, rating, rating_count, air_date) VALUES
('bb0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440001', 'O Hotel Maldito', '저주받은 호텔', 'Chan-sung descobre a verdadeira natureza do Hotel Del Luna', 1, '/videos/hotel-del-luna-ep1.mp4', 4200, 1073741824, '/thumbnails/hotel-del-luna-ep1.jpg', true, 80000, 4.9, 3200, '2019-07-13'),
('bb0e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440001', 'aa0e8400-e29b-41d4-a716-446655440001', 'Hóspedes Especiais', '특별한 손님들', 'Os primeiros hóspedes fantasmas e suas histórias', 2, '/videos/hotel-del-luna-ep2.mp4', 4200, 1073741824, '/thumbnails/hotel-del-luna-ep2.jpg', false, 75000, 4.8, 2950, '2019-07-14');

-- Movie episode (full movie)
INSERT INTO episodes (id, course_id, title, original_title, description, episode_number, video_url, video_duration, video_size, thumbnail_url, is_free, view_count, rating, rating_count, air_date) VALUES
('bb0e8400-e29b-41d4-a716-446655440005', '990e8400-e29b-41d4-a716-446655440007', 'Parasita - Filme Completo', '기생충 - 전편', 'O filme completo vencedor do Oscar de Melhor Filme', 1, '/videos/parasite-full.mp4', 7920, 2147483648, '/thumbnails/parasite-full.jpg', false, 150000, 4.9, 4500, '2019-05-30');

-- =============================================
-- SUBTITLES AND VIDEO QUALITIES
-- =============================================

-- Subtitles for popular episodes
INSERT INTO subtitles (episode_id, language, file_url, file_name, is_default) VALUES
-- Descendentes do Sol EP1
('bb0e8400-e29b-41d4-a716-446655440000', 'portuguese', '/subtitles/descendants-ep1-pt.vtt', 'descendants_ep1_pt.vtt', true),
('bb0e8400-e29b-41d4-a716-446655440000', 'english', '/subtitles/descendants-ep1-en.vtt', 'descendants_ep1_en.vtt', false),
('bb0e8400-e29b-41d4-a716-446655440000', 'spanish', '/subtitles/descendants-ep1-es.vtt', 'descendants_ep1_es.vtt', false),

-- Hotel Del Luna EP1
('bb0e8400-e29b-41d4-a716-446655440003', 'portuguese', '/subtitles/hotel-del-luna-ep1-pt.vtt', 'hotel_del_luna_ep1_pt.vtt', true),
('bb0e8400-e29b-41d4-a716-446655440003', 'english', '/subtitles/hotel-del-luna-ep1-en.vtt', 'hotel_del_luna_ep1_en.vtt', false);

-- Video qualities for episodes
INSERT INTO video_qualities (episode_id, quality_type, video_url, file_size, bitrate) VALUES
-- Descendentes do Sol EP1
('bb0e8400-e29b-41d4-a716-446655440000', 'SD_480p', '/videos/descendants-ep1-480p.mp4', 536870912, 1000),
('bb0e8400-e29b-41d4-a716-446655440000', 'HD_720p', '/videos/descendants-ep1-720p.mp4', 1073741824, 2500),
('bb0e8400-e29b-41d4-a716-446655440000', 'FHD_1080p', '/videos/descendants-ep1-1080p.mp4', 2147483648, 5000),

-- Hotel Del Luna EP1
('bb0e8400-e29b-41d4-a716-446655440003', 'HD_720p', '/videos/hotel-del-luna-ep1-720p.mp4', 1073741824, 2500),
('bb0e8400-e29b-41d4-a716-446655440003', 'FHD_1080p', '/videos/hotel-del-luna-ep1-1080p.mp4', 2147483648, 5000),
('bb0e8400-e29b-41d4-a716-446655440003', 'UHD_4K', '/videos/hotel-del-luna-ep1-4k.mp4', 8589934592, 15000);

-- =============================================
-- USER SUBSCRIPTIONS & ACTIVITY
-- =============================================

-- Sample subscriptions
INSERT INTO subscriptions (id, user_id, plan_id, status, starts_at, ends_at, trial_ends_at) VALUES
('cc0e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440002', 'active', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', NOW() - INTERVAL '3 days'),
('cc0e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', 'active', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days', NOW() + INTERVAL '2 days'),
('cc0e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', 'trial', NOW() - INTERVAL '2 days', NOW() + INTERVAL '358 days', NOW() + INTERVAL '5 days'),
('cc0e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440000', 'active', NOW() - INTERVAL '30 days', NOW() + INTERVAL '330 days', NULL),
('cc0e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', 'active', NOW() - INTERVAL '15 days', NOW() + INTERVAL '15 days', NOW() - INTERVAL '8 days');

-- User progress
INSERT INTO user_progress (user_id, episode_id, progress_seconds, completed, completed_at, last_watched_at) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440000', 3600, true, NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),
('550e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440001', 1800, false, NULL, NOW() - INTERVAL '2 days'),
('550e8400-e29b-41d4-a716-446655440003', 'bb0e8400-e29b-41d4-a716-446655440003', 4200, true, NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('550e8400-e29b-41d4-a716-446655440004', 'bb0e8400-e29b-41d4-a716-446655440000', 900, false, NULL, NOW() - INTERVAL '1 day'),
('550e8400-e29b-41d4-a716-446655440006', 'bb0e8400-e29b-41d4-a716-446655440003', 2100, false, NULL, NOW() - INTERVAL '6 hours');

-- User favorites
INSERT INTO user_favorites (user_id, course_id) VALUES
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440002'),
('550e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440004'),
('550e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440005'),
('550e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440006'),
('550e8400-e29b-41d4-a716-446655440006', '990e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440006', '990e8400-e29b-41d4-a716-446655440002');

-- User watch status
INSERT INTO user_watch_status (user_id, course_id, status, score, started_at, completed_at) VALUES
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440000', 'completed', 9, NOW() - INTERVAL '10 days', NOW() - INTERVAL '5 days'),
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440001', 'watching', NULL, NOW() - INTERVAL '3 days', NULL),
('550e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440004', 'completed', 8, NOW() - INTERVAL '15 days', NOW() - INTERVAL '7 days'),
('550e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440001', 'watching', NULL, NOW() - INTERVAL '2 days', NULL),
('550e8400-e29b-41d4-a716-446655440006', '990e8400-e29b-41d4-a716-446655440002', 'watching', NULL, NOW() - INTERVAL '1 day', NULL);

-- User reviews
INSERT INTO user_reviews (user_id, course_id, rating, review_text, is_approved, helpful_votes, total_votes) VALUES
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440000', 5, 'Série incrível! A química entre Song Joong-ki e Song Hye-kyo é perfeita. Uma das melhores histórias de amor que já vi.', true, 45, 52),
('550e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440004', 4, 'Clássico absoluto do J-Drama. Matsumoto Jun está perfeito como Hanazawa Rui. Nostálgia pura!', true, 38, 41),
('550e8400-e29b-41d4-a716-446655440004', '990e8400-e29b-41d4-a716-446655440001', 5, 'Hotel Del Luna é uma obra-prima. IU está incrível e a história é única. Mistura fantasia e romance de forma magistral.', true, 67, 73),
('550e8400-e29b-41d4-a716-446655440006', '990e8400-e29b-41d4-a716-446655440002', 5, 'Crash Landing on You conquistou meu coração! Hyun Bin e Son Ye-jin têm uma química incrível. Chorei muito!', true, 89, 95),
('550e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440007', 5, 'Parasita merece todos os prêmios que ganhou. Filme genial que mostra a realidade social de forma brilhante.', true, 124, 135);

-- Episode reviews
INSERT INTO episode_reviews (user_id, episode_id, rating, review_text, is_approved) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440000', 5, 'Primeiro episódio perfeito! Me fisgou desde o início.', true),
('550e8400-e29b-41d4-a716-446655440003', 'bb0e8400-e29b-41d4-a716-446655440003', 5, 'Que abertura incrível! IU está fenomenal.', true),
('550e8400-e29b-41d4-a716-446655440006', 'bb0e8400-e29b-41d4-a716-446655440000', 4, 'Ótimo início de série, mal posso esperar pelos próximos episódios.', true);

-- Watch history
INSERT INTO watch_history (user_id, episode_id, watched_at, watch_duration, device_info, quality_watched, subtitles_used) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440000', NOW() - INTERVAL '5 days', 3600, '{"device": "desktop", "browser": "chrome", "os": "windows"}'::jsonb, 'FHD_1080p', 'portuguese'),
('550e8400-e29b-41d4-a716-446655440002', 'bb0e8400-e29b-41d4-a716-446655440001', NOW() - INTERVAL '2 days', 1800, '{"device": "mobile", "browser": "safari", "os": "ios"}'::jsonb, 'HD_720p', 'portuguese'),
('550e8400-e29b-41d4-a716-446655440003', 'bb0e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '3 days', 4200, '{"device": "tablet", "browser": "chrome", "os": "android"}'::jsonb, 'FHD_1080p', 'portuguese'),
('550e8400-e29b-41d4-a716-446655440004', 'bb0e8400-e29b-41d4-a716-446655440000', NOW() - INTERVAL '1 day', 900, '{"device": "smart_tv", "app": "doramaflix_tv", "os": "android_tv"}'::jsonb, 'HD_720p', 'portuguese'),
('550e8400-e29b-41d4-a716-446655440006', 'bb0e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '6 hours', 2100, '{"device": "desktop", "browser": "firefox", "os": "macos"}'::jsonb, 'UHD_4K', 'portuguese');

-- =============================================
-- ANALYTICS & ENGAGEMENT DATA
-- =============================================

-- Content analytics for current period
INSERT INTO content_analytics (course_id, date, total_views, unique_viewers, watch_time_minutes, completion_rate, average_rating, new_subscribers) VALUES
('990e8400-e29b-41d4-a716-446655440000', CURRENT_DATE - 1, 15420, 8930, 234560, 0.8750, 4.80, 245),
('990e8400-e29b-41d4-a716-446655440001', CURRENT_DATE - 1, 18930, 11240, 421890, 0.8920, 4.90, 387),
('990e8400-e29b-41d4-a716-446655440002', CURRENT_DATE - 1, 22100, 14850, 532110, 0.9150, 4.90, 456),
('990e8400-e29b-41d4-a716-446655440007', CURRENT_DATE - 1, 28500, 18920, 312400, 0.9580, 4.90, 623);

-- User engagement data
INSERT INTO user_engagement (user_id, date, sessions_count, total_watch_time, episodes_watched, episodes_completed, searches_count, favorites_added, reviews_written) VALUES
('550e8400-e29b-41d4-a716-446655440002', CURRENT_DATE - 1, 3, 180, 4, 2, 8, 1, 1),
('550e8400-e29b-41d4-a716-446655440003', CURRENT_DATE - 1, 2, 120, 2, 1, 5, 0, 0),
('550e8400-e29b-41d4-a716-446655440004', CURRENT_DATE - 1, 1, 45, 1, 0, 3, 1, 0),
('550e8400-e29b-41d4-a716-446655440006', CURRENT_DATE - 1, 4, 240, 6, 3, 12, 2, 1);

-- Trending content
INSERT INTO trending_content (course_id, trending_score, period, period_start, period_end, rank, category) VALUES
('990e8400-e29b-41d4-a716-446655440002', 99.85, 'daily', CURRENT_DATE - 1, CURRENT_DATE, 1, 'korean'),
('990e8400-e29b-41d4-a716-446655440001', 98.92, 'daily', CURRENT_DATE - 1, CURRENT_DATE, 2, 'korean'),
('990e8400-e29b-41d4-a716-446655440007', 98.76, 'daily', CURRENT_DATE - 1, CURRENT_DATE, 3, NULL),
('990e8400-e29b-41d4-a716-446655440000', 95.30, 'daily', CURRENT_DATE - 1, CURRENT_DATE, 4, 'korean'),
('990e8400-e29b-41d4-a716-446655440006', 87.45, 'daily', CURRENT_DATE - 1, CURRENT_DATE, 5, 'chinese');

-- Search queries
INSERT INTO search_queries (user_id, query, filters, results, clicked, clicked_id) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'romance coreano', '{"origin": "korean", "genre": "romance"}'::jsonb, 156, true, '990e8400-e29b-41d4-a716-446655440002'),
('550e8400-e29b-41d4-a716-446655440003', 'escola japones', '{"origin": "japanese", "genre": "school"}'::jsonb, 23, true, '990e8400-e29b-41d4-a716-446655440004'),
('550e8400-e29b-41d4-a716-446655440004', 'drama medico', '{"genre": "medical"}'::jsonb, 45, false, NULL),
('550e8400-e29b-41d4-a716-446655440006', 'song joong ki', '{}'::jsonb, 12, true, '990e8400-e29b-41d4-a716-446655440000'),
(NULL, 'kdrama 2024', '{"year": 2024}'::jsonb, 89, false, NULL);

-- =============================================
-- UPDATE STATISTICS
-- =============================================

-- Refresh materialized view
REFRESH MATERIALIZED VIEW mv_popular_content;

-- Update course ratings based on reviews
UPDATE courses SET rating = ROUND((
    SELECT AVG(rating::numeric)
    FROM user_reviews 
    WHERE course_id = courses.id AND is_approved = true
), 2), rating_count = (
    SELECT COUNT(*)
    FROM user_reviews 
    WHERE course_id = courses.id AND is_approved = true
) WHERE id IN (
    SELECT DISTINCT course_id FROM user_reviews WHERE is_approved = true
);

-- Update episode ratings and view counts
UPDATE episodes SET 
    rating = ROUND(COALESCE((
        SELECT AVG(rating::numeric)
        FROM episode_reviews 
        WHERE episode_id = episodes.id AND is_approved = true
    ), 0), 2),
    rating_count = COALESCE((
        SELECT COUNT(*)
        FROM episode_reviews 
        WHERE episode_id = episodes.id AND is_approved = true
    ), 0),
    view_count = COALESCE((
        SELECT COUNT(*)
        FROM watch_history
        WHERE episode_id = episodes.id
    ), 0);

-- Update course total views and popularity
UPDATE courses SET 
    total_views = COALESCE((
        SELECT SUM(episodes.view_count)
        FROM episodes
        WHERE episodes.course_id = courses.id
    ), 0),
    popularity = LEAST(100000, COALESCE((
        SELECT SUM(episodes.view_count) + (COUNT(uf.user_id) * 100) + (AVG(ur.rating) * 1000)
        FROM episodes
        LEFT JOIN user_favorites uf ON uf.course_id = courses.id
        LEFT JOIN user_reviews ur ON ur.course_id = courses.id AND ur.is_approved = true
        WHERE episodes.course_id = courses.id
    ), 0));

-- Update user total watch time
UPDATE users SET total_watch_time = COALESCE((
    SELECT SUM(watch_duration) / 60
    FROM watch_history
    WHERE user_id = users.id
), 0);

-- =============================================
-- FINAL ANALYSIS
-- =============================================

ANALYZE courses;
ANALYZE episodes;
ANALYZE persons;
ANALYZE cast_members;
ANALYZE crew_members;
ANALYZE user_progress;
ANALYZE watch_history;
ANALYZE user_reviews;
ANALYZE content_analytics;

-- Log completion
DO $$ 
BEGIN 
    RAISE NOTICE 'Comprehensive drama seed data completed successfully at %', NOW();
    RAISE NOTICE 'Total courses: %', (SELECT COUNT(*) FROM courses);
    RAISE NOTICE 'Total episodes: %', (SELECT COUNT(*) FROM episodes);
    RAISE NOTICE 'Total users: %', (SELECT COUNT(*) FROM users);
    RAISE NOTICE 'Total reviews: %', (SELECT COUNT(*) FROM user_reviews);
END $$;