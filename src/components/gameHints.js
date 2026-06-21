/**
 * Mini animated gameplay demos for main menu game mode cards.
 * Each function returns a container element with a looping animation.
 * OPTIMIZED: Uses IntersectionObserver — animations only run when visible.
 */

/**
 * Shared helper: wraps an animate() loop with IntersectionObserver.
 * Animation only runs when the container is visible on screen.
 */
function attachObserver(container, animateFn) {
  let running = false;
  let animating = false;

  const start = () => {
    if (animating) return;
    running = true;
    animating = true;
    animateFn(
      () => running,
      () => { animating = false; }
    );
  };

  const stop = () => { running = false; };

  const observer = new IntersectionObserver(
    (entries) => entries.forEach(e => e.isIntersecting ? start() : stop()),
    { threshold: 0.1 }
  );

  observer.observe(container);
  container._cleanup = () => { running = false; observer.disconnect(); };
}

// Shared utility: create a mini grid cell
function createMiniCell(size = 10, color = null) {
  const cell = document.createElement('div');
  cell.style.width = `${size}px`;
  cell.style.height = `${size}px`;
  cell.style.borderRadius = '2px';
  cell.style.transition = 'all 0.3s ease';
  if (color) {
    cell.style.background = color;
    cell.style.boxShadow = `inset 1px 1px 0 rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.15)`;
  } else {
    cell.style.background = 'rgba(255,255,255,0.15)';
  }
  return cell;
}

// Shared utility: delay helper
function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Classic Block hint: Shows a piece being placed on a 5x5 grid, 
 * then a row filling up and clearing with a flash.
 */
export function createClassicHint() {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.3;pointer-events:none;overflow:hidden;';

  const gridSize = 5;
  const cellSize = 11;
  const gap = 2;
  
  const grid = document.createElement('div');
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${gridSize},${cellSize}px);gap:${gap}px;`;

  const cells = [];
  for (let r = 0; r < gridSize; r++) {
    cells[r] = [];
    for (let c = 0; c < gridSize; c++) {
      const cell = createMiniCell(cellSize);
      cells[r][c] = cell;
      grid.appendChild(cell);
    }
  }
  container.appendChild(grid);

  const colors = [
    'linear-gradient(135deg, #60a5fa, #1d4ed8)',
    'linear-gradient(135deg, #4ade80, #15803d)',
    'linear-gradient(135deg, #f87171, #b91c1c)',
    'linear-gradient(135deg, #c084fc, #7e22ce)',
    'linear-gradient(135deg, #38bdf8, #0284c7)'
  ];

  attachObserver(container, async (isRunning, onEnd) => {
    while (isRunning()) {
      for (let r = 0; r < gridSize; r++)
        for (let c = 0; c < gridSize; c++) {
          cells[r][c].style.background = 'rgba(255,255,255,0.15)';
          cells[r][c].style.boxShadow = 'none';
          cells[r][c].style.opacity = '1';
          cells[r][c].style.transform = 'scale(1)';
        }
      await wait(600); if (!isRunning()) break;

      const prefillColor = colors[0];
      for (let c = 3; c < gridSize; c++) {
        cells[4][c].style.background = prefillColor;
        cells[4][c].style.boxShadow = 'inset 1px 1px 0 rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.15)';
      }
      cells[3][2].style.background = colors[1];
      cells[3][2].style.boxShadow = 'inset 1px 1px 0 rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.15)';
      cells[2][4].style.background = colors[2];
      cells[2][4].style.boxShadow = 'inset 1px 1px 0 rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.15)';
      cells[1][1].style.background = colors[3];
      cells[1][1].style.boxShadow = 'inset 1px 1px 0 rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.15)';
      await wait(800); if (!isRunning()) break;

      const pieceColor = colors[4];
      const pieceCells = [[4, 0], [4, 1], [4, 2], [3, 0]];
      for (const [r, c] of pieceCells) {
        if (!isRunning()) break;
        cells[r][c].style.background = pieceColor;
        cells[r][c].style.boxShadow = 'inset 1px 1px 0 rgba(255,255,255,0.4), inset -1px -1px 0 rgba(0,0,0,0.15)';
        cells[r][c].style.transform = 'scale(1.15)';
        await wait(80);
        cells[r][c].style.transform = 'scale(1)';
      }
      await wait(500); if (!isRunning()) break;

      for (let c = 0; c < gridSize; c++) {
        cells[4][c].style.background = '#ffffff';
        cells[4][c].style.transform = 'scale(1.1)';
      }
      await wait(400); if (!isRunning()) break;
      for (let c = 0; c < gridSize; c++) {
        cells[4][c].style.background = 'rgba(255,255,255,0.15)';
        cells[4][c].style.boxShadow = 'none';
        cells[4][c].style.transform = 'scale(0.8)';
        cells[4][c].style.opacity = '0.3';
      }
      await wait(300); if (!isRunning()) break;
      for (let c = 0; c < gridSize; c++) {
        cells[4][c].style.transform = 'scale(1)';
        cells[4][c].style.opacity = '1';
      }
      await wait(1500);
    }
    onEnd();
  });

  return container;
}

/**
 * Adventure hint: Score counter climbing toward a target with star burst
 */
export function createAdventureHint() {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0.25;pointer-events:none;overflow:hidden;';

  const scoreEl = document.createElement('div');
  scoreEl.style.cssText = 'font-size:20px;font-weight:900;color:white;font-family:Inter,sans-serif;text-shadow:0 2px 8px rgba(0,0,0,0.3);';
  container.appendChild(scoreEl);

  const starsEl = document.createElement('div');
  starsEl.style.cssText = 'display:flex;gap:4px;margin-top:6px;';
  for (let i = 0; i < 3; i++) {
    const star = document.createElement('span');
    star.textContent = '⭐';
    star.style.cssText = 'font-size:14px;opacity:0.3;transition:all 0.4s ease;transform:scale(0.7);';
    starsEl.appendChild(star);
  }
  container.appendChild(starsEl);

  attachObserver(container, async (isRunning, onEnd) => {
    while (isRunning()) {
      scoreEl.textContent = '0';
      starsEl.querySelectorAll('span').forEach(s => {
        s.style.opacity = '0.3';
        s.style.transform = 'scale(0.7)';
      });
      await wait(500); if (!isRunning()) break;

      const target = 1500;
      const stars = starsEl.querySelectorAll('span');
      for (let s = 0; s <= target; s += 75) {
        if (!isRunning()) break;
        scoreEl.textContent = s.toLocaleString();
        if (s >= 500 && stars[0].style.opacity === '0.3') {
          stars[0].style.opacity = '1'; stars[0].style.transform = 'scale(1.2)';
          setTimeout(() => stars[0].style.transform = 'scale(1)', 200);
        }
        if (s >= 1000 && stars[1].style.opacity === '0.3') {
          stars[1].style.opacity = '1'; stars[1].style.transform = 'scale(1.2)';
          setTimeout(() => stars[1].style.transform = 'scale(1)', 200);
        }
        if (s >= 1500 && stars[2].style.opacity === '0.3') {
          stars[2].style.opacity = '1'; stars[2].style.transform = 'scale(1.2)';
          setTimeout(() => stars[2].style.transform = 'scale(1)', 200);
        }
        await wait(50);
      }
      scoreEl.textContent = target.toLocaleString();
      await wait(2000);
    }
    onEnd();
  });

  return container;
}

/**
 * Hex Block hint: Hexagonal pieces dropping into a mini hex grid
 */
export function createHexHint() {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.25;pointer-events:none;overflow:hidden;';

  const hexGrid = document.createElement('div');
  hexGrid.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:1px;';

  const rows = [3, 4, 3, 4, 3];
  const allCells = [];

  rows.forEach((count, rowIdx) => {
    const row = document.createElement('div');
    row.style.cssText = `display:flex;gap:2px;${rowIdx % 2 === 1 ? 'margin-left:7px;' : ''}`;
    const rowCells = [];
    for (let i = 0; i < count; i++) {
      const hex = document.createElement('div');
      hex.style.cssText = 'width:12px;height:10px;clip-path:polygon(25% 0%,75% 0%,100% 50%,75% 100%,25% 100%,0% 50%);background:rgba(255,255,255,0.15);transition:all 0.3s ease;';
      row.appendChild(hex);
      rowCells.push(hex);
    }
    hexGrid.appendChild(row);
    allCells.push(rowCells);
  });
  container.appendChild(hexGrid);

  const hexColors = ['linear-gradient(135deg, #f472b6, #be185d)', 'linear-gradient(135deg, #c084fc, #7e22ce)'];
  attachObserver(container, async (isRunning, onEnd) => {
    while (isRunning()) {
      allCells.forEach(row => row.forEach(c => {
        c.style.background = 'rgba(255,255,255,0.15)';
        c.style.transform = 'scale(1)';
      }));
      await wait(700); if (!isRunning()) break;

      const placements = [[0,0],[0,1],[1,0],[1,1],[2,0],[2,1],[3,0],[3,1],[4,0],[4,1]];
      for (const [r, c] of placements) {
        if (!isRunning()) break;
        if (allCells[r] && allCells[r][c]) {
          allCells[r][c].style.background = hexColors[r % 2];
          allCells[r][c].style.transform = 'scale(1.2)';
          await wait(120);
          allCells[r][c].style.transform = 'scale(1)';
        }
      }
      await wait(600); if (!isRunning()) break;

      for (const [r, c] of placements)
        if (allCells[r] && allCells[r][c]) allCells[r][c].style.background = '#ffffff';
      await wait(350); if (!isRunning()) break;
      for (const [r, c] of placements)
        if (allCells[r] && allCells[r][c]) {
          allCells[r][c].style.background = 'rgba(255,255,255,0.15)';
          allCells[r][c].style.transform = 'scale(0.7)';
        }
      await wait(300); if (!isRunning()) break;
      for (const [r, c] of placements)
        if (allCells[r] && allCells[r][c]) allCells[r][c].style.transform = 'scale(1)';
      await wait(1500);
    }
    onEnd();
  });

  return container;
}

/**
 * Color Sort hint: Tubes with colored blocks being sorted
 */
export function createSortHint() {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.25;pointer-events:none;overflow:hidden;gap:6px;';

  const tubeColors = [
    ['#f87171', '#60a5fa', '#f87171'],
    ['#60a5fa', '#f87171', '#60a5fa'],
    [null, null, null]
  ];

  const tubes = [];
  tubeColors.forEach(colors => {
    const tube = document.createElement('div');
    tube.style.cssText = 'display:flex;flex-direction:column;gap:2px;padding:3px;border:1.5px solid rgba(255,255,255,0.3);border-radius:0 0 8px 8px;border-top:none;';
    const blocks = [];
    colors.forEach(color => {
      const block = document.createElement('div');
      block.style.cssText = `width:14px;height:10px;border-radius:2px;transition:all 0.4s ease;background:${color || 'transparent'};`;
      if (color) block.style.boxShadow = 'inset 1px 1px 0 rgba(255,255,255,0.3)';
      tube.appendChild(block);
      blocks.push(block);
    });
    container.appendChild(tube);
    tubes.push(blocks);
  });

  attachObserver(container, async (isRunning, onEnd) => {
    while (isRunning()) {
      tubes[0][0].style.background = '#f87171'; tubes[0][1].style.background = '#60a5fa'; tubes[0][2].style.background = '#f87171';
      tubes[1][0].style.background = '#60a5fa'; tubes[1][1].style.background = '#f87171'; tubes[1][2].style.background = '#60a5fa';
      tubes[2][0].style.background = 'transparent'; tubes[2][1].style.background = 'transparent'; tubes[2][2].style.background = 'transparent';
      await wait(800); if (!isRunning()) break;

      tubes[0][1].style.background = 'transparent';
      await wait(200); if (!isRunning()) break;
      tubes[2][2].style.background = '#60a5fa';
      await wait(500); if (!isRunning()) break;

      tubes[1][1].style.background = 'transparent';
      await wait(200); if (!isRunning()) break;
      tubes[0][1].style.background = '#f87171';
      await wait(500); if (!isRunning()) break;

      tubes[1][0].style.background = 'transparent';
      await wait(200); if (!isRunning()) break;
      tubes[2][1].style.background = '#60a5fa';
      await wait(500); if (!isRunning()) break;

      tubes[1][2].style.background = 'transparent';
      await wait(200); if (!isRunning()) break;
      tubes[2][0].style.background = '#60a5fa';
      await wait(800); if (!isRunning()) break;

      tubes[0].forEach(b => b.style.opacity = '0.5');
      tubes[2].forEach(b => b.style.opacity = '0.5');
      await wait(500); if (!isRunning()) break;
      tubes[0].forEach(b => b.style.opacity = '1');
      tubes[2].forEach(b => b.style.opacity = '1');
      await wait(1500);
    }
    onEnd();
  });

  return container;
}

/**
 * 2048 hint: Numbers sliding and merging on a mini 3x3 grid
 */
export function create2048Hint() {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.25;pointer-events:none;overflow:hidden;';

  const gridSize = 3;
  const cellSize = 18;
  const gap = 3;

  const grid = document.createElement('div');
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${gridSize},${cellSize}px);gap:${gap}px;background:rgba(255,255,255,0.1);padding:3px;border-radius:4px;`;

  const cells = [];
  for (let r = 0; r < gridSize; r++) {
    cells[r] = [];
    for (let c = 0; c < gridSize; c++) {
      const cell = document.createElement('div');
      cell.style.cssText = `width:${cellSize}px;height:${cellSize}px;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:900;color:white;font-family:Inter,sans-serif;transition:all 0.3s ease;background:rgba(255,255,255,0.1);`;
      cells[r][c] = cell;
      grid.appendChild(cell);
    }
  }
  container.appendChild(grid);

  const numColors = {
    2: '#eab308', 4: '#f97316', 8: '#ef4444', 16: '#a855f7', 32: '#3b82f6', 64: '#06b6d4'
  };

  function setCell(r, c, val) {
    if (val) {
      cells[r][c].textContent = val;
      cells[r][c].style.background = numColors[val] || '#6b7280';
      cells[r][c].style.transform = 'scale(1.15)';
      setTimeout(() => cells[r][c].style.transform = 'scale(1)', 150);
    } else {
      cells[r][c].textContent = '';
      cells[r][c].style.background = 'rgba(255,255,255,0.1)';
    }
  }

  function clearAll() {
    for (let r = 0; r < gridSize; r++)
      for (let c = 0; c < gridSize; c++)
        setCell(r, c, null);
  }

  attachObserver(container, async (isRunning, onEnd) => {
    while (isRunning()) {
      for (let r = 0; r < gridSize; r++)
        for (let c = 0; c < gridSize; c++) setCell(r, c, null);
      await wait(500); if (!isRunning()) break;

      setCell(2, 0, 2); await wait(300); if (!isRunning()) break;
      setCell(2, 2, 2); await wait(500); if (!isRunning()) break;
      setCell(2, 0, null); setCell(2, 2, 4);
      await wait(500); if (!isRunning()) break;
      setCell(0, 1, 2); await wait(400); if (!isRunning()) break;
      setCell(0, 2, 4); await wait(500); if (!isRunning()) break;
      setCell(0, 2, null); setCell(2, 2, 8);
      await wait(500); if (!isRunning()) break;
      setCell(1, 0, 2); await wait(400); if (!isRunning()) break;
      setCell(1, 2, 2); await wait(400); if (!isRunning()) break;
      setCell(1, 0, null); setCell(1, 2, 4);
      await wait(500); if (!isRunning()) break;

      cells[2][2].style.background = '#ffffff';
      cells[2][2].style.transform = 'scale(1.3)';
      await wait(400); if (!isRunning()) break;
      cells[2][2].style.background = numColors[8];
      cells[2][2].style.transform = 'scale(1)';
      await wait(1500);
    }
    onEnd();
  });

  return container;
}

/**
 * Merge Block hint: Blocks dropping and merging in 3's
 */
export function createMergeHint() {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.25;pointer-events:none;overflow:hidden;';

  const gridSize = 3;
  const cellSize = 16;
  const gap = 2;

  const grid = document.createElement('div');
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${gridSize},${cellSize}px);gap:${gap}px;background:rgba(255,255,255,0.1);padding:3px;border-radius:4px;`;

  const cells = [];
  for (let r = 0; r < gridSize; r++) {
    cells[r] = [];
    for (let c = 0; c < gridSize; c++) {
      const cell = document.createElement('div');
      cell.style.cssText = `width:${cellSize}px;height:${cellSize}px;border-radius:2px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:900;color:white;font-family:Inter,sans-serif;transition:all 0.4s ease;background:rgba(255,255,255,0.1);`;
      cells[r][c] = cell;
      grid.appendChild(cell);
    }
  }
  container.appendChild(grid);

  function setCell(r, c, val, color) {
    if (val) {
      cells[r][c].textContent = val;
      cells[r][c].style.background = color;
    } else {
      cells[r][c].textContent = '';
      cells[r][c].style.background = 'rgba(255,255,255,0.1)';
    }
  }

  const purple = 'linear-gradient(135deg, #c084fc, #7e22ce)';
  const green = 'linear-gradient(135deg, #4ade80, #15803d)';

  attachObserver(container, async (isRunning, onEnd) => {
    while (isRunning()) {
      for (let r = 0; r < gridSize; r++)
        for (let c = 0; c < gridSize; c++) setCell(r, c, null);
      await wait(500); if (!isRunning()) break;

      setCell(2, 0, '2', purple); await wait(300); if (!isRunning()) break;
      setCell(2, 1, '2', purple); await wait(300); if (!isRunning()) break;
      setCell(2, 2, '2', purple); await wait(500); if (!isRunning()) break;

      for (let c = 0; c < 3; c++) {
        cells[2][c].style.background = '#ffffff';
        cells[2][c].style.transform = 'scale(1.2)';
      }
      await wait(350); if (!isRunning()) break;
      setCell(2, 0, null);
      setCell(2, 2, null);
      cells[2][1].style.transform = 'scale(1.3)';
      setCell(2, 1, '6', green);
      await wait(200); if (!isRunning()) break;
      cells[2][1].style.transform = 'scale(1)';
      await wait(1500);
    }
    onEnd();
  });

  return container;
}

/**
 * X2 2048 hint: Blocks dropping into columns and merging
 */
export function createX2Hint() {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.25;pointer-events:none;overflow:hidden;';

  const cols = 3;
  const rows = 4;
  const cellSize = 14;
  const gap = 2;

  const grid = document.createElement('div');
  grid.style.cssText = `display:grid;grid-template-columns:repeat(${cols},${cellSize}px);grid-template-rows:repeat(${rows},${cellSize}px);gap:${gap}px;background:rgba(255,255,255,0.08);padding:3px;border-radius:4px;box-sizing:border-box;`;

  const cells = [];
  for (let r = 0; r < rows; r++) {
    cells[r] = [];
    for (let c = 0; c < cols; c++) {
      const cell = document.createElement('div');
      cell.style.cssText = `width:${cellSize}px;height:${cellSize}px;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:900;color:white;font-family:Inter,sans-serif;transition:all 0.3s ease;background:rgba(255,255,255,0.08);box-sizing:border-box;overflow:hidden;`;
      cells[r][c] = cell;
      grid.appendChild(cell);
    }
  }
  container.appendChild(grid);

  const numColors = { 2: '#eab308', 4: '#f97316', 8: '#ef4444', 16: '#a855f7' };

  function setCell(r, c, val) {
    if (val) {
      cells[r][c].textContent = val;
      cells[r][c].style.background = numColors[val] || '#6b7280';
      cells[r][c].style.boxShadow = '0 1px 3px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)';
      cells[r][c].style.transform = 'scale(1.15)';
      setTimeout(() => { if (cells[r][c]) cells[r][c].style.transform = 'scale(1)'; }, 150);
    } else {
      cells[r][c].textContent = '';
      cells[r][c].style.background = 'rgba(255,255,255,0.08)';
      cells[r][c].style.boxShadow = 'none';
      cells[r][c].style.transform = 'scale(1)';
      
    }
  }

  function clearAll() {
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        setCell(r, c, null);
  }

  attachObserver(container, async (isRunning, onEnd) => {
    while (isRunning()) {
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) setCell(r, c, null);
      await wait(600); if (!isRunning()) break;

      setCell(3, 1, 4); await wait(400); if (!isRunning()) break;
      setCell(3, 2, 4); await wait(400); if (!isRunning()) break;
      setCell(3, 0, 2); await wait(400); if (!isRunning()) break;
      setCell(2, 0, 2); await wait(500); if (!isRunning()) break;

      cells[3][0].style.background = '#ffffff';
      cells[2][0].style.background = '#ffffff';
      await wait(300); if (!isRunning()) break;
      setCell(2, 0, null);
      setCell(3, 0, 4);
      cells[3][0].style.transform = 'scale(1.3)';
      await wait(200); if (!isRunning()) break;
      cells[3][0].style.transform = 'scale(1)';
      await wait(400); if (!isRunning()) break;

      cells[3][0].style.background = '#ffffff';
      cells[3][1].style.background = '#ffffff';
      await wait(300); if (!isRunning()) break;
      setCell(3, 1, null);
      setCell(3, 0, 8);
      cells[3][0].style.transform = 'scale(1.4)';
      await wait(250); if (!isRunning()) break;
      cells[3][0].style.transform = 'scale(1)';

      cells[3][0].style.background = '#ffffff';
      await wait(400); if (!isRunning()) break;
      cells[3][0].style.background = numColors[8];
      await wait(1500);
    }
    onEnd();
  });

  return container;
}

/**
 * Bubble Shooter hint: A cluster of bubbles and one shooting up to pop them.
 */
export function createBubbleHint() {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0.3;pointer-events:none;overflow:hidden;gap:15px;';

  const cluster = document.createElement('div');
  cluster.style.cssText = 'display:flex;gap:2px;margin-top:10px;';
  
  const bubbles = [];
  const colors = [
    'linear-gradient(135deg, #fca5a5, #ef4444)', // red
    'linear-gradient(135deg, #93c5fd, #3b82f6)', // blue
    'linear-gradient(135deg, #fde047, #eab308)', // yellow
    'linear-gradient(135deg, #86efac, #22c55e)'  // green
  ];
  
  // Create 3 target bubbles
  for (let i = 0; i < 3; i++) {
    const b = document.createElement('div');
    b.style.cssText = `width:14px;height:14px;border-radius:50%;background:${colors[1]};box-shadow:inset -2px -2px 4px rgba(0,0,0,0.2), inset 1px 1px 2px rgba(255,255,255,0.8);transition:all 0.3s ease;`;
    cluster.appendChild(b);
    bubbles.push(b);
  }
  container.appendChild(cluster);

  const shooterContainer = document.createElement('div');
  shooterContainer.style.cssText = 'height:40px;display:flex;align-items:flex-end;position:relative;width:14px;';
  
  const shooter = document.createElement('div');
  shooter.style.cssText = `width:14px;height:14px;border-radius:50%;background:${colors[1]};box-shadow:inset -2px -2px 4px rgba(0,0,0,0.2), inset 1px 1px 2px rgba(255,255,255,0.8);position:absolute;bottom:0;left:0;transition:transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease;`;
  shooterContainer.appendChild(shooter);
  container.appendChild(shooterContainer);

  attachObserver(container, async (isRunning, onEnd) => {
    while (isRunning()) {
      // Reset
      bubbles.forEach(b => { b.style.opacity = '1'; b.style.transform = 'scale(1)'; });
      shooter.style.transition = 'none';
      shooter.style.transform = 'translateY(0)';
      shooter.style.opacity = '1';
      
      await wait(500); if (!isRunning()) break;
      
      // Shoot
      shooter.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease';
      shooter.style.transform = 'translateY(-30px)'; // move up to the cluster
      
      await wait(400); if (!isRunning()) break;
      
      // Pop
      shooter.style.opacity = '0';
      shooter.style.transform = 'translateY(-30px) scale(1.5)';
      bubbles.forEach(b => {
        b.style.transform = 'scale(1.5)';
        b.style.opacity = '0';
      });
      
      await wait(1500);
    }
    onEnd();
  });

  return container;
}

/**
 * Arrow Puzzle hint: A 3x3 grid of arrows moving in their directions
 */
export function createArrowHint() {
  const container = document.createElement('div');
  container.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0.5;pointer-events:none;overflow:hidden;';

  const svgWrap = document.createElement('div');
  svgWrap.style.cssText = 'width:42px;height:42px;position:relative;display:flex;align-items:center;justify-content:center;';

  svgWrap.innerHTML = `
    <svg viewBox="0 0 48 48" width="100%" height="100%" style="overflow:visible; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.5));">
      <!-- Arrow A (Down) -->
      <g id="hint-arr-a" style="transform: translate(0,0); opacity: 1;">
        <path d="M 24 0 L 24 12" stroke="white" stroke-width="3" stroke-linecap="square"/>
        <path d="M 24 16 L 19 9 L 24 11 L 29 9 Z" fill="white"/>
      </g>
      <!-- Arrow B (Right) -->
      <g id="hint-arr-b" style="transform: translate(0,0); opacity: 1;">
        <path d="M 8 24 L 20 24" stroke="white" stroke-width="3" stroke-linecap="square"/>
        <path d="M 24 24 L 17 19 L 19 24 L 17 29 Z" fill="white"/>
      </g>
      <!-- Arrow C (Up) -->
      <g id="hint-arr-c" style="transform: translate(0,0); opacity: 1;">
        <path d="M 40 48 L 40 28" stroke="white" stroke-width="3" stroke-linecap="square"/>
        <path d="M 40 24 L 35 31 L 40 29 L 45 31 Z" fill="white"/>
      </g>
    </svg>
  `;
  container.appendChild(svgWrap);

  attachObserver(container, async (isRunning, onEnd) => {
    const a = svgWrap.querySelector('#hint-arr-a');
    const b = svgWrap.querySelector('#hint-arr-b');
    const c = svgWrap.querySelector('#hint-arr-c');
    
    // Windup & slither effect
    const trans = 'transform 0.45s cubic-bezier(0.5, -0.4, 0.8, 0.2), opacity 0.2s 0.25s ease-out';

    while (isRunning()) {
      // Reset
      a.style.transition = 'none'; a.style.transform = 'translate(0,0)'; a.style.opacity = '1';
      b.style.transition = 'none'; b.style.transform = 'translate(0,0)'; b.style.opacity = '1';
      c.style.transition = 'none'; c.style.transform = 'translate(0,0)'; c.style.opacity = '1';
      
      await wait(800); if (!isRunning()) break;
      
      // Step 1: C escapes UP
      c.style.transition = trans;
      c.style.transform = 'translateY(-30px)';
      c.style.opacity = '0';
      await wait(350); if (!isRunning()) break;
      
      // Step 2: B escapes RIGHT
      b.style.transition = trans;
      b.style.transform = 'translateX(30px)';
      b.style.opacity = '0';
      await wait(350); if (!isRunning()) break;

      // Step 3: A escapes DOWN
      a.style.transition = trans;
      a.style.transform = 'translateY(30px)';
      a.style.opacity = '0';

      await wait(1600);
    }
    onEnd();
  });

  return container;
}
