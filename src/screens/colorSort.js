import { SortEngine } from '../game/sortEngine.js';
import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { createModal } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { checkAndShowTutorial } from '../components/tutorial.js';
import { t } from '../utils/i18n.js';
import { TaskState } from '../state/taskState.js';
import { showQuitConfirmation } from '../utils/quitConfirm.js';
import { Storage } from '../utils/storage.js';
import { formatBlockValue } from '../utils/numberFormat.js';
import { showUndoAdModal, showAdModal } from '../components/adModal.js';
import { AdService } from '../services/adService.js';

export function ColorSort(router) {
  const hashObj = window.location.hash.split('?');
  let mode = 'adventure';
  if (hashObj.length > 1) {
    const queryParams = new URLSearchParams(hashObj[1]);
    mode = queryParams.get('mode') || 'adventure';
  }

  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] flex flex-col justify-between bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-pop-up pb-safe-bottom relative overflow-hidden';

  let engine = new SortEngine(mode);
  let selectedTubeIdx = null;
  // Sürükleme ortasında ekrandan çıkılırsa window'a eklenen move/up listener'ları
  // sökebilmek için aktif sürüklemenin teardown'ı burada izlenir.
  let activeDragCleanup = null;

  // 1. Header
  const topBar = createTopBar(t('menu_sort') || 'Renk Sıralama', true, () => {
    showQuitConfirmation(router);
  });
  container.appendChild(topBar);

  // 1. Top Controls
  const controlsTray = document.createElement('div');
  controlsTray.className = 'px-4 md:px-6 lg:px-8 pt-4 pb-2 flex items-center justify-between w-full z-30 shrink-0';
  controlsTray.innerHTML = `
    <!-- Left: Help + Level Info -->
    <div class="flex items-center space-x-3">
      <button id="btn-help" class="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 border border-black/10 dark:border-white/10 shadow-sm flex items-center justify-center active:scale-95 transition-all text-red-500 dark:text-red-400 shrink-0">
        <span class="material-symbols-outlined text-[18px] md:text-[22px]">help</span>
      </button>
      <div class="flex flex-col items-start justify-center">
        <span class="text-[10px] md:text-[12px] font-black text-gray-400 tracking-wider leading-none mb-0.5">${mode === 'endless' ? `<span class="material-symbols-outlined text-[16px] align-middle">all_inclusive</span>` : t('level').toUpperCase()}</span>
        <span id="sort-lvl" class="text-xl md:text-2xl font-black text-primary dark:text-white leading-none">${engine.level}</span>
      </div>
    </div>

    <!-- Right: Action Pills -->
    <div class="flex items-center space-x-2">
      <!-- Undo Pill -->
      <button id="btn-undo" class="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-full bg-white dark:bg-primary-container border border-black/5 dark:border-white/5 shadow-sm active:scale-95 transition-all shrink-0">
        <span class="material-symbols-outlined text-[14px] md:text-[16px]">undo</span>
        <span class="text-[10px] md:text-[12px] font-black tracking-tight leading-none uppercase text-gray-700 dark:text-gray-200">${t('undo')}</span>
        <div id="undo-badge" class="flex items-center gap-0.5 bg-cyan-500/10 dark:bg-cyan-500/20 px-1.5 py-0.5 rounded-full ml-0.5 transition-all">
          <span class="material-symbols-outlined text-[10px] md:text-[12px] fill text-cyan-500 dark:text-cyan-400">diamond</span>
          <span id="undo-cost" class="text-[10px] md:text-[12px] font-black text-cyan-600 dark:text-cyan-300 leading-none">50</span>
        </div>
      </button>
      <!-- Add Tube Pill -->
      <button id="btn-add-tube" class="flex items-center gap-1.5 px-2.5 md:px-3 py-1.5 rounded-full bg-white dark:bg-primary-container border border-black/5 dark:border-white/5 shadow-sm active:scale-95 transition-all shrink-0">
        <span class="material-symbols-outlined text-[14px] md:text-[16px] text-orange-500 dark:text-orange-400">science</span>
        <div class="flex items-center gap-0.5 bg-cyan-500/10 dark:bg-cyan-500/20 px-1.5 py-0.5 rounded-full ml-0.5 transition-all">
          <span class="material-symbols-outlined text-[10px] md:text-[12px] fill text-cyan-500 dark:text-cyan-400">diamond</span>
          <span class="text-[10px] md:text-[12px] font-black text-cyan-600 dark:text-cyan-300 leading-none">100</span>
        </div>
      </button>
    </div>
  `;
  container.appendChild(controlsTray);

  // 3. Tubes Container
  const boardWrapper = document.createElement('div');
  boardWrapper.className = 'flex-1 flex flex-col items-center justify-center p-4 relative w-full';
  
  const tubesGrid = document.createElement('div');
  tubesGrid.id = 'tubes-grid';
  tubesGrid.className = 'flex flex-wrap justify-center gap-4 sm:gap-5 md:gap-6 lg:gap-8 w-full max-w-sm md:max-w-lg lg:max-w-2xl';
  boardWrapper.appendChild(tubesGrid);
  container.appendChild(boardWrapper);



  // --- RENDER LOGIC ---
  const renderTubes = () => {
    tubesGrid.innerHTML = '';
    
    engine.tubes.forEach((tube, idx) => {
      // Tube container
      const tubeEl = document.createElement('div');
      tubeEl.className = `w-14 h-48 md:w-16 md:h-56 lg:w-20 lg:h-64 rounded-t-sm rounded-b-3xl glass-panel border border-white/20 dark:border-white/10 flex flex-col-reverse p-1 relative cursor-pointer shadow-lg transition-transform duration-200 ${selectedTubeIdx === idx ? '-translate-y-4 shadow-2xl ring-2 ring-accent-cyan/50' : ''}`;
      
      // Blocks inside
      for (let i = 0; i < engine.maxTubeSize; i++) {
        const blockWrapper = document.createElement('div');
        blockWrapper.className = 'w-full h-1/4 p-[1px]';
        blockWrapper.style.touchAction = 'none';
        
        if (i < tube.length) {
          const color = tube[i];
          const block = document.createElement('div');
          const isTop = (i === tube.length - 1);
          const isTopAndSelected = (isTop && selectedTubeIdx === idx);
          
          block.className = `w-full h-full rounded-md block-3d-${color} transition-transform duration-200 ${isTopAndSelected ? '-translate-y-2' : ''}`;
          
          // Custom drag logic
          if (isTop) {
             let isDragging = false;
             let floatingEl = null;

             const startDrag = (clientX, clientY) => {
               isDragging = true;
               selectedTubeIdx = idx;

               const rect = blockWrapper.getBoundingClientRect();

               // Create floating ghost
               floatingEl = document.createElement('div');
               floatingEl.className = `fixed z-50 pointer-events-none rounded-md shadow-2xl block-3d-${color} drag-ghost-element`;
               floatingEl.style.width = `${rect.width}px`;
               floatingEl.style.height = `${rect.height}px`;
               document.body.appendChild(floatingEl);
               
               positionFloatingEl(clientX, clientY);
               Haptics.vibrate('button-tap');
               
               block.style.opacity = '0.2';
             };

             const positionFloatingEl = (x, y) => {
               if (floatingEl) {
                 floatingEl.style.left = `${x}px`;
                 floatingEl.style.top = `${y}px`; // No offset
                 floatingEl.style.transform = `translate(-50%, -50%) scale(1.1)`;
               }
             };

             const findTargetTube = (clientX, clientY) => {
                const targetX = clientX;
                const targetY = clientY; // No offset
                
                const tubeEls = tubesGrid.children;
                for (let i = 0; i < tubeEls.length; i++) {
                   const tubeRect = tubeEls[i].getBoundingClientRect();
                   // Expand drop zone so hovering near the mouth is enough
                   if (targetX >= tubeRect.left - 20 && targetX <= tubeRect.right + 20 &&
                       targetY >= tubeRect.top - 80 && targetY <= tubeRect.bottom + 40) {
                      return i;
                   }
                }
                return null;
             };

             let rafSortId = null;
             const onMove = (clientX, clientY) => {
               if (!isDragging) return;
               positionFloatingEl(clientX, clientY);
               if (rafSortId) cancelAnimationFrame(rafSortId);
               rafSortId = requestAnimationFrame(() => {
                 if (!isDragging) return;
                 const targetIdx = findTargetTube(clientX, clientY);
                 Array.from(tubesGrid.children).forEach((el, i) => {
                   if (i === targetIdx && i !== idx) {
                     el.classList.add('ring-4', 'ring-green-400');
                   } else {
                     el.classList.remove('ring-4', 'ring-green-400');
                   }
                 });
               });
             };

             const onEnd = (clientX, clientY) => {
               if (!isDragging) return;
               isDragging = false;
               
               if (floatingEl) {
                 floatingEl.remove();
                 floatingEl = null;
               }

               block.style.opacity = '1';

               const targetIdx = findTargetTube(clientX, clientY);
               if (targetIdx !== null && targetIdx !== idx) {
                 handleMoveAttempt(idx, targetIdx, tubesGrid.children[targetIdx]);
               } else {
                 selectedTubeIdx = null;
                 renderTubes();
               }
             };

             // Mouse
             block.addEventListener('mousedown', (e) => {
               e.preventDefault();
               e.stopPropagation();
               startDrag(e.clientX, e.clientY);
               const moveFn = (ev) => onMove(ev.clientX, ev.clientY);
               const upFn = (ev) => {
                 window.removeEventListener('mousemove', moveFn);
                 window.removeEventListener('mouseup', upFn);
                 activeDragCleanup = null;
                 onEnd(ev.clientX, ev.clientY);
               };
               activeDragCleanup = () => {
                 window.removeEventListener('mousemove', moveFn);
                 window.removeEventListener('mouseup', upFn);
                 if (rafSortId) cancelAnimationFrame(rafSortId);
                 if (floatingEl) { floatingEl.remove(); floatingEl = null; }
               };
               window.addEventListener('mousemove', moveFn);
               window.addEventListener('mouseup', upFn);
             });

             // Touch
             block.addEventListener('touchstart', (e) => {
               e.stopPropagation();
               const touch = e.touches[0];
               startDrag(touch.clientX, touch.clientY);
               const moveFn = (ev) => {
                 ev.preventDefault();
                 onMove(ev.touches[0].clientX, ev.touches[0].clientY);
               };
               const endFn = (ev) => {
                 window.removeEventListener('touchmove', moveFn);
                 window.removeEventListener('touchend', endFn);
                 activeDragCleanup = null;
                 onEnd(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY);
               };
               activeDragCleanup = () => {
                 window.removeEventListener('touchmove', moveFn);
                 window.removeEventListener('touchend', endFn);
                 if (rafSortId) cancelAnimationFrame(rafSortId);
                 if (floatingEl) { floatingEl.remove(); floatingEl = null; }
               };
               window.addEventListener('touchmove', moveFn, { passive: false });
               window.addEventListener('touchend', endFn);
             }, { passive: false });
          }
          
          blockWrapper.appendChild(block);
        }
        tubeEl.appendChild(blockWrapper);
      }

      // Tube click handler
      tubeEl.addEventListener('click', () => {
        handleTubeClick(idx, tubeEl);
      });

      tubesGrid.appendChild(tubeEl);
    });

    // Update stats
    if (elSortLvl) elSortLvl.textContent = engine.level;
    const topBarTitle = topBar.querySelector('h1');
    if (topBarTitle) topBarTitle.textContent = t('menu_sort') || "Renk Sıralama";
  };

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
      undoCostEl.textContent = 'MAX';
      badgeEl.querySelector('.material-symbols-outlined').style.display = 'none';
    } else {
      undoBtn.classList.remove('opacity-50', 'pointer-events-none');
      badgeEl.classList.add('bg-cyan-500/10', 'dark:bg-cyan-500/20');
      badgeEl.classList.remove('bg-gray-500/10', 'dark:bg-gray-500/20');
      undoCostEl.classList.add('text-cyan-600', 'dark:text-cyan-300');
      undoCostEl.classList.remove('text-gray-600', 'dark:text-gray-400');
      undoCostEl.textContent = costs[engine.undoCount];
      badgeEl.querySelector('.material-symbols-outlined').style.display = 'block';
    }
  };

  const handleMoveAttempt = (srcIdx, targetIdx, targetTubeEl) => {
      const success = engine.move(srcIdx, targetIdx);
      if (success) {
        selectedTubeIdx = null;
        Haptics.vibrate('success');
        renderTubes();
        
        // Check win
        if (engine.checkWin()) {
      TaskState.updateProgress('sort_level', 1);
          setTimeout(showWinModal, 400);
        } else if (mode === 'endless') {
          // Sonsuz modda 'kaybetme' yok ve puzzle bitene kadar levelup molası oluşmaz.
          // Diğer sonsuz modlarla aynı sigorta: her geçerli (ve kazanmayan) hamle oturmuş
          // bir andır → reklam sayacı dolmuşsa burada tam ekran reklam çıkar. Böylece zor bir
          // puzzle'da uzun süre takılan oyuncu da açta kalmaz.
          AdService.showForcedInterstitial('periodic');
        }
      } else {
        // Invalid move
        targetTubeEl.classList.add('animate-shake');
        setTimeout(() => targetTubeEl.classList.remove('animate-shake'), 300);
        Sounds.playSfx('invalid');
        Haptics.vibrate('invalid');
        selectedTubeIdx = null; // deselect on fail
        renderTubes();
      }
  };

  const handleTubeClick = (idx, tubeEl) => {
    if (selectedTubeIdx === null) {
      // Select if not empty
      if (engine.tubes[idx].length > 0) {
        selectedTubeIdx = idx;
        Sounds.playSfx('button-tap');
        Haptics.vibrate('light');
        renderTubes();
      }
    } else if (selectedTubeIdx === idx) {
      // Deselect
      selectedTubeIdx = null;
      Sounds.playSfx('button-tap');
      renderTubes();
    } else {
      handleMoveAttempt(selectedTubeIdx, idx, tubeEl);
    }
  };

  const showWinModal = () => {
    Sounds.playSfx('level-up');
    AdService.showForcedInterstitial('levelup');
    
    // Confetti effect inside modal
    createModal({
      title: t('congrats'),
      content: `<div class="flex flex-col items-center">
        <div class="relative w-24 h-24 mb-4 flex items-center justify-center">
          <span class="text-6xl absolute z-10 animate-bounce"><span class="material-symbols-outlined fill text-yellow-500 text-[1em] align-middle">celebration</span></span>
        </div>
        <p class="text-sm text-gray-500 mb-2">${t('level_completed', {lvl: engine.level})}</p>
        <div class="flex gap-4 mt-2">
          <span class="text-lg font-black text-cyan-500">+50 <span class="material-symbols-outlined fill text-cyan-400 text-[1em] align-middle">diamond</span></span>
          <span class="text-lg font-black text-blue-500">+150 XP</span>
        </div>
      </div>`,
      actions: [
        {
          text: t('next_level') || 'Sonraki Seviye',
          primary: true,
          onClick: (close) => {
            close();
            engine.startNextLevel();
            selectedTubeIdx = null;
            renderTubes();
            updateUndoUI();
          }
        },
        {
          text: t('main_menu') || 'Ana Menüye Dön',
          primary: false,
          onClick: (close) => {
            close();
            import('../router.js').then(({ router }) => router.navigate('#/menu'));
          }
        }
      ]
    });
  };

  // --- BUTTON HOOKS ---
  container.querySelector('#btn-undo').addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    Haptics.vibrate('button-tap');

    const costs = [50, 150, 300];
    const currentCost = costs[engine.undoCount];
    
    if (engine.history && engine.history.length > 0 && engine.undoCount < costs.length && PlayerState.state.diamonds < currentCost) {
      showUndoAdModal(currentCost, () => {
        const success = engine.undo();
        if (success) {
          selectedTubeIdx = null;
          renderTubes();
          updateUndoUI();
        }
      });
      return;
    }

    const success = engine.undo();
    if (success) {
      selectedTubeIdx = null;
      renderTubes();
      updateUndoUI();
    }
  });

  container.querySelector('#btn-add-tube').addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    
    const cost = 100;
    if (PlayerState.state.diamonds < cost) {
      showAdModal(cost, () => {
        const success = engine.addTube();
        if (success) {
          selectedTubeIdx = null;
          renderTubes();
          Sounds.playSfx('level-up');
          Toast.show(t('extra_tube_added'), 'success');
        }
      }, 'add_tube');
      return;
    }

    const success = engine.addTube();
    if (success) {
      selectedTubeIdx = null;
      renderTubes();
      Sounds.playSfx('level-up');
      Toast.show(t('extra_tube_added'), 'success');
    } else {
      Toast.show(t('not_enough_balance_tube'), 'warning');
      Sounds.playSfx('invalid');
    }
  });



  const helpBtn = container.querySelector('#btn-help');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      checkAndShowTutorial('sort', true);
    });
  }

  // Background decoration
  const bgDeco = document.createElement('div');
  bgDeco.className = 'fixed inset-0 pointer-events-none z-[-1] opacity-10 flex items-center justify-center overflow-hidden';
  bgDeco.innerHTML = `<span class="material-symbols-outlined text-[40rem] text-blue-500/20 rotate-[30deg]">science</span>`;
  container.appendChild(bgDeco);

  // Cache frequently queried element
  const elSortLvl = container.querySelector('#sort-lvl');

  // Initial render
  const initTimer = setTimeout(() => {
    if (!container.isConnected) return; // ekran 100ms içinde kapandıysa müziği yeniden başlatma
    renderTubes();
    updateUndoUI();
    Sounds.startMusic('game');
    checkAndShowTutorial('sort');
  }, 100);

  container.cleanup = () => {
    clearTimeout(initTimer);
    if (activeDragCleanup) { activeDragCleanup(); activeDragCleanup = null; }
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
