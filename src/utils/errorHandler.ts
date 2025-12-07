// Hata mesajı yönetimi ve kullanıcı dostu hata gösterimi
import { Alert } from 'react-native';
import { AppError } from '../types';
import { captureException } from './sentry';

export const getErrorMessage = (error: unknown, t: (key: string) => string): string => {
  const appError = error as AppError;
  
  // Production'da Sentry'ye gönder (merkezi log aggregation)
  if (!__DEV__ && error instanceof Error) {
    captureException(error, {
      errorType: 'user_facing_error',
      errorCode: appError?.code,
      errorStatus: appError?.status,
    });
  }
  // Network hataları
  if (
    appError?.message?.includes('network') ||
    appError?.message?.includes('fetch') ||
    appError?.message?.includes('Network request failed') ||
    appError?.code === 'NETWORK_ERROR'
  ) {
    return t('errors.network_error');
  }

  // Timeout hataları
  if (appError?.message?.includes('timeout') || appError?.message?.includes('timed out')) {
    return t('errors.network_timeout');
  }

  // Auth hataları
  if (
    appError?.message?.includes('Invalid login') ||
    appError?.message?.includes('Invalid credentials') ||
    appError?.message?.includes('auth') ||
    appError?.code === 'PGRST301' ||
    appError?.message?.includes('JWT')
  ) {
    return t('errors.auth_failed');
  }

  // Registration hataları
  if (
    appError?.message?.includes('User already registered') ||
    appError?.message?.includes('already exists')
  ) {
    return t('errors.registration_failed');
  }

  // Server hataları (5xx)
  if (
    (appError?.status && appError.status >= 500) ||
    appError?.code === 'PGRST301' ||
    appError?.message?.includes('Internal server error')
  ) {
    return t('errors.server_error');
  }

  // Repository hataları (mesaj kaydetme vb.)
  if (
    appError?.name === 'RepositoryError' ||
    appError?.message?.includes('RepositoryError') ||
    appError?.message?.includes('Save messages') ||
    appError?.message?.includes('Save m')
  ) {
    // Repository hataları genellikle arka planda çözülür, kullanıcıya gösterme
    return t('errors.chat_error');
  }

  // Chat/AI hataları
  if (
    appError?.message?.toLowerCase().includes('chat') ||
    appError?.message?.includes('AI') ||
    appError?.message?.includes('OpenAI')
  ) {
    return t('errors.chat_error');
  }

  // Rate limiting hataları
  if (
    appError?.message?.includes('rate limit') ||
    appError?.message?.includes('too many requests') ||
    appError?.message?.includes('429')
  ) {
    return t('errors.rate_limit') || 'Çok fazla istek gönderildi. Lütfen birkaç saniye sonra tekrar deneyin.';
  }

  // Quota/limit hataları
  if (
    appError?.message?.includes('quota') ||
    appError?.message?.includes('limit exceeded') ||
    appError?.message?.includes('usage limit')
  ) {
    return t('errors.quota_exceeded') || 'Kullanım limitiniz doldu. Lütfen premium pakete yükseltin.';
  }

  // Validation hataları
  if (
    appError?.message?.includes('validation') ||
    appError?.message?.includes('invalid') ||
    appError?.message?.includes('required')
  ) {
    return t('errors.validation_error') || 'Geçersiz veri. Lütfen bilgilerinizi kontrol edin.';
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

  const buttons: AlertButton[] = [{ text: t('common.ok'), style: 'cancel' }];

  if (onRetry) {
    buttons.unshift({
      text: t('errors.retry'),
      onPress: onRetry,
    });
  }

  Alert.alert(t('messages.error'), message, buttons);
};
