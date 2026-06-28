import { ref as dbRef, push, set, update, remove, get } from 'firebase/database';
import { db } from '../../firebase';
import { buildNewSeatSecurity } from '../../core/gameSeat';

export function hesbahJoinRequestsRef(roomCode) {
  return dbRef(db, `srooms/${roomCode}/joinRequests`);
}

export async function createHesbahJoinRequest(roomCode, {
  name,
  targetPlayerId,
  kind,
  uid,
  isGuest,
  pin,
}) {
  const security = await buildNewSeatSecurity(roomCode, targetPlayerId, { isGuest, pin });
  const reqRef = push(hesbahJoinRequestsRef(roomCode));
  await set(reqRef, {
    name: String(name || '').trim(),
    targetPlayerId,
    kind: kind === 'left' ? 'left' : 'active',
    status: 'pending',
    requestedAt: Date.now(),
    sessionToken: security.sessionToken,
    ...(security.pinHash ? { pinHash: security.pinHash } : {}),
    ...(uid ? { ownerUid: uid } : {}),
    requesterUid: uid || null,
  });
  return { reqId: reqRef.key, sessionToken: security.sessionToken };
}

export async function approveHesbahJoinRequest(roomCode, reqId, req) {
  if (!roomCode || !reqId || !req?.targetPlayerId) return false;
  const playerRef = dbRef(db, `srooms/${roomCode}/players/${req.targetPlayerId}`);
  const snap = await get(playerRef);
  if (!snap.exists()) return false;
  await update(playerRef, {
    left: false,
    leftAt: null,
    ...(req.sessionToken ? { sessionToken: req.sessionToken } : {}),
    ...(req.pinHash ? { pinHash: req.pinHash } : {}),
    ...(req.ownerUid ? { ownerUid: req.ownerUid } : {}),
  });
  await remove(dbRef(db, `srooms/${roomCode}/joinRequests/${reqId}`));
  return true;
}

export async function rejectHesbahJoinRequest(roomCode, reqId) {
  if (!roomCode || !reqId) return;
  await update(dbRef(db, `srooms/${roomCode}/joinRequests/${reqId}`), {
    status: 'rejected',
    rejectedAt: Date.now(),
  });
}
