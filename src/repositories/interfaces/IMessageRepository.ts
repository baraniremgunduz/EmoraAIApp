// Message Repository Interface
import { Message, DatabaseMessage } from '../../types';

export interface IMessageRepository {
  /**
   * Belirli bir session'a ait mesajları getir
   */
  findBySessionId(sessionId: string, userId: string): Promise<Message[]>;

  /**
   * Kullanıcının son mesajlarını getir (context için)
   */
  findRecentByUserId(userId: string, limit: number): Promise<Message[]>;

  /**
   * Session'a ait mesajları sayfalama ile getir (pagination)
   */
  findBySessionIdPaginated(
    sessionId: string,
    userId: string,
    limit: number,
    offset: number
  ): Promise<Message[]>;

  /**
   * Mesajları kaydet
   */
  save(messages: Message[], sessionId: string, userId: string): Promise<void>;

  /**
   * Session'a ait mesajları sil
   */
  deleteBySessionId(sessionId: string, userId: string): Promise<void>;

  /**
   * Database message'ı Message tipine dönüştür (async - encryption için)
   */
  mapToMessage(dbMessage: DatabaseMessage, userId: string): Promise<Message>;

  /**
   * Message'ı database formatına dönüştür
   */
  mapToDatabase(message: Message, sessionId: string): any;
}
