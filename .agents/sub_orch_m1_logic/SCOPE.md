# Scope: Milestone 1 - Logic Errors (Phase 2)

## Architecture
- `src/game/matchEngine.js`: Handles Match Mode game logic, scoring, and saving/loading.
- `src/game/bubbleEngine.js`: Handles Bubble Shooter game loop and scoring.
- `src/game/duelEngine.js`: Handles Duel Mode AI and move evaluation.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|---|---|---|---|
| 1 | Match Mode Fixes | Fix save/load, best score tracking, `showVictory` function, and cleanup. | None | PLANNED |
| 2 | Bubble Shooter Fixes | Fix ad exploit, requestAnimationFrame memory leak. | None | PLANNED |
| 3 | Duel Mode Fixes | Fix `evaluateMove` missing logic and cleanup. | None | PLANNED |

## Interface Contracts
- Game saving and loading should use standard interfaces (e.g. `localStorage`).
- `evaluateMove` in `duelEngine.js` must return the correct heuristic score for AI moves.
