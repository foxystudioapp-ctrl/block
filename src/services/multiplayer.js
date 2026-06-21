import { rtdb as db } from './firebaseSetup.js';

import { ref, set, onValue, off, update, remove, get, onDisconnect } from 'firebase/database';
import { PlayerState } from '../state/playerState.js';

// Generate a random 5-character room code (Letters & Numbers)
const generateRoomCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

class MultiplayerService {
  constructor() {
    this.currentRoom = null;
    this.isHost = false;
    this.playerId = 'player_' + Math.floor(Math.random() * 1000000);
    this.onOpponentMove = null;
    this.onRoomStateChange = null;
    this.lastHandledMove = 0;
  }

  isReady() {
    return db !== undefined && db !== null;
  }

  // Create a new room and wait for someone
  async createRoom(initialPieces) {
    if (!this.isReady()) throw new Error('Firebase ayarları eksik!');
    
    const roomId = generateRoomCode();
    const roomRef = ref(db, `rooms/${roomId}`);
    
    await set(roomRef, {
      status: 'waiting',
      host: this.playerId,
      initialPieces: initialPieces || null,
      matchId: Date.now(),
      players: {
        [this.playerId]: { connected: true, score: 0, profileName: PlayerState.state.profileName || 'Player', avatarSeed: PlayerState.state.avatarSeed || 'akita' }
      },
      createdAt: Date.now()
    });

    
    const playerConnRef = ref(db, `rooms/${roomId}/players/${this.playerId}/connected`);
    onDisconnect(playerConnRef).set(false);
    
    this.currentRoom = roomId;
    this.isHost = true;
    this._listenToRoom(roomId);
    
    return roomId;
  }

  // Join an existing room
  async joinRoom(roomId) {
    if (!this.isReady()) throw new Error('Firebase ayarları eksik!');
    roomId = roomId.toUpperCase();
    
    const roomRef = ref(db, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    
    if (!snapshot.exists()) {
      throw new Error('Oda bulunamadı!');
    }

    const roomData = snapshot.val();
    if (roomData.status !== 'waiting') {
      throw new Error('Bu oda dolu veya oyun başlamış.');
    }

    // Join the room
    await update(roomRef, {
      status: 'playing',
      [`players/${this.playerId}`]: { connected: true, score: 0, profileName: PlayerState.state.profileName || 'Player', avatarSeed: PlayerState.state.avatarSeed || 'akita' }
    });

    
    const playerConnRef = ref(db, `rooms/${roomId}/players/${this.playerId}/connected`);
    onDisconnect(playerConnRef).set(false);

    this.currentRoom = roomId;
    this.isHost = false;
    this._listenToRoom(roomId);
    
    return roomData.initialPieces || null;
  }

  // Send move data to the opponent
  sendMove(data) {
    if (!this.isReady() || !this.currentRoom) return;
    
    // We update our own player data node in the room
    const playerRef = ref(db, `rooms/${this.currentRoom}/players/${this.playerId}/lastMove`);
    set(playerRef, {
      ...data,
      timestamp: Date.now()
    });
  }

  // Send score update
  updateScore(score) {
    if (!this.isReady() || !this.currentRoom) return;
    const playerRef = ref(db, `rooms/${this.currentRoom}/players/${this.playerId}/score`);
    set(playerRef, score);
  }

  // Set rematch readiness
  setRematchReady(ready) {
    if (!this.isReady() || !this.currentRoom) return;
    const playerRef = ref(db, `rooms/${this.currentRoom}/players/${this.playerId}/rematchReady`);
    set(playerRef, ready);
  }

  // Host resets the match
  restartMatch(initialPieces) {
    if (!this.isReady() || !this.currentRoom || !this.isHost) return;
    
    const roomRef = ref(db, `rooms/${this.currentRoom}`);
    get(roomRef).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const updates = {
          initialPieces: initialPieces,
          matchId: Date.now(),
        };
        Object.keys(data.players || {}).forEach(pid => {
          updates[`players/${pid}/rematchReady`] = false;
          updates[`players/${pid}/score`] = 0;
          updates[`players/${pid}/lastMove`] = null;
        });
        update(roomRef, updates);
      }
    });
  }

  // Internal listener for room changes
  _listenToRoom(roomId) {
    const roomRef = ref(db, `rooms/${roomId}`);
    onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        if (this.onRoomStateChange) this.onRoomStateChange({ status: 'closed' });
        return;
      }

      const data = snapshot.val();
      
      // Find the opponent's ID
      const playerIds = Object.keys(data.players || {});
      const opponentId = playerIds.find(id => id !== this.playerId);

      if (opponentId && data.players[opponentId]) {
        const opponentData = data.players[opponentId];
        
        // Notify state change (e.g. status changed from waiting to playing)
        if (this.onRoomStateChange) {
          this.onRoomStateChange({
            status: data.status,
            opponentConnected: opponentData.connected,
            opponentScore: opponentData.score,
            opponentName: opponentData.profileName,
            opponentAvatar: opponentData.avatarSeed,
            opponentRematchReady: opponentData.rematchReady || false,
            initialPieces: data.initialPieces,
            matchId: data.matchId
          });
        }

        // Notify new move if exists and it's new
        if (opponentData.lastMove && this.onOpponentMove) {
          if (opponentData.lastMove.timestamp > this.lastHandledMove) {
            this.lastHandledMove = opponentData.lastMove.timestamp;
            this.onOpponentMove(opponentData.lastMove);
          }
        }
      } else {
        if (this.onRoomStateChange) {
          this.onRoomStateChange({ status: data.status, opponentConnected: false });
        }
      }
    });
  }

  // Leave room and cleanup
  leaveRoom() {
    if (!this.isReady() || !this.currentRoom) return;
    
    const roomRef = ref(db, `rooms/${this.currentRoom}`);
    
    // Stop listening
    off(roomRef);

    if (this.isHost) {
      // Host leaving destroys the room
      remove(roomRef);
    } else {
      // Guest leaving marks them as disconnected
      update(roomRef, {
        [`players/${this.playerId}/connected`]: false,
        status: 'abandoned'
      });
    }

    this.currentRoom = null;
    this.isHost = false;
    this.onOpponentMove = null;
    this.onRoomStateChange = null;
  }
}

export const Multiplayer = new MultiplayerService();
