import { PlayerState } from '../state/playerState.js';
import { Toast } from '../components/toast.js';
import { t } from '../utils/i18n.js';
import { debouncedSetItem } from '../utils/persist.js';

export class Engine2048 {
  constructor(mode = 'endless', level = 1) {
    this.mode = mode;
    this.level = level;
    this.gridSize = 4;
    this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
    this.score = 0;
    this.levelScore = 0;
    this.targetScore = mode === 'adventure' ? this.getTargetScore(this.level) : Infinity;
    this.history = [];
    this.gameOver = false;
    this.won = false;
    this.levelUpReady = false;
    this.undoCount = 0;
    this.keptPlaying = false;
    
    if (!this.loadGameState()) {
      this.init();
    }
  }

  loadGameState() {
    if (this.mode === 'endless') return false;
    const key = this.mode === 'adventure' ? 'g2048_adventure_state' : 'g2048_endless_state';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        // Ensure the saved state matches the current mode and level
        if (state.mode === this.mode && (this.mode === 'endless' || state.level === this.level)) {
          this.grid = state.grid;
          this.score = state.score;
          this.levelScore = state.levelScore || 0;
          this.history = state.history || [];
          this.undoCount = state.undoCount || 0;
          return true;
        }
      } catch (e) {
        console.error("Failed to load 2048 state", e);
      }
    }
    return false;
  }

  saveGameState() {
    if (this.mode === 'endless') return;
    const key = this.mode === 'adventure' ? 'g2048_adventure_state' : 'g2048_endless_state';
    const state = {
      mode: this.mode,
      level: this.level,
      grid: this.grid,
      score: this.score,
      levelScore: this.levelScore,
      history: this.history,
      undoCount: this.undoCount
    };
    debouncedSetItem(key, JSON.stringify(state));
  }

  clearSave() {
    const key = this.mode === 'adventure' ? 'g2048_adventure_state' : 'g2048_endless_state';
    localStorage.removeItem(key);
  }

  // Target score scales exponentially to match tile merge value growth
  getTargetScore(level) {
    if (level <= 20) return 500 + level * 500;          // Level 1-20: gentle linear
    if (level <= 50) return 10500 + (level - 20) * 1500; // Level 21-50: steeper linear
    // Level 50+: exponential growth (doubles every ~25 levels)
    const base = 55500; // value at level 50
    const doublingRate = 25;
    const target = Math.floor(base * Math.pow(2, (level - 50) / doublingRate));
    // Cap at 5M — on a 4x4 grid, scores per level are finite
    return Math.min(target, 5000000);
  }

  nextLevel() {
    this.level++;
    this.targetScore = this.getTargetScore(this.level);
    this.levelScore = 0;
    this.levelUpReady = false;
    this.history = [];
    this.saveGameState();
  }

  init() {
    this.spawnTile();
    this.spawnTile();
  }

  saveState() {
    this.history.push({
      grid: this.grid.map(row => [...row]),
      score: this.score,
      gameOver: this.gameOver,
      won: this.won
    });
    if (this.history.length > 10) this.history.shift();
  }

  undo() {
    if (this.history.length === 0) {
      Toast.show(t('no_undo_move') || 'Geri alınacak hamle yok!', 'warning');
      return false;
    }

    const costs = [50, 150, 300];
    if (this.undoCount >= costs.length) {
      Toast.show(t('max_undo_reached') || 'Bu oyunda maksimum Geri Al hakkını doldurdun!', 'warning');
      return false;
    }

    const cost = costs[this.undoCount];
    const canUndo = PlayerState.useDiamonds(cost);
    if (!canUndo) {
      const msg = (t('need_diamonds_undo') || 'Geri almak için {cost} elmasa ihtiyacınız var!').replace('{cost}', cost).replace('${cost}', cost);
      Toast.show(msg, 'error');
      return false;
    }

    const state = this.history.pop();
    this.grid = state.grid.map(row => [...row]);
    // Subtract from levelScore the difference in total score
    const scoreDiff = this.score - state.score;
    this.score = state.score;
    this.levelScore = Math.max(0, this.levelScore - scoreDiff);
    if (this.mode === 'adventure' && this.levelScore < this.targetScore) {
      this.levelUpReady = false;
    }
    this.gameOver = state.gameOver;
    this.won = state.won;
    this.undoCount++;
    this.saveGameState();
    return true;
  }

  spawnTile() {
    let emptyCells = [];
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] === 0) {
          emptyCells.push({ r, c });
        }
      }
    }
    if (emptyCells.length > 0) {
      let { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  }

  operate(row) {
    let original = [...row];
    row = row.filter(val => val !== 0);
    let score = 0;
    let merges = 0;
    for (let i = 0; i < row.length - 1; i++) {
      if (row[i] !== 0 && row[i] === row[i + 1]) {
        row[i] *= 2;
        score += row[i];
        merges++;
        if (row[i] === 2048) this.won = true;
        row.splice(i + 1, 1);
      }
    }
    while (row.length < this.gridSize) {
      row.push(0);
    }
    
    let changed = false;
    for (let i = 0; i < this.gridSize; i++) {
      if (original[i] !== row[i]) {
        changed = true;
        break;
      }
    }
    return { newArray: row, score, changed, merges };
  }

  moveLeft() {
    let changedAny = false;
    let turnScore = 0;
    let turnMerges = 0;
    for (let r = 0; r < this.gridSize; r++) {
      const { newArray, score, changed, merges } = this.operate(this.grid[r]);
      this.grid[r] = newArray;
      if (changed) changedAny = true;
      turnScore += score;
      turnMerges += merges;
    }
    return { changed: changedAny, score: turnScore, merges: turnMerges };
  }

  moveRight() {
    let changedAny = false;
    let turnScore = 0;
    let turnMerges = 0;
    for (let r = 0; r < this.gridSize; r++) {
      let row = [...this.grid[r]].reverse();
      const { newArray, score, changed, merges } = this.operate(row);
      this.grid[r] = newArray.reverse();
      if (changed) changedAny = true;
      turnScore += score;
      turnMerges += merges;
    }
    return { changed: changedAny, score: turnScore, merges: turnMerges };
  }

  moveUp() {
    let changedAny = false;
    let turnScore = 0;
    let turnMerges = 0;
    for (let c = 0; c < this.gridSize; c++) {
      let col = [this.grid[0][c], this.grid[1][c], this.grid[2][c], this.grid[3][c]];
      const { newArray, score, changed, merges } = this.operate(col);
      for (let r = 0; r < this.gridSize; r++) {
        this.grid[r][c] = newArray[r];
      }
      if (changed) changedAny = true;
      turnScore += score;
      turnMerges += merges;
    }
    return { changed: changedAny, score: turnScore, merges: turnMerges };
  }

  moveDown() {
    let changedAny = false;
    let turnScore = 0;
    let turnMerges = 0;
    for (let c = 0; c < this.gridSize; c++) {
      let col = [this.grid[3][c], this.grid[2][c], this.grid[1][c], this.grid[0][c]];
      const { newArray, score, changed, merges } = this.operate(col);
      for (let r = 0; r < this.gridSize; r++) {
        this.grid[3 - r][c] = newArray[r];
      }
      if (changed) changedAny = true;
      turnScore += score;
      turnMerges += merges;
    }
    return { changed: changedAny, score: turnScore, merges: turnMerges };
  }

  move(direction) {
    if (this.gameOver) return false;
    
    this.saveState();
    
    let result = { changed: false, score: 0, merges: 0 };
    switch (direction) {
      case 'left': result = this.moveLeft(); break;
      case 'right': result = this.moveRight(); break;
      case 'up': result = this.moveUp(); break;
      case 'down': result = this.moveDown(); break;
    }
    
    if (result.changed) {
      this.score += result.score;
      this.levelScore += result.score;
      if (this.mode === 'adventure' && this.levelScore >= this.targetScore && !this.levelUpReady) {
        this.levelUpReady = true;
      }
      this.spawnTile();
      this.checkGameOver();
      this.saveGameState();
      return { moved: true, score: result.score, merges: result.merges };
    } else {
      this.history.pop();
      return { moved: false, score: 0, merges: 0 };
    }
  }

  checkGameOver() {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] === 0) return false;
        if (c < this.gridSize - 1 && this.grid[r][c] === this.grid[r][c + 1]) return false;
        if (r < this.gridSize - 1 && this.grid[r][c] === this.grid[r + 1][c]) return false;
      }
    }
    this.gameOver = true;
    return true;
  }

  revive() {
    let cells = [];
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] > 0) {
          cells.push({r, c, val: this.grid[r][c]});
        }
      }
    }
    
    cells.sort((a, b) => a.val - b.val);
    
    const toRemove = Math.min(4, cells.length);
    for (let i = 0; i < toRemove; i++) {
      this.grid[cells[i].r][cells[i].c] = 0;
    }
    
    this.gameOver = false;
    this.saveGameState();
    return true;
  }
}
