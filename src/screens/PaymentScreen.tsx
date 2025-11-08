// Ödeme ekranı
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { darkTheme } from '../utils/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { PurchaseService } from '../services/purchaseService';

const { width } = Dimensions.get('window');

interface PaymentScreenProps {
  navigation: any;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  period: string;
  savings?: string;
  popular?: boolean;
  features: string[];
  trialDays?: number;
}

export default function PaymentScreen({ navigation }: PaymentScreenProps) {
  const { t, currency } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState('yearly');
  const [isLoading, setIsLoading] = useState(false);

  const plans: Plan[] = [
    {
      id: 'monthly',
      name: t('payment.monthly'),
      price: currency === 'TRY' ? '₺129.99' : '$4.99',
      period: t('payment.monthly_period'),
      features: [
        t('payment.feature_unlimited'),
        t('payment.feature_fast'),
        t('payment.feature_ai'),
        t('payment.feature_export'),
      ],
    },
    {
      id: 'yearly',
      name: t('payment.yearly'),
      price: currency === 'TRY' ? '₺699.99' : '$49.99',
      originalPrice: currency === 'TRY' ? '₺1,559.88' : '$59.88',
      period: t('payment.yearly_period'),
      savings: currency === 'TRY' ? '₺860 ' + t('payment.savings') + ' (55%)' : '$10 ' + t('payment.savings') + ' (17%)',
      popular: true,
      features: [
        t('payment.feature_unlimited'),
        t('payment.feature_fast'),
        t('payment.feature_ai'),
        t('payment.feature_export'),
        t('payment.feature_mood'),
        t('payment.feature_support'),
      ],
      trialDays: 7,
    },
    {
      id: 'lifetime',
      name: t('payment.lifetime'),
      price: t('payment.lifetime_price'),
      period: t('payment.lifetime_period'),
      features: [
        t('payment.feature_unlimited'),
        t('payment.feature_fast'),
        t('payment.feature_ai'),
        t('payment.feature_export'),
        t('payment.feature_mood'),
        t('payment.feature_support'),
        t('payment.feature_updates'),
      ],
    },
  ];

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
  };

  // IAP başlatma
  useEffect(() => {
    const initializePurchase = async () => {
      try {
        await PurchaseService.initialize();
      } catch (error) {
        console.error('Purchase service initialization error:', error);
      }
    };

    initializePurchase();

    // Cleanup
    return () => {
      PurchaseService.cleanup();
    };
  }, []);

  const handlePurchase = async () => {
    if (isLoading) return;

    const selectedPlanData = plans.find(plan => plan.id === selectedPlan);
    
    Alert.alert(
      t('payment.confirm_title'),
      t('payment.confirm_message', { plan: selectedPlanData?.name, price: selectedPlanData?.price }),
      [
        {
          text: t('messages.cancel'),
          style: 'cancel',
        },
        {
          text: t('payment.confirm_purchase'),
          onPress: async () => {
            setIsLoading(true);
            
            try {
              // Gerçek satın alma işlemi
              const success = await PurchaseService.purchasePlan(selectedPlan);
              
              if (success) {
                // Satın alma başarılı, kullanıcıyı ana sayfaya yönlendir
                navigation.navigate('Chat');
              }
            } catch (error) {
              console.error('Purchase error:', error);
              Alert.alert(
                t('messages.error'),
                t('alert.purchase_error')
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const renderPlanCard = (plan: Plan) => {
    const isSelected = selectedPlan === plan.id;
    
    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlanCard,
          plan.popular && styles.popularPlanCard,
        ]}
        onPress={() => handlePlanSelect(plan.id)}
      >
        {plan.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularBadgeText}>{t('payment.most_popular')}</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <Text style={styles.planName}>{plan.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.planPrice}>{plan.price}</Text>
            {plan.originalPrice && (
              <Text style={styles.originalPrice}>{plan.originalPrice}</Text>
            )}
          </View>
          <Text style={styles.planPeriod}>{plan.period}</Text>
          {plan.id === 'yearly' && (
            <Text style={styles.monthlyEquivalent}>{t('payment.yearly_monthly')}</Text>
          )}
          {plan.savings && (
            <Text style={styles.savingsText}>{plan.savings}</Text>
          )}
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Ionicons name="checkmark-circle" size={20} color={darkTheme.colors.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {plan.trialDays && (
          <View style={styles.trialContainer}>
            <Ionicons name="gift" size={16} color={darkTheme.colors.premium} />
            <Text style={styles.trialText}>
              {t('payment.trial_offer', { days: plan.trialDays })}
            </Text>
          </View>
        )}

        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Ionicons name="checkmark-circle" size={24} color={darkTheme.colors.primary} />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={darkTheme.colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{t('payment.title')}</Text>
            <Text style={styles.headerSubtitle}>{t('payment.subtitle')}</Text>
          </View>
        </View>

        {/* Plans */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>{t('payment.choose_plan')}</Text>
          <View style={styles.plansContainer}>
            {plans.map(renderPlanCard)}
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethodsSection}>
          <Text style={styles.sectionTitle}>{t('payment.payment_methods')}</Text>
          <View style={styles.paymentMethodsContainer}>
            <View style={styles.paymentMethod}>
              <Ionicons name="card" size={24} color={darkTheme.colors.primary} />
              <Text style={styles.paymentMethodText}>{t('payment.credit_card')}</Text>
            </View>
            <View style={styles.paymentMethod}>
              <Ionicons name="phone-portrait" size={24} color={darkTheme.colors.success} />
              <Text style={styles.paymentMethodText}>{t('payment.mobile_payment')}</Text>
            </View>
            <View style={styles.paymentMethod}>
              <Ionicons name="wallet" size={24} color={darkTheme.colors.premium} />
              <Text style={styles.paymentMethodText}>{t('payment.digital_wallet')}</Text>
            </View>
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termsTitle}>{t('payment.terms_title')}</Text>
          <Text style={styles.termsText}>{t('payment.terms_text')}</Text>
          <TouchableOpacity style={styles.termsLink}>
            <Text style={styles.termsLinkText}>{t('payment.terms_link')}</Text>
          </TouchableOpacity>
        </View>

        {/* Security Badges */}
        <View style={styles.securitySection}>
          <View style={styles.securityItem}>
            <Ionicons name="shield-checkmark" size={20} color={darkTheme.colors.success} />
            <Text style={styles.securityText}>{t('payment.secure_payment')}</Text>
          </View>
          <View style={styles.securityItem}>
            <Ionicons name="lock-closed" size={20} color={darkTheme.colors.primary} />
            <Text style={styles.securityText}>{t('payment.encrypted')}</Text>
          </View>
          <View style={styles.securityItem}>
            <Ionicons name="refresh" size={20} color={darkTheme.colors.premium} />
            <Text style={styles.securityText}>{t('payment.cancel_anytime')}</Text>
          </View>
        </View>

        {/* Purchase Button */}
        <View style={styles.purchaseSection}>
          <TouchableOpacity 
            style={[styles.purchaseButton, isLoading && styles.purchaseButtonDisabled]} 
            onPress={handlePurchase}
            disabled={isLoading}
          >
            <LinearGradient
              colors={[darkTheme.colors.premium, darkTheme.colors.primary]}
              style={styles.purchaseButtonGradient}
            >
              {isLoading ? (
                <Ionicons name="hourglass" size={24} color="white" />
              ) : (
                <Ionicons name="diamond" size={24} color="white" />
              )}
              <Text style={styles.purchaseButtonText}>
                {isLoading ? 'İşleniyor...' : t('payment.purchase_button')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
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
  plansSection: {
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
  plansContainer: {
    gap: 16,
  },
  planCard: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: darkTheme.colors.border,
    position: 'relative',
    ...darkTheme.shadows.soft,
  },
  selectedPlanCard: {
    borderColor: darkTheme.colors.primary,
    backgroundColor: darkTheme.colors.primary + '10',
  },
  popularPlanCard: {
    borderColor: darkTheme.colors.premium,
    backgroundColor: darkTheme.colors.premium + '10',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    left: 20,
    right: 20,
    backgroundColor: darkTheme.colors.premium,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  popularBadgeText: {
    ...darkTheme.typography.caption,
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planName: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 4,
  },
  planPrice: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    fontSize: 32,
    fontWeight: '700',
  },
  originalPrice: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    fontSize: 16,
    textDecorationLine: 'line-through',
    marginLeft: 8,
  },
  planPeriod: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 14,
  },
  monthlyEquivalent: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  savingsText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.success,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.text,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  trialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.premium + '20',
    borderRadius: 8,
    padding: 8,
    marginBottom: 16,
  },
  trialText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.premium,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  paymentMethodsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  paymentMethodsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  paymentMethod: {
    alignItems: 'center',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    flex: 1,
    marginHorizontal: 4,
  },
  paymentMethodText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.text,
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  termsSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  termsTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  termsText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8,
  },
  termsLink: {
    alignSelf: 'flex-start',
  },
  termsLinkText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.primary,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  securitySection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  securityItem: {
    alignItems: 'center',
    flex: 1,
  },
  securityText: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center',
  },
  purchaseSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  purchaseButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    ...darkTheme.shadows.medium,
  },
  purchaseButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 12,
  },
  purchaseButtonText: {
    ...darkTheme.typography.subtitle,
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
  },
  purchaseSubtext: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.7,
  },
});
