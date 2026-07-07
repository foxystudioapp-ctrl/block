window.__activeModals = window.__activeModals || [];
window.closeAllModals = () => {
  window.__activeModals.forEach(m => m && m.close && m.close());
  window.__activeModals = [];
};
import { Sounds } from '../utils/sounds.js';

export function createModal({ title, content, actions = [], onClose = null }) {
  const modalContainer = document.createElement('div');
  modalContainer.className = 'fixed inset-0 z-[100000] flex items-center justify-center p-6 bg-black/40 dark:bg-black/60 backdrop-blur-md opacity-0 transition-opacity duration-300 pointer-events-auto';

  const modalBody = document.createElement('div');
  // max-h + overflow-y-auto: küçük ekran (iPhone SE) + büyük yazı tipi + uzun dilde uzun
  // içerikte alttaki aksiyon butonları ekran dışına taşıp erişilemez olmasın.
  modalBody.className = 'w-full max-w-sm max-h-[90dvh] overflow-y-auto p-6 rounded-3xl glass-card text-center flex flex-col items-center transform scale-90 transition-transform duration-300 shadow-2xl';

  const closeButtonHtml = onClose ? `
    <button id="modal-close" class="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-gray-500 hover:text-primary dark:hover:text-white transition-colors">
      <span class="material-symbols-outlined text-lg">close</span>
    </button>
  ` : '';

  modalBody.innerHTML = `
    ${closeButtonHtml}
    ${title ? `<h2 class="text-xl font-extrabold mb-4 text-primary dark:text-white tracking-tight">${title}</h2>` : ''}
    <div id="modal-content" class="w-full mb-6"></div>
    <div id="modal-actions" class="w-full flex flex-col space-y-2.5"></div>
  `;

  // Insert content
  const contentContainer = modalBody.querySelector('#modal-content');
  if (typeof content === 'string') {
    contentContainer.innerHTML = content;
  } else if (content instanceof HTMLElement) {
    contentContainer.appendChild(content);
  }

  // Insert actions
  const actionsContainer = modalBody.querySelector('#modal-actions');
  actions.forEach(action => {
    const btn = document.createElement('button');
    if (action.id) btn.id = action.id;
    btn.className = `w-full py-3.5 rounded-2xl font-bold text-sm tracking-tight active:scale-95 transition-all shadow-sm ${
      action.danger
        ? 'bg-red-600 text-white hover:bg-red-700'
        : action.primary
        ? 'bg-secondary dark:bg-[#0070eb] text-white hover:bg-secondary-container'
        : 'bg-black/5 dark:bg-white/5 text-primary dark:text-white border border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10'
    }`;
    btn.textContent = action.text;
    btn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      action.onClick(modalContainer.close, btn);
    });
    actionsContainer.appendChild(btn);
  });

  modalContainer.appendChild(modalBody);

  // Close helper — idempotent: çift kapatmada onClose iki kez ateşlenmesin ve
  // __activeModals'ta stale referans kalmasın (closeAllModals navigasyonda yeniden çağırabilir).
  modalContainer.close = () => {
    if (modalContainer._closed) return;
    modalContainer._closed = true;
    const idx = window.__activeModals.indexOf(modalContainer);
    if (idx !== -1) window.__activeModals.splice(idx, 1);

    modalContainer.classList.remove('opacity-100');
    modalBody.classList.remove('scale-100');
    modalBody.classList.add('scale-90');

    setTimeout(() => {
      modalContainer.remove();
      if (onClose) onClose();
    }, 300);
  };

  const closeBtn = modalBody.querySelector('#modal-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      Sounds.playSfx('button-tap');
      modalContainer.close();
    });
  }

  modalContainer.addEventListener('mousedown', (e) => {
    if (e.target === modalContainer) {
      modalContainer.close();
    }
  });

  // Append to body
  document.body.appendChild(modalContainer);
  window.__activeModals.push(modalContainer);

  // Trigger anim-in
  setTimeout(() => {
    modalContainer.classList.add('opacity-100');
    modalBody.classList.add('scale-100');
  }, 10);

  return modalContainer;
}
