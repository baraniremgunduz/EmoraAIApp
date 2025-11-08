# Emora AI - AI Arkadaş Uygulaması

Emora AI, kullanıcıların yapay zeka ile güvenli, samimi ve sürekli sohbet edebildiği mobil uygulamadır. Kullanıcılar dertlerini paylaşabilir, mutluluklarını anlatabilir ve AI arkadaşlarıyla sohbet edebilir.

## 🚀 Özellikler

- **Onboarding Ekranı**: Uygulamayı tanıtan güzel bir giriş deneyimi
- **Kimlik Doğrulama**: Supabase ile güvenli giriş/kayıt sistemi
- **AI Sohbet**: Yapay zeka ile doğal sohbet deneyimi
- **Profil Yönetimi**: Kullanıcı bilgileri ve istatistikler
- **Ayarlar**: Tema, bildirim ve gizlilik ayarları
- **Dark Tema**: Modern ve göz yormayan koyu tema
- **Responsive Tasarım**: Tüm ekran boyutlarına uyumlu

## 🛠️ Teknolojiler

- **Framework**: Expo (React Native)
- **Backend**: Supabase
- **UI Kütüphanesi**: React Native Paper
- **Navigasyon**: React Navigation
- **Tema**: Custom Dark Theme
- **Dil**: TypeScript

## 📱 Platform Desteği

- iOS (Ana hedef)
- Android (Gelecek sürümlerde)

## 🚀 Kurulum

### Gereksinimler

- Node.js (v16 veya üzeri)
- Expo CLI
- iOS Simulator (iOS geliştirme için)
- Android Studio (Android geliştirme için)

### Adımlar

1. **Projeyi klonlayın**
   ```bash
   git clone <repository-url>
   cd EmoraAI
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Environment Variables (.env dosyası oluşturun)**
   Proje kök dizininde `.env` dosyası oluşturun ve aşağıdaki değerleri ekleyin:
   ```env
   # Supabase Configuration
   EXPO_PUBLIC_SUPABASE_URL=https://wxmexmdpobjzgiqjxuix.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bWV4bWRwb2JqemdpcWp4dWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NTY5NzQsImV4cCI6MjA3NjMzMjk3NH0.FFTUufP4XE4Ofa5TPw5_YgYkQ2Pia0WjTe8-FQE4m0U

   # OpenAI API Key artık Supabase Edge Functions'da güvenli şekilde saklanıyor
   # Client-side'da artık OpenAI API key'e ihtiyaç yok
   ```

4. **Supabase Edge Functions Kurulumu**
   ```bash
   # Supabase CLI ile Edge Function'ı deploy edin
   npx supabase functions deploy chat
   
   # OpenAI API key'i güvenli şekilde ayarlayın
   npx supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
   ```

5. **Supabase Veritabanı Kurulumu**
   - Supabase projenize giriş yapın
   - SQL Editörünü açın
   - `supabase_setup.sql` dosyasındaki SQL komutlarını çalıştırın
   - Bu komutlar gerekli tabloları ve güvenlik politikalarını oluşturacak

6. **Uygulamayı başlatın**
   ```bash
   npm start
   ```

7. **Platform seçin**
   - iOS için: `i` tuşuna basın
   - Android için: `a` tuşuna basın
   - Web için: `w` tuşuna basın

## 🗄️ Veritabanı Yapısı

### Users Tablosu
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Messages Tablosu
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  timestamp TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
  chat_session_id UUID REFERENCES chat_sessions(id)
);
```

### Chat Sessions Tablosu
```sql
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🎨 Tema Yapılandırması

Uygulama modern dark tema kullanır. Tema renkleri `src/utils/theme.ts` dosyasında tanımlanmıştır:

- **Primary**: #6366F1 (Indigo)
- **Secondary**: #8B5CF6 (Purple)
- **Background**: #0F0F23 (Dark blue-black)
- **Surface**: #1A1A2E (Darker blue)

## 📁 Proje Yapısı

```
src/
├── components/          # Yeniden kullanılabilir bileşenler
├── config/             # Yapılandırma dosyaları
├── navigation/         # Navigasyon yapısı
├── screens/           # Ekran bileşenleri
├── services/          # API ve servis katmanı
├── types/             # TypeScript tip tanımları
├── utils/             # Yardımcı fonksiyonlar
└── contexts/          # React Context'ler
```

## 🔧 Geliştirme

### Yeni Ekran Ekleme
1. `src/screens/` klasörüne yeni ekran dosyasını ekleyin
2. `src/navigation/AppNavigator.tsx` dosyasında import edin
3. Navigasyon yapısına ekleyin

### Yeni Servis Ekleme
1. `src/services/` klasörüne yeni servis dosyasını ekleyin
2. Gerekli API çağrılarını implement edin
3. TypeScript tiplerini `src/types/` klasöründe tanımlayın

## 🚀 Deployment

### iOS
```bash
expo build:ios
```

### Android
```bash
expo build:android
```

## 📝 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📞 İletişim

- Proje Sahibi: [İsim]
- Email: [email@example.com]
- GitHub: [github.com/username]

---

**Not**: Bu uygulama geliştirme aşamasındadır. Production kullanımı için ek güvenlik önlemleri ve testler gereklidir.
