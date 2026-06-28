import { createModal } from './modal.js';
import { t } from '../utils/i18n.js';
import { Sounds } from '../utils/sounds.js';
import { AdService } from '../services/adService.js';
import { PlayerState } from '../state/playerState.js';

export function showAdModal(cost, retryCallback, type = 'undo') {
  const modal = createModal({
    title: t('not_enough_diamonds') || 'Yetersiz Elmas',
    content: `
      <div class="flex flex-col items-center p-4">
        <span class="text-5xl mb-3 drop-shadow-md">💎</span>
        <p class="text-sm font-bold text-gray-400 mb-6 text-center">${t('need_diamonds_' + type) ? t('need_diamonds_' + type).replace('{cost}', cost) : `Bu işlem için ${cost} elmasa ihtiyacınız var!`}</p>
        
        <div class="w-full flex flex-col gap-3">
          <button id="modal-watch-ad" class="w-full py-4 px-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all relative flex items-center justify-center">
            <span class="material-symbols-outlined absolute left-5 text-2xl">play_circle</span>
            <span class="text-center leading-tight px-8">${t('watch_ad_use_' + type) || 'Reklam İzle'}</span>
          </button>
          <button id="modal-buy-diamonds" class="w-full py-4 px-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary dark:text-white rounded-2xl font-bold active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 relative flex items-center justify-center">
            <span class="material-symbols-outlined absolute left-5 text-2xl">shopping_cart</span>
            <span class="text-center leading-tight px-8">${t('buy_diamonds_title') || 'Elmas Satın Al'}</span>
          </button>
        </div>
      </div>
    `,
    actions: []
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-black/5 dark:bg-white/5 rounded-full text-gray-500 hover:text-primary dark:hover:text-white transition-colors';
  closeBtn.innerHTML = '<span class="material-symbols-outlined text-lg">close</span>';
  closeBtn.onclick = () => modal.close();
  modal.querySelector('.glass-card').appendChild(closeBtn);

  // createModal zaten body'ye ekliyor; ikinci appendChild gereksizdi.

  modal.querySelector('#modal-watch-ad').addEventListener('click', async () => {
    Sounds.playSfx('button-tap');
    const success = await AdService.showInterstitial();
    if (success) {
      modal.close();
      PlayerState.addDiamonds(cost);
      retryCallback();
    }
  });

  modal.querySelector('#modal-buy-diamonds').addEventListener('click', async () => {
    Sounds.playSfx('button-tap');
    modal.close();
    
    const m = await import('../screens/buyDiamonds.js');
    const BuyDiamonds = m.BuyDiamonds;
    
    let overlayContainer = null;
    const closeOverlay = () => {
      if (overlayContainer && overlayContainer.parentNode) {
        overlayContainer.parentNode.removeChild(overlayContainer);
      }
    };
    
    // We pass null for router, because the onBack callback handles closure
    overlayContainer = BuyDiamonds(null, closeOverlay);
    overlayContainer.style.position = 'fixed';
    overlayContainer.style.top = '0';
    overlayContainer.style.left = '0';
    overlayContainer.style.width = '100vw';
    overlayContainer.style.height = '100vh';
    overlayContainer.style.zIndex = '10000';
    
    document.body.appendChild(overlayContainer);
  });
}

// Keep backward compatibility
export function showUndoAdModal(cost, retryCallback) {
  return showAdModal(cost, retryCallback, 'undo');
}
