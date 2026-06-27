import { ALL_SHAPES_DATA } from './allShapes.js';

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

const ALLOWED_DIRS = [0, 2, 4, 6];

function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const sortedShapes = [...ALL_SHAPES_DATA].map(shape => {
  let count = 0;
  for(let r=0; r<shape.data.length; r++) {
    for(let c=0; c<shape.data[r].length; c++) {
      if(shape.data[r][c] === '1') count++;
    }
  }
  return { ...shape, blockCount: count };
}).sort((a, b) => a.blockCount - b.blockCount);

// Bir şekil `size` tahtaya tamsayı-ölçeklendiğinde oluşacak yaklaşık ok sayısı.
// scaleShapeToMask ile aynı ölçek mantığını kullanır ama BFS yapmadan (seçim için ucuz tahmin).
function estimateScaledArrows(shape, size) {
  const maskR = shape.data.length;
  const maskC = shape.data[0].length;
  const targetW = Math.floor(size * 0.95);
  const targetH = Math.floor(size * 0.95);
  let scale = Math.min(targetH / maskR, targetW / maskC);
  if (scale < 1) scale = 1;
  else scale = Math.floor(scale);
  const arrows = shape.blockCount * scale * scale;
  return Math.max(1, Math.round(arrows));
}

function scaleShapeToMask(shape, size) {
  const maskRows = shape.data;
  const maskR = maskRows.length;
  const maskC = maskRows[0].length;
  
  const targetWidth = Math.floor(size * 0.95);
  const targetHeight = Math.floor(size * 0.95);
  
  let scale = Math.min(targetHeight / maskR, targetWidth / maskC);
  
  // PIXEL ART FIX: Never shrink to avoid distorting the shapes
  if (scale < 1) scale = 1;
  else scale = Math.floor(scale);
  
  const actualW = Math.floor(maskC * scale);
  const actualH = Math.floor(maskR * scale);
  
  // PIXEL ART FIX: Expand board if the shape doesn't fit
  const finalSize = Math.max(size, actualW + 2, actualH + 2);
  const currentBoard = Array.from({length: finalSize}, () => new Array(finalSize).fill(0));
  
  const startR = Math.floor((finalSize - actualH) / 2);
  const startC = Math.floor((finalSize - actualW) / 2);
  
  for (let tr = 0; tr < finalSize; tr++) {
    for (let tc = 0; tc < finalSize; tc++) {
      if (tr >= startR && tr < startR + actualH && tc >= startC && tc < startC + actualW) {
        const sr = Math.floor((tr - startR) / scale);
        const sc = Math.floor((tc - startC) / scale);
        if (sr >= 0 && sr < maskR && sc >= 0 && sc < maskC) {
          if (maskRows[sr][sc] === '1') {
            currentBoard[tr][tc] = 1;
          }
        }
      }
    }
  }

  // PIXEL ART FIX: Retain all parts of the shape (no island discarding)
  const finalMask = Array.from({length: finalSize}, () => new Array(finalSize).fill('0'));
  for (let r = 0; r < finalSize; r++) {
    for (let c = 0; c < finalSize; c++) {
      if (currentBoard[r][c] === 1) finalMask[r][c] = '1';
    }
  }
  
  return {
    mask: finalMask.map(row => row.join('')),
    finalSize: finalSize
  };
}

export function generateEndlessLevel(levelNum) {
  const rng = mulberry32(levelNum + 999);

  // --- PÜRÜZSÜZ ZORLUK ---
  // Eski sistem şekli ham "yüzdelik" ile seçiyordu; şekil kütüphanesinin blok-sayısı
  // dağılımı çarpık olduğundan komşu seviyeler vahşice zıplıyor (Sv30=96 ok, Sv50=34 ok) ve
  // Daha yoğun bir labirent ve kilit yapısı için başlangıç boyutu artırıldı
  let size = Math.min(26, 14 + Math.floor(Math.sqrt(levelNum) * 1.3));
  let shape;

  if (levelNum <= 200) {
    // İlk seviyelerde çok daha fazla ok (35-40'tan başlar)
    const targetArrows = 35 + Math.floor(levelNum * 3.5);
    const scored = sortedShapes.map(s => {
      const est = estimateScaledArrows(s, size);
      return { shape: s, diff: Math.abs(est - targetArrows) };
    }).sort((a, b) => a.diff - b.diff);
    
    const pool = scored.slice(0, 6);
    shape = pool[Math.floor(rng() * pool.length)].shape;
  } else {
    // Sonsuz modda (rastgele devasa levelNum) veya ileri seviyelerde 
    // her şeklin çıkabilmesi için tam rastgele seçim yapıyoruz.
    shape = sortedShapes[Math.floor(rng() * sortedShapes.length)];
  }

  const scaledData = scaleShapeToMask(shape, size);
  const mask = scaledData.mask;
  size = scaledData.finalSize;
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
      
      for(const d of ALLOWED_DIRS) {
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
      console.error('CRITICAL ERROR: FORWARD RAYCASTING STUCK! Math says this is impossible! Remaining:', remainingSet.size);
      return { level: levelNum, rows: 8, cols: 8, cells: [{r: 4, c: 4, dir: 2, snakeId: 1}], shape: 'Hata', walls: [], hearts: levelNum <= 20 ? 3 : (levelNum <= 50 ? 4 : 5), mirror: false, allowDiagonals: false };
    }
    
    candidates.sort((a, b) => b.score - a.score);
    const topScore = candidates[0].score;
    const topCandidates = candidates.filter(c => c.score >= topScore - 1);
    const chosen = topCandidates[Math.floor(rng() * topCandidates.length)];

    // Labirent hissi için dinamik yılan uzunlukları (tahta boyutuna orantılı)
    const minLen = Math.max(3, Math.floor(size / 4));
    const maxLen = Math.floor(size * 0.70);
    
    // %80 ihtimalle tahta boyutuna orantılı uzun yılan, %20 ihtimalle kısa bağlayıcı yılan (2-4 blok)
    let snakeLen = rng() < 0.80 
      ? (minLen + Math.floor(rng() * (maxLen - minLen + 1))) 
      : (2 + Math.floor(rng() * 3));
    
    let currR = chosen.r, currC = chosen.c;
    
    remainingSet.delete(currR + ',' + currC);
    remainingBoard[currR][currC] = 0;
    removedBoard[currR][currC] = 1;
    cells.push({ r: currR, c: currC, dir: chosen.d, snakeId: nextSnakeId });
    
    for(let i=1; i<snakeLen; i++) {
      let adjCandidates = [];
      for(let d=0; d<ALLOWED_DIRS.length; d++) {
        let dirIdx = ALLOWED_DIRS[d];
        let nr = currR - DIRS[dirIdx][0];
        let nc = currC - DIRS[dirIdx][1];
        if(remainingSet.has(nr + ',' + nc)) {
          adjCandidates.push({r: nr, c: nc, dir: dirIdx});
        }
      }
      
      if(adjCandidates.length === 0) break;
      
      let nextTail = adjCandidates[Math.floor(rng() * adjCandidates.length)];
      currR = nextTail.r;
      currC = nextTail.c;
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
    hearts: levelNum <= 20 ? 3 : (levelNum <= 50 ? 4 : 5),
    mirror: false,
    allowDiagonals: false
  };
}
