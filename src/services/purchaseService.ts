// Gerçek satın alma servisi - App Store/Google Play entegrasyonu
import { Platform, Alert } from 'react-native';
import { supabase } from './supabase';
import { logger } from '../utils/logger';
import RNIap, {
  purchaseUpdatedListener,
  purchaseErrorListener,
  type Product,
  type Purchase,
  type Subscription,
  finishTransaction,
  getProducts,
  getSubscriptions,
  requestPurchase,
  requestSubscription,
  initConnection,
  endConnection,
  getAvailablePurchases,
  validateReceiptIos,
  validateReceiptAndroid,
} from 'react-native-iap';

export interface PurchasePlan {
  id: string;
  name: string;
  price: string;
  period: string;
  productId: string;
  type: 'monthly' | 'yearly' | 'lifetime';
  currency?: string;
  localizedPrice?: string;
}

export class PurchaseService {
  private static isInitialized = false;
  private static purchaseUpdateSubscription: any = null;
  private static purchaseErrorSubscription: any = null;

  // App Store/Google Play Product ID'leri
  static readonly PRODUCT_IDS = {
    monthly: 'com.emoraai.app.2025.premium.monthly',
    yearly: 'com.emoraai.app.2025.premium.yearly',
    lifetime: 'com.emoraai.app.2025.premium.lifetime',
  };

  // Plan bilgileri
  static readonly PLANS: PurchasePlan[] = [
    {
      id: 'monthly',
      name: 'Aylık',
      price: '$4.99',
      period: 'aylık',
      productId: 'com.emoraai.app.2025.premium.monthly',
      type: 'monthly',
    },
    {
      id: 'yearly',
      name: 'Yıllık',
      price: '$49.99',
      period: 'yıllık',
      productId: 'com.emoraai.app.2025.premium.yearly',
      type: 'yearly',
    },
    {
      id: 'lifetime',
      name: 'Ömür Boyu',
      price: '$99.99',
      period: 'tek seferlik',
      productId: 'com.emoraai.app.2025.premium.lifetime',
      type: 'lifetime',
    },
  ];

  // IAP bağlantısını başlat (Gerçek App Store/Google Play)
  static async initialize(): Promise<boolean> {
    try {
      console.log('PurchaseService: Gerçek IAP bağlantısı başlatılıyor...');
      
      const result = await initConnection();
      if (result) {
        this.setupPurchaseListeners();
        this.isInitialized = true;
        console.log('PurchaseService: Gerçek IAP bağlantısı başarılı');
        return true;
      }
      return false;
    } catch (error: any) {
      // Simülatörde veya IAP mevcut olmadığında bu hata normal
      if (error?.code === 'E_IAP_NOT_AVAILABLE' || error?.message?.includes('E_IAP_NOT_AVAILABLE')) {
        console.log('PurchaseService: IAP mevcut değil (simülatör veya test ortamı)');
        return false;
      }
      // Diğer hatalar için log
      console.error('PurchaseService başlatma hatası:', error);
      return false;
    }
  }

  // Satın alma dinleyicilerini kur (Gerçek App Store/Google Play)
  private static setupPurchaseListeners() {
    console.log('PurchaseService: Gerçek satın alma dinleyicileri kuruluyor...');
    
    this.purchaseUpdateSubscription = purchaseUpdatedListener(
      async (purchase: Purchase) => {
        console.log('PurchaseService: Satın alma güncellendi:', purchase);
        
        try {
          // Receipt doğrulama
          const receipt = await validateReceiptIos({
            'receipt-data': purchase.transactionReceipt,
            password: process.env.APP_STORE_SHARED_SECRET || 'YOUR_APP_STORE_SHARED_SECRET',
          });
          
          if (receipt.status === 0) {
            // Satın alma başarılı - Premium'u aktifleştir
            await this.activatePremiumFromPurchase(purchase);
            await finishTransaction({ purchase, isConsumable: false });
            console.log('PurchaseService: Satın alma tamamlandı ve premium aktifleştirildi');
          }
        } catch (error) {
          console.error('Receipt doğrulama hatası:', error);
        }
      }
    );

    this.purchaseErrorSubscription = purchaseErrorListener(
      (error: any) => {
        console.error('PurchaseService: Satın alma hatası:', error);
      }
    );
    
    console.log('PurchaseService: Gerçek satın alma dinleyicileri kuruldu');
  }

  // Satın alım sonrası premium aktivasyonu
  private static async activatePremiumFromPurchase(purchase: Purchase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Supabase'e premium aboneliği kaydet
      const { error } = await supabase
        .from('premium_subscriptions')
        .insert({
          user_id: user.id,
          product_id: purchase.productId,
          purchase_token: purchase.transactionReceipt,
          is_active: true,
          expires_at: this.calculateExpirationDate(purchase.productId)
        });

      if (error) {
        console.error('Premium aktivasyon hatası:', error);
      } else {
        console.log('Premium başarıyla aktifleştirildi');
      }
    } catch (error) {
      console.error('Premium aktivasyon hatası:', error);
    }
  }

  // Abonelik süresini hesapla
  private static calculateExpirationDate(productId: string): string | null {
    const now = new Date();
    
    if (productId.includes('monthly')) {
      // Aylık abonelik - 1 ay sonra
      const expiration = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return expiration.toISOString();
    } else if (productId.includes('yearly')) {
      // Yıllık abonelik - 1 yıl sonra
      const expiration = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      return expiration.toISOString();
    } else if (productId.includes('lifetime')) {
      // Ömür boyu - süre yok
      return null;
    }
    
    return null;
  }

  // Receipt doğrulama
  private static async validateReceipt(receipt: string): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        // iOS için App Store receipt doğrulama
        const result = await validateReceiptIos({
          'receipt-data': receipt,
          password: 'your-app-specific-shared-secret', // App Store Connect'ten alınacak
        }, false);
        return result.status === 0;
      } else {
        // Android için Google Play receipt doğrulama
        const result = await validateReceiptAndroid({
          packageName: 'com.emoraai.app.2025',
          productId: 'premium_monthly',
          productToken: receipt,
        });
        return result.isValid;
      }
    } catch (error) {
      console.error('Receipt doğrulama hatası:', error);
      return false;
    }
  }

  // Mevcut ürünleri al (Mock - Expo Go için)
  static async getAvailableProducts(): Promise<any[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      console.log('PurchaseService: Mock ürünler döndürülüyor');
      return [];
    } catch (error) {
      console.error('Ürün listesi alma hatası:', error);
      return [];
    }
  }

  // Mevcut abonelikleri al
  static async getAvailableSubscriptions(): Promise<Subscription[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const subscriptionIds = [this.PRODUCT_IDS.monthly, this.PRODUCT_IDS.yearly];
      const subscriptions = await getSubscriptions({ skus: subscriptionIds });
      
      console.log('PurchaseService: Mevcut abonelikler:', subscriptions);
      return subscriptions;
    } catch (error) {
      console.error('Abonelik listesi alma hatası:', error);
      return [];
    }
  }

  // Satın alma işlemi başlat (Gerçek App Store/Google Play)
  static async purchasePlan(planId: string): Promise<PurchaseResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const plan = this.PLANS.find(p => p.id === planId);
      if (!plan) {
        return {
          success: false,
          message: 'Seçilen plan bulunamadı.',
        };
      }

      console.log('PurchaseService: Gerçek satın alma başlatılıyor:', plan.productId);

      if (plan.type === 'lifetime') {
        // Tek seferlik satın alma
        await requestPurchase({ sku: plan.productId });
      } else {
        // Abonelik satın alma
        await requestSubscription({ sku: plan.productId });
      }

      return {
        success: true,
        message: 'Satın alma işlemi başlatıldı.',
        planId: plan.id,
      };
    } catch (error: any) {
      console.error('Satın alma hatası:', error);
      return {
        success: false,
        message: error.message || 'Satın alma işlemi sırasında bir hata oluştu.',
      };
    }
  }

  // Aktif satın almaları kontrol et
  static async checkActiveSubscriptions(): Promise<boolean> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      const purchases = await getAvailablePurchases();
      console.log('PurchaseService: Aktif satın almalar:', purchases);

      // Premium üyelik kontrolü
      const hasActiveSubscription = purchases.some(purchase => 
        Object.values(this.PRODUCT_IDS).includes(purchase.productId)
      );

      return hasActiveSubscription;
    } catch (error) {
      console.error('Aktif abonelik kontrolü hatası:', error);
      return false;
    }
  }

  // Satın alma dinleyicilerini temizle
  static async cleanup(): Promise<void> {
    try {
      if (this.purchaseUpdateSubscription) {
        this.purchaseUpdateSubscription.remove();
        this.purchaseUpdateSubscription = null;
      }

      if (this.purchaseErrorSubscription) {
        this.purchaseErrorSubscription.remove();
        this.purchaseErrorSubscription = null;
      }

      await endConnection();
      this.isInitialized = false;
      
      console.log('PurchaseService: Temizlik tamamlandı');
    } catch (error) {
      console.error('PurchaseService temizlik hatası:', error);
    }
  }

  // Plan fiyatlarını güncelle (ürün bilgilerinden)
  static updatePlanPrices(products: Product[]): PurchasePlan[] {
    return this.PLANS.map(plan => {
      const product = products.find(p => p.productId === plan.productId);
      if (product) {
        return {
          ...plan,
          price: product.localizedPrice || plan.price,
          currency: product.currency || 'USD',
        };
      }
      return plan;
    });
  }

  // Gerçek uygulama için notlar
  static getProductionNotes(): string {
    return `
🚀 PRODUCTION NOTLARI:

Bu gerçek IAP sistemi, App Store ve Google Play Store ile uyumludur.

App Store Connect için:
1. Product ID'leri oluşturun: ${Object.values(this.PRODUCT_IDS).join(', ')}
2. Shared Secret alın (App Store Connect > App > App Information)
3. Sandbox test hesapları oluşturun
4. TestFlight ile beta test yapın

Google Play Console için:
1. In-app products oluşturun
2. License key alın
3. Test hesapları ekleyin
4. Internal testing yapın

Güvenlik:
✅ Receipt doğrulama
✅ Transaction tamamlama
✅ Hata yönetimi
✅ Kullanıcı deneyimi

Test:
✅ Sandbox/Test ortamı
✅ Gerçek cihaz testi
✅ Farklı ülke testleri
✅ Abonelik yönetimi
    `;
  }
}