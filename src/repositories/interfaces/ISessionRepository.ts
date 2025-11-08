// Session Repository Interface
import { ChatSession } from '../../types';

export interface ISessionRepository {
  /**
   * Aktif session'ı bul veya oluştur
   */
  findOrCreateActiveSession(userId: string, title?: string): Promise<string>;

  /**
   * Kullanıcının tüm session'larını getir
   */
  findByUserId(userId: string): Promise<ChatSession[]>;

  /**
   * Session'ı ID ile getir
   */
  findById(sessionId: string, userId: string): Promise<ChatSession | null>;

  /**
   * Session başlığını güncelle
   */
  updateTitle(sessionId: string, userId: string, title: string): Promise<void>;

  /**
   * Session'ı sil
   */
  delete(sessionId: string, userId: string): Promise<void>;
}
