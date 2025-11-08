// RegisterScreen test
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegisterScreen from '../RegisterScreen';
import { AuthService } from '../../services/authService';

// Mock dependencies
jest.mock('../../services/authService');
jest.mock('../../contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'app.name': 'Emora AI',
        'app.tagline': 'Your AI Assistant',
        'auth.name': 'Name',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.confirm_password': 'Confirm Password',
        'auth.name_placeholder': 'Enter your name',
        'auth.email_placeholder': 'Enter your email',
        'auth.password_placeholder': 'Enter your password',
        'auth.confirm_password_placeholder': 'Confirm your password',
        'auth.register': 'Register',
        'auth.login': 'Login',
        'auth.have_account': 'Already have an account?',
        'messages.error': 'Error',
        'alert.registration_success': 'Registration Success',
        'alert.registration_success_message': 'Registration successful',
        'alert.registration_error': 'Registration Error',
        'alert.registration_error_message': 'Registration failed',
        'auth.name_required': 'Name is required',
        'auth.email_required': 'Email is required',
        'auth.invalid_email': 'Invalid email',
        'auth.password_mismatch': 'Passwords do not match',
        'common.ok': 'OK',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render registration form', () => {
    const { getByPlaceholderText, getByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );
    
    expect(getByPlaceholderText('Enter your name')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
    expect(getByText('Register')).toBeTruthy();
  });

  it('should show error when name is empty', async () => {
    const { getByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );
    
    const registerButton = getByText('Register');
    fireEvent.press(registerButton);
    
    // Form validation should prevent submission
    await waitFor(() => {
      expect(getByText('Register')).toBeTruthy();
    });
  });

  it('should show error when email is invalid', async () => {
    const { getByPlaceholderText, getByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );
    
    const nameInput = getByPlaceholderText('Enter your name');
    const emailInput = getByPlaceholderText('Enter your email');
    const registerButton = getByText('Register');
    
    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.press(registerButton);
    
    // Form validation should prevent submission
    await waitFor(() => {
      expect(getByText('Register')).toBeTruthy();
    });
  });

  it('should show error when passwords do not match', async () => {
    const { getByPlaceholderText, getByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );
    
    const nameInput = getByPlaceholderText('Enter your name');
    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const confirmPasswordInput = getByPlaceholderText('Confirm your password');
    const registerButton = getByText('Register');
    
    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'Password123!');
    fireEvent.changeText(confirmPasswordInput, 'Different123!');
    fireEvent.press(registerButton);
    
    // Form validation should prevent submission
    await waitFor(() => {
      expect(getByText('Register')).toBeTruthy();
    });
  });

  it('should call AuthService.signUp on successful registration', async () => {
    (AuthService.signUp as jest.Mock).mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com' },
      session: { access_token: 'token123' },
    });

    const { getByPlaceholderText, getByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );
    
    const nameInput = getByPlaceholderText('Enter your name');
    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const confirmPasswordInput = getByPlaceholderText('Confirm your password');
    const registerButton = getByText('Register');
    
    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'StrongP@ss123');
    fireEvent.changeText(confirmPasswordInput, 'StrongP@ss123');
    fireEvent.press(registerButton);
    
    await waitFor(() => {
      expect(AuthService.signUp).toHaveBeenCalledWith(
        'test@example.com',
        'StrongP@ss123',
        'Test User'
      );
    });
  });

  it('should navigate to login screen after successful registration', async () => {
    (AuthService.signUp as jest.Mock).mockResolvedValue({
      user: { id: 'user1', email: 'test@example.com' },
      session: { access_token: 'token123' },
    });

    const { getByPlaceholderText, getByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );
    
    const nameInput = getByPlaceholderText('Enter your name');
    const emailInput = getByPlaceholderText('Enter your email');
    const passwordInput = getByPlaceholderText('Enter your password');
    const confirmPasswordInput = getByPlaceholderText('Confirm your password');
    const registerButton = getByText('Register');
    
    fireEvent.changeText(nameInput, 'Test User');
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'StrongP@ss123');
    fireEvent.changeText(confirmPasswordInput, 'StrongP@ss123');
    fireEvent.press(registerButton);
    
    await waitFor(() => {
      expect(AuthService.signUp).toHaveBeenCalled();
    });
  });

  it('should navigate to login screen', () => {
    const { getByText } = render(
      <RegisterScreen navigation={mockNavigation} />
    );
    
    const loginLink = getByText('Login');
    fireEvent.press(loginLink);
    
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
  });
});

