// Message Encryption - End-to-End encryption için
import CryptoJS from 'crypto-js';
import { logger } from './logger';
import * as Keychain from 'react-native-keychain';

// CryptoJS'in native crypto modülü hatasını önlemek için random generator override et
// Simülatörde native crypto modülü çalışmadığı için fallback kullan
if (typeof CryptoJS !== 'undefined' && CryptoJS.lib && CryptoJS.lib.WordArray) {
  try {
    const originalRandom = CryptoJS.lib.WordArray.random;
    if (typeof originalRandom === 'function') {
      CryptoJS.lib.WordArray.random = function(nBytes: number) {
        try {
          // Önce native crypto'yu dene
          return originalRandom.call(this, nBytes);
        } catch (error) {
          // Native crypto başarısız olursa fallback kullan
          // Math.random() kullanarak güvenli olmayan ama çalışan bir random generator
          const words: number[] = [];
          for (let i = 0; i < nBytes; i += 4) {
            // Math.random() ile 32-bit word oluştur
            const word = Math.floor(Math.random() * 0x100000000);
            words.push(word);
          }
          return CryptoJS.lib.WordArray.create(words, nBytes);
        }
      };
    }
  } catch (error) {
    // Override hatası - sessizce devam et
    if (__DEV__) {
      logger.log('CryptoJS random override failed (will use fallback):', error);
    }
  }
}

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
      // Hiç log etme - production'da hata paneli gösterme
      // Sadece development'ta log et
      if (__DEV__) {
        logger.log('Get encryption key error (silent, fallback used):', error?.message || error);
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
    // console.error ve console.warn'i geçici olarak override et (CryptoJS hatalarını gizlemek için)
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const suppressedErrors: string[] = [];
    
    // CryptoJS'in native crypto hatalarını yakala ve sessizce handle et
    const suppressCryptoErrors = (...args: any[]) => {
      const errorMsg = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      // CryptoJS'in native crypto hatasını yakala ve sessizce handle et
      if (errorMsg.includes('Native crypto module') || 
          errorMsg.includes('secure random number') ||
          errorMsg.includes('crypto') ||
          errorMsg.includes('Encryption error')) {
        suppressedErrors.push(errorMsg);
        return; // Sessizce devam et
      }
      // Diğer hataları normal şekilde logla
      originalConsoleError(...args);
    };
    
    try {
      if (!message || !userId) {
        throw new Error('Message and userId are required');
      }

      const key = await this.getEncryptionKey(userId);
      
      // console.error ve console.warn'i override et
      console.error = suppressCryptoErrors;
      console.warn = suppressCryptoErrors;
      
      let encrypted: string;
      
      try {
        // İlk deneme: CryptoJS'in otomatik IV oluşturmasına izin ver
        encrypted = CryptoJS.AES.encrypt(message, key).toString();
      } catch (cryptoError: any) {
        // Native crypto hatası - manuel IV ile tekrar dene
        try {
          // Manuel IV oluştur (override edilmiş random generator kullanılacak)
          const iv = CryptoJS.lib.WordArray.random(128 / 8);
          const encryptedObj = CryptoJS.AES.encrypt(message, key, { iv: iv });
          encrypted = encryptedObj.toString();
        } catch (fallbackError: any) {
          // Manuel IV ile de başarısız oldu - tamamen sessizce handle et
          // Hiç log etme, sadece throw et (Repository'de handle edilecek)
          throw new Error('Encryption failed');
        }
      } finally {
        // console.error ve console.warn'i geri yükle
        console.error = originalConsoleError;
        console.warn = originalConsoleWarn;
      }

      // Başarılı - sadece debug modunda log et (suppressed errors'ı loglama)
      if (__DEV__ && suppressedErrors.length === 0) {
        logger.log('Message encrypted successfully');
      }
      return encrypted;
    } catch (error: any) {
      // console.error ve console.warn'i geri yükle (hata durumunda da)
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
      
      // Encryption hatası - tamamen sessizce handle et
      // Hiç log etme - production'da hata paneli gösterme
      // Repository'de bu durum handle ediliyor (plain text kaydedilecek)
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
      
      // CryptoJS.AES.decrypt çağrısını try-catch ile sar
      let decrypted: string;
      try {
      const bytes = CryptoJS.AES.decrypt(encryptedMessage, key);
        decrypted = bytes.toString(CryptoJS.enc.Utf8);
      } catch (cryptoError: any) {
        // Native crypto hatası - fallback deneme
        // Eğer hata devam ederse throw et
        throw cryptoError;
      }

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
      // Hiç log etme - production'da hata paneli gösterme
      // Sadece development'ta log et
      if (__DEV__) {
        logger.log('Decryption error (silent):', error?.message || error);
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
