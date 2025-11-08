# EAS Build Konfigürasyonu

Bu dosya Emora AI uygulaması için EAS Build konfigürasyonunu açıklar.

## Kurulum

1. EAS CLI'yi global olarak yükleyin:
```bash
npm install -g @expo/cli
```

2. Expo hesabınıza giriş yapın:
```bash
expo login
```

3. EAS projesini başlatın:
```bash
eas init
```

## Build Komutları

### Development Build
```bash
npm run build:preview
```

### Production Build
```bash
# Android için
npm run build:android

# iOS için
npm run build:ios

# Her iki platform için
npm run build:all
```

## Submit Komutları

### Android Store'a Submit
```bash
npm run submit:android
```

### iOS App Store'a Submit
```bash
npm run submit:ios
```

### Her iki store'a Submit
```bash
npm run submit:all
```

## Konfigürasyon Dosyaları

### eas.json
- Build profilleri (development, preview, production)
- Resource class ayarları
- Submit konfigürasyonları

### app.json
- Bundle identifier
- Version ve build number
- Permissions
- iOS ve Android özel ayarları

## Environment Variables

Production build için gerekli environment variables:

```bash
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Firebase (opsiyonel)
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_firebase_project_id
```

## Önemli Notlar

1. **Project ID**: `app.json` dosyasındaki `extra.eas.projectId` değerini gerçek project ID ile değiştirin.

2. **Apple Developer Account**: iOS build için Apple Developer hesabı gerekli.

3. **Google Play Console**: Android build için Google Play Console hesabı gerekli.

4. **Certificates**: iOS için development ve distribution sertifikaları gerekli.

5. **Keystore**: Android için keystore dosyası gerekli.

## Build Status

Build durumunu kontrol etmek için:
```bash
eas build:list
```

## Troubleshooting

### Build Hataları
- Environment variables'ları kontrol edin
- Dependencies'leri güncelleyin
- Expo CLI'yi güncelleyin

### Submit Hataları
- Store credentials'ları kontrol edin
- App metadata'sını kontrol edin
- Screenshots ve app icons'ları kontrol edin
