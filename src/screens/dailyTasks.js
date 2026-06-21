import { createTopBar } from '../components/topBar.js';
import { createBottomNav } from '../components/bottomNav.js';
import { createGlassCard } from '../components/glassCard.js';
import { createProgressBar } from '../components/progressBar.js';
import { TaskState } from '../state/taskState.js';
import { t } from '../utils/i18n.js';
import { Sounds } from '../utils/sounds.js';
import { initSwipeNavigation } from '../utils/swipeNav.js';

export function DailyTasks(router) {
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] flex flex-col justify-between bg-bg-light dark:bg-primary text-primary dark:text-white select-none animate-pop-up relative overflow-hidden';

  // 1. Top Bar
  const topBar = createTopBar(t('tasks_header'), true);
  container.appendChild(topBar);

  // Main Scroll Area
  const content = document.createElement('main');
  content.className = 'flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar';
  container.appendChild(content);

  // Render list of task cards
  const renderTasks = (tasksList) => {
    content.innerHTML = '';
    
    // Header Info
    const banner = document.createElement('div');
    banner.className = 'text-center py-2 flex flex-col items-center mb-2';
    banner.innerHTML = `
      <h2 class="text-lg font-black tracking-tight mb-1">${t('tasks_header')}</h2>
      <p class="text-[11px] text-gray-400 font-medium">${t('tasks_desc')}</p>
    `;
    content.appendChild(banner);

    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-2 gap-3 pb-8';

    tasksList.forEach(task => {
      const isCompleted = task.current >= task.target;
      const isClaimed = task.claimed;

      const cardBody = document.createElement('div');
      cardBody.className = `flex flex-col items-center text-center w-full transition-opacity duration-300 ${isClaimed ? 'opacity-60' : ''}`;
      
      const getTaskIcon = (id) => {
        if (id.includes('hex')) return 'hexagon';
        if (id.includes('arrow')) return 'navigation';
        if (id.includes('merge')) return 'library_add';
        if (id.includes('sort')) return 'format_color_fill';
        if (id.includes('2048')) return 'pin';
        if (id.includes('duel')) return 'swords';
        if (id.includes('adventure')) return 'explore';
        if (id.includes('login')) return 'login';
        if (id.includes('score')) return 'military_tech';
        if (id.includes('lines')) return 'grid_on';
        return 'task_alt';
      };

      const headerRow = `
        <div class="w-10 h-10 rounded-full bg-secondary/10 dark:bg-accent-cyan/10 flex items-center justify-center shrink-0 border border-secondary/20 dark:border-accent-cyan/20 shadow-sm mb-2">
          <span class="material-symbols-outlined text-[20px] text-secondary dark:text-accent-cyan">${getTaskIcon(task.id)}</span>
        </div>
        <div class="h-[32px] flex items-center justify-center overflow-hidden mb-1">
          <span class="text-[11px] font-black tracking-tight text-primary dark:text-white leading-tight line-clamp-2">${t('task_' + task.id) || task.text}</span>
        </div>
        <span class="text-[10px] text-gray-400 dark:text-gray-500 font-bold mb-2">${task.current} / ${task.target}</span>
        
        <div class="flex items-center justify-center bg-black/5 dark:bg-white/5 px-2 py-1 rounded w-full mb-3">
          <span class="text-[10px] font-black text-gray-400 tracking-wider mr-1">${t('tasks_reward')}:</span>
          <span class="text-[11px] font-black ${task.rewardType === 'diamonds' ? 'text-cyan-600 dark:text-cyan-400' : 'text-secondary dark:text-accent-cyan'}">
            +${task.rewardAmount} ${task.rewardType === 'diamonds' ? '<span class="material-symbols-outlined fill text-cyan-400 text-[1em] align-middle">diamond</span>' : 'XP'}
          </span>
        </div>
      `;
      cardBody.innerHTML = headerRow;

      // Progress bar
      const progressPercent = (task.current / task.target) * 100;
      const progressBarContainer = document.createElement('div');
      progressBarContainer.className = 'w-full mb-3';
      const progressBar = createProgressBar(
        progressPercent,
        task.rewardType === 'diamonds' ? 'bg-gradient-to-r from-cyan-400 to-cyan-600' : 'bg-gradient-to-r from-secondary to-accent-cyan',
        ''
      );
      progressBarContainer.appendChild(progressBar);
      cardBody.appendChild(progressBarContainer);

      // Claim Action button
      const btnRow = document.createElement('div');
      btnRow.className = 'w-full flex justify-center mt-auto';

      if (isClaimed) {
        btnRow.innerHTML = `
          <div class="flex items-center justify-center w-full text-green-500 font-extrabold text-[10px] bg-green-500/10 border border-green-500/20 py-1.5 rounded-xl">
            <span class="material-symbols-outlined text-[13px] mr-1 font-bold">check_circle</span>
            <span>${t('tasks_claimed')}</span>
          </div>
        `;
      } else if (isCompleted) {
        const claimBtn = document.createElement('button');
        claimBtn.className = 'w-full py-1.5 bg-secondary dark:bg-[#0070eb] hover:bg-secondary-container text-white font-black text-[11px] rounded-xl shadow-md active:scale-95 transition-all';
        claimBtn.textContent = t('tasks_claim');
        claimBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          TaskState.claim(task.id);
        });
        btnRow.appendChild(claimBtn);
      } else {
        btnRow.innerHTML = `
          <button disabled class="w-full py-1.5 bg-black/5 dark:bg-white/5 text-gray-400 dark:text-gray-500 font-bold text-[11px] rounded-xl cursor-not-allowed border border-black/5 dark:border-white/5">
            ${t('tasks_ongoing')}
          </button>
        `;
      }

      cardBody.appendChild(btnRow);

      const card = createGlassCard(cardBody);
      card.className += ' h-full flex flex-col justify-between'; // ensure uniform height
      gridContainer.appendChild(card);
    });

    content.appendChild(gridContainer);
  };

  // Subscribe to task updates
  const unsubscribe = TaskState.subscribe((tasks) => {
    renderTasks(tasks);
  });

  // Initial draw
  renderTasks(TaskState.tasks);

  // 3. Bottom Navigation
  container.appendChild(createBottomNav('tasks'));

  initSwipeNavigation(container, router, 'tasks');

  // Cleanup listeners
  container.cleanup = () => {
    if (topBar.cleanup) topBar.cleanup();
    unsubscribe();
  };

  return container;
}
