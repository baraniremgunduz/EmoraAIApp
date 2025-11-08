import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LanguageProvider } from './src/contexts/LanguageContext';
import { PremiumProvider } from './src/contexts/PremiumContext';
import { ErrorBoundary } from './src/utils/errorBoundary';
import { initSentry } from './src/utils/sentry';
import { TokenRefreshManager } from './src/utils/tokenRefresh';
import * as Linking from 'expo-linking';
import * as Updates from 'expo-updates';
import { logger } from './src/utils/logger';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';

export default function App() {
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
    // Sentry'yi başlat
    initSentry();
    
    // Token refresh mekanizmasını başlat
    TokenRefreshManager.startAutoRefresh();
    
    return () => {
      // Cleanup: Token refresh'i durdur
      TokenRefreshManager.stopAutoRefresh();
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