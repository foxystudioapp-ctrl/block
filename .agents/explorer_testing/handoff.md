# Handoff Report — Codebase and Browser Testing Investigation

This report documents the findings from the investigation of the block-puzzle game codebase, including package configurations, game modes, cleanup mechanisms, navigation patterns, and a proposed automated browser testing recommendation.

---

## 1. Observation

### 1.1 Package and Scripts (`package.json`)
The `package.json` file contains the following scripts and dependencies:
```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "devDependencies": {
    "vite": "^8.0.12"
  },
```
- **Launcher Scripts**: The application is built with Vite. Running `npm run dev` starts the local development server (typically at `http://localhost:5173`), and `npm run preview` previews a production build.
- **Testing Dependencies**: There are no testing dependencies (like Playwright, Cypress, Jest, etc.) listed in `package.json`.

### 1.2 Game Modes and Source Files
The game modes are located in the `src/screens` and `src/game` directories:
*   **Classic Mode**:
    *   Screen File: `src/screens/classicBlock.js`
    *   Engine File: `src/game/classicEngine.js`
*   **Match Mode** (referred to as Jewel Crush / Block Patlatma):
    *   Screen File: `src/screens/matchMode.js`
    *   Engine File: `src/game/matchEngine.js`
    *   Level Data: `src/game/matchLevels.js`
*   **Merge Mode**:
    *   Screen File: `src/screens/mergeBlock.js`
    *   Engine File: `src/game/mergeEngine.js`
*   **Hex Mode**:
    *   Screen File: `src/screens/hexBlock.js`
    *   Engine File: `src/game/hexEngine.js`
*   **Sort Mode** (Color Sort):
    *   Screen File: `src/screens/colorSort.js`
    *   Engine File: `src/game/sortEngine.js`
*   **2048 Mode**:
    *   Screen File: `src/screens/game2048.js`
    *   Engine File: `src/game/2048Engine.js`
*   **X2 Mode**:
    *   Screen File: `src/screens/x2Block.js`
    *   Engine File: `src/game/x2Engine.js`
*   **Duel Mode** (Single Player vs AI & Multiplayer):
    *   Screen Files: `src/screens/duelMode.js`, `src/screens/multiplayerDuelMode.js`
    *   Engine Files: `src/game/duelEngine.js`, `src/game/multiplayerDuelEngine.js`
*   **Adventure/Miner Map**:
    *   Screen Files: `src/screens/adventure.js`, `src/screens/minerMap.js`
    *   Engine File: `src/game/levelData.js`

### 1.3 Existing Testing Configurations
*   There is a simple script named `test_browser.cjs` in the root directory that uses `puppeteer` to perform a basic load test of the classic screen:
    ```js
    const puppeteer = require('puppeteer');
    (async () => {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      ...
      console.log('Navigating to http://localhost:5173/#/classic ...');
      await page.goto('http://localhost:5173/#/classic', { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 2000));
      await browser.close();
    })();
    ```
    *Note: Puppeteer is not listed in `devDependencies` in `package.json`.*
*   There are profanity filter tests in `test_profanity_adversarial.js` and `stress_test_profanity.cjs` to test the custom profanity filter logic.

### 1.4 Cleanup, AbortController, and Navigation
*   **Unmount Cleanup**:
    The router in `src/router.js` intercepts page changes and cleans up the outgoing screen:
    ```js
    if (this.currentScreen && typeof this.currentScreen.cleanup === 'function') {
      this.currentScreen.cleanup();
    }
    ```
*   **Event Listeners & AbortController**:
    In `src/screens/classicBlock.js`, a screen-wide `AbortController` handles event listeners:
    ```js
    const screenAbortController = new AbortController();
    ...
    document.addEventListener('pointermove', onPointerMove, { passive: false, signal: screenAbortController.signal });
    document.addEventListener('pointerup', onPointerUp, { signal: screenAbortController.signal });
    ...
    container.cleanup = () => {
      screenAbortController.abort();
      if (topBar.cleanup) topBar.cleanup();
    };
    ```
    Similarly, `src/screens/multiplayerDuelMode.js` uses `screenAbortController.abort()` to unbind event handlers on unmount.
    Other screens (e.g., `hexBlock.js`, `matchMode.js`, `mergeBlock.js`) use local `AbortController` instances named `dragController` to abort active drag sessions.
*   **Back Button Navigation**:
    *   Screens use `createTopBar` (from `src/components/topBar.js`).
    *   The back button is identified by `#topbar-back`.
    *   Clicking the back button inside game modes invokes `showQuitConfirmation` (from `src/utils/quitConfirm.js`) which opens a modal with a "Yes, Exit" button (`quit_game_confirm`) and "No, Continue" button (`quit_game_cancel`).

---

## 2. Logic Chain

1.  **Vite App Launch**: Since the app uses Vite and defines the `"dev"` script in `package.json`, running `npm run dev` launches the dev server, which defaults to `http://localhost:5173`.
2.  **Navigation Testing**: Hash-routing is used (e.g., `#/classic`, `#/hex`). Therefore, browser tests can navigate to a mode either by clicking the corresponding card on the Main Menu (`#/menu`) or by directly navigating to the hash URL (e.g., `http://localhost:5173/#/classic`).
3.  **Interaction Mapping**:
    *   **Classic Mode**: The piece in the tray is dragged and placed. The drag code (`src/screens/classicBlock.js:575`) defines `touchOffsetY = 60`. Thus, during pointermove, the block floats 60px above the cursor. Automating this requires a +60px offset in the Y-coordinate during dragging.
    *   **Hex Mode**: The piece is dragged and placed. The drag code (`src/screens/hexBlock.js:292`) centers the piece bounding box directly on the cursor. No Y-offset is applied, so tests can move the mouse directly to the center of the target cell.
    *   **Merge Mode**: Similar to Hex Mode, the piece is centered on the cursor (`src/screens/mergeBlock.js:251`). Dragging is direct.
    *   **Match Mode**: Swap-based Match-3. Blocks are `.match-block`. Interaction is a mouse-down on a source cell, mouse-move to an adjacent neighbor cell, and mouse-up.
    *   **Sort Mode**: Click-based color pouring. A test selects the source tube (`#tubes-grid > div` at source index) and clicks it, then clicks the destination tube.
    *   **2048 Mode**: Keyboard arrow-based movement. A test can simply dispatch `ArrowUp`, `ArrowDown`, `ArrowLeft`, or `ArrowRight` key presses.
    *   **X2 Mode**: Click-to-drop columns. A test clicks a button inside the `columnTouchArea` matching `button[data-col="c"]`.
4.  **Confirming Exit**: To exit a game mode, the test should click `#topbar-back`, then click the "Yes, Exit" button inside the warning modal (which can be selected via `#modal-actions button` containing the confirmation text).

---

## 3. Caveats

*   **Vite Server Port**: The tests assume the local server starts at `http://localhost:5173`. If the port is occupied, Vite will use another port (e.g., 5174). Test configurations should allow dynamic port injection.
*   **Network Restriction**: This is a read-only investigation with no code implementation; the suggested Playwright integration must be added manually to the codebase.
*   **Multiplayer Duel Mode**: Multiplayer matchmaking relies on Firebase. Automated testing for Multiplayer Duel mode requires either a mocked Firebase instance or pre-created test accounts.

---

## 4. Conclusion

The codebase is highly structured but currently lacks automated end-to-end browser tests.
**Recommendation**: Install and configure **Playwright** because it natively supports touch/pointer actions, dragging with custom offsets, keyboard interactions, and handles modern CSS animations gracefully.

### 4.1 Launching the App
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Start the development server:
    ```bash
    npm run dev
    ```

### 4.2 Proposed Playwright Automation Script
Below is a proposed Node.js Playwright test script (`playwright_game_test.js`) demonstrating how to interact with the game modes:

```javascript
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false }); // Set to true for headless run
  const page = await browser.newPage();
  
  // 1. Launch & Navigate
  const baseUrl = 'http://localhost:5173';
  await page.goto(`${baseUrl}/#/menu`);
  await page.waitForTimeout(1000); // Wait for animations

  // ----------------------------------------------------
  // Test Case: Classic Mode Drag & Drop (with 60px offset)
  // ----------------------------------------------------
  console.log('Testing Classic Mode...');
  // Click Classic Mode Card (selects card containing 'Classic' text)
  await page.locator('button:has-text("Classic")').first().click();
  await page.waitForTimeout(500);
  
  // Click Endless Mode in classic submode modal
  await page.locator('#btn-classic-endless').click();
  await page.waitForTimeout(1000);

  // Locate first available piece in the tray
  const classicTrayItem = await page.locator('.cursor-grab').first();
  const classicTrayBox = await classicTrayItem.boundingBox();
  
  // Locate target cell on grid (e.g., row 0, col 0)
  const classicTargetCell = await page.locator('[data-r="0"][data-c="0"]');
  const classicCellBox = await classicTargetCell.boundingBox();

  if (classicTrayBox && classicCellBox) {
    // Start drag
    await page.mouse.move(classicTrayBox.x + classicTrayBox.width / 2, classicTrayBox.y + classicTrayBox.height / 2);
    await page.mouse.down();
    
    // Move to target grid cell with +60px Y-offset because of touchOffsetY
    const destX = classicCellBox.x + classicCellBox.width / 2;
    const destY = classicCellBox.y + classicCellBox.height / 2 + 60;
    
    await page.mouse.move(destX, destY, { steps: 10 });
    await page.mouse.up();
    console.log('Classic Mode block drag-and-drop simulated.');
  }

  // Go back to main menu
  await page.locator('#topbar-back').click();
  await page.waitForTimeout(500);
  // Click 'Yes, Exit' inside confirmation modal (usually the second button in the actions panel)
  await page.locator('#modal-actions button').nth(1).click();
  await page.waitForTimeout(1000);

  // ----------------------------------------------------
  // Test Case: Hex Mode Drag & Drop (Centered, No Y-offset)
  // ----------------------------------------------------
  console.log('Testing Hex Mode...');
  await page.locator('button:has-text("Hex")').first().click();
  await page.waitForTimeout(1000);

  // Find a piece in the Hex tray (grab container)
  const hexPiece = await page.locator('.cursor-grab').first();
  const hexPieceBox = await hexPiece.boundingBox();
  
  // Find a cell on the board (e.g. q=0, r=0)
  const hexTargetCell = await page.locator('[data-q="0"][data-r="0"]');
  const hexCellBox = await hexTargetCell.boundingBox();

  if (hexPieceBox && hexCellBox) {
    await page.mouse.move(hexPieceBox.x + hexPieceBox.width / 2, hexPieceBox.y + hexPieceBox.height / 2);
    await page.mouse.down();
    
    // Hex Mode centers the drag element around the pointer, so move directly to target center
    const destX = hexCellBox.x + hexCellBox.width / 2;
    const destY = hexCellBox.y + hexCellBox.height / 2;
    
    await page.mouse.move(destX, destY, { steps: 10 });
    await page.mouse.up();
    console.log('Hex Mode block drag-and-drop simulated.');
  }

  // Exit Hex Mode
  await page.locator('#topbar-back').click();
  await page.waitForTimeout(500);
  await page.locator('#modal-actions button').nth(1).click();
  await page.waitForTimeout(1000);

  // ----------------------------------------------------
  // Test Case: Sort Mode Clicking Tubes
  // ----------------------------------------------------
  console.log('Testing Sort Mode...');
  await page.locator('button:has-text("Sort")').first().click();
  await page.waitForTimeout(500);
  await page.locator('#btn-sort-endless').click();
  await page.waitForTimeout(1000);

  // Click source tube (e.g., first child inside #tubes-grid)
  const tubes = page.locator('#tubes-grid > div');
  const count = await tubes.count();
  if (count >= 2) {
    await tubes.nth(0).click();
    await page.waitForTimeout(300);
    await tubes.nth(1).click();
    console.log('Sort Mode tube pouring clicked.');
  }

  // Exit Sort Mode
  await page.locator('#topbar-back').click();
  await page.waitForTimeout(500);
  await page.locator('#modal-actions button').nth(1).click();
  await page.waitForTimeout(1000);

  // ----------------------------------------------------
  // Test Case: 2048 Keyboard Control
  // ----------------------------------------------------
  console.log('Testing 2048 Mode...');
  await page.locator('button:has-text("2048")').first().click();
  await page.waitForTimeout(500);
  await page.locator('#btn-2048-endless').click();
  await page.waitForTimeout(1000);

  // Play by pressing arrow keys
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(300);
  await page.keyboard.press('ArrowDown');
  console.log('2048 Mode keyboard events dispatched.');

  // Exit 2048 Mode
  await page.locator('#topbar-back').click();
  await page.waitForTimeout(500);
  await page.locator('#modal-actions button').nth(1).click();
  await page.waitForTimeout(1000);

  await browser.close();
})();
```

---

## 5. Verification Method

To verify these findings and execute the proposed automation scripts:
1.  **Vite App Verification**: Run `npm run dev` inside `c:\Users\askar\OneDrive\Masaüstü\block` to confirm the dev server successfully boots up on port `5173`.
2.  **Playwright Test Execution**:
    *   Initialize Playwright in a test environment:
        ```bash
        npm install -D playwright
        ```
    *   Save the code above as `playwright_game_test.js` in the root.
    *   Execute the script:
        ```bash
        node playwright_game_test.js
        ```
    *   Verify the automated browser opens, selects Classic, Hex, Sort, and 2048 modes sequentially, performs gameplay actions (drags, pours, swipes), navigates back to the menu via `#topbar-back`, and completes successfully.
