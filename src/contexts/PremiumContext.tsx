// Premium Context - IAP ve Supabase entegrasyonu
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../services/supabase';
import { PurchaseService } from '../services/purchaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

interface PremiumSubscription {
  id: string;
  user_id: string;
  product_id: string;
  purchase_token: string;
  is_active: boolean;
  expires_at?: string;
  created_at: string;
}

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  subscription: PremiumSubscription | null;
  checkPremiumStatus: () => Promise<void>;
  activatePremium: (purchaseData: any) => Promise<void>;
  deactivatePremium: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

interface PremiumProviderProps {
  children: ReactNode;
}

export const PremiumProvider: React.FC<PremiumProviderProps> = ({ children }) => {
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<PremiumSubscription | null>(null);

  // Premium durumunu kontrol et
  const checkPremiumStatus = async () => {
    try {
      setIsLoading(true);

      // Mevcut kullanıcıyı al
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsPremium(false);
        setSubscription(null);
        return;
      }

      // Supabase'den premium durumunu kontrol et
      const { data: premiumData, error } = await supabase
        .from('premium_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        // Tablo yoksa veya schema hatası varsa sessizce devam et (production'da hata gösterme)
        if (
          error.code === 'PGRST205' ||
          error.message?.includes('Could not find the table') ||
          error.message?.includes('schema cache')
        ) {
          // Tablo henüz oluşturulmamış - normal durum, sessizce devam et
          if (__DEV__) {
            logger.log('Premium subscriptions tablosu henüz oluşturulmamış. Tabloyu oluşturmak için supabase_premium_schema.sql dosyasını Supabase SQL Editor\'de çalıştırın.');
          }
          setIsPremium(false);
          setSubscription(null);
          return;
        }
        
        // Diğer hatalar için sadece development'ta log et
        if (__DEV__) {
          logger.error('Premium durumu kontrol hatası:', error);
        }
        setIsPremium(false);
        setSubscription(null);
        return;
      }

      if (premiumData && premiumData.length > 0) {
        const activeSubscription = premiumData[0];

        // Süre kontrolü (abonelikler için)
        if (activeSubscription.expires_at) {
          const expiresAt = new Date(activeSubscription.expires_at);
          const now = new Date();

          if (expiresAt > now) {
            setIsPremium(true);
            setSubscription(activeSubscription);
          } else {
            // Süresi dolmuş, pasif yap
            await deactivatePremium();
          }
        } else {
          // Ömür boyu abonelik
          setIsPremium(true);
          setSubscription(activeSubscription);
        }
      } else {
        // IAP'dan kontrol et
        const hasActiveIAP = await PurchaseService.checkActiveSubscriptions();
        if (hasActiveIAP) {
          // IAP'da var ama Supabase'de yok, senkronize et
          await syncIAPWithSupabase();
        } else {
          setIsPremium(false);
          setSubscription(null);
        }
      }
    } catch (error) {
      logger.error('Premium durumu kontrol hatası:', error);
      setIsPremium(false);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  };

  // IAP ile Supabase'i senkronize et
  const syncIAPWithSupabase = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // IAP'dan aktif satın almaları al
      const purchases = await PurchaseService.getAvailablePurchases();
      const premiumPurchases = purchases.filter((purchase: any) =>
        Object.values(PurchaseService.PRODUCT_IDS).includes(purchase.productId)
      );

      if (premiumPurchases.length > 0) {
        const latestPurchase = premiumPurchases[0];

        // Supabase'e kaydet
        const { error } = await supabase.from('premium_subscriptions').insert({
          user_id: user.id,
          product_id: latestPurchase.productId,
          purchase_token: latestPurchase.transactionReceipt,
          is_active: true,
          expires_at: latestPurchase.originalTransactionDateIOS
            ? new Date(
                new Date(latestPurchase.originalTransactionDateIOS).getTime() +
                  365 * 24 * 60 * 60 * 1000
              ).toISOString()
            : null, // Ömür boyu
        });

        if (error) {
          // Tablo yoksa sessizce devam et
          if (
            error.code === 'PGRST205' ||
            error.message?.includes('Could not find the table') ||
            error.message?.includes('schema cache')
          ) {
            if (__DEV__) {
              logger.log('Premium subscriptions tablosu henüz oluşturulmamış.');
            }
            // Tablo yoksa da local state'i güncelle
            setIsPremium(true);
            return;
          }
          if (__DEV__) {
            logger.error('IAP-Supabase senkronizasyon hatası:', error);
          }
        } else {
          await checkPremiumStatus();
        }
      }
    } catch (error) {
      // Tablo yoksa sessizce devam et
      if (
        (error as any)?.code === 'PGRST205' ||
        (error as any)?.message?.includes('Could not find the table') ||
        (error as any)?.message?.includes('schema cache')
      ) {
        if (__DEV__) {
          logger.log('Premium subscriptions tablosu henüz oluşturulmamış.');
        }
        return;
      }
      if (__DEV__) {
        logger.error('IAP-Supabase senkronizasyon hatası:', error);
      }
    }
  };

  // Premium'u aktifleştir
  const activatePremium = async (purchaseData: any) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Supabase'e kaydet
      const { error } = await supabase.from('premium_subscriptions').insert({
        user_id: user.id,
        product_id: purchaseData.productId,
        purchase_token: purchaseData.transactionReceipt,
        is_active: true,
        expires_at: purchaseData.expiresAt || null,
      });

      if (error) {
        // Tablo yoksa sessizce devam et
        if (
          error.code === 'PGRST205' ||
          error.message?.includes('Could not find the table') ||
          error.message?.includes('schema cache')
        ) {
          if (__DEV__) {
            logger.log('Premium subscriptions tablosu henüz oluşturulmamış.');
          }
          // Tablo yoksa da local state'i güncelle
          await AsyncStorage.setItem('isPremium', 'true');
          setIsPremium(true);
          return;
        }
        if (__DEV__) {
          logger.error('Premium aktivasyon hatası:', error);
        }
      } else {
        // Local storage'a kaydet
        await AsyncStorage.setItem('isPremium', 'true');
        await checkPremiumStatus();
      }
    } catch (error) {
      // Tablo yoksa sessizce devam et
      if (
        (error as any)?.code === 'PGRST205' ||
        (error as any)?.message?.includes('Could not find the table') ||
        (error as any)?.message?.includes('schema cache')
      ) {
        if (__DEV__) {
          logger.log('Premium subscriptions tablosu henüz oluşturulmamış.');
        }
        await AsyncStorage.setItem('isPremium', 'true');
        setIsPremium(true);
        return;
      }
      if (__DEV__) {
        logger.error('Premium aktivasyon hatası:', error);
      }
    }
  };

  // Premium'u pasifleştir
  const deactivatePremium = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Supabase'de pasif yap
      const { error } = await supabase
        .from('premium_subscriptions')
        .update({ is_active: false })
        .eq('user_id', user.id);

      if (error) {
        // Tablo yoksa sessizce devam et
        if (
          error.code === 'PGRST205' ||
          error.message?.includes('Could not find the table') ||
          error.message?.includes('schema cache')
        ) {
          if (__DEV__) {
            logger.log('Premium subscriptions tablosu henüz oluşturulmamış.');
          }
          // Tablo yoksa da local state'i güncelle
          await AsyncStorage.removeItem('isPremium');
          setIsPremium(false);
          setSubscription(null);
          return;
        }
        if (__DEV__) {
          logger.error('Premium pasifleştirme hatası:', error);
        }
      } else {
        // Local storage'dan sil
        await AsyncStorage.removeItem('isPremium');
        setIsPremium(false);
        setSubscription(null);
      }
    } catch (error) {
      // Tablo yoksa sessizce devam et
      if (
        (error as any)?.code === 'PGRST205' ||
        (error as any)?.message?.includes('Could not find the table') ||
        (error as any)?.message?.includes('schema cache')
      ) {
        if (__DEV__) {
          logger.log('Premium subscriptions tablosu henüz oluşturulmamış.');
        }
        await AsyncStorage.removeItem('isPremium');
        setIsPremium(false);
        setSubscription(null);
        return;
      }
      if (__DEV__) {
        logger.error('Premium pasifleştirme hatası:', error);
      }
    }
  };

  // Premium durumunu yenile
  const refreshPremiumStatus = async () => {
    await checkPremiumStatus();
  };

  // Component mount olduğunda premium durumunu kontrol et
  useEffect(() => {
    checkPremiumStatus();
  }, []);

  // Uygulama foreground'a geldiğinde premium durumunu yenile
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextAppState => {
      if (nextAppState === 'active') {
        // Uygulama aktif olduğunda premium durumunu kontrol et
        await checkPremiumStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [checkPremiumStatus]);

  const value: PremiumContextType = {
    isPremium,
    isLoading,
    subscription,
    checkPremiumStatus,
    activatePremium,
    deactivatePremium,
    refreshPremiumStatus,
  };

  return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
};

export const usePremiumContext = (): PremiumContextType => {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremiumContext must be used within a PremiumProvider');
  }
  return context;
};

// Backward compatibility - use hooks/usePremium instead
export const usePremium = usePremiumContext;
