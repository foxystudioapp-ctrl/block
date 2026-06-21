import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { Storage } from '../utils/storage.js';
import { Sounds } from '../utils/sounds.js';
import { TaskState } from '../state/taskState.js';
import { Haptics } from '../utils/haptics.js';
import { showGameOverModal } from './gameOver.js';
import { Engine2048 } from '../game/2048Engine.js';
import { checkAndShowTutorial } from '../components/tutorial.js';
import { t } from '../utils/i18n.js';
import { showQuitConfirmation } from '../utils/quitConfirm.js';
import { showUndoAdModal } from '../components/adModal.js';
import { AdService } from '../services/adService.js';
import { createModal } from '../components/modal.js';
import { Toast } from '../components/toast.js';

export function Game2048(router) {
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] overflow-hidden flex flex-col bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-pop-up relative pb-2 sm:pb-3 md:pb-6 lg:pb-10';

  const hashObj = new URL('http://dummy.com' + window.location.hash.replace('#/2048', ''));
  const mode = hashObj.searchParams.get('mode') || 'endless';
  const level = mode === 'adventure' ? PlayerState.state.g2048AdventureLevel || 1 : 1;

  let engine = new Engine2048(mode, level);
  
  const topBar = createTopBar(t('menu_2048') || '2048', true, () => {
    showQuitConfirmation(router);
  });
  container.appendChild(topBar);

  const subControls = document.createElement('div');
  subControls.className = 'px-4 md:px-6 lg:px-8 pt-1.5 md:pt-3 lg:pt-4 pb-0 flex items-center justify-between w-full z-30';
  subControls.innerHTML = `
    <!-- Left: Help -->
    <button id="btn-help" class="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-black/10 dark:border-white/10 shadow-sm active:scale-90 transition-transform text-red-500 dark:text-red-400">
      <span class="material-symbols-outlined text-[18px] md:text-[20px] lg:text-[22px]">help</span>
    </button>

      <!-- Right: Undo -->
      <button id="btn-undo" class="flex items-center gap-1.5 px-2.5 md:px-3 lg:px-4 py-1 md:py-1.5 rounded-full bg-white dark:bg-primary-container border border-black/5 dark:border-white/5 shadow-sm active:scale-95 transition-all shrink-0">
        <span class="material-symbols-outlined text-[14px] md:text-[16px] lg:text-[18px]">undo</span>
        <span class="text-[9px] md:text-[11px] lg:text-[13px] font-black tracking-tight leading-none uppercase text-gray-700 dark:text-gray-200">${t('undo')}</span>
        <div id="undo-badge" class="flex items-center gap-0.5 bg-cyan-500/10 dark:bg-cyan-500/20 px-1.5 py-0.5 rounded-full ml-0.5 transition-all">
          <span class="material-symbols-outlined text-[10px] md:text-[12px] lg:text-[14px] fill text-cyan-500 dark:text-cyan-400">diamond</span>
          <span id="undo-cost" class="text-[10px] md:text-[11px] lg:text-[13px] font-black text-cyan-600 dark:text-cyan-300 leading-none">50</span>
        </div>
      </button>
  `;
  container.appendChild(subControls);

  const scoreSection = document.createElement('div');
  scoreSection.className = 'px-4 py-1 mt-4 sm:mt-6 md:mt-[6vh] lg:mt-[8vh] flex justify-between items-center w-full z-10';
  scoreSection.innerHTML = mode === 'adventure' ? `
    <div class="flex flex-col items-center justify-center flex-1">
      <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1 drop-shadow-md">
        <div class="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
        <div class="absolute inset-0 rounded-full border-4 border-t-indigo-400 rotate-45"></div>
        <div class="bg-gradient-to-br from-indigo-500 to-purple-600 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
          <span id="game2048-lvl" class="text-xl md:text-2xl lg:text-3xl font-black text-white drop-shadow-sm leading-none">${engine.level}</span>
        </div>
        <div class="absolute -top-1.5 -right-1.5 text-sm md:text-base lg:text-xl drop-shadow-md">👑</div>
      </div>
      <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider">${t('level').toUpperCase()}</span>
    </div>

    <div class="flex-1 flex flex-col items-center justify-center text-center pb-2 px-2">
      <span class="text-[10px] md:text-xs font-black text-gray-400 tracking-wider mb-0.5">${t('score').toUpperCase()}</span>
      <span id="game2048-score" class="text-[22px] md:text-[28px] lg:text-[36px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-sm tracking-tight leading-none">${engine.score}</span>
      <div class="w-[85%] md:w-[90%] bg-black/10 dark:bg-white/10 rounded-full h-1.5 mb-1.5 mt-2 relative overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
        <div id="game2048-level-progress" class="bg-gradient-to-r from-rose-400 to-orange-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(251,146,60,0.6)]" style="width: ${Math.min(100, (engine.levelScore / engine.targetScore) * 100)}%"></div>
      </div>
      <span class="text-[9px] md:text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">${t('target') || 'Hedef'}: <span id="game2048-target">${engine.targetScore.toLocaleString()}</span></span>
    </div>

    <div class="flex flex-col items-center justify-center flex-1">
      <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1">
        <div class="absolute inset-0 rounded-full border-2 border-orange-500/30"></div>
        <div class="bg-gradient-to-br from-gray-300 to-gray-500 dark:from-slate-600 dark:to-slate-800 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
          <span class="material-symbols-outlined text-white text-lg md:text-xl lg:text-3xl drop-shadow-sm">emoji_events</span>
        </div>
      </div>
      <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider mb-0.5">${t('record').toUpperCase()}</span>
      <span id="game2048-best" class="text-sm md:text-base lg:text-xl font-black text-gray-500">${PlayerState.state.bestScore2048 || 0}</span>
    </div>
  ` : `
    <div class="flex flex-col items-center justify-center flex-1">
      <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1 drop-shadow-md opacity-60">
        <div class="text-3xl md:text-4xl lg:text-5xl">♾️</div>
      </div>
      <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider">${(t('mode_classic') || 'KLASİK').toUpperCase()}</span>
    </div>

    <div class="flex flex-col items-center justify-center flex-1.5 px-2">
      <span class="text-[10px] md:text-xs lg:text-sm font-black text-gray-400 tracking-wider mb-0.5">${t('score').toUpperCase()}</span>
      <span id="game2048-score" class="text-[32px] md:text-[40px] lg:text-[52px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-sm tracking-tight leading-none">${engine.score}</span>
    </div>

    <div class="flex flex-col items-center justify-center flex-1">
      <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1">
        <div class="absolute inset-0 rounded-full border-2 border-orange-500/30"></div>
        <div class="bg-gradient-to-br from-gray-300 to-gray-500 dark:from-slate-600 dark:to-slate-800 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
          <span class="material-symbols-outlined text-white text-lg md:text-xl lg:text-3xl drop-shadow-sm">emoji_events</span>
        </div>
      </div>
      <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider mb-0.5">${t('record').toUpperCase()}</span>
      <span id="game2048-best" class="text-sm md:text-base lg:text-xl font-black text-gray-500">${PlayerState.state.bestScore2048 || 0}</span>
    </div>
  `;
  container.appendChild(scoreSection);

  const content = document.createElement('main');
  content.className = 'flex-1 flex flex-col items-center justify-center px-4 pt-2 md:pt-4 pb-4 md:pb-8 space-y-4 relative overflow-hidden min-h-0';

  const boardWrapper = document.createElement('div');
  boardWrapper.className = 'bg-black/5 dark:bg-slate-800/80 p-2 rounded-[2rem] border border-black/5 dark:border-slate-700/50 shadow-inner relative mx-auto shrink-0 -mt-6 sm:-mt-8 md:-mt-10 lg:-mt-[6vh]';
  
  const w = window.innerWidth;
  const topReserved  = w >= 1024 ? 260 : w >= 768 ? 240 : 220;
  const botReserved  = w >= 1024 ? 140 : w >= 768 ? 120 : (window.innerHeight < 700 ? 155 : 200);
  const maxFromHeight = window.innerHeight - topReserved - botReserved;
  const maxFromWidth  = w - (w >= 1024 ? 80 : 32);
  const capWidth      = w >= 1024 ? 600 : w >= 768 ? 500 : 460;
  const maxBoardWidth = Math.min(maxFromWidth, maxFromHeight, capWidth);
  boardWrapper.style.width = `${maxBoardWidth}px`;
  boardWrapper.style.height = `${maxBoardWidth}px`;
  
  const boardEl = document.createElement('div');
  boardEl.id = 'game-board';
  boardEl.className = 'w-full h-full grid grid-cols-4 grid-rows-4 gap-2 relative z-10';
  
  boardWrapper.appendChild(boardEl);
  content.appendChild(boardWrapper);
  container.appendChild(content);

  // Cached cell grid — cells created once, updated in-place (no innerHTML wipe on each move)
  const cellGrid = [];
  // Cached score/UI DOM refs (populated after HTML is rendered)
  let elScorePc, elScoreMobile, elBestPc, elBestMobile;
  let cachedUndoBtn, cachedUndoCostEl, cachedUndoBadgeEl;

  const getTileColor = (val) => {
    const colors = {
      2: 'bg-gray-200 text-gray-700',
      4: 'bg-gray-300 text-gray-800',
      8: 'bg-orange-300 text-white',
      16: 'bg-orange-400 text-white shadow-orange-500/50',
      32: 'bg-orange-500 text-white shadow-orange-600/50',
      64: 'bg-red-500 text-white shadow-red-600/50',
      128: 'bg-yellow-400 text-white shadow-yellow-500/50',
      256: 'bg-yellow-500 text-white shadow-yellow-600/50',
      512: 'bg-green-400 text-white shadow-green-500/50',
      1024: 'bg-green-500 text-white shadow-green-600/50',
      2048: 'bg-cyan-500 text-white shadow-cyan-600/50 shadow-lg',
      4096: 'bg-blue-500 text-white shadow-blue-600/50 shadow-lg',
      8192: 'bg-purple-500 text-white shadow-purple-600/50 shadow-lg',
    };
    return colors[val] || 'bg-gray-900 text-white';
  };

  const getTileFontSize = (val) => {
    if (val < 100) return 'text-3xl';
    if (val < 1000) return 'text-2xl';
    if (val < 10000) return 'text-xl';
    return 'text-lg';
  };

  // Build cell grid ONCE — avoids full DOM teardown on every move
  const initBoardCells = () => {
    boardEl.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let r = 0; r < engine.gridSize; r++) {
      cellGrid[r] = [];
      for (let c = 0; c < engine.gridSize; c++) {
        const cell = document.createElement('div');
        cell.className = 'w-full h-full rounded-2xl flex items-center justify-center font-black transition-all duration-200 bg-black/5 dark:bg-white/5';
        cellGrid[r][c] = cell;
        frag.appendChild(cell);
      }
    }
    boardEl.appendChild(frag);
  };

  // Update cells in-place — O(16) className+textContent only on changed cells
  const updateBoardUI = () => {
    for (let r = 0; r < engine.gridSize; r++) {
      for (let c = 0; c < engine.gridSize; c++) {
        const val = engine.grid[r][c];
        const cell = cellGrid[r][c];
        if (val !== 0) {
          cell.className = `w-full h-full rounded-2xl flex items-center justify-center font-black transition-all duration-200 shadow-md ${getTileColor(val)} ${getTileFontSize(val)}`;
          cell.textContent = val;
        } else {
          cell.className = 'w-full h-full rounded-2xl flex items-center justify-center font-black transition-all duration-200 bg-black/5 dark:bg-white/5';
          cell.textContent = '';
        }
      }
    }
  };

  const updateScore = () => {
    const scoreStr = engine.score.toLocaleString();
    if (elScoreMobile) elScoreMobile.textContent = scoreStr;
    
    if (mode === 'adventure') {
      const elProgress = container.querySelector('#game2048-level-progress');
      if (elProgress) {
        elProgress.style.width = `${Math.min(100, (engine.levelScore / engine.targetScore) * 100)}%`;
      }
      
      if (engine.levelUpReady) {
        engine.levelUpReady = false;
        showLevelUpModal();
      }
    }
    
    if (!PlayerState.state.bestScore2048) PlayerState.state.bestScore2048 = 0;
    if (engine.score > PlayerState.state.bestScore2048) {
      PlayerState.state.bestScore2048 = engine.score;
      PlayerState.save();
      const bestStr = PlayerState.state.bestScore2048.toLocaleString();
      if (elBestMobile) elBestMobile.textContent = bestStr;
    }
  };

  function showLevelUpModal() {
    AdService.showForcedInterstitial('levelup');
    import('../components/modal.js').then(({ createModal }) => {
      Sounds.playSfx('level-up');
      const modal = createModal({
        title: t('level_complete') || 'Bölüm Tamamlandı!',
        onClose: () => {},
        content: `
          <div class="flex flex-col items-center justify-center text-center gap-4 py-4">
            <div class="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(251,146,60,0.4)] animate-bounce-soft">
              <span class="text-4xl">⭐</span>
            </div>
            <div>
              <h3 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500 tracking-tight">Tebrikler!</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">${engine.level}. Seviyeyi tamamladın.</p>
            </div>
            
            <div class="w-full bg-black/5 dark:bg-white/5 rounded-2xl p-4 flex justify-between items-center mt-2 border border-black/10 dark:border-white/10">
              <div class="flex flex-col items-start">
                <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sonraki Seviye</span>
                <span class="text-xl font-black text-gray-800 dark:text-gray-200">${engine.level + 1}</span>
              </div>
              <span class="material-symbols-outlined text-gray-300 dark:text-gray-600 text-3xl">arrow_forward</span>
            </div>
          </div>
        `,
        actions: [
          {
            text: t('next_level') || 'Sonraki Seviye',
            primary: true,
            onClick: () => {
              modal.close();
              engine.nextLevel();
              PlayerState.state.g2048AdventureLevel = engine.level;
              PlayerState.save();
              const elLvl = container.querySelector('#game2048-lvl');
              if (elLvl) elLvl.textContent = engine.level;
              const elTarget = container.querySelector('#game2048-target');
              if (elTarget) elTarget.textContent = engine.targetScore.toLocaleString();
              updateScore();
            }
          }
        ]
      });
    });
  }

  const updateUndoUI = () => {
    const undoBtn = cachedUndoBtn;
    const undoCostEl = cachedUndoCostEl;
    const badgeEl = cachedUndoBadgeEl;
    if (!undoBtn || !undoCostEl) return;
      const costs = [50, 150, 300];
      if (engine.undoCount >= costs.length) {
        undoBtn.classList.add('opacity-50', 'pointer-events-none');
        badgeEl.classList.remove('bg-cyan-500/10', 'dark:bg-cyan-500/20');
        badgeEl.classList.add('bg-gray-500/10', 'dark:bg-gray-500/20');
        undoCostEl.classList.remove('text-cyan-600', 'dark:text-cyan-300');
        undoCostEl.classList.add('text-gray-600', 'dark:text-gray-400');
        undoCostEl.textContent = 'MAX';
        badgeEl.querySelector('.material-symbols-outlined').style.display = 'none';
      } else {
        undoBtn.classList.remove('opacity-50', 'pointer-events-none');
        badgeEl.classList.add('bg-cyan-500/10', 'dark:bg-cyan-500/20');
        badgeEl.classList.remove('bg-gray-500/10', 'dark:bg-gray-500/20');
        undoCostEl.classList.add('text-cyan-600', 'dark:text-cyan-300');
        undoCostEl.classList.remove('text-gray-600', 'dark:text-gray-400');
        undoCostEl.textContent = costs[engine.undoCount];
        badgeEl.querySelector('.material-symbols-outlined').style.display = 'inline';
      }
  };

  const handleInput = (direction) => {
    if (engine.gameOver) return;
    
    const result = engine.move(direction);
    if (result.moved) {
      if (result.score > 0) {
        Sounds.playSfx('merge');
        Haptics.vibrate('combo');
      } else {
        Sounds.playSfx('block-place');
        Haptics.vibrate('button-tap');
      }
      
      updateBoardUI();
      updateScore();
      updateUndoUI();
      
      if (engine.gameOver) {
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
                    <span>${t('revive_diamonds_2048') || '300 Elmas Harca'}</span>
                  </button>
                  <button id="modal-revive-ad" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">play_circle</span>
                    <span>${t('revive_ad_2048') || 'Reklam İzle & Devam Et'}</span>
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
            initBoardCells();
            updateBoardUI();
          };

          const showActualGameOver = () => {
            container.isGameOverModalOpen = false;
            modal.close();
            setTimeout(() => {
              Sounds.playSfx('game-over');
              Haptics.vibrate('game-over');
              showGameOverModal({
                score: engine.score,
                mode: mode === 'adventure' ? 'g2048_adventure' : 'g2048',
                onPlayAgain: () => {
                  if (mode === 'adventure') {
                    engine.restartCurrentLevel();
                  } else {
                    engine = new Engine2048(mode, level);
                  }
                  initBoardCells();
                  updateBoardUI();
                  updateScore();
                  updateUndoUI();
                },
                onMainMenu: () => {
                  router.navigate('#/menu');
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
            const success = await AdService.showInterstitial();
            if (success) {
              doRevive();
            }
          });

          modal.querySelector('#modal-revive-giveup').addEventListener('click', () => {
            Sounds.playSfx('button-tap');
            showActualGameOver();
          });
        }
      } else if (engine.won && !engine.keptPlaying) {
        engine.keptPlaying = true;
        Sounds.playSfx('new-record');
        alert(t('win') || "Tebrikler! 2048'e ulaştınız!");
      } else if (mode !== 'adventure') {
        // Sonsuz modda periyodik reklam kontrolü
        AdService.showForcedInterstitial('periodic');
      }
    } else {
      // Invalid move
    }
  };

  const onKeyDown = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      const dirMap = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
      };
      handleInput(dirMap[e.key]);
    }
  };

  window.addEventListener('keydown', onKeyDown);

  let swipeStartX = 0;
  let swipeStartY = 0;

  const onPointerDown = (e) => {
    if (e.touches) {
      swipeStartX = e.touches[0].clientX;
      swipeStartY = e.touches[0].clientY;
    } else {
      swipeStartX = e.clientX;
      swipeStartY = e.clientY;
    }
  };

  const onPointerUp = (e) => {
    let swipeEndX = 0;
    let swipeEndY = 0;
    if (e.changedTouches) {
      swipeEndX = e.changedTouches[0].clientX;
      swipeEndY = e.changedTouches[0].clientY;
    } else {
      swipeEndX = e.clientX;
      swipeEndY = e.clientY;
    }
    
    const dx = swipeEndX - swipeStartX;
    const dy = swipeEndY - swipeStartY;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      if (Math.abs(dx) > 30) {
        handleInput(dx > 0 ? 'right' : 'left');
      }
    } else {
      if (Math.abs(dy) > 30) {
        handleInput(dy > 0 ? 'down' : 'up');
      }
    }
    
    swipeStartX = 0;
    swipeStartY = 0;
  };

  boardWrapper.addEventListener('touchstart', onPointerDown, { passive: true });
  boardWrapper.addEventListener('touchend', onPointerUp, { passive: true });
  boardWrapper.addEventListener('mousedown', onPointerDown);
  boardWrapper.addEventListener('mouseup', onPointerUp);

  // Init board cells once, cache DOM refs, then render
  initBoardCells();
  elScoreMobile = container.querySelector('#game2048-score');
  elBestMobile = container.querySelector('#game2048-best');
  cachedUndoBtn = container.querySelector('#btn-undo');
  cachedUndoCostEl = container.querySelector('#undo-cost');
  cachedUndoBadgeEl = container.querySelector('#undo-badge');
  updateBoardUI();
  updateScore();
  updateUndoUI();
  
  setTimeout(() => {
    if (container.isConnected) {
      checkAndShowTutorial('2048');
    }
  }, 300);

  container.cleanup = () => {
    window.removeEventListener('keydown', onKeyDown);
    if (topBar.cleanup) topBar.cleanup();
    Sounds.stopMusic();
  
    AdService.hideBanner();};

  if (cachedUndoBtn) {
    cachedUndoBtn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      Haptics.vibrate('button-tap');

      const costs = [50, 150, 300];
      const currentCost = costs[engine.undoCount];
      
      if (engine.history && engine.history.length > 0 && engine.undoCount < costs.length && PlayerState.state.diamonds < currentCost) {
        showUndoAdModal(currentCost, () => {
          if (engine.undo()) {
            Sounds.playSfx('undo');
            updateBoardUI();
            updateScore();
            updateUndoUI();
          }
        });
        return;
      }

      if (engine.undo()) {
        Sounds.playSfx('undo');
        updateBoardUI();
        updateScore();
        updateUndoUI();
      }
    });
  }

  const helpBtn = container.querySelector('#btn-help');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      checkAndShowTutorial('2048', true);
    });
  }

  if (typeof PlayerState.state.bestScore2048 === 'undefined') {
    PlayerState.state.bestScore2048 = 0;
    PlayerState.save();
    if (elBestMobile) elBestMobile.textContent = '0';
  } else {
    if (elBestMobile) elBestMobile.textContent = PlayerState.state.bestScore2048.toLocaleString();
  }

  Sounds.startMusic('game');

  // Show banner when screen opens
  AdService.showBanner();

  // Banner spacer to prevent overlapping
  const bannerSpacer = document.createElement('div');
  bannerSpacer.className = 'w-full h-[65px] pointer-events-none shrink-0';
  container.appendChild(bannerSpacer);



  return container;
}
