import { t } from '../utils/i18n.js';
import { PlayerState } from '../state/playerState.js';
import { Storage } from '../utils/storage.js';
import { Sounds } from '../utils/sounds.js';

export function showShopModal() {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in opacity-0 transition-opacity duration-200';
  
  // Need to force reflow for opacity transition
  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0');
  });

  const modal = document.createElement('div');
  modal.className = 'bg-[#f5f5f7] dark:bg-[#010102] w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative transform scale-95 transition-transform duration-200 border border-black/5 dark:border-white/5';
  
  requestAnimationFrame(() => {
    modal.classList.remove('scale-95');
    modal.classList.add('scale-100');
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'absolute top-3 right-3 w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-primary dark:text-white z-20 active:scale-95 transition-transform';
  closeBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">close</span>';
  closeBtn.onclick = () => {
    Sounds.playSfx('button-tap');
    overlay.classList.add('opacity-0');
    modal.classList.add('scale-95');
    setTimeout(() => overlay.remove(), 200);
  };

  // Header
  const header = document.createElement('div');
  header.className = 'px-6 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between';
  header.innerHTML = `
    <h3 class="text-sm font-black uppercase tracking-widest text-gray-500">${t('buy_diamonds_title') || 'ELMAS SATIN AL'}</h3>
    <div class="flex items-center gap-1 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
      <span class="material-symbols-outlined text-sm text-cyan-500">diamond</span>
      <span class="font-black text-cyan-500" id="shop-modal-diamonds">${PlayerState.state.diamonds}</span>
    </div>
  `;

  const content = document.createElement('div');
  content.className = 'p-6 flex-1 overflow-y-auto no-scrollbar flex flex-col gap-4';

  const todayDate = new Date().toDateString();
  if (Storage.get('ad_diamonds_date') !== todayDate) {
    Storage.set('ad_diamonds_date', todayDate);
    Storage.set('ad_diamonds_count', 0);
  }
  let adCount = Storage.get('ad_diamonds_count', 0);
  const maxAds = 2;
  const isAdAvailable = adCount < maxAds;

  const buyDiamondsSection = document.createElement('div');
  buyDiamondsSection.className = 'w-full flex flex-col gap-3';
  
  buyDiamondsSection.innerHTML = `
    <!-- Watch Ad Button -->
    <button id="btn-watch-ad" class="w-full glass-panel p-3 rounded-2xl flex items-center justify-between active:scale-95 transition-transform shadow-md ${isAdAvailable ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-cyan-500/30' : 'opacity-50 grayscale border border-white/5'}">
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
    
    <div id="diamond-store-container" class="flex flex-col gap-3 mt-2">
      <h4 class="text-xs font-black uppercase tracking-widest text-gray-400 text-center mb-1">${t('diamond_packages') || 'Elmas Paketleri'}</h4>
      <div class="grid grid-cols-2 gap-3">
        ${[
          { key: 'diamonds_500', fallback: '500', icon: '💎', color: 'from-blue-500 to-indigo-600', popular: false, price: '₺19.99' },
          { key: 'diamonds_1000', fallback: '1,000', icon: '💎💎', color: 'from-indigo-500 to-violet-600', popular: true, price: '₺39.99' },
          { key: 'diamonds_2000', fallback: '2,000', icon: '💰', color: 'from-violet-500 to-purple-600', popular: false, price: '₺69.99' },
          { key: 'diamonds_5000', fallback: '5,000', icon: '🏆', color: 'from-purple-500 to-fuchsia-600', popular: true, price: '₺149.99' },
          { key: 'diamonds_10000', fallback: '10,000', icon: '👑', color: 'from-fuchsia-500 to-pink-600', popular: false, price: '₺249.99', isLast: true }
        ].map(item => `
          <button class="relative glass-panel rounded-2xl flex flex-col items-center justify-center gap-2 p-3 active:scale-95 transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.3)] border border-white/10 group overflow-hidden ${item.isLast ? 'col-span-2' : ''}">
            <div class="absolute inset-0 bg-gradient-to-br ${item.color} opacity-20 group-hover:opacity-40 transition-opacity"></div>
            ${item.popular ? `<div class="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-amber-500 text-[8px] font-black uppercase px-2 py-0.5 rounded-bl-xl shadow-lg text-white">${t('popular_badge') || 'Popüler'}</div>` : ''}
            
            <div class="text-3xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10 scale-100 group-hover:scale-110 transition-transform">${item.icon}</div>
            
            <div class="flex flex-col items-center z-10 w-full mt-1">
              <span class="font-black text-lg text-white drop-shadow-sm leading-none flex items-center gap-1">${item.fallback} <span class="text-[10px] text-gray-300">${t('diamonds_currency') || 'Elmas'}</span></span>
              <div class="w-full h-px bg-white/10 my-2"></div>
              <div class="w-full flex justify-between items-center bg-black/30 rounded-xl px-3 py-1.5 border border-white/5 group-hover:border-purple-500/30 transition-colors">
                <span class="text-[10px] font-bold text-gray-400">${t('btn_buy') || 'Satın Al'}</span>
                <span class="font-black text-sm text-green-400">${item.price}</span>
              </div>
            </div>
          </button>
        `).join('')}
      </div>
    </div>
  `;

  content.appendChild(buyDiamondsSection);
  modal.appendChild(closeBtn);
  modal.appendChild(header);
  modal.appendChild(content);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  setTimeout(() => {
    const btnWatchAd = overlay.querySelector('#btn-watch-ad');
    if (btnWatchAd && isAdAvailable) {
      btnWatchAd.addEventListener('click', async () => {
        Sounds.playSfx('button-tap');
        const m = await import('../services/adService.js');
        const success = await m.AdService.showInterstitial();
        if (success) {
          PlayerState.addDiamonds(200);
          Storage.set('ad_diamonds_count', adCount + 1);
          Sounds.playSfx('success');
          
          const diamondSpan = overlay.querySelector('#shop-modal-diamonds');
          if (diamondSpan) diamondSpan.textContent = PlayerState.state.diamonds.toLocaleString('tr-TR');
          
          const newCount = adCount + 1;
          const isNowAvailable = newCount < maxAds;
          btnWatchAd.className = `w-full glass-panel p-3 rounded-2xl flex items-center justify-between active:scale-95 transition-transform shadow-md \${isNowAvailable ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-cyan-500/30' : 'opacity-50 grayscale border border-white/5'}`;
          btnWatchAd.querySelector('.text-sm').className = `font-black text-sm \${isNowAvailable ? 'text-cyan-400' : 'text-gray-400'}`;
          btnWatchAd.querySelector('.text-\\[10px\\]').textContent = isNowAvailable ? `\${newCount}/\${maxAds}` : (t('ad_limit_reached') || 'Günlük Sınır Doldu');
          
          const iconContainer = btnWatchAd.querySelector('.rounded-full.flex');
          iconContainer.className = `w-10 h-10 rounded-full \${isNowAvailable ? 'bg-cyan-500' : 'bg-gray-500'} flex items-center justify-center shadow-inner`;
          
          if (!isNowAvailable) {
            btnWatchAd.replaceWith(btnWatchAd.cloneNode(true)); // remove listeners
          }
          adCount = newCount;
        }
      });
    }
  }, 100);

  // Close on outside click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeBtn.click();
    }
  });

  // Track diamonds to update header if they change
  const unsubscribe = PlayerState.subscribe((state) => {
    const dSpan = overlay.querySelector('#shop-modal-diamonds');
    if (dSpan) dSpan.textContent = state.diamonds.toLocaleString('tr-TR');
  });

  // Cleanup on close
  const originalClose = closeBtn.onclick;
  closeBtn.onclick = () => {
    unsubscribe();
    originalClose();
  };
}
