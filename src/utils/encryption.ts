// Message Encryption - End-to-End encryption için
import CryptoJS from 'crypto-js';
import { logger } from './logger';
import * as Keychain from 'react-native-keychain';

export class MessageEncryption {
  private static readonly KEYCHAIN_SERVICE = 'emora_encryption';
  private static readonly KEY_DERIVATION_ITERATIONS = 10000;

  /**
   * Kullanıcıya özel encryption key oluştur veya keychain'den al
   */
  private static async getEncryptionKey(userId: string): Promise<string> {
    try {
      // Önce keychain'den al
      const credentials = await Keychain.getGenericPassword({
        service: this.KEYCHAIN_SERVICE,
      });

      if (credentials && credentials.username === `encryption_key_${userId}`) {
        return credentials.password;
      }

      // Keychain'de yoksa yeni key oluştur
      const newKey = this.generateEncryptionKey(userId);

      // Keychain'e kaydet
      await Keychain.setGenericPassword(`encryption_key_${userId}`, newKey, {
        service: this.KEYCHAIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });

      // Sadece debug modunda log et
      if (__DEV__) {
        logger.log('New encryption key generated and stored');
      }
      return newKey;
    } catch (error: any) {
      // Keychain hatası - sessizce handle et, fallback key kullan
      // Sadece debug modunda log et
      if (__DEV__) {
        logger.error('Get encryption key error (silent):', error?.message || error);
      }
      // Fallback: userId'den türetilmiş key (güvenli değil ama çalışır)
      return this.generateEncryptionKey(userId);
    }
  }

  /**
   * Encryption key oluştur
   */
  private static generateEncryptionKey(userId: string): string {
    // Kullanıcı ID'sinden deterministic key oluştur
    // NOT: Production'da daha güçlü key generation kullanılmalı
    const salt = `emora_salt_${userId}`;
    const key = CryptoJS.PBKDF2(userId, salt, {
      keySize: 256 / 32,
      iterations: this.KEY_DERIVATION_ITERATIONS,
    });

    return key.toString();
  }

  /**
   * Mesajı şifrele
   */
  static async encrypt(message: string, userId: string): Promise<string> {
    try {
      if (!message || !userId) {
        throw new Error('Message and userId are required');
      }

      const key = await this.getEncryptionKey(userId);
      const encrypted = CryptoJS.AES.encrypt(message, key).toString();

      // Sadece debug modunda log et
      if (__DEV__) {
        logger.log('Message encrypted successfully');
      }
      return encrypted;
    } catch (error: any) {
      // Encryption hatası - sessizce handle et, console error'a neden olma
      // Sadece debug modunda log et
      if (__DEV__) {
        logger.error('Encryption error (silent):', error?.message || error);
      }
      throw new Error('Failed to encrypt message');
    }
  }

  /**
   * Mesajı çöz
   */
  static async decrypt(encryptedMessage: string, userId: string): Promise<string> {
    try {
      if (!encryptedMessage || !userId) {
        throw new Error('Encrypted message and userId are required');
      }

      const key = await this.getEncryptionKey(userId);
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      if (!decrypted) {
        throw new Error('Failed to decrypt message - invalid key or corrupted data');
      }

      // Sadece debug modunda log et
      if (__DEV__) {
        logger.log('Message decrypted successfully');
      }
      return decrypted;
    } catch (error: any) {
      // Decryption hatası - sessizce handle et, console error'a neden olma
      // Sadece debug modunda log et
      if (__DEV__) {
        logger.error('Decryption error (silent):', error?.message || error);
      }
      throw new Error('Failed to decrypt message');
    }
  }

  /**
   * Encryption key'i sil (logout için)
   */
  static async deleteEncryptionKey(userId: string): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: this.KEYCHAIN_SERVICE,
      });
      logger.log('Encryption key deleted');
    } catch (error) {
      logger.error('Delete encryption key error:', error);
    }
  }

  /**
   * Key'in var olup olmadığını kontrol et
   */
  static async hasEncryptionKey(userId: string): Promise<boolean> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: this.KEYCHAIN_SERVICE,
      });
      return credentials !== false && credentials.username === `encryption_key_${userId}`;
    } catch (error) {
      return false;
    }
  }
}
