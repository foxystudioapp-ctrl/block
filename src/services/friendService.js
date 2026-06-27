import { getDb, getRtdb } from './firebaseSetup.js';
import { collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, onSnapshot, limit } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { PlayerState } from '../state/playerState.js';

// ----------------------------------------------------------------------------
// VERİ MODELİ: friendships/{pairId}
//   pairId   = iki uid'in sıralı birleşimi (a__b) -> deterministik, dedup-safe
//   members  = [uidA, uidB] (sıralı)         -> array-contains ile sorgulanır
//   status   = 'pending' | 'accepted' | 'blocked'
//   requestedBy = isteği gönderen uid
//   blockedBy   = engelleyen uid | null
//   profiles = { [uid]: { name, avatar(seed), level } }  -> DENORMALIZE
//              (arkadaş listesi çekilirken EKSTRA okuma YAPILMAZ — N+1 biter)
//
// Bu tek model şunları çözer: N+1 okuma, asimetri, mutual silme,
// eşzamanlı/yinelenen istek (aynı pairId -> idempotent), kalıcı "beklemede".
// ----------------------------------------------------------------------------

function pairId(a, b) {
  return [a, b].sort().join('__');
}

function myProfile() {
  return {
    name: PlayerState.state.profileName || 'Player',
    avatar: PlayerState.state.avatarSeed || 'akita',
    level: PlayerState.state.level || 1
  };
}

export class FriendService {

  // Arkadaş koduyla kullanıcı bul (kod ile ekleme için).
  static async getUserByCode(code) {
    const db = getDb();
    if (!code || !db) return null;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('friendCode', '==', code.toUpperCase()), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  }

  // Arkadaşlık isteği gönder. Hedefin zaten BANA istek attığı durumda
  // otomatik olarak kabul edilir (eşzamanlı karşılıklı istek -> tek arkadaşlık).
  static async sendFriendRequest(targetUid, targetProfile) {
    const db = getDb();
    const me = PlayerState.state.uid;
    if (!me || !db) return { success: false, msg: 'no_db' };
    if (targetUid === me) return { success: false, msg: 'self' };
    if (typeof targetUid === 'string' && targetUid.startsWith('bot_')) {
      return { success: false, msg: 'bot' };
    }

    const pid = pairId(me, targetUid);
    const ref = doc(db, 'friendships', pid);
    try {
      const snap = await getDoc(ref); // 1 okuma — yinelenmeyi/çakışmayı önler
      if (snap.exists()) {
        const d = snap.data();
        if (d.status === 'accepted') return { success: false, msg: 'already_friends' };
        if (d.status === 'blocked') return { success: false, msg: 'blocked' };
        if (d.status === 'pending') {
          if (d.requestedBy === me) return { success: true, requested: true, already: true };
          // Karşı taraf bana zaten istek atmış -> kabul et (mutual)
          await updateDoc(ref, {
            status: 'accepted',
            updatedAt: Date.now(),
            [`profiles.${me}`]: myProfile()
          });
          return { success: true, accepted: true };
        }
      }

      await setDoc(ref, {
        members: [me, targetUid].sort(),
        status: 'pending',
        requestedBy: me,
        blockedBy: null,
        profiles: {
          [me]: myProfile(),
          [targetUid]: targetProfile || {}
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      return { success: true, requested: true };
    } catch (e) {
      console.error('sendFriendRequest failed', e);
      return { success: false, msg: 'error' };
    }
  }

  // Kod ile ekleme: artık ANINDA tek yönlü eklemek yerine istek gönderir
  // (rıza + simetri). Karşı taraf kabul edince çift yönlü arkadaş olunur.
  static async addFriend(code) {
    const me = PlayerState.state.uid;
    if (!me) return { success: false, msg: 'no_db' };
    if (code.toUpperCase() === (PlayerState.state.friendCode || '').toUpperCase()) {
      return { success: false, msg: 'self' };
    }
    const friend = await this.getUserByCode(code);
    if (!friend || !friend.uid) return { success: false, msg: 'not_found' };
    const res = await this.sendFriendRequest(friend.uid, {
      name: friend.name || 'Player',
      avatar: friend.avatar || 'akita',
      level: friend.level || 1
    });
    return { ...res, friend };
  }

  // İsteği kabul et (senderUid ile çağrılır — pairId servis içinde hesaplanır).
  static async acceptFriendRequest(senderUid) {
    const db = getDb();
    const me = PlayerState.state.uid;
    if (!me || !db) return { success: false };
    try {
      const ref = doc(db, 'friendships', pairId(me, senderUid));
      await updateDoc(ref, {
        status: 'accepted',
        updatedAt: Date.now(),
        [`profiles.${me}`]: myProfile()
      });
      return { success: true };
    } catch (e) {
      console.error('acceptFriendRequest failed', e);
      return { success: false };
    }
  }

  // İsteği reddet (pair'i sil).
  static async rejectFriendRequest(senderUid) {
    const db = getDb();
    const me = PlayerState.state.uid;
    if (!me || !db) return { success: false };
    try {
      await deleteDoc(doc(db, 'friendships', pairId(me, senderUid)));
      return { success: true };
    } catch (e) {
      console.error('rejectFriendRequest failed', e);
      return { success: false };
    }
  }

  // Arkadaşlıktan çıkar — TEK belge silindiği için ÇİFT YÖNLÜ (asimetri yok).
  static async removeFriend(friendUid) {
    const db = getDb();
    const me = PlayerState.state.uid;
    if (!me || !db) return { success: false };
    try {
      await deleteDoc(doc(db, 'friendships', pairId(me, friendUid)));
      return { success: true };
    } catch (e) {
      console.error('removeFriend failed', e);
      return { success: false };
    }
  }

  // Kullanıcıyı engelle. İlişki yoksa engelli pair oluşturur, varsa günceller.
  static async blockUser(targetUid) {
    const db = getDb();
    const me = PlayerState.state.uid;
    if (!me || !db || targetUid === me) return { success: false };
    try {
      const ref = doc(db, 'friendships', pairId(me, targetUid));
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, { status: 'blocked', blockedBy: me, updatedAt: Date.now() });
      } else {
        await setDoc(ref, {
          members: [me, targetUid].sort(),
          status: 'blocked',
          requestedBy: me,
          blockedBy: me,
          profiles: { [me]: myProfile(), [targetUid]: {} },
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      return { success: true };
    } catch (e) {
      console.error('blockUser failed', e);
      return { success: false };
    }
  }

  // Tek seferlik arkadaş listesi (yedek yol). Yalnızca array-contains tek
  // filtre -> kompozit index GEREKMEZ. Denormalize profil -> N+1 yok.
  static async getFriendsList() {
    const db = getDb();
    const me = PlayerState.state.uid;
    if (!me || !db) return [];
    const q = query(
      collection(db, 'friendships'),
      where('members', 'array-contains', me),
      limit(300)
    );
    const snap = await getDocs(q);
    const friends = [];
    snap.forEach(ds => {
      const d = ds.data();
      if (d.status !== 'accepted') return;
      const other = (d.members || []).find(u => u !== me);
      if (!other) return;
      const p = (d.profiles && d.profiles[other]) || {};
      friends.push({ uid: other, name: p.name || 'Player', avatar: p.avatar || 'akita', level: p.level || 1 });
    });
    return friends;
  }

  // BİRLEŞİK CANLI DİNLEYİCİ: tek onSnapshot ile arkadaşlar + gelen istekler +
  // gönderilen (bekleyen) istekler. main.js'te bir kez kurulur; tüm friend
  // state'i canlı güncellenir (profil ekranı 0 ek okuma yapar).
  static listenToFriendships(callback) {
    const db = getDb();
    const me = PlayerState.state.uid;
    if (!me || !db) return () => {};
    const q = query(
      collection(db, 'friendships'),
      where('members', 'array-contains', me),
      limit(300)
    );
    const unsub = onSnapshot(q, (snap) => {
      const friends = [], incoming = [], outgoing = [];
      snap.forEach(ds => {
        const d = ds.data();
        const other = (d.members || []).find(u => u !== me);
        if (!other) return;
        const p = (d.profiles && d.profiles[other]) || {};
        if (d.status === 'accepted') {
          friends.push({ uid: other, name: p.name || 'Player', avatar: p.avatar || 'akita', level: p.level || 1 });
        } else if (d.status === 'pending') {
          if (d.requestedBy === me) {
            outgoing.push({ pairId: ds.id, otherUid: other });
          } else {
            incoming.push({
              pairId: ds.id,
              senderUid: other,
              senderName: p.name || 'Player',
              senderAvatar: p.avatar || 'akita',
              senderLevel: p.level || 1
            });
          }
        }
        // 'blocked' -> hiçbir listede gösterilmez
      });
      callback({ friends, incoming, outgoing });
    }, (error) => {
      console.error('listenToFriendships error', error);
    });
    return unsub;
  }

  // Listen to a friend's presence (RTDB — değişmedi)
  static listenToPresence(uid, callback) {
    const rtdb = getRtdb();
    if (!rtdb) return () => {};
    const statusRef = ref(rtdb, 'status/' + uid);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) callback(snapshot.val());
      else callback({ state: 'offline' });
    });
    return unsubscribe;
  }
}
