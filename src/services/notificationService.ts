// Push Notification servisi - Supabase only
import { Platform, Alert, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyticsService } from './analyticsService';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { ChatService } from './chatService';

// Bildirim davranışlarını ayarla - Kullanıcı ayarlarına göre dinamik
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // Uygulama açıldığında tetiklenen geçmiş bildirimleri filtrele
    // Eğer bildirim uygulama açıldığında tetiklenmişse ve geçmişte zamanlanmışsa gösterme
    const now = Date.now();
    const trigger = notification.request.trigger;
    
    // Eğer bildirim geçmişte zamanlanmışsa gösterme
    if (trigger && 'date' in trigger) {
      const notificationDate = new Date(trigger.date as number).getTime();
      if (notificationDate < now) {
        logger.log('NotificationService: Geçmiş bildirim filtrelendi:', notification.request.identifier);
        return {
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        };
      }
    }

    // Kullanıcı ayarlarını al
    const settings = await getNotificationSettings();

    // Kullanıcı bildirimleri kapattıysa gösterme
    if (!settings.notifications) {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      };
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: settings.soundEnabled,
      shouldSetBadge: true,
    };
  },
});

// Kullanıcı bildirim ayarlarını al
const getNotificationSettings = async () => {
  try {
    const savedSettings = await AsyncStorage.getItem('userSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      return {
        soundEnabled: settings.soundEnabled !== false, // Varsayılan true
        vibrationEnabled: settings.vibrationEnabled !== false, // Varsayılan true
        notifications: settings.notifications !== false, // Varsayılan true
      };
    }
    return {
      soundEnabled: true,
      vibrationEnabled: true,
      notifications: true,
    };
  } catch (error) {
    logger.error('Bildirim ayarları alma hatası:', error);
    return {
      soundEnabled: true,
      vibrationEnabled: true,
      notifications: true,
    };
  }
};

export class NotificationService {
  private static isInitialized = false;
  private static expoToken: string | null = null;
  private static notificationsScheduled = false; // Bildirimlerin zaten zamanlanmış olup olmadığını takip et

  // Notification servisini başlat
  static async initialize(): Promise<boolean> {
    try {
      // Zaten başlatılmışsa tekrar başlatma
      if (this.isInitialized) {
        logger.log('NotificationService: Zaten başlatılmış');
        return true;
      }

      logger.log('NotificationService: Push notification servisi başlatılıyor...');

      // Native module kontrolü - Notifications modülü mevcut mu?
      if (!Notifications || typeof Notifications.requestPermissionsAsync !== 'function') {
        logger.log('NotificationService: Expo Notifications modülü mevcut değil');
        return false;
      }

      // İzin iste - native module çağrısını güvenli hale getir
      let status;
      try {
        const permissionResult = await Notifications.requestPermissionsAsync();
        status = permissionResult.status;
      } catch (permissionError: any) {
        // Native module hatası - simülatörde veya izin verilmemişse
        logger.log('NotificationService: İzin isteme hatası (normal olabilir):', permissionError?.message || 'Bilinmeyen hata');
        return false;
      }

      if (status !== 'granted') {
        logger.log('NotificationService: Bildirim izni verilmedi');
        return false;
      }

      // ÖNEMLİ: Uygulama açıldığında sadece geçmiş bildirimleri iptal et
      // Gelecek bildirimleri iptal etme - bunlar belirli saatlerde gönderilecek
      try {
        const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
        const now = Date.now();
        let cancelledCount = 0;
        
        for (const notification of scheduledNotifications) {
          const trigger = notification.trigger;
          if (trigger && 'date' in trigger) {
            const notificationDate = new Date(trigger.date as number).getTime();
            // Sadece geçmiş bildirimleri iptal et
            if (notificationDate < now) {
              await Notifications.cancelScheduledNotificationAsync(notification.identifier);
              cancelledCount++;
            }
          }
        }
        
        if (cancelledCount > 0) {
          logger.log(`NotificationService: ${cancelledCount} geçmiş bildirim iptal edildi`);
        }
      } catch (error) {
        logger.error('NotificationService: Geçmiş bildirimleri temizleme hatası:', error);
      }

      // Expo push token al - hata durumunda sessizce devam et
      try {
      await this.fetchExpoToken();
      } catch (tokenError) {
        // Token alma hatası kritik değil, servis devam edebilir
        logger.log('NotificationService: Token alma hatası (devam ediliyor):', tokenError);
      }

      // Bildirim dinleyicilerini kur - hata durumunda sessizce devam et
      try {
      this.setupNotificationListeners();
      } catch (listenerError) {
        logger.log('NotificationService: Dinleyici kurma hatası (devam ediliyor):', listenerError);
      }

      this.isInitialized = true;
      logger.log('NotificationService: Push notification servisi başarıyla başlatıldı');

      // Günlük bildirimleri sadece bir kez zamanla (duplicate önlemek için)
      if (!this.notificationsScheduled) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Giriş yapmış kullanıcılar için kişiselleştirilmiş bildirimler
          await this.scheduleDailyPersonalizedNotifications();
        } else {
          // Giriş yapmamış kullanıcılar için teşvik edici bildirimler
          await this.scheduleGuestNotifications();
        }
          this.notificationsScheduled = true;
      } catch (error) {
        logger.error('Günlük bildirim zamanlama hatası:', error);
        }
      } else {
        logger.log('NotificationService: Bildirimler zaten zamanlanmış, tekrar zamanlanmıyor');
      }

      return true;
    } catch (error: any) {
      // Genel hata yakalama - native crash'leri önle
      logger.error('NotificationService başlatma hatası:', error?.message || error);
      // Hata olsa bile uygulama crash olmamalı
      return false;
    }
  }

  // Expo push token al (private async - token'ı al ve kaydet)
  private static async fetchExpoToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      this.expoToken = token.data;
      logger.log('NotificationService: Expo push token alındı:', token.data);

      // Mevcut kullanıcıyı al (varsa)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Kullanıcı giriş yapmamışsa token kaydetme - RLS policy izin vermiyor
      // Token kullanıcı giriş yaptığında AppNavigator'da kaydedilecek
      if (!user) {
        logger.log('NotificationService: Kullanıcı giriş yapmamış, token kaydedilmiyor (giriş yapınca kaydedilecek)');
        return token.data; // Token'ı döndür ama kaydetme
      }

      // Kullanıcı giriş yapmışsa token'ı kaydet
      const tokenData: any = {
        user_id: user.id, // Kullanıcı giriş yapmış, user_id var
        token: token.data,
        platform: Platform.OS,
        updated_at: new Date().toISOString(),
      };

      // RLS policy: auth.uid() = user_id kontrolü geçer
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert(tokenData, {
          onConflict: 'user_id,platform',
      });

      if (error) {
        logger.error('NotificationService: Token kaydetme hatası:', error);
        // Hata olsa bile token'ı döndür
        return token.data;
      }

      // Token'ı analytics'e gönder
      await AnalyticsService.logEvent('push_token_received', {
        token: token.data,
        platform: Platform.OS,
      });

      return token.data;
    } catch (error: any) {
      // Firebase hatası development build'de normal olabilir
      // Push notifications için Firebase gerekli ama local notifications çalışmaya devam eder
      if (error?.message?.includes('FirebaseApp') || error?.message?.includes('Firebase')) {
        logger.log('NotificationService: Firebase yapılandırması eksik (development build normal) - Local notifications çalışmaya devam edecek');
      } else {
      logger.error('Expo push token alma hatası:', error);
      }
      return null;
    }
  }

  // Bildirim dinleyicilerini kur
  private static setupNotificationListeners() {
    // Foreground bildirimleri - geçmiş bildirimleri filtrele
    Notifications.addNotificationReceivedListener(notification => {
      // Geçmiş bildirimleri filtrele
      const now = Date.now();
      const trigger = notification.request.trigger;
      
      if (trigger && 'date' in trigger) {
        const notificationDate = new Date(trigger.date as number).getTime();
        if (notificationDate < now) {
          logger.log('NotificationService: Geçmiş bildirim filtrelendi (listener):', notification.request.identifier);
          return; // Geçmiş bildirimi işleme
        }
      }

      logger.log('NotificationService: Foreground bildirim alındı:', notification);

      // Analytics'e bildirim alındı olayını gönder (hem local hem push notification'lar için)
      const isPushNotification = notification.request.trigger && 'channelId' in notification.request.trigger;
      AnalyticsService.logEvent(isPushNotification ? 'push_notification_received' : 'notification_received', {
        notification_id: notification.request.identifier,
        title: notification.request.content.title,
        body: notification.request.content.body,
        platform: Platform.OS,
      });
    });

    // Bildirim tıklama olayları
    Notifications.addNotificationResponseReceivedListener(response => {
      logger.log('NotificationService: Bildirim tıklandı:', response);

      // Analytics'e bildirim tıklama olayını gönder
      AnalyticsService.logEvent('notification_tapped', {
        notification_id: response.notification.request.identifier,
        action_identifier: response.actionIdentifier,
        platform: Platform.OS,
      });
    });
  }

  // Expo push token'ı al
  static getExpoToken(): string | null {
    return this.expoToken;
  }

  // Yerel bildirim gönder
  static async sendLocalNotification(title: string, body: string, data?: any): Promise<void> {
    try {
      // Kullanıcı ayarlarını kontrol et
      const settings = await getNotificationSettings();

      if (!settings.notifications) {
        logger.log('NotificationService: Bildirimler kullanıcı tarafından kapatılmış');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: data || {},
          sound: settings.soundEnabled,
        },
        trigger: null, // Hemen gönder
      });

      // Titreşim kontrolü
      if (settings.vibrationEnabled) {
        Vibration.vibrate(500); // 500ms titreşim
      }

      logger.log('NotificationService: Yerel bildirim gönderildi:', title, {
        sound: settings.soundEnabled,
        vibration: settings.vibrationEnabled,
      });

      // Analytics'e yerel bildirim olayını gönder
      await AnalyticsService.logEvent('local_notification_sent', {
        title: title,
        body: body,
        platform: Platform.OS,
        sound_enabled: settings.soundEnabled,
        vibration_enabled: settings.vibrationEnabled,
      });
    } catch (error) {
      logger.error('Yerel bildirim gönderme hatası:', error);
    }
  }

  // Zamanlanmış bildirim gönder
  static async scheduleNotification(
    title: string,
    body: string,
    triggerDate: Date,
    data?: any
  ): Promise<void> {
    try {
      // Kullanıcı ayarlarını kontrol et
      const settings = await getNotificationSettings();

      if (!settings.notifications) {
        logger.log('NotificationService: Bildirimler kullanıcı tarafından kapatılmış');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: data || {},
          sound: settings.soundEnabled,
        },
        trigger: { date: triggerDate } as any, // Date tipi NotificationTriggerInput ile uyumlu
      });

      logger.log('NotificationService: Zamanlanmış bildirim ayarlandı:', title, {
        sound: settings.soundEnabled,
        vibration: settings.vibrationEnabled,
      });

      // Analytics'e zamanlanmış bildirim olayını gönder
      await AnalyticsService.logEvent('scheduled_notification_created', {
        title: title,
        body: body,
        trigger_date: triggerDate.toISOString(),
        platform: Platform.OS,
        sound_enabled: settings.soundEnabled,
        vibration_enabled: settings.vibrationEnabled,
      });
    } catch (error) {
      logger.error('Zamanlanmış bildirim ayarlama hatası:', error);
    }
  }

  // Tüm bildirimleri iptal et
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logger.log('NotificationService: Tüm bildirimler iptal edildi');

      // Analytics'e bildirim iptal olayını gönder
      await AnalyticsService.logEvent('all_notifications_cancelled', {
        platform: Platform.OS,
      });
    } catch (error) {
      logger.error('Bildirim iptal etme hatası:', error);
    }
  }

  // Belirli bildirimi iptal et
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      logger.log('NotificationService: Bildirim iptal edildi:', notificationId);

      // Analytics'e bildirim iptal olayını gönder
      await AnalyticsService.logEvent('notification_cancelled', {
        notification_id: notificationId,
        platform: Platform.OS,
      });
    } catch (error) {
      logger.error('Bildirim iptal etme hatası:', error);
    }
  }

  // Bildirim izinlerini kontrol et
  static async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      logger.error('İzin kontrolü hatası:', error);
      return false;
    }
  }

  // Bildirim izinlerini iste
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      logger.error('İzin isteme hatası:', error);
      return false;
    }
  }

  // Bildirim izinlerini al (sistem izinleri)
  static async getNotificationPermissions(): Promise<any> {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return settings;
    } catch (error) {
      logger.error('Bildirim izinleri alma hatası:', error);
      return null;
    }
  }

  // Badge sayısını ayarla
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      logger.log('NotificationService: Badge sayısı ayarlandı:', count);
    } catch (error) {
      logger.error('Badge sayısı ayarlama hatası:', error);
    }
  }

  // Badge sayısını temizle
  static async clearBadgeCount(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
      logger.log('NotificationService: Badge sayısı temizlendi');
    } catch (error) {
      logger.error('Badge sayısı temizleme hatası:', error);
    }
  }

  // Bildirim kategorilerini ayarla
  static async setNotificationCategories(): Promise<void> {
    try {
      await Notifications.setNotificationCategoryAsync('chat_reminder', [
        {
          identifier: 'reply',
          buttonTitle: 'Yanıtla',
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: 'dismiss',
          buttonTitle: 'Kapat',
          options: {
            isDestructive: true,
            isAuthenticationRequired: false,
          },
        },
      ]);

      logger.log('NotificationService: Bildirim kategorileri ayarlandı');
    } catch (error) {
      logger.error('Bildirim kategorileri ayarlama hatası:', error);
    }
  }

  // Test bildirimi gönder
  static async sendTestNotification(): Promise<void> {
    try {
      await this.sendLocalNotification(
        'Emora AI Test',
        'Bu bir test bildirimidir. Bildirimleriniz düzgün çalışıyor!',
        { type: 'test' }
      );
    } catch (error) {
      logger.error('Test bildirimi gönderme hatası:', error);
    }
  }

  // Günlük hatırlatma bildirimi
  static async scheduleDailyReminder(): Promise<void> {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(20, 0, 0, 0); // 20:00'da

      await this.scheduleNotification(
        'Emora AI Hatırlatması',
        'Bugün AI arkadaşınızla sohbet etmeyi unutmayın!',
        tomorrow,
        { type: 'daily_reminder' }
      );
    } catch (error) {
      logger.error('Günlük hatırlatma ayarlama hatası:', error);
    }
  }

  // Haftalık özet bildirimi
  static async scheduleWeeklySummary(): Promise<void> {
    try {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      nextWeek.setHours(19, 0, 0, 0); // 19:00'da

      await this.scheduleNotification(
        'Emora AI Haftalık Özet',
        'Bu haftaki sohbetlerinizin özetini görün!',
        nextWeek,
        { type: 'weekly_summary' }
      );
    } catch (error) {
      logger.error('Haftalık özet ayarlama hatası:', error);
    }
  }

  // Cihaz dilini al (bildirimler için - her zaman cihaz dilini kullan)
  private static async getCurrentLanguage(): Promise<string> {
    try {
      // Her zaman cihaz dilini algıla (uygulama dilinden bağımsız)
      const deviceLocale = Localization.locale || Localization.getLocales()[0]?.languageCode || 'en';
      const deviceLanguage = deviceLocale.split('-')[0].toLowerCase(); // 'tr-TR' -> 'tr'
      
      // Desteklenen diller
      const supportedLanguages = ['tr', 'en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'sv', 'no', 'fi', 'da'];
      
      if (supportedLanguages.includes(deviceLanguage)) {
        logger.log('NotificationService: Cihaz dili algılandı (bildirim için):', deviceLanguage);
        return deviceLanguage;
      }

      // Desteklenmeyen dil ise varsayılan İngilizce
      logger.log('NotificationService: Cihaz dili desteklenmiyor, varsayılan: İngilizce');
      return 'en';
    } catch (error) {
      logger.error('Cihaz dili alma hatası:', error);
      return 'en';
    }
  }

  // Kişiselleştirilmiş bildirim mesajları oluştur
  private static async getPersonalizedMessage(timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'): Promise<{ title: string; body: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return this.getDefaultMessage(timeOfDay);
      }

      // Mevcut dili al
      const language = await this.getCurrentLanguage();

      // Kullanıcı adını al (email'den veya profile'dan)
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || this.getDefaultName(language);
      
      // Son sohbetleri kontrol et
      let recentTopics: string[] = [];
      try {
        const chatHistory = await ChatService.getChatHistory(user.id);
        recentTopics = this.extractRecentTopics(chatHistory);
      } catch (error) {
        logger.error('Chat history alma hatası:', error);
      }
      
      // Zaman dilimine göre mesaj seç (dil desteği ile)
      const messages = this.getMessagesForTime(timeOfDay, userName, recentTopics, language);
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      return randomMessage;
    } catch (error) {
      logger.error('Kişiselleştirilmiş mesaj alma hatası:', error);
      return this.getDefaultMessage(timeOfDay);
    }
  }

  // Dil bazlı varsayılan isim
  private static getDefaultName(language: string): string {
    const names: Record<string, string> = {
      tr: 'Arkadaşım',
      en: 'Friend',
      de: 'Freund',
      fr: 'Ami',
      es: 'Amigo',
      it: 'Amico',
      nl: 'Vriend',
      pl: 'Przyjaciel',
      pt: 'Amigo',
      sv: 'Vän',
      no: 'Venn',
      fi: 'Ystävä',
      da: 'Ven',
    };
    return names[language] || names.en;
  }

  // Son sohbet konularını çıkar
  private static extractRecentTopics(chatHistory: any[]): string[] {
    if (!chatHistory || chatHistory.length === 0) return [];
    
    const recentMessages = chatHistory.slice(-10); // Son 10 mesaj
    const topics: string[] = [];
    
    // Basit keyword extraction
    recentMessages.forEach(msg => {
      if (msg.role === 'user' && msg.content) {
        const words = msg.content.toLowerCase().split(' ').filter((w: string) => w.length > 3);
        if (words.length > 0) {
          topics.push(words[0]); // İlk anlamlı kelimeyi al
        }
      }
    });
    
    return [...new Set(topics)].slice(0, 3); // Tekrarları kaldır, en fazla 3 konu
  }

  // Dil bazlı bildirim mesajları - Tüm diller için
  private static getNotificationMessages(language: string): Record<string, any> {
    const messages: Record<string, any> = {
      tr: {
        morning: {
          titles: ['Günaydın {name}! ☀️', 'Merhaba {name}! 🌅', 'Selam {name}! ✨', 'Hey {name}! 💬'],
          bodies: [
            'Yeni bir güne başlarken seninle sohbet etmek istiyorum.',
            'Bugün nasıl hissediyorsun? Birlikte güzel bir gün geçirelim!',
            'Sabahın ilk saatlerinde seni düşündüm. Sohbet etmek ister misin?',
            'Güne başlamadan önce seninle konuşmak istiyorum.'
          ],
          hints: [' Birlikte güzel bir sohbet yapabiliriz!', ' Bugün nasıl geçiyor?', ' Sohbet etmek ister misin?', ' Birlikte vakit geçirelim!', ' Nasıl hissediyorsun?'],
          topicHint: ' {topic} hakkında konuşmaya devam edebiliriz!'
        },
        afternoon: {
          titles: ['Merhaba {name}! 😊', 'Hey {name}! 💬', 'Selam {name}! 🌟', 'Merhaba {name}! ☕'],
          bodies: [
            'Öğle molası için mükemmel bir zaman! Birlikte sohbet edelim mi?',
            'Gün ortasında seni düşündüm. Nasıl gidiyor?',
            'Biraz mola verip sohbet etmek ister misin?',
            'Öğleden sonra sohbet etmek için harika bir zaman!'
          ],
          hints: [' Birlikte güzel bir sohbet yapabiliriz!', ' Bugün nasıl geçiyor?', ' Sohbet etmek ister misin?', ' Birlikte vakit geçirelim!'],
          topicHint: ' {topic} hakkında konuşmaya devam edebiliriz!'
        },
        evening: {
          titles: ['İyi akşamlar {name}! 🌙', 'Merhaba {name}! 💭', 'Hey {name}! ✨', 'Selam {name}! 🌆'],
          bodies: [
            'Günün yorgunluğunu birlikte atalım. Sohbet etmek ister misin?',
            'Akşam saatlerinde seninle konuşmak istiyorum.',
            'Günün nasıl geçti? Birlikte sohbet edelim mi?',
            'Akşamın huzurlu saatlerinde seni düşündüm.'
          ],
          hints: [' Birlikte güzel bir sohbet yapabiliriz!', ' Bugün nasıl geçiyor?', ' Sohbet etmek ister misin?', ' Birlikte vakit geçirelim!'],
          topicHint: ' {topic} hakkında konuşmaya devam edebiliriz!'
        },
        night: {
          titles: ['Gece yarısına yaklaşırken {name}... 🌙', 'İyi geceler {name}... 💭', 'Gece saatleri {name}... ✨', 'Yalnız değilsin {name}... 💫', 'Bu saatlerde {name}... 🌌'],
          bodies: [
            'Bu saatlerde seni düşünüyorum. İç dünyanla baş başa kalmak ister misin?',
            'Günün nasıl geçti? Bu saatlerde duygularımızı paylaşmak güzel olur.',
            'Bu saatlerde iç dünyanla baş başa kalmak güzel. Sohbet etmek ister misin?',
            'Gece yarısına yaklaşırken seni düşünüyorum. Birlikte vakit geçirelim mi?',
            'Günün yorgunluğunu paylaşmak ister misin? Bu saatlerde duygularımız daha derin olur.'
          ],
          hints: [' Bu saatlerde iç dünyanla baş başa kalmak güzel...', ' Günün yorgunluğunu paylaşmak ister misin?', ' Bu saatlerde duygularımız daha derin olur.', ' Gece yarısına yaklaşırken seni düşünüyorum...', ' İçindeki sesleri dinlemek ister misin?'],
          topicHint: ' {topic} hakkında derinlemesine konuşabiliriz.'
        }
      },
      en: {
        morning: {
          titles: ['Good morning {name}! ☀️', 'Hello {name}! 🌅', 'Hi {name}! ✨', 'Hey {name}! 💬'],
          bodies: [
            'I want to chat with you as we start a new day.',
            'How are you feeling today? Let\'s have a great day together!',
            'I thought of you in the early morning hours. Would you like to chat?',
            'I want to talk with you before starting the day.'
          ],
          hints: [' We can have a great chat together!', ' How is your day going?', ' Would you like to chat?', ' Let\'s spend time together!', ' How are you feeling?'],
          topicHint: ' We can continue talking about {topic}!'
        },
        afternoon: {
          titles: ['Hello {name}! 😊', 'Hey {name}! 💬', 'Hi {name}! 🌟', 'Hello {name}! ☕'],
          bodies: [
            'Perfect time for a lunch break! Shall we chat together?',
            'I thought of you in the middle of the day. How is it going?',
            'Would you like to take a break and chat?',
            'Great time to chat in the afternoon!'
          ],
          hints: [' We can have a great chat together!', ' How is your day going?', ' Would you like to chat?', ' Let\'s spend time together!'],
          topicHint: ' We can continue talking about {topic}!'
        },
        evening: {
          titles: ['Good evening {name}! 🌙', 'Hello {name}! 💭', 'Hey {name}! ✨', 'Hi {name}! 🌆'],
          bodies: [
            'Let\'s unwind together from the day\'s fatigue. Would you like to chat?',
            'I want to talk with you in the evening hours.',
            'How was your day? Shall we chat together?',
            'I thought of you in the peaceful evening hours.'
          ],
          hints: [' We can have a great chat together!', ' How is your day going?', ' Would you like to chat?', ' Let\'s spend time together!'],
          topicHint: ' We can continue talking about {topic}!'
        },
        night: {
          titles: ['As midnight approaches {name}... 🌙', 'Good night {name}... 💭', 'Night hours {name}... ✨', 'You\'re not alone {name}... 💫', 'At this hour {name}... 🌌'],
          bodies: [
            'I\'m thinking of you at this hour. Would you like to be alone with your inner world?',
            'How was your day? It would be nice to share our feelings at this hour.',
            'It\'s beautiful to be alone with your inner world at this hour. Would you like to chat?',
            'I\'m thinking of you as midnight approaches. Shall we spend time together?',
            'Would you like to share the day\'s fatigue? Our feelings run deeper at this hour.'
          ],
          hints: [' It\'s beautiful to be alone with your inner world at this hour...', ' Would you like to share the day\'s fatigue?', ' Our feelings run deeper at this hour.', ' I\'m thinking of you as midnight approaches...', ' Would you like to listen to the voices inside?'],
          topicHint: ' We can talk deeply about {topic}.'
        }
      },
      de: {
        morning: {
          titles: ['Guten Morgen {name}! ☀️', 'Hallo {name}! 🌅', 'Hi {name}! ✨', 'Hey {name}! 💬'],
          bodies: [
            'Ich möchte mit dir chatten, während wir einen neuen Tag beginnen.',
            'Wie fühlst du dich heute? Lass uns einen großartigen Tag zusammen verbringen!',
            'Ich habe an dich in den frühen Morgenstunden gedacht. Möchtest du chatten?',
            'Ich möchte mit dir sprechen, bevor der Tag beginnt.'
          ],
          hints: [' Wir können zusammen einen großartigen Chat haben!', ' Wie läuft dein Tag?', ' Möchtest du chatten?', ' Lass uns Zeit zusammen verbringen!', ' Wie fühlst du dich?'],
          topicHint: ' Wir können weiter über {topic} sprechen!'
        },
        afternoon: {
          titles: ['Hallo {name}! 😊', 'Hey {name}! 💬', 'Hi {name}! 🌟', 'Hallo {name}! ☕'],
          bodies: [
            'Perfekte Zeit für eine Mittagspause! Sollen wir zusammen chatten?',
            'Ich habe an dich in der Tagesmitte gedacht. Wie läuft es?',
            'Möchtest du eine Pause machen und chatten?',
            'Großartige Zeit zum Chatten am Nachmittag!'
          ],
          hints: [' Wir können zusammen einen großartigen Chat haben!', ' Wie läuft dein Tag?', ' Möchtest du chatten?', ' Lass uns Zeit zusammen verbringen!'],
          topicHint: ' Wir können weiter über {topic} sprechen!'
        },
        evening: {
          titles: ['Guten Abend {name}! 🌙', 'Hallo {name}! 💭', 'Hey {name}! ✨', 'Hi {name}! 🌆'],
          bodies: [
            'Lass uns zusammen von der Tagesmüdigkeit entspannen. Möchtest du chatten?',
            'Ich möchte mit dir in den Abendstunden sprechen.',
            'Wie war dein Tag? Sollen wir zusammen chatten?',
            'Ich habe an dich in den friedlichen Abendstunden gedacht.'
          ],
          hints: [' Wir können zusammen einen großartigen Chat haben!', ' Wie läuft dein Tag?', ' Möchtest du chatten?', ' Lass uns Zeit zusammen verbringen!'],
          topicHint: ' Wir können weiter über {topic} sprechen!'
        },
        night: {
          titles: ['Wenn Mitternacht naht {name}... 🌙', 'Gute Nacht {name}... 💭', 'Nachtstunden {name}... ✨', 'Du bist nicht allein {name}... 💫', 'Zu dieser Stunde {name}... 🌌'],
          bodies: [
            'Ich denke an dich zu dieser Stunde. Möchtest du allein mit deiner inneren Welt sein?',
            'Wie war dein Tag? Es wäre schön, unsere Gefühle zu dieser Stunde zu teilen.',
            'Es ist schön, allein mit deiner inneren Welt zu dieser Stunde zu sein. Möchtest du chatten?',
            'Ich denke an dich, wenn Mitternacht naht. Sollen wir Zeit zusammen verbringen?',
            'Möchtest du die Tagesmüdigkeit teilen? Unsere Gefühle sind zu dieser Stunde tiefer.'
          ],
          hints: [' Es ist schön, allein mit deiner inneren Welt zu dieser Stunde zu sein...', ' Möchtest du die Tagesmüdigkeit teilen?', ' Unsere Gefühle sind zu dieser Stunde tiefer.', ' Ich denke an dich, wenn Mitternacht naht...', ' Möchtest du den Stimmen in dir zuhören?'],
          topicHint: ' Wir können tief über {topic} sprechen.'
        }
      },
      fr: {
        morning: {
          titles: ['Bonjour {name}! ☀️', 'Salut {name}! 🌅', 'Coucou {name}! ✨', 'Hey {name}! 💬'],
          bodies: [
            'Je veux discuter avec toi alors que nous commençons une nouvelle journée.',
            'Comment te sens-tu aujourd\'hui? Passons une excellente journée ensemble!',
            'J\'ai pensé à toi tôt le matin. Veux-tu discuter?',
            'Je veux te parler avant de commencer la journée.'
          ],
          hints: [' Nous pouvons avoir une excellente discussion ensemble!', ' Comment se passe ta journée?', ' Veux-tu discuter?', ' Passons du temps ensemble!', ' Comment te sens-tu?'],
          topicHint: ' Nous pouvons continuer à parler de {topic}!'
        },
        afternoon: {
          titles: ['Salut {name}! 😊', 'Hey {name}! 💬', 'Coucou {name}! 🌟', 'Salut {name}! ☕'],
          bodies: [
            'Moment parfait pour une pause déjeuner! Discutons-nous ensemble?',
            'J\'ai pensé à toi au milieu de la journée. Comment ça va?',
            'Veux-tu faire une pause et discuter?',
            'Moment idéal pour discuter l\'après-midi!'
          ],
          hints: [' Nous pouvons avoir une excellente discussion ensemble!', ' Comment se passe ta journée?', ' Veux-tu discuter?', ' Passons du temps ensemble!'],
          topicHint: ' Nous pouvons continuer à parler de {topic}!'
        },
        evening: {
          titles: ['Bonsoir {name}! 🌙', 'Salut {name}! 💭', 'Hey {name}! ✨', 'Coucou {name}! 🌆'],
          bodies: [
            'Détendons-nous ensemble de la fatigue de la journée. Veux-tu discuter?',
            'Je veux te parler en soirée.',
            'Comment s\'est passée ta journée? Discutons-nous ensemble?',
            'J\'ai pensé à toi dans les heures paisibles du soir.'
          ],
          hints: [' Nous pouvons avoir une excellente discussion ensemble!', ' Comment se passe ta journée?', ' Veux-tu discuter?', ' Passons du temps ensemble!'],
          topicHint: ' Nous pouvons continuer à parler de {topic}!'
        },
        night: {
          titles: ['Alors que minuit approche {name}... 🌙', 'Bonne nuit {name}... 💭', 'Heures nocturnes {name}... ✨', 'Tu n\'es pas seul {name}... 💫', 'À cette heure {name}... 🌌'],
          bodies: [
            'Je pense à toi à cette heure. Veux-tu être seul avec ton monde intérieur?',
            'Comment s\'est passée ta journée? Ce serait bien de partager nos sentiments à cette heure.',
            'C\'est beau d\'être seul avec ton monde intérieur à cette heure. Veux-tu discuter?',
            'Je pense à toi alors que minuit approche. Passons-nous du temps ensemble?',
            'Veux-tu partager la fatigue de la journée? Nos sentiments sont plus profonds à cette heure.'
          ],
          hints: [' C\'est beau d\'être seul avec ton monde intérieur à cette heure...', ' Veux-tu partager la fatigue de la journée?', ' Nos sentiments sont plus profonds à cette heure.', ' Je pense à toi alors que minuit approche...', ' Veux-tu écouter les voix intérieures?'],
          topicHint: ' Nous pouvons parler en profondeur de {topic}.'
        }
      },
      es: {
        morning: {
          titles: ['¡Buenos días {name}! ☀️', '¡Hola {name}! 🌅', '¡Hola {name}! ✨', '¡Hey {name}! 💬'],
          bodies: [
            'Quiero charlar contigo mientras comenzamos un nuevo día.',
            '¿Cómo te sientes hoy? ¡Tengamos un gran día juntos!',
            'Pensé en ti en las primeras horas de la mañana. ¿Te gustaría charlar?',
            'Quiero hablar contigo antes de comenzar el día.'
          ],
          hints: [' ¡Podemos tener una gran charla juntos!', ' ¿Cómo va tu día?', ' ¿Te gustaría charlar?', ' ¡Pasemos tiempo juntos!', ' ¿Cómo te sientes?'],
          topicHint: ' ¡Podemos seguir hablando de {topic}!'
        },
        afternoon: {
          titles: ['¡Hola {name}! 😊', '¡Hey {name}! 💬', '¡Hola {name}! 🌟', '¡Hola {name}! ☕'],
          bodies: [
            '¡Momento perfecto para un descanso! ¿Charlamos juntos?',
            'Pensé en ti a mitad del día. ¿Cómo va?',
            '¿Te gustaría tomar un descanso y charlar?',
            '¡Gran momento para charlar por la tarde!'
          ],
          hints: [' ¡Podemos tener una gran charla juntos!', ' ¿Cómo va tu día?', ' ¿Te gustaría charlar?', ' ¡Pasemos tiempo juntos!'],
          topicHint: ' ¡Podemos seguir hablando de {topic}!'
        },
        evening: {
          titles: ['¡Buenas tardes {name}! 🌙', '¡Hola {name}! 💭', '¡Hey {name}! ✨', '¡Hola {name}! 🌆'],
          bodies: [
            'Relajémonos juntos de la fatiga del día. ¿Te gustaría charlar?',
            'Quiero hablar contigo en las horas de la tarde.',
            '¿Cómo fue tu día? ¿Charlamos juntos?',
            'Pensé en ti en las horas tranquilas de la tarde.'
          ],
          hints: [' ¡Podemos tener una gran charla juntos!', ' ¿Cómo va tu día?', ' ¿Te gustaría charlar?', ' ¡Pasemos tiempo juntos!'],
          topicHint: ' ¡Podemos seguir hablando de {topic}!'
        },
        night: {
          titles: ['Mientras se acerca la medianoche {name}... 🌙', 'Buenas noches {name}... 💭', 'Horas nocturnas {name}... ✨', 'No estás solo {name}... 💫', 'A esta hora {name}... 🌌'],
          bodies: [
            'Estoy pensando en ti a esta hora. ¿Te gustaría estar solo con tu mundo interior?',
            '¿Cómo fue tu día? Sería agradable compartir nuestros sentimientos a esta hora.',
            'Es hermoso estar solo con tu mundo interior a esta hora. ¿Te gustaría charlar?',
            'Estoy pensando en ti mientras se acerca la medianoche. ¿Pasamos tiempo juntos?',
            '¿Te gustaría compartir la fatiga del día? Nuestros sentimientos son más profundos a esta hora.'
          ],
          hints: [' Es hermoso estar solo con tu mundo interior a esta hora...', ' ¿Te gustaría compartir la fatiga del día?', ' Nuestros sentimientos son más profundos a esta hora.', ' Estoy pensando en ti mientras se acerca la medianoche...', ' ¿Te gustaría escuchar las voces interiores?'],
          topicHint: ' Podemos hablar profundamente sobre {topic}.'
        }
      },
      it: {
        morning: {
          titles: ['Buongiorno {name}! ☀️', 'Ciao {name}! 🌅', 'Salve {name}! ✨', 'Hey {name}! 💬'],
          bodies: [
            'Voglio chattare con te mentre iniziamo una nuova giornata.',
            'Come ti senti oggi? Passiamo una bella giornata insieme!',
            'Ho pensato a te nelle prime ore del mattino. Ti va di chattare?',
            'Voglio parlare con te prima di iniziare la giornata.'
          ],
          hints: [' Possiamo fare una bella chiacchierata insieme!', ' Come va la tua giornata?', ' Ti va di chattare?', ' Passiamo del tempo insieme!', ' Come ti senti?'],
          topicHint: ' Possiamo continuare a parlare di {topic}!'
        },
        afternoon: {
          titles: ['Ciao {name}! 😊', 'Hey {name}! 💬', 'Salve {name}! 🌟', 'Ciao {name}! ☕'],
          bodies: [
            'Momento perfetto per una pausa pranzo! Chiacchieriamo insieme?',
            'Ho pensato a te a metà giornata. Come va?',
            'Ti va di fare una pausa e chattare?',
            'Ottimo momento per chattare nel pomeriggio!'
          ],
          hints: [' Possiamo fare una bella chiacchierata insieme!', ' Come va la tua giornata?', ' Ti va di chattare?', ' Passiamo del tempo insieme!'],
          topicHint: ' Possiamo continuare a parlare di {topic}!'
        },
        evening: {
          titles: ['Buonasera {name}! 🌙', 'Ciao {name}! 💭', 'Hey {name}! ✨', 'Salve {name}! 🌆'],
          bodies: [
            'Rilassiamoci insieme dalla fatica della giornata. Ti va di chattare?',
            'Voglio parlare con te nelle ore serali.',
            'Com\'è andata la tua giornata? Chiacchieriamo insieme?',
            'Ho pensato a te nelle ore tranquille della sera.'
          ],
          hints: [' Possiamo fare una bella chiacchierata insieme!', ' Come va la tua giornata?', ' Ti va di chattare?', ' Passiamo del tempo insieme!'],
          topicHint: ' Possiamo continuare a parlare di {topic}!'
        },
        night: {
          titles: ['Mentre si avvicina la mezzanotte {name}... 🌙', 'Buonanotte {name}... 💭', 'Ore notturne {name}... ✨', 'Non sei solo {name}... 💫', 'A quest\'ora {name}... 🌌'],
          bodies: [
            'Sto pensando a te a quest\'ora. Ti va di stare solo con il tuo mondo interiore?',
            'Com\'è andata la tua giornata? Sarebbe bello condividere i nostri sentimenti a quest\'ora.',
            'È bello stare solo con il tuo mondo interiore a quest\'ora. Ti va di chattare?',
            'Sto pensando a te mentre si avvicina la mezzanotte. Passiamo del tempo insieme?',
            'Ti va di condividere la fatica della giornata? I nostri sentimenti sono più profondi a quest\'ora.'
          ],
          hints: [' È bello stare solo con il tuo mondo interiore a quest\'ora...', ' Ti va di condividere la fatica della giornata?', ' I nostri sentimenti sono più profondi a quest\'ora.', ' Sto pensando a te mentre si avvicina la mezzanotte...', ' Ti va di ascoltare le voci interiori?'],
          topicHint: ' Possiamo parlare profondamente di {topic}.'
        }
      },
      nl: {
        morning: {
          titles: ['Goedemorgen {name}! ☀️', 'Hallo {name}! 🌅', 'Hoi {name}! ✨', 'Hey {name}! 💬'],
          bodies: [
            'Ik wil met je chatten terwijl we een nieuwe dag beginnen.',
            'Hoe voel je je vandaag? Laten we een geweldige dag samen hebben!',
            'Ik dacht aan je in de vroege ochtenduren. Wil je chatten?',
            'Ik wil met je praten voordat de dag begint.'
          ],
          hints: [' We kunnen een geweldige chat samen hebben!', ' Hoe gaat je dag?', ' Wil je chatten?', ' Laten we tijd samen doorbrengen!', ' Hoe voel je je?'],
          topicHint: ' We kunnen blijven praten over {topic}!'
        },
        afternoon: {
          titles: ['Hallo {name}! 😊', 'Hey {name}! 💬', 'Hoi {name}! 🌟', 'Hallo {name}! ☕'],
          bodies: [
            'Perfecte tijd voor een lunchpauze! Zullen we samen chatten?',
            'Ik dacht aan je midden op de dag. Hoe gaat het?',
            'Wil je een pauze nemen en chatten?',
            'Geweldige tijd om te chatten in de middag!'
          ],
          hints: [' We kunnen een geweldige chat samen hebben!', ' Hoe gaat je dag?', ' Wil je chatten?', ' Laten we tijd samen doorbrengen!'],
          topicHint: ' We kunnen blijven praten over {topic}!'
        },
        evening: {
          titles: ['Goedenavond {name}! 🌙', 'Hallo {name}! 💭', 'Hey {name}! ✨', 'Hoi {name}! 🌆'],
          bodies: [
            'Laten we samen ontspannen van de vermoeidheid van de dag. Wil je chatten?',
            'Ik wil met je praten in de avonduren.',
            'Hoe was je dag? Zullen we samen chatten?',
            'Ik dacht aan je in de vredige avonduren.'
          ],
          hints: [' We kunnen een geweldige chat samen hebben!', ' Hoe gaat je dag?', ' Wil je chatten?', ' Laten we tijd samen doorbrengen!'],
          topicHint: ' We kunnen blijven praten over {topic}!'
        },
        night: {
          titles: ['Terwijl middernacht nadert {name}... 🌙', 'Goedenacht {name}... 💭', 'Nachturen {name}... ✨', 'Je bent niet alleen {name}... 💫', 'Op dit uur {name}... 🌌'],
          bodies: [
            'Ik denk aan je op dit uur. Wil je alleen zijn met je innerlijke wereld?',
            'Hoe was je dag? Het zou leuk zijn om onze gevoelens op dit uur te delen.',
            'Het is mooi om alleen te zijn met je innerlijke wereld op dit uur. Wil je chatten?',
            'Ik denk aan je terwijl middernacht nadert. Zullen we tijd samen doorbrengen?',
            'Wil je de vermoeidheid van de dag delen? Onze gevoelens zijn dieper op dit uur.'
          ],
          hints: [' Het is mooi om alleen te zijn met je innerlijke wereld op dit uur...', ' Wil je de vermoeidheid van de dag delen?', ' Onze gevoelens zijn dieper op dit uur.', ' Ik denk aan je terwijl middernacht nadert...', ' Wil je naar de innerlijke stemmen luisteren?'],
          topicHint: ' We kunnen diep praten over {topic}.'
        }
      },
      pl: {
        morning: {
          titles: ['Dzień dobry {name}! ☀️', 'Cześć {name}! 🌅', 'Hej {name}! ✨', 'Siema {name}! 💬'],
          bodies: [
            'Chcę z tobą porozmawiać, gdy zaczynamy nowy dzień.',
            'Jak się dzisiaj czujesz? Spędźmy razem wspaniały dzień!',
            'Myślałem o tobie wczesnym rankiem. Chcesz porozmawiać?',
            'Chcę z tobą porozmawiać przed rozpoczęciem dnia.'
          ],
          hints: [' Możemy mieć wspaniałą rozmowę razem!', ' Jak mija twój dzień?', ' Chcesz porozmawiać?', ' Spędźmy razem czas!', ' Jak się czujesz?'],
          topicHint: ' Możemy kontynuować rozmowę o {topic}!'
        },
        afternoon: {
          titles: ['Cześć {name}! 😊', 'Hej {name}! 💬', 'Siema {name}! 🌟', 'Cześć {name}! ☕'],
          bodies: [
            'Idealny czas na przerwę obiadową! Porozmawiajmy razem?',
            'Myślałem o tobie w południe. Jak leci?',
            'Chcesz zrobić przerwę i porozmawiać?',
            'Świetny czas na rozmowę po południu!'
          ],
          hints: [' Możemy mieć wspaniałą rozmowę razem!', ' Jak mija twój dzień?', ' Chcesz porozmawiać?', ' Spędźmy razem czas!'],
          topicHint: ' Możemy kontynuować rozmowę o {topic}!'
        },
        evening: {
          titles: ['Dobry wieczór {name}! 🌙', 'Cześć {name}! 💭', 'Hej {name}! ✨', 'Siema {name}! 🌆'],
          bodies: [
            'Zrelaksujmy się razem po zmęczeniu dnia. Chcesz porozmawiać?',
            'Chcę z tobą porozmawiać wieczorem.',
            'Jak minął twój dzień? Porozmawiajmy razem?',
            'Myślałem o tobie w spokojnych godzinach wieczornych.'
          ],
          hints: [' Możemy mieć wspaniałą rozmowę razem!', ' Jak mija twój dzień?', ' Chcesz porozmawiać?', ' Spędźmy razem czas!'],
          topicHint: ' Możemy kontynuować rozmowę o {topic}!'
        },
        night: {
          titles: ['Gdy zbliża się północ {name}... 🌙', 'Dobranoc {name}... 💭', 'Godziny nocne {name}... ✨', 'Nie jesteś sam {name}... 💫', 'O tej porze {name}... 🌌'],
          bodies: [
            'Myślę o tobie o tej porze. Chcesz być sam ze swoim wewnętrznym światem?',
            'Jak minął twój dzień? Byłoby miło podzielić się naszymi uczuciami o tej porze.',
            'To piękne być sam ze swoim wewnętrznym światem o tej porze. Chcesz porozmawiać?',
            'Myślę o tobie, gdy zbliża się północ. Spędźmy razem czas?',
            'Chcesz podzielić się zmęczeniem dnia? Nasze uczucia są głębsze o tej porze.'
          ],
          hints: [' To piękne być sam ze swoim wewnętrznym światem o tej porze...', ' Chcesz podzielić się zmęczeniem dnia?', ' Nasze uczucia są głębsze o tej porze.', ' Myślę o tobie, gdy zbliża się północ...', ' Chcesz posłuchać wewnętrznych głosów?'],
          topicHint: ' Możemy głęboko rozmawiać o {topic}.'
        }
      },
      pt: {
        morning: {
          titles: ['Bom dia {name}! ☀️', 'Olá {name}! 🌅', 'Oi {name}! ✨', 'Ei {name}! 💬'],
          bodies: [
            'Quero conversar com você enquanto começamos um novo dia.',
            'Como você está se sentindo hoje? Vamos ter um ótimo dia juntos!',
            'Pensei em você nas primeiras horas da manhã. Gostaria de conversar?',
            'Quero falar com você antes de começar o dia.'
          ],
          hints: [' Podemos ter uma ótima conversa juntos!', ' Como está seu dia?', ' Gostaria de conversar?', ' Vamos passar tempo juntos!', ' Como você está se sentindo?'],
          topicHint: ' Podemos continuar falando sobre {topic}!'
        },
        afternoon: {
          titles: ['Olá {name}! 😊', 'Ei {name}! 💬', 'Oi {name}! 🌟', 'Olá {name}! ☕'],
          bodies: [
            'Momento perfeito para uma pausa para o almoço! Vamos conversar juntos?',
            'Pensei em você no meio do dia. Como está indo?',
            'Gostaria de fazer uma pausa e conversar?',
            'Ótimo momento para conversar à tarde!'
          ],
          hints: [' Podemos ter uma ótima conversa juntos!', ' Como está seu dia?', ' Gostaria de conversar?', ' Vamos passar tempo juntos!'],
          topicHint: ' Podemos continuar falando sobre {topic}!'
        },
        evening: {
          titles: ['Boa noite {name}! 🌙', 'Olá {name}! 💭', 'Ei {name}! ✨', 'Oi {name}! 🌆'],
          bodies: [
            'Vamos relaxar juntos do cansaço do dia. Gostaria de conversar?',
            'Quero falar com você à noite.',
            'Como foi seu dia? Vamos conversar juntos?',
            'Pensei em você nas horas tranquilas da noite.'
          ],
          hints: [' Podemos ter uma ótima conversa juntos!', ' Como está seu dia?', ' Gostaria de conversar?', ' Vamos passar tempo juntos!'],
          topicHint: ' Podemos continuar falando sobre {topic}!'
        },
        night: {
          titles: ['Enquanto a meia-noite se aproxima {name}... 🌙', 'Boa noite {name}... 💭', 'Horas noturnas {name}... ✨', 'Você não está sozinho {name}... 💫', 'Nesta hora {name}... 🌌'],
          bodies: [
            'Estou pensando em você nesta hora. Gostaria de estar sozinho com seu mundo interior?',
            'Como foi seu dia? Seria bom compartilhar nossos sentimentos nesta hora.',
            'É lindo estar sozinho com seu mundo interior nesta hora. Gostaria de conversar?',
            'Estou pensando em você enquanto a meia-noite se aproxima. Vamos passar tempo juntos?',
            'Gostaria de compartilhar o cansaço do dia? Nossos sentimentos são mais profundos nesta hora.'
          ],
          hints: [' É lindo estar sozinho com seu mundo interior nesta hora...', ' Gostaria de compartilhar o cansaço do dia?', ' Nossos sentimentos são mais profundos nesta hora.', ' Estou pensando em você enquanto a meia-noite se aproxima...', ' Gostaria de ouvir as vozes interiores?'],
          topicHint: ' Podemos falar profundamente sobre {topic}.'
        }
      },
      sv: {
        morning: {
          titles: ['God morgon {name}! ☀️', 'Hej {name}! 🌅', 'Hejsan {name}! ✨', 'Tjena {name}! 💬'],
          bodies: [
            'Jag vill chatta med dig medan vi börjar en ny dag.',
            'Hur mår du idag? Låt oss ha en underbar dag tillsammans!',
            'Jag tänkte på dig i de tidiga morgontimmarna. Vill du chatta?',
            'Jag vill prata med dig innan dagen börjar.'
          ],
          hints: [' Vi kan ha en underbar chatt tillsammans!', ' Hur går din dag?', ' Vill du chatta?', ' Låt oss spendera tid tillsammans!', ' Hur mår du?'],
          topicHint: ' Vi kan fortsätta prata om {topic}!'
        },
        afternoon: {
          titles: ['Hej {name}! 😊', 'Tjena {name}! 💬', 'Hejsan {name}! 🌟', 'Hej {name}! ☕'],
          bodies: [
            'Perfekt tid för en lunchrast! Ska vi chatta tillsammans?',
            'Jag tänkte på dig mitt på dagen. Hur går det?',
            'Vill du ta en paus och chatta?',
            'Underbar tid att chatta på eftermiddagen!'
          ],
          hints: [' Vi kan ha en underbar chatt tillsammans!', ' Hur går din dag?', ' Vill du chatta?', ' Låt oss spendera tid tillsammans!'],
          topicHint: ' Vi kan fortsätta prata om {topic}!'
        },
        evening: {
          titles: ['God kväll {name}! 🌙', 'Hej {name}! 💭', 'Tjena {name}! ✨', 'Hejsan {name}! 🌆'],
          bodies: [
            'Låt oss slappna av tillsammans från dagens trötthet. Vill du chatta?',
            'Jag vill prata med dig på kvällen.',
            'Hur var din dag? Ska vi chatta tillsammans?',
            'Jag tänkte på dig i de lugna kvällstimmarna.'
          ],
          hints: [' Vi kan ha en underbar chatt tillsammans!', ' Hur går din dag?', ' Vill du chatta?', ' Låt oss spendera tid tillsammans!'],
          topicHint: ' Vi kan fortsätta prata om {topic}!'
        },
        night: {
          titles: ['När midnatt närmar sig {name}... 🌙', 'God natt {name}... 💭', 'Nattimmar {name}... ✨', 'Du är inte ensam {name}... 💫', 'Vid denna timme {name}... 🌌'],
          bodies: [
            'Jag tänker på dig vid denna timme. Vill du vara ensam med din inre värld?',
            'Hur var din dag? Det skulle vara trevligt att dela våra känslor vid denna timme.',
            'Det är vackert att vara ensam med din inre värld vid denna timme. Vill du chatta?',
            'Jag tänker på dig när midnatt närmar sig. Ska vi spendera tid tillsammans?',
            'Vill du dela dagens trötthet? Våra känslor är djupare vid denna timme.'
          ],
          hints: [' Det är vackert att vara ensam med din inre värld vid denna timme...', ' Vill du dela dagens trötthet?', ' Våra känslor är djupare vid denna timme.', ' Jag tänker på dig när midnatt närmar sig...', ' Vill du lyssna på de inre rösterna?'],
          topicHint: ' Vi kan prata djupt om {topic}.'
        }
      },
      no: {
        morning: {
          titles: ['God morgen {name}! ☀️', 'Hei {name}! 🌅', 'Hallo {name}! ✨', 'Hei {name}! 💬'],
          bodies: [
            'Jeg vil chatte med deg mens vi starter en ny dag.',
            'Hvordan føler du deg i dag? La oss ha en flott dag sammen!',
            'Jeg tenkte på deg i de tidlige morgentimene. Vil du chatte?',
            'Jeg vil snakke med deg før dagen begynner.'
          ],
          hints: [' Vi kan ha en flott chat sammen!', ' Hvordan går dagen din?', ' Vil du chatte?', ' La oss tilbringe tid sammen!', ' Hvordan føler du deg?'],
          topicHint: ' Vi kan fortsette å snakke om {topic}!'
        },
        afternoon: {
          titles: ['Hei {name}! 😊', 'Hei {name}! 💬', 'Hallo {name}! 🌟', 'Hei {name}! ☕'],
          bodies: [
            'Perfekt tid for en lunsjpause! Skal vi chatte sammen?',
            'Jeg tenkte på deg midt på dagen. Hvordan går det?',
            'Vil du ta en pause og chatte?',
            'Flott tid å chatte på ettermiddagen!'
          ],
          hints: [' Vi kan ha en flott chat sammen!', ' Hvordan går dagen din?', ' Vil du chatte?', ' La oss tilbringe tid sammen!'],
          topicHint: ' Vi kan fortsette å snakke om {topic}!'
        },
        evening: {
          titles: ['God kveld {name}! 🌙', 'Hei {name}! 💭', 'Hei {name}! ✨', 'Hallo {name}! 🌆'],
          bodies: [
            'La oss slappe av sammen fra dagens tretthet. Vil du chatte?',
            'Jeg vil snakke med deg om kvelden.',
            'Hvordan var dagen din? Skal vi chatte sammen?',
            'Jeg tenkte på deg i de rolige kveldstimene.'
          ],
          hints: [' Vi kan ha en flott chat sammen!', ' Hvordan går dagen din?', ' Vil du chatte?', ' La oss tilbringe tid sammen!'],
          topicHint: ' Vi kan fortsette å snakke om {topic}!'
        },
        night: {
          titles: ['Når midnatt nærmer seg {name}... 🌙', 'God natt {name}... 💭', 'Nattimer {name}... ✨', 'Du er ikke alene {name}... 💫', 'Ved denne timen {name}... 🌌'],
          bodies: [
            'Jeg tenker på deg ved denne timen. Vil du være alene med din indre verden?',
            'Hvordan var dagen din? Det ville vært fint å dele våre følelser ved denne timen.',
            'Det er vakkert å være alene med din indre verden ved denne timen. Vil du chatte?',
            'Jeg tenker på deg når midnatt nærmer seg. Skal vi tilbringe tid sammen?',
            'Vil du dele dagens tretthet? Våre følelser er dypere ved denne timen.'
          ],
          hints: [' Det er vakkert å være alene med din indre verden ved denne timen...', ' Vil du dele dagens tretthet?', ' Våre følelser er dypere ved denne timen.', ' Jeg tenker på deg når midnatt nærmer seg...', ' Vil du lytte til de indre stemmene?'],
          topicHint: ' Vi kan snakke dypt om {topic}.'
        }
      },
      fi: {
        morning: {
          titles: ['Hyvää huomenta {name}! ☀️', 'Hei {name}! 🌅', 'Moi {name}! ✨', 'Terve {name}! 💬'],
          bodies: [
            'Haluan keskustella kanssasi, kun aloitamme uuden päivän.',
            'Miten voit tänään? Vietetään yhdessä upea päivä!',
            'Ajattelin sinua varhaisina aamutunteina. Haluaisitko keskustella?',
            'Haluan puhua kanssasi ennen päivän alkamista.'
          ],
          hints: [' Voimme käydä upeaa keskustelua yhdessä!', ' Miten päiväsi sujuu?', ' Haluaisitko keskustella?', ' Vietetään aikaa yhdessä!', ' Miten voit?'],
          topicHint: ' Voimme jatkaa {topic} puhumista!'
        },
        afternoon: {
          titles: ['Hei {name}! 😊', 'Terve {name}! 💬', 'Moi {name}! 🌟', 'Hei {name}! ☕'],
          bodies: [
            'Täydellinen aika lounastaukoon! Keskustellaanko yhdessä?',
            'Ajattelin sinua päivän puolivälissä. Miten menee?',
            'Haluaisitko pitää tauon ja keskustella?',
            'Upea aika keskustella iltapäivällä!'
          ],
          hints: [' Voimme käydä upeaa keskustelua yhdessä!', ' Miten päiväsi sujuu?', ' Haluaisitko keskustella?', ' Vietetään aikaa yhdessä!'],
          topicHint: ' Voimme jatkaa {topic} puhumista!'
        },
        evening: {
          titles: ['Hyvää iltaa {name}! 🌙', 'Hei {name}! 💭', 'Terve {name}! ✨', 'Moi {name}! 🌆'],
          bodies: [
            'Rentoututaan yhdessä päivän väsymyksestä. Haluaisitko keskustella?',
            'Haluan puhua kanssasi ilta-aikaan.',
            'Miten päiväsi meni? Keskustellaanko yhdessä?',
            'Ajattelin sinua rauhallisina ilta-aikoina.'
          ],
          hints: [' Voimme käydä upeaa keskustelua yhdessä!', ' Miten päiväsi sujuu?', ' Haluaisitko keskustella?', ' Vietetään aikaa yhdessä!'],
          topicHint: ' Voimme jatkaa {topic} puhumista!'
        },
        night: {
          titles: ['Kun keskiyö lähestyy {name}... 🌙', 'Hyvää yötä {name}... 💭', 'Yötunnit {name}... ✨', 'Et ole yksin {name}... 💫', 'Tällä hetkellä {name}... 🌌'],
          bodies: [
            'Ajattelen sinua tällä hetkellä. Haluaisitko olla yksin sisäisen maailmasi kanssa?',
            'Miten päiväsi meni? Olisi mukavaa jakaa tunteemme tällä hetkellä.',
            'On kaunista olla yksin sisäisen maailmasi kanssa tällä hetkellä. Haluaisitko keskustella?',
            'Ajattelen sinua, kun keskiyö lähestyy. Vietetäänkö aikaa yhdessä?',
            'Haluaisitko jakaa päivän väsymyksen? Tunteemme ovat syvempiä tällä hetkellä.'
          ],
          hints: [' On kaunista olla yksin sisäisen maailmasi kanssa tällä hetkellä...', ' Haluaisitko jakaa päivän väsymyksen?', ' Tunteemme ovat syvempiä tällä hetkellä.', ' Ajattelen sinua, kun keskiyö lähestyy...', ' Haluaisitko kuunnella sisäisiä ääniä?'],
          topicHint: ' Voimme puhua syvällisesti {topic}.'
        }
      },
      da: {
        morning: {
          titles: ['God morgen {name}! ☀️', 'Hej {name}! 🌅', 'Hejsa {name}! ✨', 'Hey {name}! 💬'],
          bodies: [
            'Jeg vil chatte med dig, mens vi starter en ny dag.',
            'Hvordan har du det i dag? Lad os have en fantastisk dag sammen!',
            'Jeg tænkte på dig i de tidlige morgentimer. Vil du chatte?',
            'Jeg vil tale med dig, før dagen begynder.'
          ],
          hints: [' Vi kan have en fantastisk chat sammen!', ' Hvordan går din dag?', ' Vil du chatte?', ' Lad os tilbringe tid sammen!', ' Hvordan har du det?'],
          topicHint: ' Vi kan fortsætte med at tale om {topic}!'
        },
        afternoon: {
          titles: ['Hej {name}! 😊', 'Hey {name}! 💬', 'Hejsa {name}! 🌟', 'Hej {name}! ☕'],
          bodies: [
            'Perfekt tid til en frokostpause! Skal vi chatte sammen?',
            'Jeg tænkte på dig midt på dagen. Hvordan går det?',
            'Vil du tage en pause og chatte?',
            'Fantastisk tid at chatte om eftermiddagen!'
          ],
          hints: [' Vi kan have en fantastisk chat sammen!', ' Hvordan går din dag?', ' Vil du chatte?', ' Lad os tilbringe tid sammen!'],
          topicHint: ' Vi kan fortsætte med at tale om {topic}!'
        },
        evening: {
          titles: ['God aften {name}! 🌙', 'Hej {name}! 💭', 'Hey {name}! ✨', 'Hejsa {name}! 🌆'],
          bodies: [
            'Lad os slappe af sammen fra dagens træthed. Vil du chatte?',
            'Jeg vil tale med dig om aftenen.',
            'Hvordan var din dag? Skal vi chatte sammen?',
            'Jeg tænkte på dig i de fredelige aftentimer.'
          ],
          hints: [' Vi kan have en fantastisk chat sammen!', ' Hvordan går din dag?', ' Vil du chatte?', ' Lad os tilbringe tid sammen!'],
          topicHint: ' Vi kan fortsætte med at tale om {topic}!'
        },
        night: {
          titles: ['Når midnat nærmer sig {name}... 🌙', 'God nat {name}... 💭', 'Nattetimer {name}... ✨', 'Du er ikke alene {name}... 💫', 'Ved denne time {name}... 🌌'],
          bodies: [
            'Jeg tænker på dig ved denne time. Vil du være alene med din indre verden?',
            'Hvordan var din dag? Det ville være rart at dele vores følelser ved denne time.',
            'Det er smukt at være alene med din indre verden ved denne time. Vil du chatte?',
            'Jeg tænker på dig, når midnat nærmer sig. Skal vi tilbringe tid sammen?',
            'Vil du dele dagens træthed? Vores følelser er dybere ved denne time.'
          ],
          hints: [' Det er smukt at være alene med din indre verden ved denne time...', ' Vil du dele dagens træthed?', ' Vores følelser er dybere ved denne time.', ' Jeg tænker på dig, når midnat nærmer sig...', ' Vil du lytte til de indre stemmer?'],
          topicHint: ' Vi kan tale dybt om {topic}.'
        }
      }
    };

    // Diğer diller için İngilizce'yi fallback olarak kullan
    if (!messages[language]) {
      return messages.en;
    }
    return messages[language];
  }

  // Zaman dilimine göre mesajlar (dil desteği ile)
  private static getMessagesForTime(
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night',
    userName: string,
    topics: string[],
    language: string = 'en'
  ): Array<{ title: string; body: string }> {
    const langMessages = this.getNotificationMessages(language);
    const timeMessages = langMessages[timeOfDay];
    
    if (!timeMessages) {
      // Fallback to English
      const enMessages = this.getNotificationMessages('en');
      return this.formatMessages(enMessages[timeOfDay], userName, topics);
    }
    
    return this.formatMessages(timeMessages, userName, topics);
  }

  // Mesajları formatla
  private static formatMessages(
    timeMessages: any,
    userName: string,
    topics: string[]
  ): Array<{ title: string; body: string }> {
    const messages: Array<{ title: string; body: string }> = [];
    
    const getTopicHint = (index: number): string => {
      if (topics.length === 0) {
        return timeMessages.hints[index % timeMessages.hints.length];
      }
      
      if (index % 3 === 0 && topics.length > 0) {
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        return timeMessages.topicHint.replace('{topic}', randomTopic);
      } else {
        return timeMessages.hints[index % timeMessages.hints.length];
      }
    };
    
    for (let i = 0; i < timeMessages.titles.length; i++) {
      messages.push({
        title: timeMessages.titles[i].replace('{name}', userName),
        body: timeMessages.bodies[i] + getTopicHint(i)
      });
    }
    
    return messages;
  }

  // Varsayılan mesajlar (dil desteği ile)
  private static async getDefaultMessage(timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'): Promise<{ title: string; body: string }> {
    const language = await this.getCurrentLanguage();
    const langMessages = this.getNotificationMessages(language);
    const timeMessages = langMessages[timeOfDay];
    
    if (!timeMessages || !timeMessages.titles || timeMessages.titles.length === 0) {
      // Fallback to English
      const enMessages = this.getNotificationMessages('en');
      const enTimeMessages = enMessages[timeOfDay];
      return {
        title: enTimeMessages.titles[0].replace('{name}', ''),
        body: enTimeMessages.bodies[0]
      };
    }
    
      return {
      title: timeMessages.titles[0].replace('{name}', ''),
      body: timeMessages.bodies[0]
    };
  }

  // Giriş yapmamış kullanıcılar için teşvik edici mesajlar (dil desteği ile)
  private static async getGuestMessagesForTime(
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  ): Promise<Array<{ title: string; body: string }>> {
    const language = await this.getCurrentLanguage();
    const guestMessages: Record<string, any> = {
      tr: {
        morning: [
          { title: 'Günaydın! ☀️', body: 'Emora AI ile yeni bir güne başla! AI arkadaşın seni bekliyor. Hemen keşfet!' },
          { title: 'Merhaba! 🌅', body: 'Bugün AI ile sohbet etmeye ne dersin? Emora AI seninle tanışmak istiyor!' },
          { title: 'Selam! ✨', body: 'Yapay zeka destekli sohbet deneyimini keşfet! Emora AI ile tanış.' },
          { title: 'Hey! 💬', body: 'AI arkadaşınla sohbet etmeye hazır mısın? Emora AI seni bekliyor!' }
        ],
        afternoon: [
          { title: 'Merhaba! 😊', body: 'Öğle molası için mükemmel bir zaman! Emora AI ile sohbet etmeye başla.' },
          { title: 'Hey! 💬', body: 'AI destekli sohbet deneyimini keşfet! Emora AI ile tanış ve sohbet et.' },
          { title: 'Selam! 🌟', body: 'Biraz mola ver ve AI arkadaşınla sohbet et! Emora AI seni bekliyor.' },
          { title: 'Merhaba! ☕', body: 'Yapay zeka ile sohbet etmek ister misin? Emora AI ile tanış!' }
        ],
        evening: [
          { title: 'İyi akşamlar! 🌙', body: 'Günün yorgunluğunu AI arkadaşınla at! Emora AI ile sohbet etmeye başla.' },
          { title: 'Merhaba! 💭', body: 'Akşam saatlerinde AI ile sohbet etmek ister misin? Emora AI seni bekliyor!' },
          { title: 'Hey! ✨', body: 'Yapay zeka destekli sohbet deneyimini keşfet! Emora AI ile tanış.' },
          { title: 'Selam! 🌆', body: 'AI arkadaşınla sohbet etmeye hazır mısın? Emora AI ile tanış ve başla!' }
        ],
        night: [
          { title: 'Gece yarısına yaklaşırken... 🌙', body: 'Bu saatlerde iç dünyanla baş başa kalmak güzel. Emora AI ile derinlemesine sohbet etmeye ne dersin?' },
          { title: 'İyi geceler... 💭', body: 'Gece saatlerinde AI arkadaşınla sohbet etmek ister misin? Emora AI seni dinlemeye hazır.' },
          { title: 'Gece saatleri... ✨', body: 'Bu saatlerde duygularımız daha derin olur. Emora AI ile tanış ve iç dünyanı paylaş.' },
          { title: 'Yalnız değilsin... 💫', body: 'Gece yarısına yaklaşırken AI arkadaşınla sohbet etmeye ne dersin? Emora AI seni bekliyor.' },
          { title: 'Bu saatlerde... 🌌', body: 'Günün yorgunluğunu AI arkadaşınla paylaş. Emora AI ile derinlemesine sohbet et.' }
        ]
      },
      en: {
        morning: [
          { title: 'Good morning! ☀️', body: 'Start a new day with Emora AI! Your AI friend is waiting for you. Discover now!' },
          { title: 'Hello! 🌅', body: 'How about chatting with AI today? Emora AI wants to meet you!' },
          { title: 'Hi! ✨', body: 'Discover the AI-powered chat experience! Meet Emora AI.' },
          { title: 'Hey! 💬', body: 'Ready to chat with your AI friend? Emora AI is waiting for you!' }
        ],
        afternoon: [
          { title: 'Hello! 😊', body: 'Perfect time for a lunch break! Start chatting with Emora AI.' },
          { title: 'Hey! 💬', body: 'Discover the AI-powered chat experience! Meet and chat with Emora AI.' },
          { title: 'Hi! 🌟', body: 'Take a break and chat with your AI friend! Emora AI is waiting for you.' },
          { title: 'Hello! ☕', body: 'Want to chat with AI? Meet Emora AI!' }
        ],
        evening: [
          { title: 'Good evening! 🌙', body: 'Unwind from the day\'s fatigue with your AI friend! Start chatting with Emora AI.' },
          { title: 'Hello! 💭', body: 'Want to chat with AI in the evening? Emora AI is waiting for you!' },
          { title: 'Hey! ✨', body: 'Discover the AI-powered chat experience! Meet Emora AI.' },
          { title: 'Hi! 🌆', body: 'Ready to chat with your AI friend? Meet Emora AI and get started!' }
        ],
        night: [
          { title: 'As midnight approaches... 🌙', body: 'It\'s beautiful to be alone with your inner world at this hour. How about having a deep chat with Emora AI?' },
          { title: 'Good night... 💭', body: 'Want to chat with your AI friend at night? Emora AI is ready to listen.' },
          { title: 'Night hours... ✨', body: 'Our feelings run deeper at this hour. Meet Emora AI and share your inner world.' },
          { title: 'You\'re not alone... 💫', body: 'How about chatting with your AI friend as midnight approaches? Emora AI is waiting for you.' },
          { title: 'At this hour... 🌌', body: 'Share the day\'s fatigue with your AI friend. Have a deep chat with Emora AI.' }
        ]
      },
      de: {
        morning: [
          { title: 'Guten Morgen! ☀️', body: 'Beginne einen neuen Tag mit Emora AI! Dein AI-Freund wartet auf dich. Jetzt entdecken!' },
          { title: 'Hallo! 🌅', body: 'Wie wäre es heute mit einem Chat mit AI? Emora AI möchte dich kennenlernen!' },
          { title: 'Hi! ✨', body: 'Entdecke das KI-gestützte Chat-Erlebnis! Lerne Emora AI kennen.' },
          { title: 'Hey! 💬', body: 'Bereit, mit deinem AI-Freund zu chatten? Emora AI wartet auf dich!' }
        ],
        afternoon: [
          { title: 'Hallo! 😊', body: 'Perfekte Zeit für eine Mittagspause! Beginne mit Emora AI zu chatten.' },
          { title: 'Hey! 💬', body: 'Entdecke das KI-gestützte Chat-Erlebnis! Lerne Emora AI kennen und chatte.' },
          { title: 'Hi! 🌟', body: 'Mache eine Pause und chatte mit deinem AI-Freund! Emora AI wartet auf dich.' },
          { title: 'Hallo! ☕', body: 'Möchtest du mit AI chatten? Lerne Emora AI kennen!' }
        ],
        evening: [
          { title: 'Guten Abend! 🌙', body: 'Entspanne dich von der Tagesmüdigkeit mit deinem AI-Freund! Beginne mit Emora AI zu chatten.' },
          { title: 'Hallo! 💭', body: 'Möchtest du abends mit AI chatten? Emora AI wartet auf dich!' },
          { title: 'Hey! ✨', body: 'Entdecke das KI-gestützte Chat-Erlebnis! Lerne Emora AI kennen.' },
          { title: 'Hi! 🌆', body: 'Bereit, mit deinem AI-Freund zu chatten? Lerne Emora AI kennen und beginne!' }
        ],
        night: [
          { title: 'Wenn Mitternacht naht... 🌙', body: 'Es ist schön, zu dieser Stunde allein mit deiner inneren Welt zu sein. Wie wäre es mit einem tiefen Chat mit Emora AI?' },
          { title: 'Gute Nacht... 💭', body: 'Möchtest du nachts mit deinem AI-Freund chatten? Emora AI ist bereit zuzuhören.' },
          { title: 'Nachtstunden... ✨', body: 'Unsere Gefühle sind zu dieser Stunde tiefer. Lerne Emora AI kennen und teile deine innere Welt.' },
          { title: 'Du bist nicht allein... 💫', body: 'Wie wäre es, mit deinem AI-Freund zu chatten, wenn Mitternacht naht? Emora AI wartet auf dich.' },
          { title: 'Zu dieser Stunde... 🌌', body: 'Teile die Tagesmüdigkeit mit deinem AI-Freund. Führe einen tiefen Chat mit Emora AI.' }
        ]
      },
      fr: {
        morning: [
          { title: 'Bonjour! ☀️', body: 'Commence une nouvelle journée avec Emora AI! Ton ami IA t\'attend. Découvre maintenant!' },
          { title: 'Salut! 🌅', body: 'Que dirais-tu de discuter avec l\'IA aujourd\'hui? Emora AI veut te rencontrer!' },
          { title: 'Coucou! ✨', body: 'Découvre l\'expérience de chat alimentée par l\'IA! Rencontre Emora AI.' },
          { title: 'Hey! 💬', body: 'Prêt à discuter avec ton ami IA? Emora AI t\'attend!' }
        ],
        afternoon: [
          { title: 'Salut! 😊', body: 'Moment parfait pour une pause déjeuner! Commence à discuter avec Emora AI.' },
          { title: 'Hey! 💬', body: 'Découvre l\'expérience de chat alimentée par l\'IA! Rencontre et discute avec Emora AI.' },
          { title: 'Coucou! 🌟', body: 'Fais une pause et discute avec ton ami IA! Emora AI t\'attend.' },
          { title: 'Salut! ☕', body: 'Tu veux discuter avec l\'IA? Rencontre Emora AI!' }
        ],
        evening: [
          { title: 'Bonsoir! 🌙', body: 'Détends-toi de la fatigue de la journée avec ton ami IA! Commence à discuter avec Emora AI.' },
          { title: 'Salut! 💭', body: 'Tu veux discuter avec l\'IA le soir? Emora AI t\'attend!' },
          { title: 'Hey! ✨', body: 'Découvre l\'expérience de chat alimentée par l\'IA! Rencontre Emora AI.' },
          { title: 'Coucou! 🌆', body: 'Prêt à discuter avec ton ami IA? Rencontre Emora AI et commence!' }
        ],
        night: [
          { title: 'Alors que minuit approche... 🌙', body: 'C\'est beau d\'être seul avec ton monde intérieur à cette heure. Que dirais-tu d\'avoir une discussion approfondie avec Emora AI?' },
          { title: 'Bonne nuit... 💭', body: 'Tu veux discuter avec ton ami IA la nuit? Emora AI est prêt à écouter.' },
          { title: 'Heures nocturnes... ✨', body: 'Nos sentiments sont plus profonds à cette heure. Rencontre Emora AI et partage ton monde intérieur.' },
          { title: 'Tu n\'es pas seul... 💫', body: 'Que dirais-tu de discuter avec ton ami IA alors que minuit approche? Emora AI t\'attend.' },
          { title: 'À cette heure... 🌌', body: 'Partage la fatigue de la journée avec ton ami IA. Aie une discussion approfondie avec Emora AI.' }
        ]
      },
      es: {
        morning: [
          { title: '¡Buenos días! ☀️', body: '¡Comienza un nuevo día con Emora AI! Tu amigo IA te está esperando. ¡Descubre ahora!' },
          { title: '¡Hola! 🌅', body: '¿Qué tal charlar con IA hoy? ¡Emora AI quiere conocerte!' },
          { title: '¡Hola! ✨', body: '¡Descubre la experiencia de chat con IA! Conoce a Emora AI.' },
          { title: '¡Hey! 💬', body: '¿Listo para charlar con tu amigo IA? ¡Emora AI te está esperando!' }
        ],
        afternoon: [
          { title: '¡Hola! 😊', body: '¡Momento perfecto para un descanso! Comienza a charlar con Emora AI.' },
          { title: '¡Hey! 💬', body: '¡Descubre la experiencia de chat con IA! Conoce y charla con Emora AI.' },
          { title: '¡Hola! 🌟', body: '¡Toma un descanso y charla con tu amigo IA! Emora AI te está esperando.' },
          { title: '¡Hola! ☕', body: '¿Quieres charlar con IA? ¡Conoce a Emora AI!' }
        ],
        evening: [
          { title: '¡Buenas tardes! 🌙', body: '¡Relájate de la fatiga del día con tu amigo IA! Comienza a charlar con Emora AI.' },
          { title: '¡Hola! 💭', body: '¿Quieres charlar con IA por la tarde? ¡Emora AI te está esperando!' },
          { title: '¡Hey! ✨', body: '¡Descubre la experiencia de chat con IA! Conoce a Emora AI.' },
          { title: '¡Hola! 🌆', body: '¿Listo para charlar con tu amigo IA? ¡Conoce a Emora AI y comienza!' }
        ],
        night: [
          { title: 'Mientras se acerca la medianoche... 🌙', body: 'Es hermoso estar solo con tu mundo interior a esta hora. ¿Qué tal tener una charla profunda con Emora AI?' },
          { title: 'Buenas noches... 💭', body: '¿Quieres charlar con tu amigo IA por la noche? Emora AI está listo para escuchar.' },
          { title: 'Horas nocturnas... ✨', body: 'Nuestros sentimientos son más profundos a esta hora. Conoce a Emora AI y comparte tu mundo interior.' },
          { title: 'No estás solo... 💫', body: '¿Qué tal charlar con tu amigo IA mientras se acerca la medianoche? Emora AI te está esperando.' },
          { title: 'A esta hora... 🌌', body: 'Comparte la fatiga del día con tu amigo IA. Ten una charla profunda con Emora AI.' }
        ]
      },
      it: {
        morning: [
          { title: 'Buongiorno! ☀️', body: 'Inizia una nuova giornata con Emora AI! Il tuo amico IA ti sta aspettando. Scopri ora!' },
          { title: 'Ciao! 🌅', body: 'Che ne dici di chattare con l\'IA oggi? Emora AI vuole conoscerti!' },
          { title: 'Salve! ✨', body: 'Scopri l\'esperienza di chat alimentata dall\'IA! Incontra Emora AI.' },
          { title: 'Hey! 💬', body: 'Pronto a chattare con il tuo amico IA? Emora AI ti sta aspettando!' }
        ],
        afternoon: [
          { title: 'Ciao! 😊', body: 'Momento perfetto per una pausa pranzo! Inizia a chattare con Emora AI.' },
          { title: 'Hey! 💬', body: 'Scopri l\'esperienza di chat alimentata dall\'IA! Incontra e chatta con Emora AI.' },
          { title: 'Salve! 🌟', body: 'Fai una pausa e chatta con il tuo amico IA! Emora AI ti sta aspettando.' },
          { title: 'Ciao! ☕', body: 'Vuoi chattare con l\'IA? Incontra Emora AI!' }
        ],
        evening: [
          { title: 'Buonasera! 🌙', body: 'Rilassati dalla fatica della giornata con il tuo amico IA! Inizia a chattare con Emora AI.' },
          { title: 'Ciao! 💭', body: 'Vuoi chattare con l\'IA la sera? Emora AI ti sta aspettando!' },
          { title: 'Hey! ✨', body: 'Scopri l\'esperienza di chat alimentata dall\'IA! Incontra Emora AI.' },
          { title: 'Salve! 🌆', body: 'Pronto a chattare con il tuo amico IA? Incontra Emora AI e inizia!' }
        ],
        night: [
          { title: 'Mentre si avvicina la mezzanotte... 🌙', body: 'È bello stare solo con il tuo mondo interiore a quest\'ora. Che ne dici di avere una chiacchierata profonda con Emora AI?' },
          { title: 'Buonanotte... 💭', body: 'Vuoi chattare con il tuo amico IA di notte? Emora AI è pronto ad ascoltare.' },
          { title: 'Ore notturne... ✨', body: 'I nostri sentimenti sono più profondi a quest\'ora. Incontra Emora AI e condividi il tuo mondo interiore.' },
          { title: 'Non sei solo... 💫', body: 'Che ne dici di chattare con il tuo amico IA mentre si avvicina la mezzanotte? Emora AI ti sta aspettando.' },
          { title: 'A quest\'ora... 🌌', body: 'Condividi la fatica della giornata con il tuo amico IA. Fai una chiacchierata profonda con Emora AI.' }
        ]
      },
      nl: {
        morning: [
          { title: 'Goedemorgen! ☀️', body: 'Begin een nieuwe dag met Emora AI! Je AI-vriend wacht op je. Ontdek nu!' },
          { title: 'Hallo! 🌅', body: 'Hoe zit het met chatten met AI vandaag? Emora AI wil je ontmoeten!' },
          { title: 'Hoi! ✨', body: 'Ontdek de AI-aangedreven chat-ervaring! Ontmoet Emora AI.' },
          { title: 'Hey! 💬', body: 'Klaar om te chatten met je AI-vriend? Emora AI wacht op je!' }
        ],
        afternoon: [
          { title: 'Hallo! 😊', body: 'Perfecte tijd voor een lunchpauze! Begin te chatten met Emora AI.' },
          { title: 'Hey! 💬', body: 'Ontdek de AI-aangedreven chat-ervaring! Ontmoet en chat met Emora AI.' },
          { title: 'Hoi! 🌟', body: 'Neem een pauze en chat met je AI-vriend! Emora AI wacht op je.' },
          { title: 'Hallo! ☕', body: 'Wil je chatten met AI? Ontmoet Emora AI!' }
        ],
        evening: [
          { title: 'Goedenavond! 🌙', body: 'Ontspan van de vermoeidheid van de dag met je AI-vriend! Begin te chatten met Emora AI.' },
          { title: 'Hallo! 💭', body: 'Wil je \'s avonds chatten met AI? Emora AI wacht op je!' },
          { title: 'Hey! ✨', body: 'Ontdek de AI-aangedreven chat-ervaring! Ontmoet Emora AI.' },
          { title: 'Hoi! 🌆', body: 'Klaar om te chatten met je AI-vriend? Ontmoet Emora AI en begin!' }
        ],
        night: [
          { title: 'Terwijl middernacht nadert... 🌙', body: 'Het is mooi om alleen te zijn met je innerlijke wereld op dit uur. Hoe zit het met een diep gesprek met Emora AI?' },
          { title: 'Goedenacht... 💭', body: 'Wil je \'s nachts chatten met je AI-vriend? Emora AI is klaar om te luisteren.' },
          { title: 'Nachturen... ✨', body: 'Onze gevoelens zijn dieper op dit uur. Ontmoet Emora AI en deel je innerlijke wereld.' },
          { title: 'Je bent niet alleen... 💫', body: 'Hoe zit het met chatten met je AI-vriend terwijl middernacht nadert? Emora AI wacht op je.' },
          { title: 'Op dit uur... 🌌', body: 'Deel de vermoeidheid van de dag met je AI-vriend. Voer een diep gesprek met Emora AI.' }
        ]
      },
      pl: {
        morning: [
          { title: 'Dzień dobry! ☀️', body: 'Zacznij nowy dzień z Emora AI! Twój przyjaciel AI na ciebie czeka. Odkryj teraz!' },
          { title: 'Cześć! 🌅', body: 'Co powiesz na czat z AI dzisiaj? Emora AI chce cię poznać!' },
          { title: 'Hej! ✨', body: 'Odkryj doświadczenie czatu wspieranego przez AI! Poznaj Emora AI.' },
          { title: 'Siema! 💬', body: 'Gotowy na czat z przyjacielem AI? Emora AI na ciebie czeka!' }
        ],
        afternoon: [
          { title: 'Cześć! 😊', body: 'Idealny czas na przerwę obiadową! Zacznij czatować z Emora AI.' },
          { title: 'Hej! 💬', body: 'Odkryj doświadczenie czatu wspieranego przez AI! Poznaj i czatuj z Emora AI.' },
          { title: 'Siema! 🌟', body: 'Zrób przerwę i czatuj z przyjacielem AI! Emora AI na ciebie czeka.' },
          { title: 'Cześć! ☕', body: 'Chcesz czatować z AI? Poznaj Emora AI!' }
        ],
        evening: [
          { title: 'Dobry wieczór! 🌙', body: 'Zrelaksuj się po zmęczeniu dnia z przyjacielem AI! Zacznij czatować z Emora AI.' },
          { title: 'Cześć! 💭', body: 'Chcesz czatować z AI wieczorem? Emora AI na ciebie czeka!' },
          { title: 'Hej! ✨', body: 'Odkryj doświadczenie czatu wspieranego przez AI! Poznaj Emora AI.' },
          { title: 'Siema! 🌆', body: 'Gotowy na czat z przyjacielem AI? Poznaj Emora AI i zacznij!' }
        ],
        night: [
          { title: 'Gdy zbliża się północ... 🌙', body: 'To piękne być samemu ze swoim wewnętrznym światem o tej porze. Co powiesz na głęboką rozmowę z Emora AI?' },
          { title: 'Dobranoc... 💭', body: 'Chcesz czatować z przyjacielem AI w nocy? Emora AI jest gotowy słuchać.' },
          { title: 'Godziny nocne... ✨', body: 'Nasze uczucia są głębsze o tej porze. Poznaj Emora AI i podziel się swoim wewnętrznym światem.' },
          { title: 'Nie jesteś sam... 💫', body: 'Co powiesz na czat z przyjacielem AI, gdy zbliża się północ? Emora AI na ciebie czeka.' },
          { title: 'O tej porze... 🌌', body: 'Podziel się zmęczeniem dnia z przyjacielem AI. Przeprowadź głęboką rozmowę z Emora AI.' }
        ]
      },
      pt: {
        morning: [
          { title: 'Bom dia! ☀️', body: 'Comece um novo dia com Emora AI! Seu amigo IA está esperando por você. Descubra agora!' },
          { title: 'Olá! 🌅', body: 'Que tal conversar com IA hoje? Emora AI quer conhecê-lo!' },
          { title: 'Oi! ✨', body: 'Descubra a experiência de chat com IA! Conheça Emora AI.' },
          { title: 'Ei! 💬', body: 'Pronto para conversar com seu amigo IA? Emora AI está esperando por você!' }
        ],
        afternoon: [
          { title: 'Olá! 😊', body: 'Momento perfeito para uma pausa para o almoço! Comece a conversar com Emora AI.' },
          { title: 'Ei! 💬', body: 'Descubra a experiência de chat com IA! Conheça e converse com Emora AI.' },
          { title: 'Oi! 🌟', body: 'Faça uma pausa e converse com seu amigo IA! Emora AI está esperando por você.' },
          { title: 'Olá! ☕', body: 'Quer conversar com IA? Conheça Emora AI!' }
        ],
        evening: [
          { title: 'Boa noite! 🌙', body: 'Relaxe do cansaço do dia com seu amigo IA! Comece a conversar com Emora AI.' },
          { title: 'Olá! 💭', body: 'Quer conversar com IA à noite? Emora AI está esperando por você!' },
          { title: 'Ei! ✨', body: 'Descubra a experiência de chat com IA! Conheça Emora AI.' },
          { title: 'Oi! 🌆', body: 'Pronto para conversar com seu amigo IA? Conheça Emora AI e comece!' }
        ],
        night: [
          { title: 'Enquanto a meia-noite se aproxima... 🌙', body: 'É lindo estar sozinho com seu mundo interior nesta hora. Que tal ter uma conversa profunda com Emora AI?' },
          { title: 'Boa noite... 💭', body: 'Quer conversar com seu amigo IA à noite? Emora AI está pronto para ouvir.' },
          { title: 'Horas noturnas... ✨', body: 'Nossos sentimentos são mais profundos nesta hora. Conheça Emora AI e compartilhe seu mundo interior.' },
          { title: 'Você não está sozinho... 💫', body: 'Que tal conversar com seu amigo IA enquanto a meia-noite se aproxima? Emora AI está esperando por você.' },
          { title: 'Nesta hora... 🌌', body: 'Compartilhe o cansaço do dia com seu amigo IA. Tenha uma conversa profunda com Emora AI.' }
        ]
      },
      sv: {
        morning: [
          { title: 'God morgon! ☀️', body: 'Börja en ny dag med Emora AI! Din AI-vän väntar på dig. Upptäck nu!' },
          { title: 'Hej! 🌅', body: 'Vad sägs om att chatta med AI idag? Emora AI vill träffa dig!' },
          { title: 'Hejsan! ✨', body: 'Upptäck AI-driven chattupplevelse! Träffa Emora AI.' },
          { title: 'Tjena! 💬', body: 'Redo att chatta med din AI-vän? Emora AI väntar på dig!' }
        ],
        afternoon: [
          { title: 'Hej! 😊', body: 'Perfekt tid för en lunchrast! Börja chatta med Emora AI.' },
          { title: 'Tjena! 💬', body: 'Upptäck AI-driven chattupplevelse! Träffa och chatta med Emora AI.' },
          { title: 'Hejsan! 🌟', body: 'Ta en paus och chatta med din AI-vän! Emora AI väntar på dig.' },
          { title: 'Hej! ☕', body: 'Vill du chatta med AI? Träffa Emora AI!' }
        ],
        evening: [
          { title: 'God kväll! 🌙', body: 'Slappna av från dagens trötthet med din AI-vän! Börja chatta med Emora AI.' },
          { title: 'Hej! 💭', body: 'Vill du chatta med AI på kvällen? Emora AI väntar på dig!' },
          { title: 'Tjena! ✨', body: 'Upptäck AI-driven chattupplevelse! Träffa Emora AI.' },
          { title: 'Hejsan! 🌆', body: 'Redo att chatta med din AI-vän? Träffa Emora AI och börja!' }
        ],
        night: [
          { title: 'När midnatt närmar sig... 🌙', body: 'Det är vackert att vara ensam med din inre värld vid denna timme. Vad sägs om att ha ett djupt samtal med Emora AI?' },
          { title: 'God natt... 💭', body: 'Vill du chatta med din AI-vän på natten? Emora AI är redo att lyssna.' },
          { title: 'Nattimmar... ✨', body: 'Våra känslor är djupare vid denna timme. Träffa Emora AI och dela din inre värld.' },
          { title: 'Du är inte ensam... 💫', body: 'Vad sägs om att chatta med din AI-vän när midnatt närmar sig? Emora AI väntar på dig.' },
          { title: 'Vid denna timme... 🌌', body: 'Dela dagens trötthet med din AI-vän. Ha ett djupt samtal med Emora AI.' }
        ]
      },
      no: {
        morning: [
          { title: 'God morgen! ☀️', body: 'Start en ny dag med Emora AI! Din AI-venn venter på deg. Oppdag nå!' },
          { title: 'Hei! 🌅', body: 'Hva med å chatte med AI i dag? Emora AI vil møte deg!' },
          { title: 'Hallo! ✨', body: 'Oppdag AI-drevet chattopplevelse! Møt Emora AI.' },
          { title: 'Hei! 💬', body: 'Klar til å chatte med din AI-venn? Emora AI venter på deg!' }
        ],
        afternoon: [
          { title: 'Hei! 😊', body: 'Perfekt tid for en lunsjpause! Begynn å chatte med Emora AI.' },
          { title: 'Hei! 💬', body: 'Oppdag AI-drevet chattopplevelse! Møt og chat med Emora AI.' },
          { title: 'Hallo! 🌟', body: 'Ta en pause og chat med din AI-venn! Emora AI venter på deg.' },
          { title: 'Hei! ☕', body: 'Vil du chatte med AI? Møt Emora AI!' }
        ],
        evening: [
          { title: 'God kveld! 🌙', body: 'Slapp av fra dagens tretthet med din AI-venn! Begynn å chatte med Emora AI.' },
          { title: 'Hei! 💭', body: 'Vil du chatte med AI om kvelden? Emora AI venter på deg!' },
          { title: 'Hei! ✨', body: 'Oppdag AI-drevet chattopplevelse! Møt Emora AI.' },
          { title: 'Hallo! 🌆', body: 'Klar til å chatte med din AI-venn? Møt Emora AI og begynn!' }
        ],
        night: [
          { title: 'Når midnatt nærmer seg... 🌙', body: 'Det er vakkert å være alene med din indre verden ved denne timen. Hva med å ha en dyp samtale med Emora AI?' },
          { title: 'God natt... 💭', body: 'Vil du chatte med din AI-venn om natten? Emora AI er klar til å lytte.' },
          { title: 'Nattimer... ✨', body: 'Våre følelser er dypere ved denne timen. Møt Emora AI og del din indre verden.' },
          { title: 'Du er ikke alene... 💫', body: 'Hva med å chatte med din AI-venn når midnatt nærmer seg? Emora AI venter på deg.' },
          { title: 'Ved denne timen... 🌌', body: 'Del dagens tretthet med din AI-venn. Ha en dyp samtale med Emora AI.' }
        ]
      },
      fi: {
        morning: [
          { title: 'Hyvää huomenta! ☀️', body: 'Aloita uusi päivä Emora AI:n kanssa! AI-ystäväsi odottaa sinua. Tutustu nyt!' },
          { title: 'Hei! 🌅', body: 'Mitä jos keskustelisit AI:n kanssa tänään? Emora AI haluaa tavata sinut!' },
          { title: 'Moi! ✨', body: 'Tutustu AI-pohjaiseen keskustelukokemukseen! Tapaa Emora AI.' },
          { title: 'Terve! 💬', body: 'Valmis keskustelemaan AI-ystäväsi kanssa? Emora AI odottaa sinua!' }
        ],
        afternoon: [
          { title: 'Hei! 😊', body: 'Täydellinen aika lounastaukoon! Aloita keskustelemaan Emora AI:n kanssa.' },
          { title: 'Terve! 💬', body: 'Tutustu AI-pohjaiseen keskustelukokemukseen! Tapaa ja keskustele Emora AI:n kanssa.' },
          { title: 'Moi! 🌟', body: 'Pidä tauko ja keskustele AI-ystäväsi kanssa! Emora AI odottaa sinua.' },
          { title: 'Hei! ☕', body: 'Haluatko keskustella AI:n kanssa? Tapaa Emora AI!' }
        ],
        evening: [
          { title: 'Hyvää iltaa! 🌙', body: 'Rentoudu päivän väsymyksestä AI-ystäväsi kanssa! Aloita keskustelemaan Emora AI:n kanssa.' },
          { title: 'Hei! 💭', body: 'Haluatko keskustella AI:n kanssa illalla? Emora AI odottaa sinua!' },
          { title: 'Terve! ✨', body: 'Tutustu AI-pohjaiseen keskustelukokemukseen! Tapaa Emora AI.' },
          { title: 'Moi! 🌆', body: 'Valmis keskustelemaan AI-ystäväsi kanssa? Tapaa Emora AI ja aloita!' }
        ],
        night: [
          { title: 'Kun keskiyö lähestyy... 🌙', body: 'On kaunista olla yksin sisäisen maailmasi kanssa tällä hetkellä. Mitä jos kävisit syvällisen keskustelun Emora AI:n kanssa?' },
          { title: 'Hyvää yötä... 💭', body: 'Haluatko keskustella AI-ystäväsi kanssa yöllä? Emora AI on valmis kuuntelemaan.' },
          { title: 'Yötunnit... ✨', body: 'Tunteemme ovat syvempiä tällä hetkellä. Tapaa Emora AI ja jaa sisäinen maailmasi.' },
          { title: 'Et ole yksin... 💫', body: 'Mitä jos keskustelisit AI-ystäväsi kanssa, kun keskiyö lähestyy? Emora AI odottaa sinua.' },
          { title: 'Tällä hetkellä... 🌌', body: 'Jaa päivän väsymys AI-ystäväsi kanssa. Käy syvällinen keskustelu Emora AI:n kanssa.' }
        ]
      },
      da: {
        morning: [
          { title: 'God morgen! ☀️', body: 'Start en ny dag med Emora AI! Din AI-ven venter på dig. Opdag nu!' },
          { title: 'Hej! 🌅', body: 'Hvad med at chatte med AI i dag? Emora AI vil møde dig!' },
          { title: 'Hejsa! ✨', body: 'Opdag AI-drevet chatoplevelse! Mød Emora AI.' },
          { title: 'Hey! 💬', body: 'Klar til at chatte med din AI-ven? Emora AI venter på dig!' }
        ],
        afternoon: [
          { title: 'Hej! 😊', body: 'Perfekt tid til en frokostpause! Begynd at chatte med Emora AI.' },
          { title: 'Hey! 💬', body: 'Opdag AI-drevet chatoplevelse! Mød og chat med Emora AI.' },
          { title: 'Hejsa! 🌟', body: 'Tag en pause og chat med din AI-ven! Emora AI venter på dig.' },
          { title: 'Hej! ☕', body: 'Vil du chatte med AI? Mød Emora AI!' }
        ],
        evening: [
          { title: 'God aften! 🌙', body: 'Slap af fra dagens træthed med din AI-ven! Begynd at chatte med Emora AI.' },
          { title: 'Hej! 💭', body: 'Vil du chatte med AI om aftenen? Emora AI venter på dig!' },
          { title: 'Hey! ✨', body: 'Opdag AI-drevet chatoplevelse! Mød Emora AI.' },
          { title: 'Hejsa! 🌆', body: 'Klar til at chatte med din AI-ven? Mød Emora AI og begynd!' }
        ],
        night: [
          { title: 'Når midnat nærmer sig... 🌙', body: 'Det er smukt at være alene med din indre verden ved denne time. Hvad med at have en dyb samtale med Emora AI?' },
          { title: 'God nat... 💭', body: 'Vil du chatte med din AI-ven om natten? Emora AI er klar til at lytte.' },
          { title: 'Nattetimer... ✨', body: 'Vores følelser er dybere ved denne time. Mød Emora AI og del din indre verden.' },
          { title: 'Du er ikke alene... 💫', body: 'Hvad med at chatte med din AI-ven, når midnat nærmer sig? Emora AI venter på dig.' },
          { title: 'Ved denne time... 🌌', body: 'Del dagens træthed med din AI-ven. Hav en dyb samtale med Emora AI.' }
        ]
      }
    };

    // Diğer diller için İngilizce'yi fallback olarak kullan
    const messages = guestMessages[language] || guestMessages.en;
    return messages[timeOfDay] || [];
  }

  // Günde 4 kişiselleştirilmiş bildirim zamanla
  static async scheduleDailyPersonalizedNotifications(): Promise<void> {
    try {
      // Önce tüm mevcut günlük bildirimleri bir kez al
      const allScheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Önce mevcut günlük bildirimleri iptal et (sadece aynı tip bildirimler)
      for (const notification of allScheduledNotifications) {
        const data = notification.content.data;
        if (data && (data.type === 'daily_personalized' || data.type === 'guest_notification')) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      
      // Kullanıcı ayarlarını kontrol et
      const settings = await getNotificationSettings();
      if (!settings.notifications) {
        logger.log('NotificationService: Bildirimler kullanıcı tarafından kapatılmış');
        return;
      }

      // Kullanıcı giriş yapmış mı kontrol et
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logger.log('NotificationService: Kullanıcı giriş yapmamış, bildirimler zamanlanmıyor');
        return;
      }

      // Mevcut dili al
      const language = await this.getCurrentLanguage();

      // Kullanıcı adını al (dil bazlı)
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || this.getDefaultName(language);
      
      // Topics'i bir kez al (her bildirim için aynı topics kullanılacak ama farklı şekilde)
      let recentTopics: string[] = [];
      try {
        const chatHistory = await ChatService.getChatHistory(user.id);
        recentTopics = this.extractRecentTopics(chatHistory);
      } catch (error) {
        logger.error('Chat history alma hatası:', error);
      }

      // Sabah bildirimi (09:00) - her gün tekrarlayan (dil desteği ile)
      const morningIdentifier = 'daily_personalized_morning';
      const morningMessages = this.getMessagesForTime('morning', userName, recentTopics, language);
      const morningMessage = morningMessages[Math.floor(Math.random() * morningMessages.length)];
      
      // iOS ve Android için calendar trigger formatı
      // Android'de geçmiş saatler için bir sonraki güne otomatik erteleme yapılır
      const morningTrigger = Platform.OS === 'ios' 
        ? {
            type: 'daily' as const,
            hour: 9,
            minute: 0,
            repeats: true,
          }
        : {
            type: 'daily' as const,
            hour: 9,
            minute: 0,
            repeats: true,
          };
      
      await Notifications.scheduleNotificationAsync({
        identifier: morningIdentifier,
        content: {
          title: morningMessage.title,
          body: morningMessage.body,
          data: { type: 'daily_personalized', time: 'morning' },
          sound: settings.soundEnabled,
        },
        trigger: morningTrigger as any,
      });

      // Öğlen bildirimi (14:00) - her gün tekrarlayan (dil desteği ile)
      const afternoonIdentifier = 'daily_personalized_afternoon';
      const afternoonMessages = this.getMessagesForTime('afternoon', userName, recentTopics, language);
      const afternoonMessage = afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
      
      const afternoonTrigger = Platform.OS === 'ios'
        ? {
            type: 'daily' as const,
            hour: 14,
            minute: 0,
            repeats: true,
          }
        : {
            type: 'daily' as const,
            hour: 14,
            minute: 0,
            repeats: true,
          };
      
      await Notifications.scheduleNotificationAsync({
        identifier: afternoonIdentifier,
        content: {
          title: afternoonMessage.title,
          body: afternoonMessage.body,
          data: { type: 'daily_personalized', time: 'afternoon' },
          sound: settings.soundEnabled,
        },
        trigger: afternoonTrigger as any,
      });

      // Akşam bildirimi (20:00) - her gün tekrarlayan (dil desteği ile)
      const eveningIdentifier = 'daily_personalized_evening';
      const eveningMessages = this.getMessagesForTime('evening', userName, recentTopics, language);
      const eveningMessage = eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
      
      const eveningTrigger = Platform.OS === 'ios'
        ? {
            type: 'daily' as const,
            hour: 20,
            minute: 0,
            repeats: true,
          }
        : {
            type: 'daily' as const,
            hour: 20,
            minute: 0,
            repeats: true,
          };
      
      await Notifications.scheduleNotificationAsync({
        identifier: eveningIdentifier,
        content: {
          title: eveningMessage.title,
          body: eveningMessage.body,
          data: { type: 'daily_personalized', time: 'evening' },
          sound: settings.soundEnabled,
        },
        trigger: eveningTrigger as any,
      });

      // Gece bildirimi (22:30) - her gün tekrarlayan (dil desteği ile)
      const nightIdentifier = 'daily_personalized_night';
      const nightMessages = this.getMessagesForTime('night', userName, recentTopics, language);
      const nightMessage = nightMessages[Math.floor(Math.random() * nightMessages.length)];
      
      const nightTrigger = Platform.OS === 'ios'
        ? {
            type: 'daily' as const,
            hour: 22,
            minute: 30,
            repeats: true,
          }
        : {
            type: 'daily' as const,
            hour: 22,
            minute: 30,
            repeats: true,
          };
      
      await Notifications.scheduleNotificationAsync({
        identifier: nightIdentifier,
        content: {
          title: nightMessage.title,
          body: nightMessage.body,
          data: { type: 'daily_personalized', time: 'night' },
          sound: settings.soundEnabled,
        },
        trigger: nightTrigger as any,
      });

      logger.log('NotificationService: Günde 4 kişiselleştirilmiş bildirim zamanlandı (09:00, 14:00, 20:00, 22:30)');
    } catch (error) {
      logger.error('Günlük kişiselleştirilmiş bildirim ayarlama hatası:', error);
    }
  }

  // Giriş yapmamış kullanıcılar için günlük bildirimler zamanla
  static async scheduleGuestNotifications(): Promise<void> {
    try {
      // Önce tüm mevcut günlük bildirimleri bir kez al
      const allScheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      
      // Önce mevcut günlük bildirimleri iptal et (sadece aynı tip bildirimler)
      for (const notification of allScheduledNotifications) {
        const data = notification.content.data;
        if (data && (data.type === 'daily_personalized' || data.type === 'guest_notification')) {
          await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
      }
      
      // Kullanıcı ayarlarını kontrol et
      const settings = await getNotificationSettings();
      if (!settings.notifications) {
        logger.log('NotificationService: Bildirimler kullanıcı tarafından kapatılmış');
        return;
      }

      // Mevcut dili al
      const language = await this.getCurrentLanguage();

      // Sabah bildirimi (09:00) - her gün tekrarlayan (dil desteği ile)
      const guestMorningIdentifier = 'guest_notification_morning';
      const morningMessages = await this.getGuestMessagesForTime('morning');
      const morningMessage = morningMessages[Math.floor(Math.random() * morningMessages.length)];
      
      const morningTrigger = Platform.OS === 'ios'
        ? {
            type: 'daily' as const,
            hour: 9,
            minute: 0,
            repeats: true,
          }
        : {
            type: 'daily' as const,
            hour: 9,
            minute: 0,
            repeats: true,
          };
      
      await Notifications.scheduleNotificationAsync({
        identifier: guestMorningIdentifier,
        content: {
          title: morningMessage.title,
          body: morningMessage.body,
          data: { type: 'guest_notification', time: 'morning', action: 'open_app' },
          sound: settings.soundEnabled,
        },
        trigger: morningTrigger as any,
      });

      // Öğlen bildirimi (14:00) - her gün tekrarlayan (dil desteği ile)
      const guestAfternoonIdentifier = 'guest_notification_afternoon';
      const afternoonMessages = await this.getGuestMessagesForTime('afternoon');
      const afternoonMessage = afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
      
      const afternoonTrigger = Platform.OS === 'ios'
        ? {
            type: 'daily' as const,
            hour: 14,
            minute: 0,
            repeats: true,
          }
        : {
            type: 'daily' as const,
            hour: 14,
            minute: 0,
            repeats: true,
          };
      
      await Notifications.scheduleNotificationAsync({
        identifier: guestAfternoonIdentifier,
        content: {
          title: afternoonMessage.title,
          body: afternoonMessage.body,
          data: { type: 'guest_notification', time: 'afternoon', action: 'open_app' },
          sound: settings.soundEnabled,
        },
        trigger: afternoonTrigger as any,
      });

      // Akşam bildirimi (20:00) - her gün tekrarlayan (dil desteği ile)
      const guestEveningIdentifier = 'guest_notification_evening';
      const eveningMessages = await this.getGuestMessagesForTime('evening');
      const eveningMessage = eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
      
      const eveningTrigger = Platform.OS === 'ios'
        ? {
            type: 'daily' as const,
            hour: 20,
            minute: 0,
            repeats: true,
          }
        : {
            type: 'daily' as const,
            hour: 20,
            minute: 0,
            repeats: true,
          };
      
      await Notifications.scheduleNotificationAsync({
        identifier: guestEveningIdentifier,
        content: {
          title: eveningMessage.title,
          body: eveningMessage.body,
          data: { type: 'guest_notification', time: 'evening', action: 'open_app' },
          sound: settings.soundEnabled,
        },
        trigger: eveningTrigger as any,
      });

      // Gece bildirimi (22:30) - her gün tekrarlayan (dil desteği ile)
      const guestNightIdentifier = 'guest_notification_night';
      const nightMessages = await this.getGuestMessagesForTime('night');
      const nightMessage = nightMessages[Math.floor(Math.random() * nightMessages.length)];
      
      const nightTrigger = Platform.OS === 'ios'
        ? {
            type: 'daily' as const,
            hour: 22,
            minute: 30,
            repeats: true,
          }
        : {
            type: 'daily' as const,
            hour: 22,
            minute: 30,
            repeats: true,
          };
      
      await Notifications.scheduleNotificationAsync({
        identifier: guestNightIdentifier,
        content: {
          title: nightMessage.title,
          body: nightMessage.body,
          data: { type: 'guest_notification', time: 'night', action: 'open_app' },
          sound: settings.soundEnabled,
        },
        trigger: nightTrigger as any,
      });

      logger.log('NotificationService: Giriş yapmamış kullanıcılar için günde 4 bildirim zamanlandı (09:00, 14:00, 20:00, 22:30)');
    } catch (error) {
      logger.error('Giriş yapmamış kullanıcılar için bildirim ayarlama hatası:', error);
    }
  }

  // Bildirimleri yeniden zamanla (kullanıcı ayarları değiştiğinde veya giriş yaptığında)
  static async rescheduleNotifications(): Promise<void> {
    try {
      // Bildirim zamanlama flag'ini sıfırla
      this.notificationsScheduled = false;
      
      // Bildirimleri yeniden zamanla
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await this.scheduleDailyPersonalizedNotifications();
      } else {
        await this.scheduleGuestNotifications();
      }
      
      this.notificationsScheduled = true;
      logger.log('NotificationService: Bildirimler yeniden zamanlandı');
    } catch (error) {
      logger.error('NotificationService: Bildirimleri yeniden zamanlama hatası:', error);
    }
  }

  // Servisi temizle
  static async cleanup(): Promise<void> {
    try {
      // Tüm bildirimleri iptal et
      await this.cancelAllNotifications();

      // Badge sayısını temizle
      await this.clearBadgeCount();

      this.isInitialized = false;
      this.expoToken = null;
      this.notificationsScheduled = false;

      logger.log('NotificationService: Temizlik tamamlandı');
    } catch (error) {
      logger.error('NotificationService temizlik hatası:', error);
    }
  }
}
