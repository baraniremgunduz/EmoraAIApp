// Chat Repository Interface - AI chat işlemleri
import { Message } from '../../types';

export interface IChatRepository {
  /**
   * AI'dan mesaj al
   */
  getAIResponse(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model?: string
  ): Promise<string>;
  
  /**
   * Fallback response al (API çalışmazsa)
   */
  getFallbackResponse(userMessage: string): Promise<string>;
}

