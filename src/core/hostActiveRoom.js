import { ref, get, set } from 'firebase/database';
import { db } from '../firebase';
import { isArenaRegisteredUser } from './arenaProfile';
import { assertRoomSubscriptionForPlay, isRoomPhaseClosed } from './roomLifecycle';
import { getSavedRoomForGame } from '../shared/gameSessionRegistry';

export const HOST_ROOM_DB = {
  titles: 'rooms',
  fameeri: 'qrooms',
  hesbah: 'srooms',
};

function hostActiveRef(uid, gameId) {
  return ref(db, `users/${uid}/hostActiveRoom/${gameId}`);
}

export async function setHostActiveRoom(uid, gameId, roomCode) {
  if (!uid || !roomCode || !gameId) return;
  try {
    await set(hostActiveRef(uid, gameId), { roomCode, updatedAt: Date.now() });
  } catch {
    /* optional index */
  }
}

export async function clearHostActiveRoom(uid, gameId) {
  if (!uid || !gameId) return;
  try {
    await set(hostActiveRef(uid, gameId), null);
  } catch {
    /* ignore */
  }
}

export async function readHostActiveRoomCode(uid, gameId) {
  if (!uid || !gameId) return null;
  try {
    const snap = await get(hostActiveRef(uid, gameId));
    return snap.val()?.roomCode || null;
  } catch {
    return null;
  }
}

export async function fetchRoomSnapshot(gameId, roomCode) {
  const root = HOST_ROOM_DB[gameId];
  if (!root || !roomCode) return null;
  try {
    const snap = await get(ref(db, `${root}/${roomCode}`));
    if (!snap.exists()) return null;
    return { roomCode, data: snap.val(), root };
  } catch {
    return null;
  }
}

export function isRoomPlayable(data) {
  if (!data || isRoomPhaseClosed(data)) return false;
  return assertRoomSubscriptionForPlay(data).ok;
}

/**
 * غرفة مشرف نشطة — localStorage أولاً، ثم Firebase للمسجّل بالبريد.
 */
export async function resolveActiveHostRoom(gameId, user) {
  const local = getSavedRoomForGame(gameId);
  if (local?.role === 'admin' && local.roomCode) {
    const snap = await fetchRoomSnapshot(gameId, local.roomCode);
    if (snap && isRoomPlayable(snap.data)) {
      const uid = user?.uid;
      if (!uid || !snap.data.adminId || snap.data.adminId === uid || !isArenaRegisteredUser(user)) {
        return { ...snap, via: 'local' };
      }
    }
  }

  if (isArenaRegisteredUser(user)) {
    const cloudCode = await readHostActiveRoomCode(user.uid, gameId);
    if (cloudCode) {
      const snap = await fetchRoomSnapshot(gameId, cloudCode);
      if (snap && isRoomPlayable(snap.data) && snap.data.adminId === user.uid) {
        return { ...snap, via: 'cloud' };
      }
      await clearHostActiveRoom(user.uid, gameId);
    }
  }

  return null;
}

function readPlayerLocal(gameId) {
  try {
    if (gameId === 'titles') {
      const raw = localStorage.getItem('ng_session');
      return raw ? JSON.parse(raw) : null;
    }
    if (gameId === 'fameeri') {
      const raw = localStorage.getItem('ng_qumairi');
      const p = raw ? JSON.parse(raw) : null;
      if (p?.qRoom && p.qRole !== 'admin') return { roomCode: p.qRoom, ...p };
      return null;
    }
    if (gameId === 'hesbah') {
      const raw = localStorage.getItem('ng_hesbah');
      const p = raw ? JSON.parse(raw) : null;
      if (p?.roomCode && p.role === 'player') return p;
    }
  } catch {
    return null;
  }
  return null;
}

/** جلسة متسابق محفوظة محلياً — للعودة السريعة */
export async function resolveActivePlayerRoom(gameId) {
  const local = readPlayerLocal(gameId);
  if (!local?.roomCode) return null;
  const snap = await fetchRoomSnapshot(gameId, local.roomCode);
  if (!snap || !isRoomPlayable(snap.data)) return null;
  return { ...snap, local, via: 'local' };
}
