import { ref, update, get, set } from 'firebase/database';
import { auth, db } from '../firebase';
import { rewardHostIfRegistered } from './arenaRewards';
import { emitArenaCelebration } from './arenaEvents';

const MAX_RECENT_SESSIONS = 20;

/** Firebase Auth ثم localStorage — معرّف المشرف الموحّد */
export function resolveUserId() {
  if (auth.currentUser?.uid) return auth.currentUser.uid;
  return (
    localStorage.getItem('ng_uid') ||
    localStorage.getItem('qumairi_ng') ||
    null
  );
}

/** الكود المُفعّل من localStorage */
export function resolveCodeId() {
  try {
    const active = JSON.parse(localStorage.getItem('code_active_pfcc') || '{}');
    return active.codeId || active.id || null;
  } catch {
    return null;
  }
}

/** يحفظ/يمسح الكود النشط في localStorage لاستخدام sessionStats */
export function persistActiveCodeLocal(codeData) {
  if (typeof localStorage === 'undefined') return;
  if (!codeData) {
    localStorage.removeItem('code_active_pfcc');
    return;
  }
  const codeId = codeData.id || codeData.codeId;
  if (!codeId) return;
  localStorage.setItem(
    'code_active_pfcc',
    JSON.stringify({
      codeId,
      id: codeId,
      code: codeData.code || null,
    })
  );
}

/** حقول تتبع الجلسة على عقدة game عند إنشاء غرفة جديدة */
export function buildGameSessionTracking(gameType) {
  return {
    adminId: resolveUserId(),
    adminCode: resolveCodeId(),
    sessionStart: Date.now(),
    sessionEnd: null,
    totalRounds: 0,
    completed: false,
    playerCount: 0,
    gameType,
  };
}

function normalizeGameType(gameType) {
  return gameType === 'sniper' ? 'hesbah' : gameType;
}

function roomBase(gameType, roomCode) {
  const type = normalizeGameType(gameType);
  if (type === 'titles') return `rooms/${roomCode}`;
  if (type === 'hesbah') return `srooms/${roomCode}`;
  return `qrooms/${roomCode}`;
}

function gamePath(gameType, roomCode) {
  return `${roomBase(gameType, roomCode)}/game`;
}

function playersPath(gameType, roomCode) {
  const type = normalizeGameType(gameType);
  if (type === 'titles') return `rooms/${roomCode}/players`;
  if (type === 'hesbah') return `srooms/${roomCode}/players`;
  return `qrooms/${roomCode}/members`;
}

export function computeNextStats(prev = {}, sessionData) {
  const {
    gameType,
    totalRounds = 0,
    completed = false,
    playerCount = 0,
    durationMinutes = 0,
    roomCode,
    timestamp = Date.now(),
  } = sessionData;

  const isRealSession = totalRounds > 0;
  const totalRealSessions = (prev.totalRealSessions || 0) + (isRealSession ? 1 : 0);
  const totalPlayerCount = (prev.totalPlayerCount || 0) + playerCount;
  const avgPlayers =
    totalRealSessions > 0 ? totalPlayerCount / totalRealSessions : prev.avgPlayers || 0;

  const recentEntry = {
    gameType,
    totalRounds,
    completed,
    playerCount,
    durationMinutes,
    roomCode,
    ts: timestamp,
  };
  const recentSessions = [
    ...(Array.isArray(prev.recentSessions) ? prev.recentSessions : []),
    recentEntry,
  ].slice(-MAX_RECENT_SESSIONS);

  return {
    totalRealSessions,
    totalRounds: (prev.totalRounds || 0) + totalRounds,
    completedGames: (prev.completedGames || 0) + (completed ? 1 : 0),
    abandonedGames: (prev.abandonedGames || 0) + (completed ? 0 : 1),
    lastActiveAt: Date.now(),
    avgPlayers,
    totalPlayerCount,
    totalDurationMinutes: (prev.totalDurationMinutes || 0) + durationMinutes,
    gamesPlayed: {
      titles: (prev.gamesPlayed?.titles || 0) + (gameType === 'titles' ? 1 : 0),
      fameeri: (prev.gamesPlayed?.fameeri || 0) + (gameType === 'fameeri' ? 1 : 0),
      hesbah: (prev.gamesPlayed?.hesbah || 0) + (normalizeGameType(gameType) === 'hesbah' ? 1 : 0),
    },
    recentSessions,
  };
}

async function writeStatsSummary(statsPath, sessionData) {
  const snap = await get(ref(db, statsPath));
  const next = computeNextStats(snap.val() || {}, sessionData);
  await set(ref(db, statsPath), next);
}

/**
 * يُستدعى عند انتهاء كل جولة — يزيد game/totalRounds بمقدار 1.
 */
export async function recordRoundCompleted(gameType, roomCode) {
  const type = normalizeGameType(gameType);
  if (type !== 'titles' && type !== 'fameeri' && type !== 'hesbah') return;
  try {
    const path = gamePath(type, roomCode);
    const snap = await get(ref(db, path));
    const game = snap.val() || {};
    const current = Number(game.totalRounds) || 0;
    await update(ref(db, path), { totalRounds: current + 1 });
  } catch (err) {
    console.error('[stats]', err);
  }
}

/**
 * يُستدعى عند إنهاء المشرف للجلسة — يحدّث عقدة game ثم يجمّع إحصائيات الكود/المستخدم.
 */
export async function recordSessionEnd(gameType, roomCode, completed = true) {
  const type = normalizeGameType(gameType);
  if (type !== 'titles' && type !== 'fameeri' && type !== 'hesbah') return;
  try {
    const base = roomBase(type, roomCode);
    const playersSnap = await get(ref(db, playersPath(type, roomCode)));
    const players = playersSnap.val() || {};
    const playerCount = Object.keys(players).length;
    const sessionEnd = Date.now();

    await update(ref(db, `${base}/game`), {
      sessionEnd,
      completed,
      playerCount,
    });

    const gameSnap = await get(ref(db, `${base}/game`));
    const game = gameSnap.val() || {};
    const sessionStart = Number(game.sessionStart) || sessionEnd;
    const durationMinutes = Math.max(0, (sessionEnd - sessionStart) / 60000);

    const sessionData = {
      gameType: type,
      totalRounds: Number(game.totalRounds) || 0,
      completed,
      playerCount,
      durationMinutes,
      roomCode,
      timestamp: sessionEnd,
    };

    const adminId = game.adminId || resolveUserId();
    await updateCodeStats(adminId, game.adminCode || resolveCodeId(), sessionData);

    if (completed && adminId) {
      const hostResult = await rewardHostIfRegistered({
        uid: adminId,
        gameType: type,
        playerCount,
        completed,
        roomCode,
        totalRounds: Number(game.totalRounds) || 0,
        durationMinutes,
      });
      if (hostResult && (hostResult.tierUpgraded || hostResult.newAchievements?.length)) {
        emitArenaCelebration(hostResult);
      }
    }
  } catch (err) {
    console.error('[stats]', err);
  }
}

/**
 * يحدّث codes/{codeId}/stats و users/{userId}/stats بنفس الملخص.
 */
export async function updateCodeStats(userId, codeId, sessionData) {
  if (!userId && !codeId) return;
  try {
    if (codeId) {
      await writeStatsSummary(`codes/${codeId}/stats`, sessionData);
    }
    if (userId) {
      await writeStatsSummary(`users/${userId}/stats`, sessionData);
    }
  } catch (err) {
    console.error('[stats]', err);
  }
}
