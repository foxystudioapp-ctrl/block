# Handoff Report - Explorer Match 3

## 1. Observation

### Save/Load Logic:
* In `src/game/matchEngine.js` line 66, the `loadState()` function is implemented as:
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
* In `src/game/matchEngine.js` constructor (lines 38-40):
  ```javascript
  if (!this.loadState()) {
    this.init();
  }
  ```
* In `src/screens/matchMode.js` lines 99-100:
  ```javascript
  const engine = new MatchEngine(mode, levelNum);
  engine.init();
  ```

### Best Score Tracking:
* In `src/game/matchEngine.js` lines 477-482:
  ```javascript
  // Check Best Score
  let best = PlayerState.state.bestScoreJewel || 0;
  if (this.score > best) {
    PlayerState.state.bestScoreJewel = this.score;
    PlayerState.save();
  }
  ```
* In `src/screens/matchMode.js` lines 1335-1336:
  ```javascript
  PlayerState.state.bestScoreJewel = (PlayerState.state.bestScoreJewel || 0) + engine.score;
  PlayerState.save();
  ```
* In `src/state/playerState.js` lines 342-346:
  ```javascript
  } else if (mode === 'jewel' && score > this.state.bestScoreJewel) {
    const diff = score - this.state.bestScoreJewel;
    this.state.globalTrophies += diff * multiplier;
    this.state.bestScoreJewel = score;
    changed = true;
  }
  ```

### showVictory Function:
* In `src/screens/matchMode.js` lines 1320-1325:
  ```javascript
  function showVictory() {
    import('../state/taskState.js').then(({ TaskState }) => {
      TaskState.updateProgress('match_level', 1);
    });
    showEndModal(true);
  }
  ```
* The PowerShell search tool (`Get-ChildItem -Recurse -Filter "*.js" | Select-String "showVictory"`) confirmed that `showVictory` is defined in `screens/matchMode.js:1320` but never referenced/called anywhere else in the workspace.
* In `src/screens/matchMode.js` lines 1175-1178 (inside `checkGameEnd`):
  ```javascript
  const result = engine.checkEndCondition();
  if (result === 'levelup') {
    container.isLevelUpModalOpen = true;
    showLevelUpModal();
  }
  ```

### Code Cleanup:
* Unused imports: `Storage` is imported in `src/game/matchEngine.js` line 5 and `src/screens/matchMode.js` line 12 but not referenced.
* Unused property: `this.win` is initialized in `matchEngine.js` line 25 but never read or updated.
* Obstacle mode overrides: In `src/game/matchEngine.js` line 109-111:
  ```javascript
  const obstacleMode = (this.level < 40) 
    ? (Math.random() < 0.5 ? 'brick' : 'cage') 
    : 'mixed';
  ```

---

## 2. Logic Chain

1. **Always-Reset Bug**: Because `loadState()` returns `false` on success (line 66), the condition `!this.loadState()` evaluates to `true` in the constructor. Therefore, `this.init()` always runs. When `this.init()` runs, it randomizes the grid and resets `collected` gem targets and `movesLeft`. Thus, progress cannot be saved mid-game.
2. **Level Lock Bug**: When the user launches a level from the map, `levelNum` is passed to the `MatchEngine` constructor. The constructor runs `loadState()`, which overrides `this.level` to the value retrieved from `match_adventure_state` in `localStorage`. Since `startGame` calls `engine.init()` immediately after construction, the engine initializes the loaded level (e.g., Level 4) instead of the selected level (Level 5).
3. **Score Tracking Issues**: Modifying `PlayerState.state.bestScoreJewel` directly (bypassing `PlayerState.updateBestScore('jewel', score)`) prevents `globalTrophies` from being updated and skips rival overtaking notifications. Furthermore, adding the level score on victory (`+ engine.score` in `matchMode.js`) while comparing the single-session score in `matchEngine.js` leads to high-score corruption.
4. **Victory Flow Breakage**: Because `checkGameEnd()` triggers `showLevelUpModal()` on level win instead of calling `showVictory()`, daily tasks of type `match_level` are never progressed, and the player is not awarded diamonds (as diamond rewards are calculated and added inside `showEndModal(true)`, which is only called by `showVictory`).
5. **Redundant Init Call**: Because the constructor runs `this.init()`, calling `engine.init()` immediately after construction in `matchMode.js` makes the board generation and match validation run twice sequentially, wasting resources.

---

## 3. Caveats

* We assume that `bestScoreJewel` was meant to track the player's highest score in a single game of Jewel (Match-3) mode (consistent with other modes like `bestScoreClassic` or `bestScore2048`), rather than a cumulative total of all levels.
* We assume the override of layout obstacles (turning designed mixed bricks/cages to purely bricks or cages under level 40) was an intentional difficulty design, though it overrides level designers' intentions.

---

## 4. Conclusion

Match Mode has severe state persistence and logic errors:
* **Save/Load**: State loading is broken by `loadState` always returning `false` and overwriting router level parameters.
* **Score tracking**: Directly mutating `bestScoreJewel` corrupts high score tracking and skips trophy awards.
* **Victory**: `showVictory` is dead code; the current level-up modal prevents rewards and task completions.
* **Code Cleanup**: Redundant initializations, unused variables, and imports should be removed.

---

## 5. Verification Method

To independently verify these findings:
1. **Inspection**:
   - Inspect `src/game/matchEngine.js` line 66 (return value of `loadState()`).
   - Inspect `src/screens/matchMode.js` line 1320 (the unused `showVictory` function).
   - Inspect `src/screens/matchMode.js` line 1335 and `src/game/matchEngine.js` line 480 (how `bestScoreJewel` is updated).
2. **Runtime Verification**:
   - Save a game state, reload the page, and observe that the board layout and moves left are randomized/refilled rather than restored.
   - Click a completed level from the Adventure Map and verify that the game loads the last saved level instead of the selected level.
   - Complete a level and check that your diamonds and daily tasks progress do not increase.
