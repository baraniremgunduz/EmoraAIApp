// Chat Exporter - Sohbet dışa aktarma utility
import { Message } from '../types';
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
            appVersion: '1.0.4',
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
}
