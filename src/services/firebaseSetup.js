import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, GoogleAuthProvider, linkWithPopup, signInWithPopup, signInWithCredential, linkWithCredential } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { getDatabase, ref, onDisconnect, set, onValue } from 'firebase/database';
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

let app, auth, db, rtdb;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  rtdb = getDatabase(app);
} catch (e) {
  console.error("Firebase init failed", e);
}

// Function to generate a random 7-character code with symbols
function generateFriendCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%#@!*&$';
  let result = '';
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const initFirebaseUser = () => {
  return new Promise((resolve) => {
    if (!auth) {
      PlayerState.state.firebaseError = true;
      if (!PlayerState.state.friendCode || PlayerState.state.friendCode === '------' || PlayerState.state.friendCode === '-------') {
        PlayerState.state.friendCode = generateFriendCode();
      }
      PlayerState.save();
      return resolve(null);
    }
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Logged in
        PlayerState.state.firebaseError = false; // Reset error flag
        const userRef = doc(db, 'users', user.uid);
        try {
          // Add 3 second timeout for Firestore
          const docSnap = await Promise.race([
            getDoc(userRef),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
          ]);
          
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
              score: PlayerState.state.bestScore || 0,
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
        signInAnonymously(auth).catch(error => {
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
  if (!rtdb) return;
  const statusRef = ref(rtdb, 'status/' + uid);
  const connectedRef = ref(rtdb, '.info/connected');
  
  let presenceUnsub = onValue(connectedRef, (snap) => {
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

export const setPresenceState = (uid, state) => {
  if (!rtdb || !uid) return;
  const statusRef = ref(rtdb, 'status/' + uid);
  set(statusRef, { state: state, last_changed: Date.now() }).catch(e => {
    console.warn("RTDB setPresenceState Error:", e.message);
  });
};

import { Capacitor } from '@capacitor/core';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';

export const linkAccountWithGoogle = async () => {
  if (!auth.currentUser) return { success: false, msg: 'Aktif bir kullanıcı bulunamadı.' };
  try {
    await GoogleSignIn.initialize({
      clientId: '244495803529-6iro7uhsrf9hkt641ch0cr1v03vrke06.apps.googleusercontent.com',
    });
    const result = await GoogleSignIn.signIn();
    const idToken = result.idToken;

    if (!idToken) throw new Error("Google Token alınamadı");

    const credential = GoogleAuthProvider.credential(idToken);
    
    try {
      await linkWithCredential(auth.currentUser, credential);
    } catch (err) {
      if (err.code === 'auth/credential-already-in-use' || err.code === 'auth/email-already-in-use') {
        // Eğer bu hesap zaten varsa, o hesaba giriş yapalım
        await signInWithCredential(auth, credential);
      } else {
        throw err;
      }
    }
    
    PlayerState.state.linkedProvider = 'google.com';
    PlayerState.save();
    return { success: true, user: auth.currentUser };
  } catch (error) {
    console.error("Link Error", error);
    alert("NATIVE GİRİŞ HATASI (LINK): " + error.message);
    return { success: false, msg: 'Bağlantı hatası: ' + error.message };
  }
};

export const recoverAccountWithGoogle = async () => {
  try {
    await GoogleSignIn.initialize({
      clientId: '244495803529-6iro7uhsrf9hkt641ch0cr1v03vrke06.apps.googleusercontent.com',
    });
    const result = await GoogleSignIn.signIn();
    const idToken = result.idToken;

    if (!idToken) throw new Error("Google Token alınamadı");

    const credential = GoogleAuthProvider.credential(idToken);
    const userCredential = await signInWithCredential(auth, credential);
    
    PlayerState.state.linkedProvider = 'google.com';
    PlayerState.save();
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error("Recovery Error", error);
    alert("NATIVE GİRİŞ HATASI (RECOVER): " + error.message);
    return { success: false, msg: 'Giriş hatası: ' + error.message };
  }
};

export const syncToCloud = async () => {
  if (!auth || !auth.currentUser || !db) return { success: false, msg: 'Not logged in' };
  
  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    
    const progressData = {
      diamonds: PlayerState.state.diamonds,
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
      globalTrophies: PlayerState.state.globalTrophies
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

export { app, auth, db, rtdb };
