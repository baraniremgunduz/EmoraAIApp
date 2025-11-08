// Chat Store - Zustand ile chat state management
import { create } from 'zustand';
import { Message, ChatSession } from '../types';
import { ChatService } from '../services/chatService';
import { logger } from '../utils/logger';

interface ChatState {
  messages: Message[];
  currentSessionId: string | null;
  sessions: ChatSession[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  
  // Actions
  sendMessage: (content: string, userId: string) => Promise<Message | null>;
  loadSession: (sessionId: string, userId: string) => Promise<void>;
  loadSessions: (userId: string) => Promise<void>;
  clearMessages: () => void;
  addMessage: (message: Message) => void;
  setCurrentSession: (sessionId: string | null) => void;
  clearError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  currentSessionId: null,
  sessions: [],
  isLoading: false,
  isSending: false,
  error: null,

  sendMessage: async (content: string, userId: string) => {
    try {
      set({ isSending: true, error: null });
      
      const currentMessages = get().messages;
      const aiMessage = await ChatService.sendMessage(content, userId, currentMessages);
      
      // Mesajları state'e ekle
      const userMessage: Message = {
        id: Date.now().toString(),
        content,
        role: 'user',
        timestamp: new Date().toISOString(),
        user_id: userId,
      };
      
      set((state) => ({
        messages: [...state.messages, userMessage, aiMessage],
        isSending: false,
        error: null,
      }));
      
      logger.log('Message sent successfully');
      return aiMessage;
    } catch (error: any) {
      const errorMessage = error.message || 'Mesaj gönderilirken bir hata oluştu';
      set({
        error: errorMessage,
        isSending: false,
      });
      logger.error('Send message error:', error);
      return null;
    }
  },

  loadSession: async (sessionId: string, userId: string) => {
    try {
      set({ isLoading: true, error: null });
      
      const messages = await ChatService.loadSessionMessages(sessionId, userId);
      
      set({
        messages,
        currentSessionId: sessionId,
        isLoading: false,
        error: null,
      });
      
      logger.log(`Session loaded: ${sessionId} with ${messages.length} messages`);
    } catch (error: any) {
      const errorMessage = error.message || 'Session yüklenirken bir hata oluştu';
      set({
        error: errorMessage,
        isLoading: false,
        messages: [],
      });
      logger.error('Load session error:', error);
    }
  },

  loadSessions: async (userId: string) => {
    try {
      set({ isLoading: true });
      
      // ChatHistoryScreen'deki repository kullanılabilir
      // Şimdilik boş bırakıyoruz, ChatHistoryScreen kendi yüklemesini yapıyor
      
      set({ isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Session listesi yüklenirken bir hata oluştu',
        isLoading: false,
      });
      logger.error('Load sessions error:', error);
    }
  },

  clearMessages: () => {
    set({
      messages: [],
      currentSessionId: null,
      error: null,
    });
  },

  addMessage: (message: Message) => {
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  setCurrentSession: (sessionId: string | null) => {
    set({ currentSessionId: sessionId });
  },

  clearError: () => {
    set({ error: null });
  },
}));

