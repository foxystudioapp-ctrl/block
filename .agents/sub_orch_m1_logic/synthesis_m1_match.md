# Synthesis Report: Match Mode Fixes

## Consensus
All three Explorers confirmed the following issues and agreed on their details and impacts:

1. **Save/Load Logic & Serialization Errors**:
   - `loadState()` in `src/game/matchEngine.js` always returns `false` due to a hardcoded workaround.
   - Mid-game state (grid, moves left, gem target counts) is not serialized, so reloads reset progress but keep scores, causing a moves exploit.
   - Adventure Map level selection is overridden because `loadState()` constructor calls overwrite the selected level with the saved progress level.
   - *Resolution*: Implement complete serialization of the grid, moves, and gem targets in `saveState()` and `loadState()`. Avoid overriding the level if a specific level is requested from the Adventure Map.

2. **Best Score Tracking Inconsistencies**:
   - The game directly mutates `PlayerState.state.bestScoreJewel` instead of using `PlayerState.updateBestScore('jewel', score)`.
   - In `matchMode.js` line 1335, the score is cumulatively added to `bestScoreJewel`, whereas in `matchEngine.js` it is compared as a high score.
   - Direct mutation bypasses Jewel-specific trophy calculation (which awards trophy count multiplied by a `1.5` scaling factor) and prevents rival overtake alerts.
   - *Resolution*: Unify best score tracking to use `PlayerState.updateBestScore('jewel', score)` and ensure it is treated as a high score, not a cumulative sum.

3. **`showVictory` Function Inactivity & LevelUp Issues**:
   - `showVictory()` in `src/screens/matchMode.js` is never called. Upon victory, `showLevelUpModal()` is called directly, bypassing achievements, daily task updating (`match_level` task progress), and diamond rewards.
   - The local `levelNum` variable in `matchMode.js` is not updated when the level is incremented in-place, leading to reloading the wrong level on subsequent loss/retry.
   - *Resolution*: Integrate `showVictory()` into the level victory condition so it properly triggers diamond rewards, daily task progress, and correct level progression. Ensure `levelNum` is kept in sync.

4. **Code Cleanup**:
   - Avoid double-calling `engine.init()` (first in the constructor, then immediately after in screen load).
   - Clean up unused imports (such as `Storage` from `../utils/storage.js`).
   - Remove random override of `obstacleMode` for levels < 40 in `matchEngine.js` line 109, which overrides the level design layouts.
