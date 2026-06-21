// Bubble Shooter Adventure - 300 seviye (v2: sıkı eğri + özel balonlar + yıldız)
//
// Her seviye prosedürel ama DETERMİNİSTİK üretilir (aynı seviye hep aynı görünür).
// Layout, renk indekslerinden (0..4) oluşur; null = boş.
// Ayrıca paralel `specials` matrisi özel balonları taşır:
//   'stone'   — taş/engel: renk eşleşmesiyle patlamaz, sadece tavandan koparsa
//               düşer veya bomba ile yok olur. Tahtayı zorlaştırır.
//   'bomb'    — bomba: normal renkli balondur (layout'ta rengi vardır) ama
//               eşleşmeyle patlayınca 6 komşusunu da yok eder (zincirleme).
//   'rainbow' — joker: her renge uyar; bir eşleşmeyi tamamlamaya yardım eder.
//
// === Zorluk eğrisi (v2) ===
//   Seviye 1-5    : ısınma — 3 renk, şekilli düzenler, BOL düşüş, ~18-22 atış
//   Seviye 6-12   : bomba tanıtımı — 3-4 renk
//   Seviye 9-15   : joker tanıtımı
//   Seviye 13-25  : taş/engel tanıtımı
//   Seviye 26-60  : orta — 4 renk, karışık desenler
//   Seviye 61-120 : zor — 4-5 renk, özel yoğunluğu artar
//   Seviye 121-220: çok zor — 5 renk, karmaşık + bol engel
//   Seviye 221-300: usta — 5 renk, en sıkı atış, yoğun özel
//
// Yıldız: motor tarafında kalan atış oranına göre hesaplanır (skill bazlı).

const COLS = 9;
const ROWS = 12;

// Mulberry32 — deterministik rng
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function emptyLayout() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
}

// odd-r offset: tek satırlarda son sütun yok
function isValid(r, c) {
  if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return false;
  if (r % 2 === 1 && c === COLS - 1) return false;
  return true;
}

// === Layout üreticiler (renk indeksi doldurur) ===

function genFull(rows, numColors, seed) {
  const layout = emptyLayout();
  const rand = rng(seed);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < COLS; c++) {
      if (!isValid(r, c)) continue;
      layout[r][c] = Math.floor(rand() * numColors);
    }
  return layout;
}

function genPyramid(maxRows, numColors, seed) {
  const layout = emptyLayout();
  const rand = rng(seed);
  for (let r = 0; r < maxRows; r++) {
    const width = Math.min(COLS, 2 + r * 2);
    const startCol = Math.floor((COLS - width) / 2);
    for (let c = startCol; c < startCol + width && c < COLS; c++) {
      if (!isValid(r, c)) continue;
      layout[r][c] = Math.floor(rand() * numColors);
    }
  }
  return layout;
}

function genInvPyramid(maxRows, numColors, seed) {
  const layout = emptyLayout();
  const rand = rng(seed);
  for (let r = 0; r < maxRows; r++) {
    const width = Math.max(2, COLS - r * 2);
    const startCol = Math.floor((COLS - width) / 2);
    for (let c = startCol; c < startCol + width && c < COLS; c++) {
      if (!isValid(r, c)) continue;
      layout[r][c] = Math.floor(rand() * numColors);
    }
  }
  return layout;
}

function genDiamond(numColors, seed) {
  const layout = emptyLayout();
  const rand = rng(seed);
  const height = 8, center = 4;
  for (let r = 0; r < height; r++) {
    const half = r < height / 2 ? r + 1 : height - r;
    const startCol = Math.max(0, center - half);
    const endCol = Math.min(COLS, center + half + 1);
    for (let c = startCol; c < endCol; c++) {
      if (!isValid(r, c)) continue;
      layout[r][c] = Math.floor(rand() * numColors);
    }
  }
  return layout;
}

function genStripes(rows, numColors, seed) {
  const layout = emptyLayout();
  const rand = rng(seed);
  for (let r = 0; r < rows; r++) {
    const color = Math.floor(rand() * numColors);
    for (let c = 0; c < COLS; c++) {
      if (!isValid(r, c)) continue;
      layout[r][c] = color;
    }
  }
  return layout;
}

function genColumns(rows, numColors, seed) {
  const layout = emptyLayout();
  const rand = rng(seed);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < COLS; c++) {
      if (!isValid(r, c)) continue;
      if (c % 2 === 0) layout[r][c] = Math.floor(rand() * numColors);
    }
  return layout;
}

function genChecker(rows, numColors, seed) {
  const layout = emptyLayout();
  const rand = rng(seed);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < COLS; c++) {
      if (!isValid(r, c)) continue;
      if ((r + c) % 2 === 0) layout[r][c] = Math.floor(rand() * numColors);
    }
  return layout;
}

function genRandom(rows, numColors, fillRatio, seed) {
  const layout = emptyLayout();
  const rand = rng(seed);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < COLS; c++) {
      if (!isValid(r, c)) continue;
      if (rand() < fillRatio) layout[r][c] = Math.floor(rand() * numColors);
    }
  return layout;
}

// YENİ: boşluklu duvar — patlatınca tatmin edici düşüşler üretir
function genGaps(rows, numColors, seed) {
  const layout = emptyLayout();
  const rand = rng(seed);
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < COLS; c++) {
      if (!isValid(r, c)) continue;
      // her satırda 1-2 boşluk bırak (asılı kümeler oluşsun)
      if (rand() < 0.82) layout[r][c] = Math.floor(rand() * numColors);
    }
  return layout;
}

// YENİ: kemer/köprü — ortada asılı yapı, kenarlar boş (düşüş için ideal)
function genArch(rows, numColors, seed) {
  const layout = emptyLayout();
  const rand = rng(seed);
  for (let r = 0; r < rows; r++) {
    const inset = r; // aşağı indikçe daralan kenar boşluğu
    for (let c = 0; c < COLS; c++) {
      if (!isValid(r, c)) continue;
      if (c >= inset && c < COLS - inset) layout[r][c] = Math.floor(rand() * numColors);
    }
  }
  return layout;
}

const LAYOUT_FNS = {
  full: (p) => genFull(p.rows, p.numColors, p.seed),
  pyramid: (p) => genPyramid(p.rows, p.numColors, p.seed),
  inv_pyramid: (p) => genInvPyramid(p.rows, p.numColors, p.seed),
  diamond: (p) => genDiamond(p.numColors, p.seed),
  stripes: (p) => genStripes(p.rows, p.numColors, p.seed),
  columns: (p) => genColumns(p.rows, p.numColors, p.seed),
  checker: (p) => genChecker(p.rows, p.numColors, p.seed),
  random: (p) => genRandom(p.rows, p.numColors, 0.6, p.seed),
  gaps: (p) => genGaps(p.rows, p.numColors, p.seed),
  arch: (p) => genArch(p.rows, p.numColors, p.seed),
};

// === Özel balon yerleştirme ===
// Dolu hücrelerden deterministik olarak seçip özel'e çevirir.
// Taşlar üst satıra (0) konmaz ki renkler temizlenince koparıp düşebilsin.
function placeSpecials(layout, plan, seed) {
  const specials = emptyLayout();
  const rand = rng(seed * 7 + 13);

  // Dolu hücrelerin listesi
  const filled = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      if (layout[r][c] !== null) filled.push({ r, c });

  if (filled.length === 0) return specials;

  // Fisher-Yates (deterministik) karıştır
  for (let i = filled.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [filled[i], filled[j]] = [filled[j], filled[i]];
  }

  let idx = 0;
  const take = (n, predicate) => {
    const out = [];
    let scanned = 0;
    while (out.length < n && idx < filled.length && scanned < filled.length) {
      const cell = filled[idx];
      scanned++;
      if (!predicate || predicate(cell)) {
        out.push(cell);
        idx++;
      } else {
        // uygun değilse sona at, idx ilerlet
        idx++;
      }
    }
    return out;
  };

  // Bomba: renkli kalır (layout korunur), bayrak konur
  for (const { r, c } of take(plan.bomb || 0)) {
    if (specials[r][c] === null) specials[r][c] = 'bomb';
  }
  // Joker: rengi siler, her renge uyar
  for (const { r, c } of take(plan.rainbow || 0, (cell) => specials[cell.r][cell.c] === null)) {
    specials[r][c] = 'rainbow';
    layout[r][c] = null; // joker'in temel rengi yok
  }
  // Taş: rengi siler, engel. Üst 1 satıra koyma.
  for (const { r, c } of take(plan.stone || 0, (cell) => cell.r >= 1 && specials[cell.r][cell.c] === null)) {
    specials[r][c] = 'stone';
    layout[r][c] = null;
  }

  return specials;
}

// === Seviye parametreleri (zorluk eğrisi v2) ===

function getLevelParams(level) {
  // --- renk sayısı ---
  let numColors;
  if (level <= 5) numColors = 3;
  else if (level <= 12) numColors = 3 + (level % 2 === 0 ? 1 : 0); // 3-4 dalgalı
  else if (level <= 60) numColors = 4;
  else if (level <= 120) numColors = (level % 3 === 0) ? 5 : 4;
  else numColors = 5;

  // --- satır sayısı (üstten doluluk) ---
  // İlk seviyelerde düşük yoğunluk (ısınma), kademeli artış.
  let rows;
  if (level <= 4) rows = 4;
  else if (level <= 12) rows = 5;
  else if (level <= 25) rows = 6;
  else if (level <= 60) rows = 6 + Math.floor((level - 25) / 18); // 6-7
  else if (level <= 150) rows = 8;
  else rows = 9;

  // --- atış sayısı (SIKILAŞTIRILDI) ---
  // Hedef: ilk seviyelerde bile balon>atış olsun (gerilim hisset).
  let shots;
  if (level <= 5) shots = 22 - Math.floor((level - 1) / 2);            // 22-20
  else if (level <= 15) shots = 22 - Math.floor((level - 5) / 3);      // 22-19
  else if (level <= 40) shots = 20 - Math.floor((level - 15) / 8);     // 20-17
  else if (level <= 90) shots = 18 - Math.floor((level - 40) / 14);    // 18-14
  else if (level <= 160) shots = 15 - Math.floor((level - 90) / 20);   // 15-12
  else if (level <= 240) shots = 13 - Math.floor((level - 160) / 27);  // 13-10
  else shots = 11 - Math.floor((level - 240) / 30);                    // 11-9
  if (shots < 8) shots = 8;

  // --- layout tipi ---
  // İlk seviyelerde ŞEKİLLİ ve DÜŞÜŞ ÜRETEN, boşluk bırakan tipler
  // (sıkıcı düz "full" duvar veya yoğun "stripes" erken kullanılmaz).
  let layoutType;
  if (level <= 20) {
    layoutType = ['arch', 'pyramid', 'diamond', 'gaps', 'inv_pyramid', 'columns'][level % 6];
  } else if (level <= 45) {
    layoutType = ['gaps', 'pyramid', 'inv_pyramid', 'arch', 'diamond', 'columns', 'stripes'][level % 7];
  } else if (level <= 90) {
    layoutType = ['full', 'pyramid', 'inv_pyramid', 'arch', 'gaps', 'columns', 'diamond', 'stripes'][level % 8];
  } else if (level <= 180) {
    layoutType = ['full', 'pyramid', 'inv_pyramid', 'diamond', 'gaps', 'arch', 'columns', 'checker', 'stripes'][level % 9];
  } else {
    layoutType = ['full', 'pyramid', 'inv_pyramid', 'diamond', 'gaps', 'arch', 'columns', 'checker', 'stripes', 'random'][level % 10];
  }

  // --- özel balon planı (kademeli tanıtım) ---
  const plan = { bomb: 0, rainbow: 0, stone: 0 };
  // Bomba: seviye 6'dan itibaren
  if (level >= 6) plan.bomb = Math.min(4, 1 + Math.floor((level - 6) / 35));
  // Joker: seviye 9'dan itibaren (yardımcı, oyuncu lehine)
  if (level >= 9) plan.rainbow = Math.min(3, 1 + Math.floor((level - 9) / 50));
  // Taş: seviye 13'ten itibaren (engel, zorluk)
  if (level >= 13) plan.stone = Math.min(8, 1 + Math.floor((level - 13) / 18));
  // İlk tanıtım seviyelerinde tam olarak 1 tane göster (öğretici)
  if (level === 6 || level === 7 || level === 8) plan.bomb = 1;
  if (level === 9 || level === 10) { plan.rainbow = 1; plan.bomb = 0; }
  if (level === 13 || level === 14) { plan.stone = 1; plan.bomb = 0; plan.rainbow = 0; }

  const allColors = [0, 1, 2, 3, 4];
  const colors = allColors.slice(0, numColors);

  return { layoutType, numColors, rows, shots, colors, plan, seed: level * 17 + 31 };
}

function generateLayout(params) {
  const fn = LAYOUT_FNS[params.layoutType] || LAYOUT_FNS.full;
  return fn(params);
}

// === Public API ===
export function getBubbleLevelData(level) {
  if (level < 1) level = 1;

  const params = getLevelParams(level);
  const layout = generateLayout(params);
  const specials = placeSpecials(layout, params.plan, params.seed);

  return {
    level,
    layout,
    specials,
    colors: params.colors,
    shots: params.shots,
    layoutType: params.layoutType,
    objective: 'clear', // ileride: 'pop_color', 'drop_count' vb. için ayrılmış
  };
}

export function getTotalLevels() {
  return Number.MAX_SAFE_INTEGER;
}
