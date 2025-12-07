# AdMob Reklam Entegrasyonu - Tamamlandı ✅

## Yapılan İşlemler

### 1. Paket Kurulumu ✅
- `react-native-google-mobile-ads` paketi yüklendi
- `app.json`'a AdMob plugin'i eklendi
- iOS ve Android için Application ID yapılandırıldı

### 2. Konfigürasyon ✅
- `src/config/adConfig.ts` - AdMob yapılandırma dosyası
  - Test ID'leri (development için)
  - Production ID'leri (AdMob'dan alınan gerçek ID'ler)
  - Application ID
  - Reklam aktif/pasif kontrolü

### 3. Reklam Bileşenleri ✅

#### Banner Reklam
- `src/components/AdBanner.tsx` - Banner reklam bileşeni
- Premium kullanıcılara gösterilmez
- ChatScreen'de input alanının üstünde gösterilir

#### Interstitial Reklam
- `src/services/adService.ts` - Reklam servisi
- Ekran geçişlerinde gösterilir (ChatHistory → ChatScreen)
- Her 3 geçişte bir gösterilir
- 5 dakika cooldown süresi var

#### Rewarded Reklam
- `src/services/adService.ts` - Rewarded reklam servisi
- PremiumFeaturesScreen'de "Video İzle, Mesaj Kazan" butonu
- 5 ekstra mesaj ödülü verir
- Premium kullanıcılara gösterilmez

### 4. Entegrasyon Noktaları ✅

#### ChatScreen
- Banner reklam eklendi (input alanının üstünde)
- Premium kullanıcılara gösterilmez

#### ChatHistoryScreen
- Interstitial reklam eklendi (sohbet açılırken)
- Premium kullanıcılara gösterilmez

#### PremiumFeaturesScreen
- Rewarded reklam butonu eklendi
- "Video İzle, 5 Ekstra Mesaj Kazan" özelliği
- Premium kullanıcılara gösterilmez

#### App.tsx
- AdMob initialization eklendi
- Uygulama başlatıldığında AdMob başlatılır

## Reklam ID'leri

### Application ID
```
ca-app-pub-9485934183491164~1978001460
```

### Ad Unit ID'leri
- **Banner**: `ca-app-pub-9485934183491164/8753602301`
- **Interstitial**: `ca-app-pub-9485934183491164/1044193741`
- **Rewarded**: `ca-app-pub-9485934183491164/2946741857`

## Özellikler

### Premium Kontrolü
- Tüm reklamlar premium kullanıcılara gösterilmez
- `usePremium()` hook'u ile kontrol edilir

### Test Modu
- Development'ta test ID'leri kullanılır
- Production'da gerçek ID'ler kullanılır
- `__DEV__` flag'i ile otomatik kontrol

### Reklam Sıklığı
- **Banner**: Sürekli görünür (premium olmayanlar için)
- **Interstitial**: Her 3 ekran geçişinde bir, 5 dakika cooldown
- **Rewarded**: Kullanıcı isteğine bağlı

### Ödül Sistemi
- Rewarded reklam izlendiğinde 5 ekstra mesaj verilir
- AsyncStorage'da mesaj sayacı güncellenir

## Yapılandırma

### Reklamları Aktif/Pasif Yapma

`.env` dosyasına ekleyin:
```env
EXPO_PUBLIC_ADS_ENABLED=true  # Reklamları aktif et
EXPO_PUBLIC_ADS_ENABLED=false # Reklamları pasif et
```

Veya `src/config/adConfig.ts` dosyasında:
```typescript
export const ADS_ENABLED = true;  // Aktif
export const ADS_ENABLED = false; // Pasif
```

## Test

### Development'ta
- Test ID'leri otomatik kullanılır
- Reklamlar test modunda çalışır

### Production'da
- Gerçek Ad Unit ID'leri kullanılır
- Reklamlar aktif olur (1 saat içinde)

## Sonraki Adımlar

1. ✅ Reklam entegrasyonu tamamlandı
2. ⏳ Uygulamayı test edin (development'ta test ID'leri ile)
3. ⏳ Production build alın
4. ⏳ İlk yayında reklamları kapalı tutun (`ADS_ENABLED = false`)
5. ⏳ İlk güncellemede reklamları aktif edin (`ADS_ENABLED = true`)

## Önemli Notlar

- Reklamlar premium kullanıcılara gösterilmez
- İlk yayında reklamları kapalı tutmak önerilir
- Reklam birimlerinin aktif olması 1 saat kadar sürebilir
- Test ID'leri sadece development'ta çalışır

## Dosya Yapısı

```
src/
├── config/
│   └── adConfig.ts          # AdMob yapılandırması
├── components/
│   └── AdBanner.tsx         # Banner reklam bileşeni
├── services/
│   └── adService.ts         # Interstitial ve Rewarded servisi
└── screens/
    ├── ChatScreen.tsx        # Banner reklam eklendi
    ├── ChatHistoryScreen.tsx # Interstitial reklam eklendi
    └── PremiumFeaturesScreen.tsx # Rewarded reklam eklendi
```

## Sorun Giderme

### Reklamlar görünmüyor
1. `ADS_ENABLED` kontrol edin
2. Premium kullanıcı mısınız kontrol edin
3. Test ID'leri doğru mu kontrol edin
4. AdMob'da reklam birimleri aktif mi kontrol edin

### Reklamlar çok sık görünüyor
- Interstitial sıklığını `adService.ts`'de ayarlayın
- Cooldown süresini artırın

### Rewarded reklam ödül vermiyor
- AsyncStorage izinlerini kontrol edin
- Ödül callback fonksiyonunu kontrol edin

---

**Son Güncelleme**: 2025-01-07
**Durum**: ✅ Tamamlandı

