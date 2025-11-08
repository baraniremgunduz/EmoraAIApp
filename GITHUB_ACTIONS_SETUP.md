# GitHub Actions CI/CD Kurulum Rehberi

Bu rehber, GitHub Actions CI/CD pipeline'ını kurmak için gerekli adımları açıklar.

## 📋 Gereksinimler

1. GitHub repository'si
2. Expo hesabı
3. EAS CLI kurulu (`npm install -g eas-cli`)

## 🔑 1. EXPO_TOKEN Oluşturma

### Adım 1: Expo Access Token Oluştur

1. [Expo Dashboard](https://expo.dev/)'a giriş yapın
2. Sağ üst köşedeki profil ikonuna tıklayın
3. **Account Settings** → **Access Tokens** bölümüne gidin
4. **Create Token** butonuna tıklayın
5. Token için bir isim verin (örn: "GitHub Actions CI/CD")
6. **Create** butonuna tıklayın
7. **Token'ı kopyalayın** (sadece bir kez gösterilir!)

**ÖNEMLİ**: Token'ı güvenli bir yerde saklayın. Tekrar gösterilmeyecek!

### Adım 2: GitHub Secrets'a Ekle

1. GitHub repository'nize gidin
2. **Settings** → **Secrets and variables** → **Actions** bölümüne gidin
3. **New repository secret** butonuna tıklayın
4. **Name**: `EXPO_TOKEN`
5. **Secret**: Oluşturduğunuz Expo token'ını yapıştırın
6. **Add secret** butonuna tıklayın

✅ Artık GitHub Actions workflow'larınız `EXPO_TOKEN` secret'ını kullanabilir!

## 🔧 2. Workflow Dosyalarını Kontrol Et

### CI Workflow (`.github/workflows/ci.yml`)

Bu workflow şunları yapar:
- ✅ Lint ve format check
- ✅ Test çalıştırma
- ✅ TypeScript type checking
- ✅ iOS ve Android build check

**Gereksinimler**: Sadece `EXPO_TOKEN` (opsiyonel, sadece build check için)

### CD Workflow (`.github/workflows/cd.yml`)

Bu workflow şunları yapar:
- ✅ Preview build (main branch için)
- ✅ Production build (tag-based)
- ✅ App Store submission

**Gereksinimler**: `EXPO_TOKEN` (zorunlu)

## 🚀 3. İlk Test

### Manuel Test

1. Repository'ye bir commit push edin:
   ```bash
   git add .
   git commit -m "test: CI/CD setup"
   git push origin main
   ```

2. GitHub'da **Actions** sekmesine gidin
3. Workflow'un çalıştığını kontrol edin
4. Hataları kontrol edin

### Workflow'u Manuel Çalıştır

1. GitHub'da **Actions** sekmesine gidin
2. Sol menüden workflow'u seçin (örn: "CI/CD Pipeline")
3. **Run workflow** butonuna tıklayın
4. Branch seçin ve **Run workflow** butonuna tıklayın

## 📝 4. Secret Kontrolü

Secret'ın doğru eklendiğini kontrol etmek için:

```bash
# GitHub CLI ile (opsiyonel)
gh secret list
```

Veya GitHub web arayüzünden:
- **Settings** → **Secrets and variables** → **Actions**
- `EXPO_TOKEN` listede görünmeli

## ⚠️ 5. Sorun Giderme

### Hata: "EXPO_TOKEN not found"

**Çözüm**:
1. GitHub Secrets'da `EXPO_TOKEN` olduğundan emin olun
2. Secret adının tam olarak `EXPO_TOKEN` olduğunu kontrol edin (büyük/küçük harf duyarlı)
3. Workflow dosyasında `${{ secrets.EXPO_TOKEN }}` kullanıldığını kontrol edin

### Hata: "Invalid token"

**Çözüm**:
1. Expo Dashboard'dan yeni bir token oluşturun
2. Eski token'ı silin
3. Yeni token'ı GitHub Secrets'a ekleyin

### Hata: "Build failed"

**Çözüm**:
1. EAS Build log'larını kontrol edin
2. `eas.json` dosyasının doğru yapılandırıldığını kontrol edin
3. EAS Secrets'ların (EXPO_PUBLIC_SUPABASE_URL, vb.) doğru ayarlandığını kontrol edin

## 🔒 6. Güvenlik

### Best Practices

1. **Token'ı asla commit etmeyin**
   - `.env` dosyalarını `.gitignore`'a ekleyin
   - Token'ları sadece GitHub Secrets'da saklayın

2. **Token'ı düzenli olarak yenileyin**
   - Her 90 günde bir yeni token oluşturun
   - Eski token'ı silin

3. **Token izinlerini sınırlandırın**
   - Sadece gerekli izinleri verin
   - Production ve development için ayrı token'lar kullanın

4. **Token'ı paylaşmayın**
   - Token'ı asla public repository'lerde paylaşmayın
   - Sadece güvenilir team member'larla paylaşın

## 📚 7. Ek Kaynaklar

- [Expo Access Tokens](https://docs.expo.dev/accounts/programmatic-access/)
- [GitHub Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [GitHub Actions](https://docs.github.com/en/actions)

## ✅ Kontrol Listesi

- [ ] Expo hesabı oluşturuldu
- [ ] Expo Access Token oluşturuldu
- [ ] GitHub Secrets'a `EXPO_TOKEN` eklendi
- [ ] Workflow dosyaları commit edildi
- [ ] İlk test başarılı
- [ ] Build'ler çalışıyor

---

**Son Güncelleme**: 2024-12-19

