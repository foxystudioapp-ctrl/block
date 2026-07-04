import { DuelEngine } from '../game/duelEngine.js';
import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { Toast } from '../components/toast.js';
import { createModal } from '../components/modal.js';
import { t } from '../utils/i18n.js';
import { showQuitConfirmation } from '../utils/quitConfirm.js';
import { Router } from '../router.js';
import { TaskState } from '../state/taskState.js';
import { Multiplayer } from '../services/multiplayer.js';
import { Storage } from '../utils/storage.js';
import { getAvatarUrl } from '../utils/avatars.js';
import { AdService } from '../services/adService.js';

export function DuelMode(router) {
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] flex flex-col bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-pop-up overflow-hidden pb-2 sm:pb-3 md:pb-6 lg:pb-10';

  let engine = new DuelEngine(8);

  const showGameOver = () => {
    if (engine.gameOver) {
      import('./gameOver.js').then(m => {
        let isWin = false;
        if (engine.winner === myPlayerNumber) isWin = true;
        else if (engine.winner === 'tie') isWin = 'tie';
        else isWin = false;

        TaskState.updateProgress('duel_play', 1);
        if (isWin === true) {
          TaskState.updateProgress('duel_win', 1);
        }

        const myScore = myPlayerNumber === 1 ? engine.player1Score : engine.player2Score;
        const opponentScore = myPlayerNumber === 1 ? engine.player2Score : engine.player1Score;

        m.showGameOverModal({
          score: myScore,
          mode: 'duel',
          isWin: isWin,
          myScore: myScore,
          opponentScore: opponentScore,
          myAvatar: userAvatarUrl,
          myName: userName,
          opponentAvatar: engine.botAvatar,
          opponentName: engine.botName,
          onPlayAgain: () => {
            router.navigate('#/duel');
          },
          onMainMenu: () => {
            router.navigate('#/menu');
          }
        });
      });
    }
  };
  const isMultiplayer = Storage.get('duel_multiplayer') === true;
  const multiAction = Storage.get('duel_multiplayer_action'); 
  const roomCodeToJoin = Storage.get('duel_room_code');
  let myPlayerNumber = isMultiplayer ? (multiAction === 'create' ? 1 : 2) : 1;

  // --- MULTIPLAYER TIMERS & STRIKES ---
  let turnTimerInterval = null;
  let botTurnTimeout = null;
  let timeLeft = 15;
  let mySkips = 0;
  
  let disconnectTimerInterval = null;
  let disconnectTimeLeft = 30;
  let disconnectModal = null;




  const userAvatarUrl = getAvatarUrl(PlayerState.state.avatarSeed || 'akita');
  const userName = PlayerState.state.profileName || t('you') || 'Sen';

  const topBar = createTopBar(t('menu_duel') || 'BLOK DÜELLOSU', true, () => {
    showQuitConfirmation(router);
  });
  container.appendChild(topBar);

  // VS Header
  
  // Multiplayer Connection Overlay
  const connOverlay = document.createElement('div');
  if (isMultiplayer) {
    connOverlay.className = 'absolute inset-0 bg-primary/95 z-50 flex flex-col items-center justify-center transition-opacity duration-500';
    connOverlay.innerHTML = `
      <span class="material-symbols-outlined text-6xl text-cyan-400 mb-4 animate-spin">sync</span>
      <h2 class="text-2xl font-black text-white mb-2 text-center" id="conn-title">${t('connecting') || t('duel_connecting') || t('duel_connecting') || 'BAĞLANIYOR...'}</h2>
      <div id="conn-desc-container" class="flex flex-col items-center">
        <p class="text-gray-400 font-medium text-center" id="conn-desc"></p>
      </div>
      <button id="conn-cancel-btn" class="mt-8 px-6 py-3 rounded-2xl bg-black/20 text-white font-bold hover:bg-black/40 transition-colors border border-white/10 shadow-sm active:scale-95 flex items-center space-x-2">
        <span class="material-symbols-outlined text-sm">arrow_back</span>
        <span>${t('back_to_menu')}</span>
      </button>
    `;
    
    connOverlay.querySelector('#conn-cancel-btn').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      Multiplayer.leaveRoom();
      router.navigate('#/menu');
    });
    
    container.appendChild(connOverlay);
  }

  // VS Header Wrapper
  const vsHeaderWrapper = document.createElement('div');
  vsHeaderWrapper.className = 'w-full flex-none pt-2 sm:pt-4 md:pt-6 lg:pt-8 pb-0 sm:pb-2 min-h-0 z-10';
  
  const vsHeader = document.createElement('div');
  vsHeader.className = 'px-4 py-2 w-full flex items-center justify-between relative';
  vsHeaderWrapper.appendChild(vsHeader);

  container.appendChild(vsHeaderWrapper);

  // Board Area
  const content = document.createElement('main');
  content.className = 'flex-1 flex flex-col items-center justify-between w-full relative overflow-hidden space-y-4 min-h-0 pb-2 sm:pb-4 md:pb-6 lg:pb-10';

  const boardWrapper = document.createElement('div');
  boardWrapper.className = 'flex-1 flex items-center justify-center px-4 relative z-10 w-full shrink-0 min-h-0';
  const boardEl = document.createElement('div');
  boardEl.id = 'game-board';
  boardEl.className = 'grid gap-[3px] bg-black/5 dark:bg-white/5 p-2 rounded-3xl border border-black/5 dark:border-white/5 shadow-inner relative';
  
  // Overlay to block user clicks during bot turn
  const turnOverlay = document.createElement('div');
  turnOverlay.className = 'absolute inset-0 bg-black/5 dark:bg-white/5 backdrop-blur-[2px] z-20 rounded-3xl flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-300';
  turnOverlay.innerHTML = `<span class="px-4 py-2 bg-gray-900/80 text-white rounded-full font-bold text-sm tracking-widest shadow-xl animate-pulse">${t('opponent_thinking') || t('duel_opponent_thinking') || t('duel_opponent_thinking') || 'RAKİP DÜŞÜNÜYOR...'}</span>`;
  
  boardWrapper.appendChild(boardEl);
  boardWrapper.appendChild(turnOverlay);
  content.appendChild(boardWrapper);

  // Tray Area
  const trayWrapper = document.createElement('div');
  trayWrapper.className = 'w-full flex justify-center pb-0 relative';
  const trayEl = document.createElement('div');
  trayEl.className = 'grid grid-cols-3 gap-2 w-full h-20 md:h-28 lg:h-36 bg-white/40 dark:bg-primary-container/30 border border-black/5 dark:border-white/5 rounded-3xl p-2 shadow-sm relative';
  trayWrapper.appendChild(trayEl);
  content.appendChild(trayWrapper);
  container.appendChild(content);

  // Status variables for dragging
  let draggedPieceIndex = null;
  let dragElement = null;
  let activeCells = [];
  let touchOffsetX = 0;
  let touchOffsetY = 0;

  
  let myRematchReady = false;
  let opponentRematchReady = false;
  let currentMatchId = null;
  let rematchTimerInterval = null;
  let gameOverModalCloseFunc = null;

  if (isMultiplayer) {
    // Override VS names temporarily
    engine.botName = "Rakip";
    
    Multiplayer.onRoomStateChange = (state) => {
      const title = connOverlay.querySelector('#conn-title');
      const desc = connOverlay.querySelector('#conn-desc');
      
      if (state.opponentName) {
        engine.botName = state.opponentName;
        const seed = state.opponentAvatar || 'akita';
        engine.botAvatar = getAvatarUrl(seed);
        renderVSHeader();
      }

      if (state.status === 'waiting') {
        title.innerText = t('duel_room_created') || 'ODA KURULDU!';
        const descContainer = connOverlay.querySelector('#conn-desc-container');
        descContainer.innerHTML = `
          <p class="text-gray-300 font-medium text-center mb-4">${t('send_friend_code') || t('duel_send_code') || t('duel_send_code') || 'Arkadaşına bu kodu gönder:'}</p>
          <div class="flex items-center space-x-3 bg-black/40 pl-6 pr-2 py-2 rounded-2xl border border-white/10 shadow-inner">
            <span class="text-4xl font-black text-white tracking-widest">${Multiplayer.currentRoom}</span>
            <button id="copy-code-btn" class="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/40 active:scale-90 transition-all" title="Kodu Kopyala">
              <span class="material-symbols-outlined">content_copy</span>
            </button>
          </div>
        `;
        
        descContainer.querySelector('#copy-code-btn').addEventListener('click', () => {
          navigator.clipboard.writeText(Multiplayer.currentRoom).then(() => {
            Toast.show(t('duel_code_copied') || 'Oda kodu kopyalandı!', 'success');
            Sounds.playSfx('button-tap');
            Haptics.vibrate('light');
          });
        });
      } else if (state.status === 'playing') {
        connOverlay.style.opacity = '0';
        setTimeout(() => connOverlay.style.pointerEvents = 'none', 500);
        
        if (state.opponentConnected === false) {
          handleOpponentDisconnect();
        } else {
          handleOpponentReconnect();
          if (!turnTimerInterval && state.status === 'playing') {
            startTurnTimer();
          }
        }

      } else if (state.status === 'abandoned' || state.status === 'closed') {
        Toast.show(t('duel_room_closed') || 'Oda kapandı veya rakip ayrıldı.', 'error');
        setTimeout(() => router.navigate('#/menu'), 2000);
      }
      
      if (state.opponentScore !== undefined) {
        if (myPlayerNumber === 1) engine.player2Score = state.opponentScore;
        else engine.player1Score = state.opponentScore;
        renderVSHeader();
      }

      if (state.opponentRematchReady !== undefined) {
         if (state.opponentRematchReady && !opponentRematchReady) {
            Toast.show(t('duel_opponent_rematch'), 'success');
         }
         opponentRematchReady = state.opponentRematchReady;
         
         if (Multiplayer.isHost && myRematchReady && opponentRematchReady) {
            engine.initGame();
            Multiplayer.restartMatch(engine.activePieces);
         }
      }

      if (state.matchId && currentMatchId !== state.matchId) {
         currentMatchId = state.matchId;
         engine.initGame();
         engine.activePieces = [
            (state.initialPieces && state.initialPieces[0]) || null,
            (state.initialPieces && state.initialPieces[1]) || null,
            (state.initialPieces && state.initialPieces[2]) || null
         ];
         myRematchReady = false;
         opponentRematchReady = false;
         if (gameOverModalCloseFunc) {
            gameOverModalCloseFunc();
            gameOverModalCloseFunc = null;
         }
         clearInterval(rematchTimerInterval);
         renderBoard();
         renderVSHeader();
         renderTray();
         startTurnTimer();
      }
    };

    const handleOpponentDisconnect = () => {
      if (engine.gameOver) return;
      
      if (!disconnectModal) {
        clearInterval(turnTimerInterval);
        disconnectTimeLeft = 30;
        
        const modalEl = document.createElement('div');
        modalEl.className = 'fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md opacity-100 transition-opacity duration-300';
        modalEl.innerHTML = `
          <div class="w-full max-w-sm p-6 rounded-3xl glass-card text-center flex flex-col items-center shadow-2xl border border-red-500/30">
            <span class="material-symbols-outlined text-6xl text-red-500 mb-4 animate-bounce">wifi_off</span>
            <h2 class="text-xl font-extrabold mb-2 text-white">${t('duel_opponent_disconnected') || 'Rakibin Bağlantısı Koptu'}</h2>
            <p class="text-gray-400 font-medium mb-6">${t('duel_waiting_reconnect') || 'Rakibin geri dönmesi bekleniyor...'}</p>
            <div class="text-5xl font-black text-red-400 tracking-widest mb-4" id="dc-timer">30</div>
            <button id="dc-leave-btn" class="mt-2 w-full py-3.5 rounded-2xl font-bold bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10">${t('duel_leave_forfeit') || 'Ayrıl ve Pes Et'}</button>
          </div>
        `;
        document.body.appendChild(modalEl);
        disconnectModal = modalEl;
        
        modalEl.querySelector('#dc-leave-btn').addEventListener('click', () => {
          clearInterval(disconnectTimerInterval); // koşan sayaç 2. kez removeChild yapmasın
          disconnectModal = null;
          if (modalEl.parentNode) modalEl.remove();
          Multiplayer.leaveRoom();
          router.navigate('#/menu');
        });
        
        disconnectTimerInterval = setInterval(() => {
          disconnectTimeLeft--;
          const dcTimerEl = modalEl.querySelector('#dc-timer');
          if (dcTimerEl) dcTimerEl.innerText = disconnectTimeLeft;
          
          if (disconnectTimeLeft <= 0) {
            clearInterval(disconnectTimerInterval);
            if (modalEl.parentNode) modalEl.remove();
            disconnectModal = null;

            engine.gameOver = true;
            engine.winner = myPlayerNumber;
            showGameOver();
          }
        }, 1000);
      }
    };

    const handleOpponentReconnect = () => {
      if (disconnectModal) {
        clearInterval(disconnectTimerInterval);
        if (disconnectModal.parentNode) disconnectModal.remove();
        disconnectModal = null;
        Toast.show(t('duel_opponent_reconnected') || 'Rakip geri döndü!', 'success');
        startTurnTimer();
      }
    };

    Multiplayer.onOpponentMove = (move) => {
      if (engine.turn !== myPlayerNumber && !engine.gameOver) {

        if (move.type === 'forfeit') {
          engine.gameOver = true;
          engine.winner = myPlayerNumber;
          showGameOver();
          return;
        }
        
        if (move.type === 'skip') {
          engine.turn = myPlayerNumber;
          engine.activePieces = [
            (move.newPieces && move.newPieces[0]) || null,
            (move.newPieces && move.newPieces[1]) || null,
            (move.newPieces && move.newPieces[2]) || null
          ];
          Toast.show(t('duel_time_up_opponent') || 'Rakibin süresi doldu! Sıra sende.', 'success');
          updateBoardUI();
          renderTray();
          startTurnTimer();
          return;
        }

        turnOverlay.classList.remove('opacity-0', 'pointer-events-none');
        
        setTimeout(() => {
          engine.activePieces[move.pieceIdx] = move.playedPiece;
          const piece = move.playedPiece;
          
          const slotEl = trayEl.children[move.pieceIdx];
          const targetCellEl = boardEl.querySelector(`[data-r="${move.r}"][data-c="${move.c}"]`);
          
          const completeMove = () => {
            engine.placePiece(move.pieceIdx, move.r, move.c);
            engine.activePieces = [
              (move.newPieces && move.newPieces[0]) || null,
              (move.newPieces && move.newPieces[1]) || null,
              (move.newPieces && move.newPieces[2]) || null
            ];
            startTurnTimer();
            updateBoardUI();
            renderTray();
            turnOverlay.classList.add('opacity-0', 'pointer-events-none');
            if (engine.gameOver) showGameOver();
          };

          if (slotEl && targetCellEl && piece) {
            slotEl.style.opacity = '0';
            const slotRect = slotEl.getBoundingClientRect();
            const targetRect = targetCellEl.getBoundingClientRect();
            
            const clone = createPieceThumbnail(piece);
            clone.style.position = 'fixed';
            clone.style.left = `${slotRect.left + (slotRect.width / 2)}px`;
            clone.style.top = `${slotRect.top + (slotRect.height / 2)}px`;
            clone.style.transform = 'translate(-50%, -50%) scale(1)';
            clone.style.zIndex = '9999';
            clone.style.pointerEvents = 'none';
            document.body.appendChild(clone);
            
            const maxDimension = Math.max(piece.matrix.length, piece.matrix[0].length);
            const isTablet = window.innerWidth >= 768;
            const baseSize = maxDimension <= 3 ? 18 : 14;
            const thumbCellSize = isTablet ? Math.floor(baseSize * 1.5) : baseSize;
            
            const boardCellPixelSize = targetCellEl.offsetWidth;
            const boardTargetWidth = (piece.matrix[0].length * boardCellPixelSize) + ((piece.matrix[0].length - 1) * 3);
            const boardTargetHeight = (piece.matrix.length * boardCellPixelSize) + ((piece.matrix.length - 1) * 3);
            
            const destX = targetRect.left + (boardTargetWidth / 2);
            const destY = targetRect.top + (boardTargetHeight / 2);
            const scaleTarget = boardCellPixelSize / thumbCellSize;

            const animation = clone.animate([
              { left: `${slotRect.left + (slotRect.width / 2)}px`, top: `${slotRect.top + (slotRect.height / 2)}px`, transform: 'translate(-50%, -50%) scale(1)' },
              { left: `${destX}px`, top: `${destY}px`, transform: `translate(-50%, -50%) scale(${scaleTarget})` }
            ], {
              duration: 400,
              easing: 'ease-in-out',
              fill: 'forwards'
            });

            animation.onfinish = () => {
              document.body.removeChild(clone);
              completeMove();
            };
          } else {
            completeMove();
          }
        }, 100);
      }
    };

    if (multiAction === 'create') {
      Multiplayer.createRoom(engine.activePieces).catch(e => {
        Toast.show(t('room_create_failed') + e.message, 'error');
        if (isMultiplayer) { Multiplayer.leaveRoom(); clearInterval(turnTimerInterval); clearInterval(disconnectTimerInterval); }
            router.navigate('#/menu');
      });
    } else {
      Multiplayer.joinRoom(roomCodeToJoin).then(initialPieces => {
        if (initialPieces) {
          engine.activePieces = [
            (initialPieces && initialPieces[0]) || null,
            (initialPieces && initialPieces[1]) || null,
            (initialPieces && initialPieces[2]) || null
          ];
          renderTray();
        }
      }).catch(e => {
        Toast.show(t('duel_join_failed') || 'Odaya katılınamadı: ' + e.message, 'error');
        router.navigate('#/menu');
      });
    }
  }

  const startTurnTimer = () => {
    if (!isMultiplayer) return;
    clearInterval(turnTimerInterval);
    timeLeft = 15;
    renderVSHeader();
    
    turnTimerInterval = setInterval(() => {
      timeLeft--;
      // Only update the timer text span, not the whole header (avoid full innerHTML rebuild)
      const timerEl = vsHeader.querySelector('#turn-timer-text');
      if (timerEl) {
        timerEl.textContent = `00:${timeLeft.toString().padStart(2, '0')}`;
        const timerBox = timerEl.closest('div');
        if (timerBox) {
          if (timeLeft <= 5) {
            timerBox.classList.add('animate-pulse', 'text-red-500');
            timerBox.classList.remove('text-white');
          } else {
            timerBox.classList.remove('animate-pulse', 'text-red-500');
            timerBox.classList.add('text-white');
          }
        }
      } else {
        // Fallback: full re-render if timer element not found
        renderVSHeader();
      }
      
      if (timeLeft <= 5 && timeLeft > 0) {
        Sounds.playSfx('button-tap');
      }
      
      if (timeLeft <= 0) {
        clearInterval(turnTimerInterval);
        handleTurnTimeout();
      }
    }, 1000);
  };

  const handleTurnTimeout = () => {
    if (engine.turn === myPlayerNumber) {
      mySkips++;
      if (mySkips >= 2) {
        Multiplayer.sendMove({ type: 'forfeit' });
        engine.gameOver = true;
        engine.winner = myPlayerNumber === 1 ? 2 : 1;
        showGameOver();
      } else {
        Toast.show(t('time_up_turn_passed'), 'error');
        engine.turn = myPlayerNumber === 1 ? 2 : 1;
        Multiplayer.sendMove({ 
          type: 'skip',
          newPieces: engine.activePieces 
        });
        updateBoardUI();
        renderTray();
        startTurnTimer();
      }
    }
  };

  const userLevel = PlayerState.state.level || 1;
  const userRankInfo = PlayerState.getRankInfo ? PlayerState.getRankInfo(userLevel) : { key: 'rank_novice', color: 'text-gray-400' };
  const userRankTitle = t(userRankInfo.key) || 'Acemi';

  const renderVSHeader = () => {
    const isMyTurn = engine.turn === myPlayerNumber;
    const myScore = myPlayerNumber === 1 ? engine.player1Score : engine.player2Score;
    const oppScore = myPlayerNumber === 1 ? engine.player2Score : engine.player1Score;

    const botLevel = engine.botLevel || 1;
    const botRankInfo = PlayerState.getRankInfo ? PlayerState.getRankInfo(botLevel) : { key: 'rank_novice', color: 'text-gray-400' };
    const botRankTitle = t(botRankInfo.key) || 'Acemi';

    vsHeader.innerHTML = `
      <!-- User (P1) -->
      <div class="flex flex-col items-center relative transition-transform ${isMyTurn ? 'scale-110' : 'scale-95 opacity-60'}">
        <div class="relative ${PlayerState.state.isVip ? 'premium-avatar-frame' : ''}">
          <img loading="lazy" decoding="async" src="${userAvatarUrl}" class="w-14 h-14 rounded-full border-4 ${isMyTurn && !PlayerState.state.isVip ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : !PlayerState.state.isVip ? 'border-gray-400/30' : ''} bg-white/10" style="object-fit: cover; background-color: transparent;" />
          ${isMyTurn ? '<div class="absolute -bottom-1 -right-1 w-4 h-4 bg-cyan-400 rounded-full border-2 border-white animate-pulse z-20"></div>' : ''}
          ${PlayerState.state.isVip ? '<div class="absolute -top-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-md border border-yellow-200 z-30">VIP</div>' : ''}
        </div>
        <span class="text-[10px] font-black mt-2 truncate w-20 text-center">${userName}</span>
        <span class="text-[9px] font-black text-secondary tracking-widest mt-0.5">SV ${userLevel} - ${userRankTitle}</span>
        <span class="text-xl font-black text-cyan-500">${myScore.toLocaleString()}</span>
      </div>

      <!-- Timer Display (Multiplayer only) -->
      ${isMultiplayer ? `
        <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 flex items-center justify-center">
          <div class="bg-gray-900/80 rounded-full px-4 py-1 border border-white/10 shadow-lg flex items-center space-x-2 ${timeLeft <= 5 ? 'animate-pulse text-red-500' : 'text-white'}">
            <span class="material-symbols-outlined text-[14px]">timer</span>
            <span class="font-black tracking-widest text-sm" id="turn-timer-text">00:${timeLeft.toString().padStart(2, '0')}</span>
          </div>
        </div>
      ` : ''}

        <!-- VS Badge -->
        <div class="flex flex-col items-center justify-center mx-2 mt-2">
          <span class="material-symbols-outlined text-gray-400 dark:text-gray-500 mb-1" style="font-size: 20px;">swords</span>
          <span class="text-xs font-black tracking-widest text-gray-400 mb-1">VS</span>
          <div class="h-8 w-px bg-gray-300 dark:bg-gray-700"></div>
        </div>

      <!-- Bot (P2) -->
      <div class="flex flex-col items-center relative transition-transform ${!isMyTurn ? 'scale-110' : 'scale-95 opacity-60'}">
        <div class="relative">
          <img loading="lazy" decoding="async" src="${engine.botAvatar}" class="w-14 h-14 rounded-full border-4 ${!isMyTurn ? 'border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]' : 'border-gray-400/30'} bg-white/10" style="object-fit: cover; background-color: transparent;" />
          ${!isMyTurn ? '<div class="absolute -bottom-1 -left-1 w-4 h-4 bg-pink-500 rounded-full border-2 border-white animate-pulse"></div>' : ''}
        </div>
        <span class="text-[10px] font-black mt-2 truncate w-20 text-center">${engine.botName}</span>
        <span class="text-[9px] font-black text-secondary tracking-widest mt-0.5">SV ${isMultiplayer ? (window.opponentLevel || '?') : botLevel} - ${isMultiplayer ? t('player_label') : botRankTitle}</span>
        <span class="text-xl font-black text-pink-500">${oppScore.toLocaleString()}</span>
      </div>
    `;
  };

  // Board cell map for O(1) lookup during drag ghost preview
  const boardCellMap = new Map();

  const renderBoard = () => {
    boardEl.innerHTML = '';
    boardCellMap.clear();
    boardEl.style.gridTemplateColumns = `repeat(8, minmax(0, 1fr))`;
    boardEl.style.gridTemplateRows = `repeat(8, minmax(0, 1fr))`;

    const w = window.innerWidth;
    const topReserved  = w >= 1024 ? 280 : w >= 768 ? 260 : 240;
    const botReserved  = w >= 1024 ? 160 : w >= 768 ? 140 : 120;
    const maxFromHeight = window.innerHeight - topReserved - botReserved;
    const maxFromWidth  = w - (w >= 1024 ? 80 : 32);
    const capWidth      = w >= 1024 ? 600 : w >= 768 ? 500 : 440;
    const maxBoardWidth = Math.min(maxFromWidth, maxFromHeight, capWidth);
    const cellWidth = Math.floor((maxBoardWidth - 16 - 21) / 8);
    
    boardEl.style.width = `${maxBoardWidth}px`;
    boardEl.style.height = `${maxBoardWidth}px`;
    trayEl.style.width = `${maxBoardWidth}px`;

    const frag = document.createDocumentFragment();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const cell = document.createElement('div');
        cell.className = 'aspect-square rounded-lg flex items-center justify-center transition-all duration-200';
        cell.style.width = `${cellWidth}px`;
        cell.style.height = `${cellWidth}px`;
        cell.setAttribute('data-r', r.toString());
        cell.setAttribute('data-c', c.toString());

        const color = engine.board[r][c];
        if (color) {
          cell.className += ` block-3d-${color}`;
        } else {
          cell.className += ' grid-cell-empty';
        }
        boardCellMap.set(`${r},${c}`, cell);
        frag.appendChild(cell);
      }
    }
    boardEl.appendChild(frag);
  };

  const updateBoardUI = () => {
    const cells = boardEl.querySelectorAll('[data-r]');
    cells.forEach(cell => {
      const r = parseInt(cell.getAttribute('data-r'));
      const c = parseInt(cell.getAttribute('data-c'));
      const color = engine.board[r][c];
      
      if (cell.dataset.cachedColor === String(color)) return;
      cell.dataset.cachedColor = color;
      
      cell.className = 'aspect-square rounded-lg flex items-center justify-center transition-all duration-200';
      cell.style.transform = '';
      
      if (color) {
        cell.className += ` block-3d-${color}`;
      } else {
        cell.className += ' grid-cell-empty';
      }
    });

    renderVSHeader();
  };

  const createPieceThumbnail = (piece) => {
    const thumb = document.createElement('div');
    if (!piece) return thumb; // empty
    
    const maxDimension = Math.max(piece.matrix.length, piece.matrix[0].length);
    const isTablet = window.innerWidth >= 768;
    const baseSize = maxDimension <= 3 ? 18 : 14;
    const cellSize = isTablet ? Math.floor(baseSize * 1.5) : baseSize;

    thumb.style.display = 'grid';
    thumb.style.gridTemplateRows = `repeat(${piece.matrix.length}, ${cellSize}px)`;
    thumb.style.gridTemplateColumns = `repeat(${piece.matrix[0].length}, ${cellSize}px)`;
    thumb.style.gap = '2px';

    for (let i = 0; i < piece.matrix.length; i++) {
      for (let j = 0; j < piece.matrix[0].length; j++) {
        const block = document.createElement('div');
        if (piece.matrix[i][j]) {
          block.className = `block-3d-${piece.color} rounded-[4px]`;
          block.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        } else {
          block.style.visibility = 'hidden';
        }
        thumb.appendChild(block);
      }
    }
    return thumb;
  };

  let lastTraySignature = '';
  const renderTray = () => {
    const currentSignature = JSON.stringify({ p: engine.currentPlayer, ap: engine.activePieces });
    if (lastTraySignature === currentSignature) return;
    lastTraySignature = currentSignature;

    trayEl.innerHTML = '';
    engine.activePieces.forEach((piece, idx) => {
      const slot = document.createElement('div');
      slot.className = 'w-full h-full flex flex-col items-center justify-center relative touch-none select-none';
      
      if (piece) {
        const thumb = createPieceThumbnail(piece);
        thumb.className += ' transition-transform duration-200';
        slot.appendChild(thumb);

        // Bind touch events only if it's player's turn
        if (engine.turn === myPlayerNumber) {
          slot.style.touchAction = 'none';
          
          slot.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            handlePointerDown(touch.clientX, touch.clientY, idx, piece, thumb);
          });
          
          slot.addEventListener('mousedown', (e) => {
            e.preventDefault();
            handlePointerDown(e.clientX, e.clientY, idx, piece, thumb);
          });
        } else {
          thumb.classList.add('opacity-50');
        }
      } else {
        // Empty slot placeholder
        slot.innerHTML = `<div class="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 border border-dashed border-black/10 dark:border-white/10"></div>`;
      }
      trayEl.appendChild(slot);
    });
  };

  const executeBotTurn = () => {
    if (engine.gameOver || engine.turn !== 2) return;
    
    turnOverlay.classList.remove('opacity-0', 'pointer-events-none');
    
    clearTimeout(botTurnTimeout);
    botTurnTimeout = setTimeout(() => {
      if (!container.isConnected) return; // ekran kapandıysa bot hamlesi yapma
      const move = engine.calculateBotMove();
      if (move) {
        const piece = engine.activePieces[move.pieceIdx];
        const slotEl = trayEl.children[move.pieceIdx];
        const targetCellEl = boardEl.querySelector(`[data-r="${move.r}"][data-c="${move.c}"]`);
        
        const completeMove = () => {
          engine.placePiece(move.pieceIdx, move.r, move.c);
          Sounds.playSfx('block-place');
          
          updateBoardUI();
          renderTray();
          turnOverlay.classList.add('opacity-0', 'pointer-events-none');
          
          engine.turn = 1;
          
          if (engine.gameOver) {
            showGameOver();
          }
        };

        if (slotEl && targetCellEl && piece) {
          slotEl.style.opacity = '0';
          const slotRect = slotEl.getBoundingClientRect();
          const targetRect = targetCellEl.getBoundingClientRect();
          
          const clone = createPieceThumbnail(piece);
          clone.style.position = 'fixed';
          clone.style.left = `${slotRect.left + (slotRect.width / 2)}px`;
          clone.style.top = `${slotRect.top + (slotRect.height / 2)}px`;
          clone.style.transform = 'translate(-50%, -50%) scale(1)';
          clone.style.zIndex = '9999';
          clone.style.pointerEvents = 'none';
          document.body.appendChild(clone);
          
          const maxDimension = Math.max(piece.matrix.length, piece.matrix[0].length);
          const isTablet = window.innerWidth >= 768;
          const baseSize = maxDimension <= 3 ? 18 : 14;
          const thumbCellSize = isTablet ? Math.floor(baseSize * 1.5) : baseSize;
          
          const boardCellPixelSize = targetCellEl.offsetWidth;
          const boardTargetWidth = (piece.matrix[0].length * boardCellPixelSize) + ((piece.matrix[0].length - 1) * 3);
          const boardTargetHeight = (piece.matrix.length * boardCellPixelSize) + ((piece.matrix.length - 1) * 3);
          
          const destX = targetRect.left + (boardTargetWidth / 2);
          const destY = targetRect.top + (boardTargetHeight / 2);
          const scaleTarget = boardCellPixelSize / thumbCellSize;

          const animation = clone.animate([
            { left: `${slotRect.left + (slotRect.width / 2)}px`, top: `${slotRect.top + (slotRect.height / 2)}px`, transform: 'translate(-50%, -50%) scale(1)' },
            { left: `${destX}px`, top: `${destY}px`, transform: `translate(-50%, -50%) scale(${scaleTarget})` }
          ], {
            duration: 400,
            easing: 'ease-in-out',
            fill: 'forwards'
          });

          animation.onfinish = () => {
            document.body.removeChild(clone);
            completeMove();
          };
        } else {
          completeMove();
        }
      } else {
        updateBoardUI();
        renderTray();
        turnOverlay.classList.add('opacity-0', 'pointer-events-none');
        if (engine.gameOver) {
          showGameOver();
        }
      }
    }, 600);
  };

  let cachedBoardRect = null;
  let cachedCellPixelSize = 0;
  let cachedLastGhostRow = null;
  let cachedLastGhostCol = null;

  // Drag logic using Touch & Mouse Events
  const handlePointerDown = (clientX, clientY, idx, piece, thumbEl) => {
    if ((isMultiplayer && engine.turn !== myPlayerNumber) || (!isMultiplayer && engine.turn !== 1) || engine.gameOver) return;

    draggedPieceIndex = idx;

    Haptics.vibrate('light');
    thumbEl.style.opacity = '0';

    dragElement = document.createElement('div');
    dragElement.className = 'drag-ghost-element';
    dragElement.style.position = 'fixed';
    dragElement.style.pointerEvents = 'none';
    dragElement.style.zIndex = '9999';

    cachedBoardRect = boardEl.getBoundingClientRect();
    cachedCellPixelSize = boardEl.querySelector('[data-r="0"]').offsetWidth;
    cachedLastGhostRow = null;
    cachedLastGhostCol = null;

    const cellPixelSize = cachedCellPixelSize;
    const gap = 3;

    dragElement.style.display = 'grid';
    dragElement.style.gridTemplateRows = `repeat(${piece.matrix.length}, ${cellPixelSize}px)`;
    dragElement.style.gridTemplateColumns = `repeat(${piece.matrix[0].length}, ${cellPixelSize}px)`;
    dragElement.style.gap = `${gap}px`;

    activeCells = [];

    for (let i = 0; i < piece.matrix.length; i++) {
      for (let j = 0; j < piece.matrix[0].length; j++) {
        const block = document.createElement('div');
        if (piece.matrix[i][j]) {
          block.className = `block-3d-${piece.color} rounded-lg`;
          block.dataset.dr = i;
          block.dataset.dc = j;
          activeCells.push(block);
        } else {
          block.style.visibility = 'hidden';
        }
        dragElement.appendChild(block);
      }
    }

    document.body.appendChild(dragElement);
    const dragRect = dragElement.getBoundingClientRect();
    
    // Center based on pointer
    touchOffsetX = dragRect.width / 2;
    touchOffsetY = dragRect.height + 40; 

    handlePointerMove(clientX, clientY);

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchUp);
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  let rafDuelMoveId = null;

  const handleTouchMove = (e) => {
    if (!dragElement) return;
    e.preventDefault();
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    if (rafDuelMoveId) cancelAnimationFrame(rafDuelMoveId);
    rafDuelMoveId = requestAnimationFrame(() => handlePointerMove(x, y));
  };

  const handleMouseMove = (e) => {
    if (!dragElement) return;
    const x = e.clientX;
    const y = e.clientY;
    if (rafDuelMoveId) cancelAnimationFrame(rafDuelMoveId);
    rafDuelMoveId = requestAnimationFrame(() => handlePointerMove(x, y));
  };

  let currentGhostCells = [];

  const handlePointerMove = (x, y) => {
    if (!dragElement) return;

    dragElement.style.left = `${x - touchOffsetX}px`;
    dragElement.style.top = `${y - touchOffsetY}px`;

    const piece = engine.activePieces[draggedPieceIndex];
    const rect = dragElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const { r, c, valid } = getBoardHoverPosition(centerX, centerY, piece);

    if (r === cachedLastGhostRow && c === cachedLastGhostCol) {
      return; // Skip redraw if position hasn't changed
    }
    
    cachedLastGhostRow = r;
    cachedLastGhostCol = c;

    // Clear previous hover using the stored array instead of querySelectorAll to prevent freeze
    currentGhostCells.forEach(cell => {
      if (cell.dataset.origClass) {
        cell.className = cell.dataset.origClass;
        cell.removeAttribute('data-orig-class');
      }
      cell.classList.remove('bg-white/20', 'bg-red-500/30', 'ghost-highlight', 'brightness-[1.5]', 'scale-105', 'z-20', 'animate-pulse', 'ring-2', 'ring-white/80', 'shadow-[0_0_15px_rgba(255,255,255,0.8)]');
    });
    currentGhostCells = [];

    if (r !== -1 && c !== -1) {
      for (let i = 0; i < piece.matrix.length; i++) {
        for (let j = 0; j < piece.matrix[0].length; j++) {
          if (piece.matrix[i][j]) {
            const tr = r + i;
            const tc = c + j;
            if (tr >= 0 && tr < 8 && tc >= 0 && tc < 8) {
              const targetCell = boardCellMap.get(`${tr},${tc}`);
              if (targetCell && targetCell.classList.contains('grid-cell-empty')) {
                currentGhostCells.push(targetCell);
                targetCell.classList.add(valid ? 'bg-white/20' : 'bg-red-500/30');
              }
            }
          }
        }
      }

      if (valid) {
        const clears = engine.simulatePlacement(piece.matrix, r, c);
        const clearedCells = new Set();
        clears.rows.forEach(row => {
          for (let col = 0; col < 8; col++) clearedCells.add(`${row},${col}`);
        });
        clears.cols.forEach(col => {
          for (let row = 0; row < 8; row++) clearedCells.add(`${row},${col}`);
        });

        clearedCells.forEach(coord => {
            const [r, c] = coord.split(',').map(Number);
            const cell = boardCellMap.get(`${r},${c}`);
            if (cell) {
              if (!cell.dataset.origClass) cell.dataset.origClass = cell.className;
              currentGhostCells.push(cell);
              cell.className = cell.className.replace(/block-3d-\w+/g, '').replace(/bg-black\/10 dark:bg-white\/\d+/g, '') + ` block-3d-${piece.color} ghost-highlight brightness-[1.5] scale-105 z-10`;
            }
          });
      }
    }
  };

  const handleTouchUp = (e) => {
    handlePointerUp(e);
  };

  const handleMouseUp = (e) => {
    handlePointerUp(e);
  };

  const handlePointerUp = () => {
    if (!dragElement) return;

    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchUp);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);

    // We get position directly from the dragElement current position before removing it
    const rect = dragElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    document.body.removeChild(dragElement);
    const piece = engine.activePieces[draggedPieceIndex];
    
    const { r, c, valid } = getBoardHoverPosition(centerX, centerY, piece);
    dragElement = null;

    // Clear highlights
    currentGhostCells.forEach(cell => {
      if (cell.dataset.origClass) {
        cell.className = cell.dataset.origClass;
        cell.removeAttribute('data-orig-class');
      }
      cell.classList.remove('bg-white/20', 'bg-red-500/30', 'ghost-highlight', 'brightness-[1.5]', 'scale-105', 'z-20', 'animate-pulse', 'ring-2', 'ring-white/80', 'shadow-[0_0_15px_rgba(255,255,255,0.8)]');
    });
    currentGhostCells = [];

    if (valid) {
      engine.placePiece(draggedPieceIndex, r, c);
      Sounds.playSfx('block-place');
      
      if (typeof isMultiplayer !== 'undefined' && isMultiplayer) {
         Multiplayer.sendMove({
            type: 'place',
            pieceIdx: draggedPieceIndex,
            r, c,
            playedPiece: piece,
            newPieces: engine.activePieces
         });
         engine.turn = myPlayerNumber === 1 ? 2 : 1;
         startTurnTimer();
      } else {
         engine.turn = 2; // Pass turn to bot
      }
      
      updateBoardUI();
      renderTray();
      
      if (engine.gameOver) {
        showGameOver();
      } else if (typeof isMultiplayer !== 'undefined' && !isMultiplayer) {
        clearTimeout(botTurnTimeout);
        botTurnTimeout = setTimeout(() => { if (container.isConnected) executeBotTurn(); }, 500);
      }
    } else {
      Sounds.playSfx('invalid');
      const slot = trayEl.children[draggedPieceIndex];
      if (slot && slot.firstChild) {
        slot.firstChild.style.opacity = '1';
      }
    }
    
    draggedPieceIndex = null;
  };

  const getBoardHoverPosition = (x, y, piece) => {
    if (!piece || !cachedBoardRect) return { r: -1, c: -1, valid: false };
    const gap = 3;

    const originX = x - (piece.matrix[0].length * (cachedCellPixelSize + gap)) / 2;
    const originY = y - (piece.matrix.length * (cachedCellPixelSize + gap)) / 2;

    const col = Math.round((originX - cachedBoardRect.left) / (cachedCellPixelSize + gap));
    const row = Math.round((originY - cachedBoardRect.top) / (cachedCellPixelSize + gap));

    if (row >= -piece.matrix.length && row < 8 && col >= -piece.matrix[0].length && col < 8) {
      const valid = engine.canPlace(piece.matrix, row, col);
      return { r: row, c: col, valid };
    }
    return { r: -1, c: -1, valid: false };
  };

  renderVSHeader();
  renderBoard();
  renderTray();

  
  const handleHashChange = () => {
    if (window.location.hash !== '#/duel' && isMultiplayer) {
      Multiplayer.leaveRoom();
    }
  };
  window.addEventListener('hashchange', handleHashChange);
  
  container.cleanup = () => {
    if (isMultiplayer && window.location.hash !== '#/duel') {
      Multiplayer.leaveRoom();
    }
    // Multiplayer singleton callback'leri null'lanmazsa geç gelen RTDB event'leri
    // ayrılmış ekranda showGameOver()/navigate() çalıştırır.
    Multiplayer.onRoomStateChange = null;
    Multiplayer.onOpponentMove = null;
    if (topBar.cleanup) topBar.cleanup();
    AdService.hideBanner();
    clearInterval(turnTimerInterval);
    clearInterval(disconnectTimerInterval);
    clearInterval(rematchTimerInterval);
    clearTimeout(botTurnTimeout);
    if (rafDuelMoveId) cancelAnimationFrame(rafDuelMoveId); // L5: unmount sonrası orphan kareyi iptal et
    window.removeEventListener('hashchange', handleHashChange);
  };

  // Show banner when screen opens
  AdService.showBanner();

  // Banner spacer to prevent overlapping
  const bannerSpacer = document.createElement('div');
  bannerSpacer.className = 'w-full h-[65px] pointer-events-none shrink-0';
  container.appendChild(bannerSpacer);



  return container;
}

