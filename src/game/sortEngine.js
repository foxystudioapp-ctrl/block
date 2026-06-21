import { PlayerState } from '../state/playerState.js';
import { Storage } from '../utils/storage.js';
import { Sounds } from '../utils/sounds.js';
import { t } from '../utils/i18n.js';

const COLORS = ['red', 'blue', 'green', 'orange', 'purple', 'cyan', 'yellow', 'pink'];

export class SortEngine {
  constructor(mode = 'adventure') {
    this.mode = mode;
    this.stateKey = `sort_${this.mode}_state`;
    this.tubes = []; // Array of arrays (each tube is an array of color strings, bottom to top)
    this.maxTubeSize = 4;
    this.history = [];
    this.undoCount = 0;
    
    if (this.mode === 'adventure') {
      this.level = PlayerState.state.sortAdventureLevel || 1;
    } else {
      this.level = PlayerState.state.sortEndlessLevel || 1;
    }
    
    // Check if we have an ongoing game
    this.loadFromLocalStorage();
  }

  generateLevel(levelNumber) {
    // Determine difficulty
    const colorCount = Math.min(3 + Math.floor(levelNumber / 3), COLORS.length);
    const emptyTubes = 2;
    const totalTubes = colorCount + emptyTubes;

    this.tubes = Array(totalTubes).fill(null).map(() => []);
    
    // Create solved state
    for (let i = 0; i < colorCount; i++) {
      this.tubes[i] = Array(this.maxTubeSize).fill(COLORS[i]);
    }

    // Scramble by playing valid reverse moves
    // A valid reverse move from 'fromIdx' to 'toIdx' means moving the top block of 'fromIdx' to 'toIdx'.
    // In the forward game, the player will move this block from 'toIdx' back to 'fromIdx'.
    // For that forward move to be legal, the block's color must match the new top of 'fromIdx' (or 'fromIdx' must be empty).
    const scrambleMoves = 40 + (levelNumber * 10);
    let movesDone = 0;
    let attempts = 0;
    
    while (movesDone < scrambleMoves && attempts < scrambleMoves * 10) {
      attempts++;
      const fromIdx = Math.floor(Math.random() * totalTubes);
      const toIdx = Math.floor(Math.random() * totalTubes);

      if (fromIdx !== toIdx) {
        const fromTube = this.tubes[fromIdx];
        const toTube = this.tubes[toIdx];

        if (fromTube.length > 0 && toTube.length < this.maxTubeSize) {
          const blockToMove = fromTube[fromTube.length - 1];
          // If we remove this block, what will be the top of fromTube?
          const newTopColor = fromTube.length > 1 ? fromTube[fromTube.length - 2] : null;

          // In forward play, player moves from 'toTube' to 'fromTube'.
          // Valid if 'fromTube' becomes empty OR its new top matches the block.
          if (newTopColor === null || newTopColor === blockToMove) {
            fromTube.pop();
            toTube.push(blockToMove);
            movesDone++;
          }
        }
      }
    }

    this.history = [];
    this.undoCount = 0;
    this.saveToLocalStorage();
  }

  canMove(fromIdx, toIdx) {
    if (fromIdx === toIdx) return false;
    
    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];

    if (fromTube.length === 0) return false;
    if (toTube.length >= this.maxTubeSize) return false;

    // If destination is empty, we can move
    if (toTube.length === 0) return true;

    // Otherwise, top colors must match
    const fromTopColor = fromTube[fromTube.length - 1];
    const toTopColor = toTube[toTube.length - 1];
    
    return fromTopColor === toTopColor;
  }

  move(fromIdx, toIdx) {
    if (!this.canMove(fromIdx, toIdx)) return false;

    // Save history
    this._saveHistory();

    const fromTube = this.tubes[fromIdx];
    const toTube = this.tubes[toIdx];

    const block = fromTube.pop();
    toTube.push(block);

    Sounds.playSfx('button-tap');

    this.saveToLocalStorage();
    return true;
  }

  checkWin() {
    for (const tube of this.tubes) {
      if (tube.length > 0) {
        // If it's not full and not empty, it's not a win
        if (tube.length !== this.maxTubeSize) return false;
        
        // If it's full, all must be the same color
        const firstColor = tube[0];
        if (!tube.every(c => c === firstColor)) return false;
      }
    }
    return true;
  }

  addTube() {
    // Costs 100 diamonds
    const success = PlayerState.useDiamonds(100);
    if (success) {
      this._saveHistory();
      this.tubes.push([]);
      this.saveToLocalStorage();
      return true;
    }
    return false;
  }

  _saveHistory() {
    // Save a deep copy of tubes
    this.history.push(this.tubes.map(t => [...t]));
    if (this.history.length > 10) this.history.shift();
  }

  undo() {
    if (this.history.length === 0) return false;

    const costs = [50, 150, 300];
    
    if (this.undoCount >= costs.length) {
      import('../components/toast.js').then(({ Toast }) => {
        Toast.show(t('max_undo_reached') || 'Bu oyunda maksimum Geri Al hakkını doldurdun!', 'warning');
      });
      return false;
    }

    const cost = costs[this.undoCount];
    const success = PlayerState.useDiamonds(cost);
    if (!success) {
      import('../components/toast.js').then(({ Toast }) => {
        const msg = (t('need_diamonds_undo') || 'Geri almak için {cost} elmasa ihtiyacınız var!').replace('{cost}', cost).replace('${cost}', cost);
        Toast.show(msg, 'warning');
      });
      return false;
    }

    this.tubes = this.history.pop();
    this.undoCount++;
    this.saveToLocalStorage();
    return true;
  }

  saveToLocalStorage() {
    if (this.mode === 'endless') return;
    const data = {
      tubes: this.tubes,
      history: this.history,
      undoCount: this.undoCount
    };
    Storage.set(this.stateKey, data);
  }

  loadFromLocalStorage() {
    if (this.mode === 'endless') {
      this.generateLevel(this.level);
      return false;
    }
    const data = Storage.get(this.stateKey, null);
    if (data && data.tubes && data.tubes.length > 0) {
      this.tubes = data.tubes;
      this.history = data.history || [];
      this.undoCount = data.undoCount || 0;
    } else {
      this.generateLevel(this.level);
    }
  }

  startNextLevel() {
    this.level += 1;
    
    // Save to PlayerState
    if (this.mode === 'adventure') {
      PlayerState.state.sortAdventureLevel = this.level;
      Storage.set('player_sort_adventure_level', this.level);
    } else {
      PlayerState.state.sortEndlessLevel = this.level;
      Storage.set('player_sort_endless_level', this.level);
    }

    // Add XP and Diamonds for winning
    PlayerState.addXp(150);
    PlayerState.addDiamonds(50);
    PlayerState.updateBestScore('sort', this.level);
    this.generateLevel(this.level);
  }
}
