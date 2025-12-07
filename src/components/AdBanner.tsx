// Banner Reklam Bileşeni
import React from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';

type AdBannerProps = {
  style?: StyleProp<ViewStyle>;
  isPremium?: boolean;
};

const BANNER_UNIT_ID = __DEV__
  ? TestIds.BANNER
  : 'ca-app-pub-9485934183491164/8753602301'; // Gerçek banner ID

export const AdBanner: React.FC<AdBannerProps> = ({ style, isPremium }) => {
  if (isPremium) return null;

  return (
    <View style={[{ alignItems: 'center' }, style]}>
      <BannerAd
        unitId={BANNER_UNIT_ID}
        size={BannerAdSize.ADAPTIVE_BANNER}
        onAdFailedToLoad={(err) => {
          console.log('Banner failed: ', err);
          // Hata fırlatma yok, sadece log → ekranda error mesajı olmayacak
        }}
      />
    </View>
  );
};
