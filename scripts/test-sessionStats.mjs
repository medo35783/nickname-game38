/**
 * اختبار منطق دمج الإحصائيات (بدون Firebase).
 * التشغيل: node scripts/test-sessionStats.mjs
 */

function computeNextStats(prev = {}, sessionData) {
  const MAX_RECENT_SESSIONS = 20;
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

  const engagementMinutes = playerCount * durationMinutes;
  const roundReach = totalRounds * playerCount;

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
    },
    recentSessions,
  };
}

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${label}`);
  }
}

console.log('اختبار computeNextStats\n');

// جلسة حقيقية مكتملة
const s1 = computeNextStats({}, {
  gameType: 'titles',
  totalRounds: 3,
  completed: true,
  playerCount: 5,
  durationMinutes: 12,
  roomCode: '1234',
});
assert(s1.totalRealSessions === 1, 'totalRealSessions = 1 عند totalRounds > 0');
assert(s1.totalRounds === 3, 'totalRounds = 3');
assert(s1.completedGames === 1, 'completedGames = 1');
assert(s1.abandonedGames === 0, 'abandonedGames = 0');
assert(s1.avgPlayers === 5, 'avgPlayers = 5');
assert(s1.gamesPlayed.titles === 1, 'gamesPlayed.titles = 1');
assert(s1.peakPlayers === 5, 'peakPlayers = 5');
assert(s1.totalEngagementMinutes === 60, 'totalEngagementMinutes = 5*12');
assert(s1.roundReach === 15, 'roundReach = 3*5');

// جلسة بدون جولات — لا تُحسب جلسة حقيقية
const s2 = computeNextStats(s1, {
  gameType: 'fameeri',
  totalRounds: 0,
  completed: false,
  playerCount: 2,
  durationMinutes: 1,
  roomCode: '5678',
});
assert(s2.totalRealSessions === 1, 'totalRealSessions لا يزيد عند totalRounds = 0');
assert(s2.abandonedGames === 1, 'abandonedGames يزيد عند completed=false');
assert(s2.gamesPlayed.fameeri === 1, 'gamesPlayed.fameeri = 1');

// متوسط اللاعبين بعد جلستين حقيقيتين
const s3 = computeNextStats(s2, {
  gameType: 'titles',
  totalRounds: 2,
  completed: true,
  playerCount: 3,
  durationMinutes: 8,
  roomCode: '9999',
});
assert(s3.totalRealSessions === 2, 'totalRealSessions = 2');
assert(s3.avgPlayers === 5, 'avgPlayers = (5+2+3)/2 = 5 (يشمل لاعبي الجلسات غير الحقيقية)');
assert(s3.recentSessions.length === 3, 'recentSessions يحتفظ بـ 3 مدخلات');

// recentSessions cap
let acc = {};
for (let i = 0; i < 25; i += 1) {
  acc = computeNextStats(acc, {
    gameType: 'titles',
    totalRounds: 1,
    completed: true,
    playerCount: 1,
    durationMinutes: 1,
    roomCode: String(i),
  });
}
assert(acc.recentSessions.length === 20, 'recentSessions capped at 20');

console.log(`\n${passed} نجح · ${failed} فشل`);
process.exit(failed > 0 ? 1 : 0);
