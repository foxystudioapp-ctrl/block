# Project: Game Mechanics and Memory Cleanup Testing

## Architecture
- **Web Application**: Vite + HTML5 Canvas/JS game engine. Screens in `src/screens/`, game engines in `src/game/`. Hash routing is used (`#/menu`, `#/classic`, `#/hex`, etc.).
- **Dev Server**: Vite local server running on port 5173.
- **Browser Testing**: Node.js script using Puppeteer or Playwright to automate page load, click-and-drag interactions, and console log capture.

## Code Layout
- `src/screens/` - Game screen views (handles UI, input events, cleanup, AbortControllers)
- `src/game/` - Game core mechanics and engines
- `test_browser.cjs` - Existing puppeteer test script
- `c:\Users\askar\OneDrive\Masaüstü\block\.agents\orchestrator_testing\` - Testing metadata and artifacts

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Test Environment Setup | Start dev server, install/configure browser testing tools, verify access | None | DONE |
| 2 | Automated Test Script | Implement browser test scripts simulating moves & sudden exit to main menu for all modes | 1 | IN_PROGRESS |
| 3 | Verification & Log Collection | Execute tests, monitor console logs, catch exceptions, null references, AbortController crashes | 2 | PLANNED |
| 4 | Test Report Synthesis | Aggregate all logs, synthesize results, create final test report | 3 | PLANNED |

## Interface Contracts
- **Dev Server URL**: `http://localhost:5173`
- **Back Button Selector**: `#topbar-back`
- **Quit Confirmation Yes Button Selector**: `#modal-actions button` (specifically the second one, or text matching exit)
- **Log Output Location**: `c:\Users\askar\OneDrive\Masaüstü\block\.agents\orchestrator_testing\console_logs.txt`
