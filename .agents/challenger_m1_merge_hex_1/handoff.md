# Handoff Report: Milestone 1 Verification (Merge & Hex Blocks/Engines)

## 1. Observation

### Verification of Build Success
- Ran `npx vite build` on the workspace.
- The build succeeded in 3.46 seconds without errors.
- Built output structure:
  - `dist/index.html` (1.24 kB)
  - `dist/assets/hexBlock-59GsKKVU.js` (25.61 kB)
  - `dist/assets/mergeBlock-DetEIY1T.js` (26.02 kB)

### Verification of `activeBodyAppends` and `rafIds` Initialization and Cleanup
- **`src/screens/mergeBlock.js`**:
  - `activeBodyAppends` is initialized at line 19: `let activeBodyAppends = [];`.
  - No `rafIds` array or requestAnimationFrame is present in the file.
  - Appended elements include:
    - Line 261: `document.body.appendChild(dragGhost); activeBodyAppends.push(dragGhost);`
    - Line 418: `activeBodyAppends.push(overlayContainer);`
  - In `onEnd` (line 285) `dragGhost.remove()` is called, but it is not removed from `activeBodyAppends`.
  - In `closeOverlay` (line 405) `overlayContainer.parentNode.removeChild(overlayContainer)` is called, but it is not removed from `activeBodyAppends`.
  - In `container.cleanup` (lines 599-606):
    ```javascript
    activeBodyAppends.forEach(el => el && el.parentNode && el.remove());
    ```
    The array is not re-assigned or cleared (e.g. `activeBodyAppends = []`).

- **`src/screens/hexBlock.js`**:
  - `activeBodyAppends` is initialized at line 19: `let activeBodyAppends = [];`.
  - `rafIds` is initialized at line 22: `let rafIds = [];`.
  - Appended elements include:
    - Line 312: `document.body.appendChild(floatingEl); activeBodyAppends.push(floatingEl);`
    - Line 554: `document.body.appendChild(overlayContainer); activeBodyAppends.push(overlayContainer);`
    - Line 663: `document.body.appendChild(ghost); activeBodyAppends.push(ghost);`
  - In `onEnd` (line 424) `floatingEl.remove()` is called, but it is not removed from `activeBodyAppends`.
  - In `engine.clearEventCallback` (line 664) `ghost.remove()` is called inside a 450ms timeout, but it is not removed from `activeBodyAppends`.
  - Inside `onMove` (line 413) `rafIds.push(frameId)` is called on every touch/mouse movement. Canceled frame IDs are not removed.
  - Inside `engine.clearEventCallback` (lines 623, 643) `rafIds.push(frameId)` is called.
  - In `container.cleanup` (lines 724-733):
    ```javascript
    rafIds.forEach(id => cancelAnimationFrame(id));
    activeBodyAppends.forEach(el => el && el.parentNode && el.remove());
    ```
    Neither `activeBodyAppends` nor `rafIds` is cleared or reset to empty arrays.

### Verification of Engine Logic (Memory Leaks, Optimization, and Exceptions)
- **`src/game/mergeEngine.js`**:
  - At line 117: `if (this.history.length > 10) this.history.shift();`
  - Deep stack-based DFS in `getConnected` (lines 216-242) avoids recursion stack overflows.
- **`src/game/hexEngine.js`**:
  - At line 364: `if (this.history.length > 3) { this.history.shift(); }`
  - At line 417: `this.board = new Map(data.board);` (outside try-catch block).

---

## 2. Logic Chain

1. **Memory Leak in Screen Files**:
   - `activeBodyAppends` accumulates references to DOM elements (`dragGhost` in `mergeBlock.js`; `floatingEl`, `overlayContainer`, and exploding `ghost` elements in `hexBlock.js`) via `activeBodyAppends.push()`.
   - Although these elements are removed from the DOM using `.remove()`, the references in the `activeBodyAppends` array are never filtered, sliced, or cleared during the session.
   - For `hexBlock.js`, the explosion `ghost` elements are spawned frequently (every time cells/lines are cleared). This results in rapid accumulation of detached DOM elements in memory.
   - During `container.cleanup()`, `activeBodyAppends` elements are checked and removed if they have a parent node, but the array itself is not emptied. This prevents garbage collection of the detached DOM elements because the array closure retains references.

2. **Growth of `rafIds` Array**:
   - `rafIds` receives a new integer on every frame of drag-movement (`onMove`).
   - Canceled frame IDs (via `cancelAnimationFrame`) are not removed from the array.
   - This creates a growing array of integers over a game session, which is not cleared upon `cleanup()`.

3. **History Size Constraints (Optimization)**:
   - Limiting history length to 10 in `mergeEngine.js` and 3 in `hexEngine.js` is correct and necessary. Without this, serialization to `localStorage` (triggered on every move via `saveGameState` and `saveToLocalStorage`) would become increasingly slow and bloat memory as history size grew.

4. **Exception Vector in `hexEngine.js`**:
   - In `loadFromLocalStorage()`, `new Map(data.board)` is called. If local storage contains corrupt data or is from a previous incompatible structure, this call will throw a `TypeError`. This error is unhandled and will crash screen load.

---

## 3. Caveats

- We did not perform runtime heap profiling (e.g. using Chrome DevTools memory profiles) due to code-only execution constraints.
- We assumed the user interface components (`createModal`, `AdService`, `Sounds`, etc.) behave correctly and clean up their own internals when destroyed.

---

## 4. Conclusion

- **Overall Risk Assessment**: **MEDIUM**
- The build compiles and bundles successfully with zero errors.
- **Vulnerabilities / Memory Leaks Found**:
  - Detached DOM elements memory leak: `activeBodyAppends` grows indefinitely with every block drag and clear explosion. It is never cleared or reassigned.
  - Array growth: `rafIds` in `hexBlock.js` grows during drags without cleanup.
  - Crash risk: `new Map(data.board)` in `hexEngine.js` can throw an unhandled `TypeError` on corrupted storage data.
- **Mitigation Recommendations**:
  1. Filter out removed/detached elements from `activeBodyAppends` immediately after removing them from the DOM, and reassign the array to `[]` at the end of the `cleanup()` function.
  2. Clear the `rafIds` array inside `onEnd` and reassign it to `[]` at the end of the `cleanup()` function.
  3. Wrap `new Map(data.board)` in `hexEngine.js` in a `try...catch` block to fallback to `this.initGame()` on error.

---

## 5. Verification Method

To verify these findings manually:
1. Inspect `src/screens/mergeBlock.js` around line 261 and 604 to check that `activeBodyAppends` is pushed to but never sliced or emptied.
2. Inspect `src/screens/hexBlock.js` around lines 312, 663, and 728 to confirm the same behavior for drag and explosion ghosts.
3. Corrupt `localStorage.hex_state` (e.g. by setting `hex_state` to `{"board": "corrupted"}`) and navigate to the Hex game screen to observe the uncaught `TypeError` crash.
4. Run `npm run build` to verify the build output structure.

---

## Adversarial Review / Challenge Summary

### [Medium] Challenge 1: Memory Leak via Detached DOM Elements
- **Assumption challenged**: `.remove()` on a DOM element is sufficient for garbage collection.
- **Attack scenario**: A user plays a long session of Hex Block, triggering hundreds of line clears and block explosions. Each explosion creates multiple ghost elements that get pushed to `activeBodyAppends`.
- **Blast radius**: The `activeBodyAppends` array retains references to all created elements. The memory footprint of detached DOM elements will continuously rise, potentially leading to performance degradation or OOM crashes on low-end mobile devices.
- **Mitigation**: Filter out elements from the array when they are removed from the DOM, and clear the array in `cleanup()`.

### [Low] Challenge 2: Uncaught TypeError on Corrupted LocalStorage
- **Assumption challenged**: LocalStorage data is always valid and conforms to expectations.
- **Attack scenario**: The user has corrupted save data in LocalStorage (either from manual tampering or a migration issue).
- **Blast radius**: `new Map(data.board)` throws an exception, causing screen initialization to fail and blocking the user from entering the Hex Block game mode.
- **Mitigation**: Wrap the storage loading logic in a try-catch block and default to `initGame()` if an error is thrown.
