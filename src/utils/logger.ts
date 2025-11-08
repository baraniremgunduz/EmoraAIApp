// Production-safe logger utility with Sentry integration
// Development'ta console.log çalışır, production'da Sentry'ye gönderilir

import { captureMessage, captureException } from './sentry';

const isDevelopment = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    } else {
      // Production'da Sentry'ye gönder
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      captureMessage(message, 'info');
    }
  },

  error: (...args: any[]) => {
    // Error'lar her zaman loglanır
    console.error(...args);
    
    // Production'da Sentry'ye gönder
    if (!isDevelopment) {
      const error = args.find(arg => arg instanceof Error);
      if (error) {
        captureException(error, {
          context: args.filter(arg => !(arg instanceof Error)),
        });
      } else {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ');
        captureMessage(message, 'error');
      }
    }
  },

  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    } else {
      // Production'da Sentry'ye gönder
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      captureMessage(message, 'warning');
    }
  },

  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    } else {
      // Production'da Sentry'ye gönder (debug level)
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      captureMessage(message, 'debug');
    }
  },

  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    } else {
      // Production'da Sentry'ye gönder
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      captureMessage(message, 'info');
    }
  },
};
