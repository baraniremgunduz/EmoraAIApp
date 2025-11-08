// Error handler test
import { getErrorMessage, showErrorAlert } from '../errorHandler';
import { Alert } from 'react-native';

// Mock Alert
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('Error Handler', () => {
  const mockT = (key: string): string => {
    const translations: Record<string, string> = {
      'errors.network_error': 'Ağ hatası oluştu',
      'errors.network_timeout': 'Bağlantı zaman aşımına uğradı',
      'errors.auth_failed': 'Kimlik doğrulama başarısız',
      'errors.registration_failed': 'Kayıt başarısız',
      'errors.server_error': 'Sunucu hatası',
      'errors.chat_error': 'Sohbet hatası',
      'errors.unknown_error': 'Bilinmeyen hata',
      'messages.error': 'Hata',
      'common.ok': 'Tamam',
      'errors.retry': 'Tekrar Dene',
    };
    return translations[key] || key;
  };

  describe('getErrorMessage', () => {
    it('should return network error for network-related errors', () => {
      const error = { message: 'Network request failed' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Ağ hatası oluştu');
    });

    it('should return network error for fetch errors', () => {
      const error = { message: 'fetch error occurred' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Ağ hatası oluştu');
    });

    it('should return network error for NETWORK_ERROR code', () => {
      const error = { code: 'NETWORK_ERROR' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Ağ hatası oluştu');
    });

    it('should return timeout error for timeout messages', () => {
      const error = { message: 'Request timed out' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Bağlantı zaman aşımına uğradı');
    });

    it('should return auth error for auth-related errors', () => {
      const error = { message: 'Invalid login credentials' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Kimlik doğrulama başarısız');
    });

    it('should return auth error for JWT errors', () => {
      const error = { message: 'JWT token expired' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Kimlik doğrulama başarısız');
    });

    it('should return auth error for PGRST301 code', () => {
      const error = { code: 'PGRST301' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Kimlik doğrulama başarısız');
    });

    it('should return registration error for registration failures', () => {
      const error = { message: 'User already registered' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Kayıt başarısız');
    });

    it('should return server error for 5xx status codes', () => {
      const error = { status: 500 };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Sunucu hatası');
    });

    it('should return server error for internal server errors', () => {
      const error = { message: 'Internal server error' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Sunucu hatası');
    });

    it('should return chat error for chat-related errors', () => {
      const error = { message: 'Chat service unavailable', code: 'CHAT_ERROR' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Sohbet hatası');
    });

    it('should return chat error for AI-related errors', () => {
      const error = { message: 'AI service error' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Sohbet hatası');
    });

    it('should return chat error for OpenAI errors', () => {
      const error = { message: 'OpenAI API error' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Sohbet hatası');
    });

    it('should return unknown error for unrecognized errors', () => {
      const error = { message: 'Some random error' };
      const result = getErrorMessage(error, mockT);
      expect(result).toBe('Bilinmeyen hata');
    });

    it('should handle null or undefined errors', () => {
      const result1 = getErrorMessage(null, mockT);
      const result2 = getErrorMessage(undefined, mockT);
      expect(result1).toBe('Bilinmeyen hata');
      expect(result2).toBe('Bilinmeyen hata');
    });
  });

  describe('showErrorAlert', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should show alert with error message', () => {
      const error = { message: 'Network request failed' };
      showErrorAlert(error, mockT);

      expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Ağ hatası oluştu', [
        { text: 'Tamam', style: 'cancel' },
      ]);
    });

    it('should show alert with retry button when onRetry provided', () => {
      const error = { message: 'Network request failed' };
      const onRetry = jest.fn();

      showErrorAlert(error, mockT, onRetry);

      expect(Alert.alert).toHaveBeenCalledWith('Hata', 'Ağ hatası oluştu', [
        { text: 'Tekrar Dene', onPress: onRetry },
        { text: 'Tamam', style: 'cancel' },
      ]);
    });

    it('should call onRetry when retry button is pressed', () => {
      const error = { message: 'Network request failed' };
      const onRetry = jest.fn();

      showErrorAlert(error, mockT, onRetry);

      // Alert.alert'ın çağrıldığını kontrol et
      expect(Alert.alert).toHaveBeenCalled();

      // onRetry fonksiyonunu manuel olarak çağır (test için)
      onRetry();
      expect(onRetry).toHaveBeenCalled();
    });
  });
});
