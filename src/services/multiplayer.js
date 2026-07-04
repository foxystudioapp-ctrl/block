import { getRtdb } from './firebaseSetup.js';

import { ref, set, onValue, off, update, remove, get, onDisconnect, runTransaction } from 'firebase/database';
import { PlayerState } from '../state/playerState.js';
import { t } from '../utils/i18n.js';

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
    this.playerId = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? 'p_' + crypto.randomUUID()
      : 'player_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    this.onOpponentMove = null;
    this.onRoomStateChange = null;
    this.lastHandledMove = 0;
  }

  isReady() {
    return getRtdb() !== undefined && getRtdb() !== null;
  }

  // Create a new room and wait for someone.
  // presetRoomId verilirse (challenge akışı) o kodla oda kurulur; verilmezse (manuel
  // "oda oluştur") çakışmasız yeni bir kod üretilir. Böylece meydan okuyan ve okunan
  // taraf aynı odada buluşur.
  async createRoom(initialPieces, presetRoomId = null) {
    if (!this.isReady()) throw new Error(t('mp_firebase_missing'));

    const db = getRtdb();

    let roomId;
    let roomRef;
    if (presetRoomId) {
      roomId = presetRoomId.toUpperCase();
      roomRef = ref(db, `rooms/${roomId}`);
    } else {
      // Oda kodu çakışmasını önle: var olan bir kodun üzerine yazma (sınırlı deneme)
      roomId = generateRoomCode();
      roomRef = ref(db, `rooms/${roomId}`);
      for (let attempt = 0; attempt < 5; attempt++) {
        const existing = await get(roomRef);
        if (!existing.exists()) break;
        roomId = generateRoomCode();
        roomRef = ref(db, `rooms/${roomId}`);
      }
    }

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
    if (!this.isReady()) throw new Error(t('mp_firebase_missing'));
    roomId = roomId.toUpperCase();
    
    const db = getRtdb();
    const roomRef = ref(db, `rooms/${roomId}`);

    // Önce önbelleği ısıt (transaction'ın ilk çalışmasında gerçek veriyi görmesi için)
    const snapshot = await get(roomRef);
    if (!snapshot.exists()) {
      throw new Error(t('mp_room_not_found'));
    }

    // Atomik katılım: oku-değiştir-yaz tek adımda. Aynı anda katılan ikinci
    // oyuncu, status 'playing'e döndüğü için transaction'da iptal olur.
    const result = await runTransaction(roomRef, (room) => {
      if (room === null) return; // get ile transaction arasında silinmiş
      if (room.status !== 'waiting') return; // dolu/başlamış -> iptal
      if (Object.keys(room.players || {}).length >= 2) return; // dolu -> iptal
      room.status = 'playing';
      room.players = room.players || {};
      room.players[this.playerId] = {
        connected: true,
        score: 0,
        profileName: PlayerState.state.profileName || 'Player',
        avatarSeed: PlayerState.state.avatarSeed || 'akita'
      };
      return room;
    });

    if (!result.committed) {
      throw new Error(t('mp_room_full'));
    }

    const roomData = result.snapshot.val();

    const playerConnRef = ref(db, `rooms/${roomId}/players/${this.playerId}/connected`);
    onDisconnect(playerConnRef).set(false);

    this.currentRoom = roomId;
    this.isHost = false;
    this._listenToRoom(roomId);

    // Oda commit ile okuma arasında silinmiş olabilir → roomData null olabilir; guard'la.
    return roomData?.initialPieces || null;
  }

  // Send move data to the opponent
  sendMove(data) {
    if (!this.isReady() || !this.currentRoom) return;
    
    const db = getRtdb();
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
    const db = getRtdb();
    const playerRef = ref(db, `rooms/${this.currentRoom}/players/${this.playerId}/score`);
    set(playerRef, score);
  }

  // Set rematch readiness
  setRematchReady(ready) {
    if (!this.isReady() || !this.currentRoom) return;
    const db = getRtdb();
    const playerRef = ref(db, `rooms/${this.currentRoom}/players/${this.playerId}/rematchReady`);
    set(playerRef, ready);
  }

  // Host resets the match
  restartMatch(initialPieces) {
    if (!this.isReady() || !this.currentRoom || !this.isHost) return;
    
    const db = getRtdb();
    const roomRef = ref(db, `rooms/${this.currentRoom}`);
    // Fire-and-forget okuma/yazma; reddedilirse sessizce yut (unhandled rejection olmasın).
    // Aksi halde RTDB okuması hata verirse promise askıda kalıp konsolu kirletir ve
    // host, maçın yeniden başladığını sanırken guest desenkron kalır (log'la fark edilir).
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
        return update(roomRef, updates);
      }
    }).catch(e => console.warn('restartMatch warn:', e?.message));
  }

  // Internal listener for room changes
  _listenToRoom(roomId) {
    const db = getRtdb();
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
    
    const db = getRtdb();
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
