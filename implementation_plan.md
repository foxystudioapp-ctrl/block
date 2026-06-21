# Block Blast - Oyun Uygulaması Implementasyon Planı (v2)

Stitch'teki **Block Blast** projesindeki 13 ekran tasarımına **birebir sadık kalarak** tam fonksiyonlu bir mobil web oyunu oluşturacağız. Hiçbir buton, UI öğesi veya tasarım detayı değiştirilmeyecek/kaldırılmayacak.

---

## Teknoloji Seçimi

| Bileşen | Teknoloji |
|---------|-----------|
| **Framework** | Vite + Vanilla JS (SPA) |
| **Styling** | TailwindCSS (tasarımda zaten kullanılıyor) |
| **Icons** | Google Material Symbols Outlined |
| **Font** | Google Fonts - Inter |
| **State** | LocalStorage (kalıcı veri) |
| **Routing** | Hash-based SPA router (custom) |
| **PWA** | Service Worker + Web Manifest |

> [!IMPORTANT]
> Stitch tasarımları TailwindCSS kullanıyor. Tasarıma birebir sadık kalmak için TailwindCSS kullanacağız.

---

## Tasarım Sistemi (Stitch'ten Birebir)

| Token | Değer |
|-------|-------|
| **Font** | Inter (400, 600, 700, 800) |
| **Arka Plan** | `#F5F5F7` |
| **Primary** | `#010102` |
| **Secondary** | `#0058bc` |
| **Secondary Container** | `#0070eb` |
| **Primary Container** | `#1c1c1e` |
| **Accent Cyan** | `#00e5ff` |
| **Glass Panel** | `rgba(255,255,255,0.8)` + `blur(30px)` + `1px solid rgba(255,255,255,0.3)` |
| **Block Colors** | Cyan `#38bdf8`, Purple `#a855f7`, Orange `#f97316`, Blue `#3b82f6`, Green `#22c55e`, Red `#ef4444` |
| **Hex Block Colors** | Magenta `#d946ef`, Purple `#a855f7`, Cyan `#06b6d4` |

---

## Proje Yapısı

```
block/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── manifest.json                  # PWA manifest
├── sw.js                          # Service Worker
├── src/
│   ├── main.js                    # Entry point + Router
│   ├── style.css                  # Tailwind imports + Custom CSS
│   ├── router.js                  # Hash-based SPA router
│   ├── state/
│   │   ├── gameState.js           # Oyun durumu yönetimi
│   │   ├── playerState.js         # Oyuncu profili, coin, elmas, XP
│   │   └── taskState.js           # Günlük görevler durumu
│   ├── screens/
│   │   ├── splash.js              # Splash / Loading ekranı
│   │   ├── mainMenu.js            # Ana Menü - Yeni Modlar
│   │   ├── classicBlock.js        # Classic Block oyun ekranı
│   │   ├── adventureBlock.js      # Adventure Block seviye haritası
│   │   ├── hexBlock.js            # Hex Block oyun ekranı
│   │   ├── colorSort.js           # Color Sort oyun ekranı
│   │   ├── dailyTasks.js          # Günlük Görevler
│   │   ├── leaderboard.js         # Global Sıralama
│   │   ├── profile.js             # Profil ve İstatistikler
│   │   ├── themeShop.js           # Tema Dükkanı
│   │   ├── settings.js            # Ayarlar Paneli
│   │   └── gameOver.js            # Oyun Bitti modalları
│   ├── game/
│   │   ├── classicEngine.js       # Classic Block oyun motoru
│   │   ├── adventureEngine.js     # Adventure seviye motoru
│   │   ├── hexEngine.js           # Hex Block oyun motoru
│   │   ├── colorSortEngine.js     # Color Sort oyun motoru
│   │   ├── shapes.js              # Blok şekil tanımları
│   │   ├── hexShapes.js           # Hex blok şekil tanımları
│   │   ├── scoring.js             # Puanlama ve combo sistemi
│   │   ├── powerups.js            # Güç-up'lar (bomba, renk bombası)
│   │   └── renderer.js            # Grid render helper
│   ├── components/
│   │   ├── bottomNav.js           # Alt navigasyon barı
│   │   ├── topBar.js              # Üst bar (coin/elmas göstergesi dahil)
│   │   ├── glassCard.js           # Glass panel kartları
│   │   ├── progressBar.js         # İlerleme çubukları
│   │   ├── modal.js               # Modal overlay
│   │   ├── blockPreview.js        # Blok önizleme
│   │   ├── gridSizeSelector.js    # Grid boyutu seçici dropdown
│   │   ├── toast.js               # Başarım/bildirim toast popup
│   │   ├── tutorial.js            # İlk kez tutorial overlay
│   │   ├── dailyLoginCalendar.js  # Günlük giriş ödül takvimi
│   │   └── luminousSwitch.js      # Özel toggle switch (ayarlar)
│   └── utils/
│       ├── storage.js             # LocalStorage helper
│       ├── animations.js          # Micro animasyonlar + confetti
│       ├── sounds.js              # Ses efektleri yöneticisi
│       └── haptics.js             # Haptic feedback yöneticisi
└── public/
    ├── favicon.svg
    ├── icons/                     # PWA ikonları
    └── audio/                     # Ses dosyaları
        ├── sfx/
        │   ├── block-place.mp3    # Blok yerleştirme
        │   ├── line-clear.mp3     # Satır silme
        │   ├── combo.mp3          # Combo
        │   ├── game-over.mp3      # Oyun sonu
        │   ├── new-record.mp3     # Yeni rekor
        │   ├── button-tap.mp3     # Buton tıklama
        │   ├── coin-collect.mp3   # Coin kazanma
        │   ├── level-up.mp3       # Seviye atlama
        │   ├── power-up.mp3       # Power-up kullanımı
        │   ├── invalid.mp3        # Geçersiz yerleştirme
        │   ├── undo.mp3           # Geri alma
        │   └── achievement.mp3    # Başarım kazanma
        └── music/
            ├── menu-ambient.mp3   # Menü arka plan müziği
            └── game-ambient.mp3   # Oyun içi arka plan müziği
```

---

## Ekran Detayları ve Özellik Eşlemeleri

### 1. Splash / Loading Ekranı
**[YENİ — tasarımda yok, eklenen özellik]**
- "LUMINA PUZZLE" logo animasyonu (fade-in + scale)
- İlerleme çubuğu
- 2 saniye sonra otomatik ana menüye geçiş

---

### 2. Ana Menü
**Stitch Ekranı: "Ana Menü - Yeni Modlar"**

Birebir tasarım:
- **Top AppBar**: Hamburger menü + "LUMINA PUZZLE" + Ayarlar ikonu
- **Coin/Elmas göstergesi** *(eklenen)* — üst barda her zaman görünür
- **Score Board**: Glass panel — "Best Score: 14,250" + "Global Rank: #428"
- **Classic Block butonu**: `block-3d-blue luminous-glow` — Grid ikonu + başlık + alt yazı
- **Bento Grid**:
  - **Adventure Block** (tam genişlik): Turuncu ikon + "Level 42 • ★ 124" + Play butonu
  - **Hex Block** (yarım): Pembe hexagon
  - **Color Sort** (yarım): Sarı boya kovası
- **Daily Challenge Card**: Ateş ikonu + "Clear 50 Lines" + coin badge + progress + "Play Now"
- **Streak sayacı** *(eklenen)* — ardışık gün giriş göstergesi
- **Bottom NavBar**: grid_view(aktif), leaderboard, emoji_events, person

---

### 3. Classic Block — Oyun Ekranı
**Stitch Ekranı: "Oyun Alanı - Modern Minimalist"**

Birebir tasarım:
- **Top Controls Sol**: Settings pill + **Light/Dark mode toggle** (`light_mode` ikonu)
- **Top Controls Sağ**: **Grid boyutu seçici** (cyan badge) + "Geri Al (3)" dark pill

#### Grid Boyutu Seçici (Yeni Detay)
- Cyan badge'e (`8x8`) tıklayınca dropdown/popup açılır
- Seçenekler: `6x6`, `8x8`, `10x10`, `12x12`
- Seçim yapılınca grid dinamik olarak değişir
- Her boyut için ayrı skor kaydı

#### Oyun Mekaniği
- **Dinamik NxN grid** (6/8/10/12)
- **3 blok önizleme alanı** (glass panel, alt kısım)
- **Sürükle-bırak blok yerleştirme**
- **Ghost preview** *(eklenen)* — sürüklerken grid üzerinde yarı saydam önizleme
- **Satır/sütun silme animasyonu** *(eklenen)* — parlama + kaybolma efekti
- **Combo popup** *(eklenen)* — "2x Combo!", "3x Combo!" text animasyonu
- **Skor popup** *(eklenen)* — "+120" yukarı süzülen rakam
- **Geçersiz yerleştirme shake** *(eklenen)* — yanlış yere bırakınca titreşim
- **Oyunu devam ettirme** *(eklenen)* — çıkıp geri dönünce kaldığı yerden

- **Score Section**: Rekor(sol) + Skor(orta, büyük) + Seviye(sağ)
- Blok stilleri: `.block-cyan`, `.block-purple`, `.block-orange`, `.block-blue`, `.block-green`, `.block-red` + `.luminous-effect`

---

### 4. Hex Block — Oyun Ekranı
**Stitch Ekranı: "Hex Block - Yenilenmiş Tasarım"**

Birebir tasarım:
- **Top Controls**: Settings pill | **"Hex Block" cyan badge** + "Geri Al (3)"
- **Score Section**: Best + Score + Level
- **Hexagonal Grid**: clip-path polygon ile altıgen hücreler
  - 7 satır, ortada genişleyen elmas şekli (5-6-7-8-7-6-5)
  - Hücre boyutu: 50x57.735px
  - Blok renkleri: `.block-magenta`, `.block-purple`, `.block-cyan`
- **Bottom Piece Tray**: Glass panel, 3 sürüklenebilir hex parça
  - Üçgen, çizgi, baklava şekilleri

---

### 5. Color Sort — Oyun Ekranı
**Stitch Ekranı: "Color Sort - Yenilenmiş Tasarım"**

Birebir tasarım:
- **Top Controls Sol**: **Pause butonu** (`pause`) + **Refresh butonu** (`refresh`)
- **Top Controls Sağ**: **"Lv 42" cyan badge** (seviye göstergesi) + "Geri Al (3)"
- **Score Section**: Rekor + Skor + Seviye
- **Progress Bar**: Glass panel pill içinde "PROGRESS" + ilerleme çubuğu + "%65"
- **Puzzle Area**: Glow effect container
- **Alt Kontroller** (fixed bottom, glass panel pill):
  - **Undo** (`undo`) — geri al
  - **Hint/İpucu** (`lightbulb`) — coin ile ipucu alma
  - **Add Tube/Tüp Ekle** (`add`) — coin ile ekstra tüp ekleme

---

### 6. X2 2048 Modu (Düşür & Birleştir)
**[YENİ — Drop & Merge konsepti]**

- **Tasarım Konsepti**: Standart 2048'den farklı olarak, sadece yukarıdan aşağıya sütunlar halindedir. Ekranda soldan sağa yatay çizgiler (satır çizgileri) OLMAZ, sadece yukarıdan aşağıya dikey kolon ayırıcı çizgileri bulunur.
- **Top Controls**: Geri al butonu, Skor ve Rekor göstergesi
- **Grid Yapısı**: 5 dikey sütun (column). Sütunların arkaplanında sadece dikey ayırıcı çizgiler görünür.
- **Oyun Mekaniği**:
  - Oyuncu, beliren sayıyı sütunlardan birine tıklayarak/sürükleyerek aşağı düşürür.
  - Sayı aşağı düşer, eğer altında aynı sayı varsa birleşir ve x2 olur (ör: 2+2=4).
  - Zincirleme birleşme (combo) efekti ve puan çarpanı.
- **Gelecek Sayı Göstergesi**: Üstte, bir sonraki düşecek blok.
- **Power-Up'lar**: Çekiç (istenmeyen bloğu kırmak için) ve Değiştir (gelecek bloğu değiştirmek için).

---

### 6. Adventure Block — Seviye Haritası
**Stitch Ekranı: "Adventure Block - Yenilenmiş Tasarım"**

Birebir tasarım (dark mode):
- **Top Controls**: Menu pill + Settings pill
- **Score Section**: Rekor + Skor + Seviye 42
- **"Adventure" display başlık** + "Sector 4: Obsidian Geometries"
- **Level Path Map**: Dikey node düzeni
  - Tamamlanan (39,40,41): Glass panel + yıldız derecelendirmesi
  - **Aktif seviye (42)**: Büyük card, "CURRENT" turuncu badge, "Start Level" butonu
  - Kilitli (43,44): opacity-50, kilit ikonu
  - Dikey bağlantı çizgisi (`path-line`)
- **Bottom NavBar**

---

### 7. Günlük Görevler
**Stitch Ekranı: "Günlük Görevler"**

Birebir tasarım:
- **Header**: Geri butonu + "Daily Tasks" (centered)
- **Görev Kartları** (glass-card):
  - "10 satır temizle" — Coin +50, yeşil progress (%40)
  - "500 puan yap" — Badge ödülü, mavi progress (%70)
  - "3 combo yap" — Yıldız +100, turuncu progress (%33)
  - Tamamlanan "Giriş yap" — opacity-60, check_circle, üstü çizili
- Progress bar animasyonu (0'dan hedef genişliğe)

---

### 8. Global Sıralama
**Stitch Ekranı: "Global Sıralama ve Giriş"**

Birebir tasarım:
- **Auth Section**: Glass card, "Global Standings", "Sign in with Google" (SVG)
- **Podium** (3 sütun): 2.sıra + 1.sıra(büyük, altın kupa) + 3.sıra
- **Leaderboard List**: Sıra + Avatar + İsim + Level + Puan
- **Kullanıcı satırı**: Mavi vurgu, `border-l-4 border-secondary`
- Alt not: "Leaderboard updates every 30 minutes."

---

### 9. Profil ve İstatistikler
**Stitch Ekranı: "Profil ve İstatistikler"**

Birebir tasarım:
- **Hero**: Profil fotoğrafı + "LVL 42" badge + "Zen_Master" + "BLOCK ARCHITECT"
- **Achievement Badges** (yatay scroll):
  - First Win, 7 Day Streak, Fast Clear, Grandmaster(kilitli)
- **Stats Grid** (2x2): High Score, Total Games, Lines Cleared, Stars
- **Level Progress**: "Progress to Level 43" + %75 bar + "850 XP REMAINING"

---

### 10. Tema Dükkanı
**Stitch Ekranı: "Tema Dükkanı"**

Birebir tasarım:
- **"Themes" display başlık** + açıklama
- **Theme Grid**:
  - **Minimal Beyaz** (aktif): ring-2, "ACTIVE" badge, "SEÇİLDİ" (disabled)
  - **Gece Modu**: Preview görseli, 500 yıldız, "KİLİDİ AÇ"
  - **Okyanus**: Preview, 750 yıldız
  - **Uzay**: Preview, 1200 yıldız, `lock_open` ikonu
  - **Sakura**: Preview, 850 yıldız

---

### 11. Ayarlar Paneli
**Stitch Ekranı: "Ayarlar Paneli"**

Birebir tasarım:
- **Preferences grubu** (glass-panel):
  - **Sound Effects** — luminous-switch toggle (aktif)
  - **Music** — luminous-switch toggle (aktif)
  - **Haptic Feedback** — luminous-switch toggle (aktif)
  - **Dark Mode** — luminous-switch toggle + `document.documentElement.classList.toggle('dark')`
- **Account & Info grubu**:
  - **Notifications** — chevron_right ile alt sayfa
  - **Account Management** — chevron_right
  - **Privacy Policy** — chevron_right
- **Profil Preview**: Avatar + isim + level + "Edit" butonu
- **Sign Out**: Kırmızı `logout` butonu
- **Version**: "Version 2.4.0 (Build 99)"

---

### 12. Oyun Bitti Modalları
**Stitch Ekranları: "Oyun Bitti (Modal)" + "Yeni Rekor!" + "Oyun Bitti (Şeffaf Arka Plan)"**

#### Normal Game Over:
- Blur arka plan + glass card
- Score / Best score tablosu
- "Play Again" (primary-container, refresh ikonu)
- "Main Menu" (transparent, border)

#### Yeni Rekor:
- **Confetti animasyonu** — renkli parçacıklar floating
- **Altın kupa görseli** — glow + pulse efekti
- "New Record!" başlık + glow-text skor
- **"Continue"** butonu (arrow_forward)
- **"Share"** butonu (ios_share ikonu) — skor paylaşma

---

## Eklenen Yeni Özellikler (Tasarım Dışı)

### Ghost Preview (Blok Yerleştirme Önizleme)
- Sürüklenen blok grid üzerine gelince hedef hücrelerde yarı saydam görüntü
- Geçerli konum: yeşilimsi yarı saydam
- Geçersiz konum: kırmızımsı yarı saydam

### Satır/Sütun Silme Animasyonu
- Tamamlanan satır/sütun beyaza döner → parlama efekti → küçülerek kaybolma
- 300ms animasyon süresi

### Combo Sistemi
- Tek hamle ile birden fazla satır/sütun silme = combo
- Ekranda "2x Combo!", "3x Combo!" yazısı (scale-in + fade-out animasyonu)
- Combo skor çarpanı: 2x = x1.5, 3x = x2, 4x+ = x3

### Skor Popup
- Silme yapılınca grid ortasında "+120" gibi rakam yukarı süzülerek kaybolur
- Font: Inter Bold, renk: secondary

### Geçersiz Yerleştirme Feedback
- Blok sığmayan yere bırakılınca:
  - Preview alanındaki blok kısa shake animasyonu
  - Kırmızı flash (50ms)

### Power-Up'lar (Güç-up)
| Power-Up | Etki | Maliyet |
|----------|------|---------|
| **Bomba** 💣 | 3x3 alan temizleme | 100 coin |
| **Renk Bombası** 🎨 | Tüm grid'den tek renk silme | 200 coin |

- Power-up'lar oyun ekranında ek butonlar olarak görünür
- Satın alma modalı coin yetmeyince uyarı

### Tutorial Overlay (İlk Oyun)
- Yarı saydam overlay + spotlight efekti
- 3 adım:
  1. "Bloğu buraya sürükle" → preview alanını göster
  2. "Grid'e bırak" → grid'i göster
  3. "Satırı tamamla" → tamamlanan satır animasyonu
- "Anladım" butonu ile geçiş
- LocalStorage'da `tutorialCompleted` flag

### Günlük Giriş Ödül Takvimi
- 7 günlük takvim kartı (haftalık döngü)
- Her gün artan ödül: 50→75→100→150→200→300→500 coin
- 7. gün bonus: 1 elmas
- Bugünkü gün vurgulu, geçmiş günler ✓ işaretli
- Ana menüde popup olarak açılır

### Streak Sayacı
- Ana menüde ateş ikonu + "🔥 5 Gün" gibi gösterge
- Streak kırılınca sıfırlanır
- Streak bonusu: her gün %10 ekstra coin

### Toast Bildirim Sistemi
- Ekranın üstünden aşağı kayarak gelen bildirim
- Otomatik 3 saniye sonra kaybolma
- Kullanım: "İlk Combo!", "Yeni seviye açıldı!", "Günlük görev tamamlandı!"
- Glass panel stili

### Coin/Elmas Her Zaman Görünür
- Tüm ekranlarda top bar'da coin (💰) ve elmas (💎) sayısı
- Sayı değişince kısa bounce animasyonu

### Oyun Devam Ettirme
- Oyun state'i her hamle sonrası LocalStorage'a kaydedilir
- Oyuna geri dönünce "Devam et" / "Yeni oyun" seçeneği

### PWA Desteği
- `manifest.json`: app ismi, ikonlar, tema rengi
- `sw.js`: Offline cache stratejisi
- Mobilde "Ana ekrana ekle" özelliği

---

## Ses Efektleri Sistemi
*(Ayarlar ekranındaki "Sound Effects" toggle ile kontrol edilir)*

| Olay | Ses | Süre |
|------|-----|------|
| Blok yerleştirme | Hafif "tık" / snap | 50ms |
| Satır/sütun silme | "Swoosh" kayma sesi | 200ms |
| Combo (2x) | Kısa "ding" | 150ms |
| Combo (3x+) | Çift "ding-ding" + parlama | 300ms |
| Game Over | Derin "buzz" / düşme | 500ms |
| Yeni Rekor | Fanfare / kutlama | 1s |
| Buton tıklama | Yumuşak "pop" | 30ms |
| Coin kazanma | "Cha-ching" | 200ms |
| Seviye atlama | Yükselen melodic arpej | 800ms |
| Power-up kullanımı | "Whoosh" patlama | 300ms |
| Geçersiz yerleştirme | Kısa "bzzt" hata | 100ms |
| Geri alma | Ters "swoosh" | 150ms |
| Başarım kazanma | Mini fanfare | 500ms |

- Web Audio API ile üretilecek (dosya boyutunu küçük tutmak için)
- Ayarlar'dan kapatılabilir (`soundEnabled` flag)

## Arka Plan Müziği
*(Ayarlar ekranındaki "Music" toggle ile kontrol edilir)*

| Sahne | Müzik Stili | Loop |
|-------|-------------|------|
| Ana menü + diğer ekranlar | Sakin ambient / lo-fi | ✅ |
| Oyun içi (Classic, Hex, Color Sort) | Hafif ritmik lo-fi | ✅ |
| Adventure modu | Epik ambient | ✅ |

- Müzik geçişleri fade-in/fade-out (500ms)
- Ses seviyesi: varsayılan %30
- Ayarlar'dan kapatılabilir (`musicEnabled` flag)

## Haptic Feedback Sistemi
*(Ayarlar ekranındaki "Haptic Feedback" toggle ile kontrol edilir)*

| Olay | Titreşim Süresi |
|------|----------------|
| Buton tıklama | `navigator.vibrate(5)` |
| Blok yerleştirme | `navigator.vibrate(10)` |
| Satır silme | `navigator.vibrate(15)` |
| Combo | `navigator.vibrate(30)` |
| Game Over | `navigator.vibrate(100)` |
| Yeni Rekor | `navigator.vibrate([50, 50, 50])` |
| Geçersiz yerleştirme | `navigator.vibrate([20, 10, 20])` |

- `navigator.vibrate` desteği kontrol edilir, yoksa sessizce atlanır
- Ayarlar'dan kapatılabilir (`hapticEnabled` flag)

---

## Görsel Assetler (Üretilmesi Gerekenler)

| # | Asset | Ekran | Nasıl Üretilecek |
|---|-------|-------|------------------|
| 1 | **Altın kupa görseli** | Yeni Rekor modalı | `generate_image` tool |
| 2 | **Gece Modu tema preview** | Tema Dükkanı | `generate_image` tool |
| 3 | **Okyanus tema preview** | Tema Dükkanı | `generate_image` tool |
| 4 | **Uzay tema preview** | Tema Dükkanı | `generate_image` tool |
| 5 | **Sakura tema preview** | Tema Dükkanı | `generate_image` tool |
| 6 | **Liderlik avatarları (7 adet)** | Global Sıralama | `generate_image` tool |
| 7 | **Varsayılan profil avatar** | Profil ekranı | `generate_image` tool |
| 8 | **Splash ekranı logo** | Splash Screen | CSS animasyonla oluşturma |

---

## Animasyon Detayları (Tasarımlardan Birebir)

### Scroll Reveal (Profil Ekranı)
```js
// IntersectionObserver ile kartlar aşağıdan fade-in
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-4');
        }
    });
}, { threshold: 0.1 });
```

### Header Parallax Blur (Sıralama Ekranı)
```js
// Scroll'da header opacity geçişi
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 10) {
        header.style.backgroundColor = 'rgba(253, 248, 248, 0.95)';
    } else {
        header.style.backgroundColor = 'rgba(253, 248, 248, 0.8)';
    }
});
```

### Konfeti Animasyonu (Yeni Rekor)
- Renkler: Turquoise `#40E0D0`, Purple `#9370DB`, Orange `#FFA500`
- 6 parça, floating animasyon: `translateY(0) → translateY(-20px) → translateY(0)` + rotation
- `animation: float 6s ease-in-out infinite` + farklı `animation-delay`

### Progress Bar Yüklenme (Günlük Görevler)
- Sayfa açılınca `width: 0%` → hedef genişliğe `transition-all duration-1000 ease-out`

### Tema Kartı Hover Lift (Tema Dükkanı)
- `transition-transform hover:-translate-y-1 duration-300`

### Puzzle Blok Etkileşim (Color Sort)
- Hover: `transform: translateY(-2px)` 
- Active: `transform: translateY(1px)`
- `transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)`

---

## Ekonomi Sistemi

| Para Birimi | Kazanma Yolu | Harcama Yolu |
|-------------|-------------|-------------|
| **Coin** | Oyun oynama (+50-200), günlük görevler, giriş takvimi, combo bonus | Geri al (50 coin=3 hak), basic temalar, bomba (100), ipucu (75), ekstra tüp (50) |
| **Yıldız/Elmas** | 7. gün streak, özel görevler, adventure 3-yıldız | Premium temalar, renk bombası (200), özel güçler |

---

## Geliştirme Sırası (13 Adım)

### Adım 1: Proje Kurulumu
- Vite + TailwindCSS + PWA manifest
- Design system token'ları Tailwind config'e
- Custom CSS sınıfları (glass-panel, block-3d-*, luminous, luminous-switch vs.)
- Router altyapısı, splash screen
- Ses efektleri sistemi (Web Audio API) + müzik altyapısı + haptic manager
- PWA service worker

### Adım 2: Ortak Bileşenler
- Bottom navigation, top bar (coin/elmas göstergeli)
- Glass card, progress bar, modal, toast
- Luminous switch toggle

### Adım 3: Ana Menü Ekranı
- Tüm butonlar ve kartlar birebir tasarıma göre
- Streak sayacı, günlük giriş takvimi popup
- Navigasyon bağlantıları

### Adım 4: Classic Block Oyun Motoru
- Dinamik NxN grid (6/8/10/12)
- Grid boyutu seçici dropdown
- Blok şekil tanımları ve rastgele üretim
- Sürükle-bırak + ghost preview
- Satır/sütun silme + animasyonlar
- Combo sistemi + popup'lar
- Skor hesaplama

### Adım 5: Oyun Bitti Modalları
- Normal game over + yeni rekor (confetti + trophy)
- Share butonu
- Play Again / Main Menu / Continue navigasyonu

### Adım 6: Ekonomi, Geri Al, Power-up'lar
- PlayerState (coin, elmas, XP, seviye)
- Geri al mekanizması (3 hak + satın alma)
- Bomba ve renk bombası power-up'ları
- Light/Dark mode toggle

### Adım 7: Tutorial + Oyun Devam Ettirme
- İlk kez tutorial overlay (3 adım)
- Oyun state kaydetme/yükleme
- Toast bildirim sistemi

### Adım 8: Günlük Görevler
- Görev tanımları, ilerleme, ödül dağıtımı
- Görev kartları UI

### Adım 9: Adventure Block Modu
- Seviye haritası (node path)
- Seviye hedefleri, yıldız sistemi
- Kilitli/açık seviye yönetimi

### Adım 10: Hex Block Modu
- Altıgen grid (clip-path polygon)
- Hex blok şekilleri ve sürükle-bırak
- Diyagonal satır silme mantığı

### Adım 11: Color Sort Modu
- Tüp/konteyner sistemi
- Renk taşıma mekaniği (tıkla-tıkla)
- Pause, refresh, hint, add tube
- Seviye ilerleme çubuğu

### Adım 12: Sıralama, Profil, Tema Dükkanı
- Leaderboard (simüle data + podium)
- Profil (avatar, badge, stats, XP bar)
- Tema dükkanı (satın alma, uygulama)

### Adım 13: Ayarlar + Son Polish
- Ayarlar paneli (ses, müzik, haptic, dark mode, hesap)
- PWA service worker
- Görsel assetlerin generate_image ile üretilmesi
- Scroll reveal, header parallax, konfeti animasyonları
- Tüm animasyonların son kontrolü
- Responsive optimizasyon

---

## Doğrulama Planı

### Otomatik
- `npm run dev` ile çalıştırma
- Tüm ekranların hash route'larla yüklenmesi
- Her oyun modunun başlatılıp oynanabilmesi

### Manuel
- Her ekranın Stitch tasarımıyla piksel-perfect karşılaştırması
- Drag & drop testi (mobil + desktop)
- Coin/elmas ekonomi döngüsü
- Dark mode tüm ekranlarda
- PWA: "Ana ekrana ekle" testi
- Tutorial ilk girişte gösterilip sonra saklanması
- Ses efektleri: her olay için doğru ses çalıyor mu
- Müzik: menü/oyun geçişlerinde fade çalışıyor mu
- Haptic: mobilde titreşim çalışıyor mu
- Ayarlar toggle'ları: ses/müzik/haptic kapatınca gerçekten duruyor mu
- Scroll reveal animasyonları (profil kartları)
- Konfeti animasyonu (yeni rekor ekranı)
- Tema preview görselleri doğru yükleniyor mu
