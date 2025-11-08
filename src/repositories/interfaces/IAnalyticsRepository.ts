// Analytics Repository Interface
export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  userId?: string;
  timestamp?: string;
}

export interface IAnalyticsRepository {
  /**
   * Event kaydet
   */
  track(event: AnalyticsEvent): Promise<void>;
  
  /**
   * Screen view kaydet
   */
  trackScreenView(screenName: string, properties?: Record<string, any>): Promise<void>;
  
  /**
   * User property set et
   */
  setUserProperty(userId: string, properties: Record<string, any>): Promise<void>;
  
  /**
   * User ID set et
   */
  setUserId(userId: string): Promise<void>;
  
  /**
   * User ID temizle
   */
  clearUserId(): Promise<void>;
}

