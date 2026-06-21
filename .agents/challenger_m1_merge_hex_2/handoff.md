# Handoff Report — Logic Checks on HexEngine and MergeEngine

## 1. Observation

A detailed review of `src/game/hexEngine.js`, `src/game/mergeEngine.js`, `src/screens/hexBlock.js`, and `src/screens/mergeBlock.js` revealed the following specific code constructs and anomalies:

### Observation A: Unconditional Diamond Deduction in `undo()`
In both `HexEngine` and `MergeEngine`, the `undo()` method unconditionally calls `PlayerState.useDiamonds(cost)` and exits if the player does not have enough diamonds.

Verbatim code from `src/game/hexEngine.js` (lines 381-389):
```javascript
    const cost = costs[this.undoCount];
    const success = PlayerState.useDiamonds(cost);
    if (!success) {
      import('../components/toast.js').then(({ Toast }) => {
        const msg = (t('need_diamonds_undo') || 'You need {cost} diamonds to Undo!').replace('{cost}', cost).replace('${cost}', cost);
        Toast.show(msg, 'warning');
      });
      return false;
    }
```

Verbatim code from `src/game/mergeEngine.js` (lines 132-138):
```javascript
    const cost = costs[this.undoCount];
    const canUndo = PlayerState.useDiamonds(cost);
    if (!canUndo) {
      const msg = t('need_diamonds_undo') ? t('need_diamonds_undo').replace('{cost}', cost) : `You need ${cost} diamonds to Undo!`;
      Toast.show(msg, 'error');
      return false;
    }
```

However, both screen handlers (`hexBlock.js` and `mergeBlock.js`) try to offer an ad-supported undo path when the player has insufficient diamonds, calling `engine.undo()` in the callback.

Verbatim code from `src/screens/hexBlock.js` (lines 680-689):
```javascript
      if (engine.history && engine.history.length > 0 && engine.undoCount < costs.length && PlayerState.state.diamonds < currentCost) {
        showUndoAdModal(currentCost, () => {
          const success = engine.undo();
          if (success) {
            updateBoardUI();
            renderTray();
            updateUndoUI();
          }
        });
        return;
      }
```

Verbatim code from `src/screens/mergeBlock.js` (lines 615-626):
```javascript
      if (engine.history && engine.history.length > 0 && engine.undoCount < costs.length && PlayerState.state.diamonds < currentCost) {
        showUndoAdModal(currentCost, () => {
          if (engine.undo()) {
            Sounds.playSfx('undo');
            renderBoard();
            renderTray();
            updateScore();
            updateUndoUI();
          }
        });
        return;
      }
```

### Observation B: HexEngine History Omitted from LocalStorage
In `src/game/hexEngine.js`, `saveToLocalStorage` and `loadFromLocalStorage` do not persist the `history` array.

Verbatim code from `src/game/hexEngine.js` (lines 402-412):
```javascript
  saveToLocalStorage() {
    const data = {
      board: Array.from(this.board.entries()),
      score: this.score,
      comboCount: this.comboCount,
      activePieces: this.activePieces,
      gameOver: this.gameOver,
      undoCount: this.undoCount
    };
    Storage.set('hex_state', data);
  }
```

### Observation C: Map Instances inside HexEngine History
In `src/game/hexEngine.js`, the history stack stores the board state as a `Map`.

Verbatim code from `src/game/hexEngine.js` (lines 357-367):
```javascript
  _saveHistory() {
    this.history.push({
      board: new Map(this.board),
      score: this.score,
      comboCount: this.comboCount,
      activePieces: JSON.parse(JSON.stringify(this.activePieces))
    });
    if (this.history.length > 3) {
      this.history.shift();
    }
  }
```

### Observation D: Hardcoded Board Size Verification in HexEngine
The load function in `src/game/hexEngine.js` validates that the loaded board size is exactly 61 cells.

Verbatim code from `src/game/hexEngine.js` (lines 417-422):
```javascript
      this.board = new Map(data.board);
      // Valid hex board of radius 4 has exactly 61 cells.
      if (this.board.size !== 61) {
        this.initGame();
        return;
      }
```

### Observation E: Missing GameOver Check on MergeBlock Load
Unlike `HexBlock`, `MergeBlock` does not inspect `engine.gameOver` on initialization to display the game over/revive modal.

Verbatim code from `src/screens/mergeBlock.js` (lines 587-597):
```javascript
  initBoardDOM();
  renderBoard();
  renderTray();
  updateScore();
  updateUndoUI();

  timeoutIds.push(setTimeout(() => {
    if (container.isConnected) {
      checkAndShowTutorial('merge');
    }
  }, 300));
```

### Observation F: NextLevel in MergeEngine carries over grid & retains GameOver
In `src/game/mergeEngine.js`, the transition to a new adventure level does not clear the grid tiles, nor does it reset the `gameOver` property.

Verbatim code from `src/game/mergeEngine.js` (lines 99-106):
```javascript
  nextLevel() {
    this.level++;
    this.targetScore = 500 * this.level;
    this.levelScore = 0;
    this.levelUpReady = false;
    this.history = [];
    this.saveGameState();
  }
```


---

## 2. Logic Chain

### Logic Chain 1: Broken Ad-Supported Undo (Critical Bug)
1. **Fact**: When a player selects "Undo" with fewer diamonds than required, they are directed to watch an ad (`showUndoAdModal`).
2. **Fact**: Once they finish watching the ad, the callback is invoked, which calls `engine.undo()`.
3. **Fact**: In both `HexEngine` and `MergeEngine`, `engine.undo()` unconditionally checks `PlayerState.useDiamonds(cost)`.
4. **Fact**: Because the player has insufficient diamonds, `PlayerState.useDiamonds(cost)` returns `false`.
5. **Conclusion**: The undo action fails completely, showing a "need diamonds" Toast message to the user after they have already watched the ad.

### Logic Chain 2: Wiped Undo History in HexEngine
1. **Fact**: `saveToLocalStorage` does not serialize `this.history`.
2. **Fact**: Upon reopening/reloading, the constructor or `initGame()` initializes `this.history` to `[]`.
3. **Fact**: `undoCount` is loaded from localStorage.
4. **Conclusion**: If the player reloads the game, they cannot undo their last moves (history is empty), but they still suffer from any incremented `undoCount` (limiting future undos in that game session).

### Logic Chain 3: Map Serialization Limitation
1. **Fact**: In Javascript, `JSON.stringify(new Map())` evaluates to `{}`.
2. **Fact**: HexEngine history items store the board as a `Map` instance (`new Map(this.board)`).
3. **Conclusion**: If a developer attempts to fix the wiped undo history by directly storing `history: this.history` in `saveToLocalStorage`, the board states inside the history stack will be serialized as empty objects `{}`. This would trigger crashes or corruptions when reloading and trying to retrieve coordinate keys from a plain object as if it were a Map.

### Logic Chain 4: Hardcoded Radius Constraint
1. **Fact**: The formula for the number of cells in a hex board of radius $R$ is $3R(R+1) + 1$. For $R=4$, this equals 61.
2. **Fact**: `loadFromLocalStorage` checks `if (this.board.size !== 61) { this.initGame(); return; }`.
3. **Conclusion**: If `HexEngine` is ever instantiated with a radius other than 4, it will fail this check every time, causing the game state to reset on every page load.

### Logic Chain 5: Merge Mode Softlock on Reload
1. **Fact**: If a player ends a Merge game with `gameOver = true` and closes the app, the state `{ gameOver: true, grid: [...] }` is written to localStorage.
2. **Fact**: When reloading, the game loads the board state successfully.
3. **Fact**: `MergeBlock` does not check `engine.gameOver` to display the game over/second chance modal upon load.
4. **Conclusion**: The user is presented with a full grid, is unable to make any moves, and has no Game Over dialog popup to trigger a restart or revive. They are effectively soft-locked.

### Logic Chain 6: Merging Game-Over Cascade in Adventure Mode
1. **Fact**: If a placement triggers a level completion but also fills the board, both `levelUpReady` and `gameOver` will be `true`.
2. **Fact**: The user completes the level and clicks "Next Level".
3. **Fact**: `engine.nextLevel()` is executed. It does not reset `grid` or change `gameOver` to `false`.
4. **Conclusion**: The new level starts with a full board and `gameOver: true`, triggering an immediate Game Over modal for the next level without giving the player a chance to make a single move.


---

## 3. Caveats

- **No Code Modifications**: As instructed, no implementation files have been modified.
- **Verification Environment**: Tests could not be executed programmatically because the permission prompt for `run_command` timed out. All conclusions are derived from systematic static code analysis.


---

## 4. Conclusion

- **Overall Risk Assessment**: **HIGH**
- **Summary**: The current undo mechanism is severely broken when triggered via the ad-watching option. It fails to perform the undo because the engine tries to deduct diamonds even after the ad is watched. Additionally, `HexEngine`'s history is lost upon page reloads, and any attempt to directly serialize it will result in corrupted Map data. There are also high risks of soft-locking on load in Merge Mode and immediate Game Over cascade during transition between Adventure Mode levels.


---

## 5. Verification Method

To verify these logic bugs manually or programmatically:

1. **Ad-Supported Undo Verification**:
   - Accumulate fewer diamonds than the current undo cost (e.g., have 10 diamonds when cost is 50).
   - Place a piece.
   - Click the "Undo" button.
   - A modal to watch an ad will appear. Watch/interact with the ad wrapper.
   - Observe that the ad modal closes, but a warning toast "You need 50 diamonds to Undo!" is shown, and the board does not revert.

2. **Merge Mode Load Softlock Verification**:
   - Play Endless Merge Mode until the grid is filled and a Game Over occurs.
   - Close/refresh the browser tab.
   - Observe that the game loads a full grid, but no modal appears. It is impossible to place a piece, rendering the game unplayable without manual data clearance.

3. **Adventure Mode Next Level Carryover Verification**:
   - Complete a Merge Adventure level.
   - Observe that the grid remains fully populated with blocks when starting the next level, instead of resetting to the initial 5 random blocks.
