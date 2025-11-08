// ProfileScreen Test
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../ProfileScreen';
import { AuthService } from '../../services/authService';
import { ChatService } from '../../services/chatService';
import { useLanguage } from '../../contexts/LanguageContext';
import { usePremium } from '../../hooks/usePremium';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../services/chatService');
jest.mock('../../contexts/LanguageContext');
jest.mock('../../hooks/usePremium');
jest.mock('../../config/supabase');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockChatService = ChatService as jest.Mocked<typeof ChatService>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;
const mockUsePremium = usePremium as jest.MockedFunction<typeof usePremium>;

describe('ProfileScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  const mockRoute = {};

  const mockT = (key: string) => key;
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
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
    mockChatService.getChatHistory = jest.fn().mockResolvedValue([]);
  });

  it('should render profile screen', () => {
    const { getByText } = render(
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Profile screen should render user information
    expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
  });

  it('should load user data on mount', async () => {
    render(<ProfileScreen navigation={mockNavigation} route={mockRoute} />);

    await waitFor(() => {
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
    });
  });

  it('should navigate to edit profile', () => {
    const { getByText } = render(
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Find and press edit button
    const editButton = getByText('Düzenle'); // Adjust based on actual text
    fireEvent.press(editButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith('EditProfile');
  });

  it('should handle logout', async () => {
    mockAuthService.signOut = jest.fn().mockResolvedValue(undefined);

    const { getByText } = render(
      <ProfileScreen navigation={mockNavigation} route={mockRoute} />
    );

    // Find and press logout button
    const logoutButton = getByText('Çıkış Yap'); // Adjust based on actual text
    fireEvent.press(logoutButton);

    await waitFor(() => {
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });
  });

  it('should display user statistics', async () => {
    const mockMessages = [
      { id: '1', content: 'Message 1', role: 'user', timestamp: '2024-01-01', user_id: 'test-user-id' },
      { id: '2', content: 'Message 2', role: 'assistant', timestamp: '2024-01-01', user_id: 'test-user-id' },
    ];

    mockChatService.getChatHistory = jest.fn().mockResolvedValue(mockMessages);

    render(<ProfileScreen navigation={mockNavigation} route={mockRoute} />);

    await waitFor(() => {
      expect(mockChatService.getChatHistory).toHaveBeenCalledWith('test-user-id');
    });
  });
});

