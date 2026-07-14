import { AdMob, BannerAdSize, BannerAdPosition, BannerAdPluginEvents, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
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
    // Banner'ın o an EKRANDA İSTENİP istenmediği. showBanner() true yapar, hideBanner()
    // false. Banner oluşturma async (init + 500ms bekleme) olduğundan, bu bayrak sayesinde
    // bekleme sırasında ekrandan çıkılırsa banner yanlış ekranda (ör. menüde) açılmaz.
    this.bannerWanted = false;
    this.interstitialLoaded = false;
    this.rewardedLoaded = false;

    // Global Ad tracking
    this.adsWatchedCount = 0;
    this.lastAdWatchTime = 0;
    this.sessionStartTime = Date.now(); // Oturum başlangıcı (periodic kontrol için)

    // Zorunlu (tam ekran) reklam zamanlaması — TEK MERKEZ. A/B testi için buradan ayarla.
    // Mantık tamamen ZAMANA bağlı (level sayısına DEĞİL) → tüm modlarda çalışır:
    //  - Seviyeli modlar levelup molasında, ölümlü sonsuz modlar gameover'da, hiç bitmeyen
    //    sonsuz modlar (Jewel/Color Sort) her oturmuş hamlede 'periodic' ile tetikler.
    this.AD_CONFIG = {
      firstDelaySec: 300,  // İlk reklam: oturum başından 5 dk sonraki ilk mola
      intervalSec: 480,    // Sonraki reklamlar: son reklamdan 8 dk sonra
    };

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

        // Banner YÜKLEME onayı buradan gelir. bannerCreated'ı ARTIK optimistik olarak
        // showBanner() içinde DEĞİL, gerçekten reklam yüklendiğinde true yapıyoruz.
        // Native taraf banner subview'ini yalnızca yükleme başarılıysa hiyerarşiye ekler;
        // dolayısıyla resumeBanner() sadece daha önce başarılı yüklenmiş bir banner için
        // çalışır. Eskiden bannerCreated ilk showBanner çağrısında true'ya sabitleniyordu →
        // ilk yükleme başarısız olursa (iOS no-fill / layout zamanlaması) tüm oturum boyunca
        // sonraki her ekran yalnızca (başarısız) resumeBanner çağırıyor, bir daha hiç
        // showBanner denemiyordu. Sonuç: iOS'ta tüm modlarda banner kalıcı olarak ölüyordu.
        AdMob.addListener(BannerAdPluginEvents.Loaded, () => {
          this.bannerCreated = true;
          // Yükleme tamamlandığında kullanıcı çoktan ekrandan çıkmışsa (bannerWanted=false)
          // banner yanlış ekranda (menü vb.) görünmesin diye hemen gizle.
          if (!this.bannerWanted) { AdMob.hideBanner().catch(() => {}); }
        });

        // Yükleme başarısız olursa bayrağı SIFIRLA ki bir sonraki ekran taze bir showBanner
        // denesin — tek bir no-fill artık tüm oturumu banner'sız bırakmaz. Ayrıca gerçek
        // AdMob hata kodunu logla (no-fill=3, invalid-request=1 vb.) → panel mi kod mu ayrımı.
        AdMob.addListener(BannerAdPluginEvents.FailedToLoad, (info) => {
          this.bannerCreated = false;
          console.warn('Banner failed to load:', info);
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
   * Zamanlama (AD_CONFIG'den; TEK MERKEZ):
   *   1. Reklam (henüz hiç reklam gösterilmemiş):
   *      • herhangi kaynak (gameover / levelup / periodic) → oturum başından firstDelaySec sonra.
   *      • periodic DAHİL → Jewel/Color Sort gibi "neredeyse hiç bitmeyen" endless modlarda
   *        (gameover/levelup olmasa bile) reklam yine de çıkar; her oturmuş hamlede tetiklenir.
   *   2. ve sonraki reklamlar:
   *      • herhangi kaynak → son reklamdan intervalSec sonra göster.
   *
   * NOT: 2. şans (revive) ve oyun-içi özellikler için izlenen ÖDÜLLÜ/tam-ekran reklamlar da
   * sayılır (showInterstitial + showRewardVideoAd, adsWatchedCount++ ve lastAdWatchTime'ı
   * günceller) → bir sonraki zorunlu reklamın sayacını ileri atar (üst üste vurmayı önler).
   */
  async showForcedInterstitial(source = 'gameover') {
    const now = Date.now();
    let canShow = false;

    if (this.adsWatchedCount === 0) {
      // 1. reklam: oturum başından firstDelaySec geçtiyse HERHANGİ tetikleyici gösterir
      // (periodic dahil) → hiç bitmeyen endless modlarda (Jewel/Color Sort) da reklam çıkar.
      if (now - this.sessionStartTime >= this.AD_CONFIG.firstDelaySec * 1000) canShow = true;
    } else {
      // 2. ve sonrası: herhangi kaynak, son reklamdan intervalSec sonra.
      if (now - this.lastAdWatchTime >= this.AD_CONFIG.intervalSec * 1000) canShow = true;
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
    // Bu ekran banner istiyor. Aşağıdaki await'ler (init + 500ms) sürerken kullanıcı
    // ekrandan çıkarsa hideBanner() bu bayrağı false yapar ve banner açılmaz.
    this.bannerWanted = true;
    if (this.initPromise) await this.initPromise;
    if (!this.initialized) return;
    if (PlayerState.state.isVip) return; // VIPs don't see banners
    if (!this.bannerWanted) return; // init beklenirken ekrandan çıkıldı → açma

    try {
      if (this.bannerCreated) {
        // Banner daha önce başarıyla yüklenmiş ve native hiyerarşide gizli duruyor →
        // sadece görünür yap. Beklenmedik şekilde subview yoksa (ör. OS belleği temizledi)
        // resumeBanner reject eder; o zaman bayrağı sıfırlayıp taze bir banner oluştururuz,
        // böylece banner kalıcı ölmez.
        try {
          await AdMob.resumeBanner();
          if (!this.bannerWanted) { try { await AdMob.hideBanner(); } catch (e) { /* yoksay */ } }
        } catch (e) {
          console.warn('Banner resume failed, recreating:', e);
          this.bannerCreated = false;
          await this._createBanner();
        }
      } else {
        await this._createBanner();
      }
    } catch (e) {
      console.warn('Banner show error:', e);
    }
  }

  // Sıfırdan banner oluşturur. bannerCreated'ı BURADA true YAPMAYIZ — gerçek yükleme
  // onayını BannerAdPluginEvents.Loaded listener'ı verir (initialize'da). Böylece ilk
  // yükleme başarısız olursa bannerCreated false kalır ve bir sonraki ekran yeniden dener.
  async _createBanner() {
    // Small delay to allow WebView layout to settle before calculating native overlay positioning
    await new Promise(r => setTimeout(r, 500));
    // 500ms dolmadan kullanıcı ekrandan çıktıysa banner'ı OLUŞTURMA. Aksi halde menüde/
    // başka ekranda alt banner takılı kalır. Bu kontrol o yarış durumunu kapatır.
    if (!this.bannerWanted) return;
    await AdMob.showBanner({
      adId: this.adUnits.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0
    });
  }

  async hideBanner() {
    // Önce niyeti kaydet: banner henüz oluşturulmamış olsa bile (init/500ms beklemede),
    // askıdaki showBanner bu bayrağı görüp açmaktan vazgeçer.
    this.bannerWanted = false;
    if (!Capacitor.isNativePlatform() || !this.bannerCreated) return;
    try {
      await AdMob.hideBanner();
    } catch (e) {
      console.warn('Banner hide error:', e);
    }
  }
}

export const AdService = new AdServiceManager();
