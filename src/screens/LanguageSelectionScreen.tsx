// Dil seçimi ekranı - Onboarding'den önce gelir
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../utils/theme';
import { useLanguage } from '../contexts/LanguageContext';
import GlassButton from '../components/GlassButton';
import GlassCard from '../components/GlassCard';

const { width, height } = Dimensions.get('window');

interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

interface LanguageSelectionScreenProps {
  navigation: any;
  onLanguageSelected?: (language: string) => void;
}

export default function LanguageSelectionScreen({ navigation, onLanguageSelected }: LanguageSelectionScreenProps) {
  const { setLanguage, t } = useLanguage();
  const [selectedLanguage, setSelectedLanguage] = useState('en'); // Varsayılan İngilizce

  const languages: LanguageOption[] = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', flag: '🇹🇷' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
    { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
    { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪' },
    { code: 'no', name: 'Norwegian', nativeName: 'Norsk', flag: '🇳🇴' },
    { code: 'fi', name: 'Finnish', nativeName: 'Suomi', flag: '🇫🇮' },
    { code: 'da', name: 'Danish', nativeName: 'Dansk', flag: '🇩🇰' },
  ];

  const handleLanguageSelect = async (languageCode: string) => {
    setSelectedLanguage(languageCode);
    // Seçilen dili context'e kaydet ki t() fonksiyonu o dili kullansın
    await setLanguage(languageCode as any);
  };

  const handleContinue = async () => {
    try {
      // Seçilen dili kaydet
      await setLanguage(selectedLanguage as any);
      
      // Onboarding'e geç
      if (onLanguageSelected) {
        onLanguageSelected(selectedLanguage);
      } else {
        navigation.navigate('Onboarding');
      }
    } catch (error) {
      console.error('Dil seçimi hatası:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t('language_selection.title')}</Text>
          <Text style={styles.description}>
            {t('language_selection.description')}
          </Text>
        </View>

        {/* Language Options */}
        <View style={styles.languageContainer}>
          {languages.map((language) => (
            <TouchableOpacity
              key={language.code}
              style={[
                styles.languageOption,
                selectedLanguage === language.code && styles.selectedLanguageOption
              ]}
              onPress={() => handleLanguageSelect(language.code)}
            >
              <GlassCard style={[
                styles.languageCard,
                selectedLanguage === language.code && styles.selectedLanguageCard
              ]}>
                <View style={styles.languageContent}>
                  <Text style={styles.flag}>{language.flag}</Text>
                  <View style={styles.languageText}>
                    <Text style={[
                      styles.languageName,
                      selectedLanguage === language.code && styles.selectedLanguageName
                    ]}>
                      {language.nativeName}
                    </Text>
                    <Text style={[
                      styles.languageEnglish,
                      selectedLanguage === language.code && styles.selectedLanguageEnglish
                    ]}>
                      {language.name}
                    </Text>
                  </View>
                  {selectedLanguage === language.code && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={24} 
                      color={darkTheme.colors.primary} 
                    />
                  )}
                </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue Button */}
        <View style={styles.buttonContainer}>
          <GlassButton
            title={t('language_selection.continue')}
            onPress={handleContinue}
            style={styles.continueButton}
            textStyle={styles.continueButtonText}
          />
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: darkTheme.colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  languageContainer: {
    flex: 1,
    marginBottom: 30,
  },
  languageOption: {
    marginBottom: 12,
  },
  selectedLanguageOption: {
    transform: [{ scale: 1.02 }],
  },
  selectedLanguageCard: {
    borderWidth: 2,
    borderColor: darkTheme.colors.primary,
    backgroundColor: darkTheme.colors.card + '20', // Hafif şeffaf arka plan
  },
  languageCard: {
    padding: 0,
    overflow: 'hidden',
  },
  languageContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  flag: {
    fontSize: 28,
    marginRight: 16,
  },
  languageText: {
    flex: 1,
  },
  languageName: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.colors.text,
    marginBottom: 2,
  },
  languageEnglish: {
    fontSize: 14,
    color: darkTheme.colors.textSecondary,
  },
  selectedLanguageName: {
    color: darkTheme.colors.text, // Mor yerine siyah
    fontWeight: 'bold', // Kalın yazı
  },
  selectedLanguageEnglish: {
    color: darkTheme.colors.textSecondary, // Mor yerine gri
    fontWeight: '600', // Kalın yazı
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  continueButton: {
    backgroundColor: darkTheme.colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: darkTheme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButtonText: {
    color: darkTheme.colors.background,
    fontSize: 18,
    fontWeight: 'bold',
  },
});
