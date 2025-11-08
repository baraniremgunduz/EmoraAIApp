// AI sohbet servisi - Repository Pattern ile refactored
import { Message, UserPreferences, AppError } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRestrictedTopicsText } from '../config/restrictedTopics';
import { retry } from '../utils/retryHandler';
import { logger } from '../utils/logger';
import { TokenCounter } from '../utils/tokenCounter';
import { LANGUAGE_PATTERNS } from '../config/languagePatterns';
import { createSystemPrompt } from '../config/personalityPrompts';
import { container } from '../di/container';
import { IMessageRepository } from '../repositories/interfaces/IMessageRepository';
import { IChatRepository } from '../repositories/interfaces/IChatRepository';
import { ISessionRepository } from '../repositories/interfaces/ISessionRepository';
import { IAuthRepository } from '../repositories/interfaces/IAuthRepository';

export class ChatService {
  private messageRepository: IMessageRepository;
  private chatRepository: IChatRepository;
  private sessionRepository: ISessionRepository;
  private authRepository: IAuthRepository;

  constructor(
    messageRepo?: IMessageRepository,
    chatRepo?: IChatRepository,
    sessionRepo?: ISessionRepository,
    authRepo?: IAuthRepository
  ) {
    // Dependency Injection - Test için mock'lar geçilebilir
    this.messageRepository = messageRepo || container.getMessageRepository();
    this.chatRepository = chatRepo || container.getChatRepository();
    this.sessionRepository = sessionRepo || container.getSessionRepository();
    this.authRepository = authRepo || container.getAuthRepository();
  }

  // Singleton instance (backward compatibility için)
  private static instance: ChatService | null = null;

  static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }

  // Mesajdan dil algılama fonksiyonu - refactored
  private detectLanguageFromMessage(message: string): string | null {
    const text = message.toLowerCase();

    // Merkezi pattern config'inden dil algılama
    for (const langPattern of LANGUAGE_PATTERNS) {
      if (langPattern.patterns.some(pattern => pattern.test(text))) {
        return langPattern.code;
      }
    }

    return null; // Dil algılanamadı
  }

  // Yeni mesaj gönder ve AI'dan cevap al
  async sendMessage(
    content: string,
    userId: string,
    conversationHistory?: Message[]
  ): Promise<Message> {
    try {
      // Kullanıcı mesajını oluştur
      const userMessage: Message = {
        id: Date.now().toString(),
        content,
        role: 'user',
        timestamp: new Date().toISOString(),
        user_id: userId,
      };

      // AI'dan cevap al (conversation history ile)
      const aiResponse = await this.getAIResponse(content, userId, conversationHistory);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponse,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        user_id: userId,
      };

      // Mesajları veritabanına kaydet
      await this.saveMessages([userMessage, aiMessage], userId);

      return aiMessage;
    } catch (error) {
      logger.error('Mesaj gönderme hatası:', error);
      throw error;
    }
  }

  // Backend Edge Function ile AI'dan cevap al
  private async getAIResponse(
    userMessage: string,
    userId?: string,
    conversationHistory?: Message[]
  ): Promise<string> {
    try {
      // Auth kontrolü - kullanıcı oturum açmış mı?
      const user = await this.authRepository.getCurrentUser();
      if (!user) {
        logger.error('Auth error in getAIResponse: No user');
        logger.error('User ID from param:', userId);
        return await this.chatRepository.getFallbackResponse(userMessage);
      }

      const userLanguage = (await AsyncStorage.getItem('appLanguage')) || 'tr';
      const aiPersonality = (await AsyncStorage.getItem('aiPersonality')) || 'friendly';

      // Kullanıcı mesajından dil algılama
      const detectedLanguage = this.detectLanguageFromMessage(userMessage);
      const finalLanguage = detectedLanguage || userLanguage;

      // Token limiti ayarları
      const MAX_TOKENS = 4000; // GPT-4o-mini için maksimum context window
      const SYSTEM_PROMPT_TOKENS = 200; // System prompt için tahmini token
      const USER_MESSAGE_TOKENS = 100; // Yeni kullanıcı mesajı için tahmini token
      const AVAILABLE_TOKENS = MAX_TOKENS - SYSTEM_PROMPT_TOKENS - USER_MESSAGE_TOKENS;

      // Conversation history varsa onu kullan, yoksa veritabanından al
      let recentMessages: Message[] = [];
      if (conversationHistory && conversationHistory.length > 0) {
        // State'teki mesajları kullan (welcome mesajını ve boş mesajları hariç tut)
        const filteredMessages = conversationHistory.filter(
          msg =>
            msg.id !== 'welcome' &&
            msg.content &&
            msg.content.trim() !== '' &&
            msg.role &&
            (msg.role === 'user' || msg.role === 'assistant')
        );

        // Son mesajı çıkar (yeni kullanıcı mesajı)
        const messagesWithoutLast = filteredMessages.slice(0, -1);

        // Token limitine göre mesajları filtrele
        const messagesForTokenCount = messagesWithoutLast.map(msg => ({
          content: msg.content,
          role: msg.role,
        }));

        recentMessages = TokenCounter.filterMessagesByTokenLimit(
          messagesForTokenCount,
          AVAILABLE_TOKENS
        ).map((filtered, index) => {
          // Orijinal mesajı bul
          const originalIndex = messagesWithoutLast.findIndex(
            m => m.content === filtered.content && m.role === filtered.role
          );
          return messagesWithoutLast[originalIndex >= 0 ? originalIndex : index];
        });
      } else {
        // Fallback: veritabanından al (daha fazla mesaj al, sonra token limitine göre filtrele)
        const allRecentMessages = await this.messageRepository.findRecentByUserId(userId || '', 50);

        // Token limitine göre filtrele
        const messagesForTokenCount = allRecentMessages.map(msg => ({
          content: msg.content,
          role: msg.role,
        }));

        recentMessages = TokenCounter.filterMessagesByTokenLimit(
          messagesForTokenCount,
          AVAILABLE_TOKENS
        ).map((filtered, index) => {
          const originalIndex = allRecentMessages.findIndex(
            m => m.content === filtered.content && m.role === filtered.role
          );
          return allRecentMessages[originalIndex >= 0 ? originalIndex : index];
        });
      }

      // Token kullanımını logla (debug için)
      TokenCounter.logTokenUsage(
        recentMessages.map(msg => ({ content: msg.content, role: msg.role })),
        'Context window'
      );

      // Kullanıcı tercihlerini al
      const userPreferences = await this.getUserPreferences(userId || '');

      // Gelişmiş system prompt oluştur
      const systemPrompt = this.createSystemPrompt(finalLanguage, aiPersonality, userPreferences);

      // Messages array oluştur
      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt,
        },
        ...recentMessages
          .filter(
            msg =>
              msg.content &&
              msg.content.trim() !== '' &&
              msg.role &&
              (msg.role === 'user' || msg.role === 'assistant')
          )
          .map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content.trim(),
          })),
        {
          role: 'user' as const,
          content: userMessage.trim(),
        },
      ];

      // Debug log
      logger.log('Sending to Edge Function - Messages count:', messages.length);
      logger.log('Recent messages count:', recentMessages.length);
      logger.log('User message:', userMessage);
      logger.log('System prompt language:', finalLanguage);

      // Supabase Edge Function'ına istek gönder - RETRY ile
      try {
        const aiResponse = await retry(
          async () => {
            return await this.chatRepository.getAIResponse(messages, 'gpt-4o-mini');
          },
          {
            maxRetries: 3,
            delay: 1000,
            backoff: true,
            retryCondition: error => {
              return (
                error?.message?.includes('network') ||
                error?.message?.includes('fetch') ||
                error?.message?.includes('timeout') ||
                error?.message?.includes('Network request failed') ||
                error?.code === 'NETWORK_ERROR' ||
                error?.code === 'ECONNABORTED' ||
                error?.code === 'ETIMEDOUT'
              );
            },
          }
        );

        return aiResponse || (await this.chatRepository.getFallbackResponse(userMessage));
      } catch (error) {
        logger.error('Backend chat function hatası:', error);
        return await this.chatRepository.getFallbackResponse(userMessage);
      }
    } catch (error: unknown) {
      const appError = error as AppError;
      logger.error('Backend chat function hatası:', appError);
      logger.error('Error message:', appError?.message);
      return await this.chatRepository.getFallbackResponse(userMessage);
    }
  }

  // Kullanıcı tercihlerini al
  private async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const preferences = await AsyncStorage.getItem(`userPreferences_${userId}`);
      return preferences ? (JSON.parse(preferences) as UserPreferences) : {};
    } catch (error) {
      logger.error('Kullanıcı tercihleri alma hatası:', error);
      return {};
    }
  }

  // Gelişmiş system prompt oluştur - refactored
  private createSystemPrompt(
    language: string,
    personality: string,
    userPreferences: UserPreferences = {}
  ): string {
    // Kısıtlı konular metnini al
    const restrictedTopicsText = getRestrictedTopicsText(language);

    // Merkezi prompt generator kullan
    return createSystemPrompt(
      personality,
      language as 'tr' | 'en',
      restrictedTopicsText,
      userPreferences
    );
  }

  // Mesajları veritabanına kaydet
  async saveMessages(messages: Message[], userId: string): Promise<void> {
    try {
      // Önce aktif chat session'ı bul veya oluştur
      const sessionId = await this.sessionRepository.findOrCreateActiveSession(userId);

      // Mesajları kaydet
      await this.messageRepository.save(messages, sessionId, userId);
    } catch (error) {
      logger.error('Mesaj kaydetme hatası:', error);
      throw error;
    }
  }

  // Session mesajlarını yükle
  async loadSessionMessages(sessionId: string, userId: string): Promise<Message[]> {
    try {
      return await this.messageRepository.findBySessionId(sessionId, userId);
    } catch (error) {
      logger.error('Session mesajları yükleme hatası:', error);
      throw error;
    }
  }

  // Session mesajlarını sayfalama ile yükle
  async loadSessionMessagesPaginated(
    sessionId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      return await this.messageRepository.findBySessionIdPaginated(
        sessionId,
        userId,
        limit,
        offset
      );
    } catch (error) {
      logger.error('Session mesajları yükleme hatası (paginated):', error);
      throw error;
    }
  }

  // Static methods for backward compatibility
  static async sendMessage(
    content: string,
    userId: string,
    conversationHistory?: Message[]
  ): Promise<Message> {
    return ChatService.getInstance().sendMessage(content, userId, conversationHistory);
  }

  static async saveMessages(messages: Message[], userId: string): Promise<void> {
    return ChatService.getInstance().saveMessages(messages, userId);
  }

  static async loadSessionMessages(sessionId: string, userId: string): Promise<Message[]> {
    return ChatService.getInstance().loadSessionMessages(sessionId, userId);
  }
}
