// Integration Tests - Service-Repository entegrasyon testleri
import { ChatService } from '../chatService';
import { AuthService } from '../authService';
import { container } from '../../di/container';
import { IMessageRepository } from '../../repositories/interfaces/IMessageRepository';
import { IChatRepository } from '../../repositories/interfaces/IChatRepository';
import { ISessionRepository } from '../../repositories/interfaces/ISessionRepository';
import { IAuthRepository } from '../../repositories/interfaces/IAuthRepository';

// Mock repositories
const mockMessageRepository: jest.Mocked<IMessageRepository> = {
  save: jest.fn(),
  findBySessionId: jest.fn(),
  findBySessionIdPaginated: jest.fn(),
  findRecentByUserId: jest.fn(),
  delete: jest.fn(),
  mapToMessage: jest.fn(),
};

const mockChatRepository: jest.Mocked<IChatRepository> = {
  getAIResponse: jest.fn(),
};

const mockSessionRepository: jest.Mocked<ISessionRepository> = {
  create: jest.fn(),
  findById: jest.fn(),
  findByUserId: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockAuthRepository: jest.Mocked<IAuthRepository> = {
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

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock container
    container.setMessageRepository(mockMessageRepository);
    container.setChatRepository(mockChatRepository);
    container.setSessionRepository(mockSessionRepository);
    container.setAuthRepository(mockAuthRepository);
  });

  describe('ChatService Integration', () => {
    it('should send message and save to repository', async () => {
      const userId = 'test-user-id';
      const sessionId = 'test-session-id';
      const messageContent = 'Hello, AI!';

      mockChatRepository.getAIResponse.mockResolvedValue({
        content: 'Hello! How can I help you?',
        role: 'assistant',
      });

      mockMessageRepository.save.mockResolvedValue({
        id: 'msg-1',
        content: messageContent,
        role: 'user',
        timestamp: new Date().toISOString(),
        user_id: userId,
      });

      const chatService = new ChatService();
      const result = await chatService.sendMessage(messageContent, userId, []);

      expect(mockChatRepository.getAIResponse).toHaveBeenCalled();
      expect(mockMessageRepository.save).toHaveBeenCalled();
      expect(result).toBeTruthy();
      expect(result?.role).toBe('assistant');
    });

    it('should load session messages from repository', async () => {
      const sessionId = 'test-session-id';
      const userId = 'test-user-id';
      const mockMessages = [
        {
          id: 'msg-1',
          content: 'Hello',
          role: 'user' as const,
          timestamp: new Date().toISOString(),
          user_id: userId,
        },
      ];

      mockMessageRepository.findBySessionId.mockResolvedValue(mockMessages);

      const chatService = new ChatService();
      const messages = await chatService.loadSessionMessages(sessionId, userId);

      expect(mockMessageRepository.findBySessionId).toHaveBeenCalledWith(sessionId, userId);
      expect(messages).toEqual(mockMessages);
    });
  });

  describe('AuthService Integration', () => {
    it('should sign in and get current user from repository', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const mockUser = {
        id: 'user-1',
        email,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockAuthRepository.signInWithPassword.mockResolvedValue({
        user: mockUser,
        session: { access_token: 'token' },
      });

      mockAuthRepository.getCurrentUser.mockResolvedValue(mockUser);

      const authService = new AuthService();
      const result = await authService.signIn(email, password);

      expect(mockAuthRepository.signInWithPassword).toHaveBeenCalledWith(email, password);
      expect(result.user).toEqual(mockUser);
    });

    it('should sign up and create user via repository', async () => {
      const email = 'new@example.com';
      const password = 'password123';
      const mockUser = {
        id: 'user-2',
        email,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      mockAuthRepository.signUp.mockResolvedValue({
        user: mockUser,
        session: { access_token: 'token' },
      });

      const authService = new AuthService();
      const result = await authService.signUp(email, password);

      expect(mockAuthRepository.signUp).toHaveBeenCalled();
      expect(result.user).toEqual(mockUser);
    });

    it('should sign out and clear session via repository', async () => {
      mockAuthRepository.signOut.mockResolvedValue(undefined);

      const authService = new AuthService();
      await authService.signOut();

      expect(mockAuthRepository.signOut).toHaveBeenCalled();
    });
  });

  describe('Chat Flow Integration', () => {
    it('should complete full chat flow: create session, send message, save messages', async () => {
      const userId = 'test-user-id';
      const messageContent = 'Hello!';

      // Mock session creation
      const mockSession = {
        id: 'session-1',
        user_id: userId,
        title: 'New Chat',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSessionRepository.create.mockResolvedValue(mockSession);

      // Mock message saving
      mockMessageRepository.save.mockResolvedValue({
        id: 'msg-1',
        content: messageContent,
        role: 'user',
        timestamp: new Date().toISOString(),
        user_id: userId,
      });

      // Mock AI response
      mockChatRepository.getAIResponse.mockResolvedValue({
        content: 'Hello! How can I help?',
        role: 'assistant',
      });

      const chatService = new ChatService();

      // Create session
      const session = await mockSessionRepository.create(userId, 'New Chat');
      expect(session).toEqual(mockSession);

      // Send message
      const aiResponse = await chatService.sendMessage(messageContent, userId, []);
      expect(aiResponse).toBeTruthy();
      expect(aiResponse?.role).toBe('assistant');

      // Verify messages were saved
      expect(mockMessageRepository.save).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle repository errors gracefully', async () => {
      const error = new Error('Repository error');
      mockMessageRepository.findBySessionId.mockRejectedValue(error);

      const chatService = new ChatService();

      await expect(chatService.loadSessionMessages('session-id', 'user-id')).rejects.toThrow(
        'Repository error'
      );
    });

    it('should handle auth repository errors', async () => {
      const error = new Error('Auth error');
      mockAuthRepository.signInWithPassword.mockRejectedValue(error);

      const authService = new AuthService();

      await expect(authService.signIn('test@example.com', 'password')).rejects.toThrow(
        'Auth error'
      );
    });
  });
});
