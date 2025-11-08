// Auth Repository Interface
import { User } from '../../types';

export interface IAuthRepository {
  /**
   * Email ve şifre ile giriş yap
   */
  signInWithPassword(
    email: string,
    password: string
  ): Promise<{
    user: User | null;
    session: any;
  }>;

  /**
   * Yeni kullanıcı kaydı
   */
  signUp(
    email: string,
    password: string,
    metadata?: any
  ): Promise<{
    user: User | null;
    session: any;
  }>;

  /**
   * Çıkış yap
   */
  signOut(): Promise<void>;

  /**
   * Mevcut kullanıcıyı getir
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Auth state değişikliklerini dinle
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void;

  /**
   * Şifre sıfırlama email'i gönder
   */
  resetPassword(email: string): Promise<void>;

  /**
   * Kullanıcı bilgilerini güncelle
   */
  updateUser(updates: { data?: any; email?: string }): Promise<void>;

  /**
   * Şifre güncelle
   */
  updatePassword(newPassword: string): Promise<void>;

  /**
   * Hesabı sil
   */
  deleteAccount(): Promise<void>;
}
