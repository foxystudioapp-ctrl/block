## 2026-06-16T04:10:35Z
Perform Milestones 3 and 4: Automated game testing and crash/memory-leak check.
Specifically:
1. Examine the source files of the game modes (Classic, Hex, Merge, Match, Sort, 2048, X2, Duel) if needed to find target DOM selectors, grid attributes, and drag offsets.
2. Write a comprehensive Puppeteer automation script named 'run_game_tests.cjs' at the root of the project.
3. The script MUST:
   - Launch Puppeteer headless browser.
   - Listen to 'console', 'pageerror', and 'requestfailed' events and output them to a log file at 'c:\Users\askar\OneDrive\Masaüstü\block\.agents\orchestrator_testing\console_logs.txt'.
   - Navigate to the dev server 'http://localhost:5173/#/menu'.
   - Sequentially test all modes: Classic, Match, Merge, Hex, Sort, 2048, X2, and Duel.
   - In each mode:
     - Load the screen. If there is a submode selection (like Endless/Level/AI), click to enter it.
     - Perform a few gameplay moves. E.g.:
       - Classic: Drag a tray piece to grid cell [data-r="0"][data-c="0"] (apply 60px Y-offset).
       - Hex: Drag a tray piece to [data-q="0"][data-r="0"] (no offset).
       - Merge: Drag a tray piece to board cell (no offset).
       - Match: Drag/swap adjacent .match-block elements.
       - Sort: Click source tube then destination tube.
       - 2048: Press ArrowUp, ArrowRight, ArrowDown.
       - X2: Click column area to drop block.
       - Duel: Perform standard actions or enter AI/single-player duel, make a move.
     - In the middle of play (or after moves), click the back button '#topbar-back' to show the exit modal, then click the "Yes, Exit" confirmation button (which should return the user to '#/menu').
     - Wait 1-2 seconds after unmount to check if there are any late exceptions, abort controller crashes, or null references in the console logs.
4. Execute the script using 'node run_game_tests.cjs'.
5. Analyze the generated 'console_logs.txt' to identify any crashes, exceptions, or error messages (such as AbortController crashes, null references, or unmounted event listener errors).
6. Write a detailed handoff report to 'c:\Users\askar\OneDrive\Masaüstü\block\.agents\worker_testing\handoff.md' summarizing the test runs, game modes tested, actions performed, and any console warnings/errors detected.
