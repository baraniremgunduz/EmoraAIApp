// Supabase Session Repository Implementation
import { SupabaseClient } from '@supabase/supabase-js';
import { ChatSession } from '../../types';
import { ISessionRepository } from '../interfaces/ISessionRepository';
import { logger } from '../../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class SupabaseSessionRepository implements ISessionRepository {
  constructor(private supabase: SupabaseClient) {}

  async findOrCreateActiveSession(userId: string, title?: string): Promise<string> {
    try {
      // Önce aktif session'ı bul
      const { data: session, error: sessionError } = await this.supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (sessionError && sessionError.code === 'PGRST116') {
        // Session yoksa yeni oluştur
        const userLanguage = (await AsyncStorage.getItem('appLanguage')) || 'tr';
        const sessionTitle = title || (userLanguage === 'en' ? 'New Chat' : 'Yeni Sohbet');

        const { data: newSession, error: createError } = await this.supabase
          .from('chat_sessions')
          .insert({
            user_id: userId,
            title: sessionTitle,
          })
          .select('id')
          .single();

        if (createError) {
          throw createError;
        }

        if (!newSession?.id) {
          throw new Error('Session ID bulunamadı');
        }

        return newSession.id;
      } else if (sessionError) {
        throw sessionError;
      }

      if (!session?.id) {
        throw new Error('Session ID bulunamadı');
      }

      return session.id;
    } catch (error) {
      logger.error('Session bulma/oluşturma hatası:', error);
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<ChatSession[]> {
    try {
      const { data: sessions, error } = await this.supabase
        .from('chat_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        logger.error('Session listesi alma hatası:', error);
        throw error;
      }

      return (sessions || []).map(session => ({
        id: session.id,
        user_id: session.user_id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        messages: [],
      }));
    } catch (error) {
      logger.error('Session listesi alma hatası:', error);
      throw error;
    }
  }

  async findById(sessionId: string, userId: string): Promise<ChatSession | null> {
    try {
      const { data: session, error } = await this.supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return {
        id: session.id,
        user_id: session.user_id,
        title: session.title,
        created_at: session.created_at,
        updated_at: session.updated_at,
        messages: [],
      };
    } catch (error) {
      logger.error('Session getirme hatası:', error);
      throw error;
    }
  }

  async updateTitle(sessionId: string, userId: string, title: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('chat_sessions')
        .update({ title })
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Session başlık güncelleme hatası:', error);
      throw error;
    }
  }

  async delete(sessionId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('Session silme hatası:', error);
      throw error;
    }
  }
}
