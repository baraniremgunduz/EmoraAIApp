# Apple Review Sorunları - V2 Düzeltmeleri

## ✅ Yapılan Kod Düzeltmeleri

### 1. Abonelik Bilgileri Bölümüne EULA ve Privacy Policy Linkleri Eklendi
- **Dosya:** `src/screens/PremiumFeaturesScreen.tsx`
- **Değişiklik:** Abonelik bilgileri kartının içine EULA ve Privacy Policy linkleri eklendi
- **Konum:** Abonelik fiyat ve süre bilgilerinin hemen altında, görünür bir şekilde

### 2. Linkler Daha Görünür Hale Getirildi
- İkonlar eklendi (document-text ve shield-checkmark)
- Linkler daha büyük ve tıklanabilir
- Border ile ayrıldı

---

## 📋 App Store Connect'te Yapılması Gerekenler

### ⚠️ KRİTİK: App Description'a EULA Linki Ekleme

**Konum:** App Store Connect → Emora AI → **App Information** → **App Description**

**Adımlar:**
1. App Store Connect'e giriş yapın
2. **Emora AI** uygulamasını seçin
3. Sol menüden **App Information** sekmesine tıklayın
4. **App Description** bölümünü bulun
5. Mevcut açıklamanın **sonuna** şu metni ekleyin:

```
Kullanım Koşulları: https://raw.githubusercontent.com/baraniremgunduz/emora-ai-support/main/TERMS_OF_SERVICE.md
Gizlilik Politikası: https://raw.githubusercontent.com/baraniremgunduz/emora-ai-support/main/PRIVACY_POLICY.md
```

6. **Kaydet** butonuna tıklayın

**ÖNEMLİ:** Bu adım zorunludur! Apple metadata'da EULA linki görmek istiyor.

---

### ⚠️ KRİTİK: Promo Image Sorunu

**Sorun:** IAP promo image'ları uygulama simgesiyle aynı veya eksik

**Çözüm:** App Store Connect → **In-App Purchases** → Her IAP için:

**Seçenek 1: Promo Image'ı Kaldırın (Önerilen)**
1. Her IAP'i açın (Monthly ve Yearly)
2. **Promo Image** bölümünü bulun
3. Mevcut image'ı **Sil** butonuna tıklayarak kaldırın
4. **Kaydet** butonuna tıklayın

**Seçenek 2: Benzersiz Promo Image Ekleyin**
- Uygulama simgesinden farklı bir görsel hazırlayın
- IAP'i tanıtan özel bir görsel olmalı
- 1024x1024 piksel boyutunda olmalı

**Öneri:** Şimdilik promo image'ları kaldırmak daha hızlı olur.

---

## 📝 Apple'a Gönderilecek Yanıt Metni

```
Merhaba,

Tüm eksiklikler giderilmiştir:

1. UYGULAMA İÇİ (In-App) DÜZELTMELER:
   - Abonelik bilgileri bölümüne Kullanım Koşulları (EULA) linki eklendi
   - Abonelik bilgileri bölümüne Gizlilik Politikası linki eklendi
   - Linkler abonelik fiyat ve süre bilgilerinin hemen altında görünür şekilde
   - Linkler tıklanabilir ve işlevsel
   - Abonelik başlığı, süre ve fiyat bilgileri açıkça gösteriliyor

2. APP STORE CONNECT METADATA:
   - App Description'a Kullanım Koşulları linki eklendi
   - Privacy Policy URL alanı dolduruldu
   - Tüm linkler işlevsel ve erişilebilir

3. PROMO IMAGE SORUNU:
   - IAP promo image'ları kaldırıldı (uygulama simgesiyle aynı olduğu için)
   - Gelecekte benzersiz promo image'lar eklenecek

Abonelik Bilgileri:
- Premium Aylık Abonelik: $4.99/ay
- Premium Yıllık Abonelik: $49.99/yıl
- Otomatik yenileme bilgisi gösteriliyor
- EULA ve Privacy Policy linkleri abonelik bilgileriyle birlikte görünüyor

Tüm gereksinimler karşılanmıştır.

İyi çalışmalar.
```

---

## ✅ Kontrol Listesi

### Kod Değişiklikleri
- [x] Abonelik bilgileri bölümüne EULA linki eklendi
- [x] Abonelik bilgileri bölümüne Privacy Policy linki eklendi
- [x] Linkler görünür ve tıklanabilir hale getirildi
- [x] Linter hataları kontrol edildi

### App Store Connect
- [ ] App Description'a EULA linki eklendi
- [ ] Privacy Policy URL alanı dolduruldu
- [ ] IAP promo image'ları kaldırıldı veya güncellendi

### Build ve Submit
- [ ] Yeni build alındı
- [ ] Build App Store Connect'e submit edildi
- [ ] Apple'a yanıt gönderildi

---

## 🔄 Sonraki Adımlar

1. **App Store Connect'te metadata'yı güncelleyin:**
   - App Description'a EULA linki ekleyin
   - IAP promo image'ları kaldırın

2. **Yeni build alın:**
   ```bash
   cd /Users/BaranGndz/Desktop/EmoraAIApp/EmoraAIApp/EmoraAI
   eas build --platform ios --profile production
   ```

3. **Build'i submit edin:**
   ```bash
   eas submit --platform ios --profile production
   ```

4. **Apple'a yanıt gönderin:**
   - App Store Connect → App Review → Mesajlar
   - Yukarıdaki yanıt metnini gönderin

---

## 📝 Notlar

- EULA linki artık hem uygulama içinde hem de App Store Connect metadata'da mevcut
- Linkler işlevsel ve erişilebilir
- Promo image sorunu App Store Connect'te düzeltilmeli (kod değişikliği gerekmez)

---

**Son Güncelleme:** 26 Kasım 2025

