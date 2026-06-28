import { Purchases } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { PlayerState } from '../state/playerState.js';
import { Toast } from '../components/toast.js';

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
        ? 'appl_YOUR_IOS_API_KEY_HERE'
        : 'goog_udOqujJcAXCvFSPdDLIjcCnovXg';

      await Purchases.configure({ apiKey });
      this.isInitialized = true;
      console.log('RevenueCat initialized successfully!');

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
      if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
        // offerings.current.availablePackages contains the products
        this.packages = offerings.current.availablePackages;
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
      PlayerState.state.isVip = true;
      PlayerState.save();

      const now = Date.now();
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      
      // If never received or 30 days have passed
      if (!PlayerState.state.lastVipRewardTime || (now - PlayerState.state.lastVipRewardTime >= thirtyDaysMs)) {
        PlayerState.addDiamonds(5000);
        PlayerState.state.lastVipRewardTime = now;
        PlayerState.save();
        Toast.show('👑 VIP Aylık Maaşın Yattı: +5000 Elmas!', 'success');
      }
    } else if (PlayerState.state.isVip) {
      // Subscription expired or cancelled
      PlayerState.state.isVip = false;
      PlayerState.save();
    }
  }

  async purchasePackage(pkg) {
    if (!this.isInitialized) {
      Toast.show('Uygulama içi satın alma şu an kullanılamıyor.', 'error');
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
        Toast.show(`+${diamondsToAdd} Elmas başarıyla eklendi!`, 'success');
        return true;
      }

      // If it's the VIP package, checkSubscriptions will handle the first 5000 diamond reward
      if (productId.includes('vip')) {
        await this.checkSubscriptions(customerInfo);
        return true;
      }
    } catch (e) {
      if (!e.userCancelled) {
        console.error('Purchase error:', e);
        Toast.show('Satın alma işlemi başarısız oldu.', 'error');
      }
    }
    return false;
  }
}

export const IAP = new IAPService();
