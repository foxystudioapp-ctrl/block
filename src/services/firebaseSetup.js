import { initializeApp } from 'firebase/app';
import { getAuth as fbGetAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, OAuthProvider, linkWithPopup, signInWithPopup, signInWithCredential, linkWithCredential, deleteUser, signOut } from 'firebase/auth';
import { getFirestore as fbGetFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getDatabase as fbGetDatabase, ref, onDisconnect, set, onValue, remove } from 'firebase/database';
import { PlayerState } from '../state/playerState.js';
import { t } from '../utils/i18n.js';

// Firebase configuration from environment variables
// Note: User needs to provide actual credentials in .env for real functionality
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "DUMMY_KEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dummy.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dummy-project",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://dummy-project.firebaseio.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dummy-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "0000000000",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:0000000000:web:00000000000000"
};

let app = null;
let auth = null;
let db = null;
let rtdb = null;

function getApp() {
  if (!app) {
    try {
      app = initializeApp(firebaseConfig);
    } catch (e) {
      console.error("Firebase init failed", e);
    }
  }
  return app;
}

function getAuth() {
  if (!auth) {
    const appInstance = getApp();
    if (appInstance) {
      auth = fbGetAuth(appInstance);
    }
  }
  return auth;
}

export function getDb() {
  if (!db) {
    const appInstance = getApp();
    if (appInstance) {
      try {
        // Modern kalıcı önbellek (enableIndexedDbPersistence v12'de kullanımdan kalktı)
        db = initializeFirestore(appInstance, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
        });
      } catch (e) {
        // initializeFirestore yalnızca bir kez çağrılabilir; sonraki erişimlerde mevcut örneğe düş
        console.warn("Firestore persistent cache init warn:", e);
        db = fbGetFirestore(appInstance);
      }
    }
  }
  return db;
}

export function getRtdb() {
  if (!rtdb) {
    const appInstance = getApp();
    if (appInstance) {
      rtdb = fbGetDatabase(appInstance);
    }
  }
  return rtdb;
}

// 7 karakterlik kod. Semboller (%#@!*&$ — URL/path-güvensiz, paylaşması zor) ve
// karışan karakterler (0/O, 1/I) çıkarıldı; geriye okunaklı alfanümerik kaldı.
function generateFriendCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const initFirebaseUser = () => {
  return new Promise((resolve) => {
    // Initialize Google Sign In safely
    try {
      GoogleSignIn.initialize({
        clientId: '244495803529-6iro7uhsrf9hkt641ch0cr1v03vrke06.apps.googleusercontent.com',
      });
    } catch (e) {
      console.warn("GoogleSignIn init warn:", e);
    }

    const authInstance = getAuth();
    if (!authInstance) {
      PlayerState.state.firebaseError = true;
      if (!PlayerState.state.friendCode || PlayerState.state.friendCode === '------' || PlayerState.state.friendCode === '-------') {
        PlayerState.state.friendCode = generateFriendCode();
      }
      PlayerState.save();
      return resolve(null);
    }
    const dbInstance = getDb();
    // Token yenilemesi onAuthStateChanged'i aynı kullanıcıyla yeniden tetikler; ağır
    // getDoc/setDoc/loadFromCloud/setupPresence bloğunu uid başına yalnız bir kez çalıştır.
    let authProcessedUid = null;
    onAuthStateChanged(authInstance, async (user) => {
      if (user) {
        if (authProcessedUid === user.uid) { resolve(user); return; }
        authProcessedUid = user.uid;
        // Logged in
        PlayerState.state.firebaseError = false; // Reset error flag
        const userRef = doc(dbInstance, 'users', user.uid);
        try {
          // Fetch user doc without artificial timeout
          const docSnap = await getDoc(userRef);
          
          let friendCode = '';
          if (docSnap.exists() && docSnap.data().friendCode) {
            friendCode = docSnap.data().friendCode;
            const cloudData = docSnap.data();
            if (cloudData.progress) {
              PlayerState.loadFromCloud(cloudData);
            } else {
              // Update profile info periodically for legacy logic
              await updateDoc(userRef, {
                name: PlayerState.state.profileName || "Player",
                avatar: PlayerState.state.avatarSeed || "akita",
                level: PlayerState.state.level || 1,
                score: PlayerState.state.bestScoreClassic || 0,
              });
            }
          } else {
            // New user, check if we have a saved code, otherwise assign new
            if (PlayerState.state.friendCode && PlayerState.state.friendCode !== '------' && PlayerState.state.friendCode !== '-------') {
              friendCode = PlayerState.state.friendCode;
            } else {
              friendCode = generateFriendCode();
            }
            await setDoc(userRef, {
              uid: user.uid,
              friendCode,
              name: PlayerState.state.profileName || "Player",
              avatar: PlayerState.state.avatarSeed || "akita",
              level: PlayerState.state.level || 1,
              score: PlayerState.state.bestScoreClassic || 0,
              createdAt: Date.now()
            });
          }
          
          // Save to player state
          PlayerState.state.uid = user.uid;
          PlayerState.state.friendCode = friendCode;
          PlayerState.save();
          
          // Setup presence
          setupPresence(user.uid);
          resolve(user);
        } catch(e) {
          console.error("Failed to read/write user data", e);
          PlayerState.state.firebaseError = true;
          if (!PlayerState.state.friendCode || PlayerState.state.friendCode === '------' || PlayerState.state.friendCode === '-------') {
            PlayerState.state.friendCode = generateFriendCode();
          }
          PlayerState.state.uid = user.uid;
          PlayerState.save();
          resolve(null);
        }
      } else {
        // Not logged in, sign in anonymously
        signInAnonymously(authInstance).catch(error => {
          console.error("Auth Error", error);
          PlayerState.state.firebaseError = true;
          PlayerState.save();
          resolve(null);
        });
      }
    });
  });
};

let _presenceUnsub = null;
function setupPresence(uid) {
  const rtdbInstance = getRtdb();
  if (!rtdbInstance) return;
  // Önceki '.info/connected' dinleyicisini kapat. Hesap kurtarma/link (signInWithCredential)
  // farklı uid ile yeniden setupPresence çağırır; aksi halde eski dinleyici asılı kalır (sızıntı).
  if (_presenceUnsub) { try { _presenceUnsub(); } catch (e) { /* yoksay */ } _presenceUnsub = null; }
  const statusRef = ref(rtdbInstance, 'status/' + uid);
  const connectedRef = ref(rtdbInstance, '.info/connected');

  _presenceUnsub = onValue(connectedRef, (snap) => {
    if (snap.val() === true) {
      try {
        const con = onDisconnect(statusRef);
        con.set({ state: 'offline', last_changed: Date.now() }).then(() => {
          set(statusRef, { state: 'online', last_changed: Date.now() }).catch(e => {
            console.warn("RTDB Presence Set Error (Safe to ignore if rules are closed):", e.message);
          });
        }).catch(e => {
          console.warn("RTDB Disconnect Set Error (Safe to ignore if rules are closed):", e.message);
        });
      } catch (err) {
        console.warn("RTDB Presence setup failed:", err.message);
      }
    }
  });
}

import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { SignInWithApple } from '@capacitor-community/apple-sign-in';

// Bir promise verilen sürede çözülmezse anlamlı bir hatayla reddeder.
// Android Credential Manager akışı bazı hatalı yapılandırmalarda HİÇ dönmez;
// bu sarmalayıcı, UI'ın sonsuza kadar "Bağlanıyor..." durumunda asılı kalmasını önler.
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(t('auth_timeout', { sec: ms / 1000 }))), ms)
    )
  ]);

// Firebase kimlik bilgisini mevcut misafir (anonim) oturuma bağlar; aktif oturum
// yoksa doğrudan o kimlikle giriş yapar. Anonim giriş ertelenmiş (main.js setTimeout)
// ve asenkron olduğundan, kullanıcı butona anonim oturum kurulmadan basabilir; bu
// durumda "aktif kullanıcı yok" hatası yerine kimliğiyle doğrudan giriş yaparız.
const linkOrSignIn = async (authInstance, credential) => {
  const currentUser = authInstance.currentUser;
  if (!currentUser) {
    await signInWithCredential(authInstance, credential);
    return;
  }
  try {
    await linkWithCredential(currentUser, credential);
  } catch (err) {
    if (
      err.code === 'auth/credential-already-in-use' ||
      err.code === 'auth/email-already-in-use' ||
      // Mevcut oturumda zaten bu sağlayıcı bağlıysa (ör. hesap silindikten sonra
      // kalan hayalet oturum) link yerine doğrudan o kimlikle giriş yap.
      err.code === 'auth/provider-already-linked'
    ) {
      await signInWithCredential(authInstance, credential);
    } else {
      throw err;
    }
  }
};

export const linkAccountWithGoogle = async () => {
  const authInstance = getAuth();
  if (!authInstance) return { success: false, msg: t('auth_no_active_user') };
  try {
    await withTimeout(GoogleSignIn.initialize({
      clientId: '244495803529-6iro7uhsrf9hkt641ch0cr1v03vrke06.apps.googleusercontent.com',
    }), 20000, 'Google başlatma');
    const result = await withTimeout(GoogleSignIn.signIn(), 60000, 'Google girişi');
    const idToken = result.idToken;

    if (!idToken) throw new Error(t('auth_google_token_failed'));

    const credential = GoogleAuthProvider.credential(idToken);
    await linkOrSignIn(authInstance, credential);

    PlayerState.state.linkedProvider = 'google.com';
    PlayerState.save();
    return { success: true, user: authInstance.currentUser };
  } catch (error) {
    console.error("Link Error", error);
    const detail = error?.code ? `${error.code}: ${error.message}` : (error?.message || 'bilinmeyen hata');
    return { success: false, msg: t('auth_link_error') + detail };
  }
};

export const recoverAccountWithGoogle = async () => {
  const authInstance = getAuth();
  try {
    await withTimeout(GoogleSignIn.initialize({
      clientId: '244495803529-6iro7uhsrf9hkt641ch0cr1v03vrke06.apps.googleusercontent.com',
    }), 20000, 'Google başlatma');
    const result = await withTimeout(GoogleSignIn.signIn(), 60000, 'Google girişi');
    const idToken = result.idToken;

    if (!idToken) throw new Error(t('auth_google_token_failed'));

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(authInstance, credential);
    
    PlayerState.state.linkedProvider = 'google.com';
    PlayerState.save();
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Recovery Error", error);
    const detail = error?.code ? `${error.code}: ${error.message}` : (error?.message || 'bilinmeyen hata');
    return { success: false, msg: t('auth_signin_error') + detail };
  }
};

// --- Sign in with Apple (Apple Guideline 4.8) ---
// Apple, nonce'ın SHA256 özetini bekler; Firebase ise ham (raw) nonce'ı ister.
// Bu yüzden rastgele bir raw nonce üretip Apple'a hash'ini, Firebase'e ham halini veririz.
const generateRawNonce = () => {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  // URL-güvenli, okunaklı bir dizeye çevir.
  return Array.from(arr, (b) => ('0' + b.toString(16)).slice(-2)).join('');
};

const sha256Hex = async (str) => {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (b) => ('0' + b.toString(16)).slice(-2)).join('');
};

// Kullanıcı Apple giriş penceresini kapattığında plugin, error 1001 (canceled)
// ile reddeder. Bunu gerçek bir "hata" gibi göstermemek için ayırt ediyoruz.
const isAppleCancelError = (error) =>
  /error 1001/i.test(error?.message || '');

// Apple ile giriş yapıp Firebase kimlik bilgisi (credential) üretir.
// Not: Apple butonu yalnızca iOS'ta gösterilir. Plugin'in iOS native tarafı yalnızca
// scopes/state/nonce okur; clientId/redirectURI sadece web akışında anlamlıdır, bu
// yüzden gönderilmez. Kimlik, uygulamanın bundle id + Sign in with Apple entitlement'ı
// ile belirlenir (App ID'de bu capability açık olmalı; aksi halde native taraf
// AuthorizationError 1000 döner).
const appleFirebaseCredential = async () => {
  const rawNonce = generateRawNonce();
  const hashedNonce = await sha256Hex(rawNonce);

  const result = await withTimeout(SignInWithApple.authorize({
    scopes: 'email name',
    nonce: hashedNonce,
  }), 60000, 'Apple girişi');

  const idToken = result?.response?.identityToken;
  if (!idToken) throw new Error(t('auth_apple_token_failed'));

  const provider = new OAuthProvider('apple.com');
  return provider.credential({ idToken, rawNonce });
};

export const linkAccountWithApple = async () => {
  const authInstance = getAuth();
  if (!authInstance) return { success: false, msg: t('auth_no_active_user') };
  try {
    // Apple giriş penceresini HER durumda aç: anonim oturum henüz kurulmamış olsa
    // bile (main.js'te init ertelenmiş + anonim giriş asenkron) kullanıcı Apple ile
    // giriş yapabilsin. Önce credential al (native Apple diyaloğu burada açılır),
    // sonra mevcut misafir oturuma bağla ya da doğrudan giriş yap. Böylece buton
    // erken "aktif kullanıcı yok" hatası vermez.
    const credential = await appleFirebaseCredential();
    await linkOrSignIn(authInstance, credential);
    PlayerState.state.linkedProvider = 'apple.com';
    PlayerState.save();
    return { success: true, user: authInstance.currentUser };
  } catch (error) {
    if (isAppleCancelError(error)) return { success: false, canceled: true };
    console.error('Apple Link Error', error);
    const detail = error?.code ? `${error.code}: ${error.message}` : (error?.message || 'bilinmeyen hata');
    return { success: false, msg: t('auth_link_error') + detail };
  }
};

export const recoverAccountWithApple = async () => {
  const authInstance = getAuth();
  try {
    const credential = await appleFirebaseCredential();
    const userCredential = await signInWithCredential(authInstance, credential);
    PlayerState.state.linkedProvider = 'apple.com';
    PlayerState.save();
    return { success: true, user: userCredential.user };
  } catch (error) {
    if (isAppleCancelError(error)) return { success: false, canceled: true };
    console.error('Apple Recovery Error', error);
    const detail = error?.code ? `${error.code}: ${error.message}` : (error?.message || 'bilinmeyen hata');
    return { success: false, msg: t('auth_signin_error') + detail };
  }
};

export const syncToCloud = async () => {
  const authInstance = getAuth();
  const dbInstance = getDb();
  if (!authInstance || !authInstance.currentUser || !dbInstance) return { success: false, msg: 'Not logged in' };
  
  try {
    const userRef = doc(dbInstance, 'users', authInstance.currentUser.uid);

    // İstemci tarafı asgari savunma: ekonomi/skor alanlarını makul sınırlara çek.
    // (Asıl koruma sunucu tarafı Firebase Security Rules'tur — bkz. database.rules.json)
    const safeNum = (v, max = 100_000_000) =>
      Number.isFinite(v) ? Math.max(0, Math.min(Math.floor(v), max)) : 0;

    const progressData = {
      isVip: PlayerState.state.isVip,
      lastVipRewardTime: PlayerState.state.lastVipRewardTime,
      diamonds: safeNum(PlayerState.state.diamonds, 10_000_000),
      xp: PlayerState.state.xp,
      level: PlayerState.state.level,
      theme: PlayerState.state.theme,
      unlockedThemes: PlayerState.state.unlockedThemes,
      bestScoreClassic: PlayerState.state.bestScoreClassic,
      bestScoreHex: PlayerState.state.bestScoreHex,
      bestScoreSort: PlayerState.state.bestScoreSort,
      bestScore2048: PlayerState.state.bestScore2048,
      bestScoreX2: PlayerState.state.bestScoreX2,
      bestScoreMerge: PlayerState.state.bestScoreMerge,
      bestScoreBubble: PlayerState.state.bestScoreBubble,
      bestScoreArrow: PlayerState.state.bestScoreArrow,
      bestScoreDuel: PlayerState.state.bestScoreDuel,
      duelMatches: PlayerState.state.duelMatches,
      duelWins: PlayerState.state.duelWins,
      duelLosses: PlayerState.state.duelLosses,
      currentAdventureLevel: PlayerState.state.currentAdventureLevel,
      adventureStars: PlayerState.state.adventureStars,
      profileName: PlayerState.state.profileName,
      profileTitle: PlayerState.state.profileTitle,
      avatarSeed: PlayerState.state.avatarSeed,
      unlockedAvatars: PlayerState.state.unlockedAvatars,
      jewelCrushLevel: PlayerState.state.jewelCrushLevel,
      sortAdventureLevel: PlayerState.state.sortAdventureLevel,
      bubbleAdventureLevel: PlayerState.state.bubbleAdventureLevel,
      arrowAdventureLevel: PlayerState.state.arrowAdventureLevel,
      x2AdventureLevel: PlayerState.state.x2AdventureLevel,
      g2048AdventureLevel: PlayerState.state.g2048AdventureLevel,
      mergeAdventureLevel: PlayerState.state.mergeAdventureLevel,
      sortEndlessLevel: PlayerState.state.sortEndlessLevel,
      minerCurrentArea: PlayerState.state.minerCurrentArea,
      bestScoreJewel: PlayerState.state.bestScoreJewel,
      pastSeasons: PlayerState.state.pastSeasons,
      globalTrophies: safeNum(PlayerState.state.globalTrophies, 10_000_000),
      // globalTrophies'in AİT OLDUĞU ay: loadFromCloud aylık sıfırlamayı bununla korur
      // (geçen sezonun kupaları max-merge ile geri gelmesin).
      globalTrophiesMonth: PlayerState.state.currentMonthKey,
      // Günlük ödül + sezon ödülü alanları (eskiden senkronlanmıyordu → cihazlar arası
      // çift alma / kayıp). loadFromCloud bunları ekonomi zaman-damgasına göre birleştirir.
      lastLoginRewardTime: PlayerState.state.lastLoginRewardTime,
      loginStreak: PlayerState.state.loginStreak,
      pendingSeasonRewards: PlayerState.state.pendingSeasonRewards
    };

    await updateDoc(userRef, {
      progress: progressData,
      name: PlayerState.state.profileName || "Player",
      avatar: PlayerState.state.avatarSeed || "akita",
      level: PlayerState.state.level || 1,
      score: PlayerState.state.bestScoreClassic || 0,
      lastSync: Date.now()
    });

    // Global leaderboard kaydı (RTDB). getTopPlayers 'leaderboards/global'i okur;
    // buraya yazılmadığı sürece tablo boş kalırdı. RTDB kuralları yalnız kendi uid'ine
    // ve globalTrophies sınırlarına izin verir (bkz. database.rules.json).
    try {
      const rtdbInstance = getRtdb();
      if (rtdbInstance) {
        const lbUid = authInstance.currentUser.uid;
        await set(ref(rtdbInstance, 'leaderboards/global/' + lbUid), {
          uid: lbUid,
          name: PlayerState.state.profileName || "Player",
          avatar: PlayerState.state.avatarSeed || "akita",
          level: PlayerState.state.level || 1,
          globalTrophies: safeNum(PlayerState.state.globalTrophies, 10_000_000)
        });
      }
    } catch (e) {
      console.warn("Leaderboard write warn:", e?.message);
    }

    return { success: true };
  } catch (error) {
    console.error("Cloud Sync Error", error);
    return { success: false, msg: error.message };
  }
};

// Hesabı ve buluttaki TÜM kullanıcı verisini kalıcı olarak siler:
// arkadaşlık kayıtları, Firestore kullanıcı dokümanı, RTDB presence ve Auth hesabı.
// Yerel (cihaz) verisinin temizlenmesi çağıran tarafın sorumluluğundadır (PlayerState.wipeLocalData).
export const deleteAccountAndData = async () => {
  const authInstance = getAuth();
  const dbInstance = getDb();
  const user = authInstance && authInstance.currentUser;
  if (!user) {
    // Firebase yoksa/çevrimdışıysa bile yerel veri silinebilsin diye 'no-user' döner.
    return { success: false, msg: 'no-user' };
  }
  const uid = user.uid;

  // Canlı dinleyicileri kapat — aksi halde silinen dokümanlar üzerinde tetiklenip
  // hata/yeniden yazma üretebilirler.
  try {
    if (typeof window !== 'undefined' && window.__friendshipsUnsub) {
      window.__friendshipsUnsub();
      window.__friendshipsUnsub = null;
    }
  } catch (e) { /* yoksay */ }
  try {
    const { MultiplayerService } = await import('./multiplayerService.js');
    MultiplayerService.stopListeningForChallenges();
  } catch (e) { /* yoksay */ }

  try {
    if (dbInstance) {
      // 1) Bu kullanıcının yer aldığı tüm arkadaşlık kayıtlarını sil
      try {
        const fq = query(collection(dbInstance, 'friendships'), where('members', 'array-contains', uid));
        const snap = await getDocs(fq);
        await Promise.all(snap.docs.map(d => deleteDoc(d.ref).catch(() => {})));
      } catch (e) {
        console.warn('friendships delete warn:', e?.message);
      }

      // 2) Kullanıcı dokümanını sil (elmas, seviye, skorlar, ilerleme — hepsi burada)
      try {
        await deleteDoc(doc(dbInstance, 'users', uid));
      } catch (e) {
        console.warn('user doc delete warn:', e?.message);
      }
    }

    // 3) RTDB kayıtlarını sil: online/presence ve bekleyen meydan okuma
    try {
      const rtdbInstance = getRtdb();
      if (rtdbInstance) {
        await remove(ref(rtdbInstance, 'status/' + uid)).catch(() => {});
        await remove(ref(rtdbInstance, 'challenges/' + uid)).catch(() => {});
      }
    } catch (e) {
      console.warn('rtdb cleanup warn:', e?.message);
    }

    // 4) Auth hesabını sil. Anonim/yeni oturumlarda çalışır; son giriş çok eskiyse
    //    'auth/requires-recent-login' verebilir — bu durumda bulut verisi yine
    //    silinmiş olur, yalnızca kimlik kaydı kalır; yerel temizliğe devam edilir.
    let authDeleted = true;
    try {
      await deleteUser(user);
    } catch (e) {
      authDeleted = false;
      console.warn('auth user delete warn:', e?.code || e?.message);
    }

    return { success: true, authDeleted };
  } catch (error) {
    console.error('Delete account error', error);
    return { success: false, msg: error?.message };
  } finally {
    // KRİTİK: deleteUser 'auth/requires-recent-login' ile başarısız olursa Auth oturumu açık
    // kalır (google.com bağlı). Reload sonrası bu "hayalet" oturum geri gelir ve yeni Google
    // linki 'auth/provider-already-linked' verir. signOut'u FINALLY'ye aldık → silme sırasında
    // hangi yolla (başarı/hata) çıkılırsa çıkılsın oturum garanti kapanır, hayalet kalmaz.
    try {
      await signOut(authInstance);
    } catch (e) {
      console.warn('signOut after delete warn:', e?.message);
    }
  }
};
