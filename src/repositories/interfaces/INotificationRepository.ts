// Notification Repository Interface
export interface NotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  badge?: number;
}

export interface INotificationRepository {
  /**
   * Notification izni iste
   */
  requestPermission(): Promise<boolean>;

  /**
   * Notification gönder
   */
  sendNotification(notification: NotificationData): Promise<void>;

  /**
   * Local notification schedule et
   */
  scheduleNotification(notification: NotificationData, trigger: Date | number): Promise<string>;

  /**
   * Scheduled notification iptal et
   */
  cancelNotification(notificationId: string): Promise<void>;

  /**
   * Tüm scheduled notification'ları iptal et
   */
  cancelAllNotifications(): Promise<void>;

  /**
   * Notification token al (push notifications için)
   */
  getToken(): Promise<string | null>;

  /**
   * Notification listener ekle
   */
  addNotificationListener(callback: (notification: any) => void): () => void;
}
