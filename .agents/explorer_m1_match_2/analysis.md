# Match Mode Game Logic Errors Investigation

This report details the findings from investigating Match Mode game logic errors in the Jewel Block mode, specifically within `src/game/matchEngine.js`, `src/screens/matchMode.js`, and related files.

---

## 1. Save/Load Logic (localStorage save/restore correctness, serialization issues)

### Direct Observations
- **`saveState()` implementation (`src/game/matchEngine.js:43-52`):**
  ```javascript
  saveState() {
    if (this.mode === 'endless') return;
    const saveKey = 'match_adventure_state';
    const state = {
      level: this.level,
      score: this.score,
      levelScore: this.levelScore
    };
    localStorage.setItem(saveKey, JSON.stringify(state));
  }
  ```
- **`loadState()` implementation (`src/game/matchEngine.js:54-70`):**
  ```javascript
  loadState() {
    if (this.mode === 'endless') return false;
    const saveKey = 'match_adventure_state';
    const saved = localStorage.getItem(saveKey);
    if (!saved) return false;
    try {
      const state = JSON.parse(saved);
      this.level = state.level || 1;
      this.score = state.score || 0;
      this.levelScore = state.levelScore || 0;
      // Recalculate target
      this.targetScore = 2000 + (this.level - 1) * 1000;
      return false; // Return false to force init() to run and rebuild the grid
    } catch(e) {
      return false;
    }
  }
  ```

### Analysis & Issues Found
1. **Incomplete Serialization:** Only the overall `level`, `score`, and `levelScore` are saved. The game does not serialize the board grid state (cages, obstacles, gem positions), remaining moves (`movesLeft`), or collected gem progress (`gemTargets[].collected`).
2. **Hardcoded Forced Re-initialization:** `loadState()` returns `false` explicitly. This triggers `this.init()` in the constructor (`src/game/matchEngine.js:38-40`):
   ```javascript
   if (!this.loadState()) {
     this.init();
   }
   ```
   If it returned `true`, the constructor wouldn't run `this.init()`, resulting in an empty grid (`this.grid = []`) because the grid was never saved in the first place.
3. **Infinite Moves Exploit:** Because `this.init()` is called upon loading, it resets remaining moves to `levelData.moves` (the maximum moves allowed for the level) and resets all collected targets (`collected: 0`), yet it keeps the restored `score` and `levelScore`. A player can make matches, reload the game, retain their earned score, and get a completely fresh board with a full move counter.

---

## 2. Best Score Tracking (updates and persistence)

### Direct Observations
- **`addScore()` in `MatchEngine` (`src/game/matchEngine.js:478-482`):**
  ```javascript
  let best = PlayerState.state.bestScoreJewel || 0;
  if (this.score > best) {
    PlayerState.state.bestScoreJewel = this.score;
    PlayerState.save();
  }
  ```
- **`showEndModal()` in `matchMode.js` (`src/screens/matchMode.js:1335-1336`):**
  ```javascript
  PlayerState.state.bestScoreJewel = (PlayerState.state.bestScoreJewel || 0) + engine.score;
  PlayerState.save();
  ```
- **`updateBestScore()` in `PlayerState` (`src/state/playerState.js:342-346`):**
  ```javascript
  } else if (mode === 'jewel' && score > this.state.bestScoreJewel) {
    const diff = score - this.state.bestScoreJewel;
    this.state.globalTrophies += diff * multiplier;
    this.state.bestScoreJewel = score;
    changed = true;
  }
  ```

### Analysis & Issues Found
1. **Conflicting Score Semantics (High Score vs. Cumulative Total):**
   - `matchEngine.js` treats `bestScoreJewel` as a **high score** (checks `this.score > best` before updating).
   - `matchMode.js` treats `bestScoreJewel` as a **cumulative sum** of all completed levels (adds `engine.score` on win).
   - This causes data corruption. If `bestScoreJewel` accumulates to e.g. 5000, and a user scores 1000 in a new level, the high score check in `matchEngine.js` will fail (1000 < 5000) and do nothing, but `matchMode.js` will add it to make 6000. If the player then scores 7000 in a single level, `matchEngine.js` will overwrite the accumulated score and set it to 7000.
2. **Bypassing the Centralized State API:** Both components directly write to `PlayerState.state.bestScoreJewel` and call `PlayerState.save()` instead of invoking `PlayerState.updateBestScore('jewel', score)`. This means:
   - Global trophies (`globalTrophies`) are never incremented.
   - Leaderboard rival overtaking notifications/toasts are never triggered.

---

## 3. `showVictory` Function (trigger conditions, victory layout/modal triggers, logic)

### Direct Observations
- **`showVictory` definition (`src/screens/matchMode.js:1320-1325`):**
  ```javascript
  function showVictory() {
    import('../state/taskState.js').then(({ TaskState }) => {
      TaskState.updateProgress('match_level', 1);
    });
    showEndModal(true);
  }
  ```
- **`checkGameEnd` implementation (`src/screens/matchMode.js:1173-1178`):**
  ```javascript
  function checkGameEnd() {
    if (engine.gameOver || container.isLevelUpModalOpen) return;
    const result = engine.checkEndCondition();
    if (result === 'levelup') {
      container.isLevelUpModalOpen = true;
      showLevelUpModal();
    } ...
  ```

### Analysis & Issues Found
1. **Dead / Uncalled Code:** `showVictory()` is never referenced or called anywhere else in `matchMode.js` or the rest of the codebase.
2. **Missing Daily Task Progress:** Because `showVictory()` is bypassed, the daily task progress updater `TaskState.updateProgress('match_level', 1)` is never executed. Completing Match Mode levels will never progress these tasks.
3. **No Diamond Rewards:** When a level is won, the game triggers `showLevelUpModal()` instead of `showVictory()` / `showEndModal(true)`. The logic inside `showEndModal(true)` that calculates and awards diamonds is completely bypassed:
   ```javascript
   const reward = Math.min(100, 20 + levelNum * 5);
   PlayerState.addDiamonds(reward);
   ```
   As a result, players receive zero diamonds for completing levels in Match Mode.
4. **Incorrect Level Map Advancing:** `showLevelUpModal` increases the level count inline via `engine.level++` and stays in the same screen without resetting elements properly, whereas `showEndModal(true)` updates the hash URL and transitions using the router or re-starts the game module correctly.

---

## 4. Code Cleanup Opportunities

1. **Consolidate/Merge Level-up Modals:**
   - Either remove `showVictory` and `showEndModal(true)` entirely and move their task-updating and diamond-rewarding logic into `showLevelUpModal`, or delete `showLevelUpModal` and call `showVictory` upon winning (aligning Match Mode with how other adventure modes handle completion).
2. **Unify State Updates via `PlayerState`:**
   - Refactor `matchEngine.js` and `matchMode.js` to avoid direct assignment to `PlayerState.state.bestScoreJewel` and instead use `PlayerState.updateBestScore('jewel', score)`.
3. **Fix Hacky `loadState` Return Value:**
   - Instead of returning `false` from `loadState` to force grid re-generation, save and restore the full board state properly. If board state persistence is not desired, `loadState()` should return `true` to signal success, but grid initialization and stats setup should be cleaner and distinct.
4. **Remove Unused Imports / Code:**
   - Cleanup the duplicate/dead imports and unused variables within `matchMode.js`.
