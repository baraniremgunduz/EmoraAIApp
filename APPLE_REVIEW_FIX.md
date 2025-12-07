# Apple Review Sorunları - Çözüm Rehberi

## ✅ Tamamlanan Düzeltmeler

### 1. Uygulama İçi (In-App) Düzeltmeler

#### ✅ EULA ve Privacy Policy Linkleri Eklendi
- **Dosya:** `src/screens/PremiumFeaturesScreen.tsx`
- **Eklenenler:**
  - Kullanım Koşulları (EULA) linki
  - Gizlilik Politikası (Privacy Policy) linki
  - Linkler satın alma butonunun altına eklendi

#### ✅ Abonelik Bilgileri Eklendi
- **Eklenen Bilgiler:**
  - Abonelik başlığı (Premium Aylık/Yıllık Abonelik)
  - Abonelik süresi (aylık/yıllık)
  - Abonelik fiyatı ($4.99/ay, $49.99/yıl)
  - Otomatik yenileme bilgisi

**Linkler:**
- Privacy Policy: `https://raw.githubusercontent.com/baraniremgunduz/emora-ai-support/main/PRIVACY_POLICY.md`
- Terms of Service: `https://raw.githubusercontent.com/baraniremgunduz/emora-ai-support/main/TERMS_OF_SERVICE.md`

---

## 📋 App Store Connect'te Yapılması Gerekenler

### Adım 1: Privacy Policy URL Ekleme

1. App Store Connect → **Emora AI** → **App Information** sekmesine gidin
2. **Privacy Policy URL** alanını bulun
3. Şu URL'yi ekleyin:
   ```
   https://raw.githubusercontent.com/baraniremgunduz/emora-ai-support/main/PRIVACY_POLICY.md
   ```
4. **Kaydet** butonuna tıklayın

### Adım 2: App Description'a EULA Linki Ekleme

1. App Store Connect → **Emora AI** → **App Information** → **App Description** bölümüne gidin
2. App Description'ın sonuna şu metni ekleyin:

```
Kullanım Koşulları: https://raw.githubusercontent.com/baraniremgunduz/emora-ai-support/main/TERMS_OF_SERVICE.md
Gizlilik Politikası: https://raw.githubusercontent.com/baraniremgunduz/emora-ai-support/main/PRIVACY_POLICY.md
```

**VEYA** özel EULA kullanmak istiyorsanız:

1. App Store Connect → **Agreements, Tax, and Banking** → **EULA** bölümüne gidin
2. Özel EULA'nızı yükleyin veya düzenleyin

### Adım 3: In-App Purchase Açıklamalarını Kontrol Etme

1. App Store Connect → **Emora AI** → **In-App Purchases** bölümüne gidin
2. Her IAP için şunları kontrol edin:
   - **Product Name:** "Premium Aylık Abonelik" / "Premium Yıllık Abonelik"
   - **Description:** Abonelik detaylarını içermeli
   - **Price:** Doğru fiyat ayarlanmış olmalı

---

## 🔄 Sonraki Adımlar

### 1. Yeni Build Alın
```bash
cd /Users/BaranGndz/Desktop/EmoraAIApp/EmoraAIApp/EmoraAI
eas build --platform ios --profile production
```

### 2. Build'i App Store Connect'e Submit Edin
```bash
eas submit --platform ios --profile production
```

### 3. App Store Connect'te Metadata'yı Güncelleyin
- Privacy Policy URL'ini ekleyin
- App Description'a EULA linkini ekleyin

### 4. Apple'a Yanıt Verin
Apple'ın gönderdiği mesaja şu yanıtı gönderin:

```
Merhaba,

Tüm eksiklikler giderilmiştir:

1. Uygulama içi satın alma ekranında:
   - Kullanım Koşulları (EULA) linki eklendi
   - Gizlilik Politikası linki eklendi
   - Abonelik bilgileri (başlık, süre, fiyat) açıkça gösteriliyor

2. App Store Connect'te:
   - Privacy Policy URL eklendi
   - App Description'a EULA linki eklendi

3. Abonelik Bilgileri:
   - Premium Aylık Abonelik: $4.99/ay
   - Premium Yıllık Abonelik: $49.99/yıl
   - Otomatik yenileme bilgisi gösteriliyor

Tüm linkler işlevsel ve erişilebilir durumdadır.

İyi çalışmalar.
```

---

## ✅ Kontrol Listesi

- [x] PremiumFeaturesScreen'e EULA linki eklendi
- [x] PremiumFeaturesScreen'e Privacy Policy linki eklendi
- [x] Abonelik bilgileri (başlık, süre, fiyat) eklendi
- [ ] App Store Connect'te Privacy Policy URL eklendi
- [ ] App Description'a EULA linki eklendi
- [ ] Yeni build alındı
- [ ] Build App Store Connect'e submit edildi
- [ ] Apple'a yanıt gönderildi

---

## 📝 Notlar

- Privacy Policy ve Terms of Service linkleri GitHub raw URL formatında
- Eğer daha profesyonel görünmesini isterseniz, bu dosyaları kendi web sitenizde yayınlayabilirsiniz
- Tüm linkler test edilmiş ve çalışır durumda olmalı

---

**Son Güncelleme:** 23 Kasım 2025

