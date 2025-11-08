// Supabase Message Repository Implementation
import { SupabaseClient } from '@supabase/supabase-js';
import { Message, DatabaseMessage } from '../../types';
import { IMessageRepository } from '../interfaces/IMessageRepository';
import { logger } from '../../utils/logger';
import { RepositoryError } from '../errors/RepositoryError';
import { CacheManager } from '../cache/CacheManager';
import { MessageEncryption } from '../../utils/encryption';

export class SupabaseMessageRepository implements IMessageRepository {
  constructor(private supabase: SupabaseClient) {}

  async findBySessionId(sessionId: string, userId: string): Promise<Message[]> {
    try {
      // Cache kontrolü
      const cacheKey = `messages_${sessionId}_${userId}`;
      const cached = await CacheManager.get<Message[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .order('timestamp', { ascending: true });

      if (error) {
        throw RepositoryError.fromError(error, 'Find messages by session');
      }

      if (!messages || messages.length === 0) {
        return [];
      }

      // Mesajları decrypt et (async map için Promise.all)
      const mappedMessages = await Promise.all(messages.map(msg => this.mapToMessage(msg, userId)));

      // Cache'e kaydet (5 dakika)
      await CacheManager.set(cacheKey, mappedMessages, 5 * 60 * 1000);

      return mappedMessages;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw RepositoryError.fromError(error, 'Find messages by session');
    }
  }

  async findRecentByUserId(userId: string, limit: number = 8): Promise<Message[]> {
    try {
      if (!userId || userId === 'anonymous') {
        return [];
      }

      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        logger.error('Son mesajları alma hatası:', error);
        return [];
      }

      // Mesajları ters çevir ve decrypt et
      const reversedMessages = (messages || []).reverse();
      return await Promise.all(reversedMessages.map(msg => this.mapToMessage(msg, userId)));
    } catch (error) {
      logger.error('Son mesajları alma hatası:', error);
      return [];
    }
  }

  async save(messages: Message[], sessionId: string, userId: string): Promise<void> {
    try {
      // Mesajları şifrele ve database formatına dönüştür
      const messagesToSave = await Promise.all(
        messages.map(async msg => {
          const dbFormat = this.mapToDatabase(msg, sessionId);

          // E2E encryption: Mesaj içeriğini şifrele
          try {
            const encryptedContent = await MessageEncryption.encrypt(msg.content, userId);
            dbFormat.content = `encrypted_${encryptedContent}`;
          } catch (error) {
            logger.error('Message encryption error:', error);
            // Encryption başarısız olursa plain text kaydet (fallback)
            // Production'da bu durumda hata fırlatılmalı
          }

          return dbFormat;
        })
      );

      const { error: insertError } = await this.supabase.from('messages').insert(messagesToSave);

      if (insertError) {
        throw RepositoryError.fromError(insertError, 'Save messages');
      }

      // Cache'i temizle
      const cacheKey = `messages_${sessionId}_${userId}`;
      await CacheManager.delete(cacheKey);
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw RepositoryError.fromError(error, 'Save messages');
    }
  }

  async deleteBySessionId(sessionId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('messages')
        .delete()
        .eq('session_id', sessionId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Mesaj silme hatası:', error);
      throw error;
    }
  }

  async findBySessionIdPaginated(
    sessionId: string,
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Message[]> {
    try {
      // Cache kontrolü (pagination için farklı key)
      const cacheKey = `messages_${sessionId}_${userId}_${limit}_${offset}`;
      const cached = await CacheManager.get<Message[]>(cacheKey);
      if (cached) {
        return cached;
      }

      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .order('timestamp', { ascending: true })
        .range(offset, offset + limit - 1); // Supabase pagination

      if (error) {
        throw RepositoryError.fromError(error, 'Find messages by session (paginated)');
      }

      if (!messages || messages.length === 0) {
        return [];
      }

      // Mesajları decrypt et
      const mappedMessages = await Promise.all(messages.map(msg => this.mapToMessage(msg, userId)));

      // Cache'e kaydet (2 dakika - pagination için daha kısa)
      await CacheManager.set(cacheKey, mappedMessages, 2 * 60 * 1000);

      return mappedMessages;
    } catch (error) {
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw RepositoryError.fromError(error, 'Find messages by session (paginated)');
    }
  }

  async mapToMessage(dbMessage: DatabaseMessage, userId: string): Promise<Message> {
    // Mesaj şifreli mi kontrol et (encrypted_ prefix ile başlıyorsa)
    let content = dbMessage.content;

    // E2E encryption: Eğer mesaj şifreliyse çöz
    if (content.startsWith('encrypted_')) {
      try {
        const encryptedContent = content.replace('encrypted_', '');
        content = await MessageEncryption.decrypt(encryptedContent, userId);
      } catch (error) {
        logger.error('Message decryption error:', error);
        // Decryption başarısız olursa encrypted content'i göster
        content = '[Encrypted message - decryption failed]';
      }
    }

    return {
      id: dbMessage.id,
      content,
      role: dbMessage.role as 'user' | 'assistant',
      timestamp: dbMessage.timestamp || dbMessage.created_at || new Date().toISOString(),
      user_id: dbMessage.user_id,
    };
  }

  mapToDatabase(message: Message, sessionId: string): any {
    return {
      session_id: sessionId,
      content: message.content,
      role: message.role,
      timestamp: message.timestamp || new Date().toISOString(),
      user_id: message.user_id,
    };
  }
}
