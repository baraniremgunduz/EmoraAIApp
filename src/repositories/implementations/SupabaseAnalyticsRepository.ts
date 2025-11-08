// Supabase Analytics Repository Implementation
import { SupabaseClient } from '@supabase/supabase-js';
import { IAnalyticsRepository, AnalyticsEvent } from '../interfaces/IAnalyticsRepository';
import { logger } from '../../utils/logger';

export class SupabaseAnalyticsRepository implements IAnalyticsRepository {
  private currentUserId: string | null = null;

  constructor(private supabase: SupabaseClient) {}

  async track(event: AnalyticsEvent): Promise<void> {
    try {
      const { error } = await this.supabase.from('analytics_events').insert({
        event_name: event.name,
        event_data: event.properties || {},
        user_id: event.userId || this.currentUserId,
        timestamp: event.timestamp || new Date().toISOString(),
      });

      if (error) {
        logger.error('Analytics event tracking error:', error);
        throw error;
      }

      logger.log('Analytics event tracked:', event.name);
    } catch (error) {
      logger.error('Analytics tracking error:', error);
      // Analytics hataları uygulamayı durdurmamalı
    }
  }

  async trackScreenView(screenName: string, properties?: Record<string, any>): Promise<void> {
    await this.track({
      name: 'screen_view',
      properties: {
        screen_name: screenName,
        ...properties,
      },
      userId: this.currentUserId || undefined,
    });
  }

  async setUserProperty(userId: string, properties: Record<string, any>): Promise<void> {
    try {
      const { error } = await this.supabase.from('analytics_user_properties').upsert({
        user_id: userId,
        properties,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        logger.error('Set user property error:', error);
        throw error;
      }

      logger.log('User properties set:', userId);
    } catch (error) {
      logger.error('Set user property error:', error);
    }
  }

  async setUserId(userId: string): Promise<void> {
    this.currentUserId = userId;
    logger.log('Analytics user ID set:', userId);
  }

  async clearUserId(): Promise<void> {
    this.currentUserId = null;
    logger.log('Analytics user ID cleared');
  }
}
