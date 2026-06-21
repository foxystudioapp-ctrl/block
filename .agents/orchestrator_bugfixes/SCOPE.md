# Scope: All 10 Game Modes Bug Fixes

## Architecture
- **Screens**: Located in `src/screens/`. Handles UI rendering, user interaction, canvas/DOM event listeners, animations (RequestAnimationFrame), timeouts, intervals, and local caching.
- **Engines**: Located in `src/game/`. Holds the core game state, rules, moves valuation, game save/load state, and score calculation.
- **Common Utilities**: E.g., `src/utils/` or other shared packages for storage, internationalization, and tasks.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Merge Block & Hex Block Fixes | Fix crashes, drag controllers, activeBodyAppends, restore functions, undo history, and missing cleanups for Merge/Hex modes. | None | DONE |
| 2 | 2048 & Color Sort Fixes | Implement missing initGame/restartCurrentLevel, activeBodyAppends, drag listener cleanups, alert dialog removal, and score saving. | None | IN_PROGRESS |
| 3 | X2 Block & Arrow Puzzle Fixes | Fix X2 Block power-up gravity, takas merge, score exploits, power-up engine integration, and Arrow Puzzle initGame crash. | None | PLANNED |
| 4 | Match Mode, Bubble Shooter & Duel Mode Fixes | Fix matchEngine save/load, best score calculation, RAF leaks, canvas events, duelMode simulation mutations, and AbortControllers. | None | PLANNED |
| 5 | Classic Block & Global Cleanup Verification | Fix classicBlock RAF leak, typos, swapCount, translation checklist, and execute comprehensive verification of all fixes. | M1, M2, M3, M4 | PLANNED |

## Interface Contracts
### Game Engines ↔ Screen UI
- All UI screens interact with their corresponding engines using standard interfaces: `initGame()`, `restartCurrentLevel()`, `saveState()`, and `loadState()`.
- Screen classes must properly manage their lifecycle by initializing these engines during setup and calling cleanup routines on exit.
- Performance: Event listeners, RAFs, and timeouts/intervals must be tracked and cleared correctly on teardown.
