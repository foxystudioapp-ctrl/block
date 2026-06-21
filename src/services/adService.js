import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { Sounds } from '../utils/sounds.js';

class AdServiceManager {
  constructor() {
    this.initialized = false;
    this.initPromise = null;
    this.bannerCreated = false;
    this.interstitialLoaded = false;
    this.rewardedLoaded = false;

    // Global Ad tracking
    this.adsWatchedCount = 0;
    this.lastAdWatchTime = 0;
    this.sessionStartTime = Date.now(); // Oturum başlangıcı (periodic kontrol için)

    // Test Ad Units
    this.adUnits = {
      interstitial: Capacitor.getPlatform() === 'ios'
        ? 'ca-app-pub-3940256099942544/4411468910'
        : 'ca-app-pub-3940256099942544/1033173712',
      rewarded: Capacitor.getPlatform() === 'ios'
        ? 'ca-app-pub-3940256099942544/1712485313'
        : 'ca-app-pub-3940256099942544/5224354917',
      banner: Capacitor.getPlatform() === 'ios'
        ? 'ca-app-pub-3940256099942544/2934735716'
        : 'ca-app-pub-3940256099942544/6300978111',
    };
  }

  async initialize() {
    if (!Capacitor.isNativePlatform()) return;
    
    this.initPromise = (async () => {
      try {
        await AdMob.initialize({
          requestTrackingAuthorization: true,
          testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'],
          initializeForTesting: true,
        });
        
        this.initialized = true;

        AdMob.addListener('interstitialAdDismissed', () => {
          this.interstitialLoaded = false;
          this.prepareInterstitial();
        });

        AdMob.addListener('rewardedVideoAdDismissed', () => {
          this.rewardedLoaded = false;
          this.prepareRewardVideoAd();
        });

        this.prepareInterstitial();
        this.prepareRewardVideoAd();
      } catch (e) {
        console.warn('AdMob init error:', e);
      }
    })();
    return this.initPromise;
  }

  async prepareInterstitial() {
    if (!this.initialized) return;
    try {
      await AdMob.prepareInterstitial({
        adId: this.adUnits.interstitial,
        isTesting: true
      });
      this.interstitialLoaded = true;
    } catch (e) {
      console.warn('Interstitial prepare error:', e);
    }
  }

  async showInterstitial() {
    if (!Capacitor.isNativePlatform()) {
      import('../components/toast.js').then(m => m.Toast.show('Reklamlar bu platformda (Web) desteklenmiyor.', 'error'));
      return false; // Fail on web, don't give free rewards
    }
    if (!this.initialized || !this.interstitialLoaded) return false;
    try {
      Sounds.stopMusic();
      await AdMob.showInterstitial();
      // Her gösterilen interstitial reklam cooldown timer'ını günceller.
      // Böylece 2. şans reklamları da dahil tüm reklamlar sayılır.
      this.adsWatchedCount++;
      this.lastAdWatchTime = Date.now();
      return true;
    } catch (e) {
      console.warn('Interstitial show error:', e);
      return false;
    }
  }

  /**
   * Gösterilecek zorunlu reklamlar için cooldown (zaman kısıtlaması) uygular.
   *
   * Kaynaklar (source):
   *   'gameover'  — oyun bittiğinde
   *   'levelup'   — seviye atlandığında (adventure)
   *   'periodic'  — sonsuz modda oyun içi doğal duraklama anında
   *
   * Zamanlama:
   *   1. Reklam (adsWatchedCount=0):
   *      • 'gameover' → hemen göster
   *      • 'periodic' → oturum başlangıcından 10 dk geçmişse göster
   *   2. Reklam (adsWatchedCount=1):
   *      • herhangi kaynak → son reklamdan 10 dk sonra göster
   *   3+ Reklam (adsWatchedCount>=2):
   *      • herhangi kaynak → son reklamdan 15 dk sonra göster
   */
  async showForcedInterstitial(source = 'gameover') {
    const now = Date.now();
    let canShow = false;

    if (this.adsWatchedCount === 0) {
      if (source === 'gameover') {
        canShow = true;
      } else if (source === 'periodic' && now - this.sessionStartTime >= 10 * 60 * 1000) {
        canShow = true;
      }
    } else if (this.adsWatchedCount === 1) {
      if (now - this.lastAdWatchTime >= 10 * 60 * 1000) canShow = true;
    } else {
      if (now - this.lastAdWatchTime >= 15 * 60 * 1000) canShow = true;
    }

    if (canShow) {
      const success = await this.showInterstitial();
      // showInterstitial() zaten adsWatchedCount ve lastAdWatchTime'ı günceller.
      return success;
    }
    return false;
  }

  async prepareRewardVideoAd() {
    if (!this.initialized) return;
    try {
      await AdMob.prepareRewardVideoAd({
        adId: this.adUnits.rewarded,
        isTesting: true
      });
      this.rewardedLoaded = true;
    } catch (e) {
      console.warn('Rewarded prepare error:', e);
    }
  }

  /**
   * Shows a rewarded ad and returns true if the user fully watched it.
   */
  async showRewardVideoAd() {
    if (!Capacitor.isNativePlatform()) {
      import('../components/toast.js').then(m => m.Toast.show('Reklamlar bu platformda (Web) desteklenmiyor.', 'error'));
      return false; // Fail on web, don't give free rewards
    }
    if (!this.initialized || !this.rewardedLoaded) return false;
    
    return new Promise(async (resolve) => {
      let rewarded = false;

      const rewardListener = AdMob.addListener('rewardedVideoAdReward', (rewardItem) => {
        rewarded = true;
      });

      const dismissListener = AdMob.addListener('rewardedVideoAdDismissed', () => {
        rewardListener.remove();
        dismissListener.remove();
        if (rewarded) {
          this.adsWatchedCount++;
          this.lastAdWatchTime = Date.now();
        }
        resolve(rewarded);
      });

      try {
        Sounds.stopMusic();
        await AdMob.showRewardVideoAd();
      } catch (e) {
        console.warn('Rewarded show error:', e);
        rewardListener.remove();
        dismissListener.remove();
        resolve(false);
      }
    });
  }

  async showBanner() {
    if (!Capacitor.isNativePlatform()) return;
    if (this.initPromise) await this.initPromise;
    if (!this.initialized) return;

    try {
      if (this.bannerCreated) {
        await AdMob.resumeBanner();
      } else {
        // Small delay to allow Android WebView layout to settle before calculating native overlay positioning
        await new Promise(r => setTimeout(r, 500));
        
        await AdMob.showBanner({
          adId: this.adUnits.banner,
          adSize: BannerAdSize.ADAPTIVE_BANNER,
          position: BannerAdPosition.BOTTOM_CENTER,
          margin: 0,
          isTesting: true
        });
        this.bannerCreated = true;
      }
    } catch (e) {
      console.warn('Banner show error:', e);
    }
  }

  async hideBanner() {
    if (!Capacitor.isNativePlatform() || !this.bannerCreated) return;
    try {
      await AdMob.hideBanner();
    } catch (e) {
      console.warn('Banner hide error:', e);
    }
  }
}

export const AdService = new AdServiceManager();
