# 🚀 CI/CD Hızlı Başlangıç

GitHub Actions CI/CD'yi 5 dakikada kurun!

## ⚡ Hızlı Kurulum

### 1. Expo Token Oluştur (2 dakika)

1. [Expo Dashboard](https://expo.dev/accounts/[username]/settings/access-tokens) → **Access Tokens**
2. **Create Token** → İsim ver → **Create**
3. Token'ı kopyala

### 2. GitHub Secret Ekle (1 dakika)

**Yöntem A: GitHub Web Arayüzü**
1. Repository → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
3. Name: `EXPO_TOKEN`
4. Secret: Token'ı yapıştır
5. **Add secret**

**Yöntem B: GitHub CLI (Daha Hızlı)**
```bash
# Token'ı terminal'e yapıştır
echo "YOUR_TOKEN_HERE" | gh secret set EXPO_TOKEN
```

**Yöntem C: Script (En Kolay)**
```bash
./scripts/setup-github-secrets.sh
```

### 3. Test Et (2 dakika)

```bash
git add .
git commit -m "ci: Setup GitHub Actions"
git push origin main
```

GitHub'da **Actions** sekmesine git ve workflow'un çalıştığını kontrol et!

## ✅ Tamamlandı!

Artık her push'ta:
- ✅ Lint ve format check
- ✅ Test çalıştırma
- ✅ Build check

Her tag'de:
- ✅ Production build
- ✅ App Store submission

## 📚 Detaylı Rehber

Daha fazla bilgi için: [GITHUB_ACTIONS_SETUP.md](./GITHUB_ACTIONS_SETUP.md)

## 🆘 Sorun mu var?

1. Secret'ın doğru eklendiğini kontrol et
2. Token'ın geçerli olduğunu kontrol et
3. GitHub Actions log'larını kontrol et

---

**5 dakikada hazır!** ⚡

