// Sohbet Geçmişi Ekranı - Repository Pattern ile güncellendi
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../utils/theme';
import { useLanguage } from '../contexts/LanguageContext';
import GlassCard from '../components/GlassCard';
import { container } from '../di/container';
import { ISessionRepository } from '../repositories/interfaces/ISessionRepository';
import { IMessageRepository } from '../repositories/interfaces/IMessageRepository';
import { IAuthRepository } from '../repositories/interfaces/IAuthRepository';
import { logger } from '../utils/logger';
import { ChatExporter } from '../utils/chatExporter';

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messageCount: number;
}

export default function ChatHistoryScreen({ navigation }: any) {
  const { t } = useLanguage();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Repository instances
  const sessionRepository: ISessionRepository = container.getSessionRepository();
  const messageRepository: IMessageRepository = container.getMessageRepository();
  const authRepository: IAuthRepository = container.getAuthRepository();

  // Tarih formatlama fonksiyonu
  const formatTimestamp = (timestamp: string): string => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return t('ui.just_now');
    } else if (diffInHours < 24) {
      return `${diffInHours} ${t('ui.hours_ago')}`;
    } else if (diffInHours < 48) {
      return t('ui.yesterday');
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} ${t('ui.days_ago')}`;
    }
  };

  useEffect(() => {
    loadChatHistory();
  }, []);

  const loadChatHistory = async () => {
    setIsLoading(true);
    try {
      // Kullanıcı kontrolü
      const user = await authRepository.getCurrentUser();
      
      if (!user) {
        setSessions([]);
        setIsLoading(false);
        return;
      }

      // Chat sessions'ları al
      const chatSessions = await sessionRepository.findByUserId(user.id);

      // Her session için son mesajı al
      const processedSessions: ChatSession[] = [];
      
      for (const session of chatSessions) {
        try {
          const messages = await messageRepository.findBySessionId(session.id, user.id);
          
          if (messages && messages.length > 0) {
            // En son mesajı bul
            const lastMessage = messages[messages.length - 1];
            
            processedSessions.push({
              id: session.id,
              title: session.title,
              lastMessage: lastMessage.content.substring(0, 50) + (lastMessage.content.length > 50 ? '...' : ''),
              timestamp: lastMessage.timestamp || session.updated_at,
              messageCount: messages.length,
            });
          }
        } catch (error) {
          logger.error(`Session ${session.id} mesajları yüklenirken hata:`, error);
          // Hata olsa bile session'ı ekle
          processedSessions.push({
            id: session.id,
            title: session.title,
            lastMessage: '',
            timestamp: session.updated_at,
            messageCount: 0,
          });
        }
      }

      setSessions(processedSessions);
    } catch (error) {
      logger.error('Sohbet geçmişi alma hatası:', error);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSessionPress = (session: ChatSession) => {
    navigation.navigate('Chat', {
      sessionId: session.id,
      sessionTitle: session.title,
    });
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const user = await authRepository.getCurrentUser();
      if (!user) return;

      await sessionRepository.delete(sessionId, user.id);
      // Session silindikten sonra listeyi yenile
      loadChatHistory();
    } catch (error) {
      logger.error('Session silme hatası:', error);
      Alert.alert(t('messages.error'), t('messages.delete_failed'));
    }
  };

  const handleExportSession = async (session: ChatSession) => {
    try {
      const user = await authRepository.getCurrentUser();
      if (!user) {
        Alert.alert(t('messages.error'), 'Kullanıcı bulunamadı');
        return;
      }

      // Session mesajlarını yükle
      const messages = await messageRepository.findBySessionId(session.id, user.id);
      
      if (!messages || messages.length === 0) {
        Alert.alert(t('messages.error'), 'Export edilecek mesaj yok');
        return;
      }

      // Format seçimi için ActionSheet
      Alert.alert(
        t('chat.export_chat') || 'Sohbeti Dışa Aktar',
        'Hangi formatta export etmek istersiniz?',
        [
          {
            text: t('common.cancel') || 'İptal',
            style: 'cancel',
          },
          {
            text: 'Metin (.txt)',
            onPress: async () => {
              try {
                await ChatExporter.shareChat(
                  messages,
                  session.title,
                  { format: 'txt', includeTimestamps: true, includeMetadata: true }
                );
                Alert.alert(t('messages.success') || 'Başarılı', 'Sohbet başarıyla paylaşıldı');
              } catch (error: any) {
                logger.error('Export hatası:', error);
                Alert.alert(t('messages.error') || 'Hata', error.message || 'Export başarısız oldu');
              }
            },
          },
          {
            text: 'JSON (.json)',
            onPress: async () => {
              try {
                await ChatExporter.shareChat(
                  messages,
                  session.title,
                  { format: 'json', includeTimestamps: true, includeMetadata: true }
                );
                Alert.alert(t('messages.success') || 'Başarılı', 'Sohbet başarıyla paylaşıldı');
              } catch (error: any) {
                logger.error('Export hatası:', error);
                Alert.alert(t('messages.error') || 'Hata', error.message || 'Export başarısız oldu');
              }
            },
          },
        ]
      );
    } catch (error: any) {
      logger.error('Export session hatası:', error);
      Alert.alert(t('messages.error') || 'Hata', error.message || 'Export başarısız oldu');
    }
  };

  const renderSessionItem = ({ item }: { item: ChatSession }) => (
    <TouchableOpacity
      onPress={() => handleSessionPress(item)}
      style={styles.sessionItem}
    >
      <GlassCard style={styles.sessionCard}>
        <View style={styles.sessionHeader}>
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionTitle}>{item.title}</Text>
            <Text style={styles.sessionTimestamp}>{formatTimestamp(item.timestamp)}</Text>
          </View>
          <View style={styles.sessionActions}>
            <TouchableOpacity
              onPress={() => handleExportSession(item)}
              style={styles.exportButton}
            >
              <Ionicons name="download-outline" size={20} color={darkTheme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  t('messages.confirm_delete'),
                  t('messages.delete_session_confirm'),
                  [
                    { text: t('common.cancel'), style: 'cancel' },
                    {
                      text: t('common.delete'),
                      style: 'destructive',
                      onPress: () => handleDeleteSession(item.id),
                    },
                  ]
                );
              }}
              style={styles.deleteButton}
            >
              <Ionicons name="trash-outline" size={20} color={darkTheme.colors.error} />
            </TouchableOpacity>
          </View>
        </View>
        {item.lastMessage && (
          <Text style={styles.lastMessage} numberOfLines={2}>
            {item.lastMessage}
          </Text>
        )}
        <View style={styles.sessionFooter}>
          <Text style={styles.messageCount}>
            {item.messageCount} {t('ui.messages')}
          </Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{t('ui.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (sessions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="chatbubbles-outline" size={64} color={darkTheme.colors.textSecondary} />
          <Text style={styles.emptyText}>{t('ui.no_chat_history')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('ui.chat_history')}</Text>
      </View>
      <FlatList
        data={sessions}
        renderItem={renderSessionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  headerTitle: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
  },
  listContent: {
    padding: 16,
  },
  sessionItem: {
    marginBottom: 12,
  },
  sessionCard: {
    padding: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    marginBottom: 4,
  },
  sessionTimestamp: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
  },
  sessionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  lastMessage: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    marginBottom: 8,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  messageCount: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});
