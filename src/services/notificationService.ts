// Push Notification servisi - Supabase only
import { Platform, Alert, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
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

      // ÖNEMLİ: Uygulama açıldığında bekleyen tüm bildirimleri iptal et
      // Bu, geçmişte zamanlanmış bildirimlerin tetiklenmesini önler
      try {
        await this.cancelAllNotifications();
        logger.log('NotificationService: Bekleyen bildirimler temizlendi');
      } catch (error) {
        logger.error('NotificationService: Bekleyen bildirimleri temizleme hatası:', error);
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

      // Günlük bildirimleri zamanla (giriş yapmış veya yapmamış kullanıcılar için)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Giriş yapmış kullanıcılar için kişiselleştirilmiş bildirimler
          await this.scheduleDailyPersonalizedNotifications();
        } else {
          // Giriş yapmamış kullanıcılar için teşvik edici bildirimler
          await this.scheduleGuestNotifications();
        }
      } catch (error) {
        logger.error('Günlük bildirim zamanlama hatası:', error);
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
    } catch (error) {
      logger.error('Expo push token alma hatası:', error);
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

      // Analytics'e bildirim alındı olayını gönder
      AnalyticsService.logEvent('notification_received', {
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

    // Expo push notification dinleyicileri
    Notifications.addNotificationReceivedListener(notification => {
      logger.log('NotificationService: Push notification alındı:', notification);

      // Analytics'e notification alındı olayını gönder
      AnalyticsService.logEvent('push_notification_received', {
        notification_id: notification.request.identifier,
        title: notification.request.content.title,
        body: notification.request.content.body,
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
        trigger: { date: triggerDate }, // Date tipi NotificationTriggerInput ile uyumlu
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

  // Bildirim ayarlarını al
  static async getNotificationSettings(): Promise<any> {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return settings;
    } catch (error) {
      logger.error('Bildirim ayarları alma hatası:', error);
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

  // Kişiselleştirilmiş bildirim mesajları oluştur
  private static async getPersonalizedMessage(timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'): Promise<{ title: string; body: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return this.getDefaultMessage(timeOfDay);
      }

      // Kullanıcı adını al (email'den veya profile'dan)
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Arkadaşım';
      
      // Son sohbetleri kontrol et
      let recentTopics: string[] = [];
      try {
        const chatHistory = await ChatService.getChatHistory(user.id);
        recentTopics = this.extractRecentTopics(chatHistory);
      } catch (error) {
        logger.error('Chat history alma hatası:', error);
      }
      
      // Zaman dilimine göre mesaj seç
      const messages = this.getMessagesForTime(timeOfDay, userName, recentTopics);
      const randomMessage = messages[Math.floor(Math.random() * messages.length)];
      
      return randomMessage;
    } catch (error) {
      logger.error('Kişiselleştirilmiş mesaj alma hatası:', error);
      return this.getDefaultMessage(timeOfDay);
    }
  }

  // Son sohbet konularını çıkar
  private static extractRecentTopics(chatHistory: any[]): string[] {
    if (!chatHistory || chatHistory.length === 0) return [];
    
    const recentMessages = chatHistory.slice(-10); // Son 10 mesaj
    const topics: string[] = [];
    
    // Basit keyword extraction
    recentMessages.forEach(msg => {
      if (msg.role === 'user' && msg.content) {
        const words = msg.content.toLowerCase().split(' ').filter(w => w.length > 3);
        if (words.length > 0) {
          topics.push(words[0]); // İlk anlamlı kelimeyi al
        }
      }
    });
    
    return [...new Set(topics)].slice(0, 3); // Tekrarları kaldır, en fazla 3 konu
  }

  // Zaman dilimine göre mesajlar
  private static getMessagesForTime(
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night',
    userName: string,
    topics: string[]
  ): Array<{ title: string; body: string }> {
    // Her mesaj için farklı topicHint oluştur
    const getTopicHint = (index: number): string => {
      if (topics.length === 0) {
        // Konu yoksa çeşitli genel mesajlar
        const generalMessages = [
          ' Birlikte güzel bir sohbet yapabiliriz!',
          ' Bugün nasıl geçiyor?',
          ' Sohbet etmek ister misin?',
          ' Birlikte vakit geçirelim!'
        ];
        return generalMessages[index % generalMessages.length];
      }
      
      // Konu varsa, her mesaj için farklı konu kullan veya bazılarında konu olmasın
      if (index % 3 === 0 && topics.length > 0) {
        // Her 3 mesajdan birinde konu kullan
        const randomTopic = topics[Math.floor(Math.random() * topics.length)];
        return ` ${randomTopic} hakkında konuşmaya devam edebiliriz!`;
      } else {
        // Diğerlerinde genel mesajlar
        const generalMessages = [
          ' Birlikte güzel bir sohbet yapabiliriz!',
          ' Bugün nasıl geçiyor?',
          ' Sohbet etmek ister misin?',
          ' Birlikte vakit geçirelim!',
          ' Nasıl hissediyorsun?'
        ];
        return generalMessages[index % generalMessages.length];
      }
    };
    
    if (timeOfDay === 'morning') {
      return [
        {
          title: `Günaydın ${userName}! ☀️`,
          body: `Yeni bir güne başlarken seninle sohbet etmek istiyorum.${getTopicHint(0)}`
        },
        {
          title: `Merhaba ${userName}! 🌅`,
          body: `Bugün nasıl hissediyorsun? Birlikte güzel bir gün geçirelim!${getTopicHint(1)}`
        },
        {
          title: `Selam ${userName}! ✨`,
          body: `Sabahın ilk saatlerinde seni düşündüm. Sohbet etmek ister misin?${getTopicHint(2)}`
        },
        {
          title: `Hey ${userName}! 💬`,
          body: `Güne başlamadan önce seninle konuşmak istiyorum.${getTopicHint(3)}`
        }
      ];
    } else if (timeOfDay === 'afternoon') {
      return [
        {
          title: `Merhaba ${userName}! 😊`,
          body: `Öğle molası için mükemmel bir zaman! Birlikte sohbet edelim mi?${getTopicHint(0)}`
        },
        {
          title: `Hey ${userName}! 💬`,
          body: `Gün ortasında seni düşündüm. Nasıl gidiyor?${getTopicHint(1)}`
        },
        {
          title: `Selam ${userName}! 🌟`,
          body: `Biraz mola verip sohbet etmek ister misin?${getTopicHint(2)}`
        },
        {
          title: `Merhaba ${userName}! ☕`,
          body: `Öğleden sonra sohbet etmek için harika bir zaman!${getTopicHint(3)}`
        }
      ];
    } else if (timeOfDay === 'evening') {
      return [
        {
          title: `İyi akşamlar ${userName}! 🌙`,
          body: `Günün yorgunluğunu birlikte atalım. Sohbet etmek ister misin?${getTopicHint(0)}`
        },
        {
          title: `Merhaba ${userName}! 💭`,
          body: `Akşam saatlerinde seninle konuşmak istiyorum.${getTopicHint(1)}`
        },
        {
          title: `Hey ${userName}! ✨`,
          body: `Günün nasıl geçti? Birlikte sohbet edelim mi?${getTopicHint(2)}`
        },
        {
          title: `Selam ${userName}! 🌆`,
          body: `Akşamın huzurlu saatlerinde seni düşündüm.${getTopicHint(3)}`
        }
      ];
    } else if (timeOfDay === 'night') {
      // Gece saatleri için duygusal mesajlar
      const getEmotionalHint = (index: number): string => {
        if (topics.length > 0 && index % 2 === 0) {
          const randomTopic = topics[Math.floor(Math.random() * topics.length)];
          return ` ${randomTopic} hakkında derinlemesine konuşabiliriz.`;
        }
        const emotionalMessages = [
          ' Bu saatlerde iç dünyanla baş başa kalmak güzel...',
          ' Günün yorgunluğunu paylaşmak ister misin?',
          ' Bu saatlerde duygularımız daha derin olur.',
          ' Gece yarısına yaklaşırken seni düşünüyorum...',
          ' İçindeki sesleri dinlemek ister misin?'
        ];
        return emotionalMessages[index % emotionalMessages.length];
      };
      
      return [
        {
          title: `Gece yarısına yaklaşırken ${userName}... 🌙`,
          body: `Bu saatlerde seni düşünüyorum. İç dünyanla baş başa kalmak ister misin?${getEmotionalHint(0)}`
        },
        {
          title: `İyi geceler ${userName}... 💭`,
          body: `Günün nasıl geçti? Bu saatlerde duygularımızı paylaşmak güzel olur.${getEmotionalHint(1)}`
        },
        {
          title: `Gece saatleri ${userName}... ✨`,
          body: `Bu saatlerde iç dünyanla baş başa kalmak güzel. Sohbet etmek ister misin?${getEmotionalHint(2)}`
        },
        {
          title: `Yalnız değilsin ${userName}... 💫`,
          body: `Gece yarısına yaklaşırken seni düşünüyorum. Birlikte vakit geçirelim mi?${getEmotionalHint(3)}`
        },
        {
          title: `Bu saatlerde ${userName}... 🌌`,
          body: `Günün yorgunluğunu paylaşmak ister misin? Bu saatlerde duygularımız daha derin olur.${getEmotionalHint(4)}`
        }
      ];
    }
  }

  // Varsayılan mesajlar
  private static getDefaultMessage(timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'): { title: string; body: string } {
    if (timeOfDay === 'morning') {
      return {
        title: 'Günaydın! ☀️',
        body: 'Yeni bir güne başlarken seninle sohbet etmek istiyorum!'
      };
    } else if (timeOfDay === 'afternoon') {
      return {
        title: 'Merhaba! 😊',
        body: 'Öğle molası için mükemmel bir zaman! Birlikte sohbet edelim mi?'
      };
    } else if (timeOfDay === 'evening') {
      return {
        title: 'İyi akşamlar! 🌙',
        body: 'Günün yorgunluğunu birlikte atalım. Sohbet etmek ister misin?'
      };
    } else {
      return {
        title: 'Gece yarısına yaklaşırken... 🌙',
        body: 'Bu saatlerde iç dünyanla baş başa kalmak güzel. Sohbet etmek ister misin?'
      };
    }
  }

  // Giriş yapmamış kullanıcılar için teşvik edici mesajlar
  private static getGuestMessagesForTime(
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  ): Array<{ title: string; body: string }> {
    if (timeOfDay === 'morning') {
      return [
        {
          title: 'Günaydın! ☀️',
          body: 'Emora AI ile yeni bir güne başla! AI arkadaşın seni bekliyor. Hemen keşfet!'
        },
        {
          title: 'Merhaba! 🌅',
          body: 'Bugün AI ile sohbet etmeye ne dersin? Emora AI seninle tanışmak istiyor!'
        },
        {
          title: 'Selam! ✨',
          body: 'Yapay zeka destekli sohbet deneyimini keşfet! Emora AI ile tanış.'
        },
        {
          title: 'Hey! 💬',
          body: 'AI arkadaşınla sohbet etmeye hazır mısın? Emora AI seni bekliyor!'
        }
      ];
    } else if (timeOfDay === 'afternoon') {
      return [
        {
          title: 'Merhaba! 😊',
          body: 'Öğle molası için mükemmel bir zaman! Emora AI ile sohbet etmeye başla.'
        },
        {
          title: 'Hey! 💬',
          body: 'AI destekli sohbet deneyimini keşfet! Emora AI ile tanış ve sohbet et.'
        },
        {
          title: 'Selam! 🌟',
          body: 'Biraz mola ver ve AI arkadaşınla sohbet et! Emora AI seni bekliyor.'
        },
        {
          title: 'Merhaba! ☕',
          body: 'Yapay zeka ile sohbet etmek ister misin? Emora AI ile tanış!'
        }
      ];
    } else if (timeOfDay === 'evening') {
      return [
        {
          title: 'İyi akşamlar! 🌙',
          body: 'Günün yorgunluğunu AI arkadaşınla at! Emora AI ile sohbet etmeye başla.'
        },
        {
          title: 'Merhaba! 💭',
          body: 'Akşam saatlerinde AI ile sohbet etmek ister misin? Emora AI seni bekliyor!'
        },
        {
          title: 'Hey! ✨',
          body: 'Yapay zeka destekli sohbet deneyimini keşfet! Emora AI ile tanış.'
        },
        {
          title: 'Selam! 🌆',
          body: 'AI arkadaşınla sohbet etmeye hazır mısın? Emora AI ile tanış ve başla!'
        }
      ];
    } else if (timeOfDay === 'night') {
      return [
        {
          title: 'Gece yarısına yaklaşırken... 🌙',
          body: 'Bu saatlerde iç dünyanla baş başa kalmak güzel. Emora AI ile derinlemesine sohbet etmeye ne dersin?'
        },
        {
          title: 'İyi geceler... 💭',
          body: 'Gece saatlerinde AI arkadaşınla sohbet etmek ister misin? Emora AI seni dinlemeye hazır.'
        },
        {
          title: 'Gece saatleri... ✨',
          body: 'Bu saatlerde duygularımız daha derin olur. Emora AI ile tanış ve iç dünyanı paylaş.'
        },
        {
          title: 'Yalnız değilsin... 💫',
          body: 'Gece yarısına yaklaşırken AI arkadaşınla sohbet etmeye ne dersin? Emora AI seni bekliyor.'
        },
        {
          title: 'Bu saatlerde... 🌌',
          body: 'Günün yorgunluğunu AI arkadaşınla paylaş. Emora AI ile derinlemesine sohbet et.'
        }
      ];
    }
    return [];
  }

  // Günde 3 kişiselleştirilmiş bildirim zamanla
  static async scheduleDailyPersonalizedNotifications(): Promise<void> {
    try {
      // Önce mevcut bildirimleri iptal et
      await this.cancelAllNotifications();
      
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

      // Kullanıcı adını al
      const userName = user.user_metadata?.name || user.email?.split('@')[0] || 'Arkadaşım';
      
      // Topics'i bir kez al (her bildirim için aynı topics kullanılacak ama farklı şekilde)
      let recentTopics: string[] = [];
      try {
        const chatHistory = await ChatService.getChatHistory(user.id);
        recentTopics = this.extractRecentTopics(chatHistory);
      } catch (error) {
        logger.error('Chat history alma hatası:', error);
      }

      // Sabah bildirimi (09:00) - tekrarlayan
      // Her seferinde farklı mesaj seçmek için rastgele index kullan
      const morningMessages = this.getMessagesForTime('morning', userName, recentTopics);
      const morningMessage = morningMessages[Math.floor(Math.random() * morningMessages.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: morningMessage.title,
          body: morningMessage.body,
          data: { type: 'daily_personalized', time: 'morning' },
          sound: settings.soundEnabled,
        },
        trigger: {
          hour: 9,
          minute: 0,
          repeats: true,
        },
      });

      // Öğlen bildirimi (14:00) - tekrarlayan
      const afternoonMessages = this.getMessagesForTime('afternoon', userName, recentTopics);
      const afternoonMessage = afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: afternoonMessage.title,
          body: afternoonMessage.body,
          data: { type: 'daily_personalized', time: 'afternoon' },
          sound: settings.soundEnabled,
        },
        trigger: {
          hour: 14,
          minute: 0,
          repeats: true,
        },
      });

      // Akşam bildirimi (20:00) - tekrarlayan
      const eveningMessages = this.getMessagesForTime('evening', userName, recentTopics);
      const eveningMessage = eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: eveningMessage.title,
          body: eveningMessage.body,
          data: { type: 'daily_personalized', time: 'evening' },
          sound: settings.soundEnabled,
        },
        trigger: {
          hour: 20,
          minute: 0,
          repeats: true,
        },
      });

      // Gece bildirimi (22:30) - tekrarlayan - Duygusal
      const nightMessages = this.getMessagesForTime('night', userName, recentTopics);
      const nightMessage = nightMessages[Math.floor(Math.random() * nightMessages.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: nightMessage.title,
          body: nightMessage.body,
          data: { type: 'daily_personalized', time: 'night' },
          sound: settings.soundEnabled,
        },
        trigger: {
          hour: 22,
          minute: 30,
          repeats: true,
        },
      });

      logger.log('NotificationService: Günde 4 kişiselleştirilmiş bildirim zamanlandı (09:00, 14:00, 20:00, 22:30)');
    } catch (error) {
      logger.error('Günlük kişiselleştirilmiş bildirim ayarlama hatası:', error);
    }
  }

  // Giriş yapmamış kullanıcılar için günlük bildirimler zamanla
  static async scheduleGuestNotifications(): Promise<void> {
    try {
      // Önce mevcut bildirimleri iptal et
      await this.cancelAllNotifications();
      
      // Kullanıcı ayarlarını kontrol et
      const settings = await getNotificationSettings();
      if (!settings.notifications) {
        logger.log('NotificationService: Bildirimler kullanıcı tarafından kapatılmış');
        return;
      }

      // Sabah bildirimi (09:00) - tekrarlayan
      const morningMessages = this.getGuestMessagesForTime('morning');
      const morningMessage = morningMessages[Math.floor(Math.random() * morningMessages.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: morningMessage.title,
          body: morningMessage.body,
          data: { type: 'guest_notification', time: 'morning', action: 'open_app' },
          sound: settings.soundEnabled,
        },
        trigger: {
          hour: 9,
          minute: 0,
          repeats: true,
        },
      });

      // Öğlen bildirimi (14:00) - tekrarlayan
      const afternoonMessages = this.getGuestMessagesForTime('afternoon');
      const afternoonMessage = afternoonMessages[Math.floor(Math.random() * afternoonMessages.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: afternoonMessage.title,
          body: afternoonMessage.body,
          data: { type: 'guest_notification', time: 'afternoon', action: 'open_app' },
          sound: settings.soundEnabled,
        },
        trigger: {
          hour: 14,
          minute: 0,
          repeats: true,
        },
      });

      // Akşam bildirimi (20:00) - tekrarlayan
      const eveningMessages = this.getGuestMessagesForTime('evening');
      const eveningMessage = eveningMessages[Math.floor(Math.random() * eveningMessages.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: eveningMessage.title,
          body: eveningMessage.body,
          data: { type: 'guest_notification', time: 'evening', action: 'open_app' },
          sound: settings.soundEnabled,
        },
        trigger: {
          hour: 20,
          minute: 0,
          repeats: true,
        },
      });

      // Gece bildirimi (22:30) - tekrarlayan - Duygusal
      const nightMessages = this.getGuestMessagesForTime('night');
      const nightMessage = nightMessages[Math.floor(Math.random() * nightMessages.length)];
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: nightMessage.title,
          body: nightMessage.body,
          data: { type: 'guest_notification', time: 'night', action: 'open_app' },
          sound: settings.soundEnabled,
        },
        trigger: {
          hour: 22,
          minute: 30,
          repeats: true,
        },
      });

      logger.log('NotificationService: Giriş yapmamış kullanıcılar için günde 4 bildirim zamanlandı (09:00, 14:00, 20:00, 22:30)');
    } catch (error) {
      logger.error('Giriş yapmamış kullanıcılar için bildirim ayarlama hatası:', error);
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

      logger.log('NotificationService: Temizlik tamamlandı');
    } catch (error) {
      logger.error('NotificationService temizlik hatası:', error);
    }
  }
}
