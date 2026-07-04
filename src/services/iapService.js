import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { PlayerState } from '../state/playerState.js';
import { Toast } from '../components/toast.js';
import { AdService } from './adService.js';
import { t } from '../utils/i18n.js';

class IAPService {
  constructor() {
    this.isInitialized = false;
    this.packages = [];
  }

  async initialize() {
    if (!Capacitor.isNativePlatform()) {
      console.log('IAP is only supported on native devices (Android/iOS)');
      return;
    }

    try {
      // Replace these with your actual Public SDK keys from RevenueCat Dashboard
      const apiKey = Capacitor.getPlatform() === 'ios'
        ? 'appl_aZmBVFufyZpOMDvlXNahixAVfei'
        : 'goog_udOqujJcAXCvFSPdDLIjcCnovXg';

      await Purchases.configure({ apiKey });
      this.isInitialized = true;
      console.log('RevenueCat initialized successfully!');

      // Abonelik durumu uygulama AÇIKKEN değişirse (yenileme/satın alma/iptal/expire)
      // anında yakala. Aksi halde VIP aylık maaşı ve VIP düşmesi yalnızca bir sonraki
      // soğuk başlatmada işlenirdi (checkSubscriptions sadece initialize'da çağrılıyordu).
      try {
        await Purchases.addCustomerInfoUpdateListener((customerInfo) => {
          this.checkSubscriptions(customerInfo);
        });
      } catch (e) {
        console.warn('addCustomerInfoUpdateListener warn:', e);
      }

      // Fetch the offerings
      await this.fetchOfferings();

      // Check active subscriptions (VIP)
      const { customerInfo } = await Purchases.getCustomerInfo();
      await this.checkSubscriptions(customerInfo);
    } catch (e) {
      console.error('Error initializing RevenueCat:', e);
    }
  }

  async fetchOfferings() {
    if (!this.isInitialized) return [];

    try {
      const offerings = await Purchases.getOfferings();
      // iOS için ayrı offering kullan, yoksa current'a düş
      const platform = Capacitor.getPlatform();
      const offering = platform === 'ios'
        ? (offerings.all['ios'] || offerings.current)
        : offerings.current;
      if (offering !== null && offering.availablePackages.length !== 0) {
        this.packages = offering.availablePackages;
        return this.packages;
      }
    } catch (e) {
      console.error('Error fetching offerings:', e);
    }
    return [];
  }

  async checkSubscriptions(customerInfo) {
    if (!customerInfo) return;

    // Check if user has the 'vip' entitlement active
    const isVip = typeof customerInfo.entitlements.active['vip'] !== 'undefined';
    
    if (isVip) {
      const wasVip = PlayerState.state.isVip;
      PlayerState.state.isVip = true;
      PlayerState.save();

      // VIP yeni aktifleştiyse (örn. oyun ekranındayken satın alındı) aktif banner'ı gizle.
      if (!wasVip) {
        try { AdService.hideBanner(); } catch (e) { /* yoksay */ }
      }

      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      
      // If never received or 30 days have passed
      if (!PlayerState.state.lastVipRewardTime || (now - PlayerState.state.lastVipRewardTime >= thirtyDaysMs)) {
        PlayerState.addDiamonds(5000);
        PlayerState.state.lastVipRewardTime = now;
        PlayerState.save();
        Toast.show(t('vip_monthly_salary'), 'success');
      }
    } else if (PlayerState.state.isVip) {
      // Subscription expired or cancelled
      PlayerState.state.isVip = false;
      PlayerState.save();
    }
  }

  // Satın alma sonrası ekonomiyi (elmas/VIP) buluta anında yazdırır. Fire-and-forget;
  // hata olsa bile satın alma akışını bloklamaz. Dinamik import → döngüsel bağımlılık yok.
  _pushEconomyToCloud() {
    import('./firebaseSetup.js')
      .then(({ syncToCloud }) => syncToCloud())
      .catch(e => console.warn('post-purchase sync warn:', e));
  }

  // Kullanıcının daha önce satın aldığı (ödüllü olmayan) ürünleri geri yükler.
  // Apple Guideline 3.1.1 gereği ayrı bir "Satın Alımları Geri Yükle" düğmesi zorunludur.
  // Tüketilebilir elmaslar geri yüklenemez; asıl işlevi VIP aboneliğinin (entitlement)
  // yeni cihaz/yeniden kurulumda geri kazanılmasıdır.
  async restorePurchases() {
    if (!Capacitor.isNativePlatform()) {
      Toast.show(t('restore_device_only'), 'error');
      return false;
    }
    if (!this.isInitialized) {
      // Init deferred olduğundan kullanıcı erken basmış olabilir — bir kez daha dene.
      await this.initialize();
      if (!this.isInitialized) {
        Toast.show(t('toast_store_unavailable'), 'error');
        return false;
      }
    }

    try {
      const { customerInfo } = await Purchases.restorePurchases();
      await this.checkSubscriptions(customerInfo);
      if (PlayerState.state.isVip) {
        Toast.show(t('restore_success_vip'), 'success');
        this._pushEconomyToCloud();
      } else {
        Toast.show(t('restore_none_found'), 'info');
      }
      return true;
    } catch (e) {
      console.error('Restore error:', e);
      Toast.show(t('restore_failed'), 'error');
      return false;
    }
  }

  async purchasePackage(pkg) {
    if (!this.isInitialized) {
      // Init tembel (idle) yapıldığından kullanıcı ilk saniyelerde basmış olabilir.
      // Hemen "kullanılamıyor" demek yerine bir kez daha initialize dene.
      await this.initialize();
      if (!this.isInitialized) {
        Toast.show(t('iap_unavailable'), 'error');
        return false;
      }
    }

    // Paket gelmemişse (offerings iOS'ta geç yüklenebilir) satın almadan önce tazele.
    if (!pkg) {
      await this.fetchOfferings();
      Toast.show(t('toast_store_loading'), 'error');
      return false;
    }

    try {
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      
      // Determine how many diamonds to give based on the product identifier.
      // Substring eşleştirme ('500' içinde '5000' yakalanır) yanlış miktar verebildiğinden
      // ID içindeki sayı GRUPLARI çıkarılıp tam tier eşleşmesi aranır (örn. 'diamonds_5000' -> 5000,
      // 'diamonds_50000' -> bilinen tier değil -> 0).
      const productId = pkg.product.identifier;
      const DIAMOND_TIERS = { '500': 500, '1000': 1000, '2000': 2000, '5000': 5000, '10000': 10000 };
      let diamondsToAdd = 0;
      for (const numStr of (productId.match(/\d+/g) || [])) {
        if (DIAMOND_TIERS[numStr]) { diamondsToAdd = DIAMOND_TIERS[numStr]; break; }
      }

      if (diamondsToAdd > 0) {
        PlayerState.addDiamonds(diamondsToAdd);
        Toast.show(t('diamonds_added', { count: diamondsToAdd }), 'success');
        // Satın alınan elması ANINDA buluta yazdır (günlük sync'i bekleme) — aksi halde
        // aynı gün yeniden kurulumda satın alınan elmas kaybolabilir.
        this._pushEconomyToCloud();
        return true;
      }

      // If it's the VIP package, checkSubscriptions will handle the first 5000 diamond reward
      if (productId.includes('vip')) {
        await this.checkSubscriptions(customerInfo);
        this._pushEconomyToCloud();
        return true;
      }
    } catch (e) {
      // Kullanıcı iptali sessizce geçilir; diğer hatalarda RevenueCat'in verdiği
      // okunaklı mesajı göster (yalnızca genel "başarısız oldu" demek yerine).
      if (!e.userCancelled) {
        console.error('Purchase error:', e);
        const reason = e?.underlyingErrorMessage || e?.message || '';
        Toast.show(reason ? t('purchase_failed_reason', { reason }) : t('purchase_failed'), 'error');
      }
    }
    return false;
  }
}

export const IAP = new IAPService();
