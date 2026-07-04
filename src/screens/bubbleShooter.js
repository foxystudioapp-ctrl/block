// Bubble Shooter - canvas tabanlı render + giriş
import { BubbleEngine } from '../game/bubbleEngine.js';
import { createTopBar } from '../components/topBar.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { t } from '../utils/i18n.js';
import { Router } from '../router.js';
import { createModal } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { AdService } from '../services/adService.js';
import { showGameOverModal } from './gameOver.js';
import { checkAndShowTutorial } from '../components/tutorial.js';
import { getTotalLevels } from '../game/bubbleLevels.js';
import { TaskState } from '../state/taskState.js';
import { showQuitConfirmation } from '../utils/quitConfirm.js';
import { createScope } from '../utils/lifecycle.js';

// Skoru kompakt gösterir: 1M altı tam okunur, üstü kısaltılır (1.2M / 3.5B).
// Endless çok uzun oynanınca milyar+ skorların HUD taşmasını önler.
function formatScore(n) {
  n = Math.floor(n || 0);
  if (n >= 1e9) return (n / 1e9).toFixed(n >= 1e10 ? 0 : 1).replace(/\.0$/, '') + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace(/\.0$/, '') + 'M';
  return n.toLocaleString('tr-TR');
}

// Klasik parlak top — radyal gradient + highlight
const COLOR_MAP = {
  red:     { main: '#FF3B6B', dark: '#C4003E', light: '#FFA6C9' },
  blue:    { main: '#00C3FF', dark: '#006699', light: '#A8EDFF' },
  green:   { main: '#00E676', dark: '#008B46', light: '#85FFC2' },
  yellow:  { main: '#FFC800', dark: '#B38B00', light: '#FFF0A8' },
  purple:  { main: '#A45BFF', dark: '#5200CC', light: '#DFBFFF' },
  stone:   { main: '#8A92A3', dark: '#444A59', light: '#D1D5DB' },
  rainbow: { main: '#A855F7', dark: '#5B21B6', light: '#E879F9' },
};

export function BubbleShooter() {
  const queryParams = new URLSearchParams((location.hash.split('?')[1] || ''));
  const mode = queryParams.get('mode') || 'endless';

  const scope = createScope({ name: 'bubble' });
  const setTimeout = scope.setT;
  const requestAnimationFrame = scope.raf;

  let engine = new BubbleEngine(mode);
  window.bubbleEngine = engine;
  window.bubbleApi = {
    getCellRect: (r, c) => {
      const cvs = document.getElementById('bubble-canvas');
      if (!cvs) return { x: 0, y: 0, radius: 0 };
      const rect = cvs.getBoundingClientRect();
      const cellSize = rect.width / (engine.cols + 0.5);
      const radius = cellSize * 0.46;
      const offsetX = cellSize / 4;
      const offsetY = engine.mode === 'endless' ? 80 : 100;
      const pos = engine.getPixelCenter(r, c, cellSize, offsetX, offsetY + (engine.gridOffsetY || 0));
      return { x: rect.left + pos.x, y: rect.top + pos.y, radius };
    },
    getShooterPos: () => {
      const cvs = document.getElementById('bubble-canvas');
      if (!cvs) return { x: 0, y: 0, radius: 0 };
      const rect = cvs.getBoundingClientRect();
      const cellSize = rect.width / (engine.cols + 0.5);
      const radius = cellSize * 0.46;
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height - 30 - radius, radius };
    }
  };
  // Adventure modda kayıtlı seviyeyi engine'e ver. URL'de ?level=N varsa onu kullan.
  if (mode === 'adventure') {
    const urlLevel = parseInt(queryParams.get('level'), 10);
    if (urlLevel >= 1) {
      engine.level = urlLevel;
    } else {
      engine.level = PlayerState.state.bubbleAdventureLevel || 1;
    }
  }
  engine.init();
  // Kayıtlı oyun varsa yükle (sadece endless modunda devam edilebilir)
  if (mode === 'endless') {
    engine.loadState();
  }

  // Konteyner
  const container = document.createElement('div');
  container.className = 'fixed inset-0 flex flex-col bg-gradient-to-b from-indigo-50 to-blue-50 dark:from-gray-900 dark:to-blue-950';

  // Top bar — adventure'da geri haritaya, endless'ta menüye
  const backTarget = (mode === 'adventure') ? '#/adventure-map?game=bubble' : '#/menu';
  const topBar = createTopBar(
    t('menu_bubble') || 'Baloncuk Patlatma',
    true,
    () => {
      showQuitConfirmation(Router, backTarget, {
        text: t('restart') || 'Yeniden Başla',
        primary: false,
        onClick: (closeFn) => {
          closeFn();
          engine.clearSave();
          engine.init();
          updateScore();
          draw();
        }
      });
    }
  );
  container.appendChild(topBar);

  // === Sub-controls (Yardım ve +2 Atış) ===
  let extraShotsCount = 0;
  let endlessDiamondChunks = 0; // endless skor-eşiği ödül sayacı (her 5000 puanda +5 elmas)
  const extraShotsCosts = [50, 150, 300];
  const maxExtraShots = 3;

  const subControls = document.createElement('div');
  subControls.className = 'px-4 md:px-6 lg:px-8 pt-1.5 md:pt-3 lg:pt-4 pb-0 flex items-center justify-between w-full z-30 shrink-0';
  
  let extraShotsHtml = '';
  if (mode === 'adventure') {
    extraShotsHtml = `
      <button id="btn-extra-shots" class="flex items-center gap-1.5 px-2.5 md:px-3 lg:px-4 py-1 md:py-1.5 rounded-full bg-white dark:bg-primary-container border border-black/5 dark:border-white/5 shadow-sm active:scale-95 transition-all shrink-0">
        <span class="material-symbols-outlined text-[14px] md:text-[16px] lg:text-[18px]">add_circle</span>
        <span class="text-[9px] md:text-[11px] lg:text-[13px] font-black tracking-tight leading-none uppercase text-gray-700 dark:text-gray-200">${t('extra_shots_label') || '+2 ATIŞ'}</span>
        <div id="extra-shots-badge" class="flex items-center gap-0.5 bg-cyan-500/10 dark:bg-cyan-500/20 px-1.5 py-0.5 rounded-full ml-0.5 transition-all">
          <span class="material-symbols-outlined text-[10px] md:text-[12px] lg:text-[14px] fill text-cyan-500 dark:text-cyan-400">diamond</span>
          <span id="extra-shots-cost" class="text-[10px] md:text-[11px] lg:text-[13px] font-black text-cyan-600 dark:text-cyan-300 leading-none">${extraShotsCosts[0]}</span>
        </div>
      </button>
    `;
  }

  subControls.innerHTML = `
    <div class="flex items-center space-x-2">
      <button id="btn-help" class="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-black/10 dark:border-white/10 shadow-sm active:scale-90 transition-transform text-red-500 dark:text-red-400 shrink-0">
        <span class="material-symbols-outlined text-[18px] md:text-[20px] lg:text-[22px]">help</span>
      </button>
    </div>
    <div class="flex items-center space-x-2">
      ${extraShotsHtml}
      <button id="btn-hammer" class="flex items-center gap-1.5 px-2.5 md:px-3 lg:px-4 py-1 md:py-1.5 rounded-full bg-white dark:bg-primary-container border border-black/5 dark:border-white/5 shadow-sm active:scale-95 transition-all shrink-0 ml-1">
        <span class="material-symbols-outlined text-[14px] md:text-[16px] lg:text-[18px]">hardware</span>
        <span class="text-[9px] md:text-[11px] lg:text-[13px] font-black tracking-tight leading-none uppercase text-gray-700 dark:text-gray-200">${t('x2_hammer') || 'ÇEKİÇ'}</span>
        <div id="hammer-badge" class="flex items-center gap-0.5 bg-cyan-500/10 dark:bg-cyan-500/20 px-1.5 py-0.5 rounded-full ml-0.5 transition-all">
          <span class="material-symbols-outlined text-[10px] md:text-[12px] lg:text-[14px] fill text-cyan-500 dark:text-cyan-400">diamond</span>
          <span id="hammer-cost" class="text-[10px] md:text-[11px] lg:text-[13px] font-black text-cyan-600 dark:text-cyan-300 leading-none">50</span>
        </div>
      </button>
    </div>
  `;
  container.appendChild(subControls);

  // İpucu butonuna tıklanınca tutorial modalını aç
  setTimeout(() => {
    const btnHelp = subControls.querySelector('#btn-help');
    if (btnHelp) {
      btnHelp.addEventListener('click', () => {
        Sounds.playSfx?.('button-tap');
        checkAndShowTutorial('bubble', true);
      });
    }
  }, 100);

  // === Skor paneli ===
  const scoreSection = document.createElement('div');
  scoreSection.className = 'px-4 md:px-6 lg:px-8 py-1 mt-2 sm:mt-3 md:mt-4 lg:mt-6 flex justify-between items-center w-full shrink-0';
  
  if (mode === 'adventure') {
    scoreSection.innerHTML = `
      <div class="flex flex-col items-center justify-center flex-1">
        <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1 drop-shadow-md">
          <div class="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
          <div class="absolute inset-0 rounded-full border-4 border-t-indigo-400 rotate-45"></div>
          <div class="bg-gradient-to-br from-indigo-500 to-purple-600 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
            <span id="bubble-level" class="text-xl md:text-2xl lg:text-3xl font-black text-white drop-shadow-sm leading-none">${engine.level}</span>
          </div>
          <div class="absolute -top-1.5 -right-1.5 text-sm md:text-base lg:text-xl drop-shadow-md">👑</div>
        </div>
        <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider">${(t('level') || 'SEVİYE').toUpperCase()}</span>
      </div>

      <div class="flex flex-col items-center justify-center flex-1.5 px-2">
        <span class="text-[10px] md:text-xs lg:text-sm font-black text-gray-400 tracking-wider mb-0.5">${(t('score') || 'SKOR').toUpperCase()}</span>
        <span id="bubble-score" class="text-[32px] md:text-[40px] lg:text-[52px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-sm tracking-tight leading-none">0</span>
      </div>

      <div class="flex flex-col items-center justify-center flex-1">
        <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1">
          <div class="absolute inset-0 rounded-full border-2 border-rose-500/30"></div>
          <div class="bg-gradient-to-br from-rose-400 to-red-500 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
            <span class="material-symbols-outlined text-white text-lg md:text-xl lg:text-3xl drop-shadow-sm">my_location</span>
          </div>
        </div>
        <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider mb-0.5">${(t('moves') || 'ATIŞ').toUpperCase()}</span>
        <span id="bubble-shots" class="text-sm md:text-base lg:text-xl font-black text-rose-500">${engine.shotsLeft}</span>
      </div>
    `;
  } else {
    scoreSection.innerHTML = `
      <div class="flex flex-col items-center justify-center flex-1">
        <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1 drop-shadow-md opacity-60">
          <div class="text-3xl lg:text-4xl">♾️</div>
        </div>
        <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider">${(t('mode_classic') || 'KLASİK').toUpperCase()}</span>
      </div>

      <div class="flex flex-col items-center justify-center flex-1.5 px-2">
        <span class="text-[10px] md:text-xs lg:text-sm font-black text-gray-400 tracking-wider mb-0.5">${(t('score') || 'SKOR').toUpperCase()}</span>
        <span id="bubble-score" class="text-[32px] md:text-[40px] lg:text-[52px] font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 drop-shadow-sm tracking-tight leading-none">0</span>
      </div>

      <div class="flex flex-col items-center justify-center flex-1">
        <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1">
          <div class="absolute inset-0 rounded-full border-2 border-orange-500/30"></div>
          <div class="bg-gradient-to-br from-gray-300 to-gray-500 dark:from-slate-600 dark:to-slate-800 w-10 h-10 md:w-12 md:h-12 lg:w-16 lg:h-16 rounded-full flex items-center justify-center shadow-inner border border-white/20">
            <span class="material-symbols-outlined text-white text-lg md:text-xl lg:text-3xl drop-shadow-sm">emoji_events</span>
          </div>
        </div>
        <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider mb-0.5">${(t('record') || 'REKOR').toUpperCase()}</span>
        <span id="bubble-best" class="text-sm md:text-base lg:text-xl font-black text-gray-500">${formatScore(engine.bestScore)}</span>
      </div>
    `;
  }
  container.appendChild(scoreSection);

    let activePowerup = null;

  const updateHammerUI = () => {
    const hammerBtn = container.querySelector('#btn-hammer');
    const hammerCostEl = container.querySelector('#hammer-cost');
    const badgeEl = container.querySelector('#hammer-badge');
    
    if (!hammerBtn || !hammerCostEl) return;

    const costs = [50, 150, 300];
    if (engine.hammerCount >= costs.length) {
      hammerBtn.classList.add('opacity-50', 'pointer-events-none');
      hammerCostEl.textContent = 'MAX';
      const icon = badgeEl.querySelector('.material-symbols-outlined');
      if (icon) icon.style.display = 'none';
      hammerCostEl.classList.remove('text-cyan-600', 'dark:text-cyan-300');
      hammerCostEl.classList.add('text-gray-500', 'dark:text-gray-400');
    } else {
      hammerBtn.classList.remove('opacity-50', 'pointer-events-none');
      hammerCostEl.textContent = costs[engine.hammerCount];
      const icon = badgeEl.querySelector('.material-symbols-outlined');
      if (icon) icon.style.display = '';
      hammerCostEl.classList.remove('text-gray-500', 'dark:text-gray-400');
      hammerCostEl.classList.add('text-cyan-600', 'dark:text-cyan-300');
    }
  };

  function updateExtraShotsUI() {
    const btn = container.querySelector('#btn-extra-shots');
    const badge = container.querySelector('#extra-shots-badge');
    const costEl = container.querySelector('#extra-shots-cost');
    if (!btn || !badge || !costEl) return;
    if (extraShotsCount >= maxExtraShots) {
      btn.classList.add('opacity-50', 'pointer-events-none', 'grayscale');
      costEl.textContent = 'MAX';
      const icon = badge.querySelector('.material-symbols-outlined');
      if (icon) icon.style.display = 'none';
      costEl.classList.remove('text-cyan-600', 'dark:text-cyan-300');
      costEl.classList.add('text-gray-500', 'dark:text-gray-400');
    } else {
      btn.classList.remove('opacity-50', 'pointer-events-none', 'grayscale');
      costEl.textContent = extraShotsCosts[extraShotsCount];
      const icon = badge.querySelector('.material-symbols-outlined');
      if (icon) icon.style.display = '';
      costEl.classList.remove('text-gray-500', 'dark:text-gray-400');
      costEl.classList.add('text-cyan-600', 'dark:text-cyan-300');
    }
  }

  // Canvas
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'flex-1 flex items-center justify-center px-2 overflow-hidden';
  const canvas = document.createElement('canvas');
  canvas.className = 'rounded-2xl shadow-lg bg-white/40 dark:bg-black/30 touch-none';
  canvasWrap.appendChild(canvas);
  container.appendChild(canvasWrap);

  // Boyutları viewport'a göre ayarla
  let cellSize = 36;
  let canvasW = 0, canvasH = 0;
  let offsetX = 0, offsetY = 0;
  let gridOffsetY = 0;
  // Yüksek-DPI'da canvas arka tamponunu SINIRLA. Her balon gölge (shadowBlur) + radial
  // gradient ile çiziliyor ve uçan balon her karede TÜM grid'i yeniden çizdiriyor; bu yüzden
  // ölçeklenmemiş dpr (örn. 3) arka tamponu ~9 kat büyütüp fırlatmayı dondurabiliyordu.
  // Low-end'de 1x (orijinal performans), diğerlerinde en çok 2x (keskinlik/perf dengesi).
  // resizeCanvas ve draw AYNI ölçeği kullanmalı, yoksa içerik yanlış boyutta çizilir.
  const isLowEndDevice = document.documentElement.classList.contains('low-end');
  const renderScale = Math.min(window.devicePixelRatio || 1, isLowEndDevice ? 1 : 2);

  function resizeCanvas() {
    const rect = canvasWrap.getBoundingClientRect();
    const padding = 16;
    const availW = rect.width - padding;
    const availH = rect.height - padding;
    // Genişliği temel al — 9 sütun + 0.5 ofset
    const wByCols = availW / (engine.cols + 0.5);
    const hByRows = availH / ((engine.rows + 2) * 0.866); // +2: nişancı alanı
    cellSize = Math.floor(Math.min(wByCols, hByRows));

    const cssW = cellSize * (engine.cols + 0.5);
    const cssH = cellSize * (engine.rows + 2) * 0.866;
    const dpr = renderScale;

    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    
    canvasW = cssW;
    canvasH = cssH;
    offsetX = 0;
    offsetY = 0;
    gridOffsetY = 0;
    draw();
  }
  setTimeout(() => { resizeCanvas(); updateScore(); updateExtraShotsUI(); updateHammerUI(); }, 0);
  // İlk girişte tutorial (sadece bir kere)
  setTimeout(() => checkAndShowTutorial('bubble'), 500);

  
  // === Hammer Button Hook ===
  setTimeout(() => {
    const hammerBtn = container.querySelector('#btn-hammer');
    if (hammerBtn) {
      hammerBtn.addEventListener('click', () => {
        if (engine.gameOver || engine.levelComplete || flying) return;

        if (activePowerup === 'hammer') {
          activePowerup = null;
          canvas.classList.remove('cursor-crosshair');
          return;
        }

        const costs = [50, 150, 300];
        const currentCost = costs[engine.hammerCount];

        if (engine.hammerCount < costs.length && PlayerState.state.diamonds < currentCost) {
          const modal = createModal({
            title: t('not_enough_diamonds') || 'Yetersiz Elmas',
            content: `
              <div class="flex flex-col items-center p-4">
                <span class="text-5xl mb-3 drop-shadow-md">💎</span>
                <p class="text-sm font-bold text-gray-400 mb-6 text-center">${t('hammer_need_diamonds', { cost: currentCost })}</p>
                <div class="w-full flex flex-col gap-3">
                  <button id="modal-watch-ad" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">play_circle</span>
                    <span>${t('watch_ad_use_hammer')}</span>
                  </button>
                  <button id="modal-buy-diamonds" class="w-full py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary dark:text-white rounded-2xl font-bold active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">shopping_cart</span>
                    <span>${t('buy_diamonds')}</span>
                  </button>
                </div>
              </div>
            `,
            actions: []
          });

          modal.querySelector('#modal-watch-ad').addEventListener('click', async () => {
            Sounds.playSfx('button-tap');
            const success = await AdService.showRewardVideoAd();
            if (success) {
              modal.close();
              PlayerState.addDiamonds(currentCost);
              activePowerup = 'hammer';
              Toast.show(t('click_to_break') || 'Kırmak istediğiniz balona dokunun', 'info');
              canvas.classList.add('cursor-crosshair');
            }
          });

          modal.querySelector('#modal-buy-diamonds').addEventListener('click', () => {
            Sounds.playSfx('button-tap');
            modal.close();
            import('../components/shopModal.js').then(({ showShopModal }) => {
              showShopModal();
            });
          });

        } else if (engine.hammerCount < costs.length) {
          activePowerup = 'hammer';
          Toast.show(t('click_to_break') || 'Kırmak istediğiniz balona dokunun', 'info');
          canvas.classList.add('cursor-crosshair');
        } else {
          Toast.show(t('max_hammer_reached') || 'Maksimum çekiç hakkını doldurdun!', 'warning');
        }
      });
    }
  }, 100);

  // === +2 ATIŞ butonu click handler (adventure modunda) ===
  if (mode === 'adventure') {
    setTimeout(() => {
      const btn = container.querySelector('#btn-extra-shots');
      if (!btn) return;
      btn.addEventListener('click', () => {
        if (engine.gameOver || engine.levelComplete || flying) return;
        if (extraShotsCount >= maxExtraShots) return;
        const cost = extraShotsCosts[extraShotsCount];
        if (PlayerState.useDiamonds(cost)) {
          Sounds.playSfx?.('button-tap');
          extraShotsCount++;
          engine.shotsLeft += 2;
          engine.maxShots += 2;
          updateScore();
          updateExtraShotsUI();
          engine.saveState();
          // +2! pop animasyonu (Block Blast'taki ile aynı stil)
          const pop = document.createElement('div');
          pop.className = 'absolute -top-6 left-1/2 transform -translate-x-1/2 text-cyan-400 font-black text-xl animate-fade-out drop-shadow-md z-50 pointer-events-none';
          pop.textContent = '+2!';
          btn.style.position = 'relative';
          btn.appendChild(pop);
          setTimeout(() => pop.remove(), 1000);
        } else {
          // Yetersiz elmas — reklam izle modalı
          Sounds.playSfx?.('button-tap');
          const adModal = createModal({
            title: t('not_enough_diamonds') || 'Yetersiz Elmas',
            content: `
              <div class="flex flex-col items-center p-4">
                <span class="text-5xl mb-3 drop-shadow-md">💎</span>
                <p class="text-sm font-bold text-gray-400 mb-6 text-center">${(t('need_diamonds_undo') || 'Devam etmek için {cost} elmasa ihtiyacınız var!').replace('{cost}', cost)}</p>
                <div class="w-full flex flex-col gap-3">
                  <button id="modal-ad-shots" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
                    <span class="material-symbols-outlined">play_circle</span>
                    <span>${t('watch_ad_extra_shots') || 'Reklam İzle & +2 Atış'}</span>
                  </button>
                  <button id="modal-ad-close" class="w-full py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary dark:text-white rounded-2xl font-bold active:scale-95 transition-all">
                    <span>${t('cancel') || 'İptal'}</span>
                  </button>
                </div>
              </div>`,
            actions: []
          });
          adModal.querySelector('#modal-ad-shots').addEventListener('click', async () => {
            Sounds.playSfx?.('button-tap');
            const ok = await AdService.showRewardVideoAd();
            if (ok) {
              extraShotsCount++;
              engine.shotsLeft += 2;
              engine.maxShots += 2;
              updateScore();
              updateExtraShotsUI();
              engine.saveState();
            }
            adModal.close();
          });
          adModal.querySelector('#modal-ad-close').addEventListener('click', () => {
            Sounds.playSfx?.('button-tap');
            adModal.close();
          });
        }
      });
    }, 100);
  }
  window.addEventListener('resize', resizeCanvas);

  // Nişancı durumu
  const shooter = {
    x: 0,            // resize'da set edilir
    y: 0,
    angle: -Math.PI / 2, // yukarı
    aiming: false,
  };
  function updateShooterPos() {
    shooter.x = canvasW / 2;
    shooter.y = canvasH - cellSize;
  }

  // Uçan balon (animasyon)
  let flying = null; // { x, y, vx, vy, color }

  // Patlama parçacıkları: { x, y, vx, vy, r, color, life }
  const particles = [];
  const fallingBubbles = [];
  let wobbles = {};
  let floatingTexts = [];
  // Animasyon loop aktif mi
  let fxRafId = null;
  let flyingRafId = null;
  let gridRafId = null;
  function ensureFxLoop() {
    if (fxRafId) return;
    const step = () => {
      let activeWobbles = false;
      for (const key in wobbles) {
        if (wobbles[key].time > 0) {
          wobbles[key].time -= 0.1;
          wobbles[key].vx *= 0.8;
          wobbles[key].vy *= 0.8;
          activeWobbles = true;
        } else {
          delete wobbles[key];
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.35;
        p.life -= 0.025;
        p.r *= 0.96;
        if (p.life <= 0 || p.r < 0.5) particles.splice(i, 1);
      }
      
      for (let i = fallingBubbles.length - 1; i >= 0; i--) {
        const f = fallingBubbles[i];
        f.x += f.vx || 0;
        f.vy += 0.5;
        f.y += f.vy;
        if (f.x < cellSize/2 || f.x > canvasW - cellSize/2) f.vx = -(f.vx || 0) * 0.8;
        f.life -= 0.02;
        if (f.life <= 0 || f.y > canvasH + 40) fallingBubbles.splice(i, 1);
      }
      
      draw();
      if (particles.length || fallingBubbles.length || activeWobbles) {
        fxRafId = requestAnimationFrame(step);
      } else {
        fxRafId = null;
      }
    };
    fxRafId = requestAnimationFrame(step);
  }

  function animateGridDrop() {
    if (gridOffsetY < 0) {
      gridOffsetY += (cellSize * 0.866) / 10;
      if (gridOffsetY > 0) gridOffsetY = 0;
      draw();
      if (gridOffsetY < 0) {
        gridRafId = requestAnimationFrame(animateGridDrop);
      }
    }
  }

  // Patlamadan parçacık oluştur
  function spawnPopParticles(centerX, centerY, color) {
    const COUNT = 8;
    for (let i = 0; i < COUNT; i++) {
      const a = (Math.PI * 2 * i) / COUNT + Math.random() * 0.4;
      const speed = 2 + Math.random() * 2.5;
      particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 1, // yukarı doğru hafif bias
        r: 3 + Math.random() * 2,
        color,
        life: 1,
      });
    }
  }

  // Düşen balon oluştur
  function spawnFallingBubble(centerX, centerY, color) {
    fallingBubbles.push({
      x: centerX,
      y: centerY,
      vy: -2 - Math.random() * 2, // pop upwards slightly first
      vx: (Math.random() - 0.5) * 6, // spread out horizontally
      color,
      life: 1.6,
    });
  }

  function pathCircle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
  }

  // Zarif, Parlak Premium Cam/Şeker Tasarımı
  function drawBubble(ctx, x, y, r, color, isBomb = false) {
    if (r <= 0) return;

    // Hafif gölge (drop-shadow) - Derinlik katar. shadowBlur, Android WebView'in EN pahalı
    // canvas işlemlerinden; her balon için her frame set ediliyor. Düşük-segment cihazlarda
    // kapat (görsel derinlik kaybı minimal, kare hızı kazancı büyük).
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = isLowEndDevice ? 0 : Math.max(2, r * 0.15);
    ctx.shadowOffsetY = isLowEndDevice ? 0 : Math.max(1, r * 0.1);

    // --- TAŞ (engel) ---
    if (color === 'stone') {
      const g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, r * 0.1, x, y, r);
      g.addColorStop(0, '#E5E7EB');
      g.addColorStop(0.55, '#9CA3AF');
      g.addColorStop(1, '#4B5563');
      ctx.fillStyle = g;
      pathCircle(ctx, x, y, r); ctx.fill();
      ctx.shadowColor = 'transparent'; // gölgeyi kapat
      
      // Çatlaklar
      ctx.strokeStyle = 'rgba(0,0,0,0.28)';
      ctx.lineWidth = Math.max(1, r * 0.07);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.5, y - r * 0.2); ctx.lineTo(x - r * 0.05, y + r * 0.1);
      ctx.lineTo(x + r * 0.3, y - r * 0.35); ctx.moveTo(x - r * 0.05, y + r * 0.1);
      ctx.lineTo(x + r * 0.2, y + r * 0.55);
      ctx.stroke();
      return;
    }

    // --- JOKER (rainbow) ---
    if (color === 'rainbow') {
      const segs = ['#FF3B6B', '#FFC800', '#00E676', '#00C3FF', '#A45BFF'];
      ctx.save();
      pathCircle(ctx, x, y, r);
      ctx.clip();
      for (let i = 0; i < segs.length; i++) {
        ctx.fillStyle = segs[i];
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, r * 1.5, (Math.PI * 2 * i) / segs.length - Math.PI / 2,
                         (Math.PI * 2 * (i + 1)) / segs.length - Math.PI / 2);
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.shadowColor = 'transparent';
      
      // İç parlama (ambient glow)
      const gloss = ctx.createRadialGradient(x, y, r * 0.3, x, y, r);
      gloss.addColorStop(0, 'rgba(255,255,255,0.4)');
      gloss.addColorStop(0.8, 'rgba(255,255,255,0.1)');
      gloss.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gloss;
      pathCircle(ctx, x, y, r); ctx.fill();
      
      // Cam yansıması (specular)
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.2, y - r * 0.5, r * 0.45, r * 0.18, -Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const c = COLOR_MAP[color] || COLOR_MAP.red;

    // 1. Zemin (Ana Küre Gradieni)
    const baseGrad = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 0, x, y, r);
    baseGrad.addColorStop(0, c.light);
    baseGrad.addColorStop(0.6, c.main);
    baseGrad.addColorStop(1, c.dark);
    ctx.fillStyle = baseGrad;
    pathCircle(ctx, x, y, r);
    ctx.fill();
    ctx.shadowColor = 'transparent'; // Sonraki katmanlarda gölgeyi kapat

    if (r > 6) {
      // 2. Alt yansıma (Bounce light)
      const bounceGrad = ctx.createLinearGradient(x, y + r * 0.2, x, y + r);
      bounceGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
      bounceGrad.addColorStop(1, 'rgba(255, 255, 255, 0.4)');
      ctx.fillStyle = bounceGrad;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.95, 0, Math.PI * 2);
      ctx.fill();

      // 3. Keskin üst yansıma (Specular highlight) - Cam/Şeker hissi
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.beginPath();
      ctx.ellipse(x - r * 0.15, y - r * 0.5, r * 0.45, r * 0.18, -Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();

      // 4. Nokta parlama (Gleam)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      ctx.arc(x - r * 0.45, y - r * 0.2, r * 0.12, 0, Math.PI * 2);
      ctx.fill();
      
      // 5. İnce çerçeve yansıması (Rim light)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = Math.max(1, r * 0.05);
      pathCircle(ctx, x, y, r - ctx.lineWidth/2);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.beginPath();
      ctx.arc(x - r * 0.2, y - r * 0.2, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- BOMBA göstergesi ---
    if (isBomb && r > 6) {
      // Koyu saydam çekirdek
      ctx.fillStyle = 'rgba(10,10,15,0.7)';
      ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, Math.PI * 2); ctx.fill();
      // Fitil
      ctx.strokeStyle = '#FBBF24';
      ctx.lineWidth = Math.max(1, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(x + r * 0.15, y - r * 0.3);
      ctx.quadraticCurveTo(x + r * 0.4, y - r * 0.5, x + r * 0.35, y - r * 0.15);
      ctx.stroke();
      // Kıvılcım (Glowy)
      ctx.fillStyle = '#FDE68A';
      ctx.shadowColor = '#FDE68A';
      ctx.shadowBlur = 5;
      ctx.beginPath(); ctx.arc(x + r * 0.15, y - r * 0.3, r * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.shadowColor = 'transparent';
    }
  }

  function draw() {
    if (!canvas.getContext) return;
    const ctx = canvas.getContext('2d');
    const dpr = renderScale; // resizeCanvas ile aynı ölçek (uyumsuzluk içerik boyutunu bozar)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);
    
    updateShooterPos();

    const r = cellSize / 2 - 1; // hafif boşluk

    // Tehlike çizgisi
    // Zarif Tehlike Çizgisi
    const dangerY = (engine.rows - 2) * cellSize * 0.866;
    const lineGrad = ctx.createLinearGradient(0, 0, canvasW, 0);
    lineGrad.addColorStop(0, 'rgba(239,68,68,0)');
    lineGrad.addColorStop(0.5, 'rgba(239,68,68,0.5)');
    lineGrad.addColorStop(1, 'rgba(239,68,68,0)');
    ctx.strokeStyle = lineGrad;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, dangerY);
    ctx.lineTo(canvasW, dangerY);
    ctx.stroke();
    
    // Ambient Background Particles (Büyülü Arkaplan Tozları) — her draw'da 20 parçacık
    // Math.sin(Date.now()) ile yeniden hesaplanan salt dekoratif efekt. Düşük-segment
    // cihazlarda tamamen atla (nişan alırken her frame çalışıp gereksiz yük bindiriyordu).
    if (!isLowEndDevice) {
      if (!window.bgParticles) {
        window.bgParticles = Array.from({length: 20}).map(() => ({
          x: Math.random() * canvasW,
          y: Math.random() * canvasH,
          vy: -0.2 - Math.random() * 0.5,
          s: Math.random() * 2 + 1,
          o: Math.random() * 0.5 + 0.1
        }));
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let p of window.bgParticles) {
        p.y += p.vy;
        if (p.y < 0) { p.y = canvasH; p.x = Math.random() * canvasW; }
        ctx.globalAlpha = p.o * (0.5 + 0.5 * Math.sin(Date.now()/500 + p.x));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // Grid balonları
    for (let row = 0; row < engine.rows; row++) {
      for (let col = 0; col < engine.cols; col++) {
        const color = engine.grid[row][col];
        if (!color) continue;
        const isOdd = (row + engine.boardParity) % 2 === 1;
        if (isOdd && col === engine.cols - 1) continue;
        let wx = 0, wy = 0;
        const key = row + ',' + col;
        if (wobbles[key]) { wx = wobbles[key].vx; wy = wobbles[key].vy; }
        const { x, y } = engine.getPixelCenter(row, col, cellSize, offsetX + wx, offsetY + gridOffsetY + wy);
        drawBubble(ctx, x, y, r, color, engine.bomb && engine.bomb[row] && engine.bomb[row][col]);
      }
    }

    // Trajectory (nişan kılavuzu)
    if (shooter.aiming && !flying) {
      drawTrajectory(ctx, r);
    }

    // Nişancı: mevcut + sonraki balon
    const sx = shooter.x;
    const sy = shooter.y;
    // Zarif Fırlatıcı Yüzüğü (Launcher Base)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(sx, sy, r * 1.4, 0, Math.PI * 2);
    ctx.stroke();
    
    // Ok işareti (hedefi gösteren küçük üçgen/gösterge)
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(shooter.angle);
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = engine.currentBubble ? COLOR_MAP[engine.currentBubble].main : 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.moveTo(r * 1.6, 0);
    ctx.lineTo(r * 1.2, -6);
    ctx.lineTo(r * 1.2, 6);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Sonraki balon (sol alt, daha küçük ve yarı saydam tabanda)
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.arc(sx - cellSize * 1.5, sy, r * 0.7, 0, Math.PI*2); ctx.fill();
    drawBubble(ctx, sx - cellSize * 1.5, sy, r * 0.7, engine.nextBubble);
    
    // Mevcut balon
    drawBubble(ctx, sx, sy, r, engine.currentBubble);

    // Uçan balon
    if (flying) {
      drawBubble(ctx, flying.x, flying.y, r, flying.color);
    }

    // Düşen balonlar (tavandan kopanlar)
    for (const f of fallingBubbles) {
      const fr = r * Math.max(0.6, f.life / 1.6);
      drawBubble(ctx, f.x, f.y, fr, f.color);
    }

    // Yumuşak Patlama Parçacıkları (Smooth Particles)
    ctx.globalCompositeOperation = 'lighter'; // Renklerin üst üste binerek parlamasını sağlar
    for (const p of particles) {
      const c = COLOR_MAP[p.color] || COLOR_MAP.red;
      ctx.fillStyle = c.light; // Daha açık renkli, taze kıvılcımlar
      const alpha = Math.max(0, p.life);
      ctx.globalAlpha = alpha;
      
      // Parçacık küçülerek yok olur
      const pr = Math.max(0.1, p.r * (0.2 + 0.8 * alpha));
      ctx.beginPath();
      ctx.arc(p.x, p.y, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;


  }

  // HTML Animations
  function showImplosion(x, y, size, colorName) {
    const colorClassMap = {
      red: 'bg-red-500', blue: 'bg-blue-500', green: 'bg-green-500',
      yellow: 'bg-yellow-400', purple: 'bg-purple-500', cyan: 'bg-cyan-400',
      orange: 'bg-orange-500', pink: 'bg-pink-500',
      stone: 'bg-gray-400', rainbow: 'bg-fuchsia-400'
    };
    const borderClassMap = {
      red: 'border-red-400', blue: 'border-blue-400', green: 'border-green-400',
      yellow: 'border-yellow-300', purple: 'border-purple-400', cyan: 'border-cyan-300',
      orange: 'border-orange-400', pink: 'border-pink-400',
      stone: 'border-gray-300', rainbow: 'border-fuchsia-300'
    };
    const colorClass = colorClassMap[colorName] || 'bg-cyan-500';
    const borderColor = borderClassMap[colorName] || 'border-cyan-300';
    const rect = canvas.getBoundingClientRect();
    
    const fragment = document.createDocumentFragment();
    const cleanupNodes = [];
    
    // Ripple Shockwave
    const ripple = document.createElement('div');
    ripple.className = `fixed z-[9998] pointer-events-none rounded-full ${borderColor} border-4 animate-ripple-out shadow-[0_0_20px_currentColor] mix-blend-screen`;
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${rect.left + x}px`;
    ripple.style.top = `${rect.top + y}px`;
    fragment.appendChild(ripple);
    cleanupNodes.push(ripple);
    
    // Imploding Glow
    const implode = document.createElement('div');
    implode.className = `fixed z-[9999] pointer-events-none rounded-full ${colorClass} animate-block-implode`;
    implode.style.width = `${size}px`;
    implode.style.height = `${size}px`;
    implode.style.left = `${rect.left + x - size/2}px`;
    implode.style.top = `${rect.top + y - size/2}px`;
    fragment.appendChild(implode);
    cleanupNodes.push(implode);
    
    document.body.appendChild(fragment);
    
    setTimeout(() => {
      cleanupNodes.forEach(n => { if (n.parentNode) n.remove(); });
    }, 650);
  }

  function showFloatingText(text, x, y, isCombo, points = 0) {
    const rect = canvas.getBoundingClientRect();
    const floating = document.createElement('div');
    
    if (isCombo) {
      // Büyük kombo pop-up — Classic Block tarzı
      floating.className = 'fixed z-[10000] pointer-events-none select-none flex flex-col items-center justify-center';
      floating.style.left = `${rect.left + rect.width / 2}px`;
      floating.style.top = `${rect.top + rect.height / 2}px`;
      floating.style.transform = 'translate(-50%, -50%) scale(0.1)';
      floating.style.opacity = '0';
      floating.innerHTML = `
        <div class="relative flex flex-col items-center justify-center">
          <div class="absolute inset-0 bg-yellow-400 blur-2xl opacity-50 rounded-full scale-150 animate-pulse"></div>
          <div class="relative z-10 text-[2.5rem] font-black text-transparent bg-clip-text bg-gradient-to-br from-yellow-100 via-yellow-400 to-orange-500 drop-shadow-[0_4px_10px_rgba(251,146,60,0.8)] leading-none italic uppercase tracking-tighter text-center" style="transform: rotate(-5deg);">
            ${text}
          </div>
          ${points > 0 ? `<div class="relative z-10 text-3xl font-extrabold text-white drop-shadow-[0_2px_8px_rgba(0,229,255,1)] mt-1 animate-bounce" style="transform: rotate(2deg);">+${points}</div>` : ''}
        </div>
      `;
      document.body.appendChild(floating);
      
      // Springy zoom-in
      floating.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
      requestAnimationFrame(() => {
        floating.style.transform = 'translate(-50%, -50%) scale(1.2)';
        floating.style.opacity = '1';
        
        // Blur fade-out (Classic Block tarzı)
        setTimeout(() => {
          floating.style.transition = 'all 0.5s ease-in';
          floating.style.transform = 'translate(-50%, -50%) scale(1.5)';
          floating.style.opacity = '0';
          floating.style.filter = 'blur(10px)';
          setTimeout(() => floating.remove(), 500);
        }, 1000);
      });
    } else {
      // Normal puan pop-up — gradient pill
      floating.className = 'fixed z-[10000] pointer-events-none select-none bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-extrabold px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(0,229,255,0.6)] text-lg transition-all duration-700 ease-out';
      const randomOffsetX = (Math.random() - 0.5) * 40;
      floating.style.left = `${rect.left + x + randomOffsetX}px`;
      floating.style.top = `${rect.top + y}px`;
      floating.style.transform = 'translate(-50%, -50%)';
      floating.textContent = text;
      document.body.appendChild(floating);
      
      requestAnimationFrame(() => {
        floating.style.transform = 'translate(-50%, -200%) scale(1.1)';
        floating.style.opacity = '0';
      });
      setTimeout(() => floating.remove(), 1200);
    }
  }

  function drawTrajectory(ctx, r) {
    const stepSize = 12;
    const maxSteps = 200;
    let x = shooter.x;
    let y = shooter.y;
    let dx = Math.cos(shooter.angle) * stepSize;
    let dy = Math.sin(shooter.angle) * stepSize;
    
    const points = [];
    for (let i = 0; i < maxSteps; i++) {
      x += dx;
      y += dy;
      if (x < r) { x = r; dx = -dx; }
      if (x > canvasW - r) { x = canvasW - r; dx = -dx; }
      if (y < r) { points.push({x, y}); break; }
      const hit = checkCollision(x, y, r);
      if (hit) { points.push({x, y}); break; }
      points.push({x, y});
    }

    // Zarif Noktalı Çizgi (Dotted Line Fade)
    const timeOffset = Date.now() / 200;
    const trajColor = engine.currentBubble ? COLOR_MAP[engine.currentBubble].main : '#ffffff';
    
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      const progress = i / points.length;
      // Fade out as it gets further, pulse slightly
      const alpha = Math.max(0.1, (1 - progress * 0.8) * (0.6 + 0.4 * Math.sin(i * 0.5 - timeOffset)));
      const dotRadius = Math.max(1, 3 * (1 - progress * 0.5));
      
      ctx.globalAlpha = alpha;
      ctx.fillStyle = trajColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    
    // Hedef Halkası (Reticle) & Hayalet Balon
    const finalPt = points[points.length - 1];
    if (finalPt) {
      // Şeffaf Hayalet
      ctx.globalAlpha = 0.3;
      drawBubble(ctx, finalPt.x, finalPt.y, r, engine.currentBubble);
      ctx.globalAlpha = 1;
      
      // Hedef Halkası
      const pulse = 1 + 0.1 * Math.sin(Date.now() / 150);
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = trajColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(finalPt.x, finalPt.y, r * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  function checkCollision(x, y, r) {
    // Optimizasyon: tüm tahtayı (108 hücre) taramak yerine, noktanın
    // yakınındaki hücreleri tara. Yörünge çizimi kare başına 200 adım
    // çağırdığı için bu, düşük donanımlı cihazlarda nişan gecikmesini önler.
    const radius = cellSize / 2;
    const rowH = cellSize * 0.866;
    const estRow = Math.round((y - (offsetY + gridOffsetY) - radius) / rowH);
    const rStart = Math.max(0, estRow - 2);
    const rEnd = Math.min(engine.rows - 1, estRow + 2);
    for (let row = rStart; row <= rEnd; row++) {
      const isOdd = (row + engine.boardParity) % 2 === 1;
      const estCol = Math.round((x - offsetX - radius - (isOdd ? radius : 0)) / cellSize);
      const cStart = Math.max(0, estCol - 1);
      const cEnd = Math.min(engine.cols - 1, estCol + 1);
      for (let col = cStart; col <= cEnd; col++) {
        if (!engine.grid[row][col]) continue;
        if (isOdd && col === engine.cols - 1) continue;
        const { x: bx, y: by } = engine.getPixelCenter(row, col, cellSize, offsetX, offsetY + gridOffsetY);
        if (Math.hypot(x - bx, y - by) < r * 1.7) return { row, col };
      }
    }
    return null;
  }

  // Atış animasyonu
  function shoot() {
    if (flying || engine.gameOver) return;
    // Fırlatma hızı EKRAN BOYUTUNA göre ölçeklenmeli. Sabit 14px/kare, tablette cellSize
    // (dolayısıyla tahta) çok daha büyük olduğundan topun tahtayı geçmesi ~2 kat uzun sürer
    // ve YAVAŞ görünürdü (telefon/PC'de küçük tahta → hızlı). Hızı cellSize ile orantılı
    // yaparak tüm cihazlarda aynı "kare/kare" hızı korunur. Referans: telefon cellSize~37 → ~14px.
    // 0.38 < 0.5 olduğundan top kare başına yarım hücreden az ilerler → çarpışma tünelleme riski yok.
    const speed = cellSize * 0.38;
    flying = {
      x: shooter.x,
      y: shooter.y,
      vx: Math.cos(shooter.angle) * speed,
      vy: Math.sin(shooter.angle) * speed,
      color: engine.currentBubble,
    };
    Sounds.playSfx?.('block-place');
    Haptics.vibrate?.('button-tap');
    animateFlying();
  }

  function animateFlying() {
    if (!flying) return;
    const r = cellSize / 2 - 1;
    flying.x += flying.vx;
    flying.y += flying.vy;
    // Yan duvar yansıması
    if (flying.x < r) { flying.x = r; flying.vx = -flying.vx; }
    if (flying.x > canvasW - r) { flying.x = canvasW - r; flying.vx = -flying.vx; }
    // Tavana çarptı veya bir balona çarptı
    const hitWall = flying.y < r;
    const hitBubble = checkCollision(flying.x, flying.y, r);
    if (hitWall || hitBubble) {
      let row, col;
      const prevX = flying.x - flying.vx;
      const prevY = flying.y - flying.vy;

      if (hitBubble) {
        // Çarpılan balonun (hitBubble) boş komşuları arasından, 
        // topun geldiği yöne (1 kare gerisi) en yakın olanı seç.
        const neighbors = engine.getNeighbors(hitBubble.row, hitBubble.col);
        let best = null, bestDist = Infinity;
        for (const n of neighbors) {
          if (engine.grid[n.row][n.col]) continue;
          const { x, y } = engine.getPixelCenter(n.row, n.col, cellSize, offsetX, offsetY + gridOffsetY);
          const d = Math.hypot(prevX - x, prevY - y);
          if (d < bestDist) { bestDist = d; best = n; }
        }
        
        if (best) {
          row = best.row;
          col = best.col;
        } else {
          // Emniyet kemeri
          const target = engine.pixelToCell(prevX, prevY, cellSize, offsetX, offsetY + gridOffsetY);
          row = target.row; col = target.col;
        }
      } else {
        // Sadece tavana çarptıysa
        const target = engine.pixelToCell(prevX, prevY, cellSize, offsetX, offsetY + gridOffsetY);
        row = target.row; col = target.col;
      }
      
      // Son güvenlik kontrolü: Seçilen hedef hala doluysa en yakın boş komşuya it
      if (engine.grid[row] && engine.grid[row][col]) {
        const neighbors = engine.getNeighbors(row, col);
        let best = null, bestDist = Infinity;
        for (const n of neighbors) {
          if (engine.grid[n.row][n.col]) continue;
          const { x, y } = engine.getPixelCenter(n.row, n.col, cellSize, offsetX, offsetY + gridOffsetY);
          const d = Math.hypot(prevX - x, prevY - y);
          if (d < bestDist) { bestDist = d; best = n; }
        }
        if (best) { row = best.row; col = best.col; }
      }
      const color = flying.color;
      const flyingVx = flying.vx;
      const flyingVy = flying.vy;
      const flyingX = flying.x;
      const flyingY = flying.y;
      flying = null;
      const res = engine.attachBubble(row, col, color);
      
      const hitAngle = Math.atan2(flyingVy, flyingVx);
      const neighbors = engine.getNeighbors(row, col);
      for (const n of neighbors) {
        if (engine.grid[n.row] && engine.grid[n.row][n.col]) {
          wobbles[n.row + ',' + n.col] = { vx: Math.cos(hitAngle) * 5, vy: Math.sin(hitAngle) * 5, time: 1.0 };
        }
      }
      
      if (res.multiplier > 1) {
        // Combo yazısı - Classic Block gibi devasa parıltılı popup
        const comboTexts = ['', '', t('combo_super') || 'SÜPER!', t('combo_great') || 'HARİKA!', t('combo_amazing') || 'MÜTHİŞ!', t('combo_legendary') || 'EFSANE!'];
        const comboLabel = comboTexts[Math.min(res.multiplier, 5)] || `x${res.multiplier}`;
        showFloatingText(comboLabel, flyingX, flyingY - 40, true, res.scoreGained);
        
        // Combo sarsıntısı - Classic Block gibi uzun sarsılma
        canvas.parentElement.classList.add('animate-shake');
        setTimeout(() => canvas.parentElement.classList.remove('animate-shake'), 400);
        
        // Combo ses efekti - seviyeye göre artan
        if (res.multiplier >= 3) {
          Sounds.playSfx?.('combo-3x');
        } else {
          Sounds.playSfx?.('combo');
        }
        Haptics.vibrate?.('success');
      }

      if (res.scoreGained > 0) {
        // Normal (kombo olmayan) patlatma
        if (res.multiplier <= 1) {
          // Kısa sarsılma
          canvas.parentElement.classList.add('animate-shake');
          setTimeout(() => canvas.parentElement.classList.remove('animate-shake'), 150);
          // Puan yazısı
          showFloatingText(`+${res.scoreGained}`, flyingX, flyingY - 20, false);
          // Normal patlama sesi
          Sounds.playSfx?.('bubble-pop', { count: (res.popped.length + res.floated.length) });
        } else {
          // Combo'da zaten ses çalındı, ek olarak line-clear ile destekle
          Sounds.playSfx?.('line-clear', { lines: Math.min(res.popped.length, 4) });
        }
        
        Haptics.vibrate?.('line-clear');
        
        // Patlama parçacıkları + Ripple/Implode efekti (her patlayan balonun yerinde)
        for (const { row: pr, col: pc, color: pcolor } of res.popped) {
          const { x: px, y: py } = engine.getPixelCenter(pr, pc, cellSize, offsetX, offsetY);
          spawnPopParticles(px, py, pcolor);
          showImplosion(px, py, cellSize, pcolor);
        }
        // Düşen balonlar + Ripple efekti (tavandan kopanlar)
        for (const { row: fr, col: fc, color: fcolor } of res.floated) {
          const { x: fx, y: fy } = engine.getPixelCenter(fr, fc, cellSize, offsetX, offsetY);
          spawnFallingBubble(fx, fy, fcolor);
          showImplosion(fx, fy, cellSize * 0.8, fcolor);
        }
        
        // Görev ilerlemesini güncelle
        TaskState.updateProgress('bubble_pop', res.popped.length + res.floated.length);
        
        ensureFxLoop();
      }
      engine.advanceAfterShot();
      if (engine.justAddedRow) {
        gridOffsetY = -cellSize * 0.866;
        animateGridDrop();
      }
      updateScore();
      draw();
      if (engine.levelComplete) {
        // Adventure: tahta temizlendi → seviye geçildi
        engine.clearSave();
        showLevelCompleteModal();
      } else if (engine.gameOver) {
        showReviveModal();
      } else {
        engine.saveState();
        // Sonsuz modda periyodik reklam kontrolü
        if (mode === 'endless') {
          AdService.showForcedInterstitial('periodic');
        }
      }
      return;
    }
    draw();
    flyingRafId = requestAnimationFrame(animateFlying);
  }

  function updateScore() {
    const elScore = container.querySelector('#bubble-score');
    if (elScore) elScore.textContent = formatScore(engine.score);

    if (mode === 'adventure') {
      const elShots = container.querySelector('#bubble-shots');
      const elLevel = container.querySelector('#bubble-level');
      if (elShots) elShots.textContent = engine.shotsLeft;
      if (elLevel) elLevel.textContent = engine.level;
    } else {
      const elBest = container.querySelector('#bubble-best');
      if (elBest) elBest.textContent = formatScore(engine.bestScore);
      // Endless ekonomi faucet'i: her 5000 puanda +5 elmas (mütevazı; farm değil, gerçek skor ister).
      const chunks = Math.floor(engine.score / 5000);
      if (chunks > endlessDiamondChunks) {
        const gained = (chunks - endlessDiamondChunks) * 5;
        endlessDiamondChunks = chunks;
        PlayerState.addDiamonds(gained);
        Toast.show(`+${gained} 💎`, 'success');
      }
    }

    // PlayerState'e de en yüksek skoru yansıt
    if (engine.score > (PlayerState.state.bestScoreBubble || 0)) {
      PlayerState.state.bestScoreBubble = engine.score;
      PlayerState.save();
    }
  }

  // ============ LEVEL COMPLETE MODAL (Adventure) ============
  function showLevelCompleteModal() {
    if (container.isLevelUpModalOpen) return;
    container.isLevelUpModalOpen = true;

    // Adventure'da reklam akışı
    AdService.showForcedInterstitial('levelup');

    // Seviye geçince PlayerState'i ilerlet + ELMAS ÖDÜLÜ (ekonomi faucet'i).
    // Bubble eskiden seviye başına HİÇ elmas vermiyordu (tek faucet günlük görevdi); çekiç/+2 atış/
    // revive hep sink olduğundan ekonomi tek yönlü kanıyordu. Diğer modlarla tutarlı, YALNIZCA yeni
    // en yüksek seviyede ödül (replay/farm engeli).
    const currentLevel = engine.level;
    const isLastLevel = currentLevel >= getTotalLevels();
    const isNewLevel = currentLevel >= (PlayerState.state.bubbleAdventureLevel || 1);
    if (isNewLevel) {
      PlayerState.state.bubbleAdventureLevel = Math.min(currentLevel + 1, getTotalLevels());
    }
    const reward = isNewLevel ? Math.min(80, 15 + Math.floor(currentLevel * 1.5) + (engine.lastStars || 1) * 5) : 0;
    if (reward > 0) PlayerState.addDiamonds(reward);
    PlayerState.save();

    Sounds.playSfx?.('level-up');
    Haptics.vibrate?.('success');

    const stars = engine.lastStars || 1;
    const starRow = [1, 2, 3].map(i =>
      `<span class="text-3xl ${i <= stars ? 'text-yellow-400 drop-shadow-[0_2px_6px_rgba(251,191,36,0.6)]' : 'text-gray-300 dark:text-gray-600'}" style="${i === 2 ? 'transform:translateY(-6px) scale(1.15);' : ''}">★</span>`
    ).join('');

    const modal = createModal({
      title: t('level_complete') || 'Seviye Tamamlandı!',
      content: `
        <div class="flex flex-col items-center justify-center text-center gap-4 py-4">
          <div class="flex items-end gap-1.5 mb-1">${starRow}</div>
          <div class="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(251,146,60,0.4)] animate-bounce-soft">
            <span class="text-4xl">⭐</span>
          </div>
          <div>
            <h3 class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500 tracking-tight">${t('congrats') || 'Tebrikler!'}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">${t('level') || 'Seviye'} ${currentLevel}</p>
          </div>
          <div class="w-full bg-black/5 dark:bg-white/5 rounded-2xl p-4 flex justify-between items-center mt-2 border border-black/10 dark:border-white/10">
            <span class="text-sm font-bold text-gray-500">${t('score') || 'Skor'}</span>
            <span class="text-xl font-black text-cyan-500">${formatScore(engine.score)}</span>
          </div>
          ${reward > 0 ? `<div class="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-cyan-400/15 border border-cyan-400/20">
            <span class="material-symbols-outlined text-cyan-400 text-lg" style="font-variation-settings:'FILL' 1;">diamond</span>
            <span class="font-black text-cyan-500">+${reward}</span>
          </div>` : ''}
        </div>
      `,
      actions: isLastLevel ? [
        {
          text: t('back_to_map') || 'Haritaya Dön',
          primary: true,
          onClick: (close) => {
            close();
            container.isLevelUpModalOpen = false;
            Router.navigate('#/adventure-map?game=bubble');
          }
        }
      ] : [
        {
          text: t('next_level') || 'Sonraki Seviye',
          primary: true,
          onClick: (close) => {
            close();
            container.isLevelUpModalOpen = false;
            engine.nextLevel();
            updateScore();
            draw();
            // Seviye barında level numarasını yansıt
            const elLevel = container.querySelector('#bubble-level');
            if (elLevel) elLevel.textContent = engine.level;
          }
        },
        {
          text: t('back_to_map') || 'Haritaya Dön',
          primary: false,
          onClick: (close) => {
            close();
            container.isLevelUpModalOpen = false;
            Router.navigate('#/adventure-map?game=bubble');
          }
        }
      ]
    });
  }

  // ============ 2. ŞANS MODAL ============
  function showReviveModal() {
    if (container.isGameOverModalOpen) return;
    container.isGameOverModalOpen = true;

    // Mod'a göre metin seç
    const isAdv = mode === 'adventure';
    const descKey   = isAdv ? 'revive_desc_bubble_adv'     : 'revive_desc_bubble';
    const diaKey    = isAdv ? 'revive_diamonds_bubble_adv' : 'revive_diamonds_bubble';
    const adKey     = isAdv ? 'revive_ad_bubble_adv'       : 'revive_ad_bubble';
    const descFb    = isAdv ? 'Seviyeyi bitirmen için 6 ek atış kazanacaksın!' : 'Alt 2 satır temizlenecek, oyuna devam edebilirsin!';
    const diaFb     = '300 Elmas Harca';
    const adFb      = 'Reklam İzle & Devam Et';

    const modal = createModal({
      title: t('second_chance') || 'İkinci Şans',
      content: `
        <div class="flex flex-col items-center p-4">
          <span class="text-5xl mb-3 drop-shadow-md">💖</span>
          <p class="text-sm font-bold text-gray-400 mb-6 text-center">${t(descKey) || descFb}</p>
          <div class="w-full flex flex-col gap-3">
            <button id="modal-revive-diamonds" class="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(236,72,153,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined fill">diamond</span>
              <span>${t(diaKey) || diaFb}</span>
            </button>
            <button id="modal-revive-ad" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined">play_circle</span>
              <span>${t(adKey) || adFb}</span>
            </button>
            <button id="modal-revive-giveup" class="w-full py-4 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary dark:text-white rounded-2xl font-bold active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center gap-2">
              <span>${t('give_up') || 'Pes Et'}</span>
            </button>
          </div>
        </div>
      `,
      actions: []
    });

    const doRevive = () => {
      engine.revive();
      container.isGameOverModalOpen = false;
      modal.close();
      updateScore(); // shotsLeft güncellenmesi için (adventure)
      draw();
    };

    const showActualGameOver = () => {
      container.isGameOverModalOpen = false;
      modal.close();
      engine.clearSave();
      setTimeout(() => {
        showGameOverModal({
          score: engine.score,
          mode: 'bubble',
          onPlayAgain: () => {
            engine.clearSave();
            engine.init();
            updateScore();
            draw();
          },
          onMainMenu: () => Router.navigate(mode === 'adventure' ? '#/adventure-map?game=bubble' : '#/menu'),
        });
      }, 300);
    };

    modal.querySelector('#modal-revive-diamonds').addEventListener('click', () => {
      Sounds.playSfx?.('button-tap');
      if (PlayerState.useDiamonds(300)) {
        doRevive();
      } else {
        Toast.show(t('not_enough_diamonds') || 'Yetersiz elmas!', 'error');
      }
    });

    modal.querySelector('#modal-revive-ad').addEventListener('click', async () => {
      Sounds.playSfx?.('button-tap');
      const success = await AdService.showRewardVideoAd();
      if (success) doRevive();
    });

    modal.querySelector('#modal-revive-giveup').addEventListener('click', () => {
      Sounds.playSfx?.('button-tap');
      showActualGameOver();
    });
  }

  // Input - nişan al ve fırlat
  function getCanvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  // Nişan alırken her touchmove/mousemove tüm tahtayı yeniden çizmesin: bir frame içindeki
  // çok sayıda hareketi tek draw'a birleştir (rAF-throttle). Aksi halde parmak sürüklenirken
  // draw() 60+/sn'nin en pahalı yolunda (shadowBlur + gradient'li ~108 balon) çağrılıp ucuz
  // cihazlarda takılmaya yol açıyordu.
  let _aimRafId = null;
  function scheduleAimDraw() {
    if (_aimRafId) return;
    _aimRafId = requestAnimationFrame(() => { _aimRafId = null; draw(); });
  }

  function updateAim(clientX, clientY) {
    const { x, y } = getCanvasPos(clientX, clientY);
    const dx = x - shooter.x;
    const dy = y - shooter.y;
    let angle = Math.atan2(dy, dx);
    // Sadece yukarı yönde (-PI ile 0 arası), aşırı yatayı kısıtla
    const minA = -Math.PI + 0.2;
    const maxA = -0.2;
    if (angle > maxA) angle = maxA;
    if (angle < minA) angle = minA;
    shooter.angle = angle;
    shooter.aiming = true;
    scheduleAimDraw();
  }

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    const { x, y } = getCanvasPos(e.clientX, e.clientY);
    
    if (activePowerup === 'hammer') {
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      const hit = engine.useHammer(row, col);
      if (hit) {
        activePowerup = null;
        canvas.classList.remove('cursor-crosshair');
        updateHammerUI();
        Sounds.playSfx?.('block-break');
        draw();
        for(let i=0; i<15; i++) {
          particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 1, color: '#A45BFF'
          });
        }
      }
      return;
    }

    if (Math.hypot(x - (shooter.x - cellSize * 1.5), y - shooter.y) < cellSize) {
      engine.swapBubbles();
      Sounds.playSfx?.('button-tap');
      draw();
      return;
    }
    updateAim(e.clientX, e.clientY);
  });
  canvas.addEventListener('mousemove', (e) => {
    if (e.buttons === 1) updateAim(e.clientX, e.clientY);
  });
  canvas.addEventListener('mouseup', (e) => {
    if (shooter.aiming) {
      shooter.aiming = false;
      shoot();
    }
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t0 = e.touches[0];
    const { x, y } = getCanvasPos(t0.clientX, t0.clientY);
    
    if (activePowerup === 'hammer') {
      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);
      const hit = engine.useHammer(row, col);
      if (hit) {
        activePowerup = null;
        canvas.classList.remove('cursor-crosshair');
        updateHammerUI();
        Sounds.playSfx?.('block-break');
        draw();
        for(let i=0; i<15; i++) {
          particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 1, color: '#A45BFF'
          });
        }
      }
      return;
    }

    if (Math.hypot(x - (shooter.x - cellSize * 1.5), y - shooter.y) < cellSize) {
      engine.swapBubbles();
      Sounds.playSfx?.('button-tap');
      draw();
      return;
    }
    updateAim(t0.clientX, t0.clientY);
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t0 = e.touches[0];
    updateAim(t0.clientX, t0.clientY);
  }, { passive: false });
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (shooter.aiming) {
      shooter.aiming = false;
      shoot();
    }
  }, { passive: false });

  container.cleanup = () => {
    scope.destroy();              // izlenen setTimeout + RAF iptali
    if (topBar.cleanup) topBar.cleanup();   // L1: PlayerState aboneliğini bırak (leak fix)
    window.removeEventListener('resize', resizeCanvas);
    AdService.hideBanner();
    if (fxRafId) cancelAnimationFrame(fxRafId);
    if (gridRafId) cancelAnimationFrame(gridRafId);
    if (flyingRafId) cancelAnimationFrame(flyingRafId);
    engine = null;
    // Global referansları bırak: aksi halde engine/grid closure'ları sonsuza dek
    // bellekte kalır ve bgParticles bir sonraki açılışta bayat (eski canvas boyutu) kalır.
    delete window.bubbleEngine;
    delete window.bubbleApi;
    delete window.bgParticles;
  };

  // Banner için altta boşluk (banner canvas'ı kapatmasın)
  const bannerSpacer = document.createElement('div');
  bannerSpacer.className = 'w-full h-[65px] pointer-events-none shrink-0';
  container.appendChild(bannerSpacer);

  // Banner reklamı göster (oyun ekranının altında)
  AdService.showBanner();

  return container;
}
