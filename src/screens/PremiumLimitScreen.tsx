// Premium Limit Ekranı - Free kullanıcılar için
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Button, Card } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../utils/theme';
import { useLanguage } from '../contexts/LanguageContext';

interface PremiumLimitScreenProps {
  visible: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  messagesUsed: number;
  messagesLimit: number;
}

export default function PremiumLimitScreen({
  visible,
  onClose,
  onUpgrade,
  messagesUsed,
  messagesLimit,
}: PremiumLimitScreenProps) {
  const { t } = useLanguage();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <LinearGradient
            colors={[darkTheme.colors.gradientStart, darkTheme.colors.gradientEnd]}
            style={styles.gradient}
          >
            <Card style={styles.card}>
              <Card.Content style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="star" size={40} color={darkTheme.colors.premium} />
                  </View>
                  <Text style={styles.title}>{t('premium.upgrade')}</Text>
                  <Text style={styles.subtitle}>
                    Bugünlük konuşma hakkını doldurdun
                  </Text>
                </View>

                {/* Progress */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { width: `${(messagesUsed / messagesLimit) * 100}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {messagesUsed}/{messagesLimit} mesaj kullandın
                  </Text>
                </View>

                {/* Benefits */}
                <View style={styles.benefitsContainer}>
                  <Text style={styles.benefitsTitle}>Premium ile neler kazanırsın:</Text>
                  
                  <View style={styles.benefitItem}>
                    <Ionicons name="infinite" size={20} color={darkTheme.colors.primary} />
                    <Text style={styles.benefitText}>{t('premium.unlimited')}</Text>
                  </View>
                  
                  <View style={styles.benefitItem}>
                    <Ionicons name="flash" size={20} color={darkTheme.colors.primary} />
                    <Text style={styles.benefitText}>Hızlı yanıt süresi</Text>
                  </View>
                  
                  <View style={styles.benefitItem}>
                    <Ionicons name="heart" size={20} color={darkTheme.colors.primary} />
                    <Text style={styles.benefitText}>Özel AI kişilikleri</Text>
                  </View>
                  
                  <View style={styles.benefitItem}>
                    <Ionicons name="download" size={20} color={darkTheme.colors.primary} />
                    <Text style={styles.benefitText}>Sohbet geçmişi dışa aktarma</Text>
                  </View>
                </View>

                {/* Price */}
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>₺89/ay</Text>
                  <Text style={styles.priceSubtext}>İlk ay ücretsiz</Text>
                </View>

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                  <TouchableOpacity onPress={onUpgrade} style={styles.upgradeButton}>
                    <LinearGradient
                      colors={['#6A5ACD', '#8A7FD1']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.upgradeButtonGradient}
                    >
                      <Ionicons name="star" size={20} color="white" style={styles.upgradeButtonIcon} />
                      <Text style={styles.upgradeButtonLabel}>{t('premium.upgrade')}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>Daha sonra</Text>
                  </TouchableOpacity>
                </View>
              </Card.Content>
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
  },
  content: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  progressContainer: {
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    backgroundColor: darkTheme.colors.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 4,
  },
  progressText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  benefitsContainer: {
    marginBottom: 24,
  },
  benefitsTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    marginBottom: 16,
    textAlign: 'center',
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
});
