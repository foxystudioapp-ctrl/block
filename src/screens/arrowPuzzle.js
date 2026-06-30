// Ok Bulmacası ekranı (canvas)
// Akış: menü kartı → doğrudan bu ekran (mevcut seviye). Geri tuşu → harita.
import { ArrowEngine } from '../game/arrowEngine.js';
import { DIRS, getTotalArrowLevels, getShapeColor, getShapeName } from '../game/arrowLevels.js';
import { createTopBar } from '../components/topBar.js';
import { createModal } from '../components/modal.js';
import { PlayerState } from '../state/playerState.js';
import { Sounds } from '../utils/sounds.js';
import { Haptics } from '../utils/haptics.js';
import { t } from '../utils/i18n.js';
import { AdService } from '../services/adService.js';
import { TaskState } from '../state/taskState.js';
import { Storage } from '../utils/storage.js';
import { checkAndShowTutorial } from '../components/tutorial.js';
import { showQuitConfirmation } from '../utils/quitConfirm.js';
import { Toast } from '../components/toast.js';
import { createScope } from '../utils/lifecycle.js';
import { recordArrowOutcome } from '../utils/arrowTelemetry.js';

const MAP_ROUTE = '#/adventure-map?game=arrow';

export function ArrowPuzzle(router) {
  let activeBodyAppends = [];

  // Birleşik yaşam döngüsü sözleşmesi: setTimeout/RAF izlenir; cleanup'ta scope.destroy()
  // ile iptal edilir. NOT: arrowPuzzle çıkışta engine.saveState() yapar — bu yüzden
  // engine BİLEREK null'lanmaz (save bozulmasın).
  const scope = createScope({ name: 'arrow' });
  const setTimeout = scope.setT;
  const requestAnimationFrame = scope.raf;

  const queryParams = new URLSearchParams(location.hash.split('?')[1] || '');
  const mode = queryParams.get('mode');
  const urlLevel = parseInt(queryParams.get('level'), 10);
  
  let startLevel;
  if (mode === 'endless') {
    // Endless = rastgele seviye (sıralı ilerleme yok). Her girişte/sonraki'de yeni rastgele tahta.
    startLevel = Math.floor(Math.random() * getTotalArrowLevels()) + 1;
  } else {
    startLevel = (!isNaN(urlLevel) && urlLevel > 0)
      ? urlLevel
      : (PlayerState.state.arrowAdventureLevel || 1);
  }

  const engine = new ArrowEngine();
  // Bayrakları İLK init'ten ÖNCE ayarla (init bunları sıfırlamaz → bir kez yeterli):
  //  - starsEnabled: endless macera yıldız tablosunu kirletmesin.
  //  - denseLevels: endless tahtaları cap içinde en yoğun ölçeğe çıksın (daha büyük/zor).
  engine.starsEnabled = (mode !== 'endless');
  engine.denseLevels = (mode === 'endless');
  engine.init(startLevel);
  if (mode !== 'endless' && engine.loadState && engine.loadState()) { /* sürdürüldü */ }

  // Endless ödülü küçük (stars*5 = 5-15) olduğundan ipucu maliyeti orada daha düşük; aksi halde
  // tek ipucu (50) ödülün katı olup elmas kanatıyordu. Macera ödülü büyük → standart maliyet.
  // Ekonomi yeniden dengelendi: maliyetler düştü (ipucu/can artık seviye ödülüyle uyumlu).
  const HINT_COSTS = mode === 'endless' ? [15, 30, 50] : [30, 80, 150];
  const HEART_BOOST_COST = 50;   // mid-level +1 can booster'ı (AYARLANABİLİR)
  const MAX_BOOST_HEARTS = 9;    // can dolma tavanı (HUD taşmasını önler)
  let clearStreak = 0;           // ardışık başarılı temizleme (yanlış dokunuşta sıfırlanır)
  let hintUsages = 0;
  let lastWrongAt = 0;           // son yanlış dokunuş zamanı (grace/tolerans penceresi için)

  // Dark mode'u bir kez değerlendir; her karo/karede window.matchMedia(...) parse etmek
  // yerine 'change' olayında güncelle (low-end'de kare başına onlarca parse'ı önler).
  const _darkMql = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  let isDarkMode = _darkMql ? _darkMql.matches : false;
  if (_darkMql) scope.on(_darkMql, 'change', (e) => { isDarkMode = e.matches; });

  // ===== Konteyner =====
  const container = document.createElement('div');
  container.className = 'w-full max-w-full lg:max-w-2xl mx-auto h-[100dvh] flex flex-col bg-bg-light dark:bg-primary text-primary dark:text-white select-none relative overflow-hidden';

  const backTarget = mode === 'endless' ? '#/menu' : MAP_ROUTE;
  const goBack = () => {
    // Endless'ta 'arrow_save' anahtarına yazma — macera yarım-seviye kaydını ezmesin.
    if (mode !== 'endless' && engine && engine.saveState) engine.saveState();
    showQuitConfirmation(router, backTarget, {
      text: t('restart') || 'Yeniden Başla',
      primary: false,
      onClick: (closeFn) => {
        closeFn();
        engine.init(engine.level);
        hintUsages = 0; clearStreak = 0; // B2: yeniden başlatınca ipucu/kombo da sıfırlansın
        captureShape();
        reveals.clear();
        winGlowT0 = 0; viewScale = 1; viewX = 0; viewY = 0; renderHearts(); renderHintBadge(); resize(); startEntrance(); resetHintTimer(); ensureLoop();
      }
    });
  };
  const topBar = createTopBar(t('menu_arrow') || 'Ok Bulmacası', true, goBack);
  container.appendChild(topBar);

  // ===== SUB CONTROLS (Help / Tutorial & +3 Lives Boost) =====
  const subControls = document.createElement('div');
  subControls.className = 'px-4 md:px-6 lg:px-8 pt-1.5 md:pt-3 lg:pt-4 pb-0 flex items-center justify-between w-full z-30 shrink-0';
  subControls.innerHTML = `
    <!-- Sol: Yardım Butonu -->
    <div class="flex items-center space-x-2">
      <button id="btn-help" class="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center border border-black/10 dark:border-white/10 shadow-sm active:scale-90 transition-transform text-red-500 dark:text-red-400">
        <span class="material-symbols-outlined text-[18px] md:text-[20px] lg:text-[22px]">help</span>
      </button>
    </div>

    <!-- Sağ: +3 Can Satın Alma Butonu (Klasik mod geri al tasarımı) -->
    <div class="flex items-center space-x-2">
      <button id="arrow-heart-boost" class="flex items-center gap-1.5 px-2.5 md:px-3 lg:px-4 py-1 md:py-1.5 rounded-full bg-white dark:bg-primary-container border border-black/5 dark:border-white/5 shadow-sm active:scale-95 transition-all shrink-0">
        <span class="material-symbols-outlined text-[14px] md:text-[16px] lg:text-[18px] text-pink-500" style="font-variation-settings:'FILL' 1;">favorite</span>
        <span class="text-[9px] md:text-[11px] lg:text-[13px] font-black tracking-tight leading-none uppercase text-gray-700 dark:text-gray-200">+3 ${(t('lives') || 'CAN')}</span>
        <div class="flex items-center gap-0.5 bg-cyan-500/10 dark:bg-cyan-500/20 px-1.5 py-0.5 rounded-full ml-0.5 transition-all">
          <span class="material-symbols-outlined text-[10px] md:text-[12px] lg:text-[14px] fill text-cyan-500 dark:text-cyan-400">diamond</span>
          <span class="text-[10px] md:text-[11px] lg:text-[13px] font-black text-cyan-600 dark:text-cyan-300 leading-none">${HEART_BOOST_COST}</span>
        </div>
      </button>
    </div>
  `;
  container.appendChild(subControls);

  const helpBtn = subControls.querySelector('#btn-help');
  if (helpBtn) {
    helpBtn.onclick = () => {
      if (Sounds && Sounds.playSfx) Sounds.playSfx('button-tap');
      checkAndShowTutorial('arrow', true);
    };
  }

  // ===== HUD (diğer modlarla aynı: seviye rozeti / canlar / rekor rozeti) =====
  const hud = document.createElement('div');
  hud.className = 'w-full px-4 pt-4 sm:pt-5 md:pt-6 lg:pt-8 pb-2 flex items-center justify-between shrink-0';
  
  const hintHtml = `
      <div class="flex flex-col items-center justify-center flex-1 relative">
        <div class="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-1">
          <button id="arrow-top-hint" class="bg-gradient-to-br from-amber-300 to-yellow-500 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-inner border border-white/20 active:scale-90 transition-transform">
            <span class="material-symbols-outlined text-white text-lg md:text-2xl drop-shadow-sm" style="font-variation-settings:'FILL' 1;">lightbulb</span>
          </button>
          <div id="arrow-hint-badge" class="absolute -top-1.5 -right-5 flex items-center gap-0.5 bg-white/90 dark:bg-slate-800/90 px-1.5 py-0.5 rounded-full border border-cyan-500/30 shadow-sm z-10 whitespace-nowrap backdrop-blur-sm flex-row-reverse">
            <span class="material-symbols-outlined text-[9px] md:text-[10px] fill text-cyan-500 dark:text-cyan-400" style="font-variation-settings:'FILL' 1;">diamond</span>
            <span id="arrow-hint-cost" class="text-[9px] md:text-[10px] font-black text-cyan-600 dark:text-cyan-300 leading-none">50</span>
          </div>
        </div>
        <span class="text-[9px] md:text-[10px] font-black text-gray-400 tracking-wider mb-0.5 mt-0.5">${(t('hint') || 'İPUCU').toUpperCase()}</span>
      </div>
  `;

  if (mode === 'endless') {
    hud.innerHTML = `
      <div class="flex flex-col items-center justify-center flex-1">
        <div class="relative w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 flex items-center justify-center mb-1 drop-shadow-md opacity-60">
          <div class="text-3xl lg:text-4xl">♾️</div>
        </div>
        <span class="text-[9px] md:text-[10px] lg:text-[12px] font-black text-gray-400 tracking-wider">${(t('x2_play_now') || 'Hemen Oyna').toUpperCase()}</span>
      </div>

      <div class="flex flex-col items-center justify-center flex-1 px-1">
        <div id="arrow-hearts" class="flex items-center justify-center gap-1 mb-1 flex-wrap"></div>
        <span class="text-[9px] md:text-[10px] font-black text-gray-400 tracking-wider">${(t('lives') || 'CAN').toUpperCase()}</span>
      </div>

      ${hintHtml}
    `;
  } else {
    hud.innerHTML = `
      <div class="flex flex-col items-center justify-center flex-1">
        <div class="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center mb-1 drop-shadow-md">
          <div class="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
          <div class="absolute inset-0 rounded-full border-4 border-t-cyan-400 rotate-45"></div>
          <div class="bg-gradient-to-br from-cyan-500 to-indigo-600 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-inner border border-white/20">
            <span id="arrow-level" class="text-xl md:text-2xl font-black text-white drop-shadow-sm leading-none">${engine.level}</span>
          </div>
          <div class="absolute -top-1.5 -right-1.5 text-sm md:text-base drop-shadow-md">👑</div>
        </div>
        <span class="text-[9px] md:text-[10px] font-black text-gray-400 tracking-wider">${(t('level') || 'SEVİYE').toUpperCase()}</span>
      </div>

      <div class="flex flex-col items-center justify-center flex-1 px-1">
        <div id="arrow-hearts" class="flex items-center justify-center gap-1 mb-1 flex-wrap"></div>
        <span class="text-[9px] md:text-[10px] font-black text-gray-400 tracking-wider">${(t('lives') || 'CAN').toUpperCase()}</span>
      </div>

      ${hintHtml}
    `;
  }
  container.appendChild(hud);

  // ===== Hedef etiketi (gizli resmin adı — oynarken amaç görünür) =====
  const goalLabel = document.createElement('div');
  goalLabel.className = 'w-full flex items-center justify-center gap-1.5 pb-1 shrink-0';
  container.appendChild(goalLabel);
  function updateGoalLabel() {
    const name = getShapeName(engine.shape);
    goalLabel.innerHTML = `
      <span class="material-symbols-outlined text-[14px] text-cyan-500/80 dark:text-cyan-400/80" style="font-variation-settings:'FILL' 1;">image</span>
      <span class="text-[11px] md:text-xs font-bold text-gray-400 tracking-wide uppercase">${t('arrow_goal') || 'Hedef'}:</span>
      <span class="text-[12px] md:text-sm font-black text-gray-600 dark:text-gray-200">${name}</span>
    `;
  }
  updateGoalLabel();

  const heartsEl = hud.querySelector('#arrow-hearts');
  const levelEl = hud.querySelector('#arrow-level');

  function renderHearts() {
    let html = '';
    for (let i = 0; i < engine.maxHearts; i++) {
      const filled = i < engine.hearts;
      html += `<span class="material-symbols-outlined text-lg md:text-xl ${filled ? 'text-rose-500' : 'text-gray-300 dark:text-gray-700'}" style="font-variation-settings:'FILL' ${filled ? 1 : 0};">favorite</span>`;
    }
    heartsEl.innerHTML = html;
  }
  function renderHintBadge() {
    const btn = hud.querySelector('#arrow-top-hint');
    const badge = hud.querySelector('#arrow-hint-badge');
    if (!btn || !badge) return;
    
    if (hintUsages >= HINT_COSTS.length) {
      btn.className = 'bg-gradient-to-br from-gray-400 to-gray-500 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-inner border border-white/20';
      badge.innerHTML = `<span class="text-[8px] md:text-[9px] font-black text-gray-400 leading-none px-0.5 py-0.5">${t('hint_exhausted') || 'BİTTİ'}</span>`;
      badge.className = 'absolute -top-1.5 -right-5 flex items-center gap-0.5 bg-white/90 dark:bg-slate-800/90 px-1.5 py-0.5 rounded-full border border-gray-400/30 shadow-sm z-10 whitespace-nowrap backdrop-blur-sm';
    } else {
      btn.className = 'bg-gradient-to-br from-amber-300 to-yellow-500 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-inner border border-white/20 active:scale-90 transition-transform';
      const costSpan = badge.querySelector('#arrow-hint-cost');
      if (costSpan) {
        costSpan.textContent = HINT_COSTS[hintUsages];
      } else {
        badge.innerHTML = `
          <span class="material-symbols-outlined text-[9px] md:text-[10px] fill text-cyan-500 dark:text-cyan-400" style="font-variation-settings:'FILL' 1;">diamond</span>
          <span id="arrow-hint-cost" class="text-[9px] md:text-[10px] font-black text-cyan-600 dark:text-cyan-300 leading-none">${HINT_COSTS[hintUsages]}</span>
        `;
      }
      badge.className = 'absolute -top-1.5 -right-5 flex flex-row-reverse items-center gap-0.5 bg-white/90 dark:bg-slate-800/90 px-1.5 py-0.5 rounded-full border border-cyan-500/30 shadow-sm z-10 whitespace-nowrap backdrop-blur-sm';
    }
  }
  renderHintBadge();

  // ===== Canvas =====
  const canvasWrap = document.createElement('div');
  canvasWrap.className = 'flex-1 w-full flex items-center justify-center min-h-0 px-3 pb-3 relative';
  const canvas = document.createElement('canvas');
  canvas.className = 'w-full h-full';
  canvas.style.touchAction = 'none';
  canvasWrap.appendChild(canvas);

  // (Eski absolute konumlu hintBtn kaldırıldı)

  container.appendChild(canvasWrap);
  const ctx = canvas.getContext('2d');

  // ===== Gizli resim (silüet) + zoom/pan durumu =====
  let shapeSet = new Set();      // tam şekil hücreleri "r,c" (resume-güvenli)
  let revealColor = '#22D3EE';
  // Bağlantı önbelleği state'i — captureShape() kurulumda invalidateConn() çağırdığı için
  // `let` tanımı buradan ÖNCE olmalı (aksi halde TDZ: 'connCache before initialization').
  let connCache = null;
  function captureShape() {
    // Üreteci baştan çalıştırmak yerine motorun init'te hesapladığı tam hücre kümesini
    // kullan (resume-güvenli; saveState/loadState içinde de taşınır).
    shapeSet = new Set(engine.shapeCells || []);
    revealColor = getShapeColor(engine.shape);
    if (levelEl) levelEl.textContent = engine.level;
    if (typeof updateGoalLabel === 'function') updateGoalLabel();
    invalidateConn(); // yeni tahta → bağlantı önbelleğini sıfırla
  }
  captureShape();

  let viewScale = 1, viewX = 0, viewY = 0;
  const MIN_SCALE = 1, MAX_SCALE = 3.2;

  // ===== Layout / boyutlandırma =====
  let cell = 0, offsetX = 0, offsetY = 0, dpr = 1, cssW = 0, cssH = 0;
  function resize() {
    const rect = canvasWrap.getBoundingClientRect();
    cssW = Math.max(50, rect.width);
    cssH = Math.max(50, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pad = 12;
    
    const activeCols = engine.activeCols || engine.cols;
    const activeRows = engine.activeRows || engine.rows;
    const activeMinC = engine.activeMinC !== undefined ? engine.activeMinC : 0;
    const activeMinR = engine.activeMinR !== undefined ? engine.activeMinR : 0;

    cell = Math.floor(Math.min((cssW - pad * 2) / activeCols, (cssH - pad * 2) / activeRows));
    // Adillik: minimum hücre 12→18px. Üreteçteki tahta tavanı (18) ile birlikte
    // oklar artık parmakla isabet edilebilir boyutta; gerekirse pinch/pan devrede.
    cell = Math.min(80, Math.max(18, cell));
    
    const activeW = activeCols * cell;
    const activeH = activeRows * cell;
    
    offsetX = Math.floor((cssW - activeW) / 2) - activeMinC * cell;
    offsetY = Math.floor((cssH - activeH) / 2) - activeMinR * cell;
    
    clampView();
    requestRender();
  }
  function cellCenter(r, c) {
    return { x: offsetX + c * cell + cell / 2, y: offsetY + r * cell + cell / 2 };
  }
  function pixelToCell(px, py) {
    // ekran → dünya (zoom/pan tersine)
    const wx = (px - viewX) / viewScale;
    const wy = (py - viewY) / viewScale;
    const c = Math.floor((wx - offsetX) / cell);
    const r = Math.floor((wy - offsetY) / cell);
    if (r < 0 || r >= engine.rows || c < 0 || c >= engine.cols) return null;
    return { r, c };
  }
  function clampView() {
    viewScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, viewScale));
    // Tahta tamamen ekran dışına kaçmasın
    const bw = engine.cols * cell * viewScale;
    const bh = engine.rows * cell * viewScale;
    const minX = Math.min(0, cssW - (offsetX * viewScale + bw));
    const maxX = Math.max(0, -offsetX * viewScale);
    const minY = Math.min(0, cssH - (offsetY * viewScale + bh));
    const maxY = Math.max(0, -offsetY * viewScale);
    viewX = Math.max(minX, Math.min(maxX, viewX));
    viewY = Math.max(minY, Math.min(maxY, viewY));
  }


  // ===== Bağlantı (incoming/ön-blok) ÖNBELLEĞİ =====
  // Her okun aynı-yılan komşu bağlantıları yalnız ok silinince (tapArrow) veya seviye
  // değişince değişir. Eskiden drawArrowTile bunu HER KARE, HER OK için 8 yön tarayarak
  // hesaplıyordu (22×22+368 okta kare başına binlerce grid erişimi). Artık bir kez kurulur,
  // tapArrow/captureShape'te invalidate edilir → render maliyeti büyük ölçüde düşer.
  // (connCache 'let' tanımı yukarıda, captureShape çağrısından önce — TDZ'den kaçınmak için.)
  function invalidateConn() { connCache = null; }
  function buildConnCache() {
    connCache = new Map();
    if (!engine || !engine.grid || !engine.snakeIds) return;
    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        const d = engine.grid[r][c];
        if (d === null) continue;
        const mySnakeId = engine.snakeIds[r][c];
        const incoming = [];
        for (let i = 0; i < 8; i++) {
          const nr = r - DIRS[i][0], nc = c - DIRS[i][1];
          if (nr >= 0 && nr < engine.rows && nc >= 0 && nc < engine.cols &&
              engine.grid[nr][nc] === i && engine.snakeIds[nr][nc] === mySnakeId) {
            incoming.push(i);
          }
        }
        const [dr0, dc0] = DIRS[d];
        const fr = r + dr0, fc = c + dc0;
        const front = (fr >= 0 && fr < engine.rows && fc >= 0 && fc < engine.cols &&
          engine.grid[fr][fc] !== null && engine.snakeIds[fr][fc] === mySnakeId);
        connCache.set(r + ',' + c, { incoming, front });
      }
    }
  }
  function getConn(r, c) {
    if (!connCache) buildConnCache();
    return connCache.get(r + ',' + c);
  }

  // ===== Çizim =====
  function drawArrowTile(x, y, size, dir, opts = {}) {
    const s = size;
    const r_cell = s / 2;
    const sc = opts.scale === undefined ? 1 : opts.scale;
    
    // Sistem karanlık moduna göre dinamik renk
    const baseLineColor = isDarkMode ? '#F8FAFC' : '#0F172A'; // Koyu modda beyaz, açık modda siyah
    const lineColor = opts.danger ? '#EF4444' : baseLineColor;

    ctx.save();
    ctx.translate(x, y);
    if (sc !== 1) ctx.scale(sc, sc);
    if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;

    const [dr, dc] = DIRS[dir];
    const dirAng = Math.atan2(dr, dc);

    // Çizgi özellikleri — İncecik, zarif, labirent tarzı
    const lw = Math.max(1.5, s * 0.06);
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lw;
    ctx.lineCap = 'square'; // Uçlar küt ve kare (keskin birleşim için)
    ctx.lineJoin = 'miter'; // Keskin 90 derece köşeler

    // Gelen (incoming) bağlantı + ön-blok: artık önbellekten (kare başına tarama yok).
    let incoming = [];
    let has_front_block = false;
    if (opts.r !== undefined && opts.c !== undefined) {
      const conn = getConn(opts.r, opts.c);
      if (conn) { incoming = conn.incoming; has_front_block = conn.front; }
    }

    // Uç noktasının (P_out) uzaklığı. Önü doluysa tam sınıra (r_cell), değilse biraz boşluk bırakarak uca.
    const isBodySegment = opts.flyingSnake && !opts.isHead;
    const out_dist = (has_front_block || isBodySegment) ? r_cell : (r_cell * 0.7);
    const P_out = { x: dc * out_dist, y: dr * out_dist };

    // İpucu parıltısı
    if (opts.glow) {
      ctx.shadowColor = '#FDE047';
      ctx.shadowBlur = s * (0.25 + 0.4 * opts.glow);
      ctx.strokeStyle = '#FDE047';
      ctx.lineWidth = lw + 1;
    }

    // Yolları (path) kesintisiz çiz
    ctx.beginPath();
    if (incoming.length === 0 || opts.flyingSnake) {
      // Uçarken veya gelen yokken düz (kuyruk) çizim. Uçarken kuyruk hücresini doldursun diye tam -r_cell'den başlat.
      const tail_dist = opts.flyingSnake ? r_cell : (r_cell * 0.7);
      ctx.moveTo(-dc * tail_dist, -dr * tail_dist);
      ctx.lineTo(P_out.x, P_out.y);
    } else {
      // Tüm gelen kolları merkeze çiz, sonra merkezden uca çiz
      const first_in = incoming[0];
      const P_in_first = { x: -DIRS[first_in][1] * r_cell, y: -DIRS[first_in][0] * r_cell };
      
      ctx.moveTo(P_in_first.x, P_in_first.y);
      ctx.lineTo(0, 0); // Merkeze kesin dönüş
      ctx.lineTo(P_out.x, P_out.y); // Uca çiz
      
      // Varsa diğer gelen kollar
      for (let i = 1; i < incoming.length; i++) {
        const in_dir = incoming[i];
        const P_in = { x: -DIRS[in_dir][1] * r_cell, y: -DIRS[in_dir][0] * r_cell };
        ctx.moveTo(P_in.x, P_in.y);
        ctx.lineTo(0, 0);
      }
    }
    ctx.stroke();

    // OK BAŞI (Sadece en öndeyse çiz)
    if (!has_front_block && !isBodySegment) {
      const headLen = s * 0.20; 
      const headW = s * 0.16;   
      
      ctx.save();
      // Ok başını serbest uç ise ucuna koy.
      const tip_dist = P_out.x * Math.cos(dirAng) + P_out.y * Math.sin(dirAng);
      
      ctx.translate(dc * tip_dist + dc * (lw/2), dr * tip_dist + dr * (lw/2));
      ctx.rotate(dirAng);
      
      ctx.fillStyle = lineColor;
      ctx.beginPath();
      ctx.moveTo(s * 0.04, 0); // Sivri uç ileride
      ctx.lineTo(-headLen, -headW); // Sol arka
      ctx.lineTo(-headLen + s*0.04, 0); // Hafif içe girinti (kırlangıç)
      ctx.lineTo(-headLen, headW); // Sağ arka
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    }

    ctx.restore();
  }

  function drawWall(x, y, size) {
    const s = size * 0.85, r = s / 2;
    ctx.save();
    ctx.translate(x, y);

    // Renkli arka plan
    ctx.fillStyle = revealColor;
    roundRect(-r, -r, s, s, s * 0.15);
    ctx.fill();
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = Math.max(1, s * 0.04);
    roundRect(-r, -r, s, s, s * 0.15);
    ctx.stroke();

    // Çapraz çizgi
    ctx.strokeStyle = '#94A3B8';
    ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, -r * 0.6);
    ctx.lineTo(r * 0.6, r * 0.6);
    ctx.moveTo(r * 0.6, -r * 0.6);
    ctx.lineTo(-r * 0.6, r * 0.6);
    ctx.stroke();

    ctx.restore();
  }

  function roundRect(x, y, w, h, rad) {
    ctx.beginPath();
    ctx.moveTo(x + rad, y);
    ctx.arcTo(x + w, y, x + w, y + h, rad);
    ctx.arcTo(x + w, y + h, x, y + h, rad);
    ctx.arcTo(x, y + h, x, y, rad);
    ctx.arcTo(x, y, x + w, y, rad);
    ctx.closePath();
  }

  // ===== Animasyon durumu =====
  const flying = [];          // {snake, path, pathDists, headDir, t0}
  let shake = null;           // {r,c, t0}
  let hintCell = null;        // {r,c}  (dokunana/zaman aşımına kadar nefes alır)
  const reveals = new Map();  // "r,c" -> t0  (yeni açılan silüet hücreleri pop)
  let entranceT0 = 0, entranceMax = 0; // kademeli giriş
  let winGlowT0 = 0;          // kazanınca silüet parıltısı
  let tutorialAnim = null;    // öğretici animasyon durumu (free, blocked, vb)
  const FLY_MS = 1200, SHAKE_MS = 340, REVEAL_MS = 360, POP_DUR = 240;
  const WINDUP_MS = 50;       // Geri çekilme süresi
  const WINDUP_DIST = 0.12;   // Geri çekilme mesafesi (hücre oranı)

  window.arrowTutorialApi = {
    startAnim: (type, vCursor, vCursor2) => {
       tutorialAnim = { type, t0: performance.now(), vCursor, vCursor2 };
       if (type === 'free') {
          // Önce orta ve alt satırlardan serbest ok bulalım
          let freeArrow = null;
          for(let r = Math.floor(engine.rows / 3); r < engine.rows; r++) {
             for(let c = 0; c < engine.cols; c++) {
                if (engine.grid[r][c] !== null && engine.isPathClear(r, c)) {
                   freeArrow = {r, c}; break;
                }
             }
             if (freeArrow) break;
          }
          // Bulunamazsa herhangi birini al
          if (!freeArrow) {
             const h = engine.getHint();
             if (h) freeArrow = h;
          }
          if (freeArrow) {
             tutorialAnim.r = freeArrow.r; tutorialAnim.c = freeArrow.c;
             const snake = engine.getSnake(freeArrow.r, freeArrow.c);
             const snakePath = snake.map(seg => cellCenter(seg.r, seg.c));
             const pathDists = [0];
             for (let si = 1; si < snakePath.length; si++) {
               const dx = snakePath[si].x - snakePath[si - 1].x;
               const dy = snakePath[si].y - snakePath[si - 1].y;
               pathDists.push(pathDists[si - 1] + Math.hypot(dx, dy));
             }
             tutorialAnim.snake = snake;
             tutorialAnim.path = snakePath;
             tutorialAnim.pathDists = pathDists;
          }
       } else if (type === 'blocked') {
          for(let r=0; r<engine.rows; r++) {
            for(let c=0; c<engine.cols; c++) {
               if (engine.grid[r][c] !== null && !engine.isPathClear(r, c)) {
                  tutorialAnim.r = r; tutorialAnim.c = c;
                  break;
               }
            }
            if (tutorialAnim.r !== undefined) break;
          }
       } else if (type === 'reveal') {
          // Bir grup ok bulup seçelim
          const group = [];
          for(let r=0; r<engine.rows && group.length<4; r++) {
            for(let c=0; c<engine.cols && group.length<4; c++) {
               if (engine.grid[r][c] !== null) group.push({r, c});
            }
          }
          tutorialAnim.group = group;
       } else if (type === 'hint') {
          const hintBtn = document.querySelector('#arrow-top-hint');
          if (hintBtn) {
             const rect = hintBtn.getBoundingClientRect();
             tutorialAnim.targetRect = rect;
             tutorialAnim.hintBtn = hintBtn;
          }
       }
       ensureLoop();
       return () => { tutorialAnim = null; };
    },
    stopAnim: () => { tutorialAnim = null; }
  };

  function easeOutBack(p) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); }
  function easeIn(p) { return p * p; }
  function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }
  function easeOutQuint(p) { return 1 - Math.pow(1 - p, 5); }

  // Uçan yılan zincirini (sürekli tek hat + ok başı) verilen ilerleme değerleriyle çizer.
  // Hem gerçek oyun (flying[]) hem öğretici animasyonu bu tek fonksiyonu kullanır
  // (eskiden ~80 satır kopya-yapıştırdı). headPull/tailPull/alpha/windup çağıran tarafça
  // hesaplanır; çizim mantığı burada tek yerde.
  function drawFlyingSnakeShape(snake, path, pathDists, headPull, tailPull, alpha, windupElapsed) {
    if (alpha < 0.01) return;
    const totalPathLen = pathDists[pathDists.length - 1];
    const headDir = snake[snake.length - 1].dir;
    const [flyDr, flyDc] = DIRS[headDir];
    const r_cell = cell / 2;
    const newTailDist = tailPull - r_cell;
    const newHeadDist = totalPathLen + headPull + r_cell;

    function getPosAtDist(dist) {
      if (dist <= 0) {
        const [tdr, tdc] = DIRS[(snake[0].dir + 4) % 8];
        return { x: path[0].x + tdc * (-dist), y: path[0].y + tdr * (-dist) };
      } else if (dist < totalPathLen) {
        let segIdx = 0;
        for (let k = 1; k < pathDists.length; k++) {
          if (pathDists[k] >= dist) { segIdx = k - 1; break; }
        }
        const segStart = pathDists[segIdx];
        const segEnd = pathDists[segIdx + 1];
        const ratio = (segEnd > segStart) ? (dist - segStart) / (segEnd - segStart) : 0;
        return {
          x: path[segIdx].x + (path[segIdx + 1].x - path[segIdx].x) * ratio,
          y: path[segIdx].y + (path[segIdx + 1].y - path[segIdx].y) * ratio
        };
      } else {
        const overshoot = dist - totalPathLen;
        const hp = path[path.length - 1];
        return { x: hp.x + flyDc * overshoot, y: hp.y + flyDr * overshoot };
      }
    }

    const lineColor = isDarkMode ? '#F8FAFC' : '#0F172A';
    const lw = Math.max(1.5, cell * 0.06);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = lw;
    ctx.lineCap = 'square';
    ctx.lineJoin = 'miter';

    const headPos = getPosAtDist(newHeadDist);
    const tailPos = getPosAtDist(newTailDist);

    if (windupElapsed != null) {
      const wp = windupElapsed / WINDUP_MS;
      const sc = 1.0 + wp * 0.12;
      ctx.translate(headPos.x, headPos.y);
      ctx.scale(sc, sc);
      ctx.translate(-headPos.x, -headPos.y);
    }

    ctx.beginPath();
    ctx.moveTo(tailPos.x, tailPos.y);
    for (let k = 0; k < pathDists.length; k++) {
      if (pathDists[k] > newTailDist && pathDists[k] < newHeadDist) {
        ctx.lineTo(path[k].x, path[k].y);
      }
    }
    ctx.lineTo(headPos.x, headPos.y);
    ctx.stroke();

    const dirAng = Math.atan2(flyDr, flyDc);
    const headLen = cell * 0.20;
    const headW = cell * 0.16;

    ctx.translate(headPos.x + flyDc * (lw / 2), headPos.y + flyDr * (lw / 2));
    ctx.rotate(dirAng);

    ctx.fillStyle = lineColor;
    ctx.beginPath();
    ctx.moveTo(cell * 0.04, 0);
    ctx.lineTo(-headLen, -headW);
    ctx.lineTo(-headLen + cell * 0.04, 0);
    ctx.lineTo(-headLen, headW);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function startEntrance() {
    entranceT0 = performance.now();
    const cr = (engine.rows - 1) / 2, cc = (engine.cols - 1) / 2;
    let maxD = 0;
    for (let r = 0; r < engine.rows; r++)
      for (let c = 0; c < engine.cols; c++)
        maxD = Math.max(maxD, Math.hypot(r - cr, c - cc));
    entranceMax = maxD * 30 + POP_DUR;
  }
  function entranceScale(r, c, now) {
    if (!entranceT0) return 1;
    const cr = (engine.rows - 1) / 2, cc = (engine.cols - 1) / 2;
    const delay = Math.hypot(r - cr, c - cc) * 30;
    const p = (now - entranceT0 - delay) / POP_DUR;
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    return easeOutBack(p);
  }

  // Arka plan — uygulama varsayılan koyu teması (canvas transparan, konteyner rengi görünsün)
  function drawBackground() {
    ctx.clearRect(0, 0, cssW, cssH);
  }

  function render() {
    // Koyu arka plan
    drawBackground();

    const now = performance.now();
    ctx.save();
    
    // Zoom tutorial için ek scale
    let zoomScale = 1;
    if (tutorialAnim && tutorialAnim.type === 'zoom') {
        const elapsed = now - tutorialAnim.t0;
        const p2000 = (elapsed % 2000) / 2000;
        if (p2000 > 0.3 && p2000 < 0.7) {
            const zp = (p2000 - 0.3) / 0.4;
            // peaks at 1.4 in the middle
            zoomScale = 1 + 0.4 * (0.5 - Math.abs(zp - 0.5)) * 2;
        }
    }
    
    const cx = cssW / 2, cy = cssH / 2;
    ctx.translate(cx, cy);
    ctx.scale(zoomScale, zoomScale);
    ctx.translate(-cx, -cy);

    ctx.translate(viewX, viewY);
    ctx.scale(viewScale, viewScale);

    const hintGlow = hintCell ? (0.5 + 0.5 * Math.sin(now / 260)) : 0;
    const winPulse = winGlowT0 ? Math.max(0, 1 - (now - winGlowT0) / 900) : 0;

    // === GİZLİ RESİM = NOKTALAR (kullanıcı isteği) ===
    // Okların ardındaki renkli BLOKLAR (soluk tint + dolu silüet) kaldırıldı. Boş hücrelerde
    // ızgara noktası YOK. Bir ok fırlatılıp hücre boşalınca o ŞEKİL hücresinde küçük bir
    // NOKTA belirir (pop) → resim noktalarla ortaya çıkar. Ok hâlâ duruyorsa nokta çizilmez.
    {
      const baseR = Math.max(1.5, cell * 0.13);
      for (const key of shapeSet) {
        const [r, c] = key.split(',').map(Number);
        if (engine.grid[r][c] !== null) continue; // ok varsa nokta yok (ok zaten görünür)
        const { x, y } = cellCenter(r, c);
        let pop = 1;
        const rt = reveals.get(key);
        if (rt !== undefined) {
          const p = (now - rt) / REVEAL_MS;
          if (p >= 1) reveals.delete(key);
          else pop = 0.3 + 0.7 * easeOutBack(Math.min(1, p));
        }
        // P2: nokta-başına shadowBlur (pahalı) kaldırıldı. Kazanma parıltısı bunun yerine
        // noktayı hafif büyütüp parlatarak (alpha + yarıçap) ucuz biçimde verilir.
        const wr = 1 + 0.35 * winPulse;
        ctx.globalAlpha = 0.85 + 0.15 * winPulse;
        ctx.fillStyle = revealColor;
        ctx.beginPath();
        ctx.arc(x, y, baseR * pop * wr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Hangi yılanın shake/hint durumunda olduğunu bulalım
    const shakeSnakeId = (shake && engine.grid[shake.r] && engine.snakeIds && engine.grid[shake.r][shake.c] !== null) ? engine.snakeIds[shake.r][shake.c] : null;
    const hintSnakeId = (hintCell && engine.grid[hintCell.r] && engine.snakeIds && engine.grid[hintCell.r][hintCell.c] !== null) ? engine.snakeIds[hintCell.r][hintCell.c] : null;

    // 2) Duvarlar + oklar (giriş pop + ipucu glow)
    for (let r = 0; r < engine.rows; r++) {
      for (let c = 0; c < engine.cols; c++) {
        const { x, y } = cellCenter(r, c);
        const esc = entranceScale(r, c, now);
        if (esc <= 0) continue;
        if (engine.wall[r][c]) { ctx.save(); ctx.translate(x, y); ctx.scale(esc, esc); drawWall(0, 0, cell); ctx.restore(); continue; }
        const d = engine.grid[r][c];
        if (d === null) continue;
        
        // Eğer bu ok shake olan yılana aitse ana döngüde ÇİZME, aşağıda shake bloğunda çizeceğiz
        if (shakeSnakeId !== null && engine.snakeIds[r][c] === shakeSnakeId) continue;
        
        // Eğer bu ok hint olan yılana aitse ana döngüde ÇİZME, aşağıda hint bloğunda çizeceğiz
        if (hintSnakeId !== null && engine.snakeIds[r][c] === hintSnakeId) continue;

        // Öğretici animasyonunda gizlenmesi gerekenler
        if (tutorialAnim) {
           const type = tutorialAnim.type;
           const elapsed = now - tutorialAnim.t0;
           const p2000 = (elapsed % 2000) / 2000;
           if (type === 'free') {
              if (tutorialAnim.snake && tutorialAnim.snake.some(s => s.r === r && s.c === c)) continue;
              else if (tutorialAnim.r === r && tutorialAnim.c === c) continue;
           } else if (type === 'blocked') {
              if (tutorialAnim.r === r && tutorialAnim.c === c) continue; // tutorialAnim bloğunda çizilecek
           } else if (type === 'reveal' && tutorialAnim.group) {
              if (tutorialAnim.group.some(g => g.r === r && g.c === c)) continue; // tutorialAnim bloğunda çizilecek
           }
        }
        
        drawArrowTile(x, y, cell, d, { glow: 0, scale: esc, r, c });
      }
    }

    // Hint yılanını en üstte (diğer tüm okların üzerinde) gösterelim ki kalabalıkta kaybolmasın
    if (hintSnakeId !== null) {
      for (let r = 0; r < engine.rows; r++) {
        for (let c = 0; c < engine.cols; c++) {
          if (engine.grid[r][c] !== null && engine.snakeIds[r][c] === hintSnakeId) {
            const { x, y } = cellCenter(r, c);
            const d = engine.grid[r][c];
            const esc = entranceScale(r, c, now);
            // Bütünlüğün bozulmaması için büyüyüp-küçülme iptal edildi, sadece sabit scale (esc) + glow eklendi.
            drawArrowTile(x, y, cell, d, { glow: hintGlow, scale: esc, r, c });
          }
        }
      }
    }

    // 3) Shake (yanlış dokunuş) — kırmızı flash. Tüm yılan birlikte sallansın.
    if (shake) {
      const p = (now - shake.t0) / SHAKE_MS;
      if (p < 1 && shakeSnakeId !== null) {
        const dx = Math.sin(p * Math.PI * 7) * cell * 0.16 * (1 - p);
        for (let r = 0; r < engine.rows; r++) {
          for (let c = 0; c < engine.cols; c++) {
            if (engine.grid[r][c] !== null && engine.snakeIds[r][c] === shakeSnakeId) {
              const { x, y } = cellCenter(r, c);
              drawArrowTile(x + dx, y, cell, engine.grid[r][c], { danger: true, r, c });
            }
          }
        }
      } else { 
        shake = null; 
      }
    }

    // 4) Uçan oklar — Gerçek zincir gibi uzayan tek parça (continuous line)
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i];
      const elapsed = now - f.t0;
      const totalDur = WINDUP_MS + FLY_MS;
      if (elapsed > totalDur + 100) { flying.splice(i, 1); continue; }
      
      const snake = f.snake;
      const path = f.path;
      const pathDists = f.pathDists;
      const totalPathLen = pathDists[pathDists.length - 1];
      const exitDist = (engine.rows + engine.cols) * cell * 1.5;

      let headPull = 0;
      let tailPull = 0;
      let windupPhase = false;
      let alpha = 1;

      if (elapsed < WINDUP_MS) {
        windupPhase = true;
        const wp = elapsed / WINDUP_MS;
        const pullback = -Math.sin(wp * Math.PI) * WINDUP_DIST * cell;
        headPull = pullback;
        tailPull = pullback;
      } else {
        const launchElapsed = elapsed - WINDUP_MS;
        const lp = Math.min(1, launchElapsed / FLY_MS);

        // Baş (head) aniden fırlayıp dışarı çıkar (easeOutQuart)
        const easedHead = 1 - Math.pow(1 - lp, 4);
        headPull = easedHead * (totalPathLen + exitDist);

        // Kuyruk (tail) tıklamadan tam 100ms (0.1 saniye) sonra serbest kalır
        const TAIL_RELEASE_MS = 100;
        if (elapsed < TAIL_RELEASE_MS) {
          tailPull = 0;
        } else {
          const tailLp = Math.min(1, (elapsed - TAIL_RELEASE_MS) / (WINDUP_MS + FLY_MS - TAIL_RELEASE_MS));
          const easedTail = tailLp * tailLp; // İvmelenerek (easeInQuad) başın arkasından fırlar
          tailPull = easedTail * (totalPathLen + exitDist);
        }

        // Yılanın boyu devasa uzayacağı için, tamamen ekrandan çıkana kadar silinmesin (%90'dan sonra solar)
        alpha = lp < 0.9 ? 1 : Math.max(0, 1 - (lp - 0.9) / 0.1);
      }

      drawFlyingSnakeShape(snake, path, pathDists, headPull, tailPull, alpha, windupPhase ? elapsed : null);
    }

    // 5) Öğretici animasyonlar (tutorialAnim)
    if (tutorialAnim) {
      const elapsed = now - tutorialAnim.t0;
      const p2000 = (elapsed % 2000) / 2000;
      const type = tutorialAnim.type;
      
      if (type === 'free' || type === 'blocked') {
        const tr = tutorialAnim.r, tc = tutorialAnim.c;
        if (tr !== undefined && engine.grid[tr] && engine.grid[tr][tc] !== null) {
           const { x, y } = cellCenter(tr, tc);
           const d = engine.grid[tr][tc];
           
           if (type === 'free') {
             if (p2000 > 0.35 && p2000 < 0.75) {
                const flyElapsedMs = (p2000 - 0.35) / 0.40 * (FLY_MS + WINDUP_MS);
                const f = tutorialAnim;
                const snake = f.snake;
                const path = f.path;           
                const pathDists = f.pathDists; 
                if (snake && path && pathDists) {
                   const totalPathLen = pathDists[pathDists.length - 1];
                   const exitDist = (engine.rows + engine.cols) * cell * 1.5;
                   
                   let headPull = 0, tailPull = 0, windupPhase = false, alpha = 1;
                   if (flyElapsedMs < WINDUP_MS) {
                     windupPhase = true;
                     const wp = flyElapsedMs / WINDUP_MS;
                     headPull = tailPull = -Math.sin(wp * Math.PI) * WINDUP_DIST * cell;
                   } else {
                     const launchElapsed = flyElapsedMs - WINDUP_MS;
                     const lp = Math.min(1, launchElapsed / FLY_MS);
                     headPull = (1 - Math.pow(1 - lp, 4)) * (totalPathLen + exitDist);
                     const TAIL_RELEASE_MS = 100;
                     if (flyElapsedMs >= TAIL_RELEASE_MS) {
                       const tailLp = Math.min(1, (flyElapsedMs - TAIL_RELEASE_MS) / (WINDUP_MS + FLY_MS - TAIL_RELEASE_MS));
                       tailPull = (tailLp * tailLp) * (totalPathLen + exitDist);
                     }
                     alpha = Math.max(0, 1 - Math.pow(lp, 3));
                   }

                   // Aynı uçan-yılan çizimi (ortak fonksiyon); alpha/pull yukarıda hesaplandı.
                   drawFlyingSnakeShape(snake, path, pathDists, headPull, tailPull, alpha, windupPhase ? flyElapsedMs : null);
                }
             } else if (p2000 <= 0.35) {
                if (tutorialAnim.snake) {
                   tutorialAnim.snake.forEach(seg => {
                      const { x, y } = cellCenter(seg.r, seg.c);
                      drawArrowTile(x, y, cell, seg.dir, { glow: (seg.r===tr && seg.c===tc) ? 0.5 : 0, r: seg.r, c: seg.c });
                   });
                } else {
                   drawArrowTile(x, y, cell, d, { glow: 0.5, r: tr, c: tc });
                }
             }
           } else if (type === 'blocked') {
             if (p2000 > 0.25 && p2000 < 0.5) {
                const sp = (p2000 - 0.25) / 0.25;
                const dx = Math.sin(sp * Math.PI * 7) * cell * 0.16 * (1 - sp);
                drawArrowTile(x + dx, y, cell, d, { danger: true, r: tr, c: tc });
             } else {
                drawArrowTile(x, y, cell, d, { r: tr, c: tc });
             }
           }
        }
      } else if (type === 'reveal' && tutorialAnim.group) {
        if (p2000 > 0.4 && p2000 < 0.8) {
           const pathP = (p2000 - 0.4) / 0.4;
           ctx.save();
           ctx.globalAlpha = Math.max(0, 1 - pathP);
           for(const g of tutorialAnim.group) {
              const { x, y } = cellCenter(g.r, g.c);
              const [flyDr, flyDc] = DIRS[engine.grid[g.r][g.c] || 0];
              const dist = pathP * cell * 3;
              drawArrowTile(x + flyDc * dist, y + flyDr * dist, cell, engine.grid[g.r][g.c], { r: g.r, c: g.c });
           }
           ctx.restore();
        } else if (p2000 <= 0.4) {
           for(const g of tutorialAnim.group) {
              const { x, y } = cellCenter(g.r, g.c);
              drawArrowTile(x, y, cell, engine.grid[g.r][g.c], { glow: 0.5, r: g.r, c: g.c });
           }
        }
      }

      if (tutorialAnim.vCursor) {
        const rect = canvas.getBoundingClientRect();
        if (type === 'free' || type === 'blocked') {
           const tr = tutorialAnim.r, tc = tutorialAnim.c;
           if (tr !== undefined) {
             const pos = cellCenter(tr, tc);
             const screenX = rect.left + pos.x * viewScale + viewX;
             const screenY = rect.top + pos.y * viewScale + viewY;
             tutorialAnim.vCursor.style.opacity = '1';
             tutorialAnim.vCursor.style.left = (screenX - 24) + 'px';
             tutorialAnim.vCursor.style.top = (screenY - 24) + 'px';
             let clickScale = 1;
             if (type === 'free' && p2000 > 0.25 && p2000 < 0.35) clickScale = 0.8;
             if (type === 'blocked' && p2000 > 0.15 && p2000 < 0.25) clickScale = 0.8;
             tutorialAnim.vCursor.style.transform = `scale(${clickScale})`;
           }
        } else if (type === 'reveal') {
           tutorialAnim.vCursor.style.opacity = '0';
        } else if (type === 'hint') {
           if (tutorialAnim.targetRect) {
              const hr = tutorialAnim.targetRect;
              tutorialAnim.vCursor.style.opacity = '1';
              tutorialAnim.vCursor.style.left = (hr.left + hr.width/2 - 24) + 'px';
              tutorialAnim.vCursor.style.top = (hr.top + hr.height/2 - 24) + 'px';
              let clickScale = 1;
              if (p2000 > 0.3 && p2000 < 0.4) clickScale = 0.8;
              tutorialAnim.vCursor.style.transform = `scale(${clickScale})`;
              
              if (p2000 > 0.3 && p2000 < 0.4) tutorialAnim.hintBtn.style.transform = 'scale(0.9)';
              else tutorialAnim.hintBtn.style.transform = 'scale(1)';
              
              if (p2000 > 0.4 && p2000 < 0.8) tutorialAnim.hintBtn.style.boxShadow = '0 0 20px 10px rgba(250, 204, 21, 0.8)';
              else tutorialAnim.hintBtn.style.boxShadow = '';
           }
        } else if (type === 'zoom') {
           const cx = rect.left + rect.width / 2;
           const cy = rect.top + rect.height / 2;
           
           let op = 0;
           if (p2000 > 0.1 && p2000 < 0.9) op = 1;
           if (p2000 > 0.8 && p2000 < 0.9) op = 1 - (p2000 - 0.8) / 0.1;

           tutorialAnim.vCursor.style.opacity = op;
           if (tutorialAnim.vCursor2) tutorialAnim.vCursor2.style.opacity = op;

           let pinchDist = 0;
           if (p2000 > 0.3 && p2000 < 0.7) {
               const zp = (p2000 - 0.3) / 0.4;
               pinchDist = (1 - Math.pow(1 - zp, 3)) * 60; // easeOutCubic
           } else if (p2000 >= 0.7) {
               pinchDist = 60;
           }
           
           // vCursor 1 -> sol üst
           tutorialAnim.vCursor.style.left = (cx - 15 - pinchDist - 24) + 'px';
           tutorialAnim.vCursor.style.top = (cy - 15 - pinchDist - 24) + 'px';
           
           // vCursor 2 -> sağ alt
           if (tutorialAnim.vCursor2) {
               tutorialAnim.vCursor2.style.left = (cx + 15 + pinchDist - 24) + 'px';
               tutorialAnim.vCursor2.style.top = (cy + 15 + pinchDist - 24) + 'px';
               tutorialAnim.vCursor2.style.transform = 'rotate(180deg)';
           }
        }
      }
    }

    ctx.restore();
  }

  // ===== Render döngüsü (sadece animasyon varken döner) =====
  let rafId = null;
  function animActive(now) {
    return flying.length > 0 || shake || hintCell || reveals.size > 0 || tutorialAnim ||
      (entranceT0 && now < entranceT0 + entranceMax) ||
      (winGlowT0 && now < winGlowT0 + 900);
  }
  function loop() {
    render();
    const now = performance.now();
    if (animActive(now)) {
      // Yalnız ipucu parlaması aktifse (kullanıcı idle) tam 60fps yerine ~20fps yeterli;
      // tüm board'u her kare yeniden çizip pil/CPU yakmak yerine throttle edilir.
      const onlyHint = hintCell && flying.length === 0 && !shake && reveals.size === 0 && !tutorialAnim &&
        !(entranceT0 && now < entranceT0 + entranceMax) && !(winGlowT0 && now < winGlowT0 + 900);
      if (onlyHint) {
        rafId = -1; // sentinel: throttle timer'ı ile sürüyor (null değil → çift başlatma olmaz)
        setTimeout(() => { rafId = requestAnimationFrame(loop); }, 50);
      } else {
        rafId = requestAnimationFrame(loop);
      }
    } else { rafId = null; render(); }
  }
  function requestRender() { if (rafId === null) render(); }
  function ensureLoop() { if (rafId === null) rafId = requestAnimationFrame(loop); }

  // ===== Girdi (dokun / pinch-zoom / pan) =====
  let modalOpen = false;

  function tapAt(px, py) {
    if (modalOpen || engine.win || engine.fail) return;
    const hit = pixelToCell(px, py);
    if (!hit) return;
    if (engine.grid[hit.r][hit.c] === null || engine.wall[hit.r][hit.c]) return;
    const res = engine.tapArrow(hit.r, hit.c);
    if (res.removed) {
      invalidateConn(); // yılan silindi → bağlantı önbelleği geçersiz
      clearStreak++;
      if (clearStreak >= 5 && clearStreak % 5 === 0) showStreakCombo(clearStreak);
      // Zincir yolunu (path) ve kümülatif mesafeleri önceden hesapla
      const snakePath = res.snake.map(seg => cellCenter(seg.r, seg.c));
      const pathDists = [0];
      for (let si = 1; si < snakePath.length; si++) {
        const dx = snakePath[si].x - snakePath[si - 1].x;
        const dy = snakePath[si].y - snakePath[si - 1].y;
        pathDists.push(pathDists[si - 1] + Math.hypot(dx, dy));
      }
      flying.push({ snake: res.snake, path: snakePath, pathDists, t0: performance.now() });
      for (const seg of res.snake) {
         reveals.set(seg.r + ',' + seg.c, performance.now());
      }
      Sounds.playSfx?.('line-clear');
      Haptics.vibrate?.('block-place');
      if (res.win) { winGlowT0 = performance.now(); setTimeout(onWin, 420); }
    } else if (res.blocked) {
      clearStreak = 0;
      // ADİLLİK: parmak kayması/çift dokunuş bir kerede birden çok can yakmasın.
      // Son yanlış dokunuştan 600ms içindeki yeni yanlış dokunuş can yakmaz (yine sallanır).
      const nowMs = performance.now();
      const graced = nowMs - lastWrongAt < 600;
      lastWrongAt = nowMs;
      if (graced) {
        engine.hearts = Math.min(engine.maxHearts, engine.hearts + 1); // motorun düştüğü canı iade et
        engine.wrongTaps = Math.max(0, engine.wrongTaps - 1);
        if (engine.hearts > 0) engine.fail = false;
      }
      shake = { r: hit.r, c: hit.c, t0: performance.now() };
      Sounds.playSfx?.('invalid');
      Haptics.vibrate?.('invalid');
      renderHearts();
      if (!graced && engine.fail) setTimeout(onFail, 400);
    }
    resetHintTimer();
    ensureLoop();
  }

  function localXY(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return { x: clientX - rect.left, y: clientY - rect.top };
  }
  function zoomAround(sx, sy, newScale) {
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));
    const wx = (sx - viewX) / viewScale;
    const wy = (sy - viewY) / viewScale;
    viewScale = newScale;
    viewX = sx - wx * viewScale;
    viewY = sy - wy * viewScale;
    clampView();
    requestRender();
  }

  // Touch durumu
  let gesture = null; // {mode:'tap'|'pan'|'pinch', ...}
  let lastTapAt = 0;

  function onTouchStart(ev) {
    if (ev.touches.length === 2) {
      const a = localXY(ev.touches[0].clientX, ev.touches[0].clientY);
      const b = localXY(ev.touches[1].clientX, ev.touches[1].clientY);
      gesture = {
        mode: 'pinch',
        dist0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        scale0: viewScale,
        mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    } else if (ev.touches.length === 1) {
      const p = localXY(ev.touches[0].clientX, ev.touches[0].clientY);
      gesture = { mode: 'tap', sx: p.x, sy: p.y, lx: p.x, ly: p.y, moved: 0 };
    }
  }
  function onTouchMove(ev) {
    if (!gesture) return;
    if (gesture.mode === 'pinch' && ev.touches.length === 2) {
      ev.preventDefault();
      const a = localXY(ev.touches[0].clientX, ev.touches[0].clientY);
      const b = localXY(ev.touches[1].clientX, ev.touches[1].clientY);
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      zoomAround(mid.x, mid.y, gesture.scale0 * (dist / gesture.dist0));
    } else if (ev.touches.length === 1) {
      const p = localXY(ev.touches[0].clientX, ev.touches[0].clientY);
      const dx = p.x - gesture.lx, dy = p.y - gesture.ly;
      gesture.moved += Math.abs(dx) + Math.abs(dy);
      if (gesture.mode === 'tap' && gesture.moved > 12 && viewScale > 1.01) gesture.mode = 'pan';
      if (gesture.mode === 'pan') {
        ev.preventDefault();
        viewX += dx; viewY += dy; clampView(); requestRender();
      }
      gesture.lx = p.x; gesture.ly = p.y;
    }
  }
  function onTouchEnd(ev) {
    ev.preventDefault();
    if (!gesture) return;
    if (gesture.mode === 'tap' && gesture.moved <= 12) {
      const now = performance.now();
      if (viewScale > 1.01 && now - lastTapAt < 280) {
        // yakınlaştırılmışken çift dokunuş → zoom sıfırla
        viewScale = 1; viewX = 0; viewY = 0; clampView(); requestRender();
        lastTapAt = 0;
      } else {
        tapAt(gesture.sx, gesture.sy);
        lastTapAt = now;
      }
    }
    gesture = ev.touches.length > 0 ? gesture : null;
  }
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd, { passive: false });

  // Masaüstü: tıkla + tekerlekle zoom
  function onClick(ev) {
    const p = localXY(ev.clientX, ev.clientY);
    tapAt(p.x, p.y);
  }
  function onWheel(ev) {
    ev.preventDefault();
    const p = localXY(ev.clientX, ev.clientY);
    zoomAround(p.x, p.y, viewScale * (ev.deltaY < 0 ? 1.12 : 0.89));
  }
  canvas.addEventListener('click', onClick);
canvas.addEventListener('wheel', onWheel, { passive: false });

  // ===== İpucu (diğer modlardaki gibi: hareketsizlikte otomatik + ücretsiz buton, breathe-glow) =====
  function showHint() {
    if (engine.win || engine.fail) return;
    const h = engine.getHint();
    if (h) {
      hintCell = { r: h.r, c: h.c, t0: performance.now() };
      ensureLoop();
    }
  }

  function showNotEnoughDiamondsModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 opacity-0 transition-opacity duration-300';
    modal.innerHTML = `
      <div class="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-sm shadow-2xl scale-95 transition-transform duration-300 border border-amber-500/20 text-center relative overflow-hidden">
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl"></div>
        <div class="absolute -bottom-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>
        
        <div class="w-16 h-16 mx-auto bg-gradient-to-br from-amber-100 to-amber-200 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center mb-4 shadow-inner relative z-10">
          <span class="text-3xl drop-shadow-md">💎</span>
        </div>
        
        <h2 class="text-xl font-black text-gray-800 dark:text-white mb-2 relative z-10">${t('not_enough_diamonds') || 'Yetersiz Elmas'}</h2>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium relative z-10">${t('hint_get_via') || 'Elmas veya reklam izleyerek ipucunu kullanabilirsin.'}</p>

        <div class="space-y-3 relative z-10">
          <button id="btn-buy-diamonds" class="w-full py-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 transition-all active:scale-95">
            <span class="material-symbols-outlined text-xl">shopping_cart</span>
            ${t('buy_diamonds') || 'Elmas Satın Al'}
          </button>

          <button id="btn-watch-ad" class="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all active:scale-95">
            <span class="material-symbols-outlined text-xl">play_circle</span>
            ${t('watch_ad') || 'Reklam İzle'}
          </button>

          <button id="btn-close-modal" class="w-full py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-2xl font-bold transition-colors active:scale-95 mt-2">
            ${t('cancel') || 'İptal'}
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    requestAnimationFrame(() => {
      modal.classList.remove('opacity-0');
      modal.firstElementChild.classList.remove('scale-95');
    });
    
    const closeModal = () => {
      modal.classList.add('opacity-0');
      modal.firstElementChild.classList.add('scale-95');
      setTimeout(() => modal.remove(), 300);
    };
    
    modal.querySelector('#btn-close-modal').onclick = closeModal;
    
    modal.querySelector('#btn-buy-diamonds').onclick = async () => {
      closeModal();
      
      // Load BuyDiamonds dynamically as a full-screen overlay
      const m = await import('./buyDiamonds.js');
      const BuyDiamonds = m.BuyDiamonds;
      
      let overlayContainer = null;
      
      const closeOverlay = () => {
        if (overlayContainer && overlayContainer.parentNode) {
          overlayContainer.parentNode.removeChild(overlayContainer);
        }
      };
      
      overlayContainer = BuyDiamonds(router, closeOverlay);
      overlayContainer.style.position = 'fixed';
      overlayContainer.style.top = '0';
      overlayContainer.style.left = '0';
      overlayContainer.style.width = '100vw';
      overlayContainer.style.height = '100vh';
      overlayContainer.style.zIndex = '10000';
      
      document.body.appendChild(overlayContainer); activeBodyAppends.push(overlayContainer);
    };
    
    const watchAdBtn = modal.querySelector('#btn-watch-ad');
    watchAdBtn.onclick = async () => {
      if (watchAdBtn.disabled) return;
      watchAdBtn.disabled = true;
      try {
        // Ödülü yalnızca reklam gerçekten izlendiyse ver (success kontrolü).
        const ok = await AdService.showRewardVideoAd();
        if (ok) {
          hintUsages++;
          renderHintBadge();
          showHint();
          closeModal();
        } else {
          watchAdBtn.disabled = false;
        }
      } catch(e) {
        console.warn('Ad error', e);
        watchAdBtn.disabled = false;
      }
    };
  }

  scope.on(hud, 'click', (ev) => {
    const btn = ev.target.closest('#arrow-top-hint');
    if (!btn) return;
    
    if (hintUsages >= HINT_COSTS.length) return;
    
    const cost = HINT_COSTS[hintUsages];
    if (PlayerState.useDiamonds(cost)) {
      hintUsages++;
      renderHintBadge();
      showHint();
    } else {
      showNotEnoughDiamondsModal();
    }
  });

  // +Can booster: oyun ortasında, ölmeden 1 can ekler (hamle/seri harcamaz). Tavan MAX_BOOST_HEARTS.
  scope.on(subControls, 'click', (ev) => {
    const btn = ev.target.closest('#arrow-heart-boost');
    if (!btn) return;
    if (engine.win || engine.fail || modalOpen) return;
    if (engine.hearts >= MAX_BOOST_HEARTS) { Toast.show(t('max_hearts') || 'Canın dolu!', 'warning'); return; }
    Sounds.playSfx?.('button-tap');
    if (PlayerState.useDiamonds(HEART_BOOST_COST)) {
      engine.addHearts(1);
      renderHearts();
      Haptics.vibrate?.('block-place');
      const pop = document.createElement('div');
      pop.className = 'absolute -top-4 left-1/2 -translate-x-1/2 text-pink-400 font-black text-lg z-50 pointer-events-none drop-shadow-sm';
      pop.textContent = '+1';
      btn.appendChild(pop);
      setTimeout(() => pop.remove(), 800);
    } else {
      showNotEnoughDiamondsModal();
    }
  });

  // Seri (kombo) kutlaması: yanlış dokunuşta sıfırlanan ardışık temizleme; milestone'larda flash.
  function showStreakCombo(n) {
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;left:50%;top:34%;transform:translate(-50%,-50%);z-index:45;pointer-events:none;font-weight:900;font-size:' + Math.min(46, 26 + n) + 'px;color:#fff;text-shadow:0 2px 14px rgba(6,182,212,0.9),0 0 5px rgba(0,0,0,0.45);white-space:nowrap;';
    el.textContent = n + ' ' + (t('txt_combo') || 'KOMBO') + '!';
    container.appendChild(el);
    el.animate([
      { opacity: 0, transform: 'translate(-50%,-50%) scale(0.5)' },
      { opacity: 1, transform: 'translate(-50%,-70%) scale(1.15)', offset: 0.3 },
      { opacity: 1, transform: 'translate(-50%,-85%) scale(1)', offset: 0.7 },
      { opacity: 0, transform: 'translate(-50%,-110%) scale(0.9)' }
    ], { duration: 900, easing: 'ease-out' });
    setTimeout(() => el.remove(), 920);
    Haptics.vibrate?.('new-record');
  }

  function resetHintTimer() {
    hintCell = null;
  }

  // ===== Kazanma =====
  function onWin() {
    modalOpen = true;
    if (mode !== 'endless') {
      engine.clearSave();                                  // macera resume kaydını temizle
      recordArrowOutcome(engine.level, true, engine.wrongTaps);
    }
    Sounds.playSfx?.('level-up');
    Haptics.vibrate?.('new-record');
    const stars = engine.lastStars || 1;
    const shapeLabel = getShapeName(engine.shape);
    
    let reward = 0;
    if (mode === 'endless') {
      // Endless = rastgele tahta; ödül sade (yıldız×5), ilerleme/skor kaydı yok.
      reward = stars * 5;
      PlayerState.addDiamonds(reward);
      PlayerState.save();
    } else {
      if (engine.level >= (PlayerState.state.arrowAdventureLevel || 1)) {
        PlayerState.state.arrowAdventureLevel = Math.min(engine.level + 1, getTotalArrowLevels());
        // Daha cömert: temel ödül 15→25, yıldız çarpanı 5→8, tavan 80→120.
        reward = Math.min(120, 25 + engine.level + stars * 8);
        PlayerState.addDiamonds(reward);
        PlayerState.save();
      }
      // Sıralama: toplam yıldız skoru
      const starsMap = Storage.get('arrow_stars', {}) || {};
      let totalStars = 0;
      for (const k in starsMap) totalStars += (starsMap[k] || 0);
      PlayerState.updateBestScore('arrow', totalStars);
    }
    
    TaskState.updateProgress('arrow_clear', 1);
    AdService.showForcedInterstitial?.('levelup');
    const starRow = [1, 2, 3].map(i =>
      `<span class="text-3xl ${i <= stars ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}" style="${i === 2 ? 'transform:translateY(-6px) scale(1.15);' : ''}">★</span>`
    ).join('');

    const isLast = (mode !== 'endless') && engine.level >= getTotalArrowLevels();
    createModal({
      title: t('level_complete') || 'Seviye Tamamlandı!',
      content: `
        <div class="flex flex-col items-center gap-4 py-2">
          <div class="flex items-end gap-1.5">${starRow}</div>
          <div class="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center shadow-lg">
            <span class="material-symbols-outlined text-3xl text-white">navigation</span>
          </div>
          <p class="text-lg font-black text-gray-800 dark:text-gray-100 -mt-1">${shapeLabel}</p>
          ${mode === 'endless' ? `<p class="text-sm font-bold text-gray-500"><span class="material-symbols-outlined text-[18px] align-middle">all_inclusive</span></p>` : `<p class="text-sm text-gray-500">${t('level') || 'Seviye'} ${engine.level}</p>`}
          ${reward > 0 ? `<div class="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-cyan-400/15 border border-cyan-400/20"><span class="material-symbols-outlined text-cyan-400 text-lg" style="font-variation-settings:'FILL' 1;">diamond</span><span class="font-black text-cyan-500">+${reward}</span></div>` : ''}
        </div>`,
      actions: [
        ...(isLast ? [] : [{
          text: (mode === 'endless') ? (t('x2_play_now') || 'Hemen Oyna') : (t('next_level') || 'Sonraki Seviye'), primary: true,
          onClick: (close) => { 
            close(); modalOpen = false; 
            if (mode === 'endless') {
              // Endless = her seferinde yeni rastgele tahta.
              let nextLvl = Math.floor(Math.random() * getTotalArrowLevels()) + 1;
              history.replaceState(null, '', `#/arrow?mode=endless&level=${nextLvl}`);
              engine.init(nextLvl);
            } else {
              let nextLvl = engine.level + 1;
              if (nextLvl > getTotalArrowLevels()) nextLvl = 1;
              PlayerState.updateArrowAdventureLevel(nextLvl);
              history.replaceState(null, '', `#/arrow?level=${nextLvl}`);
              engine.init(nextLvl);
            }
            hintUsages = 0; clearStreak = 0; // B3: yeni tahtada kombo sayacı sıfırlansın
            captureShape();
            reveals.clear();
            winGlowT0 = 0; viewScale = 1; viewX = 0; viewY = 0; renderHearts(); renderHintBadge(); resize(); startEntrance(); resetHintTimer(); ensureLoop();
          }
        }]),
        { text: (mode === 'endless') ? (t('back_to_menu') || 'Ana Menü') : (t('back_to_map') || 'Haritaya Dön'), onClick: (close) => { close(); router.navigate(mode === 'endless' ? '#/menu' : MAP_ROUTE); } },
      ],
    });
  }

  // ===== Başarısız =====
  // ===== Başarısız → "İkinci Şans" (diğer modlardaki standart revive akışı) =====
  function onFail() {
    if (modalOpen) return;
    modalOpen = true;
    if (mode !== 'endless') recordArrowOutcome(engine.level, false, engine.wrongTaps);
    Sounds.playSfx?.('game-over');
    Haptics.vibrate?.('game-over');
    const REVIVE_COST = 150;

    const resumeBoard = (close) => {
      engine.addHearts(3);
      renderHearts();
      close();
      modalOpen = false;
      resetHintTimer();
      ensureLoop();
    };
    const toast = (key, fb, type) => Toast.show(t(key) || fb, type);

    const modal = createModal({
      title: t('second_chance') || 'İkinci Şans',
      content: `
        <div class="flex flex-col items-center p-2">
          <span class="text-5xl mb-3 drop-shadow-md">💖</span>
          <p class="text-sm font-bold text-gray-400 mb-6 text-center">${t('out_of_hearts_desc') || 'Canların bitti! Devam etmek ister misin?'}</p>
          <div class="w-full flex flex-col gap-3">
            <button id="arrow-revive-diamonds" class="w-full py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(236,72,153,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined fill" style="font-variation-settings:'FILL' 1;">diamond</span>
              <span>${REVIVE_COST}</span>
              <span class="material-symbols-outlined ml-1" style="font-variation-settings:'FILL' 1;">favorite</span>
              <span>+3</span>
            </button>
            <button id="arrow-revive-ad" class="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-black shadow-[0_4px_15px_rgba(6,182,212,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span class="material-symbols-outlined">play_circle</span>
              <span>${t('watch_ad_hearts') || 'Reklamla +3 Can'}</span>
            </button>
            <button id="arrow-revive-retry" class="w-full py-3.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-primary dark:text-white rounded-2xl font-bold active:scale-95 transition-all hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center gap-2">
              <span class="material-symbols-outlined text-[20px]">refresh</span>
              <span>${t('retry') || 'Tekrar Dene'}</span>
            </button>
            <button id="arrow-revive-giveup" class="w-full py-3 text-gray-400 font-bold active:scale-95 transition-all flex items-center justify-center gap-2">
              <span>${t('back_to_map') || 'Haritaya Dön'}</span>
            </button>
          </div>
        </div>`,
      actions: [],
    });

    modal.querySelector('#arrow-revive-diamonds').addEventListener('click', () => {
      Sounds.playSfx?.('button-tap');
      if (PlayerState.useDiamonds(REVIVE_COST)) {
        PlayerState.save();
        resumeBoard(modal.close);
      } else {
        import('./buyDiamonds.js').then(m => {
            const BuyDiamonds = m.BuyDiamonds;
            let overlayContainer = null;
            const closeOverlay = () => {
              if (overlayContainer && overlayContainer.parentNode) {
                overlayContainer.parentNode.removeChild(overlayContainer);
              }
            };
            overlayContainer = BuyDiamonds(router, closeOverlay);
            overlayContainer.style.position = 'fixed';
            overlayContainer.style.top = '0';
            overlayContainer.style.left = '0';
            overlayContainer.style.width = '100vw';
            overlayContainer.style.height = '100vh';
            overlayContainer.style.zIndex = '10000';
            document.body.appendChild(overlayContainer); activeBodyAppends.push(overlayContainer);
          });
      }
    });
    modal.querySelector('#arrow-revive-ad').addEventListener('click', async () => {
      Sounds.playSfx?.('button-tap');
      let ok = await AdService.showRewardVideoAd?.();
      if (!ok) ok = await AdService.showInterstitial?.(); // ödüllü hazır değilse interstitial yedeği
      if (ok) resumeBoard(modal.close);
      else toast('ad_not_ready', 'Reklam hazır değil.', 'warning');
    });
    modal.querySelector('#arrow-revive-retry').addEventListener('click', () => {
      modal.remove();
      modalOpen = false;
      hintUsages = 0; clearStreak = 0;
      engine.init(engine.level); captureShape(); reveals.clear(); winGlowT0 = 0;
      viewScale = 1; viewX = 0; viewY = 0;
      renderHearts(); renderHintBadge(); resize(); startEntrance(); resetHintTimer(); ensureLoop();
    });
    modal.querySelector('#arrow-revive-giveup').addEventListener('click', () => {
      Sounds.playSfx?.('button-tap');
      modal.close();
      router.navigate(MAP_ROUTE);
    });
  }

  // ===== Yaşam döngüsü =====
  const onResize = () => resize();
  window.addEventListener('resize', onResize);
  // İlk çizim (layout oturduktan sonra)
  requestAnimationFrame(() => { resize(); renderHearts(); startEntrance(); resetHintTimer(); ensureLoop(); });

  AdService.showBanner?.();
  setTimeout(() => checkAndShowTutorial('arrow'), 500);
  const bannerSpacer = document.createElement('div');
  bannerSpacer.className = 'w-full h-[60px] pointer-events-none shrink-0';
  container.appendChild(bannerSpacer);

  container.cleanup = () => {
    scope.destroy(); // izlenen setTimeout/RAF iptali (mevcut manuel teardown + saveState korunur)
    activeBodyAppends.forEach(el => el && el.parentNode && el.remove());
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
    window.removeEventListener('resize', onResize);
    canvas.removeEventListener('touchstart', onTouchStart);
    canvas.removeEventListener('touchmove', onTouchMove);
    canvas.removeEventListener('touchend', onTouchEnd);
    canvas.removeEventListener('click', onClick);
    canvas.removeEventListener('wheel', onWheel);
    if (topBar.cleanup) topBar.cleanup();
    AdService.hideBanner?.();
    if (mode !== 'endless' && !engine.win && !engine.fail) engine.saveState();
    // Tutorial API global'i closure ile engine/canvas'ı tuttuğundan ekran kapanınca bırakılır.
    delete window.arrowTutorialApi;
  };

  return container;
}
