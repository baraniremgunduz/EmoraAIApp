import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { PremiumProvider } from './src/contexts/PremiumContext';
import { ErrorBoundary } from './src/utils/errorBoundary';
import { initSentry } from './src/utils/sentry';
import { TokenRefreshManager } from './src/utils/tokenRefresh';
import { NotificationService } from './src/services/notificationService';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { logger } from './src/utils/logger';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import { ADMOB_APP_ID, ADS_ENABLED } from './src/config/adConfig';
import { adService } from './src/services/adService';

// Native splash screen'i hemen kapat (animasyonlu loading ekranı gösterilecek)
SplashScreen.preventAutoHideAsync();

export default function App() {
  // Native splash screen'i hemen kapat
  useEffect(() => {
    // Uygulama yüklendiğinde native splash screen'i kapat
    // Animasyonlu loading ekranı gösterilecek
    SplashScreen.hideAsync().catch(() => {
      // Hata durumunda sessizce devam et
    });
  }, []);

  // App update check
  useEffect(() => {
    checkForUpdates();
  }, []);

  // Deep linking handler
  useEffect(() => {
    // Handle initial URL (app opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    // Handle URL changes (app already open)
    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    // Initialization işlemlerini try-catch ile güvenli hale getir
    const initializeServices = async () => {
      // Her servisi ayrı ayrı try-catch ile başlat - bir servis hata verse bile diğerleri çalışsın
      
      // 1. Sentry'yi başlat (en önce - hata yakalama için)
    try {
      initSentry();
      } catch (error) {
        // Sentry başlatma hatası kritik değil
        if (__DEV__) {
          console.warn('Sentry initialization failed:', error);
        }
      }
      
      // 2. Token refresh mekanizmasını başlat
      try {
      TokenRefreshManager.startAutoRefresh();
      } catch (error) {
        logger.error('TokenRefreshManager initialization error:', error);
        // Devam et - token refresh olmasa da uygulama çalışabilir
      }
      
      // 2.5. AdMob'u başlat (reklamlar aktifse)
      if (ADS_ENABLED) {
        try {
          await adService.init();
          logger.log('AdMob initialized');
        } catch (error) {
          logger.error('AdMob initialization error:', error);
          // Reklamlar başlatılamasa da uygulama çalışmaya devam eder
        }
      }
      
      // 3. Bildirim servisini başlat (async - en son, native module olduğu için)
      // Delay ekle - diğer servisler hazır olsun
      setTimeout(async () => {
        try {
          await NotificationService.initialize();
        } catch (error) {
          // Bildirim servisi başlatma hatası kritik değil, sessizce devam et
          logger.error('NotificationService initialization error:', error);
        }
      }, 1000); // 1 saniye bekle - native modüller hazır olsun
    };

    // Initialization'ı güvenli bir şekilde başlat
    try {
      initializeServices();
    } catch (error) {
      // Initialization hatalarını yakala ve logla
      // Bu sayede uygulama crash olmaz, sadece ilgili özellikler çalışmaz
      logger.error('App initialization error:', error);
      
      // Production'da kullanıcıya hata gösterme (Sentry'ye gönderilir)
      // Development'ta console'da görünür
      if (__DEV__) {
        console.error('Initialization failed:', error);
      }
    }
    
    return () => {
      // Cleanup: Token refresh'i durdur
      try {
        TokenRefreshManager.stopAutoRefresh();
      } catch (error) {
        logger.error('Cleanup error:', error);
      }
    };
  }, []);

  const checkForUpdates = async () => {
    try {
      if (__DEV__) {
        // Skip update check in development
        return;
      }

      const update = await Updates.checkForUpdateAsync();
      
      if (update.isAvailable) {
        Alert.alert(
          'Güncelleme Mevcut',
          'Yeni bir versiyon mevcut. Güncellemeyi indirmek ister misiniz?',
          [
            {
              text: 'Daha Sonra',
              style: 'cancel',
            },
            {
              text: 'Güncelle',
              onPress: async () => {
                try {
                  await Updates.fetchUpdateAsync();
                  Alert.alert(
                    'Güncelleme İndirildi',
                    'Uygulamayı yeniden başlatmak için lütfen uygulamayı kapatıp tekrar açın.',
                    [
                      {
                        text: 'Tamam',
                        onPress: () => {
                          Updates.reloadAsync();
                        },
                      },
                    ]
                  );
                } catch (error) {
                  logger.error('Update fetch error:', error);
                  Alert.alert('Hata', 'Güncelleme indirilemedi. Lütfen daha sonra tekrar deneyin.');
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      logger.error('Update check error:', error);
      // Silently fail - don't interrupt user experience
    }
  };

  const handleDeepLink = (url: string) => {
    try {
      logger.log('Deep link received:', url);
      const { hostname, path, queryParams } = Linking.parse(url);

      // Handle different deep link patterns
      if (hostname === 'chat' || path?.startsWith('/chat')) {
        const sessionId = queryParams?.sessionId as string;
        const sessionTitle = queryParams?.title as string || 'Chat';

        // Navigate to chat screen with session
        if (navigationRef.current?.isReady()) {
          navigationRef.current.navigate('Main', {
            screen: 'Chat',
            params: {
              sessionId,
              sessionTitle,
            },
          });
          logger.log('Navigated to chat:', { sessionId, sessionTitle });
        } else {
          // Navigation not ready yet, wait a bit
          setTimeout(() => {
            if (navigationRef.current?.isReady()) {
              navigationRef.current.navigate('Main', {
                screen: 'Chat',
                params: {
                  sessionId,
                  sessionTitle,
                },
              });
            }
          }, 1000);
        }
      }
    } catch (error) {
      logger.error('Deep link error:', error);
    }
  };
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <LanguageProvider>
          <PremiumProvider>
            <StatusBar style="light" />
            <AppNavigator />
          </PremiumProvider>
        </LanguageProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}