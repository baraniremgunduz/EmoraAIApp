# 🔐 EAS Secrets Kurulum Komutları

Production build için EAS Secrets oluşturmanız gerekiyor. Aşağıdaki komutları **sırayla** çalıştırın:

## 📋 Adımlar

### 1. EAS CLI Kontrolü
```bash
eas --version
# Eğer kurulu değilse: npm install -g eas-cli
```

### 2. EAS'e Giriş
```bash
eas login
```

### 3. Secrets Oluştur

Aşağıdaki komutları **kopyalayıp terminalde çalıştırın**:

```bash
# Supabase URL (gerçek değerinizi Supabase Dashboard'dan alın)
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co" --type string

# Supabase Anon Key (gerçek değerinizi Supabase Dashboard'dan alın)
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_anon_key_here" --type string

# App Store Shared Secret (iOS için - App Store Connect'ten alın)
eas secret:create --scope project --name APP_STORE_SHARED_SECRET --value "your_shared_secret_here" --type string
```

**ÖNEMLİ:** Yukarıdaki komutlardaki placeholder değerleri (`your-project`, `your_anon_key_here`, `your_shared_secret_here`) gerçek değerlerinizle değiştirin.

### 4. Secrets Kontrolü
```bash
eas secret:list
```

Bu komut oluşturduğunuz secrets'ları gösterecek. 3 secret görmelisiniz:
- ✅ EXPO_PUBLIC_SUPABASE_URL
- ✅ EXPO_PUBLIC_SUPABASE_ANON_KEY
- ✅ APP_STORE_SHARED_SECRET

### 5. Production Build
```bash
# iOS için
eas build --profile production --platform ios

# Android için
eas build --profile production --platform android
```

## ⚠️ Önemli Notlar

- Her secret oluşturulduğunda bir onay mesajı göreceksiniz
- Secret isimleri **tam olarak** yukarıdaki gibi olmalı (büyük/küçük harf duyarlı)
- Secrets'lar projenize özel olarak saklanır ve güvenlidir
- Bir secret'ı güncellemek için: `eas secret:update --name SECRET_NAME --value "yeni_değer"`

## ✅ Tamamlandı!

Secrets oluşturulduktan sonra production build'ler otomatik olarak bunları kullanacak.

