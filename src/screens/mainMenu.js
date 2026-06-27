import { createTopBar } from '../components/topBar.js';
import { createBottomNav } from '../components/bottomNav.js';
import { createGlassCard } from '../components/glassCard.js';
import { createProgressBar } from '../components/progressBar.js';
import { PlayerState } from '../state/playerState.js';
import { Storage } from '../utils/storage.js';
import { initSwipeNavigation } from '../utils/swipeNav.js';
import { t } from '../utils/i18n.js';
import { Sounds } from '../utils/sounds.js';
import { createClassicHint, createAdventureHint, createHexHint, createSortHint, create2048Hint, createMergeHint, createX2Hint, createBubbleHint, createArrowHint } from '../components/gameHints.js';
import { showDailyRewardModal } from '../components/dailyReward.js';
import { showConsentModal } from '../components/consentModal.js';
import { createModal } from '../components/modal.js';
import { Toast } from '../components/toast.js';

export function MainMenu(router) {
  // Reset duel request ignore flag when returning to main menu
  if (PlayerState.state.ignoreDuelRequests) {
    PlayerState.state.ignoreDuelRequests = false;
    PlayerState.save();
  }

  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] flex flex-col justify-between bg-bg-light dark:bg-primary text-primary dark:text-white select-none relative overflow-hidden';

  // Sezon Sonu Ödül Kontrolü
  if (PlayerState.state.pendingSeasonRewards) {
    const rewards = PlayerState.state.pendingSeasonRewards;
    setTimeout(() => {
      const rewardModal = createModal({
        title: t('season_ended') || 'Sezon Sona Erdi!',
        content: `
          <div class="flex flex-col items-center p-6 space-y-4 text-center">
            <span class="text-6xl animate-bounce">🏆</span>
            <h3 class="text-xl font-black text-primary dark:text-white">${t('new_month_started') || 'Yeni Ay Başladı!'}</h3>
            <p class="text-sm font-bold text-gray-500">Geçtiğimiz sezonu <span class="text-secondary uppercase font-black tracking-wider">${rewards.league}</span> seviyesinde tamamladın.</p>
            <div class="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 flex flex-col items-center gap-2 mt-4 w-full">
              <span class="text-xs font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">${t('your_reward') || 'ÖDÜLÜN'}</span>
              <div class="flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-4xl text-cyan-500 fill drop-shadow-md">diamond</span>
                <span class="text-4xl font-black text-cyan-500">+${rewards.diamonds}</span>
              </div>
            </div>
            <p class="text-[10px] text-gray-400 mt-4">${t('season_reset_desc') || 'Tüm sıralama puanları sıfırlandı. Bu ay Şampiyonluk Ligine çıkabilecek misin?'}</p>
          </div>
        `,
        actions: [
          { text: t('claim') || 'Ödülü Al', primary: true, onClick: (close) => {
              PlayerState.claimSeasonRewards();
              close();
              Toast.show(t('diamonds_earned', { amount: rewards.diamonds }) || `+${rewards.diamonds} Elmas kazandın!`, 'success');
          }}
        ]
      });
      document.body.appendChild(rewardModal);
    }, 600);
  }

  // 1. Top Bar
  const topBar = createTopBar('BLOXY', false);
  container.appendChild(topBar);

  // Scrollable Content Area
  const content = document.createElement('main');
  content.className = 'flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar';

  // Removed Score Board & Streak Pill as requested
  // 3. Classic Block Button (Big Hero Button)
  // Track hint cleanups
  const hintCleanups = [];

  const classicBtn = document.createElement('button');
  classicBtn.className = 'w-full block-3d-blue text-white rounded-3xl p-5 text-left flex items-center justify-between border-b-4 border-blue-800 active:translate-y-1 active:border-b-0 active:shadow-inner transition-all transform duration-200 shadow-md group relative overflow-hidden animate-hero-breathe';
  classicBtn.innerHTML = `
    <div class="shimmer-overlay"></div>
    <div class="flex items-center space-x-3 sm:space-x-4 relative z-10 flex-1 min-w-0 mr-2">
      <div class="w-12 h-12 shrink-0 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
        <span class="material-symbols-outlined text-3xl font-bold fill">grid_view</span>
      </div>
      <div class="flex flex-col min-w-0 flex-1">
        <span class="text-lg font-black tracking-tight truncate">${t('menu_classic')}</span>
        <span class="text-[10px] font-bold text-white/70 tracking-wide truncate">${PlayerState.state.bestScoreClassic > 0 ? `${t('record') || 'Rekor'}: ${PlayerState.state.bestScoreClassic.toLocaleString('tr-TR')}` : ''}</span>
      </div>
    </div>
    <div class="z-20 shrink-0 flex items-center gap-1 px-3 sm:px-4 py-2 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-black text-white tracking-wide shadow-lg animate-badge-pulse border border-white/30">
      <span class="material-symbols-outlined text-base fill">play_arrow</span>
      ${(t('menu_classic_play') || 'OYNA').toUpperCase()}
    </div>
  `;
  classicBtn.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    
    const modal = createModal({
      title: t('menu_classic') || 'Classic 1010!',
      onClose: () => {},
      content: `
        <div class="flex flex-col gap-3">
          <button id="btn-classic-endless" class="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">play_circle</span>
              <span>${t('x2_play_now') || 'Hemen Oyna'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('x2_endless_mode') || 'Sonsuz Mod'}</span>
          </button>
          
          <div class="flex items-center justify-center gap-2 my-1 opacity-50">
            <div class="h-px bg-white/20 flex-1"></div>
            <span class="text-[10px] uppercase font-bold tracking-widest">${t('x2_or') || 'VEYA'}</span>
            <div class="h-px bg-white/20 flex-1"></div>
          </div>
          
          <button id="btn-classic-adventure" class="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">map</span>
              <span>${t('x2_adventure_mode') || 'Macera'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('level') || 'Seviye'} ${PlayerState.state.currentAdventureLevel}</span>
          </button>
        </div>
      `
    });

    modal.querySelector('#btn-classic-endless').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      localStorage.setItem('lumina_puzzle_classic_grid_size', '8');
      modal.close();
      router.navigate('#/classic?mode=endless');
    });

    modal.querySelector('#btn-classic-adventure').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      localStorage.setItem('lumina_puzzle_classic_grid_size', '8');
      modal.close();
      router.navigate('#/adventure-map?game=classic');
    });
  });
  content.appendChild(classicBtn);

  const classicSubModes = document.createElement('div');
  classicSubModes.className = 'grid grid-cols-3 gap-2 mb-2 w-full';
  
  [6, 10, 12].forEach(size => {
    const btn = document.createElement('button');
    btn.className = 'py-2 rounded-2xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border border-blue-500/20 text-[11px] font-black tracking-wide active:scale-95 transition-transform flex items-center justify-center shadow-sm';
    btn.innerHTML = `${t(`classic_${size}x${size}`)}`;
    btn.addEventListener('click', () => {
      localStorage.setItem('lumina_puzzle_classic_grid_size', size.toString());
      localStorage.removeItem(`lumina_puzzle_classic_save_${size}`);
      router.navigate('#/classic');
    });
    classicSubModes.appendChild(btn);
  });
  content.appendChild(classicSubModes);

  // --- Duel Mode Card (Placed immediately after Classic Mode) ---
  const duelCard = document.createElement('button');
  duelCard.className = 'w-full p-5 rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-800 text-white flex items-center justify-between text-left active:scale-[0.98] transition-transform shadow-lg shadow-indigo-600/30 group relative overflow-hidden border border-white/20';
  duelCard.innerHTML = `
    <span class="absolute -right-2 -bottom-6 text-[8rem] opacity-20 -rotate-12 select-none drop-shadow-md">⚔️</span>
    <div class="flex items-center space-x-4 relative z-10">
      <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner backdrop-blur-sm border border-white/30 text-3xl">
        ⚔️
      </div>
      <div class="flex flex-col">
        <span class="text-lg font-black tracking-tight drop-shadow-sm">${t('menu_duel') || 'BLOK DÜELLOSU'}</span>
        <span class="text-[10px] font-bold text-white/80 tracking-widest mt-0.5">${t('duel_vs_ai') || 'Arkadaşınla veya Yapay Zeka ile Düello'}</span>
      </div>
    </div>
    <div class="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 group-hover:bg-white/30 group-hover:translate-x-1 transition-all relative z-10 border border-white/30">
      <span class="material-symbols-outlined text-xl font-bold">play_arrow</span>
    </div>
    <div class="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-pink-500 text-white text-[8px] font-black tracking-wider animate-badge-bounce shadow-md border border-white/30">
      ${t('new_badge') || t('menu_new_badge') || 'YENİ'}
    </div>
  `;
  duelCard.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    
    const showMultiplayerOptions = () => {
      const mainModal = createModal({ title: 'Düello Modu', content: `
        <div class="flex flex-col space-y-3 w-full">
          <button id="opt-ai" class="w-full p-4 rounded-2xl bg-blue-500/10 border-2 border-blue-500/30 text-blue-600 dark:text-blue-400 font-black text-lg active:scale-95 transition-transform flex items-center justify-between">
            <span>🤖 ${t('menu_ai_bot') || 'Yapay Zekaya Karşı'}</span>
          </button>
          <button id="opt-create" class="w-full p-4 rounded-2xl bg-green-500/10 border-2 border-green-500/30 text-green-600 dark:text-green-400 font-black text-lg active:scale-95 transition-transform flex items-center justify-between">
            <span>➕ ${t('menu_create_room') || 'Oda Kur'}</span>
          </button>
          <button id="opt-join" class="w-full p-4 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 text-orange-600 dark:text-orange-400 font-black text-lg active:scale-95 transition-transform flex items-center justify-between">
            <span>🔍 ${t('menu_join_room') || 'Odaya Katıl'}</span>
          </button>
        </div>
      `, actions: [
        { text: t('cancel') || 'İptal', onClick: (close) => close() }
      ]});

      mainModal.querySelector('#opt-ai').addEventListener('click', () => {
        Sounds.playSfx('button-tap');
        mainModal.close();
        
        // Create difficulty modal
        const diffModal = createModal({ title: t('duel_difficulty'), content: `
          <div class="flex flex-col space-y-3 w-full">
            <button id="diff-easy" class="w-full p-3 rounded-2xl bg-green-500/10 border-2 border-green-500/30 text-green-600 dark:text-green-400 font-black text-lg active:scale-95 transition-transform flex items-center justify-between">
              <span>${t('diff_easy') || 'Kolay'}</span>
              <span class="text-2xl">😎</span>
            </button>
            <button id="diff-medium" class="w-full p-3 rounded-2xl bg-yellow-500/10 border-2 border-yellow-500/30 text-yellow-600 dark:text-yellow-400 font-black text-lg active:scale-95 transition-transform flex items-center justify-between">
              <span>${t('diff_medium') || 'Orta'}</span>
              <span class="text-2xl">🤔</span>
            </button>
            <button id="diff-hard" class="w-full p-3 rounded-2xl bg-red-500/10 border-2 border-red-500/30 text-red-600 dark:text-red-400 font-black text-lg active:scale-95 transition-transform flex items-center justify-between">
              <span>${t('diff_hard') || 'Zor'}</span>
              <span class="text-2xl">🔥</span>
            </button>
          </div>
        `, actions: [
          { text: t('cancel') || 'İptal', onClick: (close) => close() }
        ]});
        
        diffModal.querySelector('#diff-easy').addEventListener('click', () => {
          Sounds.playSfx('button-tap');
          Storage.set('duel_difficulty', 'easy');
          Storage.set('duel_multiplayer', false);
          diffModal.close();
          router.navigate('#/duel');
        });
        diffModal.querySelector('#diff-medium').addEventListener('click', () => {
          Sounds.playSfx('button-tap');
          Storage.set('duel_difficulty', 'medium');
          Storage.set('duel_multiplayer', false);
          diffModal.close();
          router.navigate('#/duel');
        });
        diffModal.querySelector('#diff-hard').addEventListener('click', () => {
          Sounds.playSfx('button-tap');
          Storage.set('duel_difficulty', 'hard');
          Storage.set('duel_multiplayer', false);
          diffModal.close();
          router.navigate('#/duel');
        });
      });

      mainModal.querySelector('#opt-create').addEventListener('click', () => {
        Sounds.playSfx('button-tap');
        Storage.set('duel_multiplayer', true);
        Storage.set('duel_multiplayer_action', 'create');
        mainModal.close();
        router.navigate('#/duel');
      });

      mainModal.querySelector('#opt-join').addEventListener('click', () => {
        Sounds.playSfx('button-tap');
        mainModal.close();
        
        const joinModal = createModal({ title: t('menu_join_room') || 'Odaya Katıl', content: `
          <div class="flex flex-col space-y-4 items-center">
            <p class="text-sm font-medium text-gray-500 text-center">${t('enter_received_code') || 'Arkadaşından aldığın 5 haneli oda kodunu gir:'}</p>
            <input type="text" id="join-room-code" maxlength="5" class="w-3/4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl p-4 text-3xl font-black tracking-[0.5em] text-center text-primary dark:text-white uppercase outline-none focus:ring-2 focus:ring-secondary/50">
          </div>
        `, actions: [
          { text: t('cancel') || 'İptal', onClick: (close) => close() },
          { 
            text: t('btn_join') || 'Katıl',
            primary: true,
            onClick: (close) => {
              const inputEl = document.querySelector('#join-room-code');
              const code = inputEl ? inputEl.value.trim().toUpperCase() : '';
              if (code.length === 5) {
                Sounds.playSfx('button-tap');
                Storage.set('duel_multiplayer', true);
                Storage.set('duel_multiplayer_action', 'join');
                Storage.set('duel_room_code', code);
                close();
                router.navigate('#/duel');
              } else {
                Sounds.playSfx('invalid');
                if (inputEl) {
                  inputEl.classList.add('animate-shake');
                  setTimeout(() => inputEl.classList.remove('animate-shake'), 300);
                }
              }
            }
          }
        ]});
        
        setTimeout(() => joinModal.querySelector('#join-room-code').focus(), 100);
      });
    };
    
    showMultiplayerOptions();
  });
  content.appendChild(duelCard);


  // --- Mücevher Blok (Jewel Crush) Card ---
  const jewelCard = document.createElement('button');
  jewelCard.className = 'w-full p-5 mb-3 rounded-3xl bg-gradient-to-r from-[#6366f1] to-[#a855f7] text-white flex items-center justify-between text-left active:scale-[0.98] transition-transform shadow-lg shadow-[#a855f7]/30 group relative overflow-hidden border border-white/20 animate-hero-breathe';
  jewelCard.innerHTML = `
    <span class="absolute -right-2 -bottom-6 text-[8rem] opacity-20 -rotate-12 select-none drop-shadow-md">💎</span>
    <div class="flex items-center space-x-4 relative z-10">
      <div class="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner backdrop-blur-sm border border-white/30">
        <div class="grid grid-cols-2 gap-0.5 w-9 h-9">
          <div class="bg-rose-400 rounded-sm flex items-center justify-center text-[6px]">🔴</div>
          <div class="bg-blue-400 rounded-sm flex items-center justify-center text-[6px]">💙</div>
          <div class="bg-emerald-400 rounded-sm flex items-center justify-center text-[6px]">💚</div>
          <div class="bg-amber-400 rounded-sm flex items-center justify-center text-[6px]">🟡</div>
        </div>
      </div>
      <div class="flex flex-col">
        <span class="text-lg font-black tracking-tight drop-shadow-sm">${t('menu_jewel') || 'BLOK PATLATMA'}</span>
        <span class="text-[10px] font-bold text-white/80 tracking-widest mt-0.5 uppercase">${t('jewel_desc') || 'Eşleştir & Patlat!'}</span>
        <span class="text-[9px] font-medium text-white/60 mt-0.5">${t('level') || 'Seviye'}: ${PlayerState.state.jewelCrushLevel || 1}</span>
      </div>
    </div>
    <div class="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 group-hover:bg-white/30 group-hover:translate-x-1 transition-all relative z-10 border border-white/30">
      <span class="material-symbols-outlined text-xl font-bold">play_arrow</span>
    </div>
    <div class="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-red-500 text-white text-[8px] font-black tracking-wider animate-badge-bounce shadow-md border border-white/30">
      ${t('new_badge') || 'YENİ'}
    </div>
  `;
  jewelCard.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    
    const modal = createModal({
      title: t('menu_jewel') || 'BLOK PATLATMA',
      onClose: () => {},
      content: `
        <div class="flex flex-col gap-3">
          <button id="btn-jewel-endless" class="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">play_circle</span>
              <span>${t('x2_play_now') || 'Hemen Oyna'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('x2_endless_mode') || 'Sonsuz Mod'}</span>
          </button>
          
          <div class="flex items-center justify-center gap-2 my-1 opacity-50">
            <div class="h-px bg-white/20 flex-1"></div>
            <span class="text-[10px] uppercase font-bold tracking-widest">${t('x2_or') || 'VEYA'}</span>
            <div class="h-px bg-white/20 flex-1"></div>
          </div>
          
          <button id="btn-jewel-adventure" class="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">map</span>
              <span>${t('x2_adventure_mode') || 'Macera'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('level') || 'Seviye'} ${PlayerState.state.jewelCrushLevel}</span>
          </button>
        </div>
      `
    });

    modal.querySelector('#btn-jewel-endless').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modal.close();
      router.navigate('#/match?mode=endless');
    });

    modal.querySelector('#btn-jewel-adventure').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modal.close();
      router.navigate('#/adventure-map?game=match');
    });
  });
  // 4. Other Games Title & Bento Grid
  const otherGamesTitle = document.createElement('div');
  otherGamesTitle.className = 'w-full pt-1 pb-0.5';
  otherGamesTitle.innerHTML = `<span class="text-xs font-black text-gray-400 tracking-wider pl-1">${t('other_games')}</span>`;
  content.appendChild(otherGamesTitle);

  content.appendChild(jewelCard);

  const x2Card = document.createElement('button');
  x2Card.className = 'w-full p-5 mb-3 rounded-3xl bg-gradient-to-br from-[#FF9800] to-[#F44336] text-white flex items-center justify-between text-left active:scale-[0.98] transition-all shadow-lg shadow-[#F44336]/30 group relative overflow-hidden border border-white/20 animate-hero-breathe';
  x2Card.innerHTML = `
    <span class="material-symbols-outlined text-[8rem] font-bold fill opacity-10 absolute -right-4 -bottom-4 rotate-12">view_column</span>
    <div class="flex items-center space-x-4 relative z-10">
      <div class="w-14 h-14 rounded-2xl bg-white/20 p-1 flex flex-col items-center justify-end shadow-inner backdrop-blur-sm border border-white/30 animate-bounce">
        <div class="w-8 h-4 bg-orange-400 rounded-t-sm flex items-center justify-center text-[7px] font-black text-white">4</div>
        <div class="w-8 h-4 bg-red-500 flex items-center justify-center text-[7px] font-black text-white">8</div>
        <div class="w-8 h-4 bg-purple-500 rounded-b-sm flex items-center justify-center text-[7px] font-black text-white">16</div>
      </div>
      <div class="flex flex-col">
        <span class="text-lg font-black tracking-tight drop-shadow-sm">${t('menu_x2') || 'X2 2048'}</span>
        <span class="text-[10px] font-bold text-white/80 tracking-widest mt-0.5">${t('x2_desc') || 'Düşür & Birleştir'}</span>
        ${PlayerState.state.bestScoreX2 > 0 ? `<span class="text-[9px] font-medium text-white/60 mt-0.5">${t('record') || 'Rekor'}: ${PlayerState.state.bestScoreX2.toLocaleString('tr-TR')}</span>` : ''}
      </div>
    </div>
    <div class="flex items-center justify-center w-10 h-10 rounded-full bg-white/20 group-hover:bg-white/30 group-hover:translate-x-1 transition-all relative z-10 border border-white/30">
      <span class="material-symbols-outlined text-xl font-bold">play_arrow</span>
    </div>
    <div class="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-white/25 text-[8px] font-black tracking-wider animate-badge-bounce backdrop-blur-sm border border-white/30">
      🔥 ${t('popular') || t('menu_popular_badge') || 'POPÜLER'}
    </div>
  `;
  x2Card.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    
    const advState = Storage.get('x2_save_state');
    const advLevel = advState?.level || PlayerState.state.x2AdventureLevel || 1;

    const endlessState = Storage.get('x2_endless_save_state');
    const hasEndlessSave = !!endlessState;

    const modal = createModal({
      title: t('x2_modal_title') || 'X2 2048 Mod Seçimi',
      onClose: () => {},
      content: `
        <div class="flex flex-col gap-3">
          <button id="btn-mode-endless" class="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">play_circle</span>
              <span>${t('x2_play_now') || 'Hemen Oyna'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('x2_endless_mode') || 'Sonsuz Mod'}</span>
          </button>
          
          <div class="flex items-center justify-center gap-2 my-1 opacity-50">
            <div class="h-px bg-white/20 flex-1"></div>
            <span class="text-[10px] uppercase font-bold tracking-widest">${t('x2_or') || 'VEYA'}</span>
            <div class="h-px bg-white/20 flex-1"></div>
          </div>
          
          <button id="btn-mode-adventure" class="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">map</span>
              <span>${t('x2_adventure_mode') || 'Macera'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('level') || 'Seviye'} ${advLevel}</span>
          </button>
        </div>
      `
    });

    modal.querySelector('#btn-mode-endless').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modal.close();
      router.navigate('#/x2?mode=endless');
    });

    modal.querySelector('#btn-mode-adventure').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modal.close();
      router.navigate('#/adventure-map?game=x2');
    });
  });
  content.appendChild(x2Card);

  const bentoGrid = document.createElement('div');
  bentoGrid.className = 'grid grid-cols-2 gap-3 w-full';

  // Bento 2: Hex Block (Span 1 col)
  const hexCard = document.createElement('button');
  hexCard.className = 'p-4 rounded-3xl bg-gradient-to-br from-[#FF0076] to-[#590FB7] text-white flex flex-col justify-between items-start text-left h-36 active:scale-[0.97] transition-all shadow-lg shadow-[#590FB7]/20 group relative overflow-hidden border border-white/10';
  hexCard.innerHTML = `
    <span class="material-symbols-outlined text-[6rem] font-bold fill opacity-10 absolute -right-4 -bottom-4 rotate-12">hexagon</span>
    <div class="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner backdrop-blur-sm border border-white/20 relative z-10">
      <div class="relative w-7 h-7">
        <div class="absolute top-0 left-1.5 w-3.5 h-3.5 bg-pink-400 rounded-sm rotate-45 border border-white/50"></div>
        <div class="absolute bottom-0.5 left-0 w-3.5 h-3.5 bg-purple-400 rounded-sm rotate-45 border border-white/50"></div>
        <div class="absolute bottom-0.5 right-0 w-3.5 h-3.5 bg-blue-400 rounded-sm rotate-45 border border-white/50"></div>
      </div>
    </div>
    <div class="flex flex-col mt-4 relative z-10">
      <span class="text-sm font-black tracking-tight">${t('menu_hex')}</span>
      <span class="text-[9px] font-medium text-white/70 tracking-wide mt-0.5">${t('hex_desc') || 'Altıgen Bulmaca'}</span>
      ${PlayerState.state.bestScoreHex > 0 ? `<span class="text-[8px] font-bold text-white/50 mt-0.5">${t('record') || 'Rekor'}: ${PlayerState.state.bestScoreHex.toLocaleString('tr-TR')}</span>` : ''}
    </div>
  `;
  hexCard.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    Storage.remove('hex_state');
    router.navigate('#/hex');
  });
  bentoGrid.appendChild(hexCard);

  // Bento 3: Color Sort (Span 1 col)
  const sortCard = document.createElement('button');
  sortCard.className = 'p-4 rounded-3xl bg-gradient-to-br from-[#F5A623] to-[#D0021B] text-white flex flex-col justify-between items-start text-left h-36 active:scale-[0.97] transition-all shadow-lg shadow-[#D0021B]/20 group relative overflow-hidden border border-white/10';
  sortCard.innerHTML = `
    <span class="material-symbols-outlined text-[6rem] font-bold fill opacity-10 absolute -right-2 -bottom-2 -rotate-12">science</span>
    <div class="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner backdrop-blur-sm border border-white/20 relative z-10">
      <div class="flex items-end space-x-1.5 h-7">
        <div class="w-3 h-5.5 rounded-t-[1px] rounded-b-full border border-white/60 flex flex-col justify-end overflow-hidden">
          <div class="w-full h-1/2 bg-blue-400"></div>
        </div>
        <div class="w-3 h-7 rounded-t-[1px] rounded-b-full border border-white/60 flex flex-col justify-end overflow-hidden">
          <div class="w-full h-1/3 bg-green-400"></div>
          <div class="w-full h-1/3 bg-red-400"></div>
          <div class="w-full h-1/3 bg-red-400"></div>
        </div>
        <div class="w-3 h-5 rounded-t-[1px] rounded-b-full border border-white/60 flex flex-col justify-end overflow-hidden">
          <div class="w-full h-full bg-green-400"></div>
        </div>
      </div>
    </div>
    <div class="flex flex-col mt-4 relative z-10">
      <span class="text-sm font-black tracking-tight">${t('menu_sort')}</span>
      <span class="text-[9px] font-medium text-white/70 tracking-wide mt-0.5">${t('sort_desc') || 'Renk Sıralama'}</span>
      ${PlayerState.state.bestScoreSort > 0 ? `<span class="text-[8px] font-bold text-white/50 mt-0.5">${t('record') || 'Rekor'}: ${PlayerState.state.bestScoreSort.toLocaleString('tr-TR')}</span>` : ''}
    </div>
  `;
  sortCard.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    
    const modal = createModal({
      title: t('menu_sort') || 'Renk Sıralama',
      onClose: () => {},
      content: `
        <div class="flex flex-col gap-3">
          <button id="btn-sort-endless" class="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">play_circle</span>
              <span>${t('x2_play_now') || 'Hemen Oyna'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('x2_endless_mode') || 'Sonsuz Mod'}</span>
          </button>
          
          <div class="flex items-center justify-center gap-2 my-1 opacity-50">
            <div class="h-[1px] flex-1 bg-gray-400"></div>
            <span class="text-xs font-bold text-gray-500 uppercase tracking-widest">${t('x2_or') || 'VEYA'}</span>
            <div class="h-[1px] flex-1 bg-gray-400"></div>
          </div>

          <button id="btn-sort-adventure" class="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">map</span>
            <span>${t('x2_adventure_mode') || 'Macera Modu'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('level') || 'Seviye'} ${PlayerState.state.sortAdventureLevel}</span>
          </button>
        </div>
      `,
      actions: []
    });

    modal.querySelector('#btn-sort-endless').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      // Her zaman 1. seviyeden başlat
      Storage.remove('sort_endless_state');
      PlayerState.state.sortEndlessLevel = 1;
      Storage.set('player_sort_endless_level', 1);
      modal.close();
      router.navigate('#/sort?mode=endless');
    });

    modal.querySelector('#btn-sort-adventure').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modal.close();
      router.navigate('#/sort?mode=adventure');
    });
  });
  bentoGrid.appendChild(sortCard);

  // Bento 4: 2048 (Span 1 col)
  const g2048Card = document.createElement('button');
  g2048Card.className = 'p-4 rounded-3xl bg-gradient-to-br from-[#00C9FF] to-[#92FE9D] text-gray-900 flex flex-col justify-between items-start text-left h-36 active:scale-[0.97] transition-all shadow-lg shadow-[#00C9FF]/20 group relative overflow-hidden border border-white/30';
  g2048Card.innerHTML = `
    <div class="w-14 h-14 rounded-2xl bg-black/20 p-1 flex items-center justify-center shadow-inner backdrop-blur-sm border border-white/50 relative z-10">
      <div class="grid grid-cols-2 gap-1 w-full h-full">
        <div class="bg-[#eee4da] rounded-lg flex items-center justify-center text-[10px] font-black text-gray-800">2</div>
        <div class="bg-[#ede0c8] rounded-lg flex items-center justify-center text-[10px] font-black text-gray-800">4</div>
        <div class="bg-[#f2b179] rounded-lg flex items-center justify-center text-[10px] font-black text-white">8</div>
        <div class="bg-[#f59563] rounded-lg flex items-center justify-center text-[10px] font-black text-white">16</div>
      </div>
    </div>
    <div class="flex flex-col mt-4 relative z-10">
      <span class="text-sm font-black tracking-tight">${t('menu_2048') || '2048'}</span>
      <span class="text-[9px] font-medium text-gray-800/70 tracking-wide mt-0.5">${t('g2048_desc') || 'Sayıları Birleştir'}</span>
    </div>
  `;
  g2048Card.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    
    const advLevel = PlayerState.state.g2048AdventureLevel || 1;
    
    const modal = createModal({
      title: t('g2048_modal_title') || '2048 Mod Seçimi',
      onClose: () => {},
      content: `
        <div class="flex flex-col gap-3">
          <button id="btn-2048-endless" class="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">play_circle</span>
              <span>${t('x2_play_now') || 'Hemen Oyna'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('x2_endless_mode') || 'Sonsuz Mod'}</span>
          </button>
          
          <div class="flex items-center justify-center gap-2 my-1 opacity-50">
            <div class="h-[1px] flex-1 bg-gray-400"></div>
          </div>

          <button id="btn-2048-adventure" class="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">map</span>
            <span>${t('x2_adventure_mode') || 'Macera Modu'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('level') || 'Seviye'} ${advLevel}</span>
          </button>
        </div>
      `,
      actions: []
    });

    modal.querySelector('#btn-2048-endless').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      Storage.remove('g2048_endless_state');
      modal.close();
      router.navigate('#/2048?mode=endless');
    });

    modal.querySelector('#btn-2048-adventure').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modal.close();
      router.navigate('#/2048?mode=adventure');
    });
  });
  bentoGrid.appendChild(g2048Card);

  // Bento 5: Merge Block (Span 1 col)
  const mergeCard = document.createElement('button');
  mergeCard.className = 'p-4 rounded-3xl bg-gradient-to-br from-[#B224EF] to-[#7579FF] text-white flex flex-col justify-between items-start text-left h-36 active:scale-[0.97] transition-all shadow-lg shadow-[#B224EF]/20 group relative overflow-hidden border border-white/10';
  mergeCard.innerHTML = `
    <span class="material-symbols-outlined text-[6rem] font-bold fill opacity-10 absolute -right-2 -bottom-2 -rotate-12">library_add</span>
    <div class="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner backdrop-blur-sm border border-white/20 relative z-10">
      <div class="w-5 h-5 bg-cyan-400 rounded-[4px] border border-white/30 flex items-center justify-center text-[9px] font-black absolute left-1.5 top-2.5 shadow-md">4</div>
      <div class="w-5 h-5 bg-blue-500 rounded-[4px] border border-white/30 flex items-center justify-center text-[9px] font-black absolute right-1.5 top-2.5 shadow-md">4</div>
      <span class="material-symbols-outlined text-[12px] font-black absolute bottom-1.5 left-1/2 -translate-x-1/2 text-yellow-300">keyboard_double_arrow_up</span>
    </div>
    <div class="flex flex-col mt-4 relative z-10">
      <span class="text-sm font-black tracking-tight">${t('menu_merge') || 'Merge Block'}</span>
      <span class="text-[9px] font-medium text-white/70 tracking-wide mt-0.5">${t('merge_desc') || 'Blokları Taşı'}</span>
    </div>
  `;
  mergeCard.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    
    const advLevel = PlayerState.state.mergeAdventureLevel || 1;
    
    const modal = createModal({
      title: t('merge_modal_title') || 'Merge Mod Seçimi',
      onClose: () => {},
      content: `
        <div class="flex flex-col gap-3">
          <button id="btn-merge-endless" class="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">play_circle</span>
              <span>${t('x2_play_now') || 'Hemen Oyna'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('x2_endless_mode') || 'Sonsuz Mod'}</span>
          </button>
          
          <div class="flex items-center justify-center gap-2 my-1 opacity-50">
            <div class="h-[1px] flex-1 bg-gray-400"></div>
          </div>

          <button id="btn-merge-adventure" class="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">map</span>
            <span>${t('x2_adventure_mode') || 'Macera Modu'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('level') || 'Seviye'} ${advLevel}</span>
          </button>
        </div>
      `,
      actions: []
    });

    modal.querySelector('#btn-merge-endless').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      Storage.remove('merge_endless_state');
      modal.close();
      router.navigate('#/merge?mode=endless');
    });

    modal.querySelector('#btn-merge-adventure').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modal.close();
      router.navigate('#/merge?mode=adventure');
    });
  });
  bentoGrid.appendChild(mergeCard);

  // Bento 6: Bubble Shooter (Span 1 col)
  const bubbleCard = document.createElement('button');
  bubbleCard.className = 'p-4 rounded-3xl bg-gradient-to-br from-[#FF6B9D] to-[#A663CC] text-white flex flex-col justify-between items-start text-left h-36 active:scale-[0.97] transition-all shadow-lg shadow-[#FF6B9D]/20 group relative overflow-hidden border border-white/10';
  bubbleCard.innerHTML = `
    <span class="material-symbols-outlined text-[6rem] font-bold fill opacity-10 absolute -right-2 -bottom-2 -rotate-12">bubble_chart</span>
    <div class="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner backdrop-blur-sm border border-white/20 relative z-10">
      <!-- Mini bubble cluster -->
      <div class="w-4 h-4 rounded-full bg-gradient-to-br from-red-300 to-red-500 absolute top-1.5 left-1.5 shadow-md ring-1 ring-white/40"></div>
      <div class="w-4 h-4 rounded-full bg-gradient-to-br from-blue-300 to-blue-500 absolute top-1.5 right-1.5 shadow-md ring-1 ring-white/40"></div>
      <div class="w-4 h-4 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-400 absolute bottom-1.5 left-3 shadow-md ring-1 ring-white/40"></div>
      <div class="w-4 h-4 rounded-full bg-gradient-to-br from-green-300 to-green-500 absolute bottom-1.5 right-3 shadow-md ring-1 ring-white/40"></div>
    </div>
    <div class="flex flex-col mt-4 relative z-10">
      <span class="text-sm font-black tracking-tight">${t('menu_bubble') || 'Baloncuk Patlat'}</span>
      <span class="text-[9px] font-medium text-white/70 tracking-wide mt-0.5">${t('bubble_desc') || 'Eşle ve Patlat'}</span>
    </div>
  `;
  bubbleCard.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    const advLevel = PlayerState.state.bubbleAdventureLevel || 1;
    const modal = createModal({
      title: t('menu_bubble') || 'Baloncuk Patlat',
      onClose: () => {},
      content: `
        <div class="flex flex-col gap-3">
          <button id="btn-bubble-endless" class="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">play_circle</span>
              <span>${t('x2_play_now') || 'Hemen Oyna'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('x2_endless_mode') || 'Sonsuz Mod'}</span>
          </button>
          <div class="flex items-center justify-center gap-2 my-1 opacity-50">
            <div class="h-[1px] flex-1 bg-gray-400"></div>
          </div>
          <button id="btn-bubble-adventure" class="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">map</span>
              <span>${t('x2_adventure_mode') || 'Macera Modu'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('level') || 'Seviye'} ${advLevel}</span>
          </button>
        </div>
      `,
      actions: []
    });

    modal.querySelector('#btn-bubble-endless').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modal.close();
      router.navigate('#/bubble?mode=endless');
    });
    modal.querySelector('#btn-bubble-adventure').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modal.close();
      router.navigate('#/adventure-map?game=bubble');
    });
  });
  bentoGrid.appendChild(bubbleCard);

  // Bento 7: Ok Bulmacası
  const arrowCard = document.createElement('button');
  arrowCard.className = 'p-4 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white flex flex-col justify-between items-start text-left h-36 active:scale-[0.97] transition-all shadow-lg shadow-cyan-500/30 group relative overflow-hidden border border-white/10';
  arrowCard.innerHTML = `
    <!-- Static background watermark -->
    <span class="material-symbols-outlined text-[8rem] font-light fill opacity-10 absolute -right-4 -bottom-4">grid_view</span>
    
    <!-- 2x2 Minimal Arrow Grid -->
    <div class="w-[3.5rem] h-[3.5rem] relative z-10 grid grid-cols-2 gap-1 transform group-hover:scale-105 transition-transform duration-300 animate-pulse">
      <div class="bg-white/15 rounded-md flex items-center justify-center border border-white/20">
        <span class="material-symbols-outlined text-white text-[18px] font-medium">arrow_forward</span>
      </div>
      <div class="bg-white/15 rounded-md flex items-center justify-center border border-white/20">
        <span class="material-symbols-outlined text-white text-[18px] font-medium">arrow_downward</span>
      </div>
      <div class="bg-white/15 rounded-md flex items-center justify-center border border-white/20">
        <span class="material-symbols-outlined text-white text-[18px] font-medium">arrow_upward</span>
      </div>
      <div class="bg-white/15 rounded-md flex items-center justify-center border border-white/20">
        <span class="material-symbols-outlined text-white text-[18px] font-medium">arrow_back</span>
      </div>
    </div>
    
    <div class="flex flex-col mt-2 relative z-10">
      <span class="text-sm font-black tracking-tight">${t('menu_arrow') || 'Ok Bulmacası'}</span>
      <span class="text-[9px] font-medium text-white/70 tracking-wide mt-0.5">${t('arrow_desc') || 'Okları temizle'}</span>
    </div>
  `;
  arrowCard.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    const advLevel = PlayerState.state.arrowAdventureLevel || 1;
    const modal = createModal({
      title: t('menu_arrow') || 'Ok Bulmacası',
      onClose: () => {},
      content: `
        <div class="flex flex-col gap-3">
          <button id="btn-arrow-endless" class="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">play_circle</span>
              <span>${t('x2_play_now') || 'Hemen Oyna'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('x2_endless_mode') || 'Sonsuz Mod'}</span>
          </button>
          
          <div class="flex items-center justify-center gap-2 my-1 opacity-50">
            <div class="h-[1px] flex-1 bg-gray-400"></div>
          </div>

          <button id="btn-arrow-adventure" class="w-full p-4 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex flex-col items-center justify-center">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-2xl">map</span>
              <span>${t('x2_adventure_mode') || 'Macera Modu'}</span>
            </div>
            <span class="text-[10px] font-bold text-white/80 uppercase mt-1 tracking-widest">${t('level') || 'Seviye'} ${advLevel}</span>
          </button>
        </div>
      `,
      actions: []
    });

    modal.querySelector('#btn-arrow-endless').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modal.close();
      router.navigate('#/arrow?mode=endless');
    });

    modal.querySelector('#btn-arrow-adventure').addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modal.close();
      router.navigate('#/adventure-map?game=arrow');
    });
  });
  bentoGrid.appendChild(arrowCard);

  // Reorder items: Bubble/Arrow top, 2048/Merge middle, Hex/Sort bottom
  bentoGrid.append(bubbleCard, arrowCard, g2048Card, mergeCard, hexCard, sortCard);

  content.appendChild(bentoGrid);

  // 5. Daily Tasks Card (clickable, navigates to tasks screen)
  const challengeDiv = document.createElement('div');
  challengeDiv.className = 'w-full flex flex-col';
  
  const challengeCardContent = document.createElement('div');
  challengeCardContent.className = 'flex flex-col w-full space-y-3 cursor-pointer';
  challengeCardContent.innerHTML = `
    <div class="flex justify-between items-center">
      <div class="flex items-center space-x-2.5">
        <span class="text-xl"><span class="material-symbols-outlined fill text-yellow-500 text-[1em] align-middle">emoji_events</span></span>
        <div class="flex flex-col">
          <span class="text-xs font-black tracking-tight">${t('tasks_title')}</span>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <span class="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] font-black text-cyan-600 dark:text-cyan-400">+100 <span class="material-symbols-outlined fill text-cyan-400 text-[1em] align-middle">diamond</span></span>
        <span class="material-symbols-outlined text-gray-400 text-lg">chevron_right</span>
      </div>
    </div>
  `;

  // Dynamic progress bar
  const progressBar = createProgressBar(40, 'bg-gradient-to-r from-orange-500 to-amber-500', '');
  challengeCardContent.appendChild(progressBar);
  
  const challengeCard = createGlassCard(challengeCardContent);
  challengeCard.style.cursor = 'pointer';
  challengeCard.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    router.navigate('#/tasks');
  });
  challengeDiv.appendChild(challengeCard);
  content.appendChild(challengeDiv);

  container.appendChild(content);

  // 6. Bottom Navigation
  const bottomNav = createBottomNav('menu');
  container.appendChild(bottomNav);

  initSwipeNavigation(container, router, 'menu');

  // Consent and Daily Reward logic
  setTimeout(() => {
    showConsentModal(async () => {
      // Daily login reward check happens AFTER consent
      if (PlayerState.checkDailyReward()) {
        await showDailyRewardModal();
      }
    });
  }, 800);

  // Cleanup topBar listeners + hint animations
  container.cleanup = () => {
    if (topBar.cleanup) topBar.cleanup();
    hintCleanups.forEach(fn => fn());
  };

  return container;
}
