import { Storage } from '../utils/storage.js';
import { PlayerState } from './playerState.js';
import { Toast } from '../components/toast.js';
import { Sounds } from '../utils/sounds.js';
import { t } from '../utils/i18n.js';

class DailyTaskManager {
  constructor() {
    this.listeners = [];
    this.initTasks();
  }

  initTasks() {
    const todayStr = new Date().toDateString();
    const lastReset = Storage.get('tasks_last_reset_date', null);

    const defaultTasks = [
      { id: 'lines', text: t('task_lines') || '10 satır temizle (Klasik)', target: 10, current: 0, rewardType: 'diamonds', rewardAmount: 50, claimed: false },
      { id: 'score', text: t('task_score') || 'Tek oyunda 500 puan yap (Klasik)', target: 500, current: 0, rewardType: 'xp', rewardAmount: 200, claimed: false },
      { id: 'hex_lines', text: t('task_hex_lines') || 'Altıgen Blok: 5 satır temizle', target: 5, current: 0, rewardType: 'diamonds', rewardAmount: 75, claimed: false },
      { id: 'merge_count', text: t('task_merge_count') || 'Blok Birleştirme: 10 blok birleştir', target: 10, current: 0, rewardType: 'xp', rewardAmount: 100, claimed: false },
      { id: 'sort_level', text: t('task_sort_level') || 'Renk Sıralama: 1 seviye tamamla', target: 1, current: 0, rewardType: 'diamonds', rewardAmount: 50, claimed: false },
      { id: '2048_merge', text: t('task_2048_merge') || '2048: 20 kez birleştirme yap', target: 20, current: 0, rewardType: 'xp', rewardAmount: 150, claimed: false },
      { id: 'duel_win', text: t('task_duel_win') || 'Düello: 1 maç kazan', target: 1, current: 0, rewardType: 'diamonds', rewardAmount: 100, claimed: false },
      { id: 'duel_play', text: t('task_duel_play') || 'Düello: 3 maç oyna', target: 3, current: 0, rewardType: 'xp', rewardAmount: 120, claimed: false },
      { id: 'adventure_level', text: t('task_adv_level') || 'Macera: 1 seviye tamamla', target: 1, current: 0, rewardType: 'diamonds', rewardAmount: 80, claimed: false },
      { id: 'merge_score', text: t('task_merge_score') || 'Blok Birleştirme: 300 puan yap', target: 300, current: 0, rewardType: 'xp', rewardAmount: 100, claimed: false },
      { id: 'x2_merge', text: t('task_x2_merge') || 'X2 2048: 30 blok birleştir', target: 30, current: 0, rewardType: 'diamonds', rewardAmount: 60, claimed: false },
      { id: 'match_level', text: t('task_match_level') || 'Blok Patlatmaca: 3 seviye tamamla', target: 3, current: 0, rewardType: 'diamonds', rewardAmount: 50, claimed: false },
      { id: 'bubble_pop', text: t('task_bubble_pop') || 'Baloncuk: 50 baloncuk patlat', target: 50, current: 0, rewardType: 'diamonds', rewardAmount: 60, claimed: false },
      { id: 'arrow_clear', text: t('task_arrow_clear') || 'Ok Bulmacası: 2 seviye tamamla', target: 2, current: 0, rewardType: 'diamonds', rewardAmount: 60, claimed: false },
      { id: 'login', text: t('task_login') || 'Giriş yap', target: 1, current: 1, rewardType: 'xp', rewardAmount: 50, claimed: false }
    ];

    if (lastReset !== todayStr) {
      this.tasks = JSON.parse(JSON.stringify(defaultTasks));
      Storage.set('tasks_last_reset_date', todayStr);
      this.save();
    } else {
      this.tasks = Storage.get('daily_tasks', JSON.parse(JSON.stringify(defaultTasks)));
      // Merge in any missing default tasks in case of updates
      defaultTasks.forEach(dt => {
        if (!this.tasks.find(t => t.id === dt.id)) {
          this.tasks.push(dt);
        }
      });
      this.save(); // Also fixes the missing ones
    }
  }

  // Force reset for the user right now
  forceReset() {
    Storage.set('tasks_last_reset_date', null);
    this.initTasks();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => listener(this.tasks));
  }

  save() {
    // updateProgress her satır/eşleşme/balon başına çağrılıyor; senkron yazım yerine
    // debounce'lı yazım (persist.js arka plana geçişte/kapanışta flush eder). notify anında kalır.
    Storage.setDebounced('daily_tasks', this.tasks);
    this.notify();
  }

  updateProgress(actionId, amount) {
    const task = this.tasks.find(t => t.id === actionId);
    if (!task || task.claimed) return;

    if (actionId === 'score') {
      task.current = Math.max(task.current, amount);
    } else {
      task.current = Math.min(task.target, task.current + amount);
    }
    
    this.save();
  }

  claim(taskId) {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    if (task.current < task.target) {
      Toast.show(t('task_not_completed') || 'Görev henüz tamamlanmadı!', 'warning');
      return false;
    }

    if (task.claimed) {
      Toast.show(t('reward_already_claimed') || 'Ödül zaten alındı!', 'warning');
      return false;
    }

    if (task.rewardType === 'diamonds') {
      PlayerState.addDiamonds(task.rewardAmount);
      Toast.show((t('reward_diamonds_earned') || '{amount} Elmas kazanıldı!').replace(/{amount}|{count}/g, task.rewardAmount), 'success');
    } else if (task.rewardType === 'xp') {
      PlayerState.addXp(task.rewardAmount);
      Toast.show((t('reward_xp_earned') || '{amount} XP kazanıldı!').replace(/{amount}|{count}/g, task.rewardAmount), 'success');
    }

    task.claimed = true;
    Sounds.playSfx('coin-collect');
    this.save();
    return true;
  }
}

export const TaskState = new DailyTaskManager();
