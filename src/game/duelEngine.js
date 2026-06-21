import { t } from '../utils/i18n.js';
import { getRandomShape } from './shapes.js';
import { Storage } from '../utils/storage.js';
import { Scoring } from './scoring.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { getLocalAvatar, avatarOptions, getAvatarUrl } from '../utils/avatars.js';
import { Haptics } from '../utils/haptics.js';

export class DuelEngine {
  constructor(gridSize = 8) {
    this.gridSize = gridSize;
    this.board = this.createBoard();
    this.player1Score = 0; // User
    this.player2Score = 0; // Bot
    this.turn = 1; // 1 = player, 2 = bot
    this.comboCountP1 = 0;
    this.comboCountP2 = 0;
    this.activePieces = []; 
    this.gameOver = false;
    this.winner = null; // 1, 2, or 'tie'
    
    this.initGame();
  }

  createBoard() {
    return Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(null));
  }

  generateBotProfile() {
    this.difficulty = Storage.get('duel_difficulty') || 'medium';
    
    let names = [];
    let minLevel = 1;
    let maxLevel = 10;
    if (this.difficulty === 'easy') {
      names = [t('bot_noob_1')||'NoobBot', t('bot_noob_2')||'Acemi', t('bot_noob_3')||'Çaylak', t('bot_noob_4')||'BabyBlock', t('bot_noob_5')||'YavaşY', t('bot_noob_6')||'Zayıf_Halka'];
      minLevel = 1; maxLevel = 5;
    } else if (this.difficulty === 'hard') {
      names = [t('bot_hard_1')||'EFSANE', t('bot_hard_2')||'Yikici', t('bot_hard_3')||'BlockMaster', t('bot_hard_4')||'ShadowNinja', t('bot_hard_5')||'Terminatör', t('bot_hard_6')||'Yenilmez'];
      minLevel = 30; maxLevel = 90;
    } else {
      names = [t('bot_med_1')||'ProGamer', t('bot_med_2')||'Kral_TR', t('bot_med_3')||'Standart', t('bot_med_4')||'Rakipp', t('bot_med_5')||'Blocker', t('bot_med_6')||'Gamer99'];
      minLevel = 10; maxLevel = 30;
    }
    
    this.botName = names[Math.floor(Math.random() * names.length)];
    
    const randomAvatarId = avatarOptions[Math.floor(Math.random() * avatarOptions.length)].id;
    this.botAvatar = getAvatarUrl(randomAvatarId);
    this.botLevel = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
  }

  initGame() {
    this.board = this.createBoard();
    this.player1Score = 0;
    this.player2Score = 0;
    this.comboCountP1 = 0;
    this.comboCountP2 = 0;
    this.turn = 1; // User always starts
    this.gameOver = false;
    this.winner = null;
    this.generateBotProfile();
    this.activePieces = [getRandomShape(), getRandomShape(), getRandomShape()];
  }

  canPlace(pieceMatrix, r, c) {
    const pr = pieceMatrix.length;
    const pc = pieceMatrix[0].length;

    for (let i = 0; i < pr; i++) {
      for (let j = 0; j < pc; j++) {
        if (pieceMatrix[i][j] === 1) {
          const targetR = r + i;
          const targetC = c + j;
          if (targetR < 0 || targetR >= this.gridSize || targetC < 0 || targetC >= this.gridSize) return false;
          if (this.board[targetR][targetC] !== null) return false;
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
      if (isRowFull) rows.push(row);
    }

    // Check cols
    for (let col = 0; col < this.gridSize; col++) {
      let isColFull = true;
      for (let row = 0; row < this.gridSize; row++) {
        if (tempBoard[row][col] === null) {
          isColFull = false;
          break;
        }
      }
      if (isColFull) cols.push(col);
    }

    return { rows, cols };
  }

  // Places the piece at index pieceIdx at r, c for the CURRENT TURN player
  placePiece(pieceIdx, r, c) {
    if (this.gameOver) return false;

    const piece = this.activePieces[pieceIdx];
    if (!piece) return false;

    if (!this.canPlace(piece.matrix, r, c)) {
      if (this.turn === 1) {
        Sounds.playSfx('invalid');
        Haptics.vibrate('invalid');
      }
      return false;
    }

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

    if (this.turn === 1) {
      Sounds.playSfx('x2-drop');
      Haptics.vibrate('block-place');
    } else {
      // Bot place sound
      Sounds.playSfx('x2-drop');
    }

    const placementReward = Scoring.calculatePlacement(placedCellsCount);
    let earnedPoints = placementReward.points;

    // Check clears
    const clears = this.checkClears();
    let clearedLinesCount = clears.rows.length + clears.cols.length;

    if (clearedLinesCount > 0) {
      const combo = this.turn === 1 ? ++this.comboCountP1 : ++this.comboCountP2;
      const clearReward = Scoring.calculateClear(clearedLinesCount, combo);
      earnedPoints += clearReward.points;

      clears.rows.forEach(rowIdx => {
        for (let col = 0; col < this.gridSize; col++) this.board[rowIdx][col] = null;
      });
      clears.cols.forEach(colIdx => {
        for (let row = 0; row < this.gridSize; row++) this.board[row][colIdx] = null;
      });

      Sounds.playSfx('x2-combo', { combo: combo || 1 });
      if (this.turn === 1) {
        if (combo > 1) {
          Haptics.vibrate('combo');
        } else {
          Haptics.vibrate('line-clear');
        }
      }
      
      this.clearEventCallback?.({ lines: clearedLinesCount, player: this.turn, points: clearReward.points, rows: clears.rows, cols: clears.cols });
    } else {
      if (this.turn === 1) this.comboCountP1 = 0;
      else this.comboCountP2 = 0;
    }

    // Add points
    if (this.turn === 1) this.player1Score += earnedPoints;
    else this.player2Score += earnedPoints;

    // Remove piece from tray
    this.activePieces[pieceIdx] = null;

    // If tray is empty, refill
    if (this.activePieces.every(p => p === null)) {
      this.activePieces = [getRandomShape(), getRandomShape(), getRandomShape()];
    }

    // Swap turn
    this.turn = this.turn === 1 ? 2 : 1;

    // Check game over
    this.checkGameOver();

    return true;
  }

  checkClears() {
    const rows = [];
    const cols = [];

    for (let r = 0; r < this.gridSize; r++) {
      if (this.board[r].every(cell => cell !== null)) rows.push(r);
    }
    for (let c = 0; c < this.gridSize; c++) {
      let isColFull = true;
      for (let r = 0; r < this.gridSize; r++) {
        if (this.board[r][c] === null) {
          isColFull = false; break;
        }
      }
      if (isColFull) cols.push(c);
    }
    return { rows, cols };
  }

  checkGameOver() {
    const remainingPieces = this.activePieces.filter(p => p !== null);
    if (remainingPieces.length === 0) return false;

    let canPlay = false;
    for (const piece of remainingPieces) {
      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          if (this.canPlace(piece.matrix, r, c)) {
            canPlay = true;
            break;
          }
        }
        if (canPlay) break;
      }
      if (canPlay) break;
    }

    if (!canPlay) {
      this.gameOver = true;
      if (this.player1Score > this.player2Score) this.winner = 1;
      else if (this.player2Score > this.player1Score) this.winner = 2;
      else this.winner = 'tie';
      
      Sounds.playSfx('game-over');
      Haptics.vibrate('game-over');
      return true;
    }
    return false;
  }

  // --- BOT AI ---
  // Returns the best move: { pieceIdx, r, c }
  calculateBotMove() {
    let bestMove = null;
    let maxScore = -1;
    let allValidMoves = [];

    for (let idx = 0; idx < this.activePieces.length; idx++) {
      const piece = this.activePieces[idx];
      if (!piece) continue;

      for (let r = 0; r < this.gridSize; r++) {
        for (let c = 0; c < this.gridSize; c++) {
          if (this.canPlace(piece.matrix, r, c)) {
            const score = this.evaluateMove(piece.matrix, r, c);
            allValidMoves.push({ pieceIdx: idx, r, c, score });
            
            // Add a tiny random fraction to break ties naturally
            const randomizedScore = score + Math.random() * 0.1;
            if (randomizedScore > maxScore) {
              maxScore = randomizedScore;
              bestMove = { pieceIdx: idx, r, c };
            }
          }
        }
      }
    }

    if (!bestMove) return null;

    // Difficulty Adjustment
    // Easy: 40% chance to just pick a random move from all valid moves.
    // Medium: 15% chance to pick a random move.
    // Hard: 0% chance (always plays the best move).
    let mistakeChance = 0;
    if (this.difficulty === 'easy') mistakeChance = 0.4;
    else if (this.difficulty === 'medium') mistakeChance = 0.15;
    
    if (Math.random() < mistakeChance && allValidMoves.length > 0) {
      const randomIndex = Math.floor(Math.random() * allValidMoves.length);
      return allValidMoves[randomIndex];
    }

    return bestMove;
  }

  evaluateMove(pieceMatrix, r, c) {
    let score = 0;
    const pr = pieceMatrix.length;
    const pc = pieceMatrix[0].length;
    
    // Simulate placement
    for (let i = 0; i < pr; i++) {
      for (let j = 0; j < pc; j++) {
        if (pieceMatrix[i][j] === 1) {
          this.board[r + i][c + j] = 'temp'; // mark temporarily
          score += 10; // basic point for placing blocks
        }
      }
    }

    // Simulate clears
    const clears = this.checkClears();
    const lines = clears.rows.length + clears.cols.length;
    if (lines > 0) {
      score += lines * 1000; // Heavily prioritize clearing lines
    }

    // Evaluate compactness (touching edges or existing blocks is better than floating in the middle)
    // Helps the bot not play stupidly
    let touching = 0;
    for (let i = 0; i < pr; i++) {
      for (let j = 0; j < pc; j++) {
        if (pieceMatrix[i][j] === 1) {
          const tr = r + i;
          const tc = c + j;
          if (tr === 0 || tr === this.gridSize - 1) touching++;
          if (tc === 0 || tc === this.gridSize - 1) touching++;
          
          if (tr > 0 && this.board[tr-1][tc] && this.board[tr-1][tc] !== 'temp') touching++;
          if (tr < this.gridSize-1 && this.board[tr+1][tc] && this.board[tr+1][tc] !== 'temp') touching++;
          if (tc > 0 && this.board[tr][tc-1] && this.board[tr][tc-1] !== 'temp') touching++;
          if (tc < this.gridSize-1 && this.board[tr][tc+1] && this.board[tr][tc+1] !== 'temp') touching++;
        }
      }
    }
    score += touching * 5;

    // Undo simulation
    for (let i = 0; i < pr; i++) {
      for (let j = 0; j < pc; j++) {
        if (pieceMatrix[i][j] === 1) {
          this.board[r + i][c + j] = null;
        }
      }
    }

    return score;
  }
}
