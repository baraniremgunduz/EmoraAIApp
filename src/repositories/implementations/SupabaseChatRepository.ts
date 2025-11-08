// Supabase Chat Repository Implementation - AI chat işlemleri
import { SupabaseClient } from '@supabase/supabase-js';
import { IChatRepository } from '../interfaces/IChatRepository';
import { logger } from '../../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRandomFallbackResponse } from '../../config/fallbackResponses';

export class SupabaseChatRepository implements IChatRepository {
  constructor(private supabase: SupabaseClient) {}

  async getAIResponse(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    model: string = 'gpt-4o-mini'
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase.functions.invoke('chat', {
        body: {
          messages,
          model,
        },
      });

      if (error) {
        logger.error('Backend chat function hatası:', error);
        throw error;
      }

      if (data?.error) {
        logger.error('Backend error:', data.error);
        throw new Error(data.error);
      }

      return data.choices?.[0]?.message?.content || '';
    } catch (error) {
      logger.error('AI response alma hatası:', error);
      throw error;
    }
  }

  async getFallbackResponse(userMessage: string): Promise<string> {
    try {
      const userLanguage = (await AsyncStorage.getItem('appLanguage')) || 'tr';
      const aiPersonality = (await AsyncStorage.getItem('aiPersonality')) || 'friendly';

      return getRandomFallbackResponse(aiPersonality, userLanguage);
    } catch (error) {
      logger.error('Fallback response alma hatası:', error);
      return 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.';
    }
  }
}
