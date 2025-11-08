// Supabase Auth Repository Implementation
import { SupabaseClient } from '@supabase/supabase-js';
import { User } from '../../types';
import { IAuthRepository } from '../interfaces/IAuthRepository';
import { logger } from '../../utils/logger';

export class SupabaseAuthRepository implements IAuthRepository {
  constructor(private supabase: SupabaseClient) {}

  async signInWithPassword(email: string, password: string): Promise<{
    user: User | null;
    session: any;
  }> {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return {
        user: data.user as User | null,
        session: data.session,
      };
    } catch (error) {
      logger.error('Giriş hatası:', error);
      throw error;
    }
  }

  async signUp(email: string, password: string, metadata?: any): Promise<{
    user: User | null;
    session: any;
  }> {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata || {},
        },
      });

      if (error) {
        throw error;
      }

      return {
        user: data.user as User | null,
        session: data.session,
      };
    } catch (error) {
      logger.error('Kayıt hatası:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Çıkış hatası:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) {
        // Auth session yoksa null döndür, hata fırlatma
        if (error.message?.includes('Auth session missing')) {
          return null;
        }
        throw error;
      }
      return user as User | null;
    } catch (error: any) {
      // Auth session hatası normal, kullanıcı giriş yapmamış
      if (error.message?.includes('Auth session missing')) {
        return null;
      }
      logger.error('Kullanıcı bilgisi alma hatası:', error);
      throw error;
    }
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    const { data: { subscription } } = this.supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user as User | null || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }

  async resetPassword(email: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email);
      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Şifre sıfırlama hatası:', error);
      throw error;
    }
  }

  async updateUser(updates: { data?: any; email?: string }): Promise<void> {
    try {
      const updateData: any = {};
      
      if (updates.data) {
        updateData.data = updates.data;
      }
      
      if (updates.email) {
        updateData.email = updates.email;
      }

      const { error } = await this.supabase.auth.updateUser(updateData);
      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Kullanıcı güncelleme hatası:', error);
      throw error;
    }
  }

  async updatePassword(newPassword: string): Promise<void> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });
      
      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Şifre güncelleme hatası:', error);
      throw error;
    }
  }

  async deleteAccount(): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('delete_user');
      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Hesap silme hatası:', error);
      throw error;
    }
  }
}

