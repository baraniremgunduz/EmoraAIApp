// Premium Hook - Özellik kontrolü ve premium durumu
import { usePremium as usePremiumContext } from '../contexts/PremiumContext';

export interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  requiresPremium: boolean;
}

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: 'unlimited_messages',
    name: 'Sınırsız Mesaj',
    description: 'Günlük mesaj limiti olmadan sohbet et',
    requiresPremium: true,
  },
  {
    id: 'mood_analysis',
    name: 'Duygu Analizi',
    description: 'Gelişmiş duygu analizi ve ruh hali takibi',
    requiresPremium: true,
  },
  {
    id: 'advanced_ai_personalities',
    name: 'Gelişmiş AI Kişilikleri',
    description: 'Tüm AI kişiliklerine erişim',
    requiresPremium: true,
  },
  {
    id: 'priority_support',
    name: 'Öncelikli Destek',
    description: '7/24 öncelikli müşteri desteği',
    requiresPremium: true,
  },
  {
    id: 'export_chats',
    name: 'Sohbet Dışa Aktarma',
    description: 'Sohbetlerini PDF olarak dışa aktar',
    requiresPremium: true,
  },
  {
    id: 'custom_themes',
    name: 'Özel Temalar',
    description: 'Kişiselleştirilmiş uygulama temaları',
    requiresPremium: true,
  },
  {
    id: 'basic_chat',
    name: 'Temel Sohbet',
    description: 'Günlük 3 mesaj ile temel sohbet',
    requiresPremium: false,
  },
  {
    id: 'profile_management',
    name: 'Profil Yönetimi',
    description: 'Temel profil düzenleme',
    requiresPremium: false,
  },
];

export const usePremium = () => {
  const premiumContext = usePremiumContext();

  // Belirli bir özelliği kullanabilir mi kontrol et
  const canUseFeature = (featureId: string): boolean => {
    if (premiumContext.isPremium) return true;

    const feature = PREMIUM_FEATURES.find(f => f.id === featureId);
    if (!feature) return true; // Bilinmeyen özellikler için varsayılan olarak izin ver

    return !feature.requiresPremium;
  };

  // Premium gerektiren özellikleri al
  const getPremiumFeatures = (): PremiumFeature[] => {
    return PREMIUM_FEATURES.filter(feature => feature.requiresPremium);
  };

  // Ücretsiz özellikleri al
  const getFreeFeatures = (): PremiumFeature[] => {
    return PREMIUM_FEATURES.filter(feature => !feature.requiresPremium);
  };

  // Kullanıcının erişebileceği özellikleri al
  const getAvailableFeatures = (): PremiumFeature[] => {
    return PREMIUM_FEATURES.filter(feature => canUseFeature(feature.id));
  };

  // Premium gerektiren özellik sayısını al
  const getPremiumFeatureCount = (): number => {
    return getPremiumFeatures().length;
  };

  // Kullanıcının erişemediği premium özellik sayısını al
  const getLockedFeatureCount = (): number => {
    if (premiumContext.isPremium) return 0;
    return getPremiumFeatures().length;
  };

  return {
    ...premiumContext,
    canUseFeature,
    getPremiumFeatures,
    getFreeFeatures,
    getAvailableFeatures,
    getPremiumFeatureCount,
    getLockedFeatureCount,
  };
};
