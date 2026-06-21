# Match Mode Logic Investigation Report

An investigation of the Match Mode (Jewel Block) game logic has revealed several critical bugs in save/load functionality, best score tracking, victory triggers, and code structure.

---

## 1. Save/Load Logic Bugs

### A. The "Always Reset" Bug
* **Observation**: In `src/game/matchEngine.js` line 66:
  ```javascript
  loadState() {
    ...
    return false; // Return false to force init() to run and rebuild the grid
  }
  ```
  And in the constructor:
  ```javascript
  if (!this.loadState()) {
    this.init();
  }
  ```
* **Impact**: Because `loadState()` always returns `false` (even upon successfully loading progress from `localStorage`), `this.init()` is *always* executed.
* **Result**: This completely resets `gemTargets.collected` to `0`, restores `movesLeft` to the default/initial level moves, and randomizes a brand new board layout. The user retains their level number and scores, but their mid-game progress (current board, moves spent, objective progress) is completely lost upon reload.

### B. Overwriting Level Selection (Map Routing Breakage)
* **Observation**: In `src/screens/matchMode.js` line 99-100:
  ```javascript
  const engine = new MatchEngine(mode, levelNum);
  engine.init();
  ```
  If a user starts a match from the Adventure Map, `levelNum` (e.g., 5) is passed to the constructor.
  1. The `MatchEngine` constructor sets `this.level = 5`.
  2. `this.loadState()` is called. It loads the saved state (which has `level: 4`).
  3. `this.level` is overwritten to `4`.
  4. The constructor completes, and `startGame` immediately calls `engine.init();` which reads `this.level` (now 4).
* **Impact**: The user is locked to playing the last saved level (Level 4) and cannot select or play Level 5 from the map.

---

## 2. Best Score Tracking Bugs

### A. Direct Mutation Bypassing Trophies & Rivals
* **Observation**: In `src/game/matchEngine.js` line 480 and `src/screens/matchMode.js` line 1335, the player state is mutated directly:
  ```javascript
  PlayerState.state.bestScoreJewel = this.score; // in matchEngine.js
  PlayerState.state.bestScoreJewel = (PlayerState.state.bestScoreJewel || 0) + engine.score; // in matchMode.js
  ```
* **Impact**: Bypassing `PlayerState.updateBestScore('jewel', score)` results in:
  1. `globalTrophies` is never updated for Jewel Mode achievements (which should award trophies scaled by a `1.5` multiplier).
  2. Rival overtaking notifications (`t('rival_passed_toast')`) are never triggered.

### B. High Score vs. Cumulative Sum Conflict
* **Observation**:
  - In `matchEngine.js` (`addScore`), `bestScoreJewel` is treated as a high score (comparing current game score to best score).
  - In `matchMode.js` (`showEndModal`), `bestScoreJewel` is treated as a cumulative score (adding the current game score to the existing best score).
* **Impact**: This inconsistency corrupts the meaning of `bestScoreJewel` in `PlayerState`. Once a level is won, the best score is inflated with cumulative additions. Subsequent games will compare their single-game score against this inflated sum, preventing the high-score logic from ever triggering.

---

## 3. `showVictory` Function Inactivity

### A. Dead Victory Flow
* **Observation**: In `src/screens/matchMode.js` line 1320, the `showVictory` function is defined:
  ```javascript
  function showVictory() {
    import('../state/taskState.js').then(({ TaskState }) => {
      TaskState.updateProgress('match_level', 1);
    });
    showEndModal(true);
  }
  ```
  However, this function is **never called anywhere** in the codebase.
* **Impact**:
  - Daily tasks/achievements (like `task_match_level` to complete 3 match levels) are never updated.
  - The victory modal flow in `showEndModal(true)` is completely bypassed.
  - The player never receives their diamond rewards (`PlayerState.addDiamonds(reward)`) since rewards are only added inside `showEndModal(true)`.

### B. Misdirected Level Win Handling
* **Observation**: In `src/screens/matchMode.js` line 1175:
  ```javascript
  const result = engine.checkEndCondition();
  if (result === 'levelup') {
    container.isLevelUpModalOpen = true;
    showLevelUpModal();
  }
  ```
  Instead of calling `showVictory()` / `showEndModal(true)`, it calls `showLevelUpModal()`.
* **Impact**: `showLevelUpModal()` simply increments the level and re-inits the board on the same screen. It does not update achievements, reward coins/diamonds, or show the correct victory screen.

---

## 4. Code Cleanup Opportunities

* **Dead Code**:
  - `showVictory()` is defined but never called.
  - `this.win = false` in `matchEngine.js` constructor is never used or mutated.
* **Redundant Initializations**:
  - In `matchMode.js` line 100, `engine.init()` is called right after `new MatchEngine(...)`. Since the constructor already invokes `init()`, the entire grid generation and match checking runs twice at game start.
* **Unused Imports**:
  - `Storage` from `../utils/storage.js` is imported in both `src/game/matchEngine.js` and `src/screens/matchMode.js` but never used.
* **Layout Obstacle Overwrites**:
  - In `matchEngine.js` line 109, if `this.level < 40`, `obstacleMode` is randomly set to `'brick'` or `'cage'`. This completely overrides the designed layout characters (`'B'` or `'C'`) defined in `matchLevels.js` templates, forcing the entire layout to be purely bricks or purely cages.
