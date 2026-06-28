import { initializeApp } from 'firebase/app';
import { getAuth as fbGetAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, linkWithPopup, signInWithPopup, signInWithCredential, linkWithCredential } from 'firebase/auth';
import { getFirestore as fbGetFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { getDatabase as fbGetDatabase, ref, onDisconnect, set, onValue } from 'firebase/database';
import { PlayerState } from '../state/playerState.js';

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

function setupPresence(uid) {
  const rtdbInstance = getRtdb();
  if (!rtdbInstance) return;
  const statusRef = ref(rtdbInstance, 'status/' + uid);
  const connectedRef = ref(rtdbInstance, '.info/connected');
  
  onValue(connectedRef, (snap) => {
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

// Bir promise verilen sürede çözülmezse anlamlı bir hatayla reddeder.
// Android Credential Manager akışı bazı hatalı yapılandırmalarda HİÇ dönmez;
// bu sarmalayıcı, UI'ın sonsuza kadar "Bağlanıyor..." durumunda asılı kalmasını önler.
const withTimeout = (promise, ms, label) =>
  Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} zaman aşımına uğradı (${ms / 1000}s). Google girişi yanıt vermedi.`)), ms)
    )
  ]);

export const linkAccountWithGoogle = async () => {
  const authInstance = getAuth();
  if (!authInstance || !authInstance.currentUser) return { success: false, msg: 'Aktif bir kullanıcı bulunamadı.' };
  try {
    await withTimeout(GoogleSignIn.initialize({
      clientId: '244495803529-6iro7uhsrf9hkt641ch0cr1v03vrke06.apps.googleusercontent.com',
    }), 20000, 'Google başlatma');
    const result = await withTimeout(GoogleSignIn.signIn(), 60000, 'Google girişi');
    const idToken = result.idToken;

    if (!idToken) throw new Error("Google Token alınamadı");

    const credential = GoogleAuthProvider.credential(idToken);
    
    try {
      await linkWithCredential(authInstance.currentUser, credential);
    } catch (err) {
      if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
        // Eğer bu hesap zaten varsa, o hesaba giriş yapalım
        await signInWithCredential(authInstance, credential);
      } else {
        throw err;
      }
    }
    
    PlayerState.state.linkedProvider = 'google.com';
    PlayerState.save();
    return { success: true, user: authInstance.currentUser };
  } catch (error) {
    console.error("Link Error", error);
    const detail = error?.code ? `${error.code}: ${error.message}` : (error?.message || 'bilinmeyen hata');
    return { success: false, msg: 'Bağlantı hatası: ' + detail };
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

    if (!idToken) throw new Error("Google Token alınamadı");

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(authInstance, credential);
    
    PlayerState.state.linkedProvider = 'google.com';
    PlayerState.save();
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Recovery Error", error);
    const detail = error?.code ? `${error.code}: ${error.message}` : (error?.message || 'bilinmeyen hata');
    return { success: false, msg: 'Giriş hatası: ' + detail };
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
      streak: PlayerState.state.streak,
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
      globalTrophies: safeNum(PlayerState.state.globalTrophies, 10_000_000)
    };

    await updateDoc(userRef, {
      progress: progressData,
      name: PlayerState.state.profileName || "Player",
      avatar: PlayerState.state.avatarSeed || "akita",
      level: PlayerState.state.level || 1,
      score: PlayerState.state.bestScoreClassic || 0,
      lastSync: Date.now()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Cloud Sync Error", error);
    return { success: false, msg: error.message };
  }
};
