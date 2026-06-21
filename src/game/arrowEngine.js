// Ok Bulmacası motoru
// grid[r][c] = yön(0..7) | null ; wall[r][c] = bool
// Kaldırma MONOTONdur: ok silmek başka okun yolunu asla kapatmaz → soft-lock imkânsız.
// Tek kayıp kaynağı: yolu kapalı oka dokunmak (can gider).

import { DIRS, getArrowLevelData, getTotalArrowLevels } from './arrowLevels.js';
import { Storage } from '../utils/storage.js';

export class ArrowEngine {
  constructor() {
    this.level = 1;
    this.rows = 0;
    this.cols = 0;
    this.grid = [];
    this.wall = [];
    this.hearts = 5;
    this.maxHearts = 5;
    this.wrongTaps = 0;
    this.arrowsLeft = 0;
    this.win = false;
    this.fail = false;
    this.lastStars = 0;
    this.shape = '';
  }

  _newGrid(fill) {
    const g = [];
    for (let r = 0; r < this.rows; r++) g.push(new Array(this.cols).fill(fill));
    return g;
  }

  init(level = null) {
    if (level !== null) this.level = level;
    const data = getArrowLevelData(this.level);
    this.rows = data.rows;
    this.cols = data.cols;
    this.shape = data.shape;
    this.grid = this._newGrid(null);
    this.wall = this._newGrid(false);
    this.snakeIds = this._newGrid(null); // Yılan kimlikleri
    
    for (const w of data.walls) this.wall[w.r][w.c] = true;
    let count = 0;
    for (const cell of data.cells) {
      this.grid[cell.r][cell.c] = cell.dir;
      if (cell.snakeId) this.snakeIds[cell.r][cell.c] = cell.snakeId;
      count++;
    }
    this.arrowsLeft = count;
    this.maxHearts = data.hearts;
    this.hearts = data.hearts;
    this.wrongTaps = 0;
    this.win = false;
    this.fail = false;
    this.lastStars = 0;
    
    // Her hücre için hangi yılana ait olduğunu hesapla (Eski seviyeler/kayıtlar için)
    this._computeSnakeIds();
    this._computeBounds();
  }

  _computeBounds() {
    let minR = this.rows, maxR = -1, minC = this.cols, maxC = -1;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] !== null || this.wall[r][c]) {
          if (r < minR) minR = r;
          if (r > maxR) maxR = r;
          if (c < minC) minC = c;
          if (c > maxC) maxC = c;
        }
      }
    }
    if (minR > maxR) { // Eer tahta tamamen bosa
      this.activeMinR = 0; this.activeMaxR = Math.max(0, this.rows - 1);
      this.activeMinC = 0; this.activeMaxC = Math.max(0, this.cols - 1);
    } else {
      this.activeMinR = minR; this.activeMaxR = maxR;
      this.activeMinC = minC; this.activeMaxC = maxC;
    }
    this.activeRows = this.activeMaxR - this.activeMinR + 1;
    this.activeCols = this.activeMaxC - this.activeMinC + 1;
  }

  _computeSnakeIds() {
    let nextSnakeId = 1;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] !== null && this.snakeIds[r][c] === null) {
          const snake = this.getSnake(r, c);
          if (snake && snake.length > 0) {
            for (const seg of snake) {
              this.snakeIds[seg.r][seg.c] = nextSnakeId;
            }
            nextSnakeId++;
          }
        } else if (this.snakeIds[r][c] !== null) {
          nextSnakeId = Math.max(nextSnakeId, this.snakeIds[r][c] + 1);
        }
      }
    }
  }

  // (r,c)'deki okun yönündeki ışın kenara kadar temiz mi?
  isPathClear(r, c) {
    const d = this.grid[r][c];
    if (d === null) return false;
    const [dr, dc] = DIRS[d];
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
      if (this.wall[nr][nc]) return false;
      if (this.grid[nr][nc] !== null) return false;
      nr += dr; nc += dc;
    }
    return true;
  }

  // Bir hücrenin bağlı olduğu tüm yılan gövdesini (kuyruktan başa) bulur
  getSnake(r, c) {
    if (this.grid[r][c] === null) return null;
    const mySnakeId = this.snakeIds[r][c];
    
    // Geriye doğru kuyruğu bul
    let tailR = r, tailC = c;
    let foundPrev = true;
    const visitedTail = new Set([r + ',' + c]);
    
    while (foundPrev) {
      foundPrev = false;
      for (let i = 0; i < 8; i++) {
         const pr = tailR - DIRS[i][0];
         const pc = tailC - DIRS[i][1];
         if (pr >= 0 && pr < this.rows && pc >= 0 && pc < this.cols) {
            if (this.grid[pr][pc] === i && (!mySnakeId || this.snakeIds[pr][pc] === mySnakeId)) {
               const k = pr + ',' + pc;
               if (!visitedTail.has(k)) {
                 visitedTail.add(k);
                 tailR = pr; tailC = pc;
                 foundPrev = true;
                 break;
               }
            }
         }
      }
    }
    
    // Kuyruktan başa doğru tüm yılanı topla
    const snake = [];
    const visitedBody = new Set();
    let currR = tailR, currC = tailC;
    
    while (true) {
       const k = currR + ',' + currC;
       if (visitedBody.has(k)) break; // Döngü koruması
       visitedBody.add(k);
       
       const d = this.grid[currR][currC];
       snake.push({r: currR, c: currC, dir: d});
       const tr = currR + DIRS[d][0];
       const tc = currC + DIRS[d][1];
       // Hedef hücre tahtadaysa ve içinde yön varsa o yılanın devamıdır
       if (tr >= 0 && tr < this.rows && tc >= 0 && tc < this.cols && this.grid[tr][tc] !== null) {
          if (!mySnakeId || this.snakeIds[tr][tc] === mySnakeId) {
             currR = tr; currC = tc;
          } else {
             break; // Farklı bir yılana çarptı (T-junction)
          }
       } else {
          break; // Baş noktasına ulaştık
       }
    }
    return snake;
  }

  // Bir oka dokun. Artık sadece o oku değil, bağlandığı bütün yılanı uçurur.
  tapArrow(r, c) {
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return { removed: false, blocked: false };
    if (this.grid[r][c] === null) return { removed: false, blocked: false };

    const snake = this.getSnake(r, c);
    const head = snake[snake.length - 1];

    if (this.isPathClear(head.r, head.c)) {
      // Yılanın tamamını sil
      for (const seg of snake) {
        this.grid[seg.r][seg.c] = null;
        this.arrowsLeft--;
      }
      if (this.arrowsLeft <= 0) {
        this.win = true;
        this.lastStars = this._computeStars();
        this._recordStars(this.level, this.lastStars);
      }
      return { removed: true, blocked: false, snake: snake, heartsLeft: this.hearts, win: this.win, fail: false };
    } else {
      this.wrongTaps++;
      this.hearts--;
      if (this.hearts <= 0) {
        this.hearts = 0;
        this.fail = true;
      }
      return { removed: false, blocked: true, dir: this.grid[r][c], heartsLeft: this.hearts, win: false, fail: this.fail };
    }
  }

  // İpucu: Artık kaldırılabilir herhangi bir yılanın başını (veya bir hücresini) verir.
  getHint() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] !== null) {
          const snake = this.getSnake(r, c);
          const head = snake[snake.length - 1];
          if (this.isPathClear(head.r, head.c)) {
            return { r: head.r, c: head.c };
          }
        }
      }
    }
    return null;
  }

  // Reklamla can ekleme
  addHearts(n) {
    this.hearts += n;
    this.maxHearts = Math.max(this.maxHearts, this.hearts);
    if (this.hearts > 0) this.fail = false;
  }

  _computeStars() {
    if (this.wrongTaps === 0) return 3;
    if (this.wrongTaps <= 2) return 2;
    return 1;
  }

  _recordStars(level, stars) {
    try {
      const map = Storage.get('arrow_stars', {}) || {};
      if (!map[level] || stars > map[level]) {
        map[level] = stars;
        Storage.set('arrow_stars', map);
      }
    } catch (e) { /* yut */ }
  }

  getStars(level) {
    try {
      const map = Storage.get('arrow_stars', {}) || {};
      return map[level] || 0;
    } catch (e) { return 0; }
  }

  nextLevel() {
    if (this.level >= getTotalArrowLevels()) return;
    this.level++;
    this.init(this.level);
  }

  saveState() {
    if (this.win || this.fail) { this.clearSave(); return; }
    try {
      Storage.set('arrow_save', {
        level: this.level,
        rows: this.rows, cols: this.cols,
        grid: this.grid, wall: this.wall,
        snakeIds: this.snakeIds,
        hearts: this.hearts, maxHearts: this.maxHearts,
        wrongTaps: this.wrongTaps, arrowsLeft: this.arrowsLeft,
        shape: this.shape,
      });
    } catch (e) { /* yut */ }
  }

  loadState() {
    try {
      const s = Storage.get('arrow_save', null);
      if (!s || !s.grid || s.level !== this.level) return false;
      this.rows = s.rows; this.cols = s.cols;
      this.grid = s.grid; this.wall = s.wall;
      this.snakeIds = s.snakeIds || this._newGrid(null);
      this.hearts = s.hearts; this.maxHearts = s.maxHearts;
      this.wrongTaps = s.wrongTaps; this.arrowsLeft = s.arrowsLeft;
      this.shape = s.shape;
      this.win = false; this.fail = false;
      if (!s.snakeIds) this._computeSnakeIds();
      this._computeBounds();
      return true;
    } catch (e) { return false; }
  }

  clearSave() {
    try { Storage.remove('arrow_save'); } catch (e) { /* yut */ }
  }
}
