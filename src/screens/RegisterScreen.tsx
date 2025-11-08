// Kayıt ekranı
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
import { darkTheme } from '../utils/theme';
import { AuthService } from '../services/authService';
import GlassInput from '../components/GlassInput';
import GlassButton from '../components/GlassButton';
import { useLanguage } from '../contexts/LanguageContext';
import {
  validatePassword,
  getPasswordStrengthText,
  getPasswordStrengthColor,
} from '../utils/passwordValidator';

export default function RegisterScreen({ navigation }: any) {
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(
    null
  );

  const validateForm = () => {
    if (!name.trim()) {
      Alert.alert(t('messages.error'), t('auth.name_required'));
      return false;
    }
    if (!email.trim()) {
      Alert.alert(t('messages.error'), t('auth.email_required'));
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert(t('messages.error'), t('auth.invalid_email'));
      return false;
    }

    // Güçlü şifre validasyonu
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      const errorMessage = passwordValidation.errors.join('\n');
      Alert.alert(t('messages.error'), `Şifre gereksinimleri:\n\n${errorMessage}`);
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('messages.error'), t('auth.password_mismatch'));
      return false;
    }
    return true;
  };

  // Şifre değiştiğinde güçlülük kontrolü
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (text.length > 0) {
      const validation = validatePassword(text);
      setPasswordStrength(validation.strength);
    } else {
      setPasswordStrength(null);
    }
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await AuthService.signUp(email.trim(), password, name.trim());
      Alert.alert(t('alert.registration_success'), t('alert.registration_success_message'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (error: any) {
      Alert.alert(
        t('alert.registration_error'),
        error.message || t('alert.registration_error_message')
      );
    } finally {
      setIsLoading(false);
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
              <Text style={styles.tagline}>{t('auth.register_tagline')}</Text>
            </View>

            {/* Register Form - Minimal */}
            <View style={styles.formContainer}>
              <View style={styles.formContent}>
                {/* Name Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('auth.name')}</Text>
                  <GlassInput
                    placeholder={t('auth.name_placeholder')}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                  />
                </View>

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
                    onChangeText={handlePasswordChange}
                    secureTextEntry
                    showPasswordToggle={true}
                  />
                  {passwordStrength && (
                    <View style={styles.passwordStrengthContainer}>
                      <View style={styles.passwordStrengthBar}>
                        <View
                          style={[
                            styles.passwordStrengthFill,
                            {
                              width:
                                passwordStrength === 'weak'
                                  ? '33%'
                                  : passwordStrength === 'medium'
                                    ? '66%'
                                    : '100%',
                              backgroundColor: getPasswordStrengthColor(passwordStrength),
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.passwordStrengthText,
                          { color: getPasswordStrengthColor(passwordStrength) },
                        ]}
                      >
                        Şifre Güçlülüğü: {getPasswordStrengthText(passwordStrength)}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Confirm Password Input */}
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t('auth.confirm_password')}</Text>
                  <GlassInput
                    placeholder={t('auth.confirm_password_placeholder')}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    showPasswordToggle={true}
                  />
                </View>

                {/* Register Button */}
                <GlassButton
                  title={isLoading ? t('auth.registering') : t('auth.register_button')}
                  onPress={handleRegister}
                  loading={isLoading}
                  variant="primary"
                  style={styles.registerButton}
                />

                {/* Login Link */}
                <View style={styles.loginContainer}>
                  <Text style={styles.loginText}>{t('auth.already_have_account')} </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                    <Text style={styles.loginButtonText}>{t('auth.login')}</Text>
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
  passwordStrengthContainer: {
    marginTop: 8,
    marginBottom: 8,
  },
  passwordStrengthBar: {
    height: 4,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
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
  registerButton: {
    marginBottom: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    fontWeight: '400' as const,
  },
  loginButtonText: {
    ...darkTheme.typography.body,
    color: '#6A5ACD',
    fontWeight: '500',
  },
});
