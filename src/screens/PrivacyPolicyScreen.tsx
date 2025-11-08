import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../utils/theme';
import { useLanguage } from '../contexts/LanguageContext';

export default function PrivacyPolicyScreen({ navigation }: any) {
  const { t } = useLanguage();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={darkTheme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('privacy.title')}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Privacy Policy Content */}
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>{t('privacy.introduction')}</Text>
          <Text style={styles.contentText}>
            {t('privacy.introduction_text')}
          </Text>

          <Text style={styles.sectionTitle}>{t('privacy.data_collection')}</Text>
          <Text style={styles.contentText}>
            {t('privacy.data_collection_text')}
          </Text>

          <Text style={styles.sectionTitle}>{t('privacy.data_usage')}</Text>
          <Text style={styles.contentText}>
            {t('privacy.data_usage_text')}
          </Text>

          <Text style={styles.sectionTitle}>{t('privacy.data_sharing')}</Text>
          <Text style={styles.contentText}>
            {t('privacy.data_sharing_text')}
          </Text>

          <Text style={styles.sectionTitle}>{t('privacy.data_security')}</Text>
          <Text style={styles.contentText}>
            {t('privacy.data_security_text')}
          </Text>

          <Text style={styles.sectionTitle}>{t('privacy.user_rights')}</Text>
          <Text style={styles.contentText}>
            {t('privacy.user_rights_text')}
          </Text>

          <Text style={styles.sectionTitle}>{t('privacy.contact')}</Text>
          <Text style={styles.contentText}>
            {t('privacy.contact_text')}
          </Text>

          <Text style={styles.sectionTitle}>{t('privacy.changes')}</Text>
          <Text style={styles.contentText}>
            {t('privacy.changes_text')}
          </Text>

          <View style={styles.lastUpdated}>
            <Text style={styles.lastUpdatedText}>
              {t('privacy.last_updated')}: {new Date().toLocaleDateString()}
            </Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  sectionTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  contentText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  lastUpdated: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.border,
  },
  lastUpdatedText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
});
