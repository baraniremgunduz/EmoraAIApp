// Retry mekanizması - Network hatalarında otomatik yeniden deneme
export interface RetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean; // Exponential backoff
  retryCondition?: (error: any) => boolean;
}

export const retry = async <T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> => {
  const {
    maxRetries = 3,
    delay = 1000,
    backoff = true,
    retryCondition = error => {
      // Network hatalarında retry yap
      return (
        error?.message?.includes('network') ||
        error?.message?.includes('fetch') ||
        error?.message?.includes('timeout') ||
        error?.message?.includes('Network request failed') ||
        error?.code === 'NETWORK_ERROR' ||
        error?.code === 'ECONNABORTED' ||
        error?.code === 'ETIMEDOUT'
      );
    },
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Son deneme veya retry koşulu sağlanmıyorsa
      if (attempt === maxRetries || !retryCondition(error)) {
        throw error;
      }

      // Bekleme süresi hesapla (exponential backoff)
      const waitTime = backoff ? delay * Math.pow(2, attempt) : delay;

      // Son denemeden önce bekle
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
};
