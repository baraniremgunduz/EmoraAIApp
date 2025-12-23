// Premium özellikler sayfası
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { darkTheme } from '../utils/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { PurchaseService } from '../services/purchaseService';
import { logger } from '../utils/logger';
import { adService } from '../services/adService';
import { usePremium } from '../hooks/usePremium';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADS_ENABLED } from '../config/adConfig';

const { width } = Dimensions.get('window');

interface PremiumFeaturesScreenProps {
  navigation: any;
}

export default function PremiumFeaturesScreen({ navigation }: PremiumFeaturesScreenProps) {
  const { t, currency } = useLanguage();
  const { isPremium } = usePremium();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('yearly'); // Varsayılan olarak yıllık plan
  const [isRewardedLoading, setIsRewardedLoading] = useState(false);
  const [isRewardedAvailable, setIsRewardedAvailable] = useState(true); // Varsayılan olarak true - reklam yüklenmeye çalışılacak
  const rewardAlertShownRef = useRef(false); // Alert'in gösterilip gösterilmediğini takip et

  const features = [
    {
      id: 1,
      icon: 'infinite',
      title: t('premium.unlimited'),
      description: t('premium.unlimited_desc'),
      color: darkTheme.colors.primary,
      highlight: true,
    },
    {
      id: 2,
      icon: 'flash',
      title: t('premium.fast_responses'),
      description: t('premium.fast_responses_desc'),
      color: darkTheme.colors.success,
      highlight: false,
    },
    {
      id: 3,
      icon: 'person',
      title: t('premium.exclusive_ai'),
      description: t('premium.exclusive_ai_desc'),
      color: darkTheme.colors.premium,
      highlight: true,
    },
    {
      id: 4,
      icon: 'trending-up',
      title: t('premium.mood_analysis'),
      description: t('premium.mood_analysis_desc'),
      color: darkTheme.colors.premium,
      highlight: false,
    },
    {
      id: 5,
      icon: 'download',
      title: t('premium.export_history'),
      description: t('premium.export_history_desc'),
      color: darkTheme.colors.error,
      highlight: false,
    },
    {
      id: 6,
      icon: 'headset',
      title: t('premium.priority_support'),
      description: t('premium.priority_support_desc'),
      color: darkTheme.colors.primary,
      highlight: false,
    },
  ];

  const testimonials = [
    {
      id: 1,
      name: 'Sarah M.',
      text: t('premium.testimonial_1'),
      rating: 5,
    },
    {
      id: 2,
      name: 'Alex K.',
      text: t('premium.testimonial_2'),
      rating: 5,
    },
    {
      id: 3,
      name: 'Maria L.',
      text: t('premium.testimonial_3'),
      rating: 5,
    },
    {
      id: 4,
      name: 'James W.',
      text: t('premium.testimonial_4'),
      rating: 5,
    },
    {
      id: 5,
      name: 'Emma S.',
      text: t('premium.testimonial_5'),
      rating: 5,
    },
    {
      id: 6,
      name: 'David R.',
      text: t('premium.testimonial_6'),
      rating: 5,
    },
    {
      id: 7,
      name: 'Sophie B.',
      text: t('premium.testimonial_7'),
      rating: 5,
    },
    {
      id: 8,
      name: 'Michael T.',
      text: t('premium.testimonial_8'),
      rating: 5,
    },
  ];

  // IAP başlatma
  useEffect(() => {
    const initializePurchase = async () => {
      try {
        await PurchaseService.initialize();
      } catch (error) {
        logger.error('Purchase service initialization error:', error);
      }
    };

    initializePurchase();

    // Rewarded reklam yüklenmiş mi kontrol et - Sadece reklamlar açıksa
    const checkRewardedAd = async () => {
      if (!isPremium && ADS_ENABLED) {
        try {
          const loaded = await adService.isRewardedLoaded();
          setIsRewardedAvailable(loaded);
          
          // Eğer yüklenmemişse, 5 saniye sonra tekrar kontrol et
          if (!loaded) {
            setTimeout(checkRewardedAd, 5000);
          }
        } catch (error) {
          // Sessizce devam et - butonu aktif et
          setIsRewardedAvailable(true);
        }
      } else {
        // Reklamlar kapalıysa veya premium ise, butonu devre dışı bırak
        setIsRewardedAvailable(false);
      }
    };
    
    // İlk kontrolü 3 saniye sonra yap (AdMob initialize olsun) - Sadece reklamlar açıksa
    const timer = ADS_ENABLED ? setTimeout(checkRewardedAd, 3000) : null;

    // Cleanup
    return () => {
      PurchaseService.cleanup();
      clearTimeout(timer);
    };
  }, [isPremium]);

  const handleUpgrade = async () => {
    if (isLoading) return;

    setIsLoading(true);

    try {
      // Gerçek satın alma işlemi
      const success = await PurchaseService.purchasePlan(selectedPlan);

      if (success?.success) {
        // Satın alma başarılı, kullanıcıyı ana sayfaya yönlendir
        navigation.navigate('Main', { screen: 'Chat' });
      }
    } catch (error) {
      logger.error('Purchase error:', error);
      Alert.alert(t('messages.error'), t('alert.purchase_error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  // Rewarded reklam göster ve ödül ver
  const handleWatchRewardedAd = useCallback(async () => {
    if (isRewardedLoading || isPremium) return;

    // Alert flag'ini sıfırla
    rewardAlertShownRef.current = false;
    setIsRewardedLoading(true);
    try {
      await adService.showRewarded(async (reward) => {
        // Ödül kazanıldı - sadece bir kez işle
        if (rewardAlertShownRef.current) {
          return; // Zaten işlendi, tekrar işleme
        }
        rewardAlertShownRef.current = true;

        try {
          const currentCount = await AsyncStorage.getItem('messagesUsedToday');
          const count = currentCount ? parseInt(currentCount, 10) : 0;
          // 3 mesaj ekle (negatif yaparak limiti artır)
          const newCount = Math.max(0, count - 3);
          await AsyncStorage.setItem('messagesUsedToday', newCount.toString());
          
          // Alert'i sadece bir kez göster - mevcut dilde
          Alert.alert(
            t('premium.reward_earned'),
            t('premium.reward_message'),
            [{ text: t('ui.ok') }]
          );
        } catch (error) {
          if (__DEV__) {
            logger.error('Reward save error:', error);
          }
        }
      });
    } catch (e) {
      console.log('Rewarded gösterilemedi', e);
      // Sessizce devam et - hata mesajı gösterme
    } finally {
      setIsRewardedLoading(false);
    }
  }, [isPremium, isRewardedLoading, t]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={darkTheme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <View style={styles.premiumIcon}>
              <Ionicons name="diamond" size={32} color={darkTheme.colors.premium} />
            </View>
            <Text style={styles.headerTitle}>{t('premium.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('premium.subtitle')}</Text>
          </View>
        </View>

        {/* Value Proposition */}
        <View style={styles.valueProposition}>
          <LinearGradient
            colors={[darkTheme.colors.premium + '20', darkTheme.colors.primary + '20']}
            style={styles.valueCard}
          >
            <View style={styles.valueContent}>
              <Ionicons name="sparkles" size={40} color={darkTheme.colors.premium} />
              <Text style={styles.valueTitle}>{t('premium.value_title')}</Text>
              <Text style={styles.valueDescription}>{t('premium.value_description')}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Comparison Table */}
        <View style={styles.comparisonSection}>
          <Text style={styles.sectionTitle}>{t('premium.comparison_title')}</Text>
          <View style={styles.comparisonTable}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonHeaderText}>{t('premium.feature')}</Text>
              <Text style={styles.comparisonHeaderText}>{t('premium.free')}</Text>
              <Text style={styles.comparisonHeaderText}>{t('premium.premium')}</Text>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonFeature}>{t('premium.unlimited')}</Text>
              <View style={styles.comparisonIconContainer}>
                <Ionicons name="close" size={20} color={darkTheme.colors.primary} />
              </View>
              <View style={styles.comparisonIconContainer}>
                <Ionicons name="checkmark" size={20} color={darkTheme.colors.success} />
              </View>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonFeature}>{t('premium.fast_responses')}</Text>
              <View style={styles.comparisonIconContainer}>
                <Ionicons name="close" size={20} color={darkTheme.colors.primary} />
              </View>
              <View style={styles.comparisonIconContainer}>
                <Ionicons name="checkmark" size={20} color={darkTheme.colors.success} />
              </View>
            </View>

            <View style={styles.comparisonRow}>
              <Text style={styles.comparisonFeature}>{t('premium.mood_analysis')}</Text>
              <View style={styles.comparisonIconContainer}>
                <Ionicons name="close" size={20} color={darkTheme.colors.primary} />
              </View>
              <View style={styles.comparisonIconContainer}>
                <Ionicons name="checkmark" size={20} color={darkTheme.colors.success} />
              </View>
            </View>

            <View style={[styles.comparisonRow, styles.lastComparisonRow]}>
              <Text style={styles.comparisonFeature}>{t('premium.export_history')}</Text>
              <View style={styles.comparisonIconContainer}>
                <Ionicons name="close" size={20} color={darkTheme.colors.primary} />
              </View>
              <View style={styles.comparisonIconContainer}>
                <Ionicons name="checkmark" size={20} color={darkTheme.colors.success} />
              </View>
            </View>
          </View>
        </View>

        {/* Features Grid */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>{t('premium.features_title')}</Text>
          <View style={styles.featuresGrid}>
            {features.map(feature => (
              <View
                key={feature.id}
                style={[styles.featureCard, feature.highlight && styles.highlightedFeatureCard]}
              >
                {feature.highlight && (
                  <View style={styles.popularBadge}>
                    <Ionicons name="star" size={12} color="white" />
                    <Text style={styles.popularBadgeText}>{t('premium.popular')}</Text>
                  </View>
                )}
                <View style={[styles.featureIcon, { backgroundColor: feature.color + '20' }]}>
                  <Ionicons name={feature.icon as any} size={24} color={feature.color} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Testimonials */}
        <View style={styles.testimonialsSection}>
          <Text style={styles.sectionTitle}>{t('premium.testimonials_title')}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.testimonialsScroll}
          >
            {testimonials.map(testimonial => (
              <View key={testimonial.id} style={styles.testimonialCard}>
                <View style={styles.testimonialRating}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Ionicons key={i} name="star" size={16} color={darkTheme.colors.premium} />
                  ))}
                </View>
                <Text style={styles.testimonialText}>"{testimonial.text}"</Text>
                <Text style={styles.testimonialName}>- {testimonial.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Trust Elements */}
        <View style={styles.trustSection}>
          <View style={styles.trustItem}>
            <Ionicons name="lock-closed" size={24} color={darkTheme.colors.primary} />
            <Text style={styles.trustText}>{t('premium.secure_payment')}</Text>
          </View>
          <View style={styles.trustItem}>
            <Ionicons name="refresh" size={24} color={darkTheme.colors.premium} />
            <Text style={styles.trustText}>{t('premium.cancel_anytime')}</Text>
          </View>
        </View>

        {/* Pricing Preview */}
        <View style={styles.pricingPreview}>
          <Text style={styles.pricingTitle}>{t('premium.pricing_title')}</Text>
          <View style={styles.pricingCards}>
            <TouchableOpacity
              style={[styles.pricingCard, selectedPlan === 'monthly' && styles.selectedPricingCard]}
              onPress={() => handlePlanSelect('monthly')}
            >
              <Text style={styles.pricingPlan}>{t('payment.monthly')}</Text>
              <Text style={styles.pricingPrice}>{currency === 'TRY' ? '₺199.99' : '$4.99'}</Text>
              <Text style={styles.pricingPeriod}>{t('payment.monthly_period')}</Text>
              {selectedPlan === 'monthly' && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={darkTheme.colors.primary} />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.pricingCard,
                styles.recommendedCard,
                selectedPlan === 'yearly' && styles.selectedPricingCard,
              ]}
              onPress={() => handlePlanSelect('yearly')}
            >
              <View style={styles.recommendedBadge}>
                <Text style={styles.recommendedText}>{t('premium.recommended')}</Text>
              </View>
              <Text style={styles.pricingPlan}>{t('payment.yearly')}</Text>
              <Text style={styles.pricingPrice}>{currency === 'TRY' ? '₺1499.99' : '$49.99'}</Text>
              <Text style={styles.pricingPeriod}>{t('payment.yearly_period')}</Text>
              <Text style={styles.monthlyEquivalent}>
                {currency === 'TRY' ? '₺125.00/ay' : '$4.17/month'}
              </Text>
              <Text style={styles.savingsText}>
                {currency === 'TRY'
                  ? '₺900 ' + t('payment.savings') + ' (38%)'
                  : '$10 ' + t('payment.savings') + ' (17%)'}
              </Text>
              {selectedPlan === 'yearly' && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={20} color={darkTheme.colors.primary} />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Rewarded Ad Section - Premium olmayanlar için - GEÇİCİ OLARAK KAPATILDI */}
        {!isPremium && ADS_ENABLED && (
          <View style={styles.rewardedAdSection}>
            <View style={styles.rewardedAdCard}>
              <Ionicons name="videocam" size={32} color={darkTheme.colors.primary} />
              <Text style={styles.rewardedAdTitle}>
                {t('premium.watch_video_title')}
              </Text>
              <Text style={styles.rewardedAdDescription}>
                {t('premium.watch_video_desc')}
              </Text>
              <TouchableOpacity
                style={[
                  styles.rewardedAdButton,
                  (!isRewardedAvailable || isRewardedLoading) && styles.rewardedAdButtonDisabled,
                ]}
                onPress={handleWatchRewardedAd}
                disabled={!isRewardedAvailable || isRewardedLoading}
              >
                <Ionicons
                  name={isRewardedLoading ? 'hourglass' : 'play-circle'}
                  size={20}
                  color="white"
                />
                <Text style={styles.rewardedAdButtonText}>
                  {isRewardedLoading
                    ? t('ui.loading')
                    : t('premium.watch_video')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* CTA Button */}
        <View style={styles.ctaSection}>
          {/* Platform-specific EULA Metni - Butonun Hemen Üstünde (ZORUNLU) */}
          <View style={styles.appleEulaSection}>
            <Text style={styles.appleEulaText}>
              {t('premium.eula_agreement_start')}{' '}
              <Text 
                style={styles.appleEulaLink}
                onPress={() => Linking.openURL(
                  Platform.OS === 'ios' 
                    ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
                    : 'https://play.google.com/about/play-terms/'
                )}
              >
                {Platform.OS === 'ios' 
                  ? t('premium.apple_standard_eula')
                  : t('premium.google_play_eula')}
              </Text>
              {' '}{t('premium.and')}{' '}
              <Text 
                style={styles.appleEulaLink}
                onPress={() => Linking.openURL('https://raw.githubusercontent.com/baraniremgunduz/emora-ai-support/main/PRIVACY_POLICY.md')}
              >
                {t('premium.our_privacy_policy')}
              </Text>
              {' '}{t('premium.eula_agreement_end')}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.upgradeButton, isLoading && styles.upgradeButtonDisabled]}
            onPress={handleUpgrade}
            disabled={isLoading}
          >
            <LinearGradient colors={['#6A5ACD', '#8A7FD1']} style={styles.upgradeButtonGradient}>
              {isLoading ? (
                <Ionicons name="hourglass" size={24} color="white" />
              ) : (
                <Ionicons name="diamond" size={24} color="white" />
              )}
              <Text style={styles.upgradeButtonText}>
                {isLoading ? t('ui.processing') : t('premium.upgrade_now')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.ctaSubtext}>{t('premium.cta_subtext')}</Text>
          
          {/* Legal Links - Platform-specific EULA ve Privacy Policy */}
          <View style={styles.legalLinksContainer}>
            <TouchableOpacity
              onPress={() => Linking.openURL(
                Platform.OS === 'ios' 
                  ? 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/'
                  : 'https://play.google.com/about/play-terms/'
              )}
              style={styles.legalLink}
            >
              <Text style={styles.legalLinkText}>
                {Platform.OS === 'ios' 
                  ? t('premium.apple_terms_of_use')
                  : t('premium.google_play_terms_of_use')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.legalSeparator}> • </Text>
            <TouchableOpacity
              onPress={() => Linking.openURL('https://raw.githubusercontent.com/baraniremgunduz/emora-ai-support/main/PRIVACY_POLICY.md')}
              style={styles.legalLink}
            >
              <Text style={styles.legalLinkText}>{t('premium.privacy_policy')}</Text>
            </TouchableOpacity>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 24,
    padding: 8,
    borderRadius: 20,
    backgroundColor: darkTheme.colors.surface,
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  premiumIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: darkTheme.colors.premium + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  headerSubtitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  valueProposition: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  valueCard: {
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: darkTheme.colors.premium + '30',
  },
  valueContent: {
    alignItems: 'center',
  },
  valueTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  valueDescription: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: (width - 60) / 2,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    ...darkTheme.shadows.soft,
    position: 'relative',
  },
  highlightedFeatureCard: {
    borderColor: darkTheme.colors.premium,
    backgroundColor: darkTheme.colors.premium + '10',
    ...darkTheme.shadows.medium,
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: darkTheme.colors.premium,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  comparisonSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  comparisonTable: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    ...darkTheme.shadows.soft,
  },
  comparisonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
    marginBottom: 16,
  },
  comparisonHeaderText: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border + '30',
  },
  comparisonFeature: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontSize: 14,
    flex: 1,
  },
  comparisonIconContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 24,
    width: '100%',
  },
  lastComparisonRow: {
    borderBottomWidth: 0,
  },
  testimonialsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  testimonialsScroll: {
    marginTop: 20,
  },
  testimonialCard: {
    width: width * 0.8,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    padding: 20,
    marginRight: 16,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    ...darkTheme.shadows.soft,
  },
  testimonialRating: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  testimonialText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  testimonialName: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  trustSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  trustItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  trustText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  ctaSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  upgradeButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    ...darkTheme.shadows.medium,
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  upgradeButtonText: {
    ...darkTheme.typography.subtitle,
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  ctaSubtext: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  // Rewarded Ad Section
  rewardedAdSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  rewardedAdCard: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    ...darkTheme.shadows.soft,
  },
  rewardedAdTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  rewardedAdDescription: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  rewardedAdButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: darkTheme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
    minWidth: 200,
  },
  rewardedAdButtonDisabled: {
    opacity: 0.5,
  },
  rewardedAdButtonText: {
    ...darkTheme.typography.body,
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Pricing Preview
  pricingPreview: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  pricingTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  pricingCards: {
    flexDirection: 'row',
    gap: 16,
  },
  pricingCard: {
    flex: 1,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    ...darkTheme.shadows.soft,
    position: 'relative',
  },
  recommendedCard: {
    borderColor: darkTheme.colors.premium,
    backgroundColor: darkTheme.colors.premium + '10',
    ...darkTheme.shadows.medium,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    backgroundColor: darkTheme.colors.premium,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  recommendedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  pricingPlan: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  pricingPrice: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  pricingPeriod: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 12,
    marginBottom: 8,
  },
  monthlyEquivalent: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  savingsText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.success,
    fontSize: 12,
    fontWeight: '600',
  },

  // Selected pricing card
  selectedPricingCard: {
    borderColor: darkTheme.colors.primary,
    borderWidth: 2,
    backgroundColor: darkTheme.colors.primary + '10',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },

  // Loading states
  upgradeButtonDisabled: {
    opacity: 0.7,
  },
  
  // Legal Links
  legalLinksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    flexWrap: 'wrap',
  },
  legalLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  legalLinkText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.primary,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 12,
    marginHorizontal: 4,
  },
  
  // Apple EULA Section - Butonun Hemen Üstünde
  appleEulaSection: {
    width: '100%',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  appleEulaText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
  },
  appleEulaLink: {
    color: darkTheme.colors.primary,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
