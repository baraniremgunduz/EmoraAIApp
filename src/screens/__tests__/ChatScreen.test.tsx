// ChatScreen Test
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ChatScreen from '../ChatScreen';
import { ChatService } from '../../services/chatService';
import { AuthService } from '../../services/authService';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePremium } from '../../hooks/usePremium';

// Mock dependencies
jest.mock('../../services/chatService');
jest.mock('../../services/authService');
jest.mock('../../contexts/LanguageContext');
jest.mock('../../hooks/usePremium');
jest.mock('../../utils/networkStatus');
jest.mock('../../utils/rateLimiter');
jest.mock('../../utils/inputSanitizer');
jest.mock('../../utils/chatExporter');

const mockChatService = ChatService as jest.Mocked<typeof ChatService>;
const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;
const mockUsePremium = usePremium as jest.MockedFunction<typeof usePremium>;

describe('ChatScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  const mockRoute = {
    params: {
      sessionId: 'test-session-id',
      sessionTitle: 'Test Session',
    },
  };

  const mockT = (key: string) => key;
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2024-01-01',
    updated_at: '2024-01-01',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseLanguage.mockReturnValue({
      language: 'tr',
      setLanguage: jest.fn(),
      t: mockT,
      currency: 'TRY',
    } as any);

    mockUsePremium.mockReturnValue({
      isPremium: false,
      canUseFeature: jest.fn(() => true),
    } as any);

    mockAuthService.getCurrentUser = jest.fn().mockResolvedValue(mockUser);
    mockChatService.loadSessionMessages = jest.fn().mockResolvedValue([]);
    mockChatService.sendMessage = jest.fn().mockResolvedValue({
      id: 'ai-message-id',
      content: 'AI response',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      user_id: 'test-user-id',
    });
  });

  it('should render chat screen', () => {
    const { getByText } = render(<ChatScreen navigation={mockNavigation} route={mockRoute} />);

    expect(getByText('Emora AI')).toBeTruthy();
  });

  it('should load session messages on mount', async () => {
    const mockMessages = [
      {
        id: 'msg-1',
        content: 'Hello',
        role: 'user' as const,
        timestamp: new Date().toISOString(),
        user_id: 'test-user-id',
      },
    ];

    mockChatService.loadSessionMessages = jest.fn().mockResolvedValue(mockMessages);

    render(<ChatScreen navigation={mockNavigation} route={mockRoute} />);

    await waitFor(() => {
      expect(mockChatService.loadSessionMessages).toHaveBeenCalledWith(
        'test-session-id',
        'test-user-id'
      );
    });
  });

  it('should send message when input submitted', async () => {
    const { getByPlaceholderText, getByText } = render(
      <ChatScreen navigation={mockNavigation} route={mockRoute} />
    );

    const input = getByPlaceholderText('Mesajınızı yazın...');
    const sendButton = getByText('Gönder');

    fireEvent.changeText(input, 'Test message');
    fireEvent.press(sendButton);

    await waitFor(() => {
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        'Test message',
        'test-user-id',
        expect.any(Array)
      );
    });
  });

  it('should show premium limit modal when limit reached', async () => {
    mockUsePremium.mockReturnValue({
      isPremium: false,
      canUseFeature: jest.fn(() => false),
    } as any);

    const { getByPlaceholderText, getByText } = render(
      <ChatScreen navigation={mockNavigation} route={mockRoute} />
    );

    const input = getByPlaceholderText('Mesajınızı yazın...');
    const sendButton = getByText('Gönder');

    fireEvent.changeText(input, 'Test message');
    fireEvent.press(sendButton);

    await waitFor(() => {
      // Premium limit modal should be shown
      expect(mockNavigation.navigate).toHaveBeenCalledWith('PremiumFeatures');
    });
  });

  it('should handle export chat', async () => {
    const { ChatExporter } = require('../../utils/chatExporter');
    const mockShareChat = jest.fn().mockResolvedValue(undefined);
    ChatExporter.shareChat = mockShareChat;

    const mockMessages = [
      {
        id: 'msg-1',
        content: 'Hello',
        role: 'user' as const,
        timestamp: new Date().toISOString(),
        user_id: 'test-user-id',
      },
    ];

    mockChatService.loadSessionMessages = jest.fn().mockResolvedValue(mockMessages);

    const { getByTestId } = render(<ChatScreen navigation={mockNavigation} route={mockRoute} />);

    await waitFor(() => {
      const exportButton = getByTestId('export-button');
      fireEvent.press(exportButton);
    });

    // Export functionality should be called
    // Note: This test may need adjustment based on actual implementation
  });
});
