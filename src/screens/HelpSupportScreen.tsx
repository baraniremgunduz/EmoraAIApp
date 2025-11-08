// Yardım ve Destek Ekranı
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../utils/theme';
import { useLanguage } from '../contexts/LanguageContext';
import GlassCard from '../components/GlassCard';
import GlassButton from '../components/GlassButton';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export default function HelpSupportScreen({ navigation }: any) {
  const { t } = useLanguage();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const faqData: FAQItem[] = [
    {
      id: '1',
      question: 'Emora AI nasıl çalışır?',
      answer: 'Emora AI, yapay zeka teknolojisi kullanarak sizinle doğal bir şekilde sohbet eder. Duygularınızı anlar ve size destek olur.',
    },
    {
      id: '2',
      question: 'Verilerim güvenli mi?',
      answer: 'Evet, tüm verileriniz şifrelenir ve güvenli sunucularda saklanır. Gizliliğiniz bizim için çok önemli.',
    },
    {
      id: '3',
      question: 'Premium üyelik nedir?',
      answer: 'Premium üyelik ile sınırsız sohbet, özel özellikler ve öncelikli destek alabilirsiniz.',
    },
    {
      id: '4',
      question: 'Nasıl şifre değiştirebilirim?',
      answer: 'Profil > Hesap Bilgileri > Şifre Değiştir bölümünden şifrenizi güncelleyebilirsiniz.',
    },
    {
      id: '5',
      question: 'Uygulama çöküyor, ne yapmalıyım?',
      answer: 'Uygulamayı kapatıp yeniden açmayı deneyin. Sorun devam ederse destek ekibimizle iletişime geçin.',
    },
  ];

  const handleContactSupport = () => {
    Alert.alert(
      'Destek İletişim',
      'E-posta ile destek talebinizi gönderebilirsiniz.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'E-posta Gönder', 
          onPress: () => {
            Linking.openURL('mailto:emoraaiapp@gmail.com?subject=Destek Talebi');
          }
        }
      ]
    );
  };

  const handleRateApp = () => {
    Alert.alert(
      'Uygulamayı Değerlendir',
      'Emora AI\'yı nasıl buluyorsunuz?',
      [
        { text: 'İptal', style: 'cancel' },
        { text: '⭐ Çok İyi', onPress: () => Alert.alert('Teşekkürler!', 'Görüşünüz bizim için değerli.') },
        { text: '👍 İyi', onPress: () => Alert.alert('Teşekkürler!', 'Görüşünüz bizim için değerli.') },
        { text: '👎 Geliştirilebilir', onPress: () => Alert.alert('Teşekkürler!', 'Görüşlerinizi dikkate alacağız.') },
      ]
    );
  };

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const renderFAQ = (item: FAQItem) => (
    <TouchableOpacity key={item.id} onPress={() => toggleFAQ(item.id)}>
      <View style={styles.faqCard}>
        <View style={styles.faqContent}>
          <View style={styles.faqHeader}>
            <View style={styles.faqIcon}>
              <Ionicons 
                name={expandedFAQ === item.id ? 'help-circle' : 'help-circle-outline'} 
                size={20} 
                color={darkTheme.colors.primary} 
              />
            </View>
            <Text style={styles.faqQuestion}>{item.question}</Text>
            <Ionicons 
              name={expandedFAQ === item.id ? 'chevron-up' : 'chevron-down'} 
              size={20} 
              color={darkTheme.colors.primary} 
            />
          </View>
          {expandedFAQ === item.id && (
            <View style={styles.faqAnswerContainer}>
              <Text style={styles.faqAnswer}>{item.answer}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

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
            <Text style={styles.headerTitle}>{t('help.title')}</Text>
            <Text style={styles.headerSubtitle}>Size nasıl yardımcı olabiliriz?</Text>
          </View>
          <View style={styles.placeholder} />
        </View>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroIcon}>
            <Ionicons name="help-circle" size={48} color={darkTheme.colors.primary} />
          </View>
          <Text style={styles.heroTitle}>Merhaba! 👋</Text>
          <Text style={styles.heroSubtitle}>
            Emora AI ile ilgili sorularınız mı var? Hemen çözelim!
          </Text>
        </View>

        {/* Quick Actions - Modern Grid */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Hızlı İşlemler</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity style={styles.quickActionCard} onPress={handleContactSupport}>
              <View style={[styles.quickActionIcon, { backgroundColor: darkTheme.colors.primary + '20' }]}>
                <Ionicons name="chatbubbles" size={24} color={darkTheme.colors.primary} />
              </View>
              <Text style={styles.quickActionTitle}>{t('help.contact')}</Text>
              <Text style={styles.quickActionSubtitle}>7/24 destek</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionCard} onPress={handleRateApp}>
              <View style={[styles.quickActionIcon, { backgroundColor: darkTheme.colors.success + '20' }]}>
                <Ionicons name="star" size={24} color={darkTheme.colors.success} />
              </View>
              <Text style={styles.quickActionTitle}>Uygulamayı Değerlendir</Text>
              <Text style={styles.quickActionSubtitle}>Görüşünüz önemli</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FAQ Section - Modern Accordion */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Sık Sorulan Sorular</Text>
            <Text style={styles.sectionSubtitle}>En çok merak edilen konular</Text>
          </View>
          {faqData.map(renderFAQ)}
        </View>

        {/* Contact Info - Modern Cards */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>İletişim Bilgileri</Text>
          
          <View style={styles.contactCards}>
            <TouchableOpacity 
              style={styles.contactCard}
              onPress={() => Linking.openURL('mailto:emoraaiapp@gmail.com?subject=Destek Talebi')}
            >
              <View style={[styles.contactIcon, { backgroundColor: darkTheme.colors.primary + '20' }]}>
                <Ionicons name="mail" size={20} color={darkTheme.colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>E-posta Desteği</Text>
                <Text style={styles.contactValue}>emoraaiapp@gmail.com</Text>
                <Text style={styles.contactHint}>24 saat içinde yanıt</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={darkTheme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info - Modern Footer */}
        <View style={styles.appInfo}>
          <View style={styles.appInfoCard}>
            <View style={styles.appInfoIcon}>
              <Ionicons name="sparkles" size={24} color={darkTheme.colors.primary} />
            </View>
            <View style={styles.appInfoContent}>
              <Text style={styles.appInfoTitle}>Emora AI v1.0.0</Text>
              <Text style={styles.appInfoSubtitle}>AI Arkadaşınla Sohbet Et</Text>
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
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: darkTheme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...darkTheme.shadows.medium,
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

  // Quick Actions
  quickActionsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 16,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    ...darkTheme.shadows.medium,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  quickActionSubtitle: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },

  // Sections
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    marginBottom: 20,
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

  // FAQ
  faqCard: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    marginBottom: 8,
    ...darkTheme.shadows.small,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  faqContent: {
    padding: 16,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqIcon: {
    marginRight: 12,
  },
  faqQuestion: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '500',
    flex: 1,
    marginRight: 12,
  },
  faqAnswerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.border,
  },
  faqAnswer: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    lineHeight: 20,
  },

  // Contact Section
  contactSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  contactCards: {
    marginTop: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    ...darkTheme.shadows.small,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    marginBottom: 2,
    fontWeight: '500',
  },
  contactValue: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
  },
  contactHint: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },

  // App Info
  appInfo: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  appInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    padding: 20,
    ...darkTheme.shadows.medium,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  appInfoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: darkTheme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  appInfoContent: {
    flex: 1,
  },
  appInfoTitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontWeight: '600',
    marginBottom: 2,
  },
  appInfoSubtitle: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
  },
});
