// SettingsScreen Test
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SettingsScreen from '../SettingsScreen';
import { AuthService } from '../../services/authService';
import { NotificationService } from '../../services/notificationService';
import { useLanguage } from '../../contexts/LanguageContext';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../services/notificationService');
jest.mock('../../contexts/LanguageContext');
jest.mock('@react-native-async-storage/async-storage');

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockNotificationService = NotificationService as jest.Mocked<typeof NotificationService>;
const mockUseLanguage = useLanguage as jest.MockedFunction<typeof useLanguage>;

describe('SettingsScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
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

    mockAuthService.getCurrentUser = jest.fn().mockResolvedValue(mockUser);
  });

  it('should render settings screen', () => {
    const { getByText } = render(
      <SettingsScreen navigation={mockNavigation} />
    );

    // Settings screen should render
    expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
  });

  it('should change language setting', async () => {
    const mockSetLanguage = jest.fn();
    mockUseLanguage.mockReturnValue({
      language: 'tr',
      setLanguage: mockSetLanguage,
      t: mockT,
      currency: 'TRY',
    } as any);

    const { getByText } = render(
      <SettingsScreen navigation={mockNavigation} />
    );

    // Find and press language option
    const languageOption = getByText('English'); // Adjust based on actual text
    fireEvent.press(languageOption);

    await waitFor(() => {
      expect(mockSetLanguage).toHaveBeenCalledWith('en');
    });
  });

  it('should handle password change', async () => {
    mockAuthService.updatePassword = jest.fn().mockResolvedValue({ error: null });

    const { getByText } = render(
      <SettingsScreen navigation={mockNavigation} />
    );

    // Find and press change password button
    const changePasswordButton = getByText('Şifre Değiştir'); // Adjust based on actual text
    fireEvent.press(changePasswordButton);

    // Password change modal should appear
    // Test password submission
  });

  it('should handle logout', async () => {
    mockAuthService.signOut = jest.fn().mockResolvedValue(undefined);

    const { getByText } = render(
      <SettingsScreen navigation={mockNavigation} />
    );

    // Find and press logout button
    const logoutButton = getByText('Çıkış Yap'); // Adjust based on actual text
    fireEvent.press(logoutButton);

    // Confirm logout
    await waitFor(() => {
      expect(mockAuthService.signOut).toHaveBeenCalled();
    });
  });

  it('should handle account deletion', async () => {
    mockAuthService.deleteAccount = jest.fn().mockResolvedValue(undefined);

    const { getByText } = render(
      <SettingsScreen navigation={mockNavigation} />
    );

    // Find and press delete account button
    const deleteButton = getByText('Hesabı Sil'); // Adjust based on actual text
    fireEvent.press(deleteButton);

    // Confirm deletion
    await waitFor(() => {
      expect(mockAuthService.deleteAccount).toHaveBeenCalled();
    });
  });

  it('should toggle notification settings', async () => {
    const { getByTestId } = render(
      <SettingsScreen navigation={mockNavigation} />
    );

    // Find notification toggle
    const notificationToggle = getByTestId('notification-toggle');
    fireEvent.press(notificationToggle);

    // Notification setting should be toggled
  });
});

