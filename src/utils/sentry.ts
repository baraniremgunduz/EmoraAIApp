// Sentry crash reporting entegrasyonu
import * as Sentry from '@sentry/react-native';
import { logger } from './logger';

// Sentry'yi başlat (sadece production'da)
export const initSentry = () => {
  // Development'ta Sentry'yi devre dışı bırak
  if (__DEV__) {
    return;
  }

  // Production'da Sentry'yi başlat
  // DSN'i environment variable'dan al
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    // Sentry DSN yoksa uyarı ver (sadece development'ta)
    if (__DEV__) {
      logger.warn('Sentry DSN bulunamadı. Crash reporting devre dışı.');
    }
    return;
  }

  Sentry.init({
    dsn,
    enableInExpoDevelopment: false,
    debug: false,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.1, // %10 sample rate (performans için)
    // Log aggregation için tüm log seviyelerini yakala
    attachStacktrace: true,
    maxBreadcrumbs: 50,
    beforeSend(event, hint) {
      // Hassas bilgileri temizle
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers?.Authorization;
      }
      return event;
    },
    // Merkezi log aggregation için breadcrumbs
    beforeBreadcrumb(breadcrumb) {
      // Tüm log'ları Sentry'ye gönder
      return breadcrumb;
    },
  });
};

// Hata yakalama helper'ı
export const captureException = (error: Error, context?: Record<string, unknown>) => {
  if (__DEV__) {
    logger.error('Error (dev mode):', error, context);
    return;
  }

  Sentry.captureException(error, {
    extra: context,
  });
};

// Mesaj yakalama helper'ı
export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  if (__DEV__) {
    logger.log(`Message (dev mode): ${message}`);
    return;
  }

  Sentry.captureMessage(message, level);
};

// Kullanıcı context'i ayarla
export const setUserContext = (user: { id: string; email?: string; name?: string }) => {
  if (__DEV__) {
    return;
  }

  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.name,
  });
};

// Kullanıcı context'ini temizle
export const clearUserContext = () => {
  if (__DEV__) {
    return;
  }

  Sentry.setUser(null);
};
