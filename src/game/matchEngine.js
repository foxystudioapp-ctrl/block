/**
 * Match-3 Engine for Mücevher Blok (Jewel Block) Mode
 * Step-by-step processing for animation pipeline support.
 */
import { Storage } from '../utils/storage.js';
import { PlayerState } from '../state/playerState.js';
import { getLevelData } from './matchLevels.js';
import { debouncedSetItem } from '../utils/persist.js';

export class MatchEngine {
  constructor(mode = 'endless', level = 1) {
    this.mode = mode;
    this.rows = 8;
    this.cols = 8;
    this.level = level;
    this.movesLeft = mode === 'adventure' ? 35 : 30;
    this.maxMoves = this.movesLeft;
    this.colors = [1, 2, 3, 4, 5];
    this.gemTargets = [];
    this.targetScore = mode === 'adventure' ? 2000 + (this.level - 1) * 1000 : Infinity;
    this.score = 0;
    this.levelScore = 0;
    this.comboCount = 0;
    this.gameOver = false;
    this.levelUpReady = false;
    this.win = false;
    this.grid = [];
    this.movesEarnedChunks = 0;

    this.gemColorMap = {
      1: 'ruby',
      2: 'sapphire',
      3: 'emerald',
      4: 'gold',
      5: 'diamond',
      6: 'topaz',
    };
    
    if (!this.loadState()) {
      this.init();
    }
  }

  saveState() {
    if (this.mode === 'endless') return;
    const saveKey = 'match_adventure_state';
    const state = {
      level: this.level,
      score: this.score,
      levelScore: this.levelScore
    };
    debouncedSetItem(saveKey, JSON.stringify(state));
  }

  loadState() {
    if (this.mode === 'endless') return false;
    const saveKey = 'match_adventure_state';
    const saved = localStorage.getItem(saveKey);
    if (!saved) return false;
    try {
      const state = JSON.parse(saved);
      // ÖNEMLİ: Oynanacak seviyenin tek doğru kaynağı ekrandır (constructor'a
      // geçilen `level`). Kayıtlı seviye, ekranın seçtiği seviyeyle AYNIYSA
      // skor sürekliliğini geri yükle; FARKLIYSA (haritadan başka seviye
      // seçildiyse) kaydı yok say. Eskiden `this.level = state.level` ile kayıt,
      // seçilen seviyeyi eziyordu (örn. harita L12 derken L5 oynanıyordu).
      if (state.level === this.level) {
        this.score = state.score || 0;
        this.levelScore = state.levelScore || 0;
        this.targetScore = 2000 + (this.level - 1) * 1000;
      }
      return false; // Her durumda init() çalışsın ve tahtayı yeniden kursun
    } catch(e) {
      return false;
    }
  }

  clearSave() {
    const saveKey = 'match_adventure_state';
    localStorage.removeItem(saveKey);
  }

  init() {
    const levelData = getLevelData(this.level);
    const layout = levelData.layout;

    // Wire up gem-collection targets and the level's defined target score
    // for adventure mode. Must run BEFORE the grid is generated, because
    // _randomCell()/_shouldHaveGem() consult gemTargets while building the board.
    if (this.mode === 'adventure') {
      this.gemTargets = (levelData.gems || []).map(g => ({
        type: g.type,
        color: g.color,
        required: g.target,
        collected: 0
      }));
      if (levelData.targetScore) {
        this.targetScore = levelData.targetScore;
      }
      if (levelData.moves) {
        this.movesLeft = levelData.moves;
        this.maxMoves = levelData.moves;
      }
      if (levelData.colors && levelData.colors.length >= 3) {
        // Use the level's color palette, but make sure every gem target's
        // color stays playable so the objective can never become impossible.
        const cols = new Set(levelData.colors);
        this.gemTargets.forEach(g => { if (g.color) cols.add(g.color); });
        this.colors = [...cols];
      }
    } else {
      this.gemTargets = [];
    }

    const obstacleMode = (this.level < 40) 
      ? (Math.random() < 0.5 ? 'brick' : 'cage') 
      : 'mixed';

    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      this.grid[r] = [];
      for (let c = 0; c < this.cols; c++) {
        let isBrick = false;
        let isCage = false;

        if (layout && layout[r] && layout[r][c] !== '.') {
          if (obstacleMode === 'brick') {
            isBrick = true;
          } else if (obstacleMode === 'cage') {
            isCage = true;
          } else {
            if (layout[r][c] === 'B') isBrick = true;
            else if (layout[r][c] === 'C') isCage = true;
            else isBrick = true;
          }
        }

        const cell = this._randomCell(r, c);
        
        if (isBrick) {
          cell.type = 'brick';
          cell.color = 0;
          cell.gem = null;
        } else if (isCage) {
          cell.cage = true;
        }
        
        this.grid[r][c] = cell;
      }
    }
    this._removeInitialMatches();
    if (!this._hasValidMoves()) {
      this.shuffleBoard();
    }
  }

  _randomCell(r, c) {
    let color;
    do {
      color = this.colors[Math.floor(Math.random() * this.colors.length)];
    } while (this._wouldMatch(r, c, color));
    const gem = this._shouldHaveGem(color) ? this.gemColorMap[color] : null;
    return { color, type: 'normal', gem };
  }

  _wouldMatch(r, c, color) {
    if (c >= 2 && this.grid[r][c - 1] && this.grid[r][c - 2] &&
      this.grid[r][c - 1].color === color && this.grid[r][c - 2].color === color) return true;
    if (r >= 2 && this.grid[r - 1] && this.grid[r - 2] &&
      this.grid[r - 1][c] && this.grid[r - 2][c] &&
      this.grid[r - 1][c].color === color && this.grid[r - 2][c].color === color) return true;
    return false;
  }

  _shouldHaveGem(color) {
    if (this.gemTargets.length === 0) return false;
    const gemType = this.gemColorMap[color];
    const target = this.gemTargets.find(g => g.type === gemType);
    if (!target) return false;
    // Tamamlanmış hedef için artık gem üretme (israf engeli). Çoklu-gem
    // seviyelerinde bu, tamamlanmamış renge doğal yönlendirme sağlar: biten
    // rengin hücreleri normale döner, tahta eşleştirme için açılır.
    if (target.collected >= target.required) return false;
    // Taban spawn oranı 0.30 -> 0.50. Eski oran tahtanın yalnızca ~%6'sında
    // (renk eşleşmesi x %30) gem bırakıyordu; hedefler 55 hamlede toplanamıyordu.
    // Hedefe son 3 gem kala oranı yükselt ki "son birkaç gem" duvarı oluşmasın.
    const remaining = target.required - target.collected;
    return Math.random() < (remaining <= 3 ? 0.62 : 0.50);
  }

  _removeInitialMatches() {
    let matches = this.findMatches();
    let attempts = 0;
    while (matches.length > 0 && attempts < 100) {
      for (const match of matches) {
        for (const { r, c } of match.cells) {
          if (this.grid[r][c].type === 'brick') continue;
          const color = this.colors[Math.floor(Math.random() * this.colors.length)];
          const gem = this._shouldHaveGem(color) ? this.gemColorMap[color] : null;
          this.grid[r][c] = { color, type: 'normal', gem, cage: this.grid[r][c].cage };
        }
      }
      matches = this.findMatches();
      attempts++;
    }
  }

  // ==================== STEP-BY-STEP API ====================

  /**
   * Try swapping two adjacent cells. If valid match exists, keep the swap and return matches.
   * If no match, swap back and return { valid: false }.
   * Does NOT process the matches — caller must call executeBlast() etc.
   */
  trySwap(r1, c1, r2, c2) {
    if (this.gameOver) return { valid: false };
    const dr = Math.abs(r1 - r2);
    const dc = Math.abs(c1 - c2);
    if (!((dr === 1 && dc === 0) || (dr === 0 && dc === 1))) return { valid: false };
    if (!this.grid[r1][c1] || !this.grid[r2][c2]) return { valid: false };
    if (this.grid[r1][c1].type === 'brick' || this.grid[r2][c2].type === 'brick') return { valid: false };
    if (this.grid[r1][c1].cage || this.grid[r2][c2].cage) return { valid: false };

    const a = this.grid[r1][c1];
    const b = this.grid[r2][c2];

    // Rainbow swap
    if (a.type === 'rainbow' || b.type === 'rainbow') {
      this.movesLeft--;
      this.comboCount = 0; // yeni hamle: combo zincirini sıfırla (sonraki cascade temiz başlasın)
      const result = this._executeRainbow(r1, c1, r2, c2);
      return { valid: true, rainbow: true, blasted: result.blasted, specials: [] };
    }

    // Special + Special combo
    if (a.type !== 'normal' && b.type !== 'normal') {
      this.movesLeft--;
      this.comboCount = 0; // yeni hamle: combo zincirini sıfırla
      const result = this._executeSpecialCombo(r1, c1, r2, c2);
      return { valid: true, specialCombo: true, blasted: result.blasted, specials: [] };
    }

    // Normal swap
    this.grid[r1][c1] = b;
    this.grid[r2][c2] = a;

    const matches = this.findMatches();
    if (matches.length === 0) {
      this.grid[r1][c1] = a;
      this.grid[r2][c2] = b;
      return { valid: false };
    }

    this.movesLeft--;
    this.comboCount = 0;
    return { valid: true, matches };
  }

  /**
   * Process one blast step: clear matched cells, create specials, collect gems.
   * Returns { blasted, specials, score }
   */
  executeBlast(matches, swapR1, swapC1, swapR2, swapC2) {
    this.comboCount++;
    const blasted = [];
    const specials = [];
    let maxMatchLength = 0;

    for (const match of matches) {
      if (match.cells.length > maxMatchLength) {
        maxMatchLength = match.cells.length;
      }
      // Collect gems
      for (const { r, c } of match.cells) {
        const cell = this.grid[r][c];
        if (cell && cell.gem) {
          this._collectGem(cell.gem);
        }
      }

      // Special block position
      let specialPos = match.cells[Math.floor(match.cells.length / 2)];
      if (swapR1 !== undefined) {
        const atSwap1 = match.cells.find(cc => cc.r === swapR1 && cc.c === swapC1);
        const atSwap2 = match.cells.find(cc => cc.r === swapR2 && cc.c === swapC2);
        if (atSwap1) specialPos = atSwap1;
        else if (atSwap2) specialPos = atSwap2;
      }

      // Determine special type
      if (match.matchType === 'rainbow') {
        specials.push({ r: specialPos.r, c: specialPos.c, type: 'rainbow', color: 0 });
      } else if (match.matchType === 'bomb') {
        specials.push({ r: specialPos.r, c: specialPos.c, type: 'diamond_1', color: this.grid[specialPos.r][specialPos.c]?.color || 1 });
      } else if (match.matchType === 'striped') {
        const sType = match.direction === 'horizontal' ? 'striped_v' : 'striped_h';
        specials.push({ r: specialPos.r, c: specialPos.c, type: sType, color: this.grid[specialPos.r][specialPos.c]?.color || 1 });
      }

      for (const { r, c } of match.cells) {
        if (!blasted.some(b => b.r === r && b.c === c)) {
          blasted.push({ r, c, cell: this.grid[r][c] ? { ...this.grid[r][c] } : null });
        }
      }
    }

    // Trigger existing specials being blasted
    const additionalBlasts = [];
    for (const { r, c, cell } of blasted) {
      if (!cell) continue;
      if (cell.type === 'striped_h') {
        for (let cc = 0; cc < this.cols; cc++) {
          if (!blasted.some(b => b.r === r && b.c === cc) && !additionalBlasts.some(b => b.r === r && b.c === cc)) {
            if (this.grid[r][cc]) additionalBlasts.push({ r, c: cc, cell: { ...this.grid[r][cc] } });
          }
        }
      } else if (cell.type === 'striped_v') {
        for (let rr = 0; rr < this.rows; rr++) {
          if (!blasted.some(b => b.r === rr && b.c === c) && !additionalBlasts.some(b => b.r === rr && b.c === c)) {
            if (this.grid[rr][c]) additionalBlasts.push({ r: rr, c, cell: { ...this.grid[rr][c] } });
          }
        }
      } else if (cell.type === 'diamond_1' || cell.type === 'diamond_2' || cell.type === 'bomb') {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < this.rows && nc >= 0 && nc < this.cols) {
              if (!blasted.some(b => b.r === nr && b.c === nc) && !additionalBlasts.some(b => b.r === nr && b.c === nc)) {
                if (this.grid[nr][nc]) additionalBlasts.push({ r: nr, c: nc, cell: { ...this.grid[nr][nc] } });
              }
            }
          }
        }
      }
    }

    for (const ab of additionalBlasts) {
      if (ab.cell && ab.cell.gem) this._collectGem(ab.cell.gem);
      blasted.push(ab);
    }

    // Process blasts: separate cages and actual blasts
    const actuallyBlasted = [];
    const brokenCages = [];
    const specialKeys = new Set(specials.map(s => `${s.r},${s.c}`));

    for (const b of blasted) {
      if (!specialKeys.has(`${b.r},${b.c}`)) {
        if (b.cell && b.cell.cage) {
          // Kafesli blok TEK eşleşmede PATLAR (rengiyle eşleşmeye girince yok olur).
          // Eskiden yalnız kafesi kırılıp blok normal olarak tahtada KALIYORDU → oyuncuya
          // "kafesli bloklar patlamıyor" gibi görünüyordu; üstelik kafesten çıkan blok
          // sonraki yerçekiminde düşüp "yer değiştiriyordu". Artık normal blok gibi
          // temizlenir, eşleşene kadar da executeFalls onu sabit tutar (asla oynamaz).
          brokenCages.push(b);
          actuallyBlasted.push(b);
          this.grid[b.r][b.c] = null;
        } else if (b.cell && b.cell.type === 'diamond_1') {
          actuallyBlasted.push(b);
          this.grid[b.r][b.c] = { color: b.cell.color, type: 'diamond_2', gem: null };
        } else {
          actuallyBlasted.push(b);
          this.grid[b.r][b.c] = null;
        }
      } else {
        actuallyBlasted.push(b); // Special was created here, blast the old block visually
      }
    }

    // Check for adjacent bricks
    const brokenBricks = [];
    const checkBrick = (r, c) => {
       if (r>=0 && r<this.rows && c>=0 && c<this.cols && this.grid[r][c] && this.grid[r][c].type === 'brick') {
          if (!brokenBricks.some(br => br.r === r && br.c === c)) {
             brokenBricks.push({ r, c, cell: { ...this.grid[r][c] } });
             this.grid[r][c] = null;
          }
       }
    };
    for (const b of [...actuallyBlasted, ...brokenCages]) {
       checkBrick(b.r - 1, b.c);
       checkBrick(b.r + 1, b.c);
       checkBrick(b.r, b.c - 1);
       checkBrick(b.r, b.c + 1);
    }
    actuallyBlasted.push(...brokenBricks);

    // Score: Base points scale with match length
    let basePerBlock = 10;
    if (maxMatchLength === 4) basePerBlock = 15;
    else if (maxMatchLength >= 5) basePerBlock = 25;

    // Exponential combo multiplier capped at x5
    const multiplier = Math.min(Math.pow(1.5, this.comboCount - 1), 5);
    const pts = Math.round(actuallyBlasted.length * basePerBlock * multiplier) + brokenCages.length * 10;
    this.addScore(pts);

    // Place specials
    for (const sp of specials) {
      this.grid[sp.r][sp.c] = { color: sp.color, type: sp.type, gem: null };
    }

    return { blasted: actuallyBlasted, brokenCages, specials, score: pts, maxMatchLength };
  }

  /**
   * Apply gravity: drop blocks down, fill top with new ones.
   * Returns { falls } array with from/to positions for animation.
   */
  executeFalls() {
    const falls = [];

    for (let c = 0; c < this.cols; c++) {
      let emptyRow = this.rows - 1;

      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] && (this.grid[r][c].type === 'brick' || this.grid[r][c].cage)) {
          emptyRow = r - 1; // Can't fall through bricks or cages
          continue;
        }
        if (this.grid[r][c] !== null) {
          if (r !== emptyRow) {
            falls.push({
              fromR: r, fromC: c,
              toR: emptyRow, toC: c,
              cell: { ...this.grid[r][c] }
            });
            this.grid[emptyRow][c] = this.grid[r][c];
            this.grid[r][c] = null;
          }
          emptyRow--;
        }
      }

      // Fill any remaining holes with new blocks
      let newIdx = 0;
      for (let r = this.rows - 1; r >= 0; r--) {
        if (this.grid[r][c] === null) {
          newIdx++;
          const color = this.colors[Math.floor(Math.random() * this.colors.length)];
          const gem = this._shouldHaveGem(color) ? this.gemColorMap[color] : null;
          this.grid[r][c] = { color, type: 'normal', gem };
          falls.push({
            fromR: -newIdx, fromC: c,
            toR: r, toC: c,
            cell: { ...this.grid[r][c] },
            isNew: true
          });
        }
      }
    }

    return { falls };
  }

  /**
   * Public match finder
   */
  findMatches() {
    return this._findAllMatches();
  }

  /**
   * Check if game should end
   */
  checkEndCondition() {
    if (this.mode === 'adventure') {
      if (this.gemTargets.length > 0) {
        // Gem-collection level: win when every gem target is met.
        if (this.gemTargets.every(g => g.collected >= g.required)) {
          this.levelUpReady = true;
          return 'levelup';
        }
      } else if (this.levelScore >= this.targetScore) {
        // Score level: win when the target score is reached.
        this.levelUpReady = true;
        return 'levelup';
      }
    }
    if (this.movesLeft <= 0) {
      this.gameOver = true;
      this.clearSave();
      return 'lose';
    }
    return 'continue';
  }

  // True when all gem-collection targets for the current level are met.
  allGemsCollected() {
    return this.gemTargets.length > 0 && this.gemTargets.every(g => g.collected >= g.required);
  }

  revive() {
    this.gameOver = false;
    this.movesLeft += 5;
    this.maxMoves = Math.max(this.maxMoves, this.movesLeft);
  }

  // Çekiç booster'ı: tek bir hücreyi (normal/özel blok veya tuğla/kafes engeli) kaldırır.
  // Hamle harcamaz (ücretli booster). Animasyon için patlatılan hücreyi döndürür; çağıran
  // executeFalls()+cascade akışını çalıştırır. Geçersiz hedefte null döner.
  useHammer(r, c) {
    if (this.gameOver) return null;
    if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return null;
    const cell = this.grid[r][c];
    if (!cell) return null;
    this.comboCount = 0; // yeni eylem: sonraki cascade combo'yu önceki hamleden devraldığı için sıfırla (skor şişmesini önler)
    if (cell.gem) this._collectGem(cell.gem);
    const blasted = [{ r, c, cell: { ...cell } }];
    this.grid[r][c] = null;
    return { blasted };
  }

  addScore(pts) {
    this.score += pts;
    this.levelScore += pts;
    
    // Check Best Score
    let best = PlayerState.state.bestScoreJewel || 0;
    if (this.score > best) {
      PlayerState.state.bestScoreJewel = this.score;
      PlayerState.save();
    }

    if (this.mode === 'endless') {
      const earnedChunks = Math.floor(this.score / 1000);
      if (earnedChunks > this.movesEarnedChunks) {
        const diff = earnedChunks - this.movesEarnedChunks;
        this.movesLeft += diff * 5; // 1000 puan = +5 hamle
        this.maxMoves += diff * 5;
        this.movesEarnedChunks = earnedChunks;
      }
    }
  }

  hasValidMoves() {
    return this._hasValidMoves();
  }

  // ==================== RAINBOW & SPECIAL COMBOS ====================

  _executeRainbow(r1, c1, r2, c2) {
    const a = this.grid[r1][c1];
    const b = this.grid[r2][c2];
    const blasted = [];

    if (a.type === 'rainbow' && b.type === 'rainbow') {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c]) {
            if (this.grid[r][c].gem) this._collectGem(this.grid[r][c].gem);
            blasted.push({ r, c, cell: { ...this.grid[r][c] } });
            this.grid[r][c] = null;
          }
        }
      }
      this.addScore(this.rows * this.cols * 50);
    } else {
      const rainbow = a.type === 'rainbow' ? { r: r1, c: c1 } : { r: r2, c: c2 };
      const other = a.type === 'rainbow' ? b : a;
      const targetColor = other.color;

      blasted.push({ r: rainbow.r, c: rainbow.c, cell: { ...this.grid[rainbow.r][rainbow.c] } });
      this.grid[rainbow.r][rainbow.c] = null;

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (this.grid[r][c] && this.grid[r][c].color === targetColor) {
            if (this.grid[r][c].gem) this._collectGem(this.grid[r][c].gem);
            blasted.push({ r, c, cell: { ...this.grid[r][c] } });
            this.grid[r][c] = null;
          }
        }
      }
      this.addScore(blasted.length * 30);
    }

    return { blasted };
  }

  _executeSpecialCombo(r1, c1, r2, c2) {
    const a = this.grid[r1][c1];
    const b = this.grid[r2][c2];
    const blasted = [];

    const addBlast = (r, c) => {
      if (r >= 0 && r < this.rows && c >= 0 && c < this.cols && this.grid[r][c]) {
        if (!blasted.some(bl => bl.r === r && bl.c === c)) {
          if (this.grid[r][c].gem) this._collectGem(this.grid[r][c].gem);
          blasted.push({ r, c, cell: { ...this.grid[r][c] } });
        }
      }
    };

    if (a.type.startsWith('striped') && b.type.startsWith('striped')) {
      for (let i = 0; i < this.cols; i++) { addBlast(r1, i); addBlast(r2, i); }
      for (let i = 0; i < this.rows; i++) { addBlast(i, c1); addBlast(i, c2); }
    } else if (a.type === 'bomb' && b.type === 'bomb') {
      const cr = Math.floor((r1 + r2) / 2), cc = Math.floor((c1 + c2) / 2);
      for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) addBlast(cr + dr, cc + dc);
    } else {
      for (let dr = -1; dr <= 1; dr++) {
        for (let i = 0; i < this.cols; i++) addBlast(r1 + dr, i);
      }
      for (let dc = -1; dc <= 1; dc++) {
        for (let i = 0; i < this.rows; i++) addBlast(i, c1 + dc);
      }
    }

    this.addScore(blasted.length * 20);
    for (const bl of blasted) this.grid[bl.r][bl.c] = null;

    return { blasted };
  }

  // ==================== MATCH DETECTION ====================

  _findAllMatches() {
    const matches = [];
    const visited = new Set();

    // Auto-match diamond_2 to trigger its second explosion
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] && this.grid[r][c].type === 'diamond_2') {
          matches.push({ cells: [{r, c}], matchType: 'normal', direction: 'none', length: 1 });
          visited.add(`d2-${r}-${c}`);
        }
      }
    }

    // Horizontal
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols - 2; c++) {
        if (!this.grid[r][c] || this.grid[r][c].color === 0 || this.grid[r][c].type === 'brick') continue;
        const color = this.grid[r][c].color;
        let end = c;
        while (end + 1 < this.cols && this.grid[r][end + 1] && this.grid[r][end + 1].color === color && this.grid[r][end + 1].type !== 'brick') end++;
        const len = end - c + 1;
        if (len >= 3) {
          const key = `h-${r}-${c}-${end}`;
          if (!visited.has(key)) {
            visited.add(key);
            const cells = [];
            for (let i = c; i <= end; i++) cells.push({ r, c: i });
            matches.push({ cells, direction: 'horizontal', length: len });
          }
          c = end;
        }
      }
    }

    // Vertical
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows - 2; r++) {
        if (!this.grid[r][c] || this.grid[r][c].color === 0 || this.grid[r][c].type === 'brick') continue;
        const color = this.grid[r][c].color;
        let end = r;
        while (end + 1 < this.rows && this.grid[end + 1][c] && this.grid[end + 1][c].color === color && this.grid[end + 1][c].type !== 'brick') end++;
        const len = end - r + 1;
        if (len >= 3) {
          const key = `v-${c}-${r}-${end}`;
          if (!visited.has(key)) {
            visited.add(key);
            const cells = [];
            for (let i = r; i <= end; i++) cells.push({ r: i, c });
            matches.push({ cells, direction: 'vertical', length: len });
          }
          r = end;
        }
      }
    }

    return this._mergeOverlapping(matches);
  }

  _mergeOverlapping(matches) {
    const merged = [];
    const used = new Set();

    for (let i = 0; i < matches.length; i++) {
      if (used.has(i)) continue;
      let combined = [...matches[i].cells];
      let directions = [matches[i].direction];

      // Tek geçiş, yalnız sonradan birleşen bir parça üzerinden örtüşen başka bir parçayı
      // (daha küçük index'te taranıp geçilmiş olabilir) kaçırır. `combined` büyüdükçe yeni
      // örtüşme doğabileceğinden, hiç ekleme kalmayana kadar (fixpoint) tekrar tara.
      let added = true;
      while (added) {
        added = false;
        for (let j = i + 1; j < matches.length; j++) {
          if (used.has(j)) continue;
          const overlap = matches[j].cells.some(cj => combined.some(ci => ci.r === cj.r && ci.c === cj.c));
          if (overlap) {
            used.add(j);
            for (const cell of matches[j].cells) {
              if (!combined.some(cc => cc.r === cell.r && cc.c === cell.c)) combined.push(cell);
            }
            directions.push(matches[j].direction);
            added = true;
          }
        }
      }

      const isLT = directions.includes('horizontal') && directions.includes('vertical');
      let matchType = 'normal';
      if (isLT && combined.length >= 5) matchType = 'bomb';
      else if (combined.length >= 5) matchType = 'rainbow';
      else if (combined.length >= 4) matchType = 'striped';

      merged.push({ cells: combined, matchType, direction: matches[i].direction, length: combined.length });
    }

    return merged;
  }

  // ==================== HELPERS ====================

  _collectGem(gemType) {
    const target = this.gemTargets.find(g => g.type === gemType);
    if (target) target.collected++;
  }

  _canSwap(r1, c1, r2, c2) {
    const cA = this.grid[r1][c1];
    const cB = this.grid[r2][c2];
    if (!cA || !cB) return false;
    if (cA.type === 'brick' || cB.type === 'brick') return false;
    if (cA.cage || cB.cage) return false;
    return true;
  }

  _hasValidMoves() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols && this._canSwap(r, c, r, c + 1)) {
          this._swapCells(r, c, r, c + 1);
          if (this._findAllMatches().length > 0) { this._swapCells(r, c, r, c + 1); return true; }
          this._swapCells(r, c, r, c + 1);
        }
        if (r + 1 < this.rows && this._canSwap(r, c, r + 1, c)) {
          this._swapCells(r, c, r + 1, c);
          if (this._findAllMatches().length > 0) { this._swapCells(r, c, r + 1, c); return true; }
          this._swapCells(r, c, r + 1, c);
        }
      }
    }
    return false;
  }

  getHintMove() {
    const possibleMoves = [];

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (c + 1 < this.cols && this._canSwap(r, c, r, c + 1)) {
          this._swapCells(r, c, r, c + 1);
          if (this._findAllMatches().length > 0) {
            possibleMoves.push({r1: r, c1: c, r2: r, c2: c + 1});
          }
          this._swapCells(r, c, r, c + 1);
        }
        if (r + 1 < this.rows && this._canSwap(r, c, r + 1, c)) {
          this._swapCells(r, c, r + 1, c);
          if (this._findAllMatches().length > 0) {
            possibleMoves.push({r1: r, c1: c, r2: r + 1, c2: c});
          }
          this._swapCells(r, c, r + 1, c);
        }
      }
    }

    if (possibleMoves.length > 0) {
      const randomIndex = Math.floor(Math.random() * possibleMoves.length);
      return possibleMoves[randomIndex];
    }

    return null;
  }

  getNormalBlocks() {
    const blocks = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.grid[r][c] && this.grid[r][c].type === 'normal') {
          blocks.push({ r, c, cell: this.grid[r][c] });
        }
      }
    }
    return blocks;
  }

  turnIntoSpecial(r, c, type) {
    if (this.grid[r][c]) {
      this.grid[r][c].type = type;
    }
  }

  _swapCells(r1, c1, r2, c2) {
    const temp = this.grid[r1][c1];
    this.grid[r1][c1] = this.grid[r2][c2];
    this.grid[r2][c2] = temp;
  }

  shuffleBoard() {
    const cells = [];
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        if (this.grid[r][c]) cells.push(this.grid[r][c]);

    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    let idx = 0;
    for (let r = 0; r < this.rows; r++)
      for (let c = 0; c < this.cols; c++)
        this.grid[r][c] = cells[idx++] || null;

    this._removeInitialMatches();
    if (!this._hasValidMoves()) this.init();
  }
}
