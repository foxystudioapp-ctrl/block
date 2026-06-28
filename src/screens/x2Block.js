import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { showGameOverModal } from './gameOver.js';
import { X2Engine } from '../game/x2Engine.js';
import { checkAndShowTutorial } from '../components/tutorial.js';
import { t } from '../utils/i18n.js';
import { showQuitConfirmation } from '../utils/quitConfirm.js';
import { TaskState } from '../state/taskState.js';
import { formatBlockValue } from '../utils/numberFormat.js';
import { Storage } from '../utils/storage.js';
import { createModal } from '../components/modal.js';
import { AdService } from '../services/adService.js';
import { Toast } from '../components/toast.js';
import { createScope } from '../utils/lifecycle.js';

export function X2Block(router) {
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] flex flex-col bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-pop-up relative overflow-hidden pb-2 sm:pb-3 md:pb-6 lg:pb-10';

  // --- Yaşam döngüsü kapsamı --------------------------------------------------
  // Bu satırdan itibaren tüm setTimeout / requestAnimationFrame çağrıları
  // otomatik olarak izlenir ve scope.destroy()'da eksiksiz iptal edilir.
  // (Native gölgeleme: çağrı noktalarına dokunmadan tam kapsama.)
  const scope = createScope({ name: 'x2' });
  const setTimeout = scope.setT;
  const requestAnimationFrame = scope.raf;

  const queryParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const mode = queryParams.get('mode') || 'adventure';

  let engine = new X2Engine(mode);
  // Adventure'da URL'de ?level=N varsa o seviyeden başla (mevcut save'i temizle)
  if (mode === 'adventure') {
    const urlLevel = parseInt(queryParams.get('level'), 10);
    if (urlLevel >= 1) {
      Storage.remove('x2_save_state');
      engine = new X2Engine(mode);
      engine.level = urlLevel;
      engine.initLevel(urlLevel);
    }
  }
  let powerUpMode = null; // 'hammer' | 'swap' | null
  let swapFirst = null;   // {row, col} for swap power-up

  // --- Top Bar ---
  const titleText = 'X2 2048';
  const x2BackTarget = mode === 'adventure' ? '#/adventure-map?game=x2' : '#/menu';
  const topBar = createTopBar(titleText, true, () => {
    showQuitConfirmation(router, x2BackTarget, {
      text: t('restart') || 'YENİDEN BAŞLAT',
      primary: false,
      onClick: (closeFn) => {
        closeFn();
        const saveKey = mode === 'endless' ? 'x2_endless_save_state' : 'x2_save_state';
        Storage.remove(saveKey);
        engine.restartCurrentLevel();
        powerUpMode = null;
        swapFirst = null;
        inputQueue.length = 0;
        renderBoard();
        renderNextBlocks();
        updateScore();
        updatePowerUpUI();
        clearPowerUpHighlights();
      }
    }, '');
  });
  container.appendChild(topBar);

  // --- Sub Controls: Help + Hammer ---
  const subControls = document.createElement('div');
  subControls.className = 'px-2 sm:px-4 md:px-6 lg:px-8 pt-1.5 md:pt-3 lg:pt-4 pb-0 flex items-center justify-between w-full z-30 gap-2';
  subControls.innerHTML = `
    <div class="flex items-center shrink-0">
      <button id="btn-help-x2" class="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full bg-white dark:bg-primary-container flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm active:scale-90 transition-transform text-red-500 dark:text-red-400">
        <span class="material-symbols-outlined text-[18px] md:text-[20px] lg:text-[22px]">help</span>
      </button>
    </div>

    <div class="flex items-center justify-end gap-1.5 md:gap-2 flex-1 overflow-x-auto no-scrollbar pl-1 pb-1">
      <!-- Hammer -->
      <button id="x2-power-hammer" class="flex items-center gap-1.5 px-2 md:px-2.5 py-1 rounded-full bg-white dark:bg-primary-container border border-black/5 dark:border-white/5 shadow-sm active:scale-95 transition-all shrink-0">
        <span class="text-[14px] md:text-[16px] leading-none">🔨</span>
        <span class="text-[9px] md:text-[11px] font-black tracking-tight leading-none uppercase text-gray-700 dark:text-gray-200">${t('x2_hammer') || 'Çekiç'}</span>
        <div class="flex items-center gap-0.5 bg-cyan-500/10 dark:bg-cyan-500/20 px-1.5 py-0.5 rounded-full ml-0.5">
          <span class="material-symbols-outlined text-[10px] md:text-[12px] fill text-cyan-500 dark:text-cyan-400">diamond</span>
          <span class="text-[10px] md:text-[11px] font-black text-cyan-600 dark:text-cyan-300 leading-none">50</span>
        </div>
      </button>
      
      <!-- Swap -->
      <button id="x2-power-swap" class="flex items-center gap-1.5 px-2 md:px-2.5 py-1 rounded-full bg-white dark:bg-primary-container border border-black/5 dark:border-white/5 shadow-sm active:scale-95 transition-all shrink-0">
        <span class="text-[14px] md:text-[16px] leading-none">🔄</span>
        <span class="text-[9px] md:text-[11px] font-black tracking-tight leading-none uppercase text-gray-700 dark:text-gray-200">${t('x2_swap') || 'Takas'}</span>
        <div class="flex items-center gap-0.5 bg-cyan-500/10 dark:bg-cyan-500/20 px-1.5 py-0.5 rounded-full ml-0.5">
          <span class="material-symbols-outlined text-[10px] md:text-[12px] fill text-cyan-500 dark:text-cyan-400">diamond</span>
          <span class="text-[10px] md:text-[11px] font-black text-cyan-600 dark:text-cyan-300 leading-none">75</span>
        </div>
      </button>
    </div>
  `;
  container.appendChild(subControls);

  // --- Content ---
  const content = document.createElement('main');
  content.className = 'flex-1 flex flex-col items-center justify-center px-4 pt-2 pb-2 space-y-4 overflow-hidden relative min-h-0';

  // --- Game Board ---
  const boardWrapper = document.createElement('div');
  boardWrapper.className = 'w-full bg-black/5 dark:bg-slate-800/80 p-2.5 rounded-[1.5rem] border border-black/5 dark:border-slate-700/50 shadow-inner relative mx-auto';
  boardWrapper.style.maxWidth = '100%';
  const maxBoardHeight = window.innerWidth >= 1024 ? '75vh' : window.innerWidth >= 768 ? '70vh' : '65vh';
  boardWrapper.style.maxHeight = maxBoardHeight;
  boardWrapper.style.height = '100%';
  boardWrapper.style.width = 'auto';
  boardWrapper.style.aspectRatio = '5 / 7';
  boardWrapper.style.transform = 'translateZ(0)';
  boardWrapper.style.willChange = 'transform';

  // Danger line (now at bottom, above row 6)
  const dangerLine = document.createElement('div');
  dangerLine.className = 'absolute left-2.5 right-2.5 h-[2px] bg-red-500/40 z-20 pointer-events-none x2-danger-line';
  dangerLine.style.top = 'calc(71.428% - 2px)'; // Above the bottom 2 rows
  boardWrapper.appendChild(dangerLine);

  // (Removed colBgContainer to use individual grid cells like 2048)

  // Column touch areas (invisible, above the grid)
  const columnTouchArea = document.createElement('div');
  columnTouchArea.id = 'x2-column-touch-area';
  columnTouchArea.className = 'absolute inset-0 z-30 grid';
  columnTouchArea.style.gridTemplateColumns = `repeat(${engine.cols}, minmax(0, 1fr))`;

  for (let c = 0; c < engine.cols; c++) {
    const colBtn = document.createElement('button');
    colBtn.className = 'w-full h-full bg-black/5 dark:bg-white/5 border-r border-black/10 dark:border-white/10 last:border-r-0 active:bg-black/10 dark:active:bg-white/10 transition-colors';
    colBtn.dataset.col = c;
    colBtn.addEventListener('click', () => handleColumnClick(c));
    // Touch events for ghost preview
    colBtn.addEventListener('touchstart', (e) => { e.preventDefault(); showGhost(c); }, { passive: false });
    colBtn.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const rect = columnTouchArea.getBoundingClientRect();
      const relX = touch.clientX - rect.left;
      const colWidth = rect.width / engine.cols;
      const hoverCol = Math.floor(relX / colWidth);
      if (hoverCol >= 0 && hoverCol < engine.cols) {
        if (!colBtn._rafId) {
          colBtn._rafId = requestAnimationFrame(() => {
            showGhost(hoverCol);
            colBtn._rafId = null;
          });
        }
      }
    }, { passive: true });
    colBtn.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      const rect = columnTouchArea.getBoundingClientRect();
      const relX = touch.clientX - rect.left;
      const colWidth = rect.width / engine.cols;
      const dropCol = Math.floor(relX / colWidth);
      hideGhost();
      if (dropCol >= 0 && dropCol < engine.cols) handleColumnClick(dropCol);
    });
    colBtn.addEventListener('mouseenter', () => showGhost(c));
    colBtn.addEventListener('mouseleave', () => hideGhost());
    columnTouchArea.appendChild(colBtn);
  }
  boardWrapper.appendChild(columnTouchArea);

  // The actual grid cells
  const boardEl = document.createElement('div');
  boardEl.id = 'x2-board';
  boardEl.className = 'w-full h-full grid relative z-10';
  boardEl.style.gridTemplateColumns = `repeat(${engine.cols}, minmax(0, 1fr))`;
  boardEl.style.gridTemplateRows = `repeat(${engine.rows}, minmax(0, 1fr))`;
  boardEl.style.columnGap = '4px';
  boardEl.style.rowGap = '0px';
  boardWrapper.appendChild(boardEl);

  // Combo text overlay
  const comboOverlay = document.createElement('div');
  comboOverlay.id = 'x2-combo-overlay';
  comboOverlay.className = 'absolute inset-0 z-40 pointer-events-none flex items-center justify-center';
  boardWrapper.appendChild(comboOverlay);

  // --- Power-Up Bar & Next Block ---
  const powerBar = document.createElement('div');
  powerBar.className = 'w-full flex items-center justify-between gap-3 md:gap-5 pt-2 pb-1 relative max-w-[340px] md:max-w-[480px] mx-auto';

  // We have 2 powers available
  const powers = [
    { id: 'hammer', icon: '🔨', label: t('x2_hammer') || 'Çekiç', cost: 50 },
    { id: 'swap', icon: '🔀', label: t('x2_swap') || 'Takas', cost: 75 }
  ];

  const levelBox = document.createElement('div');
  levelBox.className = 'flex-1 flex flex-col items-center justify-center text-center pb-2';
  
  if (mode === 'adventure') {
    levelBox.innerHTML = `
      <div class="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-1 drop-shadow-md">
        <div class="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
        <div class="absolute inset-0 rounded-full border-4 border-t-indigo-400 rotate-45"></div>
        <div class="bg-gradient-to-br from-indigo-500 to-purple-600 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-inner border border-white/20">
          <span id="x2-level-badge" class="text-xl md:text-2xl font-black text-white drop-shadow-sm leading-none">${engine.level}</span>
        </div>
        <div class="absolute -top-1.5 -right-1.5 text-sm md:text-base drop-shadow-md">👑</div>
      </div>
      <span class="text-[9px] md:text-[10px] font-black text-gray-400 tracking-wider">${t('level') || 'SEVİYE'}</span>
    `;
  } else {
    levelBox.innerHTML = `
      <div class="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-1 drop-shadow-md opacity-60">
        <div class="text-3xl">♾️</div>
      </div>
      <span class="text-[9px] md:text-[10px] font-black text-gray-400 tracking-wider">${(t('mode_classic') || 'KLASİK').toUpperCase()}</span>
    `;
  }

  const targetBox = document.createElement('div');
  targetBox.className = 'flex-1 flex flex-col items-center justify-center text-center pb-2';
  targetBox.innerHTML = `
    <span class="text-[10px] md:text-xs font-black text-gray-400 tracking-wider mb-0.5">${t('score') || 'SKOR'}</span>
    <span id="x2-score" class="text-[22px] md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-sm leading-none mb-2">0</span>
    
    ${mode === 'adventure' ? `
    <div class="w-[85%] md:w-[90%] bg-black/10 dark:bg-white/10 rounded-full h-1.5 mb-1.5 relative overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
      <div id="x2-level-progress" class="bg-gradient-to-r from-rose-400 to-orange-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(251,146,60,0.6)]" style="width: 0%"></div>
    </div>
    
    <div class="w-[85%] md:w-[90%] bg-rose-500/10 border border-rose-500/20 rounded-xl py-1 flex flex-col justify-center items-center shadow-sm">
      <span class="text-[8px] md:text-[9px] font-bold text-rose-600/80 dark:text-rose-400/80 uppercase leading-none mb-0.5">${t('target_score') || 'HEDEF'}</span>
      <span id="x2-target-badge" class="text-[12px] md:text-[14px] font-black text-rose-600 dark:text-rose-400 drop-shadow-sm leading-none">${formatBlockValue(engine.getTargetScore())}</span>
    </div>
    ` : ''}
  `;

  // Next block box and Change button wrapper
  const nextBoxContainer = document.createElement('div');
  nextBoxContainer.id = 'x2-next-wrapper';
  nextBoxContainer.className = 'flex flex-col items-center gap-1.5 shrink-0 z-10';
  nextBoxContainer.innerHTML = `
    <div id="x2-next-container" class="w-28 md:w-36 glass-panel rounded-2xl h-20 md:h-24 flex flex-col items-center justify-center shadow-md relative overflow-hidden touch-none shrink-0 border border-white/40 dark:border-white/10">
      <span class="text-[9px] md:text-[11px] font-black text-gray-400/80 mb-1 tracking-widest">${t('x2_next') || 'SIRADAKİ'}</span>
      <div class="flex items-center gap-1.5 md:gap-2">
        <div id="x2-current-block" class="w-12 h-12 md:w-16 md:h-16 rounded-[14px] flex items-center justify-center text-white font-black text-xl md:text-3xl shadow-lg border border-white/30 cursor-grab active:cursor-grabbing relative"></div>
        <div id="x2-next-block" class="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-white font-black text-xs md:text-sm shadow-inner opacity-60 border border-white/20 relative"></div>
      </div>
    </div>
  `;

  powerBar.appendChild(levelBox);
  powerBar.appendChild(nextBoxContainer);
  powerBar.appendChild(targetBox);

  content.appendChild(powerBar);
  content.appendChild(boardWrapper);
  container.appendChild(content);

  // Add listeners for powerups now that they are in DOM
  setTimeout(() => {
    const swapBtn = container.querySelector('#x2-power-swap');
    if (swapBtn) swapBtn.addEventListener('click', () => handlePowerUp('swap'));
  }, 0);

  // ============ BLOCK COLORS ============
  const blockColors = {
    2: { bg: '#eab308', text: '#fff' },
    4: { bg: '#f97316', text: '#fff' },
    8: { bg: '#ef4444', text: '#fff' },
    16: { bg: '#a855f7', text: '#fff' },
    32: { bg: '#3b82f6', text: '#fff' },
    64: { bg: '#06b6d4', text: '#fff' },
    128: { bg: '#10b981', text: '#fff' },
    256: { bg: '#ec4899', text: '#fff' },
    512: { bg: '#8b5cf6', text: '#fff' },
    1024: { bg: '#f43f5e', text: '#fff' },
    2048: { bg: 'linear-gradient(135deg, #fbbf24, #f59e0b)', text: '#fff' },
    4096: { bg: 'linear-gradient(135deg, #a855f7, #ec4899)', text: '#fff' },
  };

  const premiumTiers = [
    { bg: 'linear-gradient(135deg, #cd7f32, #8b5a2b)', text: '#fff', glow: '0 4px 15px rgba(205,127,50,0.5)' }, // 8K Bronze
    { bg: 'linear-gradient(135deg, #9ca3af, #4b5563)', text: '#fff', glow: '0 4px 15px rgba(156,163,175,0.5)' }, // 16K Silver
    { bg: 'linear-gradient(135deg, #fbbf24, #d97706)', text: '#fff', glow: '0 4px 15px rgba(251,191,36,0.6)' }, // 32K Gold
    { bg: 'linear-gradient(135deg, #22d3ee, #0284c7)', text: '#fff', glow: '0 4px 15px rgba(34,211,238,0.6)' }, // 65K Diamond
    { bg: 'linear-gradient(135deg, #f43f5e, #be123c)', text: '#fff', glow: '0 4px 15px rgba(244,63,94,0.6)' }, // 131K Ruby
    { bg: 'linear-gradient(135deg, #34d399, #047857)', text: '#fff', glow: '0 4px 15px rgba(52,211,153,0.6)' }, // 262K Emerald
    { bg: 'linear-gradient(135deg, #a855f7, #6d28d9)', text: '#fff', glow: '0 4px 15px rgba(168,85,247,0.6)' }, // 524K Amethyst
    { bg: 'linear-gradient(135deg, #1e3a8a, #1e1b4b)', text: '#fff', glow: '0 4px 15px rgba(30,58,138,0.6)' }, // 1M Sapphire
    { bg: 'linear-gradient(135deg, #1f2937, #000000)', text: '#fff', glow: '0 4px 15px rgba(31,41,55,0.6)' }, // 2M Obsidian
    { bg: 'linear-gradient(135deg, #fbcfe8, #f472b6)', text: '#fff', glow: '0 4px 15px rgba(244,114,182,0.6)' }, // 4M Pearl
    { bg: 'linear-gradient(135deg, #f97316, #e11d48)', text: '#fff', glow: '0 4px 15px rgba(249,115,22,0.6)' }, // 8M Sunset
    { bg: 'linear-gradient(135deg, #d946ef, #7e22ce)', text: '#fff', glow: '0 4px 15px rgba(217,70,239,0.6)' }, // 16M Neon Pink
    { bg: 'linear-gradient(135deg, #84cc16, #eab308)', text: '#fff', glow: '0 4px 15px rgba(132,204,22,0.6)' }, // 33M Toxic
    { bg: 'linear-gradient(135deg, #0f766e, #0369a1)', text: '#fff', glow: '0 4px 15px rgba(15,118,110,0.6)' }, // 67M Ocean
    { bg: 'linear-gradient(135deg, #020617, #312e81)', text: '#fff', glow: '0 4px 15px rgba(49,46,129,0.6)' }, // 134M Cosmic
    { bg: 'linear-gradient(135deg, #fef08a, #ea580c)', text: '#fff', glow: '0 4px 15px rgba(234,88,12,0.6)' }, // 268M Supernova
    { bg: 'linear-gradient(135deg, #eab308, #06b6d4)', text: '#fff', glow: '0 4px 15px rgba(6,182,212,0.6)' }, // Cyberpunk
    { bg: 'linear-gradient(135deg, #7f1d1d, #000000)', text: '#fff', glow: '0 4px 15px rgba(127,29,29,0.6)' }, // Blood Moon
    { bg: 'linear-gradient(135deg, #2dd4bf, #c084fc)', text: '#fff', glow: '0 4px 15px rgba(45,212,191,0.6)' }, // Aurora
    { bg: 'linear-gradient(135deg, #bae6fd, #ffffff)', text: '#000', glow: '0 4px 15px rgba(186,230,253,0.6)' }, // Frostbite
    { bg: 'linear-gradient(135deg, #ec4899, #3b82f6)', text: '#fff', glow: '0 4px 15px rgba(236,72,153,0.6)' }, // Plasma
    { bg: 'linear-gradient(135deg, #e5e7eb, #fbcfe8)', text: '#000', glow: '0 4px 15px rgba(229,231,235,0.6)' }, // Stardust
    { bg: 'linear-gradient(135deg, #000000, #dc2626)', text: '#fff', glow: '0 4px 15px rgba(220,38,38,0.6)' }, // Infernal
    { bg: 'linear-gradient(135deg, #172554, #000000)', text: '#fff', glow: '0 4px 15px rgba(23,37,84,0.6)' }, // Abyssal
    { bg: 'linear-gradient(135deg, #fb923c, #fef08a)', text: '#000', glow: '0 4px 15px rgba(251,146,60,0.6)' }, // Solar Flare
    { bg: 'linear-gradient(135deg, #e0f2fe, #ffffff)', text: '#000', glow: '0 4px 15px rgba(224,242,254,0.6)' }, // Ethereal
    { bg: 'linear-gradient(135deg, #2e1065, #000000)', text: '#fff', glow: '0 4px 15px rgba(46,16,101,0.6)' }, // Dark Matter
    { bg: 'linear-gradient(135deg, #374151, #84cc16)', text: '#fff', glow: '0 4px 15px rgba(132,204,22,0.6)' }, // Antimatter
    { bg: 'linear-gradient(135deg, #22d3ee, #d946ef)', text: '#fff', glow: '0 4px 15px rgba(217,70,239,0.6)' }, // Quantum
    { bg: 'linear-gradient(135deg, #78350f, #fbbf24)', text: '#fff', glow: '0 4px 15px rgba(251,191,36,0.6)' }, // Chronos
    { bg: 'linear-gradient(135deg, #f472b6, #1e3a8a)', text: '#fff', glow: '0 4px 15px rgba(244,114,182,0.6)' }, // Nebula
    { bg: 'linear-gradient(135deg, #ef4444, #8b5cf6)', text: '#fff', glow: '0 4px 15px rgba(239,68,68,0.6)' }, // Prism
    { bg: 'linear-gradient(135deg, #ffffff, #c084fc)', text: '#000', glow: '0 4px 15px rgba(255,255,255,0.6)' }, // Hypernova
    { bg: 'linear-gradient(135deg, #000000, #581c87)', text: '#fff', glow: '0 4px 15px rgba(88,28,135,0.6)' }, // Black Hole
    { bg: 'linear-gradient(135deg, #ffffff, #ffffff)', text: '#000', glow: '0 4px 20px rgba(168,85,247,0.8)' }, // Infinity
  ];

  function getBlockStyle(val) {
    const entry = blockColors[val];
    if (entry) return entry;
    if (val >= 8192) {
      const power = Math.floor(Math.log2(val));
      const tierIndex = (power - 13) % premiumTiers.length;
      return premiumTiers[tierIndex];
    }
    return { bg: 'linear-gradient(135deg, #6366f1, #ec4899, #f59e0b)', text: '#fff' };
  }


  function applyBlockContent(element, val, style) {
    element.innerHTML = `<div class="absolute inset-0 flex items-center justify-center pointer-events-none leading-none max-w-full overflow-hidden"><span style="white-space: nowrap;">${formatBlockValue(val)}</span></div>`;
  }

  function getBlockFontSize(val) {
    const len = formatBlockValue(val).toString().length;
    if (len <= 2) return 'clamp(1.5rem, 8vw, 2.5rem)';
    if (len === 3) return 'clamp(1.2rem, 6vw, 2.0rem)';
    if (len === 4) return 'clamp(1rem, 5vw, 1.7rem)';
    return 'clamp(0.8rem, 4vw, 1.4rem)';
  }

  // ============ DOM POOLS ============
  const GHOST_POOL = [];

  function getGhostEl() {
    if (GHOST_POOL.length > 0) {
      const el = GHOST_POOL.pop();
      el.style.display = '';
      return el;
    }
    const el = document.createElement('div');
    el.className = 'absolute flex items-center justify-center font-black rounded-xl shadow-md z-[60]';
    return el;
  }

  function releaseGhostEl(el) {
    if (!el) return;
    el.style.display = 'none';
    el.style.transition = 'none';
    el.style.transform = '';
    el.innerHTML = '';
    GHOST_POOL.push(el);
  }

  // ============ RENDER ============
  function renderBoard(customGrid = null) {
    const gridToRender = customGrid || engine.grid;
    
    // Create cells if they don't exist
    if (boardEl.children.length === 0) {
      for (let r = 0; r < engine.rows; r++) {
        for (let c = 0; c < engine.cols; c++) {
          const cell = document.createElement('div');
          cell.className = 'rounded-xl flex items-center justify-center transition-opacity duration-150 relative overflow-hidden min-w-0 min-h-0';
          cell.dataset.row = r;
          cell.dataset.col = c;
          cell.addEventListener('click', () => handleCellClick(r, c));
          boardEl.appendChild(cell);
        }
      }
    }

    // Update cells
    let idx = 0;
    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        const cell = boardEl.children[idx++];
        const val = gridToRender[r][c];
        
        // Cache visual update to prevent DOM thrashing
        if (cell.dataset.cachedVal === String(val) && !customGrid) {
          continue;
        }
        cell.dataset.cachedVal = val;

        if (val !== 0) {
            cell.className = 'rounded-xl flex items-center justify-center transition-opacity duration-150 relative overflow-hidden min-w-0 min-h-0';
            const style = getBlockStyle(val);
            if (style.bg.includes('gradient')) {
              cell.style.background = style.bg;
            } else {
              cell.style.background = style.bg;
            }
            cell.style.color = style.text;
            cell.style.fontSize = getBlockFontSize(val);
            cell.style.fontWeight = '900';
            cell.style.fontFamily = 'Inter, sans-serif';
            // box-shadow is too expensive on low end, using simple border
            cell.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.1)';
            cell.style.border = '1px solid rgba(255,255,255,0.15)';
            applyBlockContent(cell, val, style);
            cell.style.opacity = '1';
            // Danger pulse for cells in row 6 or 7
            if (r >= engine.rows - 2 && val !== 0) {
              cell.style.animation = 'x2-danger-pulse 1s ease-in-out infinite';
            } else {
              cell.style.animation = 'none';
            }
          } else {
            cell.className = 'rounded-xl flex items-center justify-center transition-opacity duration-150 relative overflow-hidden min-w-0 min-h-0';
            cell.style.background = 'transparent';
            cell.style.border = '1px solid transparent';
            cell.style.boxShadow = '';
            cell.textContent = '';
            cell.style.animation = 'none';
            cell.style.opacity = '1';
          }
      }
    }
  }

  function renderNextBlocks() {
    const currentEl = container.querySelector('#x2-current-block');
    const nextEl = container.querySelector('#x2-next-block');
    if (!currentEl || !nextEl) return;

    if (currentEl.dataset.cachedVal !== String(engine.currentBlock)) {
      currentEl.dataset.cachedVal = engine.currentBlock;
      const cs = getBlockStyle(engine.currentBlock);
      if (cs.bg.includes('gradient')) {
        currentEl.style.background = cs.bg;
      } else {
        currentEl.style.backgroundColor = cs.bg;
      }
      currentEl.style.color = cs.text;
      applyBlockContent(currentEl, engine.currentBlock, cs);
      currentEl.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.3)';
    }

    if (nextEl.dataset.cachedVal !== String(engine.nextBlock)) {
      nextEl.dataset.cachedVal = engine.nextBlock;
      const ns = getBlockStyle(engine.nextBlock);
      if (ns.bg.includes('gradient')) {
        nextEl.style.background = ns.bg;
      } else {
        nextEl.style.backgroundColor = ns.bg;
      }
      nextEl.style.color = ns.text;
      applyBlockContent(nextEl, engine.nextBlock, ns);
    }
  }

  function updateScore() {
    const scoreEl = container.querySelector('#x2-score');
    if (scoreEl) scoreEl.textContent = formatBlockValue(engine.score);

    if (!PlayerState.state.bestScoreX2) PlayerState.state.bestScoreX2 = 0;
    if (engine.score > PlayerState.state.bestScoreX2) {
      PlayerState.state.bestScoreX2 = engine.score;
      PlayerState.save();
      const bestEl = container.querySelector('#x2-best');
      if (bestEl) bestEl.textContent = formatBlockValue(PlayerState.state.bestScoreX2);
    }
    
    // Update level and target badges
    const levelBadge = container.querySelector('#x2-level-badge');
    const targetBadge = container.querySelector('#x2-target-badge');
    if (mode === 'adventure') {
      const levelBadge = container.querySelector('#x2-level-badge');
      if (levelBadge) levelBadge.textContent = engine.level;

      const targetBadge = container.querySelector('#x2-target-badge');
      if (targetBadge) targetBadge.textContent = formatBlockValue(engine.getTargetScore());

      const progressEl = container.querySelector('#x2-level-progress');
      if (progressEl) {
        const target = engine.getTargetScore();
        const pct = Math.min(100, Math.max(0, (engine.levelScore / target) * 100));
        progressEl.style.width = pct + '%';
      }
      
      updateBoardBackground();
    }
  }

  function updateBoardBackground() {
    const l = engine.level;
    let bg = 'bg-black/5 dark:bg-slate-800/80';
    let border = 'border-black/5 dark:border-slate-700/50';
    
    if (l >= 10 && l < 20) {
      bg = 'bg-indigo-900/20 dark:bg-indigo-900/40';
      border = 'border-indigo-500/20 dark:border-indigo-500/30';
    } else if (l >= 20 && l < 30) {
      bg = 'bg-purple-900/20 dark:bg-purple-900/40';
      border = 'border-purple-500/20 dark:border-purple-500/30';
    } else if (l >= 30 && l < 40) {
      bg = 'bg-fuchsia-900/20 dark:bg-fuchsia-900/40';
      border = 'border-fuchsia-500/20 dark:border-fuchsia-500/30';
    } else if (l >= 40 && l < 50) {
      bg = 'bg-rose-900/20 dark:bg-rose-900/40';
      border = 'border-rose-500/20 dark:border-rose-500/30';
    } else if (l >= 50) {
      bg = 'bg-gradient-to-br from-amber-600/20 to-red-600/20 dark:from-amber-900/40 dark:to-red-900/40';
      border = 'border-amber-500/30 dark:border-amber-500/40';
    }
    
    boardWrapper.className = `w-full ${bg} p-2.5 rounded-[1.5rem] border ${border} shadow-inner relative mx-auto transition-colors duration-1000`;
  }

  // ============ GHOST PREVIEW ============
  let ghostCell = null;

  function showGhost(col) {
    hideGhost();
    if (engine.gameOver || powerUpMode) return;
    const landingRow = engine.getLandingRow(col);
    if (landingRow === -1) return;

    const cells = boardEl.children;
    const idx = landingRow * engine.cols + col;
    if (idx < cells.length) {
      ghostCell = cells[idx];
      const style = getBlockStyle(engine.currentBlock);
      ghostCell.classList.add('x2-ghost-block');
      if (style.bg.includes('gradient')) {
        ghostCell.style.background = style.bg;
      } else {
        ghostCell.style.backgroundColor = style.bg;
      }
      ghostCell.style.opacity = '0.3';
      applyBlockContent(ghostCell, engine.currentBlock, style);
      ghostCell.style.fontSize = getBlockFontSize(engine.currentBlock);
      ghostCell.style.fontWeight = '900';
      ghostCell.style.color = style.text;
      ghostCell.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.3)';
      ghostCell.style.border = '1px solid rgba(255,255,255,0.15)';
    }
  }

  function hideGhost() {
    if (ghostCell) {
      ghostCell.classList.remove('x2-ghost-block');
      const r = parseInt(ghostCell.dataset.row);
      const c = parseInt(ghostCell.dataset.col);
      if (engine.grid[r][c] === 0) {
        ghostCell.className = 'rounded-xl flex items-center justify-center transition-opacity duration-150 relative overflow-hidden min-w-0 min-h-0';
        ghostCell.style.background = 'transparent';
        ghostCell.style.opacity = '1';
        ghostCell.textContent = '';
        ghostCell.style.boxShadow = '';
        ghostCell.style.border = '1px solid transparent';
      }
      ghostCell = null;
    }
  }

  // ============ GAME LOGIC HANDLERS ============
  let isAnimating = false;
  const inputQueue = [];

  function handleColumnClick(col) {
    if (engine.gameOver) return;
    if (powerUpMode) return; // In power-up mode, clicking columns is disabled

    if (inputQueue.length >= 1) {
      inputQueue[0] = col; // Replace the queued move with the most recent click for responsiveness
      return;
    }

    inputQueue.push(col);
    processQueue();
  }

  async function processQueue() {
    if (isAnimating) return;
    if (inputQueue.length === 0) return;
    
    isAnimating = true;

    while (inputQueue.length > 0) {
      if (engine.gameOver) {
        inputQueue.length = 0;
        break;
      }

      const col = inputQueue.shift();
      const result = engine.dropBlock(col);
      
      if (!result) {
        Sounds.playSfx('invalid');
        Haptics.vibrate('button-tap');
        continue;
      }

      await processSteps(result.steps);
      
      const totalMerges = result.steps.reduce((sum, step) => sum + (step.merges ? step.merges.length : 0), 0);
      if (totalMerges > 0) {
        TaskState.updateProgress('x2_merge', totalMerges);
      }
      
      renderBoard();
      renderNextBlocks();
      updateScore();

      // Show combo text
      if (result.totalCombo >= 2) {
        showComboText(result.totalCombo);
      }

      // Game Over
      if (result.gameOver) {
        inputQueue.length = 0;
        if (!container.isGameOverModalOpen) {
          container.isGameOverModalOpen = true;
          const modal = createModal({
            title: t('second_chance') || 'İkinci Şans',
            content: `
              <div class="flex flex-col items-center p-4">
                <span class="text-5xl mb-3 drop-shadow-md">💖</span>
                <p class="text-sm font-bold text-gray-400 mb-6 text-center">${t('revive_desc_blocks') || 'Alanı biraz temizleyip oyuna devam etmek ister misin?'}</p>
                
                <div class="w-full flex flex-col gap-3">
                  <button id="modal-revive-diamonds" class="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(236,72,153,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined fill">diamond</span>
                    <span>${t('revive_diamonds_x2') || '300 Elmas Harca'}</span>
                  </button>
                  <button id="modal-revive-ad" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">play_circle</span>
                    <span>${t('revive_ad_x2') || 'Reklam İzle & Devam Et'}</span>
                  </button>
                  <button id="modal-revive-giveup" class="w-full py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary dark:text-white rounded-2xl font-bold active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">close</span>
                    <span>${t('give_up') || 'Pes Et'}</span>
                  </button>
                </div>
              </div>
            `,
            actions: []
          });

          const doRevive = () => {
            engine.revive();
            container.isGameOverModalOpen = false;
            modal.close();
            renderBoard();
            renderNextBlocks();
          };

          const showActualGameOver = () => {
            container.isGameOverModalOpen = false;
            modal.close();
            setTimeout(() => {
              Sounds.playSfx('game-over');
              Haptics.vibrate('game-over');
              showGameOverModal({
                score: engine.score,
                mode: mode === 'adventure' ? 'x2_adventure' : 'x2',
                onPlayAgain: () => {
                  Storage.remove('x2_save_state');
                  engine.restartCurrentLevel();
                  powerUpMode = null;
                  swapFirst = null;
                  inputQueue.length = 0;
                  renderBoard();
                  renderNextBlocks();
                  updateScore();
                  updatePowerUpUI();
                },
                onMainMenu: () => {
                  router.navigate(mode === 'adventure' ? '#/adventure-map?game=x2' : '#/menu');
                }
              });
            }, 300);
          };

          modal.querySelector('#modal-revive-diamonds').addEventListener('click', () => {
            Sounds.playSfx('button-tap');
            if (PlayerState.useDiamonds(300)) {
              doRevive();
            } else {
              Toast.show(t('not_enough_diamonds') || 'Yetersiz elmas!', 'error');
            }
          });

          modal.querySelector('#modal-revive-ad').addEventListener('click', async () => {
            Sounds.playSfx('button-tap');
            const success = await AdService.showRewardVideoAd();
            if (success) {
              doRevive();
            }
          });

          modal.querySelector('#modal-revive-giveup').addEventListener('click', () => {
            Sounds.playSfx('button-tap');
            showActualGameOver();
          });
        }
      } else if (result.levelUpReady) {
        inputQueue.length = 0;
        showLevelUpModal(engine.level, () => {
          engine.nextLevel();
          // Adventure'da PlayerState'e en yüksek erişilen seviyeyi yansıt
          if (mode === 'adventure' && engine.level > (PlayerState.state.x2AdventureLevel || 1)) {
            PlayerState.state.x2AdventureLevel = engine.level;
            PlayerState.save();
          }
          renderBoard();
          renderNextBlocks();
          updateScore();
          updatePowerUpUI();
        });
      } else if (mode !== 'adventure') {
        // Sonsuz modda periyodik reklam kontrolü
        AdService.showForcedInterstitial('periodic');
      }
    }
    
    isAnimating = false;
  }

  async function processSteps(steps) {
    const boardRect = boardEl.getBoundingClientRect();
    const cellWidth = (boardRect.width - (engine.cols - 1) * 4) / engine.cols;
    const cellHeight = (boardRect.height - (engine.rows - 1) * 4) / engine.rows;

    for (const step of steps) {
      if (step.type === 'drop') {
        Sounds.playSfx('x2-drop');
        Haptics.vibrate('button-tap');
        
        const ghost = document.createElement('div');
        ghost.className = 'absolute flex items-center justify-center font-black rounded-xl shadow-md z-50';
        const style = getBlockStyle(step.value);
        if (style.bg.includes('gradient')) ghost.style.background = style.bg;
        else ghost.style.backgroundColor = style.bg;
        ghost.style.color = style.text;
        ghost.style.fontSize = getBlockFontSize(step.value);
        applyBlockContent(ghost, step.value, style);
        
        ghost.style.width = `${cellWidth}px`;
        ghost.style.height = `${cellHeight}px`;
        ghost.style.left = `calc(10px + ${step.col} * (${cellWidth}px + 4px))`;
        ghost.style.top = `${boardRect.height + 20}px`;
        boardWrapper.appendChild(ghost);

        // Fix 4: setTimeout(20) yerine çift rAF — paint'in gerçekleştiğini garantiler,
        // alt segmentte transition'ın yanlış konumdan zıplamasını/atlanmasını önler.
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        ghost.style.transition = 'all 0.15s cubic-bezier(0.25, 1, 0.5, 1)';
        ghost.style.top = `calc(10px + ${step.row} * (${cellHeight}px + 4px))`;

        await new Promise(resolve => setTimeout(resolve, 150));
        ghost.remove();
        renderBoard(step.grid);

      } else if (step.type === 'merge') {
        if (step.merges.length === 0) continue;
        
        const ghosts = [];
        for (const m of step.merges) {
          const ghost = getGhostEl();
          const style = getBlockStyle(m.oldVal);
          ghost.style.background = style.bg;
          ghost.style.color = style.text;
          ghost.style.fontSize = getBlockFontSize(m.oldVal);
          applyBlockContent(ghost, m.oldVal, style);

          ghost.style.width = `${cellWidth}px`;
          ghost.style.height = `${cellHeight}px`;
          
          // GPU translation
          ghost.style.left = '0px';
          ghost.style.top = '0px';
          ghost.style.transform = `translate3d(calc(10px + ${m.fromCol} * (${cellWidth}px + 4px)), calc(10px + ${m.fromRow} * (${cellHeight}px + 4px)), 0)`;
          
          if (!ghost.parentElement) {
            boardWrapper.appendChild(ghost);
          }
          ghosts.push({ el: ghost, toRow: m.toRow, toCol: m.toCol });
          
          const fromIdx = m.fromRow * engine.cols + m.fromCol;
          if (boardEl.children[fromIdx]) boardEl.children[fromIdx].style.opacity = '0';
        }
        
        // Fix 4: çift rAF — birleşme ghost'larının başlangıç konumu boyandıktan
        // sonra transition başlasın (aksi halde transform'lar batch'lenip zıplıyordu).
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        for (const g of ghosts) {
          g.el.style.transition = 'transform 0.15s cubic-bezier(0.55, 0.05, 0.68, 0.19)';
          g.el.style.transform = `translate3d(calc(10px + ${g.toCol} * (${cellWidth}px + 4px)), calc(10px + ${g.toRow} * (${cellHeight}px + 4px)), 0)`;
        }
        
        await new Promise(resolve => setTimeout(resolve, 150));
        for (const g of ghosts) releaseGhostEl(g.el);
        
        renderBoard(step.grid);
        highlightMerges(step.merges);
        
        const totalScore = step.merges.reduce((sum, m) => sum + m.newVal, 0);
        Sounds.playSfx('x2-merge', { score: totalScore });
        Haptics.vibrate('combo');
        
        await new Promise(resolve => setTimeout(resolve, 120));

      } else if (step.type === 'gravity') {
        renderBoard(step.grid);
        await new Promise(resolve => setTimeout(resolve, 100));
      } else if (step.type === 'hammer' || step.type === 'swap') {
        renderBoard(step.grid);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  async function handleCellClick(row, col) {
    if (!powerUpMode) return;
    if (isAnimating || inputQueue.length > 0) return;

    if (powerUpMode === 'hammer') {
      const cost = engine.getPowerCost('hammer');
      if (cost !== -1 && PlayerState.state.diamonds < cost) {
        showPowerUpAdModal('hammer', cost, () => handleCellClick(row, col));
        return;
      }
      const result = engine.useHammer(row, col);
      if (result) {
        isAnimating = true;
        showHammerEffect(row, col);
        await processSteps(result.steps);
        Sounds.playSfx('x2-merge');
        Haptics.vibrate('combo');
        renderBoard();
        updateScore();
        updatePowerUpUI();
        isAnimating = false;
      }
      powerUpMode = null;
      clearPowerUpHighlights();
    } else if (powerUpMode === 'swap') {
      if (!swapFirst) {
        if (engine.grid[row][col] === 0) return;
        swapFirst = { row, col };
        const idx = row * engine.cols + col;
        if (boardEl.children[idx]) {
          boardEl.children[idx].style.outline = '3px solid #22d3ee';
          boardEl.children[idx].style.outlineOffset = '-2px';
        }
      } else {
        const cost = engine.getPowerCost('swap');
        if (cost !== -1 && PlayerState.state.diamonds < cost) {
          showPowerUpAdModal('swap', cost, () => handleCellClick(row, col));
          return;
        }
        const result = engine.useSwap(swapFirst.row, swapFirst.col, row, col);
        if (result) {
          isAnimating = true;
          showSwapEffect(swapFirst.row, swapFirst.col, row, col);
          await processSteps(result.steps);
          Sounds.playSfx('x2-merge');
          Haptics.vibrate('combo');
          renderBoard();
          updateScore();
          updatePowerUpUI();
          isAnimating = false;
        }
        swapFirst = null;
        powerUpMode = null;
        clearPowerUpHighlights();
      }
    }
  }

  function handlePowerUp(type) {
    if (isAnimating || inputQueue.length > 0) return;
    Sounds.playSfx('button-tap');
    
    // Check diamonds before enabling the power-up (if we are turning it on, or if it's an instant action like 'change')
    if (powerUpMode !== type) {
      const cost = engine.getPowerCost(type);
      if (cost !== -1 && PlayerState.state.diamonds < cost) {
        showPowerUpAdModal(type, cost, () => handlePowerUp(type));
        return;
      }
    }

    {
      // Toggle power-up mode
      if (powerUpMode === type) {
        powerUpMode = null;
        swapFirst = null;
        clearPowerUpHighlights();
      } else {
        powerUpMode = type;
        swapFirst = null;
        clearPowerUpHighlights();
        // Highlight power-up button
        const btn = container.querySelector(`#x2-power-${type}`);
        if (btn) {
          btn.classList.add('ring-2', 'ring-cyan-400', 'ring-offset-1');
        }
        // Add cursor hint to board
        boardWrapper.style.cursor = type === 'hammer' ? 'crosshair' : 'pointer';
        
        // Disable column touch area so clicks reach board cells
        const touchArea = container.querySelector('#x2-column-touch-area');
        if (touchArea) touchArea.classList.add('pointer-events-none');
      }
    }
  }

  function showPowerUpAdModal(type, cost, retryCallback) {
    const modal = createModal({
      title: t('not_enough_diamonds') || 'Yetersiz Elmas',
      content: `
        <div class="flex flex-col items-center p-4">
          <span class="text-5xl mb-3 drop-shadow-md">💎</span>
          <p class="text-sm font-bold text-gray-400 mb-6 text-center">${t('need_diamonds_' + type) ? t('need_diamonds_' + type).replace('{cost}', cost) : 'Bu işlem için ' + cost + ' elmasa ihtiyacınız var!'}</p>
          
          <div class="w-full flex flex-col gap-3">
            <button id="modal-watch-ad" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined">play_circle</span>
              <span>${t('watch_ad_use_' + type) || 'Reklam İzle'}</span>
            </button>
            <button id="modal-buy-diamonds" class="w-full py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary dark:text-white rounded-2xl font-bold active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center gap-2">
              <span class="material-symbols-outlined">shopping_cart</span>
              <span>${t('buy_diamonds_title') || 'Elmas Satın Al'}</span>
            </button>
          </div>
        </div>
      `,
      actions: []
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-full text-gray-500 hover:text-primary dark:hover:text-white transition-colors';
    closeBtn.innerHTML = '<span class="material-symbols-outlined text-lg">close</span>';
    closeBtn.onclick = () => modal.close();
    modal.querySelector('.glass-card').appendChild(closeBtn);

    document.body.appendChild(modal);

    modal.querySelector('#modal-watch-ad').addEventListener('click', async () => {
      Sounds.playSfx('button-tap');
      const success = await AdService.showRewardVideoAd();
      if (success) {
        modal.close();
        PlayerState.addDiamonds(cost);
        retryCallback();
      }
    });

    modal.querySelector('#modal-buy-diamonds').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modal.close();
      import('../components/shopModal.js').then(({ showShopModal }) => {
        showShopModal();
      });
    });
  }

  function clearPowerUpHighlights() {
    powers.forEach(p => {
      const btn = container.querySelector(`#x2-power-${p.id}`);
      if (btn) btn.classList.remove('ring-2', 'ring-cyan-400', 'ring-offset-1');
    });
    boardWrapper.style.cursor = '';
    const touchArea = container.querySelector('#x2-column-touch-area');
    if (touchArea) touchArea.classList.remove('pointer-events-none');
  }

  function updatePowerUpUI() {
    const powerList = ['hammer', 'swap'];
    powerList.forEach(id => {
      const btn = container.querySelector(`#x2-power-${id}`);
      if (!btn) return;
      const badgeEl = btn.querySelector('div.flex.items-center.gap-0\\.5');
      if (!badgeEl) return;
      
      const diamondIcon = badgeEl.querySelector('.material-symbols-outlined');
      const costEl = badgeEl.querySelector('span:last-child');
      
      const cost = engine.getPowerCost(id);
      if (cost === -1) {
        btn.classList.add('opacity-50', 'pointer-events-none');
        badgeEl.classList.remove('bg-cyan-500/10', 'dark:bg-cyan-500/20');
        badgeEl.classList.add('bg-gray-500/10', 'dark:bg-gray-500/20');
        if (costEl) costEl.textContent = 'MAX';
        if (costEl) costEl.className = 'text-[10px] md:text-[11px] font-black text-gray-600 dark:text-gray-300 leading-none';
        if (diamondIcon) diamondIcon.style.display = 'none';
      } else {
        btn.classList.remove('opacity-50', 'pointer-events-none');
        badgeEl.classList.add('bg-cyan-500/10', 'dark:bg-cyan-500/20');
        badgeEl.classList.remove('bg-gray-500/10', 'dark:bg-gray-500/20');
        if (costEl) costEl.textContent = cost;
        if (costEl) costEl.className = 'text-[10px] md:text-[11px] font-black text-cyan-600 dark:text-cyan-300 leading-none';
        if (diamondIcon) diamondIcon.style.display = 'inline';
      }
    });
  }

  // ============ EFFECTS ============
  function showHammerEffect(row, col) {
    const idx = row * engine.cols + col;
    const cellEl = boardEl.children[idx];
    if (!cellEl) return;
    
    // Add shake effect to the wrapper
    boardWrapper.classList.add('animate-shake');
    
    // Create a particle explosion effect
    const rect = cellEl.getBoundingClientRect();
    const boardRect = boardEl.getBoundingClientRect();
    const flash = document.createElement('div');
    flash.className = 'absolute bg-white rounded-xl z-50 animate-ping opacity-80 pointer-events-none';
    flash.style.width = cellEl.offsetWidth + 'px';
    flash.style.height = cellEl.offsetHeight + 'px';
    flash.style.left = (rect.left - boardRect.left) + 'px';
    flash.style.top = (rect.top - boardRect.top) + 'px';
    boardEl.appendChild(flash);
    
    setTimeout(() => {
      boardWrapper.classList.remove('animate-shake');
      if (flash.parentNode) flash.parentNode.removeChild(flash);
    }, 300);
  }

  function showSwapEffect(r1, c1, r2, c2) {
    const idx1 = r1 * engine.cols + c1;
    const idx2 = r2 * engine.cols + c2;
    const cell1 = boardEl.children[idx1];
    const cell2 = boardEl.children[idx2];
    if (!cell1 || !cell2) return;
    
    // Quick pulse on both
    cell1.classList.add('animate-pulse');
    cell2.classList.add('animate-pulse');
    setTimeout(() => {
      cell1.classList.remove('animate-pulse');
      cell2.classList.remove('animate-pulse');
    }, 400);
  }

  function showComboText(combo) {
    Sounds.playSfx('x2-combo', { combo: combo });
    const overlay = container.querySelector('#x2-combo-overlay');
    if (!overlay) return;
    
    const text = document.createElement('div');
    text.className = 'absolute z-50 flex flex-col items-center justify-center pointer-events-none';
    text.innerHTML = `
      <div class="relative flex flex-col items-center justify-center">
        <div class="absolute inset-0 bg-yellow-400 blur-2xl opacity-50 rounded-full scale-150 animate-pulse"></div>
        <div class="relative z-10 text-[2.5rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-100 via-yellow-400 to-orange-500 drop-shadow-[0_4px_10px_rgba(251,146,60,0.8)] leading-none italic uppercase tracking-tighter text-center" style="transform: rotate(-5deg);">
          ×${combo} ${t('x2_combo') || 'KOMBO!'}
        </div>
      </div>
    `;

    text.style.left = '50%';
    text.style.top = '40%';
    text.style.transform = 'translate(-50%, -50%) scale(0.1)';
    text.style.opacity = '0';
    text.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    overlay.appendChild(text);

    requestAnimationFrame(() => {
      text.style.transform = 'translate(-50%, -50%) scale(1.2)';
      text.style.opacity = '1';
      
      setTimeout(() => {
        text.style.transition = 'all 0.5s ease-in';
        text.style.transform = 'translate(-50%, -50%) scale(1.5)';
        text.style.opacity = '0';
        text.style.filter = 'blur(10px)';
        
        setTimeout(() => text.remove(), 500);
      }, 1000);
    });
  }

  function highlightMerges(merges) {
    const cells = boardEl.children;
    for (const m of merges) {
      const idx = m.toRow * engine.cols + m.toCol;
      if (idx < cells.length) {
        const cell = cells[idx];
        cell.classList.add('x2-merge-glow');
        setTimeout(() => cell.classList.remove('x2-merge-glow'), 350);
        
        // Ripple Effect
        const ripple = document.createElement('div');
        ripple.className = 'absolute top-1/2 left-1/2 rounded-full border-white x2-ripple-effect pointer-events-none z-20';
        ripple.style.width = '100%';
        ripple.style.height = '100%';
        cell.appendChild(ripple);
        setTimeout(() => ripple.remove(), 450);


      }
    }
  }

  // ============ INITIAL RENDER ============
  renderBoard();
  renderNextBlocks();
  updateScore();
  updatePowerUpUI();

  // Show tutorial on first play
  setTimeout(() => {
    if (container.isConnected) {
      checkAndShowTutorial('x2');
    }
  }, 300);

  // Start game music
  Sounds.startMusic('game');

  // ============ BUTTON LISTENERS ============
  // ============ DRAG AND DROP NEXT BLOCK ============
  let isDraggingBlock = false;
  let ghostDragEl = null;
  // Aktif "sonraki blok" sürüklemesinin document listener'larını söken fonksiyon.
  // (Aynı anda tek sürükleme olabildiğinden tek referans yeter.) Ekran sürükleme
  // ortasında kapanırsa scope cleanup bunu çağırır. NOT: bu listener'lar artık
  // scope.on ile DEĞİL doğrudan bağlanıyor — scope.on her bırakışta kalıcı diziye
  // kayıt ekleyip ghost/closure'ları tutarak GC'yi engelliyordu (seviye ilerledikçe
  // = daha çok bırakış = biriken bellek/kasma kaynağı buydu).
  let activeDragTeardown = null;

  const dragTarget = container.querySelector('#x2-next-container') || nextBoxContainer;
  dragTarget.addEventListener('pointerdown', (e) => {
    // Cancel Powerup if active
    if (powerUpMode) {
      powerUpMode = null;
      swapFirst = null;
      clearPowerUpHighlights();
    }
    
    if (engine.gameOver || isAnimating || inputQueue.length > 0) return;
    
    isDraggingBlock = true;
    
    const currentVal = engine.currentBlock;
    const style = getBlockStyle(currentVal);
    
    ghostDragEl = document.createElement('div');
    ghostDragEl.className = 'fixed z-[100] rounded-xl flex items-center justify-center font-black shadow-2xl pointer-events-none opacity-90 transition-none drag-ghost-element';
    if (style.bg.includes('gradient')) ghostDragEl.style.background = style.bg;
    else ghostDragEl.style.backgroundColor = style.bg;
    ghostDragEl.style.color = style.text;
    applyBlockContent(ghostDragEl, currentVal, style);
    
    const boardRect = boardEl.getBoundingClientRect();
    const cellWidth = (boardRect.width - (engine.cols - 1) * 4) / engine.cols;
    const cellHeight = (boardRect.height - (engine.rows - 1) * 4) / engine.rows;
    
    ghostDragEl.style.width = `${cellWidth}px`;
    ghostDragEl.style.height = `${cellHeight}px`;
    ghostDragEl.style.fontSize = getBlockFontSize(currentVal);
    
    document.body.appendChild(ghostDragEl);
    // Sürükleme boyunca kolon alanı sabit kalır — rect'i bir kez oku; her karede
    // getBoundingClientRect çağırmak forced reflow (layout thrashing) yaratıyordu.
    const colTouchRect = columnTouchArea.getBoundingClientRect();

    const moveGhost = (pageX, pageY) => {
      ghostDragEl.style.left = `${pageX - cellWidth / 2}px`;
      ghostDragEl.style.top = `${pageY - cellHeight - 20}px`;

      if (pageX >= colTouchRect.left && pageX <= colTouchRect.right &&
          pageY >= colTouchRect.top - 50 && pageY <= colTouchRect.bottom + 50) {
        const relX = pageX - colTouchRect.left;
        const colW = colTouchRect.width / engine.cols;
        const hoverCol = Math.floor(relX / colW);
        if (hoverCol >= 0 && hoverCol < engine.cols) {
          showGhost(hoverCol);
        } else {
          hideGhost();
        }
      } else {
        hideGhost();
      }
    };
    
    const pageX = e.pageX || (e.touches && e.touches[0].pageX) || e.clientX;
    const pageY = e.pageY || (e.touches && e.touches[0].pageY) || e.clientY;
    moveGhost(pageX, pageY);
    
    let rafX2MoveId = null;
    const onPointerMove = (ev) => {
      if (!isDraggingBlock) return;
      ev.preventDefault();
      const px = ev.pageX || (ev.touches && ev.touches[0].pageX) || ev.clientX;
      const py = ev.pageY || (ev.touches && ev.touches[0].pageY) || ev.clientY;
      rafX2MoveId = requestAnimationFrame(() => {
        if (!isDraggingBlock || !ghostDragEl) return;
        moveGhost(px, py);
      });
    };
    
    const removeDragDocListeners = () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onPointerUp);
      if (activeDragTeardown === removeDragDocListeners) activeDragTeardown = null;
    };

    const onPointerUp = (ev) => {
      if (!isDraggingBlock) return;
      isDraggingBlock = false;
      
      removeDragDocListeners();
      
      if (ghostDragEl) {
        ghostDragEl.remove();
        ghostDragEl = null;
      }
      
      const px = ev.pageX || (ev.changedTouches && ev.changedTouches[0].pageX) || ev.clientX;
      const py = ev.pageY || (ev.changedTouches && ev.changedTouches[0].pageY) || ev.clientY;
      
      const colTouchRect = columnTouchArea.getBoundingClientRect();
      if (px >= colTouchRect.left && px <= colTouchRect.right &&
          py >= colTouchRect.top - 50 && py <= colTouchRect.bottom + 50) {
        const relX = px - colTouchRect.left;
        const colW = colTouchRect.width / engine.cols;
        const dropCol = Math.floor(relX / colW);
        if (dropCol >= 0 && dropCol < engine.cols) {
          hideGhost();
          handleColumnClick(dropCol);
        }
      } else {
        hideGhost();
      }
    };
    
    // Per-drag document listener'ları DOĞRUDAN bağlanır (scope.on DEĞİL): scope.on
    // her bırakışta kalıcı listeners dizisine kayıt ekliyor ve onPointerUp yalnızca
    // document'ten söküyordu, diziden değil → seviye ilerledikçe biriken kasma. Sökme
    // onPointerUp'taki removeDragDocListeners ile; ekran sürükleme ortasında kapanırsa
    // aşağıdaki scope cleanup activeDragTeardown'ı çağırır.
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
    activeDragTeardown = removeDragDocListeners;
  });

  const hammerBtn = container.querySelector('#x2-power-hammer');
  if (hammerBtn) {
    hammerBtn.addEventListener('click', () => handlePowerUp('hammer'));
  }

  const helpBtn = container.querySelector('#btn-help-x2');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      checkAndShowTutorial('x2', true);
    });
  }

  // ============ LEVEL UP MODAL ============
  function showLevelUpModal(currentLevel, callback) {
    Sounds.playSfx('game-win');
    Haptics.vibrate('success');

    // Ekonomi faucet'i: SADECE yeni en yüksek seviyede ödül (replay/restart farm engeli).
    const isNewFrontier = currentLevel >= (PlayerState.state.x2AdventureLevel || 1);
    const levelReward = isNewFrontier ? engine.getLevelReward(currentLevel) : 0;
    if (levelReward > 0) {
      PlayerState.addDiamonds(levelReward);
      PlayerState.notify(); // üst bardaki elmas sayacını tazele
    }

    AdService.showForcedInterstitial('levelup');

    const overlay = document.createElement('div');
    overlay.className = 'absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in';
    
    const content = document.createElement('div');
    content.className = 'flex flex-col items-center text-center animate-pop-up';
    content.innerHTML = `
      <div class="w-24 h-24 rounded-full bg-yellow-400/20 flex items-center justify-center mb-4 border-4 border-yellow-400 animate-pulse">
        <span class="text-5xl">⭐</span>
      </div>
      <h2 class="text-3xl font-black text-white drop-shadow-lg mb-2 uppercase tracking-tight">${t('level_up') || 'SEVİYE ATLADIN!'}</h2>
      <p class="text-yellow-400 font-bold text-lg mb-3 drop-shadow-md">${currentLevel} ➔ ${currentLevel + 1}</p>
      ${levelReward > 0 ? `<div class="flex items-center gap-1.5 mb-6 px-4 py-2 rounded-full bg-white/10 border border-white/15">
        <span class="material-symbols-outlined fill text-cyan-300 text-xl">diamond</span>
        <span class="text-white font-black text-lg">+${levelReward}</span>
      </div>` : '<div class="mb-3"></div>'}
      <button class="px-8 py-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform" id="x2-btn-next-level">
        ${t('continue') || 'DEVAM ET'}
      </button>
    `;
    
    overlay.appendChild(content);
    container.appendChild(overlay);

    overlay.querySelector('#x2-btn-next-level').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      overlay.classList.remove('animate-fade-in');
      overlay.classList.add('animate-fade-out');
      setTimeout(() => {
        overlay.remove();
        callback();
      }, 300);
    });
  }

  // ============ CLEANUP ============
  // Ekrana özgü teardown'lar scope'a kaydedilir; scope.destroy() önce tüm
  // listener/timer/RAF'ları iptal eder, SONRA bunları ters sırada çalıştırır.
  // Paylaşılan kaynaklar korunur: Sounds singleton'ı yok edilmez, yalnızca
  // bu ekranın başlattığı müzik durdurulur (mevcut davranış birebir aynı).
  scope.onCleanup(() => {
    if (activeDragTeardown) activeDragTeardown(); // sürükleme ortasında kapanışta document listener'larını sök
    if (topBar.cleanup) topBar.cleanup();
    Sounds.stopMusic();
    AdService.hideBanner();
    engine = null; // büyük board matrisini GC'ye bırak
  });
  container.cleanup = () => scope.destroy();

  // Show banner when screen opens
  AdService.showBanner();

  // Banner spacer to prevent overlapping
  const bannerSpacer = document.createElement('div');
  bannerSpacer.className = 'w-full h-[65px] pointer-events-none shrink-0';
  container.appendChild(bannerSpacer);



  return container;
}
