import { ref, get, set, onValue } from 'firebase/database';
import { db } from '../firebase';
import { ARENA_DEFAULT_ICON, computeArenaTier } from './arena.constants';
import { grantArenaAchievements } from './arenaProfile';

/** معرّف الأسبوع الحالي — ISO week */
export function getArenaWeekId(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum =
    1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

/**
 * يحدّث نقاط الأسبوع في قاعة المجد
 * @param {string} uid
 * @param {number} pointsDelta
 */
export async function updateWeeklyLeaderboard(uid, pointsDelta) {
  const pts = Number(pointsDelta);
  if (!uid || !Number.isFinite(pts) || pts <= 0) return;

  const weekId = getArenaWeekId();
  const lbRef = ref(db, `arenaLeaderboard/${weekId}/${uid}`);

  try {
    const [lbSnap, profileSnap] = await Promise.all([
      get(lbRef),
      get(ref(db, `users/${uid}/profile`)),
    ]);
    const profile = profileSnap.val() || {};
    const prev = lbSnap.val() || {};
    const totalPts = Number(profile.arenaPoints) || 0;
    const tier = computeArenaTier(totalPts);

    const weeklyPoints = (Number(prev.weeklyPoints) || 0) + pts;
    await set(lbRef, {
      uid,
      displayName: profile.displayName || 'محارب الساحة',
      avatarIcon: profile.avatarIcon || ARENA_DEFAULT_ICON,
      avatarFrame: profile.avatarFrame || tier.frame,
      weeklyPoints,
      totalPoints: totalPts,
      updatedAt: Date.now(),
    });

    await maybeGrantWeeklyStarAchievements(weekId);
  } catch {
    /* ignore */
  }
}

/** نجم الأسبوع — أفضل 3 */
async function maybeGrantWeeklyStarAchievements(weekId) {
  try {
    const snap = await get(ref(db, `arenaLeaderboard/${weekId}`));
    const rows = Object.entries(snap.val() || {})
      .map(([id, row]) => ({ id, ...row }))
      .sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0))
      .slice(0, 3);
    await Promise.all(rows.map((row) => grantArenaAchievements(row.uid || row.id, ['weekly_star'])));
  } catch {
    /* ignore */
  }
}

/**
 * يستمع لأفضل 10 في الأسبوع الحالي
 * @param {(rows: object[]) => void} onRows
 * @param {number} [limit]
 * @returns {() => void}
 */
export function subscribeWeeklyHallOfFame(onRows, limit = 10) {
  const weekId = getArenaWeekId();
  const lbRef = ref(db, `arenaLeaderboard/${weekId}`);

  const unsub = onValue(lbRef, (snap) => {
    const raw = snap.val() || {};
    const rows = Object.values(raw)
      .filter((r) => r && Number(r.weeklyPoints) > 0)
      .sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0))
      .slice(0, limit);
    onRows(rows);
  });

  return unsub;
}
