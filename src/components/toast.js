import { Sounds } from '../utils/sounds.js';

class ToastManager {
  constructor() {
    this.container = null;
  }

  init() {
    if (this.container) return;
    this.container = document.createElement('div');
    this.container.className = 'fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center space-y-2 pointer-events-none w-80';
    document.body.appendChild(this.container);
  }

  show(message, type = 'info', duration = 3000) {
    this.init();
    
    // Play achievement/bell SFX for toast alerts
    Sounds.playSfx('achievement');

    const toast = document.createElement('div');
    toast.className = 'w-full py-3 px-4 rounded-2xl glass-card text-center flex items-center justify-center space-x-2 shadow-lg border border-white/20 transition-all duration-300 opacity-0 translate-y-[-20px] pointer-events-auto';
    
    // Choose icon based on type
    let icon = 'info';
    let iconClass = 'text-secondary';
    if (type === 'success') {
      icon = 'check_circle';
      iconClass = 'text-green-500';
    } else if (type === 'warning') {
      icon = 'warning';
      iconClass = 'text-orange-500';
    } else if (type === 'error') {
      icon = 'error';
      iconClass = 'text-red-500';
    }

    toast.innerHTML = `
      <span class="material-symbols-outlined ${iconClass} text-xl fill">${icon}</span>
      <span class="text-xs font-semibold text-primary dark:text-white">${message}</span>
    `;

    this.container.appendChild(toast);

    // Eşzamanlı toast sayısını sınırla: spam çağrılarda (örn. çevrimdışı hata döngüsü)
    // en eskileri hemen kaldır, sınırsız DOM/timer birikmesini önle.
    const MAX_TOASTS = 3;
    while (this.container.children.length > MAX_TOASTS) {
      this.container.firstElementChild.remove();
    }

    // Trigger animate-in
    setTimeout(() => {
      toast.classList.remove('opacity-0', 'translate-y-[-20px]');
      toast.classList.add('opacity-100', 'translate-y-0');
    }, 10);

    // Trigger animate-out and remove
    setTimeout(() => {
      toast.classList.remove('opacity-100', 'translate-y-0');
      toast.classList.add('opacity-0', 'translate-y-[-20px]');
      
      // Remove element from DOM after transition finishes
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, duration);
  }
}

export const Toast = new ToastManager();
