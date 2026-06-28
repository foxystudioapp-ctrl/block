import './style.css';
import './utils/scrollPerf.js';
import { Router } from './router.js';
import { App } from '@capacitor/app';

import { Splash } from './screens/splash.js';
import { initI18n, t } from './utils/i18n.js';

import { MainMenu } from './screens/mainMenu.js';
import { applyTheme } from './utils/theme.js';
import { PlayerState } from './state/playerState.js';
import { createModal } from './components/modal.js';
import { Storage } from './utils/storage.js';
import { AdService } from './services/adService.js';
import { IAP } from './services/iapService.js';
import { Sounds } from './utils/sounds.js';
import { Haptics } from './utils/haptics.js';
import { Toast } from './components/toast.js';

// ============================================================================
// DÜŞÜK SEGMENT (LOW-END) CİHAZ TESPİTİ — "güzel fikir"
// İlk boyamadan ÖNCE çalışır (modül eval'i, DOMContentLoaded'dan önce) → <html>'e
// `low-end` sınıfı eklenir. style.css'teki `.low-end` blokları yalnız zayıf cihazlarda
// pahalı GPU efektlerini (backdrop-filter blur, box-shadow animasyonları) kapatır.
// Yüksek-segment cihazlar GÖRSEL OLARAK HİÇ ETKİLENMEZ.
// Manuel test/override: localStorage 'lumina_puzzle_force_lowfx' = 'on' | 'off' | (boş=oto)
// ============================================================================
(function detectLowEnd() {
  try {
    const mem = navigator.deviceMemory;          // GB, kaba (0.25..8). iOS'ta undefined olabilir.
    const cores = navigator.hardwareConcurrency;  // mantıksal çekirdek sayısı
    const auto = (mem && mem <= 4) || (cores && cores <= 4);
    const forced = localStorage.getItem('lumina_puzzle_force_lowfx');
    const lowEnd = forced === 'on' ? true : forced === 'off' ? false : auto;
    if (lowEnd) document.documentElement.classList.add('low-end');
  } catch (e) { /* tespit başarısızsa normal (efektli) moda devam */ }
})();

// Temporary placeholder screen renderer
const placeholderScreen = (name) => (router) => {
  const div = document.createElement('div');
  div.className = 'w-full max-w-full lg:max-w-4xl mx-auto min-h-screen flex flex-col items-center justify-center p-8 bg-bg-light dark:bg-primary text-primary dark:text-white animate-pop-up';
  div.innerHTML = `
    <div class="p-6 rounded-3xl glass-card text-center flex flex-col items-center">
      <span class="material-symbols-outlined text-5xl mb-4 text-secondary">construction</span>
      <h1 class="text-2xl font-extrabold mb-2">${name}</h1>
      <p class="text-xs text-gray-500 mb-6">${t('under_construction') || 'Bu ekran yapım aşamasındadır.'}</p>
      <button id="back-to-menu" class="w-full py-3 bg-secondary text-white rounded-2xl shadow-md font-semibold hover:bg-secondary-container active:scale-95 transition-all">
        ${t('back_to_menu') || 'Ana Menüye Dön'}
      </button>
    </div>
  `;
  div.querySelector('#back-to-menu').addEventListener('click', () => {
    router.navigate('#/menu');
  });
  return div;
};

// Oyun ekranları aşağıda tembel (lazy) olarak yüklenir — soğuk başlangıçta
// yalnızca splash + menü parse edilir, oyun ekranları kullanılınca gelir.

window.onerror = function(msg, url, line, col, error) {
  // Üretimde son kullanıcıya ham hata/stack göstermek yerine sessizce logla.
  console.error('Global error:', msg, 'at', url + ':' + line + ':' + col, error);
  return false;
};

// Register screens in router
// Eager (açılışta gerekenler): splash, menü, mağaza (applyTheme)
Router.add('#/', Splash);
Router.add('#/menu', MainMenu);
Router.add('#/shop', (r) => import('./screens/shop.js').then(m => m.Shop(r)));

// Tembel (lazy) yüklenen ekranlar: ilk ziyaret edildiklerinde indirilirler.
Router.add('#/classic', (r) => import('./screens/classicBlock.js').then(m => m.ClassicBlock(r)));
Router.add('#/hex', (r) => import('./screens/hexBlock.js').then(m => m.HexBlock(r)));
Router.add('#/sort', (r) => import('./screens/colorSort.js').then(m => m.ColorSort(r)));
Router.add('#/2048', (r) => import('./screens/game2048.js').then(m => m.Game2048(r)));
Router.add('#/x2', (r) => import('./screens/x2Block.js').then(m => m.X2Block(r)));
Router.add('#/merge', (r) => import('./screens/mergeBlock.js').then(m => m.MergeBlock(r)));
Router.add('#/duel', (r) => import('./screens/duelMode.js').then(m => m.DuelMode(r)));
Router.add('#/match', (r) => import('./screens/matchMode.js').then(m => m.MatchMode(r)));
Router.add('#/bubble', (r) => import('./screens/bubbleShooter.js').then(m => m.BubbleShooter(r)));
Router.add('#/arrow', (r) => import('./screens/arrowPuzzle.js').then(m => m.ArrowPuzzle(r)));
Router.add('#/adventure-map', (r) => import('./screens/adventureMap.js').then(m => m.AdventureMap(r)));
Router.add('#/tasks', (r) => import('./screens/dailyTasks.js').then(m => m.DailyTasks(r)));
Router.add('#/leaderboard', (r) => import('./screens/leaderboard.js').then(m => m.Leaderboard(r)));
Router.add('#/profile', (r) => import('./screens/profile.js').then(m => m.Profile(r)));
Router.add('#/buy-diamonds', (r) => import('./screens/buyDiamonds.js').then(m => m.BuyDiamonds(r, () => {
  if (window.history.length > 2) {
    window.history.back();
  } else {
    r.navigate('#/profile');
  }
})));

// Hardware Back Button Logic for Android
App.addListener('backButton', () => {
  const hash = window.location.hash || '#/';
  const routePath = hash.split('?')[0];
  const gameModes = ['#/classic', '#/hex', '#/sort', '#/2048', '#/x2', '#/merge', '#/duel', '#/match', '#/bubble'];
  const subMenus = ['#/leaderboard', '#/tasks', '#/profile'];
  
  if (hash === '#/' || hash === '#/menu') {
    createModal({
      title: t('exit') || 'Çıkış',
      content: '<p class="text-center font-bold">Çıkmak mı istiyorsunuz?</p>',
      actions: [
        { text: 'Hayır :)', onClick: (close) => close() },
        { text: 'Evet :(', primary: true, onClick: () => App.exitApp() }
      ]
    });
  } else if (routePath === '#/arrow') {
    // Ok Bulmacası: oyun içi geri → seviye haritası
    Router.navigate('#/adventure-map?game=arrow');
  } else if (gameModes.includes(hash)) {
    createModal({
      title: t('quit_game') || 'Oyundan Çıkış',
      content: '<p class="text-center font-bold">Ana menüye dönmek mi istiyorsunuz?</p>',
      actions: [
        { text: 'Hayır', onClick: (close) => close() },
        { text: 'Evet', primary: true, onClick: (close) => { close(); Router.navigate('#/menu'); } }
      ]
    });
  } else if (subMenus.includes(hash)) {
    Router.navigate('#/menu');
  } else if (hash === '#/settings' || hash === '#/shop') {
    if (Router.previousPath && Router.previousPath !== hash) {
      Router.navigate(Router.previousPath);
    } else {
      Router.navigate('#/menu');
    }
  } else {
    Router.navigate('#/menu');
  }
});

// Initialize SPA on load
document.addEventListener('DOMContentLoaded', async () => {
  await initI18n();
  // Apply saved theme
  applyTheme(PlayerState.state.theme);
  
  // Çılgın fikir #8: Reklam + IAP SDK init'ini boot kritik yolundan çıkar.
  // İlk ekran (splash/menü) önce boyanır; ağır SDK kurulumu boştaki (idle) zamanda
  // yapılır. timeout:2000 ile en geç 2sn içinde kesin çalışır (kullanıcı bu sürede
  // bir oyuna giremez; oyun içi showBanner çağrıları çok sonra). WebView'de
  // requestIdleCallback yoksa setTimeout fallback'i devreye girer.
  const deferHeavyInit = () => { AdService.initialize(); IAP.initialize(); };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(deferHeavyInit, { timeout: 2000 });
  } else {
    setTimeout(deferHeavyInit, 800);
  }
  
  // Apply Dark Mode — always follow system preference automatically
  const darkMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const applySystemDark = (e) => {
    if (e.matches) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };
  applySystemDark(darkMediaQuery);
  darkMediaQuery.addEventListener('change', applySystemDark);

  // Init Firebase and wait for auth (Delayed)
  setTimeout(() => {
    import('./services/firebaseSetup.js').then(({ initFirebaseUser }) => {
      initFirebaseUser().then((user) => {
        if (user) {
          import('./services/multiplayerService.js').then(({ MultiplayerService }) => {
            // Global listener for duel challenges
            MultiplayerService.listenForChallenges((challengeData) => {
              // If user already ignored requests, do nothing
              if (PlayerState.state.ignoreDuelRequests) {
                MultiplayerService.respondToChallenge(false);
                return;
              }

              // Create Custom Toast/Banner
              const banner = document.createElement('div');
              banner.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 w-[90%] max-w-sm bg-gray-900/95 dark:bg-black/95 text-white p-4 rounded-3xl shadow-[0_10px_40px_rgba(34,211,238,0.3)] border border-cyan-500/30 z-[9999] flex flex-col gap-3 animate-slide-down backdrop-blur-md';
              
              banner.innerHTML = `
                <div class="flex items-center gap-3 w-full">
                  <div class="relative shrink-0">
                    <img loading="lazy" decoding="async" src="/avatars/${challengeData.challengerAvatar}.png" onerror="this.src='/avatars/akita.png'" class="w-12 h-12 rounded-full border-2 border-cyan-400 shadow-md" />
                    <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center animate-pulse border border-white">
                      <span class="material-symbols-outlined text-[10px]">swords</span>
                    </div>
                  </div>
                  <div class="flex flex-col flex-1">
                    <span class="text-xs font-black text-cyan-400 uppercase tracking-widest">${t('duel_request') || 'DÜELLO İSTEĞİ!'}</span>
                    <span class="text-sm font-medium leading-tight"><b class="font-black text-white">${challengeData.challengerName}</b> sana meydan okuyor!</span>
                  </div>
                </div>
                <div class="flex items-center gap-2 w-full mt-1">
                  <button id="btn-decline" class="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors active:scale-95 border border-white/5 text-gray-300">
                    ${t('decline') || 'Reddet'}
                  </button>
                  <button id="btn-accept" class="flex-1 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-xs font-black shadow-lg hover:shadow-cyan-500/30 transition-all active:scale-95 text-white">
                    ${t('accept') || 'Kabul Et'}
                  </button>
                </div>
              `;

              document.body.appendChild(banner);
              Sounds.playSfx('success');
              Haptics.vibrate('heavy');

              const closeBanner = () => {
                banner.classList.remove('animate-slide-down');
                banner.classList.add('animate-slide-up');
                setTimeout(() => {
                  if (responded) return;
                  if (banner.parentNode) document.body.removeChild(banner);
                }, 300);
              };

              let responded = false;
                banner.querySelector('#btn-decline').onclick = () => {
                  if (responded) return;
                  responded = true;
                MultiplayerService.respondToChallenge(false);
                PlayerState.state.ignoreDuelRequests = true; // Ignore future requests
                PlayerState.save();
                Toast.show('İstek reddedildi. Ana menüye dönene kadar bildirim almayacaksınız.', 'info');
                closeBanner();
              };

              banner.querySelector('#btn-accept').onclick = () => {
                  if (responded) return;
                  responded = true;
                MultiplayerService.respondToChallenge(true);
                closeBanner();
                
                Storage.set('duel_multiplayer', true);
                Storage.set('duel_multiplayer_action', 'join');
                Storage.set('duel_room_code', challengeData.roomId);
                Router.navigate('#/duel');
              };

              // Auto close after 15 seconds
              setTimeout(() => {
                if (banner.parentNode) {
                  MultiplayerService.respondToChallenge(false);
                  closeBanner();
                }
              }, 15000);
            });
          });

          import('./services/friendService.js').then(({ FriendService }) => {
            // Birleşik canlı dinleyici: tek onSnapshot ile arkadaşlar + gelen
            // istekler + gönderilen (bekleyen) istekler. Tüm friend state'i
            // canlı güncellenir; profil ekranı ek okuma yapmaz.
            FriendService.listenToFriendships((data) => {
              PlayerState.state.friends = data.friends;
              PlayerState.state.friendRequests = data.incoming;
              PlayerState.state.sentRequests = data.outgoing.map(o => o.otherUid);
              PlayerState.state._friendsFetchedAt = Date.now();
              PlayerState.notify();
              PlayerState.save();
            });
          });
        }
      });
    });
  }, 1000);

  // Daily Cloud Sync on Background/Close
  const handleAppBackgrounded = () => {
    const today = new Date().toDateString();
    if (Storage.get('lastCloudSaveDay') !== today) {
      import('./services/firebaseSetup.js').then(({ syncToCloud }) => {
        syncToCloud().then(res => {
          if (res.success) {
            Storage.set('lastCloudSaveDay', today);
            console.log('Daily cloud sync successful.');
          }
        });
      });
    }
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      handleAppBackgrounded();
    }
  });

  App.addListener('appStateChange', ({ isActive }) => {
    if (!isActive) {
      handleAppBackgrounded();
    }
  });

  Router.init('app');
  
  // Register service worker for PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        console.log('ServiceWorker registration successful with scope: ', reg.scope);
      }, (err) => {
        console.error('ServiceWorker registration failed: ', err);
      });
    });
  }
});
