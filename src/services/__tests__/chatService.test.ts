// Chat service test - Repository Pattern ile güncellendi
import { ChatService } from '../chatService';
import { IMessageRepository } from '../../repositories/interfaces/IMessageRepository';
import { IChatRepository } from '../../repositories/interfaces/IChatRepository';
import { ISessionRepository } from '../../repositories/interfaces/ISessionRepository';
import { IAuthRepository } from '../../repositories/interfaces/IAuthRepository';
import { Message } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('ChatService', () => {
  let mockMessageRepository: jest.Mocked<IMessageRepository>;
  let mockChatRepository: jest.Mocked<IChatRepository>;
  let mockSessionRepository: jest.Mocked<ISessionRepository>;
  let mockAuthRepository: jest.Mocked<IAuthRepository>;
  let chatService: ChatService;

  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.clear();

    // Mock repositories
    mockMessageRepository = {
      findBySessionId: jest.fn(),
      findRecentByUserId: jest.fn(),
      save: jest.fn(),
      deleteBySessionId: jest.fn(),
      mapToMessage: jest.fn().mockResolvedValue({
        id: '1',
        content: 'Test message',
        role: 'user',
        timestamp: new Date().toISOString(),
        user_id: 'user-1',
      }),
      mapToDatabase: jest.fn(),
    };

    mockChatRepository = {
      getAIResponse: jest.fn(),
      getFallbackResponse: jest.fn(),
    };

    mockSessionRepository = {
      findOrCreateActiveSession: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
      updateTitle: jest.fn(),
      delete: jest.fn(),
    };

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

    // Create service instance with mocked repositories
    chatService = new ChatService(
      mockMessageRepository,
      mockChatRepository,
      mockSessionRepository,
      mockAuthRepository
    );
  });

  describe('sendMessage', () => {
    it('should send message and get AI response', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com' } as any;
      const mockAIResponse = 'Hello! How can I help you?';

      mockAuthRepository.getCurrentUser.mockResolvedValue(mockUser);
      mockChatRepository.getAIResponse.mockResolvedValue(mockAIResponse);
      mockChatRepository.getFallbackResponse.mockResolvedValue('Fallback');
      mockSessionRepository.findOrCreateActiveSession.mockResolvedValue('session1');
      mockMessageRepository.save.mockResolvedValue();
      mockMessageRepository.findRecentByUserId.mockResolvedValue([]);

      await AsyncStorage.setItem('appLanguage', 'tr');
      await AsyncStorage.setItem('aiPersonality', 'friendly');

      const result = await chatService.sendMessage('Hello', 'user1');

      expect(result).toBeDefined();
      expect(result.role).toBe('assistant');
      expect(result.content).toBe(mockAIResponse);
      expect(mockMessageRepository.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockUser = { id: 'user1', email: 'test@example.com' } as any;

      mockAuthRepository.getCurrentUser.mockResolvedValue(mockUser);
      mockChatRepository.getAIResponse.mockRejectedValue(new Error('Network error'));
      mockChatRepository.getFallbackResponse.mockResolvedValue('Fallback response');
      mockSessionRepository.findOrCreateActiveSession.mockResolvedValue('session1');
      mockMessageRepository.save.mockResolvedValue();

      await AsyncStorage.setItem('appLanguage', 'tr');
      await AsyncStorage.setItem('aiPersonality', 'friendly');

      const result = await chatService.sendMessage('Hello', 'user1');

      expect(result).toBeDefined();
      expect(result.content).toBe('Fallback response');
    });
  });

  describe('loadSessionMessages', () => {
    it('should load messages for a session', async () => {
      const mockMessages: Message[] = [
        {
          id: 'msg1',
          content: 'Hello',
          role: 'user',
          timestamp: '2024-01-01T00:00:00Z',
          user_id: 'user1',
        },
        {
          id: 'msg2',
          content: 'Hi there!',
          role: 'assistant',
          timestamp: '2024-01-01T00:01:00Z',
          user_id: 'user1',
        },
      ];

      mockMessageRepository.findBySessionId.mockResolvedValue(mockMessages);

      const result = await chatService.loadSessionMessages('session1', 'user1');

      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('Hello');
      expect(result[1].content).toBe('Hi there!');
      expect(mockMessageRepository.findBySessionId).toHaveBeenCalledWith('session1', 'user1');
    });

    it('should return empty array when no messages found', async () => {
      mockMessageRepository.findBySessionId.mockResolvedValue([]);

      const result = await chatService.loadSessionMessages('session1', 'user1');

      expect(result).toHaveLength(0);
    });

    it('should handle errors when loading messages', async () => {
      const mockError = new Error('Database error');
      mockMessageRepository.findBySessionId.mockRejectedValue(mockError);

      await expect(chatService.loadSessionMessages('session1', 'user1')).rejects.toThrow(
        'Database error'
      );
    });
  });

  describe('saveMessages', () => {
    it('should save messages to database', async () => {
      const mockMessages: Message[] = [
        {
          id: 'msg1',
          content: 'Hello',
          role: 'user',
          timestamp: '2024-01-01T00:00:00Z',
          user_id: 'user1',
        },
      ];

      mockSessionRepository.findOrCreateActiveSession.mockResolvedValue('session1');
      mockMessageRepository.save.mockResolvedValue();

      await AsyncStorage.setItem('appLanguage', 'tr');

      await expect(chatService.saveMessages(mockMessages, 'user1')).resolves.not.toThrow();

      expect(mockSessionRepository.findOrCreateActiveSession).toHaveBeenCalledWith('user1');
      expect(mockMessageRepository.save).toHaveBeenCalledWith(mockMessages, 'session1', 'user1');
    });

    it('should create new session if none exists', async () => {
      const mockMessages: Message[] = [
        {
          id: 'msg1',
          content: 'Hello',
          role: 'user',
          timestamp: '2024-01-01T00:00:00Z',
          user_id: 'user1',
        },
      ];

      mockSessionRepository.findOrCreateActiveSession.mockResolvedValue('new-session1');
      mockMessageRepository.save.mockResolvedValue();

      await AsyncStorage.setItem('appLanguage', 'tr');

      await expect(chatService.saveMessages(mockMessages, 'user1')).resolves.not.toThrow();

      expect(mockSessionRepository.findOrCreateActiveSession).toHaveBeenCalled();
    });
  });

  describe('static methods', () => {
    it('should work with static methods for backward compatibility', async () => {
      // Mock container methods for static instance
      (container.getMessageRepository as jest.Mock).mockReturnValue(mockMessageRepository);
      (container.getChatRepository as jest.Mock).mockReturnValue(mockChatRepository);
      (container.getSessionRepository as jest.Mock).mockReturnValue(mockSessionRepository);
      (container.getAuthRepository as jest.Mock).mockReturnValue(mockAuthRepository);

      const mockUser = { id: 'user1', email: 'test@example.com' } as any;
      const mockAIResponse = 'Hello!';

      mockAuthRepository.getCurrentUser.mockResolvedValue(mockUser);
      mockChatRepository.getAIResponse.mockResolvedValue(mockAIResponse);
      mockChatRepository.getFallbackResponse.mockResolvedValue('Fallback');
      mockSessionRepository.findOrCreateActiveSession.mockResolvedValue('session1');
      mockMessageRepository.save.mockResolvedValue();
      mockMessageRepository.findRecentByUserId.mockResolvedValue([]);

      await AsyncStorage.setItem('appLanguage', 'tr');
      await AsyncStorage.setItem('aiPersonality', 'friendly');

      // Reset singleton instance
      (ChatService as any).instance = null;

      const result = await ChatService.sendMessage('Hello', 'user1');

      expect(result).toBeDefined();
      expect(result.role).toBe('assistant');
    });
  });
});
