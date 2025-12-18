// Premium Limit Ekranı - Free kullanıcılar için
import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Modal, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../utils/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { adService } from '../services/adService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

interface PremiumLimitScreenProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  messagesUsed: number;
  messagesLimit: number;
  onMessageCountUpdate?: () => void; // Mesaj sayacı güncellendiğinde çağrılacak callback
}

export default function PremiumLimitScreen({
  visible,
  onClose,
  onUpgrade,
  messagesUsed,
  messagesLimit,
  onMessageCountUpdate,
}: PremiumLimitScreenProps) {
  const { t } = useLanguage();
  const [isRewardedLoading, setIsRewardedLoading] = useState(false);
  const rewardAlertShownRef = useRef(false);

  const handleWatchRewardedAd = async () => {
    if (isRewardedLoading) return;

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
          
          // Mesaj sayacını güncellemek için callback çağır
          if (onMessageCountUpdate) {
            onMessageCountUpdate();
          }
          
          // Alert'i sadece bir kez göster - mevcut dilde
          Alert.alert(
            t('premium.reward_earned'),
            t('premium.reward_message'),
            [{ text: t('ui.ok'), onPress: () => {
              // Mesaj sayacı güncellendi, modal'ı kapat
              onClose();
            }}]
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
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={[darkTheme.colors.gradientStart || darkTheme.colors.primary, darkTheme.colors.gradientEnd || darkTheme.colors.secondary]}
            style={styles.gradient}
          >
            <Card style={styles.card}>
              <View style={styles.content}>
                {/* Scrollable Content */}
                <ScrollView 
                  style={styles.scrollView}
                  contentContainerStyle={styles.scrollContent}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  bounces={true}
                >
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.iconContainer}>
                      <Ionicons name="star" size={50} color={darkTheme.colors.premium} />
                  </View>
                  <Text style={styles.title}>{t('premium.upgrade')}</Text>
                  <Text style={styles.subtitle}>{t('premium.daily_limit_filled')}</Text>
                </View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${(messagesUsed / messagesLimit) * 100}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {t('premium.messages_used').replace('{used}', messagesUsed.toString()).replace('{limit}', messagesLimit.toString())}
                  </Text>
                </View>

                {/* Benefits */}
                <View style={styles.benefitsContainer}>
                  <Text style={styles.benefitsTitle}>{t('premium.benefits_title')}</Text>

                  <View style={styles.benefitItem}>
                    <Ionicons name="infinite" size={20} color={darkTheme.colors.primary} />
                    <Text style={styles.benefitText}>{t('premium.unlimited')}</Text>
                  </View>

                  <View style={styles.benefitItem}>
                    <Ionicons name="flash" size={20} color={darkTheme.colors.primary} />
                    <Text style={styles.benefitText}>{t('premium.fast_response_time')}</Text>
                  </View>

                  <View style={styles.benefitItem}>
                    <Ionicons name="heart" size={20} color={darkTheme.colors.primary} />
                    <Text style={styles.benefitText}>{t('premium.exclusive_ai')}</Text>
                  </View>

                  <View style={styles.benefitItem}>
                    <Ionicons name="download" size={20} color={darkTheme.colors.primary} />
                    <Text style={styles.benefitText}>{t('premium.export_history')}</Text>
                  </View>
                </View>
                </ScrollView>

                {/* Buttons - ScrollView dışında, her zaman görünür */}
                <View style={styles.buttonContainer}>
                  {/* Premium'a Geç Butonu */}
                  <TouchableOpacity onPress={onUpgrade} style={styles.upgradeButton}>
                    <LinearGradient
                      colors={['#6A5ACD', '#8A7FD1']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.upgradeButtonGradient}
                    >
                      <Ionicons
                        name="star"
                        size={20}
                        color="white"
                        style={styles.upgradeButtonIcon}
                      />
                      <Text style={styles.upgradeButtonLabel}>{t('premium.upgrade')}</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Video İzle Butonu */}
                  <TouchableOpacity
                    onPress={handleWatchRewardedAd}
                    style={[
                      styles.watchAdButton,
                      isRewardedLoading && styles.watchAdButtonDisabled,
                    ]}
                    disabled={isRewardedLoading}
                  >
                    <LinearGradient
                      colors={['#8A6FE2', '#7E63D0']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.watchAdButtonGradient}
                    >
                      {isRewardedLoading ? (
                        <ActivityIndicator size="small" color="white" />
                      ) : (
                        <Ionicons
                          name="play-circle"
                          size={20}
                          color="white"
                          style={styles.watchAdButtonIcon}
                        />
                      )}
                      <Text style={styles.watchAdButtonLabel}>
                        {isRewardedLoading ? t('ui.loading') : t('premium.watch_video')}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {/* Daha sonra Butonu */}
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>{t('ui.later')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Card>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  gradient: {
    borderRadius: darkTheme.borderRadius.xl,
    padding: 2,
  },
  card: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: darkTheme.borderRadius.xl,
    ...darkTheme.shadows.strong,
    minHeight: 500,
  },
  content: {
    padding: 24,
    flexDirection: 'column',
  },
  scrollView: {
    maxHeight: 480,
    marginBottom: 0,
  },
  scrollContent: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 26,
    fontWeight: 'bold',
  },
  subtitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 10,
    backgroundColor: darkTheme.colors.border,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 5,
  },
  progressText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
  },
  benefitsContainer: {
    marginBottom: 8,
  },
  benefitsTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    marginBottom: 18,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    marginLeft: 12,
    fontSize: 15,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  price: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.premium,
    fontWeight: 'bold',
  },
  priceSubtext: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    marginTop: 4,
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
    width: '100%',
    flexShrink: 0, // Butonlar kesinlikle görünür, küçülmez
    paddingTop: 0,
    paddingBottom: 8,
  },
  upgradeButton: {
    borderRadius: darkTheme.borderRadius.lg,
    overflow: 'hidden',
    // Gradient efekti için
    shadowColor: darkTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    // Zorla mor renk
    backgroundColor: 'transparent',
    width: '100%',
  },
  upgradeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  upgradeButtonIcon: {
    marginRight: 8,
  },
  upgradeButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeButtonText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
  },
  watchAdButton: {
    borderRadius: darkTheme.borderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#8A6FE2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    backgroundColor: 'transparent',
    width: '100%',
  },
  watchAdButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  watchAdButtonIcon: {
    marginRight: 8,
  },
  watchAdButtonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  watchAdButtonDisabled: {
    opacity: 0.6,
  },
});
