import { ClassicEngine } from '../game/classicEngine.js';
import { showFeedback } from '../utils/feedback.js';
import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { AdService } from '../services/adService.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { Toast } from '../components/toast.js';
import { showGameOverModal } from './gameOver.js';
import { Powerups } from '../game/powerups.js';
import { checkAndShowTutorial } from '../components/tutorial.js';
import { Storage } from '../utils/storage.js';
import { createModal } from '../components/modal.js';
import { t } from '../utils/i18n.js';
import { GridShapes } from '../game/levelData.js';
import { TaskState } from '../state/taskState.js';
import { showQuitConfirmation } from '../utils/quitConfirm.js';

export function ClassicBlock(router) {
  const screenAbortController = new AbortController();
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] relative overflow-hidden flex flex-col bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-pop-up pb-2 sm:pb-3 md:pb-6 lg:pb-10';

  // 1. Core State & Engine Setup
  const queryParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const mode = queryParams.get('mode') || 'endless';
  const isAdventure = mode === 'adventure';
  
  let activeGridSize = parseInt(localStorage.getItem('lumina_puzzle_classic_grid_size') || '8');
  if (isAdventure) activeGridSize = 8; // Force 8x8 for adventure

  let engine = new ClassicEngine(activeGridSize, null, mode);
  // Adventure'da URL'de ?level=N varsa o seviyeden başla
  if (mode === 'adventure') {
    const urlLevel = parseInt(queryParams.get('level'), 10);
    if (urlLevel >= 1) {
      Storage.remove('classic_save_state'); // önceki kayıt varsa temizle
      engine = new ClassicEngine(activeGridSize, null, mode);
      engine.initLevel(urlLevel, false);
    }
  }

  const checkGameOver = () => {
    if (engine.gameOver && !container.isGameOverModalOpen) {
      container.isGameOverModalOpen = true;
      const modal = createModal({
        title: t('second_chance') || 'İkinci Şans',
        content: `
          <div class="flex flex-col items-center p-4">
            <span class="text-5xl mb-3 drop-shadow-md">💖</span>
            <p class="text-sm font-bold text-gray-400 mb-6 text-center">${t('revive_desc') || '3x3 bir alan temizleyip oyuna devam etmek ister misin?'}</p>
            
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
          updateBoardUI();
          renderTray();
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
          updateBoardUI();
          renderTray();
        }
      });

      modal.querySelector('#modal-revive-giveup').addEventListener('click', () => {
        Sounds.playSfx('button-tap');
        container.isGameOverModalOpen = false;
        modal.close();
        showGameOverModal({
          score: engine.score,
          mode: isAdventure ? 'classic_adventure' : 'classic',
          onPlayAgain: () => {
            if (isAdventure) {
              engine.restartCurrentLevel();
            } else {
              engine.initGame();
            }
            updateBoardUI();
            renderTray();
            updateScoreUI();
            updateUndoUI();
            updateHammerUI();
            container.isGameOverModalOpen = false;
          },
          onMainMenu: () => {
            router.navigate(isAdventure ? '#/adventure-map?game=classic' : '#/menu');
          }
        });
      });
    }
  };

  const checkAndTriggerGameOver = () => {
    if (engine.gameOver) {
      checkGameOver();
    }
  };

  // Active power-up selection: null, 'hammer'
  let activePowerup = null;

  const topBarTitle = isAdventure ? t('menu_adventure') || 'MACERA' : t('tut_classic_title');
  const backTarget = isAdventure ? '#/adventure-map?game=classic' : '#/menu';
  const topBar = createTopBar(topBarTitle, true, () => {
    showQuitConfirmation(router, backTarget, {
      text: t('restart') || 'YENİDEN BAŞLAT',
      primary: false,
      onClick: (closeFn) => {
        closeFn();
        if (isAdventure) {
          engine.restartCurrentLevel();
        } else {
          engine.initGame();
        }
        updateBoardUI();
        renderTray();
        updateScoreUI();
        updateUndoUI();
        updateHammerUI();
      }
    });
  });

  container.appendChild(topBar);

  // 3. Sub-controls container
  const subControls = document.createElement('div');
  subControls.className = 'px-4 md:px-6 lg:px-8 pt-1.5 md:pt-3 lg:pt-4 pb-0 flex items-center justify-between w-full z-30';
  subControls.innerHTML = `
    <div class="flex items-center space-x-2">
      <button id="btn-help" class="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-black/10 dark:border-white/10 shadow-sm active:scale-90 transition-transform text-red-500 dark:text-red-400">
        <span class="material-symbols-outlined text-[18px] md:text-[20px] lg:text-[22px]">help</span>
      </button>
    </div>

    <!-- Right: Grid Size Selector + Undo + Hammer -->
    <div class="flex items-center space-x-2">

      <!-- Hammer Pill -->
      <button id="btn-hammer" class="flex items-center gap-1.5 px-2.5 md:px-3 lg:px-4 py-1 md:py-1.5 rounded-full bg-white dark:bg-primary-container border border-black/5 dark:border-white/5 shadow-sm active:scale-95 transition-all shrink-0">
        <span class="material-symbols-outlined text-[14px] md:text-[16px] lg:text-[18px]">hardware</span>
        <span class="text-[9px] md:text-[11px] lg:text-[13px] font-black tracking-tight leading-none uppercase text-gray-700 dark:text-gray-200">${t('x2_hammer') || 'ÇEKİÇ'}</span>
        <div id="hammer-badge" class="flex items-center gap-0.5 bg-cyan-500/10 dark:bg-cyan-500/20 px-1.5 py-0.5 rounded-full ml-0.5 transition-all">
          <span class="material-symbols-outlined text-[10px] md:text-[12px] lg:text-[14px] fill text-cyan-500 dark:text-cyan-400">diamond</span>
          <span id="hammer-cost" class="text-[10px] md:text-[11px] lg:text-[13px] font-black text-cyan-600 dark:text-cyan-300 leading-none">50</span>
        </div>
      </button>

      <!-- Undo Pill -->
      <button id="btn-undo" class="flex items-center gap-1.5 px-2.5 md:px-3 lg:px-4 py-1 md:py-1.5 rounded-full bg-white dark:bg-primary-container border border-black/5 dark:border-white/5 shadow-sm active:scale-95 transition-all shrink-0">
        <span class="material-symbols-outlined text-[14px] md:text-[16px] lg:text-[18px]">undo</span>
        <span class="text-[9px] md:text-[11px] lg:text-[13px] font-black tracking-tight leading-none uppercase text-gray-700 dark:text-gray-200">${t('undo')}</span>
        <div id="undo-badge" class="flex items-center gap-0.5 bg-cyan-500/10 dark:bg-cyan-500/20 px-1.5 py-0.5 rounded-full ml-0.5 transition-all">
          <span class="material-symbols-outlined text-[10px] md:text-[12px] lg:text-[14px] fill text-cyan-500 dark:text-cyan-400">diamond</span>
          <span id="undo-cost" class="text-[10px] md:text-[11px] lg:text-[13px] font-black text-cyan-600 dark:text-cyan-300 leading-none">50</span>
        </div>
      </button>
    </div>
  `;
  container.appendChild(subControls);

  // 4. Main Score section
  const scoreSection = document.createElement('div');
  scoreSection.className = 'px-4 md:px-6 lg:px-8 py-1 mt-2 sm:mt-3 md:mt-4 lg:mt-6 flex justify-between items-center w-full';
  scoreSection.innerHTML = `
    <div class="flex flex-col items-center justify-center flex-1">
      ${isAdventure ? `
        <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1 drop-shadow-md">
          <div class="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
          <div class="absolute inset-0 rounded-full border-4 border-t-indigo-400 rotate-45"></div>
          <div class="bg-gradient-to-br from-indigo-500 to-purple-600 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
            <span id="classic-lvl" class="text-xl md:text-2xl lg:text-3xl font-black text-white drop-shadow-sm leading-none">${engine.level}</span>
          </div>
          <div class="absolute -top-1.5 -right-1.5 text-sm md:text-base lg:text-xl drop-shadow-md">👑</div>
        </div>
        <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider">${t('level').toUpperCase()}</span>
        <div class="w-full mt-1.5 h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden flex items-center justify-center relative">
          <div id="classic-level-progress" class="h-full bg-gradient-to-r from-indigo-400 to-purple-500 absolute left-0 top-0 transition-all duration-300" style="width: ${Math.min(100, (engine.levelScore / engine.getTargetScore()) * 100)}%"></div>
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
      <span id="classic-score" class="text-[32px] md:text-[40px] lg:text-[52px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-sm tracking-tight leading-none">${engine.score}</span>
    </div>

    <div class="flex flex-col items-center justify-center flex-1">
      <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1">
        <div class="absolute inset-0 rounded-full border-2 border-orange-500/30"></div>
        <div class="bg-gradient-to-br ${isAdventure ? 'from-orange-400 to-red-500' : 'from-gray-300 to-gray-500 dark:from-slate-600 dark:to-slate-800'} w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
          <span class="material-symbols-outlined text-white text-lg md:text-xl lg:text-3xl drop-shadow-sm">${isAdventure ? 'target' : 'emoji_events'}</span>
        </div>
      </div>
      <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider mb-0.5">${isAdventure ? t('target').toUpperCase() : t('record').toUpperCase()}</span>
      <span id="classic-best" class="text-sm md:text-base lg:text-xl font-black ${isAdventure ? 'text-orange-500' : 'text-gray-500'}">${isAdventure ? engine.getTargetScore().toLocaleString('tr-TR') : engine.bestScore.toLocaleString('tr-TR')}</span>
    </div>
  `;
  container.appendChild(scoreSection);

    const content = document.createElement('main');
    content.className = 'flex-1 flex flex-col items-center justify-center w-full relative overflow-hidden min-h-0';

    // 5. Game Board Area (Board Container + cells)
    const boardWrapper = document.createElement('div');
    boardWrapper.className = 'flex items-center justify-center p-2 relative z-10 w-full shrink-0';
  
  const boardEl = document.createElement('div');
  boardEl.id = 'game-board';
  boardEl.className = 'grid gap-[3px] bg-black/5 dark:bg-white/5 p-2 rounded-3xl border border-black/5 dark:border-white/5 shadow-inner relative';
  
  boardEl.addEventListener('click', (e) => {
    if (activePowerup === 'hammer') {
      const cell = e.target.closest('[data-r]');
      if (!cell) return;
      const r = parseInt(cell.getAttribute('data-r'));
      const c = parseInt(cell.getAttribute('data-c'));
      
      const result = engine.useHammer(r, c);
      if (result === 'insufficient_funds') {
        Toast.show(t('not_enough_diamonds') || 'Yetersiz elmas!', 'error');
        activePowerup = null;
        boardEl.classList.remove('cursor-crosshair');
        return;
      }
      
      if (result) {
        updateBoardUI();
        updateHammerUI();
        const rect = cell.getBoundingClientRect();
        const popup = document.createElement('div');
        popup.className = 'fixed z-[9999] rounded-full border-4 border-cyan-400 animate-ping';
        popup.style.width = `${rect.width}px`;
        popup.style.height = `${rect.height}px`;
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.top}px`;
        document.body.appendChild(popup);
        setTimeout(() => popup.remove(), 400);
      }
      
      activePowerup = null;
      boardEl.classList.remove('cursor-crosshair');
    }
  });

  boardWrapper.appendChild(boardEl);
  content.appendChild(boardWrapper);

  // 6. Power-ups Tray Below Grid (REMOVED per user request)

  // 7. Piece Tray (Three boxes)
  const trayWrapper = document.createElement('div');
  trayWrapper.className = 'w-full flex justify-center pt-2 sm:pt-3 md:pt-4 lg:pt-6 pb-0';
  
  const trayEl = document.createElement('div');
  trayEl.className = 'grid grid-cols-3 gap-3 w-full h-24 md:h-36 lg:h-44 glass-panel border border-black/10 dark:border-white/10 rounded-3xl p-3 md:p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] relative overflow-hidden';
  // Add a subtle glow behind the tray
  const glow = document.createElement('div');
  glow.className = 'absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none rounded-3xl';
    trayEl.appendChild(glow);
    trayWrapper.appendChild(trayEl);
    content.appendChild(trayWrapper);
    container.appendChild(content);

  // --- RENDERING HELPERS ---

  // Cached cell size - computed once in renderBoard, reused in updateBoardUI
  let cachedCellWidth = 0;

  // Re-build grid cells in DOM using DocumentFragment (single reflow)
  const renderBoard = () => {
    boardEl.innerHTML = '';
    const fragment = document.createDocumentFragment();
    boardEl.style.gridTemplateColumns = `repeat(${engine.gridSize}, minmax(0, 1fr))`;
    boardEl.style.gridTemplateRows = `repeat(${engine.gridSize}, minmax(0, 1fr))`;

    // Responsive board size calculation - cached for reuse
    const w = window.innerWidth;
    const topReserved  = w >= 1024 ? 260 : w >= 768 ? 240 : 220;
    const botReserved  = w >= 1024 ? 200 : w >= 768 ? 175 : 145;
    const maxFromHeight = window.innerHeight - topReserved - botReserved;
    const maxFromWidth  = w - (w >= 1024 ? 80 : 32);
    const capWidth      = w >= 1024 ? 700 : w >= 768 ? 580 : 520;
    const maxBoardWidth = Math.min(maxFromWidth, maxFromHeight, capWidth);
    const gapCount = engine.gridSize - 1;
  cachedCellWidth = Math.floor((maxBoardWidth - 16 - (gapCount * 3)) / engine.gridSize);

    boardEl.style.width = `${maxBoardWidth}px`;
    boardEl.style.height = `${maxBoardWidth}px`;
    trayEl.style.width = `${maxBoardWidth}px`;

    for (let r = 0; r < engine.gridSize; r++) {
      for (let c = 0; c < engine.gridSize; c++) {
        const cell = document.createElement('div');
        cell.className = 'aspect-square rounded-lg flex items-center justify-center transition-all duration-200';
        cell.style.width = `${cachedCellWidth}px`;
        cell.style.height = `${cachedCellWidth}px`;
        cell.setAttribute('data-r', r.toString());
        cell.setAttribute('data-c', c.toString());

        const color = engine.board[r][c];
        if (color === 'inactive') {
          cell.className += ' opacity-0 pointer-events-none';
        } else if (color) {
          cell.className += ` block-3d-${color}`;
        } else {
          cell.className += ' grid-cell-empty';
        }

        fragment.appendChild(cell);
      }
    }
    boardEl.appendChild(fragment);
  };

  // Snapshot of the previous board state for diff-based updates
  let prevBoardSnapshot = null;

  function updateScoreUI() {
    container.querySelector('#classic-score').textContent = engine.score;
    container.querySelector('#classic-best').textContent = isAdventure ? engine.getTargetScore().toLocaleString('tr-TR') : engine.bestScore.toLocaleString('tr-TR');
    
    if (isAdventure) {
      container.querySelector('#classic-lvl').textContent = engine.level;
      const progressEl = container.querySelector('#classic-level-progress');
      if (progressEl) {
        progressEl.style.width = `${Math.min(100, (engine.levelScore / engine.getTargetScore()) * 100)}%`;
      }
    }
  };

  function updateBoardUI() {
    const cells = boardEl.querySelectorAll('[data-r]');
    cells.forEach(cell => {
      const r = parseInt(cell.getAttribute('data-r'));
      const c = parseInt(cell.getAttribute('data-c'));
      const newColor = engine.board[r][c];

      // Skip cell if nothing changed (diff optimization)
      if (prevBoardSnapshot && prevBoardSnapshot[r] && prevBoardSnapshot[r][c] === newColor) return;

      const oldColor = prevBoardSnapshot && prevBoardSnapshot[r] ? prevBoardSnapshot[r][c] : undefined;

      // Remove old classes
      if (oldColor === 'inactive') {
        cell.classList.remove('opacity-0', 'pointer-events-none');
      } else if (oldColor) {
        cell.classList.remove(`block-3d-${oldColor}`);
      } else if (oldColor === null) {
        cell.classList.remove('grid-cell-empty');
      } else {
        // Fallback fallback if prev snapshot is missing
        cell.className = 'aspect-square rounded-lg flex items-center justify-center transition-all duration-200';
      }

      cell.style.width = `${cachedCellWidth}px`;
      cell.style.height = `${cachedCellWidth}px`;

      // Add new classes
      if (newColor === 'inactive') {
        cell.classList.add('opacity-0', 'pointer-events-none');
      } else if (newColor) {
        cell.classList.add(`block-3d-${newColor}`);
      } else {
        cell.classList.add('grid-cell-empty');
      }
    });

    // Store current board as snapshot for next diff
    prevBoardSnapshot = engine.board.map(row => [...row]);

    updateScoreUI();

    if (isAdventure && engine.levelUpReady) {
      setTimeout(() => {
        showLevelUpModal(engine.level, () => {
          if (engine.level >= PlayerState.state.currentAdventureLevel) {
            PlayerState.state.currentAdventureLevel = engine.level + 1;
            PlayerState.save();
          }
          engine.nextLevel();
          updateBoardUI();
          renderTray();
          updateScoreUI();
        });
      }, 500);
    }

    // Sonsuz modda periyodik reklam kontrolü (cooldown timer korur, sık çağrılması sorun değil)
    if (!isAdventure) {
      AdService.showForcedInterstitial('periodic');
    }
    
    updateBoardBackground();
  };

  const updateUndoUI = () => {
    const undoBtn = container.querySelector('#btn-undo');
    const undoCostEl = container.querySelector('#undo-cost');
    const badgeEl = container.querySelector('#undo-badge');
    
    if (!undoBtn || !undoCostEl) return;

    const costs = [50, 150, 300];
    if (engine.undoCount >= costs.length) {
      // Disabled state
      undoBtn.classList.add('opacity-50', 'pointer-events-none');
      undoCostEl.textContent = 'MAX';
      const icon = badgeEl.querySelector('.material-symbols-outlined');
      if (icon) icon.style.display = 'none';
      undoCostEl.classList.remove('text-cyan-600', 'dark:text-cyan-300');
      undoCostEl.classList.add('text-gray-500', 'dark:text-gray-400');
    } else {
      undoBtn.classList.remove('opacity-50', 'pointer-events-none');
      undoCostEl.textContent = costs[engine.undoCount];
      const icon = badgeEl.querySelector('.material-symbols-outlined');
      if (icon) icon.style.display = '';
      undoCostEl.classList.remove('text-gray-500', 'dark:text-gray-400');
      undoCostEl.classList.add('text-cyan-600', 'dark:text-cyan-300');
    }
  };

  const updateHammerUI = () => {
    const hammerBtn = container.querySelector('#btn-hammer');
    const hammerCostEl = container.querySelector('#hammer-cost');
    const badgeEl = container.querySelector('#hammer-badge');
    
    if (!hammerBtn || !hammerCostEl) return;

    const costs = [50, 150, 300];
    if (engine.hammerCount >= costs.length) {
      hammerBtn.classList.add('opacity-50', 'pointer-events-none');
      hammerCostEl.textContent = 'MAX';
      const icon = badgeEl.querySelector('.material-symbols-outlined');
      if (icon) icon.style.display = 'none';
      hammerCostEl.classList.remove('text-cyan-600', 'dark:text-cyan-300');
      hammerCostEl.classList.add('text-gray-500', 'dark:text-gray-400');
    } else {
      hammerBtn.classList.remove('opacity-50', 'pointer-events-none');
      hammerCostEl.textContent = costs[engine.hammerCount];
      const icon = badgeEl.querySelector('.material-symbols-outlined');
      if (icon) icon.style.display = '';
      hammerCostEl.classList.remove('text-gray-500', 'dark:text-gray-400');
      hammerCostEl.classList.add('text-cyan-600', 'dark:text-cyan-300');
    }
  };

  function showLevelUpModal(currentLevel, callback) {
    Sounds.playSfx('game-win');
    Haptics.vibrate('success');

    import('../services/adService.js').then(({ AdService }) => {
      AdService.showForcedInterstitial('levelup');
    });

    const overlay = document.createElement('div');
    overlay.className = 'absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in';
    
    const content = document.createElement('div');
    content.className = 'flex flex-col items-center text-center animate-pop-up';
    content.innerHTML = `
      <div class="w-24 h-24 rounded-full bg-yellow-400/20 flex items-center justify-center mb-4 border-4 border-yellow-400 animate-pulse">
        <span class="text-5xl">⭐</span>
      </div>
      <h2 class="text-3xl font-black text-white drop-shadow-lg mb-2 uppercase tracking-tight">${t('level_up') || 'SEVİYE ATLADIN!'}</h2>
      <p class="text-yellow-400 font-bold text-lg mb-6 drop-shadow-md">${currentLevel} ➔- ${currentLevel + 1}</p>
      <button class="px-8 py-3 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform" id="classic-btn-next-level">
        ${t('continue') || 'DEVAM ET'}
      </button>
    `;
    
    overlay.appendChild(content);
    container.appendChild(overlay);

    overlay.querySelector('#classic-btn-next-level').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      overlay.classList.remove('animate-fade-in');
      overlay.classList.add('animate-fade-out');
      setTimeout(() => {
        overlay.remove();
        callback();
      }, 300);
    });
  }

  function updateBoardBackground() {
    if (!isAdventure) return;
    const l = engine.level;
    let bg = 'bg-black/5 dark:bg-white/5';
    let border = 'border-black/5 dark:border-white/5';
    
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
    
    boardEl.className = `grid gap-[3px] ${bg} p-2 rounded-3xl border ${border} shadow-inner relative transition-colors duration-1000`;
  }

  // Re-build tray pieces
  function renderTray() {
    trayEl.innerHTML = '';
    engine.activePieces.forEach((piece, idx) => {
      const itemContainer = document.createElement('div');
      itemContainer.className = 'w-full h-full flex items-center justify-center relative cursor-grab active:cursor-grabbing touch-none';
      
      if (!piece) {
        trayEl.appendChild(itemContainer);
        return;
      }

      // Draw block shape in tray mini grid
      const miniGrid = document.createElement('div');
      miniGrid.className = 'grid gap-[2px] pointer-events-none select-none';
      miniGrid.style.gridTemplateRows = `repeat(${piece.matrix.length}, minmax(0, 1fr))`;
      miniGrid.style.gridTemplateColumns = `repeat(${piece.matrix[0].length}, minmax(0, 1fr))`;

      const isTablet = window.innerWidth >= 768;
      const blockWidth = isTablet ? 22 : 14; // mini size in tray
      
      for (let r = 0; r < piece.matrix.length; r++) {
        for (let c = 0; c < piece.matrix[0].length; c++) {
          const block = document.createElement('div');
          block.style.width = `${blockWidth}px`;
          block.style.height = `${blockWidth}px`;
          block.className = 'rounded-[2px] transition-all duration-200';
          
          if (piece.matrix[r][c] === 1) {
            block.className += ` block-3d-${piece.color}`;
          } else {
            block.className += ' bg-transparent';
          }
          miniGrid.appendChild(block);
        }
      }

      itemContainer.appendChild(miniGrid);
      trayEl.appendChild(itemContainer);

      // --- DRAG AND DROP LOGIC (MOUSE + TOUCH) ---

      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let touchOffsetX = 0;
      let touchOffsetY = 60;
      let floatingEl = null;
      let currentTotalW = 0;
      let currentTotalH = 0;
      let cachedBoardLeft = 0;
      let cachedBoardTop = 0;
      let cachedBoardRight = 0;
      let cachedBoardBottom = 0;
      let cachedGridOriginX = 0;
      let cachedGridOriginY = 0;
      let cachedCellPlusGap = 0;

      // RAF handle for throttling pointermove
      let rafMoveId = null;

      const onPointerMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const pageX = e.pageX || (e.touches && e.touches[0].pageX) || e.clientX;
        const pageY = e.pageY || (e.touches && e.touches[0].pageY) || e.clientY;
        if (rafMoveId) cancelAnimationFrame(rafMoveId);
        rafMoveId = requestAnimationFrame(() => {
          if (!isDragging) return;
          positionFloatingEl(pageX - touchOffsetX, pageY - touchOffsetY);
          updateGhostPreview(pageX - touchOffsetX, pageY - touchOffsetY);
        });
      };

      const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerCancel);

        if (floatingEl) {
          floatingEl.remove();
          floatingEl = null;
        }

        clearGhostPreviews();

        if (lastGhostRow !== null && lastGhostCol !== null) {
          const isValid = engine.canPlace(piece.matrix, lastGhostRow, lastGhostCol);
          if (isValid) {
            engine.placePiece(idx, lastGhostRow, lastGhostCol);
            updateBoardUI();

            Sounds.playSfx('block-place');

            if (engine.activePieces.every(p => p !== null)) {
              renderTray();
            } else {
              const slot = trayEl.children[idx];
              if (slot) slot.innerHTML = '';
            }

            checkAndTriggerGameOver();
          } else {
            // Snap back and restore original state
            Sounds.playSfx('invalid');
            itemContainer.style.opacity = '1';
            updateBoardUI(); // Fix visual artifacts from ghost previews
          }
        } else {
          // Snap back
          itemContainer.style.opacity = '1';
          updateBoardUI(); // Fix visual artifacts from ghost previews
        }

        lastGhostRow = null;
        lastGhostCol = null;
      };

      const onPointerCancel = (e) => {
        if (!isDragging) return;
        isDragging = false;
        
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
        document.removeEventListener('pointercancel', onPointerCancel);

        if (floatingEl) {
          floatingEl.remove();
          floatingEl = null;
        }

        clearGhostPreviews();
        
        itemContainer.style.opacity = '1';
        updateBoardUI(); 
        lastGhostRow = null;
        lastGhostCol = null;
      };

      itemContainer.addEventListener('pointerdown', (e) => {
        if (engine.gameOver) return;
        e.preventDefault();
        
        isDragging = true;
        startX = e.pageX || (e.touches && e.touches[0].pageX) || e.clientX;
        startY = e.pageY || (e.touches && e.touches[0].pageY) || e.clientY;
        
        const boardRect = boardEl.getBoundingClientRect();
      cachedBoardLeft = boardRect.left + window.scrollX;
      cachedBoardTop = boardRect.top + window.scrollY;
      cachedBoardRight = boardRect.right + window.scrollX;
      cachedBoardBottom = boardRect.bottom + window.scrollY;

        const firstCell = boardEl.querySelector('[data-r="0"][data-c="0"]');
        if (firstCell) {
          const firstCellRect = firstCell.getBoundingClientRect();
        cachedGridOriginX = firstCellRect.left + window.scrollX;
        cachedGridOriginY = firstCellRect.top + window.scrollY;
        }
        
        const maxBoardWidth = Math.min(window.innerWidth - 32, (window.innerHeight - 380), 900);
        const gapCount = engine.gridSize - 1;
        const floatCellSize = Math.floor((maxBoardWidth - 16 - (gapCount * 3)) / engine.gridSize);
      cachedCellPlusGap = floatCellSize + 3;
        
        // Hide the tray item
        itemContainer.style.opacity = '0.3';
        
        createFloatingDragEl(startX, startY);
        updateGhostPreview(startX - touchOffsetX, startY - touchOffsetY);

        // Bind drag listeners globally for this active drag session
        document.addEventListener('pointermove', onPointerMove, { passive: false, signal: screenAbortController.signal });
        document.addEventListener('pointerup', onPointerUp, { signal: screenAbortController.signal });
        document.addEventListener('pointercancel', onPointerCancel, { signal: screenAbortController.signal });
      });

      const createFloatingDragEl = (clientX, clientY) => {
        floatingEl = document.createElement('div');
        floatingEl.className = 'absolute z-50 pointer-events-none opacity-90 drag-ghost-element';
        
        // Exact copy grid for floating element
        const floatGrid = document.createElement('div');
        floatGrid.className = 'grid gap-[3px]';
        floatGrid.style.gridTemplateRows = `repeat(${piece.matrix.length}, minmax(0, 1fr))`;
        floatGrid.style.gridTemplateColumns = `repeat(${piece.matrix[0].length}, minmax(0, 1fr))`;
        
        const maxBoardWidth = Math.min(window.innerWidth - 32, (window.innerHeight - 380), 900);
        const gapCount = engine.gridSize - 1;
        const floatCellSize = Math.floor((maxBoardWidth - 16 - (gapCount * 3)) / engine.gridSize);
        
        for (let r = 0; r < piece.matrix.length; r++) {
          for (let c = 0; c < piece.matrix[0].length; c++) {
            const block = document.createElement('div');
            block.style.width = `${floatCellSize}px`;
            block.style.height = `${floatCellSize}px`;
            block.className = 'rounded-md';
            
            if (piece.matrix[r][c] === 1) {
              block.className += ` block-3d-${piece.color}`;
            } else {
              block.className += ' bg-transparent';
            }
            floatGrid.appendChild(block);
          }
        }

        floatingEl.appendChild(floatGrid);
        document.body.appendChild(floatingEl);
        
        // Center float grid around touch point, offset Y by 60px above finger
        currentTotalW = (piece.matrix[0].length * floatCellSize) + ((piece.matrix[0].length - 1) * 3);
        currentTotalH = (piece.matrix.length * floatCellSize) + ((piece.matrix.length - 1) * 3);
        positionFloatingEl(clientX - touchOffsetX, clientY - touchOffsetY);
      };

      const positionFloatingEl = (centerX, centerY) => {
        if (floatingEl) {
          floatingEl.style.left = `${centerX - (currentTotalW / 2)}px`;
          floatingEl.style.top = `${centerY - (currentTotalH / 2)}px`;
        }
      };

      let currentGhostCells = [];

      const clearGhostPreviews = () => {
        currentGhostCells.forEach(c => {
            if (c.dataset.origClass) {
              c.className = c.dataset.origClass;
              c.removeAttribute('data-orig-class');
            }
            c.classList.remove('bg-green-500/30', 'bg-red-500/30', 'scale-[0.98]', 'ghost-highlight', 'brightness-[1.5]', 'scale-105', 'z-10', 'animate-pulse', 'ring-2', 'ring-white/80', 'shadow-[0_0_15px_rgba(255,255,255,0.8)]');
        });
        currentGhostCells = [];
      };

      let lastGhostRow = null;
      let lastGhostCol = null;

      // Updates ghost preview cells on grid
      const updateGhostPreview = (pageX, pageY) => {
        // The floating piece's top-left corner (piece is centered on cursor)
        const pieceLeft = pageX - (currentTotalW / 2);
        const pieceTop = pageY - (currentTotalH / 2);

        // Check if the piece center is near the board at all
        if (pageX < cachedBoardLeft - 40 || pageX > cachedBoardRight + 40 ||
            pageY < cachedBoardTop - 40 || pageY > cachedBoardBottom + 40) {
          if (lastGhostRow !== null || lastGhostCol !== null) {
            clearGhostPreviews();
            lastGhostRow = null;
            lastGhostCol = null;
          }
          return null;
        }

        // Calculate which grid cell the piece's top-left aligns to
        const relativeX = pieceLeft - cachedGridOriginX;
        const relativeY = pieceTop - cachedGridOriginY;

        const col = Math.round(relativeX / cachedCellPlusGap);
        const row = Math.round(relativeY / cachedCellPlusGap);

        if (row === lastGhostRow && col === lastGhostCol) {
          return { row, col, isValid: engine.canPlace(piece.matrix, row, col) };
        }

        lastGhostRow = row;
        lastGhostCol = col;

        clearGhostPreviews();

        const isValid = engine.canPlace(piece.matrix, row, col);

        // Draw ghost colors on corresponding cells
        for (let i = 0; i < piece.matrix.length; i++) {
          for (let j = 0; j < piece.matrix[0].length; j++) {
            if (piece.matrix[i][j] === 1) {
              const targetR = row + i;
              const targetC = col + j;
              
              if (targetR >= 0 && targetR < engine.gridSize && targetC >= 0 && targetC < engine.gridSize) {
                const cell = boardEl.querySelector(`[data-r="${targetR}"][data-c="${targetC}"]`);
                if (cell) {
                  currentGhostCells.push(cell);
                  if (isValid) {
                    cell.classList.add('bg-green-500/30', 'scale-[0.98]');
                  } else {
                    cell.classList.add('bg-red-500/30');
                  }
                }
              }
            }
          }
        }

        // Add highlight for cleared lines
        if (isValid) {
          const clears = engine.simulatePlacement(piece.matrix, row, col);
          const clearedCells = new Set();
          clears.rows.forEach(r => {
            for (let c = 0; c < engine.gridSize; c++) clearedCells.add(`${r},${c}`);
          });
          clears.cols.forEach(c => {
            for (let r = 0; r < engine.gridSize; r++) clearedCells.add(`${r},${c}`);
          });

          clearedCells.forEach(coord => {
            const [r, c] = coord.split(',').map(Number);
            const cell = boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
            if (cell) {
              if (!cell.dataset.origClass) cell.dataset.origClass = cell.className;
              currentGhostCells.push(cell);
              cell.className = cell.className.replace(/block-3d-\w+/g, '').replace(/bg-black\/10 dark:bg-white\/\d+/g, '') + ` block-3d-${piece.color} ghost-highlight brightness-[1.5] scale-105 z-10`;
            }
          });
        }
      };


    });
  };

  // Cleanup events
  engine.clearEventCallback = (detail) => {
    const clearedCount = typeof detail.lines === 'number' ? detail.lines : ((detail.lines ? detail.lines.length : 0) + (detail.rows ? detail.rows.length : 0) + (detail.cols ? detail.cols.length : 0));
    showFeedback(typeof boardWrapper !== 'undefined' ? boardWrapper : container, clearedCount);

    const isCombo = !!detail.comboText;
    
    // 1. Shake the board
    if (isCombo) {
      boardWrapper.classList.add('animate-shake'); // Harder shake can be added if defined in tailwind, reusing animate-shake for now
      setTimeout(() => boardWrapper.classList.remove('animate-shake'), 400);
    } else {
      boardWrapper.classList.add('animate-shake');
      setTimeout(() => boardWrapper.classList.remove('animate-shake'), 150); // Micro-shake for normal clears
    }

    // 2. Exploding Ghost Blocks Effect (Premium Ripple + Implode)
    const clearedCells = new Set();
    detail.rows.forEach(r => {
      for (let c = 0; c < engine.gridSize; c++) clearedCells.add(`${r},${c}`);
    });
    detail.cols.forEach(c => {
      for (let r = 0; r < engine.gridSize; r++) clearedCells.add(`${r},${c}`);
    });

    // PHASE 1: READ - Batch all DOM reads to avoid layout thrashing
    const cellData = [];
    clearedCells.forEach(coord => {
      const [r, c] = coord.split(',').map(Number);
      const cell = boardEl.querySelector(`[data-r="${r}"][data-c="${c}"]`);
      if (cell) {
        const colorClass = Array.from(cell.classList).find(cls => cls.startsWith('block-3d-'));
        if (colorClass) {
          cellData.push({
            rect: cell.getBoundingClientRect(),
            colorClass
          });
        }
      }
    });

    // PHASE 2: WRITE - Batch all DOM writes
    const fragment = document.createDocumentFragment();
    const cleanupNodes = [];

    cellData.forEach(data => {
      const { rect, colorClass } = data;
      
      // 2.1 The Ripple Shockwave
      const ripple = document.createElement('div');
      let borderColor = 'border-cyan-300';
      if (colorClass.includes('purple')) borderColor = 'border-purple-400';
      else if (colorClass.includes('orange')) borderColor = 'border-orange-400';
      else if (colorClass.includes('blue')) borderColor = 'border-blue-400';
      else if (colorClass.includes('green')) borderColor = 'border-green-400';
      else if (colorClass.includes('red')) borderColor = 'border-red-400';
      else if (colorClass.includes('magenta')) borderColor = 'border-pink-400';
      else if (colorClass.includes('yellow')) borderColor = 'border-yellow-300';

      ripple.className = `fixed z-[9998] pointer-events-none rounded-full ${borderColor} animate-ripple-out shadow-[0_0_20px_currentColor] mix-blend-screen`;
      ripple.style.width = `${rect.width}px`;
      ripple.style.height = `${rect.height}px`;
      
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      ripple.style.left = `${centerX}px`;
      ripple.style.top = `${centerY}px`;
      
      fragment.appendChild(ripple);
      cleanupNodes.push(ripple);
      
      // 2.2 The Imploding Glow Block
      const implodeBlock = document.createElement('div');
      implodeBlock.className = `fixed z-[9999] pointer-events-none rounded-lg ${colorClass} animate-block-implode`;
      implodeBlock.style.width = `${rect.width}px`;
      implodeBlock.style.height = `${rect.height}px`;
      implodeBlock.style.left = `${rect.left}px`;
      implodeBlock.style.top = `${rect.top}px`;
      
      fragment.appendChild(implodeBlock);
      cleanupNodes.push(implodeBlock);
    });

    // Append everything at once
    document.body.appendChild(fragment);

    setTimeout(() => {
      cleanupNodes.forEach(node => {
        if (node.parentNode) node.remove();
      });
    }, 650);

    // 3. Show floating text popup over board with better animation
    const floating = document.createElement('div');
    
    if (isCombo) {
      // Huge glowing centered combo text
      floating.className = 'absolute z-50 flex flex-col items-center justify-center pointer-events-none';
      floating.innerHTML = `
        <div class="relative flex flex-col items-center justify-center">
          <!-- Glow behind text -->
          <div class="absolute inset-0 bg-yellow-400 blur-2xl opacity-50 rounded-full scale-150 animate-pulse"></div>
          
          <div class="relative z-10 text-[2.5rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-100 via-yellow-400 to-orange-500 drop-shadow-[0_4px_10px_rgba(251,146,60,0.8)] leading-none italic uppercase tracking-tighter text-center" style="transform: rotate(-5deg);">
            ${detail.comboText}
          </div>
          <div class="relative z-10 text-3xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,229,255,1)] mt-1 animate-bounce" style="transform: rotate(2deg);">
            +${detail.points}
          </div>
        </div>
      `;
    } else {
      // Small randomized pop for normal clears
      floating.className = 'absolute z-50 bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-extrabold px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(0,229,255,0.6)] text-lg pointer-events-none transition-all duration-700 ease-out';
      floating.textContent = `+${detail.points}`;
    }
    
    // Position: Center exactly for combos, slightly random for normal clears
    const randomOffsetX = isCombo ? 0 : (Math.random() - 0.5) * 60;
    const randomOffsetY = isCombo ? 0 : (Math.random() - 0.5) * 60;
    
    floating.style.left = `calc(50% + ${randomOffsetX}px)`;
    floating.style.top = `calc(50% + ${randomOffsetY}px)`;
    floating.style.transform = 'translate(-50%, -50%)';
    
    boardEl.appendChild(floating);

    // Make the standard text float up and fade
    if (!isCombo) {
      requestAnimationFrame(() => {
        floating.style.transform = 'translate(-50%, -200%) scale(1.1)';
        floating.style.opacity = '0';
      });
      setTimeout(() => floating.remove(), 1200);
    } else {
      // Combo text zooms in, lingers, then fades out beautifully
      floating.style.transform = 'translate(-50%, -50%) scale(0.1)';
      floating.style.opacity = '0';
      floating.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'; // springy pop
      
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
  };

  setTimeout(() => {
    if (!container.isConnected) return;
    renderBoard();
    renderTray();
    updateBoardUI();
    updateUndoUI();
    updateHammerUI();
    // Start background game music
    Sounds.startMusic('game');
    
    // Initial game over check just in case loaded board is blocked
    checkAndTriggerGameOver();

    // Check and show tutorial for new users
    checkAndShowTutorial(isAdventure ? 'adventure' : 'classic');
  }, 100);

  // Undo Button Hook
  const undoBtn = container.querySelector('#btn-undo');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      const costs = [50, 150, 300];
      const currentCost = costs[engine.undoCount];

      if (engine.historyStack.length > 0 && engine.undoCount < costs.length && PlayerState.state.diamonds < currentCost) {
        // Show Not Enough Diamonds Modal
        const modal = createModal({
          title: t('not_enough_diamonds') || 'Yetersiz Elmas',
          content: `
            <div class="flex flex-col items-center p-4">
              <span class="text-5xl mb-3 drop-shadow-md">💎</span>
              <p class="text-sm font-bold text-gray-400 mb-6 text-center">${t('need_diamonds_undo') ? t('need_diamonds_undo').replace('{cost}', currentCost) : `Geri almak için ${currentCost} elmasa ihtiyacınız var!`}</p>
              
              <div class="w-full flex flex-col gap-3">
                <button id="modal-watch-ad" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
                  <span class="material-symbols-outlined">play_circle</span>
                  <span>${t('watch_ad_use_undo') || 'Reklam İzle & Geri Al'}</span>
                </button>
                <button id="modal-buy-diamonds" class="w-full py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary dark:text-white rounded-2xl font-bold active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center gap-2">
                  <span class="material-symbols-outlined">shopping_cart</span>
                  <span>${t('buy_diamonds_title') || 'Elmas Satın Al'}</span>
                </button>
              </div>
            </div>
          `,
          actions: [] // No standard actions, we have custom buttons
        });

        // Close btn wrapper
        const closeBtn = document.createElement('button');
        closeBtn.className = 'absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-full text-gray-500 hover:text-primary dark:hover:text-white transition-colors';
        closeBtn.innerHTML = '<span class="material-symbols-outlined text-lg">close</span>';
        closeBtn.onclick = () => modal.close();
        modal.querySelector('.glass-card').appendChild(closeBtn);

        modal.querySelector('#modal-watch-ad').addEventListener('click', async () => {
          Sounds.playSfx('button-tap');
          const success = await AdService.showInterstitial();
          if (success) {
            modal.close();
            // Provide exact diamonds needed for this undo
            PlayerState.addDiamonds(currentCost);
            const engineSuccess = engine.undo();
            if (engineSuccess) {
              updateBoardUI();
              renderTray();
              updateUndoUI();
            }
          }
        });

        modal.querySelector('#modal-buy-diamonds').addEventListener('click', () => {
          Sounds.playSfx('button-tap');
          modal.close();
          import('../components/shopModal.js').then(({ showShopModal }) => {
            showShopModal();
          });
        });
      } else if (engine.historyStack.length > 0 && engine.undoCount < costs.length) {
        const success = engine.undo();
        if (success) {
          updateBoardUI();
          renderTray();
          updateUndoUI();
        }
      } else {
        Toast.show(t('no_undo_left') || 'Geri alınacak hamle yok!', 'warning');
      }
    });
  }

  // Hammer Button Hook
  const hammerBtn = container.querySelector('#btn-hammer');
  if (hammerBtn) {
    hammerBtn.addEventListener('click', () => {
      if (activePowerup === 'hammer') {
        activePowerup = null;
        boardEl.classList.remove('cursor-crosshair');
        return;
      }

      const costs = [50, 150, 300];
      const currentCost = costs[engine.hammerCount];

      if (engine.hammerCount < costs.length && PlayerState.state.diamonds < currentCost) {
        const modal = createModal({
          title: t('not_enough_diamonds') || 'Yetersiz Elmas',
          content: `
            <div class="flex flex-col items-center p-4">
              <span class="text-5xl mb-3 drop-shadow-md">💎</span>
              <p class="text-sm font-bold text-gray-400 mb-6 text-center">Çekiç kullanmak için ${currentCost} elmasa ihtiyacınız var!</p>
              
              <div class="w-full flex flex-col gap-3">
                <button id="modal-watch-ad" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
                  <span class="material-symbols-outlined">play_circle</span>
                  <span>Reklam İzle & Çekiç Kullan</span>
                </button>
                <button id="modal-buy-diamonds" class="w-full py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary dark:text-white rounded-2xl font-bold active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center gap-2">
                  <span class="material-symbols-outlined">shopping_cart</span>
                  <span>Elmas Satın Al</span>
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

        modal.querySelector('#modal-watch-ad').addEventListener('click', async () => {
          Sounds.playSfx('button-tap');
          const success = await AdService.showInterstitial();
          if (success) {
            modal.close();
            PlayerState.addDiamonds(currentCost);
            activePowerup = 'hammer';
            Toast.show(t('click_to_break') || 'Kırmak istediğiniz bloğa dokunun', 'info');
            boardEl.classList.add('cursor-crosshair');
          }
        });

        modal.querySelector('#modal-buy-diamonds').addEventListener('click', () => {
          Sounds.playSfx('button-tap');
          modal.close();
          import('../components/shopModal.js').then(({ showShopModal }) => {
            showShopModal();
          });
        });

      } else if (engine.hammerCount < costs.length) {
        activePowerup = 'hammer';
        Toast.show(t('click_to_break') || 'Kırmak istediğiniz bloğa dokunun', 'info');
        boardEl.classList.add('cursor-crosshair');
      } else {
        Toast.show(t('max_hammer_reached') || 'Maksimum çekiç hakkını doldurdun!', 'warning');
      }
    });
  }

  // Help Button Hook
  const helpBtn = container.querySelector('#btn-help');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      checkAndShowTutorial(isAdventure ? 'adventure' : 'classic', true);
    });
  }

  // Cleanup listeners
  container.cleanup = () => {
    screenAbortController.abort();
    if (topBar.cleanup) topBar.cleanup();
    Sounds.stopMusic();
    AdService.hideBanner();
  };

  // Show banner when screen opens
  AdService.showBanner();

  // Banner spacer to prevent overlapping
  const bannerSpacer = document.createElement('div');
  bannerSpacer.className = 'w-full h-[65px] pointer-events-none shrink-0';
  container.appendChild(bannerSpacer);

  return container;
}
