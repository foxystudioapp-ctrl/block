# Match Mode Logic Analysis Report

This document outlines the findings of the read-only investigation on the Match Mode game logic errors in the codebase, specifically targeting `src/game/matchEngine.js`, `src/screens/matchMode.js`, and related files.

---

## 1. Save/Load Logic (`localStorage` Save/Restore Correctness & Serialization)

### Observations:
In `src/game/matchEngine.js`, the `saveState()`, `loadState()`, and constructor logic are implemented as follows:
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
- **Lines 38–41 (Constructor)**:
  ```javascript
  if (!this.loadState()) {
    this.init();
  }
  ```

### Analysis of Save/Load Bugs & Issues:
1. **Incomplete Serialization / Reset State on Reload**:
   - The saved state ONLY records `level`, `score`, and `levelScore`.
   - Critical grid-state elements are **omitted from serialization**:
     - `this.grid` (the board blocks layout, brick/caged states, and colors)
     - `this.movesLeft` (how many moves are remaining for the level)
     - `this.gemTargets.collected` (the progression counters for each gem goal)
   - Because of this, when `loadState` is called, the game behaves incorrectly on page reload:
     - The grid is completely regenerated from scratch.
     - `this.movesLeft` resets to the level's default max moves.
     - All collected gems count progress is wiped and reset to `0`.
     - However, the overall `score` and `levelScore` are restored.
   - **Exploit & Frustration Risk**: Players can refresh the page mid-game to get a fresh board and max moves while keeping their accumulated scores. Alternatively, honest players lose their board layout and gem collections progress.
2. **Workaround Returning `false` on Success**:
   - `loadState()` returns `false` even when it successfully parses and restores the save state (line 66: `return false; // Return false to force init() to run and rebuild the grid`).
   - Returning `false` triggers `!this.loadState() === true` in the constructor, forcing `this.init()` to execute and rebuild the grid. This is a hacky workaround for not serializing the board state, resulting in confusing logic.
3. **Adventure Level Selection Override**:
   - If the user selects a completed level from the Adventure Map to replay (e.g. Level 1), the screen calls `startGame(..., levelNum = 1)`.
   - In the engine constructor, `this.level` is set to `1` but is immediately overwritten in `loadState()` by the `state.level` retrieved from `localStorage` (which holds the highest uncompleted level, e.g. Level 5).
   - This makes it impossible for users to replay completed levels as long as there is an active save state in local storage.

---

## 2. Best Score Tracking (Updates and Persistence)

### Observations:
- **`src/game/matchEngine.js` Lines 473–482 (`addScore`)**:
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
    ...
  ```
- **`src/screens/matchMode.js` Line 1335 (`showEndModal(true)`)**:
  ```javascript
  PlayerState.state.bestScoreJewel = (PlayerState.state.bestScoreJewel || 0) + engine.score;
  ```

### Analysis of Best Score Tracking Bugs & Issues:
1. **Direct State Mutation Bypasses Progression Systems**:
   - In `matchEngine.js:addScore`, the code directly assigns the value: `PlayerState.state.bestScoreJewel = this.score` and calls `PlayerState.save()`.
   - This directly bypasses `PlayerState.updateBestScore('jewel', this.score)`.
   - Bypassing `updateBestScore` means:
     - **No global trophies are awarded** for setting a high score in Jewel Mode (which is calculated as `(score - bestScoreJewel) * 1.5` in `playerState.js`).
     - **No rival overtaking notifications** are shown to the user.
2. **Cumulative Score vs. Record Conflict**:
   - The field `bestScoreJewel` is intended to be a **High Score Record** (single-run score), as shown in:
     - `src/screens/profile.js:247`: Labeled as `Patlatma Rekoru` (Explosion Record).
     - `src/state/playerState.js:342`: Compared in `updateBestScore` with the single-game score.
     - `src/utils/badges.js:28`: Thresholds of up to 1,000,000 for the `jewel_master` badge.
   - However, in `screens/matchMode.js:1335`, the code does:
     `PlayerState.state.bestScoreJewel = (PlayerState.state.bestScoreJewel || 0) + engine.score;`
     This treats the best score as a **cumulative total** of all completed level scores.
   - If `showVictory` (which triggers `showEndModal(true)`) were called, it would add the score to the best score record, corrupting the single-run high score and making badges trivial to obtain.
   - In contrast, in `addScore(pts)`, it checks `this.score > best`, meaning the next time a player scores in endless mode, the cumulative score is overwritten by a single run score if it happens to be higher, or it simply prevents endless scores from being registered as high scores if the cumulative score has ballooned.

---

## 3. showVictory Function (Triggers, Modal Triggers, & Logic)

### Observations:
- **`src/screens/matchMode.js` Lines 1320–1325 (`showVictory`)**:
  ```javascript
  function showVictory() {
    import('../state/taskState.js').then(({ TaskState }) => {
      TaskState.updateProgress('match_level', 1);
    });
    showEndModal(true);
  }
  ```
- **`src/screens/matchMode.js` Lines 1173–1191 (`checkGameEnd`)**:
  ```javascript
  function checkGameEnd() {
    if (engine.gameOver || container.isLevelUpModalOpen) return;
    const result = engine.checkEndCondition();
    if (result === 'levelup') {
      container.isLevelUpModalOpen = true;
      showLevelUpModal(); // Bypasses showVictory()!
    } else if (result === 'lose') {
      ...
  ```

### Analysis of Victory Logic Bugs:
1. **Uncalled `showVictory` / Broken Task Tracking & Diamond Rewards**:
   - The `showVictory()` function is **never called** in the entire codebase.
   - Instead, `checkGameEnd()` triggers `showLevelUpModal()` on level completion.
   - Because `showVictory` is bypassed:
     - **Task progress is broken**: `TaskState.updateProgress('match_level', 1)` is never executed. Daily/weekly tasks related to Match Mode levels can never be completed.
     - **No diamond rewards**: The user is never shown `showEndModal(true)`, which awards diamonds based on the level (`const reward = Math.min(100, 20 + levelNum * 5)`).
     - **Simpler modal UI**: The user is shown the simple `showLevelUpModal()` screen, which lacks score details, stars, and diamond rewards.
2. **State Mismatch and In-Place Level Transitions Bug**:
   - When the user clicks "SONRAKİ SEVİYE" (Next Level) in `showLevelUpModal()`, it executes:
     ```javascript
     engine.level++;
     engine.init();
     ```
     This increments `engine.level` and regenerates the board in-place.
   - However, the local variable `levelNum` in the screen's `startGame()` closure **is not updated**. It remains stuck at its original value (e.g. `1`).
   - If the player subsequently fails the next level (e.g. Level 2) and clicks "Tekrar Dene" (Try Again) on the Game Over screen:
     ```javascript
     onClick: (close) => { close(); startGame(container, router, mode, levelNum); }
     ```
     Since `levelNum` is still `1`, the game **reloads at Level 1 instead of Level 2**.
   - If `showVictory()` had been used, it would have called `startGame(container, router, mode, levelNum + 1)`, which properly recreates the screen with the incremented level number, keeping the local variables in sync.

---

## 4. Code Cleanup Opportunities

### Redundant Board Initializations:
- During Match Mode game startup in `src/screens/matchMode.js:99–100`:
  ```javascript
  const engine = new MatchEngine(mode, levelNum);
  engine.init();
  ```
- However, the `MatchEngine` constructor already runs:
  ```javascript
  if (!this.loadState()) {
    this.init();
  }
  ```
- Because `loadState()` always returns `false`, `this.init()` runs in the constructor. Then `engine.init()` runs again immediately in `startGame()`.
- **Impact**: Board generation, colors mapping, obstacle layouts, and target setup run **twice sequentially** at startup, which is redundant and wastes processing cycles.

### Dead / Unused Code:
1. **`showVictory`** in `src/screens/matchMode.js:1320` is never called.
2. **`turnIntoSpecial`** in `src/game/matchEngine.js:765` is defined but never called.
3. **`getNormalBlocks`** in `src/game/matchEngine.js:753` is defined but never called.
4. **`allGemsCollected`** in `src/game/matchEngine.js:463` is defined but never called.

### Inelegant `loadState` Workaround:
- Returning `false` on a successful JSON load inside `loadState()` is highly counter-intuitive. 
- It should either return `true` and the engine should handle custom board rebuilding in a clean way, or the save state should be expanded to properly serialize the grid and moves to avoid the need to regenerate the layout on load.
