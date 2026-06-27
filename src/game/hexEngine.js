import { TaskState } from '../state/taskState.js';
import { PlayerState } from '../state/playerState.js';
import { Storage } from '../utils/storage.js';
import { hexShapes } from './shapes.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { Scoring } from './scoring.js';
import { t } from '../utils/i18n.js';
import { Toast } from '../components/toast.js';

export class HexEngine {
  constructor(radius = 4) {
    this.radius = radius; // 4 means center + 4 rings = 9 cells across
    this.board = new Map(); // key: "q,r", value: color string or null
    this.activePieces = [null, null, null];
    this.score = 0;
    this.bestScore = PlayerState.state.bestScoreHex;
    this.gameOver = false;
    this.comboCount = 0;
    this.clearEventCallback = null;
    this.history = []; // For undo
    this.undoCount = 0;
    
    this._initEmptyBoard();
  }

  _initEmptyBoard() {
    this.board.clear();
    for (let q = -this.radius; q <= this.radius; q++) {
      let r1 = Math.max(-this.radius, -q - this.radius);
      let r2 = Math.min(this.radius, -q + this.radius);
      for (let r = r1; r <= r2; r++) {
        this.board.set(`${q},${r}`, null);
      }
    }
  }

  initGame() {
    this._initEmptyBoard();
    this.score = 0;
    this.gameOver = false;
    this.comboCount = 0;
    this.history = [];
    this.undoCount = 0;
    this.spawnPieces();
    this.saveToLocalStorage();
  }

  isValidCell(q, r) {
    return this.board.has(`${q},${r}`);
  }

  spawnPieces() {
    for (let i = 0; i < 3; i++) {
      if (!this.activePieces[i]) {
        const randIndex = Math.floor(Math.random() * hexShapes.length);
        this.activePieces[i] = JSON.parse(JSON.stringify(hexShapes[randIndex]));
      }
    }
  }

  canPlace(piece, targetQ, targetR) {
    for (let i = 0; i < piece.cells.length; i++) {
      const cell = piece.cells[i];
      const q = targetQ + cell.q;
      const r = targetR + cell.r;
      
      // Check bounds
      if (!this.isValidCell(q, r)) return false;
      // Check collision
      if (this.board.get(`${q},${r}`) !== null) return false;
    }
    return true;
  }

  simulatePlacement(piece, targetQ, targetR) {
    if (!this.canPlace(piece, targetQ, targetR)) return [];

    // Clone board
    const tempBoard = new Map(this.board);
    
    // Place piece
    piece.cells.forEach(cell => {
      const q = targetQ + cell.q;
      const r = targetR + cell.r;
      tempBoard.set(`${q},${r}`, 'temp');
    });

    const linesToClear = [];

    // Axis 1: constant r
    for (let r = -this.radius; r <= this.radius; r++) {
      const lineCells = [];
      let isFull = true;
      let q1 = Math.max(-this.radius, -r - this.radius);
      let q2 = Math.min(this.radius, -r + this.radius);
      for (let q = q1; q <= q2; q++) {
        if (tempBoard.get(`${q},${r}`) === null) {
          isFull = false; break;
        }
        lineCells.push(`${q},${r}`);
      }
      if (isFull && lineCells.length > 0) linesToClear.push(lineCells);
    }

    // Axis 2: constant q
    for (let q = -this.radius; q <= this.radius; q++) {
      const lineCells = [];
      let isFull = true;
      let r1 = Math.max(-this.radius, -q - this.radius);
      let r2 = Math.min(this.radius, -q + this.radius);
      for (let r = r1; r <= r2; r++) {
        if (tempBoard.get(`${q},${r}`) === null) {
          isFull = false; break;
        }
        lineCells.push(`${q},${r}`);
      }
      if (isFull && lineCells.length > 0) linesToClear.push(lineCells);
    }

    // Axis 3: constant s (-q-r)
    for (let s = -this.radius; s <= this.radius; s++) {
      const lineCells = [];
      let isFull = true;
      let q1 = Math.max(-this.radius, -s - this.radius);
      let q2 = Math.min(this.radius, -s + this.radius);
      for (let q = q1; q <= q2; q++) {
        const r = -q - s;
        if (tempBoard.get(`${q},${r}`) === null) {
          isFull = false; break;
        }
        lineCells.push(`${q},${r}`);
      }
      if (isFull && lineCells.length > 0) linesToClear.push(lineCells);
    }

    const uniqueCellsToClear = new Set();
    linesToClear.forEach(line => {
      line.forEach(cell => uniqueCellsToClear.add(cell));
    });

    return Array.from(uniqueCellsToClear);
  }


  placePiece(trayIndex, targetQ, targetR) {
    const piece = this.activePieces[trayIndex];
    if (!piece) return false;
    if (!this.canPlace(piece, targetQ, targetR)) return false;

    // Save history for undo
    this._saveHistory();

    // Place blocks
    piece.cells.forEach(cell => {
      const q = targetQ + cell.q;
      const r = targetR + cell.r;
      this.board.set(`${q},${r}`, piece.color);
    });

    // Score for placement
    const blocksCount = piece.cells.length;
    this.score += blocksCount * 10;

    // Remove from tray
    this.activePieces[trayIndex] = null;

    Sounds.playSfx('block-place');
    Haptics.vibrate('block-place');

    // Check lines
    const clearedLines = this.checkAndClearLines();
    if (!clearedLines) {
      this.comboCount = 0;
    }

    // If all pieces used, spawn new ones
    if (this.activePieces.every(p => p === null)) {
      this.spawnPieces();
    }

    this.checkGameOver();

    // Update best score
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      PlayerState.updateBestScore('hex', this.bestScore);
    }

    this.saveToLocalStorage();
    return true;
  }

  checkAndClearLines() {
    // Hex grid has 3 axes: q, r, and s (s = -q-r)
    // We will collect all cells that belong to a full line
    const linesToClear = []; // Array of Set of "q,r" strings
    let clearedCount = 0;

    // Axis 1: constant r
    for (let r = -this.radius; r <= this.radius; r++) {
      const lineCells = [];
      let isFull = true;
      let q1 = Math.max(-this.radius, -r - this.radius);
      let q2 = Math.min(this.radius, -r + this.radius);
      
      for (let q = q1; q <= q2; q++) {
        if (this.board.get(`${q},${r}`) === null) {
          isFull = false;
          break;
        }
        lineCells.push(`${q},${r}`);
      }
      
      if (isFull && lineCells.length > 0) {
        linesToClear.push(lineCells);
      }
    }

    // Axis 2: constant q
    for (let q = -this.radius; q <= this.radius; q++) {
      const lineCells = [];
      let isFull = true;
      let r1 = Math.max(-this.radius, -q - this.radius);
      let r2 = Math.min(this.radius, -q + this.radius);
      
      for (let r = r1; r <= r2; r++) {
        if (this.board.get(`${q},${r}`) === null) {
          isFull = false;
          break;
        }
        lineCells.push(`${q},${r}`);
      }
      
      if (isFull && lineCells.length > 0) {
        linesToClear.push(lineCells);
      }
    }

    // Axis 3: constant s (-q-r)
    for (let s = -this.radius; s <= this.radius; s++) {
      const lineCells = [];
      let isFull = true;
      let q1 = Math.max(-this.radius, -s - this.radius);
      let q2 = Math.min(this.radius, -s + this.radius);
      
      for (let q = q1; q <= q2; q++) {
        const r = -q - s;
        if (this.board.get(`${q},${r}`) === null) {
          isFull = false;
          break;
        }
        lineCells.push(`${q},${r}`);
      }
      
      if (isFull && lineCells.length > 0) {
        linesToClear.push(lineCells);
      }
    }

    if (linesToClear.length > 0) {
      // Flatten unique cells to clear
      const uniqueCellsToClear = new Set();
      linesToClear.forEach(line => {
        line.forEach(cell => uniqueCellsToClear.add(cell));
      });

      // Clear them
      uniqueCellsToClear.forEach(cell => {
        this.board.set(cell, null);
      });

      clearedCount = linesToClear.length;
      
      // Calculate combo score
      this.comboCount++;
      const clearReward = Scoring.calculateClear(clearedCount, this.comboCount);

      this.score += clearReward.points;
      PlayerState.addDiamonds(clearReward.diamonds);
      PlayerState.addXp(clearReward.xp);
      TaskState.updateProgress('hex_lines', clearedCount);
      TaskState.updateProgress('score', clearReward.points);

      // Play sounds based on combo
      Sounds.playSfx('x2-combo', { combo: this.comboCount || 1 });

      if (this.comboCount > 1) {
        Haptics.vibrate('combo');
      } else {
        Haptics.vibrate('line-clear');
      }

      // Notify UI
      if (this.clearEventCallback) {
        this.clearEventCallback({
          lines: clearedCount,
          cells: Array.from(uniqueCellsToClear),
          points: clearReward.points,
          comboText: clearReward.comboText
        });
      }
      return true;
    }
    return false;
  }

  checkGameOver() {
    let canPlaceAny = false;
    const piecesToCheck = this.activePieces.filter(p => p !== null);
    
    if (piecesToCheck.length === 0) return; // Will spawn new ones

    // Try to place each remaining piece everywhere
    for (let i = 0; i < piecesToCheck.length; i++) {
      const piece = piecesToCheck[i];
      for (let q = -this.radius; q <= this.radius; q++) {
        let r1 = Math.max(-this.radius, -q - this.radius);
        let r2 = Math.min(this.radius, -q + this.radius);
        for (let r = r1; r <= r2; r++) {
          if (this.canPlace(piece, q, r)) {
            canPlaceAny = true;
            break;
          }
        }
        if (canPlaceAny) break;
      }
      if (canPlaceAny) break;
    }

    if (!canPlaceAny) {
      this.gameOver = true;
      Sounds.playSfx('game-over');
      Haptics.vibrate('game-over');
    }
  }

  revive() {
    // Collect all filled cells
    const filled = [];
    for (const [coord, color] of this.board.entries()) {
      if (color !== null) filled.push(coord);
    }
    // Remove ~40% of filled cells (minimum 7, maximum 19)
    // giving the player enough room to place the next pieces.
    const toRemove = Math.min(19, Math.max(7, Math.floor(filled.length * 0.4)));
    // Shuffle and take the first toRemove entries
    for (let i = filled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [filled[i], filled[j]] = [filled[j], filled[i]];
    }
    for (let i = 0; i < toRemove; i++) {
      this.board.set(filled[i], null);
    }
    this.gameOver = false;
    this.saveToLocalStorage();
    return true;
  }

  _saveHistory() {
    // Only keep last 1 move for undo
    this.history = [{
      board: new Map(this.board),
      score: this.score,
      comboCount: this.comboCount,
      activePieces: JSON.parse(JSON.stringify(this.activePieces))
    }];
  }

  undo() {
    if (this.history.length === 0) return false;
    
    const costs = [50, 150, 300];
    
    if (this.undoCount >= costs.length) {
      Toast.show(t('max_undo_reached') || 'Bu oyunda maksimum Geri Al hakkını doldurdun!', 'warning');
      return false;
    }

    const cost = costs[this.undoCount];
    const success = PlayerState.useDiamonds(cost);
    if (!success) {
      const msg = (t('need_diamonds_undo') || 'Geri almak için {cost} elmasa ihtiyacınız var!').replace('{cost}', cost).replace('${cost}', cost);
      Toast.show(msg, 'warning');
      return false;
    }

    const state = this.history.pop();
    this.board = state.board;
    this.score = state.score;
    this.comboCount = state.comboCount;
    this.activePieces = state.activePieces;
    this.gameOver = false;
    this.undoCount++;
    this.saveToLocalStorage();
    return true;
  }

  saveToLocalStorage() {
    const data = {
      board: Array.from(this.board.entries()),
      score: this.score,
      comboCount: this.comboCount,
      activePieces: this.activePieces,
      gameOver: this.gameOver,
      undoCount: this.undoCount
    };
    Storage.setDebounced('hex_state', data);
  }

  loadFromLocalStorage() {
    const data = Storage.get('hex_state', null);
    if (data && data.board) {
      this.board = new Map(data.board);
      this.score = data.score;
      this.comboCount = data.comboCount || 0;
      this.activePieces = data.activePieces;
      this.gameOver = data.gameOver;
      this.undoCount = data.undoCount || 0;
    } else {
      this.initGame();
    }
  }
}
