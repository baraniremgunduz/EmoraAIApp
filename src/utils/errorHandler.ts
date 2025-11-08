// Hata mesajı yönetimi ve kullanıcı dostu hata gösterimi
import { Alert } from 'react-native';
import { AppError } from '../types';

export const getErrorMessage = (error: unknown, t: (key: string) => string): string => {
  const appError = error as AppError;
  // Network hataları
  if (appError?.message?.includes('network') || 
      appError?.message?.includes('fetch') ||
      appError?.message?.includes('Network request failed') ||
      appError?.code === 'NETWORK_ERROR') {
    return t('errors.network_error');
  }
  
  // Timeout hataları
  if (appError?.message?.includes('timeout') || 
      appError?.message?.includes('timed out')) {
    return t('errors.network_timeout');
  }
  
  // Auth hataları
  if (appError?.message?.includes('Invalid login') || 
      appError?.message?.includes('Invalid credentials') ||
      appError?.message?.includes('auth') ||
      appError?.code === 'PGRST301' ||
      appError?.message?.includes('JWT')) {
    return t('errors.auth_failed');
  }
  
  // Registration hataları
  if (appError?.message?.includes('User already registered') ||
      appError?.message?.includes('already exists')) {
    return t('errors.registration_failed');
  }
  
  // Server hataları (5xx)
  if (appError?.status && appError.status >= 500 || 
      appError?.code === 'PGRST301' ||
      appError?.message?.includes('Internal server error')) {
    return t('errors.server_error');
  }
  
  // Chat/AI hataları
  if (appError?.message?.toLowerCase().includes('chat') ||
      appError?.message?.includes('AI') ||
      appError?.message?.includes('OpenAI')) {
    return t('errors.chat_error');
  }
  
  // Bilinmeyen hatalar
  return t('errors.unknown_error');
};

interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export const showErrorAlert = (
  error: unknown, 
  t: (key: string) => string,
  onRetry?: () => void
) => {
  const message = getErrorMessage(error, t);
  
  const buttons: AlertButton[] = [
    { text: t('common.ok'), style: 'cancel' }
  ];
  
  if (onRetry) {
    buttons.unshift({
      text: t('errors.retry'),
      onPress: onRetry
    });
  }
  
  Alert.alert(t('messages.error'), message, buttons);
};

