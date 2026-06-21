import { db, rtdb } from './firebaseSetup.js';
import { collection, query, where, getDocs, doc, setDoc, getDoc, arrayUnion, onSnapshot, deleteDoc } from 'firebase/firestore';
import { ref, onValue, get } from 'firebase/database';
import { PlayerState } from '../state/playerState.js';

export class FriendService {
  
  // Get user doc by friend code
  static async getUserByCode(code) {
    if (!code || !db) return null;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('friendCode', '==', code.toUpperCase()));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return snapshot.docs[0].data();
  }

  // Add friend instantly (used for code adding)
  static async addFriend(code) {
    if (!PlayerState.state.uid || !db) return { success: false, msg: 'Not logged in' };
    if (code.toUpperCase() === PlayerState.state.friendCode) return { success: false, msg: 'Cannot add yourself' };

    const friend = await this.getUserByCode(code);
    if (!friend) return { success: false, msg: 'Player not found' };

    const myFriendsRef = doc(db, 'friends', PlayerState.state.uid);
    try {
      await setDoc(myFriendsRef, {
        list: arrayUnion(friend.uid)
      }, { merge: true });
      return { success: true, friend };
    } catch(e) {
      console.error(e);
      return { success: false, msg: 'Error adding friend' };
    }
  }

  // Send a friend request (used for leaderboard adding)
  static async sendFriendRequest(targetUid) {
    if (!PlayerState.state.uid || !db) return { success: false };
    if (targetUid === PlayerState.state.uid) return { success: false };
    
    try {
      const requestRef = doc(db, 'users', targetUid, 'friendRequests', PlayerState.state.uid);
      await setDoc(requestRef, {
        senderUid: PlayerState.state.uid,
        senderCode: PlayerState.state.friendCode,
        senderName: PlayerState.state.profileName || "Player",
        senderAvatar: PlayerState.state.avatarSeed || "akita",
        senderLevel: PlayerState.state.level || 1,
        timestamp: Date.now()
      });
      return { success: true };
    } catch(e) {
      console.error(e);
      return { success: false };
    }
  }

  // Listen to incoming friend requests
  static listenToFriendRequests(callback) {
    if (!PlayerState.state.uid || !db) return () => {};
    const requestsRef = collection(db, 'users', PlayerState.state.uid, 'friendRequests');
    const unsubscribe = onSnapshot(requestsRef, (snapshot) => {
      const requests = [];
      snapshot.forEach(docSnap => {
        requests.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(requests);
    }, (error) => {
      console.error("Error listening to requests", error);
    });
    return unsubscribe;
  }

  // Accept a friend request
  static async acceptFriendRequest(senderUid) {
    if (!PlayerState.state.uid || !db) return { success: false };
    try {
      // Add sender to my list
      const myFriendsRef = doc(db, 'friends', PlayerState.state.uid);
      await setDoc(myFriendsRef, { list: arrayUnion(senderUid) }, { merge: true });
      
      // Add me to sender's list
      const theirFriendsRef = doc(db, 'friends', senderUid);
      await setDoc(theirFriendsRef, { list: arrayUnion(PlayerState.state.uid) }, { merge: true });
      
      // Remove the request
      const requestRef = doc(db, 'users', PlayerState.state.uid, 'friendRequests', senderUid);
      await deleteDoc(requestRef);
      
      return { success: true };
    } catch(e) {
      console.error(e);
      return { success: false };
    }
  }

  // Reject a friend request
  static async rejectFriendRequest(senderUid) {
    if (!PlayerState.state.uid || !db) return { success: false };
    try {
      const requestRef = doc(db, 'users', PlayerState.state.uid, 'friendRequests', senderUid);
      await deleteDoc(requestRef);
      return { success: true };
    } catch(e) {
      console.error(e);
      return { success: false };
    }
  }

  // Get friends list with current profiles
  static async getFriendsList() {
    if (!PlayerState.state.uid || !db) return [];
    try {
      const myFriendsRef = doc(db, 'friends', PlayerState.state.uid);
      const snap = await getDoc(myFriendsRef);
      if (!snap.exists()) return [];
      
      const friendUids = snap.data().list || [];
      if (friendUids.length === 0) return [];
      
      // Fetch each friend's profile (in a real app with many friends, batching is better)
      const friends = [];
      for (const uid of friendUids) {
        const fSnap = await getDoc(doc(db, 'users', uid));
        if (fSnap.exists()) {
          friends.push(fSnap.data());
        }
      }
      return friends;
    } catch(e) {
      console.error(e);
      return [];
    }
  }

  // Listen to a friend's presence
  static listenToPresence(uid, callback) {
    if (!rtdb) return () => {};
    const statusRef = ref(rtdb, 'status/' + uid);
    const unsubscribe = onValue(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback({ state: 'offline' });
      }
    });
    return unsubscribe; // function to stop listening
  }
}
