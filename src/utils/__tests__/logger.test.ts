// Logger utility test
import { logger } from '../logger';

// Mock __DEV__
const originalDev = global.__DEV__;

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    global.__DEV__ = originalDev;
  });

  describe('log', () => {
    it('should log in development mode', () => {
      global.__DEV__ = true;
      const consoleSpy = jest.spyOn(console, 'log');
      logger.log('test message');
      expect(consoleSpy).toHaveBeenCalledWith('test message');
    });

    it('should not log in production mode', () => {
      global.__DEV__ = false;
      const consoleSpy = jest.spyOn(console, 'log');
      logger.log('test message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('should always log errors', () => {
      global.__DEV__ = true;
      const consoleSpy = jest.spyOn(console, 'error');
      logger.error('test error');
      expect(consoleSpy).toHaveBeenCalledWith('test error');
    });

    it('should log errors in production too', () => {
      global.__DEV__ = false;
      const consoleSpy = jest.spyOn(console, 'error');
      logger.error('test error');
      expect(consoleSpy).toHaveBeenCalledWith('test error');
    });
  });

  describe('warn', () => {
    it('should warn in development mode', () => {
      global.__DEV__ = true;
      const consoleSpy = jest.spyOn(console, 'warn');
      logger.warn('test warning');
      expect(consoleSpy).toHaveBeenCalledWith('test warning');
    });

    it('should not warn in production mode', () => {
      global.__DEV__ = false;
      const consoleSpy = jest.spyOn(console, 'warn');
      logger.warn('test warning');
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});

