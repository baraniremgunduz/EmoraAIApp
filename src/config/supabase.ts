// Supabase yapılandırma dosyası
import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

// Environment variables'dan yapılandırma bilgilerini al
// Production'da bu değerler EAS Build sırasında environment variables'dan gelecek
// Development'ta .env dosyasından veya EAS secrets'tan alınmalı
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Güvenlik: Environment variables zorunlu
if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage =
    '❌ Güvenlik Hatası: Supabase yapılandırma bilgileri bulunamadı!\n\n' +
    'Lütfen şunları yapın:\n' +
    '1. Development için: .env dosyası oluşturun ve EXPO_PUBLIC_SUPABASE_URL ile EXPO_PUBLIC_SUPABASE_ANON_KEY ekleyin\n' +
    '2. Production için: EAS secrets kullanın (eas secret:create komutu ile)\n\n' +
    'Daha fazla bilgi için: APP_STORE_SECURITY.md dosyasına bakın.';

  if (__DEV__) {
    logger.error(errorMessage);
    // Development'ta uygulama çalışmaya devam edebilir ama uyarı verir
    throw new Error('Supabase yapılandırma bilgileri eksik. Lütfen .env dosyası oluşturun.');
  } else {
    // Production'da kesinlikle çalışmamalı
    throw new Error('Supabase yapılandırma bilgileri eksik. Lütfen EAS secrets yapılandırın.');
  }
}

// Supabase client oluştur
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// OpenAI API anahtarı artık Supabase Edge Functions'da güvenli şekilde saklanıyor
// Client-side'da artık OpenAI API key'e ihtiyaç yok
