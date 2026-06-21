# Handoff Report - Merge Hex Exploration

## 1. Observation

During read-only inspection of `src/screens/mergeBlock.js` and `src/game/mergeEngine.js`, the following issues and exact line references were observed:

### Critical Crash 1: ReferenceError because `activeBodyAppends` is not defined
- **File**: `src/screens/mergeBlock.js`
- **Lines**: 252, 408
- **Code Snippets**:
  - Line 252:
    ```javascript
    document.body.appendChild(dragGhost); activeBodyAppends.push(dragGhost);
    ```
  - Line 408:
    ```javascript
    document.body.appendChild(overlayContainer); activeBodyAppends.push(overlayContainer);
    ```
- **Finding**: `activeBodyAppends` is never declared or initialized in `mergeBlock.js`.

### Critical Crash 2: TypeError because `dragController` is used before definition
- **File**: `src/screens/mergeBlock.js`
- **Lines**: 445-446, 461-462, 590
- **Code Snippets**:
  - Lines 445-446:
    ```javascript
    window.addEventListener('mousemove', moveFn, { signal: dragController.signal });
    window.addEventListener('mouseup', upFn, { signal: dragController.signal });
    ```
  - Lines 461-462:
    ```javascript
    window.addEventListener('touchmove', moveFn, { passive: false, signal: dragController.signal });
    window.addEventListener('touchend', endFn, { signal: dragController.signal });
    ```
  - Line 590:
    ```javascript
    let dragController = new AbortController();
    ```
- **Finding**: `renderTray()` (which contains the callbacks accessing `dragController`) is executed on line 580 during the initial screen build. The local variable `dragController` is declared with block-scope `let` later on line 590, leading to risks of TDZ or unresolved reference issues.

### Critical Crash 3: Restart crash because of non-existent methods/UI functions
- **File**: `src/screens/mergeBlock.js`
- **Lines**: 35-38
- **Code Snippet**:
  ```javascript
  onClick: (closeFn) => {
    closeFn();
    engine.initGame();
    updateBoardUI();
    renderNextPieces();
    updateScoreUI();
  }
  ```
- **Finding**:
  - `engine.initGame()` is called, but the `MergeEngine` class has no `initGame()` method.
  - `updateBoardUI()`, `renderNextPieces()`, and `updateScoreUI()` do not exist in `mergeBlock.js`.

### High Crash 17: `engine.restartCurrentLevel()` missing
- **File**: `src/game/mergeEngine.js`
- **Lines**: None (Missing completely)
- **Finding**: `MergeEngine` does not define `restartCurrentLevel()` which is expected by `onPlayAgain` in the game-over screen handler (line 372).

### High Logic 18: Endless mode state not saved
- **File**: `src/game/mergeEngine.js`
- **Lines**: 29, 53
- **Code Snippets**:
  - Line 29 (in `loadGameState`):
    ```javascript
    if (this.mode === 'endless') return false;
    ```
  - Line 53 (in `saveGameState`):
    ```javascript
    if (this.mode === 'endless') return;
    ```
- **Finding**: Endless mode explicitly returns early, preventing saving or loading.

### High Leak 29: `cleanup()` doesn't clear timeouts, intervals, or RAF
- **File**: `src/screens/mergeBlock.js`
- **Lines**: 312, 364, 584, 591-596
- **Code Snippets**:
  - Line 312: `setTimeout(() => { ... }, 200);`
  - Line 364: `setTimeout(() => { ... }, 300);`
  - Line 584: `setTimeout(() => { ... }, 300);`
  - Lines 591-596:
    ```javascript
    container.cleanup = () => {
      if (topBar.cleanup) topBar.cleanup();
      Sounds.stopMusic();
      dragController.abort();
      AdService.hideBanner();};
    ```
- **Finding**: None of the timeouts are cleared during screen cleanup, leading to memory leaks or potential execution of actions after screen destruction.

### Medium UI: Turkish text translations/i18n
- **File**: `src/screens/mergeBlock.js`
- **Lines**: 516, 517, 522
- **Code Snippets**:
  - Line 516: `<h3 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500 tracking-tight">Tebrikler!</h3>`
  - Line 517: `<p class="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">${engine.level}. Seviyeyi tamamladın.</p>`
  - Line 522: `<span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sonraki Seviye</span>`
- **Finding**: Hardcoded Turkish strings exist instead of utilizing the `t()` translation function.

### Low 45: Direct `localStorage` usage instead of `Storage` utility
- **File**: `src/game/mergeEngine.js`
- **Lines**: 31, 66, 71
- **Code Snippets**:
  - Line 31: `const saved = localStorage.getItem(key);`
  - Line 66: `localStorage.setItem(key, JSON.stringify(state));`
  - Line 71: `localStorage.removeItem(key);`
- **Finding**: Directly invokes native `localStorage` instead of using the app's `Storage` wrapper utility.

---

## 2. Logic Chain

1. **Crash 1 (ReferenceError)**: Since `activeBodyAppends` is referenced as an array on lines 252 and 408 but is never declared, any execution path reaching those lines throws a `ReferenceError` crashing the app. Introducing `let activeBodyAppends = [];` at the start of `MergeBlock` resolves this crash.
2. **Crash 2 (TypeError)**: Since `renderTray` is called (L580) before `dragController` is initialized (L590), any event triggering before L590 (though unlikely in practice due to synchronous initial execution) or a strict linter evaluating closures could flag the variable as referenced within the TDZ. Moving `dragController` to the top ensures initialization before any closures are constructed.
3. **Crash 3 (Restart Crash)**: Calling `engine.initGame()`, `updateBoardUI()`, `renderNextPieces()`, and `updateScoreUI()` fails because these identifiers are either not defined on `MergeEngine` or do not map to the local helper names in `mergeBlock.js` (`renderBoard()`, `renderTray()`, and `updateScore()`).
4. **Crash 17 (restartCurrentLevel missing)**: Line 372 of `mergeBlock.js` invokes `engine.restartCurrentLevel()`, which throws a `TypeError` because `restartCurrentLevel` is absent from `MergeEngine`. Creating this method in the engine resolves the crash.
5. **Logic 18 (Endless State Not Saved)**: The early returns on lines 29 and 53 block state persistence for endless mode. Eliminating the early returns enables standard loading/saving using the already-configured key `merge_endless_state`.
6. **Leak 29 (cleanup leaks)**: Unchecked timeouts execute callbacks even if the user navigates away and the screen is destroyed. Storing timeout IDs in an array and clearing them inside `container.cleanup` prevents leaks.
7. **Medium UI (Turkish translations)**: Hardcoded HTML strings ignore the selected language. Mapping them to the `t()` localization engine and defining standard translation resources keeps the UI multi-language compliant.
8. **Low 45 (Storage utility migration)**: Native `localStorage` bypassing limits central isolation prefixing (the `lumina_puzzle_` namespace used by `Storage` utility) and lacks built-in try-catch parsing protection. Utilizing `Storage.get`, `Storage.set`, and `Storage.remove` ensures consistent storage access.

---

## 3. Caveats

- **Storage Key Migration**: Migrating `MergeEngine` to use the `Storage` utility shifts its target local storage keys to `lumina_puzzle_merge_adventure_state` and `lumina_puzzle_merge_endless_state`. Any pre-existing active games stored under the old raw key names will be ignored. This is consistent with the global namespace isolation strategy.

---

## 4. Conclusion

The identified crashes and architectural gaps can be completely resolved by making localized adjustments to `src/screens/mergeBlock.js`, `src/game/mergeEngine.js`, and `src/utils/i18n.js` without rewriting any core gameplay mechanisms.

### Action Plan:

#### 1. Changes to `src/screens/mergeBlock.js`
- **Add variables at the top of `MergeBlock(router)`**:
  ```javascript
  let activeBodyAppends = [];
  let timeoutIds = [];
  const dragController = new AbortController();
  ```
- **Wrap `setTimeout` calls**:
  - L312 (merge SFX): `timeoutIds.push(setTimeout(...))`
  - L364 (actual game over): `timeoutIds.push(setTimeout(...))`
  - L584 (tutorial prompt): `timeoutIds.push(setTimeout(...))`
- **Update `container.cleanup`**:
  ```javascript
  container.cleanup = () => {
    timeoutIds.forEach(id => clearTimeout(id));
    activeBodyAppends.forEach(el => el && el.parentNode && el.remove());
    if (topBar.cleanup) topBar.cleanup();
    Sounds.stopMusic();
    dragController.abort();
    AdService.hideBanner();
  };
  ```
- **Replace top bar restart onClick** (L35-38):
  ```javascript
  onClick: (closeFn) => {
    closeFn();
    if (mode === 'adventure') {
      engine.restartCurrentLevel();
    } else {
      engine.initGame();
    }
    renderBoard();
    renderTray();
    updateScore();
    updateUndoUI();
  }
  ```
- **Replace hardcoded UI translations**:
  - L516: Change `'Tebrikler!'` to `${t('congratulations') || 'Tebrikler!'}`.
  - L517: Change `${engine.level}. Seviyeyi tamamladın.` to `${t('level_complete_desc') ? t('level_complete_desc').replace('{level}', engine.level) : `${engine.level}. Seviyeyi tamamladın.`}`.
  - L522: Change `Sonraki Seviye` to `${t('next_level') || 'Sonraki Seviye'}`.

#### 2. Changes to `src/game/mergeEngine.js`
- **Import `Storage`**:
  ```javascript
  import { Storage } from '../utils/storage.js';
  ```
- **Update `loadGameState`**:
  ```javascript
  loadGameState() {
    const key = this.mode === 'adventure' ? 'merge_adventure_state' : 'merge_endless_state';
    const state = Storage.get(key);
    if (state) {
      if (state.mode === this.mode && (this.mode === 'endless' || state.level === this.level)) {
        this.grid = state.grid;
        this.score = state.score;
        this.levelScore = state.levelScore || 0;
        this.tray = state.tray || [];
        this.history = state.history || [];
        this.undoCount = state.undoCount || 0;
        this.maxSpawnValue = state.maxSpawnValue || 4;
        return true;
      }
    }
    return false;
  }
  ```
- **Update `saveGameState`**:
  ```javascript
  saveGameState() {
    const key = this.mode === 'adventure' ? 'merge_adventure_state' : 'merge_endless_state';
    const state = {
      mode: this.mode,
      level: this.level,
      grid: this.grid,
      score: this.score,
      levelScore: this.levelScore,
      tray: this.tray,
      history: this.history,
      undoCount: this.undoCount,
      maxSpawnValue: this.maxSpawnValue
    };
    Storage.set(key, state);
  }
  ```
- **Update `clearSave`**:
  ```javascript
  clearSave() {
    const key = this.mode === 'adventure' ? 'merge_adventure_state' : 'merge_endless_state';
    Storage.remove(key);
  }
  ```
- **Add `initGame` and `restartCurrentLevel`**:
  ```javascript
  initGame() {
    this.level = 1;
    this.targetScore = this.mode === 'adventure' ? 500 * this.level : Infinity;
    this.score = 0;
    this.levelScore = 0;
    this.gameOver = false;
    this.levelUpReady = false;
    this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
    this.tray = [];
    this.history = [];
    this.undoCount = 0;
    this.maxSpawnValue = 4;
    this.spawnInitialBoard();
    this.fillTray();
    this.saveGameState();
  }

  restartCurrentLevel() {
    this.targetScore = this.mode === 'adventure' ? 500 * this.level : Infinity;
    this.score = 0;
    this.levelScore = 0;
    this.gameOver = false;
    this.levelUpReady = false;
    this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
    this.tray = [];
    this.history = [];
    this.undoCount = 0;
    this.maxSpawnValue = 4;
    this.spawnInitialBoard();
    this.fillTray();
    this.saveGameState();
  }
  ```

#### 3. Changes to `src/utils/i18n.js`
- **Add to `"en"` locale**:
  ```json
  "level_complete_desc": "You have completed level {level}."
  ```
- **Add to `"tr"` locale**:
  ```json
  "level_complete_desc": "{level}. Seviyeyi tamamladın."
  ```

---

## 5. Verification Method

- **Visual Inspections**:
  Ensure all changes follow the exact line mapping. Verify imports and variable scopes using a JS linter or by dry-running screen switches.
- **Manual Flow Checklist**:
  1. Open the Merge Block mode, perform moves, and press the restart button on the top-bar. It should initialize a new board without throwing any exceptions.
  2. Let a game complete (game-over modal). Click "Play Again" in Adventure mode. Verify that `restartCurrentLevel` resets the score to `0` and level score to `0` while maintaining the level number, without crashes.
  3. Close the Merge Block screen. Verify that no timers execute after transition and all ghost overlays are cleanly removed.
  4. Change the language to English, achieve a level-up, and confirm that the level-up congratulations popup displays translated English strings instead of Turkish.
