# 🔐 Güvenlik Kurulum Rehberi - Adım Adım

Bu rehber, güvenlik güncellemelerinden sonra uygulamanızı nasıl yapılandıracağınızı gösterir.

## 📋 Özet

Artık **hardcoded API anahtarları kaldırıldı**. Tüm hassas bilgiler environment variables ile yönetiliyor:
- ✅ Development: `.env` dosyası kullanılır
- ✅ Production: EAS Secrets kullanılır

---

## 🚀 ADIM 1: Development Ortamı İçin (.env Dosyası)

### 1.1. .env Dosyası Oluştur

Proje kök dizininde (EmoraAI klasöründe) `.env` dosyası oluşturun:

```bash
cd "/Users/iremdogadogruyol/Emora AI App/EmoraAI"
cp .env.example .env
```

### 1.2. .env Dosyasını Düzenle

`.env` dosyasını açın ve gerçek değerlerinizi ekleyin:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**ÖNEMLİ:** Gerçek değerleri Supabase Dashboard'unuzdan alın:
1. Supabase Dashboard > Settings > API
2. `Project URL` değerini `EXPO_PUBLIC_SUPABASE_URL` olarak kullanın
3. `anon public` key değerini `EXPO_PUBLIC_SUPABASE_ANON_KEY` olarak kullanın

**ÖNEMLİ:** 
- `.env` dosyası zaten `.gitignore`'da, Git'e commit edilmeyecek
- Değerleri kendi Supabase projenizden alın

### 1.3. Uygulamayı Test Et

```bash
# Metro bundler'ı yeniden başlatın (environment variables için gerekli)
npx expo start --clear
```

Eğer hata alırsanız, `.env` dosyasının doğru yerde olduğundan ve değerlerin doğru olduğundan emin olun.

---

## 🏭 ADIM 2: Production Build İçin (EAS Secrets)

### 2.1. EAS CLI'yi Kontrol Et

```bash
# EAS CLI kurulu mu kontrol edin
eas --version

# Eğer kurulu değilse:
npm install -g eas-cli
```

### 2.2. EAS'e Giriş Yap

```bash
eas login
```

### 2.3. Secrets Oluştur

Aşağıdaki komutları sırayla çalıştırın:

```bash
# Supabase URL (gerçek değerinizi Supabase Dashboard'dan alın)
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co" --type string

# Supabase Anon Key (gerçek değerinizi Supabase Dashboard'dan alın)
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_anon_key_here" --type string

# App Store Shared Secret (iOS için - App Store Connect'ten alın)
eas secret:create --scope project --name APP_STORE_SHARED_SECRET --value "your_shared_secret_here" --type string
```

**ÖNEMLİ:** Yukarıdaki komutlardaki placeholder değerleri (`your-project`, `your_anon_key_here`, `your_shared_secret_here`) gerçek değerlerinizle değiştirin.

**Not:** Her komut çalıştığında size bir onay mesajı gösterecek.

### 2.4. Secrets'ları Kontrol Et

```bash
eas secret:list
```

Bu komut, oluşturduğunuz tüm secrets'ları gösterecek.

### 2.5. Production Build Al

```bash
# iOS için
eas build --profile production --platform ios

# Android için
eas build --profile production --platform android
```

Build sırasında EAS otomatik olarak secrets'ları environment variables olarak ekleyecek.

---

## ✅ Kontrol Listesi

### Development İçin:
- [ ] `.env` dosyası oluşturuldu
- [ ] `.env` dosyasında `EXPO_PUBLIC_SUPABASE_URL` var
- [ ] `.env` dosyasında `EXPO_PUBLIC_SUPABASE_ANON_KEY` var
- [ ] Uygulama başarıyla çalışıyor

### Production İçin:
- [ ] EAS CLI kurulu ve giriş yapıldı
- [ ] `EXPO_PUBLIC_SUPABASE_URL` secret'ı oluşturuldu
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` secret'ı oluşturuldu
- [ ] `APP_STORE_SHARED_SECRET` secret'ı oluşturuldu (iOS için)
- [ ] `eas secret:list` ile secrets kontrol edildi
- [ ] Production build başarıyla alındı

---

## 🐛 Sorun Giderme

### "Supabase yapılandırma bilgileri eksik" Hatası

**Development için:**
1. `.env` dosyasının `EmoraAI/` klasöründe olduğundan emin olun
2. `.env` dosyasında değerlerin doğru olduğundan emin olun (tırnak işareti olmadan)
3. Metro bundler'ı yeniden başlatın: `npx expo start --clear`

**Production için:**
1. `eas secret:list` ile secrets'ların oluşturulduğunu kontrol edin
2. Secret isimlerinin tam olarak doğru olduğundan emin olun (büyük/küçük harf duyarlı)
3. Build'i yeniden deneyin

### Secret Güncelleme

Bir secret'ı güncellemek için:
```bash
eas secret:update --name EXPO_PUBLIC_SUPABASE_URL --value "yeni_değer"
```

### Secret Silme

Bir secret'ı silmek için:
```bash
eas secret:delete --name EXPO_PUBLIC_SUPABASE_URL
```

---

## 📚 Daha Fazla Bilgi

- Detaylı güvenlik bilgileri: `APP_STORE_SECURITY.md`
- Genel kurulum: `SETUP_GUIDE.md`
- EAS dokümantasyonu: https://docs.expo.dev/build-reference/variables/

---

## 🎯 Hızlı Başlangıç (Özet)

**Development:**
```bash
cp .env.example .env
# .env dosyasını düzenle
npx expo start --clear
```

**Production:**
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "..." --type string
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "..." --type string
eas build --profile production --platform ios
```

---

**Artık uygulamanız güvenli! 🔒**

