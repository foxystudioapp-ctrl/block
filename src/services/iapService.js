import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { PlayerState } from '../state/playerState.js';
import { Toast } from '../components/toast.js';
import { AdService } from './adService.js';
import { t } from '../utils/i18n.js';
import { Storage } from '../utils/storage.js';

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
          // Uygulama açıkken RevenueCat yeni bir tüketilebilir işlem doğrularsa
          // (örn. kesinti sonrası geç gelen satın alma) burada anında kurtarılır.
          this.reconcileConsumables(customerInfo);
        });
      } catch (e) {
        console.warn('addCustomerInfoUpdateListener warn:', e);
      }

      // Fetch the offerings
      await this.fetchOfferings();

      // Check active subscriptions (VIP)
      const { customerInfo } = await Purchases.getCustomerInfo();
      await this.checkSubscriptions(customerInfo);
      // Açılış kurtarması: "para çekildi ama elmas verilmedi" durumundaki doğrulanmış
      // satın almaları teslim et. İlk çalıştırmada geçmiş işlemleri "verildi" olarak
      // tohumlar (güncelleme sonrası çift ödül önlenir).
      this.reconcileConsumables(customerInfo);
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

  // Satın alma butonuna BASILDIĞINDA çağrılır. Init ertelenmiş (idle callback + ağ) olduğundan
  // ekran açılır açılmaz basan kullanıcıda `packages` henüz boş olabilir — bu, App Review'da
  // "store unavailable" hatasının başlıca sebebiydi. Burada gerekiyorsa SDK başlatılır, paket
  // bulunamazsa offerings bir kez tazelenir ve eşleşen paket döndürülür. Yalnızca gerçekten
  // ulaşılamıyorsa null döner → "store unavailable" ancak o zaman, boşuna erken değil, gösterilir.
  async ensurePackage(matchFn) {
    if (!Capacitor.isNativePlatform()) return null;
    if (!this.isInitialized) await this.initialize();
    if (!this.isInitialized) return null;
    let pkg = this.packages.find(matchFn);
    if (!pkg) {
      await this.fetchOfferings();
      pkg = this.packages.find(matchFn);
    }
    return pkg || null;
  }

  async checkSubscriptions(customerInfo) {
    if (!customerInfo) return;

    // 'vip' entitlement'ı aktif mi? Panelde entitlement adı 'vip' değilse bile
    // (yanlış adlandırma çok yaygın bir VIP teslim hatasıdır) aktif bir aboneliğin
    // ürün id'si 'vip' içeriyorsa VIP kabul et — entitlement-adı uyuşmazlığında da çalışır.
    const active = (customerInfo.entitlements && customerInfo.entitlements.active) || {};
    let isVip = typeof active['vip'] !== 'undefined';
    if (!isVip) {
      isVip = Object.values(active).some(e => String((e && e.productIdentifier) || '').includes('vip'));
    }

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

  // ---- Tüketilebilir (elmas) idempotent teslim yardımcıları ----

  // Elması VERİLMİŞ satın alma işlemlerinin id kümesi (localStorage'da kalıcı).
  // Amaç: (1) aynı işlem iki kez elmas vermesin, (2) teslim edilmemiş işlem sonraki
  // açılışta kurtarılabilsin. Reinstall'da RC anonim id'si + localStorage birlikte
  // sıfırlandığı için tutarlı kalır (tüketilmiş ürün zaten geri gelmez).
  _getGrantedTxIds() {
    try {
      const arr = Storage.get('granted_iap_tx', []);
      return new Set(Array.isArray(arr) ? arr : []);
    } catch (e) {
      return new Set();
    }
  }

  _saveGrantedTxIds(set) {
    try { Storage.set('granted_iap_tx', [...set]); } catch (e) { /* yoksay */ }
  }

  // Ürün id'sindeki sayı grubundan elmas miktarını bulur (tam tier eşleşmesi).
  // Substring tuzağını önler ('500', '5000' içinde yakalanmaz): 'elmas.5000' -> 5000,
  // bilinmeyen tier -> 0.
  _diamondsForProduct(productId) {
    const DIAMOND_TIERS = { '500': 500, '1000': 1000, '2000': 2000, '5000': 5000, '10000': 10000 };
    for (const numStr of (String(productId).match(/\d+/g) || [])) {
      if (DIAMOND_TIERS[numStr]) return DIAMOND_TIERS[numStr];
    }
    return 0;
  }

  // RevenueCat'in DOĞRULADIĞI tüketilebilir işlemleri tarar; henüz verilmemiş olanların
  // elmasını bir kez ekler. Verilen toplam elması döndürür.
  //  - İlk çalıştırma (seed): mevcut tüm işlemleri sadece "verildi" işaretler; bu sürümden
  //    önce eski mantıkla zaten teslim edilmiş satın almalar güncellemede TEKRAR ödül vermesin.
  //  - Sonraki çağrılar: yalnız yeni/teslim edilmemiş işlemler ödüllendirilir (idempotent).
  reconcileConsumables(customerInfo, { silent = false } = {}) {
    const txns = customerInfo && Array.isArray(customerInfo.nonSubscriptionTransactions)
      ? customerInfo.nonSubscriptionTransactions
      : [];

    const granted = this._getGrantedTxIds();

    if (!Storage.get('iap_reconcile_seeded', false)) {
      txns.forEach(tx => { if (tx && tx.transactionIdentifier) granted.add(tx.transactionIdentifier); });
      this._saveGrantedTxIds(granted);
      try { Storage.set('iap_reconcile_seeded', true); } catch (e) { /* yoksay */ }
      return 0;
    }

    let totalAdded = 0;
    let changed = false;
    txns.forEach(tx => {
      const id = tx && tx.transactionIdentifier;
      if (!id || granted.has(id)) return;
      const diamonds = this._diamondsForProduct(tx.productIdentifier);
      if (diamonds > 0) {
        PlayerState.addDiamonds(diamonds);
        totalAdded += diamonds;
      }
      granted.add(id); // ödülsüz/bilinmeyen ürün de işaretlensin → boşuna tekrar taranmasın
      changed = true;
    });

    if (changed) this._saveGrantedTxIds(granted);

    if (totalAdded > 0) {
      if (!silent) Toast.show(t('diamonds_added', { count: totalAdded }), 'success');
      this._pushEconomyToCloud();
    }
    return totalAdded;
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
      // Tüketilmemiş/teslim edilmemiş tüketilebilir satın almaları da kurtar (idempotent).
      this.reconcileConsumables(customerInfo);
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
      const productId = String(pkg.product.identifier);

      // VIP aboneliği: entitlement'a göre işlenir (ilk 5000 elmas + reklamsız).
      if (productId.includes('vip')) {
        await this.checkSubscriptions(customerInfo);
        this._pushEconomyToCloud();
        return true;
      }

      // Tüketilebilir (elmas): işlem-id bazlı IDEMPOTENT teslim. Satın almadan dönen
      // customerInfo'daki YENİ (doğrulanmış) işlemi bulup elması bir kez verir ve işlem
      // id'sini "verildi" olarak kaydeder → çift ödül yok.
      let added = this.reconcileConsumables(customerInfo);
      if (added === 0) {
        // İşlem customerInfo'ya henüz yansımadıysa bir kez taze çekip tekrar dene.
        try {
          const fresh = await Purchases.getCustomerInfo();
          added = this.reconcileConsumables(fresh.customerInfo);
        } catch (e) { /* yoksay — açılıştaki reconcile yine kurtarır */ }
      }
      if (added > 0) return true;

      // Buraya düşerse işlem RevenueCat tarafından DOĞRULANAMADI (çoğu zaman RC↔Store
      // bağlantısı eksik — "Could not check"). Elması yerel olarak UYDURMA; para gerçekten
      // tahsil edildiyse ve bağlantı düzelince işlem doğrulanınca sonraki açılışta reconcile
      // otomatik teslim eder. Kullanıcıya işlemin beklemede olduğunu bildir.
      Toast.show(t('purchase_pending_verification') || t('purchase_failed'), 'error');
      return false;
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
