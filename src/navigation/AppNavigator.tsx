// Ana navigasyon yapısı
import React, { useEffect, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  interpolate,
} from 'react-native-reanimated';
import { useLanguage } from '../contexts/LanguageContext';

// Tema
import { paperTheme, darkTheme } from '../utils/theme';

// Servisler
import { AuthService } from '../services/authService';

// Ekranlar
import LoadingScreen from '../screens/LoadingScreen';
import LanguageSelectionScreen from '../screens/LanguageSelectionScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import ChatHistoryScreen from '../screens/ChatHistoryScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import PremiumFeaturesScreen from '../screens/PremiumFeaturesScreen';
import PaymentScreen from '../screens/PaymentScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';

// Tipler
import { RootStackParamList, AuthStackParamList, MainTabParamList } from '../types';

const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Auth Stack Navigator
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      initialRouteName="Register"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: darkTheme.colors.background },
      }}
    >
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
    </AuthStack.Navigator>
  );
}

// Animated Tab Icon Component with Glass Effect
function AnimatedTabIcon({ focused, route }: { focused: boolean; route: any }) {
  const scale = useSharedValue(focused ? 1.1 : 1);
  const backgroundColor = useSharedValue(focused ? 1 : 0);
  const shadowOpacity = useSharedValue(focused ? 0.4 : 0.15);
  const borderOpacity = useSharedValue(focused ? 0 : 1);
  const glassOpacity = useSharedValue(focused ? 0 : 0.1);
  const rotation = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    // Scale animation with bounce effect
    scale.value = withSpring(focused ? 1.1 : 1, {
      damping: 12,
      stiffness: 200,
      mass: 0.8,
    });

    // Background color transition
    backgroundColor.value = withTiming(focused ? 1 : 0, {
      duration: 300,
    });

    // Shadow animation
    shadowOpacity.value = withTiming(focused ? 0.4 : 0.15, {
      duration: 250,
    });

    // Border animation
    borderOpacity.value = withTiming(focused ? 0 : 1, {
      duration: 200,
    });

    // Glass effect animation
    glassOpacity.value = withTiming(focused ? 0 : 0.1, {
      duration: 200,
    });

    // Rotation effect on focus
    if (focused) {
      rotation.value = withSpring(360, {
        damping: 15,
        stiffness: 100,
      });
    } else {
      rotation.value = withSpring(0, {
        damping: 15,
        stiffness: 100,
      });
    }

    // Pulse effect on focus
    if (focused) {
      pulseScale.value = withSpring(1.05, {
        damping: 8,
        stiffness: 150,
      });
    } else {
      pulseScale.value = withSpring(1, {
        damping: 8,
        stiffness: 150,
      });
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => {
    const bgColor = interpolateColor(
      backgroundColor.value,
      [0, 1],
      ['transparent', darkTheme.colors.primary]
    );

    const shadowHeight = interpolate(backgroundColor.value, [0, 1], [0, 6]);

    return {
      transform: [{ scale: scale.value * pulseScale.value }, { rotate: `${rotation.value}deg` }],
      backgroundColor: focused ? bgColor : 'transparent',
      shadowOffset: {
        width: 0,
        height: shadowHeight,
      },
      shadowOpacity: shadowOpacity.value,
    };
  });

  let iconName: keyof typeof Ionicons.glyphMap;
  if (route.name === 'Chat') {
    iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
  } else if (route.name === 'Profile') {
    iconName = focused ? 'person' : 'person-outline';
  } else if (route.name === 'Settings') {
    iconName = focused ? 'settings' : 'settings-outline';
  } else {
    iconName = 'help-outline';
  }

  return (
    <Animated.View
      style={[
        {
          width: 40,
          height: 40,
          borderRadius: 20,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 2,
          shadowColor: focused ? darkTheme.colors.primary : 'transparent',
          shadowRadius: focused ? 10 : 0,
          elevation: focused ? 6 : 0,
          zIndex: 1,
          position: 'relative',
        },
        animatedStyle,
      ]}
    >
      <Ionicons
        name={iconName}
        size={focused ? 20 : 18}
        color={focused ? 'white' : darkTheme.colors.primary}
      />
    </Animated.View>
  );
}

// Main Tab Navigator
function MainTabNavigator() {
  const { t } = useLanguage();
  const tabBarScale = useSharedValue(0.8);
  const tabBarOpacity = useSharedValue(0);
  const tabBarTranslateY = useSharedValue(50);

  React.useEffect(() => {
    // Tab bar'ın ilk yüklenişinde entrance animasyonu
    tabBarScale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
      mass: 0.8,
    });
    tabBarOpacity.value = withTiming(1, {
      duration: 400,
    });
    tabBarTranslateY.value = withSpring(0, {
      damping: 20,
      stiffness: 100,
    });
  }, []);

  const tabBarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: tabBarScale.value }, { translateY: tabBarTranslateY.value }],
    opacity: tabBarOpacity.value,
  }));

  return (
    <View style={{ flex: 1 }}>
      {/* Glass effect overlay for tab bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 30,
          left: 40,
          right: 40,
          height: 70,
          borderRadius: 30,
          backgroundColor: 'rgba(21, 21, 27, 0.9)', // Daha opak overlay
          zIndex: 0,
        }}
      />
      <Animated.View style={[{ flex: 1 }, tabBarAnimatedStyle]}>
        <MainTab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: {
              backgroundColor: 'rgba(21, 21, 27, 0.95)', // Daha opak background
              borderTopWidth: 0,
              elevation: 12,
              shadowColor: '#000',
              shadowOffset: {
                width: 0,
                height: -4,
              },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              height: 70,
              paddingBottom: 8,
              paddingTop: 8,
              paddingHorizontal: 20,
              position: 'absolute',
              bottom: 30,
              left: 40,
              right: 40,
              borderRadius: 30,
              justifyContent: 'space-evenly',
              alignItems: 'center',
              // Glass effect için backdrop blur simülasyonu
              overflow: 'visible',
              zIndex: 10,
            },
            tabBarActiveTintColor: 'white',
            tabBarInactiveTintColor: darkTheme.colors.textSecondary,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '600',
              marginTop: 6,
              marginBottom: 2,
              letterSpacing: 0.5,
              textAlign: 'center',
            },
            tabBarLabel: ({ focused, children }) => {
              const scale = useSharedValue(focused ? 1.05 : 1);
              const opacity = useSharedValue(focused ? 1 : 0.7);
              const translateY = useSharedValue(focused ? -2 : 0);
              const colorProgress = useSharedValue(focused ? 1 : 0);

              React.useEffect(() => {
                // Scale animation with bounce
                scale.value = withSpring(focused ? 1.05 : 1, {
                  damping: 12,
                  stiffness: 200,
                  mass: 0.8,
                });

                // Opacity transition
                opacity.value = withTiming(focused ? 1 : 0.7, {
                  duration: 300,
                });

                // Vertical movement
                translateY.value = withSpring(focused ? -2 : 0, {
                  damping: 15,
                  stiffness: 150,
                });

                // Color transition
                colorProgress.value = withTiming(focused ? 1 : 0, {
                  duration: 250,
                });
              }, [focused]);

              const animatedStyle = useAnimatedStyle(() => {
                const textColor = interpolateColor(
                  colorProgress.value,
                  [0, 1],
                  [darkTheme.colors.textSecondary, 'white']
                );

                return {
                  transform: [{ scale: scale.value }, { translateY: translateY.value }],
                  opacity: opacity.value,
                  color: textColor,
                };
              });

              return (
                <Animated.Text
                  style={[
                    {
                      fontSize: 11,
                      fontWeight: '600',
                      marginTop: 6,
                      marginBottom: 2,
                      letterSpacing: 0.5,
                      textAlign: 'center',
                      zIndex: 2,
                      position: 'relative',
                    },
                    animatedStyle,
                  ]}
                >
                  {children}
                </Animated.Text>
              );
            },
            tabBarIcon: ({ focused, color, size }) => (
              <AnimatedTabIcon focused={focused} route={route} />
            ),
          })}
        >
          <MainTab.Screen
            name="Chat"
            component={ChatScreen}
            options={{ tabBarLabel: t('navigation.chat') }}
          />
          <MainTab.Screen
            name="Profile"
            component={ProfileScreen}
            options={{ tabBarLabel: t('navigation.profile') }}
          />
          <MainTab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ tabBarLabel: t('navigation.settings') }}
          />
        </MainTab.Navigator>
      </Animated.View>
    </View>
  );
}

// Navigation ref for deep linking (export edilmiş)
export const navigationRef = React.createRef<NavigationContainerRef<any>>();

// Ana App Navigator
export default function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [showLanguageSelection, setShowLanguageSelection] = useState(false);

  const checkLanguageAndAuthState = async () => {
    try {
      // Önce dil seçimi kontrolü yap
      const savedLanguage = await AsyncStorage.getItem('appLanguage');
      logger.log('Kaydedilmiş dil kontrolü:', savedLanguage);

      if (!savedLanguage) {
        // Dil seçimi yapılmamış, dil seçimi ekranını göster
        logger.log('Dil seçimi ekranı gösteriliyor');
        setShowLanguageSelection(true);
        setIsLoading(false);
        return;
      }

      // Dil seçimi yapılmış, auth durumunu kontrol et
      logger.log('Dil seçimi yapılmış, auth kontrolü yapılıyor');
      const user = await AuthService.getCurrentUser();
      setIsAuthenticated(!!user);

      // İlk kez açılıyorsa onboarding göster
      setShowOnboarding(!user); // Kullanıcı yoksa onboarding göster
    } catch (error) {
      // Auth session hatası normal, kullanıcı giriş yapmamış
      logger.log('Kullanıcı giriş yapmamış, onboarding gösteriliyor');
      setIsAuthenticated(false);
      setShowOnboarding(true); // Hata durumunda da onboarding göster
    } finally {
      setIsLoading(false);
    }
  };

  const checkAuthState = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      setIsAuthenticated(!!user);

      // İlk kez açılıyorsa onboarding göster
      setShowOnboarding(!user); // Kullanıcı yoksa onboarding göster
    } catch (error) {
      // Auth session hatası normal, kullanıcı giriş yapmamış
      logger.log('Kullanıcı giriş yapmamış, onboarding gösteriliyor');
      setIsAuthenticated(false);
      setShowOnboarding(true); // Hata durumunda da onboarding göster
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Minimum loading süresi (splash screen için)
    const minLoadingTime = 1500; // 1.5 saniye minimum
    const startTime = Date.now();

    // Auth durumunu kontrol et
    checkLanguageAndAuthState().finally(() => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

      // Kalan süreyi bekle veya hemen kapat
      setTimeout(() => {
        setShowLoading(false);
      }, remainingTime);
    });
  }, []);

  // Auth state değişikliklerini dinle
  useEffect(() => {
    const {
      data: { subscription },
    } = AuthService.onAuthStateChange(user => {
      setIsAuthenticated(!!user);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Loading ekranını göster
  if (showLoading) {
    return <LoadingScreen onFinish={() => setShowLoading(false)} />;
  }

  // Auth durumu kontrol edilirken loading
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: darkTheme.colors.background,
        }}
      >
        <ActivityIndicator size="large" color={darkTheme.colors.primary} />
      </View>
    );
  }

  return (
    <PaperProvider theme={paperTheme}>
      <NavigationContainer ref={navigationRef}>
        <RootStack.Navigator
          screenOptions={{
            headerShown: false,
            cardStyle: { backgroundColor: darkTheme.colors.background },
          }}
        >
          {showLanguageSelection ? (
            <RootStack.Screen
              name="LanguageSelection"
              component={(props: any) => (
                <LanguageSelectionScreen
                  {...props}
                  onLanguageSelected={() => {
                    setShowLanguageSelection(false);
                    checkAuthState();
                  }}
                />
              )}
            />
          ) : showOnboarding && !onboardingCompleted ? (
            <RootStack.Screen
              name="Onboarding"
              component={(props: any) => (
                <OnboardingScreen {...props} onComplete={() => setOnboardingCompleted(true)} />
              )}
            />
          ) : isAuthenticated ? (
            <>
              <RootStack.Screen name="Main" component={MainTabNavigator} />
              <RootStack.Screen name="AccountSettings" component={AccountSettingsScreen} />
              <RootStack.Screen name="ChatHistory" component={ChatHistoryScreen} />
              <RootStack.Screen name="HelpSupport" component={HelpSupportScreen} />
              <RootStack.Screen name="EditProfile" component={EditProfileScreen} />
              <RootStack.Screen name="PremiumFeatures" component={PremiumFeaturesScreen} />
              <RootStack.Screen name="PaymentScreen" component={PaymentScreen} />
              <RootStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            </>
          ) : (
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
