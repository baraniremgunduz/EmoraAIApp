// Push Notification servisi - Supabase only
import { Platform, Alert, Vibration } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyticsService } from './analyticsService';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

// Bildirim davranışlarını ayarla - Kullanıcı ayarlarına göre dinamik
Notifications.setNotificationHandler({
  handleNotification: async () => {
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
    console.error('Bildirim ayarları alma hatası:', error);
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
      console.log('NotificationService: Push notification servisi başlatılıyor...');
      
      // İzin iste
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('NotificationService: Bildirim izni verilmedi');
        return false;
      }

      // Expo push token al
      await this.getExpoToken();
      
      // Bildirim dinleyicilerini kur
      this.setupNotificationListeners();
      
      this.isInitialized = true;
      console.log('NotificationService: Push notification servisi başarıyla başlatıldı');
      
      return true;
    } catch (error) {
      console.error('NotificationService başlatma hatası:', error);
      return false;
    }
  }

  // Expo push token al
  private static async getExpoToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      this.expoToken = token.data;
      console.log('NotificationService: Expo push token alındı:', token.data);
      
      // Token'ı Supabase'e kaydet
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert({
          token: token.data,
          platform: Platform.OS,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Token'ı analytics'e gönder
      await AnalyticsService.logEvent('push_token_received', {
        token: token.data,
        platform: Platform.OS,
      });
      
      return token.data;
    } catch (error) {
      console.error('Expo push token alma hatası:', error);
      return null;
    }
  }

  // Bildirim dinleyicilerini kur
  private static setupNotificationListeners() {
    // Foreground bildirimleri
    Notifications.addNotificationReceivedListener(notification => {
      console.log('NotificationService: Foreground bildirim alındı:', notification);
      
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
      console.log('NotificationService: Bildirim tıklandı:', response);
      
      // Analytics'e bildirim tıklama olayını gönder
      AnalyticsService.logEvent('notification_tapped', {
        notification_id: response.notification.request.identifier,
        action_identifier: response.actionIdentifier,
        platform: Platform.OS,
      });
    });

    // Expo push notification dinleyicileri
    Notifications.addNotificationReceivedListener(notification => {
      console.log('NotificationService: Push notification alındı:', notification);
      
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
        console.log('NotificationService: Bildirimler kullanıcı tarafından kapatılmış');
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
      
      console.log('NotificationService: Yerel bildirim gönderildi:', title, {
        sound: settings.soundEnabled,
        vibration: settings.vibrationEnabled
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
      console.error('Yerel bildirim gönderme hatası:', error);
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
        console.log('NotificationService: Bildirimler kullanıcı tarafından kapatılmış');
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: title,
          body: body,
          data: data || {},
          sound: settings.soundEnabled,
        },
        trigger: {
          date: triggerDate,
        },
      });
      
      console.log('NotificationService: Zamanlanmış bildirim ayarlandı:', title, {
        sound: settings.soundEnabled,
        vibration: settings.vibrationEnabled
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
      console.error('Zamanlanmış bildirim ayarlama hatası:', error);
    }
  }

  // Tüm bildirimleri iptal et
  static async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('NotificationService: Tüm bildirimler iptal edildi');
      
      // Analytics'e bildirim iptal olayını gönder
      await AnalyticsService.logEvent('all_notifications_cancelled', {
        platform: Platform.OS,
      });
    } catch (error) {
      console.error('Bildirim iptal etme hatası:', error);
    }
  }

  // Belirli bildirimi iptal et
  static async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('NotificationService: Bildirim iptal edildi:', notificationId);
      
      // Analytics'e bildirim iptal olayını gönder
      await AnalyticsService.logEvent('notification_cancelled', {
        notification_id: notificationId,
        platform: Platform.OS,
      });
    } catch (error) {
      console.error('Bildirim iptal etme hatası:', error);
    }
  }

  // Bildirim izinlerini kontrol et
  static async checkPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('İzin kontrolü hatası:', error);
      return false;
    }
  }

  // Bildirim izinlerini iste
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('İzin isteme hatası:', error);
      return false;
    }
  }

  // Bildirim ayarlarını al
  static async getNotificationSettings(): Promise<any> {
    try {
      const settings = await Notifications.getPermissionsAsync();
      return settings;
    } catch (error) {
      console.error('Bildirim ayarları alma hatası:', error);
      return null;
    }
  }

  // Badge sayısını ayarla
  static async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('NotificationService: Badge sayısı ayarlandı:', count);
    } catch (error) {
      console.error('Badge sayısı ayarlama hatası:', error);
    }
  }

  // Badge sayısını temizle
  static async clearBadgeCount(): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(0);
      console.log('NotificationService: Badge sayısı temizlendi');
    } catch (error) {
      console.error('Badge sayısı temizleme hatası:', error);
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
      
      console.log('NotificationService: Bildirim kategorileri ayarlandı');
    } catch (error) {
      console.error('Bildirim kategorileri ayarlama hatası:', error);
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
      console.error('Test bildirimi gönderme hatası:', error);
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
      console.error('Günlük hatırlatma ayarlama hatası:', error);
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
      console.error('Haftalık özet ayarlama hatası:', error);
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
      
      console.log('NotificationService: Temizlik tamamlandı');
    } catch (error) {
      console.error('NotificationService temizlik hatası:', error);
    }
  }
}
