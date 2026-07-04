import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { Storage } from '../utils/storage.js';
import { Sounds } from '../utils/sounds.js';
import { TaskState } from '../state/taskState.js';
import { Haptics } from '../utils/haptics.js';
import { showGameOverModal } from './gameOver.js';
import { checkAndShowTutorial } from '../components/tutorial.js';
import { MergeEngine } from '../game/mergeEngine.js';
import { t } from '../utils/i18n.js';
import { showQuitConfirmation } from '../utils/quitConfirm.js';
import { formatBlockValue } from '../utils/numberFormat.js';
import { showUndoAdModal } from '../components/adModal.js';
import { AdService } from '../services/adService.js';
import { createModal } from '../components/modal.js';
import { Toast } from '../components/toast.js';

export function MergeBlock(router) {
  const isShortScreen = window.innerHeight < 700;
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] overflow-hidden flex flex-col bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-pop-up relative pb-2 sm:pb-3 md:pb-6 lg:pb-10';

  const hashObj = new URL('http://dummy.com' + window.location.hash.replace('#/merge', ''));
  const mode = hashObj.searchParams.get('mode') || 'endless';
  const level = mode === 'adventure' ? PlayerState.state.mergeAdventureLevel || 1 : 1;

  let engine = new MergeEngine(mode, level);

  const topBar = createTopBar(t('menu_merge') || 'Merge Block', true, () => {
    showQuitConfirmation(router);
  });
  container.appendChild(topBar);

  const subControls = document.createElement('div');
  subControls.className = `px-4 md:px-6 lg:px-8 pb-0 flex items-center justify-between w-full z-30 ${isShortScreen ? 'pt-2' : 'pt-3 md:pt-4 lg:pt-5'}`;
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
  scoreSection.className = `px-4 flex justify-between items-center w-full z-10 ${isShortScreen ? 'py-0 mt-0' : 'py-2 sm:py-3 mt-2 sm:mt-4 md:mt-[3vh]'}`;
  scoreSection.innerHTML = mode === 'adventure' ? `
    <div class="flex flex-col items-center justify-center flex-1">
      <div class="relative w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1 drop-shadow-md">
        <div class="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
        <div class="absolute inset-0 rounded-full border-4 border-t-indigo-400 rotate-45"></div>
        <div class="bg-gradient-to-br from-indigo-500 to-purple-600 w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
          <span id="merge-lvl" class="text-xl sm:text-3xl lg:text-4xl font-black text-white drop-shadow-sm leading-none">${engine.level}</span>
        </div>
        <div class="absolute -top-1.5 -right-1.5 text-sm sm:text-lg lg:text-xl drop-shadow-md">⭐</div>
      </div>
      <span class="text-[9px] sm:text-[12px] lg:text-[14px] font-black text-gray-400 tracking-wider">${t('level').toUpperCase()}</span>
    </div>

    <div class="flex-1 flex flex-col items-center justify-center text-center pb-2 px-2">
      <span class="text-[10px] sm:text-[13px] lg:text-[15px] font-black text-gray-400 tracking-wider mb-0.5">${t('score').toUpperCase()}</span>
      <span id="merge-score" class="text-[32px] sm:text-[44px] lg:text-[56px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-sm tracking-tight leading-none">${engine.score}</span>
      <div class="w-[85%] md:w-[90%] bg-black/10 dark:bg-white/10 rounded-full h-1.5 mb-1.5 mt-2 relative overflow-hidden ring-1 ring-black/5 dark:ring-white/5">
        <div id="merge-level-progress" class="bg-gradient-to-r from-rose-400 to-orange-500 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(251,146,60,0.6)]" style="width: ${Math.min(100, (engine.levelScore / engine.targetScore) * 100)}%"></div>
      </div>
      <span class="text-[9px] md:text-[10px] font-bold text-gray-400/80 uppercase tracking-widest">${t('target') || 'Hedef'}: <span id="merge-target">${engine.targetScore.toLocaleString()}</span></span>
    </div>

    <div class="flex flex-col items-center justify-center flex-1">
      <div class="relative w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1">
        <div class="absolute inset-0 rounded-full border-2 border-orange-500/30"></div>
        <div class="bg-gradient-to-br from-gray-300 to-gray-500 dark:from-slate-600 dark:to-slate-800 w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
          <span class="material-symbols-outlined text-white text-lg sm:text-2xl lg:text-3xl drop-shadow-sm">emoji_events</span>
        </div>
      </div>
      <span class="text-[9px] sm:text-[12px] lg:text-[14px] font-black text-gray-400 tracking-wider mb-0.5">${t('record').toUpperCase()}</span>
      <span id="merge-best" class="text-sm sm:text-lg lg:text-2xl font-black text-gray-500">${PlayerState.state.bestScoreMerge || 0}</span>
    </div>
  ` : `
    <div class="flex flex-col items-center justify-center flex-1">
      <div class="relative w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1 drop-shadow-md opacity-60">
        <div class="text-3xl sm:text-4xl lg:text-5xl">♾️</div>
      </div>
      <span class="text-[9px] sm:text-[12px] lg:text-[14px] font-black text-gray-400 tracking-wider">${(t('mode_classic') || 'KLASİK').toUpperCase()}</span>
    </div>

    <div class="flex flex-col items-center justify-center flex-1.5 px-2">
      <span class="text-[10px] sm:text-[13px] lg:text-[15px] font-black text-gray-400 tracking-wider mb-0.5">${t('score').toUpperCase()}</span>
      <span id="merge-score" class="text-[32px] sm:text-[44px] lg:text-[56px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-sm tracking-tight leading-none">${engine.score}</span>
    </div>

    <div class="flex flex-col items-center justify-center flex-1">
      <div class="relative w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1">
        <div class="absolute inset-0 rounded-full border-2 border-orange-500/30"></div>
        <div class="bg-gradient-to-br from-gray-300 to-gray-500 dark:from-slate-600 dark:to-slate-800 w-10 h-10 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
          <span class="material-symbols-outlined text-white text-lg sm:text-2xl lg:text-3xl drop-shadow-sm">emoji_events</span>
        </div>
      </div>
      <span class="text-[9px] sm:text-[12px] lg:text-[14px] font-black text-gray-400 tracking-wider mb-0.5">${t('record').toUpperCase()}</span>
      <span id="merge-best" class="text-sm sm:text-lg lg:text-2xl font-black text-gray-500">${PlayerState.state.bestScoreMerge || 0}</span>
    </div>
  `;
  container.appendChild(scoreSection);

  const content = document.createElement('main');
  content.className = `flex-1 flex flex-col items-center justify-center px-4 relative overflow-hidden min-h-0 ${isShortScreen ? 'pt-0 pb-2 space-y-2' : 'pt-2 md:pt-4 pb-4 md:pb-8 space-y-4'}`;

  // Board container
  const boardWrapper = document.createElement('div');
  boardWrapper.className = 'bg-black/5 dark:bg-white/5 p-3 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-inner relative mx-auto shrink-0';
  
  // Adjusted reservedHeight based on device type
  const w = window.innerWidth;
  const topReserved  = w >= 1024 ? 260 : w >= 768 ? 240 : (isShortScreen ? 180 : 220);
  const botReserved  = w >= 1024 ? 160 : w >= 768 ? 140 : (isShortScreen ? 120 : 140);
  const maxFromHeight = window.innerHeight - topReserved - botReserved;
  const maxFromWidth  = w - (w >= 1024 ? 80 : 32);
  const capWidth      = w >= 1024 ? 600 : w >= 768 ? 500 : 460;
  const maxBoardWidth = Math.min(maxFromWidth, maxFromHeight, capWidth);
  boardWrapper.style.width = `${maxBoardWidth}px`;
  boardWrapper.style.height = `${maxBoardWidth}px`;
  
  const boardEl = document.createElement('div');
  boardEl.id = 'merge-board';
  boardEl.className = 'w-full h-full grid gap-[6px] relative';
  boardEl.style.gridTemplateColumns = `repeat(${engine.gridSize}, 1fr)`;
  boardEl.style.gridTemplateRows = `repeat(${engine.gridSize}, 1fr)`;
  
  boardWrapper.appendChild(boardEl);
  content.appendChild(boardWrapper);

  // Tray container
  const trayContainer = document.createElement('div');
  trayContainer.className = `glass-panel border border-black/10 dark:border-white/10 rounded-3xl flex items-center justify-around px-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] relative shrink-0 ${isShortScreen ? 'h-16' : 'h-20 md:h-24 lg:h-28'}`;
  trayContainer.style.width = `${maxBoardWidth - 80}px`;
  const glow = document.createElement('div');
  glow.className = 'absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none rounded-3xl';
  trayContainer.appendChild(glow);
  content.appendChild(trayContainer);

  container.appendChild(content);

  const getTileColor = (val) => {
    const colors = {
      2: 'bg-blue-300 text-blue-900',
      4: 'bg-blue-400 text-white',
      8: 'bg-indigo-400 text-white',
      16: 'bg-indigo-500 text-white shadow-indigo-600/50',
      32: 'bg-purple-500 text-white shadow-purple-600/50',
      64: 'bg-fuchsia-500 text-white shadow-fuchsia-600/50',
      128: 'bg-pink-500 text-white shadow-pink-600/50',
      256: 'bg-rose-500 text-white shadow-rose-600/50',
      512: 'bg-red-500 text-white shadow-red-600/50',
      1024: 'bg-orange-500 text-white shadow-orange-600/50',
      2048: 'bg-yellow-500 text-white shadow-yellow-600/50 shadow-lg',
      4096: 'bg-teal-500 text-white shadow-teal-600/50 shadow-lg',
    };
    return colors[val] || 'bg-gray-900 text-white';
  };

  const getTileFontSize = (val) => {
    if (val < 100) return 'text-2xl';
    if (val < 1000) return 'text-xl';
    return 'text-lg';
  };

  let boardCells = [];
  let domGrid = [];

  const initBoardDOM = () => {
    boardEl.innerHTML = '';
    boardCells = [];
    domGrid = [];
    for (let r = 0; r < engine.gridSize; r++) {
      const row = [];
      for (let c = 0; c < engine.gridSize; c++) {
        const cell = document.createElement('div');
        cell.className = 'w-full h-full rounded-2xl grid-cell-empty relative overflow-hidden flex items-center justify-center font-black transition duration-200';
        boardEl.appendChild(cell);
        row.push(cell);
      }
      domGrid.push(row);
      boardCells.push(row);
    }
  };

  const renderBoard = () => {
    for (let r = 0; r < engine.gridSize; r++) {
      for (let c = 0; c < engine.gridSize; c++) {
        const val = engine.grid[r][c];
        const cell = domGrid[r][c];
        
        if (cell.dataset.cachedVal === String(val)) continue;
        cell.dataset.cachedVal = val;

        if (val > 0) {
          cell.className = `w-full h-full rounded-2xl relative overflow-hidden flex items-center justify-center font-black transition duration-200 transform scale-100 ${getTileColor(val)} ${getTileFontSize(val)}`;
          cell.textContent = val;
        } else {
          cell.className = 'w-full h-full rounded-2xl grid-cell-empty relative overflow-hidden flex items-center justify-center font-black transition duration-200 transform scale-95';
          cell.textContent = '';
        }
      }
    }
  };

  let dragGhost = null;
  let lastTraySignature = '';

  const renderTray = () => {
    const currentSignature = JSON.stringify(engine.tray);
    if (lastTraySignature === currentSignature) return;
    lastTraySignature = currentSignature;

    trayContainer.innerHTML = '';
    engine.tray.forEach((val, idx) => {
      const blockWrap = document.createElement('div');
      blockWrap.className = `relative flex items-center justify-center cursor-pointer ${isShortScreen ? 'w-12 h-12' : 'w-14 h-14'}`;
      blockWrap.style.touchAction = 'none';
      
      const block = document.createElement('div');
      block.className = `w-full h-full rounded-2xl flex items-center justify-center font-black shadow-md ${getTileColor(val)} text-2xl`;
      block.textContent = val;
      
      // Drag events
      let isDragging = false;
      
      const startDrag = (clientX, clientY) => {
        isDragging = true;
        block.style.opacity = '0.3';
        
        dragGhost = document.createElement('div');
        dragGhost.className = `fixed z-50 pointer-events-none rounded-2xl flex items-center justify-center font-black shadow-2xl scale-110 ${getTileColor(val)} text-3xl drag-ghost-element`;
        dragGhost.textContent = val;
        
        // Match board cell size roughly
        const boardRect = boardEl.getBoundingClientRect();
        const cellW = (boardRect.width - (engine.gridSize - 1) * 6) / engine.gridSize;
        dragGhost.style.width = `${cellW}px`;
        dragGhost.style.height = `${cellW}px`;
        
        document.body.appendChild(dragGhost);
        positionGhost(clientX, clientY);
        Haptics.vibrate('button-tap');
      };
      
      const positionGhost = (x, y) => {
        if (dragGhost) {
          dragGhost.style.left = `${x}px`;
          dragGhost.style.top = `${y}px`; // Offset above finger
          dragGhost.style.transform = 'translate(-50%, -50%)';
        }
      };
      
      const onMove = (clientX, clientY) => {
        if (!isDragging) return;
        positionGhost(clientX, clientY);
      };
      
      const onEnd = (clientX, clientY) => {
        if (!isDragging) return;
        isDragging = false;
        block.style.opacity = '1';
        
        if (dragGhost) {
          dragGhost.remove();
          dragGhost = null;
        }
        
        // Find drop cell
        const targetX = clientX;
        const targetY = clientY; // offset the cursor to match visual block position
        
        let droppedR = -1;
        let droppedC = -1;
        
        const boardRect = boardEl.getBoundingClientRect();
        if (targetX >= boardRect.left && targetX <= boardRect.right &&
            targetY >= boardRect.top && targetY <= boardRect.bottom) {
          const cellW = (boardRect.width - (engine.gridSize - 1) * 6) / engine.gridSize;
          const cellH = (boardRect.height - (engine.gridSize - 1) * 6) / engine.gridSize;
          
          const relativeX = targetX - boardRect.left;
          const relativeY = targetY - boardRect.top;
          
          const c = Math.floor(relativeX / (cellW + 6));
          const r = Math.floor(relativeY / (cellH + 6));
          
          if (r >= 0 && r < engine.gridSize && c >= 0 && c < engine.gridSize) {
            droppedR = r;
            droppedC = c;
          }
        }
        
        if (droppedR !== -1 && droppedC !== -1) {
          const res = engine.placeBlock(droppedR, droppedC, idx);
          if (res.success) {
            Sounds.playSfx('x2-drop');
            Haptics.vibrate('block-place');
            
            if (res.merged) {
              TaskState.updateProgress('merge_count', res.merged.length);
              setTimeout(() => {
                const finalMerge = res.merged[res.merged.length - 1];
                const mergeVal = finalMerge ? finalMerge.newVal : 2;
                Sounds.playSfx('x2-merge', { score: mergeVal });
                Haptics.vibrate('line-clear');
              }, 200);
            }
            
            renderBoard();
            renderTray();
            updateScore();
            
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
                          <span>${t('revive_diamonds_merge') || '300 Elmas Harca'}</span>
                        </button>
                        <button id="modal-revive-ad" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
                          <span class="material-symbols-outlined">play_circle</span>
                          <span>${t('revive_ad_merge') || 'Reklam İzle & Devam Et'}</span>
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
                  renderTray();
                };

                const showActualGameOver = () => {
                  container.isGameOverModalOpen = false;
                  modal.close();
                  setTimeout(() => {
                    Sounds.playSfx('game-over');
                    Haptics.vibrate('game-over');
                    showGameOverModal({
                      score: engine.score,
                      mode: mode === 'adventure' ? 'merge_adventure' : 'merge',
                      onPlayAgain: () => {
                        if (mode === 'adventure') {
                          engine.restartCurrentLevel();
                        } else {
                          engine = new MergeEngine(mode, level);
                        }
                        renderBoard();
                        renderTray();
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
            } else if (mode !== 'adventure') {
              // Sonsuz modda periyodik reklam kontrolü
              AdService.showForcedInterstitial('periodic');
            }
          } else {
            Sounds.playSfx('invalid');
          }
        }
      };

      blockWrap.addEventListener('mousedown', (e) => {
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
        const moveFn = ev => onMove(ev.clientX, ev.clientY);
        const upFn = ev => {
          window.removeEventListener('mousemove', moveFn);
          window.removeEventListener('mouseup', upFn);
          onEnd(ev.clientX, ev.clientY);
        };
        window.addEventListener('mousemove', moveFn, { signal: dragController.signal });
        window.addEventListener('mouseup', upFn, { signal: dragController.signal });
      });

      blockWrap.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        startDrag(touch.clientX, touch.clientY);
        const moveFn = (ev) => {
          ev.preventDefault();
          onMove(ev.touches[0].clientX, ev.touches[0].clientY);
        };
        const endFn = (ev) => {
          window.removeEventListener('touchmove', moveFn);
          window.removeEventListener('touchend', endFn);
          onEnd(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY);
        };
        window.addEventListener('touchmove', moveFn, { passive: false, signal: dragController.signal });
        window.addEventListener('touchend', endFn, { signal: dragController.signal });
      }, { passive: false });

      blockWrap.appendChild(block);
      trayContainer.appendChild(blockWrap);
    });
  };

  const updateScore = () => {
    const scoreStr = engine.score.toLocaleString();
    const elScore = container.querySelector('#merge-score');
    if (elScore) elScore.textContent = scoreStr;
    
    if (mode === 'adventure') {
      const elProgress = container.querySelector('#merge-level-progress');
      if (elProgress) {
        elProgress.style.width = `${Math.min(100, (engine.levelScore / engine.targetScore) * 100)}%`;
      }
      
      if (engine.levelUpReady) {
        engine.levelUpReady = false;
        showLevelUpModal();
      }
    }
    
    TaskState.updateProgress('merge_score', engine.score);
    
    if (typeof PlayerState.state.bestScoreMerge === 'undefined') {
      PlayerState.state.bestScoreMerge = 0;
    }
    if (engine.score > PlayerState.state.bestScoreMerge) {
      PlayerState.state.bestScoreMerge = engine.score;
      PlayerState.save();
      const bestStr = PlayerState.state.bestScoreMerge.toLocaleString();
      const elBest = container.querySelector('#merge-best');
      if (elBest) elBest.textContent = bestStr;
    }
  };

  function showLevelUpModal() {
    AdService.showForcedInterstitial('levelup');
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
            <h3 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500 tracking-tight">${t('congratulations')}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">${t('level_completed', { level: engine.level })}</p>
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
            PlayerState.state.mergeAdventureLevel = engine.level;
            PlayerState.save();
            const elLvl = container.querySelector('#merge-lvl');
            if (elLvl) elLvl.textContent = engine.level;
            const elTarget = container.querySelector('#merge-target');
            if (elTarget) elTarget.textContent = engine.targetScore.toLocaleString();
            updateScore();
          }
        }
      ]
    });
  }

  const updateUndoUI = () => {
    const undoBtn = container.querySelector('#btn-undo');
    const undoCostEl = container.querySelector('#undo-cost');
    const badgeEl = container.querySelector('#undo-badge');
    
    if (!undoBtn || !undoCostEl) return;

      const costs = [50, 150, 300];
      if (engine.undoCount >= costs.length) {
        undoBtn.classList.add('opacity-50', 'pointer-events-none');
        badgeEl.classList.remove('bg-cyan-500/10', 'dark:bg-cyan-500/20');
        badgeEl.classList.add('bg-gray-500/10', 'dark:bg-gray-500/20');
        undoCostEl.classList.remove('text-cyan-600', 'dark:text-cyan-300');
        undoCostEl.classList.add('text-gray-600', 'dark:text-gray-400');
        undoCostEl.textContent = t('max');
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

  
  initBoardDOM();
  renderBoard();
  renderTray();
  updateScore();
  updateUndoUI();

  setTimeout(() => {
    if (container.isConnected) {
      checkAndShowTutorial('merge');
    }
  }, 300);

  let dragController = new AbortController();
  container.cleanup = () => {
    if (topBar.cleanup) topBar.cleanup();
    Sounds.stopMusic();
    dragController.abort();
    AdService.hideBanner();};



  const undoBtn = container.querySelector('#btn-undo');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      Haptics.vibrate('button-tap');

      const costs = [50, 150, 300];
      const currentCost = costs[engine.undoCount];
      
      if (engine.history && engine.history.length > 0 && engine.undoCount < costs.length && PlayerState.state.diamonds < currentCost) {
        showUndoAdModal(currentCost, () => {
          if (engine.undo()) {
            Sounds.playSfx('undo');
            renderBoard();
            renderTray();
            updateScore();
            updateUndoUI();
          }
        });
        return;
      }

      if (engine.undo()) {
        Sounds.playSfx('undo');
        renderBoard();
        renderTray();
        updateScore();
        updateUndoUI();
      }
    });
  }

  const helpBtn = container.querySelector('#btn-help');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      checkAndShowTutorial('merge', true);
    });
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

