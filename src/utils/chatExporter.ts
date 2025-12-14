// Chat Exporter - Sohbet dışa aktarma utility
import { Message, ChatSession } from '../types';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';
import { logger } from './logger';

export interface ExportOptions {
  format: 'txt' | 'json' | 'pdf';
  includeTimestamps?: boolean;
  includeMetadata?: boolean;
}

export class ChatExporter {
  /**
   * Mesajları TXT formatına dönüştür
   */
  private static formatAsTXT(
    messages: Message[],
    sessionTitle: string,
    options: ExportOptions
  ): string {
    let content = `=== ${sessionTitle} ===\n\n`;

    if (options.includeMetadata) {
      content += `Export Date: ${new Date().toLocaleString('tr-TR')}\n`;
      content += `Total Messages: ${messages.length}\n\n`;
      content += '---\n\n';
    }

    messages.forEach((msg, index) => {
      const role = msg.role === 'user' ? 'Kullanıcı' : 'Emora AI';
      const timestamp = options.includeTimestamps
        ? `[${new Date(msg.timestamp).toLocaleString('tr-TR')}] `
        : '';

      content += `${timestamp}${role}:\n${msg.content}\n\n`;
    });

    return content;
  }

  /**
   * Mesajları JSON formatına dönüştür
   */
  private static formatAsJSON(
    messages: Message[],
    sessionTitle: string,
    options: ExportOptions
  ): string {
    const data = {
      sessionTitle,
      exportDate: new Date().toISOString(),
      metadata: options.includeMetadata
        ? {
            totalMessages: messages.length,
            platform: Platform.OS,
            appVersion: '1.0.7',
          }
        : undefined,
      messages: messages.map(msg => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: options.includeTimestamps ? msg.timestamp : undefined,
      })),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Mesajları basit PDF formatına dönüştür (TXT olarak kaydet, PDF için daha gelişmiş kütüphane gerekir)
   */
  private static formatAsPDF(
    messages: Message[],
    sessionTitle: string,
    options: ExportOptions
  ): string {
    // Basit PDF formatı (gerçek PDF için react-native-pdf veya expo-print kullanılabilir)
    // Şimdilik TXT formatında döndürüyoruz
    return this.formatAsTXT(messages, sessionTitle, options);
  }

  /**
   * Sohbeti dışa aktar
   */
  static async exportChat(
    messages: Message[],
    sessionTitle: string,
    options: ExportOptions = { format: 'txt', includeTimestamps: true, includeMetadata: true }
  ): Promise<string | null> {
    try {
      if (!messages || messages.length === 0) {
        throw new Error('Export edilecek mesaj yok');
      }

      // Format'a göre içerik oluştur
      let content: string;
      let fileExtension: string;
      let mimeType: string;

      switch (options.format) {
        case 'txt':
          content = this.formatAsTXT(messages, sessionTitle, options);
          fileExtension = 'txt';
          mimeType = 'text/plain';
          break;
        case 'json':
          content = this.formatAsJSON(messages, sessionTitle, options);
          fileExtension = 'json';
          mimeType = 'application/json';
          break;
        case 'pdf':
          content = this.formatAsPDF(messages, sessionTitle, options);
          fileExtension = 'txt'; // Şimdilik TXT olarak kaydet
          mimeType = 'text/plain';
          break;
        default:
          throw new Error(`Desteklenmeyen format: ${options.format}`);
      }

      // Dosya adı oluştur
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const sanitizedTitle = sessionTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      const fileName = `${sanitizedTitle}_${timestamp}.${fileExtension}`;

      // Dosyayı kaydet
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, content, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      logger.log(`Chat exported: ${fileName}`);
      return fileUri;
    } catch (error) {
      logger.error('Chat export hatası:', error);
      throw error;
    }
  }

  /**
   * Dosyayı paylaş (Share API)
   */
  static async shareChat(
    messages: Message[],
    sessionTitle: string,
    options: ExportOptions = { format: 'txt', includeTimestamps: true, includeMetadata: true }
  ): Promise<void> {
    try {
      const fileUri = await this.exportChat(messages, sessionTitle, options);

      if (!fileUri) {
        throw new Error('Dosya oluşturulamadı');
      }

      // Sharing kontrolü
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Paylaşım Hatası', 'Bu cihazda paylaşım özelliği kullanılamıyor.');
        return;
      }

      // Dosyayı paylaş
      await Sharing.shareAsync(fileUri, {
        mimeType: options.format === 'json' ? 'application/json' : 'text/plain',
        dialogTitle: `Sohbeti Paylaş: ${sessionTitle}`,
      });

      logger.log('Chat shared successfully');
    } catch (error) {
      logger.error('Chat share hatası:', error);
      throw error;
    }
  }

  /**
   * Mesajları email formatına dönüştür
   */
  static formatForEmail(
    messages: Message[],
    sessionTitle: string
  ): { subject: string; body: string } {
    const subject = `Emora AI Sohbet: ${sessionTitle}`;
    const body = this.formatAsTXT(messages, sessionTitle, {
      format: 'txt',
      includeTimestamps: true,
      includeMetadata: true,
    });

    return { subject, body };
  }

  /**
   * Export seçenekleri dialog'u için format listesi
   */
  static getExportFormats(): Array<{ label: string; value: ExportOptions['format'] }> {
    return [
      { label: 'Metin Dosyası (.txt)', value: 'txt' },
      { label: 'JSON Dosyası (.json)', value: 'json' },
      { label: 'PDF Dosyası (.pdf)', value: 'pdf' },
    ];
  }

  /**
   * Tarihe göre mesajları grupla
   */
  private static groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
    const grouped = new Map<string, Message[]>();

    messages.forEach((msg) => {
      try {
        // Timestamp'i parse et
        const date = new Date(msg.timestamp);
        
        // Geçerli tarih kontrolü
        if (isNaN(date.getTime())) {
          logger.log(`Geçersiz timestamp: ${msg.timestamp}, mesaj ID: ${msg.id}`);
          return; // Geçersiz tarihi atla
        }

        // Yerel tarihi kullan (timezone sorunlarını önlemek için)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateKey = `${year}-${month}-${day}`;

        if (!grouped.has(dateKey)) {
          grouped.set(dateKey, []);
        }
        grouped.get(dateKey)!.push(msg);
      } catch (error) {
        logger.log(`Tarih parse hatası: ${msg.timestamp}, mesaj ID: ${msg.id}`);
      }
    });

    logger.log(`Mesajlar ${grouped.size} farklı tarihe gruplandı`);
    return grouped;
  }

  /**
   * Tüm sohbet geçmişini tarihe göre ayrı dosyalara export et
   */
  static async exportAllChatHistoryByDate(
    sessions: Array<{ id: string; title: string; messages: Message[] }>,
    options: ExportOptions = { format: 'txt', includeTimestamps: true, includeMetadata: true }
  ): Promise<string[]> {
    try {
      if (!sessions || sessions.length === 0) {
        throw new Error('Export edilecek sohbet geçmişi yok');
      }

      // Tüm mesajları birleştir
      const allMessages: Array<{ message: Message; sessionTitle: string }> = [];
      sessions.forEach((session) => {
        session.messages.forEach((msg) => {
          allMessages.push({ message: msg, sessionTitle: session.title });
        });
      });

      if (allMessages.length === 0) {
        throw new Error('Export edilecek mesaj yok');
      }

      // Tarihe göre grupla
      const messagesByDate = new Map<string, Array<{ message: Message; sessionTitle: string }>>();

      allMessages.forEach(({ message, sessionTitle }) => {
        const date = new Date(message.timestamp);
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

        if (!messagesByDate.has(dateKey)) {
          messagesByDate.set(dateKey, []);
        }
        messagesByDate.get(dateKey)!.push({ message, sessionTitle });
      });

      // Her tarih için dosya oluştur
      const fileUris: string[] = [];
      const sortedDates = Array.from(messagesByDate.keys()).sort().reverse(); // En yeni tarih önce

      for (const dateKey of sortedDates) {
        const dateMessages = messagesByDate.get(dateKey)!;
        
        // Tarihi formatla (örn: 2024-12-13 -> 13 Aralık 2024)
        const date = new Date(dateKey);
        const formattedDate = date.toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Mesajları session'a göre grupla
        const messagesBySession = new Map<string, Message[]>();
        dateMessages.forEach(({ message, sessionTitle }) => {
          if (!messagesBySession.has(sessionTitle)) {
            messagesBySession.set(sessionTitle, []);
          }
          messagesBySession.get(sessionTitle)!.push(message);
        });

        // Format'a göre içerik oluştur
        let content: string;
        let fileExtension: string;

        if (options.format === 'json') {
          // JSON formatında: her session ayrı bir obje
          const sessionsData = Array.from(messagesBySession.entries()).map(([sessionTitle, msgs]) => ({
            sessionTitle,
            messages: msgs.map(msg => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: options.includeTimestamps ? msg.timestamp : undefined,
            })),
          }));

          const data = {
            date: dateKey,
            formattedDate,
            exportDate: new Date().toISOString(),
            metadata: options.includeMetadata
              ? {
                  totalMessages: dateMessages.length,
                  totalSessions: messagesBySession.size,
                  platform: Platform.OS,
                  appVersion: '1.0.7',
                }
              : undefined,
            sessions: sessionsData,
          };

          content = JSON.stringify(data, null, 2);
          fileExtension = 'json';
        } else {
          // TXT formatında
          content = `=== Sohbet Geçmişi - ${formattedDate} ===\n\n`;

          if (options.includeMetadata) {
            content += `Tarih: ${formattedDate}\n`;
            content += `Toplam Mesaj: ${dateMessages.length}\n`;
            content += `Toplam Oturum: ${messagesBySession.size}\n`;
            content += `Export Tarihi: ${new Date().toLocaleString('tr-TR')}\n\n`;
            content += '---\n\n';
          }

          // Her session için mesajları yaz
          messagesBySession.forEach((msgs, sessionTitle) => {
            content += `\n### ${sessionTitle} ###\n\n`;
            
            msgs.forEach((msg) => {
              const role = msg.role === 'user' ? 'Kullanıcı' : 'Emora AI';
              const timestamp = options.includeTimestamps
                ? `[${new Date(msg.timestamp).toLocaleTimeString('tr-TR')}] `
                : '';

              content += `${timestamp}${role}:\n${msg.content}\n\n`;
            });
          });
          fileExtension = 'txt';
        }

        // Dosya adı oluştur
        const sanitizedDate = dateKey.replace(/-/g, '_');
        const fileName = `emora_ai_sohbet_${sanitizedDate}.${fileExtension}`;

        // Dosyayı kaydet
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        fileUris.push(fileUri);
        logger.log(`Chat history exported for date ${dateKey}: ${fileName}`);
      }

      return fileUris;
    } catch (error) {
      logger.error('Chat history export hatası:', error);
      throw error;
    }
  }

  /**
   * Tek bir sohbet oturumunu tarihe göre ayrı dosyalara export et
   */
  static async exportSessionByDate(
    messages: Message[],
    sessionTitle: string,
    options: ExportOptions = { format: 'txt', includeTimestamps: true, includeMetadata: true }
  ): Promise<string[]> {
    try {
      if (!messages || messages.length === 0) {
        throw new Error('Export edilecek mesaj yok');
      }

      // Tarihe göre grupla
      const messagesByDate = this.groupMessagesByDate(messages);

      if (messagesByDate.size === 0) {
        throw new Error('Export edilecek mesaj yok');
      }

      logger.log(`${messagesByDate.size} farklı tarih için dosya oluşturulacak`);

      // Her tarih için dosya oluştur
      const fileUris: string[] = [];
      const sortedDates = Array.from(messagesByDate.keys()).sort().reverse(); // En yeni tarih önce
      
      logger.log(`Tarihler: ${sortedDates.join(', ')}`);

      for (const dateKey of sortedDates) {
        const dateMessages = messagesByDate.get(dateKey)!;
        
        // Tarihi formatla (örn: 2024-12-13 -> 13 Aralık 2024)
        const date = new Date(dateKey);
        const formattedDate = date.toLocaleDateString('tr-TR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        // Format'a göre içerik oluştur
        let content: string;
        let fileExtension: string;

        if (options.format === 'json') {
          const data = {
            sessionTitle,
            date: dateKey,
            formattedDate,
            exportDate: new Date().toISOString(),
            metadata: options.includeMetadata
              ? {
                  totalMessages: dateMessages.length,
                  platform: Platform.OS,
                  appVersion: '1.0.7',
                }
              : undefined,
            messages: dateMessages.map(msg => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: options.includeTimestamps ? msg.timestamp : undefined,
            })),
          };

          content = JSON.stringify(data, null, 2);
          fileExtension = 'json';
        } else {
          // TXT formatında
          content = `=== ${sessionTitle} - ${formattedDate} ===\n\n`;

          if (options.includeMetadata) {
            content += `Sohbet: ${sessionTitle}\n`;
            content += `Tarih: ${formattedDate}\n`;
            content += `Toplam Mesaj: ${dateMessages.length}\n`;
            content += `Export Tarihi: ${new Date().toLocaleString('tr-TR')}\n\n`;
            content += '---\n\n';
          }

          dateMessages.forEach((msg) => {
            const role = msg.role === 'user' ? 'Kullanıcı' : 'Emora AI';
            const timestamp = options.includeTimestamps
              ? `[${new Date(msg.timestamp).toLocaleTimeString('tr-TR')}] `
              : '';

            content += `${timestamp}${role}:\n${msg.content}\n\n`;
          });
          fileExtension = 'txt';
        }

        // Dosya adı oluştur
        const sanitizedTitle = sessionTitle.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
        const sanitizedDate = dateKey.replace(/-/g, '_');
        const fileName = `${sanitizedTitle}_${sanitizedDate}.${fileExtension}`;

        // Dosyayı kaydet
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
        await FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        fileUris.push(fileUri);
        logger.log(`Session exported for date ${dateKey}: ${fileName}`);
      }

      return fileUris;
    } catch (error) {
      logger.error('Session export hatası:', error);
      throw error;
    }
  }

  /**
   * Tek bir sohbet oturumunu tarihe göre ayrı dosyalara export et ve paylaş
   */
  static async shareSessionByDate(
    messages: Message[],
    sessionTitle: string,
    options: ExportOptions = { format: 'txt', includeTimestamps: true, includeMetadata: true }
  ): Promise<void> {
    try {
      logger.log(`shareSessionByDate başlatıldı: ${messages.length} mesaj, başlık: ${sessionTitle}`);
      
      const fileUris = await this.exportSessionByDate(messages, sessionTitle, options);

      logger.log(`${fileUris.length} dosya oluşturuldu`);

      if (fileUris.length === 0) {
        throw new Error('Export edilecek dosya yok');
      }

      // Sharing kontrolü
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Paylaşım Hatası', 'Bu cihazda paylaşım özelliği kullanılamıyor.');
        return;
      }

      // Eğer sadece bir dosya varsa direkt paylaş
      if (fileUris.length === 1) {
        try {
          const uri = fileUris[0];
          const fileName = uri.split('/').pop() || 'sohbet';
          await Sharing.shareAsync(uri, {
            mimeType: options.format === 'json' ? 'application/json' : 'text/plain',
            dialogTitle: `${sessionTitle}`,
          });
          logger.log('Tek dosya paylaşıldı');
          return;
        } catch (error) {
          logger.error('Dosya paylaşım hatası:', error);
          Alert.alert('Hata', 'Dosya paylaşılamadı');
          return;
        }
      }

      // Birden fazla dosya varsa sırayla paylaş
      // İlk dosyayı direkt paylaş
      if (fileUris.length > 1) {
        try {
          const firstUri = fileUris[0];
          const fileName = firstUri.split('/').pop() || 'sohbet';
          const dateMatch = fileName.match(/(\d{4}_\d{2}_\d{2})/);
          const dateStr = dateMatch 
            ? dateMatch[1].replace(/_/g, '-')
            : 'Sohbet';

          await Sharing.shareAsync(firstUri, {
            mimeType: options.format === 'json' ? 'application/json' : 'text/plain',
            dialogTitle: `${sessionTitle} - ${dateStr}`,
          });

          // Birden fazla dosya varsa kullanıcıya diğerlerini de paylaşmak isteyip istemediğini sor
          if (fileUris.length > 1) {
            // Kısa bir bekleme sonrası diğer dosyalar için sor
            setTimeout(async () => {
              Alert.alert(
                'Diğer Dosyalar',
                `${fileUris.length - 1} dosya daha var. Diğer tarihleri de paylaşmak ister misiniz?`,
                [
                  { text: 'Hayır', style: 'cancel' },
                  {
                    text: 'Evet',
                    onPress: async () => {
                      // Kalan dosyaları sırayla paylaş
                      for (let i = 1; i < fileUris.length; i++) {
                        try {
                          const uri = fileUris[i];
                          const fileName = uri.split('/').pop() || `dosya_${i + 1}`;
                          const dateMatch = fileName.match(/(\d{4}_\d{2}_\d{2})/);
                          const dateStr = dateMatch 
                            ? dateMatch[1].replace(/_/g, '-')
                            : `Tarih ${i + 1}`;

                          await Sharing.shareAsync(uri, {
                            mimeType: options.format === 'json' ? 'application/json' : 'text/plain',
                            dialogTitle: `${sessionTitle} - ${dateStr}`,
                          });
                          // Kullanıcı bir dosyayı paylaştıktan sonra diğerine geçmesi için kısa bir bekleme
                          if (i < fileUris.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                          }
                        } catch (error) {
                          logger.error('Dosya paylaşım hatası:', error);
                        }
                      }
                    },
                  },
                ]
              );
            }, 1000);
          }
        } catch (error) {
          logger.error('Dosya paylaşım hatası:', error);
          Alert.alert('Hata', 'Dosya paylaşılamadı');
        }
      }

      logger.log(`Session shared: ${fileUris.length} files`);
    } catch (error) {
      logger.error('Session share hatası:', error);
      throw error;
    }
  }

  /**
   * Tüm sohbet geçmişini tarihe göre ayrı dosyalara export et ve paylaş
   */
  static async shareAllChatHistoryByDate(
    sessions: Array<{ id: string; title: string; messages: Message[] }>,
    options: ExportOptions = { format: 'txt', includeTimestamps: true, includeMetadata: true }
  ): Promise<void> {
    try {
      const fileUris = await this.exportAllChatHistoryByDate(sessions, options);

      if (fileUris.length === 0) {
        throw new Error('Export edilecek dosya yok');
      }

      // Sharing kontrolü
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Paylaşım Hatası', 'Bu cihazda paylaşım özelliği kullanılamıyor.');
        return;
      }

      // Her dosyayı sırayla paylaş (en yeni tarihten başla)
      // İlk dosyayı direkt paylaş
      if (fileUris.length > 0) {
        try {
          const firstUri = fileUris[0];
          const fileName = firstUri.split('/').pop() || 'sohbet_gecmisi';
          const dateMatch = fileName.match(/(\d{4}_\d{2}_\d{2})/);
          const dateStr = dateMatch 
            ? dateMatch[1].replace(/_/g, '-')
            : 'Sohbet Geçmişi';

          await Sharing.shareAsync(firstUri, {
            mimeType: options.format === 'json' ? 'application/json' : 'text/plain',
            dialogTitle: `Sohbet Geçmişi - ${dateStr}`,
          });

          // Birden fazla dosya varsa kullanıcıya diğerlerini de paylaşmak isteyip istemediğini sor
          if (fileUris.length > 1) {
            // Kısa bir bekleme sonrası diğer dosyalar için sor
            setTimeout(async () => {
              Alert.alert(
                'Diğer Dosyalar',
                `${fileUris.length - 1} dosya daha var. Diğer tarihleri de paylaşmak ister misiniz?`,
                [
                  { text: 'Hayır', style: 'cancel' },
                  {
                    text: 'Evet',
                    onPress: async () => {
                      // Kalan dosyaları sırayla paylaş
                      for (let i = 1; i < fileUris.length; i++) {
                        try {
                          const uri = fileUris[i];
                          const fileName = uri.split('/').pop() || `dosya_${i + 1}`;
                          const dateMatch = fileName.match(/(\d{4}_\d{2}_\d{2})/);
                          const dateStr = dateMatch 
                            ? dateMatch[1].replace(/_/g, '-')
                            : `Tarih ${i + 1}`;

                          await Sharing.shareAsync(uri, {
                            mimeType: options.format === 'json' ? 'application/json' : 'text/plain',
                            dialogTitle: `Sohbet Geçmişi - ${dateStr}`,
                          });
                          // Kullanıcı bir dosyayı paylaştıktan sonra diğerine geçmesi için kısa bir bekleme
                          if (i < fileUris.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                          }
                        } catch (error) {
                          logger.error('Dosya paylaşım hatası:', error);
                        }
                      }
                    },
                  },
                ]
              );
            }, 1000);
          }
        } catch (error) {
          logger.error('Dosya paylaşım hatası:', error);
          Alert.alert('Hata', 'Dosya paylaşılamadı');
        }
      }

      logger.log(`Chat history shared: ${fileUris.length} files`);
    } catch (error) {
      logger.error('Chat history share hatası:', error);
      throw error;
    }
  }
}
