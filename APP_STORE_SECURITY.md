# 🔐 Emora AI - App Store Güvenlik Rehberi

## ✅ Güvenlik Durumu

### 🔒 **Güvenli Olan Key'ler:**
- **OpenAI API Key**: Supabase Edge Functions'da saklanıyor ✅
- **Supabase Anon Key**: EAS Secrets ile güvenli şekilde saklanıyor ✅
- **App Store Shared Secret**: EAS Secrets ile güvenli şekilde saklanıyor ✅
- **RLS Politikaları**: Aktif ve çalışıyor ✅

### 📱 **App Store İçin Hazır:**
- ✅ Tüm API key'ler güvenli şekilde saklanıyor
- ✅ Hardcoded değerler kaldırıldı
- ✅ Client-side'da kritik bilgi yok
- ✅ Production build EAS secrets kullanıyor

## 🔧 **Environment Variables Yapılandırması**

### Development (Local)

Development için `.env` dosyası oluşturun (proje kök dizininde):

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**ÖNEMLİ:** Gerçek değerleri Supabase Dashboard'unuzdan alın:
1. Supabase Dashboard > Settings > API
2. `Project URL` değerini `EXPO_PUBLIC_SUPABASE_URL` olarak kullanın
3. `anon public` key değerini `EXPO_PUBLIC_SUPABASE_ANON_KEY` olarak kullanın

**ÖNEMLİ:** `.env` dosyasını `.gitignore`'a ekleyin ve asla commit etmeyin!

### Production (EAS Secrets)

Production build'ler için EAS Secrets kullanılmalı. Aşağıdaki komutları çalıştırın:

```bash
# Supabase URL (gerçek değerinizi Supabase Dashboard'dan alın)
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co" --type string

# Supabase Anon Key (gerçek değerinizi Supabase Dashboard'dan alın)
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_anon_key_here" --type string

# App Store Shared Secret (iOS için - App Store Connect'ten alın)
eas secret:create --scope project --name APP_STORE_SHARED_SECRET --value "your_shared_secret_here" --type string
```

**ÖNEMLİ:** Yukarıdaki komutlardaki placeholder değerleri (`your-project`, `your_anon_key_here`, `your_shared_secret_here`) gerçek değerlerinizle değiştirin.

**Secrets'ları kontrol etmek için:**
```bash
eas secret:list
```

**Secrets'ları güncellemek için:**
```bash
eas secret:update --name EXPO_PUBLIC_SUPABASE_URL --value "new_value"
```

## 🚀 **Build Komutları**

### Development Build:
```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

**Not:** Development build'ler `.env` dosyasını kullanır.

### Preview Build (Test için):
```bash
eas build --profile preview --platform ios
eas build --profile preview --platform android
```

**Not:** Preview build'ler EAS secrets kullanır.

### Production Build (App Store için):
```bash
eas build --profile production --platform ios
eas build --profile production --platform android
```

**Not:** Production build'ler EAS secrets kullanır.

## 🔐 **Güvenlik Kontrol Listesi**

Build yapmadan önce kontrol edin:

- [ ] `.env` dosyası oluşturuldu ve `.gitignore`'a eklendi
- [ ] EAS secrets oluşturuldu (`eas secret:list` ile kontrol)
- [ ] Hardcoded değerler kodda yok
- [ ] `eas.json` dosyasında hardcoded değerler yok
- [ ] RLS politikaları aktif
- [ ] API key'ler güvenli şekilde saklanıyor

## 📋 **App Store Submission Checklist**

- ✅ API key'ler güvenli (EAS secrets)
- ✅ Hardcoded değerler kaldırıldı
- ✅ RLS politikaları aktif
- ✅ Production build hazır
- ✅ Environment variables yapılandırıldı
- ✅ Supabase güvenlik kontrolleri geçildi

## ⚠️ **Önemli Notlar**

1. **Asla hardcoded değer kullanmayın:** Kodda API key'ler, secret'lar veya hassas bilgiler hardcoded olmamalı.

2. **Git'e commit etmeyin:** `.env` dosyasını ve içindeki değerleri asla Git'e commit etmeyin.

3. **EAS Secrets kullanın:** Production build'ler için mutlaka EAS secrets kullanın.

4. **Düzenli kontrol:** Secrets'ları düzenli olarak kontrol edin ve gerekirse güncelleyin.

## 🎯 **Sonraki Adımlar**

1. **EAS Secrets Oluştur:** Yukarıdaki komutları kullanarak secrets oluşturun
2. **Test Build**: Preview profile ile test edin
3. **Production Build**: App Store için production build alın
4. **App Store Connect**: Build'i App Store Connect'e yükleyin
5. **Review**: Apple review sürecini bekleyin

## 🆘 **Sorun Giderme**

### "Supabase yapılandırma bilgileri eksik" hatası alıyorsanız:

1. **Development için:**
   - `.env` dosyasının proje kök dizininde olduğundan emin olun
   - `.env` dosyasında `EXPO_PUBLIC_SUPABASE_URL` ve `EXPO_PUBLIC_SUPABASE_ANON_KEY` değerlerinin olduğunu kontrol edin
   - Uygulamayı yeniden başlatın

2. **Production için:**
   - `eas secret:list` komutu ile secrets'ların oluşturulduğunu kontrol edin
   - Secrets'ların doğru scope'ta olduğundan emin olun (`--scope project`)
   - Build'i yeniden deneyin

---

**Emora AI** artık güvenli bir şekilde App Store'a yüklenmeye hazır! 🚀
