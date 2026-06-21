# Execution Plan - Bloxy Game Bug Fixes (Phases 2, 3, 4)

This plan details the steps required to resolve the remaining logic, performance, and UI/UX issues in the block puzzle game.

## Requirements Checklist
- [ ] **R1: Logic Errors (Phase 2)**
  - [ ] Match Mode: Fix save/load, best score tracking, `showVictory` function, and cleanup.
  - [ ] Bubble Shooter: Fix ad exploit and requestAnimationFrame (RAF) memory leak.
  - [ ] Duel Mode: Fix `evaluateMove` missing logic and cleanup.
- [ ] **R2: Performance & Cleanup (Phase 3)**
  - [ ] Standardize cleanup across all games. Ensure `intervalIds`, `timeoutIds`, `activeBodyAppends`, and `rafId` are properly managed and cleared on exit.
- [ ] **R3: UI/UX & Translation (Phase 4)**
  - [ ] Replace hardcoded Turkish strings with `t('key') || 'Fallback'` wrapper.
  - [ ] Replace native `alert()` calls (e.g. in 2048) with custom `createModal()`.
  - [ ] Fix the `Classic ➔` typo.

## Milestones & Decompositions
- **Milestone 1: Logic Errors Resolution (Phase 2)**
  - Scope: Match Mode, Bubble Shooter, and Duel Mode logic.
  - Deliverables: Verified fixes in game engines.
- **Milestone 2: Cleanup Standardization (Phase 3)**
  - Scope: Standardize cleanup hooks/methods across all game modes.
  - Deliverables: Global standard implemented and verified.
- **Milestone 3: UI/UX & Translation (Phase 4)**
  - Scope: Translation wrapper, custom modal alerts, typo fix.
  - Deliverables: Verified UI and translation assets.
