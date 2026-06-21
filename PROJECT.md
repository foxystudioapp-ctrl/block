# Project: Bloxy Game Bug Fixes (Phases 2, 3, 4)

## Architecture
- **Web App**: Single-page application built with Vite.
- **Game Engines**: Written in JS under `src/game/` (e.g. `matchEngine.js`, `bubbleEngine.js`, `duelEngine.js`, `classicEngine.js`, etc.).
- **Screens**: UI screens written in JS under `src/screens/` (e.g. `src/screens/profile.js`).

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Logic Errors (Phase 2) | Fix Match Mode, Bubble Shooter, and Duel Mode logic bugs | None | IN_PROGRESS (Conv ID: 099c1d35-eefe-46d4-b26b-7712f2d3c73e) |
| 2 | Cleanup Standardization (Phase 3) | Ensure all games properly clean up intervals, timeouts, RAFs, and DOM appends on exit | 1 | PLANNED |
| 3 | UI/UX & Translation (Phase 4) | Wrap Turkish strings with t(), replace alerts with createModal(), fix typos | 2 | PLANNED |

## Interface Contracts
### Game Engines ↔ App Lifecycles
- Every game engine must provide a standardized cleanup or exit method that clears all active timers, animation frames, and DOM appends.
- Save/load functions in Match Mode must use standard localStorage keys or central state managers consistent with other modules.
