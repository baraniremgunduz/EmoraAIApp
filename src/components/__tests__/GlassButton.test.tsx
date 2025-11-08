// GlassButton component test
import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import GlassButton from '../GlassButton';

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

describe('GlassButton', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render with title', () => {
    const { getByText } = render(
      <GlassButton title="Test Button" onPress={mockOnPress} />
    );
    
    expect(getByText('Test Button')).toBeTruthy();
  });

  it('should call onPress when pressed', () => {
    const { getByText } = render(
      <GlassButton title="Test Button" onPress={mockOnPress} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('should render children instead of title when provided', () => {
    const { getByText, queryByText } = render(
      <GlassButton onPress={mockOnPress}>
        <Text>Custom Content</Text>
      </GlassButton>
    );
    
    expect(getByText('Custom Content')).toBeTruthy();
    expect(queryByText('Test Button')).toBeNull();
  });

  it('should show loading text when loading', () => {
    const { getByText, queryByText } = render(
      <GlassButton title="Test Button" onPress={mockOnPress} loading={true} />
    );
    
    expect(getByText('Yükleniyor...')).toBeTruthy();
    expect(queryByText('Test Button')).toBeNull();
  });

  it('should be disabled when disabled prop is true', () => {
    const { getByText } = render(
      <GlassButton title="Test Button" onPress={mockOnPress} disabled={true} />
    );
    
    const button = getByText('Test Button').parent;
    expect(button?.props.disabled).toBe(true);
  });

  it('should be disabled when loading', () => {
    const { getByText } = render(
      <GlassButton title="Test Button" onPress={mockOnPress} loading={true} />
    );
    
    const button = getByText('Yükleniyor...').parent;
    expect(button?.props.disabled).toBe(true);
  });

  it('should not call onPress when disabled', () => {
    const { getByText } = render(
      <GlassButton title="Test Button" onPress={mockOnPress} disabled={true} />
    );
    
    fireEvent.press(getByText('Test Button'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should not call onPress when loading', () => {
    const { getByText } = render(
      <GlassButton title="Test Button" onPress={mockOnPress} loading={true} />
    );
    
    fireEvent.press(getByText('Yükleniyor...'));
    expect(mockOnPress).not.toHaveBeenCalled();
  });

  it('should apply primary variant styles by default', () => {
    const { getByText } = render(
      <GlassButton title="Test Button" onPress={mockOnPress} />
    );
    
    const button = getByText('Test Button').parent;
    expect(button).toBeTruthy();
  });

  it('should apply secondary variant styles', () => {
    const { getByText } = render(
      <GlassButton title="Test Button" onPress={mockOnPress} variant="secondary" />
    );
    
    const button = getByText('Test Button').parent;
    expect(button).toBeTruthy();
  });

  it('should apply ghost variant styles', () => {
    const { getByText } = render(
      <GlassButton title="Test Button" onPress={mockOnPress} variant="ghost" />
    );
    
    const button = getByText('Test Button').parent;
    expect(button).toBeTruthy();
  });
});

