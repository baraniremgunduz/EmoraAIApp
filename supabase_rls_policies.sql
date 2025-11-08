-- Emora AI - RLS Politikaları
-- Bu dosyayı tablolar oluşturulduktan sonra çalıştırın

-- 1. Row Level Security (RLS) politikaları

-- Profiles tablosu için RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Chat Sessions tablosu için RLS
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat sessions" ON chat_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat sessions" ON chat_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat sessions" ON chat_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat sessions" ON chat_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Messages tablosu için RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages" ON messages
  FOR DELETE USING (auth.uid() = user_id);

-- Analytics Events politikaları
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own analytics events" ON analytics_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics events" ON analytics_events
  FOR SELECT USING (auth.uid() = user_id);

-- Analytics Users politikaları
ALTER TABLE analytics_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own analytics user data" ON analytics_users
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics user data" ON analytics_users
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics user data" ON analytics_users
  FOR SELECT USING (auth.uid() = user_id);

-- Analytics User Properties politikaları
ALTER TABLE analytics_user_properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own analytics user properties" ON analytics_user_properties
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics user properties" ON analytics_user_properties
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics user properties" ON analytics_user_properties
  FOR SELECT USING (auth.uid() = user_id);

-- Analytics Errors politikaları
ALTER TABLE analytics_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own analytics errors" ON analytics_errors
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics errors" ON analytics_errors
  FOR SELECT USING (auth.uid() = user_id);

-- User Push Tokens politikaları
ALTER TABLE user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own push tokens" ON user_push_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own push tokens" ON user_push_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own push tokens" ON user_push_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own push tokens" ON user_push_tokens
  FOR DELETE USING (auth.uid() = user_id);

-- RLS politikaları tamamlandı!
