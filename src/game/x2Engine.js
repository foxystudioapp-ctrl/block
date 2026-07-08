import { PlayerState } from '../state/playerState.js';
import { Toast } from '../components/toast.js';
import { t } from '../utils/i18n.js';
import { Storage } from '../utils/storage.js';

export class X2Engine {
  constructor(mode = 'adventure') {
    this.mode = mode; // 'adventure' or 'endless'
    this.cols = 5;
    this.rows = 7;
    
    // Default starting state
    this.level = 1;
    this.score = 0;
    this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
    this.gameOver = false;
    this.maxOnBoard = 0;
    this.comboCount = 0;
    this.lastMergeAnimations = [];
    this.powerCounts = { hammer: 0, swap: 0, change: 0 };
    this.levelUpReady = false;

    if (!this.loadState()) {
      // First time play or no save state
      this.initLevel(this.level);
    }
  }

  // Bir seviyedeki taban (minimum) spawn değeri — hem hedef hem spawn için ORTAK kaynak.
  // Sonsuz maceraya güvenli: bir birleşmenin sonucu Number hassasiyetini (2^53) aşmasın diye
  // kademe üssü kelepçelenir (≈ seviye 1420'de devreye girer; oyun kırılmadan devam eder).
  _getSpawnFloorForLevel(level = this.level) {
    let exp;
    if (level <= 30) exp = 1;       // 2
    else if (level <= 60) exp = 2;  // 4
    else if (level <= 100) exp = 3; // 8
    else exp = 4 + Math.floor((level - 101) / 30); // 16, 32, ... her 30 seviyede bir kademe
    if (exp > 48) exp = 48; // güvenlik kelepçesi (floor*4 birleşince ≤ 2^51)
    return Math.pow(2, exp);
  }

  // Score-based level target — MONOTON ve taban-puana bağlı.
  // (Eski 500 tabanı kaldırıldı: o taban seviye 1–99'u tek hedefte düzleştirip zorluk
  //  eğrisini ters çeviriyordu. Artık hedef seviyeyle pürüzsüz artar ve daima ulaşılabilir.)
  getTargetScore() {
    const floor = this._getSpawnFloorForLevel(this.level);
    // Gerekli "ortalama birleşme" sayısı seviyeyle PÜRÜZSÜZ artar (düz DEĞİL).
    // Eskiden Math.min(16, ...) ile seviye ~16'da platoya oturuyordu; taban değer de
    // yalnız her 30 seviyede değiştiği için 1.–30. seviye hedefi ~224'te SABİT kalıyor,
    // seviyeler ~1 dk'da geçiyordu. Artık hedef her seviye biraz daha yükselir →
    // ilerledikçe yavaşça zorlaşır. Yüksek seviyede tabanın katlanması zorluğu taşır.
    // AYARLANABİLİR: taban birleşme (18) ve seviye başı artış (1.6). Değerleri
    // büyütmek seviyeleri yavaşlatır, küçültmek hızlandırır.
    const mergesNeeded = 18 + this.level * 1.6;
    // Ortalama birleşme puanı ≈ taban değerin ~7 katı (birleşme + küçük cascade)
    const avgMergeScore = floor * 7;
    return Math.round(mergesNeeded * avgMergeScore);
  }

  // Seviye tamamlama ödülü (ekonomi faucet'i) — emsal modlarla aynı ölçek
  // (match: min(100,20+lvl*5), arrow: min(80,15+lvl+stars*5)). x2 SONSUZ olduğu için biraz
  // daha temkinli (tavan 60) ve x2Block tarafında SADECE YENİ EN YÜKSEK SEVİYEDE verilir
  // (replay/farm engeli — yoksa 1→1000 grind'i IAP'ı çökertir). AYARLANABİLİR.
  getLevelReward(level = this.level) {
    return Math.min(60, 15 + level * 2);
  }

  // Adventure modunun toplam seviye sayısı (map için)
  static getTotalLevels() {
    return 100;
  }

  saveState() {
    if (this.mode === 'endless') return;
    const saveKey = 'x2_save_state';
    Storage.set(saveKey, {
      version: 2, // Added versioning to handle breaking mechanic updates
      grid: this.grid,
      score: this.score,
      levelScore: this.levelScore,
      level: this.level,
      currentBlock: this.currentBlock,
      nextBlock: this.nextBlock,
      maxOnBoard: this.maxOnBoard,
      powerCounts: this.powerCounts
    });
  }

  loadState() {
    if (this.mode === 'endless') return false;
    const saveKey = 'x2_save_state';
    const state = Storage.get(saveKey);
    // If it's an old save (missing version 2), force a reset to prevent grid-lock
    if (state && state.version === 2 && state.grid && state.level) {
      this.grid = state.grid;
      this.score = state.score || 0;
      this.levelScore = state.levelScore || 0;
      this.level = state.level || 1;
      this.currentBlock = state.currentBlock;
      this.nextBlock = state.nextBlock;
      this.maxOnBoard = state.maxOnBoard || 0;
      this.powerCounts = state.powerCounts || { hammer: 0, swap: 0, change: 0 };
      this.levelUpReady = false;
      this.gameOver = false;
      this._guaranteePlayable(); // dolu tahta kaydedildiyse soft-lock'u önle
      return true;
    }
    // Hard reset old saves: clean out the storage entirely for X2 to start fresh
    if (state && state.version !== 2) {
      Storage.remove('x2_save_state');
    }
    return false;
  }

  initLevel(lvl, keepBoard = false) {
    this.level = lvl;
    this.levelUpReady = false;
    this.gameOver = false;
    this.levelScore = 0;
    
    if (!keepBoard) {
      // Only clear grid on first play or restart — NOT on level up
      this.grid = Array(this.rows).fill(null).map(() => Array(this.cols).fill(0));
    } else {
      // Seviye atlarken tahta korunur — ama dolu tahtayla geçilirse soft-lock olmasın diye
      // oynanabilirliği garantile.
      this._guaranteePlayable();
    }
    
    // Reset power-up counts per level
    this.powerCounts = { hammer: 0, swap: 0, change: 0 };
    
    this.updateMaxOnBoard();
    this.currentBlock = this.generateBlock();
    this.nextBlock = this.generateBlock();
    this.saveState();
  }

  nextLevel() {
    // Keep the board, just advance level and reset level score
    this.initLevel(this.level + 1, true);
  }

  restartCurrentLevel() {
    this.score = 0;
    this.levelScore = 0;
    this.powerCounts = { hammer: 0, swap: 0, change: 0 };
    this.initLevel(this.level, false);
  }

  // --- Spawn logic: taban değer hem SEVİYEYLE hem de TAHTANIN EN BÜYÜK BLOĞUYLA yükselir ---
  // (2248 / Drop The Number mantığı: küçük bloklar emekliye ayrılır → büyükler beslenebilir,
  //  tahta tıkanmaz. Eski "dinamik kademe" kodu maxPool'u push'tan önce hesapladığı için
  //  fiilen tek bir kademe eklerdi ve endless'ta level=1 sabit olduğundan taban hiç yükselmezdi.)
  generateBlock() {
    const levelFloor = this._getSpawnFloorForLevel(this.level);

    // İlerleme tabanı: tahtanın en büyük bloğunun ~6 kademe altındakiler artık spawn olmaz.
    // Bu, ENDLESS modda da tabanı yükseltir (orada seviye hep 1'dir).
    let progressFloor = 2;
    if (this.maxOnBoard >= 128) {
      let pExp = Math.floor(Math.log2(this.maxOnBoard)) - 6;
      if (pExp < 1) pExp = 1;
      if (pExp > 48) pExp = 48; // güvenlik kelepçesi
      progressFloor = Math.pow(2, pExp);
    }

    const floor = Math.max(levelFloor, progressFloor);
    // Spawn penceresi: çoğunlukla taban, biraz 2x ve 4x (zincir kurmaya izin verir)
    const pool = [floor, floor, floor, floor * 2, floor * 4];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  advanceBlocks() {
    this.currentBlock = this.nextBlock;
    this.nextBlock = this.generateBlock();
  }

  // --- State management ---
  cloneGrid() {
    return this.grid.map(row => [...row]);
  }

  // --- Core: Drop block into column ---
  dropBlock(col) {
    if (this.gameOver || this.levelUpReady) return null;
    if (col < 0 || col >= this.cols) return null;

    // Find highest empty row in this column (closest to top, row 0)
    let targetRow = -1;
    for (let r = 0; r < this.rows; r++) {
      if (this.grid[r][col] === 0) {
        targetRow = r;
        break;
      }
    }
    // Column is full
    if (targetRow === -1) return null;

    const steps = [];

    // Place block
    this.grid[targetRow][col] = this.currentBlock;
    
    steps.push({
      type: 'drop',
      row: targetRow, col: col, value: this.currentBlock,
      grid: this.cloneGrid()
    });

    // Check merges (with cascading)
    const mergeResult = this.checkAndMergeAll(steps);

    // Update max on board
    this.updateMaxOnBoard();

    // Check Game Over and Level Up
    this.checkGameOver();
    
    // Score-based level up check
    if (this.mode === 'adventure' && this.levelScore >= this.getTargetScore()) {
      this.levelUpReady = true;
      this.gameOver = false; // Prevent game over if level up
    }

    // Prepare result
    const result = {
      row: targetRow,
      col: col,
      value: this.currentBlock,
      steps: steps,
      totalCombo: mergeResult.totalCombo,
      scoreGained: mergeResult.scoreGained,
      gameOver: this.gameOver,
      levelUpReady: this.levelUpReady
    };

    // Advance to next block
    this.advanceBlocks();
    
    // Save state after move
    this.saveState();

    return result;
  }

  // --- Find landing row for ghost preview ---
  getLandingRow(col) {
    for (let r = 0; r < this.rows; r++) {
      if (this.grid[r][col] === 0) return r;
    }
    return -1; // Column full
  }

  // --- Merge system ---
  checkAndMergeAll(steps = null) {
    let totalCombo = 0;
    let scoreGained = 0;
    const animations = [];
    let cascadeLevel = 0;

    while (true) {
      const mergeResult = this.findAndMergePairs();
      if (!mergeResult.merged) break;

      cascadeLevel++;
      totalCombo += mergeResult.mergeCount;

      // Combo multiplier: 1st merge = ×1, 2nd cascade = ×1.5, 3rd = ×2, etc.
      const multiplier = 1 + (cascadeLevel - 1) * 0.5;
      const roundScore = Math.floor(mergeResult.rawScore * multiplier);
      scoreGained += roundScore;
      this.score += roundScore;
      this.levelScore += roundScore;

      // Collect animation data
      for (const anim of mergeResult.animations) {
        anim.cascadeLevel = cascadeLevel;
        anim.multiplier = multiplier;
        animations.push(anim);
      }

      if (steps) {
        steps.push({
          type: 'merge',
          merges: mergeResult.animations,
          grid: this.cloneGrid()
        });
      }

      // Apply gravity between cascades
      this.applyGravity();
      
      if (steps) {
        steps.push({
          type: 'gravity',
          grid: this.cloneGrid()
        });
      }
    }

    return { animations, totalCombo, scoreGained };
  }

  findAndMergePairs() {
    let merged = false;
    let mergeCount = 0;
    let rawScore = 0;
    const animations = [];
    const processed = new Set();

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const val = this.grid[r][c];
        if (val === 0) continue;
        const key = `${r},${c}`;
        if (processed.has(key)) continue;

        // Check right neighbor
        if (c + 1 < this.cols && this.grid[r][c + 1] === val && !processed.has(`${r},${c + 1}`)) {
          const newVal = val * 2;
          this.grid[r][c] = newVal;
          this.grid[r][c + 1] = 0;
          rawScore += newVal;
          mergeCount++;
          merged = true;
          processed.add(key);
          processed.add(`${r},${c + 1}`);
          animations.push({
            fromRow: r, fromCol: c + 1,
            toRow: r, toCol: c,
            oldVal: val, newVal: newVal
          });
          continue;
        }

        // Check bottom neighbor
        if (r + 1 < this.rows && this.grid[r + 1][c] === val && !processed.has(`${r + 1},${c}`)) {
          const newVal = val * 2;
          this.grid[r + 1][c] = newVal;
          this.grid[r][c] = 0;
          rawScore += newVal;
          mergeCount++;
          merged = true;
          processed.add(key);
          processed.add(`${r + 1},${c}`);
          animations.push({
            fromRow: r, fromCol: c,
            toRow: r + 1, toCol: c,
            oldVal: val, newVal: newVal
          });
          continue;
        }
      }
    }

    return { merged, mergeCount, rawScore, animations };
  }

  // --- Gravity ---
  applyGravity() {
    for (let c = 0; c < this.cols; c++) {
      const values = [];
      for (let r = 0; r < this.rows; r++) {
        if (this.grid[r][c] !== 0) {
          values.push(this.grid[r][c]);
        }
      }
      for (let r = 0; r < this.rows; r++) {
        this.grid[r][c] = r < values.length ? values[r] : 0;
      }
    }
  }

  // --- Game Over ---
  checkGameOver() {
    for (let c = 0; c < this.cols; c++) {
      if (this.grid[this.rows - 1][c] === 0) {
        return false;
      }
    }
    this.gameOver = true;
    return true;
  }

  _hasEmptyCell() {
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.grid[r][c] === 0) return true;
    return false;
  }

  // Tahta tıkanma koruması (EŞİK TABANLI rahatlatma).
  // NEDEN: Bu modda yerleşmiş bloklar kaydırılamaz; spawn tabanı her 30 seviyede
  // katlanıp küçükleri emekliye ayırınca, EŞİ OLMAYAN büyük tekiller tahtada birikip
  // 35 hücreyi kilitliyordu. Bu yüzden mod ~150-266. seviyede HER oyuncu için duvara
  // çarpıyordu (hedef ne olursa olsun). Oyuncuların 700'e ulaşması yalnızca eski düşük
  // hedeflerin tahtayı hiç doldurmadan hızlı atlatmasındandı.
  // ÇÖZÜM: Tahta dolulukta TRIGGER eşiğini aşarsa EN KÜÇÜK blokları temizleyip TARGET_FILL
  // doluluğa indir. Eşik tabanlı olduğu için sağlıklı tahtada (≤%65) HİÇ tetiklenmez —
  // taşıma/zincir hissi korunur. Seviye-atlamada (initLevel keepBoard) ve yüklemede
  // (loadState) çağrıldığından, 700'de kilitli kalmış oyuncular girer girmez nefes alır.
  _guaranteePlayable() {
    const total = this.rows * this.cols;
    const countEmpty = () => {
      let n = 0;
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++)
          if (this.grid[r][c] === 0) n++;
      return n;
    };
    const TRIGGER = 0.65;      // tahta bundan doluysa rahatlat
    const TARGET_FILL = 0.5;   // bu doluluğa kadar EN KÜÇÜKLERİ temizle (~%50 boş kalır)

    let filled = total - countEmpty();
    if (filled > total * TRIGGER) {
      const targetFilled = Math.floor(total * TARGET_FILL);
      const cells = [];
      for (let r = 0; r < this.rows; r++)
        for (let c = 0; c < this.cols; c++)
          if (this.grid[r][c] > 0) cells.push({ r, c, val: this.grid[r][c] });
      cells.sort((a, b) => a.val - b.val); // küçükten büyüğe
      let i = 0;
      while (filled > targetFilled && i < cells.length) {
        this.grid[cells[i].r][cells[i].c] = 0;
        filled--; i++;
      }
      this.applyGravity();
      this.updateMaxOnBoard();
    }

    // Güvenlik tabanı: yine de hiç boş hücre yoksa en az bir sütun aç (soft-lock'u önle).
    if (countEmpty() === 0) {
      for (let c = 0; c < this.cols; c++) this.grid[this.rows - 1][c] = 0;
      this.applyGravity();
      this.updateMaxOnBoard();
    }
  }

  revive() {
    // Anlamlı ikinci şans: tahtanın ~%35'i boşalana kadar EN KÜÇÜK blokları temizle.
    // (Eskiden yalnızca en küçük 3 blok siliniyordu → dolu tahtada 3 hamlelik soluk; üstelik
    //  hâlâ birleşebilecek küçükleri alıp büyük takılı blokları bırakıyordu. Artık yeterince
    //  yer açılır; spawn tabanı seviyeye uygun geldiği için oyuncu toparlanabilir.)
    const totalCells = this.rows * this.cols;
    const targetEmpty = Math.ceil(totalCells * 0.35); // ~12 hücre

    const cells = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] > 0) cells.push({ r, c, val: this.grid[r][c] });
      }
    }
    cells.sort((a, b) => a.val - b.val); // küçükten büyüğe

    let emptyCount = totalCells - cells.length;
    for (let i = 0; i < cells.length && emptyCount < targetEmpty; i++) {
      this.grid[cells[i].r][cells[i].c] = 0;
      emptyCount++;
    }

    this.applyGravity();
    this.updateMaxOnBoard();
    this.gameOver = false;
    this.saveState();
    return true;
  }

  isColumnInDanger(col) {
    return this.grid[this.rows - 2][col] !== 0;
  }

  // --- Max tracker ---
  updateMaxOnBoard() {
    let max = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] > max) max = this.grid[r][c];
      }
    }
    this.maxOnBoard = max;
  }

  // --- Power-Ups ---
  getPowerCost(type) {
    const counts = this.powerCounts[type];
    if (counts >= 3) return -1; // MAX
    const bases = { hammer: 50, swap: 75, change: 30 };
    const multipliers = [1, 3, 6];
    return bases[type] * multipliers[counts];
  }

  useHammer(row, col) {
    if (this.grid[row][col] === 0) return false;
    const cost = this.getPowerCost('hammer');
    if (cost === -1) {
      Toast.show(t('max_powerup_reached') || 'Maksimum kullanım hakkını doldurdun!', 'warning');
      return false;
    }
    if (!PlayerState.useDiamonds(cost)) {
      const msg = (t('need_diamonds_hammer') || `Çekiç için {cost} elmas gerekli!`).replace('{cost}', cost).replace('${cost}', cost);
      Toast.show(msg, 'error');
      return false;
    }
    this.powerCounts.hammer++;
    
    const steps = [];
    this.grid[row][col] = 0;
    steps.push({ type: 'hammer', row, col, grid: this.cloneGrid() });
    
    this.applyGravity();
    steps.push({ type: 'gravity', grid: this.cloneGrid() });
    
    const mergeResult = this.checkAndMergeAll(steps);
    this.updateMaxOnBoard();
    
    if (this.mode === 'adventure' && this.levelScore >= this.getTargetScore()) {
      this.levelUpReady = true;
    }
    
    this.saveState();
    return { removed: true, steps: steps, merges: mergeResult, levelUpReady: this.levelUpReady };
  }

  useSwap(r1, c1, r2, c2) {
    // İki gerçek bloğu takas etmek için her iki hücre de DOLU olmalı. Dolu↔boş takasında
    // applyGravity bloğu hemen geri çekiyor (no-op) ve oyuncu boşuna elmas ödüyordu.
    if (this.grid[r1][c1] === 0 || this.grid[r2][c2] === 0) return false;
    if (r1 === r2 && c1 === c2) return false; // aynı hücre = no-op
    const cost = this.getPowerCost('swap');
    if (cost === -1) {
      Toast.show(t('max_powerup_reached') || 'Maksimum kullanım hakkını doldurdun!', 'warning');
      return false;
    }
    if (!PlayerState.useDiamonds(cost)) {
      const msg = (t('need_diamonds_swap') || `Takas için {cost} elmas gerekli!`).replace('{cost}', cost).replace('${cost}', cost);
      Toast.show(msg, 'error');
      return false;
    }
    this.powerCounts.swap++;
    
    const steps = [];
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;
    steps.push({ type: 'swap', r1, c1, r2, c2, grid: this.cloneGrid() });
    
    this.applyGravity();
    steps.push({ type: 'gravity', grid: this.cloneGrid() });
    
    const mergeResult = this.checkAndMergeAll(steps);
    this.updateMaxOnBoard();
    
    if (this.mode === 'adventure' && this.levelScore >= this.getTargetScore()) {
      this.levelUpReady = true;
    }
    
    this.saveState();
    return { swapped: true, steps: steps, merges: mergeResult, levelUpReady: this.levelUpReady };
  }

}
