import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { t } from '../utils/i18n.js';

/**
 * Daily Reward Modal - Native Game Theme
 * Clean, glassmorphism design that matches the rest of the game UI.
 */
export function showDailyRewardModal() {
  return new Promise((resolve) => {
    const streakRewards = [50, 60, 75, 90, 110, 130, 200];
    const currentStreak = PlayerState.state.loginStreak % 7;
    const currentReward = streakRewards[currentStreak];
    const isDay7 = currentStreak === 6;

    // Create wrapper (Overlay)
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 opacity-0 transition-opacity duration-300 will-change-opacity';

    const modal = document.createElement('div');
    // Using native glass-card class from style.css
    modal.className = 'glass-card rounded-[2rem] p-6 sm:p-8 max-w-[420px] w-full transform scale-90 transition-transform duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) will-change-transform flex flex-col items-center relative overflow-hidden';

    // Header
    const titleContainer = document.createElement('div');
    titleContainer.className = 'flex flex-col items-center mb-6 relative w-full text-center';
    titleContainer.innerHTML = `
      <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-3 shadow-inner">
        <span class="material-symbols-outlined text-4xl text-blue-500 fill drop-shadow-sm">calendar_month</span>
      </div>
      <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-primary dark:text-white mb-1">
        ${t('daily_reward_title') || 'GÜNLÜK ÖDÜL'}
      </h2>
      <p class="text-[13px] sm:text-sm text-gray-500 dark:text-gray-400 font-medium px-2">
        ${t('daily_reward_subtitle') || 'Oyuna her gün gir, giderek büyüyen sandıkları kap!'}
      </p>
    `;
    modal.appendChild(titleContainer);

    // Grid Container for Days 1-6
    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid grid-cols-3 gap-2 sm:gap-3 w-full mb-3';

    let htmlContent = '';
    for (let i = 0; i < 6; i++) {
      const isPast = i < currentStreak;
      const isCurrent = i === currentStreak;
      const rewardText = `${streakRewards[i]}`;
      
      let cardClasses = 'relative flex flex-col items-center p-2 rounded-2xl border transition-all duration-300 ';
      let iconHTML = '';
      let textClasses = 'text-[11px] font-bold mt-1 ';
      let valClasses = 'text-sm font-black tracking-tight leading-none mt-1 flex items-center gap-0.5 ';
      
      if (isPast) {
        cardClasses += 'border-green-500/30 bg-green-500/10 dark:bg-green-500/5 opacity-70';
        iconHTML = '<span class="material-symbols-outlined fill text-green-500 text-2xl drop-shadow-sm">check_circle</span>';
        textClasses += 'text-green-600 dark:text-green-500';
        valClasses += 'text-green-600/50 dark:text-green-500/50 line-through';
      } else if (isCurrent) {
        cardClasses += 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md shadow-blue-500/10 transform scale-105 z-10';
        iconHTML = '<span class="material-symbols-outlined fill text-blue-500 text-3xl animate-bounce-slow drop-shadow-sm">diamond</span>';
        textClasses += 'text-blue-600 dark:text-blue-400';
        valClasses += 'text-blue-700 dark:text-blue-300 text-base';
      } else {
        cardClasses += 'border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/50';
        iconHTML = '<span class="material-symbols-outlined fill text-gray-400 dark:text-slate-500 text-2xl">lock</span>';
        textClasses += 'text-gray-400 dark:text-slate-500';
        valClasses += 'text-gray-500 dark:text-slate-400';
      }

      htmlContent += `
        <div class="${cardClasses}">
          ${iconHTML}
          <div class="${valClasses}">${rewardText}</div>
          <div class="${textClasses}">${(t("day_n") || "${n}. GÜN").replace("{n}", i + 1)}</div>
        </div>
      `;
    }
    gridContainer.innerHTML = htmlContent;
    modal.appendChild(gridContainer);

    // Day 7 Special Big Box
    const isDay7Past = 6 < currentStreak;
    const isDay7Current = 6 === currentStreak;
    const d7Reward = streakRewards[6];
    
    let d7Classes = 'relative w-full rounded-2xl border-2 p-3 flex items-center justify-between transition-all duration-300 mb-6 ';
    let d7Icon = '';
    
    if (isDay7Current) {
      d7Classes += 'border-cyan-400 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 shadow-md shadow-cyan-500/10 transform scale-105 z-10';
      d7Icon = '<span class="material-symbols-outlined fill text-cyan-500 text-[40px] drop-shadow-md">redeem</span>';
    } else {
      d7Classes += 'border-gray-200 dark:border-slate-700/50 bg-gray-50 dark:bg-slate-800/50';
      d7Icon = '<span class="material-symbols-outlined fill text-gray-400 dark:text-slate-500 text-[36px]">lock</span>';
    }

    const d7HTML = `
      <div class="${d7Classes}">
        <div class="flex items-center gap-3">
          ${d7Icon}
          <div class="flex flex-col">
            <span class="text-xs font-black ${isDay7Current ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-400 dark:text-slate-500'} tracking-wider">${t("day_7_title") || "7. GÜN BÜYÜK ÖDÜLÜ"}</span>
            <span class="text-[10px] font-bold text-gray-500 leading-none mt-0.5">${t("day_7_chest") || "Gizemli Premium Sandık"}</span>
          </div>
        </div>
        <div class="text-2xl font-black ${isDay7Current ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-400 dark:text-slate-500'}">${d7Reward}💎</div>
      </div>
    `;
    
    const d7Container = document.createElement('div');
    d7Container.className = 'w-full';
    d7Container.innerHTML = d7HTML;
    modal.appendChild(d7Container);

    // CLAIM BUTTON - Native UI Style matching Main Menu "Play" buttons
    const claimBtn = document.createElement('button');
    claimBtn.className = 'w-full p-4 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-black text-lg shadow-lg active:scale-95 transition-transform flex justify-center items-center gap-2';
    
    claimBtn.innerHTML = `
      <span>${t('daily_reward_claim') || 'ÖDÜLÜ AL'}</span>
      <span class="material-symbols-outlined text-2xl drop-shadow-sm">diamond</span>
    `;

    claimBtn.addEventListener('click', () => {
      Sounds.playSfx('coin-collect');
      const amount = PlayerState.claimDailyReward();
      
      // Close modal smoothly
      overlay.style.opacity = '0';
      modal.style.transform = 'scale(0.95) translateY(10px)';
      setTimeout(() => {
        if(overlay.parentNode) overlay.remove();
        resolve(amount);
      }, 300);
    });
    modal.appendChild(claimBtn);

    // INFO TEXT
    const streakInfo = document.createElement('p');
    streakInfo.className = 'text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-5 text-center leading-tight';
    streakInfo.innerHTML = '<span class="font-bold text-red-500">' + (t("attention") || "DİKKAT:") + '</span> ' + (t('daily_reward_streak_info') || 'Eğer bir gün bile girmezsen serin sıfırlanır ve 1. güne dönersin!');
    modal.appendChild(streakInfo);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        modal.style.transform = 'scale(1)';
      });
    });
  });
}
