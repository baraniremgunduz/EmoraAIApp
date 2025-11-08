// Retry handler test
import { retry, RetryOptions } from '../retryHandler';

describe('Retry Handler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('retry', () => {
    it('should succeed on first attempt', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await retry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network error', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ message: 'network error' })
        .mockResolvedValueOnce('success');

      const promise = retry(fn, { maxRetries: 2, delay: 100 });

      // İlk deneme başarısız
      await Promise.resolve();

      // Delay'i bekle
      jest.advanceTimersByTime(100);
      await Promise.resolve();

      // İkinci deneme başarılı
      jest.advanceTimersByTime(100);

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should use exponential backoff by default', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ message: 'network error' })
        .mockRejectedValueOnce({ message: 'network error' })
        .mockResolvedValueOnce('success');

      const promise = retry(fn, { maxRetries: 3, delay: 100 });

      // İlk deneme
      await Promise.resolve();
      jest.advanceTimersByTime(100); // 100ms

      // İkinci deneme
      await Promise.resolve();
      jest.advanceTimersByTime(200); // 200ms (2x)

      // Üçüncü deneme
      await Promise.resolve();
      jest.advanceTimersByTime(400); // 400ms (4x)

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not use exponential backoff when disabled', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ message: 'network error' })
        .mockRejectedValueOnce({ message: 'network error' })
        .mockResolvedValueOnce('success');

      const promise = retry(fn, { maxRetries: 3, delay: 100, backoff: false });

      // Tüm denemeler aynı delay ile
      await Promise.resolve();
      jest.advanceTimersByTime(100);

      await Promise.resolve();
      jest.advanceTimersByTime(100);

      await Promise.resolve();
      jest.advanceTimersByTime(100);

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should retry on fetch errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ message: 'fetch failed' })
        .mockResolvedValueOnce('success');

      const promise = retry(fn, { maxRetries: 2, delay: 100 });

      await Promise.resolve();
      jest.advanceTimersByTime(100);

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout errors', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ message: 'timeout occurred' })
        .mockResolvedValueOnce('success');

      const promise = retry(fn, { maxRetries: 2, delay: 100 });

      await Promise.resolve();
      jest.advanceTimersByTime(100);

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on NETWORK_ERROR code', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ code: 'NETWORK_ERROR' })
        .mockResolvedValueOnce('success');

      const promise = retry(fn, { maxRetries: 2, delay: 100 });

      await Promise.resolve();
      jest.advanceTimersByTime(100);

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-network errors', async () => {
      const fn = jest.fn().mockRejectedValue({ message: 'validation error' });

      await expect(retry(fn, { maxRetries: 3, delay: 100 })).rejects.toEqual({
        message: 'validation error',
      });

      expect(fn).toHaveBeenCalledTimes(1); // Sadece bir kez çağrıldı
    });

    it('should use custom retry condition', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce({ code: 'CUSTOM_ERROR' })
        .mockResolvedValueOnce('success');

      const customCondition = (error: any) => error.code === 'CUSTOM_ERROR';

      const promise = retry(fn, {
        maxRetries: 2,
        delay: 100,
        retryCondition: customCondition,
      });

      await Promise.resolve();
      jest.advanceTimersByTime(100);

      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      const error = { message: 'network error' };
      const fn = jest.fn().mockRejectedValue(error);

      const promise = retry(fn, { maxRetries: 2, delay: 100 });

      // Tüm denemeler
      await Promise.resolve();
      jest.advanceTimersByTime(100);

      await Promise.resolve();
      jest.advanceTimersByTime(200);

      await Promise.resolve();
      jest.advanceTimersByTime(400);

      await expect(promise).rejects.toEqual(error);
      expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should use default options when not provided', async () => {
      const fn = jest.fn().mockResolvedValue('success');

      const result = await retry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
