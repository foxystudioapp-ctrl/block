import { createTopBar } from '../components/topBar.js';
import { Storage } from '../utils/storage.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { t, getCurrentLang, setLang, availableLanguages } from '../utils/i18n.js';
import { App } from '@capacitor/app';
import { createModal } from '../components/modal.js';

export function showSettingsModal() {
  if (document.getElementById('settings-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'settings-overlay';
  overlay.className = 'fixed inset-0 z-50 flex justify-center bg-black/50 backdrop-blur-sm animate-fade-in';

  const container = document.createElement('div');
  container.className = 'w-full h-full max-w-full lg:max-w-4xl mx-auto flex flex-col justify-between bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-slide-up relative shadow-2xl';

  const topBar = createTopBar(t('settings') || 'Ayarlar', true, () => overlay.remove(), false);
  container.appendChild(topBar);

  const content = document.createElement('main');
  content.className = 'flex-1 overflow-y-auto px-4 py-4 space-y-6 no-scrollbar relative z-10 pb-20';

  // State
  let sfxEnabled = Storage.get('soundEnabled', true);
  let musicEnabled = Storage.get('musicEnabled', true);
  let hapticsEnabled = Storage.get('hapticEnabled', true);

  const createToggle = (id, icon, title, desc, checked, onChange) => {
    const row = document.createElement('div');
    row.className = 'glass-panel p-4 rounded-3xl flex items-center justify-between shadow-sm';
    
    row.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
          <span class="material-symbols-outlined text-xl text-secondary dark:text-accent-cyan">${icon}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-black">${title}</span>
          <span class="text-[10px] font-medium text-gray-500">${desc}</span>
        </div>
      </div>
      <button id="${id}" class="w-12 h-6 rounded-full transition-colors relative ${checked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}">
        <div class="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm ${checked ? 'translate-x-6' : 'translate-x-0.5'}"></div>
      </button>
    `;

    let isChecked = checked;
    const btn = row.querySelector(`#${id}`);
    btn.onclick = () => {
      isChecked = !isChecked;
      
      btn.className = `w-12 h-6 rounded-full transition-colors relative ${isChecked ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`;
      const thumb = btn.querySelector('div');
      thumb.className = `w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform shadow-sm ${isChecked ? 'translate-x-6' : 'translate-x-0.5'}`;
      
      onChange(isChecked);
      
      if (isChecked) {
        Sounds.playSfx('button-tap');
        Haptics.vibrate('button-tap');
      }
    };

    return row;
  };

  const createSelect = (id, icon, title, desc, options, currentValue, onChange) => {
    const row = document.createElement('div');
    row.className = 'glass-panel p-4 rounded-3xl flex items-center justify-between shadow-sm relative';
    
    const optionsHtml = options.map(opt => `<option value="${opt.value}" ${opt.value === currentValue ? 'selected' : ''} class="text-black dark:text-black">${opt.label}</option>`).join('');

    row.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 rounded-2xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
          <span class="material-symbols-outlined text-xl text-secondary dark:text-accent-cyan">${icon}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-sm font-black">${title}</span>
          <span class="text-[10px] font-medium text-gray-500">${desc}</span>
        </div>
      </div>
      <select id="${id}" class="bg-black/5 dark:bg-white/10 rounded-xl px-3 py-1.5 text-xs font-bold border border-black/10 dark:border-white/10 outline-none text-primary dark:text-white cursor-pointer ml-2 min-w-[80px]">
        ${optionsHtml}
      </select>
    `;

    const selectEl = row.querySelector(`#${id}`);
    selectEl.addEventListener('change', (e) => {
      Sounds.playSfx('button-tap');
      onChange(e.target.value);
    });

    return row;
  };

  const togglesContainer = document.createElement('div');
  togglesContainer.className = 'flex flex-col gap-3';

  // Language Dropdown
  const langOptions = availableLanguages.map(l => ({ value: l.code, label: l.name }));
  togglesContainer.appendChild(createSelect('select-lang', 'language', t('settings_lang'), '', langOptions, getCurrentLang(), (val) => {
    setLang(val);
  }));

  togglesContainer.appendChild(createToggle('toggle-sfx', 'volume_up', t('settings_sfx'), '', sfxEnabled, (val) => {
    Sounds.setSoundEnabled(val);
  }));

  togglesContainer.appendChild(createToggle('toggle-music', 'music_note', t('settings_bgm'), '', musicEnabled, (val) => {
    Sounds.setMusicEnabled(val);
  }));

  togglesContainer.appendChild(createToggle('toggle-haptics', 'vibration', t('settings_vib'), '', hapticsEnabled, (val) => {
    Haptics.setHapticEnabled(val);
  }));

  content.appendChild(togglesContainer);

  // Legal Section
  const legalSection = document.createElement('div');
  legalSection.className = 'w-full flex flex-col space-y-2 mt-6';
  legalSection.innerHTML = `
    <a href="/privacy.html" target="_blank" class="w-full glass-panel p-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-transform">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-blue-500">policy</span>
        <span class="font-bold text-sm text-primary dark:text-white">${t('privacy_policy') || 'Gizlilik Politikası'}</span>
      </div>
      <span class="material-symbols-outlined text-gray-400 text-sm">open_in_new</span>
    </a>
    <a href="/terms.html" target="_blank" class="w-full glass-panel p-4 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-transform">
      <div class="flex items-center gap-3">
        <span class="material-symbols-outlined text-orange-500">gavel</span>
        <span class="font-bold text-sm text-primary dark:text-white">${t('terms_of_use') || 'Kullanım Şartları'}</span>
      </div>
      <span class="material-symbols-outlined text-gray-400 text-sm">open_in_new</span>
    </a>
  `;
  content.appendChild(legalSection);

  // About Section
  const aboutSection = document.createElement('div');
  aboutSection.className = 'flex flex-col items-center mt-12 opacity-50';
  aboutSection.innerHTML = `
    <span class="text-xl font-black mb-1 text-center">BLOXY:<br>ALL-IN-ONE PUZZLE</span>
  `;
  content.appendChild(aboutSection);

  // Exit App Section
  const exitSection = document.createElement('div');
  exitSection.className = 'w-full flex justify-center mt-8 pb-4';
  const exitBtn = document.createElement('button');
  exitBtn.className = 'px-6 py-3 bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/50 rounded-2xl font-black text-sm active:scale-95 transition-transform flex items-center gap-2';
  exitBtn.innerHTML = `
    <span class="material-symbols-outlined text-lg">logout</span>
    ${t('settings_exit_btn') || 'Oyundan Çık'}
  `;
  exitBtn.onclick = () => {
    Sounds.playSfx('button-tap');
    Haptics.vibrate('button-tap');
    createModal({
      title: t('exit_confirm_title') || 'Emin misiniz?',
      content: `<p class="text-center text-gray-500 dark:text-gray-400 text-sm font-bold">${t('exit_confirm_desc') || 'Oyundan tamamen çıkmak istediğinize emin misiniz?'}</p>`,
      actions: [
        { text: t('cancel') || 'İptal', onClick: (close) => close() },
        { 
          text: t('btn_exit') || 'Çık', 
          danger: true, 
          onClick: () => {
            App.exitApp();
          }
        }
      ]
    });
  };
  exitSection.appendChild(exitBtn);
  content.appendChild(exitSection);

  container.appendChild(content);

  // Background decoration
  const bgDeco = document.createElement('div');
  bgDeco.className = 'fixed inset-0 pointer-events-none z-[-1] opacity-5 flex items-center justify-center';
  bgDeco.innerHTML = `<span class="material-symbols-outlined text-[30rem] rotate-45">settings</span>`;
  container.appendChild(bgDeco);

  // Bottom Nav
  
  overlay.appendChild(container);
  document.body.appendChild(overlay);

  return overlay;
}
