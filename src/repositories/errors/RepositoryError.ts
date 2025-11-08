// Repository Error - Merkezi hata yönetimi
import { AppError } from '../../types';
import { logger } from '../../utils/logger';

export class RepositoryError extends Error implements AppError {
  code?: string;
  status?: number;
  originalError?: any;

  constructor(
    message: string,
    code?: string,
    status?: number,
    originalError?: any
  ) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.status = status;
    this.originalError = originalError;

    // Error stack'i koru
    if (originalError?.stack) {
      this.stack = originalError.stack;
    }

    logger.error('RepositoryError:', {
      message,
      code,
      status,
      originalError,
    });
  }

  /**
   * Network hatası mı?
   */
  isNetworkError(): boolean {
    return (
      this.code === 'NETWORK_ERROR' ||
      this.message.includes('network') ||
      this.message.includes('fetch') ||
      this.message.includes('timeout') ||
      this.status === 0
    );
  }

  /**
   * Auth hatası mı?
   */
  isAuthError(): boolean {
    return (
      this.code === 'PGRST301' ||
      this.message.includes('auth') ||
      this.message.includes('unauthorized') ||
      this.status === 401 ||
      this.status === 403
    );
  }

  /**
   * Server hatası mı?
   */
  isServerError(): boolean {
    return (
      this.status !== undefined &&
      this.status >= 500 &&
      this.status < 600
    );
  }

  /**
   * Client hatası mı?
   */
  isClientError(): boolean {
    return (
      this.status !== undefined &&
      this.status >= 400 &&
      this.status < 500
    );
  }

  /**
   * Kullanıcı dostu hata mesajı
   */
  getUserFriendlyMessage(): string {
    if (this.isNetworkError()) {
      return 'İnternet bağlantınızı kontrol edin';
    }
    
    if (this.isAuthError()) {
      return 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın';
    }
    
    if (this.isServerError()) {
      return 'Sunucu hatası. Lütfen daha sonra tekrar deneyin';
    }
    
    if (this.isClientError()) {
      return 'İstek geçersiz. Lütfen tekrar deneyin';
    }
    
    return this.message || 'Bilinmeyen bir hata oluştu';
  }

  /**
   * Error'dan RepositoryError oluştur
   */
  static fromError(error: any, context?: string): RepositoryError {
    if (error instanceof RepositoryError) {
      return error;
    }

    const message = error?.message || 'Unknown error';
    const code = error?.code;
    const status = error?.status || error?.response?.status;

    return new RepositoryError(
      context ? `${context}: ${message}` : message,
      code,
      status,
      error
    );
  }
}

