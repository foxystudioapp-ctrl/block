# Original User Request

## Initial Request — 2026-06-20T18:24:14+03:00

# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Fix Phase 2, 3, 4 bugs via teamwork_preview

Fix the remaining bugs in the block puzzle game (Phase 2: Logic Errors, Phase 3: Performance/Cleanup, Phase 4: UI/UX/Translations). Phase 1 (Crash fixes) is already completed.

Working directory: c:\Users\askar\OneDrive\Masaüstü\block
Integrity mode: development

## Requirements

### R1. Logic Errors (Phase 2)
- `Match Mode`: Fix save/load, best score tracking, `showVictory` function, and cleanup.
- `Bubble Shooter`: Fix ad exploit, RAF memory leak.
- `Duel Mode`: Fix `evaluateMove` missing logic and cleanup.

### R2. Performance and Cleanup (Phase 3)
Standardize cleanup across all games. Ensure `intervalIds`, `timeoutIds`, `activeBodyAppends`, and `rafId` are properly managed and cleared on exit.

### R3. UI/UX and Translation (Phase 4)
- Replace hardcoded Turkish strings with `t('key') || 'Fallback'` wrapper.
- Replace native `alert()` calls (e.g., in 2048) with the custom `createModal()`.
- Fix the `Classic ➔` typo.

## Acceptance Criteria

### Verification via Agent-as-Judge
- [ ] Auditor verifies that Match Mode saves/loads properly and showVictory works.
- [ ] Auditor verifies Bubble Shooter RAF leak is fixed.
- [ ] Auditor verifies Duel Mode evaluateMove is implemented.
- [ ] Auditor verifies cleanup standard is applied globally.
- [ ] Auditor verifies all translations are wrapped with `t()`.
