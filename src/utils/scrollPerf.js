// Kaydırma performansı yardımcısı.
// Kaydırma sırasında menüdeki ağır (sonsuz box-shadow/shimmer) animasyonları
// geçici olarak duraklatır; kaydırma durunca tekrar başlar. Durağan görüntü değişmez.
// Sadece bir gövde sınıfı (is-scrolling) ekler/çıkarır — oyun mantığına dokunmaz.

let scrolling = false;
let timer = null;

function onScroll() {
  if (!scrolling) {
    scrolling = true;
    document.body.classList.add('is-scrolling');
  }
  clearTimeout(timer);
  timer = setTimeout(() => {
    scrolling = false;
    document.body.classList.remove('is-scrolling');
  }, 160);
}

// capture: iç içe kaydırma alanlarındaki scroll'u da yakalar.
// passive: dinleyici asla preventDefault çağırmaz, bu yüzden kaydırmayı yavaşlatmaz.
document.addEventListener('scroll', onScroll, { capture: true, passive: true });
