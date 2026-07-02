import { get, ref, set } from 'firebase/database';
import { arenaPointsForRank, ARENA_HOST_BASE, ARENA_HOST_PER_PLAYER } from './arena.constants';
import { awardArenaPoints, isArenaRegisteredUser } from './arenaProfile';
import { updateWeeklyLeaderboard } from './arenaLeaderboard';
import { auth, db } from '../firebase';

async function claimArenaRewardDedupe(uid, dedupeKey) {
  if (!uid || !dedupeKey) return true;
  try {
    const dedupeRef = ref(db, `users/${uid}/arenaRewards/${dedupeKey}`);
    const snap = await get(dedupeRef);
    if (snap.exists()) return false;
    await set(dedupeRef, { at: Date.now() });
    return true;
  } catch {
    return true;
  }
}

/**
 * مكافأة متسابق عند نهاية اللعبة
 */
export async function rewardArenaPlayerEnd({ uid, gameType, rank, roomCode }) {
  if (!uid || rank == null) return 0;
  const pts = arenaPointsForRank(rank);
  if (pts <= 0) return 0;

  const dedupeKey = `player_${gameType}_${roomCode || 'na'}_${rank}`;
  const ok = await claimArenaRewardDedupe(uid, dedupeKey);
  if (!ok) return 0;

  const result = await awardArenaPoints(uid, pts, {
    type: 'player_rank',
    gameType,
    roomCode,
    rank,
  });
  await updateWeeklyLeaderboard(uid, pts);
  return result;
}

/**
 * مكافأة مشرف عند إنهاء جلسة ناجحة
 */
export async function rewardArenaHostSession({
  uid,
  gameType,
  playerCount = 0,
  completed = true,
  roomCode,
  totalRounds = 0,
  durationMinutes = 0,
}) {
  if (!uid || !completed) return 0;

  let pts = ARENA_HOST_BASE;
  pts += Math.min(Math.max(0, Number(playerCount) || 0), 20) * ARENA_HOST_PER_PLAYER;
  if (pts <= 0) return 0;

  const dedupeKey = `host_${gameType}_${roomCode || 'na'}`;
  const ok = await claimArenaRewardDedupe(uid, dedupeKey);
  if (!ok) return 0;

  const result = await awardArenaPoints(uid, pts, {
    type: 'host_complete',
    gameType,
    roomCode,
    playerCount,
    totalRounds,
    durationMinutes,
  });
  await updateWeeklyLeaderboard(uid, pts);
  return result;
}

/** يمنح نقاط نهاية اللعبة للمستخدم المسجّل الحالي */
export async function rewardCurrentPlayerIfRegistered({ gameType, rank, roomCode }) {
  const user = auth.currentUser;
  if (!isArenaRegisteredUser(user) || rank == null) return null;
  return rewardArenaPlayerEnd({
    uid: user.uid,
    gameType,
    rank,
    roomCode,
  });
}

/** يمنح نقاط المشرف إن كان لديه بريد مسجّل */
export async function rewardHostIfRegistered({
  uid,
  gameType,
  playerCount,
  completed,
  roomCode,
  totalRounds = 0,
  durationMinutes = 0,
}) {
  if (!uid) return 0;
  try {
    const snap = await get(ref(db, `users/${uid}/profile`));
    if (!snap.val()?.email) return 0;
  } catch {
    return 0;
  }
  return rewardArenaHostSession({
    uid,
    gameType,
    playerCount,
    completed,
    roomCode,
    totalRounds,
    durationMinutes,
  });
}
