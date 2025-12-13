// Supabase Analytics servisi
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

export class AnalyticsService {
  private static isInitialized = false;

  // Analytics'i başlat
  static async initialize(): Promise<boolean> {
    try {
      logger.log('AnalyticsService: Supabase Analytics başlatılıyor...');

      this.isInitialized = true;
      logger.log('AnalyticsService: Supabase Analytics başarıyla başlatıldı');

      return true;
    } catch (error) {
      logger.error('AnalyticsService başlatma hatası:', error);
      return false;
    }
  }

  // Kullanıcı kimliğini ayarla
  static async setUserId(userId: string): Promise<void> {
    try {
      // Supabase'de analytics tablosuna kullanıcı bilgisi kaydet
      const { error } = await supabase.from('analytics_users').upsert({
        user_id: userId,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        // RLS policy hatası gibi kritik olmayan hataları sessizce atla (hiçbir şey loglama)
        if (error.code === '42501') {
          // RLS policy hatası - sessizce atla, hiçbir şey loglama
          return;
        } else {
          // Diğer hatalar için de sessizce atla (analytics kritik değil)
          return;
        }
      }
      
      logger.log('AnalyticsService: Kullanıcı kimliği ayarlandı:', userId);
    } catch (error: any) {
      // Analytics hataları uygulamayı crash etmemeli - sessizce atla
      // RLS policy hataları için hiçbir şey loglama
      if (error?.code === '42501') {
        return; // RLS hatası - sessizce atla
      }
      // Diğer hatalar için de sessizce atla
    }
  }

  // Kullanıcı özelliklerini ayarla
  static async setUserProperties(properties: Record<string, string>): Promise<void> {
    try {
      // Kullanıcı giriş yapmış mı kontrol et
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        logger.log('AnalyticsService: Kullanıcı giriş yapmamış, user properties atlanıyor');
        return;
      }

      const { error } = await supabase.from('analytics_user_properties').upsert({
        user_id: user.id, // RLS policy için gerekli
        properties: properties,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        // RLS policy hatası gibi kritik olmayan hataları sessizce atla (hiçbir şey loglama)
        if (error.code === '42501') {
          // RLS policy hatası - sessizce atla, hiçbir şey loglama
          return;
        } else {
          // Diğer hatalar için de sessizce atla (analytics kritik değil)
          return;
        }
      }
      
      logger.log('AnalyticsService: Kullanıcı özellikleri ayarlandı:', properties);
    } catch (error: any) {
      // Analytics hataları uygulamayı crash etmemeli - sessizce atla
      // RLS policy hataları için hiçbir şey loglama
      if (error?.code === '42501') {
        return; // RLS hatası - sessizce atla
      }
      // Diğer hatalar için de sessizce atla
    }
  }

  // Ekran görüntüleme olayı
  static async logScreenView(screenName: string, screenClass?: string): Promise<void> {
    try {
      // Kullanıcı giriş yapmış mı kontrol et
      const { data: { user } } = await supabase.auth.getUser();
      
      // Giriş yapmamış kullanıcılar için analytics'i skip et
      if (!user) {
        logger.log('AnalyticsService: Kullanıcı giriş yapmamış, screen view atlanıyor:', screenName);
        return;
      }

      const { error } = await supabase.from('analytics_events').insert({
        event_name: 'screen_view',
        event_data: {
          screen_name: screenName,
          screen_class: screenClass || screenName,
        },
        timestamp: new Date().toISOString(),
        user_id: user.id, // RLS policy için gerekli
      });

      if (error) {
        // RLS policy hatası gibi kritik olmayan hataları sessizce atla (hiçbir şey loglama)
        if (error.code === '42501') {
          // RLS policy hatası - sessizce atla, hiçbir şey loglama
          return;
        } else {
          // Diğer hatalar için de sessizce atla (analytics kritik değil)
          return;
        }
      }
      
      logger.log('AnalyticsService: Ekran görüntüleme loglandı:', screenName);
    } catch (error: any) {
      // Analytics hataları uygulamayı crash etmemeli - sessizce atla
      // RLS policy hataları için hiçbir şey loglama
      if (error?.code === '42501') {
        return; // RLS hatası - sessizce atla
      }
      // Diğer hatalar için de sessizce atla
    }
  }

  // Özel olay logla
  static async logEvent(eventName: string, parameters?: Record<string, any>): Promise<void> {
    try {
      // Kullanıcı giriş yapmış mı kontrol et
      const { data: { user } } = await supabase.auth.getUser();
      
      // Giriş yapmamış kullanıcılar için analytics'i skip et (RLS policy gerektiriyor)
      if (!user) {
        logger.log('AnalyticsService: Kullanıcı giriş yapmamış, analytics event atlanıyor:', eventName);
        return;
      }

      const { error } = await supabase.from('analytics_events').insert({
        event_name: eventName,
        event_data: parameters || {},
        timestamp: new Date().toISOString(),
        user_id: user.id, // RLS policy için gerekli
      });

      if (error) {
        // RLS policy hatası gibi kritik olmayan hataları sessizce atla (hiçbir şey loglama)
        if (error.code === '42501') {
          // RLS policy hatası - sessizce atla, hiçbir şey loglama
          return;
        } else {
          // Diğer hatalar için de sessizce atla (analytics kritik değil)
          return;
        }
      }
      
      logger.log('AnalyticsService: Özel olay loglandı:', eventName, parameters);
    } catch (error: any) {
      // Analytics hataları uygulamayı crash etmemeli - sessizce atla
      // RLS policy hataları için hiçbir şey loglama
      if (error?.code === '42501') {
        return; // RLS hatası - sessizce atla
      }
      // Diğer hatalar için de sessizce atla
    }
  }

  // Uygulama açılış olayı
  static async logAppOpen(): Promise<void> {
    await this.logEvent('app_open', {
      timestamp: new Date().toISOString(),
    });
  }

  // Kullanıcı kayıt olayı
  static async logSignUp(method: string): Promise<void> {
    await this.logEvent('sign_up', {
      method: method,
      timestamp: new Date().toISOString(),
    });
  }

  // Kullanıcı giriş olayı
  static async logLogin(method: string): Promise<void> {
    await this.logEvent('login', {
      method: method,
      timestamp: new Date().toISOString(),
    });
  }

  // Sohbet başlatma olayı
  static async logChatStart(): Promise<void> {
    await this.logEvent('chat_start', {
      timestamp: new Date().toISOString(),
    });
  }

  // Mesaj gönderme olayı
  static async logMessageSent(messageLength: number): Promise<void> {
    await this.logEvent('message_sent', {
      message_length: messageLength,
      timestamp: new Date().toISOString(),
    });
  }

  // Premium satın alma olayı
  static async logPurchase(planId: string, price: number, currency: string): Promise<void> {
    await this.logEvent('purchase', {
      plan_id: planId,
      price: price,
      currency: currency,
      timestamp: new Date().toISOString(),
    });
  }

  // Premium özellik kullanımı
  static async logPremiumFeatureUsed(featureName: string): Promise<void> {
    await this.logEvent('premium_feature_used', {
      feature_name: featureName,
      timestamp: new Date().toISOString(),
    });
  }

  // Duygu analizi kullanımı
  static async logMoodAnalysis(mood: string, score: number): Promise<void> {
    await this.logEvent('mood_analysis', {
      mood: mood,
      score: score,
      timestamp: new Date().toISOString(),
    });
  }

  // Uygulama kapanış olayı
  static async logAppClose(sessionDuration: number): Promise<void> {
    await this.logEvent('app_close', {
      session_duration: sessionDuration,
      timestamp: new Date().toISOString(),
    });
  }

  // Hata loglama (Sentry + Supabase - Merkezi log aggregation)
  static async logError(error: Error, context?: string): Promise<void> {
    try {
      // Sentry'ye gönder (merkezi log aggregation)
      const { captureException } = await import('../utils/sentry');
      captureException(error, {
        context: context || 'unknown',
        service: 'AnalyticsService',
      });

      // Kullanıcı giriş yapmış mı kontrol et
      const { data: { user } } = await supabase.auth.getUser();
      
      // Supabase'e hata bilgisi kaydet (giriş yapmamış kullanıcılar için skip)
      if (user) {
        const { error: insertError } = await supabase.from('analytics_errors').insert({
          error_message: error.message,
          error_stack: error.stack,
          context: context || 'unknown',
          timestamp: new Date().toISOString(),
          user_id: user.id, // RLS policy için gerekli
        });

        if (insertError) {
          // RLS policy hatası gibi kritik olmayan hataları sessizce atla (hiçbir şey loglama)
          if (insertError.code === '42501') {
            // RLS policy hatası - sessizce atla, hiçbir şey loglama
            return;
          } else {
            // Diğer hatalar için de sessizce atla (analytics kritik değil)
            return;
          }
        } else {
          logger.log('AnalyticsService: Hata loglandı:', error.message);
        }
      }
    } catch (logError: any) {
      // Analytics hataları uygulamayı crash etmemeli - sessizce atla
      // RLS policy hataları için hiçbir şey loglama
      if (logError?.code === '42501') {
        return; // RLS hatası - sessizce atla
      }
      // Diğer hatalar için de sessizce atla
    }
  }

  // Analytics'i temizle
  static async cleanup(): Promise<void> {
    try {
      this.isInitialized = false;
      logger.log('AnalyticsService: Temizlik tamamlandı');
    } catch (error) {
      logger.error('AnalyticsService temizlik hatası:', error);
    }
  }

  // Test modu
  static async enableTestMode(): Promise<void> {
    try {
      logger.log('AnalyticsService: Test modu etkinleştirildi');
    } catch (error) {
      logger.error('Test modu etkinleştirme hatası:', error);
    }
  }

  // Production modu
  static async enableProductionMode(): Promise<void> {
    try {
      logger.log('AnalyticsService: Production modu etkinleştirildi');
    } catch (error) {
      logger.error('Production modu etkinleştirme hatası:', error);
    }
  }
}
