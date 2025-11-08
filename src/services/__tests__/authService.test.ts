// Auth service test - Repository Pattern ile güncellendi
import { AuthService } from '../authService';
import { IAuthRepository } from '../../repositories/interfaces/IAuthRepository';
import { User } from '../../types';
import { container } from '../../di/container';

// Mock DI Container
jest.mock('../../di/container', () => ({
  container: {
    getMessageRepository: jest.fn(),
    getChatRepository: jest.fn(),
    getSessionRepository: jest.fn(),
    getAuthRepository: jest.fn(),
  },
}));

describe('AuthService', () => {
  let mockAuthRepository: jest.Mocked<IAuthRepository>;
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock repository
    mockAuthRepository = {
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      getCurrentUser: jest.fn(),
      onAuthStateChange: jest.fn(),
      resetPassword: jest.fn(),
      updateUser: jest.fn(),
      updatePassword: jest.fn(),
      deleteAccount: jest.fn(),
    };

    // Create service instance with mocked repository
    authService = new AuthService(mockAuthRepository);
  });

  describe('signIn', () => {
    it('should sign in successfully', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com' } as User;
      const mockSession = { access_token: 'token123' };
      
      mockAuthRepository.signInWithPassword.mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      const result = await authService.signIn('test@example.com', 'password123');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(mockAuthRepository.signInWithPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });

    it('should throw error on failed sign in', async () => {
      const mockError = new Error('Invalid credentials');
      
      mockAuthRepository.signInWithPassword.mockRejectedValue(mockError);

      await expect(
        authService.signIn('test@example.com', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('signUp', () => {
    it('should sign up successfully', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com' } as User;
      const mockSession = { access_token: 'token123' };
      
      mockAuthRepository.signUp.mockResolvedValue({
        user: mockUser,
        session: mockSession,
      });

      const result = await authService.signUp('test@example.com', 'password123', 'Test User');

      expect(result.user).toEqual(mockUser);
      expect(result.session).toEqual(mockSession);
      expect(mockAuthRepository.signUp).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        { name: 'Test User' }
      );
    });

    it('should sign up without name', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com' } as User;
      
      mockAuthRepository.signUp.mockResolvedValue({
        user: mockUser,
        session: null,
      });

      await authService.signUp('test@example.com', 'password123');

      expect(mockAuthRepository.signUp).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        { name: '' }
      );
    });
  });

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockAuthRepository.signOut.mockResolvedValue();

      await authService.signOut();

      expect(mockAuthRepository.signOut).toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com' } as User;
      
      mockAuthRepository.getCurrentUser.mockResolvedValue(mockUser);

      const result = await authService.getCurrentUser();

      expect(result).toEqual(mockUser);
    });

    it('should return null when not authenticated', async () => {
      mockAuthRepository.getCurrentUser.mockResolvedValue(null);

      const result = await authService.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('onAuthStateChange', () => {
    it('should subscribe to auth state changes', () => {
      const callback = jest.fn();
      const unsubscribe = jest.fn();
      
      mockAuthRepository.onAuthStateChange.mockReturnValue(unsubscribe);

      const result = authService.onAuthStateChange(callback);

      expect(mockAuthRepository.onAuthStateChange).toHaveBeenCalledWith(callback);
      expect(result).toBe(unsubscribe);
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      mockAuthRepository.resetPassword.mockResolvedValue();

      await authService.resetPassword('test@example.com');

      expect(mockAuthRepository.resetPassword).toHaveBeenCalledWith('test@example.com');
    });
  });

  describe('updateUser', () => {
    it('should update user data successfully', async () => {
      mockAuthRepository.updateUser.mockResolvedValue();

      const result = await authService.updateUser({
        data: { name: 'New Name' },
      });

      expect(result.error).toBeNull();
      expect(mockAuthRepository.updateUser).toHaveBeenCalledWith({
        data: { name: 'New Name' },
      });
    });
  });

  describe('updatePassword', () => {
    it('should update password successfully', async () => {
      mockAuthRepository.updatePassword.mockResolvedValue();

      const result = await authService.updatePassword('newpassword123');

      expect(result.error).toBeNull();
      expect(mockAuthRepository.updatePassword).toHaveBeenCalledWith('newpassword123');
    });
  });

  describe('deleteAccount', () => {
    it('should delete account successfully', async () => {
      mockAuthRepository.deleteAccount.mockResolvedValue();

      const result = await authService.deleteAccount();

      expect(result.error).toBeNull();
      expect(mockAuthRepository.deleteAccount).toHaveBeenCalled();
    });
  });

  describe('static methods', () => {
    it('should work with static methods for backward compatibility', async () => {
      // Mock container for static instance
      (container.getAuthRepository as jest.Mock).mockReturnValue(mockAuthRepository);

      const mockUser = { id: 'user1', email: 'test@example.com' } as User;
      
      mockAuthRepository.getCurrentUser.mockResolvedValue(mockUser);

      // Reset singleton instance
      (AuthService as any).instance = null;

      const result = await AuthService.getCurrentUser();

      expect(result).toEqual(mockUser);
    });
  });
});
