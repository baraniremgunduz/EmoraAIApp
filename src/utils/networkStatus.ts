// Network status utility - Minimal offline mode kontrolü
import NetInfo from '@react-native-community/netinfo';
import { logger } from './logger';

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

// Network durumunu kontrol et
export const checkNetworkStatus = async (): Promise<NetworkState> => {
  try {
    const state = await NetInfo.fetch();
    return {
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    };
  } catch (error) {
    logger.error('Network durumu kontrol hatası:', error);
    // Hata durumunda varsayılan olarak bağlı kabul et
    return {
      isConnected: true,
      isInternetReachable: true,
      type: 'unknown',
    };
  }
};

// Network durumunu dinle (real-time)
export const subscribeToNetworkStatus = (callback: (state: NetworkState) => void): (() => void) => {
  const unsubscribe = NetInfo.addEventListener(state => {
    callback({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    });
  });

  return unsubscribe;
};

// Basit kontrol - sadece bağlı mı değil mi?
export const isOnline = async (): Promise<boolean> => {
  const status = await checkNetworkStatus();
  return status.isConnected && (status.isInternetReachable ?? true);
};
