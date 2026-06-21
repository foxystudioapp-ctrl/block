import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { Toast } from '../components/toast.js';
import { t } from '../utils/i18n.js';

export function BuyDiamonds(router, onBack = null) {
  const container = document.createElement('div');
  container.className = 'w-full h-full flex flex-col bg-slate-50 dark:bg-slate-900 z-[10000]';

  const topBar = createTopBar(
    t('buy_diamonds_title') || 'Elmas Satın Al',
    true,
    () => {
      if (onBack) {
        onBack();
      } else {
        router.navigate('#/profile');
      }
    }
  );
  container.appendChild(topBar);

  const content = document.createElement('div');
  content.className = 'flex-1 overflow-y-auto pb-24 pt-6 px-4 flex flex-col items-center safe-area-pb';

  const titleHeader = document.createElement('div');
  titleHeader.className = 'text-center mb-8';
  titleHeader.innerHTML = `
    <div class="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-cyan-500/30 mb-4">
      <span class="material-symbols-outlined text-4xl text-white">diamond</span>
    </div>
    <h2 class="text-2xl font-black text-gray-800 dark:text-white">
      ${t('diamond_packages') || 'Elmas Paketleri'}
    </h2>
    <p class="text-sm font-medium text-gray-500 mt-2">
      ${t('diamond_store_desc') || 'Oyun içi öğeler ve ipuçları için elmas al.'}
    </p>
  `;
  content.appendChild(titleHeader);

  const packagesGrid = document.createElement('div');
  packagesGrid.className = 'w-full max-w-md flex flex-col gap-4';

  const packages = [
    { key: 'diamonds_500', fallback: '500', icon: '💎', color: 'from-blue-500 to-indigo-600', popular: false, value: 500 },
    { key: 'diamonds_1000', fallback: '1,000', icon: '💎💎', color: 'from-indigo-500 to-violet-600', popular: true, value: 1000 },
    { key: 'diamonds_2000', fallback: '2,000', icon: '💰', color: 'from-violet-500 to-purple-600', popular: false, value: 2000 },
    { key: 'diamonds_5000', fallback: '5,000', icon: '🏆', color: 'from-purple-500 to-fuchsia-600', popular: true, value: 5000 },
    { key: 'diamonds_10000', fallback: '10,000', icon: '👑', color: 'from-fuchsia-500 to-pink-600', popular: false, value: 10000, isLast: true }
  ];

  packages.forEach(item => {
    const pkg = document.createElement('div');
    pkg.className = `p-4 rounded-3xl bg-white dark:bg-slate-800 shadow-md border ${item.popular ? 'border-purple-500/50 relative mt-3' : 'border-gray-200 dark:border-white/5'} flex justify-between items-center transition-all active:scale-[0.98] cursor-pointer group`;
    
    let popularBadge = '';
    if (item.popular) {
      popularBadge = `<div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-widest py-1 px-3 rounded-full shadow-md">${t('popular') || 'En Popüler'}</div>`;
    }

    pkg.innerHTML = `
      ${popularBadge}
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
          ${item.icon}
        </div>
        <div class="flex flex-col">
          <span class="font-black text-xl text-gray-800 dark:text-white drop-shadow-sm leading-none flex items-center gap-1">
            ${item.fallback} 
            <span class="text-xs text-gray-400 font-bold">${t('diamonds_currency') || 'Elmas'}</span>
          </span>
        </div>
      </div>
      <button class="bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-800 dark:text-white font-black py-2.5 px-6 rounded-xl transition-colors">
        ${t('btn_buy') || 'Satın Al'}
      </button>
    `;

    pkg.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      PlayerState.addDiamonds(item.value);
      Toast.show(`+${item.fallback} Elmas başarıyla eklendi!`, 'success');
    });

    packagesGrid.appendChild(pkg);
  });

  content.appendChild(packagesGrid);
  container.appendChild(content);

  return container;
}
