# GitHub Actions Workflows

Bu klasör GitHub Actions CI/CD workflow dosyalarını içerir.

## 📁 Dosyalar

- `ci.yml` - Continuous Integration (CI) pipeline
- `cd.yml` - Continuous Deployment (CD) pipeline

## 🔑 Gereksinimler

### GitHub Secrets

Bu workflow'ların çalışması için aşağıdaki secret'ların GitHub repository'nize eklenmesi gerekir:

#### Zorunlu

- `EXPO_TOKEN` - Expo access token (build ve submit için gerekli)

#### Opsiyonel (EAS Secrets ile yönetilir)

- `EXPO_PUBLIC_SUPABASE_URL` - Supabase URL (EAS Secrets'da)
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key (EAS Secrets'da)
- `APP_STORE_SHARED_SECRET` - App Store shared secret (EAS Secrets'da)

## 📖 Kurulum

Detaylı kurulum rehberi için: [GITHUB_ACTIONS_SETUP.md](../GITHUB_ACTIONS_SETUP.md)

## 🚀 Kullanım

### CI Pipeline

Her push ve pull request'te otomatik çalışır:
- Lint ve format check
- Test çalıştırma
- TypeScript type checking
- Build check (iOS ve Android)

### CD Pipeline

- **Preview Build**: `main` branch'e push edildiğinde
- **Production Build**: Tag oluşturulduğunda (örn: `v1.0.0`)

## ⚙️ Yapılandırma

Workflow'ları özelleştirmek için ilgili `.yml` dosyasını düzenleyin.

## 🔍 Sorun Giderme

Sorun yaşıyorsanız:
1. [GITHUB_ACTIONS_SETUP.md](../GITHUB_ACTIONS_SETUP.md) dosyasındaki "Sorun Giderme" bölümüne bakın
2. GitHub Actions log'larını kontrol edin
3. EAS Build log'larını kontrol edin

