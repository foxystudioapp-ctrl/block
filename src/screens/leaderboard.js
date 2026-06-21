import { createTopBar } from '../components/topBar.js';
import { createBottomNav } from '../components/bottomNav.js';
import { PlayerState } from '../state/playerState.js';
import { t } from '../utils/i18n.js';
import { getAvatarUrl, avatarOptions } from '../utils/avatars.js';
import { getBadgeTier, getTierDetails, getBadgesData } from '../utils/badges.js';
import { initSwipeNavigation } from '../utils/swipeNav.js';
import { FriendService } from '../services/friendService.js';
import { MultiplayerService } from '../services/multiplayerService.js';
import { BotManager } from '../utils/botEngine.js';
import { createModal } from '../components/modal.js';

export function Leaderboard(router) {
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] flex flex-col justify-between bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-pop-up overflow-hidden relative';

  // 1. Top Bar
  const topBar = createTopBar(t('lb_title') || 'Ayın Sıralaması', true);
  container.appendChild(topBar);

  // 2. Scrollable Content
  const contentWrapper = document.createElement('main');
  contentWrapper.className = 'flex-1 overflow-y-auto px-4 no-scrollbar relative z-10 touch-pan-y overscroll-y-contain pt-4';
  container.appendChild(contentWrapper);

  const renderContent = async () => {
    contentWrapper.innerHTML = `
      <div class="flex justify-center items-center h-32">
        <span class="material-symbols-outlined animate-spin text-4xl text-cyan-500">autorenew</span>
      </div>
    `;

    // 1. Fetch Real Players
    const realPlayers = await MultiplayerService.getTopPlayers();
    
    // 2. Generate Local Bots (Eksik olan name ve avatar özelliklerini haritalıyoruz)
    const topBots = BotManager.getTopBots(50).map(b => ({
      ...b,
      name: b.profileName,
      avatar: getAvatarUrl(b.avatarSeed)
    }));

    // 3. Current Player
    const myUid = PlayerState.state.uid || 'me';
    const myScore = PlayerState.state.globalTrophies || 0;
    const myData = {
      uid: myUid,
      name: PlayerState.state.profileName || t('you') || 'Sen',
      globalTrophies: myScore,
      level: PlayerState.state.level || 1,
      avatar: getAvatarUrl(PlayerState.state.avatarSeed || 'akita'),
      isMe: true
    };

    // 4. Friends
    const friends = PlayerState.state.friends || [];
    const friendData = friends.map(f => {
      // In a real scenario, you'd fetch live friend scores. For now, use local cached if any.
      return {
        uid: f.uid,
        name: f.name || 'Friend',
        globalTrophies: f.globalTrophies || Math.floor(Math.random() * 50000), // Fallback
        level: f.level || 1,
        avatar: getAvatarUrl(f.avatar || 'akita'),
        isFriend: true
      };
    });

    // Merge and deduplicate by UID
    const mergedMap = new Map();
    
    [...realPlayers, ...topBots, myData, ...friendData].forEach(p => {
      // If duplicate UID (e.g. me in realPlayers), keep the local data (isMe=true) 
      // or the one with the highest score
      const existing = mergedMap.get(p.uid);
      if (!existing || p.isMe || p.isFriend || p.globalTrophies > existing.globalTrophies) {
        mergedMap.set(p.uid, p);
      }
    });

    let mockData = Array.from(mergedMap.values());
    
    // Sort descending by score
    mockData.sort((a, b) => b.globalTrophies - a.globalTrophies);

    // Calculate Rank
    const TOTAL_PLAYERS = 1000000; 
    let currentRank = 1;
    let rankSet = false;

    mockData.forEach((p, i) => {
      // For the top 50, they get exact rank
      if (i < 50) {
        p.rank = i + 1;
      } else {
        // Calculate Percentile/Rank for below top 50
        const top50Score = mockData[49] ? mockData[49].globalTrophies : 100000;
        const myScore = p.globalTrophies;
        
        if (myScore >= top50Score) {
          p.rank = 50; 
        } else {
          // Quadratic distribution estimation
          const ratio = Math.min(1, myScore / (top50Score || 1));
          const calculatedRank = 50 + (TOTAL_PLAYERS - 50) * (1 - Math.pow(ratio, 2));
          p.rank = Math.floor(calculatedRank);
        }
      }
    });

    // Re-find 'me' and determine percentile
    const myRank = mockData.find(p => p.uid === myUid).rank;
    let percentileText = '';
    if (myRank > 50) {
      const percentile = Math.max(1, Math.round((myRank / TOTAL_PLAYERS) * 100));
      percentileText = t('top_percent') ? t('top_percent').replace('{p}', percentile) : `Top %${percentile}`;
    }

    // Filter to Display Data
    // We want to show Top 50, PLUS friends (no matter their rank), PLUS me.
    let displayData = mockData.slice(0, 50);
    const extras = mockData.slice(50).filter(p => p.isMe || p.isFriend);
    
    // Insert separators and extras
    if (extras.length > 0) {
      // Sort extras by rank
      extras.sort((a,b) => a.rank - b.rank);
      displayData.push({ isSeparator: true });
      displayData = displayData.concat(extras);
    }

    // Render HTML
    contentWrapper.innerHTML = '';
    // Global Header Info
    const headerPanel = document.createElement('div');
    headerPanel.className = 'glass-card p-4 rounded-3xl mb-6 flex justify-around items-center text-center border border-black/5 dark:border-white/5 shadow-sm animate-fade-in z-10 relative';
    headerPanel.innerHTML = `
      <div class="flex flex-col">
        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">${t('lb_my_score') || 'Senin Skorun'}</span>
        <span class="text-xl font-black text-primary dark:text-white mt-0.5">${myScore.toLocaleString()} <span class="text-yellow-500 text-sm">🏆</span></span>
      </div>
      <div class="w-px h-8 bg-black/10 dark:bg-white/10"></div>
      <div class="flex flex-col relative cursor-pointer hover:opacity-80 active:scale-95 transition-all" id="btn-rank-info">
        <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1">${t('lb_my_rank') || 'Sıralaman'} <span class="material-symbols-outlined text-[13px] text-cyan-500 animate-pulse">info</span></span>
        <span class="text-xl font-black ${myRank <= 50 ? 'text-yellow-500' : 'text-cyan-500'} mt-0.5">${myRank <= 50 ? '#' + myRank : percentileText}</span>
      </div>
    `;
    
    headerPanel.querySelector('#btn-rank-info').onclick = () => {
      const infoModal = createModal({
        title: t('lb_rank_info_title') || 'Sıralama ve Yüzdelikler',
        onClose: () => {},
        content: `
          <div class="flex flex-col gap-3 p-2">
            <p class="text-xs text-gray-400 text-center mb-2 leading-relaxed">${t('lb_rank_info_desc') || 'Senin puanınla diğer oyuncuların puanları karşılaştırılarak global sıralamadaki yerin belirlenir. Top 50\'de değilsen, kalan yüzdelik dilimlere girersin.'}</p>
            
            <div class="flex items-center gap-3 p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
              <span class="material-symbols-outlined text-yellow-500 text-3xl">workspace_premium</span>
              <div class="flex flex-col">
                <span class="text-sm font-black text-yellow-500 uppercase tracking-widest">${t('lb_tier_champions') || 'Şampiyonlar (Top 50)'}</span>
                <span class="text-[10px] text-gray-400">${t('lb_tier_champions_desc') || 'Dünya genelinde en iyi 50 oyuncu tam sırasını görür.'}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <span class="material-symbols-outlined text-purple-500 text-3xl">military_tech</span>
              <div class="flex flex-col">
                <span class="text-sm font-black text-purple-500 uppercase tracking-widest">${t('lb_tier_legendary') || 'Efsanevi (İlk %5)'}</span>
                <span class="text-[10px] text-gray-400">${t('lb_tier_legendary_desc') || 'Top 50\'nin hemen arkasından gelen elit oyuncular.'}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <span class="material-symbols-outlined text-red-500 text-3xl">local_fire_department</span>
              <div class="flex flex-col">
                <span class="text-sm font-black text-red-500 uppercase tracking-widest">${t('lb_tier_master') || 'Usta (İlk %15)'}</span>
                <span class="text-[10px] text-gray-400">${t('lb_tier_master_desc') || 'Oyunun en yetenekli ustaları arasına girdin.'}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/30">
              <span class="material-symbols-outlined text-blue-500 text-3xl">diamond</span>
              <div class="flex flex-col">
                <span class="text-sm font-black text-blue-500 uppercase tracking-widest">${t('lb_tier_elite') || 'Elit (İlk %30)'}</span>
                <span class="text-[10px] text-gray-400">${t('lb_tier_elite_desc') || 'Ortalamanın çok üzerinde, rekabetçi elit oyuncular.'}</span>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-xl bg-gray-500/10 border border-gray-500/30">
              <span class="material-symbols-outlined text-gray-400 text-3xl">group</span>
              <div class="flex flex-col">
                <span class="text-sm font-black text-gray-400 uppercase tracking-widest">${t('lb_tier_silver_bronze') || 'Gümüş / Bronz'}</span>
                <span class="text-[10px] text-gray-400">${t('lb_tier_silver_bronze_desc') || '%30\'luk dilimin dışındaki oyuncular yükselmeye çalışır.'}</span>
              </div>
            </div>
          </div>
        `,
        actions: []
      });
      document.body.appendChild(infoModal);
    };

    contentWrapper.appendChild(headerPanel);

    // Podium
    const podium = document.createElement('div');
    podium.className = 'flex items-end justify-center gap-2 mb-8 mt-4';
    
    const createPodiumSpot = (player, position) => {
      if (!player) return '';
      const isFirst = position === 1;
      const height = isFirst ? 'h-32' : position === 2 ? 'h-24' : 'h-20';
      const color = isFirst ? 'from-yellow-400 to-amber-600' : position === 2 ? 'from-gray-300 to-gray-500' : 'from-orange-400 to-orange-700';
      const crown = isFirst ? '<span class="material-symbols-outlined fill text-yellow-400 text-[1em] align-middle">workspace_premium</span>' : position === 2 ? '<span class="material-symbols-outlined fill text-gray-400 text-[1em] align-middle">military_tech</span>' : '<span class="material-symbols-outlined fill text-orange-600 text-[1em] align-middle">military_tech</span>';
      const rankInfo = PlayerState.getRankInfo ? PlayerState.getRankInfo(player.level) : { key: 'rank_novice', color: 'text-gray-400' };

      return `
        <div class="flex flex-col items-center animate-fade-in cursor-pointer hover:scale-105 transition-transform lb-player-card" data-uid="${player.uid}" style="animation-delay: ${position * 100}ms" >
          <span class="text-2xl mb-1">${crown}</span>
          <div class="relative mb-2">
            <img src="${player.avatar}" class="relative z-10 w-12 h-12 rounded-full border-2 border-white/20 bg-white/10" />
            <div class="absolute -bottom-1 -right-1 z-20 bg-black/80 dark:bg-white/10 backdrop-blur-sm px-1.5 rounded-full text-[9px] font-black text-white border border-white/20 shadow-md">
              ${player.level || 1}
            </div>
          </div>
          <span class="text-[10px] font-bold mb-0 w-16 text-center truncate ${player.isFriend || player.isMe ? 'text-secondary dark:text-accent-cyan' : ''}">${player.name}</span>
          <span class="text-[8px] font-black uppercase tracking-widest ${rankInfo.color} mb-1 opacity-80">${t(rankInfo.key) || 'Acemi'}</span>
          <div class="w-20 ${height} rounded-t-xl bg-gradient-to-t ${color} flex flex-col items-center justify-start pt-2 shadow-lg relative overflow-hidden">
            <span class="text-white font-black">${position}</span>
            <span class="text-white/80 text-[9px] font-bold mt-1">${player.globalTrophies.toLocaleString()}</span>
            <div class="absolute inset-0 bg-white/20 mix-blend-overlay"></div>
          </div>
        </div>
      `;
    };

    const lbShowPlayer = (uid) => {
      const p = mockData.find(x => x.uid === uid);
      if (p) showPlayerModal(p);
    };

    podium.innerHTML = `
      ${createPodiumSpot(displayData[1], 2)}
      ${createPodiumSpot(displayData[0], 1)}
      ${createPodiumSpot(displayData[2], 3)}
    `;
    contentWrapper.appendChild(podium);

    // List Container
    const listContainer = document.createElement('div');
    listContainer.className = 'flex flex-col gap-2 w-full pb-8';

    displayData.slice(3).forEach((p, i) => {
      const row = document.createElement('div');
      if (p.isSeparator) {
        row.className = 'flex items-center justify-center py-2';
        row.innerHTML = `<span class="material-symbols-outlined text-gray-400">more_vert</span>`;
      } else {
        let rowClass = 'glass-panel';
        if (p.isMe) rowClass = 'bg-secondary/20 border border-secondary/30 shadow-sm';
        else if (p.isFriend) rowClass = 'bg-secondary/10 border border-secondary/20';
        
        row.className = `flex items-center justify-between p-3 rounded-2xl animate-slide-up cursor-pointer active:scale-95 transition-transform ${rowClass}`;
        row.style.animationDelay = `${(i%10) * 50}ms`;
        
        row.onclick = () => showPlayerModal(p);
        
        const rankInfo = PlayerState.getRankInfo ? PlayerState.getRankInfo(p.level) : { key: 'rank_novice', color: 'text-gray-400' };
        
        // Use exact rank for top 50, otherwise percentile
        let rankLabel = p.rank.toLocaleString();
        if (p.rank > 50) {
            const perc = Math.max(1, Math.round((p.rank / TOTAL_PLAYERS) * 100));
            rankLabel = `%${perc}`;
        }

        row.innerHTML = `
          <div class="flex items-center gap-3">
            <span class="w-8 text-center text-[11px] font-bold ${p.isMe || p.isFriend ? 'text-secondary' : 'text-gray-500'}">${rankLabel}</span>
            <div class="relative">
              <img src="${p.avatar}" class="relative z-10 w-10 h-10 rounded-full border-2 border-white/10 bg-white/10" />
              <div class="absolute -bottom-1 -right-1 z-20 bg-black/80 dark:bg-white/10 backdrop-blur-sm px-1.5 rounded-full text-[8px] font-black text-white border border-white/20">
                ${p.level || 1}
              </div>
            </div>
            <div class="flex flex-col justify-center">
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-bold ${p.isMe || p.isFriend ? 'text-secondary dark:text-accent-cyan' : ''} leading-tight">${p.name}</span>
              </div>
              <div class="flex items-center gap-1 mt-0.5">
                ${p.isFriend ? '<span class="material-symbols-outlined text-[10px] text-secondary">group</span>' : ''}
                <span class="text-[9px] font-black uppercase tracking-widest ${rankInfo.color}">${t(rankInfo.key) || 'Acemi'}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-sm font-black text-primary dark:text-white">${p.globalTrophies.toLocaleString()}</span>
            <span class="text-yellow-500 text-xs">🏆</span>
          </div>
        `;
      }
      listContainer.appendChild(row);
    });

    contentWrapper.appendChild(listContainer);
  };

  const showPlayerModal = (player) => {
    if (!player) return;
    
    let actionHtml = '';
    if (player.isMe) {
      actionHtml = `<button class="w-full py-3.5 rounded-2xl bg-black/10 dark:bg-white/10 text-gray-500 font-bold opacity-50 cursor-not-allowed">${t('that_is_you') || 'Bu Sensin'}</button>`;
    } else if (player.isFriend) {
      actionHtml = `<button class="w-full py-3.5 rounded-2xl bg-black/10 dark:bg-white/10 text-gray-500 font-bold opacity-50 cursor-not-allowed">${t('already_friends') || 'Zaten Arkadaşsınız'}</button>`;
    } else {
      actionHtml = `<button id="btn-add-player" class="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-black shadow-md shadow-cyan-500/30 hover:scale-105 transition-all active:scale-95 flex items-center justify-center gap-2">
        <span class="material-symbols-outlined text-lg">person_add</span>
        ${t('add_as_friend') || 'Arkadaş Olarak Ekle'}
      </button>`;
    }

    const rankInfo = PlayerState.getRankInfo ? PlayerState.getRankInfo(player.level) : { key: 'rank_novice', color: 'text-gray-400' };

    const modal = createModal({
      title: t('player_profile') || 'Oyuncu Profili',
      onClose: () => {},
      content: `
        <div class="flex flex-col items-center p-4 gap-4 overflow-y-auto max-h-[60vh] no-scrollbar">
          <div class="relative mt-2">
            <img src="${player.avatar}" class="relative z-10 w-24 h-24 rounded-full border-4 shadow-xl bg-white/5" style="object-fit: cover;" />
            <div class="absolute -bottom-2 -right-2 z-20 bg-black/90 dark:bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black text-white border border-white/20 shadow-md">
              ${t('lb_level_abbr') || 'Sv.'} ${player.level || 1}
            </div>
          </div>
          
          <div class="flex flex-col items-center text-center mt-3">
            <h3 class="text-xl font-black ${player.isMe || player.isFriend ? 'text-secondary dark:text-accent-cyan' : 'text-primary dark:text-white'} leading-tight">${player.name}</h3>
            <span class="text-[10px] font-black uppercase tracking-widest ${rankInfo.color} mt-1">${t(rankInfo.key) || 'Acemi'}</span>
          </div>
          
          <div class="w-full flex flex-col gap-3 mt-4">
            <!-- Score -->
            <div class="glass-panel p-3 rounded-2xl flex flex-col items-center border border-yellow-500/30">
                <span class="text-[10px] font-bold text-gray-500 uppercase tracking-widest">${t('lb_global_trophies') || 'Global Kupalar'}</span>
                <div class="flex items-center gap-2 mt-1">
                   <span class="text-2xl font-black text-primary dark:text-white">${player.globalTrophies.toLocaleString()}</span>
                   <span class="text-yellow-500 text-xl">🏆</span>
                </div>
            </div>
          </div>
        </div>
      `,
      actions: []
    });

    const modalContent = modal.querySelector('.p-6');
    const actionContainer = document.createElement('div');
    actionContainer.className = 'mt-4 px-4 pb-4';
    actionContainer.innerHTML = actionHtml;
    modalContent.appendChild(actionContainer);

    const btnAdd = modal.querySelector('#btn-add-player');
    if (btnAdd) {
      btnAdd.onclick = () => {
        btnAdd.style.opacity = '0.5';
        btnAdd.style.pointerEvents = 'none';
        btnAdd.innerHTML = '<span class="material-symbols-outlined animate-spin text-white">autorenew</span>';
        
        setTimeout(() => {
          modal.close();
          import('../components/toast.js').then(({ Toast }) => {
            Toast.show(t('friend_request_sent') || 'Arkadaşlık isteği gönderildi!', 'success');
          });
        }, 800);
      };
    }

    document.body.appendChild(modal);
  };

  // Initial render
  renderContent();

  // Background decoration
  const bgDeco = document.createElement('div');
  bgDeco.className = 'fixed inset-0 pointer-events-none z-0 opacity-10';
  bgDeco.innerHTML = `<span class="material-symbols-outlined text-[30rem] absolute -top-16 -right-16 text-yellow-500/20 rotate-12">trophy</span>`;
  container.appendChild(bgDeco);

  container.appendChild(createBottomNav('leaderboard'));

  initSwipeNavigation(container, router, 'leaderboard');
  
    container.addEventListener('click', (e) => {
      const card = e.target.closest('.lb-player-card');
      if (card) {
        const uid = card.getAttribute('data-uid');
        if (uid) lbShowPlayer(uid);
      }
    });

  container.cleanup = () => {
    if (topBar.cleanup) topBar.cleanup();
  };

  return container;
}
