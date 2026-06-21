import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { getLevelData, MATCH_LEVELS } from '../game/matchLevels.js';
import { t } from '../utils/i18n.js';

export function MinerMap(router) {
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-4xl mx-auto h-[100dvh] flex flex-col bg-slate-900 text-white select-none relative overflow-hidden';

  const topBar = createTopBar(t('menu_jewel') || 'BLOK PATLATMA', true, () => router.navigate('#/menu'));
  topBar.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
  topBar.style.backdropFilter = 'blur(10px)';
  container.appendChild(topBar);

  const scrollContainer = document.createElement('div');
  scrollContainer.className = 'flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar';
  scrollContainer.style.scrollBehavior = 'smooth';

  // Map Background
  const mapBg = document.createElement('div');
  mapBg.className = 'absolute inset-0 bg-[url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\' fill=\'%23ffffff\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")]';
  scrollContainer.appendChild(mapBg);
  
  const playerLevel = PlayerState.state.jewelCrushLevel || 1;
  const TOTAL_LEVELS = Math.max(100, Math.ceil(playerLevel / 20) * 20 + 20);
  
  // Grid Container for Level Buttons
  const gridContainer = document.createElement('div');
  gridContainer.className = 'w-full max-w-3xl mx-auto px-4 py-8 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4 pb-20';

  let firstUncompletedNode = null;

  for (let i = 1; i <= TOTAL_LEVELS; i++) {
    const isUnlocked = i <= playerLevel;
    const isCurrent = i === playerLevel;

    const btn = document.createElement('button');
    btn.className = `relative aspect-square rounded-2xl flex flex-col items-center justify-center font-black text-xl md:text-2xl transition-all shadow-md ${
      isUnlocked 
        ? 'bg-gradient-to-b from-slate-700 to-slate-800 border-b-4 border-slate-900 text-white hover:scale-105 active:scale-95 active:border-b-0 active:translate-y-1' 
        : 'bg-slate-800/50 text-white/30 border-2 border-slate-700/50 cursor-not-allowed'
    } ${isCurrent ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900 animate-pulse' : ''}`;

    if (isUnlocked) {
      btn.innerHTML = `
        <span>${i}</span>
        ${i < playerLevel ? '<span class="material-symbols-outlined text-[10px] md:text-xs text-yellow-400 mt-1 fill">star</span>' : ''}
      `;
      btn.onclick = () => {
        Sounds.playSfx('button-tap');
        router.navigate('#/match?level=' + i);
      };
      
      if (isCurrent) {
        firstUncompletedNode = btn;
      }
    } else {
      btn.innerHTML = `
        <span class="material-symbols-outlined text-white/20 mb-1">lock</span>
        <span class="text-xs font-bold text-white/20">${i}</span>
      `;
      btn.disabled = true;
    }

    gridContainer.appendChild(btn);
  }

  scrollContainer.appendChild(gridContainer);
  container.appendChild(scrollContainer);

  // Auto scroll to current level
  setTimeout(() => {
    if (firstUncompletedNode) {
      firstUncompletedNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, 100);

  return container;
}
