// Adventure Map - Dik çizgili, sol kenarda timeline tarzı harita
// 4 modu destekler: bubble, classic, match, x2
//
// URL: #/adventure-map?game=<mod>
//
// Davranışlar:
// - İlk açılışta scrollIntoView({ block: 'center' }) ile current level tam ortada
// - Geçilmiş seviye → tıklayınca tekrar oynanabilir
// - Mevcut seviye → büyük + parlak pulse animasyon
// - Kilitli seviye → soluk + 🔒 ikon, Toast uyarısı
// - TopBar + progress bar sabit, sadece liste alanı scroll edilir

import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { Toast } from '../components/toast.js';
import { t } from '../utils/i18n.js';

// Mod yapılandırmaları
const CONFIGS = {
  bubble: {
    titleKey: 'menu_bubble',
    titleFallback: 'Baloncuk Macera',
    accentFrom: '#FF6B9D',
    accentTo: '#A663CC',
    total: 300,
    isEndless: true,
    stateKey: 'bubbleAdventureLevel',
    gameRoute: '#/bubble?mode=adventure',
    icon: 'bubble_chart',
  },
  classic: {
    titleKey: 'menu_classic',
    titleFallback: 'Klasik Macera',
    accentFrom: '#00C9FF',
    accentTo: '#0066FF',
    total: 300,
    isEndless: true,
    stateKey: 'currentAdventureLevel',
    gameRoute: '#/classic?mode=adventure',
    icon: 'grid_view',
  },
  match: {
    titleKey: 'menu_jewel',
    titleFallback: 'Patlatmaca Macera',
    accentFrom: '#FF9500',
    accentTo: '#FF3D6E',
    total: 300,
    isEndless: true,
    stateKey: 'jewelCrushLevel',
    gameRoute: '#/match?mode=adventure',
    icon: 'apps',
  },
  x2: {
    titleKey: 'menu_x2',
    titleFallback: 'X2 Macera',
    accentFrom: '#FF6A00',
    accentTo: '#EE0979',
    total: 300,
    isEndless: true,
    stateKey: 'x2AdventureLevel',
    gameRoute: '#/x2?mode=adventure',
    icon: 'view_module',
  },
  arrow: {
    titleKey: 'menu_arrow',
    titleFallback: 'Ok Bulmacası',
    accentFrom: '#22D3EE',
    accentTo: '#6366F1',
    total: 300, // Will be overridden dynamically
    isEndless: true,
    stateKey: 'arrowAdventureLevel',
    gameRoute: '#/arrow?mode=adventure',
    icon: 'navigation',
  },
};

export function AdventureMap(router) {
  const queryParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const game = queryParams.get('game') || 'bubble';
  const config = CONFIGS[game] || CONFIGS.bubble;

  const currentLevel = PlayerState.state[config.stateKey] || 1;
  let displayTotal = config.total;
  if (config.isEndless) {
    displayTotal = Math.max(100, currentLevel + 20); // Render up to current + 20 levels
  }

  // Ana konteyner
  const container = document.createElement('div');
  container.className = 'fixed inset-0 bg-gradient-to-b from-slate-50 to-blue-50 dark:from-gray-900 dark:to-blue-950';

  // Sabit Header (Glassmorphism)
  const headerWrap = document.createElement('div');
  headerWrap.className = 'fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-lg border-b border-black/5 dark:border-white/5 shadow-sm';

  // Top bar
  const header = document.createElement('div');
  header.className = 'absolute top-0 left-0 w-full z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm transition-all pb-safe-top';

  const topBar = document.createElement('div');
  topBar.className = 'flex items-center justify-between px-4 py-3 mt-safe-top';
  topBar.innerHTML = `
    <button id="map-back-btn" class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center active:scale-95 transition-transform text-gray-700 dark:text-gray-300">
      <span class="material-symbols-outlined font-bold">arrow_back</span>
    </button>
    <div class="flex-1 px-4 text-center">
      <h1 class="text-xl font-black tracking-tight flex items-center justify-center gap-2">
        <span class="material-symbols-outlined text-[24px]" style="color: ${config.accentFrom};">${config.icon}</span>
        ${t(config.titleKey) || config.titleFallback}
      </h1>
    </div>
    <div class="w-10"></div>
  `;
  topBar.querySelector('#map-back-btn').addEventListener('click', () => router.navigate('#/menu'));
  header.appendChild(topBar);
  headerWrap.appendChild(header);

  // Progress bar (sabit)
  const progressSection = document.createElement('div');
  progressSection.className = 'px-5 pt-1 pb-4 shrink-0 mt-14'; // mt-14 to give space from absolute header
  const pct = Math.min(100, Math.round((currentLevel / config.total) * 100));
  progressSection.innerHTML = `
    <div class="flex justify-between items-center mb-1.5">
      <span class="text-sm font-black tracking-tight text-gray-700 dark:text-gray-200">
        ${t('level') || 'Seviye'} <span class="text-transparent bg-clip-text" style="background-image:linear-gradient(to right, ${config.accentFrom}, ${config.accentTo});-webkit-background-clip:text;">${currentLevel}</span>
        ${config.isEndless ? '' : `<span class="text-gray-400 dark:text-gray-500">/ ${config.total}</span>`}
      </span>
      ${config.isEndless ? `<span class="text-xs font-bold text-gray-500 dark:text-gray-400">${t('x2_endless_mode') || 'Sonsuz'}</span>` : `<span class="text-xs font-bold text-gray-500 dark:text-gray-400">${pct}%</span>`}
    </div>
    <div class="w-full h-2 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
      <div class="h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,201,255,0.5)]"
           style="width:${pct}%;background-image:linear-gradient(to right, ${config.accentFrom}, ${config.accentTo});"></div>
    </div>
  `;
  headerWrap.appendChild(progressSection);
  container.appendChild(headerWrap);

  // Scrollable liste alanı (Tam ekran)
  const scrollWrap = document.createElement('div');
  scrollWrap.className = 'absolute inset-0 overflow-y-auto overflow-x-hidden';
  // Dik çizgi (sol kenarda, scroll'la birlikte hareket eder)
  const trackWidth = 64; // soldaki çizginin x merkezi
  const list = document.createElement('div');
  list.className = 'relative pb-16';
  list.style.paddingTop = '140px'; // Header yüksekliği kadar boşluk
  list.style.minHeight = `${displayTotal * 90 + 250}px`; // her seviye 90px yer kaplar

  // Soldaki dikey çizgi (SVG)
  const lineLayer = document.createElement('div');
  lineLayer.className = 'absolute top-0 bottom-0 pointer-events-none';
  lineLayer.style.left = `${trackWidth - 2}px`;
  lineLayer.style.width = '4px';
  lineLayer.style.background = `linear-gradient(to bottom, ${config.accentFrom}33 0%, ${config.accentTo}66 50%, ${config.accentFrom}33 100%)`;
  lineLayer.style.borderRadius = '4px';
  list.appendChild(lineLayer);

  // Seviye butonları
  // Üstte küçük (1) → altta büyük (total). Doğal dikey sıra.
  const buttonRefs = []; // current level'a scroll için
  let currentLevelEl = null;

  for (let i = 1; i <= displayTotal; i++) {
    const isCompleted = i < currentLevel;
    const isCurrent = i === currentLevel;
    const isLocked = i > currentLevel;
    const isMilestone = i % 10 === 0 || i === 1 || i === displayTotal;

    const rowWrap = document.createElement('div');
    rowWrap.className = 'relative flex items-center';
    rowWrap.style.height = '90px';

    // Connector noktası (çizgi üzerinde)
    const dot = document.createElement('div');
    dot.className = 'absolute rounded-full';
    dot.style.left = `${trackWidth - 8}px`;
    dot.style.top = '50%';
    dot.style.transform = 'translateY(-50%)';
    dot.style.width = '16px';
    dot.style.height = '16px';
    if (isCompleted) {
      dot.style.background = `linear-gradient(135deg, ${config.accentFrom}, ${config.accentTo})`;
      dot.style.boxShadow = `0 0 12px ${config.accentFrom}88`;
    } else if (isCurrent) {
      dot.style.background = `linear-gradient(135deg, ${config.accentFrom}, ${config.accentTo})`;
      dot.style.boxShadow = `0 0 16px ${config.accentFrom}cc`;
    } else {
      dot.style.background = 'rgba(150,150,150,0.4)';
    }
    rowWrap.appendChild(dot);

    // Yatay connector (çizgiden butona)
    const connector = document.createElement('div');
    connector.className = 'absolute h-0.5';
    connector.style.left = `${trackWidth + 8}px`;
    connector.style.top = '50%';
    connector.style.width = '28px';
    connector.style.transform = 'translateY(-50%)';
    if (isCompleted || isCurrent) {
      connector.style.background = `linear-gradient(to right, ${config.accentFrom}88, ${config.accentTo}66)`;
    } else {
      connector.style.background = 'rgba(150,150,150,0.3)';
    }
    rowWrap.appendChild(connector);

    // Seviye butonu
    const btn = document.createElement('button');
    btn.setAttribute('data-level', i);
    const size = isCurrent ? 76 : (isMilestone ? 64 : 56);
    btn.style.position = 'absolute';
    btn.style.left = `${trackWidth + 40}px`;
    btn.style.top = '50%';
    btn.style.transform = 'translateY(-50%)';
    btn.style.width = `${size}px`;
    btn.style.height = `${size}px`;
    btn.className = 'rounded-full flex items-center justify-center font-black shadow-lg active:scale-95 transition-transform select-none relative';

    if (isCurrent) {
      btn.style.background = `linear-gradient(135deg, ${config.accentFrom}, ${config.accentTo})`;
      btn.style.color = 'white';
      btn.style.boxShadow = `0 6px 24px ${config.accentFrom}77, 0 0 0 4px white, 0 0 0 6px ${config.accentFrom}55`;
      btn.style.fontSize = '22px';
      // Pulse halkası
      const pulse = document.createElement('span');
      pulse.className = 'absolute inset-0 rounded-full pointer-events-none';
      pulse.style.animation = 'mapPulse 1.8s ease-out infinite';
      pulse.style.boxShadow = `0 0 0 0 ${config.accentFrom}cc`;
      btn.appendChild(pulse);
      // ★ ikonu (üstte küçük)
      const star = document.createElement('span');
      star.className = 'absolute -top-2 -right-2 text-yellow-400 text-base drop-shadow';
      star.textContent = '★';
      btn.appendChild(star);
    } else if (isCompleted) {
      btn.style.background = `linear-gradient(135deg, ${config.accentFrom}dd, ${config.accentTo}dd)`;
      btn.style.color = 'white';
      btn.style.fontSize = '17px';
      // ✓ rozet
      const check = document.createElement('span');
      check.className = 'material-symbols-outlined absolute -top-1.5 -right-1.5 text-white text-base fill';
      check.textContent = 'check_circle';
      check.style.background = '#22c55e';
      check.style.borderRadius = '50%';
      check.style.padding = '1px';
      check.style.fontSize = '18px';
      btn.appendChild(check);
    } else {
      // Kilitli
      btn.style.background = 'rgba(200,200,210,0.4)';
      btn.style.color = 'rgba(120,120,140,0.7)';
      btn.style.border = '2px solid rgba(150,150,170,0.3)';
      btn.style.fontSize = '14px';
      // 🔒 ikonu - absolute kaldırıldı
      const lock = document.createElement('span');
      lock.className = 'material-symbols-outlined text-gray-500 dark:text-gray-400';
      lock.textContent = 'lock';
      lock.style.fontSize = '22px';
      lock.style.opacity = '0.8';
      btn.appendChild(lock);
    }

    // Seviye numarası
    const num = document.createElement('span');
    num.textContent = String(i);
    num.style.position = 'relative';
    num.style.zIndex = '2';
    if (!isLocked) btn.appendChild(num);

    // Click handler
    btn.addEventListener('click', () => {
      Sounds.playSfx?.('button-tap');
      if (isLocked) {
        Toast.show(t('level_locked_msg') || 'Önce kaldığın seviyeyi bitir!', 'info');
        return;
      }
      router.navigate(`${config.gameRoute}&level=${i}`);
    });

    rowWrap.appendChild(btn);
    list.appendChild(rowWrap);

    buttonRefs.push({ level: i, el: btn, row: rowWrap });
    if (isCurrent) currentLevelEl = rowWrap;
  }
  
  if (config.isEndless) {
    const infWrap = document.createElement('div');
    infWrap.className = 'relative flex items-center justify-center pt-8 pb-12';
    infWrap.style.minHeight = '120px';
    infWrap.innerHTML = `
      <div class="flex flex-col items-center opacity-80 animate-pulse">
        <span class="material-symbols-outlined" style="font-size: 56px; color: ${config.accentFrom}">all_inclusive</span>
        <span class="text-sm font-black tracking-widest uppercase text-gray-500 mt-2" style="color: ${config.accentFrom}">${t('x2_endless_mode') || 'Sonsuz'} ${t('menu_adventure') || 'Macera'}</span>
      </div>
    `;
    list.appendChild(infWrap);
  }

  scrollWrap.appendChild(list);
  container.appendChild(scrollWrap);

  // Pulse keyframes injection (CSS yoksa)
  if (!document.getElementById('map-pulse-style')) {
    const style = document.createElement('style');
    style.id = 'map-pulse-style';
    style.textContent = `
      @keyframes mapPulse {
        0%   { box-shadow: 0 0 0 0    ${config.accentFrom}99; }
        70%  { box-shadow: 0 0 0 18px ${config.accentFrom}00; }
        100% { box-shadow: 0 0 0 0    ${config.accentFrom}00; }
      }
    `;
    document.head.appendChild(style);
  }

  // İlk açılışta current level'ı tam ortada göster
  setTimeout(() => {
    if (currentLevelEl) {
      currentLevelEl.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
  }, 0);

  return container;
}
