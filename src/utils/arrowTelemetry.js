// Hafif YEREL telemetri — Arrow bölüm sonuçları (zorluk ayarı için temel).
// Not: Backend YOK; veri yalnızca cihazda toplanır. İleride syncToCloud ile gönderilip
// gerçek oyuncu verisiyle üreteç parametreleri (ok yoğunluğu, can) ayarlanabilir.
// Bölüm bazında: oynama sayısı, başarısızlık, toplam yanlış-dokunuş (son N bölüm).
import { Storage } from './storage.js';

const KEY = 'arrow_telemetry';
const MAX_LEVELS = 300; // sınırsız localStorage büyümesini engelle

export function recordArrowOutcome(level, win, wrongTaps) {
  try {
    const data = Storage.get(KEY, {}) || {};
    const k = String(level);
    const e = data[k] || { plays: 0, fails: 0, wrong: 0 };
    e.plays += 1;
    if (!win) e.fails += 1;
    e.wrong += (wrongTaps | 0);
    data[k] = e;
    // Boyut sınırı: çok fazla anahtar olursa en küçük bölüm numaralılardan at.
    const keys = Object.keys(data);
    if (keys.length > MAX_LEVELS) {
      keys.map(Number).sort((a, b) => a - b)
        .slice(0, keys.length - MAX_LEVELS)
        .forEach(n => { delete data[String(n)]; });
    }
    Storage.set(KEY, data);
  } catch (e) { /* yut */ }
}

// En çok zorlanılan bölümler (başarısızlık oranına göre) — ileride dengeleme için.
export function getHardestArrowLevels(limit = 10) {
  try {
    const data = Storage.get(KEY, {}) || {};
    return Object.entries(data)
      .map(([lvl, e]) => ({
        level: +lvl,
        plays: e.plays,
        failRate: e.plays ? e.fails / e.plays : 0,
        avgWrong: e.plays ? e.wrong / e.plays : 0,
      }))
      .filter(x => x.plays >= 2)
      .sort((a, b) => b.failRate - a.failRate)
      .slice(0, limit);
  } catch (e) { return []; }
}
