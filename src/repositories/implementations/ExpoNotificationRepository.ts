// Expo Notification Repository Implementation
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { INotificationRepository, NotificationData } from '../interfaces/INotificationRepository';
import { logger } from '../../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class ExpoNotificationRepository implements INotificationRepository {
  private listeners: Array<() => void> = [];

  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      
      if (granted) {
        logger.log('Notification permission granted');
      } else {
        logger.warn('Notification permission denied');
      }
      
      return granted;
    } catch (error) {
      logger.error('Request notification permission error:', error);
      return false;
    }
  }

  async sendNotification(notification: NotificationData): Promise<void> {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: notification.sound !== false,
          badge: notification.badge,
        },
        trigger: null, // Immediate
      });

      logger.log('Notification sent:', notification.title);
    } catch (error) {
      logger.error('Send notification error:', error);
      throw error;
    }
  }

  async scheduleNotification(notification: NotificationData, trigger: Date | number): Promise<string> {
    try {
      const triggerConfig = typeof trigger === 'number' 
        ? { seconds: trigger }
        : { date: trigger };

      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification.data,
          sound: notification.sound !== false,
          badge: notification.badge,
        },
        trigger: triggerConfig,
      });

      logger.log('Notification scheduled:', notificationId);
      return notificationId;
    } catch (error) {
      logger.error('Schedule notification error:', error);
      throw error;
    }
  }

  async cancelNotification(notificationId: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      logger.log('Notification cancelled:', notificationId);
    } catch (error) {
      logger.error('Cancel notification error:', error);
      throw error;
    }
  }

  async cancelAllNotifications(): Promise<void> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      logger.log('All notifications cancelled');
    } catch (error) {
      logger.error('Cancel all notifications error:', error);
      throw error;
    }
  }

  async getToken(): Promise<string | null> {
    try {
      const token = await Notifications.getExpoPushTokenAsync();
      return token.data;
    } catch (error) {
      logger.error('Get notification token error:', error);
      return null;
    }
  }

  addNotificationListener(callback: (notification: any) => void): () => void {
    const subscription = Notifications.addNotificationReceivedListener(callback);
    
    this.listeners.push(() => {
      subscription.remove();
    });

    return () => {
      subscription.remove();
      this.listeners = this.listeners.filter(l => l !== subscription.remove);
    };
  }
}

