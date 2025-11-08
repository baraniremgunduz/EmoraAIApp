// Onboarding ekranı - Emora AI'yı tanıtır
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../utils/theme';
import { useLanguage } from '../contexts/LanguageContext';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';

const { width, height } = Dimensions.get('window');

interface OnboardingSlide {
  id: number;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  features: string[];
  accentColor: string;
}

// Onboarding verilerini component içinde tanımlayacağız çünkü t() fonksiyonuna ihtiyacımız var

interface OnboardingScreenProps {
  navigation: any;
  onComplete?: () => void;
}

export default function OnboardingScreen({ navigation, onComplete }: OnboardingScreenProps) {
  const { t } = useLanguage();
  const [currentSlide, setCurrentSlide] = useState(0);

  const onboardingData: OnboardingSlide[] = [
    {
      id: 1,
      title: t('onboarding.slide1_title'),
      description: t('onboarding.slide1_desc'),
      icon: 'chatbubbles-outline',
      features: [t('onboarding.slide1_feature1'), t('onboarding.slide1_feature2'), t('onboarding.slide1_feature3')],
      accentColor: darkTheme.colors.primary,
    },
    {
      id: 2,
      title: t('onboarding.slide2_title'),
      description: t('onboarding.slide2_desc'),
      icon: 'shield-checkmark-outline',
      features: [t('onboarding.slide2_feature1'), t('onboarding.slide2_feature2'), t('onboarding.slide2_feature3')],
      accentColor: darkTheme.colors.success,
    },
    {
      id: 3,
      title: t('onboarding.slide3_title'),
      description: t('onboarding.slide3_desc'),
      icon: 'heart-outline',
      features: [t('onboarding.slide3_feature1'), t('onboarding.slide3_feature2'), t('onboarding.slide3_feature3')],
      accentColor: darkTheme.colors.premium,
    },
  ];

  const nextSlide = () => {
    if (currentSlide < onboardingData.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      // Onboarding tamamlandı
      if (onComplete) {
        onComplete();
      }
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const skipOnboarding = () => {
    // Skip edilirse onboarding'i tamamla
    if (onComplete) {
      onComplete();
    }
  };


  const currentData = onboardingData[currentSlide];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {currentSlide > 0 ? (
          <TouchableOpacity style={styles.backButton} onPress={prevSlide}>
            <Ionicons name="arrow-back" size={20} color={darkTheme.colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
        <Text style={styles.headerTitle}>{t('app.name')}</Text>
        <TouchableOpacity style={styles.skipButton} onPress={skipOnboarding}>
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Icon Container */}
        <View style={[styles.iconContainer, { backgroundColor: currentData.accentColor + '20' }]}>
          <Ionicons 
            name={currentData.icon} 
            size={64} 
            color={currentData.accentColor} 
          />
        </View>

        {/* Title */}
        <Text style={styles.title}>{currentData.title}</Text>

        {/* Description */}
        <Text style={styles.description}>{currentData.description}</Text>

        {/* Features */}
        <GlassCard variant="subtle" style={styles.featuresCard}>
          <View style={styles.featuresContainer}>
            {currentData.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons 
                  name="checkmark-circle" 
                  size={16} 
                  color={currentData.accentColor} 
                />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </GlassCard>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Dots Indicator */}
        <View style={styles.dotsContainer}>
          {onboardingData.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentSlide && [styles.activeDot, { backgroundColor: currentData.accentColor }],
              ]}
            />
          ))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <GlassButton
            title={currentSlide === onboardingData.length - 1 ? t('onboarding.start') : t('onboarding.next')}
            onPress={nextSlide}
            variant="primary"
            style={styles.singleButton}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  headerTitle: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    padding: 8,
    backgroundColor: darkTheme.colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  skipButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: darkTheme.colors.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  skipText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featuresCard: {
    width: '100%',
    marginTop: 16,
  },
  featuresContainer: {
    padding: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    marginLeft: 12,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: darkTheme.colors.border,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
  },
  buttonContainer: {
    width: '100%',
  },
  singleButton: {
    width: '100%',
  },
});
