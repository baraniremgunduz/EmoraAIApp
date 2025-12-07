// AdMob Reklam Servisi
import mobileAds, {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const INTERSTITIAL_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-9485934183491164/1044193741'; // Gerçek interstitial ID

const REWARDED_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-9485934183491164/2946741857'; // Gerçek rewarded ID

let interstitial: InterstitialAd | null = null;
let rewarded: RewardedAd | null = null;

export const adService = {
  /** Uygulama açılırken bir defa çağır: mobileAds().initialize() vs. */
  async init() {
    await mobileAds().initialize();

    interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID);
    rewarded = RewardedAd.createForAdRequest(REWARDED_UNIT_ID);

    interstitial?.load();
    rewarded?.load();
  },

  async showInterstitial(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!interstitial) {
        interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID);
        interstitial.load();
      }

      const unsubscribeLoaded = interstitial!.addAdEventsListener((event) => {
        const { type, payload } = event;
        
        if (type === AdEventType.ERROR) {
          console.log('Interstitial error', payload);
          unsubscribeLoaded();
          return reject(payload);
        }

        if (type === AdEventType.LOADED) {
          interstitial!.show();
        }

        if (type === AdEventType.CLOSED) {
          // Tekrar kullanmak için yeniden yükle
          interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID);
          interstitial.load();
          unsubscribeLoaded();
          resolve();
        }
      });

      // Eğer zaten yüklenmişse show'u tetikle
      if (interstitial?.loaded) {
        interstitial.show();
      } else {
        interstitial?.load();
      }
    });
  },

  async showRewarded(onReward?: (reward: { amount: number; type: string }) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!rewarded) {
        rewarded = RewardedAd.createForAdRequest(REWARDED_UNIT_ID);
        rewarded.load();
      }

      const unsubscribeRewarded = rewarded!.addAdEventsListener((event) => {
        const { type, payload } = event;
        
        if (type === RewardedAdEventType.ERROR) {
          console.log('Rewarded error', payload);
          unsubscribeRewarded();
          return reject(payload);
        }

        if (type === RewardedAdEventType.LOADED) {
          rewarded!.show();
        }

        if (type === RewardedAdEventType.EARNED_REWARD && payload && onReward) {
          const reward = payload as { amount: number; type: string };
          onReward(reward);
        }

        if (type === RewardedAdEventType.CLOSED) {
          rewarded = RewardedAd.createForAdRequest(REWARDED_UNIT_ID);
          rewarded.load();
          unsubscribeRewarded();
          resolve();
        }
      });

      if (rewarded?.loaded) {
        rewarded.show();
      } else {
        rewarded?.load();
      }
    });
  },
};
