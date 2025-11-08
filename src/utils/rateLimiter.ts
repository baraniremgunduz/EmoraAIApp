// Rate limiting utility
// Mesaj gönderme hızını sınırlar

interface RateLimitState {
  lastMessageTime: number;
  messageCount: number;
  windowStartTime: number;
}

// Rate limit ayarları
const RATE_LIMIT_CONFIG = {
  minTimeBetweenMessages: 1000, // Mesajlar arası minimum süre (ms) - 1 saniye
  maxMessagesPerMinute: 30, // Dakika başına maksimum mesaj sayısı
  maxMessagesPerHour: 200, // Saat başına maksimum mesaj sayısı
};

// Kullanıcı bazlı rate limit state'leri
const rateLimitStates = new Map<string, RateLimitState>();

// Rate limit kontrolü
export const checkRateLimit = (userId: string): { 
  allowed: boolean; 
  error?: string;
  waitTime?: number; // Bekleme süresi (ms)
} => {
  const now = Date.now();
  const state = rateLimitStates.get(userId) || {
    lastMessageTime: 0,
    messageCount: 0,
    windowStartTime: now,
  };

  // Mesajlar arası minimum süre kontrolü
  const timeSinceLastMessage = now - state.lastMessageTime;
  if (timeSinceLastMessage < RATE_LIMIT_CONFIG.minTimeBetweenMessages) {
    const waitTime = RATE_LIMIT_CONFIG.minTimeBetweenMessages - timeSinceLastMessage;
    return {
      allowed: false,
      error: `Lütfen ${Math.ceil(waitTime / 1000)} saniye bekleyin`,
      waitTime,
    };
  }

  // Dakika başına mesaj limiti kontrolü
  const oneMinuteAgo = now - 60000; // 60 saniye
  if (state.windowStartTime < oneMinuteAgo) {
    // Yeni dakika penceresi, sıfırla
    state.messageCount = 0;
    state.windowStartTime = now;
  }

  if (state.messageCount >= RATE_LIMIT_CONFIG.maxMessagesPerMinute) {
    const waitTime = 60000 - (now - state.windowStartTime);
    return {
      allowed: false,
      error: `Dakika başına ${RATE_LIMIT_CONFIG.maxMessagesPerMinute} mesaj limitine ulaştınız. Lütfen ${Math.ceil(waitTime / 1000)} saniye bekleyin`,
      waitTime,
    };
  }

  // Rate limit geçti, state'i güncelle
  state.lastMessageTime = now;
  state.messageCount += 1;
  rateLimitStates.set(userId, state);

  return { allowed: true };
};

// Rate limit state'ini temizle (logout veya reset için)
export const clearRateLimit = (userId: string): void => {
  rateLimitStates.delete(userId);
};

// Tüm rate limit state'lerini temizle
export const clearAllRateLimits = (): void => {
  rateLimitStates.clear();
};

