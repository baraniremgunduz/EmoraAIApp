// Hesap Bilgileri Ekranı
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../utils/theme';
import { useLanguage } from '../contexts/LanguageContext';
import GlassButton from '../components/GlassButton';
import GlassInput from '../components/GlassInput';
import GlassCard from '../components/GlassCard';

export default function AccountSettingsScreen({ navigation }: any) {
  const { t } = useLanguage();
  const [name, setName] = useState('Kullanıcı');
  const [email, setEmail] = useState('user@example.com');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // Profil güncelleme logic'i burada olacak
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simüle edilmiş API call
      Alert.alert(t('ui.success'), t('ui.profile_updated'));
    } catch (error) {
      Alert.alert(t('alert.error'), t('alert.profile_update_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert(t('alert.error'), t('alert.fill_all_fields'));
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(t('alert.error'), t('alert.password_mismatch'));
      return;
    }

    setIsLoading(true);
    try {
      // Şifre değiştirme logic'i burada olacak
      await new Promise(resolve => setTimeout(resolve, 1000));
      Alert.alert(t('ui.success'), t('ui.password_changed'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      Alert.alert(t('alert.error'), t('alert.password_change_error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Modern Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <View style={styles.backButtonContainer}>
              <Ionicons name="arrow-back" size={20} color={darkTheme.colors.primary} />
            </View>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('account_settings.title')}</Text>
            <Text style={styles.headerSubtitle}>Hesabınızı yönetin ve güvenliğinizi sağlayın</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Hero Avatar Section */}
        <View style={styles.heroSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarBackground}>
              <Text style={styles.avatarText}>ID</Text>
            </View>
            <TouchableOpacity style={styles.editAvatarButton}>
              <Ionicons name="camera" size={16} color={darkTheme.colors.primary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroTitle}>Hesap Ayarları</Text>
          <Text style={styles.heroSubtitle}>
            Profil bilgilerinizi güncelleyin ve güvenliğinizi artırın
          </Text>
        </View>

        {/* Profile Info - Modern Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('account_settings.personal_info')}</Text>
            <Text style={styles.sectionSubtitle}>Kişisel bilgilerinizi düzenleyin</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Ad Soyad</Text>
                <GlassInput
                  placeholder={t('ui.name_placeholder')}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>E-posta</Text>
                <GlassInput
                  placeholder="E-posta adresinizi girin"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <GlassButton
                title={t('ui.save_profile')}
                onPress={handleSaveProfile}
                loading={isLoading}
                variant="primary"
                style={styles.saveButton}
              />
            </View>
          </View>
        </View>

        {/* Password Change - Modern Card */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Güvenlik</Text>
            <Text style={styles.sectionSubtitle}>Şifrenizi güncelleyin</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardContent}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Mevcut Şifre</Text>
                <GlassInput
                  placeholder={t('ui.current_password_placeholder')}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Yeni Şifre</Text>
                <GlassInput
                  placeholder={t('ui.new_password_placeholder')}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Şifre Tekrar</Text>
                <GlassInput
                  placeholder={t('ui.confirm_password_placeholder')}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>

              <GlassButton
                title="Şifreyi Değiştir"
                onPress={handleChangePassword}
                loading={isLoading}
                variant="secondary"
                style={styles.saveButton}
              />
            </View>
          </View>
        </View>

        {/* Security Status - Modern Cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Güvenlik Durumu</Text>
            <Text style={styles.sectionSubtitle}>Hesabınızın güvenlik durumu</Text>
          </View>

          <View style={styles.securityCards}>
            <View style={styles.securityCard}>
              <View
                style={[styles.securityIcon, { backgroundColor: darkTheme.colors.success + '20' }]}
              >
                <Ionicons name="shield-checkmark" size={24} color={darkTheme.colors.success} />
              </View>
              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>Güvenli Hesap</Text>
                <Text style={styles.securitySubtitle}>Hesabınız güvenli şekilde korunuyor</Text>
              </View>
              <View style={[styles.statusIndicator, { backgroundColor: darkTheme.colors.success }]}>
                <Ionicons name="checkmark" size={12} color="white" />
              </View>
            </View>

            <View style={styles.securityCard}>
              <View
                style={[styles.securityIcon, { backgroundColor: darkTheme.colors.primary + '20' }]}
              >
                <Ionicons name="lock-closed" size={24} color={darkTheme.colors.primary} />
              </View>
              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>Şifreli Bağlantı</Text>
                <Text style={styles.securitySubtitle}>Tüm verileriniz şifreleniyor</Text>
              </View>
              <View style={[styles.statusIndicator, { backgroundColor: darkTheme.colors.primary }]}>
                <Ionicons name="checkmark" size={12} color="white" />
              </View>
            </View>

            <View style={styles.securityCard}>
              <View
                style={[styles.securityIcon, { backgroundColor: darkTheme.colors.premium + '20' }]}
              >
                <Ionicons name="eye-off" size={24} color={darkTheme.colors.premium} />
              </View>
              <View style={styles.securityContent}>
                <Text style={styles.securityTitle}>Gizlilik Koruması</Text>
                <Text style={styles.securitySubtitle}>Kişisel verileriniz korunuyor</Text>
              </View>
              <View style={[styles.statusIndicator, { backgroundColor: darkTheme.colors.premium }]}>
                <Ionicons name="checkmark" size={12} color="white" />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 100, // Bottom navigation için boşluk
  },

  // Modern Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingTop: 10,
  },
  backButton: {
    padding: 8,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...darkTheme.shadows.small,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: darkTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...darkTheme.shadows.medium,
    borderWidth: 3,
    borderColor: darkTheme.colors.surface,
  },
  avatarText: {
    ...darkTheme.typography.title,
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: darkTheme.colors.background,
    borderWidth: 2,
    borderColor: darkTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...darkTheme.shadows.small,
  },
  heroTitle: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroSubtitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Sections
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
  },

  // Cards
  card: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    ...darkTheme.shadows.medium,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  cardContent: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text,
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  saveButton: {
    marginTop: 8,
  },

  // Security Cards
  securityCards: {
    gap: 12,
  },
  securityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    ...darkTheme.shadows.small,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  securityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  securityContent: {
    flex: 1,
  },
  securityTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    marginBottom: 2,
    fontWeight: '600',
  },
  securitySubtitle: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    lineHeight: 18,
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
