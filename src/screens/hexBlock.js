import { HexEngine } from '../game/hexEngine.js';
import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { showGameOverModal } from './gameOver.js';
import { checkAndShowTutorial } from '../components/tutorial.js';
import { t } from '../utils/i18n.js';
import { showQuitConfirmation } from '../utils/quitConfirm.js';
import { formatBlockValue } from '../utils/numberFormat.js';
import { Storage } from '../utils/storage.js';
import { showUndoAdModal } from '../components/adModal.js';
import { AdService } from '../services/adService.js';
import { createModal } from '../components/modal.js';
import { Toast } from '../components/toast.js';

export function HexBlock(router) {
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] relative overflow-hidden flex flex-col justify-between bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-pop-up pb-safe-bottom';

  let engine = new HexEngine(4);
  engine.loadFromLocalStorage();

  // 1. Render Header
  const topBar = createTopBar(t('menu_hex') || 'Hex Block', true, () => {
    showQuitConfirmation(router);
  });
  container.appendChild(topBar);

  // Sub-controls container
  const subControls = document.createElement('div');
  subControls.className = 'px-4 md:px-6 lg:px-8 pt-1.5 md:pt-3 lg:pt-4 pb-0 flex items-center justify-between w-full z-30';
  subControls.innerHTML = `
    <!-- Help Button -->
      <button id="btn-help" class="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-black/10 dark:border-white/10 shadow-sm active:scale-90 transition-transform text-red-500 dark:text-red-400">
        <span class="material-symbols-outlined text-[18px] md:text-[20px] lg:text-[22px]">help</span>
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
  `;
  container.appendChild(subControls);

  // 2. Score section
  const scoreSection = document.createElement('div');
  scoreSection.className = 'px-4 md:px-6 lg:px-8 py-1 mt-4 sm:mt-6 md:mt-6 lg:mt-8 flex justify-between items-center w-full z-10';
  scoreSection.innerHTML = `
    <div class="flex flex-col items-center justify-center flex-1">
      <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1 drop-shadow-md">
        <div class="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
        <div class="absolute inset-0 rounded-full border-4 border-t-indigo-400 rotate-45"></div>
        <div class="bg-gradient-to-br from-indigo-500 to-purple-600 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
          <span id="hex-lvl" class="text-xl md:text-2xl lg:text-3xl font-black text-white drop-shadow-sm leading-none">${PlayerState.state.level}</span>
        </div>
        <div class="absolute -top-1.5 -right-1.5 text-sm md:text-base lg:text-xl drop-shadow-md">👑</div>
      </div>
      <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider">${t('level').toUpperCase()}</span>
    </div>

    <div class="flex flex-col items-center justify-center flex-1.5 px-2">
      <span class="text-[10px] md:text-xs lg:text-sm font-black text-gray-400 tracking-wider mb-0.5">${t('score').toUpperCase()}</span>
      <span id="hex-score" class="text-[32px] md:text-[40px] lg:text-[52px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-sm tracking-tight leading-none">${engine.score}</span>
    </div>

    <div class="flex flex-col items-center justify-center flex-1">
      <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1">
        <div class="absolute inset-0 rounded-full border-2 border-orange-500/30"></div>
        <div class="bg-gradient-to-br from-gray-300 to-gray-500 dark:from-slate-600 dark:to-slate-800 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
          <span class="material-symbols-outlined text-white text-lg md:text-xl lg:text-3xl drop-shadow-sm">emoji_events</span>
        </div>
      </div>
      <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider mb-0.5">${t('record').toUpperCase()}</span>
      <span id="hex-best" class="text-sm md:text-base lg:text-xl font-black text-gray-500">${engine.bestScore.toLocaleString('tr-TR')}</span>
    </div>
  `;
  container.appendChild(scoreSection);

  // Hex Math Config
  const w2 = window.innerWidth;
  const reservedHeight = w2 >= 1024 ? 340 : w2 >= 768 ? 360 : 410;
  const availableForBoard = window.innerHeight - reservedHeight;
  const capWidth = w2 >= 1024 ? 800 : w2 >= 768 ? 650 : 520;
  const maxBoardWidth = Math.min(w2 - 32, capWidth, availableForBoard);
  const calculatedHexSize = maxBoardWidth / (Math.sqrt(3) * 9.5);
  const hexMax = w2 >= 1024 ? 48 : 38;
  const HEX_SIZE = Math.max(16, Math.min(calculatedHexSize, hexMax));

  const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
  const HEX_HEIGHT = 2 * HEX_SIZE;
  const X_OFFSET_MULTIPLIER = Math.sqrt(3) * HEX_SIZE;
  const Y_OFFSET_MULTIPLIER = 1.5 * HEX_SIZE;

  // 3. Board
  const boardWrapper = document.createElement('div');
  boardWrapper.className = 'flex-1 flex items-center justify-center relative w-full min-h-0 overflow-hidden';
  
  const boardEl = document.createElement('div');
  boardEl.id = 'hex-board';
  boardEl.className = 'relative';
  
  // Board container size
  const boardWidth = HEX_WIDTH * 9.5;
  const boardHeight = HEX_HEIGHT * 7;
  boardEl.style.width = `${boardWidth}px`;
  boardEl.style.height = `${boardHeight}px`;
  boardWrapper.appendChild(boardEl);
  container.appendChild(boardWrapper);

  // 4. Tray
  const trayWrapper = document.createElement('div');
  trayWrapper.className = 'px-4 pb-6 md:pb-8 lg:pb-12 pt-0 mt-0 md:mt-2 lg:mt-4 w-full z-10'; // Added padding for ads and removed negative margins
  const trayEl = document.createElement('div');
  trayEl.className = 'grid grid-cols-3 gap-3 w-full h-28 md:h-36 lg:h-44 glass-panel border border-black/10 dark:border-white/10 rounded-3xl p-3 md:p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] relative overflow-hidden';
  const glow = document.createElement('div');
  glow.className = 'absolute inset-0 bg-gradient-to-t from-cyan-500/5 to-transparent pointer-events-none rounded-3xl';
  trayEl.appendChild(glow);
  trayWrapper.appendChild(trayEl);
  container.appendChild(trayWrapper);

  // --- RENDERING HELPERS ---

  // Cached hex cell Map for O(1) lookup — avoids querySelector on every move
  const hexCellMap = new Map();
  // Cached score DOM elements
  let elHexScore, elHexBest, elHexLvl;

  const getHexCoords = (q, r) => {
    const x = X_OFFSET_MULTIPLIER * (q + r / 2) + boardWidth / 2;
    const y = Y_OFFSET_MULTIPLIER * r + boardHeight / 2;
    return { x, y };
  };

  const createHexagon = (q, r, color, isGhost = false) => {
    const hex = document.createElement('div');
    const { x, y } = getHexCoords(q, r);
    hex.style.position = 'absolute';
    hex.style.width = `${HEX_WIDTH - 2}px`; // -2 for gap
    hex.style.height = `${HEX_HEIGHT - 2}px`;
    hex.style.left = `${x - HEX_WIDTH/2}px`;
    hex.style.top = `${y - HEX_HEIGHT/2}px`;
    hex.style.clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
    hex.style.transition = 'all 0.2s ease-out';
    
    if (color) {
      hex.className = `block-3d-${color} shadow-sm z-10`;
    } else {
      hex.className = 'hex-cell-empty z-0'; // empty cell
    }

    if (isGhost) {
      hex.style.transition = 'none';
      hex.className = color ? `bg-${color}-500/50 z-20` : 'bg-red-500/50 z-20';
    }

    return hex;
  };

  const renderBoard = () => {
    boardEl.innerHTML = '';
    hexCellMap.clear();
    const frag = document.createDocumentFragment();
    for (let [coord, color] of engine.board.entries()) {
      const [q, r] = coord.split(',').map(Number);
      const hex = createHexagon(q, r, color);
      hex.setAttribute('data-q', q);
      hex.setAttribute('data-r', r);
      hexCellMap.set(coord, hex);
      frag.appendChild(hex);
    }
    boardEl.appendChild(frag);
  };

  const updateBoardUI = () => {
    for (let [coord, color] of engine.board.entries()) {
      const hex = hexCellMap.get(coord);
      if (hex) {
        if (hex.dataset.cachedColor === String(color)) continue;
        hex.dataset.cachedColor = color;
        
        if (color) {
          hex.className = `block-3d-${color} shadow-sm z-10`;
        } else {
          hex.className = 'hex-cell-empty z-0';
        }
      }
    }
    if (elHexScore) elHexScore.textContent = engine.score;
    if (elHexBest) elHexBest.textContent = engine.bestScore.toLocaleString('tr-TR');
    if (elHexLvl) elHexLvl.textContent = PlayerState.state.level;
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
        badgeEl.querySelector('.material-symbols-outlined').style.display = 'inline';
      }
  };

  let lastTraySignature = '';
  const renderTray = () => {
    const currentSignature = JSON.stringify(engine.activePieces);
    if (lastTraySignature === currentSignature) return;
    lastTraySignature = currentSignature;

    trayEl.innerHTML = '';
    engine.activePieces.forEach((piece, idx) => {
      const itemContainer = document.createElement('div');
      itemContainer.className = 'w-full h-full flex items-center justify-center relative cursor-grab active:cursor-grabbing';

      if (!piece) {
        trayEl.appendChild(itemContainer);
        return;
      }

      // Draw piece in tray (scaled down)
      const miniBoard = document.createElement('div');
      miniBoard.className = 'relative';
      const MINI_SIZE = Math.min(14, Math.max(9, HEX_SIZE * 0.45)); // Cap size to avoid overflow
      const MINI_W = Math.sqrt(3) * MINI_SIZE;
      const MINI_H = 2 * MINI_SIZE;
      
      piece.cells.forEach(cell => {
        const hex = document.createElement('div');
        const x = Math.sqrt(3) * MINI_SIZE * (cell.q + cell.r / 2);
        const y = 1.5 * MINI_SIZE * cell.r;
        hex.style.position = 'absolute';
        hex.style.width = `${MINI_W - 1}px`;
        hex.style.height = `${MINI_H - 1}px`;
        hex.style.left = `${x - MINI_W/2}px`;
        hex.style.top = `${y - MINI_H/2}px`;
        hex.style.clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
        hex.className = `block-3d-${piece.color}`;
        miniBoard.appendChild(hex);
      });
      itemContainer.appendChild(miniBoard);
      trayEl.appendChild(itemContainer);

      
      // --- DRAG LOGIC ---
      let isDragging = false;
      let floatingEl = null;
      let pieceOriginOffsetX = 0;
      let pieceOriginOffsetY = 0;

      const createFloatingDragEl = (clientX, clientY) => {
        floatingEl = document.createElement('div');
        floatingEl.className = 'absolute z-50 pointer-events-none opacity-90 drag-ghost-element';
        
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        piece.cells.forEach(cell => {
          const x = X_OFFSET_MULTIPLIER * (cell.q + cell.r / 2);
          const y = Y_OFFSET_MULTIPLIER * cell.r;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
          
          const hex = document.createElement('div');
          hex.style.position = 'absolute';
          hex.style.width = `${HEX_WIDTH - 2}px`;
          hex.style.height = `${HEX_HEIGHT - 2}px`;
          hex.style.left = `${x - HEX_WIDTH/2}px`;
          hex.style.top = `${y - HEX_HEIGHT/2}px`;
          hex.style.clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
          hex.className = `block-3d-${piece.color}`;
          floatingEl.appendChild(hex);
        });
        
        const pieceW = (maxX - minX) + HEX_WIDTH;
        const pieceH = (maxY - minY) + HEX_HEIGHT;
        
        // We want the center of the bounding box to be at the mouse
        // The origin (0,0) is relative to minX/minY.
        pieceOriginOffsetX = (minX + pieceW / 2);
        pieceOriginOffsetY = (minY + pieceH / 2);
        
        document.body.appendChild(floatingEl);
        positionFloatingEl(clientX, clientY);
      };

      const positionFloatingEl = (x, y) => {
        if (floatingEl) {
          // Place origin so that the center of the piece is at x, y
          floatingEl.style.left = `${x - pieceOriginOffsetX}px`;
          floatingEl.style.top = `${y - pieceOriginOffsetY}px`;
        }
      };

      const clearGhostPreviews = () => {
        const ghosts = boardEl.querySelectorAll('.ghost-hex');
        ghosts.forEach(g => g.remove());

        const highlighted = boardEl.querySelectorAll('.ghost-highlight');
        highlighted.forEach(hex => {
            if (hex.dataset.origClass) {
              hex.className = hex.dataset.origClass;
              hex.removeAttribute('data-orig-class');
            }
            hex.classList.remove('ghost-highlight', 'brightness-[1.5]', 'scale-105', 'z-20', 'animate-pulse', 'ring-2', 'ring-white/80', 'shadow-[0_0_15px_rgba(255,255,255,0.8)]');
    });
  };

      const updateGhostPreview = (clientX, clientY) => {
        clearGhostPreviews();
        const boardRect = boardEl.getBoundingClientRect();
        
        // The visual origin of the piece is at clientX - pieceOriginOffsetX, clientY - pieceOriginOffsetY
        const targetX = (clientX - pieceOriginOffsetX) - boardRect.left;
        const targetY = (clientY - pieceOriginOffsetY) - boardRect.top;


        // Find closest hex center
        let closestQ = 0;
        let closestR = 0;
        let minDist = Infinity;

        for (let [coord] of engine.board.entries()) {
          const [q, r] = coord.split(',').map(Number);
          const { x, y } = getHexCoords(q, r);
          const dist = Math.sqrt(Math.pow(x - targetX, 2) + Math.pow(y - targetY, 2));
          if (dist < minDist) {
            minDist = dist;
            closestQ = q;
            closestR = r;
          }
        }

        // If distance is reasonable, snap
        if (minDist < HEX_WIDTH) {
          const isValid = engine.canPlace(piece, closestQ, closestR);
          piece.cells.forEach(cell => {
            const q = closestQ + cell.q;
            const r = closestR + cell.r;
            if (engine.isValidCell(q, r)) {
              const hex = createHexagon(q, r, isValid ? 'green' : 'red', true);
              hex.classList.add('ghost-hex');
              boardEl.appendChild(hex);
            }
          });

          if (isValid) {
            const clears = engine.simulatePlacement(piece, closestQ, closestR);
            clears.forEach(coord => {
              const [q, r] = coord.split(',').map(Number);
              const hex = boardEl.querySelector(`[data-q="${q}"][data-r="${r}"]`);
              if (hex) {
                if (!hex.dataset.origClass) {
                hex.dataset.origClass = hex.className;
              }
              hex.className = hex.className.replace(/block-3d-\w+/g, '').replace(/bg-black\/10 dark:bg-white\/\d+/g, '') + ` block-3d-${piece.color} ghost-highlight brightness-[1.5] scale-105 z-20`;
              hex.classList.add('ghost-highlight', 'brightness-[1.5]', 'scale-105', 'z-20', 'animate-pulse', 'ring-2', 'ring-white/80', 'shadow-[0_0_15px_rgba(255,255,255,0.8)]');
              }
            });
          }

          return { q: closestQ, r: closestR, isValid };
        }
        return null;
      };

      const onStart = (clientX, clientY) => {
        isDragging = true;
        miniBoard.style.opacity = '0.1';
        createFloatingDragEl(clientX, clientY);
        Haptics.vibrate('button-tap');
      };

      let rafHexMoveId = null;
      const onMove = (clientX, clientY) => {
        if (!isDragging) return;
        if (rafHexMoveId) cancelAnimationFrame(rafHexMoveId);
        rafHexMoveId = requestAnimationFrame(() => {
          if (!isDragging) return;
          positionFloatingEl(clientX, clientY);
          updateGhostPreview(clientX, clientY);
    });
  };

      const onEnd = (clientX, clientY) => {
        if (!isDragging) return;
        isDragging = false;
        miniBoard.style.opacity = '1';
        const dragResult = updateGhostPreview(clientX, clientY);
        clearGhostPreviews();

        if (floatingEl) {
          floatingEl.remove();
          floatingEl = null;
        }

        if (dragResult && dragResult.isValid) {
          const placed = engine.placePiece(idx, dragResult.q, dragResult.r);
          if (placed) {
            updateBoardUI();
            renderTray();
            Haptics.vibrate('success');
            if (engine.gameOver) showGameOver();
            else AdService.showForcedInterstitial('periodic');
          }
        } else {
          itemContainer.classList.add('animate-shake');
          setTimeout(() => itemContainer.classList.remove('animate-shake'), 300);
          Sounds.playSfx('invalid');
          Haptics.vibrate('invalid');
        }
      };

      // Mouse events
      itemContainer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        onStart(e.clientX, e.clientY);
        const onMouseMove = (ev) => onMove(ev.clientX, ev.clientY);
        const onMouseUp = (ev) => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          onEnd(ev.clientX, ev.clientY);
        };
        window.addEventListener('mousemove', onMouseMove, { signal: dragController.signal });
        window.addEventListener('mouseup', onMouseUp, { signal: dragController.signal });
      });

      // Touch events
      itemContainer.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        onStart(touch.clientX, touch.clientY);
        const onTouchMove = (ev) => {
          ev.preventDefault();
          onMove(ev.touches[0].clientX, ev.touches[0].clientY);
        };
        const onTouchEnd = (ev) => {
          window.removeEventListener('touchmove', onTouchMove);
          window.removeEventListener('touchend', onTouchEnd);
          onEnd(ev.changedTouches[0].clientX, ev.changedTouches[0].clientY);
        };
        window.addEventListener('touchmove', onTouchMove, { passive: false, signal: dragController.signal });
        window.addEventListener('touchend', onTouchEnd, { signal: dragController.signal });
      }, { passive: false });
    });
  };

  const showGameOver = () => {
    if (container.isGameOverModalOpen) return;
    container.isGameOverModalOpen = true;

    const modal = createModal({
      title: t('second_chance') || 'İkinci Şans',
      content: `
        <div class="flex flex-col items-center p-4">
          <span class="text-5xl mb-3 drop-shadow-md">💖</span>
          <p class="text-sm font-bold text-gray-400 mb-6 text-center">${t('revive_desc_hex') || 'Bir kısım hücre temizlenecek, oyuna devam edebilirsin!'}</p>
          <div class="w-full flex flex-col gap-3">
            <button id="modal-revive-diamonds" class="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(236,72,153,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined fill">diamond</span>
              <span>${t('revive_diamonds_hex') || '300 Elmas Harca'}</span>
            </button>
            <button id="modal-revive-ad" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined">play_circle</span>
              <span>${t('revive_ad_hex') || 'Reklam İzle & Devam Et'}</span>
            </button>
            <button id="modal-revive-giveup" class="w-full py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary dark:text-white rounded-2xl font-bold active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center gap-2">
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
      updateBoardUI();
      renderTray();
    };

    const showActualGameOver = () => {
      container.isGameOverModalOpen = false;
      modal.close();
      setTimeout(() => {
        showGameOverModal({
          score: engine.score,
          mode: 'hex',
          onPlayAgain: () => {
            engine.initGame();
            updateBoardUI();
            renderTray();
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
      if (success) doRevive();
    });

    modal.querySelector('#modal-revive-giveup').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      showActualGameOver();
    });
  };

  engine.clearEventCallback = (detail) => {
    const isCombo = !!detail.comboText;

    // 1. Shake the board
    if (isCombo) {
      boardWrapper.classList.add('animate-shake');
      setTimeout(() => boardWrapper.classList.remove('animate-shake'), 400);
    } else {
      boardWrapper.classList.add('animate-shake');
      setTimeout(() => boardWrapper.classList.remove('animate-shake'), 150);
    }

    // 2. Floating text
    const floating = document.createElement('div');
    if (isCombo) {
      // Huge glowing centered combo text
      floating.className = 'absolute z-50 flex flex-col items-center justify-center pointer-events-none';
      floating.innerHTML = `
        <div class="relative flex flex-col items-center justify-center">
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
      floating.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      
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

    // Flash cleared cells with ghost explosion effect
    detail.cells.forEach(coord => {
      const [q, r] = coord.split(',').map(Number);
      const hex = boardEl.querySelector(`[data-q="${q}"][data-r="${r}"]`);
      if (hex) {
        const colorClass = Array.from(hex.classList).find(cls => cls.startsWith('block-3d-'));
        if (colorClass) {
          const rect = hex.getBoundingClientRect();
          
          const ghost = document.createElement('div');
          ghost.className = `fixed z-[9999] pointer-events-none ${colorClass} animate-block-explode`;
          ghost.style.clipPath = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';
          ghost.style.width = `${rect.width}px`;
          ghost.style.height = `${rect.height}px`;
          ghost.style.left = `${rect.left}px`;
          ghost.style.top = `${rect.top}px`;
          
          document.body.appendChild(ghost);
          setTimeout(() => { if (ghost.parentNode) ghost.remove(); }, 450);
        }
      }
    });
  };

  // Undo button listener
  const undoBtn = container.querySelector('#btn-undo');
  if (undoBtn) {
    undoBtn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      Haptics.vibrate('button-tap');
      
      const costs = [50, 150, 300];
      const currentCost = costs[engine.undoCount];
      
      if (engine.history && engine.history.length > 0 && engine.undoCount < costs.length && PlayerState.state.diamonds < currentCost) {
        showUndoAdModal(currentCost, () => {
          const success = engine.undo();
          if (success) {
            updateBoardUI();
            renderTray();
            updateUndoUI();
          }
        });
        return;
      }

      const success = engine.undo();
      if (success) {
        updateBoardUI();
        renderTray();
        updateUndoUI();
      }
    });
  }

  // Help Button Listener
  const helpBtn = container.querySelector('#btn-help');
  if (helpBtn) {
    helpBtn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      checkAndShowTutorial('hex', true);
    });
  }

  // Initial render
  setTimeout(() => {
    elHexScore = container.querySelector('#hex-score');
    elHexBest = container.querySelector('#hex-best');
    elHexLvl = container.querySelector('#hex-lvl');
    renderBoard();
    renderTray();
    updateBoardUI();
    updateUndoUI();
    Sounds.startMusic('game');
    if (engine.gameOver) showGameOver();
    checkAndShowTutorial('hex');
  }, 100);

  let dragController = new AbortController();
  container.cleanup = () => {
    dragController.abort();
    if (topBar.cleanup) topBar.cleanup();
    Sounds.stopMusic();
  
    AdService.hideBanner();};

  // Background decoration
  const bgDeco = document.createElement('div');
  bgDeco.className = 'fixed inset-0 pointer-events-none z-[-1] opacity-20 flex items-center justify-center';
  bgDeco.innerHTML = `<span class="material-symbols-outlined text-[30rem] text-pink-500/10 rotate-12">hexagon</span>`;
  container.appendChild(bgDeco);

  // Show banner when screen opens
  AdService.showBanner();

  // Banner spacer to prevent overlapping
  const bannerSpacer = document.createElement('div');
  bannerSpacer.className = 'w-full h-[65px] pointer-events-none shrink-0';
  container.appendChild(bannerSpacer);



  return container;
}
