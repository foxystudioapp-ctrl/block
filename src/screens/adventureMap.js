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
import { Haptics } from '../utils/haptics.js';
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
  // Sonsuz modda config.total (300) anlamsız bir tavan; ilerleme görünür aralığa (displayTotal) göre hesaplanır.
  const pctDenom = config.isEndless ? displayTotal : config.total;
  const pct = Math.min(100, Math.round((currentLevel / pctDenom) * 100));
  progressSection.innerHTML = `
    <div class="flex justify-between items-center mb-1.5">
      <span class="text-sm font-black tracking-tight text-gray-700 dark:text-gray-200">
        ${t('level') || 'Seviye'} <span class="text-transparent bg-clip-text" style="background-image:linear-gradient(to right, ${config.accentFrom}, ${config.accentTo});-webkit-background-clip:text;">${currentLevel}</span>
        ${config.isEndless ? '' : `<span class="text-gray-400 dark:text-gray-500">/ ${config.total}</span>`}
      </span>
      ${config.isEndless ? `<span class="material-symbols-outlined text-[18px] text-gray-500 dark:text-gray-400">all_inclusive</span>` : `<span class="text-xs font-bold text-gray-500 dark:text-gray-400">${pct}%</span>`}
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

  // ---- Windowed (sanal) seviye render'ı ----
  // 100-320 satırı bir anda DOM'a basmak low-end'de açılış hitch'i + bellek yaratıyordu.
  // Satırlar absolute konumlandırılır; yalnız görünür pencere (+ buffer) render edilir.
  // `list` tam yüksekliği koruduğundan scroll bar doğru kalır.
  const ROW_H = 90;
  const TOP_PAD = 140;
  const BUFFER = 6; // viewport üstü/altı tampon satır sayısı
  const rowTop = (i) => TOP_PAD + (i - 1) * ROW_H;

  // Tek bir seviye satırı üretir (absolute konumlandırılmış).
  function createRow(i) {
    const isCompleted = i < currentLevel;
    const isCurrent = i === currentLevel;
    const isLocked = i > currentLevel;
    const isMilestone = i % 10 === 0 || i === 1 || i === displayTotal;

    const rowWrap = document.createElement('div');
    rowWrap.className = 'absolute left-0 right-0 flex items-center';
    rowWrap.style.height = '90px';
    rowWrap.style.top = rowTop(i) + 'px';

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
      pulse.style.animation = `mapPulse_${game} 1.8s ease-out infinite`;
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

    rowWrap.appendChild(btn);
    return rowWrap;
  }

  // Liste yüksekliği: satırlar absolute olduğundan scroll bar doğru olsun diye full yükseklik.
  list.style.paddingTop = '0px';
  list.style.minHeight = `${rowTop(displayTotal) + ROW_H + 160}px`;

  // Sonsuz mod göstergesi (en altta, absolute).
  if (config.isEndless) {
    const infWrap = document.createElement('div');
    infWrap.className = 'absolute left-0 right-0 flex items-center justify-center pointer-events-none';
    infWrap.style.top = `${rowTop(displayTotal) + ROW_H}px`;
    infWrap.innerHTML = `
      <div class="flex flex-col items-center opacity-80 animate-pulse">
        <span class="material-symbols-outlined" style="font-size: 56px; color: ${config.accentFrom}">all_inclusive</span>
        <span class="text-sm font-black tracking-widest uppercase text-gray-500 mt-2" style="color: ${config.accentFrom}">${t('x2_endless_mode') || 'Sonsuz'} ${t('menu_adventure') || 'Macera'}</span>
      </div>
    `;
    list.appendChild(infWrap);
  }

  // B4: tüm seviye butonları için TEK delege click (her satıra ayrı listener yok).
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-level]');
    if (!btn) return;
    const lvl = parseInt(btn.dataset.level, 10);
    Sounds.playSfx?.('button-tap');
    if (lvl > currentLevel) {
      Toast.show(t('level_locked_msg') || 'Önce kaldığın seviyeyi bitir!', 'info');
      return;
    }
    Sounds.playSfx('button-tap');
    Haptics.vibrate('light');
    const separator = config.gameRoute.includes('?') ? '&' : '?';
    router.navigate(`${config.gameRoute}${separator}level=${lvl}`);
  });

  // Windowing: yalnız görünür pencereyi (+ buffer) DOM'da tut.
  const rendered = new Map(); // level -> rowWrap
  function updateWindow() {
    const scrollTop = scrollWrap.scrollTop;
    const vh = scrollWrap.clientHeight || window.innerHeight;
    let first = Math.floor((scrollTop - TOP_PAD) / ROW_H) - BUFFER;
    let last = Math.ceil((scrollTop + vh - TOP_PAD) / ROW_H) + BUFFER;
    first = Math.max(1, first);
    last = Math.min(displayTotal, last);
    for (const [lvl, el] of rendered) {
      if (lvl < first || lvl > last) { el.remove(); rendered.delete(lvl); }
    }
    for (let i = first; i <= last; i++) {
      if (!rendered.has(i)) {
        const row = createRow(i);
        list.appendChild(row);
        rendered.set(i, row);
      }
    }
  }

  let scrollRaf = false;
  const onScroll = () => {
    if (scrollRaf) return;
    scrollRaf = true;
    requestAnimationFrame(() => { scrollRaf = false; updateWindow(); });
  };
  scrollWrap.addEventListener('scroll', onScroll, { passive: true });

  scrollWrap.appendChild(list);
  container.appendChild(scrollWrap);

  // Pulse keyframes injection. Tek bir paylaşılan id ilk açılan modun rengini sabitliyordu;
  // mod başına ayrı id kullanılır, böylece her macera kendi accent rengini alır.
  const pulseStyleId = `map-pulse-style-${game}`;
  if (!document.getElementById(pulseStyleId)) {
    const style = document.createElement('style');
    style.id = pulseStyleId;
    style.textContent = `
      @keyframes mapPulse_${game} {
        0%   { box-shadow: 0 0 0 0    ${config.accentFrom}99; }
        70%  { box-shadow: 0 0 0 18px ${config.accentFrom}00; }
        100% { box-shadow: 0 0 0 0    ${config.accentFrom}00; }
      }
    `;
    document.head.appendChild(style);
  }

  // İlk açılış: current level'ı ortala (aritmetik), sonra ilk pencereyi render et.
  const initTimer = setTimeout(() => {
    if (!container.isConnected) return;
    const vh = scrollWrap.clientHeight || window.innerHeight;
    const target = rowTop(currentLevel) + ROW_H / 2 - vh / 2;
    scrollWrap.scrollTop = Math.max(0, target);
    updateWindow();
  }, 0);

  container.cleanup = () => {
    clearTimeout(initTimer);
    scrollWrap.removeEventListener('scroll', onScroll);
    rendered.clear();
  };

  return container;
}
