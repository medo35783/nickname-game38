import { ref, set, get, update, onValue, off, push } from "firebase/database";
import { db } from './firebase';

// ── لعبة الألقاب ──
export const roomRef    = code => ref(db, `rooms/${code}`);
export const playersRef = code => ref(db, `rooms/${code}/players`);
export const attacksRef = code => ref(db, `rooms/${code}/currentRound/attacks`);
export const gameRef    = code => ref(db, `rooms/${code}/game`);

// ── لعبة القميري ──
export const qRoomRef   = code => ref(db, `qrooms/${code}`);
export const qGameRef   = code => ref(db, `qrooms/${code}/game`);
export const qGroupsRef = code => ref(db, `qrooms/${code}/groups`);
export const qAttacksRef= code => ref(db, `qrooms/${code}/attacks`);
export const qMembersRef= code => ref(db, `qrooms/${code}/members`);

export { ref, set, get, update, onValue, off, push, db };
