// Token Counter - Context window yönetimi için
// OpenAI token sayımı için yaklaşık hesaplama
import { logger } from './logger';

export class TokenCounter {
  // Yaklaşık token sayısı (1 token ≈ 4 karakter)
  // OpenAI'nin tiktoken kütüphanesine göre yaklaşık değer
  private static readonly CHARS_PER_TOKEN = 4;

  /**
   * Metinden token sayısını tahmin et
   */
  static estimateTokens(text: string): number {
    if (!text || text.length === 0) return 0;
    
    // Basit hesaplama: karakter sayısı / 4
    // Daha doğru için tiktoken kullanılabilir ama React Native'de zor
    return Math.ceil(text.length / this.CHARS_PER_TOKEN);
  }

  /**
   * Mesaj array'inden toplam token sayısını hesapla
   */
  static countTokens(messages: Array<{ content: string; role?: string }>): number {
    if (!messages || messages.length === 0) return 0;
    
    return messages.reduce((total, msg) => {
      const contentTokens = this.estimateTokens(msg.content || '');
      // Role için ekstra token (yaklaşık 2 token)
      const roleTokens = msg.role ? 2 : 0;
      return total + contentTokens + roleTokens;
    }, 0);
  }

  /**
   * System prompt için token sayısı
   */
  static estimateSystemPromptTokens(prompt: string): number {
    return this.estimateTokens(prompt) + 5; // System prompt overhead
  }

  /**
   * Mesajları token limitine göre filtrele
   */
  static filterMessagesByTokenLimit(
    messages: Array<{ content: string; role?: string }>,
    maxTokens: number
  ): Array<{ content: string; role?: string }> {
    if (!messages || messages.length === 0) return [];
    
    let totalTokens = 0;
    const filteredMessages: Array<{ content: string; role?: string }> = [];
    
    // En yeni mesajlardan başla (ters sıra)
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const msgTokens = this.estimateTokens(msg.content || '') + (msg.role ? 2 : 0);
      
      if (totalTokens + msgTokens <= maxTokens) {
        filteredMessages.unshift(msg); // Başa ekle (kronolojik sıra)
        totalTokens += msgTokens;
      } else {
        break; // Token limiti aşıldı
      }
    }
    
    return filteredMessages;
  }

  /**
   * Token kullanımını logla (debug için)
   */
  static logTokenUsage(
    messages: Array<{ content: string; role?: string }>,
    label: string = 'Messages'
  ): void {
    const totalTokens = this.countTokens(messages);
    logger.log(`[TokenCounter] ${label}: ${messages.length} messages, ~${totalTokens} tokens`);
  }
}

