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
# Supabase URL
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://wxmexmdpobjzgiqjxuix.supabase.co" --type string

# Supabase Anon Key
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bWV4bWRwb2JqemdpcWp4dWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA3NTY5NzQsImV4cCI6MjA3NjMzMjk3NH0.FFTUufP4XE4Ofa5TPw5_YgYkQ2Pia0WjTe8-FQE4m0U" --type string

# App Store Shared Secret (iOS için)
eas secret:create --scope project --name APP_STORE_SHARED_SECRET --value "07c9c5b0fbae48b9b768e296c477f907" --type string
```

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

