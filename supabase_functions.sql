-- Emora AI - Fonksiyonlar ve Trigger'lar
-- Bu dosyayı tablolar ve RLS politikaları oluşturulduktan sonra çalıştırın

-- 1. Updated_at otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Profiles tablosu için trigger
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. Chat Sessions tablosu için trigger
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Kullanıcı kaydı sırasında profil oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'avatar');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Trigger: Yeni kullanıcı kaydı sırasında profil oluştur
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Analytics fonksiyonları
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

-- 7. Push token ekleme/güncelleme fonksiyonu
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

-- Fonksiyonlar ve trigger'lar tamamlandı!
