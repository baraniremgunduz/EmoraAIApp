// Supabase Auth Repository Implementation
import { SupabaseClient } from '@supabase/supabase-js';
import { User } from '../../types';
import { IAuthRepository } from '../interfaces/IAuthRepository';
import { logger } from '../../utils/logger';
import { MessageEncryption } from '../../utils/encryption';

export class SupabaseAuthRepository implements IAuthRepository {
  constructor(private supabase: SupabaseClient) {}

  async signInWithPassword(
    email: string,
    password: string
  ): Promise<{
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

  async signUp(
    email: string,
    password: string,
    metadata?: any
  ): Promise<{
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
      // Önce session'ı kontrol et - session yoksa veya geçersizse null döndür
      const {
        data: { session },
        error: sessionError,
      } = await this.supabase.auth.getSession();
      
      if (sessionError || !session) {
        // Session yoksa veya geçersizse null döndür
        logger.log('Session yok veya geçersiz, kullanıcı giriş yapmamış');
        return null;
      }
      
      // Session geçerliyse user'ı al
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser();
      
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
    const {
      data: { subscription },
    } = this.supabase.auth.onAuthStateChange((event, session) => {
      callback((session?.user as User | null) || null);
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
      // Önce mevcut kullanıcıyı al
      const user = await this.getCurrentUser();
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }

      // Encryption key'i sil
      try {
        await MessageEncryption.deleteEncryptionKey(user.id);
      } catch (encryptionError: any) {
        // Encryption key silme hatası kritik değil, devam et
        if (__DEV__) {
          logger.error('Encryption key silme hatası (non-critical):', encryptionError?.message || encryptionError);
        }
      }

      // Supabase'de delete_user RPC fonksiyonunu çağır
      // Not: Bu fonksiyon Supabase SQL Editor'de oluşturulmalı:
      // CREATE OR REPLACE FUNCTION delete_user()
      // RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
      // BEGIN DELETE FROM auth.users WHERE id = auth.uid(); END; $$;
      const { error: rpcError } = await this.supabase.rpc('delete_user');
      
      if (rpcError) {
        // RPC fonksiyonu yoksa veya hata varsa
        throw new Error(
          rpcError.message || 
          'Hesap silme işlemi başarısız oldu. Lütfen Supabase SQL Editor\'de delete_user fonksiyonunu oluşturun.'
        );
      }
    } catch (error: any) {
      logger.error('Hesap silme hatası:', error);
      throw error;
    }
  }
}
