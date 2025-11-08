// Profil ekranı
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Card, Avatar, Button, Divider, List, Badge } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme } from '../utils/theme';
import { AuthService } from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';
import { usePremium } from '../hooks/usePremium';
import { ChatService } from '../services/chatService';
import { supabase } from '../config/supabase';

export default function ProfileScreen({ navigation, route }: any) {
  const { t } = useLanguage();
  const { isPremium, canUseFeature } = usePremium();
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalMessages: 0,
    totalSessions: 0,
    joinDate: '',
  });
  const [relationshipDays, setRelationshipDays] = useState(0);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [moodData, setMoodData] = useState([
    { day: t('ui.mon'), mood: 'happy', value: 8 },
    { day: t('ui.tue'), mood: 'neutral', value: 6 },
    { day: t('ui.wed'), mood: 'happy', value: 9 },
    { day: t('ui.thu'), mood: 'sad', value: 4 },
    { day: t('ui.fri'), mood: 'happy', value: 7 },
    { day: t('ui.sat'), mood: 'neutral', value: 6 },
    { day: t('ui.sun'), mood: 'happy', value: 8 },
  ]);
  const [dailyQuote, setDailyQuote] = useState(t('ui.quiet_today'));

  useEffect(() => {
    loadUserData();
  }, []);

  // Kullanıcı yüklendikten sonra günlük sayacı hesapla
  useEffect(() => {
    if (user) {
      calculateRelationshipDays();
    }
  }, [user]);

  // Route parametrelerini dinle ve yeniden yükle
  useEffect(() => {
    if (route?.params?.refresh) {
      loadUserData();
    }
  }, [route?.params?.refresh]);

  // Navigation focus listener - ekran odaklandığında yenile
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadUserData();
    });

    return unsubscribe;
  }, [navigation]);

  // User state değiştiğinde profil fotoğrafını yükle
  useEffect(() => {
    if (user) {
      loadProfileImage(user);
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        // Kullanıcı istatistiklerini yükle
        await loadUserStats(currentUser.id);
        // Profil fotoğrafını yükle (kullanıcı yüklendikten sonra)
        await loadProfileImage(currentUser);
      }
    } catch (error) {
      console.error('Kullanıcı verisi yükleme hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserStats = async (userId: string) => {
    try {
      // Mesaj sayısını al
      const messages = await ChatService.getChatHistory(userId);

      // Gerçek chat session sayısını al
      const { data: sessions, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId);

      const totalSessions = sessions?.length || 0;

      setStats({
        totalMessages: messages.length,
        totalSessions: totalSessions, // Gerçek session sayısı
        joinDate: user?.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '',
      });
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
    }
  };

  // Fotoğraf seçme fonksiyonu
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('ui.permission_required'), t('ui.media_library_permission_denied'));
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedImageUri = result.assets[0].uri;
      setProfileImage(selectedImageUri);

      // AsyncStorage'a kaydet (hızlı erişim için)
      await AsyncStorage.setItem('profileImage', selectedImageUri);

      // Supabase'e kaydet (kalıcılık için)
      try {
        await AuthService.updateUser({
          data: {
            avatar_url: selectedImageUri,
          },
        });
        // Kullanıcı verisini yenile
        await loadUserData();
      } catch (error) {
        logger.error('Profil fotoğrafı kaydetme hatası:', error);
        // Hata olsa bile AsyncStorage'da var, kullanıcıya göstermeye devam et
      }
    }
  };

  // Profil fotoğrafını yükle
  const loadProfileImage = async (currentUser?: User | null) => {
    try {
      const userToCheck = currentUser || user;

      // Önce Supabase'den (user_metadata) kontrol et
      if (userToCheck?.user_metadata?.avatar_url) {
        setProfileImage(userToCheck.user_metadata.avatar_url);
        // AsyncStorage'a da kaydet (cache için)
        await AsyncStorage.setItem('profileImage', userToCheck.user_metadata.avatar_url);
        return;
      }

      // Fallback: AsyncStorage'dan yükle
      const storedImage = await AsyncStorage.getItem('profileImage');
      if (storedImage) {
        setProfileImage(storedImage);
        // Eğer kullanıcı varsa Supabase'e de kaydet (senkronizasyon için)
        if (userToCheck) {
          try {
            await AuthService.updateUser({
              data: {
                avatar_url: storedImage,
              },
            });
          } catch (error) {
            logger.error('Profil fotoğrafı senkronizasyon hatası:', error);
          }
        }
      }
    } catch (error) {
      logger.error('Profil fotoğrafı yükleme hatası:', error);
    }
  };

  // Günlük sayaç hesaplama
  const calculateRelationshipDays = async () => {
    try {
      // Önce kullanıcının kayıt tarihini kontrol et
      if (user?.created_at) {
        const userCreatedAt = new Date(user.created_at);
        const today = new Date();
        // Bugünü de dahil et (en az 1 gün)
        const days = Math.max(
          1,
          Math.floor((today.getTime() - userCreatedAt.getTime()) / (1000 * 60 * 60 * 24)) + 1
        );
        setRelationshipDays(days);
        return;
      }

      // Fallback: AsyncStorage'dan appInstallDate kullan
      const appInstallDate = await AsyncStorage.getItem('appInstallDate');
      if (!appInstallDate) {
        const now = new Date();
        await AsyncStorage.setItem('appInstallDate', now.toISOString());
        setRelationshipDays(1); // İlk gün
      } else {
        const installDate = new Date(appInstallDate);
        const today = new Date();
        // Bugünü de dahil et (en az 1 gün)
        const days = Math.max(
          1,
          Math.floor((today.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
        );
        setRelationshipDays(days);
      }
    } catch (error) {
      logger.error('Günlük sayaç hesaplama hatası:', error);
      setRelationshipDays(0);
    }
  };

  const handleLogout = () => {
    Alert.alert(t('messages.logout_confirm_title'), t('messages.logout_confirm_message'), [
      {
        text: t('messages.cancel'),
        style: 'cancel',
      },
      {
        text: t('profile.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await AuthService.signOut();
            // Giriş sayfasına yönlendir
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          } catch (error) {
            logger.error('Çıkış hatası:', error);
            Alert.alert(t('common.error'), t('profile.logout_error'));
          }
        },
      },
    ]);
  };

  const handleEditProfile = () => {
    navigation.navigate('EditProfile');
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('auth.profile_loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - Modern Profile */}
        <View style={styles.headerContainer}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarSection}>
              <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
                <View style={styles.avatarBackground}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                  ) : user?.user_metadata?.avatar_url ? (
                    <Image
                      source={{ uri: user.user_metadata.avatar_url }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Text style={styles.avatarText}>
                      {user?.user_metadata?.name
                        ? user.user_metadata.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .toUpperCase()
                        : 'ID'}
                    </Text>
                  )}
                </View>
                <View style={styles.cameraIcon}>
                  <Ionicons name="camera" size={16} color="white" />
                </View>
              </TouchableOpacity>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>
                  {user?.user_metadata?.name || t('profile.user')}
                </Text>
                <Text style={styles.userEmail}>{user?.email}</Text>
                {isPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="star" size={12} color={darkTheme.colors.premium} />
                    <Text style={styles.premiumText}>🌟 {t('premium.member')}</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Ionicons name="create-outline" size={18} color={darkTheme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Günün Sözü - Primary Content */}
        <View style={styles.dailyQuoteCard}>
          <View style={styles.quoteContent}>
            <Ionicons name="chatbubble-ellipses" size={20} color={darkTheme.colors.primary} />
            <View style={styles.quoteTextContainer}>
              <Text style={styles.quoteText}>"{t('profile.quote_example')}"</Text>
              <Text style={styles.quoteAuthor}>- {t('app.name')}</Text>
            </View>
          </View>
        </View>

        {/* AI İlişki Kartı - Secondary Content */}
        <View style={styles.relationshipCard}>
          <View style={styles.relationshipContent}>
            <View style={styles.relationshipIcon}>
              <Ionicons name="heart" size={18} color={darkTheme.colors.premium} />
            </View>
            <View style={styles.relationshipTextContainer}>
              <Text style={styles.relationshipText}>
                {relationshipDays} {t('profile.relationship')}
              </Text>
              <Text style={styles.relationshipSubtext}>
                {stats.totalMessages} {t('profile.messages')} • {stats.totalSessions}{' '}
                {t('profile.active_days')}
              </Text>
            </View>
          </View>
        </View>

        {/* Duygu Grafiği (Premium) - Tertiary Content */}
        {isPremium ? (
          <View style={styles.moodChartCard}>
            <View style={styles.chartHeader}>
              <View style={styles.chartTitleContainer}>
                <Ionicons name="trending-up" size={16} color={darkTheme.colors.success} />
                <Text style={styles.chartTitle}>{t('profile.mood_analysis')}</Text>
              </View>
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={8} color={darkTheme.colors.premium} />
                <Text style={styles.premiumText}>{t('premium.title')}</Text>
              </View>
            </View>
            <View style={styles.moodChart}>
              {moodData.map((item, index) => (
                <View key={index} style={styles.moodBar}>
                  <View
                    style={[
                      styles.moodBarFill,
                      {
                        height: item.value * 2,
                        backgroundColor:
                          item.mood === 'happy'
                            ? darkTheme.colors.success
                            : item.mood === 'neutral'
                              ? darkTheme.colors.warning
                              : darkTheme.colors.error,
                      },
                    ]}
                  />
                  <Text style={styles.moodDay}>{item.day}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View style={styles.premiumPromptCard}>
            <View style={styles.premiumPromptContent}>
              <Ionicons name="lock-closed" size={16} color={darkTheme.colors.premium} />
              <View style={styles.premiumPromptTextContainer}>
                <Text style={styles.premiumPromptTitle}>{t('profile.mood_analysis')}</Text>
                <Text style={styles.premiumPromptText}>{t('profile.mood_desc')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.premiumPromptButton}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('PremiumFeatures')}
            >
              <Ionicons name="sparkles" size={14} color={darkTheme.colors.premium} />
              <Text style={styles.premiumPromptButtonText}>{t('profile.premium_discover')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Kullanıcı Yorumları */}
        <View style={styles.reviewsSection}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.reviewsTitle}>{t('reviews.title')}</Text>
            <Text style={styles.reviewsSubtitle}>{t('reviews.subtitle')}</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalReviewsContainer}
            style={styles.horizontalScrollView}
          >
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.starsContainer}>
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                </View>
                <Text style={styles.reviewName}>Sarah M.</Text>
              </View>
              <Text style={styles.reviewText}>"{t('reviews.review_1')}"</Text>
            </View>

            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.starsContainer}>
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                </View>
                <Text style={styles.reviewName}>Alex K.</Text>
              </View>
              <Text style={styles.reviewText}>"{t('reviews.review_2')}"</Text>
            </View>

            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.starsContainer}>
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                </View>
                <Text style={styles.reviewName}>Maria L.</Text>
              </View>
              <Text style={styles.reviewText}>"{t('reviews.review_3')}"</Text>
            </View>

            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.starsContainer}>
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                </View>
                <Text style={styles.reviewName}>John D.</Text>
              </View>
              <Text style={styles.reviewText}>"{t('reviews.review_4')}"</Text>
            </View>

            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.starsContainer}>
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                  <Ionicons name="star" size={16} color={darkTheme.colors.premium} />
                </View>
                <Text style={styles.reviewName}>Emma S.</Text>
              </View>
              <Text style={styles.reviewText}>"{t('reviews.review_5')}"</Text>
            </View>
          </ScrollView>
        </View>

        {/* Quick Actions - Simplified */}
        <View style={styles.optionsSection}>
          <Text style={styles.sectionTitle}>{t('profile.quick_access')}</Text>
          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => navigation.navigate('ChatHistory')}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="time" size={18} color={darkTheme.colors.primary} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{t('profile.chat_history')}</Text>
                <Text style={styles.optionSubtitle}>{t('profile.chat_history_desc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={darkTheme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => navigation.navigate('HelpSupport')}
            >
              <View style={styles.optionIconContainer}>
                <Ionicons name="help-circle" size={18} color={darkTheme.colors.premium} />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>{t('profile.help_support')}</Text>
                <Text style={styles.optionSubtitle}>{t('profile.help_support_desc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color={darkTheme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.appInfoContainer}>
          <Text style={styles.appInfoText}>{t('profile.app_info')}</Text>
          <Text style={styles.appInfoSubtext}>{t('app.tagline')}</Text>
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
    paddingBottom: 100, // Kompakt bottom navigation için boşluk
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: darkTheme.colors.text,
    fontSize: 16,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    backgroundColor: darkTheme.colors.background,
    marginBottom: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: darkTheme.colors.background,
  },
  profileImagePhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    marginBottom: 4,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.premium + '15',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: darkTheme.colors.premium + '40',
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  premiumText: {
    fontSize: 11,
    fontWeight: '700',
    color: darkTheme.colors.premium,
    marginLeft: 5,
    letterSpacing: 0.3,
  },
  userEmail: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 14,
    marginBottom: 8,
  },
  editButton: {
    padding: 12,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    ...darkTheme.shadows.soft,
  },
  optionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    paddingHorizontal: 20,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsContainer: {
    backgroundColor: darkTheme.colors.surface,
    marginHorizontal: 20,
    borderRadius: darkTheme.borderRadius.lg,
    ...darkTheme.shadows.soft,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  optionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.colors.aiHaze,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    marginBottom: 2,
  },
  optionSubtitle: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
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

  // AI İlişki Kartı - Secondary Content
  relationshipCard: {
    backgroundColor: darkTheme.colors.surface,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 14,
    padding: 18,
    ...darkTheme.shadows.soft,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  relationshipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relationshipIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: darkTheme.colors.premium + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  relationshipTextContainer: {
    flex: 1,
  },
  relationshipText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  relationshipSubtext: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 12,
  },

  // Günün Sözü - Primary Content
  dailyQuoteCard: {
    backgroundColor: darkTheme.colors.surface,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    ...darkTheme.shadows.medium,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  quoteContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  quoteTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  quoteText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 22,
    marginBottom: 8,
  },
  quoteAuthor: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 12,
  },

  // Duygu Grafiği - Compact
  moodChartCard: {
    backgroundColor: darkTheme.colors.surface,
    marginHorizontal: 24,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    ...darkTheme.shadows.soft,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chartTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  moodChart: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 60,
  },
  moodBar: {
    alignItems: 'center',
    flex: 1,
  },
  moodBarFill: {
    width: 16,
    borderRadius: 8,
    marginBottom: 6,
  },
  moodDay: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 10,
  },

  // Premium Prompt - Focused
  premiumPromptCard: {
    backgroundColor: darkTheme.colors.surface,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    ...darkTheme.shadows.medium,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  premiumPromptContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  premiumPromptTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  premiumPromptTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  premiumPromptText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  premiumPromptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: darkTheme.colors.premium,
    gap: 8,
    shadowColor: darkTheme.colors.premium,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumPromptButtonText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.premium,
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.2,
  },

  // Kullanıcı Yorumları
  reviewsSection: {
    marginHorizontal: 24,
    marginBottom: 24,
  },
  reviewsHeader: {
    marginBottom: 16,
  },
  reviewsTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  reviewsSubtitle: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 14,
  },
  horizontalScrollView: {
    marginHorizontal: -24,
  },
  horizontalReviewsContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  reviewCard: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    ...darkTheme.shadows.soft,
    width: 280,
    marginRight: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewStars: {
    fontSize: 16,
  },
  reviewName: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  reviewText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
