// Ana sohbet ekranı - AI ile chat
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Modal,
  Dimensions,
  Keyboard,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextInput, Button, Card, Avatar, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../utils/theme';
import { ChatService } from '../services/chatService';
import { AuthService } from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';
import { usePremium } from '../hooks/usePremium';
import { Message, User } from '../types';
import PremiumLimitScreen from './PremiumLimitScreen';
import GlassButton from '../components/GlassButton';
import { supabase } from '../services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showErrorAlert } from '../utils/errorHandler';
import { validateAndSanitizeInput } from '../utils/inputSanitizer';
import { checkRateLimit } from '../utils/rateLimiter';
import { logger } from '../utils/logger';
import { isOnline } from '../utils/networkStatus';
import { ChatExporter } from '../utils/chatExporter';
import Markdown from 'react-native-markdown-display';
import { checkRestrictedTopics } from '../config/restrictedTopics';
import { AdBanner } from '../components/AdBanner';

import { StackScreenProps } from '@react-navigation/stack';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { RootStackParamList, MainTabParamList } from '../types';

type ChatScreenNavigationProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Chat'>,
  StackScreenProps<RootStackParamList>
>;

interface ChatScreenProps extends ChatScreenNavigationProps {}

export default function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { t } = useLanguage();
  const { isPremium, canUseFeature } = usePremium();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showPremiumLimit, setShowPremiumLimit] = useState(false);
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [messagesLimit, setMessagesLimit] = useState(isPremium ? 999999 : 5); // Premium'da sınırsız
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0); // Klavye yüksekliği için state
  const flatListRef = useRef<FlatList>(null);

  // Pagination state
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const PAGE_SIZE = 50; // Her sayfada 50 mesaj

  // Responsive design için ekran boyutları
  const { width, height } = Dimensions.get('window');
  const isSmallScreen = height < 700;
  const isLargeScreen = height > 800;

  // Navigation bar yüksekliği (70px height + 30px bottom = 100px)
  const NAV_BAR_HEIGHT = 100;

  // FlatList performance constants
  const ESTIMATED_ITEM_HEIGHT = 80; // Yaklaşık mesaj yüksekliği

  useEffect(() => {
    // Her uygulama açılışında temiz başla - geçmiş konuşmaları yükleme
    getCurrentUser();
    // Günlük mesaj sayacını kontrol et ve gerekirse reset yap
    checkAndResetDailyMessageCount();
  }, []);

  // Premium durumu değiştiğinde mesaj limitini güncelle
  useEffect(() => {
    setMessagesLimit(isPremium ? 999999 : 5);
  }, [isPremium]);

  // Günlük mesaj sayacı reset mekanizması
  const checkAndResetDailyMessageCount = useCallback(async () => {
    try {
      const today = new Date().toDateString(); // Sadece tarih (gün/ay/yıl)
      const lastResetDate = await AsyncStorage.getItem('lastMessageCountResetDate');
      
      // Eğer bugün reset yapılmadıysa veya hiç reset yapılmamışsa
      if (lastResetDate !== today) {
        // Mesaj sayacını sıfırla
        setMessagesUsed(0);
        // Bugünün tarihini kaydet
        await AsyncStorage.setItem('lastMessageCountResetDate', today);
        logger.log('Günlük mesaj sayacı resetlendi:', today);
      } else {
        // Bugün reset yapılmış, kaydedilmiş mesaj sayısını yükle
        const savedCount = await AsyncStorage.getItem('messagesUsedToday');
        if (savedCount) {
          const count = parseInt(savedCount, 10);
          if (!isNaN(count)) {
            setMessagesUsed(count);
          }
        }
      }
    } catch (error) {
      logger.error('Günlük mesaj sayacı kontrol hatası:', error);
      // Hata durumunda sıfırla
      setMessagesUsed(0);
    }
  }, []);

  // Mesaj sayacını AsyncStorage'a kaydet
  const saveMessageCount = useCallback(async (count: number) => {
    try {
      await AsyncStorage.setItem('messagesUsedToday', count.toString());
    } catch (error) {
      logger.error('Mesaj sayacı kaydetme hatası:', error);
    }
  }, []);

  // Tab bar'dan Sohbet'e basınca - sessionId yoksa welcome mesajı göster
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      const sessionId = route?.params?.sessionId;
      // SessionId yoksa ve mesaj yoksa, welcome mesajını göster
      if (!sessionId && currentUser && messages.length === 0) {
        addWelcomeMessage(currentUser.id);
      }
      // Her focus'ta günlük mesaj sayacını kontrol et
      checkAndResetDailyMessageCount();
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, route?.params?.sessionId, currentUser, messages.length, checkAndResetDailyMessageCount]);

  // Session ID varsa mesajları yükle, yoksa yeni sohbet başlat
  useEffect(() => {
    const sessionId = route?.params?.sessionId;
    if (sessionId && currentUser) {
      // Reset pagination state
      setPage(0);
      setHasMore(true);
      loadSessionMessages(sessionId, 0);
    } else if (!sessionId && currentUser) {
      // SessionId yoksa (tab bar'dan basıldı veya temizlendi) - yeni sohbet başlat
      setMessages([]);
      addWelcomeMessage(currentUser.id);
    }
  }, [route?.params?.sessionId, currentUser, loadSessionMessages, addWelcomeMessage]);

  useEffect(() => {
    // Klavye durumunu ve yüksekliğini takip et - Tüm iOS iPhone modelleri için
    const showSubscription = Keyboard.addListener('keyboardDidShow', (e) => {
      setIsKeyboardVisible(true);
      // Klavye yüksekliğini kaydet (tüm iPhone modellerinde çalışır)
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0); // Klavye kapandığında yüksekliği sıfırla
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  // Uygulama kapanınca veya background'a geçince chat geçmişini kaydet
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextAppState => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // Uygulama background'a geçiyor veya kapanıyor
        if (currentUser && messages.length > 0) {
          try {
            // Welcome mesajını hariç tut
            const messagesToSave = messages.filter(msg => msg.id !== 'welcome');
            if (messagesToSave.length > 0) {
              await ChatService.saveMessages(messagesToSave, currentUser.id);
              logger.log('Chat geçmişi kaydedildi (AppState change)');
            }
          } catch (error) {
            logger.error('Chat geçmişi kaydetme hatası (AppState):', error);
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [messages, currentUser]);

  const getCurrentUser = async () => {
    try {
      const user = await AuthService.getCurrentUser();
      setCurrentUser(user);
      // Her açılışta temiz başla - geçmiş konuşmaları yükleme
      if (user) {
        // Sadece hoş geldin mesajını göster
        addWelcomeMessage(user.id);
      } else {
        setMessages([]);
      }
    } catch (error) {
      // Sadece logger'da göster, kullanıcıya gösterme
      logger.error('Kullanıcı bilgisi alma hatası:', error);
      // Kullanıcı bilgisi alınamazsa varsayılan değer kullan
      setCurrentUser(null);
      setMessages([]);
    }
  };

  // Hoş geldin mesajını ekle (session oluşturma yok - sadece mesaj gönderildiğinde oluşturulacak)
  const addWelcomeMessage = useCallback(async (userId?: string) => {
    // Session oluşturma kaldırıldı - sadece gerçek mesaj gönderildiğinde session oluşturulacak
    const welcomeMessage: Message = {
      id: 'welcome',
      content: t('chat.welcome_message'),
      role: 'assistant',
      timestamp: new Date().toISOString(),
      user_id: userId || currentUser?.id || 'system',
    };
    setMessages([welcomeMessage]);
  }, [t, currentUser?.id]);

  // Session mesajlarını yükle (pagination ile) - useCallback ile optimize edildi
  const loadSessionMessages = useCallback(async (sessionId: string, pageNum: number = 0) => {
    if (!currentUser) return;

    try {
      if (pageNum === 0) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      const offset = pageNum * PAGE_SIZE;
      const sessionMessages = await ChatService.loadSessionMessagesPaginated(
        sessionId,
        currentUser.id,
        PAGE_SIZE,
        offset
      );

      if (sessionMessages.length < PAGE_SIZE) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      if (sessionMessages && sessionMessages.length > 0) {
        if (pageNum === 0) {
          // İlk sayfa - mesajları set et
          setMessages(sessionMessages);
          setPage(0);
        } else {
          // Sonraki sayfalar - eski mesajları başa ekle (inverted list için)
          setMessages(prev => [...sessionMessages, ...prev]);
          setPage(pageNum);
        }
      } else if (pageNum === 0) {
        // İlk sayfa ve mesaj yoksa welcome mesajı göster
        await addWelcomeMessage();
      }
    } catch (error) {
      logger.error('Session mesajları yükleme hatası:', error);
      if (pageNum === 0) {
        // Hata durumunda welcome mesajı göster
        await addWelcomeMessage();
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [currentUser, addWelcomeMessage]);

  // Daha fazla mesaj yükle (infinite scroll)
  const loadMoreMessages = useCallback(() => {
    const sessionId = route?.params?.sessionId;
    if (sessionId && currentUser && hasMore && !isLoadingMore && !isLoading) {
      loadSessionMessages(sessionId, page + 1);
    }
  }, [route?.params?.sessionId, currentUser, hasMore, isLoadingMore, isLoading, page, loadSessionMessages]);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    // Mesaj gönderme işlemini engelle (duplicate önlemek için)
    if (isLoading) {
      return; // Zaten bir mesaj gönderiliyor, yeni mesaj gönderme
    }

    // Network kontrolü - offline ise uyarı ver
    const online = await isOnline();
    if (!online) {
      Alert.alert(
        t('messages.error'),
        'İnternet bağlantınız yok. Lütfen bağlantınızı kontrol edin.'
      );
      return;
    }

    // Input sanitization ve validasyon
    const validation = validateAndSanitizeInput(inputText);
    if (!validation.valid) {
      Alert.alert(t('messages.error'), validation.error || 'Geçersiz mesaj');
      return;
    }

    const sanitizedContent = validation.sanitized || inputText.trim();

    // Yasaklı konular kontrolü
    const userLanguage = (await AsyncStorage.getItem('appLanguage')) || 'tr';
    const restrictedCheck = checkRestrictedTopics(sanitizedContent, userLanguage);
    if (restrictedCheck.isRestricted) {
      Alert.alert(
        t('messages.error'),
        restrictedCheck.message || 'Bu konu hakkında konuşamıyorum. Lütfen başka bir konu seçin.'
      );
      return;
    }

    // Rate limiting kontrolü
    const userId = currentUser?.id || 'anonymous';
    const rateLimitCheck = checkRateLimit(userId);
    if (!rateLimitCheck.allowed) {
      Alert.alert(t('messages.error'), rateLimitCheck.error || 'Çok hızlı mesaj gönderiyorsunuz');
      return;
    }

    // Premium limit kontrolü
    if (!canUseFeature('unlimited_messages') && messagesUsed >= messagesLimit) {
      setShowPremiumLimit(true);
      return;
    }

    // Unique ID oluştur
    const userMessage: Message = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: sanitizedContent,
      role: 'user',
      timestamp: new Date().toISOString(),
      user_id: userId,
    };

    // Input'u temizle
    setInputText('');
    setIsLoading(true);
    // Mesaj sayacını artır ve kaydet
    setMessagesUsed(prev => {
      const newCount = prev + 1;
      saveMessageCount(newCount);
      return newCount;
    });

    // Kullanıcı mesajını ekle (duplicate kontrolü ile)
    setMessages(prev => {
      // Duplicate kontrolü - aynı içerik ve zaman damgası varsa ekleme
      const isDuplicate = prev.some(
        msg => msg.content === userMessage.content && 
               msg.role === 'user' && 
               Math.abs(new Date(msg.timestamp).getTime() - new Date(userMessage.timestamp).getTime()) < 1000
      );
      if (isDuplicate) {
        return prev; // Duplicate ise ekleme
      }
      return [...prev, userMessage];
    });

    try {
      // Mevcut mesajları al (güncel state)
      const currentMessages = messages;
      const messagesWithUser = [...currentMessages, userMessage];
      
      // AI'dan cevap al - mevcut mesajları context olarak gönder
      const aiResponse = await ChatService.sendMessage(sanitizedContent, userId, messagesWithUser);

      // AI cevabını ekle (duplicate kontrolü ile)
      setMessages(prev => {
        // Son mesaj zaten userMessage ise, sadece AI cevabını ekle
        const lastMessage = prev[prev.length - 1];
        if (lastMessage && lastMessage.id === userMessage.id) {
          // Duplicate kontrolü - aynı AI cevabı varsa ekleme
          const isDuplicate = prev.some(
            msg => msg.content === aiResponse.content && 
                   msg.role === 'assistant' && 
                   Math.abs(new Date(msg.timestamp).getTime() - new Date(aiResponse.timestamp).getTime()) < 1000
          );
          if (isDuplicate) {
            return prev;
          }
          return [...prev, aiResponse];
        }
        // Eğer userMessage eklenmemişse, her ikisini de ekle
        return [...prev, aiResponse];
      });
    } catch (error) {
      logger.error('Mesaj gönderme hatası:', error);

      // Kullanıcı mesajını geri al (hata durumunda)
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));

      // Kullanıcı dostu hata mesajı göster
      showErrorAlert(error, t, () => {
        // Retry fonksiyonu - input'u geri yükle, kullanıcı tekrar basabilir
        setInputText(sanitizedContent);
      });

      // Fallback mesaj
      const fallbackMessage: Message = {
        id: `fallback-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        content: t('errors.chat_error'),
        role: 'assistant',
        timestamp: new Date().toISOString(),
        user_id: userId,
      };
      setMessages(prev => [...prev, fallbackMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Memoized message component
  const MessageItem = React.memo(
    ({ item }: { item: Message }) => {
      const isUser = item.role === 'user';

      // Memoized styles
      const containerStyle = useMemo(
        () => [
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.aiMessageContainer,
        ],
        [isUser]
      );

      const bubbleStyle = useMemo(
        () => [styles.messageBubble, isUser ? styles.userMessageBubble : styles.aiMessageBubble],
        [isUser]
      );

      // Memoized time string
      const timeString = useMemo(
        () =>
          new Date(item.timestamp).toLocaleTimeString('tr-TR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        [item.timestamp]
      );

      return (
        <View style={containerStyle}>
          <View style={bubbleStyle}>
            <View style={styles.messageContent}>
              {item.content.includes('```') || item.content.includes('`') ? (
                <Markdown
                  style={{
                    body: {
                      color: isUser ? 'white' : darkTheme.colors.text,
                      fontSize: 16,
                      lineHeight: 22,
                    },
                    code_inline: {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      padding: 2,
                      borderRadius: 4,
                      fontFamily: 'monospace',
                    },
                    code_block: {
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      padding: 12,
                      borderRadius: 8,
                      fontFamily: 'monospace',
                      marginVertical: 8,
                    },
                    fence: {
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      padding: 12,
                      borderRadius: 8,
                      fontFamily: 'monospace',
                      marginVertical: 8,
                    },
                  }}
                >
                  {item.content}
                </Markdown>
              ) : (
                <Text
                  style={[
                    styles.messageText,
                    isUser ? styles.userMessageText : styles.aiMessageText,
                  ]}
                >
                  {item.content}
                </Text>
              )}
              <Text
                style={[styles.messageTime, isUser ? styles.userMessageTime : styles.aiMessageTime]}
              >
                {timeString}
              </Text>
            </View>
            {isUser && (
              <View style={styles.userAvatar}>
                <Ionicons name="person-outline" size={16} color={darkTheme.colors.primary} />
              </View>
            )}
          </View>
        </View>
      );
    },
    (prevProps, nextProps) => {
      // Custom comparison - sadece content veya timestamp değiştiyse re-render
      return (
        prevProps.item.id === nextProps.item.id &&
        prevProps.item.content === nextProps.item.content &&
        prevProps.item.timestamp === nextProps.item.timestamp
      );
    }
  );

  // Memoized render function
  const renderMessage = useCallback(({ item }: { item: Message }) => {
    return <MessageItem item={item} />;
  }, []);

  // Memoized key extractor - unique key için index de ekle
  const keyExtractor = useCallback((item: Message, index: number) => {
    // Unique key - ID + index kombinasyonu
    return item.id ? `${item.id}-${index}` : `msg-${index}-${Date.now()}`;
  }, []);

  // Memoized styles for better performance
  const messagesContentStyle = useMemo(
    () => [
      styles.messagesContent,
      { paddingBottom: isSmallScreen ? 4 : 8 },
    ],
    [isSmallScreen]
  );

  // Memoized getItemLayout for FlatList performance
  const getItemLayout = useCallback(
    (data: any, index: number) => ({
      length: ESTIMATED_ITEM_HEIGHT,
      offset: ESTIMATED_ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  // Export chat handler
  const handleExportChat = useCallback(async () => {
    try {
      // Welcome mesajını hariç tut
      const messagesToExport = messages.filter(msg => msg.id !== 'welcome');

      if (messagesToExport.length === 0) {
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
                  messagesToExport,
                  route?.params?.sessionTitle || 'Sohbet',
                  { format: 'txt', includeTimestamps: true, includeMetadata: true }
                );
                Alert.alert(t('messages.success') || 'Başarılı', 'Sohbet başarıyla paylaşıldı');
              } catch (error: any) {
                logger.error('Export hatası:', error);
                Alert.alert(
                  t('messages.error') || 'Hata',
                  error.message || 'Export başarısız oldu'
                );
              }
            },
          },
          {
            text: 'JSON (.json)',
            onPress: async () => {
              try {
                await ChatExporter.shareChat(
                  messagesToExport,
                  route?.params?.sessionTitle || 'Sohbet',
                  { format: 'json', includeTimestamps: true, includeMetadata: true }
                );
                Alert.alert(t('messages.success') || 'Başarılı', 'Sohbet başarıyla paylaşıldı');
              } catch (error: any) {
                logger.error('Export hatası:', error);
                Alert.alert(
                  t('messages.error') || 'Hata',
                  error.message || 'Export başarısız oldu'
                );
              }
            },
          },
        ]
      );
      } catch (error: any) {
        logger.error('Export chat hatası:', error);
        // Production'da teknik hata mesajı gösterme
        const errorMessage = __DEV__ 
          ? (error.message || 'Export başarısız oldu')
          : t('messages.error') || 'Export işlemi başarısız oldu. Lütfen tekrar deneyin.';
        Alert.alert(t('messages.error') || 'Hata', errorMessage);
      }
  }, [messages, route?.params?.sessionTitle, t]);

  const renderLoadingMessage = () => {
    if (!isLoading) return null;

    return (
      <View style={[styles.messageContainer, styles.aiMessageContainer]}>
        <View style={[styles.messageBubble, styles.aiMessageBubble]}>
          <View style={styles.messageContent}>
            <View style={styles.typingIndicator}>
              <View style={styles.typingDots}>
                <View style={[styles.dot, styles.dot1]} />
                <View style={[styles.dot, styles.dot2]} />
                <View style={[styles.dot, styles.dot3]} />
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Messages and Input - Animasyonsuz geçiş için KeyboardAvoidingView kaldırıldı */}
      <View style={styles.keyboardAvoidingContainer}>
        {/* Messages */}
        <View style={styles.messagesContainer}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            style={styles.messagesList}
          contentContainerStyle={messagesContentStyle}
            // ✅ Performance optimizations
            getItemLayout={getItemLayout}
            removeClippedSubviews={true}
            maxToRenderPerBatch={5}
            windowSize={10}
            initialNumToRender={10}
            updateCellsBatchingPeriod={50}
            // ✅ Pagination (infinite scroll - yukarı scroll için)
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color={darkTheme.colors.primary} />
                </View>
              ) : null
            }
            // ✅ Scroll optimizations - sadece yeni mesaj eklendiğinde scroll
            onContentSizeChange={(contentWidth, contentHeight) => {
              // Sadece yeni mesaj eklendiğinde ve pagination yoksa scroll
              if (page === 0 && !isLoadingMore && !isLoading) {
                // Kısa bir delay ile scroll (render tamamlanması için)
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 100);
              }
            }}
            onLayout={() => {
              // İlk render'da scroll
              if (page === 0 && messages.length > 0) {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }, 100);
              }
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
          {renderLoadingMessage()}
        </View>

        {/* Banner Reklam - Premium kullanıcılara gösterilmez */}
        <AdBanner style={styles.adBanner} isPremium={isPremium} />

        {/* Input - Responsive - Animasyonsuz geçiş - Tüm iOS iPhone modelleri için */}
        <View
          style={[
            styles.inputContainer,
            {
              paddingBottom: isKeyboardVisible
                ? Math.max(insets.bottom, 0) + keyboardHeight // Klavye açıkken: safe area + klavye yüksekliği
                : Math.max(insets.bottom, 4) + NAV_BAR_HEIGHT, // Klavye kapalıyken: navigation bar + safe area
            },
          ]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={t('chat.placeholder')}
              mode="flat"
              multiline
              maxLength={1000}
              editable={true}
              showSoftInputOnFocus={true}
              dense={true}
              contentStyle={styles.textInputContent}
              style={[styles.textInput, { fontSize: isSmallScreen ? 14 : 15 }]}
              theme={{
                colors: {
                  primary: darkTheme.colors.primary,
                  background: 'transparent',
                  text: darkTheme.colors.text,
                  placeholder: darkTheme.colors.textSecondary,
                },
              }}
              underlineColor="transparent"
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={!inputText.trim() || isLoading ? darkTheme.colors.textSecondary : 'white'}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Premium Limit Modal */}
      <PremiumLimitScreen
        visible={showPremiumLimit}
        onClose={() => setShowPremiumLimit(false)}
        onUpgrade={() => {
          setShowPremiumLimit(false);
          // PremiumFeaturesScreen'e yönlendir
          navigation.navigate('PremiumFeatures');
        }}
        messagesUsed={messagesUsed}
        messagesLimit={messagesLimit}
      />

      {/* Premium Features Modal */}
      <Modal
        visible={showPremiumModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPremiumModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.premiumModal}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.premiumIconContainer}>
                <Ionicons name="sparkles" size={32} color={darkTheme.colors.premium} />
              </View>
              <Text style={styles.modalTitle}>{t('chat.premium_features')}</Text>
              <Text style={styles.modalSubtitle}>{t('chat.premium_desc')}</Text>
            </View>

            {/* Features List */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <View
                  style={[styles.featureIcon, { backgroundColor: darkTheme.colors.primary + '20' }]}
                >
                  <Ionicons name="infinite" size={20} color={darkTheme.colors.primary} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{t('premium.unlimited')}</Text>
                  <Text style={styles.featureDescription}>
                    Günlük mesaj limiti olmadan istediğiniz kadar sohbet edin
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View
                  style={[styles.featureIcon, { backgroundColor: darkTheme.colors.success + '20' }]}
                >
                  <Ionicons name="flash" size={20} color={darkTheme.colors.success} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Hızlı Yanıtlar</Text>
                  <Text style={styles.featureDescription}>
                    Premium kullanıcılar için öncelikli ve hızlı AI yanıtları
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View
                  style={[styles.featureIcon, { backgroundColor: darkTheme.colors.premium + '20' }]}
                >
                  <Ionicons name="star" size={20} color={darkTheme.colors.premium} />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>Özel Özellikler</Text>
                  <Text style={styles.featureDescription}>
                    Gelişmiş AI modelleri ve özel sohbet özellikleri
                  </Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPremiumModal(false)}
              >
                <Ionicons name="close" size={18} color={darkTheme.colors.primary} />
                <Text style={styles.closeButtonText}>{t('chat.close')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => {
                  setShowPremiumModal(false);
                  Alert.alert(t('alert.premium_coming_soon'), t('alert.premium_coming_soon'));
                }}
              >
                <Ionicons name="sparkles" size={18} color="white" />
                <Text style={styles.upgradeButtonText}>{t('chat.upgrade')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
    paddingBottom: 0, // Navigation bar absolute positioned, padding gerekmez
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: darkTheme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
    position: 'relative', // Absolute positioning için gerekli
  },
  headerLeft: {
    width: 40, // Sabit genişlik
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 8,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  headerCenter: {
    flex: 1, // Kalan alanı kapla
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text || '#FFFFFF', // Fallback beyaz renk
    fontWeight: '600' as const,
    textAlign: 'center',
    lineHeight: 24, // Sabit lineHeight ile hizalama
    includeFontPadding: false, // Android için font padding'i kaldır
  },
  headerRight: {
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exportButton: {
    padding: 6,
    opacity: 0.8,
  },
  premiumIndicator: {
    opacity: 1, // Görünürlüğü artırdık
    justifyContent: 'center',
    alignItems: 'center',
    height: 24, // headerTitle lineHeight ile aynı
    width: 24,
    padding: 2, // Tıklanabilir alanı artırdık
  },
  keyboardAvoidingContainer: {
    flex: 1,
    width: '100%',
  },
  messagesContainer: {
    flex: 1,
    flexShrink: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 20,
    paddingBottom: 12,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    borderRadius: darkTheme.borderRadius.md,
  },
  userMessageBubble: {
    backgroundColor: darkTheme.colors.surface,
    borderBottomRightRadius: 4,
  },
  aiMessageBubble: {
    backgroundColor: darkTheme.colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageContent: {
    flex: 1,
    marginHorizontal: 8,
  },
  messageText: {
    ...darkTheme.typography.body,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  userMessageText: {
    color: 'white',
  },
  aiMessageText: {
    color: darkTheme.colors.text,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  userMessageTime: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  aiMessageTime: {
    color: darkTheme.colors.textSecondary,
  },
  loadingMoreContainer: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.aiHaze,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: darkTheme.colors.aiHaze,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: darkTheme.colors.textSecondary,
    marginHorizontal: 2,
  },
  dot1: {
    opacity: 0.4,
  },
  dot2: {
    opacity: 0.7,
  },
  dot3: {
    opacity: 1,
  },
  adBanner: {
    paddingVertical: 4,
    backgroundColor: darkTheme.colors.background,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.border,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: darkTheme.colors.background,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.border,
    flexShrink: 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.aiHaze,
    borderRadius: darkTheme.borderRadius.md,
    paddingHorizontal: 10,
    paddingVertical: 2,
    gap: 6,
    minHeight: 40,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'transparent',
    maxHeight: 100,
    fontSize: 15,
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginVertical: 0,
    marginHorizontal: 0,
    minHeight: 32,
  },
  textInputContent: {
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginVertical: 0,
    marginHorizontal: 0,
    minHeight: 32,
  },
  sendButton: {
    padding: 6,
    backgroundColor: darkTheme.colors.primary,
    borderRadius: 18,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: darkTheme.colors.border,
    opacity: 0.6,
  },

  // Premium Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  premiumModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 20,
    ...darkTheme.shadows.strong,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  modalHeader: {
    alignItems: 'center',
    padding: 24,
    paddingBottom: 20,
  },
  premiumIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: darkTheme.colors.premium + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...darkTheme.shadows.medium,
  },
  modalTitle: {
    ...darkTheme.typography.title,
    color: darkTheme.colors.text,
    fontSize: 22,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '400' as const,
  },
  featuresList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    ...darkTheme.shadows.soft,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    ...darkTheme.typography.subtitle,
    color: darkTheme.colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  featureDescription: {
    ...darkTheme.typography.caption,
    color: darkTheme.colors.textSecondary,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 24,
    paddingTop: 0,
    gap: 12,
  },
  closeButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: darkTheme.colors.surface,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...darkTheme.shadows.soft,
  },
  closeButtonText: {
    ...darkTheme.typography.body,
    color: darkTheme.colors.textSecondary,
    fontWeight: '600' as const,
    fontSize: 15,
  },
  upgradeButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: darkTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...darkTheme.shadows.medium,
  },
  upgradeButtonText: {
    ...darkTheme.typography.body,
    color: 'white',
    fontWeight: '600' as const,
    fontSize: 15,
  },
});
