// Supabase yapılandırma dosyası
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

let supabaseInstance: SupabaseClient | null = null;

// Lazy initialization - sadece gerektiğinde oluştur
// Bu sayede module seviyesinde crash yerine, kullanım sırasında hata yakalanabilir
export const getSupabase = (): SupabaseClient => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  // Güvenlik: Environment variables zorunlu
  if (!supabaseUrl || !supabaseAnonKey) {
    const errorMessage =
      '❌ Güvenlik Hatası: Supabase yapılandırma bilgileri bulunamadı!\n\n' +
      'Lütfen şunları yapın:\n' +
      '1. Development için: .env dosyası oluşturun ve EXPO_PUBLIC_SUPABASE_URL ile EXPO_PUBLIC_SUPABASE_ANON_KEY ekleyin\n' +
      '2. Production için: EAS secrets kullanın (eas env:create komutu ile)\n\n' +
      'Daha fazla bilgi için: APP_STORE_SECURITY.md dosyasına bakın.';

    logger.error(errorMessage);
    
    // Production'da bile crash yerine daha güvenli bir hata mesajı
    // ErrorBoundary bu hatayı yakalayabilir
    throw new Error('Supabase yapılandırma bilgileri eksik. Lütfen EAS secrets yapılandırın.');
  }

  // Supabase client oluştur - AsyncStorage ile session persistence
  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // React Native'de URL'de session yok
    },
  });
  return supabaseInstance;
};

// Backward compatibility için - lazy getter
// Bu şekilde modül seviyesinde crash olmaz, sadece kullanıldığında hata verir
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  },
});

// OpenAI API anahtarı artık Supabase Edge Functions'da güvenli şekilde saklanıyor
// Client-side'da artık OpenAI API key'e ihtiyaç yok
