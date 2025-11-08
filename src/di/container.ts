// Dependency Injection Container
import { supabase } from '../config/supabase';
import { IMessageRepository } from '../repositories/interfaces/IMessageRepository';
import { IChatRepository } from '../repositories/interfaces/IChatRepository';
import { ISessionRepository } from '../repositories/interfaces/ISessionRepository';
import { IAuthRepository } from '../repositories/interfaces/IAuthRepository';
import { SupabaseMessageRepository } from '../repositories/implementations/SupabaseMessageRepository';
import { SupabaseChatRepository } from '../repositories/implementations/SupabaseChatRepository';
import { SupabaseSessionRepository } from '../repositories/implementations/SupabaseSessionRepository';
import { SupabaseAuthRepository } from '../repositories/implementations/SupabaseAuthRepository';
import { SupabaseAnalyticsRepository } from '../repositories/implementations/SupabaseAnalyticsRepository';
import { ExpoNotificationRepository } from '../repositories/implementations/ExpoNotificationRepository';
import { IAnalyticsRepository } from '../repositories/interfaces/IAnalyticsRepository';
import { INotificationRepository } from '../repositories/interfaces/INotificationRepository';

/**
 * Dependency Injection Container
 * Tüm repository ve service instance'larını merkezi olarak yönetir
 */
export class DIContainer {
  private static instance: DIContainer;

  // Repository instances
  private _messageRepository: IMessageRepository | null = null;
  private _chatRepository: IChatRepository | null = null;
  private _sessionRepository: ISessionRepository | null = null;
  private _authRepository: IAuthRepository | null = null;
  private _analyticsRepository: IAnalyticsRepository | null = null;
  private _notificationRepository: INotificationRepository | null = null;

  private constructor() {
    // Private constructor - Singleton pattern
  }

  /**
   * Singleton instance al
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Message Repository getter
   */
  getMessageRepository(): IMessageRepository {
    if (!this._messageRepository) {
      this._messageRepository = new SupabaseMessageRepository(supabase);
    }
    return this._messageRepository;
  }

  /**
   * Chat Repository getter
   */
  getChatRepository(): IChatRepository {
    if (!this._chatRepository) {
      this._chatRepository = new SupabaseChatRepository(supabase);
    }
    return this._chatRepository;
  }

  /**
   * Session Repository getter
   */
  getSessionRepository(): ISessionRepository {
    if (!this._sessionRepository) {
      this._sessionRepository = new SupabaseSessionRepository(supabase);
    }
    return this._sessionRepository;
  }

  /**
   * Auth Repository getter
   */
  getAuthRepository(): IAuthRepository {
    if (!this._authRepository) {
      this._authRepository = new SupabaseAuthRepository(supabase);
    }
    return this._authRepository;
  }

  /**
   * Analytics Repository getter
   */
  getAnalyticsRepository(): IAnalyticsRepository {
    if (!this._analyticsRepository) {
      this._analyticsRepository = new SupabaseAnalyticsRepository(supabase);
    }
    return this._analyticsRepository;
  }

  /**
   * Notification Repository getter
   */
  getNotificationRepository(): INotificationRepository {
    if (!this._notificationRepository) {
      this._notificationRepository = new ExpoNotificationRepository();
    }
    return this._notificationRepository;
  }

  /**
   * Test için repository'leri mock'layabilmek için setter'lar
   */
  setMessageRepository(repository: IMessageRepository): void {
    this._messageRepository = repository;
  }

  setChatRepository(repository: IChatRepository): void {
    this._chatRepository = repository;
  }

  setSessionRepository(repository: ISessionRepository): void {
    this._sessionRepository = repository;
  }

  setAuthRepository(repository: IAuthRepository): void {
    this._authRepository = repository;
  }

  setAnalyticsRepository(repository: IAnalyticsRepository): void {
    this._analyticsRepository = repository;
  }

  setNotificationRepository(repository: INotificationRepository): void {
    this._notificationRepository = repository;
  }

  /**
   * Tüm repository'leri sıfırla (test için)
   */
  reset(): void {
    this._messageRepository = null;
    this._chatRepository = null;
    this._sessionRepository = null;
    this._authRepository = null;
    this._analyticsRepository = null;
    this._notificationRepository = null;
  }
}

// Export singleton instance
export const container = DIContainer.getInstance();
