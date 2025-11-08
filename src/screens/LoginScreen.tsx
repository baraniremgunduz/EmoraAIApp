// Giriş ekranı
import React, { useState } from 'react';
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
} from 'react-native';
import { TextInput, Button, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../utils/theme';
import { AuthService } from '../services/authService';
import GlassButton from '../components/GlassButton';
import GlassInput from '../components/GlassInput';
import GlassCard from '../components/GlassCard';
import { useLanguage } from '../contexts/LanguageContext';

export default function LoginScreen({ navigation }: any) {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('messages.error'), t('auth.fill_all_fields'));
      return;
    }

    setIsLoading(true);
    try {
      await AuthService.signIn(email, password);
      // Başarılı giriş - navigator otomatik olarak ana ekrana yönlendirecek
    } catch (error: any) {
      Alert.alert(t('alert.login_error'), error.message || t('alert.login_error_message'));
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
      Alert.alert(
        t('auth.password_reset_title'),
        t('auth.password_reset_sent')
      );
    } catch (error: any) {
      Alert.alert(t('alert.error'), error.message || t('alert.password_reset_failed'));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.background}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header - Minimal */}
            <View style={styles.header}>
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
                  {/* Forgot Password */}
                  <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotButton}>
                    <Text style={styles.forgotButtonText}>
                      {t('auth.forgot_password')}
                    </Text>
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
    marginBottom: 16,
  },
  inputLabel: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text,
    marginBottom: 6,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  forgotButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    padding: 4,
  },
  forgotButtonText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 13,
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
