import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { Toast } from '../components/toast.js';
import { t } from '../utils/i18n.js';
import { IAP } from '../services/iapService.js';

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
    { key: 'com.foxystudio.block.elmas.500', fallback: '500', icon: '💎', color: 'from-blue-500 to-indigo-600', popular: false, value: 500 },
    { key: 'com.foxystudio.block.elmas.1000', fallback: '1,000', icon: '💎💎', color: 'from-indigo-500 to-violet-600', popular: true, value: 1000 },
    { key: 'com.foxystudio.block.elmas.2000', fallback: '2,000', icon: '💰', color: 'from-violet-500 to-purple-600', popular: false, value: 2000 },
    { key: 'com.foxystudio.block.elmas.5000', fallback: '5,000', icon: '🏆', color: 'from-purple-500 to-fuchsia-600', popular: true, value: 5000 },
    { key: 'com.foxystudio.block.elmas.10000', fallback: '10,000', icon: '👑', color: 'from-fuchsia-500 to-pink-600', popular: false, value: 10000, isLast: true }
  ];

  const renderPackages = async () => {
    packagesGrid.innerHTML = '';
    
    // Yükleniyor durumu eklenebilir veya IAP.packages zaten yüklüyse anında gösterilir
    if (IAP.isInitialized && IAP.packages.length === 0) {
      await IAP.fetchOfferings();
    }

    // Render VIP Card
    const vipPackage = IAP.packages.find(p => p.product.identifier.includes('vip'));
    const isVipActive = PlayerState.state.isVip;
    
    const vipCard = document.createElement('div');
    vipCard.className = `p-5 rounded-3xl shadow-xl border-2 flex flex-col justify-between items-center transition-all cursor-pointer relative overflow-hidden mb-4 ${isVipActive ? 'bg-gradient-to-br from-green-500 to-emerald-700 border-green-400' : 'bg-gradient-to-br from-amber-400 to-orange-600 border-amber-300 active:scale-[0.98]'}`;
    
    // Sparkle effect background
    vipCard.innerHTML = `
      <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPgo8cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMSIvPgo8L3N2Zz4=')] opacity-20 pointer-events-none"></div>
      
      <div class="flex items-center gap-3 w-full mb-3 z-10">
        <div class="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-2xl shadow-inner backdrop-blur-sm">
          👑
        </div>
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
    `;

    if (!isVipActive) {
      vipCard.addEventListener('click', async () => {
        Sounds.playSfx('button-tap');
        if (vipPackage && IAP.isInitialized) {
          Toast.show('Mağaza ile bağlantı kuruluyor...', 'info');
          await IAP.purchasePackage(vipPackage);
          // Re-render to update UI if successful
          if (PlayerState.state.isVip) renderPackages();
        } else {
          // Web Modu Test
          PlayerState.state.isVip = true;
          PlayerState.addDiamonds(5000);
          PlayerState.state.lastVipRewardTime = Date.now();
          PlayerState.save();
          Toast.show('👑 VIP Aktifleşti! (TEST) +5000 Elmas', 'success');
          renderPackages();
        }
      });
    }

    packagesGrid.appendChild(vipCard);

    packages.forEach(item => {
      const rcPackage = IAP.packages.find(p => p.product.identifier === item.key);
      const displayPrice = rcPackage ? rcPackage.product.priceString : (t('btn_buy') || 'Satın Al');

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
          ${displayPrice}
        </button>
      `;

      pkg.addEventListener('click', async () => {
        Sounds.playSfx('button-tap');
        if (rcPackage && IAP.isInitialized) {
          // Satın almayı başlat
          Toast.show('Mağaza ile bağlantı kuruluyor...', 'info');
          const success = await IAP.purchasePackage(rcPackage);
          // success ise iapService içinden elmas eklendi ve toast gösterildi zaten
        } else {
          // Web/Test modu
          PlayerState.addDiamonds(item.value);
          Toast.show(`+${item.fallback} Elmas başarıyla eklendi! (TEST)`, 'success');
        }
      });

      packagesGrid.appendChild(pkg);
    });
  };

  renderPackages();

  content.appendChild(packagesGrid);
  container.appendChild(content);

  return container;
}
