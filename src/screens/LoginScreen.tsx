// Giriş ekranı
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { TextInput, Button, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme } from '../utils/theme';
import { AuthService } from '../services/authService';
import GlassButton from '../components/GlassButton';
import GlassInput from '../components/GlassInput';
import GlassCard from '../components/GlassCard';
import { useLanguage } from '../contexts/LanguageContext';
import { logger } from '../utils/logger';

import { StackScreenProps } from '@react-navigation/stack';
import { AuthStackParamList } from '../types';

type LoginScreenProps = StackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: LoginScreenProps) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Kaydedilmiş email'i yükle
  useEffect(() => {
    loadRememberedEmail();
  }, []);

  const loadRememberedEmail = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('rememberedEmail');
      if (savedEmail) {
        setEmail(savedEmail);
        setRememberMe(true);
      }
    } catch (error) {
      logger.error('Kaydedilmiş email yükleme hatası:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('messages.error'), t('auth.fill_all_fields'));
      return;
    }

    setIsLoading(true);
    try {
      await AuthService.signIn(email, password);
      
      // Şifremi hatırla seçiliyse email'i kaydet
      if (rememberMe) {
        await AsyncStorage.setItem('rememberedEmail', email);
      } else {
        // Seçili değilse kaydedilmiş email'i sil
        await AsyncStorage.removeItem('rememberedEmail');
      }
      
      // Başarılı giriş - navigator otomatik olarak ana ekrana yönlendirecek
    } catch (error: any) {
      logger.error('Giriş hatası:', error);
      // Production'da teknik hata mesajı gösterme
      const errorMessage = __DEV__ 
        ? (error.message || t('alert.login_error_message'))
        : t('alert.login_error_message');
      Alert.alert(t('alert.login_error'), errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(t('alert.error'), t('alert.email_required'));
      return;
    }

    try {
      await AuthService.resetPassword(email);
      Alert.alert(t('auth.password_reset_title'), t('auth.password_reset_sent'));
    } catch (error: any) {
      logger.error('Şifre sıfırlama hatası:', error);
      
      // Rate limit hatası kontrolü (Supabase güvenlik hatası)
      let errorMessage = t('alert.password_reset_failed');
      
      if (error?.message?.includes('For security purposes') || 
          error?.message?.includes('rate limit') ||
          error?.message?.includes('59 seconds') ||
          error?.message?.includes('security')) {
        // Rate limit hatası - kullanıcı dostu mesaj
        errorMessage = t('auth.password_reset_rate_limit');
      } else if (__DEV__ && error?.message) {
        // Development modunda teknik hata mesajı göster
        errorMessage = error.message;
      }
      
      Alert.alert(t('alert.error'), errorMessage);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.background}>
        <KeyboardAvoidingView
          behavior="padding"
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header - Minimal */}
            <View style={styles.header}>
              <Image
                source={require('../../assets/auth-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
                onError={(error: any) => {
                  const errorMessage = error?.nativeEvent?.error || error?.message || 'Bilinmeyen hata';
                  logger.error('Logo yükleme hatası - LoginScreen:', errorMessage);
                }}
              />
              <Text style={styles.logoText}>{t('app.name')}</Text>
              <Text style={styles.tagline}>{t('app.tagline')}</Text>
            </View>

            {/* Login Form - Minimal */}
            <View style={styles.formContainer}>
              <View style={styles.formContent}>
                {/* Email Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('auth.email')}</Text>
                  <GlassInput
                    placeholder={t('auth.email_placeholder')}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('auth.password')}</Text>
                  <GlassInput
                    placeholder={t('auth.password_placeholder')}
                    value={password}
                    onChangeText={setPassword}
                    showPasswordToggle={true}
                  />
                </View>

                {/* Remember Me and Forgot Password - Same Row */}
                <View style={styles.optionsRow}>
                  {/* Remember Me Checkbox */}
                  <TouchableOpacity
                    style={styles.rememberMeContainer}
                    onPress={() => setRememberMe(!rememberMe)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                      {rememberMe && (
                        <Ionicons name="checkmark" size={16} color={darkTheme.colors.primary} />
                      )}
                    </View>
                    <Text style={styles.rememberMeText}>{t('auth.remember_me')}</Text>
                  </TouchableOpacity>

                  {/* Forgot Password */}
                  <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
                    <Text style={styles.forgotButtonText}>{t('auth.forgot_password')}</Text>
                  </TouchableOpacity>
                </View>

                {/* Login Button */}
                <GlassButton
                  title={isLoading ? t('auth.logging_in') : t('auth.login_button')}
                  onPress={handleLogin}
                  loading={isLoading}
                  variant="primary"
                  style={styles.loginButton}
                />

                {/* Register Link */}
                <View style={styles.registerContainer}>
                  <Text style={styles.registerText}>{t('auth.no_account')} </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.registerButtonText}>{t('auth.register')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 10,
  },
  logoImage: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  logoText: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    fontSize: 36,
    fontWeight: '300',
    letterSpacing: -1,
    marginBottom: 4,
  },
  tagline: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '400',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  formContent: {
    padding: 20,
  },
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text,
    marginBottom: 4,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  forgotButton: {
    padding: 4,
  },
  forgotButtonText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 13,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: darkTheme.colors.textSecondary,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: darkTheme.colors.primary + '20',
    borderColor: darkTheme.colors.primary,
  },
  rememberMeText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontSize: 14,
  },
  loginButton: {
    marginBottom: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
  },
  registerButtonText: {
    ...darkTheme.typography.body,
    color: '#6A5ACD',
    fontWeight: '500',
  },
});
