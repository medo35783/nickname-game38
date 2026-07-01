import { ref, update, get, set } from 'firebase/database';
import { auth, db } from '../firebase';
import { rewardHostIfRegistered } from './arenaRewards';
import { emitArenaCelebration } from './arenaEvents';
import { mergeSponsorStats, readActiveCodeSponsorFromLocal } from './sponsorStatsHelpers';
import { readHostSubscriptionMeta } from './roomLifecycle';
import {
  fetchActiveSponsorsOnce,
  resolveSponsorForRound,
} from './platformSponsors';

const MAX_RECENT_SESSIONS = 20;
const MAX_ROSTER_LABELS = 40;
const MAX_UNIQUE_PARTICIPANTS = 120;

function trimLabel(str, max = 60) {
  return String(str ?? '').trim().slice(0, max);
}

/** أسماء المتسابقين من عقدة اللاعبين — للتقرير الرسمي B2B */
export function extractParticipantLabels(gameType, players = {}) {
  const type = normalizeGameType(gameType);
  const labels = [];

  Object.values(players).forEach((p) => {
    if (!p || typeof p !== 'object') return;
    let label = null;

    if (type === 'titles') {
      const name = trimLabel(p.name);
      const nick = trimLabel(p.nick);
      if (name && nick) label = `${name} (${nick})`;
      else label = name || nick;
    } else if (type === 'fameeri') {
      label = trimLabel(p.name);
    } else {
      const base = trimLabel(p.name);
      const arena = trimLabel(p.arenaName);
      if (p.isHost && arena) label = arena;
      else if (base && arena && arena !== base) label = `${base} · ${arena}`;
      else label = base || arena;
    }

    if (label && label !== 'المشرف') labels.push(label);
  });

  return [...new Set(labels)].slice(0, MAX_ROSTER_LABELS);
}

/** اسم المشرف للتقرير — من الساحة أو من بيانات الغرفة */
export async function resolveAdminDisplayName(adminId, players = {}) {
  const hostPlayer = Object.values(players).find((p) => p?.isHost);
  const fromHost = hostPlayer?.arenaName || (hostPlayer?.name !== 'المشرف' ? hostPlayer?.name : '');
  if (fromHost && String(fromHost).trim()) return trimLabel(fromHost, 80);

  if (adminId) {
    try {
      const snap = await get(ref(db, `users/${adminId}/profile`));
      const dn = snap.val()?.displayName;
      if (dn && String(dn).trim()) return trimLabel(dn, 80);
    } catch {
      /* ignore */
    }
  }
  return 'مشرف الجلسة';
}

function mergeUniqueLabels(prev = [], next = []) {
  const seen = new Set();
  const out = [];
  [...(Array.isArray(prev) ? prev : []), ...(Array.isArray(next) ? next : [])].forEach((label) => {
    const key = String(label || '').trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(key);
  });
  return out.slice(0, MAX_UNIQUE_PARTICIPANTS);
}

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

/** يقرأ الاشتراك المحلي مع expiresAt — للاسترجاع بعد الدفع */
export function readLocalSubscription() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = JSON.parse(localStorage.getItem('code_active_pfcc') || '{}');
    const codeId = raw.codeId || raw.id;
    const expiresAt = Number(raw.expiresAt);
    if (!codeId || !expiresAt) return null;
    return {
      codeId,
      id: codeId,
      code: raw.code || codeId,
      expiresAt,
      activatedAt: Number(raw.activatedAt) || null,
      duration: Number(raw.duration) || null,
      paymentId: raw.paymentId || null,
      source: raw.source || null,
    };
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
      code: codeData.code || codeId,
      expiresAt: codeData.expiresAt ?? null,
      activatedAt: codeData.activatedAt ?? null,
      duration: codeData.duration ?? null,
      paymentId: codeData.paymentId ?? null,
      source: codeData.source ?? null,
      sponsorId: codeData.sponsorId || null,
      sponsorName: codeData.sponsorName || null,
      sponsorLogoUrl: codeData.sponsorLogoUrl || null,
      sponsorTagline: codeData.sponsorTagline || null,
    }),
  );
}

/** حقول تتبع الجلسة على عقدة game عند إنشاء غرفة جديدة */
export function buildGameSessionTracking(gameType) {
  const sponsor = readActiveCodeSponsorFromLocal();
  const sub = readHostSubscriptionMeta();
  return {
    adminId: resolveUserId(),
    adminCode: resolveCodeId(),
    sessionStart: Date.now(),
    subscriptionExpiresAt: sub?.expiresAt ?? null,
    subscriptionActivatedAt: sub?.activatedAt ?? null,
    subscriptionCodeId: sub?.codeId ?? null,
    sessionEnd: null,
    totalRounds: 0,
    completed: false,
    playerCount: 0,
    gameType,
    sponsorId: sponsor?.id || null,
    sponsorName: sponsor?.name || null,
    sponsorLogoUrl: sponsor?.logoUrl || null,
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
    adminName = null,
    participantLabels = [],
    sponsorId = null,
    sponsorName = null,
    sponsorImpressions = 0,
    roundReach: sessionRoundReach = 0,
  } = sessionData;

  const isRealSession = totalRounds > 0;
  const totalRealSessions = (prev.totalRealSessions || 0) + (isRealSession ? 1 : 0);
  const totalPlayerCount = (prev.totalPlayerCount || 0) + playerCount;
  const avgPlayers =
    totalRealSessions > 0 ? totalPlayerCount / totalRealSessions : prev.avgPlayers || 0;

  const engagementMinutes = playerCount * durationMinutes;
  const roundReach = sessionRoundReach || totalRounds * playerCount;
  const sponsorReach = sponsorId ? roundReach : 0;
  const gk = normalizeGameType(gameType);
  const prevByGame = prev.byGame && typeof prev.byGame === 'object' ? prev.byGame : {};
  const prevGame = prevByGame[gk] || {};
  const nextByGame = { ...prevByGame };
  if (gk === 'titles' || gk === 'fameeri' || gk === 'hesbah') {
    nextByGame[gk] = {
      sessions: (prevGame.sessions || 0) + 1,
      realSessions: (prevGame.realSessions || 0) + (isRealSession ? 1 : 0),
      rounds: (prevGame.rounds || 0) + totalRounds,
      participants: (prevGame.participants || 0) + playerCount,
      engagementMinutes: (prevGame.engagementMinutes || 0) + engagementMinutes,
      roundReach: (prevGame.roundReach || 0) + roundReach,
      completed: (prevGame.completed || 0) + (completed ? 1 : 0),
      peakPlayers: Math.max(prevGame.peakPlayers || 0, playerCount),
    };
  }

  const recentEntry = {
    gameType,
    totalRounds,
    completed,
    playerCount,
    durationMinutes,
    engagementMinutes,
    roundReach,
    roomCode,
    ts: timestamp,
    adminName: adminName ? trimLabel(adminName, 80) : null,
    participantLabels: Array.isArray(participantLabels)
      ? participantLabels.map((l) => trimLabel(l, 60)).filter(Boolean).slice(0, MAX_ROSTER_LABELS)
      : [],
    sponsorId: sponsorId || null,
    sponsorName: sponsorName ? trimLabel(sponsorName, 80) : null,
    sponsorImpressions: sponsorId ? sponsorReach : 0,
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
    peakPlayers: Math.max(Number(prev.peakPlayers) || 0, playerCount),
    totalEngagementMinutes: (Number(prev.totalEngagementMinutes) || 0) + engagementMinutes,
    roundReach: (Number(prev.roundReach) || 0) + roundReach,
    firstSessionAt: prev.firstSessionAt
      ? Math.min(Number(prev.firstSessionAt), timestamp)
      : timestamp,
    totalDurationMinutes: (prev.totalDurationMinutes || 0) + durationMinutes,
    gamesPlayed: {
      titles: (prev.gamesPlayed?.titles || 0) + (gameType === 'titles' ? 1 : 0),
      fameeri: (prev.gamesPlayed?.fameeri || 0) + (gameType === 'fameeri' ? 1 : 0),
      hesbah: (prev.gamesPlayed?.hesbah || 0) + (normalizeGameType(gameType) === 'hesbah' ? 1 : 0),
    },
    byGame: nextByGame,
    recentSessions,
    uniqueParticipantLabels: mergeUniqueLabels(prev.uniqueParticipantLabels, participantLabels),
    hostSessions: (prev.hostSessions || 0) + (adminName ? 1 : 0),
    sponsorImpressions: mergeSponsorStats(prev.sponsorImpressions, {
      sponsorId,
      sponsorName,
      totalRounds,
      playerCount,
      roundReach: sponsorReach,
    }),
    totalSponsorImpressions: (Number(prev.totalSponsorImpressions) || 0) + sponsorReach,
  };
}

async function writeStatsSummary(statsPath, sessionData) {
  const snap = await get(ref(db, statsPath));
  const next = computeNextStats(snap.val() || {}, sessionData);
  await set(ref(db, statsPath), next);
}

/**
 * يُستدعى عند انتهاء كل جولة — يزيد game/totalRounds ويسجّل ظهور الراعي.
 */
export async function recordRoundCompleted(gameType, roomCode, roundNumberOverride = null) {
  const type = normalizeGameType(gameType);
  if (type !== 'titles' && type !== 'fameeri' && type !== 'hesbah') return;
  try {
    const path = gamePath(type, roomCode);
    const snap = await get(ref(db, path));
    const game = snap.val() || {};
    const current = Number(game.totalRounds) || 0;
    await update(ref(db, path), { totalRounds: current + 1 });

    const base = roomBase(type, roomCode);
    const [playersSnap, platformSponsors] = await Promise.all([
      get(ref(db, playersPath(type, roomCode))),
      fetchActiveSponsorsOnce(),
    ]);
    const players = playersSnap.val() || {};
    const playerCount = Object.keys(players).length;
    if (!playerCount) return;

    const roundNum =
      roundNumberOverride != null
        ? Number(roundNumberOverride)
        : Number(game.roundNum) || current + 1;

    const codeSponsor =
      game.sponsorId
        ? {
            id: game.sponsorId,
            name: game.sponsorName || 'الراعي',
            logoUrl: game.sponsorLogoUrl || '',
            tagline: game.sponsorTagline || '',
          }
        : readActiveCodeSponsorFromLocal();

    const sponsor = resolveSponsorForRound({
      codeSponsor,
      platformSponsors,
      gameKey: type,
      roundNumber: roundNum,
    });

    if (!sponsor?.id) return;

    const adminId = game.adminId || resolveUserId();
    const codeId = game.adminCode || resolveCodeId();
    await updateCodeStats(adminId, codeId, {
      gameType: type,
      totalRounds: 1,
      completed: false,
      playerCount,
      durationMinutes: 0,
      roomCode,
      timestamp: Date.now(),
      sponsorId: sponsor.id,
      sponsorName: sponsor.name,
      roundReach: playerCount,
      sponsorImpressions: playerCount,
    });
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
    const roomSnap = await get(ref(db, base));
    const roomData = roomSnap.val() || {};
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
    const adminId = game.adminId || roomData.adminId || resolveUserId();
    const adminName = await resolveAdminDisplayName(adminId, players);
    const participantLabels = extractParticipantLabels(type, players);
    const totalRounds = Number(game.totalRounds) || 0;
    const roundReach = totalRounds * playerCount;

    const sessionData = {
      gameType: type,
      totalRounds,
      completed,
      playerCount,
      durationMinutes,
      roomCode,
      timestamp: sessionEnd,
      adminName,
      participantLabels,
      roundReach,
      sponsorId: null,
      sponsorName: null,
      sponsorImpressions: 0,
    };
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
