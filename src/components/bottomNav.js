import { Router } from '../router.js';
import { t } from '../utils/i18n.js';
import { Toast } from './toast.js';

export function createBottomNav(activeTab) {
  const footer = document.createElement('nav');
  footer.className = 'w-full sticky bottom-0 z-40 bg-[#f5f5f7]/85 dark:bg-[#010102]/85 backdrop-blur-md border-t border-[#010102]/5 dark:border-white/5 py-2 px-6 flex items-center justify-around transition-all duration-300';

  const tabs = [
    { id: 'menu', hash: '#/menu', icon: 'grid_view', label: t('nav_play') },
    { id: 'leaderboard', hash: '#/leaderboard', icon: 'leaderboard', label: t('nav_leaderboard') },
    { id: 'tasks', hash: '#/tasks', icon: 'emoji_events', label: t('nav_tasks') },
    { id: 'profile', hash: '#/profile', icon: 'person', label: t('nav_profile') }
  ];

  footer.innerHTML = tabs.map(tab => {
    const isActive = tab.id === activeTab;
    const activeClass = isActive 
      ? 'text-secondary dark:text-accent-cyan scale-105' 
      : 'text-gray-400 dark:text-gray-500 hover:text-primary dark:hover:text-white';
    
    return `
      <button data-hash="${tab.hash}" class="flex flex-col items-center justify-center space-y-0.5 py-1 px-3 rounded-xl transition-all duration-200 active:scale-90 ${activeClass}">
        <span class="material-symbols-outlined text-2xl ${isActive ? 'fill' : ''}">${tab.icon}</span>
        <span class="text-[10px] font-bold tracking-tight">${tab.label}</span>
      </button>
    `;
  }).join('');

  // Add click event listeners
  footer.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const hash = btn.getAttribute('data-hash');
      if (hash) {
        if (hash === '#/leaderboard' && !navigator.onLine) {
          Toast.show(t('no_internet_warning') || 'İnternete bağlı değilsiniz, lütfen internetinizi açın.', 'error');
          return;
        }
        Router.navigate(hash);
      }
    });
  });

  return footer;
}
