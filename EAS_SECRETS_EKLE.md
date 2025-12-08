# 🔐 EAS Secrets Ekleme Rehberi

Bu dosya, yeni Expo projesi için gerekli EAS Secrets'ları ekleme komutlarını içerir.

## 📋 Gerekli Secrets Listesi

### ✅ Zorunlu Secrets:
1. **EXPO_PUBLIC_SUPABASE_URL** - Supabase proje URL'iniz
2. **EXPO_PUBLIC_SUPABASE_ANON_KEY** - Supabase anon/public key'iniz

### ⚙️ Opsiyonel Secrets:
3. **EXPO_PUBLIC_SENTRY_DSN** - Sentry DSN (crash reporting için)

## 🚀 Secrets Ekleme Komutları

### 1. Supabase URL Ekle
```bash
npx eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co" --type string
```

**ÖNEMLİ:** `https://your-project.supabase.co` yerine gerçek Supabase URL'inizi yazın.
- Supabase Dashboard > Settings > API > Project URL

### 2. Supabase Anon Key Ekle
```bash
npx eas env:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your_anon_key_here" --type string
```

**ÖNEMLİ:** `your_anon_key_here` yerine gerçek Supabase anon key'inizi yazın.
- Supabase Dashboard > Settings > API > Project API keys > `anon` `public` key

### 3. Sentry DSN Ekle (Opsiyonel)
```bash
npx eas env:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "https://your-sentry-dsn@sentry.io/project-id" --type string
```

**ÖNEMLİ:** `https://your-sentry-dsn@sentry.io/project-id` yerine gerçek Sentry DSN'inizi yazın.
- Sentry Dashboard > Settings > Projects > Client Keys (DSN)

## ✅ Secrets Kontrolü

Tüm secrets'ları ekledikten sonra kontrol edin:

```bash
npx eas env:list
```

## 📝 Notlar

- **OPENAI_API_KEY**: Bu secret EAS'ta değil, Supabase Edge Functions secrets'ta saklanmalıdır.
- **ADMOB_APP_ID**: AdMob App ID zaten `app.json` içinde tanımlı, ayrıca secret'a gerek yok.
- Tüm secrets'lar `--scope project` ile proje bazında saklanır.
- Secrets'lar build sırasında otomatik olarak environment variable'lara dönüştürülür.

## 🔍 Mevcut Secrets'ları Görüntüleme

```bash
npx eas env:list
```

## 🗑️ Secret Silme

Bir secret'ı silmek için:

```bash
npx eas env:delete --name SECRET_NAME
```

## ⚠️ Güvenlik Uyarıları

- ❌ Secrets'ları asla kod içine yazmayın
- ❌ `.env` dosyasını Git'e commit etmeyin
- ✅ Tüm hassas bilgileri EAS Secrets'ta saklayın
- ✅ Production build'ler için mutlaka secrets kullanın

