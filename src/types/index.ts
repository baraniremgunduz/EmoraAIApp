// Uygulama genelinde kullanılacak tip tanımları

// Kullanıcı tipi
export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  created_at: string;
  updated_at: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
    [key: string]: unknown;
  };
}

// Supabase Auth User tipi (genişletilmiş)
export interface SupabaseUser extends User {
  app_metadata?: Record<string, unknown>;
  aud?: string;
  confirmation_sent_at?: string;
  confirmed_at?: string;
  email_confirmed_at?: string;
  invited_at?: string;
  last_sign_in_at?: string;
  phone?: string;
  recovery_sent_at?: string;
  role?: string;
}

// Mesaj tipi
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  user_id: string;
}

// Sohbet oturumu tipi
export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: Message[];
}

// Kullanıcı tercihleri tipi
export interface UserPreferences {
  [key: string]: string | number | boolean | null | undefined;
}

// Database message tipi (Supabase'den gelen)
export interface DatabaseMessage {
  id: string;
  content: string;
  role: string;
  timestamp?: string;
  created_at?: string;
  user_id: string;
  session_id?: string;
}

// Error tipi
export interface AppError extends Error {
  code?: string;
  status?: number;
  message: string;
}

// Navigasyon tipleri
export type RootStackParamList = {
  LanguageSelection: undefined;
  Onboarding: undefined;
  Auth: undefined;
  Main: undefined;
  AccountSettings: undefined;
  ChatHistory: undefined;
  HelpSupport: undefined;
  EditProfile: undefined;
  PremiumFeatures: undefined;
  PaymentScreen: undefined;
  PrivacyPolicy: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainTabParamList = {
  Chat: {
    sessionId?: string;
    sessionTitle?: string;
  };
  Profile: undefined;
  Settings: undefined;
};

// Tema tipi - Quiet Intelligence
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    success: string;
    glass: string;
    glassHover: string;
    premium: string;
    aiHaze: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
  };
  typography: {
    title: {
      fontFamily: string;
      fontWeight: string;
      fontSize: number;
      letterSpacing: number;
    };
    subtitle: {
      fontFamily: string;
      fontWeight: string;
      fontSize: number;
      letterSpacing: number;
    };
    body: {
      fontFamily: string;
      fontWeight: string;
      fontSize: number;
      letterSpacing: number;
    };
    caption: {
      fontFamily: string;
      fontWeight: string;
      fontSize: number;
      letterSpacing: number;
    };
  };
  shadows: {
    soft: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    medium: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
    strong: {
      shadowColor: string;
      shadowOffset: { width: number; height: number };
      shadowOpacity: number;
      shadowRadius: number;
      elevation: number;
    };
  };
}
