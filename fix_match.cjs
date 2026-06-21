const fs = require('fs');
let s = fs.readFileSync('src/screens/matchMode.js', 'utf8');

// 1. Fix the middle
let middleTarget = `  // Cleanup listeners
  // Inject animation CSS
  const styleEl = document.createElement('style');`;

let middleReplacement = `  // Cleanup listeners
  container.cleanup = () => {
    if (gameCleanup) gameCleanup();
  };

  // Banner spacer to prevent overlapping
  const bannerSpacer = document.createElement('div');
  bannerSpacer.className = 'w-full h-[65px] pointer-events-none shrink-0';
  container.appendChild(bannerSpacer);

  return container;
}

// ========== GAME SCREEN ==========
function startGame(container, router, mode, levelNum) {
  const engine = new MatchEngine(mode, levelNum);
  engine.init();

  container.innerHTML = '';
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] flex flex-col bg-bg-light dark:bg-primary text-primary dark:text-white select-none relative overflow-hidden pb-2 sm:pb-3 md:pb-6 lg:pb-10';

  let isAnimating = false;
  let cellSize = 0;
  let extraMovesCount = 0;

  // Inject animation CSS
  const styleEl = document.createElement('style');`;

s = s.replace(middleTarget, middleReplacement);

// 2. Fix the end
let endTarget = `  container.cleanup = () => {
    clearTimeout(hintTimer);
    clearTimeout(tutTimeout);
  };

  return container;
}`;

let endReplacement = `  return () => {
    clearTimeout(hintTimer);
    clearTimeout(tutTimeout);
  };
}`;

s = s.replace(endTarget, endReplacement);

fs.writeFileSync('src/screens/matchMode.js', s);
