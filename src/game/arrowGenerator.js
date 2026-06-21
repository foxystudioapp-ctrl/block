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

function scaleShapeToMask(shape, size) {
  const maskRows = shape.data;
  const maskR = maskRows.length;
  const maskC = maskRows[0].length;
  const currentBoard = Array.from({length: size}, () => new Array(size).fill(0));
  
  const targetWidth = Math.floor(size * 0.95);
  const targetHeight = Math.floor(size * 0.95);
  
  let scale = Math.min(targetHeight / maskR, targetWidth / maskC);
  
  // PIXEL ART FIX: Use integer scaling to avoid distorting the shapes
  if (scale >= 1) {
    scale = Math.floor(scale);
  }
  
  const actualW = Math.floor(maskC * scale);
  const actualH = Math.floor(maskR * scale);
  
  const startR = Math.floor((size - actualH) / 2);
  const startC = Math.floor((size - actualW) / 2);
  
  for (let tr = 0; tr < size; tr++) {
    for (let tc = 0; tc < size; tc++) {
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

  const visitedForIslands = Array.from({length: size}, () => new Array(size).fill(false));
  let maxIslandSize = 0;
  let maxIslandCoords = [];
  
  for(let i=0; i<size; i++){
    for(let j=0; j<size; j++){
      if(currentBoard[i][j] === 1 && !visitedForIslands[i][j]) {
        let sizeOfIsland = 0;
        let coords = [];
        let q = [[i,j]];
        visitedForIslands[i][j] = true;
        while(q.length > 0) {
          let [cr, cc] = q.shift();
          sizeOfIsland++;
          coords.push([cr,cc]);
          for(let [dr,dc] of [[0,1],[1,0],[0,-1],[-1,0]]) {
            let nr = cr+dr, nc = cc+dc;
            if(nr>=0 && nr<size && nc>=0 && nc<size && currentBoard[nr][nc]===1 && !visitedForIslands[nr][nc]) {
              visitedForIslands[nr][nc] = true;
              q.push([nr,nc]);
            }
          }
        }
        if(sizeOfIsland > maxIslandSize) {
          maxIslandSize = sizeOfIsland;
          maxIslandCoords = coords;
        }
      }
    }
  }
  
  const finalMask = Array.from({length: size}, () => new Array(size).fill('0'));
  maxIslandCoords.forEach(([r,c]) => { finalMask[r][c] = '1'; });
  
  return finalMask.map(row => row.join(''));
}

export function generateEndlessLevel(levelNum) {
  const rng = mulberry32(levelNum + 999);
  
  let size = 8;
  let shape;
  
  if (levelNum <= 15) {
    size = 10;
    const minPercent = 0.1;
    const maxPercent = 0.3;
    const percent = minPercent + (levelNum / 15) * (maxPercent - minPercent);
    const index = Math.floor(percent * sortedShapes.length);
    shape = sortedShapes[Math.min(index, sortedShapes.length - 1)];
  } else if (levelNum <= 50) {
    size = 12 + Math.floor((levelNum - 15) / 10);
    const percent = 0.3 + ((levelNum - 15) / 35) * 0.3;
    const index = Math.floor(percent * sortedShapes.length);
    shape = sortedShapes[Math.min(index, sortedShapes.length - 1)];
  } else if (levelNum <= 100) {
    size = 16 + Math.floor((levelNum - 50) / 15);
    const percent = 0.6 + ((levelNum - 50) / 50) * 0.3;
    const index = Math.floor(percent * sortedShapes.length);
    shape = sortedShapes[Math.min(index, sortedShapes.length - 1)];
  } else {
    size = 18 + Math.floor(rng() * 8);
    shape = sortedShapes[Math.floor(rng() * sortedShapes.length)];
  }
  
  if (size > 24) size = 24;

  let mask = scaleShapeToMask(shape, size);
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
    
    let snakeLen = rng() < 0.7 ? (4 + Math.floor(rng() * 3)) : 1;
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
