import { PlayerState } from '../state/playerState.js';
import { Toast } from '../components/toast.js';
import { t } from '../utils/i18n.js';
import { debouncedSetItem } from '../utils/persist.js';

export class MergeEngine {
  constructor(mode = 'endless', level = 1) {
    this.mode = mode;
    this.level = level;
    this.gridSize = 5;
    this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
    this.score = 0;
    this.levelScore = 0;
    this.targetScore = mode === 'adventure' ? this.getTargetScore(this.level) : Infinity;
    this.gameOver = false;
    this.levelUpReady = false;
    this.tray = [];
    this.history = [];
    this.undoCount = 0;
    
    this.maxSpawnValue = 4; // Increases as score goes up
    
    if (!this.loadGameState()) {
      this.spawnInitialBoard();
      this.fillTray();
    }
  }

  loadGameState() {
    if (this.mode === 'endless') return false;
    const key = this.mode === 'adventure' ? 'merge_adventure_state' : 'merge_endless_state';
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.mode === this.mode && (this.mode === 'endless' || state.level === this.level)) {
          this.grid = state.grid;
          this.score = state.score;
          this.levelScore = state.levelScore || 0;
          this.tray = state.tray || [];
          this.history = state.history || [];
          this.undoCount = state.undoCount || 0;
          this.maxSpawnValue = state.maxSpawnValue || 4;
          this._relieveBoard(); // tıkanmış/kilitli kaydedilen tahta yüklenince nefes aç
          return true;
        }
      } catch (e) {
        console.error("Failed to load Merge state", e);
      }
    }
    return false;
  }

  saveGameState() {
    if (this.mode === 'endless') return;
    const key = this.mode === 'adventure' ? 'merge_adventure_state' : 'merge_endless_state';
    const state = {
      mode: this.mode,
      level: this.level,
      grid: this.grid,
      score: this.score,
      levelScore: this.levelScore,
      tray: this.tray,
      history: this.history,
      undoCount: this.undoCount,
      maxSpawnValue: this.maxSpawnValue
    };
    debouncedSetItem(key, JSON.stringify(state));
  }

  clearSave() {
    const key = this.mode === 'adventure' ? 'merge_adventure_state' : 'merge_endless_state';
    localStorage.removeItem(key);
  }

  // Target score scales exponentially to match tile merge value growth.
  // EĞRİ YUMUŞATILDI: 5x5 (25 hücre) tahta + merge-3 şartı yüzünden tahta hedefe
  // ulaşmadan kilitlenebiliyordu. Taban düşürüldü, ikiye-katlanma yavaşlatıldı (25→35
  // seviye), tavan 5M→1.5M'e indirildi → hedefler tahta kilitlenmeden ulaşılabilir.
  // NOT: küçük tahta yapısı gereği çok yüksek seviyeler hâlâ zorlu olabilir; revive()
  // güvenlik valfı korundu. Gerçek cihaz playtest'i önerilir.
  getTargetScore(level) {
    if (level <= 20) return 400 + level * 350;          // Sv1=750, Sv20=7400 (yumuşak)
    if (level <= 50) return 7400 + (level - 20) * 1000; // Sv21-50: Sv50=37400
    // Sv50+: üstel ama daha yavaş (her ~35 seviyede ikiye katlanır)
    const base = 37400;
    const doublingRate = 35;
    const target = Math.floor(base * Math.pow(2, (level - 50) / doublingRate));
    // 5x5 ızgarada seviye başına skor sınırlı → tavan 1.5M
    return Math.min(target, 1500000);
  }

  nextLevel() {
    this.level++;
    this.targetScore = this.getTargetScore(this.level);
    this.levelScore = 0;
    this.levelUpReady = false;
    this.history = [];
    this._relieveBoard();
    this.saveGameState();
  }

  // Adventure modunda oyun bitince "Tekrar Oyna" bunu çağırır. Constructor'la yeniden
  // kurmak kayıtlı (oyun-bitti) state'i geri yükleyeceğinden, mevcut seviyeyi yerinde
  // sıfırlayıp taze state'i kaydederiz (2048/classic ile aynı desen).
  restartCurrentLevel() {
    this.grid = Array(this.gridSize).fill(null).map(() => Array(this.gridSize).fill(0));
    this.score = 0;
    this.levelScore = 0;
    this.tray = [];
    this.history = [];
    this.undoCount = 0;
    this.gameOver = false;
    this.levelUpReady = false;
    this.maxSpawnValue = 4;
    this.spawnInitialBoard();
    this.fillTray();
    this.saveGameState();
  }

  // Tahta tıkanma koruması (EŞİK TABANLI rahatlatma) — x2'deki kanıtlanmış desenle aynı.
  // NEDEN: 5x5 tahtada (25 hücre) birleşme 3+ bağlı grup gerektirdiğinden, eşi/grubu
  // tamamlanamayan büyük tekiller birikip tahtayı kilitliyor (oyun-bitiş = tahta tamamen
  // dolu). Seviye-atlamada tahta korunduğu ve rahatlatma olmadığı için yüksek seviyede
  // kilitlenme riski var. Bu fonksiyon SADECE tahta TRIGGER eşiğini aşınca EN KÜÇÜK blokları
  // temizleyip TARGET_FILL doluluğa indirir; sağlıklı tahtada (≤eşik) HİÇ tetiklenmez —
  // birleştirme/zincir hissi korunur. Yükleme + seviye-atlamada çağrılır → kilitli kalmış
  // oyuncular girer girmez nefes alır. NOT: emsal sim'lerle birebir doğrulanamadı (3-bağlı
  // merge botu güvenilir kurulamadı) ama tetik-kapılı ve en-küçük-öncelikli olduğundan
  // SAĞLIKLI tahtayı asla bozmaz — saf önleyici, yan etkisiz.
  _relieveBoard(trigger = 0.68, targetFill = 0.5) {
    const total = this.gridSize * this.gridSize;
    const countEmpty = () => {
      let n = 0;
      for (let r = 0; r < this.gridSize; r++)
        for (let c = 0; c < this.gridSize; c++)
          if (this.grid[r][c] === 0) n++;
      return n;
    };
    let filled = total - countEmpty();
    if (filled <= total * trigger) return;
    const targetFilled = Math.floor(total * targetFill);
    const cells = [];
    for (let r = 0; r < this.gridSize; r++)
      for (let c = 0; c < this.gridSize; c++)
        if (this.grid[r][c] > 0) cells.push({ r, c, val: this.grid[r][c] });
    cells.sort((a, b) => a.val - b.val); // en küçükten
    let i = 0;
    while (filled > targetFilled && i < cells.length) {
      this.grid[cells[i].r][cells[i].c] = 0;
      filled--; i++;
    }
  }

  saveState() {
    this.history.push({
      grid: this.grid.map(row => [...row]),
      score: this.score,
      tray: [...this.tray]
    });
    // Geçmişi sınırla: aksi halde her hamlede history büyür ve saveGameState
    // tüm history'yi localStorage'a yazdığı için kayıt blob'u + serileştirme
    // maliyeti oturum boyunca sürekli artar (bellek/performans sızıntısı).
    if (this.history.length > 10) this.history.shift();
  }

  undo() {
    if (this.history.length === 0) {
      Toast.show(t('no_undo_move') || 'Geri alınacak hamle yok!', 'warning');
      return false;
    }

    const costs = [50, 150, 300];
    if (this.undoCount >= costs.length) {
      Toast.show(t('max_undo_reached') || 'Bu oyunda maksimum Geri Al hakkını doldurdun!', 'warning');
      return false;
    }

    const cost = costs[this.undoCount];
    const canUndo = PlayerState.useDiamonds(cost);
    if (!canUndo) {
      const msg = t('need_diamonds_undo') ? t('need_diamonds_undo').replace('{cost}', cost) : `Geri almak için ${cost} elmasa ihtiyacınız var!`;
      Toast.show(msg, 'error');
      return false;
    }

    const state = this.history.pop();
    this.grid = state.grid.map(row => [...row]);
    const scoreDiff = this.score - state.score;
    this.score = state.score;
    this.levelScore = Math.max(0, this.levelScore - scoreDiff);
    if (this.mode === 'adventure' && this.levelScore < this.targetScore) {
      this.levelUpReady = false;
    }
    this.tray = [...state.tray];
    this.gameOver = false;
    this.undoCount++;
    this.saveGameState();
    return true;
  }

  getRandomValue() {
    // Generate 2, 4, 8, 16 depending on maxSpawnValue
    const pool = [2, 2, 2, 4, 4, 8];
    if (this.maxSpawnValue >= 16) pool.push(16);
    if (this.maxSpawnValue >= 32) pool.push(16, 32);
    
    return pool[Math.floor(Math.random() * pool.length)];
  }

  spawnInitialBoard() {
    // Spawn 5 random blocks
    let count = 0;
    while (count < 5) {
      const r = Math.floor(Math.random() * this.gridSize);
      const c = Math.floor(Math.random() * this.gridSize);
      if (this.grid[r][c] === 0) {
        this.grid[r][c] = this.getRandomValue();
        count++;
      }
    }
  }

  fillTray() {
    while (this.tray.length < 3) {
      this.tray.push(this.getRandomValue());
    }
  }

  placeBlock(r, c, trayIndex) {
    if (this.grid[r][c] !== 0) return false; // Cell occupied
    
    this.saveState();
    
    const val = this.tray[trayIndex];
    this.grid[r][c] = val;
    this.tray.splice(trayIndex, 1); // Remove from tray
    this.fillTray(); // Replenish
    
    // Check merges
    const merged = this.checkMergeCascade(r, c);
    
    if (this.mode === 'adventure' && this.levelScore >= this.targetScore && !this.levelUpReady) {
      this.levelUpReady = true;
    }
    this.saveGameState();

    // Update maxSpawnValue based on max block on board
    let maxBlock = 0;
    for (let ir = 0; ir < this.gridSize; ir++) {
      for (let ic = 0; ic < this.gridSize; ic++) {
        if (this.grid[ir][ic] > maxBlock) maxBlock = this.grid[ir][ic];
      }
    }
    if (maxBlock >= 64) this.maxSpawnValue = 16;
    if (maxBlock >= 256) this.maxSpawnValue = 32;

    this.checkGameOver();
    
    return { success: true, merged };
  }

  getConnected(r, c, val, visited) {
    const stack = [{r, c}];
    const component = [];
    
    while (stack.length > 0) {
      const curr = stack.pop();
      const key = `${curr.r},${curr.c}`;
      
      if (!visited.has(key)) {
        visited.add(key);
        component.push(curr);
        
        // Check neighbors
        const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
        for (const [dr, dc] of dirs) {
          const nr = curr.r + dr;
          const nc = curr.c + dc;
          if (nr >= 0 && nr < this.gridSize && nc >= 0 && nc < this.gridSize) {
            if (this.grid[nr][nc] === val) {
              stack.push({r: nr, c: nc});
            }
          }
        }
      }
    }
    return component;
  }

  checkMergeCascade(r, c) {
    let currentR = r;
    let currentC = c;
    let anyMerged = false;
    let cascadeMerges = [];

    while (true) {
      const val = this.grid[currentR][currentC];
      if (val === 0) break; // Should not happen
      
      const visited = new Set();
      const component = this.getConnected(currentR, currentC, val, visited);
      
      if (component.length >= 3) {
        anyMerged = true;
        // Merge them
        // 1. Clear component
        for (const cell of component) {
          this.grid[cell.r][cell.c] = 0;
        }
        // 2. Set new value at target
        const newVal = val * 2;
        this.grid[currentR][currentC] = newVal;
        // 3. Add score
        this.score += component.length * val;
        this.levelScore += component.length * val;
        
        cascadeMerges.push({ cells: component, targetR: currentR, targetC: currentC, newVal });
        
        // Check for "Bomb" logic if number gets too big (e.g. 2048)
        if (newVal >= 2048) {
          // Explode 3x3 area
          this.explode(currentR, currentC);
          cascadeMerges.push({ type: 'bomb', targetR: currentR, targetC: currentC });
          break; // Stop cascade
        }
      } else {
        break; // No more merges
      }
    }
    
    return cascadeMerges.length > 0 ? cascadeMerges : false;
  }

  explode(r, c) {
    for (let ir = Math.max(0, r - 1); ir <= Math.min(this.gridSize - 1, r + 1); ir++) {
      for (let ic = Math.max(0, c - 1); ic <= Math.min(this.gridSize - 1, c + 1); ic++) {
        if (this.grid[ir][ic] !== 0) {
          this.score += this.grid[ir][ic];
          this.levelScore += this.grid[ir][ic];
          this.grid[ir][ic] = 0;
        }
      }
    }
  }

  checkGameOver() {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] === 0) {
          return false;
        }
      }
    }
    this.gameOver = true;
    return true;
  }

  revive() {
    let cells = [];
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.grid[r][c] > 0) {
          cells.push({r, c, val: this.grid[r][c]});
        }
      }
    }
    
    cells.sort((a, b) => a.val - b.val);

    // Dolu hücrelerin ~%40'ını (en küçük değerlileri) temizle — sabit 4 blok çok zayıftı
    // (300 elmas/reklam karşılığı neredeyse anında tekrar game-over). Diğer modlarla (hex ~%40,
    // x2 ~%35) uyumlu; en az 4, en çok mevcut hücre kadar.
    const toRemove = Math.min(cells.length, Math.max(4, Math.round(cells.length * 0.4)));
    for (let i = 0; i < toRemove; i++) {
      this.grid[cells[i].r][cells[i].c] = 0;
    }

    this.gameOver = false;
    this.saveGameState();
    return true;
  }
}
