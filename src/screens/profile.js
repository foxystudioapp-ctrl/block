import { createTopBar } from '../components/topBar.js';
import { createBottomNav } from '../components/bottomNav.js';
import { PlayerState } from '../state/playerState.js';
import { createProgressBar } from '../components/progressBar.js';
import { Storage } from '../utils/storage.js';
import { t } from '../utils/i18n.js';
import { createModal } from '../components/modal.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { getLocalAvatar, avatarOptions, getAvatarUrl } from '../utils/avatars.js';
import { getBadgeTier, getTierDetails, getBadgesData } from '../utils/badges.js';
import { initSwipeNavigation } from '../utils/swipeNav.js';
import { FriendService } from '../services/friendService.js';
import { MultiplayerService } from '../services/multiplayerService.js';
import { Toast } from '../components/toast.js';
import { AdService } from '../services/adService.js';
import { IAP } from '../services/iapService.js';
import { linkAccountWithGoogle, recoverAccountWithGoogle } from '../services/firebaseSetup.js';

export function Profile(router) {
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] flex flex-col justify-between bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-pop-up relative overflow-hidden';

  const topBar = createTopBar(t('nav_profile'), true);
  container.appendChild(topBar);

  const content = document.createElement('main');
  content.className = 'flex-1 overflow-y-auto px-4 py-4 space-y-6 no-scrollbar relative z-10';

  // VIP Pass Section
  const vipSection = document.createElement('div');
  vipSection.className = 'w-full mb-2';

  const renderVipCard = () => {
    const vipPackage = IAP.packages.find(p => p.product.identifier.includes('vip'));
    const isVipActive = PlayerState.state.isVip;
    
    vipSection.innerHTML = `
      <div id="vip-card-container" class="p-5 rounded-3xl shadow-xl border-2 flex flex-col justify-between items-center transition-all cursor-pointer relative overflow-hidden mb-4 ${isVipActive ? 'bg-gradient-to-br from-green-500 to-emerald-700 border-green-400' : 'bg-gradient-to-br from-amber-400 to-orange-600 border-amber-300 active:scale-[0.98]'}">
        <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-20 pointer-events-none"></div>
        <div class="flex items-center gap-3 w-full mb-3 z-10">
          <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl shadow-inner backdrop-blur-sm">👑</div>
          <div class="flex flex-col text-white drop-shadow-md flex-1">
            <span class="font-black text-xl tracking-wide uppercase">${t('vip_pass_title') || 'VIP PASS'}</span>
            ${isVipActive 
              ? `<span class="text-sm font-medium text-white/90 mt-1">${t('vip_active') || 'Aboneliğiniz Aktif'}</span>`
              : `<div class="flex flex-col gap-1 mt-1">
                   <span class="text-sm font-medium text-white/90 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">block</span> ${t('vip_desc_no_ads') || 'Reklamları Kaldır'}</span>
                   <span class="text-sm font-medium text-white/90 flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px] fill">diamond</span> ${t('vip_desc_diamonds') || 'Her Ay 5000 Elmas'}</span>
                 </div>`
            }
          </div>
        </div>
        ${!isVipActive ? `
        <button class="w-full bg-white text-orange-600 font-black py-3 px-6 rounded-xl shadow-lg hover:bg-gray-50 transition-colors z-10 mt-1">
          ${vipPackage ? vipPackage.product.priceString : (t('btn_buy') || 'Satın Al')}
        </button>
        ` : `
        <div class="w-full bg-white/20 text-white font-black py-3 px-6 rounded-xl shadow-inner text-center z-10 mt-1 backdrop-blur-sm">
          ${t('vip_enjoy') || 'VIP Ayrıcalıklarının Tadını Çıkarın!'}
        </div>
        `}
      </div>
    `;

    if (!isVipActive) {
      const card = vipSection.querySelector('#vip-card-container');
      card.addEventListener('click', async () => {
        Sounds.playSfx('button-tap');
        if (vipPackage && IAP.isInitialized) {
          Toast.show('Mağaza ile bağlantı kuruluyor...', 'info');
          await IAP.purchasePackage(vipPackage);
          if (PlayerState.state.isVip) renderVipCard();
        } else {
          // Web Modu Test
          PlayerState.state.isVip = true;
          PlayerState.addDiamonds(5000);
          PlayerState.state.lastVipRewardTime = Date.now();
          PlayerState.save();
          Toast.show('👑 VIP Aktifleşti! (TEST) +5000 Elmas', 'success');
          renderVipCard();
          
          // Header update
          const header = document.querySelector('header');
          if (header) {
            const diamondSpan = header.querySelector('.text-cyan-400.font-black');
            if (diamondSpan) diamondSpan.textContent = PlayerState.state.diamonds.toLocaleString();
          }
        }
      });
    }
  };
  
  renderVipCard();
  content.appendChild(vipSection);

  // 0. Diamond Purchase Section
  const buyDiamondsSection = document.createElement('div');
  buyDiamondsSection.className = 'w-full mb-2';
  
  const todayDate = new Date().toDateString();
  if (Storage.get('ad_diamonds_date') !== todayDate) {
    Storage.set('ad_diamonds_date', todayDate);
    Storage.set('ad_diamonds_count', 0);
  }
  let adCount = Storage.get('ad_diamonds_count', 0);
  const maxAds = 2;
  const isAdAvailable = adCount < maxAds;

  buyDiamondsSection.innerHTML = `
    <h3 class="text-sm font-black mb-3 px-2 uppercase tracking-widest text-gray-500">${t('buy_diamonds_title') || 'ELMAS SATIN AL'}</h3>
    <div class="flex flex-col gap-2">
      <!-- Watch Ad Button -->
      <button id="btn-watch-ad" class="w-full glass-panel p-3 rounded-2xl flex items-center justify-between active:scale-95 transition-transform shadow-lg ${isAdAvailable ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-cyan-500/30' : 'opacity-50 grayscale border border-white/5'}">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full ${isAdAvailable ? 'bg-cyan-500' : 'bg-gray-500'} flex items-center justify-center shadow-inner">
            <span class="material-symbols-outlined text-white">play_circle</span>
          </div>
          <div class="flex flex-col items-start text-left">
            <span class="font-black text-sm leading-tight ${isAdAvailable ? 'text-cyan-400' : 'text-gray-400'}">${t('watch_ad_earn') || 'Reklam İzle & 200 Elmas Kazan'}</span>
            <span class="text-[10px] font-bold text-gray-400 mt-0.5">${isAdAvailable ? adCount + '/' + maxAds : (t('ad_limit_reached') || 'Günlük Sınır Doldu')}</span>
          </div>
        </div>
        <div class="flex items-center justify-center gap-1 bg-black/20 px-3 py-1.5 rounded-full">
           <span class="text-lg drop-shadow-md">💎</span>
           <span class="font-black text-cyan-400">200</span>
        </div>
      </button>
      
      <!-- NEW: Single Buy Diamond Button -->
      <button id="btn-open-store" class="w-full glass-panel p-3 rounded-2xl flex items-center justify-between active:scale-95 transition-transform shadow-lg bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 border border-purple-500/30 group">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
            <span class="material-symbols-outlined text-white">storefront</span>
          </div>
          <div class="flex flex-col items-start text-left">
            <span class="font-black text-sm text-purple-400 leading-tight">${t('buy_diamonds_title') || 'Elmas Satın Al'}</span>
            <span class="text-[10px] font-bold text-gray-400 mt-0.5">${t('premium_packages') || 'Premium Paketler'}</span>
          </div>
        </div>
        <div class="flex items-center justify-center gap-1 bg-black/20 px-3 py-1.5 rounded-full border border-purple-500/20">
           <span class="text-lg drop-shadow-md">💎</span>
           <span id="store-chevron" class="material-symbols-outlined text-purple-400 text-sm transition-transform">chevron_right</span>
        </div>
      </button>
    </div>
  `;
  
  setTimeout(() => {
    const btnWatchAd = buyDiamondsSection.querySelector('#btn-watch-ad');
    if (btnWatchAd && isAdAvailable) {
      btnWatchAd.addEventListener('click', async () => {
        Sounds.playSfx('button-tap');
        const success = await AdService.showRewardVideoAd();
        if (success) {
          PlayerState.addDiamonds(200);
          Storage.set('ad_diamonds_count', adCount + 1);
          Sounds.playSfx('success');
          // Update UI without full reload
          const header = document.querySelector('header');
          if (header) {
            const diamondSpan = header.querySelector('.text-cyan-400.font-black');
            if (diamondSpan) diamondSpan.textContent = PlayerState.state.diamonds.toLocaleString();
          }
          const newCount = adCount + 1;
          const isNowAvailable = newCount < maxAds;
          btnWatchAd.className = `w-full glass-panel p-3 rounded-2xl flex items-center justify-between active:scale-95 transition-transform shadow-lg ${isNowAvailable ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-cyan-500/30' : 'opacity-50 grayscale border border-white/5'}`;
          
          btnWatchAd.querySelector('.text-sm').className = `font-black text-sm ${isNowAvailable ? 'text-cyan-400' : 'text-gray-400'}`;
          btnWatchAd.querySelector('.text-\\[10px\\]').textContent = isNowAvailable ? `${newCount}/${maxAds}` : (t('ad_limit_reached') || 'Günlük Sınır Doldu');
          
          const iconContainer = btnWatchAd.querySelector('.rounded-full.flex');
          iconContainer.className = `w-10 h-10 rounded-full ${isNowAvailable ? 'bg-cyan-500' : 'bg-gray-500'} flex items-center justify-center shadow-inner`;
          
          if (!isNowAvailable) {
            btnWatchAd.replaceWith(btnWatchAd.cloneNode(true)); // remove listeners
          }
          
          adCount = newCount;
        }
      });
    }

    const btnOpenStore = buyDiamondsSection.querySelector('#btn-open-store');

    if (btnOpenStore) {
      btnOpenStore.addEventListener('click', () => {
        Sounds.playSfx('button-tap');
        router.navigate('#/buy-diamonds');
      });
    }
  }, 100);
  
  content.appendChild(buyDiamondsSection);

  // 1. User Header (Avatar, Name, Title)
  const headerCard = document.createElement('div');
  headerCard.className = 'glass-card p-6 rounded-3xl flex flex-col items-center relative overflow-hidden';
  headerCard.innerHTML = `
    <div class="absolute -top-10 -right-10 w-32 h-32 bg-secondary/10 rounded-full blur-2xl"></div>
    <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-accent-cyan/10 rounded-full blur-2xl"></div>
    
    <div class="relative w-24 h-24 mb-4 cursor-pointer active:scale-95 transition-transform ${PlayerState.state.isVip ? 'premium-avatar-frame' : ''}" id="avatar-container">
      <img loading="lazy" decoding="async" id="profile-avatar" src="" class="w-full h-full rounded-full ${PlayerState.state.isVip ? '' : 'border-4 border-white dark:border-primary-container'} shadow-xl bg-white/10" style="object-fit: cover;" />
      <div class="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-600 rounded-full flex items-center justify-center border-2 border-white dark:border-primary-container shadow-md z-10">
        <span class="text-white text-xs font-black">${PlayerState.state.level}</span>
      </div>
      <div class="absolute top-0 right-0 w-6 h-6 bg-white dark:bg-primary-container rounded-full flex items-center justify-center shadow-md border border-gray-200 dark:border-gray-700">
        <span class="material-symbols-outlined text-[14px] text-gray-500">edit</span>
      </div>
      ${PlayerState.state.isVip ? '<div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md border border-yellow-200 z-20 whitespace-nowrap">VIP</div>' : ''}
    </div>
    
    <h2 class="text-2xl font-black tracking-tight mb-1 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-1" id="profile-name-edit">
      ${PlayerState.state.isVip ? '<span class="text-2xl" title="VIP Üye">👑</span>' : ''}
      <span id="profile-name-display">${PlayerState.state.profileName}</span>
      <span class="material-symbols-outlined text-sm text-gray-400">edit</span>
    </h2>
    <div class="text-sm font-bold uppercase tracking-widest ${PlayerState.getRankInfo(PlayerState.state.level).color}">${t(PlayerState.getRankInfo(PlayerState.state.level).key)}</div>
  `;
  content.appendChild(headerCard);

  // Edit Name Modal Logic
  setTimeout(() => {
    const nameEditBtn = container.querySelector('#profile-name-edit');
    if (nameEditBtn) {
      nameEditBtn.addEventListener('click', () => {
        Sounds.playSfx('button-tap');
        Haptics.vibrate('light');
        createModal({
          title: t('edit_name') || 'İsmini Değiştir',
          content: `<input type="text" id="name-edit-input" class="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-primary dark:text-white font-bold outline-none focus:ring-2 focus:ring-cyan-500 transition-all" value="${PlayerState.state.profileName}" maxlength="15" />`,
          actions: [
            { text: t('cancel'), onClick: (close) => close() },
            { 
              text: t('save'), 
              primary: true, 
              onClick: async (close) => {
                const input = document.getElementById('name-edit-input');
                if (input && input.value.trim().length > 0) {
                  const newName = input.value.trim();
                  const result = await PlayerState.updateProfile(newName, PlayerState.state.profileTitle);
                  if (result && !result.success) {
                    Toast.show(t('profanity_not_allowed') || 'Uygunsuz kelimeler içeren isimler kullanılamaz!', 'error');
                    Sounds.playSfx('button-tap');
                    return;
                  }
                  Storage.set('player_profile_name', newName);
                  container.querySelector('#profile-name-display').textContent = newName;
                  Sounds.playSfx('success');
                }
                close();
              }
            }
          ]
        });
        setTimeout(() => {
          const input = document.getElementById('name-edit-input');
          if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        }, 50);
      });
    }
  }, 100);

  // 2. XP Bar
  const xpNeeded = PlayerState.getXpNeeded(PlayerState.state.level);
  const xpPercent = Math.min(100, Math.max(0, (PlayerState.state.xp / xpNeeded) * 100));
  
  const xpWrapper = document.createElement('div');
  xpWrapper.className = 'w-full px-2';
  xpWrapper.innerHTML = `
    <div class="flex justify-between items-end mb-2">
      <span class="text-xs font-bold text-gray-500">${t('next_level')}</span>
      <span class="text-sm font-black">${PlayerState.state.xp} / ${xpNeeded} XP</span>
    </div>
  `;
  xpWrapper.appendChild(createProgressBar(xpPercent, 'bg-gradient-to-r from-blue-500 to-cyan-400'));
  content.appendChild(xpWrapper);

  // 3. Stats Grid
  const statsGrid = document.createElement('div');
  statsGrid.className = 'grid grid-cols-3 gap-2 w-full';
  
  const totalGames = Storage.get('player_total_games_played', 0); 
  const maxCombo = Storage.get('player_max_combo', 0); 
  const maxStreak = Storage.get('player_max_streak', 0);

  const createStatBox = (icon, value, label, colorClass) => `
    <div class="glass-panel p-3 rounded-2xl flex flex-col justify-between h-20 relative overflow-hidden">
      <span class="material-symbols-outlined absolute -right-1 -bottom-1 text-4xl opacity-5 ${colorClass}">${icon}</span>
      <span class="material-symbols-outlined text-lg ${colorClass}">${icon}</span>
      <div class="flex flex-col mt-1">
        <span class="text-lg font-black leading-tight">${value}</span>
        <span class="text-[8px] font-extrabold text-gray-400 uppercase tracking-wider">${label}</span>
      </div>
    </div>
  `;

  const matches = PlayerState.state.duelMatches || 0;
  const wins = PlayerState.state.duelWins || 0;
  const winRate = matches > 0 ? Math.round((wins / matches) * 100) + '%' : '0%';

  statsGrid.innerHTML = `
    ${createStatBox('sports_esports', totalGames, t('games_won') || 'Oyunlar', 'text-blue-500')}
    ${createStatBox('local_fire_department', maxStreak, t('max_streak') || 'Seri', 'text-orange-500')}
    ${createStatBox('star', maxCombo, t('max_combo') || 'Kombo', 'text-yellow-500')}
    ${createStatBox('grid_view', PlayerState.state.bestScoreClassic || 0, t('stat_classic_record') || 'Klasik Rekoru', 'text-blue-400')}
    ${createStatBox('hexagon', PlayerState.state.bestScoreHex || 0, t('stat_hex_record') || 'Hex Rekoru', 'text-pink-500')}
    ${createStatBox('science', PlayerState.state.bestScoreSort || 0, t('stat_sort_level') || 'Sort Seviyesi', 'text-green-500')}
    ${createStatBox('map', PlayerState.state.currentAdventureLevel || 1, t('stat_adventure_level') || 'Maceracı Seviyesi', 'text-red-500')}
    ${createStatBox('view_in_ar', PlayerState.state.bestScore2048 || 0, t('stat_2048_record') || '2048 Rekoru', 'text-cyan-500')}
    ${createStatBox('vertical_align_bottom', PlayerState.state.bestScoreX2 || 0, t('stat_x2_record') || 'X2 Rekoru', 'text-yellow-500')}
    ${createStatBox('join_inner', PlayerState.state.bestScoreMerge || 0, t('stat_merge_record') || 'Merge Rekoru', 'text-purple-500')}
    ${createStatBox('auto_awesome', PlayerState.state.bestScoreJewel || 0, t('stat_jewel_record') || 'Patlatma Rekoru', 'text-pink-400')}
    ${createStatBox('bubble_chart', PlayerState.state.bestScoreBubble || 0, t('stat_bubble_record') || 'Baloncuk Rekoru', 'text-sky-400')}
    ${createStatBox('navigation', PlayerState.state.arrowAdventureLevel || 1, t('stat_arrow_level') || 'Ok Bulmacası Seviyesi', 'text-cyan-500')}
    ${createStatBox('swords', wins, t('stat_duel_wins') || 'Düello Galibiyeti', 'text-teal-500')}
    ${createStatBox('military_tech', PlayerState.state.bestScoreDuel || 0, t('stat_duel_record') || 'Düello Rekoru', 'text-amber-500')}
    ${createStatBox('percent', winRate, t('stat_win_rate') || 'Kazanma Oranı', 'text-indigo-500')}
  `;

  const statsSection = document.createElement('div');
  statsSection.className = 'w-full mt-4 flex flex-col gap-2';
  statsSection.innerHTML = `
    <button id="btn-open-stats" class="w-full glass-panel p-3 rounded-2xl flex items-center justify-between active:scale-95 transition-transform shadow-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 group">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
          <span class="material-symbols-outlined text-white">bar_chart</span>
        </div>
        <div class="flex flex-col items-start text-left">
          <span class="font-black text-sm text-blue-400 leading-tight">${t('statistics') || 'İstatistikler'}</span>
          <span class="text-[10px] font-bold text-gray-400 mt-0.5">${t('all_stats_desc') || 'Tüm Rekorlar ve Veriler'}</span>
        </div>
      </div>
      <div class="flex items-center justify-center gap-1 bg-black/20 px-3 py-1.5 rounded-full border border-blue-500/20">
         <span id="stats-chevron" class="material-symbols-outlined text-blue-400 text-sm transition-transform">chevron_right</span>
      </div>
    </button>
    <div id="stats-container" class="hidden flex-col gap-3 bg-black/10 dark:bg-white/5 rounded-3xl p-4 border border-white/5 shadow-inner">
    </div>
  `;

  statsSection.querySelector('#stats-container').appendChild(statsGrid);
  content.appendChild(statsSection);

  setTimeout(() => {
    const btnOpenStats = statsSection.querySelector('#btn-open-stats');
    const statsContainer = statsSection.querySelector('#stats-container');
    const statsChevron = statsSection.querySelector('#stats-chevron');
    if (btnOpenStats && statsContainer && statsChevron) {
      btnOpenStats.onclick = () => {
        Sounds.playSfx('button-tap');
        const isHidden = statsContainer.classList.contains('hidden');
        if (isHidden) {
          statsContainer.classList.remove('hidden');
          statsContainer.classList.add('flex', 'animate-pop-up');
          statsChevron.style.transform = 'rotate(90deg)';
        } else {
          statsContainer.classList.add('hidden');
          statsContainer.classList.remove('flex', 'animate-pop-up');
          statsChevron.style.transform = 'rotate(0deg)';
        }
      };
    }
  }, 0);

  // 4. Badges / Achievements
  const badgesSection = document.createElement('div');
  badgesSection.className = 'w-full mt-6';
  badgesSection.innerHTML = `
    <h3 class="text-sm font-black mb-4 px-2 uppercase tracking-widest text-gray-500">${t('badges')}</h3>
    <div id="badges-grid" class="grid grid-cols-3 gap-3"></div>
  `;
  const badgesGrid = badgesSection.querySelector('#badges-grid');

  const badgesData = getBadgesData();

  badgesData.forEach(badge => {
    const currentTier = getBadgeTier(badge.progress, badge.thresholds);
    const tierDetails = getTierDetails(currentTier);
    const isUnlocked = currentTier > 0;
    
    // Calculate progress to next tier
    const nextThreshold = currentTier < 4 ? badge.thresholds[currentTier] : badge.thresholds[3];
    const progressPercent = currentTier === 4 ? 100 : Math.min(100, (badge.progress / nextThreshold) * 100);
    
    const el = document.createElement('div');
    el.className = `glass-panel p-3 rounded-2xl flex flex-col items-center text-center transform hover:scale-105 transition-transform cursor-pointer relative overflow-hidden ${isUnlocked ? 'opacity-100' : 'opacity-60 grayscale'}`;
    
    el.innerHTML = `
      ${!isUnlocked ? '<span class="material-symbols-outlined absolute top-2 right-2 text-gray-400 text-[10px]">lock</span>' : ''}
      <div class="w-12 h-12 ${tierDetails.color} ${isUnlocked ? 'shadow-lg shadow-black/20' : ''} rounded-full flex items-center justify-center mb-2 z-10">
        <span class="material-symbols-outlined ${isUnlocked ? 'fill text-white drop-shadow-md' : 'text-gray-500'} text-2xl">${badge.icon}</span>
      </div>
      <span class="text-[10px] font-bold leading-tight ${isUnlocked ? 'text-primary dark:text-white' : 'text-gray-500'} z-10">${t(`badge_${badge.id}`) || badge.id}</span>
      
      <!-- Mini Progress Bar -->
      <div class="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full mt-2 overflow-hidden z-10">
        <div class="h-full bg-cyan-500" style="width: ${progressPercent}%"></div>
      </div>
    `;
    
    el.addEventListener('click', () => {
      // Build the list of versions
      let versionsHtml = '';
      const versionNames = [t('bronze') || 'Bronz', t('silver') || 'Gümüş', t('gold') || 'Altın', t('diamond_tier') || 'Elmas'];
      
      for(let i = 0; i < 4; i++) {
        const tDet = getTierDetails(i + 1);
        const unlockedThisTier = currentTier > i;
        const targetDesc = (t(`badge_${badge.id}_desc`) || '').replace('{target}', badge.thresholds[i].toLocaleString());
        
        versionsHtml += `
          <div class="flex items-center gap-3 p-3 rounded-xl ${unlockedThisTier ? 'bg-secondary/10' : 'bg-black/5 dark:bg-white/5 opacity-60'} mb-2 w-full text-left relative">
            ${!unlockedThisTier ? '<span class="material-symbols-outlined absolute right-3 text-gray-400">lock</span>' : '<span class="material-symbols-outlined absolute right-3 text-green-500">check_circle</span>'}
            <div class="w-10 h-10 shrink-0 ${tDet.color} rounded-full flex items-center justify-center shadow-md">
              <span class="material-symbols-outlined fill text-white">${badge.icon}</span>
            </div>
            <div class="flex flex-col">
              <span class="text-xs font-black ${tDet.text}">${versionNames[i]}</span>
              <span class="text-[10px] font-medium text-gray-600 dark:text-gray-300 leading-tight">${targetDesc}</span>
            </div>
          </div>
        `;
      }

      const modal = createModal({
        title: t(`badge_${badge.id}`) || badge.id,
        content: `
        <div class="flex flex-col items-center p-2">
          <div class="w-full flex justify-between text-xs font-bold text-gray-500 mb-2 px-2">
            <span>${t('progress') || 'İlerleme'}: ${badge.progress.toLocaleString()}</span>
            <span>${currentTier < 4 ? t('next') || 'Sonraki' + ': ' + nextThreshold.toLocaleString() : t('max_level') || 'Maksimum'}</span>
          </div>
          <div class="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full mb-4 overflow-hidden">
            <div class="h-full bg-cyan-500 transition-all duration-500" style="width: ${progressPercent}%"></div>
          </div>
          <div class="w-full max-h-60 overflow-y-auto no-scrollbar pb-2">
            ${versionsHtml}
          </div>
        </div>
      `,
        actions: [
          { text: t('close') || 'Kapat', onClick: () => modal.close(), primary: true }
        ]
      });
      document.body.appendChild(modal);
    });
    badgesGrid.appendChild(el);
  });

  content.appendChild(badgesSection);

  // --- ACCOUNT SECURITY SECTION ---
  const accountSection = document.createElement('div');
  accountSection.className = 'w-full max-w-sm mt-6 animate-slide-up';
  
  const accountHeader = document.createElement('div');
  accountHeader.className = 'w-full flex justify-between items-center mb-3 px-2';
  accountHeader.innerHTML = `
    <h3 class="font-black text-sm tracking-widest text-primary dark:text-white uppercase">${t('account_security') || 'Hesabı Güvenceye Al'}</h3>
  `;
  accountSection.appendChild(accountHeader);

  const accountCard = document.createElement('div');
  accountCard.className = 'glass-panel p-4 rounded-2xl flex flex-col items-center justify-between mb-4 ring-1 ring-black/5 dark:ring-white/10 relative overflow-hidden';
  accountSection.appendChild(accountCard);

  const renderAccountCard = () => {
    const isLinked = PlayerState.state.linkedProvider === 'google.com';
    
    if (isLinked) {
      accountCard.innerHTML = `
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-green-500/10 rounded-full blur-xl"></div>
        <div class="flex items-center w-full justify-between relative z-10">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center">
              <span class="material-symbols-outlined text-xl">gpp_good</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">${t('account_status') || 'Hesap Durumu'}</span>
              <span class="text-sm font-black text-green-500">${t('linked_to_google') || "Google'a Bağlı ✅"}</span>
            </div>
          </div>
        </div>
        <p class="text-[9px] text-gray-500 mt-3 text-center w-full relative z-10">${t('account_secure_desc') || 'Hesabınız güvende. Oyunu silseniz bile Google hesabınızla geri dönebilirsiniz.'}</p>
      `;
    } else {
      accountCard.innerHTML = `
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-red-500/5 rounded-full blur-xl"></div>
        <div class="flex flex-col w-full relative z-10">
          <div class="flex items-start gap-3 mb-3">
            <div class="w-10 h-10 shrink-0 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
              <span class="material-symbols-outlined text-xl">gpp_bad</span>
            </div>
            <div class="flex flex-col">
              <span class="text-[10px] font-bold text-red-500 uppercase tracking-widest animate-pulse">${t('guest_account_warning') || 'Dikkat: Misafir Hesap'}</span>
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">${(t('guest_account_desc') || 'Oyunu silerseniz veya telefon değiştirirseniz hesabınız kalıcı olarak silinecektir')}</span>
            </div>
          </div>
          <button id="btn-link-google" class="w-full py-3 rounded-xl bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black shadow-md border border-gray-200 dark:border-gray-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
            <svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg>
            ${t('secure_with_google') || 'Google ile Güvenceye Al'}
          </button>
        </div>
      `;

      accountCard.querySelector('#btn-link-google').onclick = () => {
        Toast.show(t('connecting') || 'Bağlanıyor...', 'info');
        linkAccountWithGoogle().then(res => {
          if (res.success) {
            Toast.show(t('google_linked_success') || "Hesap başarıyla Google'a bağlandı!", 'success');
            renderAccountCard();
          } else {
            Toast.show(res.msg, 'error');
          }
        });
      };
    }
  };

  renderAccountCard();
  content.appendChild(accountSection);

  // --- FRIENDS SECTION ---
  const friendsSection = document.createElement('div');
  friendsSection.className = 'w-full max-w-sm mt-6 animate-slide-up';
  
  const friendsHeader = document.createElement('div');
  friendsHeader.className = 'w-full flex justify-between items-center mb-3 px-2';
  friendsHeader.innerHTML = `
    <h3 class="font-black text-sm tracking-widest text-primary dark:text-white uppercase">${t('friends') || 'Arkadaşlar'}</h3>
    <button class="bg-primary/10 text-primary dark:bg-white/10 dark:text-white px-3 py-1 rounded-full text-xs font-bold hover:scale-105 active:scale-95 transition-all" id="btn-add-friend">
      <span class="material-symbols-outlined text-[14px] align-middle mr-1">person_add</span>
      ${t('add_friend_btn') || 'Ekle'}
    </button>
  `;
  friendsSection.appendChild(friendsHeader);

  // My Code
  const myCodeCard = document.createElement('div');
  myCodeCard.className = 'glass-panel p-3 rounded-2xl flex items-center justify-between mb-4 ring-1 ring-black/5 dark:ring-white/10';
  friendsSection.appendChild(myCodeCard);

  const renderMyCode = () => {
    myCodeCard.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 ${PlayerState.state.firebaseError ? 'bg-red-500/20 text-red-500' : 'bg-cyan-500/20 text-cyan-500'} rounded-full flex items-center justify-center">
          <span class="material-symbols-outlined text-xl">${PlayerState.state.firebaseError ? 'wifi_off' : 'qr_code'}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">${t('my_friend_code') || 'Arkadaş Kodum'}</span>
          <span class="text-lg font-black tracking-widest ${PlayerState.state.firebaseError ? 'text-red-500' : 'text-primary dark:text-white'}">${PlayerState.state.firebaseError ? (t('error_upper') || 'HATA') : (PlayerState.state.friendCode || '-------')}</span>
        </div>
      </div>
      <button class="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-primary dark:hover:text-white transition-colors" id="btn-copy-code">
        <span class="material-symbols-outlined text-sm">content_copy</span>
      </button>
    `;

    myCodeCard.querySelector('#btn-copy-code').onclick = () => {
      if (!PlayerState.state.friendCode || PlayerState.state.firebaseError) return;
      navigator.clipboard.writeText(PlayerState.state.friendCode || '');
      Toast.show(t('code_copied') || 'Kod Kopyalandı!', 'success');
    };
  };

  renderMyCode();
  
  // Wait for Firebase to load if not already
  if (!PlayerState.state.friendCode && !PlayerState.state.firebaseError) {
    const codeCheckInterval = setInterval(() => {
      if (PlayerState.state.friendCode || PlayerState.state.firebaseError) {
        clearInterval(codeCheckInterval);
        renderMyCode();
      }
    }, 500);
    // Cleanup interval when container is destroyed
    const originalCleanup = container.cleanup;
    container.cleanup = () => {
      clearInterval(codeCheckInterval);
      if (originalCleanup) originalCleanup();
    };
  }

  const requestsContainer = document.createElement('div');
  requestsContainer.className = 'w-full flex flex-col gap-2 mb-4';
  friendsSection.appendChild(requestsContainer);

  const friendsListContainer = document.createElement('div');
  friendsListContainer.className = 'w-full flex flex-col gap-2 pb-8';
  friendsSection.appendChild(friendsListContainer);

  // --- Presence dinleyici yönetimi (RTDB sızıntısını önler) ---
  // Her render'da açılan onValue dinleyicilerini topla; yeniden render'dan
  // ÖNCE ve ekran kapanırken hepsini kapat.
  const presenceUnsubs = [];
  const clearPresence = () => {
    presenceUnsubs.forEach(u => { try { u && u(); } catch (_) {} });
    presenceUnsubs.length = 0;
  };

  const renderRequests = () => {
    const requests = PlayerState.state.friendRequests || [];
    requestsContainer.innerHTML = '';
    
    if (requests.length === 0) return;

    const title = document.createElement('h4');
    title.className = 'text-xs font-black text-secondary uppercase tracking-widest mb-1';
    title.innerText = (t('incoming_requests') || 'Gelen İstekler') + ' (' + requests.length + ')';
    requestsContainer.appendChild(title);

    requests.forEach(req => {
      const el = document.createElement('div');
      el.className = 'bg-secondary/10 border border-secondary/20 p-2 rounded-xl flex items-center justify-between shadow-sm mb-1';
      
      el.innerHTML = `
        <div class="flex items-center gap-2">
          <img loading="lazy" decoding="async" src="/avatars/${req.senderAvatar || 'akita'}.png" onerror="this.src='/avatars/akita.png'" class="w-8 h-8 rounded-full border border-secondary/50 bg-white/10" />
          <div class="flex flex-col">
            <span class="text-xs font-bold text-primary dark:text-white leading-none">${req.senderName}</span>
            <span class="text-[9px] font-black text-secondary tracking-widest mt-0.5">${t('level_abbr') || 'Sv.'} ${req.senderLevel || 1}</span>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button class="btn-reject w-7 h-7 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-[14px]">close</span>
          </button>
          <button class="btn-accept w-7 h-7 rounded-lg bg-green-500/10 text-green-500 hover:bg-green-500/20 flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-[14px]">check</span>
          </button>
        </div>
      `;

      el.querySelector('.btn-accept').onclick = () => {
        if (el.dataset.busy) return;       // çift-tık koruması
        el.dataset.busy = '1';
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
        FriendService.acceptFriendRequest(req.senderUid).then(res => {
          if (res && res.success) {
            Toast.show(t('request_accepted') || 'İstek kabul edildi!', 'success');
            // Canlı dinleyici listeyi otomatik günceller — manuel fetch yok.
          } else {
            // Başarısız: butonu geri aç + bilgilendir (aksi halde kilitli kalırdı)
            delete el.dataset.busy;
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
            Toast.show(t('action_failed') || 'İşlem başarısız. Tekrar deneyin.', 'error');
          }
        }).catch(() => {
          delete el.dataset.busy;
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
          Toast.show(t('action_failed') || 'İşlem başarısız. Tekrar deneyin.', 'error');
        });
      };

      el.querySelector('.btn-reject').onclick = () => {
        if (el.dataset.busy) return;
        el.dataset.busy = '1';
        el.style.opacity = '0.5';
        el.style.pointerEvents = 'none';
        FriendService.rejectFriendRequest(req.senderUid).then(res => {
          if (!res || !res.success) {
            delete el.dataset.busy;
            el.style.opacity = '1';
            el.style.pointerEvents = 'auto';
            Toast.show(t('action_failed') || 'İşlem başarısız. Tekrar deneyin.', 'error');
          }
        }).catch(() => {
          delete el.dataset.busy;
          el.style.opacity = '1';
          el.style.pointerEvents = 'auto';
        });
      };

      requestsContainer.appendChild(el);
    });
  };

  // Listen for changes in requests AND friends (canlı state — main.js'teki
  // birleşik dinleyici PlayerState'i güncelledikçe ekran otomatik tazelenir).
  const unsubscribeRequests = PlayerState.subscribe(() => {
    renderRequests();
    drawFriends(PlayerState.state.friends || []);
  });
  const ogCleanup2 = container.cleanup;
  container.cleanup = () => {
    unsubscribeRequests();
    clearPresence();              // açık kalan tüm presence dinleyicilerini kapat
    if (ogCleanup2) ogCleanup2();
  };

  // Render initially
  renderRequests();

  // Tek bir arkadaş listesini DOM'a çizer (ağ çağrısı YAPMAZ).
  const drawFriends = (friends) => {
    clearPresence(); // önceki render'ın presence dinleyicilerini kapat

    if (!friends || friends.length === 0) {
      friendsListContainer.innerHTML = `
        <div class="w-full text-center p-6 bg-black/5 dark:bg-white/5 rounded-2xl flex flex-col items-center gap-2">
          <span class="material-symbols-outlined text-3xl text-gray-400">group_off</span>
          <p class="text-xs font-medium text-gray-500">${t('no_friends_yet') || 'Henüz arkadaşın yok.'}</p>
        </div>
      `;
      return;
    }

    friendsListContainer.innerHTML = '';
    friends.forEach((friend) => {
      const item = document.createElement('div');
      item.className = 'glass-panel p-3 rounded-2xl flex items-center justify-between ring-1 ring-black/5 dark:ring-white/10 relative overflow-hidden';

      const presenceDotId = 'profile-presence-' + friend.uid;

      item.innerHTML = `
        <div class="flex items-center gap-3">
          <div class="relative">
            <img loading="lazy" decoding="async" src="/avatars/${friend.avatar}.png" onerror="this.src='/avatars/akita.png'" class="w-12 h-12 rounded-full border-2 border-white dark:border-primary shadow-sm" />
            <div id="${presenceDotId}" class="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-primary bg-gray-400 transition-colors duration-300"></div>
          </div>
          <div class="flex flex-col">
            <span class="font-black text-sm text-primary dark:text-white leading-tight">${friend.name}</span>
            <span class="text-[10px] font-bold text-gray-500">${t('level')} ${friend.level}</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="remove-friend-btn w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 text-gray-400 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center active:scale-95 transition-all">
            <span class="material-symbols-outlined text-sm">person_remove</span>
          </button>
          <button class="duel-friend-btn w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-md shadow-cyan-500/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
            <span class="material-symbols-outlined text-sm">swords</span>
          </button>
        </div>
      `;

      // Presence dinleyicisi — dönen unsubscribe SAKLANIR (sızıntı yok).
      const unsub = FriendService.listenToPresence(friend.uid, (status) => {
        const dot = item.querySelector('#' + presenceDotId);
        if (dot) {
          dot.className = 'absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-primary transition-colors duration-300';
          if (status.state === 'online') dot.classList.add('bg-green-500');
          else if (status.state === 'playing') dot.classList.add('bg-orange-500');
          else dot.classList.add('bg-gray-400');
        }
      });
      presenceUnsubs.push(unsub);

      // Düello — await süresince disable + try/catch (çoklu challenge önlenir).
      const duelBtn = item.querySelector('.duel-friend-btn');
      duelBtn.onclick = async () => {
        if (duelBtn.disabled) return;
        duelBtn.disabled = true;
        duelBtn.style.opacity = '0.6';
        try {
          const roomId = await MultiplayerService.sendChallenge(friend.uid);
          if (roomId) {
            Storage.set('duel_multiplayer', true);
            Storage.set('duel_multiplayer_action', 'create');
            Storage.set('duel_room_code', roomId);
            router.navigate('#/duel');
          } else {
            duelBtn.disabled = false;
            duelBtn.style.opacity = '1';
            Toast.show(t('challenge_failed') || 'Meydan okuma gönderilemedi.', 'error');
          }
        } catch (e) {
          duelBtn.disabled = false;
          duelBtn.style.opacity = '1';
          Toast.show(t('challenge_failed') || 'Meydan okuma gönderilemedi.', 'error');
        }
      };

      // Arkadaşlıktan çıkar / engelle — onay modalı + optimistic UI.
      const removeBtn = item.querySelector('.remove-friend-btn');
      removeBtn.onclick = () => {
        // Optimistic kaldırma + servis çağrısı ortak yardımcı.
        const optimisticRemoveThen = async (serviceCall, okMsg) => {
          const next = (PlayerState.state.friends || []).filter(f => f.uid !== friend.uid);
          PlayerState.state.friends = next;
          PlayerState.save();
          drawFriends(next);
          const res = await serviceCall();
          if (res && res.success) {
            Toast.show(okMsg, 'success');
          } else {
            Toast.show(t('action_failed') || 'İşlem başarısız. Tekrar deneyin.', 'error');
            drawFriends(PlayerState.state.friends || []); // canlı dinleyici reconcile eder
          }
        };

        const confirmModal = createModal({
          title: t('remove_friend') || 'Arkadaşı Çıkar',
          content: `<p class="text-sm text-center text-gray-500 px-2 py-2">${
            (t('remove_friend_confirm') || '{name} arkadaşlıktan çıkarılsın mı?').replace('{name}', friend.name)
          }</p>`,
          actions: [
            { text: t('cancel') || 'İptal', onClick: (close) => close() },
            {
              text: t('block_user') || 'Engelle',
              onClick: async (close) => {
                close();
                await optimisticRemoveThen(
                  () => FriendService.blockUser(friend.uid),
                  t('user_blocked') || 'Kullanıcı engellendi.'
                );
              }
            },
            {
              text: t('remove') || 'Çıkar',
              primary: true,
              onClick: async (close) => {
                close();
                await optimisticRemoveThen(
                  () => FriendService.removeFriend(friend.uid),
                  t('friend_removed') || 'Arkadaş çıkarıldı.'
                );
              }
            }
          ]
        });
        document.body.appendChild(confirmModal);
      };

      friendsListContainer.appendChild(item);
    });
  };

  // Arkadaş listesi artık main.js'teki BİRLEŞİK CANLI DİNLEYİCİ üzerinden
  // PlayerState.state.friends'e canlı gelir. Bu ekran 0 ek okuma yapar; yalnızca
  // state'ten çizer. (TTL/fetch mantığı kaldırıldı — dinleyici tek kaynak.)
  const renderFriendsList = () => {
    drawFriends(PlayerState.state.friends || []);
  };

  friendsHeader.querySelector('#btn-add-friend').onclick = () => {
    if (PlayerState.state.firebaseError) {
      Toast.show(t('no_server_connection') || 'Sunucu Bağlantısı Yok (Anonim Girişi Açın)', 'error');
      return;
    }
    let submitting = false; // çift-gönderim / çoklu Write koruması
    const modal = createModal({
      title: t('add_friend') || 'Arkadaş Ekle',
      content: `
        <div class="flex flex-col gap-4 p-2 items-center">
          <p class="text-xs text-gray-500 text-center">${t('enter_friend_code') || 'Arkadaşınızın kodunu girin:'}</p>
          <input type="text" id="friend-code-input" maxlength="7" class="w-48 text-center text-2xl font-black tracking-widest bg-black/5 dark:bg-white/5 border-2 border-primary/20 dark:border-white/20 rounded-xl py-3 text-primary dark:text-white uppercase outline-none focus:border-primary dark:focus:border-white transition-colors" placeholder="-------" />
        </div>
      `,
      actions: [
        { text: t('cancel') || 'İptal', onClick: (close) => close() },
        { 
          text: t('add_friend_btn') || 'Ekle', 
          primary: true, 
          onClick: (close) => {
            if (submitting) return;            // çift-tık koruması
            const input = document.getElementById('friend-code-input');
            const code = input.value.toUpperCase();
            if (code.length === 6 || code.length === 7) {
              submitting = true;
              FriendService.addFriend(code).then(res => {
                  if (res.success) {
                    // Kod ile ekleme artık İSTEK gönderir (rıza + simetri).
                    // Karşı taraf zaten istek attıysa servis otomatik kabul eder.
                    const msg = res.accepted
                      ? (t('friend_added') || 'Arkadaş Eklendi!')
                      : (t('friend_request_sent') || 'Arkadaşlık isteği gönderildi!');
                    Toast.show(msg, 'success');
                    // Liste/istek durumu canlı dinleyiciyle otomatik güncellenir.
                    close();
                  } else {
                    submitting = false;
                    const errMap = {
                      self: t('cannot_add_self') || 'Kendini ekleyemezsin.',
                      not_found: t('player_not_found') || 'Oyuncu bulunamadı.',
                      already_friends: t('already_friends') || 'Zaten arkadaşsınız!',
                      blocked: t('user_is_blocked') || 'Bu kullanıcı engelli.'
                    };
                    Toast.show(errMap[res.msg] || (t('action_failed') || 'İşlem başarısız.'), 'error');
                  }
              }).catch(() => {
                submitting = false;
                Toast.show(t('action_failed') || 'İşlem başarısız. Tekrar deneyin.', 'error');
              });
            } else {
              input.classList.add('animate-shake', 'border-red-500');
              setTimeout(() => input.classList.remove('animate-shake', 'border-red-500'), 400);
            }
          }
        }
      ]
    });
    document.body.appendChild(modal);
    setTimeout(() => {
      const input = document.getElementById('friend-code-input');
      if (input) input.focus();
    }, 100);
  };

  renderFriendsList();
  content.appendChild(friendsSection);

  container.appendChild(content);

  const avatarContainer = container.querySelector('#avatar-container');
  const avatarImg = container.querySelector('#profile-avatar');
  avatarImg.src = getAvatarUrl(PlayerState.state.avatarSeed || 'akita');

  avatarContainer.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    Haptics.vibrate('light');

    const modalContent = document.createElement('div');
    modalContent.className = 'w-full flex flex-col items-center';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center w-full mb-4 px-2';
    header.innerHTML = `
      <span class="text-sm font-black text-gray-500">${t('shop_balance')}:</span>
      <div class="flex items-center gap-1 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
        <span class="material-symbols-outlined text-sm text-cyan-500">diamond</span>
        <span class="font-black text-cyan-500" id="avatar-modal-diamonds">${PlayerState.state.diamonds}</span>
      </div>
    `;
    modalContent.appendChild(header);

      const tabsContainer = document.createElement('div');
      tabsContainer.className = 'w-full flex justify-center gap-6 mb-4 mt-2 border-b border-gray-200 dark:border-gray-800 pb-2';
      
      let currentTab = 'male';
      
      const renderTabs = () => {
         tabsContainer.innerHTML = `
           <button data-tab="male" class="flex flex-col items-center justify-center p-2 rounded-xl transition-all ${currentTab === 'male' ? 'text-cyan-500 scale-110 drop-shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:scale-105'}">
             <span class="material-symbols-outlined text-3xl">face</span>
             <span class="text-[10px] font-black mt-1 tracking-wider uppercase">${t('tab_male') || 'Erkek'}</span>
           </button>
           <button data-tab="female" class="flex flex-col items-center justify-center p-2 rounded-xl transition-all ${currentTab === 'female' ? 'text-pink-500 scale-110 drop-shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:scale-105'}">
             <span class="material-symbols-outlined text-3xl">face_3</span>
             <span class="text-[10px] font-black mt-1 tracking-wider uppercase">${t('tab_female') || 'Kadın'}</span>
           </button>
           <button data-tab="animal" class="flex flex-col items-center justify-center p-2 rounded-xl transition-all ${currentTab === 'animal' ? 'text-orange-500 scale-110 drop-shadow-md' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:scale-105'}">
             <span class="material-symbols-outlined text-3xl">pets</span>
             <span class="text-[10px] font-black mt-1 tracking-wider uppercase">${t('tab_animal') || 'Hayvan'}</span>
           </button>
         `;
         tabsContainer.querySelectorAll('button').forEach(btn => {
           btn.addEventListener('click', (e) => {
             const tab = e.currentTarget.dataset.tab;
             if (currentTab !== tab) {
               currentTab = tab;
               Sounds.playSfx('button-tap');
               renderTabs();
               renderAvatars();
             }
           });
         });
      };
      renderTabs();
      modalContent.appendChild(tabsContainer);

      const viewContainer = document.createElement('div');
      viewContainer.className = 'w-full h-64 overflow-y-auto no-scrollbar relative';

      const avatarGrid = document.createElement('div');
      avatarGrid.className = 'grid grid-cols-4 gap-4 w-full p-2';

      const previewContainer = document.createElement('div');
      previewContainer.className = 'w-full h-full flex-col items-center justify-center animate-pop-up hidden';
      
      viewContainer.appendChild(avatarGrid);
      viewContainer.appendChild(previewContainer);
      
      let currentSelectedSeed = PlayerState.state.avatarSeed || 'akita';
      let previewingAvatar = null;
      let modalRef = null;
  
      const renderAvatars = () => {
        avatarGrid.innerHTML = '';
        previewContainer.innerHTML = '';
        
        if (previewingAvatar) {
          avatarGrid.classList.add('hidden');
          previewContainer.classList.remove('hidden');
          previewContainer.classList.add('flex');
          
          const isUnlocked = previewingAvatar.cost === 0 || PlayerState.state.unlockedAvatars.includes(previewingAvatar.id);
          
          const avatarKey = 'avatar_' + previewingAvatar.id;
          const translatedName = t(avatarKey);
          const displayName = translatedName === avatarKey ? previewingAvatar.id : translatedName;
          
          previewContainer.innerHTML = `
            <div class="relative w-28 h-28 mb-2">
              <img loading="lazy" decoding="async" src="${getAvatarUrl(previewingAvatar.id)}" class="w-full h-full rounded-full border-4 border-white dark:border-primary shadow-xl ${!isUnlocked ? 'grayscale-[50%] opacity-80' : ''}" style="object-fit: cover;" />
              ${!isUnlocked ? `
              <div class="absolute -top-2 -right-2 bg-red-500 rounded-full w-8 h-8 flex items-center justify-center shadow-md border-2 border-white dark:border-gray-800">
                <span class="material-symbols-outlined text-white text-[16px] font-bold">lock</span>
              </div>
              ` : ''}
            </div>
            <span class="text-lg font-black capitalize mb-1">${displayName}</span>
            ${!isUnlocked ? `<span class="text-[10px] font-bold text-gray-500 mb-2">${t('tier_locked') || 'Kilitli'}</span>` : `<span class="text-[10px] font-bold text-green-500 mb-2">${t('shop_unlocked') || 'Açık'}</span>`}
            
            <div class="flex gap-3 w-full px-4 mt-2">
              <button id="btn-preview-back" class="flex-1 py-2.5 rounded-xl bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold hover:bg-gray-300 dark:hover:bg-gray-700 active:scale-95 transition-all shadow-sm">
                ${t('go_back') || 'Geri Çık'}
              </button>
              <button id="btn-preview-action" class="flex-1 py-2.5 rounded-xl ${isUnlocked ? 'bg-green-500 text-white' : 'bg-cyan-500 text-white'} font-bold shadow-md hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1">
                ${isUnlocked ? (t('equip') || 'Seç / Ekle') : `<span class="material-symbols-outlined text-sm">diamond</span> ${previewingAvatar.cost >= 1000 ? (previewingAvatar.cost/1000)+'k' : previewingAvatar.cost}`}
              </button>
            </div>
          `;

          previewContainer.querySelector('#btn-preview-back').onclick = () => {
            Sounds.playSfx('button-tap');
            previewingAvatar = null;
            renderAvatars();
          };

          previewContainer.querySelector('#btn-preview-action').onclick = () => {
            Sounds.playSfx('button-tap');
            if (isUnlocked) {
              PlayerState.setAvatar(previewingAvatar.id);
              Storage.set('player_avatar_seed', previewingAvatar.id);
              avatarImg.src = getAvatarUrl(previewingAvatar.id);
              Sounds.playSfx('success');
              if (modalRef) modalRef.close();
            } else {
              if (PlayerState.state.diamonds >= previewingAvatar.cost) {
                const success = PlayerState.unlockAvatar(previewingAvatar.id, previewingAvatar.cost);
                if (success) {
                  Sounds.playSfx('success');
                    Toast.show(t('avatar_bought') || 'Avatar unlocked!', 'success');
                  PlayerState.setAvatar(previewingAvatar.id);
                  Storage.set('player_avatar_seed', previewingAvatar.id);
                  avatarImg.src = getAvatarUrl(previewingAvatar.id);
                  if (modalRef) modalRef.close();
                }
              } else {
                Sounds.playSfx('invalid');
                const btn = previewContainer.querySelector('#btn-preview-action');
                btn.classList.add('animate-shake', 'bg-red-500');
                setTimeout(() => btn.classList.remove('animate-shake', 'bg-red-500'), 400);
                Toast.show(t('insufficient_funds') || 'Yetersiz Elmas', 'error');
              }
            }
          };

          return;
        }
        
        avatarGrid.classList.remove('hidden');
        previewContainer.classList.add('hidden');
        previewContainer.classList.remove('flex');
        
        const filteredAvatars = avatarOptions.filter(a => a.category === currentTab);
        
        const sortedAvatars = [...filteredAvatars].sort((a, b) => {
        const aUnlocked = a.cost === 0 || PlayerState.state.unlockedAvatars.includes(a.id);
        const bUnlocked = b.cost === 0 || PlayerState.state.unlockedAvatars.includes(b.id);
        if (aUnlocked === bUnlocked) {
           return a.cost - b.cost;
        }
        return aUnlocked ? -1 : 1;
      });

      sortedAvatars.forEach(avatar => {
        const isUnlocked = avatar.cost === 0 || PlayerState.state.unlockedAvatars.includes(avatar.id);
        const isSelected = avatar.id === currentSelectedSeed;
        
        const wrapper = document.createElement('div');
        wrapper.className = `relative w-14 h-14 rounded-full p-1 cursor-pointer transition-all ${isSelected ? 'bg-cyan-500 scale-110 shadow-lg z-10' : 'bg-gray-100 dark:bg-gray-800 hover:scale-105'}`;
        
        let innerHtml = `<img loading="lazy" decoding="async" src="${getAvatarUrl(avatar.id)}" class="w-full h-full rounded-full ${!isUnlocked ? 'opacity-80 grayscale-[30%]' : ''}" style="object-fit: cover;" />`;
        
        if (!isUnlocked) {
          innerHtml += `
            <div class="absolute -bottom-2 -left-2 right-[-8px] bg-black/80 rounded-full px-1 py-0.5 flex justify-center items-center gap-0.5 z-20 shadow-md border border-white/10">
              <span class="material-symbols-outlined text-[8px] text-cyan-400">diamond</span>
              <span class="text-[9px] text-white font-black">${avatar.cost >= 1000 ? (avatar.cost/1000)+'k' : avatar.cost}</span>
            </div>
            <div class="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 flex items-center justify-center z-20 shadow-md border border-white dark:border-gray-800">
              <span class="material-symbols-outlined text-white text-[10px] font-bold">lock</span>
            </div>
          `;
        } else if (isSelected) {
           innerHtml += `
            <div class="absolute -top-1 -right-1 bg-green-500 rounded-full w-5 h-5 flex justify-center items-center z-20 shadow-md border-2 border-white dark:border-gray-800">
              <span class="material-symbols-outlined text-[12px] text-white font-black">check</span>
            </div>
           `;
        }

        wrapper.innerHTML = innerHtml;
        
        wrapper.addEventListener('click', () => {
          Sounds.playSfx('button-tap');
          Haptics.vibrate('light');
          previewingAvatar = avatar;
          renderAvatars();
        });
        
        avatarGrid.appendChild(wrapper);
      });
    };
    
    renderAvatars();
    modalContent.appendChild(viewContainer);

    modalRef = createModal({
      title: t('change_avatar') || 'Avatar Seç',
      content: modalContent,
      onClose: () => {},
      actions: []
    });
  });

  container.appendChild(createBottomNav('profile'));

  initSwipeNavigation(container, router, 'profile');

  const ogCleanup3 = container.cleanup;
  container.cleanup = () => {
    if (topBar.cleanup) topBar.cleanup();
    if (ogCleanup3) ogCleanup3();
  };

  return container;
}
