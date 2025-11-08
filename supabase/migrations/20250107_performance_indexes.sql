-- Performance optimization indexes
-- Bu migration dosyası performans sorunlarını çözmek için index'ler ekler

-- Messages tablosu için index'ler
-- user_id ve timestamp kombinasyonu için composite index (en çok kullanılan sorgu)
CREATE INDEX IF NOT EXISTS idx_messages_user_id_timestamp 
ON public.messages(user_id, timestamp DESC);

-- timestamp için ayrı index (order by için)
CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
ON public.messages(timestamp DESC);

-- user_id için index (WHERE clause için)
CREATE INDEX IF NOT EXISTS idx_messages_user_id 
ON public.messages(user_id);

-- role için index (filtreleme için)
CREATE INDEX IF NOT EXISTS idx_messages_role 
ON public.messages(role);

-- Chat sessions tablosu için index'ler
-- user_id ve created_at kombinasyonu için composite index
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id_created_at 
ON public.chat_sessions(user_id, created_at DESC);

-- user_id için index
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id 
ON public.chat_sessions(user_id);

-- created_at için index
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at 
ON public.chat_sessions(created_at DESC);

-- updated_at için index
CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at 
ON public.chat_sessions(updated_at DESC);

-- Premium subscriptions tablosu için index'ler
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_user_id 
ON public.premium_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_is_active 
ON public.premium_subscriptions(is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_expires_at 
ON public.premium_subscriptions(expires_at);

-- Analytics tabloları için index'ler
CREATE INDEX IF NOT EXISTS idx_analytics_users_user_id 
ON public.analytics_users(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_user_properties_user_id 
ON public.analytics_user_properties(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id 
ON public.analytics_events(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name 
ON public.analytics_events(event_name);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at 
ON public.analytics_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_errors_user_id 
ON public.analytics_errors(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_errors_created_at 
ON public.analytics_errors(created_at DESC);

-- User push tokens için index
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id 
ON public.user_push_tokens(user_id);

-- RLS politikalarını optimize etmek için istatistikleri güncelle
ANALYZE public.messages;
ANALYZE public.chat_sessions;
ANALYZE public.premium_subscriptions;
ANALYZE public.analytics_users;
ANALYZE public.analytics_events;

