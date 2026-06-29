import { InAppReview } from '@capacitor-community/in-app-review';
import { Capacitor } from '@capacitor/core';
import { Storage } from '../utils/storage.js';

// Mağaza puanlaması — KURALLARA UYGUN:
//  - Otomatik istek: native in-app review (iOS SKStoreReviewController / Android
//    Google Play In-App Review). Ödül YOK, belirli yıldız İSTENMEZ (mağaza yasağı).
//  - Ayarlar butonu: doğrudan mağaza sayfasını açar.
// Sıklık sınırlıdır; native API'ler de OS tarafında ayrıca sınırlanır.

// iOS App Store numeric ID (App Store Connect → App Information → "Apple ID").
// Android paket adı zaten biliniyor (com.askar.blockblast).
const APPSTORE_ID = '6782608018';
const ANDROID_PKG = 'com.askar.blockblast';

// Eşikler
const MIN_POSITIVE_EVENTS = 3;                       // ilk istekten önce en az 3 olumlu olay
const MAX_PROMPTS = 8;                               // ömür boyu otomatik istek üst sınırı
const MIN_GAP_MS = 15 * 24 * 60 * 60 * 1000;         // istekler arası en az 15 gün

class RatingServiceManager {
  // Olumlu bir an (rekor/galibiyet) sonrası çağrılır. Tüm sıklık kontrolü içeride.
  async maybeRequestReview() {
    if (!Capacitor.isNativePlatform()) return;

    // Kullanıcı "Puanla" butonuna bastıysa otomatik istemeyi bırak.
    if (Storage.get('rating_done', false)) return;

    // Olumlu olay sayacı
    const events = Storage.get('rating_pos_events', 0) + 1;
    Storage.set('rating_pos_events', events);
    if (events < MIN_POSITIVE_EVENTS) return;

    // Ömür boyu üst sınır
    const count = Storage.get('rating_prompt_count', 0);
    if (count >= MAX_PROMPTS) return;

    // İki istek arası minimum süre
    const last = Storage.get('rating_last_prompt', 0);
    if (last && (Date.now() - last) < MIN_GAP_MS) return;

    try {
      await InAppReview.requestReview();
      Storage.set('rating_last_prompt', Date.now());
      Storage.set('rating_prompt_count', count + 1);
    } catch (e) {
      console.warn('requestReview warn:', e);
    }
  }

  // Ayarlardaki "Puanla" butonu — mağaza listeleme sayfasını açar (her zaman çalışır).
  openStorePage() {
    // Bir daha otomatik native istek gösterme (kullanıcı zaten yönlendirildi).
    Storage.set('rating_done', true);

    const platform = Capacitor.getPlatform();
    const url = platform === 'ios'
      ? `https://apps.apple.com/app/id${APPSTORE_ID}?action=write-review`
      : `https://play.google.com/store/apps/details?id=${ANDROID_PKG}`;

    try {
      window.open(url, '_blank');
    } catch (e) {
      console.warn('openStorePage warn:', e);
    }
  }
}

export const RatingService = new RatingServiceManager();
