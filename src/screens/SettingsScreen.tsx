// Ayarlar ekranı
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  Switch,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Card, List, Divider, Button, RadioButton, TextInput } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { darkTheme } from '../utils/theme';
import { AuthService } from '../services/authService';
import { logger } from '../utils/logger';
import { NotificationService } from '../services/notificationService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLanguage } from '../contexts/LanguageContext';
import { validatePassword } from '../utils/passwordValidator';
import { usePremiumContext } from '../contexts/PremiumContext';

export default function SettingsScreen({ navigation }: any) {
  const { language, setLanguage, t } = useLanguage();
  const { isPremium } = usePremiumContext();
  const [user, setUser] = useState<any>(null);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settings, setSettings] = useState({
    notifications: true,
    soundEnabled: true,
    vibrationEnabled: true,
    autoSaveChats: true,
    theme: 'dark', // 'dark' | 'light' | 'auto'
    aiPersonality: 'friendly', // 'friendly' | 'professional' | 'casual'
  });

  useEffect(() => {
    loadUserData();
    loadSettings();
  }, []);

  const loadUserData = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      logger.error('Kullanıcı verisi yükleme hatası:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await AsyncStorage.getItem('userSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      }
    } catch (error) {
      logger.error('Ayar yükleme hatası:', error);
    }
  };

  const saveSettings = async (key: string, value: any) => {
    try {
      const currentSettings = { ...settings, [key]: value };
      await AsyncStorage.setItem('userSettings', JSON.stringify(currentSettings));
      logger.log(`Ayar kaydedildi: ${key} = ${value}`);
    } catch (error) {
      logger.error('Ayar kaydetme hatası:', error);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    if (key === 'language') {
      setLanguage(value);
    } else {
      setSettings(prev => ({
        ...prev,
        [key]: value,
      }));

      // Ayarları anında kaydet
      saveSettings(key, value);
    }
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = async () => {
    // Güçlü şifre validasyonu
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.valid) {
      const errorMessage = passwordValidation.errors.join('\n');
      Alert.alert(t('messages.error'), `Şifre gereksinimleri:\n\n${errorMessage}`);
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('messages.error'), 'Şifreler eşleşmiyor');
      return;
    }

    try {
      await AuthService.updatePassword(newPassword);
      Alert.alert(t('messages.success'), t('errors.password_changed'));
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      logger.error('Şifre değiştirme hatası:', error);
      Alert.alert(
        t('messages.error'),
        'Şifre değiştirme sırasında bir hata oluştu: ' + (error.message || 'Bilinmeyen hata')
      );
    }
  };

  const handleLogout = async () => {
    Alert.alert(t('profile.logout'), t('profile.logout_confirm'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await AuthService.signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } catch (error) {
            logger.error('Çıkış yapma hatası:', error);
            Alert.alert(t('common.error'), t('profile.logout_error'));
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(t('account.delete_account'), t('account.delete_warning'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('account.delete_confirm'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(t('account.final_confirmation'), t('account.final_warning'), [
            {
              text: t('common.cancel'),
              style: 'cancel',
            },
            {
              text: t('account.delete_final'),
              style: 'destructive',
              onPress: async () => {
                try {
                  await AuthService.deleteAccount();
                  Alert.alert(t('common.success'), t('account.delete_success'));
                  // Kayıt ol sayfasına yönlendir
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Register' }],
                  });
                } catch (error) {
                  logger.error('Hesap silme hatası:', error);
                  Alert.alert(t('common.error'), t('account.delete_error'));
                }
              },
            },
          ]);
        },
      },
    ]);
  };

  const handleExportData = async () => {
    try {
      // Kullanıcı verilerini topla
      const userData = {
        user: user,
        settings: settings,
        exportDate: new Date().toISOString(),
        appVersion: '1.0.2',
      };

      // JSON formatında veri hazırla
      const jsonData = JSON.stringify(userData, null, 2);

      // Dosya adı oluştur
      const fileName = `emora_ai_data_${new Date().toISOString().split('T')[0]}.json`;

      Alert.alert(t('account.export_data'), t('account.export_ready').replace('{fileName}', fileName), [
        {
          text: t('common.ok'),
          onPress: () => {
            // Burada dosya paylaşımı veya indirme işlemi yapılabilir
            logger.log('Export data:', jsonData);
          },
        },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), t('account.export_error'));
    }
  };

  const handleClearCache = () => {
    Alert.alert(t('advanced.clear_cache'), t('advanced.clear_cache_warning'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('advanced.clear_cache_button'),
        onPress: async () => {
          try {
            // AsyncStorage'dan tüm verileri temizle (ayarlar hariç)
            const keys = await AsyncStorage.getAllKeys();
            const keysToRemove = keys.filter(
              key => !key.includes('userSettings') && !key.includes('onboardingCompleted')
            );

            if (keysToRemove.length > 0) {
              await AsyncStorage.multiRemove(keysToRemove);
            }

            Alert.alert(t('common.success'), t('advanced.clear_cache_success'));
          } catch (error) {
            Alert.alert(t('common.error'), t('advanced.clear_cache_error'));
          }
        },
      },
    ]);
  };

  // AI Personality seçimini handle eden fonksiyon
  const handlePersonalitySelect = (personality: 'friendly' | 'professional' | 'casual') => {
    // Dostane her zaman erişilebilir
    if (personality === 'friendly') {
      handleSettingChange('aiPersonality', personality);
      setShowPersonalityModal(false);
      return;
    }

    // Professional ve Casual premium gerektirir
    if (!isPremium) {
      setShowPersonalityModal(false);
      navigation.navigate('PremiumFeatures');
      return;
    }

    // Premium ise seçimi yap
    handleSettingChange('aiPersonality', personality);
    setShowPersonalityModal(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - Minimal */}
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>{t('settings.title')}</Text>
        </View>

        {/* Account Settings - Minimal List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>{t('settings.account')}</Text>

          <TouchableOpacity style={styles.settingItem} onPress={handleChangePassword}>
            <Ionicons name="lock-closed-outline" size={20} color={darkTheme.colors.primary} />
            <Text style={styles.settingTitle}>{t('account.change_password')}</Text>
            <Ionicons name="chevron-forward" size={16} color={darkTheme.colors.primary} />
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity style={styles.settingItem} onPress={handleExportData}>
            <Ionicons name="download-outline" size={20} color={darkTheme.colors.primary} />
            <Text style={styles.settingTitle}>{t('account.export_data')}</Text>
            <Ionicons name="chevron-forward" size={16} color={darkTheme.colors.primary} />
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('PrivacyPolicy')}
          >
            <Ionicons name="shield-outline" size={20} color={darkTheme.colors.primary} />
            <Text style={styles.settingTitle}>{t('privacy.title')}</Text>
            <Ionicons name="chevron-forward" size={16} color={darkTheme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* AI Personality Settings - Priority Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>{t('settings.ai_interaction')}</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => setShowPersonalityModal(true)}
          >
            <Ionicons name="sparkles-outline" size={20} color={darkTheme.colors.primary} />
            <View style={styles.settingContent}>
              <Text style={styles.personalityTitle}>{t('ai.personality')}</Text>
              <Text style={styles.settingSubtitle}>
                {settings.aiPersonality === 'friendly'
                  ? t('personality.friendly')
                  : settings.aiPersonality === 'professional'
                    ? t('personality.professional')
                    : t('personality.casual')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={darkTheme.colors.primary} />
          </TouchableOpacity>

          <View style={styles.settingDivider} />

          <View style={styles.settingItem}>
            <Ionicons name="save-outline" size={20} color={darkTheme.colors.primary} />
            <Text style={styles.settingTitle}>{t('ai.auto_save')}</Text>
            <Switch
              value={settings.autoSaveChats}
              onValueChange={value => handleSettingChange('autoSaveChats', value)}
              trackColor={{ false: darkTheme.colors.border, true: darkTheme.colors.primary }}
              thumbColor={settings.autoSaveChats ? 'white' : darkTheme.colors.textSecondary}
              style={styles.switchStyle}
            />
          </View>
        </View>

        {/* Notification Settings - Minimal List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionLabel}>{t('settings.notifications')}</Text>

          <View style={styles.settingItem}>
            <Ionicons name="notifications-outline" size={20} color={darkTheme.colors.primary} />
            <Text style={styles.settingTitle}>{t('notifications.title')}</Text>
            <Switch
              value={settings.notifications}
              onValueChange={value => handleSettingChange('notifications', value)}
              trackColor={{ false: darkTheme.colors.border, true: darkTheme.colors.primary }}
              thumbColor={settings.notifications ? 'white' : darkTheme.colors.textSecondary}
              style={styles.switchStyle}
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingItem}>
            <Ionicons name="volume-high-outline" size={20} color={darkTheme.colors.primary} />
            <Text style={styles.settingTitle}>{t('notifications.sound')}</Text>
            <Switch
              value={settings.soundEnabled}
              onValueChange={value => handleSettingChange('soundEnabled', value)}
              trackColor={{ false: darkTheme.colors.border, true: darkTheme.colors.primary }}
              thumbColor={settings.soundEnabled ? 'white' : darkTheme.colors.textSecondary}
              style={styles.switchStyle}
            />
          </View>

          <View style={styles.settingDivider} />

          <View style={styles.settingItem}>
            <Ionicons name="phone-portrait-outline" size={20} color={darkTheme.colors.primary} />
            <Text style={styles.settingTitle}>{t('notifications.vibration')}</Text>
            <Switch
              value={settings.vibrationEnabled}
              onValueChange={value => handleSettingChange('vibrationEnabled', value)}
              trackColor={{ false: darkTheme.colors.border, true: darkTheme.colors.primary }}
              thumbColor={settings.vibrationEnabled ? 'white' : darkTheme.colors.textSecondary}
              style={styles.switchStyle}
            />
          </View>
        </View>

        {/* App Settings */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>{t('settings.advanced')}</Text>

            <List.Item
              title={t('advanced.language')}
              description={t('advanced.language_desc')}
              left={props => <List.Icon {...props} icon="translate" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => setShowLanguageModal(true)}
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
            />
            <Divider />

            <List.Item
              title={t('advanced.clear_cache')}
              description={t('advanced.clear_cache_desc')}
              left={props => <List.Icon {...props} icon="delete-sweep" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={handleClearCache}
              titleStyle={styles.listTitle}
              descriptionStyle={styles.listDescription}
            />
          </Card.Content>
        </Card>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={darkTheme.colors.text} />
            <Text style={styles.logoutButtonText}>{t('profile.logout')}</Text>
          </TouchableOpacity>
        </View>

        {/* Delete Account - Moved to bottom */}
        <View style={styles.deleteAccountSection}>
          <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
            <Ionicons name="trash-outline" size={20} color={darkTheme.colors.error} />
            <Text style={[styles.deleteAccountText, { color: darkTheme.colors.error }]}>
              {t('account.delete_account')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfoContainer}>
          <Text style={styles.appInfoText}>{t('app.name')} v1.0.2</Text>
          <Text style={styles.appInfoSubtext}>{t('app.tagline')}</Text>
        </View>
      </ScrollView>

      {/* AI Personality Selection Modal */}
      <Modal
        visible={showPersonalityModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPersonalityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('modal.personality_title')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPersonalityModal(false)}
              >
                <Ionicons name="close" size={24} color={darkTheme.colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.personalityOptions}>
              {/* Friendly - Her zaman erişilebilir */}
              <TouchableOpacity
                style={[
                  styles.personalityOption,
                  settings.aiPersonality === 'friendly' && styles.personalityOptionSelected,
                ]}
                onPress={() => handlePersonalitySelect('friendly')}
              >
                <View style={styles.personalityIcon}>
                  <Ionicons name="heart" size={24} color={darkTheme.colors.primary} />
                </View>
                <View style={styles.personalityContent}>
                  <Text style={styles.personalityTitle}>{t('personality.friendly')}</Text>
                  <Text style={styles.personalityDescription}>
                    {t('personality.friendly_desc')}
                  </Text>
                </View>
                {settings.aiPersonality === 'friendly' && (
                  <Ionicons name="checkmark-circle" size={24} color={darkTheme.colors.primary} />
                )}
              </TouchableOpacity>

              {/* Professional - Premium */}
              <TouchableOpacity
                style={[
                  styles.personalityOption,
                  settings.aiPersonality === 'professional' && styles.personalityOptionSelected,
                ]}
                onPress={() => handlePersonalitySelect('professional')}
              >
                <View style={styles.personalityIcon}>
                  <Ionicons name="briefcase" size={24} color={darkTheme.colors.secondary} />
                </View>
                <View style={styles.personalityContent}>
                  <View style={styles.personalityTitleRow}>
                    <Text style={styles.personalityTitle}>{t('personality.professional')}</Text>
                    <View style={styles.premiumBadge}>
                      <Ionicons name="star" size={12} color={darkTheme.colors.premium} />
                      <Text style={styles.premiumBadgeText}>{t('personality.premium')}</Text>
                    </View>
                  </View>
                  <Text style={styles.personalityDescription}>
                    {t('personality.professional_desc')}
                  </Text>
                </View>
                {settings.aiPersonality === 'professional' && (
                  <Ionicons name="checkmark-circle" size={24} color={darkTheme.colors.primary} />
                )}
              </TouchableOpacity>

              {/* Casual - Premium */}
              <TouchableOpacity
                style={[
                  styles.personalityOption,
                  settings.aiPersonality === 'casual' && styles.personalityOptionSelected,
                ]}
                onPress={() => handlePersonalitySelect('casual')}
              >
                <View style={styles.personalityIcon}>
                  <Ionicons name="happy" size={24} color={darkTheme.colors.primary} />
                </View>
                <View style={styles.personalityContent}>
                  <View style={styles.personalityTitleRow}>
                  <Text style={styles.personalityTitle}>{t('personality.casual')}</Text>
                    <View style={styles.premiumBadge}>
                      <Ionicons name="star" size={12} color={darkTheme.colors.premium} />
                      <Text style={styles.premiumBadgeText}>{t('personality.premium')}</Text>
                    </View>
                  </View>
                  <Text style={styles.personalityDescription}>{t('personality.casual_desc')}</Text>
                </View>
                {settings.aiPersonality === 'casual' && (
                  <Ionicons name="checkmark-circle" size={24} color={darkTheme.colors.primary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('advanced.language')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowLanguageModal(false)}
              >
                <Ionicons name="close" size={24} color={darkTheme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.languageGrid}>
              {[
                { code: 'en', name: 'English', flag: '🇺🇸' },
                { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
                { code: 'fr', name: 'Français', flag: '🇫🇷' },
                { code: 'es', name: 'Español', flag: '🇪🇸' },
                { code: 'it', name: 'Italiano', flag: '🇮🇹' },
                { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
                { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
                { code: 'pl', name: 'Polski', flag: '🇵🇱' },
                { code: 'pt', name: 'Português', flag: '🇵🇹' },
                { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
                { code: 'no', name: 'Norsk', flag: '🇳🇴' },
                { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
                { code: 'da', name: 'Dansk', flag: '🇩🇰' },
              ].map(lang => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    language === lang.code && styles.languageOptionSelected,
                  ]}
                  onPress={() => {
                    handleSettingChange('language', lang.code);
                    setShowLanguageModal(false);
                  }}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={styles.languageName}>{lang.name}</Text>
                  {language === lang.code && (
                    <Ionicons name="checkmark-circle" size={20} color={darkTheme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('account.change_password')}</Text>
            </View>

            <View style={styles.passwordModalContent}>
              <TextInput
                label={t('account.new_password')}
                placeholder={t('account.new_password')}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry
                mode="outlined"
                style={[styles.passwordInput, { color: darkTheme.colors.primary }]}
                contentStyle={{ color: darkTheme.colors.primary }}
                inputStyle={{ color: darkTheme.colors.primary }}
                outlineColor={darkTheme.colors.primary}
                activeOutlineColor={darkTheme.colors.primary}
                labelTextColor={darkTheme.colors.primary}
                textColor={darkTheme.colors.primary}
                placeholderTextColor={darkTheme.colors.primary}
                selectionColor={darkTheme.colors.primary}
                underlineColor={darkTheme.colors.primary}
                underlineColorAndroid={darkTheme.colors.primary}
                theme={{
                  colors: {
                    primary: darkTheme.colors.primary,
                    background: darkTheme.colors.surface,
                    text: darkTheme.colors.primary,
                    placeholder: darkTheme.colors.primary,
                    outline: darkTheme.colors.primary,
                    onSurface: darkTheme.colors.primary,
                    onSurfaceVariant: darkTheme.colors.primary,
                    surfaceVariant: darkTheme.colors.surface,
                    onBackground: darkTheme.colors.primary,
                  },
                }}
              />

              <TextInput
                label={t('account.confirm_password')}
                placeholder={t('account.confirm_password')}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                mode="outlined"
                style={[styles.passwordInput, { color: darkTheme.colors.primary }]}
                contentStyle={{ color: darkTheme.colors.primary }}
                inputStyle={{ color: darkTheme.colors.primary }}
                outlineColor={darkTheme.colors.primary}
                activeOutlineColor={darkTheme.colors.primary}
                labelTextColor={darkTheme.colors.primary}
                textColor={darkTheme.colors.primary}
                placeholderTextColor={darkTheme.colors.primary}
                selectionColor={darkTheme.colors.primary}
                underlineColor={darkTheme.colors.primary}
                underlineColorAndroid={darkTheme.colors.primary}
                theme={{
                  colors: {
                    primary: darkTheme.colors.primary,
                    background: darkTheme.colors.surface,
                    text: darkTheme.colors.primary,
                    placeholder: darkTheme.colors.primary,
                    outline: darkTheme.colors.primary,
                    onSurface: darkTheme.colors.primary,
                    onSurfaceVariant: darkTheme.colors.primary,
                    surfaceVariant: darkTheme.colors.surface,
                    onBackground: darkTheme.colors.primary,
                  },
                }}
              />

              <View style={styles.passwordButtonContainer}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    setShowPasswordModal(false);
                    setNewPassword('');
                    setConfirmPassword('');
                  }}
                  style={styles.passwordCancelButton}
                  textColor={darkTheme.colors.primary}
                  borderColor={darkTheme.colors.primary}
                >
                  {t('messages.cancel')}
                </Button>
                <Button
                  mode="contained"
                  onPress={handlePasswordSubmit}
                  style={styles.passwordSubmitButton}
                  buttonColor={darkTheme.colors.primary}
                  textColor="white"
                >
                  {t('messages.change')}
                </Button>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Kompakt bottom navigation için boşluk
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 28,
    backgroundColor: darkTheme.colors.background,
  },
  headerTitle: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
  },
  sectionContainer: {
    backgroundColor: darkTheme.colors.surface,
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: darkTheme.borderRadius.md,
  },
  sectionLabel: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  settingTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    flex: 1,
    marginLeft: 16,
  },
  settingContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  settingSubtitle: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    textAlign: 'left',
  },
  personalityTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontSize: 15,
    marginLeft: 0,
  },
  settingDivider: {
    height: 1,
    backgroundColor: darkTheme.colors.border,
    marginHorizontal: 24,
  },
  radioGroup: {
    marginLeft: 16,
    marginTop: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  radioLabel: {
    color: darkTheme.colors.text,
    fontSize: 16,
    marginLeft: 8,
  },
  divider: {
    marginVertical: 8,
  },
  languageSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  languageButton: {
    minWidth: 40,
  },
  appInfoContainer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  appInfoText: {
    color: darkTheme.colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  appInfoSubtext: {
    color: darkTheme.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 20,
    marginHorizontal: 24,
    maxWidth: 400,
    width: '100%',
    ...darkTheme.shadows.strong,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  modalTitle: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  closeButton: {
    padding: 4,
  },
  sectionCard: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.md,
    marginBottom: 16,
    marginHorizontal: 16,
  },
  sectionTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  listTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontSize: 16,
  },
  listDescription: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 13,
  },
  personalityOptions: {
    padding: 24,
  },
  personalityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    backgroundColor: darkTheme.colors.background,
  },
  personalityOptionSelected: {
    borderColor: darkTheme.colors.primary,
    backgroundColor: darkTheme.colors.primary + '10',
  },
  personalityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: darkTheme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  personalityContent: {
    flex: 1,
  },
  personalityTitleModal: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  personalityDescription: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  personalityTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.premium + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: darkTheme.colors.premium,
    letterSpacing: 0.3,
  },
  switchStyle: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  logoutSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.primary,
  },
  logoutButtonText: {
    ...darkTheme.typography.subtitle,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  deleteAccountSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.error,
  },
  deleteAccountText: {
    ...darkTheme.typography.subtitle,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  languageOption: {
    width: '30%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 8,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  languageOptionSelected: {
    backgroundColor: darkTheme.colors.primary + '20',
    borderColor: darkTheme.colors.primary,
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 8,
  },
  languageName: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text,
    fontSize: 12,
    flex: 1,
  },
  passwordModalContent: {
    padding: 24,
  },
  passwordInput: {
    marginBottom: 16,
    backgroundColor: darkTheme.colors.surface,
    color: darkTheme.colors.primary,
  },
  passwordButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  passwordCancelButton: {
    flex: 1,
    borderColor: darkTheme.colors.primary,
  },
  passwordSubmitButton: {
    flex: 1,
  },
});
