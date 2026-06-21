# Cross-Analysis Report: 2048 & Color Sort Cleanup and Translation Strategy

## 1. Observation

Direct observations made in the codebase across `src/screens/game2048.js`, `src/game/2048Engine.js`, `src/screens/colorSort.js`, `src/game/sortEngine.js`, and related modules:

### A. Color Sort Screen (`src/screens/colorSort.js`)
* **Reference Error Crash**:
  On line 135:
  ```javascript
  document.body.appendChild(floatingEl); activeBodyAppends.push(floatingEl);
  ```
  However, the `activeBodyAppends` array is never declared in `colorSort.js`.
* **Missing Cleanup of Appended Nodes**:
  `container.cleanup` on lines 452–456 contains no loop to remove any elements appended to `document.body`:
  ```javascript
  container.cleanup = () => {
    if (topBar.cleanup) topBar.cleanup();
    Sounds.stopMusic();
  
    AdService.hideBanner();};
  ```
* **Uncleared Timeouts**:
  - Line 295: `setTimeout(showWinModal, 400);`
  - Line 300: `setTimeout(() => targetTubeEl.classList.remove('animate-shake'), 300);`
  - Line 445:
    ```javascript
    setTimeout(() => {
      renderTubes();
      updateUndoUI();
      Sounds.startMusic('game');
      checkAndShowTutorial('sort');
    }, 100);
    ```
  None of these timeout IDs are captured or cleared on unmount.
* **Uncleared Animation Frame**:
  `rafSortId` is scheduled on line 172:
  ```javascript
  rafSortId = requestAnimationFrame(() => { ... });
  ```
  It is not cancelled in `container.cleanup()`.
* **Leaking Dynamic Event Listeners**:
  Window-level listeners are added during block dragging on lines 216–217 (mouse) and 234–235 (touch):
  ```javascript
  window.addEventListener('mousemove', moveFn);
  window.addEventListener('mouseup', upFn);
  ...
  window.addEventListener('touchmove', moveFn, { passive: false });
  window.addEventListener('touchend', endFn);
  ```
  If unmounted mid-drag, these listeners remain on `window`, and releasing the click/touch triggers `onEnd` (line 185) which calls `handleMoveAttempt` and DOM operations on a destroyed screen.

### B. 2048 Screen (`src/screens/game2048.js`)
* **BuyDiamonds Overlay Leak**:
  The "Buy Diamonds" overlay is loaded and appended to `document.body` on lines 393–408:
  ```javascript
  import('./buyDiamonds.js').then(m => {
    const BuyDiamonds = m.BuyDiamonds;
    let overlayContainer = null;
    const closeOverlay = () => { ... };
    overlayContainer = BuyDiamonds(router, closeOverlay);
    ...
    document.body.appendChild(overlayContainer);
  });
  ```
  This overlay is not tracked via any cleanup array. If the screen is navigated away while this overlay is open, it remains stuck on the screen.
* **Uncleared Timeouts**:
  - Line 364: `setTimeout(() => { Sounds.playSfx('game-over'); ... }, 300);`
  - Line 511: `setTimeout(() => { if (container.isConnected) { ... } }, 300);`
  These timeout IDs are not captured or cleared.
* **Thread-Blocking Alert**:
  On line 429:
  ```javascript
  alert(t('win') || "Tebrikler! 2048'e ulaştınız!");
  ```

### C. Localization Module (`src/utils/i18n.js`)
* **Turkish translation for 'win'**:
  - Line 801: `"win": "Kazan",`
  This translates the noun "Win" to the Turkish verb "Kazan" (or noun "Cauldron"), which is incorrect in the context of victory.
* **Parameter Mismatch for 'level_completed'**:
  - Line 338 of `colorSort.js`: `t('level_completed', {lvl: engine.level})`
  - Line 212 of `i18n.js`: `"level_completed": "Level Completed",`
  - Line 726 of `i18n.js`: `"level_completed": "Bölüm Tamamlandı",`
  Neither of these translations accepts a parameter, so the level number is lost. However, `level_complete_desc` is:
  - Line 211: `"level_complete_desc": "You completed level {level}.",`
  - Line 725: `"{level}. Seviyeyi tamamladın.",`
* **Translation Function (`t`) Interpolation Logic**:
  - Lines 5703–5707:
    ```javascript
    if (text !== key && Object.keys(params).length > 0) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp('{' + k + '}', 'g'), v);
      }
    }
    ```
    This shows the interpolation syntax is `{parameter_name}`.

### D. Other Codebase Alert Calls (Firebase Setup)
* Although out of the main game loop, `src/services/firebaseSetup.js` contains two thread-blocking `alert()` calls on lines 188 and 211 for native authentication errors.

---

## 2. Logic Chain

1. **Crash & Reference Error**: Dragging a block in `colorSort.js` executes line 135. Since `activeBodyAppends` has not been declared anywhere in the scope of `ColorSort`, the JS engine throws a `ReferenceError`, stopping game interaction.
2. **Post-Unmount Crashes & Side Effects**: 
   - Since `rafSortId` is not cancelled in `colorSort.js`'s cleanup, a pending frame callback can execute after the screen is unmounted, accessing non-existent DOM elements and causing crashes.
   - Uncleared timeouts (like the 100ms render timeout in `colorSort.js` or the 300ms game-over delay in `game2048.js`) will execute their callbacks post-unmount. This triggers game music or opens modals/plays sound effects on top of the wrong screen (e.g. Main Menu).
   - Dynamic drag window listeners that persist post-unmount will call `onEnd()` when the user releases their mouse/finger on another screen, causing a crash due to accessing elements of `tubesGrid` which are no longer in the document flow.
3. **Memory Leaks / DOM Pollution**: BuyDiamonds overlays are appended directly to `document.body`. When a user navigates away via the Router or back button, the screen container is destroyed but these body-level elements are not. This leaves them permanently floating in the DOM.
4. **Translation Issues**:
   - The string `'win'` is translated to `'Kazan'` in Turkish. Therefore, `t('win') || ...` evaluates to `'Kazan'` instead of falling back to `"Tebrikler! 2048'e ulaştınız!"`.
   - `level_completed` does not contain the `{lvl}` bracket in translations, so `{lvl: engine.level}` does nothing, whereas `level_complete_desc` contains `{level}` and is fully mapped.

---

## 3. Caveats

- We assumed that `BuyDiamonds` overlays are only created and appended within game screens via the `showAdModal` or direct revive click pathways.
- The global modal cleanup `window.closeAllModals()` in `router.js` handles standard modals created via `createModal`. Therefore, standard modals do not leak on navigation, but raw body appends do.
- In `colorSort.js`, window-level mousemove/mouseup/touchmove/touchend listeners are only added when drag starts and cleaned up when it ends. The only leak case is unmounting during active dragging, which is handled gracefully by checking `container.isConnected`.

---

## 4. Conclusion

Milestone 2 issues must be resolved by implementing a unified, robust cleanup strategy in both screen files, fixing incorrect localization parameter names, and replacing blocking `alert` prompts with non-blocking UI components.

### Action Plan:

#### 1. Implement Unified Cleanup Arrays in Screens
Declare tracking arrays at the top of the screen functions and flush them in `container.cleanup()`:
* **In `src/screens/colorSort.js`**:
  ```javascript
  const activeBodyAppends = [];
  const timeoutIds = [];
  let rafSortId = null;
  ```
  Ensure all `setTimeout` IDs are pushed to `timeoutIds` and `rafSortId` holds the active frame. Update `cleanup()` to cancel the rAF, clear timeouts, and remove elements in `activeBodyAppends`.
* **In `src/screens/game2048.js`**:
  ```javascript
  const activeBodyAppends = [];
  const timeoutIds = [];
  ```
  Ensure the BuyDiamonds `overlayContainer` is pushed to `activeBodyAppends` and timeouts are pushed to `timeoutIds`. Flush them on `cleanup()`.

#### 2. Prevent Post-Unmount Drag Execution
Add checks inside `colorSort.js` drag handlers:
```javascript
const onMove = (clientX, clientY) => {
  if (!container.isConnected) return;
  ...
};
const onEnd = (clientX, clientY) => {
  if (!container.isConnected) return;
  ...
};
```

#### 3. Replace Blocking alert() and Fix Translations
* **Modal for 2048 Win Screen**:
  Replace `alert(...)` with:
  ```javascript
  createModal({
    title: t('congratulations') || 'Tebrikler!',
    content: `<div class="flex flex-col items-center p-4">
      <span class="text-5xl mb-3 animate-bounce-soft">🏆</span>
      <p class="text-sm font-bold text-gray-400 text-center">${t('win_desc_2048') || "2048'e ulaştınız!"}</p>
    </div>`,
    actions: [{ text: t('continue') || 'Devam Et', primary: true, onClick: (close) => close() }]
  });
  ```
* **Turkish Translation and Parameter Keys**:
  - Do not use `t('win')` for the victory message in Turkish because of the incorrect "Kazan" translation. Define a dedicated key or fallback.
  - In `colorSort.js`, replace `t('level_completed', {lvl: engine.level})` with `t('level_complete_desc', {level: engine.level})` to use the pre-existing translation with correctly mapped brackets.
* **Firebase Setup Alerts**:
  - Although secondary, native auth alerts in `src/services/firebaseSetup.js` should also be replaced with standard Toast notifications or modal dialogs.

---

## 5. Verification Method

To verify these changes without regressions:

1. **Build and Start Project**:
   ```bash
   npm run build
   ```
   Ensure the build passes and there are no syntax or type errors.
2. **Verify Color Sort Dragging**:
   - Navigate to `#/sort`.
   - Attempt to drag a block. Verify that it doesn't crash (previously threw `ReferenceError: activeBodyAppends is not defined`).
3. **Verify DOM Cleanup on Navigation**:
   - Open a "Buy Diamonds" overlay inside the 2048 revive modal or Color Sort's "Add Tube" modal.
   - Click the back button or manually change the hash to `#/menu`.
   - Inspect the DOM to verify that the Buy Diamonds container was completely removed from the body and no longer exists.
4. **Verify Timeout Cancellation**:
   - Trigger a Game Over in 2048 or a Win in Color Sort and quickly navigate to the Main Menu.
   - Verify that no modal pops up on the Main Menu and no level-up/game-over sound effects play.
5. **Verify Correct Level Completed Message**:
   - Win a level in Color Sort.
   - Verify the modal shows: "Level 1 Completed" / "1. Seviyeyi tamamladın" (previously did not display the level number).
