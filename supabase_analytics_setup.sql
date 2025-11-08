-- Supabase Analytics ve Notification tabloları
-- Bu dosya Supabase dashboard'da SQL Editor'da çalıştırılmalıdır

-- Analytics Events tablosu
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Users tablosu
CREATE TABLE IF NOT EXISTS analytics_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics User Properties tablosu
CREATE TABLE IF NOT EXISTS analytics_user_properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  properties JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analytics Errors tablosu
CREATE TABLE IF NOT EXISTS analytics_errors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Push Tokens tablosu
CREATE TABLE IF NOT EXISTS user_push_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);

-- Index'ler oluştur
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);

CREATE INDEX IF NOT EXISTS idx_analytics_users_user_id ON analytics_users(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_user_properties_user_id ON analytics_user_properties(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_errors_timestamp ON analytics_errors(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_errors_user_id ON analytics_errors(user_id);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id ON user_push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_platform ON user_push_tokens(platform);

-- RLS (Row Level Security) politikaları
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_user_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Analytics Events politikaları
CREATE POLICY "Users can insert their own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

-- Analytics Users politikaları
CREATE POLICY "Users can insert their own analytics user data" ON analytics_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics user data" ON analytics_users
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics user data" ON analytics_users
  FOR SELECT USING (auth.uid() = user_id);

-- Analytics User Properties politikaları
CREATE POLICY "Users can insert their own analytics user properties" ON analytics_user_properties
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics user properties" ON analytics_user_properties
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics user properties" ON analytics_user_properties
  FOR SELECT USING (auth.uid() = user_id);

-- Analytics Errors politikaları
CREATE POLICY "Users can insert their own analytics errors" ON analytics_errors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics errors" ON analytics_errors
  FOR SELECT USING (auth.uid() = user_id);

-- User Push Tokens politikaları
CREATE POLICY "Users can insert their own push tokens" ON user_push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens" ON user_push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own push tokens" ON user_push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens" ON user_push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- Fonksiyonlar
-- Analytics event ekleme fonksiyonu
CREATE OR REPLACE FUNCTION add_analytics_event(
  event_name_param TEXT,
  event_data_param JSONB DEFAULT '{}',
  user_id_param UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO analytics_events (event_name, event_data, user_id)
  VALUES (event_name_param, event_data_param, user_id_param)
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Push token ekleme/güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION upsert_push_token(
  token_param TEXT,
  platform_param TEXT,
  user_id_param UUID DEFAULT auth.uid()
)
RETURNS UUID AS $$
DECLARE
  token_id UUID;
BEGIN
  INSERT INTO user_push_tokens (user_id, token, platform)
  VALUES (user_id_param, token_param, platform_param)
  ON CONFLICT (user_id, platform)
  DO UPDATE SET 
    token = token_param,
    updated_at = NOW()
  RETURNING id INTO token_id;
  
  RETURN token_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
