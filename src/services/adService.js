import { AdMob, BannerAdSize, BannerAdPosition, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';
import { Sounds } from '../utils/sounds.js';
import { Toast } from '../components/toast.js';
import { PlayerState } from '../state/playerState.js';
import { t } from '../utils/i18n.js';
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

    // Real Ad Units
    this.adUnits = {
      interstitial: Capacitor.getPlatform() === 'ios'
        ? 'ca-app-pub-5193796000660760/9873483562'
        : 'ca-app-pub-5193796000660760/6062231066',
      rewarded: Capacitor.getPlatform() === 'ios'
        ? 'ca-app-pub-5193796000660760/7247320229'
        : 'ca-app-pub-5193796000660760/2757410876',
      banner: Capacitor.getPlatform() === 'ios'
        ? 'ca-app-pub-5193796000660760/7916414389'
        : 'ca-app-pub-5193796000660760/4360312750',
    };
  }

  async initialize() {
    if (!Capacitor.isNativePlatform()) return;
    
    this.initPromise = (async () => {
      try {
        // App Tracking Transparency (iOS 14+): İZİN İSTEĞİNİ AÇIKÇA ve reklam/izleme
        // verisi TOPLANMADAN ÖNCE göster (Apple Guideline 2.1). Daha önce yalnızca
        // AdMob.initialize({requestTrackingAuthorization:true})'a bırakılmıştı; bu bazı
        // iPadOS sürümlerinde diyaloğun güvenilir çıkmamasına yol açıyordu. Artık ATT'yi
        // biz tetikliyor ve yanıtı bekliyoruz, ardından AdMob'u başlatıyoruz.
        try {
          const { status } = await AdMob.trackingAuthorizationStatus();
          if (status === 'notDetermined') {
            await AdMob.requestTrackingAuthorization();
          }
        } catch (attErr) {
          // ATT yalnızca iOS'ta anlamlıdır; Android/web'de sessizce geçilir.
          console.warn('ATT request warn:', attErr);
        }

        await AdMob.initialize({
          requestTrackingAuthorization: true,
          // testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'], // Production
          // initializeForTesting: true, // Production
        });

        this.initialized = true;

        AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
          this.interstitialLoaded = false;
          this.prepareInterstitial();
        });

        AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
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
        adId: this.adUnits.interstitial
      });
      this.interstitialLoaded = true;
    } catch (e) {
      console.warn('Interstitial prepare error:', e);
    }
  }

  async showInterstitial() {
    if (!Capacitor.isNativePlatform()) {
      Toast.show(t('ads_not_supported_web'), 'error');
      return false; // Fail on web, don't give free rewards
    }
    if (!this.initialized || !this.interstitialLoaded) return false;
    if (PlayerState.state.isVip) return false; // VIPs don't see interstitials
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
   *   1. Reklam (henüz hiç reklam gösterilmemiş):
   *      • herhangi kaynak (gameover / levelup / periodic) → oturum başından 10 dk sonra
   *      • periodic DAHİL → Jewel/Patlatmaca gibi "neredeyse hiç bitmeyen" endless modlarda
   *        (gameover/levelup olmasa bile) reklam yine de çıkar.
   *   2. ve sonraki reklamlar:
   *      • herhangi kaynak → son reklamdan 15 dk sonra göster
   *
   * NOT: 2. şans (revive) ve oyun-içi özellikler için izlenen ÖDÜLLÜ/tam-ekran reklamlar da
   * sayılır (showInterstitial + showRewardVideoAd, adsWatchedCount++ ve lastAdWatchTime'ı
   * günceller) → bir sonraki zorunlu reklamın 15 dk'lık sayacını ileri atar.
   */
  async showForcedInterstitial(source = 'gameover') {
    const now = Date.now();
    let canShow = false;

    if (this.adsWatchedCount === 0) {
      // 1. reklam: oturum başından 10 dk geçtiyse HERHANGİ tetikleyici gösterir (periodic
      // dahil) → hiç bitmeyen endless modlarda (Jewel) da reklam çıkar.
      if (now - this.sessionStartTime >= 10 * 60 * 1000) canShow = true;
    } else {
      // 2. ve sonrası: herhangi kaynak, son reklamdan 15 dk sonra.
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
        adId: this.adUnits.rewarded
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
      Toast.show(t('ads_not_supported_web'), 'error');
      return false; // Fail on web, don't give free rewards
    }
    if (!this.initialized || !this.rewardedLoaded) return false;
    // Çift-tık / eşzamanlı çağrı koruması: aynı anda yalnızca BİR ödüllü reklam akışı.
    // Bu merkezi kilit, tüm oyun ekranlarındaki revive/booster butonlarını çift ödüle
    // karşı korur — her butona ayrı disabled eklemeye gerek kalmaz.
    // Backstop: kilit bir şekilde takılı kalırsa (beklenmedik istisna) 130 sn sonra
    // serbest bırak; ödüllü reklam kalıcı olarak bloke olmasın.
    if (this._rewardInFlight && (Date.now() - (this._rewardInFlightAt || 0) < 130000)) return false;
    this._rewardInFlight = true;
    this._rewardInFlightAt = Date.now();

    return new Promise(async (resolve) => {
      let rewarded = false;
      let settled = false;
      let safetyTimer = null;

      const rewardListener = AdMob.addListener(RewardAdPluginEvents.Rewarded, (rewardItem) => {
        rewarded = true;
      });

      // Tüm listener'ları tek noktadan sök; çift resolve'u engelle. Aksi halde dismissed
      // event'i hiç gelmezse (OS reklamı kapatır / app arka plana atılır) listener'lar birikir
      // ve await eden çağıran sonsuza dek askıda kalır.
      const finish = (result) => {
        if (settled) return;
        settled = true;
        this._rewardInFlight = false;
        // Sayaç artışı TEK noktada: ödül gerçekten alındıysa. `settled` guard'ı çift-sayımı
        // imkânsız kılar (eskiden hem dismissListener hem safetyTimer artırıyordu).
        if (result === true) { this.adsWatchedCount++; this.lastAdWatchTime = Date.now(); }
        if (safetyTimer) clearTimeout(safetyTimer);
        rewardListener.remove();
        dismissListener.remove();
        failListener.remove();
        resolve(result);
      };

      const dismissListener = AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        finish(rewarded); // sayaç artışı finish() içinde (tek nokta)
      });

      const failListener = AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
        // Gösterim başarısız olursa rewardedLoaded false'ta kalır; yalnız Dismissed
        // re-prepare ettiğinden bir sonraki sefere kadar "hazır değil" kalırdı.
        // Burada da yeniden hazırla ki kullanıcı tekrar deneyince reklam hazır olsun.
        this.rewardedLoaded = false;
        this.prepareRewardVideoAd();
        finish(false);
      });

      try {
        Sounds.stopMusic();
        await AdMob.showRewardVideoAd();
        // Güvenlik ağı: Dismissed/FailedToShow hiç gelmezse (OS reklamı sessizce kapatır)
        // Promise sonsuza kadar asılı kalmasın. 120s her ödüllü reklamdan uzun olduğundan
        // meşru izlemeyi kesmez; ödül geldiyse yine de verilir.
        safetyTimer = setTimeout(() => {
          finish(rewarded); // sayaç artışı finish() içinde (tek nokta)
        }, 120000);
      } catch (e) {
        console.warn('Rewarded show error:', e);
        finish(false);
      }
    });
  }

  async showBanner() {
    if (!Capacitor.isNativePlatform()) return;
    if (this.initPromise) await this.initPromise;
    if (!this.initialized) return;
    if (PlayerState.state.isVip) return; // VIPs don't see banners

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
          margin: 0
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
