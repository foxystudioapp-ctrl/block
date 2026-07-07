import { Storage } from '../utils/storage.js';
import { t } from '../utils/i18n.js';
import { Sounds } from '../utils/sounds.js';
import { Toast } from '../components/toast.js';
import { AdService } from '../services/adService.js';

class PlayerStateManager {
  constructor() {
    this.listeners = [];
    
    let defaultName = Storage.get('player_default_name');
    if (!defaultName) {
      defaultName = 'player' + Math.floor(10000 + Math.random() * 90000);
      Storage.set('player_default_name', defaultName);
    }

    const nowMonthKey = new Date().getFullYear() + '-' + new Date().getMonth();
    let storedMonthKey = Storage.get('player_current_month_key', nowMonthKey);
    let needsReset = false;
    
    if (storedMonthKey !== nowMonthKey) {
      needsReset = true;
      Storage.set('player_current_month_key', nowMonthKey);

      // Sezon sonu hesaplamasi (Geçen ayın Global Kupalarına göre)
      const globalScore = Storage.get('player_global_trophies', 0);
      
      let pastLeagueInfo = { id: 'bronze', name: t('league_bronze') || 'Bronz Ligi' };
      let reward = 100;
      if (globalScore >= 100000) { pastLeagueInfo = { id: 'grandmaster', name: t('league_grandmaster') || 'Şampiyonluk Ligi' }; reward = 1000; }
      else if (globalScore >= 50000) { pastLeagueInfo = { id: 'diamond', name: t('league_diamond') || 'Elmas Ligi' }; reward = 600; }
      else if (globalScore >= 20000) { pastLeagueInfo = { id: 'gold', name: t('league_gold') || 'Altın Ligi' }; reward = 400; }
      else if (globalScore >= 5000) { pastLeagueInfo = { id: 'silver', name: t('league_silver') || 'Gümüş Ligi' }; reward = 250; }
      
      const pastSeasons = Storage.get('player_past_seasons', []);
      pastSeasons.push({
        month: storedMonthKey,
        league: pastLeagueInfo.id,
        bestScore: globalScore
      });
      Storage.set('player_past_seasons', pastSeasons);
      
      const pendingRewards = Storage.get('player_pending_season_rewards', null);
      // Önceki sezon ödülü henüz ALINMADIYSA yeni sezonunkini üstüne EKLE (kaybolmasın).
      // Eskiden `if (!pendingRewards)` ile yeni ödül hiç yazılmıyordu → alınmamış ödül
      // sonraki sezonunkini kalıcı olarak bloke ediyordu.
      const carriedDiamonds = (pendingRewards && Number(pendingRewards.diamonds)) || 0;
      Storage.set('player_pending_season_rewards', {
        league: pastLeagueInfo.id,
        diamonds: reward + carriedDiamonds,
        month: storedMonthKey
      });
    }

    // Load state from local storage or set default values
    this.state = {
      isVip: Storage.get('player_is_vip', false),
      lastVipRewardTime: Storage.get('player_last_vip_reward_time', 0),
      currentMonthKey: nowMonthKey,
      // Automatically convert legacy coins to diamonds for existing players
      diamonds: Storage.get('player_diamonds', Storage.get('player_coins', 500)),
      xp: Storage.get('player_xp', 0),
      level: Storage.get('player_level', 1),
      theme: Storage.get('player_theme', 'white'),
      unlockedThemes: Storage.get('player_unlocked_themes', ['white']),
      lastLogin: Storage.get('player_last_login', null),
      bestScoreClassic: Storage.get('player_best_score_classic', 0),
      bestScoreHex: Storage.get('player_best_score_hex', 0),
      bestScoreSort: Storage.get('player_best_score_sort', 0),
      bestScore2048: Storage.get('player_best_score2048', 0),
      bestScoreX2: Storage.get('player_best_score_x2', 0),
      bestScoreMerge: Storage.get('player_best_score_merge', 0),
      bestScoreBubble: Storage.get('player_best_score_bubble', 0),
      bestScoreArrow: Storage.get('player_best_score_arrow', 0),
      bubbleAdventureLevel: Storage.get('player_bubble_adventure_level', 1),
      arrowAdventureLevel: Storage.get('player_arrow_adventure_level', 1),
      bestScoreDuel: Storage.get('player_best_score_duel', 0),
      duelMatches: Storage.get('player_duel_matches', 0),
      duelWins: Storage.get('player_duel_wins', 0),
      duelLosses: Storage.get('player_duel_losses', 0),
      currentAdventureLevel: Storage.get('player_adventure_level', 1),
      adventureStars: Storage.get('player_adventure_stars', 0),
      profileName: Storage.get('player_profile_name', defaultName),
      profileTitle: Storage.get('player_profile_title', 'title_block_architect'),
      avatarSeed: Storage.get('player_avatar_seed', 'akita'),
      unlockedAvatars: Storage.get('player_unlocked_avatars', ['akita']),
      lastLoginRewardTime: Storage.get('player_last_login_reward_time', null),
      loginStreak: Storage.get('player_login_streak', 0),
      welcomeBonusClaimed: Storage.get('player_welcome_bonus_claimed', false),
      friends: Storage.get('player_friends', []),
      _friendsFetchedAt: Storage.get('player__friends_fetched_at', 0),
      friendRequests: [],
      sentRequests: [],
      linkedProvider: Storage.get('player_linked_provider', null),
      jewelCrushLevel: Storage.get('player_jewel_crush_level', 1),
      sortAdventureLevel: Storage.get('player_sort_adventure_level', 1),
      sortEndlessLevel: Storage.get('player_sort_endless_level', 1),
      g2048AdventureLevel: Storage.get('player_g2048_adventure_level', 1),
      mergeAdventureLevel: Storage.get('player_merge_adventure_level', 1),
      x2AdventureLevel: Storage.get('player_x2_adventure_level', 1),
      minerCurrentArea: Storage.get('player_miner_area', 1),
      bestScoreJewel: Storage.get('player_best_score_jewel', 0),
      pastSeasons: Storage.get('player_past_seasons', []),
      pendingSeasonRewards: Storage.get('player_pending_season_rewards', null),
      currentRivals: Storage.get('player_current_rivals', {}),
      globalTrophies: needsReset ? 0 : Storage.get('player_global_trophies', 0),
    };

    // --- Legacy Save Migration ---
    // Eğer oyuncu daha önce eski modlarda belli bir seviyeye gelmişse (örn: 420. seviye)
    // ancak adventure level'ı 1 ise, eski seviyesini adventure level'a aktar.
    const legacyMigrations = [
      { legacyKey: 'x2_save_state', stateKey: 'x2AdventureLevel' },
      { legacyKey: 'bubble_stars', stateKey: 'bubbleAdventureLevel', isMap: true },
      { legacyKey: 'arrow_save', stateKey: 'arrowAdventureLevel' },
      { legacyKey: 'sort_save_state', stateKey: 'sortAdventureLevel' },
      { legacyKey: '2048_save_state', stateKey: 'g2048AdventureLevel' },
      { legacyKey: 'merge_save_state', stateKey: 'mergeAdventureLevel' }
    ];

    let migrationOccurred = false;
    legacyMigrations.forEach(migration => {
      // Sadece macera modunda ilerlememişse (seviye 1 ise) aktarım yap
      if (this.state[migration.stateKey] === 1) {
        if (migration.isMap) {
          // Object.keys(map).length mantığı (bubble_stars gibi)
          const legacyState = Storage.get(migration.legacyKey);
          if (legacyState && typeof legacyState === 'object') {
            const maxLevel = Math.max(0, ...Object.keys(legacyState).map(Number)) + 1;
            if (maxLevel > 1) {
              this.state[migration.stateKey] = maxLevel;
              migrationOccurred = true;
            }
          }
        } else {
          // Standart { level: N } mantığı
          const legacyState = Storage.get(migration.legacyKey);
          if (legacyState && legacyState.level && legacyState.level > 1) {
            this.state[migration.stateKey] = legacyState.level;
            migrationOccurred = true;
          }
        }
      }
    });

    if (needsReset || migrationOccurred) {
      // Save the reset scores or migrated levels back to storage
      this.saveNow();
    }

    // Ensure data is saved when the user closes the window or tab.
    // beforeunload Android WebView'de güvenilmez; visibilitychange:hidden + pagehide
    // arka plana alma/kapanışta da flush eder (500ms debounce dolmadan veri kaybını önler).
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.saveNow());
      window.addEventListener('pagehide', () => this.saveNow());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.saveNow();
      });
      // NATIVE (Capacitor): Android/iOS'ta arka plana alınınca `visibilitychange` GENELDE
      // tetiklenmez (bkz. sounds.js); asıl güvenilir sinyal `appStateChange`. Bekleyen
      // ekonomi/ilerleme yazımları OS process'i öldürmeden önce diske insin.
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) this.saveNow();
        });
      }).catch(() => { /* App yoksa (saf web) yoksay */ });
    }
  }

  // Cihazdaki tüm yerel oyun verisini siler ve daha fazla yazımı kalıcı olarak durdurur.
  // Hesap silme akışında, bulut verisi temizlendikten SONRA çağrılır; ardından sayfa
  // yeniden yüklenerek (reload) oyun sıfırdan/temiz başlatılır.
  wipeLocalData() {
    this._wiped = true;
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    Storage.clear();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify(changedKeys = null) {
    [...this.listeners].forEach(listener => listener(this.state, changedKeys));
  }

  save() {
    if (this._wiped) return;
    this.notify();
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => {
      this.saveNow();
    }, 500);
  }

  saveNow() {
    // Hesap silindikten sonra beforeunload/pagehide tetiklenip bellekteki eski
    // durumu localStorage'a GERİ YAZMASIN — aksi halde silme reload sonrası geri gelir.
    if (this._wiped) return;
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    // Dirty-tracking: her kayıtta ~45 senkron setItem yerine yalnız DEĞİŞEN anahtarları yaz.
    // Depolama formatı (anahtar başına `player_*`) aynı kalır — kayıtlı ilerleme bozulmaz.
    if (!this._lastWritten) this._lastWritten = {};
    Object.keys(this.state).forEach(key => {
      const storageKey = this.decamelize(key);
      let serialized;
      try { serialized = JSON.stringify(this.state[key]); } catch (e) { serialized = undefined; }
      if (serialized !== undefined && this._lastWritten[storageKey] === serialized) return;
      this._lastWritten[storageKey] = serialized;
      Storage.set(`player_${storageKey}`, this.state[key]);
    });
  }

  decamelize(str) {
    return str.replace(/([a-z\d])([A-Z])/g, '$1_$2').toLowerCase();
  }

  loadFromCloud(cloudData) {
    if (!cloudData || !cloudData.progress) return;
    
    const progress = cloudData.progress;
    let changed = false;

    const fieldsToImport = [
      'isVip', 'lastVipRewardTime', 'diamonds', 'xp', 'level', 'theme', 'unlockedThemes',
      'bestScoreClassic', 'bestScoreHex', 'bestScoreSort', 'bestScore2048',
      'bestScoreX2', 'bestScoreMerge', 'bestScoreBubble', 'bestScoreArrow', 'bestScoreDuel', 'duelMatches', 'duelWins', 'duelLosses',
      'currentAdventureLevel', 'adventureStars', 'profileName', 'profileTitle', 'avatarSeed',
      'unlockedAvatars', 'jewelCrushLevel', 'sortAdventureLevel', 'sortEndlessLevel',
      'g2048AdventureLevel', 'mergeAdventureLevel', 'bubbleAdventureLevel', 'x2AdventureLevel', 'arrowAdventureLevel',
      'minerCurrentArea', 'bestScoreJewel', 'pastSeasons', 'globalTrophies',
      'lastLoginRewardTime', 'loginStreak', 'pendingSeasonRewards'
    ];

    // Para/sayaç gibi DÜŞEBİLEN alanlar Math.max ile birleştirilmemeli — aksi halde
    // harcanan elmas bulut değeriyle geri yüklenir (dupe açığı). Bunlar bulut-yetkili
    // (son yazan kazanır) olarak doğrudan atanır.
    const cloudAuthoritativeFields = new Set([
      'diamonds', 'isVip', 'lastVipRewardTime', 'theme', 'profileTitle',
    ]);

    // Ekonomi zaman-damgasına bağlı alanlar: yalnız bulut daha yeniyse uygulanır (senkronlanmamış
    // yerel kazanç/harcama/ödül-alma ezilmez). Günlük ödül alanları da buraya dahil → cihazlar
    // arası çift-alma/kayıp önlenir (günlük ödül alımı zaten _touchEconomy tetikler).
    const econGatedFields = new Set(['diamonds', 'lastLoginRewardTime', 'loginStreak']);

    // ELMAS için zaman-damgalı son-yazan-kazanır: yerelde senkronlanmamış elmas
    // değişikliği (kazanç/harcama/satın alma) varsa eski bulut değeriyle EZME.
    //   - Yeniden kurulum: yerel timestamp 0 → bulut daha yeni → bulut kazanır (bakiye geri gelir).
    //   - Offline kazanç sonrası açılış: yerel daha yeni → yerel korunur (kazanç kaybolmaz).
    //   - Harcama sonrası açılış: yerel daha yeni → yerel (düşük) korunur (dupe yok).
    const cloudLastSync = Number(cloudData.lastSync) || 0;
    const localEconChange = Number(Storage.get('econ_last_change', 0)) || 0;
    // İLK bulut yüklemesinde (bu cihazda daha önce hiç senkron olmamış) econ-timestamp'i
    // YOK SAY ve bulutu yetkili kabul et. Aksi halde: yeni cihazda, auth gelmeden alınan
    // küçük bir ödül (econ_last_change=now) gerçek bulut bakiyesini ezip elmasları siler.
    const firstCloudLoad = !Storage.get('cloud_synced_once', false);
    const cloudWinsEconomy = firstCloudLoad || cloudLastSync >= localEconChange;

    fieldsToImport.forEach(key => {
      if (progress[key] === undefined && key !== 'pendingSeasonRewards') return;

      if (econGatedFields.has(key)) {
        // Elmas + günlük ödül alanları: yalnız bulut daha yeniyse uygula (dupe/kayıp önler).
        if (progress[key] !== undefined && cloudWinsEconomy) {
          this.state[key] = progress[key];
          changed = true;
        }
      } else if (key === 'pendingSeasonRewards') {
        // Yerelde YENİ oluşmuş (ay dönümü) sezon ödülünü EZME; yalnız yerelde yokken buluttakini al.
        if (!this.state.pendingSeasonRewards && progress.pendingSeasonRewards) {
          this.state.pendingSeasonRewards = progress.pendingSeasonRewards;
          changed = true;
        }
      } else if (key === 'globalTrophies') {
        // Sezon (ay) sınırı: bulut değeri GEÇEN aya aitse aylık sıfırlama korunur; aksi halde
        // (aynı ay veya eski istemci — month alanı yok) monoton max-merge.
        const cloudMonth = progress.globalTrophiesMonth;
        if (cloudMonth === undefined || cloudMonth === this.state.currentMonthKey) {
          const cloudVal = Number(progress.globalTrophies);
          this.state.globalTrophies = Math.max(this.state.globalTrophies || 0, Number.isFinite(cloudVal) ? cloudVal : 0);
          changed = true;
        }
      } else if (cloudAuthoritativeFields.has(key)) {
        this.state[key] = progress[key];
        changed = true;
      } else if (typeof this.state[key] === 'number') {
        // Yalnız monoton artan alanlar (skor/seviye/yıldız) için max birleştirme.
        const cloudVal = Number(progress[key]);
        this.state[key] = Math.max(this.state[key] || 0, Number.isFinite(cloudVal) ? cloudVal : 0);
        changed = true;
      } else {
        this.state[key] = progress[key];
        changed = true;
      }
    });
    
    if (changed) {
      this.save();
    }
    // Bu cihazda artık en az bir kez bulut yüklendi → sonraki yüklemeler econ-timestamp'e uyar
    // (offline-kazanç/dupe koruması yine çalışır). wipeLocalData → Storage.clear bunu sıfırlar.
    try { Storage.set('cloud_synced_once', true); } catch (e) { /* yoksay */ }
  }

  // Add/Use methods for legacy compatibility where needed, re-routing to diamonds
  addCoins(amount) {
    this.addDiamonds(amount);
  }

  useCoins(amount) {
    return this.useDiamonds(amount);
  }

  // Elmas bakiyesinde yerel değişiklik zaman damgası. loadFromCloud bunu bulutun
  // lastSync'i ile karşılaştırıp senkronlanmamış yerel kazanç/harcamayı korur.
  _touchEconomy() {
    try { Storage.set('econ_last_change', Date.now()); } catch (e) { /* yoksay */ }
  }

  addDiamonds(amount) {
    const amt = Number(amount);
    // Geçersiz (NaN/undefined) miktar elmasları kalıcı olarak bozar; sessizce yok say.
    if (!Number.isFinite(amt) || amt === 0) return;
    const current = Number.isFinite(this.state.diamonds) ? this.state.diamonds : 0;
    this.state.diamonds = Math.max(0, current + amt);
    this._touchEconomy();
    this.save();
  }

  updateSortEndlessLevel(level) {
    if (level > this.state.sortEndlessLevel) {
      this.state.sortEndlessLevel = level;
      this.save();
      this.notify();
    }
  }

  updateArrowAdventureLevel(level) {
    if (level > this.state.arrowAdventureLevel) {
      this.state.arrowAdventureLevel = level;
      this.save();
      this.notify();
    }
  }

  useDiamonds(amount) {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt < 0) return false;
    const current = Number.isFinite(this.state.diamonds) ? this.state.diamonds : 0;
    if (current >= amt) {
      this.state.diamonds = current - amt;
      this._touchEconomy();
      this.save();
      return true;
    }
    return false;
  }

  getXpNeeded(level) {
    if (level <= 10) {
      return level * 1000;
    } else {
      return (level * 1000) + (Math.pow(level - 10, 2) * 200);
    }
  }

  getRankInfo(level) {
    if (level < 5) return { key: 'rank_novice', color: 'text-green-500' };
    if (level < 10) return { key: 'rank_apprentice', color: 'text-blue-500' };
    if (level < 20) return { key: 'rank_adept', color: 'text-purple-500' };
    if (level < 35) return { key: 'rank_master', color: 'text-orange-500' };
    if (level < 50) return { key: 'rank_grandmaster', color: 'text-red-500' };
    if (level < 70) return { key: 'rank_legend', color: 'text-yellow-400' };
    return { key: 'rank_supreme', color: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 animate-pulse' };
  }

  getLeagueInfo(rank) {
    if (rank <= 100) return { id: 'grandmaster', name: t('league_grandmaster') || 'Şampiyonluk Ligi', icon: 'workspace_premium', color: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/50' };
    if (rank <= 1000) return { id: 'diamond', name: t('league_diamond') || 'Elmas Ligi', icon: 'diamond', color: 'text-cyan-400', bg: 'bg-cyan-400/20', border: 'border-cyan-400/50' };
    if (rank <= 5000) return { id: 'gold', name: t('league_gold') || 'Altın Ligi', icon: 'military_tech', color: 'text-amber-500', bg: 'bg-amber-500/20', border: 'border-amber-500/50' };
    if (rank <= 15000) return { id: 'silver', name: t('league_silver') || 'Gümüş Ligi', icon: 'military_tech', color: 'text-gray-300', bg: 'bg-gray-300/20', border: 'border-gray-300/50' };
    return { id: 'bronze', name: t('league_bronze') || 'Bronz Ligi', icon: 'military_tech', color: 'text-orange-700', bg: 'bg-orange-700/20', border: 'border-orange-700/50' };
  }

  setRival(mode, rivalData) {
    this.state.currentRivals[mode] = rivalData;
    this.save();
  }

  claimSeasonRewards() {
    if (this.state.pendingSeasonRewards) {
      const reward = this.state.pendingSeasonRewards.diamonds || 0;
      this.state.diamonds += reward;
      this.state.pendingSeasonRewards = null;
      this._touchEconomy();
      this.save();
      return reward;
    }
    return 0;
  }

  addXp(amount) {
    this.state.xp += amount;
    
    // Check multiple level ups just in case they gained a lot of XP
    let leveledUp = false;
    let xpNeeded = this.getXpNeeded(this.state.level);
    
    while (this.state.xp >= xpNeeded) {
      this.state.xp -= xpNeeded;
      this.state.level += 1;
      leveledUp = true;
      xpNeeded = this.getXpNeeded(this.state.level);
    }
    
    if (leveledUp) {
      // Trigger level up sound
      Sounds.playSfx('level-up');
      // Import and play toast
      Toast.show((t('level_up_toast') || 'Tebrikler! Seviye {level} oldunuz!').replace('{level}', this.state.level));
      // Attempt to show forced ad (if cooldown allows)
      AdService.showForcedInterstitial('levelup');
    }
    this.save();
  }

  updateBestScore(mode, score) {
    // Map internal mode names to Leaderboard tab names
    let lbMode = mode;
    if (mode === 'classic') lbMode = 'Classic';
    else if (mode === 'hex') lbMode = 'Hex';
    else if (mode === 'sort') lbMode = 'Sort';
    else if (mode === 'jewel') lbMode = 'Jewel';
    else if (mode === '2048') lbMode = '2048';
    else if (mode === 'merge') lbMode = 'Merge';
    else if (mode === 'x2') lbMode = 'X2';
    else if (mode === 'bubble') lbMode = 'Bubble';
    else if (mode === 'arrow') lbMode = 'Arrow';

    // Overtake logic
    const currentRival = this.state.currentRivals[lbMode];
    if (currentRival && score > currentRival.score) {
      Toast.show((t('rival_passed_toast') || '🔥 {name} geçildi! Liderlikte yükseliyorsun!').replace('{name}', currentRival.name), 'success');
      this.state.currentRivals[lbMode] = null; // Clear to prevent spam
    }

    let changed = false;
    
    // Yüzdelik Kupa Katsayıları (Mode Multipliers)
    const multipliers = {
      classic: 1.0,
      hex: 1.0,
      sort: 10.0, // Sort skoru level-tabanlı (küçük sayı) olduğu için katsayı yüksek; ama endless'ta
                  // level kolay tırmandığından 50× lig enflasyonu yaratıyordu → 10×'e dengelendi.
      jewel: 1.5,
      '2048': 1.0,
      merge: 1.0,
      x2: 1.0,
      bubble: 1.0,
      arrow: 20.0 // Ok Bulmacası skoru toplam yıldız (seviye-tabanlı) olduğu için katsayı yüksek
    };
    
    const multiplier = multipliers[mode] || 1.0;
    
    if (mode === 'classic' && score > this.state.bestScoreClassic) {
      const diff = score - this.state.bestScoreClassic;
      this.state.globalTrophies += diff * multiplier;
      this.state.bestScoreClassic = score;
      changed = true;
    } else if (mode === 'hex' && score > this.state.bestScoreHex) {
      const diff = score - this.state.bestScoreHex;
      this.state.globalTrophies += diff * multiplier;
      this.state.bestScoreHex = score;
      changed = true;
    } else if (mode === 'sort' && score > this.state.bestScoreSort) {
      const diff = score - this.state.bestScoreSort;
      this.state.globalTrophies += diff * multiplier;
      this.state.bestScoreSort = score;
      changed = true;
    } else if (mode === 'jewel' && score > this.state.bestScoreJewel) {
      const diff = score - this.state.bestScoreJewel;
      this.state.globalTrophies += diff * multiplier;
      this.state.bestScoreJewel = score;
      changed = true;
    } else if (mode === '2048' && score > this.state.bestScore2048) {
      const diff = score - this.state.bestScore2048;
      this.state.globalTrophies += diff * multiplier;
      this.state.bestScore2048 = score;
      changed = true;
    } else if (mode === 'merge' && score > this.state.bestScoreMerge) {
      const diff = score - this.state.bestScoreMerge;
      this.state.globalTrophies += diff * multiplier;
      this.state.bestScoreMerge = score;
      changed = true;
    } else if (mode === 'x2' && score > this.state.bestScoreX2) {
      const diff = score - this.state.bestScoreX2;
      this.state.globalTrophies += diff * multiplier;
      this.state.bestScoreX2 = score;
      changed = true;
    } else if (mode === 'bubble' && score > this.state.bestScoreBubble) {
      const diff = score - this.state.bestScoreBubble;
      this.state.globalTrophies += diff * multiplier;
      this.state.bestScoreBubble = score;
      changed = true;
    } else if (mode === 'arrow' && score > this.state.bestScoreArrow) {
      const diff = score - this.state.bestScoreArrow;
      this.state.globalTrophies += diff * multiplier;
      this.state.bestScoreArrow = score;
      changed = true;
    }
    
    if (changed) {
      // Trophies tam sayı olmalı
      this.state.globalTrophies = Math.round(this.state.globalTrophies);
      this.save();
      return true;
    }
    return false;
  }

  unlockTheme(themeName, cost) {
    // Oyun tek para birimi (elmas) kullanır; eski `currency` parametresi kaldırıldı (yutuluyordu).
    if (this.state.unlockedThemes.includes(themeName)) return true;

    const success = this.useDiamonds(cost);
    if (success) {
      this.state.unlockedThemes.push(themeName);
      this.save();
      return true;
    }
    return false;
  }

  setTheme(themeName) {
    if (this.state.unlockedThemes.includes(themeName)) {
      this.state.theme = themeName;
      this.save();
      return true;
    }
    return false;
  }

  async updateProfile(name, title) {
    const { default: profanityFilter } = await import('../utils/profanityFilter.js');
    if (profanityFilter.check(name) || profanityFilter.check(title)) {
      return { success: false, error: 'profanity' };
    }
    this.state.profileName = name;
    this.state.profileTitle = title;
    this.save();
    return { success: true };
  }

  setAvatar(seed) {
    this.state.avatarSeed = seed;
    this.save();
  }

  unlockAvatar(avatarId, cost) {
    if (this.state.unlockedAvatars.includes(avatarId)) return true;

    const success = this.useDiamonds(cost);
    if (success) {
      this.state.unlockedAvatars.push(avatarId);
      this.save();
      return true;
    }
    return false;
  }

  checkDailyReward() {
    const now = Date.now();
    const last = this.state.lastLoginRewardTime;
    if (!last) return true; // Never claimed
    const elapsed = now - last;
    const twentyFourHours = 24 * 60 * 60 * 1000;
    return elapsed >= twentyFourHours;
  }

  getDailyRewardAmount() {
    const streakRewards = [50, 60, 75, 90, 110, 130, 200];
    const streak = this.state.loginStreak % 7;
    return streakRewards[streak];
  }

  claimDailyReward() {
    if (!this.checkDailyReward()) return false;
    const now = Date.now();
    const last = this.state.lastLoginRewardTime;
    const fortyEightHours = 48 * 60 * 60 * 1000;

    // If more than 48h passed, reset streak
    if (last && (now - last) > fortyEightHours) {
      this.state.loginStreak = 0;
    }

    const amount = this.getDailyRewardAmount();
    this.state.diamonds += amount;
    this.state.loginStreak += 1;
    this.state.lastLoginRewardTime = now;
    this._touchEconomy();
    this.save();
    return amount;
  }

  claimWelcomeBonus() {
    if (this.state.welcomeBonusClaimed) return 0;
    this.state.welcomeBonusClaimed = true;
    this.state.diamonds += 500;
    this._touchEconomy();
    this.save();
    return 500;
  }
}

export const PlayerState = new PlayerStateManager();
