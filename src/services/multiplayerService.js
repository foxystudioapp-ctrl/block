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

  // Send a multiplayer challenge
  static async sendChallenge(targetUid, mode) {
    const rtdb = getRtdb();
    if (!rtdb) return null;
    try {
      const challengeId = `${PlayerState.state.uid}_${Date.now()}`;
      const challengeRef = ref(rtdb, `challenges/${targetUid}`);
      const challengeData = {
        id: challengeId,
        challenger: PlayerState.state.uid,
        challengerName: PlayerState.state.username || 'Player',
        challengerAvatar: PlayerState.state.avatar || 'cat',
        mode: mode,
        status: 'pending',
        timestamp: Date.now()
      };
      await set(challengeRef, challengeData);
      return challengeId;
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
