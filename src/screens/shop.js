import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { Toast } from '../components/toast.js';
import { createModal } from '../components/modal.js';
import { t } from '../utils/i18n.js';
import { createBottomNav } from '../components/bottomNav.js';

const THEMES = [
  {
    id: 'default',
    get name() { return t('shop_default'); },
    price: 0,
    colors: { secondary: '#0058bc', accent: '#00e5ff' },
    icon: 'water_drop'
  },
  {
    id: 'forest',
    get name() { return t('shop_forest'); },
    price: 500,
    colors: { secondary: '#15803d', accent: '#4ade80' },
    icon: 'eco'
  },
  {
    id: 'sunset',
    get name() { return t('shop_sunset'); },
    price: 1000,
    colors: { secondary: '#c2410c', accent: '#fb923c' },
    icon: 'wb_twilight'
  },
  {
    id: 'neon',
    get name() { return t('shop_neon'); },
    price: 2500,
    colors: { secondary: '#be185d', accent: '#f472b6' },
    icon: 'bolt'
  },
  {
    id: 'royal',
    get name() { return t('shop_royal'); },
    price: 5000,
    colors: { secondary: '#7e22ce', accent: '#c084fc' },
    icon: 'diamond'
  }
];

export function applyTheme(themeId) {
  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];
  document.documentElement.style.setProperty('--color-secondary', theme.colors.secondary);
  document.documentElement.style.setProperty('--color-accent-cyan', theme.colors.accent);
  
  // also set secondary-container slightly lighter
  // For simplicity, we just reuse accent or secondary
  document.documentElement.style.setProperty('--color-secondary-container', theme.colors.accent);
}

export function Shop(router) {
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto min-h-screen flex flex-col justify-between bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-pop-up relative';

  const topBar = createTopBar(t('shop_title'), false);
  container.appendChild(topBar);

  const content = document.createElement('main');
  content.className = 'flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar relative z-10';

  // 1. Diamonds balance card
  const balanceCard = document.createElement('div');
  balanceCard.className = 'glass-card p-4 rounded-3xl flex items-center justify-between shadow-sm border border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-transparent';
  
  const updateBalance = () => {
    balanceCard.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-inner">
          <span class="text-xl"><span class="material-symbols-outlined fill text-white text-[1em] align-middle">diamond</span></span>
        </div>
        <div class="flex flex-col">
          <span class="text-[10px] font-extrabold text-gray-500 tracking-wider">${t('shop_balance')}</span>
          <span class="text-xl font-black text-cyan-600 dark:text-cyan-400">${PlayerState.state.diamonds.toLocaleString()}</span>
        </div>
      </div>
      <button class="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
        <span class="material-symbols-outlined text-sm">add</span>
      </button>
    `;
  };
  updateBalance();
  content.appendChild(balanceCard);

  // 2. Themes Grid
  const themesGrid = document.createElement('div');
  themesGrid.className = 'grid grid-cols-1 gap-3 w-full';

  const renderThemes = () => {
    themesGrid.innerHTML = '';
    
    THEMES.forEach(theme => {
      const isUnlocked = PlayerState.state.unlockedThemes.includes(theme.id);
      const isSelected = PlayerState.state.theme === theme.id;
      
      const card = document.createElement('div');
      card.className = `glass-panel p-4 rounded-3xl flex items-center justify-between transition-all duration-300 ${isSelected ? 'ring-2 ring-secondary dark:ring-accent-cyan shadow-lg shadow-secondary/20' : 'opacity-90'}`;
      
      const leftCol = document.createElement('div');
      leftCol.className = 'flex items-center gap-4';
      leftCol.innerHTML = `
        <div class="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner relative overflow-hidden" style="background: linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.secondary})">
          <span class="material-symbols-outlined text-white text-2xl drop-shadow-md">${theme.icon}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-black">${theme.name}</span>
          ${isUnlocked 
            ? `<span class="text-[10px] font-bold text-green-500 uppercase tracking-wider">${t('shop_unlocked')}</span>`
            : `<span class="text-[10px] font-bold text-orange-500 uppercase tracking-wider">${theme.price.toLocaleString()} <span class="material-symbols-outlined fill text-cyan-400 text-[1em] align-middle">diamond</span></span>`
          }
        </div>
      `;

      const rightCol = document.createElement('div');
      
      if (isSelected) {
        rightCol.innerHTML = `
          <div class="px-3 py-1.5 rounded-full bg-secondary/10 dark:bg-accent-cyan/10 text-secondary dark:text-accent-cyan flex items-center gap-1">
            <span class="material-symbols-outlined text-[14px]">check_circle</span>
            <span class="text-xs font-bold">${t('shop_selected')}</span>
          </div>
        `;
      } else if (isUnlocked) {
        const selectBtn = document.createElement('button');
        selectBtn.className = 'px-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 text-primary dark:text-white text-xs font-bold active:scale-95 transition-transform hover:bg-black/10 dark:hover:bg-white/10';
        selectBtn.textContent = t('shop_use');
        selectBtn.onclick = () => {
          Sounds.playSfx('button-tap');
          PlayerState.setTheme(theme.id);
          applyTheme(theme.id);
          renderThemes();
        };
        rightCol.appendChild(selectBtn);
      } else {
        const buyBtn = document.createElement('button');
        buyBtn.className = 'px-4 py-2 rounded-xl bg-gradient-to-r from-orange-400 to-amber-500 text-white text-xs font-bold shadow-md active:scale-95 transition-transform flex items-center gap-1';
        buyBtn.innerHTML = `<span class="material-symbols-outlined text-[14px]">shopping_cart</span> ${t('shop_buy')}`;
        buyBtn.onclick = () => {
          if (PlayerState.state.diamonds >= theme.price) {
            createModal({
              title: t('shop_buy_title'),
              content: `<p class="text-sm text-gray-500">${t('shop_buy_desc', {name: theme.name, price: theme.price})} <span class="material-symbols-outlined fill text-cyan-400 text-[1em] align-middle">diamond</span></p>`,
              actions: [
                { text: t('cancel'), onClick: (close) => close() },
                { 
                  text: t('shop_buy'), 
                  primary: true, 
                  onClick: (close) => {
                    close();
                    if (PlayerState.unlockTheme(theme.id, theme.price, 'diamonds')) {
                      Sounds.playSfx('level-up');
                      PlayerState.setTheme(theme.id);
                      applyTheme(theme.id);
                      updateBalance();
                      renderThemes();
                      Toast.show(t('shop_bought_toast'), 'success');
                    }
                  }
                }
              ]
            });
          } else {
            card.classList.add('animate-shake');
            setTimeout(() => card.classList.remove('animate-shake'), 300);
            Sounds.playSfx('invalid');
            Toast.show(t('insufficient_funds'), 'warning');
          }
        };
        rightCol.appendChild(buyBtn);
      }

      card.appendChild(leftCol);
      card.appendChild(rightCol);
      themesGrid.appendChild(card);
    });
  };

  renderThemes();
  content.appendChild(themesGrid);
  container.appendChild(content);

  // Background decoration
  const bgDeco = document.createElement('div');
  bgDeco.className = 'fixed inset-0 pointer-events-none z-[-1] opacity-5';
  bgDeco.innerHTML = `<span class="material-symbols-outlined text-[40rem] absolute -bottom-32 -left-32 text-secondary rotate-12">storefront</span>`;
  container.appendChild(bgDeco);

  // Bottom Nav
  container.appendChild(createBottomNav('shop'));
  
  container.cleanup = () => {
    if (topBar.cleanup) topBar.cleanup();
  };

  return container;
}
