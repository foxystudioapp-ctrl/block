# Bloxy — Bu oturumda güncellediğim TÜM dosyalar (10 dosya)

Klasör yapısı korundu; `src/` üzerine doğrudan açabilirsin. Hepsi `node --check` temiz,
`npm run build` **exit 0**.

## JEWEL / Eşleştirme modu
| Dosya | Değişiklik |
|---|---|
| `src/game/matchEngine.js` | Geçilebilirlik: `_shouldHaveGem` mücevher doğumu 0.30→0.50 + tamamlama-koruması + hedefe-yakın artışı; `loadState` artık ekrandan seçilen seviyeyi ezmiyor. |
| `src/game/matchLevels.js` | Mücevher hedefleri yeniden ayarlandı; prosedürel tavanlar 16/36. |
| `src/screens/matchMode.js` | Bellek sızıntısı: kalıcı dinleyici dizisi yerine `removeDragListeners` + drag-teardown (5000 swipe: 20000→0). |

## X2 (2048) modu
| Dosya | Değişiklik |
|---|---|
| `src/game/x2Engine.js` | Geçilebilirlik: gerçek duvar = tahta-KİLİDİ (hedef değil); `getTargetScore` requiredMerges tavanı 16; `_guaranteePlayable` → eşik rahatlatma (tahta %65 dolunca ~%50'ye in). 820 seviye sim'de geçildi. |
| `src/screens/x2Block.js` | Bellek sızıntısı (aynı sınıf): drag başına kalıcı dinleyici düzeltildi (5000 drag: 15000→0). |

## MERGE (Birleştir) modu
| Dosya | Değişiklik |
|---|---|
| `src/game/mergeEngine.js` | Tahta-kilidi: `_relieveBoard(trigger=0.68, targetFill=0.5)` → `nextLevel()` ve `loadGameState()` içinde. Eşik-tetikli + en-küçükten temizler (güvenli/yıkıcı değil). |

## ARROW (Ok Bulmacası) modu
| Dosya | Değişiklik |
|---|---|
| `src/game/allShapes.js` | Bozuk 10 ad düzeltildi (Göz, Köpek, Baykuş, Satranç Piyonu, Ayak İzi, Kedi/At Kafası, Masa Lambası, Kafatası, Dalga). Şekil verisi değişmedi. |
| `src/game/shapeNames.js` | **YENİ.** 176 şekil için İngilizce (`SHAPE_EN`) + diğer diller iskeleti (`SHAPE_I18N`). |
| `src/game/arrowLevels.js` | `getShapeName(name, lang)` yerelleştiriyor (tr→Türkçe, diğer→İngilizce). |
| `src/screens/arrowPuzzle.js` | Kazanma modalına şekil adı satırı (`shapeLabel`). |

---

## ⚠️ Pakette OLMAYAN — senin tarafında HARİCİ düzenlenen dosyalar
Bu oturumda değişti ama **ben yazmadım** (sen/araç uyguladı); o yüzden "benim
güncellediğim" sayılmaz ve buraya koymadım. Tam set istersen mevcut hâllerini kullan:
- `src/game/bubbleLevels.js` — bubble adillik değerleri (harici; analizimde "değişiklik gerekmez" demiştim).
- `src/game/classicEngine.js` — harici (Classic'i analiz ettim, kör balans değişikliği yapmadım; gerçek-cihaz playtest önerdim).
- `src/game/arrowGenerator.js` — ada-filtresi + tam-sayı ölçek kaldırma (harici uygulandı; ben doğruladım: Sv1–50000 geçilebilir).

## ⚠️ `arrowPuzzle.js` notu
Bu dosya oturum boyunca sende canlı düzenleniyordu. Buradaki kopya benim çalışma
kopyamın anlık görüntüsü (harici nokta/silüet katmanı + benim isim satırım birlikte).
En son benim düzenlememden sonra elle değiştirdiysen, üzerine yazmak yerine sadece
2 satırlık isim snippet'ini kendi dosyana ekle (önceki README'de var).

## Durum
- Arrow ismi yalnızca **kazanma modalında** görünüyor (oyun tahtasında değil).
- Çeviri: **tr + en tam**; diğer 9 dil İngilizce'ye düşüyor (tam yerelleştirme = batch işi).

## Dağıtım
```bash
npm run build      # exit 0
npx cap sync
```
Firestore kuralı değişmedi → `firebase deploy` gerekmez.
