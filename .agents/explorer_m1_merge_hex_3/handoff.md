# Handoff Report — Milestone 1 Cross-Analysis of Merge Block & Hex Block

This report presents a thorough read-only cross-analysis of `src/screens/mergeBlock.js`, `src/game/mergeEngine.js`, and `src/screens/hexBlock.js` (including its engine `src/game/hexEngine.js`) to evaluate state cleanup patterns (listeners, timers, animation frames, DOM appends) and document a unified strategy to fix crashes, leaks, logic gaps, and translation bugs in Milestone 1.

---

## 1. Observation

### A. Lifecycle Cleanup Patterns (ActiveBodyAppends, Timeouts, Intervals, RAF)

#### 1. activeBodyAppends (Undeclared Variables & DOM Leaks)
- **`src/screens/mergeBlock.js`**:
  - **Line 252**: `document.body.appendChild(dragGhost); activeBodyAppends.push(dragGhost);`
  - **Line 408**: `document.body.appendChild(overlayContainer); activeBodyAppends.push(overlayContainer);`
  - **Observations**: `activeBodyAppends` is never declared or initialized in `mergeBlock.js`. Under ES module strict mode, this throws a `ReferenceError: activeBodyAppends is not defined` as soon as a drag operation begins or a diamond purchase overlay is generated. Furthermore, `container.cleanup` (lines 591–596) completely omits cleaning up body-appended elements.
- **`src/screens/hexBlock.js`**:
  - **Line 310**: `document.body.appendChild(floatingEl); activeBodyAppends.push(floatingEl);`
  - **Line 549**: `document.body.appendChild(overlayContainer); activeBodyAppends.push(overlayContainer);`
  - **Line 656**: `document.body.appendChild(ghost); activeBodyAppends.push(ghost);`
  - **Observations**: Like `mergeBlock.js`, `activeBodyAppends` is never declared in `hexBlock.js`. Running line-clear explosions, piece dragging, or purchase triggers will throw a `ReferenceError`. The screen's `cleanup()` function (lines 718-726) does not clean up these body-appended elements.

#### 2. Timeouts and Intervals
- **`src/screens/mergeBlock.js`**:
  - Uses `setTimeout` at **Line 312** (play SFX delay), **Line 364** (actual game-over delay), and **Line 584** (tutorial auto-display).
  - **Observations**: None of these timeouts are tracked or cleared when the screen changes. If a user triggers a game-over or opens the screen and immediately exits, the untracked timeouts will execute on the new screen, causing late DOM modifications or showing modals on the wrong screen (e.g. game over screen shown on the main menu). No `timeoutIds` or `intervalIds` arrays exist.
- **`src/screens/hexBlock.js`**:
  - Correctly initializes `let timeoutIds = [];` and `let intervalIds = [];` (lines 19-20).
  - Pushes timeouts into `timeoutIds` (e.g. lines 435, 513, 575, 578, 618, 629, 657, 704).
  - Clears them all on unmount: `timeoutIds.forEach(id => clearTimeout(id));` and `intervalIds.forEach(id => clearInterval(id));` (lines 719-720).

#### 3. requestAnimationFrame (RAF)
- **`src/screens/mergeBlock.js`**:
  - Does not utilize `requestAnimationFrame`.
- **`src/screens/hexBlock.js`**:
  - Sets `rafId` on lines 405, 614, and 625: `rafId = requestAnimationFrame(...)`.
  - Clears it on unmount: `if (rafId) cancelAnimationFrame(rafId);` (line 721).
  - **Observations**: Using a single `rafId` scalar creates a race condition. Since dragging and multiple floating score texts execute concurrently, `rafId` is constantly overwritten. Only the last scheduled animation frame is cancelled on cleanup, leaving other active animation frames to run post-unmount. Additionally, `rafHexMoveId` (line 401) is used inside `onMove` to throttle mouse moves but is never cancelled on screen cleanup.

#### 4. Event Listeners
- Both screens use `AbortController` (`dragController`) to clean up window-level move and up/end event listeners using `{ signal: dragController.signal }` (e.g. lines 445-446, 461-462 in `mergeBlock.js` and lines 451-452, 468-469 in `hexBlock.js`).
- **`src/screens/mergeBlock.js` TDZ Issue**:
  - **Line 580**: Invokes `renderTray()`, which sets up event listeners referring to `dragController.signal`.
  - **Line 590**: Declares `let dragController = new AbortController();`.
  - **Observations**: Because `let` declarations are not hoisted, this results in a Temporal Dead Zone (TDZ) reference issue where `dragController` is accessed before its declaration.

---

### B. Functional & Logic Issues

#### 1. Non-existent Method and UI Function Calls on Restart
- **`src/screens/mergeBlock.js` (Lines 35-38)**:
  ```javascript
  onClick: (closeFn) => {
    closeFn();
    engine.initGame();
    updateBoardUI();
    renderNextPieces();
    updateScoreUI();
  }
  ```
- **Observations**:
  - `MergeEngine` does not have an `initGame()` method.
  - `updateBoardUI()`, `renderNextPieces()`, and `updateScoreUI()` do not exist in `mergeBlock.js`. (The correct UI update methods in `mergeBlock.js` are `renderBoard()`, `renderTray()`, and `updateScore()`).
  - This results in a crash on clicking the top-bar restart button.

#### 2. Missing `restartCurrentLevel()` in MergeEngine
- **`src/screens/mergeBlock.js` (Line 372)**:
  `engine.restartCurrentLevel();` (called when clicking "Play Again" in Adventure mode).
- **Observations**: `MergeEngine` does not define `restartCurrentLevel()`, leading to a crash when playing again in Adventure mode.

#### 3. Endless Mode State Persistence Missing
- **`src/game/mergeEngine.js`**:
  - **Line 29**: `if (this.mode === 'endless') return false;` (in `loadGameState`)
  - **Line 53**: `if (this.mode === 'endless') return;` (in `saveGameState`)
- **Observations**: Endless mode explicitly skips state loading and saving, meaning endless game progress is lost on reloading or navigating away.

#### 4. Undo History Stack Size Limit of 1 in Hex Mode
- **`src/game/hexEngine.js` (Lines 356-364)**:
  ```javascript
  _saveHistory() {
    // Only keep last 1 move for undo
    this.history = [{
      board: new Map(this.board),
      score: this.score,
      comboCount: this.comboCount,
      activePieces: JSON.parse(JSON.stringify(this.activePieces))
    }];
  }
  ```
- **Observations**: Re-initializing the history array to a single-element array on every placement limits the undo capability to exactly 1 move, contradicting the UI design that supports up to 3 undos costing `[50, 150, 300]` diamonds.

#### 5. Direct `localStorage` Usage in MergeEngine
- **`src/game/mergeEngine.js` (Lines 31, 66, 71)**: Bypasses the application-wide `Storage` utility, missing namespacing (`lumina_puzzle_` prefix) and safety guards.

#### 6. Missing Daily Quest Updates
- **`src/game/hexEngine.js`**: The daily task `hex_lines` ("Altıgen Blok: 5 satır temizle") is never updated. `TaskState` is imported on line 1 but never invoked.
- **`src/game/mergeEngine.js`**: The daily task `merge_count` ("Blok Birleştirme: 10 blok birleştir") is never updated because `TaskState` is not imported or called.

---

### C. i18n and Translation Issues

#### 1. Hardcoded Turkish UI Elements
- **`src/screens/mergeBlock.js` (Lines 516-522)**:
  - Hardcoded Turkish level-up text:
    - `Tebrikler!` (line 516)
    - `${engine.level}. Seviyeyi tamamladın.` (line 517)
    - `Sonraki Seviye` (line 522)
  - This forces Turkish text even when the user runs the game in English.

#### 2. Hardcoded Turkish Fallbacks in i18n Key Wrappers
- **`src/screens/hexBlock.js`**:
  - `t('restart') || 'Yeniden Başla'` (line 31)
  - `t('second_chance') || 'İkinci Şans'` (line 479)
  - `t('revive_desc_hex') || 'Bir kısım hücre temizlenecek, oyuna devam edebilirsin!'` (line 483)
  - `t('revive_diamonds_hex') || '300 Elmas Harca'` (line 487)
  - `t('revive_ad_hex') || 'Reklam İzle & Devam Et'` (line 491)
  - `t('give_up') || 'Pes Et'` (line 494)
- **`src/game/hexEngine.js`**:
  - `t('max_undo_reached') || 'Bu oyunda maksimum Geri Al hakkını doldurdun!'` (line 373)
  - `t('need_diamonds_undo') || 'Geri almak için {cost} elmasa ihtiyacınız var!'` (line 382)
- **`src/screens/mergeBlock.js`**:
  - `t('restart') || 'Yeniden Başla'` (line 31)
  - `t('second_chance') || 'İkinci Şans'` (line 328)
  - `t('revive_desc_blocks') || 'Alanı biraz temizleyip oyuna devam etmek ister misin?'` (line 332)
  - `t('revive_diamonds_merge') || '300 Elmas Harca'` (line 337)
  - `t('revive_ad_merge') || 'Reklam İzle & Devam Et'` (line 341)
  - `t('give_up') || 'Pes Et'` (line 345)
- **`src/game/mergeEngine.js`**:
  - `t('no_undo_move') || 'Geri alınacak hamle yok!'` (line 97)
  - `t('max_undo_reached') || 'Bu oyunda maksimum Geri Al hakkını doldurdun!'` (line 103)
  - `Geri almak için ${cost} elmasa ihtiyacınız var!` (line 110)
- **Observations**: Fallback strings in key wrappers default to Turkish instead of English. Since the translation engine defaults to English when language files are missing or keys are unrecognized, JS code-level fallbacks should be in English.

#### 3. Incorrect / Literal Turkish Translation Key
- **`src/utils/i18n.js` (Line 746)**: `"menu_merge": "Birleştir Blok"`
- **Observations**: "Birleştir Blok" is a grammatically incorrect, literal translation of "Merge Block". It should be `"Blok Birleştirme"` or `"Sayı Birleştirme"`.

#### 4. Hardcoded Turkish Locale in Hex Score Formatting
- **`src/screens/hexBlock.js` (Lines 93, 205)**:
  `engine.bestScore.toLocaleString('tr-TR')`
- **Observations**: Hardcodes the Turkish locale, causing numbers to format with Turkish rules (e.g., dot as thousands separator) for all international users.

---

## 2. Logic Chain

1. **Undeclared activeBodyAppends**: Placing elements onto `document.body` and attempting to push to a non-existent variable throws a `ReferenceError` in ES Module strict mode, crashing the game. Declaring `let activeBodyAppends = [];` inside both screens' initializer function fixes the crashes.
2. **Body Appends Leak**: Elements appended to `document.body` remain detached and orphaned in the document object model when switching screens, causing leaks. Iterating and removing them in `cleanup()` (`activeBodyAppends.forEach(el => el && el.parentNode && el.remove())`) solves the memory leak.
3. **Temporal Dead Zone (TDZ)**: Declaring `dragController` with `let` after it has been referenced by functions inside `renderTray()` triggers a reference error. Moving the declaration of `dragController` to the top of the function scope guarantees it is defined when `renderTray()` is evaluated.
4. **Merge Block Restart & Adventure Play-Again Crashes**:
   - Calling missing UI functions (`updateBoardUI`, `renderNextPieces`, `updateScoreUI`) and missing engine method (`engine.initGame()`) causes the restart button to crash. Rewriting the restart handler to call `renderBoard()`, `renderTray()`, `updateScore()`, and `updateUndoUI()` and implementing `initGame()` inside `MergeEngine` corrects this.
   - Calling `engine.restartCurrentLevel()` in the game over screen crashes because `restartCurrentLevel` is missing from `MergeEngine`. Implementing it in the engine resolves the crash.
5. **Endless Mode State Loss**: Saving/loading is skipped for endless mode due to early returns. Removing these conditions permits standard persistence using the existing `merge_endless_state` key.
6. **Hex Undo Limit**: Recreating `this.history = [{...}]` on every placement discards historical states. Changing this to `this.history.push({...})` and capping the array length to 3 (matching the UI's max undos) enables multi-step undo while limiting memory growth.
7. **Score Formatting**: `toLocaleString('tr-TR')` forces Turkish formatting globally. Removing the parameter (`toLocaleString()`) defaults formatting to the user's local settings, aligning with the behavior in `mergeBlock.js`.
8. **Timeouts and Animation Frame Leaks**:
   - Untracked timeouts in `mergeBlock.js` can execute callbacks post-destruction. Storing timeout IDs in a `timeoutIds` array and clearing them on unmount prevents this.
   - Overwriting `rafId` in `hexBlock.js` prevents cancelling older active animation frames. Tracking all animation frames in a `rafIds` array and cancelling all of them during cleanup prevents unmounted animation frame execution and race conditions.
9. **Daily Quests Progress**:
   - Calling `TaskState.updateProgress('hex_lines', clearedCount)` inside `hexEngine.js` updates the altıgen line clear quest progress.
   - Importing `TaskState` and calling `TaskState.updateProgress('merge_count', 1)` on successful block combination events inside `mergeEngine.js` checkMergeCascade updates the merge count quest progress.
10. **Hardcoded Translations & Fallbacks**:
    - Replacing hardcoded Turkish texts in the level-up modal with `t(...)` keys and setting appropriate English and Turkish translations in `i18n.js` enables correct localization.
    - Updating Turkish fallbacks in code wrappers to English ensures a standard fallback mechanism.
    - Correcting `"menu_merge": "Birleştir Blok"` to `"menu_merge": "Blok Birleştirme"` fixes the grammatical issue in Turkish.

---

## 3. Caveats

- **Storage Key Prefixing**: Transitioning `MergeEngine` to use the `Storage` utility instead of native `localStorage` means state keys will now be prefixed with `lumina_puzzle_` (matching the `Storage` configuration). As a result, any pre-existing active endless game states saved under raw `merge_endless_state` will not be loaded. This is desired as it aligns with the project's centralized storage isolation policy.
- **Quest Progression**: The quest `merge_count` is defined as "Blok Birleştirme: 10 blok birleştir". Increasing progress by `1` for each merge step in `checkMergeCascade()` is the correct translation of "perform 10 merges".

---

## 4. Conclusion

A unified, robust strategy to resolve the crashes, memory leaks, and translation issues in Milestone 1 without regressions involves the following changes:

### A. Code Proposals for `src/screens/mergeBlock.js`
1. **Initialize lifecycle trackers at the very top of `MergeBlock(router)`**:
   ```javascript
   let activeBodyAppends = [];
   let timeoutIds = [];
   const dragController = new AbortController();
   ```
2. **Ensure all timeouts are tracked**:
   - Wrap line 312: `timeoutIds.push(setTimeout(() => { ... }, 200))`
   - Wrap line 364: `timeoutIds.push(setTimeout(() => { ... }, 300))`
   - Wrap line 584: `timeoutIds.push(setTimeout(() => { ... }, 300))`
3. **Update `container.cleanup` to clear timeouts and body appends**:
   ```javascript
   container.cleanup = () => {
     if (topBar.cleanup) topBar.cleanup();
     Sounds.stopMusic();
     dragController.abort();
     timeoutIds.forEach(id => clearTimeout(id));
     activeBodyAppends.forEach(el => el && el.parentNode && el.remove());
     AdService.hideBanner();
   };
   ```
4. **Fix restart button action mapping**:
   Replace lines 33-39 inside the `showQuitConfirmation` onClick callback:
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
5. **Localize Level-Up Modal HTML**:
   Replace lines 508-527:
   - Replace `'Bölüm Tamamlandı!'` with `t('level_complete') || 'Level Complete!'`
   - Replace `'Tebrikler!'` with `t('congratulations') || 'Congratulations!'`
   - Replace `${engine.level}. Seviyeyi tamamladın.` with `(t('level_complete_desc') || 'You completed level {level}.').replace('{level}', engine.level)`
   - Replace `'Sonraki Seviye'` with `t('next_level') || 'Next Level'`
6. **Correct Code-Level Fallbacks to English**:
   - Line 31: `t('restart') || 'Restart'`
   - Line 328: `t('second_chance') || 'Second Chance'`
   - Line 332: `t('revive_desc_blocks') || 'Do you want to clear some blocks and continue?'`
   - Line 337: `t('revive_diamonds_merge') || 'Spend 300 Diamonds'`
   - Line 341: `t('revive_ad_merge') || 'Watch Ad & Continue'`
   - Line 345: `t('give_up') || 'Give Up'`
   - Line 55: `${t('undo') || 'Undo'}`

### B. Code Proposals for `src/game/mergeEngine.js`
1. **Import `Storage` and `TaskState`**:
   ```javascript
   import { Storage } from '../utils/storage.js';
   import { TaskState } from '../state/taskState.js';
   ```
2. **Utilize `Storage` instead of `localStorage` and Enable Endless Mode Saving**:
   - Update `loadGameState()`:
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
   - Update `saveGameState()`:
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
   - Update `clearSave()`:
     ```javascript
     clearSave() {
       const key = this.mode === 'adventure' ? 'merge_adventure_state' : 'merge_endless_state';
       Storage.remove(key);
     }
     ```
3. **Add `initGame()` and `restartCurrentLevel()` methods**:
   ```javascript
   initGame() {
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
4. **Update `merge_count` Task Progress on Successful Merges**:
   Inside `checkMergeCascade(r, c)` inside the successful merge block (approx line 232):
   ```javascript
   TaskState.updateProgress('merge_count', 1);
   ```
5. **Change Code-Level Fallbacks to English**:
   - Line 97: `t('no_undo_move') || 'No move to undo!'`
   - Line 103: `t('max_undo_reached') || 'Maximum undo reached!'`
   - Line 110: `const msg = t('need_diamonds_undo') ? t('need_diamonds_undo').replace('{cost}', cost) : 'You need ' + cost + ' diamonds to Undo!';`

### C. Code Proposals for `src/screens/hexBlock.js`
1. **Initialize lifecycle trackers at the top of `HexBlock(router)`**:
   ```javascript
   let activeBodyAppends = [];
   let timeoutIds = [];
   let intervalIds = [];
   let rafIds = [];
   ```
2. **Update all requestAnimationFrame calls to push into `rafIds`**:
   - E.g., `rafIds.push(requestAnimationFrame(...))` instead of just `rafId = requestAnimationFrame(...)` or `rafHexMoveId = rafId = requestAnimationFrame(...)`.
3. **Update `container.cleanup` to clear timeouts, intervals, RAFs and body appends**:
   ```javascript
   container.cleanup = () => {
     timeoutIds.forEach(id => clearTimeout(id));
     intervalIds.forEach(id => clearInterval(id));
     rafIds.forEach(id => cancelAnimationFrame(id));
     activeBodyAppends.forEach(el => el && el.parentNode && el.remove());
     dragController.abort();
     if (topBar.cleanup) topBar.cleanup();
     Sounds.stopMusic();
     AdService.hideBanner();
   };
   ```
4. **Localize Number Formatting**:
   Remove the hardcoded `'tr-TR'` locale parameter in `toLocaleString()` calls on lines 93 and 205:
   `engine.bestScore.toLocaleString()`
5. **Correct Code-Level Fallbacks to English**:
   - Line 31: `t('restart') || 'Restart'`
   - Line 55: `${t('undo') || 'Undo'}`
   - Line 479: `t('second_chance') || 'Second Chance'`
   - Line 483: `t('revive_desc_hex') || 'Some cells will be cleared so you can keep playing!'`
   - Line 487: `t('revive_diamonds_hex') || 'Spend 300 Diamonds'`
   - Line 491: `t('revive_ad_hex') || 'Watch Ad & Continue'`
   - Line 494: `t('give_up') || 'Give Up'`

### D. Code Proposals for `src/game/hexEngine.js`
1. **Add Daily Task Progress Updates**:
   Inside `checkAndClearLines()` when lines are cleared (approx line 290):
   ```javascript
   TaskState.updateProgress('hex_lines', clearedCount);
   ```
2. **Enable Bounded History Stack of Size 3**:
   Replace `_saveHistory()`:
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
3. **Correct Code-Level Fallbacks to English**:
   - Line 373: `t('max_undo_reached') || 'Maximum undo reached!'`
   - Line 382: `const msg = (t('need_diamonds_undo') || 'You need {cost} diamonds to Undo!').replace('{cost}', cost).replace('${cost}', cost);`

### E. Code Proposals for `src/utils/i18n.js`
1. **Add Level-Up modal description translations**:
   - English (`"en"` locale): `"level_complete_desc": "You completed level {level}."`
   - Turkish (`"tr"` locale): `"level_complete_desc": "{level}. Seviyeyi tamamladın."`
2. **Correct the Turkish literal translation value of `"menu_merge"`**:
   Change `"menu_merge": "Birleştir Blok"` to `"menu_merge": "Blok Birleştirme"`
3. **Correct the Turkish literal translation value of `"merge_modal_title"`**:
   Change `"merge_modal_title": "Birleştir Blok"` to `"merge_modal_title": "Blok Birleştirme"`

---

## 5. Verification Method

### Automated Build Verification
Ensure the codebase remains buildable by executing:
```powershell
npm run build
```
This runs Vite packaging. If any syntactical issues, variable hoisting bugs, or missing imports occur, the build will fail.

### Manual Verification Checklist
1. **Clean Screen Switches**: Navigate to Hex Block, drag a block, clear a line, and trigger a popup. Exit back to the main menu. Inspect the DOM in chrome devtools to verify that all overlays, explosion particles, and ghost drag elements have been removed from `<body>`.
2. **Merge Restart**: Open Merge Block, click the top bar restart button, and verify that the game resets correctly without throwing exceptions.
3. **Endless Mode Save/Load**: Run Merge Block in Endless Mode, perform a few moves, exit to the menu, and re-enter Endless Mode. Verify that the board layout and score are restored correctly.
4. **Hex Mode Undo**: Perform 3 consecutive moves in Hex Block, click the Undo pill 3 times, and verify that all 3 moves revert correctly.
5. **Localization Verification**:
   - Switch language to English. Complete a level in Merge Block adventure mode. Verify that the text in the level-up modal reads `"Congratulations!"` and `"You completed level X."` in English.
   - Confirm that the menu card for Merge Block reads `"Merge Block"` in English and `"Blok Birleştirme"` in Turkish.
6. **Task Progression**: Verify that clearing lines in Hex Block increments the "Altıgen Blok: 5 satır temizle" quest on the Tasks screen. Verify that merging blocks in Merge Block increments the "Blok Birleştirme: 10 blok birleştir" quest.
