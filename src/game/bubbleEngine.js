// Bubble Shooter Engine (v2: özel balonlar + yıldız)
// Hex offset grid (odd-r layout: tek satırlar 0.5 hücre sağa kaydırılmış)
//
// Hücre modeli:
//   grid[r][c] = renk string ('red'..) | 'stone' | 'rainbow' | null
//   bomb[r][c] = true ise o hücre bir bombadır (grid'de gerçek rengi durur)
//
// Özel balonlar:
//   stone   — renk eşleşmesiyle patlamaz; sadece tavandan koparsa düşer veya
//             bomba patlamasıyla yok olur.
//   rainbow — joker; herhangi bir rengin grubuna dahil olur (eşleşmeyi tamamlar).
//   bomb    — eşleşmeyle patlayınca 6 komşusunu da yok eder (zincirleme).

import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { Storage } from '../utils/storage.js';
import { getBubbleLevelData, getTotalLevels } from './bubbleLevels.js';
import { PlayerState } from '../state/playerState.js';
import { Toast } from '../components/toast.js';
import { t } from '../utils/i18n.js';

const COLORS = ['red', 'blue', 'green', 'yellow', 'purple'];
const COLOR_SET = new Set(COLORS);

const EVEN_NEIGHBORS = [[-1,-1],[-1,0],[0,-1],[0,1],[1,-1],[1,0]];
const ODD_NEIGHBORS  = [[-1,0],[-1,1],[0,-1],[0,1],[1,0],[1,1]];

export class BubbleEngine {
  constructor(mode = 'endless') {
    this.mode = mode;
    this.cols = 9;
    this.rows = 12;
    this.bubbleRadius = 20;
    this.colors = [...COLORS];
    this.grid = [];
    this.bomb = [];            // YENİ: bomba bayrağı matrisi
    this.score = 0;
    this.shotsLeft = Infinity;
    this.maxShots = Infinity;
    this.gameOver = false;
    this.levelComplete = false;
    this.level = 1;
    this.comboCount = 0;
    this.hammerCount = 0;
    this.lastStars = 0;        // YENİ: son tamamlanan seviyenin yıldızı

    this.currentBubble = this._randomColor();
    this.nextBubble = this._randomColor();

    this.bestScore = Storage.get('bubble_best_score', 0);

    this.shotsBeforeNewRow = 6;
    this.shotsSinceLastRow = 0;
    this.boardParity = 0;
    this.justAddedRow = false;
  }

  _newGrid(fill = null) {
    const g = [];
    for (let r = 0; r < this.rows; r++) g.push(new Array(this.cols).fill(fill));
    return g;
  }

  init(level = null) {
    this.grid = this._newGrid(null);
    this.bomb = this._newGrid(false);
    this.score = 0;
    this.gameOver = false;
    this.levelComplete = false;
    this.shotsSinceLastRow = 0;
    this.boardParity = 0;
    this.justAddedRow = false;
    this.comboCount = 0;
    this.lastStars = 0;

    if (this.mode === 'endless') {
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < this.cols; c++) {
          if ((r + this.boardParity) % 2 === 1 && c === this.cols - 1) continue;
          this.grid[r][c] = this._randomColor();
        }
      }
      this.shotsLeft = Infinity;
      this.maxShots = Infinity;
    } else if (this.mode === 'adventure') {
      if (level !== null) this.level = level;
      const data = getBubbleLevelData(this.level);
      this.colors = data.colors.map(i => COLORS[i]);
      this.shotsLeft = data.shots;
      this.maxShots = data.shots;
      const specials = data.specials || null;
      for (let r = 0; r < data.layout.length && r < this.rows; r++) {
        for (let c = 0; c < data.layout[r].length && c < this.cols; c++) {
          if ((r + this.boardParity) % 2 === 1 && c === this.cols - 1) continue;
          const sp = specials ? specials[r][c] : null;
          if (sp === 'stone') {
            this.grid[r][c] = 'stone';
          } else if (sp === 'rainbow') {
            this.grid[r][c] = 'rainbow';
          } else if (sp === 'bomb') {
            const ci = data.layout[r][c];
            this.grid[r][c] = (ci === null || ci === -1) ? this._randomColor() : COLORS[ci];
            this.bomb[r][c] = true;
          } else {
            const ci = data.layout[r][c];
            if (ci === null || ci === -1) continue;
            this.grid[r][c] = COLORS[ci];
          }
        }
      }
    }

    this.currentBubble = this._pickActiveColor();
    this.nextBubble = this._pickActiveColor();
  }

  _randomColor() {
    return this.colors[Math.floor(Math.random() * this.colors.length)];
  }

  // Sadece tahtada var olan GERÇEK renklerden seç (stone/rainbow hariç).
  _pickActiveColor() {
    const active = new Set();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const g = this.grid[r][c];
        if (g && COLOR_SET.has(g)) active.add(g);
      }
    }
    if (active.size === 0) return this._randomColor();
    const arr = [...active];
    return arr[Math.floor(Math.random() * arr.length)];
  }

  swapBubbles() {
    const temp = this.currentBubble;
    this.currentBubble = this.nextBubble;
    this.nextBubble = temp;
  }

  getPixelCenter(row, col, cellSize, offsetX = 0, offsetY = 0) {
    const radius = cellSize / 2;
    const isOdd = (row + this.boardParity) % 2 === 1;
    const x = col * cellSize + radius + (isOdd ? radius : 0) + offsetX;
    const y = row * cellSize * 0.866 + radius + offsetY;
    return { x, y };
  }

  pixelToCell(px, py, cellSize, offsetX = 0, offsetY = 0) {
    let best = { row: -1, col: -1, dist: Infinity };
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if ((r + this.boardParity) % 2 === 1 && c === this.cols - 1) continue;
        const { x, y } = this.getPixelCenter(r, c, cellSize, offsetX, offsetY);
        const d = Math.hypot(px - x, py - y);
        if (d < best.dist) best = { row: r, col: c, dist: d };
      }
    }
    return best;
  }

  getNeighbors(row, col) {
    const offsets = (row + this.boardParity) % 2 === 0 ? EVEN_NEIGHBORS : ODD_NEIGHBORS;
    const out = [];
    for (const [dr, dc] of offsets) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) continue;
      if ((nr + this.boardParity) % 2 === 1 && nc === this.cols - 1) continue;
      out.push({ row: nr, col: nc });
    }
    return out;
  }

  // BFS — aynı renk grubu. rainbow joker olarak gruba dahil olur.
  findConnectedSameColor(row, col) {
    const color = this.grid[row][col];
    if (!color || color === 'stone') return [];
    const seen = new Set();
    const key = (r, c) => r + ',' + c;
    const stack = [{ row, col }];
    const result = [];
    seen.add(key(row, col));
    while (stack.length) {
      const cur = stack.pop();
      result.push(cur);
      for (const n of this.getNeighbors(cur.row, cur.col)) {
        if (seen.has(key(n.row, n.col))) continue;
        const g = this.grid[n.row][n.col];
        // Eşleşme: aynı renk VEYA joker. (taş asla)
        if (g === color || g === 'rainbow') {
          seen.add(key(n.row, n.col));
          stack.push(n);
        }
      }
    }
    return result;
  }

  // Tavana (row 0) bağlı olmayan dolu hücreleri bul (stone/rainbow dahil)
  findFloatingBubbles() {
    const seen = new Set();
    const key = (r, c) => r + ',' + c;
    const stack = [];
    for (let c = 0; c < this.cols; c++) {
      if (this.grid[0][c]) { stack.push({ row: 0, col: c }); seen.add(key(0, c)); }
    }
    while (stack.length) {
      const cur = stack.pop();
      for (const n of this.getNeighbors(cur.row, cur.col)) {
        if (seen.has(key(n.row, n.col))) continue;
        if (this.grid[n.row][n.col] === null) continue;
        seen.add(key(n.row, n.col));
        stack.push(n);
      }
    }
    const floating = [];
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.grid[r][c] && !seen.has(key(r, c))) floating.push({ row: r, col: c });
    return floating;
  }

  // Balonu yapıştır → eşleştir → bomba zinciri → düşür
  attachBubble(row, col, color) {
    const empty = { popped: [], floated: [], scoreGained: 0, multiplier: 1, bombs: 0, stones: 0 };
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return empty;

    // Geçersiz hücre (odd satır son sütun): üzerine YAZMA, en yakın boş komşuya it
    if ((row + this.boardParity) % 2 === 1 && col === this.cols - 1) {
      let placed = false;
      for (const n of this.getNeighbors(row, col)) {
        if (!this.grid[n.row][n.col]) { row = n.row; col = n.col; placed = true; break; }
      }
      if (!placed) { if (this.grid[row][col - 1]) return empty; col = col - 1; }
    }
    if (this.grid[row][col]) {
      // Hedef doluysa boş komşu ara (güvenlik)
      let placed = false;
      for (const n of this.getNeighbors(row, col)) {
        if (!this.grid[n.row][n.col]) { row = n.row; col = n.col; placed = true; break; }
      }
      if (!placed) return empty;
    }

    this.grid[row][col] = color;
    this.bomb[row][col] = false;

    const group = this.findConnectedSameColor(row, col);
    const popped = [];
    const floated = [];
    let scoreGained = 0;
    let multiplier = 1;
    let bombsDetonated = 0;
    let stonesCleared = 0;

    if (group.length >= 3) {
      this.comboCount++;
      multiplier = Math.min(this.comboCount, 5);

      // Silinecek hücre kümesi (grup + bomba patlamaları)
      const key = (r, c) => r + ',' + c;
      const removeSet = new Set();
      const removeList = [];
      const addCell = (r, c) => {
        const k = key(r, c);
        if (removeSet.has(k)) return;
        removeSet.add(k);
        removeList.push({ row: r, col: c });
      };
      for (const { row: r, col: c } of group) addCell(r, c);

      // Bomba zinciri: kümede bomba varsa komşularını da ekle (BFS)
      const bombQueue = [];
      for (const { row: r, col: c } of removeList) if (this.bomb[r][c]) bombQueue.push({ row: r, col: c });
      while (bombQueue.length) {
        const b = bombQueue.shift();
        bombsDetonated++;
        for (const n of this.getNeighbors(b.row, b.col)) {
          if (this.grid[n.row][n.col] === null) continue;
          const k = key(n.row, n.col);
          const wasBomb = this.bomb[n.row][n.col];
          const already = removeSet.has(k);
          addCell(n.row, n.col);
          if (wasBomb && !already) bombQueue.push({ row: n.row, col: n.col });
        }
      }

      // Sil + skorla
      for (const { row: r, col: c } of removeList) {
        const cellColor = this.grid[r][c];
        if (cellColor === 'stone') stonesCleared++;
        popped.push({ row: r, col: c, color: cellColor });
        this.grid[r][c] = null;
        this.bomb[r][c] = false;
      }
      scoreGained += popped.length * 10 * multiplier;
      scoreGained += bombsDetonated * 40 * multiplier;
      scoreGained += stonesCleared * 30 * multiplier;

      // Tavandan kopanları düşür
      const floatingPositions = this.findFloatingBubbles();
      for (const { row: r, col: c } of floatingPositions) {
        floated.push({ row: r, col: c, color: this.grid[r][c] });
        this.grid[r][c] = null;
        this.bomb[r][c] = false;
      }
      scoreGained += floated.length * 20 * multiplier;
    } else {
      this.comboCount = 0;
    }

    this.score += scoreGained;
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      Storage.set('bubble_best_score', this.bestScore);
    }

    return { popped, floated, scoreGained, multiplier, bombs: bombsDetonated, stones: stonesCleared };
  }

  advanceAfterShot() {
    this.justAddedRow = false;
    this.currentBubble = this.nextBubble;
    this.nextBubble = this._pickActiveColor();
    this.shotsSinceLastRow++;

    if (this.mode === 'endless') {
      if (this.shotsSinceLastRow >= this.shotsBeforeNewRow) {
        this.shotsSinceLastRow = 0;
        this._pushDownAndAddRow();
      }
      this._checkGameOver();
    } else if (this.mode === 'adventure') {
      if (this.shotsLeft !== Infinity) this.shotsLeft--;
      if (this._isBoardClear()) {
        this.levelComplete = true;
        if (this.shotsLeft > 0) this.score += this.shotsLeft * 50;
        if (this.score > this.bestScore) {
          this.bestScore = this.score;
          Storage.set('bubble_best_score', this.bestScore);
        }
        this.lastStars = this._computeStars();
        this._recordStars(this.level, this.lastStars);
        return;
      }
      this._checkGameOver();
      if (this.shotsLeft <= 0 && !this._isBoardClear()) {
        this.gameOver = true;
        Sounds.playSfx?.('game-over');
        Haptics.vibrate?.('game-over');
      }
    }
  }

  // Kalan atış oranına göre yıldız (skill bazlı, per-level tuning gerekmez)
  _computeStars() {
    if (this.maxShots === Infinity || this.maxShots <= 0) return 3;
    const ratio = this.shotsLeft / this.maxShots;
    if (ratio >= 0.40) return 3;
    if (ratio >= 0.18) return 2;
    return 1;
  }

  _recordStars(level, stars) {
    try {
      const map = Storage.get('bubble_stars', {}) || {};
      if (!map[level] || stars > map[level]) {
        map[level] = stars;
        Storage.set('bubble_stars', map);
      }
    } catch (e) { /* yut */ }
  }

  getStars(level) {
    try {
      const map = Storage.get('bubble_stars', {}) || {};
      return map[level] || 0;
    } catch (e) { return 0; }
  }

  _isBoardClear() {
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.grid[r][c]) return false;
    return true;
  }

  nextLevel() {
    if (this.mode !== 'adventure') return;
    if (this.level >= getTotalLevels()) return;
    this.level++;
    this.init(this.level);
  }

  _pushDownAndAddRow() {
    this.boardParity = 1 - this.boardParity;
    for (let r = this.rows - 1; r > 0; r--) {
      this.grid[r] = [...this.grid[r - 1]];
      this.bomb[r] = [...this.bomb[r - 1]];
    }
    this.grid[0] = new Array(this.cols).fill(null);
    this.bomb[0] = new Array(this.cols).fill(false);
    for (let c = 0; c < this.cols; c++) {
      if (this.boardParity % 2 === 1 && c === this.cols - 1) continue;
      this.grid[0][c] = this._randomColor();
    }
    this.justAddedRow = true;
  }

  _checkGameOver() {
    const dangerRow = this.rows - 2;
    for (let r = dangerRow; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.grid[r][c]) {
          this.gameOver = true;
          Sounds.playSfx?.('game-over');
          Haptics.vibrate?.('game-over');
          return;
        }
  }

  revive() {
    if (this.mode === 'adventure') {
      this.shotsLeft += 6;
      this.maxShots += 6;
    } else {
      for (let r = this.rows - 3; r < this.rows; r++) {
        if (r < 0) continue;
        for (let c = 0; c < this.cols; c++) { this.grid[r][c] = null; this.bomb[r][c] = false; }
      }
      const floating = this.findFloatingBubbles();
      for (const { row: r, col: c } of floating) { this.grid[r][c] = null; this.bomb[r][c] = false; }
    }
    this.gameOver = false;
    this.saveState();
    return true;
  }

  // ==================== PERSISTENCE ====================
  
  useHammer(row, col) {
    if (this.gameOver) return false;
    
    const costs = [50, 150, 300];
    if (this.hammerCount >= costs.length) {
      Toast.show(t('max_powerup_reached') || 'Maksimum çekiç hakkını doldurdun!', 'warning');
      return false;
    }

    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) return false;
    if (!this.grid[row][col]) return false;

    const cost = costs[this.hammerCount];
    const canUse = PlayerState.useDiamonds(cost);
    if (!canUse) {
      return 'insufficient_funds';
    }

    // Pop the bubble
    const poppedColor = this.grid[row][col];
    this.grid[row][col] = null;
    this.bomb[row][col] = false;
    this.hammerCount++;
    this.score += 50;

    // Check floating bubbles
    const floating = this.findFloatingBubbles();
    for (const { row: r, col: c } of floating) {
      this.grid[r][c] = null;
      this.bomb[r][c] = false;
      this.score += 20;
    }

    this.saveState();
    return { success: true, floating, poppedColor };
  }

  _saveKey() {
    return this.mode === 'endless' ? 'bubble_endless_save' : 'bubble_adventure_save';
  }

  saveState() {
    if (this.gameOver) return;
    try {
      Storage.setDebounced(this._saveKey(), {
        grid: this.grid,
        bomb: this.bomb,
        score: this.score,
        currentBubble: this.currentBubble,
        nextBubble: this.nextBubble,
        shotsSinceLastRow: this.shotsSinceLastRow,
        boardParity: this.boardParity,
        comboCount: this.comboCount,
          hammerCount: this.hammerCount,
      });
    } catch (e) { /* yut */ }
  }

  loadState() {
    try {
      const state = Storage.get(this._saveKey(), null);
      if (!state || !state.grid) return false;
      this.grid = state.grid;
      this.bomb = state.bomb || this._newGrid(false);
      this.score = state.score || 0;
      this.currentBubble = state.currentBubble || this._pickActiveColor();
      this.nextBubble = state.nextBubble || this._pickActiveColor();
      this.shotsSinceLastRow = state.shotsSinceLastRow || 0;
      this.boardParity = state.boardParity || 0;
      this.comboCount = state.comboCount || 0;
        this.hammerCount = state.hammerCount || 0;
      this.gameOver = false;
      this.justAddedRow = false;
      return true;
    } catch (e) {
      return false;
    }
  }

  clearSave() {
    try { Storage.remove(this._saveKey()); } catch (e) { /* ignore */ }
  }
}
