/**
 * persist.js — Debounce'lı localStorage yazımı (F3)
 *
 * Amaç: Motorların HER HAMLEDE yaptığı senkron `localStorage.setItem(JSON.stringify(...))`
 * çağrısı low-end Android'de main-thread'i kilitliyordu (hamle başına micro-stutter).
 * Burada yazımlar:
 *   - 400ms debounce edilir (art arda hamlelerde tek yazım),
 *   - 2000ms max-wait ile sınırlanır (sürekli oynamada sonsuz erteleme olmaz),
 *   - sayfa gizlenince / kapanınca (arka plana alınınca) ANINDA flush edilir (veri kaybı yok).
 *
 * Değer çağrı anında stringify edilip saklanır; böylece motor nesnesi GC olsa bile
 * en güncel anlık görüntü doğru yazılır.
 */

const pending = new Map(); // rawKey -> { value, timer, firstAt }
const DELAY = 400;
const MAX_WAIT = 2000;

function writeNow(key) {
  const e = pending.get(key);
  if (!e) return;
  if (e.timer) clearTimeout(e.timer);
  pending.delete(key);
  try {
    localStorage.setItem(key, e.value);
  } catch (err) {
    console.error('persist write failed:', key, err);
  }
}

export function debouncedSetItem(key, value) {
  ensureFlushRegistered();
  const now = Date.now();
  let e = pending.get(key);
  if (!e) {
    e = { firstAt: now };
    pending.set(key, e);
  }
  e.value = value;
  if (e.timer) clearTimeout(e.timer);

  // Max-wait: ilk bekleyen değişiklikten bu yana MAX_WAIT geçtiyse hemen yaz.
  if (now - e.firstAt >= MAX_WAIT) {
    writeNow(key);
    return;
  }
  const remaining = Math.min(DELAY, MAX_WAIT - (now - e.firstAt));
  e.timer = setTimeout(() => writeNow(key), remaining);
}

// Bekleyen tüm yazımları hemen diske yaz (arka plana geçiş / kapanış için).
function flushPersist() {
  for (const key of [...pending.keys()]) writeNow(key);
}

let registered = false;
function ensureFlushRegistered() {
  if (registered) return;
  registered = true;
  // visibilitychange:hidden → uygulama arka plana alındığında (Android WebView dahil) tetiklenir.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersist();
  });
  // pagehide → sayfa/uygulama kapanışında son güvence.
  window.addEventListener('pagehide', flushPersist);
}
