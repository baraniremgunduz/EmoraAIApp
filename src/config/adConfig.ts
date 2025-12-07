// AdMob Configuration
import { Platform } from 'react-native';

// Test Ad Unit IDs (Google'ın resmi test ID'leri)
export const TEST_AD_UNIT_IDS = {
  banner: Platform.select({
    ios: 'ca-app-pub-3940256099942544/2934735716',
    android: 'ca-app-pub-3940256099942544/6300978111',
  }) || 'ca-app-pub-3940256099942544/6300978111',
  interstitial: Platform.select({
    ios: 'ca-app-pub-3940256099942544/4411468910',
    android: 'ca-app-pub-3940256099942544/1033173712',
  }) || 'ca-app-pub-3940256099942544/1033173712',
  rewarded: Platform.select({
    ios: 'ca-app-pub-3940256099942544/1712485313',
    android: 'ca-app-pub-3940256099942544/5224354917',
  }) || 'ca-app-pub-3940256099942544/5224354917',
};

// Production Ad Unit IDs (AdMob'dan alınan gerçek ID'ler)
export const PRODUCTION_AD_UNIT_IDS = {
  banner: 'ca-app-pub-9485934183491164/8753602301',
  interstitial: 'ca-app-pub-9485934183491164/1044193741',
  rewarded: 'ca-app-pub-9485934183491164/2946741857',
};

// Application ID
export const ADMOB_APP_ID = Platform.select({
  ios: 'ca-app-pub-9485934183491164~1978001460',
  android: 'ca-app-pub-9485934183491164~1978001460',
}) || 'ca-app-pub-9485934183491164~1978001460';

// Reklamları aktif etme flag'i (ilk yayında false, sonra true yapılacak)
export const ADS_ENABLED = process.env.EXPO_PUBLIC_ADS_ENABLED === 'true' || __DEV__;

// Ad Unit ID'leri al (test veya production)
export const getAdUnitId = (type: 'banner' | 'interstitial' | 'rewarded'): string => {
  // Reklamlar kapalıysa test ID döndür (görünmez ama hata vermez)
  if (!ADS_ENABLED) {
    return TEST_AD_UNIT_IDS[type];
  }
  
  // Development'ta test ID'leri, production'da gerçek ID'ler
  const useTestAds = __DEV__;
  return useTestAds ? TEST_AD_UNIT_IDS[type] : PRODUCTION_AD_UNIT_IDS[type];
};

