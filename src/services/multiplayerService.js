import { rtdb } from './firebaseSetup.js';
import { ref, set, onValue, update, remove, get } from 'firebase/database';
import { PlayerState } from '../state/playerState.js';

export class MultiplayerService {
  
  static currentChallengeRef = null;
  static currentRoomRef = null;
  static currentRoomId = null;

  // Listen for incoming challenges
  static listenForChallenges(callback) {
    if (!rtdb || !PlayerState.state.uid) return;
    const challengeRef = ref(rtdb, `challenges/${PlayerState.state.uid}`);
    
    onValue(challengeRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.status === 'pending') {
        callback(data);
      }
    });
  }

  // Send a challenge to a friend
  static async sendChallenge(friendUid) {
    if (!rtdb || !PlayerState.state.uid) return false;
    const roomId = `room_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const challengeRef = ref(rtdb, `challenges/${friendUid}`);
    
    try {
      await set(challengeRef, {
        roomId,
        challengerUid: PlayerState.state.uid,
        challengerName: PlayerState.state.profileName || 'Player',
        challengerAvatar: PlayerState.state.avatarSeed || 'akita',
        status: 'pending',
        timestamp: Date.now()
      });
      return roomId;
    } catch(e) {
      console.error(e);
      return null;
    }
  }

  // Respond to a challenge
  static async respondToChallenge(accept, roomId) {
    if (!rtdb || !PlayerState.state.uid) return;
    const challengeRef = ref(rtdb, `challenges/${PlayerState.state.uid}`);
    
    if (accept) {
      await update(challengeRef, { status: 'accepted' });
      // Clear it after a few seconds
      setTimeout(() => remove(challengeRef), 5000);
    } else {
      await update(challengeRef, { status: 'declined' });
      setTimeout(() => remove(challengeRef), 2000);
    }
  }

  // Listen to your own sent challenge status
  static listenToSentChallenge(friendUid, callback) {
    if (!rtdb) return () => {};
    const challengeRef = ref(rtdb, `challenges/${friendUid}`);
    const unsubscribe = onValue(challengeRef, (snapshot) => {
      callback(snapshot.val());
    });
    return unsubscribe;
  }

  // Join a room and setup base structure if host
  static async joinRoom(roomId, isHost) {
    if (!rtdb || !PlayerState.state.uid) return;
    this.currentRoomId = roomId;
    this.currentRoomRef = ref(rtdb, `rooms/${roomId}`);
    
    const snap = await get(this.currentRoomRef);
    if (!snap.exists() && isHost) {
      // Initialize room
      await set(this.currentRoomRef, {
        state: 'waiting',
        turn: PlayerState.state.uid,
        players: {
          [PlayerState.state.uid]: {
            score: 0,
            name: PlayerState.state.profileName || 'Player',
            avatar: PlayerState.state.avatarSeed || 'akita',
            ready: true
          }
        },
        board: Array(64).fill(null), // 8x8 flattened
        activePieces: [], // Needs to be populated by host
        lastMove: null
      });
    } else if (snap.exists() && !isHost) {
      // Join as player 2
      await update(ref(rtdb, `rooms/${roomId}/players/${PlayerState.state.uid}`), {
        score: 0,
        name: PlayerState.state.profileName || 'Player',
        avatar: PlayerState.state.avatarSeed || 'akita',
        ready: true
      });
      await update(this.currentRoomRef, { state: 'playing' });
    }
  }

  // Leave room
  static async leaveRoom() {
    if (this.currentRoomRef) {
      // Mark as left or destroy room
      await update(this.currentRoomRef, { state: 'abandoned' });
      this.currentRoomRef = null;
      this.currentRoomId = null;
    }
  }

  // Send a move
  static async sendMove(board, newScore, nextPieces, nextTurnUid) {
    if (!this.currentRoomRef) return;
    
    // Flatten board for simpler DB storage
    const flatBoard = board.flat();
    
    const updates = {
      board: flatBoard,
      turn: nextTurnUid,
      activePieces: nextPieces,
      [`players/${PlayerState.state.uid}/score`]: newScore,
      lastMove: Date.now()
    };
    
    await update(this.currentRoomRef, updates);
  }

  // Listen to room state
  static listenToRoom(callback) {
    if (!this.currentRoomRef) return () => {};
    const unsubscribe = onValue(this.currentRoomRef, (snapshot) => {
      callback(snapshot.val());
    });
    return unsubscribe;
  }

  // --- LEADERBOARD METHODS ---

  // Save the player's global trophies to Firebase
  static async saveGlobalScore(score) {
    if (!rtdb || !PlayerState.state.uid) return false;
    // We use the 'leaderboards/global' node for all players
    const scoreRef = ref(rtdb, `leaderboards/global/${PlayerState.state.uid}`);
    try {
      await update(scoreRef, {
        uid: PlayerState.state.uid,
        name: PlayerState.state.profileName || 'Player',
        avatar: PlayerState.state.avatarSeed || 'akita',
        level: PlayerState.state.level || 1,
        globalTrophies: score,
        lastUpdated: Date.now()
      });
      return true;
    } catch(e) {
      console.error("Failed to save global score", e);
      return false;
    }
  }

  // Get Top 50 real players from Firebase
  static async getTopPlayers() {
    if (!rtdb) return [];
    try {
      // In a real scenario, this would use a query: query(ref(rtdb, 'leaderboards/global'), orderByChild('globalTrophies'), limitToLast(50))
      // Since we might not have indexes set up, we'll fetch the global node and sort locally if it's small, 
      // but ideally use Firebase's query.
      const { query, orderByChild, limitToLast, get } = await import('firebase/database');
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
