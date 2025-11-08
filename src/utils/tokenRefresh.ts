// Token Refresh Manager - Otomatik token refresh mekanizması
import { supabase } from '../config/supabase';
import { logger } from './logger';

export class TokenRefreshManager {
  private static refreshInterval: NodeJS.Timeout | null = null;
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 dakika öncesinden refresh
  private static readonly CHECK_INTERVAL = 10 * 60 * 1000; // Her 10 dakikada bir kontrol et
  private static isRunning = false;

  /**
   * Token refresh mekanizmasını başlat
   */
  static startAutoRefresh(): void {
    if (this.isRunning) {
      logger.log('Token refresh already running');
      return;
    }

    this.isRunning = true;
    
    // Her 10 dakikada bir kontrol et
    this.refreshInterval = setInterval(async () => {
      await this.checkAndRefreshToken();
    }, this.CHECK_INTERVAL);

    // İlk kontrolü hemen yap
    this.checkAndRefreshToken();

    logger.log('Token refresh manager started');
  }

  /**
   * Token refresh mekanizmasını durdur
   */
  static stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      this.isRunning = false;
      logger.log('Token refresh manager stopped');
    }
  }

  /**
   * Token'ı kontrol et ve gerekirse refresh et
   */
  static async checkAndRefreshToken(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error || !session) {
        logger.log('No active session, stopping refresh');
        this.stopAutoRefresh();
        return false;
      }

      // Token expire süresini kontrol et
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Token yoksa veya expire olmuşsa
      if (expiresAt === 0 || timeUntilExpiry <= 0) {
        logger.log('Token expired, attempting refresh...');
        return await this.refreshToken();
      }

      // 5 dakikadan az kaldıysa refresh et
      if (timeUntilExpiry < this.REFRESH_THRESHOLD) {
        logger.log(`Token expiring soon (${Math.ceil(timeUntilExpiry / 1000)}s), refreshing...`);
        return await this.refreshToken();
      }

      logger.log(`Token valid for ${Math.ceil(timeUntilExpiry / 1000)}s`);
      return true;
    } catch (error) {
      logger.error('Token check error:', error);
      return false;
    }
  }

  /**
   * Token'ı refresh et
   */
  static async refreshToken(): Promise<boolean> {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      
      if (error || !session) {
        logger.error('Token refresh failed:', error);
        
        // Refresh başarısız olursa, kullanıcıyı logout et
        // Bu durumda auth store'u güncelle
        if (error?.message?.includes('refresh_token_not_found') || 
            error?.message?.includes('JWT expired')) {
          logger.log('Refresh token invalid, user needs to login again');
          await supabase.auth.signOut();
        }
        
        return false;
      }

      logger.log('Token refreshed successfully');
      return true;
    } catch (error) {
      logger.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Manuel refresh (kullanıcı action'ı için)
   */
  static async manualRefresh(): Promise<boolean> {
    logger.log('Manual token refresh requested');
    return await this.refreshToken();
  }

  /**
   * Token durumunu kontrol et (debug için)
   */
  static async getTokenStatus(): Promise<{
    hasSession: boolean;
    expiresAt: number | null;
    timeUntilExpiry: number | null;
    needsRefresh: boolean;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return {
          hasSession: false,
          expiresAt: null,
          timeUntilExpiry: null,
          needsRefresh: false,
        };
      }

      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const timeUntilExpiry = expiresAt > 0 ? expiresAt - now : null;
      const needsRefresh = timeUntilExpiry !== null && timeUntilExpiry < this.REFRESH_THRESHOLD;

      return {
        hasSession: true,
        expiresAt: expiresAt > 0 ? expiresAt : null,
        timeUntilExpiry,
        needsRefresh,
      };
    } catch (error) {
      logger.error('Get token status error:', error);
      return {
        hasSession: false,
        expiresAt: null,
        timeUntilExpiry: null,
        needsRefresh: false,
      };
    }
  }
}

