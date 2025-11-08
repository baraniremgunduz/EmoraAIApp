// Supabase kimlik doğrulama servisi - Repository Pattern ile refactored
import { User } from '../types';
import { container } from '../di/container';
import { IAuthRepository } from '../repositories/interfaces/IAuthRepository';
import { logger } from '../utils/logger';
import { TokenRefreshManager } from '../utils/tokenRefresh';
import { MessageEncryption } from '../utils/encryption';

export class AuthService {
  private authRepository: IAuthRepository;

  constructor(authRepo?: IAuthRepository) {
    // Dependency Injection - Test için mock geçilebilir
    this.authRepository = authRepo || container.getAuthRepository();
  }

  // Singleton instance (backward compatibility için)
  private static instance: AuthService | null = null;

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  // Kullanıcı girişi
  async signIn(email: string, password: string) {
    try {
      const result = await this.authRepository.signInWithPassword(email, password);
      
      // Login başarılıysa token refresh'i başlat
      if (result.user) {
        TokenRefreshManager.startAutoRefresh();
        logger.log('Token refresh started after login');
      }
      
      return result;
    } catch (error) {
      logger.error('Giriş hatası:', error);
      throw error;
    }
  }

  // Kullanıcı kaydı
  async signUp(email: string, password: string, name?: string) {
    try {
      const result = await this.authRepository.signUp(email, password, {
        name: name || '',
      });
      
      // Kayıt başarılıysa token refresh'i başlat
      if (result.user) {
        TokenRefreshManager.startAutoRefresh();
        logger.log('Token refresh started after registration');
      }
      
      return result;
    } catch (error) {
      logger.error('Kayıt hatası:', error);
      throw error;
    }
  }

  // Kullanıcı çıkışı
  async signOut() {
    try {
      // Token refresh'i durdur
      TokenRefreshManager.stopAutoRefresh();
      
      // Encryption key'leri temizle
      const user = await this.authRepository.getCurrentUser();
      if (user) {
        await MessageEncryption.deleteEncryptionKey(user.id);
      }
      
      await this.authRepository.signOut();
      logger.log('Logout completed, token refresh stopped');
    } catch (error) {
      logger.error('Çıkış hatası:', error);
      throw error;
    }
  }

  // Mevcut kullanıcıyı al
  async getCurrentUser() {
    try {
      return await this.authRepository.getCurrentUser();
    } catch (error) {
      logger.error('Kullanıcı bilgisi alma hatası:', error);
      throw error;
    }
  }

  // Auth state değişikliklerini dinle
  onAuthStateChange(callback: (user: User | null) => void) {
    return this.authRepository.onAuthStateChange(callback);
  }

  // Şifre sıfırlama
  async resetPassword(email: string) {
    try {
      await this.authRepository.resetPassword(email);
    } catch (error) {
      logger.error('Şifre sıfırlama hatası:', error);
      throw error;
    }
  }

  // Kullanıcı bilgilerini güncelle
  async updateUser({ data, email }: { data?: any; email?: string }) {
    try {
      await this.authRepository.updateUser({ data, email });
      return { error: null };
    } catch (error) {
      logger.error('Kullanıcı güncelleme hatası:', error);
      throw error;
    }
  }

  // Şifre güncelleme
  async updatePassword(newPassword: string) {
    try {
      await this.authRepository.updatePassword(newPassword);
      return { data: null, error: null };
    } catch (error) {
      logger.error('Şifre güncelleme hatası:', error);
      throw error;
    }
  }

  // Hesap silme
  async deleteAccount() {
    try {
      await this.authRepository.deleteAccount();
      return { error: null };
    } catch (error) {
      logger.error('Hesap silme hatası:', error);
      throw error;
    }
  }

  // Static methods for backward compatibility
  static async signIn(email: string, password: string) {
    return AuthService.getInstance().signIn(email, password);
  }

  static async signUp(email: string, password: string, name?: string) {
    return AuthService.getInstance().signUp(email, password, name);
  }

  static async signOut() {
    return AuthService.getInstance().signOut();
  }

  static async getCurrentUser() {
    return AuthService.getInstance().getCurrentUser();
  }

  static onAuthStateChange(callback: (user: User | null) => void) {
    return AuthService.getInstance().onAuthStateChange(callback);
  }

  static async resetPassword(email: string) {
    return AuthService.getInstance().resetPassword(email);
  }

  static async updateUser({ data, email }: { data?: any; email?: string }) {
    return AuthService.getInstance().updateUser({ data, email });
  }

  static async updatePassword(newPassword: string) {
    return AuthService.getInstance().updatePassword(newPassword);
  }

  static async deleteAccount() {
    return AuthService.getInstance().deleteAccount();
  }
}
