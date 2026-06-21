# Handoff Report

## 1. Observation

### Save/Load Logic:
- In `src/game/matchEngine.js` line 43:
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
- In `src/game/matchEngine.js` line 54:
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
- In `src/game/matchEngine.js` line 478:
  ```javascript
  // Check Best Score
  let best = PlayerState.state.bestScoreJewel || 0;
  if (this.score > best) {
    PlayerState.state.bestScoreJewel = this.score;
    PlayerState.save();
  }
  ```
- In `src/screens/matchMode.js` line 1335:
  ```javascript
  PlayerState.state.bestScoreJewel = (PlayerState.state.bestScoreJewel || 0) + engine.score;
  PlayerState.save();
  ```
- In `src/state/playerState.js` line 342:
  ```javascript
  } else if (mode === 'jewel' && score > this.state.bestScoreJewel) {
    const diff = score - this.state.bestScoreJewel;
    this.state.globalTrophies += diff * multiplier;
    this.state.bestScoreJewel = score;
    changed = true;
  }
  ```

### showVictory Function:
- In `src/screens/matchMode.js` line 1320:
  ```javascript
  function showVictory() {
    import('../state/taskState.js').then(({ TaskState }) => {
      TaskState.updateProgress('match_level', 1);
    });
    showEndModal(true);
  }
  ```
- In `src/screens/matchMode.js` line 1173:
  ```javascript
  function checkGameEnd() {
    if (engine.gameOver || container.isLevelUpModalOpen) return;
    const result = engine.checkEndCondition();
    if (result === 'levelup') {
      container.isLevelUpModalOpen = true;
      showLevelUpModal();
    }
  ```

---

## 2. Logic Chain

1. **Save/Load Logic:**
   - **Step 1:** From `saveState`'s code structure, the state object only contains `level`, `score`, and `levelScore`. No other property (such as the board `grid`, spent/remaining `movesLeft`, or collected `gemTargets` count) is stored.
   - **Step 2:** From `loadState` returning `false`, the constructor `if (!this.loadState()) { this.init(); }` will always invoke `init()`.
   - **Step 3:** The `init()` function regenerates a randomized grid and overrides `movesLeft` and `gemTargets[].collected = 0`.
   - **Step 4:** Therefore, loading a state resets mid-level board progress, resets moves back to maximum, but preserves the score. This creates an exploit where players can reload the page to refresh their moves while keeping their current score.

2. **Best Score Tracking:**
   - **Step 1:** In `matchEngine.js`, `bestScoreJewel` is updated if `this.score > best`. This corresponds to **high score (single-run max)** semantics.
   - **Step 2:** In `matchMode.js`, winning a level adds `engine.score` directly to `bestScoreJewel`. This corresponds to **cumulative total** semantics.
   - **Step 3:** These two semantics directly clash and will overwrite/corrupt each other when the player surpasses their previous cumulative score in a single run or vice-versa.
   - **Step 4:** Neither file uses the centralized `PlayerState.updateBestScore('jewel', score)` method. Consequently, player trophies are never incremented, and overtaking notifications are never sent.

3. **showVictory Function:**
   - **Step 1:** The `showVictory()` function is defined but never called anywhere in the codebase.
   - **Step 2:** The game calls `showLevelUpModal()` on level completion, which does not progress tasks (`TaskState.updateProgress`) and does not invoke `showEndModal(true)`.
   - **Step 3:** Because `showEndModal(true)` is bypassed, the player is never awarded the diamond bonus defined inside it (`PlayerState.addDiamonds(reward)`).

---

## 3. Caveats

- We assumed that `bestScoreJewel` was meant to behave as a single-run high score (similar to other modes like Classic, Hex, etc.), which is backed by the fact that `PlayerState.updateBestScore` implements high score overtake logic and includes a trophy multiplier for it.
- We did not write code changes or run tests on local execution since this is a read-only investigation.

---

## 4. Conclusion

- **Save/Load:** The logic is incomplete (missing grid, moves, gem progress serialization) and exploit-prone due to forcing `init()` on load which resets moves while preserving the score.
- **Best Score:** Semantics are broken (clashing cumulative vs high score logic) and bypass the global `updateBestScore` API, preventing trophy awards.
- **showVictory:** It is a dead function. `showLevelUpModal()` is called instead, bypassing the daily task progression and diamond rewards logic defined in `showVictory` / `showEndModal(true)`.

---

## 5. Verification Method

- **Files to Inspect:**
  - `src/game/matchEngine.js` (lines 43-70 for Save/Load; lines 478-482 for Best Score check)
  - `src/screens/matchMode.js` (line 1335 for cumulative score addition; lines 1320-1325 for uncalled `showVictory` function; lines 1173-1178 for victory transition to `showLevelUpModal`)
  - `src/state/playerState.js` (lines 342-346 for `updateBestScore` Jewel configuration)
- **Manual Verification Steps:**
  1. Open the game, play Match Mode, increase your score, and reload the browser. Observe that your moves are reset to the maximum, but your score is retained (proving the save/load exploit).
  2. Complete a level in Match Mode. Observe that no diamonds are awarded, and daily tasks do not update.
