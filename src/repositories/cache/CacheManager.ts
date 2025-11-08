// Cache Manager - Repository seviyesinde cache mekanizması
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../../utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export class CacheManager {
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 dakika
  private static readonly CACHE_PREFIX = 'cache_';

  /**
   * Cache'e veri kaydet
   */
  static async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl,
      };

      await AsyncStorage.setItem(
        `${this.CACHE_PREFIX}${key}`,
        JSON.stringify(entry)
      );

      logger.log(`Cache set: ${key}`);
    } catch (error) {
      logger.error(`Cache set error for ${key}:`, error);
    }
  }

  /**
   * Cache'den veri al
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      
      if (!cached) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cached);

      // Expiry kontrolü
      if (Date.now() > entry.expiresAt) {
        await this.delete(key);
        logger.log(`Cache expired: ${key}`);
        return null;
      }

      logger.log(`Cache hit: ${key}`);
      return entry.data;
    } catch (error) {
      logger.error(`Cache get error for ${key}:`, error);
      return null;
    }
  }

  /**
   * Cache'den veri sil
   */
  static async delete(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${this.CACHE_PREFIX}${key}`);
      logger.log(`Cache deleted: ${key}`);
    } catch (error) {
      logger.error(`Cache delete error for ${key}:`, error);
    }
  }

  /**
   * Tüm cache'i temizle
   */
  static async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      
      await AsyncStorage.multiRemove(cacheKeys);
      logger.log('Cache cleared');
    } catch (error) {
      logger.error('Cache clear error:', error);
    }
  }

  /**
   * Cache'de var mı kontrol et
   */
  static async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Cache entry'nin geçerliliğini kontrol et
   */
  static async isValid(key: string): Promise<boolean> {
    try {
      const cached = await AsyncStorage.getItem(`${this.CACHE_PREFIX}${key}`);
      
      if (!cached) {
        return false;
      }

      const entry: CacheEntry<any> = JSON.parse(cached);
      return Date.now() <= entry.expiresAt;
    } catch (error) {
      return false;
    }
  }
}

