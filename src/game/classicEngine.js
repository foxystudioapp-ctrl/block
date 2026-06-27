import { getRandomShape } from './shapes.js';
import { Scoring } from './scoring.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { Toast } from '../components/toast.js';
import { debouncedSetItem } from '../utils/persist.js';
import { TaskState } from '../state/taskState.js';
import { t } from '../utils/i18n.js';

export class ClassicEngine {
  constructor(gridSize = 8, gridShape = null, mode = 'endless') {
    this.gridSize = gridSize;
    this.gridShape = gridShape;
    this.mode = mode; // 'endless' or 'adventure'
    this.board = this.createBoard();
    this.score = 0;
    this.bestScore = PlayerState.state.bestScoreClassic;
    this.comboCount = 0;
    this.activePieces = []; // holds 3 active shapes
    this.undoStack = [];
    this.historyStack = []; // stores full turns for undo
    this.gameOver = false;
    this.justClearedLines = false; // tracks if the last turn cleared lines for combo
    this.undoCount = 0;
    this.hammerCount = 0;
    
    // Adventure mode additions
    this.level = 1;
    this.levelScore = 0;
    this.levelUpReady = false;
    
    if (!this.loadFromLocalStorage()) {
      this.initGame();
    }
  }

  createBoard() {
    const board = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
    if (this.gridShape && Array.isArray(this.gridShape)) {
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          if (this.gridShape[r] && this.gridShape[r][c] === '0') {
            board[r][c] = 'inactive';
          }
        }
      }
    }
    return board;
  }

  initGame() {
    this.board = this.createBoard();
    this.score = 0;
    this.levelScore = 0;
    this.level = 1;
    this.levelUpReady = false;
    this.bestScore = PlayerState.state.bestScoreClassic;
    this.comboCount = 0;
    this.gameOver = false;
    this.justClearedLines = false;
    this.activePieces = [getRandomShape(), getRandomShape(), getRandomShape()];
    this.historyStack = [];
    this.undoCount = 0;
    this.hammerCount = 0;
    this.saveToLocalStorage();
  }

  getTargetScore() {
    // Linear scaling with soft cap to keep targets reachable at high levels
    const linear = 500 + (this.level - 1) * 800;
    const softCap = 100000; // ~level 125
    if (linear <= softCap) return linear;
    // After soft cap, growth slows to 30%
    const excess = linear - softCap;
    return Math.floor(softCap + excess * 0.3);
  }

  initLevel(lvl, keepBoard = false) {
    this.level = lvl;
    this.levelUpReady = false;
    this.gameOver = false;
    this.levelScore = 0;
    
    if (!keepBoard) {
      this.board = this.createBoard();
    }
    
    this.historyStack = [];
    this.undoCount = 0;
    this.hammerCount = 0;
    
    this.activePieces = [getRandomShape(), getRandomShape(), getRandomShape()];
    this.saveToLocalStorage();
  }

  nextLevel() {
    this.initLevel(this.level + 1, true);
  }

  restartCurrentLevel() {
    this.score = 0;
    this.levelScore = 0;
    this.initLevel(this.level, false);
  }

  // Check if a piece matrix fits at row r, col c on the board
  canPlace(pieceMatrix, r, c) {
    const pr = pieceMatrix.length;
    const pc = pieceMatrix[0].length;

    for (let i = 0; i < pr; i++) {
      for (let j = 0; j < pc; j++) {
        if (pieceMatrix[i][j] === 1) {
          const targetR = r + i;
          const targetC = c + j;

          // Out of bounds
          if (targetR < 0 || targetR >= this.gridSize || targetC < 0 || targetC >= this.gridSize) {
            return false;
          }

          // Collides with existing block
          if (this.board[targetR][targetC] !== null) {
            return false;
          }
        }
      }
    }
    return true;
  }

  // Simulates piece placement and returns lines that would be cleared
  simulatePlacement(pieceMatrix, r, c) {
    if (!this.canPlace(pieceMatrix, r, c)) return { rows: [], cols: [] };

    // Deep copy board
    const tempBoard = this.board.map(row => [...row]);

    const pr = pieceMatrix.length;
    const pc = pieceMatrix[0].length;
    for (let i = 0; i < pr; i++) {
      for (let j = 0; j < pc; j++) {
        if (pieceMatrix[i][j] === 1) {
          tempBoard[r + i][c + j] = 'temp';
        }
      }
    }

    const rows = [];
    const cols = [];

    // Check rows
    for (let row = 0; row < this.gridSize; row++) {
      let isRowFull = true;
      for (let col = 0; col < this.gridSize; col++) {
        if (tempBoard[row][col] === null) {
          isRowFull = false;
          break;
        }
      }
      const hasActive = tempBoard[row].some(cell => cell !== 'inactive');
      if (isRowFull && hasActive) rows.push(row);
    }

    // Check cols
    for (let col = 0; col < this.gridSize; col++) {
      let isColFull = true;
      let hasActive = false;
      for (let row = 0; row < this.gridSize; row++) {
        if (tempBoard[row][col] === null) {
          isColFull = false;
          break;
        }
        if (tempBoard[row][col] !== 'inactive') {
          hasActive = true;
        }
      }
      if (isColFull && hasActive) cols.push(col);
    }

    return { rows, cols };
  }


  // Places the piece at index pieceIdx in activePieces at r, c
  placePiece(pieceIdx, r, c) {
    if (this.gameOver) return false;

    const piece = this.activePieces[pieceIdx];
    if (!piece) return false;

    if (!this.canPlace(piece.matrix, r, c)) {
      Sounds.playSfx('invalid');
      Haptics.vibrate('invalid');
      return false;
    }

    // Save history before change for Undo feature
    this.historyStack.push({
      board: this.board.map(row => [...row]),
      activePieces: this.activePieces.map(p => p ? { ...p, matrix: p.matrix.map(row => [...row]) } : null),
      score: this.score,
      comboCount: this.comboCount,
      justClearedLines: this.justClearedLines
    });
    if (this.historyStack.length > 10) this.historyStack.shift();

    // 1. Put piece on board
    const pr = piece.matrix.length;
    const pc = piece.matrix[0].length;
    let placedCellsCount = 0;

    for (let i = 0; i < pr; i++) {
      for (let j = 0; j < pc; j++) {
        if (piece.matrix[i][j] === 1) {
          this.board[r + i][c + j] = piece.color;
          placedCellsCount++;
        }
      }
    }

    // Play placement sounds & haptics
    Sounds.playSfx('x2-drop');
    Haptics.vibrate('block-place');

    // 2. Calculate placement points & XP
    const placementReward = Scoring.calculatePlacement(placedCellsCount);
    this.score += placementReward.points;
    this.levelScore += placementReward.points;
    PlayerState.addXp(placementReward.xp);

    // 3. Mark piece as used
    this.activePieces[pieceIdx] = null;
    
    // If all pieces used, generate 3 new ones
    if (this.activePieces.every(p => p === null)) {
      this.activePieces = [getRandomShape(), getRandomShape(), getRandomShape()];
    }

    // 4. Check for row / col clears
    const clears = this.checkClears();
    let clearedLinesCount = clears.rows.length + clears.cols.length;

    if (clearedLinesCount > 0) {
      this.comboCount++;
      const clearReward = Scoring.calculateClear(clearedLinesCount, this.comboCount);
      
      this.score += clearReward.points;
      this.levelScore += clearReward.points;
      PlayerState.addDiamonds(clearReward.diamonds);
      PlayerState.addXp(clearReward.xp);

      // Update Daily Tasks
      TaskState.updateProgress('lines', clearedLinesCount);
      TaskState.updateProgress('combo', this.comboCount);

      // Perform board clear
      clears.rows.forEach(rowIdx => {
        for (let col = 0; col < this.gridSize; col++) {
          if (this.board[rowIdx][col] !== 'inactive') {
            this.board[rowIdx][col] = null;
          }
        }
      });
      clears.cols.forEach(colIdx => {
        for (let row = 0; row < this.gridSize; row++) {
          if (this.board[row][colIdx] !== 'inactive') {
            this.board[row][colIdx] = null;
          }
        }
      });

      // Play clear sounds & haptics
      Sounds.playSfx('x2-combo', { combo: this.comboCount || 1 });
      
      if (this.comboCount > 1) {
        Haptics.vibrate('combo');
      } else {
        Haptics.vibrate('line-clear');
      }

      this.justClearedLines = true;

      // Broadcast combo detail to UI if needed
      this.clearEventCallback?.({
        lines: clearedLinesCount,
        comboText: clearReward.comboText,
        points: clearReward.points,
        diamonds: clearReward.diamonds,
        rows: clears.rows,
        cols: clears.cols
      });

    } else {
      // Break combo if this turn did not clear lines
      this.comboCount = 0;
      this.justClearedLines = false;
    }

    PlayerState.updateBestScore('classic', this.score);
    this.bestScore = Math.max(this.bestScore, this.score);
    
    if (this.mode === 'adventure' && this.levelScore >= this.getTargetScore()) {
      this.levelUpReady = true;
    }

    // 5. Generate new pieces (Removed: now happens instantly on use)

    // Update Daily Tasks Score
    TaskState.updateProgress('score', this.score);

    // 6. Check game over conditions
    this.checkGameOver();

    // Auto-save game status
    this.saveToLocalStorage();

    return true;
  }

  // Returns { rows: [indices], cols: [indices] }
  checkClears() {
    const rows = [];
    const cols = [];

    // Check rows
    for (let r = 0; r < this.gridSize; r++) {
      let isRowFull = true;
      for (let c = 0; c < this.gridSize; c++) {
        if (this.board[r][c] === null) {
          isRowFull = false;
          break;
        }
      }
      // Make sure the row isn't entirely inactive
      const hasActive = this.board[r].some(cell => cell !== 'inactive');
      if (isRowFull && hasActive) {
        rows.push(r);
      }
    }

    // Check cols
    for (let c = 0; c < this.gridSize; c++) {
      let isColFull = true;
      let hasActive = false;
      for (let r = 0; r < this.gridSize; r++) {
        if (this.board[r][c] === null) {
          isColFull = false;
          break;
        }
        if (this.board[r][c] !== 'inactive') {
          hasActive = true;
        }
      }
      if (isColFull && hasActive) {
        cols.push(c);
      }
    }

    return { rows, cols };
  }

  checkGameOver() {
    // Game over if there is at least one active piece and none of them can be placed
    const remainingPieces = this.activePieces.filter(p => p !== null);
    
    if (remainingPieces.length === 0) {
      return false; // All placed, waiting for new ones
    }

    for (const piece of remainingPieces) {
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          if (this.canPlace(piece.matrix, r, c)) {
            return false; // Can fit, game continues
          }
        }
      }
    }

    // No valid moves left
    this.gameOver = true;
    Sounds.playSfx('game-over');
    Haptics.vibrate('game-over');
    return true;
  }

  undo() {
    if (this.historyStack.length === 0) {
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

    const previousState = this.historyStack.pop();
    this.board = previousState.board;
    this.activePieces = previousState.activePieces;
    this.score = previousState.score;
    this.comboCount = previousState.comboCount;
    this.justClearedLines = previousState.justClearedLines;
    this.gameOver = false;
    this.undoCount++;

    Sounds.playSfx('undo');
    
    this.saveToLocalStorage();
    return true;
  }

  useHammer(r, c) {
    if (this.gameOver) return false;

    const costs = [50, 150, 300];
    if (this.hammerCount >= costs.length) {
      Toast.show(t('max_powerup_reached') || 'Bu oyunda maksimum Çekiç hakkını doldurdun!', 'warning');
      return false;
    }

    if (this.board[r][c] === null || this.board[r][c] === 'inactive') {
      return false;
    }

    const cost = costs[this.hammerCount];
    const canUse = PlayerState.useDiamonds(cost);
    if (!canUse) {
      return 'insufficient_funds';
    }

    // Save history before change for Undo feature
    this.historyStack.push({
      board: this.board.map(row => [...row]),
      activePieces: this.activePieces.map(p => p ? { ...p, matrix: p.matrix.map(row => [...row]) } : null),
      score: this.score,
      comboCount: this.comboCount,
      justClearedLines: this.justClearedLines
    });
    if (this.historyStack.length > 10) this.historyStack.shift();

    this.board[r][c] = null;
    this.hammerCount++;

    Sounds.playSfx('block-place'); // Or a break sound if we had one
    Haptics.vibrate('heavy');

    this.checkGameOver();
    this.saveToLocalStorage();
    return true;
  }

  revive() {
    // Clear a 3x3 area in the center of the board
    const centerR = Math.floor(this.gridSize / 2);
    const centerC = Math.floor(this.gridSize / 2);

    for (let r = centerR - 1; r <= centerR + 1; r++) {
      for (let c = centerC - 1; c <= centerC + 1; c++) {
        if (r >= 0 && r < this.gridSize && c >= 0 && c < this.gridSize && this.board[r][c] !== 'inactive') {
          this.board[r][c] = null;
        }
      }
    }

    // Guarantee that the player can place pieces by giving them three 1x1 dot blocks
    this.activePieces = [
      { color: 'cyan', matrix: [[1]] },
      { color: 'cyan', matrix: [[1]] },
      { color: 'cyan', matrix: [[1]] }
    ];

    this.gameOver = false;
    Sounds.playSfx('level-up'); // Revive sound
    Haptics.vibrate('heavy');
    
    this.saveToLocalStorage();
    return true;
  }

  // LocalStorage support
  saveToLocalStorage() {
    if (this.mode === 'endless') return;
    const saveKey = `lumina_puzzle_classic_save_${this.gridSize}`;
    const state = {
      gridSize: this.gridSize,
      mode: this.mode,
      board: this.board,
      score: this.score,
      levelScore: this.levelScore,
      level: this.level,
      bestScore: this.bestScore,
      comboCount: this.comboCount,
      activePieces: this.activePieces,
      gameOver: this.gameOver,
      justClearedLines: this.justClearedLines,
      undoCount: this.undoCount,
      hammerCount: this.hammerCount
    };
    debouncedSetItem(saveKey, JSON.stringify(state));
  }

  loadFromLocalStorage() {
    if (this.mode === 'endless') return false;
    try {
      const saveKey = `lumina_puzzle_classic_save_${this.gridSize}`;
      const saved = localStorage.getItem(saveKey);
      if (!saved) return false;

      const state = JSON.parse(saved);
      
      // If the saved game is already over, don't load it. Start a fresh game instead.
      if (state.gameOver) {
        this.clearLocalStorageSave();
        return false;
      }

      this.gridSize = state.gridSize;
      this.mode = state.mode || 'endless';
      this.board = state.board;
      this.score = state.score || 0;
      this.levelScore = state.levelScore || 0;
      this.level = state.level || 1;
      this.bestScore = state.bestScore || 0;
      this.comboCount = state.comboCount || 0;
      this.activePieces = state.activePieces;
      this.gameOver = state.gameOver;
      this.justClearedLines = state.justClearedLines;
      this.historyStack = []; // undo geçmişi oturum-içi; kalıcı kayıttan çıkarıldı
      this.undoCount = state.undoCount || 0;
      this.hammerCount = state.hammerCount || 0;
      this.levelUpReady = false;
      return true;
    } catch (e) {
      console.error('Error loading classic game:', e);
      return false;
    }
  }

  clearLocalStorageSave() {
    if (this.mode === 'endless') return;
    const saveKey = `lumina_puzzle_classic_save_${this.gridSize}`;
    localStorage.removeItem(saveKey);
  }
}
