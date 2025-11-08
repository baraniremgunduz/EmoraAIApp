// Quiet Intelligence tema yapılandırması - 2025 Minimal UI
import { Theme } from '../types';

export const darkTheme: Theme = {
  colors: {
    // Ana renk paleti - Quiet Intelligence
    primary: '#6A5ACD', // SlateBlue - Fotoğraftaki mor renk
    secondary: '#8A7FD1', // Hover, gradient end - Daha açık mor
    background: '#0B0B0E', // Deep black-gray (modern contrast)
    surface: '#15151B', // Slightly elevated surfaces
    text: '#F4F4F6', // Cool white (not warm)
    textSecondary: '#9A9AA1', // Quiet gray
    border: 'rgba(255,255,255,0.08)', // Subtle borders
    error: '#EF4444', // Red
    success: '#10B981', // Green
    // Glass effects
    glass: 'rgba(255,255,255,0.06)',
    glassHover: 'rgba(255,255,255,0.1)',
    // Premium accent
    premium: '#FFD76F', // Premium labels/icons
    // AI haze effect
    aiHaze: 'rgba(108, 99, 255, 0.03)', // Subtle purple haze
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 8,
    md: 16, // Minimal UI standard
    lg: 24, // Large radius for cards
  },
  // Typography - Manrope/Satoshi inspired
  typography: {
    title: {
      fontFamily: 'System', // Manrope SemiBold when available
      fontWeight: '600',
      fontSize: 24,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontFamily: 'System', // Manrope Medium
      fontWeight: '500',
      fontSize: 18,
      letterSpacing: -0.2,
    },
    body: {
      fontFamily: 'System', // Manrope Regular
      fontWeight: '400',
      fontSize: 15,
      letterSpacing: 0,
    },
    caption: {
      fontFamily: 'System', // Manrope Regular
      fontWeight: '400',
      fontSize: 14,
      letterSpacing: 0.1,
    },
  },
  // Shadows - Minimal UI approach
  shadows: {
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 4,
    },
    strong: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
    },
  },
};

// React Native Paper tema yapılandırması
export const paperTheme = {
  dark: true,
  colors: {
    primary: darkTheme.colors.primary,
    accent: darkTheme.colors.secondary,
    background: darkTheme.colors.background,
    surface: darkTheme.colors.surface,
    text: darkTheme.colors.text,
    onSurface: darkTheme.colors.text,
    disabled: darkTheme.colors.textSecondary,
    placeholder: darkTheme.colors.textSecondary,
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: darkTheme.colors.error,
  },
  roundness: darkTheme.borderRadius.md,
};
