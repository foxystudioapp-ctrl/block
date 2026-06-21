import { PlayerState } from '../state/playerState.js';
import { Router } from '../router.js';
import { Sounds } from '../utils/sounds.js';
import { Toast } from '../components/toast.js';
import { t } from '../utils/i18n.js';
import { AdService } from '../services/adService.js';

export function showGameOverModal({ score, mode = 'classic', isWin, myScore, opponentScore, myAvatar, myName, opponentAvatar, opponentName, onPlayAgain, onMainMenu }) {
  const container = document.createElement('div');
  container.className = 'fixed inset-0 z-50 flex items-center justify-center p-6 bg-[#010102]/80 backdrop-blur-md opacity-0 transition-opacity duration-300 pointer-events-auto';

  // Show forced interstitial ad based on session cooldown
  AdService.showForcedInterstitial('gameover');

  // Determine if this is a new record
  let isNewRecord = false;
  let bestScore = 0;

  if (mode === 'classic') {
    bestScore = PlayerState.state.bestScoreClassic;
    isNewRecord = score >= bestScore && score > 0;
  } else if (mode === 'hex') {
    bestScore = PlayerState.state.bestScoreHex;
    isNewRecord = score >= bestScore && score > 0;
  } else if (mode === 'sort') {
    bestScore = PlayerState.state.bestScoreSort;
    isNewRecord = score >= bestScore && score > 0;
  } else if (mode === 'x2' || mode === 'x2_endless') {
    bestScore = PlayerState.state.bestScoreX2;
    isNewRecord = score >= bestScore && score > 0;
  } else if (mode === 'bubble') {
    bestScore = PlayerState.state.bestScoreBubble || 0;
    isNewRecord = score >= bestScore && score > 0;
  }

  const modalBody = document.createElement('div');
  modalBody.className = 'w-full max-w-sm p-6 rounded-3xl glass-card text-center flex flex-col items-center transform scale-90 transition-transform duration-300 shadow-2xl relative overflow-hidden';

  if (mode === 'duel' || mode === 'multiplayer_duel') {
    if (isWin === true) {
      Sounds.playSfx('new-record');
      
      modalBody.innerHTML = `
        <!-- Confetti Particles -->
        <div class="absolute inset-0 pointer-events-none" id="confetti-container"></div>
        
        <!-- Trophy Icon -->
        <div class="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg luminous-glow-cyan animate-bounce mb-4 mt-2">
          <span class="material-symbols-outlined text-5xl text-white fill">emoji_events</span>
        </div>
        
        <h2 class="text-2xl font-black tracking-tight text-amber-500 animate-pulse mb-1">${t('duel_win_title')}</h2>
        
        <!-- Scores Table -->
        <div class="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-4 rounded-2xl flex justify-around items-center mb-6 mt-4">
          <div class="flex flex-col items-center">
            <img src="${myAvatar || '/avatars/akita.png'}" class="w-12 h-12 rounded-full border-2 border-cyan-400 mb-1 object-cover" />
            <span class="text-[10px] font-black truncate w-20 text-center">${myName || t('you') || 'Sen'}</span>
            <span class="text-[9px] font-extrabold text-gray-400 tracking-wider mt-1">${t('your_score')}</span>
            <span class="text-xl font-black text-cyan-400">${myScore.toLocaleString('tr-TR')}</span>
          </div>
          <div class="h-16 w-[1px] bg-black/10 dark:bg-white/10"></div>
          <div class="flex flex-col items-center">
            <img src="${opponentAvatar || '/avatars/robot.png'}" class="w-12 h-12 rounded-full border-2 border-pink-500 mb-1 object-cover" />
            <span class="text-[10px] font-black truncate w-20 text-center">${opponentName || t('opponent') || 'Rakip'}</span>
            <span class="text-[9px] font-extrabold text-gray-400 tracking-wider mt-1">${t('opponent_score')}</span>
            <span class="text-xl font-black text-pink-500">${opponentScore.toLocaleString('tr-TR')}</span>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="w-full flex flex-col space-y-2.5">
          <button id="btn-again" class="w-full py-3.5 bg-secondary dark:bg-[#0070eb] text-white rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2">
            <span class="material-symbols-outlined text-lg">refresh</span>
            <span>${t('restart')}</span>
          </button>
          
          <button id="btn-menu" class="w-full py-3.5 bg-black/5 dark:bg-white/5 text-primary dark:text-white border border-black/5 dark:border-white/5 rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center space-x-2">
            <span class="material-symbols-outlined text-lg">home</span>
            <span>${t('main_menu')}</span>
          </button>
        </div>
      `;

      // Generate confetti elements
      setTimeout(() => {
        const confettiCont = modalBody.querySelector('#confetti-container');
        if (confettiCont) {
          const colors = ['#00e5ff', '#9370DB', '#FFA500', '#22c55e', '#ef4444'];
          for (let i = 0; i < 40; i++) {
            const piece = document.createElement('div');
            piece.className = 'absolute w-2 h-2 rounded-sm opacity-80';
            piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            piece.style.left = `${Math.random() * 100}%`;
            piece.style.top = `-10px`;
            
            piece.style.transform = `rotate(${Math.random() * 360}deg)`;
            const animDuration = 2 + Math.random() * 3;
            const animDelay = Math.random() * 2;
            
            piece.style.transition = `top ${animDuration}s linear ${animDelay}s, transform ${animDuration}s linear ${animDelay}s, left ${animDuration}s ease-in-out ${animDelay}s`;
            confettiCont.appendChild(piece);
            
            setTimeout(() => {
              piece.style.top = '110%';
              piece.style.left = `${parseFloat(piece.style.left) + (Math.random() * 20 - 10)}%`;
              piece.style.transform = `rotate(${Math.random() * 720}deg)`;
            }, 100);
          }
        }
      }, 200);

    } else if (isWin === false) {
      Sounds.playSfx('game-over');
      
      modalBody.innerHTML = `
        <div class="w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 mt-2">
          <span class="material-symbols-outlined text-6xl fill animate-pulse">sentiment_very_dissatisfied</span>
        </div>
        
        <h2 class="text-2xl font-black tracking-tight text-red-500 mb-1">${t('duel_lose_title')}</h2>
        
        <!-- Scores Table -->
        <div class="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-4 rounded-2xl flex justify-around items-center mb-6 mt-4">
          <div class="flex flex-col items-center">
            <img src="${myAvatar || '/avatars/akita.png'}" class="w-12 h-12 rounded-full border-2 border-cyan-400 mb-1 object-cover" />
            <span class="text-[10px] font-black truncate w-20 text-center">${myName || t('you') || 'Sen'}</span>
            <span class="text-[9px] font-extrabold text-gray-400 tracking-wider mt-1">${t('your_score')}</span>
            <span class="text-xl font-black text-cyan-400">${myScore.toLocaleString('tr-TR')}</span>
          </div>
          <div class="h-16 w-[1px] bg-black/10 dark:bg-white/10"></div>
          <div class="flex flex-col items-center">
            <img src="${opponentAvatar || '/avatars/robot.png'}" class="w-12 h-12 rounded-full border-2 border-pink-500 mb-1 object-cover" />
            <span class="text-[10px] font-black truncate w-20 text-center">${opponentName || t('opponent') || 'Rakip'}</span>
            <span class="text-[9px] font-extrabold text-gray-400 tracking-wider mt-1">${t('opponent_score')}</span>
            <span class="text-xl font-black text-pink-500">${opponentScore.toLocaleString('tr-TR')}</span>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="w-full flex flex-col space-y-2.5">
          <button id="btn-again" class="w-full py-3.5 bg-secondary dark:bg-[#0070eb] text-white rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2">
            <span class="material-symbols-outlined text-lg">refresh</span>
            <span>${t('restart')}</span>
          </button>
          
          <button id="btn-menu" class="w-full py-3.5 bg-black/5 dark:bg-white/5 text-primary dark:text-white border border-black/5 dark:border-white/5 rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center space-x-2">
            <span class="material-symbols-outlined text-lg">home</span>
            <span>${t('main_menu')}</span>
          </button>
        </div>
      `;
    } else {
      Sounds.playSfx('game-over');
      
      modalBody.innerHTML = `
        <div class="w-24 h-24 rounded-full bg-gray-500/10 flex items-center justify-center text-gray-400 mb-4 mt-2">
          <span class="material-symbols-outlined text-6xl fill">handshake</span>
        </div>
        
        <h2 class="text-2xl font-black tracking-tight text-gray-400 mb-1">${t('duel_tie_title')}</h2>
        
        <!-- Scores Table -->
        <div class="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-4 rounded-2xl flex justify-around items-center mb-6 mt-4">
          <div class="flex flex-col items-center">
            <img src="${myAvatar || '/avatars/akita.png'}" class="w-12 h-12 rounded-full border-2 border-cyan-400 mb-1 object-cover" />
            <span class="text-[10px] font-black truncate w-20 text-center">${myName || t('you') || 'Sen'}</span>
            <span class="text-[9px] font-extrabold text-gray-400 tracking-wider mt-1">${t('your_score')}</span>
            <span class="text-xl font-black text-cyan-400">${myScore.toLocaleString('tr-TR')}</span>
          </div>
          <div class="h-16 w-[1px] bg-black/10 dark:bg-white/10"></div>
          <div class="flex flex-col items-center">
            <img src="${opponentAvatar || '/avatars/robot.png'}" class="w-12 h-12 rounded-full border-2 border-pink-500 mb-1 object-cover" />
            <span class="text-[10px] font-black truncate w-20 text-center">${opponentName || t('opponent') || 'Rakip'}</span>
            <span class="text-[9px] font-extrabold text-gray-400 tracking-wider mt-1">${t('opponent_score')}</span>
            <span class="text-xl font-black text-pink-500">${opponentScore.toLocaleString('tr-TR')}</span>
          </div>
        </div>
        
        <!-- Actions -->
        <div class="w-full flex flex-col space-y-2.5">
          <button id="btn-again" class="w-full py-3.5 bg-secondary dark:bg-[#0070eb] text-white rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2">
            <span class="material-symbols-outlined text-lg">refresh</span>
            <span>${t('restart')}</span>
          </button>
          
          <button id="btn-menu" class="w-full py-3.5 bg-black/5 dark:bg-white/5 text-primary dark:text-white border border-black/5 dark:border-white/5 rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center space-x-2">
            <span class="material-symbols-outlined text-lg">home</span>
            <span>${t('main_menu')}</span>
          </button>
        </div>
      `;
    }
  } else if (isNewRecord) {
    // Play new record sound
    Sounds.playSfx('new-record');
    
    // Confetti and Trophy style HTML
    modalBody.innerHTML = `
      <!-- Confetti Particles -->
      <div class="absolute inset-0 pointer-events-none" id="confetti-container"></div>
      
      <!-- Trophy Icon -->
      <div class="w-24 h-24 rounded-full bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg luminous-glow-cyan animate-bounce mb-4 mt-2">
        <span class="material-symbols-outlined text-5xl text-white fill">emoji_events</span>
      </div>
      
      <h2 class="text-2xl font-black tracking-tight text-amber-500 animate-pulse mb-1">${t('game_new_record')}</h2>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-6">${t('game_perfect')}</p>
      
      <!-- Scores -->
      <div class="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-4 rounded-2xl flex flex-col items-center justify-center mb-6">
        <span class="text-[10px] font-extrabold text-gray-400 tracking-wider uppercase">${t('game_score_title')}</span>
        <span class="text-4xl font-black text-secondary dark:text-accent-cyan tracking-tight">${score.toLocaleString('tr-TR')}</span>
      </div>
      
      <!-- Actions -->
      <div class="w-full flex flex-col space-y-2.5">
        <button id="btn-again" class="w-full py-3.5 bg-secondary dark:bg-[#0070eb] text-white rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2">
          <span class="material-symbols-outlined text-lg">refresh</span>
          <span>${t('restart')}</span>
        </button>
        
        <button id="btn-share" class="w-full py-3.5 bg-amber-500 text-white rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2">
          <span class="material-symbols-outlined text-lg">share</span>
          <span>${t('game_share_score')}</span>
        </button>

        <button id="btn-menu" class="w-full py-3.5 bg-black/5 dark:bg-white/5 text-primary dark:text-white border border-black/5 dark:border-white/5 rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center space-x-2">
          <span class="material-symbols-outlined text-lg">home</span>
          <span>${t('main_menu')}</span>
        </button>
      </div>
    `;

    // Generate confetti elements
    setTimeout(() => {
      const confettiCont = modalBody.querySelector('#confetti-container');
      if (confettiCont) {
        const colors = ['#00e5ff', '#9370DB', '#FFA500', '#22c55e', '#ef4444'];
        for (let i = 0; i < 40; i++) {
          const piece = document.createElement('div');
          piece.className = 'absolute w-2 h-2 rounded-sm opacity-80';
          piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
          piece.style.left = `${Math.random() * 100}%`;
          piece.style.top = `-10px`;
          
          // CSS animations for falling confetti
          piece.style.transform = `rotate(${Math.random() * 360}deg)`;
          const animDuration = 2 + Math.random() * 3;
          const animDelay = Math.random() * 2;
          
          piece.style.transition = `top ${animDuration}s linear ${animDelay}s, transform ${animDuration}s linear ${animDelay}s, left ${animDuration}s ease-in-out ${animDelay}s`;
          confettiCont.appendChild(piece);
          
          setTimeout(() => {
            piece.style.top = '110%';
            piece.style.left = `${parseFloat(piece.style.left) + (Math.random() * 20 - 10)}%`;
            piece.style.transform = `rotate(${Math.random() * 720}deg)`;
          }, 100);
        }
      }
    }, 200);

  } else {
    // Normal Game Over
    Sounds.playSfx('game-over');

    modalBody.innerHTML = `
      <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 mb-4 mt-2">
        <span class="material-symbols-outlined text-4xl fill animate-pulse">sentiment_very_dissatisfied</span>
      </div>
      
      <h2 class="text-2xl font-black tracking-tight text-primary dark:text-white mb-1">${t('game_over')}</h2>
      <p class="text-xs text-gray-500 dark:text-gray-400 mb-6">${t('game_over_desc')}</p>
      
      <!-- Scores Table -->
      <div class="w-full bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 p-4 rounded-2xl flex justify-around items-center mb-6">
        <div class="flex flex-col items-center">
          <span class="text-[9px] font-extrabold text-gray-400 tracking-wider">${t('game_score_title')}</span>
          <span class="text-xl font-black text-primary dark:text-white">${score.toLocaleString('tr-TR')}</span>
        </div>
        <div class="h-8 w-[1px] bg-black/10 dark:bg-white/10"></div>
        <div class="flex flex-col items-center">
          <span class="text-[9px] font-extrabold text-gray-400 tracking-wider">${t('record')}</span>
          <span class="text-xl font-black text-secondary dark:text-accent-cyan">${bestScore.toLocaleString('tr-TR')}</span>
        </div>
      </div>
      
      <!-- Actions -->
      <div class="w-full flex flex-col space-y-2.5">
        <button id="btn-again" class="w-full py-3.5 bg-secondary dark:bg-[#0070eb] text-white rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-all shadow-md flex items-center justify-center space-x-2">
          <span class="material-symbols-outlined text-lg">refresh</span>
          <span>${t('restart')}</span>
        </button>
        
        <button id="btn-menu" class="w-full py-3.5 bg-black/5 dark:bg-white/5 text-primary dark:text-white border border-black/5 dark:border-white/5 rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center space-x-2">
          <span class="material-symbols-outlined text-lg">home</span>
          <span>${t('main_menu')}</span>
        </button>
      </div>
    `;
  }

  container.appendChild(modalBody);
  document.body.appendChild(container);

  // Close helper
  const close = (callback) => {
    container.classList.remove('opacity-100');
    modalBody.classList.remove('scale-100');
    modalBody.classList.add('scale-90');
    setTimeout(() => {
      container.remove();
      if (callback) callback();
    }, 300);
  };

  // Button Action Listeners
  modalBody.querySelector('#btn-again').addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    close(onPlayAgain);
  });

  modalBody.querySelector('#btn-menu').addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    close(onMainMenu);
  });

  const shareBtn = modalBody.querySelector('#btn-share');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      // Clipboard copy fallback share
      const shareText = t('game_share_text', { score: score, url: window.location.origin });
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
          Toast.show(t('game_share_copied'), 'success');
        });
      } else {
        Toast.show(t('game_shared'), 'success');
      }
    });
  }

  // Trigger open anim
  setTimeout(() => {
    container.classList.add('opacity-100');
    modalBody.classList.add('scale-100');
  }, 10);

  return container;
}
