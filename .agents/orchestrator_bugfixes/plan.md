# Plan — Fix all 87+ bugs and issues across 10 game modes

## 1. Goal
Fix all critical, high, medium, and low-priority bugs identified in `scan_report.md` across all 10 block puzzle game modes without regressions.

## 2. Milestone Execution Strategy
We will execute the fixes in 5 major sequential milestones:

### Milestone 1: Merge Block & Hex Block
- **Files**: `src/screens/mergeBlock.js`, `src/game/mergeEngine.js`, `src/screens/hexBlock.js`
- **Scope**:
  - Define `activeBodyAppends` and fix initialization order of `dragController`.
  - Fix restart/replay crash by implementing/updating `initGame()`, `updateBoardUI()`, and `renderNextPieces()`.
  - Define `activeBodyAppends` in Hex Block and handle cleanup of body-appended elements.
  - Correct Hex mode undo history and TaskState progress updates.
  - Handle translations and localizations.

### Milestone 2: 2048 & Color Sort
- **Files**: `src/screens/game2048.js`, `src/game/2048Engine.js`, `src/screens/colorSort.js`, `src/game/sortEngine.js`
- **Scope**:
  - Implement missing `initGame()` and `restartCurrentLevel()` in `2048Engine.js`.
  - Replace `alert()` with a clean modal or proper UI alert in 2048.
  - Implement missing functions/variables (`activeBodyAppends`, `initGame`, `updateBoardUI`, `updateScoreUI`) in `colorSort.js`.
  - Ensure sortEngine level number is saved properly.
  - Fix memory leaks and listener cleanups for both modes.
  - Address hardcoded text.

### Milestone 3: X2 Block & Arrow Puzzle
- **Files**: `src/screens/x2Block.js`, `src/screens/arrowPuzzle.js`, `src/game/arrowEngine.js`
- **Scope**:
  - Update X2 power-up system to use engine methods, correct costs, and prevent score exploit on Hammer use.
  - Call `applyGravity()` after Hammer and `checkAndMergeAll()` after Swap in X2.
  - Fix Arrow Puzzle restart crash by correcting `engine.initGame()` to `engine.init()`.
  - Implement placeholders (`spawnParticles`, `spawnTrail`, `renderBest`) in Arrow Puzzle.
  - Translate all Turkish strings.

### Milestone 4: Match Mode, Bubble Shooter & Duel Mode
- **Files**: `src/screens/matchMode.js`, `src/game/matchEngine.js`, `src/screens/bubbleShooter.js`, `src/screens/duelMode.js`, `src/game/duelEngine.js`
- **Scope**:
  - Fix Match Mode save/load state logic, best score aggregation, victory detection, valid moves checking, and score resets.
  - Correct Bubble Shooter RAF ID saving, event listener cleanup, and diamond/reclaim ad exploit.
  - Prevent Duel Mode evaluation function from directly mutating the active board.
  - Clean up event listeners and RAF IDs in Duel Mode.

### Milestone 5: Classic Block & Global Cleanup Verification
- **Files**: `src/screens/classicBlock.js`, and all translation/cleanup assets.
- **Scope**:
  - Fix Classic Block RAF leakage, `swapCount` definition, and `➔-` level-up typo.
  - Run exhaustive validation on all screens and engines to ensure zero leaks, full i18n support, and correct logic.

## 3. Iteration Loop per Milestone
For each milestone:
1. **Explore**: Spawn `teamwork_preview_explorer` to identify the exact files and lines of code containing the bugs, and design a precise fix strategy.
2. **Work**: Spawn `teamwork_preview_worker` to apply the fixes and run builds/tests.
3. **Review**: Spawn `teamwork_preview_reviewer` to review code modifications for correctness and completeness.
4. **Challenge**: Spawn `teamwork_preview_challenger` to run adversarial testing or confirm edge cases.
5. **Audit**: Spawn `teamwork_preview_auditor` to verify integrity, ensuring no dummy/facade implementations or hardcoded results exist.
6. **Gate**: Verify all pass criteria. If failed, log and loop back to Explore.

## 4. Final Validation
- Run the full suite of game tests using `run_game_tests.cjs` or equivalent testing scripts.
- Verify build success.
