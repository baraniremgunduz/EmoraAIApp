-- Premium Subscriptions Tablosu
-- Bu dosyayı Supabase SQL Editöründe çalıştırın

-- Premium subscriptions tablosu oluştur
CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL,
  purchase_token TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index'ler oluştur
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_user_id ON premium_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_active ON premium_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_premium_subscriptions_product_id ON premium_subscriptions(product_id);

-- RLS politikaları
ALTER TABLE premium_subscriptions ENABLE ROW LEVEL SECURITY;

-- Kullanıcılar sadece kendi premium aboneliklerini görebilir
CREATE POLICY "Users can view own premium subscriptions" ON premium_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Kullanıcılar kendi premium aboneliklerini ekleyebilir
CREATE POLICY "Users can insert own premium subscriptions" ON premium_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Kullanıcılar kendi premium aboneliklerini güncelleyebilir
CREATE POLICY "Users can update own premium subscriptions" ON premium_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Kullanıcılar kendi premium aboneliklerini silebilir
CREATE POLICY "Users can delete own premium subscriptions" ON premium_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Updated_at trigger'ı
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_premium_subscriptions_updated_at 
    BEFORE UPDATE ON premium_subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Premium durumu kontrol fonksiyonu
CREATE OR REPLACE FUNCTION is_user_premium(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM premium_subscriptions 
        WHERE user_id = user_uuid 
        AND is_active = true 
        AND (expires_at IS NULL OR expires_at > NOW())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Premium abonelik geçmişi view'ı
CREATE OR REPLACE VIEW premium_subscription_history AS
SELECT 
    ps.id,
    ps.user_id,
    ps.product_id,
    ps.is_active,
    ps.expires_at,
    ps.created_at,
    ps.updated_at,
    CASE 
        WHEN ps.expires_at IS NULL THEN 'lifetime'
        WHEN ps.expires_at > NOW() THEN 'active'
        ELSE 'expired'
    END as status
FROM premium_subscriptions ps
WHERE ps.user_id = auth.uid()
ORDER BY ps.created_at DESC;

-- Premium istatistikleri view'ı (admin için)
CREATE OR REPLACE VIEW premium_stats AS
SELECT 
    COUNT(*) as total_subscriptions,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_subscriptions,
    COUNT(CASE WHEN expires_at IS NULL THEN 1 END) as lifetime_subscriptions,
    COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as valid_subscriptions,
    COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired_subscriptions
FROM premium_subscriptions;

-- Premium kullanıcıları view'ı
CREATE OR REPLACE VIEW premium_users AS
SELECT DISTINCT
    u.id,
    u.email,
    u.created_at as user_created_at,
    ps.created_at as premium_created_at,
    ps.product_id,
    ps.expires_at,
    CASE 
        WHEN ps.expires_at IS NULL THEN 'lifetime'
        WHEN ps.expires_at > NOW() THEN 'active'
        ELSE 'expired'
    END as premium_status
FROM auth.users u
JOIN premium_subscriptions ps ON u.id = ps.user_id
WHERE ps.is_active = true
ORDER BY ps.created_at DESC;
