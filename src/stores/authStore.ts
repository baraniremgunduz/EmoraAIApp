// Auth Store - Zustand ile state management
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import { AuthService } from '../services/authService';
import { logger } from '../utils/logger';
import { TokenRefreshManager } from '../utils/tokenRefresh';
import { MessageEncryption } from '../utils/encryption';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null });
          const { user, session } = await AuthService.signIn(email, password);
          
          if (user && session) {
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            
            // Token refresh'i başlat
            TokenRefreshManager.startAutoRefresh();
            
            logger.log('Login successful:', user.email);
          } else {
            throw new Error('Login failed: No user or session returned');
          }
        } catch (error: any) {
          const errorMessage = error.message || 'Giriş yapılırken bir hata oluştu';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          logger.error('Login error:', error);
          throw error;
        }
      },

      register: async (email: string, password: string, name?: string) => {
        try {
          set({ isLoading: true, error: null });
          const { user, session } = await AuthService.signUp(email, password, name);
          
          if (user && session) {
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            
            // Token refresh'i başlat
            TokenRefreshManager.startAutoRefresh();
            
            logger.log('Registration successful:', user.email);
          } else {
            throw new Error('Registration failed: No user or session returned');
          }
        } catch (error: any) {
          const errorMessage = error.message || 'Kayıt olurken bir hata oluştu';
          set({
            error: errorMessage,
            isLoading: false,
            isAuthenticated: false,
            user: null,
          });
          logger.error('Registration error:', error);
          throw error;
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true });
          
          // Token refresh'i durdur
          TokenRefreshManager.stopAutoRefresh();
          
          // Encryption key'leri temizle
          const currentUser = get().user;
          if (currentUser) {
            await MessageEncryption.deleteEncryptionKey(currentUser.id);
          }
          
          await AuthService.signOut();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
          logger.log('Logout successful');
        } catch (error: any) {
          const errorMessage = error.message || 'Çıkış yapılırken bir hata oluştu';
          set({
            error: errorMessage,
            isLoading: false,
          });
          logger.error('Logout error:', error);
          throw error;
        }
      },

      checkAuth: async () => {
        try {
          set({ isLoading: true });
          const user = await AuthService.getCurrentUser();
          
          set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
            error: null,
          });
          
          if (user) {
            logger.log('Auth check: User authenticated', user.email);
          } else {
            logger.log('Auth check: No user found');
          }
        } catch (error: any) {
          // Auth session missing is normal for logged out users
          if (error.message?.includes('Auth session missing')) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
            });
          } else {
            set({
              error: error.message || 'Auth kontrolü sırasında bir hata oluştu',
              isLoading: false,
            });
            logger.error('Auth check error:', error);
          }
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

