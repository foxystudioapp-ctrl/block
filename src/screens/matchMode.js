import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { AdService } from '../services/adService.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { MatchEngine } from '../game/matchEngine.js';
import { getLevelData, MATCH_LEVELS } from '../game/matchLevels.js';
import { t } from '../utils/i18n.js';
import { showQuitConfirmation } from '../utils/quitConfirm.js';
import { createModal } from '../components/modal.js';
import { checkAndShowTutorial } from '../components/tutorial.js';
import { Storage } from '../utils/storage.js';
import { Toast } from '../components/toast.js';


const COLORS = {
  1: { bg: '#f43f5e', name: 'Kırmızı', class: 'red' },
  2: { bg: '#3b82f6', name: 'Mavi', class: 'blue' },
  3: { bg: '#10b981', name: 'Yeşil', class: 'green' },
  4: { bg: '#f59e0b', name: 'Sarı', class: 'yellow' },
  5: { bg: '#8b5cf6', name: 'Mor', class: 'purple' },
  6: { bg: '#f97316', name: 'Turuncu', class: 'orange' },
};

const GEM_ICONS = {
  ruby: `<svg viewBox="0 0 24 24" width="80%" height="80%" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"><polygon points="12,2 22,8 12,22 2,8" fill="url(#ruby-grad)" stroke="#fecdd3" stroke-width="0.5"/><polygon points="12,2 17,8 12,22 7,8" fill="url(#ruby-inner)" opacity="0.6"/><defs><linearGradient id="ruby-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f43f5e" /><stop offset="100%" stop-color="#9f1239" /></linearGradient><linearGradient id="ruby-inner" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#fda4af" /><stop offset="100%" stop-color="#be123c" /></linearGradient></defs></svg>`,
  sapphire: `<svg viewBox="0 0 24 24" width="80%" height="80%" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"><polygon points="4,6 20,6 16,20 8,20" fill="url(#sapphire-grad)" stroke="#bfdbfe" stroke-width="0.5"/><polygon points="8,6 16,6 14,20 10,20" fill="url(#sapphire-inner)" opacity="0.7"/><defs><linearGradient id="sapphire-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#3b82f6" /><stop offset="100%" stop-color="#1e3a8a" /></linearGradient><linearGradient id="sapphire-inner" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#93c5fd" /><stop offset="100%" stop-color="#1d4ed8" /></linearGradient></defs></svg>`,
  emerald: `<svg viewBox="0 0 24 24" width="80%" height="80%" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"><polygon points="12,2 20,12 12,22 4,12" fill="url(#emerald-grad)" stroke="#a7f3d0" stroke-width="0.5"/><polygon points="12,5 17,12 12,19 7,12" fill="url(#emerald-inner)" opacity="0.8"/><defs><linearGradient id="emerald-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#10b981" /><stop offset="100%" stop-color="#064e3b" /></linearGradient><linearGradient id="emerald-inner" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#6ee7b7" /><stop offset="100%" stop-color="#047857" /></linearGradient></defs></svg>`,
  gold: `<svg viewBox="0 0 24 24" width="80%" height="80%" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"><circle cx="12" cy="12" r="10" fill="url(#gold-grad)" stroke="#fde68a" stroke-width="0.5"/><circle cx="12" cy="12" r="7" fill="url(#gold-inner)" opacity="0.8"/><defs><linearGradient id="gold-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f59e0b" /><stop offset="100%" stop-color="#78350f" /></linearGradient><linearGradient id="gold-inner" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#fcd34d" /><stop offset="100%" stop-color="#b45309" /></linearGradient></defs></svg>`,
  diamond: `<svg viewBox="0 0 24 24" width="80%" height="80%" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.5));"><polygon points="6,6 18,6 12,20" fill="url(#diamond-grad)" stroke="#ffffff" stroke-width="0.5"/><polygon points="6,6 12,2 18,6" fill="url(#diamond-top)" opacity="0.9"/><defs><linearGradient id="diamond-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#bae6fd" /><stop offset="100%" stop-color="#0284c7" /></linearGradient><linearGradient id="diamond-top" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffffff" /><stop offset="100%" stop-color="#7dd3fc" /></linearGradient></defs></svg>`,
  topaz: `<svg viewBox="0 0 24 24" width="80%" height="80%" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));"><polygon points="12,2 22,12 12,22 2,12" fill="url(#topaz-grad)" stroke="#fed7aa" stroke-width="0.5"/><polygon points="12,4 18,12 12,20 6,12" fill="url(#topaz-inner)" opacity="0.8"/><defs><linearGradient id="topaz-grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#f97316" /><stop offset="100%" stop-color="#7c2d12" /></linearGradient><linearGradient id="topaz-inner" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#fdba74" /><stop offset="100%" stop-color="#c2410c" /></linearGradient></defs></svg>`,
};

const COLOR_TO_GEM = { 1: 'ruby', 2: 'sapphire', 3: 'emerald', 4: 'gold', 5: 'diamond', 6: 'topaz' };

// ========== ANIMATION TIMING ==========
const TIMING = {
  swap: 250,
  swapBack: 200,
  blastGrow: 150,
  blastShrink: 200,
  fall: 350,
  fallStagger: 30,
  cascade: 100,
};

const BOUNCE = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const EASE_OUT = 'cubic-bezier(0.25, 1, 0.5, 1)';

// ========== MAIN EXPORT ==========
export function MatchMode(router) {
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] flex flex-col bg-bg-light dark:bg-primary text-primary dark:text-white select-none relative overflow-hidden pb-2 sm:pb-3 md:pb-6 lg:pb-10';
  
  // Extract level from URL hash (e.g. #/match?level=5)
  const hashParts = window.location.hash.split('?');
  let mode = 'endless';
  let levelNum = 1;
  
  if (hashParts.length > 1) {
    const params = new URLSearchParams(hashParts[1]);
    if (params.has('mode')) mode = params.get('mode');
    if (params.has('level')) levelNum = parseInt(params.get('level'), 10);
  }

  if (mode === 'adventure') {
    // Adventure'da varsayılan: PlayerState'teki kaldığı seviye
    // Eğer URL'de ?level=N varsa o öncelikli (haritadan seçilen seviyeyi oyna)
    if (!(hashParts.length > 1 && new URLSearchParams(hashParts[1]).has('level'))) {
      levelNum = PlayerState.state.jewelCrushLevel || 1;
    }
  }

  const gameCleanup = startGame(container, router, mode, levelNum);
  // Cleanup listeners
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
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes particleFly { 0%{transform:translate(0,0) scale(1);opacity:1} 100%{transform:translate(var(--px),var(--py)) scale(0);opacity:0} }
    @keyframes comboFloat { 0%{transform:translate(-50%,-50%) scale(0.5);opacity:0} 30%{transform:translate(-50%,-50%) scale(1.3);opacity:1} 70%{transform:translate(-50%,-80%) scale(1);opacity:1} 100%{transform:translate(-50%,-120%) scale(0.8);opacity:0} }
    @keyframes scoreFloat { 0%{transform:translateY(0) scale(1);opacity:1} 100%{transform:translateY(-30px) scale(0.8);opacity:0} }
    @keyframes hintBreathe { 0% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); } 50% { transform: scale(1.1); filter: drop-shadow(0 0 12px rgba(255,255,255,0.8)) brightness(1.2); } 100% { transform: scale(1); filter: drop-shadow(0 0 0 rgba(255,255,255,0)); } }
    @keyframes boardShake { 0%{transform:translate(0,0)} 20%{transform:translate(-4px,3px) rotate(-1deg)} 40%{transform:translate(4px,-2px) rotate(1deg)} 60%{transform:translate(-3px,-3px) rotate(0deg)} 80%{transform:translate(3px,2px) rotate(1deg)} 100%{transform:translate(0,0)} }
    .match-block { position:absolute; border-radius:1rem; display:flex; align-items:center; justify-content:center; cursor:pointer; overflow:hidden; border: 1px solid rgba(0,0,0,0.05); transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.2s; }
    .match-block > span { z-index: 2; position: relative; }
    .match-block:active { transform: translateY(3px) scale(0.95); filter: brightness(0.9); }
    .match-block.hint-active { animation:hintBreathe 1.5s ease-in-out infinite; z-index: 15; }
    .match-block.glow-active { z-index: 25; filter: brightness(1.3); transform: scale(1.05); }
    .match-particle { position:absolute; border-radius:50%; pointer-events:none; animation:particleFly 0.5s ease-out forwards; }
    .combo-text { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:1.5rem; font-weight:900; color:#facc15; pointer-events:none; animation:comboFloat 1.2s ease-out forwards; z-index:50; text-shadow:0 2px 8px rgba(0,0,0,0.5); }
    .score-popup { position:absolute; font-size:0.75rem; font-weight:900; color:#fff; pointer-events:none; animation:scoreFloat 0.8s ease-out forwards; z-index:40; text-shadow:0 1px 4px rgba(0,0,0,0.5); }
    .gem-fly { position:absolute; font-size:1.5rem; z-index:60; pointer-events:none; filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5)); transition:all 0.6s cubic-bezier(0.25, 1, 0.5, 1); }
    .board-shake { animation:boardShake 0.4s ease-out; }
  `;
  document.head.appendChild(styleEl);

  // === TOP BAR ===
  const matchBackTarget = mode === 'adventure' ? '#/adventure-map?game=match' : '#/menu';
  const topBar = createTopBar(t('menu_jewel') || 'BLOK PATLATMA', true, () => {
    showQuitConfirmation(router, matchBackTarget);
  });
  container.appendChild(topBar);

  // === CONTROLS TRAY ===
  const controlsTray = document.createElement('div');
  controlsTray.className = 'px-4 md:px-6 lg:px-8 pt-1.5 md:pt-3 lg:pt-4 pb-0 w-full flex items-center justify-between gap-4 z-10 shrink-0';
  controlsTray.innerHTML = `
    <button id="btn-help" class="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 border border-black/10 dark:border-white/10 shadow-sm flex items-center justify-center active:scale-95 transition-all text-red-500 dark:text-red-400">
      <span class="material-symbols-outlined text-[18px] md:text-[20px] lg:text-[22px]">help</span>
    </button>
    <button id="btn-extra-moves" class="flex items-center gap-1.5 px-2.5 md:px-3 lg:px-4 py-1 md:py-1.5 rounded-full bg-white dark:bg-primary-container border border-black/5 dark:border-white/5 shadow-sm active:scale-95 transition-all shrink-0">
      <span class="material-symbols-outlined text-[14px] md:text-[16px] lg:text-[18px]">add_circle</span>
      <span class="text-[9px] md:text-[11px] lg:text-[13px] font-black tracking-tight leading-none uppercase text-gray-700 dark:text-gray-200">+2 ${t('moves') || 'HAMLE'}</span>
      <div id="extra-moves-badge" class="flex items-center gap-0.5 bg-cyan-500/10 dark:bg-cyan-500/20 px-1.5 py-0.5 rounded-full ml-0.5 transition-all">
        <span class="material-symbols-outlined text-[10px] md:text-[12px] lg:text-[14px] fill text-cyan-500 dark:text-cyan-400">diamond</span>
        <span id="extra-moves-cost" class="text-[10px] md:text-[11px] lg:text-[13px] font-black text-cyan-600 dark:text-cyan-300 leading-none">50</span>
      </div>
    </button>
  `;
  container.appendChild(controlsTray);

  // === SCORE SECTION ===
  const scoreSection = document.createElement('div');
  scoreSection.className = 'px-4 md:px-6 lg:px-8 py-1 mt-2 sm:mt-3 md:mt-4 lg:mt-6 flex justify-between items-center w-full';
  scoreSection.innerHTML = `
    <div class="flex flex-col items-center justify-center flex-1">
      ${mode === 'adventure' ? `
        <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1 drop-shadow-md">
          <div class="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
          <div class="absolute inset-0 rounded-full border-4 border-t-indigo-400 rotate-45"></div>
          <div class="bg-gradient-to-br from-indigo-500 to-purple-600 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
            <span id="match-lvl" class="text-xl md:text-2xl lg:text-3xl font-black text-white drop-shadow-sm leading-none">${engine.level}</span>
          </div>
          <div class="absolute -top-1.5 -right-1.5 text-sm md:text-base lg:text-xl drop-shadow-md">👑</div>
        </div>
        <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider">${t('level').toUpperCase()}</span>
        <div class="w-full mt-1.5 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden flex items-center justify-center relative">
          <div id="match-level-progress" class="h-full bg-gradient-to-r from-indigo-400 to-purple-500 absolute left-0 top-0 transition-all duration-300" style="width: ${Math.min(100, (engine.levelScore / engine.targetScore) * 100)}%"></div>
        </div>
      ` : `
        <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1 drop-shadow-md opacity-60">
          <div class="text-3xl lg:text-4xl">♾️</div>
        </div>
        <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider">KLASİK</span>
      `}
    </div>

    <div class="flex flex-col items-center justify-center flex-1.5 px-2">
      <span class="text-[10px] md:text-xs lg:text-sm font-black text-gray-400 tracking-wider mb-0.5">${t('score').toUpperCase()}</span>
      <span id="match-score" class="text-[32px] md:text-[40px] lg:text-[52px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-sm tracking-tight leading-none">${engine.score}</span>
    </div>

    <div class="flex flex-col items-center justify-center flex-1">
      <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1">
        <div class="absolute inset-0 rounded-full border-2 border-rose-500/30"></div>
        <div class="bg-gradient-to-br from-rose-400 to-red-500 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
          <span id="match-moves" class="text-xl md:text-2xl lg:text-3xl font-black text-white drop-shadow-sm leading-none">${engine.movesLeft}</span>
        </div>
      </div>
      <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider mb-0.5">${t('moves') || 'HAMLE'}</span>
    </div>
  `;
  container.appendChild(scoreSection);

  const helpBtn = container.querySelector('#btn-help');
  if (helpBtn) {
    helpBtn.onclick = () => {
      Sounds.playSfx('button-tap');
      checkAndShowTutorial('match', true);
    };
  }

  // === GEM TARGET BAR ===
  let targetBar = null;
  const targetIcons = {}; // gemType -> DOM element for flight target

  function buildTargetBar() {
    if (mode !== 'adventure' || !engine.gemTargets || engine.gemTargets.length === 0) return;

    targetBar = document.createElement('div');
    targetBar.className = 'px-4 md:px-6 lg:px-8 pt-1 pb-1 w-full flex items-center justify-center gap-3 md:gap-4 z-10 shrink-0 flex-wrap';

    engine.gemTargets.forEach(target => {
      const item = document.createElement('div');
      item.className = 'flex items-center gap-1.5 bg-white/70 dark:bg-primary-container/70 border border-black/5 dark:border-white/5 rounded-2xl px-2.5 py-1 shadow-sm';

      const iconWrap = document.createElement('div');
      iconWrap.id = `target-${target.type}`;
      iconWrap.className = 'w-6 h-6 md:w-7 md:h-7 flex items-center justify-center transition-transform';
      iconWrap.innerHTML = GEM_ICONS[target.type] || '';

      const countEl = document.createElement('span');
      countEl.id = `target-count-${target.type}`;
      countEl.className = 'text-[12px] md:text-sm font-black text-gray-700 dark:text-gray-200 leading-none min-w-[28px] text-left';

      item.appendChild(iconWrap);
      item.appendChild(countEl);
      targetBar.appendChild(item);
      targetIcons[target.type] = iconWrap;
    });

    // Insert the target bar right after the score section.
    scoreSection.insertAdjacentElement('afterend', targetBar);
    updateTargetBar();
  }

  function updateTargetBar() {
    if (!targetBar) return;
    engine.gemTargets.forEach(target => {
      const countEl = container.querySelector(`#target-count-${target.type}`);
      if (!countEl) return;
      const remaining = Math.max(0, target.required - target.collected);
      if (remaining === 0) {
        countEl.innerHTML = '<span class="material-symbols-outlined fill text-green-500 text-[18px] md:text-[20px] align-middle">check_circle</span>';
        const icon = container.querySelector(`#target-${target.type}`);
        if (icon) icon.style.opacity = '0.45';
      } else {
        countEl.textContent = remaining;
      }
    });
  }

  const costs = [50, 150, 300];
  const maxExtraMoves = 3;

  function updateExtraMovesUI() {
    const btn = container.querySelector('#btn-extra-moves');
    const badge = container.querySelector('#extra-moves-badge');
    const costEl = container.querySelector('#extra-moves-cost');
    if (!btn || !badge || !costEl) return;
    
    if (extraMovesCount >= maxExtraMoves) {
      btn.classList.add('opacity-50', 'pointer-events-none', 'grayscale');
      costEl.textContent = 'MAX';
      const icon = badge.querySelector('.material-symbols-outlined');
      if (icon) icon.style.display = 'none';
      costEl.classList.remove('text-cyan-600', 'dark:text-cyan-300');
      costEl.classList.add('text-gray-500', 'dark:text-gray-400');
    } else {
      btn.classList.remove('opacity-50', 'pointer-events-none', 'grayscale');
      costEl.textContent = costs[extraMovesCount];
      const icon = badge.querySelector('.material-symbols-outlined');
      if (icon) icon.style.display = '';
      costEl.classList.remove('text-gray-500', 'dark:text-gray-400');
      costEl.classList.add('text-cyan-600', 'dark:text-cyan-300');
    }
  }

  // === BOARD ===
  const boardWrap = document.createElement('div');
  boardWrap.className = 'flex-1 flex flex-col items-center justify-center px-2 pb-2 w-full min-h-0 gap-4';

  const boardOuter = document.createElement('div');
  // Removed w-full h-full so it can shrink to fit
  boardOuter.className = 'bg-black/5 dark:bg-slate-800/80 p-2 rounded-[1rem] border-2 border-black/10 dark:border-slate-700/80 shadow-inner relative overflow-hidden flex justify-center items-center';

  const boardEl = document.createElement('div');
  boardEl.id = 'game-board';
  boardEl.className = 'w-full h-full relative overflow-visible';
  boardEl.style.touchAction = 'none';

  boardOuter.appendChild(boardEl);
  boardWrap.appendChild(boardOuter);
  container.appendChild(boardWrap);

  function updateUI() {
    const scoreEl = container.querySelector('#match-score');
    const movesEl = container.querySelector('#match-moves');
    if (scoreEl) scoreEl.textContent = engine.score.toLocaleString('tr-TR');
    if (movesEl) {
      movesEl.textContent = engine.movesLeft;
      if (engine.movesLeft <= 3 && mode === 'adventure') {
        movesEl.parentElement.classList.add('animate-pulse');
        movesEl.parentElement.classList.replace('from-rose-400', 'from-red-600');
        movesEl.parentElement.classList.replace('to-red-500', 'to-red-700');
      } else {
        movesEl.parentElement.classList.remove('animate-pulse');
        movesEl.parentElement.classList.replace('from-red-600', 'from-rose-400');
        movesEl.parentElement.classList.replace('to-red-700', 'to-red-500');
      }
    }
    
    if (mode === 'adventure') {
      const progressEl = container.querySelector('#match-level-progress');
      if (progressEl) {
        progressEl.style.width = `${Math.min(100, (engine.levelScore / engine.targetScore) * 100)}%`;
      }
      updateTargetBar();
    }
  }

  // === BLOCK ELEMENTS (Persistent) ===
  const blockEls = {}; // key "r,c" -> DOM element (tracks which element is at which position)
  const GAP = 2;

  let boardOffsetX = 0, boardOffsetY = 0;

  function calcCellSize() {
    const wrapRect = boardWrap.getBoundingClientRect();
    // Allow padding for the outer board and the bottomBar (approx 80px)
    const availableW = wrapRect.width - 24; 
    const availableH = wrapRect.height - 24;
    
    const cellW = (availableW - GAP * (engine.cols - 1)) / engine.cols;
    const cellH = (availableH - GAP * (engine.rows - 1)) / engine.rows;
    cellSize = Math.min(cellW, cellH);
    const maxCell = window.innerWidth >= 1024 ? 80 : window.innerWidth >= 768 ? 64 : 48;
    cellSize = Math.min(cellSize, maxCell);
    
    const totalW = engine.cols * cellSize + (engine.cols - 1) * GAP;
    const totalH = engine.rows * cellSize + (engine.rows - 1) * GAP;
    
    boardOuter.style.width = (totalW + 16) + 'px'; // +16 for p-2 (2*8px)
    boardOuter.style.height = (totalH + 16) + 'px';
    
    boardEl.style.width = totalW + 'px';
    boardEl.style.height = totalH + 'px';
    
    boardOffsetX = 0;
    boardOffsetY = 0;
  }

  function posForCell(r, c) {
    return { x: boardOffsetX + c * (cellSize + GAP), y: boardOffsetY + r * (cellSize + GAP) };
  }

  function createBlockEl(cell, r, c) {
    const el = document.createElement('div');
    el.className = 'match-block flex items-center justify-center';
    el.style.width = cellSize + 'px';
    el.style.height = cellSize + 'px';
    const pos = posForCell(r, c);
    el.style.left = pos.x + 'px';
    el.style.top = pos.y + 'px';
    el.dataset.row = r;
    el.dataset.col = c;
    if (cell) el.dataset.color = cell.color;
    applyBlockVisuals(el, cell);
    attachTouchEvents(el, r, c);
    boardEl.appendChild(el);
    blockEls[`${r},${c}`] = el;
    return el;
  }

  function applyBlockVisuals(el, cell) {
    if (!cell) { 
      el.style.opacity = '0'; 
      delete el.dataset.color;
      return; 
    }
    
    el.dataset.color = cell.color;
    el.dataset.type = cell.type;

    const colorData = COLORS[cell.color] || COLORS[1];

    el.className = 'match-block flex items-center justify-center'; // reset classes
    
    // Orijinal renk sınıflarını temizle
    const colorNames = ['red', 'yellow', 'green', 'blue', 'purple', 'orange'];
    colorNames.forEach(c => el.classList.remove('block-3d-' + c));

    if (cell.type === 'rainbow') {
      el.style.background = 'linear-gradient(135deg, #f43f5e, #f59e0b, #10b981, #3b82f6, #8b5cf6)';
      el.style.backgroundColor = '';
    } else if (cell.type === 'brick') {
      el.style.background = '';
      el.style.backgroundColor = 'transparent';
    } else {
      el.style.background = '';
      el.style.backgroundColor = '';
      el.classList.add('block-3d-' + colorData.class);
    }

    el.style.opacity = '1';
    el.style.transform = '';


    let inner = '';

    if (cell.type === 'striped_h') {
      inner += '<div style="position:absolute;inset:4px;display:flex;flex-direction:column;justify-content:space-evenly;pointer-events:none;z-index:3">';
      for (let i = 0; i < 3; i++) inner += '<div style="height:2px;background:rgba(255,255,255,0.8);border-radius:2px"></div>';
      inner += '</div>';
    } else if (cell.type === 'striped_v') {
      inner += '<div style="position:absolute;inset:4px;display:flex;justify-content:space-evenly;pointer-events:none;z-index:3">';
      for (let i = 0; i < 3; i++) inner += '<div style="width:2px;background:rgba(255,255,255,0.8);border-radius:2px"></div>';
      inner += '</div>';
    }

    if (cell.type === 'diamond_1' || cell.type === 'diamond_2') {
      const glow = cell.type === 'diamond_2' ? 'drop-shadow(0 0 8px rgba(255,255,255,0.8))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))';
      inner += `<span style="font-size:1.8rem;position:relative;z-index:2;filter:${glow}">💎</span>`;
    } else if (cell.gem) {
      inner += `<span style="font-size:1rem;position:relative;z-index:2;display:flex;align-items:center;justify-content:center;">${GEM_ICONS[cell.gem] || ''}</span>`;
    }

    if (cell.type === 'brick') {
      inner += `
        <svg viewBox="0 0 100 100" width="100%" height="100%" style="position:absolute;inset:0;border-radius:0.75rem;overflow:hidden;box-shadow:inset 0 -6px 0 rgba(0,0,0,0.5), inset 0 4px 0 rgba(255,255,255,0.3), 0 4px 6px rgba(0,0,0,0.4)">
          <defs>
            <pattern id="brown-bricks" patternUnits="userSpaceOnUse" width="40" height="20">
              <rect width="40" height="20" fill="#451a03" />
              <rect x="1" y="1" width="38" height="8" rx="2" fill="#92400e" />
              <rect x="-19" y="11" width="38" height="8" rx="2" fill="#92400e" />
              <rect x="21" y="11" width="38" height="8" rx="2" fill="#92400e" />
            </pattern>
            <linearGradient id="wall-shadow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#000000" stop-opacity="0.5"/>
            </linearGradient>
          </defs>
          <rect width="100" height="100" fill="url(#brown-bricks)" />
          <rect width="100" height="100" fill="url(#wall-shadow)" pointer-events="none" />
        </svg>
      `;
    }

    if (cell.cage) {
      inner += `
        <div style="position:absolute;inset:-2px;z-index:10;pointer-events:none;filter:drop-shadow(0 4px 4px rgba(0,0,0,0.6))">
          <svg viewBox="0 0 100 100" width="100%" height="100%">
            <!-- Inner Cross (X) -->
            <line x1="10" y1="10" x2="90" y2="90" stroke="#111827" stroke-width="8" stroke-linecap="round" />
            <line x1="90" y1="10" x2="10" y2="90" stroke="#111827" stroke-width="8" stroke-linecap="round" />
          </svg>
        </div>
      `;
    }

    el.innerHTML = inner;
  }

  function buildBoard() {
    calcCellSize();
    boardEl.innerHTML = '';
    Object.keys(blockEls).forEach(k => delete blockEls[k]);

    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        if (engine.grid[r][c]) {
          createBlockEl(engine.grid[r][c], r, c);
        }
      }
    }
  }

  function refreshBoard() {
    // Sync DOM with engine grid (no animation)
    // Remove old
    boardEl.querySelectorAll('.match-block').forEach(el => el.remove());
    Object.keys(blockEls).forEach(k => delete blockEls[k]);

    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        if (engine.grid[r][c]) {
          createBlockEl(engine.grid[r][c], r, c);
        }
      }
    }
  }

  let hintTimer = null;
  function resetHintTimer() {
    clearTimeout(hintTimer);
    clearHints();
    if (!isAnimating && !engine.gameOver) {
      hintTimer = setTimeout(showHint, 5000);
    }
  }

  function clearHints() {
    Object.values(blockEls).forEach(el => {
      if (el) el.classList.remove('hint-active');
    });
  }

  function showHint() {
    if (!container.isConnected) return;
    if (isAnimating || engine.gameOver) return;
    const move = engine.getHintMove();
    if (move) {
      const el1 = blockEls[`${move.r1},${move.c1}`];
      const el2 = blockEls[`${move.r2},${move.c2}`];
      if (el1) el1.classList.add('hint-active');
      if (el2) el2.classList.add('hint-active');
    }
  }

  // === TOUCH DRAG SYSTEM ===
  function attachTouchEvents(el) {
    let startX, startY, startR, startC, dirLocked, dir, dragging;
    let neighborEl, neighborR, neighborC;

    const onStart = (e) => {
      if (isAnimating) return;
      e.preventDefault();
      resetHintTimer();
      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;
      startR = parseInt(el.dataset.row);
      startC = parseInt(el.dataset.col);

      // Prevent dragging cages and bricks
      const cell = engine.grid[startR][startC];
      if (cell && (cell.type === 'brick' || cell.cage)) return;

      dirLocked = false;
      dir = null;
      dragging = true;
      neighborEl = null;
      el.style.transition = 'none';
      el.classList.add('glow-active');

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('touchend', onEnd);
    };

    const onMove = (e) => {
      if (!dragging || isAnimating) return;
      e.preventDefault();
      const touch = e.touches ? e.touches[0] : e;
      let dx = touch.clientX - startX;
      let dy = touch.clientY - startY;

      // Lock direction after threshold
      if (!dirLocked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
        dirLocked = true;
        dir = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';

        // Determine neighbor
        if (dir === 'h') {
          neighborC = dx > 0 ? startC + 1 : startC - 1;
          neighborR = startR;
        } else {
          neighborR = dy > 0 ? startR + 1 : startR - 1;
          neighborC = startC;
        }

        if (neighborR < 0 || neighborR >= engine.rows || neighborC < 0 || neighborC >= engine.cols) {
          dir = null;
          return;
        }

        // Prevent dragging into a cage or brick
        const neighborCell = engine.grid[neighborR][neighborC];
        if (neighborCell && (neighborCell.type === 'brick' || neighborCell.cage)) {
          dir = null;
          return;
        }

        neighborEl = blockEls[`${neighborR},${neighborC}`];
        if (neighborEl) {
          neighborEl.style.transition = 'none';
          neighborEl.style.zIndex = '10';
        }
      }

      if (!dirLocked || !dir) return;

      // Clamp drag distance to one cell in the correct direction
      const maxDist = cellSize + GAP;
      if (dir === 'h') {
        if (neighborC > startC) {
          dx = Math.max(0, Math.min(maxDist, dx));
        } else {
          dx = Math.max(-maxDist, Math.min(0, dx));
        }
        dy = 0;
      } else {
        if (neighborR > startR) {
          dy = Math.max(0, Math.min(maxDist, dy));
        } else {
          dy = Math.max(-maxDist, Math.min(0, dy));
        }
        dx = 0;
      }

      el.style.transform = `translate(${dx}px, ${dy}px)`;
      if (neighborEl) {
        neighborEl.style.transform = `translate(${-dx}px, ${-dy}px)`;
      }
    };

    const onEnd = (e) => {
      if (!dragging) return;
      dragging = false;

      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);

      el.classList.remove('glow-active');
      if (neighborEl) neighborEl.style.zIndex = '';
      resetHintTimer();

      if (!dirLocked || !dir || neighborR === undefined) {
        el.style.transition = `transform ${TIMING.swapBack}ms ${EASE_OUT}`;
        el.style.transform = '';
        return;
      }

      const touch = e.changedTouches ? e.changedTouches[0] : e;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      const dist = dir === 'h' ? Math.abs(dx) : Math.abs(dy);
      const threshold = cellSize * 0.3;

      if (dist >= threshold) {
        // Attempt swap
        executeTurn(startR, startC, neighborR, neighborC);
      } else {
        // Snap back
        el.style.transition = `transform ${TIMING.swapBack}ms ${BOUNCE}`;
        el.style.transform = '';
        if (neighborEl) {
          neighborEl.style.transition = `transform ${TIMING.swapBack}ms ${BOUNCE}`;
          neighborEl.style.transform = '';
          neighborEl.style.zIndex = '';
        }
      }
    };

    el.addEventListener('touchstart', onStart, { passive: false });
    // Mouse fallback for desktop
    el.addEventListener('mousedown', onStart);
  }

  // === ANIMATION: SWAP ===
  async function animateSwap(r1, c1, r2, c2) {
    const el1 = blockEls[`${r1},${c1}`];
    const el2 = blockEls[`${r2},${c2}`];
    if (!el1 || !el2) return;

    const dx = (c2 - c1) * (cellSize + GAP);
    const dy = (r2 - r1) * (cellSize + GAP);

    el1.style.transition = `transform ${TIMING.swap}ms ${EASE_OUT}`;
    el2.style.transition = `transform ${TIMING.swap}ms ${EASE_OUT}`;
    el1.style.zIndex = '20';
    el2.style.zIndex = '10';

    el1.style.transform = `translate(${dx}px, ${dy}px)`;
    el2.style.transform = `translate(${-dx}px, ${-dy}px)`;

    await sleep(TIMING.swap);

    // Update positions in DOM
    const pos1 = posForCell(r2, c2);
    const pos2 = posForCell(r1, c1);
    el1.style.transition = 'none';
    el2.style.transition = 'none';
    el1.style.transform = '';
    el2.style.transform = '';
    el1.style.left = pos1.x + 'px';
    el1.style.top = pos1.y + 'px';
    el2.style.left = pos2.x + 'px';
    el2.style.top = pos2.y + 'px';
    el1.dataset.row = r2;
    el1.dataset.col = c2;
    el2.dataset.row = r1;
    el2.dataset.col = c1;
    el1.style.zIndex = '';
    el2.style.zIndex = '';

    blockEls[`${r2},${c2}`] = el1;
    blockEls[`${r1},${c1}`] = el2;
  }

  async function animateSwapBack(r1, c1, r2, c2) {
    const el1 = blockEls[`${r1},${c1}`];
    const el2 = blockEls[`${r2},${c2}`];
    if (!el1 || !el2) return;

    const dx = (c2 - c1) * (cellSize + GAP);
    const dy = (r2 - r1) * (cellSize + GAP);

    // First move to swapped position
    el1.style.transition = `transform ${TIMING.swapBack}ms ${EASE_OUT}`;
    el2.style.transition = `transform ${TIMING.swapBack}ms ${EASE_OUT}`;
    el1.style.transform = `translate(${dx}px, ${dy}px)`;
    el2.style.transform = `translate(${-dx}px, ${-dy}px)`;

    await sleep(TIMING.swapBack);

    // Then snap back
    el1.style.transition = `transform ${TIMING.swapBack}ms ${BOUNCE}`;
    el2.style.transition = `transform ${TIMING.swapBack}ms ${BOUNCE}`;
    el1.style.transform = '';
    el2.style.transform = '';

    await sleep(TIMING.swapBack);
  }

  function triggerBoardShake() {
    boardOuter.classList.remove('board-shake');
    void boardOuter.offsetWidth; // trigger reflow
    boardOuter.classList.add('board-shake');
    setTimeout(() => boardOuter.classList.remove('board-shake'), 400);
  }

  // === ANIMATION: BLAST ===
  async function animateBlast(blasted) {
    if (blasted.length >= 6 || engine.comboCount >= 3) {
      triggerBoardShake();
    }
    const promises = blasted.map(({ r, c, cell }, i) => {
      const el = blockEls[`${r},${c}`];
      if (!el) return Promise.resolve();

      return new Promise(resolve => {
        // Phase 1: Grow + brighten
        el.style.transition = `transform ${TIMING.blastGrow}ms ease-out, filter ${TIMING.blastGrow}ms ease-out`;
        el.style.transform = 'scale(1.25)';
        el.style.filter = 'brightness(1.8)';
        el.style.zIndex = '15';

        setTimeout(() => {
          // Phase 2: Shrink + fade
          el.style.transition = `transform ${TIMING.blastShrink}ms ease-in, opacity ${TIMING.blastShrink}ms ease-in`;
          el.style.transform = 'scale(0)';
          el.style.opacity = '0';

          // Spawn particles
          spawnParticles(r, c, cell);

          setTimeout(() => {
            el.remove();
            delete blockEls[`${r},${c}`];
            resolve();
          }, TIMING.blastShrink);
        }, TIMING.blastGrow);
      });
    });

    await Promise.all(promises);
  }

  function spawnParticles(r, c, cell) {
    const pos = posForCell(r, c);
    const cx = pos.x + cellSize / 2;
    const cy = pos.y + cellSize / 2;
    const color = cell ? (COLORS[cell.color]?.bg || '#fff') : '#fff';

    for (let i = 0; i < 4; i++) {
      const p = document.createElement('div');
      p.className = 'match-particle';
      const angle = (Math.PI * 2 / 4) * i + Math.random() * 0.5;
      const dist = 20 + Math.random() * 25;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * dist;
      p.style.cssText = `left:${cx}px;top:${cy}px;width:6px;height:6px;background:${color};--px:${px}px;--py:${py}px;`;
      boardEl.appendChild(p);
      setTimeout(() => p.remove(), 500);
    }

    // Gem Flight Animation
    if (cell && cell.gem) {
      const targetIconEl = document.getElementById(`target-${cell.gem}`);
      if (targetIconEl) {
        const gemEl = document.createElement('div');
        gemEl.className = 'gem-fly';
        gemEl.textContent = GEM_ICONS[cell.gem];
        
        // Initial position (relative to screen)
        const boardRect = boardEl.getBoundingClientRect();
        const startX = boardRect.left + cx;
        const startY = boardRect.top + cy;
        
        gemEl.style.left = startX + 'px';
        gemEl.style.top = startY + 'px';
        document.body.appendChild(gemEl);
        
        // Target position
        requestAnimationFrame(() => {
          const targetRect = targetIconEl.getBoundingClientRect();
          const endX = targetRect.left + targetRect.width / 2 - 12; // approx center
          const endY = targetRect.top + targetRect.height / 2 - 12;
          
          gemEl.style.transform = `translate(${endX - startX}px, ${endY - startY}px) scale(0.5)`;
          gemEl.style.opacity = '0';
          
          setTimeout(() => {
            gemEl.remove();
            // Pop the target icon slightly
            targetIconEl.style.transform = 'scale(1.2)';
            setTimeout(() => targetIconEl.style.transform = '', 150);
          }, 600);
        });
      }
    }

    // Score popup removed from individual particles to centralize in showAwesomeText
  }

  // === ANIMATION: PHYSICS FALL ===
  function animateFalls(falls) {
    return new Promise(resolve => {
      if (!falls || falls.length === 0) return resolve();

      const blocks = [];

      // existing falls
      const existingFalls = falls.filter(f => !f.isNew);
      for (const fall of existingFalls) {
        const key = `${fall.fromR},${fall.fromC}`;
        const el = blockEls[key];
        if (!el) continue;

        delete blockEls[key];
        const fromPos = posForCell(fall.fromR, fall.fromC);
        const toPos = posForCell(fall.toR, fall.toC);
        
        el.style.transition = 'none';

        blocks.push({
          el,
          currentY: 0,
          targetY: toPos.y - fromPos.y,
          v: 0,
          toR: fall.toR,
          toC: fall.toC,
          bounces: 0,
          finalX: toPos.x,
          finalY: toPos.y
        });
      }

      // new falls
      const newFalls = falls.filter(f => f.isNew);
      for (const fall of newFalls) {
        const el = document.createElement('div');
        el.className = 'match-block flex items-center justify-center';
        el.style.width = cellSize + 'px';
        el.style.height = cellSize + 'px';

        const fromPos = posForCell(fall.fromR, fall.toC); // Start above
        const toPos = posForCell(fall.toR, fall.toC);
        
        el.style.left = toPos.x + 'px';
        el.style.top = fromPos.y + 'px';
        el.style.transform = 'translateY(0px)';
        el.style.transition = 'none';
        
        applyBlockVisuals(el, fall.cell);
        attachTouchEvents(el);
        boardEl.appendChild(el);

        blocks.push({
          el,
          currentY: 0,
          targetY: toPos.y - fromPos.y,
          v: 0,
          toR: fall.toR,
          toC: fall.toC,
          bounces: 0,
          finalX: toPos.x,
          finalY: toPos.y
        });
      }

      // Start physics loop
      let lastTime = performance.now();
      const GRAVITY = 0.006; // Snappy acceleration
      const MAX_V = 2.5; 
      const BOUNCE_FACTOR = -0.28; // Light bounce
      const STOP_VELOCITY = 0.15; 

      function tick(now) {
        const dt = now - lastTime;
        lastTime = now;
        
        let allDone = true;
        const safeDt = Math.min(dt, 32); // cap dt to avoid huge jumps on lag

        for (const b of blocks) {
          if (b.done) continue;
          allDone = false;

          b.v += GRAVITY * safeDt;
          if (b.v > MAX_V) b.v = MAX_V; 

          b.currentY += b.v * safeDt;

          if (b.currentY >= b.targetY) {
            b.currentY = b.targetY;
            b.v *= BOUNCE_FACTOR;
            b.bounces++;
            
            if (Math.abs(b.v) < STOP_VELOCITY || b.bounces > 3) {
              b.v = 0;
              b.currentY = b.targetY;
              b.done = true;
              
              b.el.style.transform = '';
              b.el.style.top = b.finalY + 'px';
              b.el.dataset.row = b.toR;
              b.el.dataset.col = b.toC;
              blockEls[`${b.toR},${b.toC}`] = b.el;
            }
          }

          if (!b.done) {
            b.el.style.transform = `translateY(${b.currentY}px)`;
          }
        }

        if (!allDone) {
          requestAnimationFrame(tick);
        } else {
          resolve();
        }
      }

      requestAnimationFrame(tick);
    });
  }

  function renderSpecials(specials) {
    for (const sp of specials) {
      let el = blockEls[`${sp.r},${sp.c}`];
      if (!el && engine.grid[sp.r][sp.c]) {
        // The element was destroyed by the blast animation, recreate it!
        el = createBlockEl(engine.grid[sp.r][sp.c], sp.r, sp.c);
        el.style.transform = 'scale(0)';
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)';
          el.style.transform = 'scale(1)';
        });
      } else if (el && engine.grid[sp.r][sp.c]) {
        applyBlockVisuals(el, engine.grid[sp.r][sp.c]);
      }
    }
  }

  // === ANIMATION PIPELINE ===
  async function executeTurn(r1, c1, r2, c2) {
    if (isAnimating) return;
    isAnimating = true;

    // Step 1: Try swap in engine
    const swapResult = engine.trySwap(r1, c1, r2, c2);

    if (!swapResult.valid) {
      // Invalid swap - animate bounce back
      Sounds.playSfx('invalid');
      Haptics.vibrate('light');
      await animateSwapBack(r1, c1, r2, c2);
      isAnimating = false;
      resetHintTimer();
      return;
    }

    // Step 2: Animate the swap
    Haptics.vibrate('medium');
    await animateSwap(r1, c1, r2, c2);
    updateUI();

    // Step 3: Handle rainbow/special combo (already processed in engine)
    if (swapResult.rainbow || swapResult.specialCombo) {
      if (swapResult.blasted && swapResult.blasted.length > 0) {
        Sounds.playSfx('match-blast', { count: swapResult.blasted.length });
        await animateBlast(swapResult.blasted);
      }
      const fallResult = engine.executeFalls();
      await animateFalls(fallResult.falls);
      updateUI();

      // Cascade
      await processCascades();

      checkGameEnd();
      isAnimating = false;
      return;
    }

    // Step 4: Process blast for normal match
    let matches = swapResult.matches;

    while (matches && matches.length > 0) {
      Sounds.playSfx('match-blast', { count: matches.length });
      const blastResult = engine.executeBlast(matches,
        engine.comboCount === 1 ? r1 : undefined,
        engine.comboCount === 1 ? c1 : undefined,
        engine.comboCount === 1 ? r2 : undefined,
        engine.comboCount === 1 ? c2 : undefined
      );

      // Animate blast
      await animateBlast(blastResult.blasted);

      // Update specials visuals
      renderSpecials(blastResult.specials);

      updateUI();

      // Awesome text and Combo
      showAwesomeText(engine.comboCount, blastResult.maxMatchLength, blastResult.score);

      // Gravity
      const fallResult = engine.executeFalls();
      await animateFalls(fallResult.falls);
      Sounds.playSfx('match-fall');

      await sleep(TIMING.cascade);

      // Check for cascade
      matches = engine.findMatches();
    }

    // Deadlock check
    if (!engine.hasValidMoves() && !engine.gameOver) {
      engine.shuffleBoard();
      refreshBoard();
    }

    checkGameEnd();
    isAnimating = false;
    resetHintTimer();
  }

  async function processCascades() {
    let matches = engine.findMatches();
    while (matches && matches.length > 0) {
      engine.comboCount++;
      Sounds.playSfx('match-blast', { count: matches.length });

      const blastResult = engine.executeBlast(matches);
      await animateBlast(blastResult.blasted);

      renderSpecials(blastResult.specials);

      updateUI();
      showAwesomeText(engine.comboCount, blastResult.maxMatchLength, blastResult.score);

      const fallResult = engine.executeFalls();
      await animateFalls(fallResult.falls);
      Sounds.playSfx('match-fall');

      await sleep(TIMING.cascade);
      matches = engine.findMatches();
    }
  }

  function showAwesomeText(comboCount, maxMatchLength, points) {
    let textStr = '';
    
    if (maxMatchLength === 4) textStr = t('txt_great');
    else if (maxMatchLength >= 5) textStr = t('txt_amazing');
    else if (comboCount > 1) textStr = t('txt_excellent');

    if (comboCount > 1) {
      const comboStr = `${comboCount}x ${t('txt_combo')}!`;
      textStr = textStr ? `${textStr}<br/><span class="text-2xl">${comboStr}</span>` : comboStr;
    }

    const floating = document.createElement('div');
    
    if (!textStr && comboCount <= 1) {
      // Normal match-3, small pop
      floating.className = 'absolute z-50 bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-extrabold px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(0,229,255,0.6)] text-lg pointer-events-none transition-all duration-700 ease-out';
      floating.textContent = `+${points}`;
      const randomOffsetX = (Math.random() - 0.5) * 60;
      const randomOffsetY = (Math.random() - 0.5) * 60;
      floating.style.left = `calc(50% + ${randomOffsetX}px)`;
      floating.style.top = `calc(50% + ${randomOffsetY}px)`;
      floating.style.transform = 'translate(-50%, -50%)';
      boardEl.appendChild(floating);
      
      requestAnimationFrame(() => {
        floating.style.transform = 'translate(-50%, -200%) scale(1.1)';
        floating.style.opacity = '0';
      });
      setTimeout(() => floating.remove(), 1200);
      return;
    }

    // Awesome big text
    floating.className = 'absolute z-50 flex flex-col items-center justify-center pointer-events-none';
    floating.innerHTML = `
      <div class="relative flex flex-col items-center justify-center">
        <!-- Glow behind text -->
        <div class="absolute inset-0 bg-yellow-400 blur-2xl opacity-50 rounded-full scale-150 animate-pulse"></div>
        
        <div class="relative z-10 text-[2.5rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-100 via-yellow-400 to-orange-500 drop-shadow-[0_4px_10px_rgba(251,146,60,0.8)] leading-none italic uppercase tracking-tighter text-center" style="transform: rotate(-5deg);">
          ${textStr}
        </div>
        <div class="relative z-10 text-3xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,229,255,1)] mt-1 animate-bounce" style="transform: rotate(2deg);">
          +${points}
        </div>
      </div>
    `;
    
    floating.style.left = '50%';
    floating.style.top = '50%';
    floating.style.transform = 'translate(-50%, -50%) scale(0.1)';
    floating.style.opacity = '0';
    floating.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
    
    boardEl.appendChild(floating);
    
    if (comboCount > 1) Sounds.playSfx('match-combo', { combo: comboCount });
    if (maxMatchLength >= 5) Haptics.vibrate('heavy');
    else if (maxMatchLength === 4) Haptics.vibrate('medium');

    requestAnimationFrame(() => {
      floating.style.transform = 'translate(-50%, -50%) scale(1.2)';
      floating.style.opacity = '1';
      
      setTimeout(() => {
        floating.style.transition = 'all 0.5s ease-in';
        floating.style.transform = 'translate(-50%, -50%) scale(1.5)';
        floating.style.opacity = '0';
        floating.style.filter = 'blur(10px)';
        
        setTimeout(() => floating.remove(), 500);
      }, 1000);
    });
  }

  function checkGameEnd() {
    if (engine.gameOver || container.isLevelUpModalOpen) return;
    const result = engine.checkEndCondition();
    if (result === 'levelup') {
      container.isLevelUpModalOpen = true;
      showLevelUpModal();
    } else if (result === 'lose') {
      engine.clearSave();
      if (!container.isGameOverModalOpen) {
        showReviveModal();
      }
    } else {
      engine.saveState();
      // Sonsuz modda periyodik reklam kontrolü
      if (mode !== 'adventure') {
        AdService.showForcedInterstitial('periodic');
      }
    }
  }

  function showReviveModal() {
    container.isGameOverModalOpen = true;
    const modal = createModal({
      title: t('second_chance') || 'İkinci Şans',
      content: `
        <div class="flex flex-col items-center p-4">
          <span class="text-5xl mb-3 drop-shadow-md">💖</span>
          <p class="text-sm font-bold text-gray-400 mb-6 text-center">Hamlen bitti! Devam etmek ister misin?</p>
          
          <div class="w-full flex flex-col gap-3">
            <button id="modal-revive-diamonds" class="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(236,72,153,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined fill">diamond</span>
              <span>${t('revive_diamonds') || '300 Elmas Harca'}</span>
            </button>
            <button id="modal-revive-ad" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined">play_circle</span>
              <span>${t('revive_ad_classic') || 'Reklam İzle & Devam Et'}</span>
            </button>
            <button id="modal-revive-giveup" class="w-full py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary dark:text-white rounded-2xl font-bold active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center gap-2">
              <span>${t('give_up') || 'Pes Et'}</span>
            </button>
          </div>
        </div>
      `,
      actions: []
    });

    modal.querySelector('#modal-revive-diamonds').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      if (PlayerState.useDiamonds(300)) {
        engine.revive();
        container.isGameOverModalOpen = false;
        modal.close();
        updateUI();
      } else {
        Toast.show(t('not_enough_diamonds') || 'Yetersiz elmas!', 'error');
      }
    });

    modal.querySelector('#modal-revive-ad').addEventListener('click', async () => {
      Sounds.playSfx('button-tap');
      const success = await AdService.showInterstitial();
      if (success) {
        engine.revive();
        container.isGameOverModalOpen = false;
        modal.close();
        updateUI();
      }
    });

    modal.querySelector('#modal-revive-giveup').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      container.isGameOverModalOpen = false;
      modal.close();
      showEndModal(false);
    });
  }

  function showLevelUpModal() {
    Sounds.playSfx('level-up');
    Haptics.vibrate('success');
    AdService.showForcedInterstitial('levelup');

    createModal({
      title: 'TEBRİKLER!',
      content: `
        <div class="flex flex-col items-center justify-center space-y-4">
          <div class="text-6xl animate-bounce">👑</div>
          <div class="text-xl font-bold text-gray-700 dark:text-gray-200 text-center">
            Seviye ${engine.level} Tamamlandı!
          </div>
          <div class="text-sm text-gray-500 text-center px-4">
            Harika gidiyorsun! Yeni seviyede hedef puan artıyor!
          </div>
        </div>
      `,
      actions: [
        {
          text: 'SONRAKİ SEVİYE',
          primary: true,
          onClick: (closeFn) => {
            closeFn();
            engine.level++;
            engine.levelScore = 0;
            engine.score = 0;
            // Rebuild the board, gem targets, target score, moves and colors
            // for the new level (init reads everything from the level data).
            engine.init();
            engine.gameOver = false;
            engine.levelUpReady = false;
            PlayerState.state.jewelCrushLevel = engine.level;
            PlayerState.save();
            engine.saveState();

            // Re-render board + target bar + header for the new level
            if (targetBar) { targetBar.remove(); targetBar = null; }
            buildTargetBar();
            buildBoard();
            const lvlEl = container.querySelector('#match-lvl');
            if (lvlEl) lvlEl.textContent = engine.level;
            updateUI();
            resetHintTimer();

            container.isLevelUpModalOpen = false;
          }
        }
      ],
      hideCloseButton: true
    });
  }

  function showVictory() {
    import('../state/taskState.js').then(({ TaskState }) => {
      TaskState.updateProgress('match_level', 1);
    });
    showEndModal(true);
  }

  // === END MODAL ===
  function showEndModal(isWin) {
    if (isWin) {
      Sounds.playSfx('levelUp');
      Haptics.vibrate('success');
      if (levelNum >= (PlayerState.state.jewelCrushLevel || 1)) {
        PlayerState.state.jewelCrushLevel = levelNum + 1;
      }
      PlayerState.state.bestScoreJewel = (PlayerState.state.bestScoreJewel || 0) + engine.score;
      PlayerState.save();
      const reward = Math.min(100, 20 + levelNum * 5);
      PlayerState.addDiamonds(reward);

      createModal({
        title: '🎉 ' + (t('level_complete')),
        content: `<div class="flex flex-col items-center p-2 text-center">
          <div class="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg mb-4 animate-bounce"><span class="text-4xl">⭐</span></div>
          <p class="text-2xl font-black mb-2">${engine.score.toLocaleString('tr-TR')}</p>
          <p class="text-sm text-gray-500 mb-1">${t('score') || 'Skor'}</p>
          <div class="flex items-center gap-1 mt-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span class="material-symbols-outlined fill text-cyan-400 text-sm">diamond</span>
            <span class="text-xs font-black text-cyan-600 dark:text-cyan-400">+${reward}</span>
          </div>
        </div>`,
        actions: [
          { text: t('next_level') || 'Sonraki Seviye', primary: true, onClick: (close) => { close(); startGame(container, router, mode, levelNum + 1); } },
          { text: mode === 'adventure' ? (t('back_to_map') || 'Haritaya Dön') : (t('main_menu') || 'Ana Menüye Dön'), primary: false, onClick: (close) => { close(); router.navigate(mode === 'adventure' ? '#/adventure-map?game=match' : '#/menu'); } }
        ]
      });
    } else {
      Sounds.playSfx('gameover');
      Haptics.vibrate('heavy');
      let actions = [
        { text: t('try_again_camel') || 'Tekrar Dene', primary: true, onClick: (close) => { close(); startGame(container, router, mode, levelNum); } },
        { text: mode === 'adventure' ? (t('back_to_map') || 'Haritaya Dön') : (t('main_menu') || 'Ana Menüye Dön'), primary: false, onClick: (close) => { close(); router.navigate(mode === 'adventure' ? '#/adventure-map?game=match' : '#/menu'); } }
      ];

      createModal({
        title: t('game_over') || 'Oyun Bitti!',
        content: `<div class="flex flex-col items-center p-2 text-center">
          <div class="w-20 h-20 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center shadow-inner mb-4">
            <span class="text-4xl filter grayscale">💥</span>
          </div>
          <p class="text-2xl font-black mb-2">${engine.score.toLocaleString('tr-TR')}</p>
          <p class="text-sm text-gray-500">${t('score') || 'Skor'}</p>
        </div>`,
        actions: actions
      });
    }
  }

  // === UTILITY ===
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // === INIT ===
  // Wait for DOM to be ready, then build
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      buildTargetBar();
      buildBoard();
      updateUI();
      updateExtraMovesUI();
      resetHintTimer();
      
      // Bind Extra Moves Button
      const btnExtraMoves = container.querySelector('#btn-extra-moves');
      if (btnExtraMoves) {
        btnExtraMoves.addEventListener('click', () => {
          if (engine.gameOver || isAnimating) return;
          if (extraMovesCount >= maxExtraMoves) return;
          
          const cost = costs[extraMovesCount];
          if (PlayerState.state.diamonds >= cost) {
            Sounds.playSfx('button-tap');
            PlayerState.useDiamonds(cost);
            extraMovesCount++;
            engine.movesLeft += 2;
            updateUI();
            updateExtraMovesUI();
            // Pop an animation over the button
            const pop = document.createElement('div');
            pop.className = 'absolute -top-6 left-1/2 transform -translate-x-1/2 text-cyan-400 font-black text-xl animate-fade-out drop-shadow-md z-50 pointer-events-none';
            pop.textContent = '+2!';
            btnExtraMoves.appendChild(pop);
            setTimeout(() => pop.remove(), 1000);
          } else {
            Sounds.playSfx('button-tap');
            // Show Not Enough Diamonds Modal
            const modal = createModal({
              title: t('not_enough_diamonds') || 'Yetersiz Elmas',
              content: `
                <div class="flex flex-col items-center p-4">
                  <span class="text-5xl mb-3 drop-shadow-md">💎</span>
                  <p class="text-sm font-bold text-gray-400 mb-6 text-center">${t('need_diamonds_undo') ? t('need_diamonds_undo').replace('{cost}', cost) : `Devam etmek için ${cost} elmasa ihtiyacınız var!`}</p>
                  
                  <div class="w-full flex flex-col gap-3">
                    <button id="modal-watch-ad" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
                      <span class="material-symbols-outlined">play_circle</span>
                      <span>${t('watch_ad_use_undo') || 'Reklam İzle & +2 Hamle'}</span>
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
              const m = await import('../services/adService.js');
              const success = await m.AdService.showInterstitial();
              if (success) {
                modal.close();
                PlayerState.addDiamonds(cost);
                PlayerState.useDiamonds(cost);
                extraMovesCount++;
                engine.movesLeft += 2;
                updateUI();
                updateExtraMovesUI();
                
                const pop = document.createElement('div');
                pop.className = 'absolute -top-6 left-1/2 transform -translate-x-1/2 text-cyan-400 font-black text-xl animate-fade-out drop-shadow-md z-50 pointer-events-none';
                pop.textContent = '+2!';
                btnExtraMoves.appendChild(pop);
                setTimeout(() => pop.remove(), 1000);
              }
            });

            modal.querySelector('#modal-buy-diamonds').addEventListener('click', () => {
              Sounds.playSfx('button-tap');
              modal.close();
              router.navigate('#/profile');
            });
          }
        });
      }
    });
  });

  // Auto-show tutorial on first entry
  const tutTimeout = setTimeout(() => {
    if (container.isConnected) {
      checkAndShowTutorial('match');
    }
  }, 500);

  return () => {
    clearTimeout(hintTimer);
    clearTimeout(tutTimeout);
  };
}
