# Handoff Report — Match Mode Game Logic Investigation

This handoff report summarizes the Match Mode logic investigation findings and outlines the logic chain and verification steps for the implementer agent.

---

## 1. Observation

Direct observations and quotes from the codebase:

### Save/Load & Serialization Logic:
- **File**: `src/game/matchEngine.js`
- **Lines 43–52 (`saveState`)**:
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
- **Lines 54–70 (`loadState`)**:
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

### Best Score Tracking:
- **File**: `src/game/matchEngine.js`
- **Lines 473–482 (`addScore`)**:
  ```javascript
  addScore(pts) {
    this.score += pts;
    this.levelScore += pts;
    
    // Check Best Score
    let best = PlayerState.state.bestScoreJewel || 0;
    if (this.score > best) {
      PlayerState.state.bestScoreJewel = this.score;
      PlayerState.save();
    }
  ```
- **File**: `src/screens/matchMode.js`
- **Line 1335 (`showEndModal` - Win)**:
  ```javascript
  PlayerState.state.bestScoreJewel = (PlayerState.state.bestScoreJewel || 0) + engine.score;
  ```

### showVictory Function & Triggers:
- **File**: `src/screens/matchMode.js`
- **Lines 1320–1325 (`showVictory`)**:
  ```javascript
  function showVictory() {
    import('../state/taskState.js').then(({ TaskState }) => {
      TaskState.updateProgress('match_level', 1);
    });
    showEndModal(true);
  }
  ```
- **Lines 1173–1191 (`checkGameEnd`)**:
  ```javascript
  function checkGameEnd() {
    if (engine.gameOver || container.isLevelUpModalOpen) return;
    const result = engine.checkEndCondition();
    if (result === 'levelup') {
      container.isLevelUpModalOpen = true;
      showLevelUpModal();
    } else ...
  ```
- **Lines 1267–1318 (`showLevelUpModal` button action)**:
  ```javascript
          onClick: (closeFn) => {
            closeFn();
            engine.level++;
            engine.levelScore = 0;
            engine.score = 0;
            engine.init();
            engine.gameOver = false;
            engine.levelUpReady = false;
            PlayerState.state.jewelCrushLevel = engine.level;
            PlayerState.save();
            engine.saveState();
  ```

### Redundant Initialization / Cleanup Opportunities:
- **File**: `src/screens/matchMode.js`
- **Lines 99–100 (`startGame`)**:
  ```javascript
  const engine = new MatchEngine(mode, levelNum);
  engine.init();
  ```
- **File**: `src/game/matchEngine.js`
- **Lines 38–40 (Constructor)**:
  ```javascript
  if (!this.loadState()) {
    this.init();
  }
  ```

---

## 2. Logic Chain

1. **Save/Load Logic & Workaround**:
   - `loadState()` parses the save state and updates level and scores, but returns `false` explicitly. 
   - Because it returns `false`, `!this.loadState()` is `true` in the `MatchEngine` constructor, triggering `this.init()`.
   - `init()` generates a fresh board, resetting moves left to maximum and resetting gem collection progress.
   - Thus, reloading the browser mid-level restores scores but completely regenerates the grid, moves, and targets. This allows players to exploit restarts to get infinite moves.
   - Also, replaying an earlier completed level via URL or Map selection (which sets `levelNum`) is overridden inside `loadState()` which forces `this.level = state.level || 1;` using the saved level from `localStorage`.

2. **Best Score Contradiction**:
   - `MatchEngine.addScore()` directly mutates `PlayerState.state.bestScoreJewel` and saves it. This treats `bestScoreJewel` as a single-run High Score (which aligns with `profile.js` labeling it a "Patlatma Rekoru" / Explosion Record, and `playerState.js` comparing `score > bestScoreJewel`).
   - However, direct mutation bypasses `PlayerState.updateBestScore('jewel', score)`, skipping the calculation of global trophies and rival overtake logic.
   - Furthermore, `showEndModal(true)` (if it were called) does `bestScoreJewel = bestScoreJewel + score`, treating it as a cumulative level-completion sum. This directly conflicts with the high score implementation.

3. **showVictory Inaction**:
   - `checkGameEnd()` triggers `showLevelUpModal()` on level victory, completely bypassing `showVictory()`.
   - Bypassing `showVictory()` means `TaskState.updateProgress('match_level', 1)` is never called, breaking the progression tasks for Match Mode.
   - Bypassing `showVictory()` also means `showEndModal(true)` is never shown, denying players their diamond rewards.
   - Under `showLevelUpModal()`, the engine's level is incremented to the next level inline via `engine.level++`, but the local `levelNum` in the screen's closure remains stuck at the original value. If the player subsequently fails the next level and selects "Try Again", `startGame` runs using the stale `levelNum`, forcing them back to the original level.

4. **Double Initialization Waste**:
   - `MatchEngine` constructor runs `this.init()` (due to `loadState()` returning `false`).
   - Immediately after instantiation, `startGame()` calls `engine.init()` again.
   - The grid generation, palette configuration, and layout setup run twice sequentially.

---

## 3. Caveats

- We assumed that `bestScoreJewel` is intended to be a single-run high score (explosion record) rather than cumulative, based on Leaderboard comparisons, Badge progress thresholds, and Profile page styling.
- We did not investigate whether other screens use the uncalled `showVictory` function, but project-wide searches confirmed that it is not imported or called elsewhere.

---

## 4. Conclusion

The investigation reveals five critical errors in Match Mode:
1. **Broken level transition flow**: Bypassing `showVictory` breaks diamond rewards, tasks completion tracking, and causes a level mismatch on retry due to the stale closure variable.
2. **High score corruption**: Contradictory logic exists between cumulative score modification in `showEndModal(true)` and high score mutation in `addScore(pts)`. Direct mutation also bypasses trophies.
3. **Save/Load exploit**: Saving doesn't serialize the grid, moves, or gem targets. Reloading gives players max moves again while keeping their score. Level replaying is blocked by `loadState` overriding selected level with the saved level.
4. **Startup redundancy**: Dual initialization calls run `init()` twice during startup.
5. **Dead code**: Unused methods (`turnIntoSpecial`, `getNormalBlocks`, `allGemsCollected`) and the unused `showVictory` function itself clutter the files.

---

## 5. Verification Method

1. **Build Verification**:
   - Propose running `npm run build` or `vite build` in the workspace to verify there are no compilation or syntax errors with proposed changes.
2. **Visual Inspection**:
   - Check the console logs during page load. Observe if two grid initialization processes execute.
   - Complete Level 1 in Match Mode. Verify that task progress `match_level` remains 0, and that no diamond rewards are added.
   - Reach Level 2 via the level-up modal, then lose and click "Try Again". Verify that you are redirected back to Level 1.
   - Refresh the page mid-level. Verify that the grid changes and moves are reset to max while scores are retained.
