import { getRtdb } from './firebaseSetup.js';
import { ref, set, onValue, update, remove, get, query, orderByChild, limitToLast } from 'firebase/database';
import { PlayerState } from '../state/playerState.js';

// NOT: Düello oda akışı services/multiplayer.js (Multiplayer) üzerinden yürür.
// Bu sınıf yalnızca meydan okuma (challenge) ve liderlik tablosu sorumluluğunu taşır.
export class MultiplayerService {

  static _challengeUnsub = null;

  // Listen for incoming challenges
  static listenForChallenges(callback) {
    const rtdb = getRtdb();
    if (!rtdb || !PlayerState.state.uid) return;
    // Aynı dinleyicinin iki kez eklenmesini önle (sızıntı koruması)
    this.stopListeningForChallenges();
    const challengeRef = ref(rtdb, `challenges/${PlayerState.state.uid}`);
    this._challengeUnsub = onValue(challengeRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.status === 'pending') {
        callback(data);
      }
    });
  }

  static stopListeningForChallenges() {
    if (this._challengeUnsub) {
      this._challengeUnsub();
      this._challengeUnsub = null;
    }
  }

  // 5 karakterlik oda kodu (multiplayer.js'teki generateRoomCode ile aynı karakter seti;
  // joinRoom büyük harfe çevirdiğinden karışan/küçük harf yok).
  static _generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
  }

  // Send a multiplayer challenge
  static async sendChallenge(targetUid, mode) {
    const rtdb = getRtdb();
    if (!rtdb) return null;
    try {
      const challengeId = `${PlayerState.state.uid}_${Date.now()}`;
      // İki tarafın da AYNI odaya bağlanması için paylaşılan oda kodunu burada üret ve
      // hem payload'a koy (karşı taraf okur) hem de döndür (challenger bu kodla oda kurar).
      // Eskiden roomId hiç üretilmiyordu → karşı taraf challengeData.roomId=undefined okuyup
      // tanımsız odaya katılmaya çalışıyor ve eşleşme bozuluyordu.
      const roomId = this._generateRoomCode();
      const challengeRef = ref(rtdb, `challenges/${targetUid}`);
      const challengeData = {
        id: challengeId,
        roomId,
        challenger: PlayerState.state.uid,
        challengerName: PlayerState.state.profileName || 'Player',
        challengerAvatar: PlayerState.state.avatarSeed || 'cat',
        mode: mode,
        status: 'pending',
        timestamp: Date.now()
      };
      await set(challengeRef, challengeData);
      return roomId;
    } catch(e) {
      console.error("Failed to send challenge", e);
      return null;
    }
  }

  // Respond to a challenge
  static async respondToChallenge(accept) {
    const rtdb = getRtdb();
    if (!rtdb) return false;
    try {
      const challengeRef = ref(rtdb, `challenges/${PlayerState.state.uid}`);
      if (accept) {
        await update(challengeRef, { status: 'accepted' });
        // Clear it after a few seconds
        setTimeout(() => remove(challengeRef), 5000);
      } else {
        await update(challengeRef, { status: 'declined' });
        setTimeout(() => remove(challengeRef), 2000);
      }
    } catch(e) {
      console.error(e);
    }
  }

  // --- LEADERBOARD METHODS ---

  // Get Top 50 real players from Firebase
  static async getTopPlayers() {
    const rtdb = getRtdb();
    if (!rtdb) return [];
    try {
      const lbRef = ref(rtdb, 'leaderboards/global');
      const q = query(lbRef, orderByChild('globalTrophies'), limitToLast(50));
      const snap = await get(q);

      if (!snap.exists()) return [];

      const players = [];
      snap.forEach((child) => {
        players.push(child.val());
      });
      // limitToLast returns ascending, so reverse it
      return players.reverse();
    } catch(e) {
      console.error("Failed to fetch top players", e);
      return [];
    }
  }
}
