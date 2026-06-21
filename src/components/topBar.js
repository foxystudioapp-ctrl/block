import { PlayerState } from '../state/playerState.js';
import { Router } from '../router.js';

export function createTopBar(titleText, showBackButton = true, onBackClick = null, showSettingsButton = true) {
  const header = document.createElement('header');
  header.className = 'w-full sticky top-0 z-40 bg-[#f5f5f7]/85 dark:bg-[#010102]/85 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-[#010102]/5 dark:border-white/5 transition-all duration-300';

  header.innerHTML = `
    <!-- Left: Navigation (Back or Menu) -->
    <div class="flex items-center space-x-2">
      ${showBackButton ? `
        <button id="topbar-back" class="w-9 h-9 rounded-full bg-white dark:bg-primary-container flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm active:scale-90 transition-transform">
          <span class="material-symbols-outlined text-xl text-primary dark:text-white">arrow_back</span>
        </button>
      ` : `
        <button id="topbar-menu" class="w-9 h-9 rounded-full bg-white dark:bg-primary-container flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm active:scale-90 transition-transform">
          <span class="material-symbols-outlined text-xl text-primary dark:text-white">menu</span>
        </button>
      `}
      <span class="text-sm font-extrabold tracking-tight text-primary dark:text-white">${titleText}</span>
    </div>

    <!-- Right: Stats (Diamonds) -->
    <div class="flex items-center space-x-2">
      <!-- Diamond Pill -->
      <div id="diamond-pill" class="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-primary-container border border-black/5 dark:border-white/5 shadow-sm transition-transform duration-200">
        <span class="text-sm"><span class="material-symbols-outlined fill text-cyan-400 text-[1em] align-middle">diamond</span></span>
        <span id="topbar-diamonds" class="text-xs font-bold text-primary dark:text-white">${PlayerState.state.diamonds}</span>
      </div>

      ${showSettingsButton ? `
      <!-- Settings Icon -->
      <button id="topbar-settings" class="w-9 h-9 rounded-full bg-white dark:bg-primary-container flex items-center justify-center border border-black/5 dark:border-white/5 shadow-sm active:scale-90 transition-transform">
        <span class="material-symbols-outlined text-xl text-primary dark:text-white">settings</span>
      </button>
      ` : ''}
    </div>
  `;

  // Hook event listeners
  const backBtn = header.querySelector('#topbar-back');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      if (onBackClick) onBackClick();
      else Router.navigate('#/menu');
    });
  }

  const menuBtn = header.querySelector('#topbar-menu');
  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      if (onBackClick) onBackClick();
      else Router.navigate('#/menu');
    });
  }

  if (showSettingsButton) {
    const settingsBtn = header.querySelector('#topbar-settings');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        import('../screens/settings.js').then(({ showSettingsModal }) => {
          showSettingsModal();
        });
      });
    }
  }

  // Subscribe to changes to update dynamically
  let lastDiamonds = PlayerState.state.diamonds;

  const unsubscribe = PlayerState.subscribe((state) => {
    const diamondEl = header.querySelector('#topbar-diamonds');
    const diamondPill = header.querySelector('#diamond-pill');

    if (diamondEl && state.diamonds !== lastDiamonds) {
      diamondEl.textContent = state.diamonds;
      // Bounce animation
      if (diamondPill) {
        diamondPill.classList.add('scale-110');
        setTimeout(() => diamondPill.classList.remove('scale-110'), 200);
      }
      lastDiamonds = state.diamonds;
    }
  });

  // Store unsubscribe on element so parent screen can clean it up
  header.cleanup = unsubscribe;

  return header;
}
