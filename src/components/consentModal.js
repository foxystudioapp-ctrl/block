import { Storage } from '../utils/storage.js';
import { Sounds } from '../utils/sounds.js';
import { t } from '../utils/i18n.js';

export function showConsentModal(onAccept) {
  if (Storage.get('legal_accepted')) {
    if (onAccept) onAccept();
    return;
  }

  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-6 opacity-0 transition-opacity duration-200';
  
  const modal = document.createElement('div');
  modal.className = 'bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center transform scale-90 transition-transform duration-300 relative overflow-hidden';
  
  // Icon
  const iconBg = document.createElement('div');
  iconBg.className = 'w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4';
  iconBg.innerHTML = '<span class="material-symbols-outlined text-blue-500 text-3xl">verified_user</span>';
  modal.appendChild(iconBg);

  // Title
  const title = document.createElement('h2');
  title.className = 'text-xl font-black text-gray-800 dark:text-white mb-2';
  title.textContent = t('consent_welcome_title');
  modal.appendChild(title);

  // Description
  const desc = document.createElement('p');
  desc.className = 'text-sm text-gray-600 dark:text-gray-300 mb-6';
  const termsLink = `<a href="https://bloxyapp.blogspot.com/2026/07/terms-of-use-eula.html" target="_blank" rel="noopener noreferrer" class="text-blue-500 font-bold underline">${t('terms_of_use')}</a>`;
  const privacyLink = `<a href="https://bloxyapp.blogspot.com/2026/06/privacy-policy.html" target="_blank" rel="noopener noreferrer" class="text-orange-500 font-bold underline">${t('privacy_policy')}</a>`;
  desc.innerHTML = t('consent_welcome_desc', { terms: termsLink, privacy: privacyLink });
  modal.appendChild(desc);

  // Button
  const btn = document.createElement('button');
  btn.className = 'w-full bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-bold py-3 px-6 rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2';
  btn.innerHTML = `
    <span class="material-symbols-outlined text-lg">check_circle</span>
    ${t('consent_accept_play')}
  `;
  
  // Kullanıcı modal açıkken gezinirse (hashchange) overlay body'de orphan kalmasın.
  const onHashChange = () => { overlay.remove(); window.removeEventListener('hashchange', onHashChange); };
  window.addEventListener('hashchange', onHashChange);

  btn.addEventListener('click', () => {
    Sounds.playSfx('button-tap');
    Storage.set('legal_accepted', true);
    window.removeEventListener('hashchange', onHashChange);
    // Inline opacity ile kapat: animate-in inline opacity:1 verdiğinden 'animate-fade-out'
    // class'ı kazanamıyordu; transition (duration-200) inline değeri animasyonlar.
    overlay.style.opacity = '0';
    modal.classList.add('scale-95', 'opacity-0');
    setTimeout(() => {
      overlay.remove();
      if (onAccept) onAccept();
    }, 300);
  });
  modal.appendChild(btn);

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    modal.style.transform = 'scale(1)';
  });
}
