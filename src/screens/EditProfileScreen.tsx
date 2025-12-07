import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { darkTheme } from '../utils/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { AuthService } from '../services/authService';
import { logger } from '../utils/logger';
import { uploadProfileImage } from '../utils/imageUploader';

import { RootStackParamList, User } from '../types';
import { StackScreenProps } from '@react-navigation/stack';

type EditProfileScreenProps = StackScreenProps<RootStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation, route }: EditProfileScreenProps) {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    loadUserData();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('messages.permission_required'), t('edit_profile.permission_required'));
    }
  };

  const loadUserData = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      setUser(currentUser);

      if (currentUser) {
        setFormData({
          name: currentUser.user_metadata?.name || '',
          email: currentUser.email || '',
        });
        // Sadece public URL ise göster (http/https ile başlıyorsa)
        const avatarUrl = currentUser.user_metadata?.avatar_url;
        if (avatarUrl && (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://'))) {
          setProfileImage(avatarUrl);
        } else {
          setProfileImage(null);
        }
      }
    } catch (error) {
      logger.error('Kullanıcı verisi yükleme hatası:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert(t('messages.error'), t('edit_profile.name_required'));
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert(t('messages.error'), t('edit_profile.email_required'));
      return;
    }

    if (!user?.id) {
      Alert.alert(t('messages.error'), 'Kullanıcı bilgisi bulunamadı');
      return;
    }

    setIsLoading(true);
    try {
      // Kullanıcı bilgilerini güncelle
      const updateData: any = {
        name: formData.name.trim(),
      };

      // Eğer yeni fotoğraf seçildiyse (local URI ise) Supabase Storage'a yükle
      if (profileImage && profileImage !== user?.user_metadata?.avatar_url) {
        // Eğer local URI ise (file:// veya content:// ile başlıyorsa) yükle
        if (profileImage.startsWith('file://') || profileImage.startsWith('content://')) {
          try {
            const publicUrl = await uploadProfileImage(profileImage, user.id);
            updateData.avatar_url = publicUrl;
          } catch (uploadError: any) {
            logger.error('Profil fotoğrafı yükleme hatası:', uploadError);
            Alert.alert(
              t('messages.error'),
              uploadError.message || 'Profil fotoğrafı yüklenirken bir hata oluştu'
            );
            setIsLoading(false);
            return;
          }
        } else {
          // Zaten public URL ise direkt kullan
          updateData.avatar_url = profileImage;
        }
      }

      const { error } = await AuthService.updateUser({
        data: updateData,
        email: formData.email.trim(),
      });

      if (error) {
        throw error;
      }

      Alert.alert(t('messages.success'), t('edit_profile.success'), [
        {
          text: t('messages.ok'),
          onPress: () => {
            // Profil ekranına geri dön - focus listener otomatik yenileyecek
            navigation.goBack();
          },
        },
      ]);
    } catch (error: any) {
      logger.error('Profil güncelleme hatası:', error);
      Alert.alert(t('messages.error'), error.message || t('edit_profile.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9, // Kaliteyi artırdık (daha yüksek kalite)
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0];
        
        // Dosya boyutu kontrolü
        const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
        if (selectedImage.fileSize && selectedImage.fileSize > MAX_FILE_SIZE) {
          const fileSizeMB = (selectedImage.fileSize / (1024 * 1024)).toFixed(2);
          Alert.alert(
            t('messages.error'),
            `Fotoğraf çok büyük (${fileSizeMB}MB). Lütfen daha küçük bir fotoğraf seçin (maksimum 20MB).`
          );
          return;
        }
        
        // Local URI'yi göster (henüz yüklenmedi)
        setProfileImage(selectedImage.uri);
      }
    } catch (error) {
      logger.error('Fotoğraf seçme hatası:', error);
      Alert.alert(t('messages.error'), t('edit_profile.photo_error'));
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('messages.permission_required'), t('edit_profile.camera_permission'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9, // Kaliteyi artırdık (daha yüksek kalite)
      });

      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0];
        
        // Dosya boyutu kontrolü
        const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
        if (selectedImage.fileSize && selectedImage.fileSize > MAX_FILE_SIZE) {
          const fileSizeMB = (selectedImage.fileSize / (1024 * 1024)).toFixed(2);
          Alert.alert(
            t('messages.error'),
            `Fotoğraf çok büyük (${fileSizeMB}MB). Lütfen daha küçük bir fotoğraf çekin (maksimum 20MB).`
          );
          return;
        }
        
        // Local URI'yi göster (henüz yüklenmedi)
        setProfileImage(selectedImage.uri);
      }
    } catch (error) {
      logger.error('Fotoğraf çekme hatası:', error);
      // Simülatörde kamera yoksa sadece galeri seçeneğini göster
      Alert.alert(t('messages.camera_unavailable'), t('edit_profile.camera_unavailable'), [
        { text: t('messages.ok'), style: 'default' },
        { text: t('edit_profile.change_photo'), onPress: pickImage },
      ]);
    }
  };

  const showImagePicker = () => {
    // Simülatörde sadece galeri seçeneğini göster
    const isSimulator = __DEV__ && Platform.OS === 'ios';

    if (isSimulator) {
      Alert.alert(t('edit_profile.photo_title'), t('edit_profile.simulator_note'), [
        { text: t('edit_profile.cancel'), style: 'cancel' },
        { text: t('edit_profile.change_photo'), onPress: pickImage },
      ]);
    } else {
      Alert.alert(t('edit_profile.photo_title'), t('edit_profile.choose_option'), [
        { text: t('edit_profile.cancel'), style: 'cancel' },
        { text: t('edit_profile.change_photo'), onPress: pickImage },
        { text: t('edit_profile.take_photo'), onPress: takePhoto },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Ionicons name="arrow-back" size={24} color={darkTheme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('edit_profile.title')}</Text>
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isLoading ? t('auth.loading') : t('edit_profile.save')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={showImagePicker}>
            <View style={styles.avatarBackground}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>
                  {formData.name
                    ? formData.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .toUpperCase()
                    : 'ID'}
                </Text>
              )}
            </View>
            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={16} color={darkTheme.colors.primary} />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>{t('edit_profile.photo_hint')}</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('edit_profile.name')}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={formData.name}
                onChangeText={text => setFormData({ ...formData, name: text })}
                placeholder={t('edit_profile.name_placeholder')}
                placeholderTextColor={darkTheme.colors.textSecondary}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('edit_profile.email')}</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={formData.email}
                onChangeText={text => setFormData({ ...formData, email: text })}
                placeholder={t('edit_profile.email_placeholder')}
                placeholderTextColor={darkTheme.colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color={darkTheme.colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>{t('edit_profile.info_title')}</Text>
              <Text style={styles.infoText}>{t('edit_profile.info_text')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.colors.text,
  },
  saveButton: {
    backgroundColor: darkTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: darkTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: darkTheme.colors.surface,
    ...darkTheme.shadows.medium,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    letterSpacing: 1,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: darkTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: darkTheme.colors.background,
    ...darkTheme.shadows.small,
  },
  avatarHint: {
    fontSize: 14,
    color: darkTheme.colors.textSecondary,
    textAlign: 'center',
  },
  formSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textInput: {
    fontSize: 16,
    color: darkTheme.colors.text,
    padding: 0,
  },
  infoSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: darkTheme.colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: darkTheme.colors.border,
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: darkTheme.colors.text,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: darkTheme.colors.textSecondary,
    lineHeight: 18,
  },
});
