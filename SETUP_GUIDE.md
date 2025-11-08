# Emora AI - Kurulum Rehberi

## 🚀 Hızlı Başlangıç

### 1. Paketleri Yükle
```bash
npm install
```

### 2. Environment Variables Yapılandırması

**Development için:**

1. `.env.example` dosyasını `.env` olarak kopyalayın:
   ```bash
   cp .env.example .env
   ```

2. `.env` dosyasını açın ve Supabase bilgilerinizi ekleyin:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

3. **ÖNEMLİ:** `.env` dosyası zaten `.gitignore`'da, asla Git'e commit etmeyin!

**Production için:**

Production build'ler için EAS Secrets kullanılmalı. Detaylar için `APP_STORE_SECURITY.md` dosyasına bakın.

### 3. Supabase Veritabanı Kurulumu
1. [Supabase Dashboard](https://supabase.com/dashboard)'a gidin
2. Projenizi seçin
3. SQL Editor'ı açın
4. `supabase_clean_setup.sql` dosyasının içeriğini kopyalayıp çalıştırın

### 4. Uygulamayı Başlat
```bash
npx expo start
```

## 📱 Özellikler

### ✅ Tamamlanan Özellikler
- **Supabase-only**: Firebase bağımlılıkları kaldırıldı
- **Glass UI**: BlurView ile modern glass effect'ler
- **Çok dilli destek**: 13 farklı dil
- **AI Sohbet**: Supabase Edge Functions ile
- **Analytics**: Supabase tabanlı analytics sistemi
- **Push Notifications**: Expo Push Notifications
- **Premium sistem**: Limit kontrolü ve upgrade seçenekleri
- **Modern UI**: Dark theme ve animasyonlar

### 🔧 Teknik Detaylar

#### Supabase Konfigürasyonu
- URL ve API key `.env` dosyasında veya EAS Secrets'ta saklanıyor (güvenli)
- RLS (Row Level Security) politikaları aktif
- Analytics ve notification tabloları hazır
- **Güvenlik:** Hardcoded değerler kaldırıldı, environment variables zorunlu

#### Paketler
- `@react-native-community/blur`: Glass effect'ler için
- `expo-constants`: Konfigürasyon yönetimi için
- `expo-localization`: Dil desteği için
- `expo-notifications`: Push notifications için

#### Veritabanı Tabloları
- `profiles`: Kullanıcı profilleri
- `chat_sessions`: Sohbet oturumları
- `messages`: Mesajlar
- `analytics_events`: Analytics olayları
- `analytics_users`: Analytics kullanıcı verileri
- `analytics_user_properties`: Kullanıcı özellikleri
- `analytics_errors`: Hata logları
- `user_push_tokens`: Push notification token'ları

## 🎯 Sonraki Adımlar

### Supabase Kurulumu
1. `supabase_clean_setup.sql` dosyasını Supabase SQL Editor'da çalıştırın
2. Tablolar ve politikalar otomatik oluşturulacak
3. Analytics ve notification sistemi hazır olacak

### Test Etme
1. Uygulamayı başlatın: `npx expo start`
2. Dil seçimi ekranını test edin
3. Onboarding ekranını test edin
4. Kayıt/giriş işlemlerini test edin
5. AI sohbet özelliğini test edin
6. Glass effect'leri kontrol edin

## 🐛 Sorun Giderme

### Node.js Versiyonu
- Node.js 18.20.8 kullanılıyor
- Metro paketleri için uyarılar normal (uygulama çalışır)

### BlurView Sorunları
- iOS'ta otomatik çalışır
- Android'de native modül gerekebilir

### Supabase Bağlantı Sorunları
- `.env` dosyasının proje kök dizininde olduğundan emin olun
- `.env` dosyasında `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` değerlerinin olduğunu kontrol edin
- URL ve API key'in doğru olduğundan emin olun
- RLS politikalarını kontrol edin
- Network bağlantısını kontrol edin
- Uygulamayı yeniden başlatın (environment variables değişiklikleri için)

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Console loglarını kontrol edin
2. Supabase dashboard'da hataları kontrol edin
3. Network bağlantısını test edin

---

**Emora AI** - Modern AI Chat Uygulaması 🚀
