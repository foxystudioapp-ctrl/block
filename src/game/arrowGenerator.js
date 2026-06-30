import { CURATED_SHAPES } from './curatedShapes.js';

const DIRS = [
  [-1, 0], // 0: K
  [-1, 1], // 1: KD
  [0, 1],  // 2: D
  [1, 1],  // 3: GD
  [1, 0],  // 4: G
  [1, -1], // 5: GB
  [0, -1], // 6: B
  [-1, -1] // 7: KB
];

// Oklar YALNIZ ana yönlerde (K/D/G/B). Çapraz oklar tamamen kaldırıldı (kullanıcı isteği).
const CARDINAL = [0, 2, 4, 6];

function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// YÜKSEK ÇÖZÜNÜRLÜKLÜ KÜRATÖRLÜ ŞEKİLLER (curatedShapes.js).
// İlk N (=CURATED_ORDER.length, şu an 162): sırayla, dönüşümsüz.
// Sonrası: aynı şekiller "tur (lap)" mantığıyla AYNA/DÖNDÜRME varyasyonlarıyla yeniden
// kullanılır → her bölüm yüksek çözünürlüklü kalır (eski 6x6 bulanık havuz artık YOK),
// ama her tur görselleri tazeler. Tema akışı her turda korunur → temalı "dünyalar".
const CURATED_ORDER = CURATED_SHAPES;

// --- Maske dönüşümleri (tanınabilirliği koruyan varyasyon üretimi) ---
function hMirror(d) { return d.map(r => r.split('').reverse().join('')); }
function vMirror(d) { return [...d].reverse(); }
function rot90(d) {
  const rows = d.length, cols = d[0].length, out = [];
  for (let c = 0; c < cols; c++) {
    let row = '';
    for (let r = rows - 1; r >= 0; r--) row += d[r][c];
    out.push(row);
  }
  return out;
}
function rot180(d) { return hMirror(vMirror(d)); }
function rot270(d) { return rot90(rot180(d)); }
// Her "tur" farklı bir dönüşüm kullanır (162 şekil × 6 varyasyon = 972 farklı tahta).
const TRANSFORMS = [
  d => d,          // 0: orijinal
  d => hMirror(d), // 1: yatay ayna
  d => rot90(d),   // 2: 90°
  d => rot180(d),  // 3: 180°
  d => vMirror(d), // 4: dikey ayna
  d => rot270(d),  // 5: 270°
];

// Verilen bölüm için yüksek çözünürlüklü şekli (61+ için dönüştürülmüş) seç.
function pickCuratedShape(levelNum) {
  const idx = (levelNum - 1) % CURATED_ORDER.length;
  const lap = Math.floor((levelNum - 1) / CURATED_ORDER.length);
  const base = CURATED_ORDER[idx];
  const tf = TRANSFORMS[lap % TRANSFORMS.length];
  return { name: base.name, data: tf(base.data) };
}

// Aktif (şekil) alan bu boyutu aşmasın → hücreler ~18px kalır (tappability korunur).
const TAP_CAP = 20;

// Seviyeye göre HEDEF ok sayısı (pürüzsüz artar). Tahta boyutu artık bu hedefe göre
// dinamik seçilir → seyrek/dolu şekiller arasındaki ok-sayısı uçurumu daralır.
function targetArrows(levelNum) {
  return Math.min(120, 30 + Math.floor(Math.sqrt(levelNum) * 9));
}

function blockCountOf(mask) {
  let b = 0;
  for (const row of mask) for (const ch of row) if (ch === '1') b++;
  return b;
}

// Şekli, ok sayısını HEDEFE en yakın getirecek tamsayı ölçekle büyütür.
// Ölçek, aktif alan TAP_CAP'i aşmayacak biçimde sınırlanır (tappability).
// Seyrek şekiller daha çok ölçeklenip hedefe yaklaşır; dolu şekiller scale 1'de kalır.
function scaleShapeToTarget(shape, target, maximize) {
  const maskRows = shape.data;
  const maskR = maskRows.length;
  const maskC = maskRows[0].length;
  const dim = Math.max(maskR, maskC);
  const B = blockCountOf(maskRows);

  const maxScale = Math.max(1, Math.floor(TAP_CAP / dim));
  let scale;
  if (maximize) {
    // Endless: tappability cap'i içinde EN BÜYÜK ölçek → en dolu/zor tahta.
    scale = maxScale;
  } else {
    // Macera: ok sayısını HEDEFE en yakın getiren ölçek → dengeli ilerleme.
    scale = 1; let bestDiff = Infinity;
    for (let s = 1; s <= maxScale; s++) {
      const diff = Math.abs(B * s * s - target);
      if (diff < bestDiff) { bestDiff = diff; scale = s; }
    }
  }

  const actualW = maskC * scale;
  const actualH = maskR * scale;
  const finalSize = Math.max(actualW, actualH) + 2; // şekle oturan kare tahta + ufak kenar
  const board = Array.from({ length: finalSize }, () => new Array(finalSize).fill('0'));

  const startR = Math.floor((finalSize - actualH) / 2);
  const startC = Math.floor((finalSize - actualW) / 2);
  for (let tr = 0; tr < actualH; tr++) {
    for (let tc = 0; tc < actualW; tc++) {
      const sr = Math.floor(tr / scale);
      const sc = Math.floor(tc / scale);
      if (maskRows[sr][sc] === '1') board[startR + tr][startC + tc] = '1';
    }
  }

  return { mask: board.map(r => r.join('')), finalSize };
}

export function generateEndlessLevel(levelNum, dense = false) {
  const rng = mulberry32(levelNum + 999);

  // --- DİNAMİK ZORLUK ---
  // Şekil: HER seviyede yüksek çözünürlüklü küratörlü set (61+ tur/dönüşüm varyasyonu).
  // Tahta boyutu artık SABİT bir formülle değil, HEDEF ok sayısına göre dinamik seçilir:
  // seyrek şekil daha çok ölçeklenir (daha çok ok), dolu şekil scale 1'de kalır → ok-sayısı
  // seviye boyunca daha dengeli artar. Aktif alan TAP_CAP(20) ile sınırlı → hücreler ~18px.
  const shape = pickCuratedShape(levelNum);

  const scaledData = scaleShapeToTarget(shape, targetArrows(levelNum), dense);
  const mask = scaledData.mask;
  let size = scaledData.finalSize;
  let shapeName = shape.name;
  
  const remainingBoard = Array.from({length: size}, () => new Array(size).fill(0));
  const removedBoard = Array.from({length: size}, () => new Array(size).fill(0));
  const remainingSet = new Set();
  
  for(let r = 0; r < size; r++) {
    for(let c = 0; c < size; c++) {
      if(mask[r][c] === '1') {
        remainingSet.add(r + ',' + c);
        remainingBoard[r][c] = 1;
      }
    }
  }
  
  const cells = [];
  let nextSnakeId = 1;
  
  while(remainingSet.size > 0) {
    const candidates = [];
    
    for(const pos of remainingSet) {
      const [r, c] = pos.split(',').map(Number);
      
      for(const d of CARDINAL) {
        const [dr, dc] = DIRS[d];
        let nr = r + dr, nc = c + dc;
        let hitsRemaining = false;
        let removedHits = 0;
        
        while(nr >= 0 && nr < size && nc >= 0 && nc < size) {
          if(remainingBoard[nr][nc] === 1) { 
            hitsRemaining = true; 
            break; 
          }
          if(removedBoard[nr][nc] === 1) {
            removedHits++;
          }
          nr += dr; nc += dc;
        }
        
        if(!hitsRemaining) {
          candidates.push({ r, c, d, score: removedHits });
        }
      }
    }
    
    if(candidates.length === 0) {
      // Yalnız ana yönlerle bu dal matematiksel olarak ulaşılamaz (en üstteki kalan
      // hücrenin Kuzey ışını daima temizdir). Yine de savunma: oyuncuya "Hata" başlıklı
      // bozuk tahta yerine GEÇERLİ adlı, küçük, garanti çözülebilir bir tahta döndür.
      console.warn('Arrow gen beklenmedik takılma; güvenli fallback. remaining=', remainingSet.size);
      return { level: levelNum, rows: 8, cols: 8, cells: [{ r: 4, c: 4, dir: 2, snakeId: 1 }], shape: shapeName, walls: [], hearts: 5, mirror: false, allowDiagonals: false };
    }
    
    candidates.sort((a, b) => b.score - a.score);
    const topScore = candidates[0].score;
    const topCandidates = candidates.filter(c => c.score >= topScore - 1);
    const chosen = topCandidates[Math.floor(rng() * topCandidates.length)];

    // Yılan uzunluğu (tahta boyutuna orantılı). Kıvrımlı yollar için biraz daha uzun olabilir.
    const minLen = Math.max(3, Math.floor(size / 4));
    const maxLen = Math.floor(size * 0.75);
    const snakeLen = rng() < 0.82
      ? (minLen + Math.floor(rng() * (maxLen - minLen + 1)))
      : (2 + Math.floor(rng() * 3));

    let currR = chosen.r, currC = chosen.c;
    let prevDir = chosen.d; // son segmentin yönü (kıvrım/dönüş tercihi için)

    remainingSet.delete(currR + ',' + currC);
    remainingBoard[currR][currC] = 0;
    removedBoard[currR][currC] = 1;
    cells.push({ r: currR, c: currC, dir: chosen.d, snakeId: nextSnakeId });

    for(let i=1; i<snakeLen; i++) {
      let adjCandidates = [];
      for(let d=0; d<CARDINAL.length; d++) {
        let dirIdx = CARDINAL[d];
        let nr = currR - DIRS[dirIdx][0];
        let nc = currC - DIRS[dirIdx][1];
        if(remainingSet.has(nr + ',' + nc)) {
          adjCandidates.push({r: nr, c: nc, dir: dirIdx});
        }
      }

      if(adjCandidates.length === 0) break;

      // LABİRENT / KİLİTTAŞI: mümkünse YÖN DEĞİŞTİR → yılanlar kıvrılır, birbirine
      // örülerek kilitlenir (düz uzun çubuklar yerine bükümlü, iç içe geçen yollar).
      const turns = adjCandidates.filter(a => a.dir !== prevDir);
      const pool = (turns.length > 0 && rng() < 0.7) ? turns : adjCandidates;

      const nextTail = pool[Math.floor(rng() * pool.length)];
      currR = nextTail.r;
      currC = nextTail.c;
      prevDir = nextTail.dir;
      remainingSet.delete(currR + ',' + currC);
      remainingBoard[currR][currC] = 0;
      removedBoard[currR][currC] = 1;
      cells.push({ r: currR, c: currC, dir: nextTail.dir, snakeId: nextSnakeId });
    }

    nextSnakeId++;
  }
  
  return {
    level: levelNum,
    rows: size,
    cols: size,
    cells: cells,
    shape: shapeName,
    walls: [],
    // Daha cömert can: yanlış-dokunuş toleransıyla birlikte erken oyunu adil tutar.
    hearts: levelNum <= 40 ? 5 : 6,
    mirror: false,
    allowDiagonals: false
  };
}
