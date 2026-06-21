import { createModal } from '../components/modal.js';
import { t } from './i18n.js';
import { Sounds } from './sounds.js';

export function showQuitConfirmation(router, customBackPath = '#/menu', extraAction = null, customDesc = null) {
  Sounds.playSfx('button-tap');

  const content = document.createElement('div');
  content.className = 'flex flex-col items-center p-2 text-center';
  const descText = customDesc !== null ? customDesc : (t('quit_game_desc') || 'Eğer oyundan çıkarsanız kazanılan puanlar kaydedilmeyecek ve mevcut oyun silinecektir.');
  content.innerHTML = `
    <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 border border-red-500/20">
      <span class="material-symbols-outlined text-red-500 text-4xl">warning</span>
    </div>
    ${descText ? `<p class="text-sm font-bold text-gray-500 dark:text-gray-400 mb-2 leading-relaxed">${descText}</p>` : ''}
  `;

  const actions = [
    {
      text: t('quit_game_cancel') || 'HAYIR, DEVAM ET',
      primary: true,
      onClick: (closeFn) => {
        closeFn();
      }
    },
    {
      text: t('quit_game_confirm') || 'EVET, ÇIK',
      primary: false,
      onClick: (closeFn) => {
        closeFn();
        router.navigate(customBackPath);
      }
    }
  ];

  if (extraAction) {
    actions.push(extraAction);
  }

  const modal = createModal({
    title: t('quit_game_title') || 'Çıkmak İstiyor Musunuz?',
    content: content,
    actions: actions,
    onClose: () => {
      // additional logic if needed when closed by tapping background/X
    }
  });
}
