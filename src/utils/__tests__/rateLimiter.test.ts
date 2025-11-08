// Rate limiter test
import { checkRateLimit, clearRateLimit, clearAllRateLimits } from '../rateLimiter';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Her test öncesi rate limit state'lerini temizle
    clearAllRateLimits();
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Her test sonrası temizle
    clearAllRateLimits();
    jest.useRealTimers();
  });

  describe('checkRateLimit', () => {
    it('should allow first message', () => {
      const result = checkRateLimit('user1');
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject messages sent too quickly', () => {
      const userId = 'user1';
      
      // İlk mesaj
      const firstResult = checkRateLimit(userId);
      expect(firstResult.allowed).toBe(true);

      // Hemen ardından ikinci mesaj (1 saniyeden az)
      const secondResult = checkRateLimit(userId);
      expect(secondResult.allowed).toBe(false);
      expect(secondResult.error).toBeDefined();
      expect(secondResult.waitTime).toBeGreaterThan(0);
    });

    it('should allow messages after minimum time interval', () => {
      const userId = 'user1';
      
      // İlk mesaj
      checkRateLimit(userId);
      
      // 1 saniye ilerlet
      jest.advanceTimersByTime(1100);
      
      // İkinci mesaj gönderebilmeli
      const result = checkRateLimit(userId);
      expect(result.allowed).toBe(true);
    });

    it('should enforce per-minute message limit', () => {
      const userId = 'user2';
      
      // 30 mesaj gönder (limit 30)
      for (let i = 0; i < 30; i++) {
        // Her mesaj arasında 1 saniye bekle
        if (i > 0) {
          jest.advanceTimersByTime(1100);
        }
        const result = checkRateLimit(userId);
        expect(result.allowed).toBe(true);
      }
      
      // 31. mesaj reddedilmeli (hala aynı dakika içinde)
      jest.advanceTimersByTime(1100);
      const result = checkRateLimit(userId);
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('30');
    });

    it('should reset limit window after one minute', () => {
      const userId = 'user3';
      
      // 30 mesaj gönder
      for (let i = 0; i < 30; i++) {
        if (i > 0) {
          jest.advanceTimersByTime(1100);
        }
        checkRateLimit(userId);
      }
      
      // 1 dakika sonra limit sıfırlanmalı
      jest.advanceTimersByTime(61000); // 61 saniye
      
      const result = checkRateLimit(userId);
      expect(result.allowed).toBe(true);
    });

    it('should track different users separately', () => {
      const user1 = 'user1';
      const user2 = 'user2';
      
      // User1 mesaj gönder
      const result1 = checkRateLimit(user1);
      expect(result1.allowed).toBe(true);
      
      // User2 hemen mesaj gönderebilmeli
      const result2 = checkRateLimit(user2);
      expect(result2.allowed).toBe(true);
    });

    it('should provide wait time when rate limited', () => {
      const userId = 'user4';
      
      // İlk mesaj
      checkRateLimit(userId);
      
      // Hemen ikinci mesaj
      const result = checkRateLimit(userId);
      expect(result.allowed).toBe(false);
      expect(result.waitTime).toBeGreaterThan(0);
      expect(result.waitTime).toBeLessThanOrEqual(1000);
    });
  });

  describe('clearRateLimit', () => {
    it('should clear rate limit for specific user', () => {
      const userId = 'user5';
      
      // Mesaj gönder
      checkRateLimit(userId);
      
      // Rate limit'i temizle
      clearRateLimit(userId);
      
      // Tekrar mesaj gönderebilmeli (state sıfırlandı)
      const result = checkRateLimit(userId);
      expect(result.allowed).toBe(true);
    });

    it('should not affect other users when clearing one', () => {
      const user1 = 'user1';
      const user2 = 'user2';
      
      // Her iki kullanıcı da mesaj gönder
      checkRateLimit(user1);
      checkRateLimit(user2);
      
      // User1'in rate limit'ini temizle
      clearRateLimit(user1);
      
      // User2 hala rate limited olmalı
      const result2 = checkRateLimit(user2);
      expect(result2.allowed).toBe(false);
    });
  });

  describe('clearAllRateLimits', () => {
    it('should clear all rate limits', () => {
      const user1 = 'user1';
      const user2 = 'user2';
      
      // Her iki kullanıcı da mesaj gönder
      checkRateLimit(user1);
      checkRateLimit(user2);
      
      // Tüm rate limit'leri temizle
      clearAllRateLimits();
      
      // Her iki kullanıcı da tekrar mesaj gönderebilmeli
      const result1 = checkRateLimit(user1);
      const result2 = checkRateLimit(user2);
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });
  });
});

