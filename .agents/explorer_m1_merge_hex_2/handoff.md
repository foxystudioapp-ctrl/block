# Handoff Report — Hex Block Issues Analysis

This report documents the detailed investigation, findings, and precise recommendations for fixing issues related to `src/screens/hexBlock.js` and `src/game/hexEngine.js`.

---

## 1. Observation

Direct code observations from `src/screens/hexBlock.js` and `src/game/hexEngine.js`:

### Issue 1: Critical Crash (activeBodyAppends is not defined)
* **File**: `src/screens/hexBlock.js`
* **Direct Observations**:
  * Line 310:
    ```javascript
    document.body.appendChild(floatingEl); activeBodyAppends.push(floatingEl);
    ```
  * Line 549:
    ```javascript
    document.body.appendChild(overlayContainer); activeBodyAppends.push(overlayContainer);
    ```
  * Line 656:
    ```javascript
    document.body.appendChild(ghost); activeBodyAppends.push(ghost);
    ```
  * Checking lines 18-28 (beginning of `HexBlock(router)`), there is no declaration for `activeBodyAppends`:
    ```javascript
    export function HexBlock(router) {
      let timeoutIds = [];
      let intervalIds = [];
      let rafId;
      const container = document.createElement('div');
      container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] relative overflow-hidden flex flex-col justify-between bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-pop-up pb-2 sm:pb-3 md:pb-6 lg:pb-10';

      let engine = new HexEngine(4);
    ```
  * Contrast this with `src/screens/classicBlock.js` (lines 19-21) where `activeBodyAppends` is defined:
    ```javascript
    export function ClassicBlock(router) {
      let activeBodyAppends = [];
    ```

### Issue 2: High Leak (cleanup() does not clean up body-appended elements)
* **File**: `src/screens/hexBlock.js`
* **Direct Observations**:
  * The cleanup function on lines 718-726 contains:
    ```javascript
    container.cleanup = () => {
      timeoutIds.forEach(id => clearTimeout(id));
      intervalIds.forEach(id => clearInterval(id));
      if (rafId) cancelAnimationFrame(rafId);
      dragController.abort();
      if (topBar.cleanup) topBar.cleanup();
      Sounds.stopMusic();
    
      AdService.hideBanner();};
    ```
  * It completely omits deleting body-appended elements, which will persist in the DOM even after switching screen views.
  * Contrast with `src/screens/classicBlock.js` (lines 1271-1273):
    ```javascript
    container.cleanup = () => {
      activeBodyAppends.forEach(el => el && el.parentNode && el.remove());
      timeoutIds.forEach(id => clearTimeout(id));
    ```

### Issue 3: Hardcoded Turkish Locale (`toLocaleString('tr-TR')`)
* **File**: `src/screens/hexBlock.js`
* **Direct Observations**:
  * Line 93:
    ```javascript
    <span id="hex-best" class="text-sm md:text-base lg:text-xl font-black text-gray-500">${engine.bestScore.toLocaleString('tr-TR')}</span>
    ```
  * Line 205:
    ```javascript
    if (elHexBest) elHexBest.textContent = engine.bestScore.toLocaleString('tr-TR');
    ```
  * The locale parameter `'tr-TR'` is hardcoded, which overrides the system/selected locale.

### Issue 4: Undo History Only Holds 1 Move
* **File**: `src/game/hexEngine.js`
* **Direct Observations**:
  * The `_saveHistory()` method on lines 356-364 is defined as:
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
  * The `undo()` method on lines 366-397 pops from `this.history`:
    ```javascript
    const state = this.history.pop();
    this.board = state.board;
    ```
  * The UI in `hexBlock.js` (lines 216-234) references up to 3 cost limits:
    ```javascript
    const costs = [50, 150, 300];
    if (engine.undoCount >= costs.length) {
      // ...
    ```

### Issue 5: Daily Quest Progress Not Updated (`TaskState.updateProgress`)
* **File**: `src/game/hexEngine.js`
* **Direct Observations**:
  * Line 1 imports `TaskState`:
    ```javascript
    import { TaskState } from '../state/taskState.js';
    ```
  * But `TaskState` is never referenced anywhere else in the file.
  * In `src/state/taskState.js` (line 20), there is a daily task with ID `hex_lines`:
    ```javascript
    { id: 'hex_lines', text: t('task_hex_lines') || 'Altıgen Blok: 5 satır temizle', target: 5, current: 0, rewardType: 'diamonds', rewardAmount: 75, claimed: false },
    ```

### Issue 6: UI Translations
* **File**: `src/screens/hexBlock.js` and `src/game/hexEngine.js`
* **Direct Observations**:
  * The following Turkish fallback strings are hardcoded:
    * `hexBlock.js` line 31: `text: t('restart') || 'Yeniden Başla'`
    * `hexBlock.js` line 479: `title: t('second_chance') || 'İkinci Şans'`
    * `hexBlock.js` line 483: `t('revive_desc_hex') || 'Bir kısım hücre temizlenecek, oyuna devam edebilirsin!'`
    * `hexBlock.js` line 487: `t('revive_diamonds_hex') || '300 Elmas Harca'`
    * `hexBlock.js` line 491: `t('revive_ad_hex') || 'Reklam İzle & Devam Et'`
    * `hexBlock.js` line 494: `t('give_up') || 'Pes Et'`
    * `hexEngine.js` line 373: `t('max_undo_reached') || 'Bu oyunda maksimum Geri Al hakkını doldurdun!'`
    * `hexEngine.js` line 382: `t('need_diamonds_undo') || 'Geri almak için {cost} elmasa ihtiyacınız var!'`

---

## 2. Logic Chain

### Issue 1: Critical Crash
1. The code attempts to execute `activeBodyAppends.push(...)` during dragging and particle explosions.
2. Since `let activeBodyAppends = [];` is not defined anywhere in the module/function scope, JavaScript throws a `ReferenceError: activeBodyAppends is not defined` runtime exception, crashing the script.
3. Defining `let activeBodyAppends = [];` at the top of the screen's main function scope fixes the undefined reference error.

### Issue 2: High Leak
1. Body-appended elements (such as `overlayContainer`, `floatingEl`, and `ghost` elements) are appended directly to `document.body`.
2. When the user navigates away from the screen, only `container` is removed, but elements appended to `document.body` remain detached and orphaned in the DOM.
3. Introducing `activeBodyAppends.forEach(el => el && el.parentNode && el.remove());` within `container.cleanup` ensures all orphaned elements on `document.body` are properly destroyed, preventing the DOM memory leak.

### Issue 3: Hardcoded Turkish Locale
1. Hardcoding `'tr-TR'` in `.toLocaleString('tr-TR')` forces Turkish number formatting (e.g. using `.` as thousands separator) for all users regardless of system locale.
2. Replacing `'tr-TR'` with an unparameterized `.toLocaleString()` defaults formatting to the user's local settings, or dynamically mapping using `getCurrentLang()` from `i18n.js` maintains formatting alignment with the selected game language.

### Issue 4: Undo History Only Holds 1 Move
1. `_saveHistory()` re-initializes `this.history` to a single-element array `[{...}]` each time a piece is placed, throwing away older states.
2. This restricts the history to a maximum length of 1, meaning `undo()` can only be called once consecutively.
3. Changing `this.history = [{...}]` to `this.history.push({...})` transforms it into a true stack. Capping the stack size to 3 matching the UI's max undo limit maintains bounded memory.

### Issue 5: Daily Quest Progress Not Updated
1. There is a daily quest `hex_lines` (Altıgen Blok: 5 satır temizle).
2. The clearing logic is processed in `checkAndClearLines()` within `hexEngine.js`.
3. Since `TaskState.updateProgress` is never called, the progress of this task remains 0.
4. Invoking `TaskState.updateProgress('hex_lines', clearedCount)` within `checkAndClearLines()` resolves this issue.

### Issue 6: UI Translations
1. Fallback strings are hardcoded to Turkish. If translation files are missing, or if the user is playing in another language that does not map successfully, the Turkish text is displayed.
2. Replacing fallbacks with their English equivalents ensures a standard fallback mechanism.

---

## 3. Caveats
* We assumed that the system locale formatting via unparameterized `.toLocaleString()` is acceptable instead of mapping to standard languages. If strict locale mapping to the app's selected language is desired, `getCurrentLang()` can be mapped via a local dictionary.

---

## 4. Conclusion

The code in `src/screens/hexBlock.js` and `src/game/hexEngine.js` requires five specific fixes:
1. Declare `let activeBodyAppends = [];` at the start of `HexBlock(router)` in `hexBlock.js`.
2. Update the `cleanup` method of `HexBlock(router)` in `hexBlock.js` to iterate and remove elements in `activeBodyAppends`.
3. Replace hardcoded `toLocaleString('tr-TR')` calls in `hexBlock.js` with `toLocaleString()`.
4. Refactor `_saveHistory()` in `hexEngine.js` to push states to `this.history` and limit the history length to 3.
5. Call `TaskState.updateProgress('hex_lines', clearedCount);` in `checkAndClearLines()` in `hexEngine.js`.
6. Replace hardcoded Turkish fallbacks in `t(...)` wrapper expressions in `hexBlock.js` and `hexEngine.js` with English fallbacks.

---

## 5. Verification Method

### Automated Build Verification
Verify the syntax correctness by running the build script in the root directory:
```powershell
npm run build
```

### Manual Verification Steps
1. **Dragging & Explosions**: Start a Hex Block game, drag a block, and clear a line. Verify that there is no crash during the drag or the line-clear animation.
2. **Memory Leak**: Open Hex Block, open and close the revive diamonds modal/overlay, and then navigate back to the main menu. Inspect the DOM in devtools to verify that all overlays and ghost elements are removed from `<body>`.
3. **Number Formatting**: Change browser/system locale to `en-US` and verify the Best score formats using `,` instead of `.`.
4. **Undo Stack**: Perform 3 consecutive moves, then press the Undo button 3 times. Verify that all 3 moves are successfully reverted.
5. **Quest Progress**: Clean 1 or more lines in Hex Block. Navigate to Tasks page and verify progress on the "Altıgen Blok: 5 satır temizle" quest increases.
