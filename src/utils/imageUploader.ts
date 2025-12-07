// Profil fotoğrafı yükleme utility
import { getSupabase } from '../config/supabase';
import * as FileSystem from 'expo-file-system';
import { logger } from './logger';

/**
 * Profil fotoğrafını Supabase Storage'a yükler ve public URL döndürür
 * @param imageUri - Local image URI (file:// veya content://)
 * @param userId - Kullanıcı ID'si
 * @returns Public URL string
 */
export async function uploadProfileImage(
  imageUri: string, 
  userId: string,
  mimeTypeHint?: string // ImagePicker'dan gelen type
): Promise<string> {
  try {
    const supabase = getSupabase();
    
    // Dosya bilgilerini al
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      throw new Error('Dosya bulunamadı');
    }
    
    // Dosya boyutu kontrolü (20MB limit - artırıldı)
    const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
    if (fileInfo.size && fileInfo.size > MAX_FILE_SIZE) {
      const fileSizeMB = (fileInfo.size / (1024 * 1024)).toFixed(2);
      throw new Error(`Dosya boyutu çok büyük (${fileSizeMB}MB). Maksimum 20MB olmalıdır.`);
    }
    
    // Dosyayı base64'e çevir
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // MIME type'ı belirle (öncelik: hint, sonra URI'den)
    let mimeType = mimeTypeHint || 'image/jpeg';
    let fileExtension = 'jpg';
    
    if (mimeTypeHint) {
      // ImagePicker'dan gelen type'ı kullan
      if (mimeTypeHint.includes('png')) {
        mimeType = 'image/png';
        fileExtension = 'png';
      } else if (mimeTypeHint.includes('jpeg') || mimeTypeHint.includes('jpg')) {
        mimeType = 'image/jpeg';
        fileExtension = 'jpg';
      } else if (mimeTypeHint.includes('webp')) {
        mimeType = 'image/webp';
        fileExtension = 'webp';
      } else if (mimeTypeHint.includes('heic') || mimeTypeHint.includes('heif')) {
        // HEIC/HEIF formatını JPEG olarak işle
        mimeType = 'image/jpeg';
        fileExtension = 'jpg';
      }
    } else {
      // Fallback: URI'den tespit et
      const uriLower = imageUri.toLowerCase();
      if (uriLower.includes('.png')) {
        mimeType = 'image/png';
        fileExtension = 'png';
      } else if (uriLower.includes('.heic') || uriLower.includes('.heif')) {
        mimeType = 'image/jpeg'; // HEIC'i JPEG olarak işle
        fileExtension = 'jpg';
      } else if (uriLower.includes('.webp')) {
        mimeType = 'image/webp';
        fileExtension = 'webp';
      }
    }
    
    // Dosya adı oluştur (unique - userId/timestamp.extension)
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}.${fileExtension}`;
    
    // Base64'ü ArrayBuffer'a çevir (React Native uyumlu)
    // atob polyfill - React Native'de global olarak mevcut değil
    const base64Decode = (str: string): Uint8Array => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let output = '';
      
      str = str.replace(/[^A-Za-z0-9\+\/\=]/g, '');
      
      for (let i = 0; i < str.length; i += 4) {
        const enc1 = chars.indexOf(str.charAt(i));
        const enc2 = chars.indexOf(str.charAt(i + 1));
        const enc3 = chars.indexOf(str.charAt(i + 2));
        const enc4 = chars.indexOf(str.charAt(i + 3));
        
        const chr1 = (enc1 << 2) | (enc2 >> 4);
        const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
        const chr3 = ((enc3 & 3) << 6) | enc4;
        
        output += String.fromCharCode(chr1);
        
        if (enc3 !== 64) {
          output += String.fromCharCode(chr2);
        }
        if (enc4 !== 64) {
          output += String.fromCharCode(chr3);
        }
      }
      
      const bytes = new Uint8Array(output.length);
      for (let i = 0; i < output.length; i++) {
        bytes[i] = output.charCodeAt(i);
      }
      return bytes;
    };
    
    const bytes = base64Decode(base64);
    
    // Eski avatar'ı sil (varsa) - storage tasarrufu için
    try {
      const { data: listData } = await supabase.storage
        .from('avatars')
        .list(userId);
      
      if (listData && listData.length > 0) {
        // En son 3 dosyayı tut, diğerlerini sil
        const sortedFiles = listData
          .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
          .slice(3);
        
        const filesToDelete = sortedFiles.map(file => `${userId}/${file.name}`);
        if (filesToDelete.length > 0) {
          await supabase.storage
            .from('avatars')
            .remove(filesToDelete);
        }
      }
    } catch (cleanupError) {
      // Cleanup hatası kritik değil, devam et
      logger.log('Eski avatar temizleme hatası (kritik değil):', cleanupError);
    }
    
    // Supabase Storage'a yükle
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(fileName, bytes.buffer, {
        contentType: mimeType,
        upsert: false, // Aynı dosya varsa hata ver
      });
    
    if (error) {
      logger.error('Storage upload hatası:', error);
      throw error;
    }
    
    // Public URL'i al
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    if (!urlData?.publicUrl) {
      throw new Error('Public URL alınamadı');
    }
    
    logger.log('Profil fotoğrafı başarıyla yüklendi:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    logger.error('Profil fotoğrafı yükleme hatası:', error);
    throw error;
  }
}

