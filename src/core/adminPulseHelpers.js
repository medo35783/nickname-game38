/**
 * مساعدات النبض اللحظي — لوحة تحكم الأدمن
 */

const MS_DAY = 24 * 60 * 60 * 1000;
const MS_48H = 48 * 60 * 60 * 1000;

export const PULSE_GAME_META = {
  titles: { key: 'titles', icon: '🎭', label: 'الألقاب', root: 'rooms', playersKey: 'players' },
  fameeri: { key: 'fameeri', icon: '🦅', label: 'القميري', root: 'qrooms', playersKey: 'members' },
  hesbah: { key: 'hesbah', icon: '🎯', label: 'الحسبة', root: 'srooms', playersKey: 'players' },
};

const PHASE_LABELS = {
  lobby: 'لوبي',
  attacking: 'هجوم',
  revealing: 'كشف',
  playing: 'لعب',
  distributing: 'توزيع',
  question: 'سؤال',
  grading: 'تصحيح',
  leaderboard: 'ترتيب',
  final: 'نهائي',
  ended: 'منتهية',
  cancelled: 'ملغاة',
};

export function pulsePhaseLabel(phase) {
  return PHASE_LABELS[phase] || phase || '—';
}

function countPlayers(room, playersKey) {
  const bucket = room?.[playersKey];
  if (!bucket || typeof bucket !== 'object') return 0;
  return Object.keys(bucket).length;
}

/** يحوّل لقطة Firebase لغرفة واحدة إلى صف النبض */
export function parseRoomPulseEntry(gameKey, roomCode, roomData) {
  const meta = PULSE_GAME_META[gameKey];
  if (!meta || !roomData) return null;

  const phase = roomData.game?.phase || 'lobby';
  const isActive = phase !== 'ended' && phase !== 'cancelled';
  if (!isActive) return null;

  const playerCount = countPlayers(roomData, meta.playersKey);
  const sessionStart = Number(roomData.game?.sessionStart) || Number(roomData.game?.createdAt) || null;
  const roundNum = Number(roomData.game?.roundNum ?? roomData.game?.totalRounds) || 0;

  return {
    id: `${gameKey}-${roomCode}`,
    gameKey,
    gameIcon: meta.icon,
    gameLabel: meta.label,
    roomCode,
    phase,
    phaseLabel: pulsePhaseLabel(phase),
    playerCount,
    roundNum,
    sessionStart,
    adminId: roomData.adminId || roomData.game?.adminId || null,
  };
}

/** يجمّع الغرف النشطة من rooms / qrooms / srooms */
export function collectActiveRooms(snapshots) {
  const list = [];
  Object.entries(PULSE_GAME_META).forEach(([gameKey, meta]) => {
    const all = snapshots[meta.root] || {};
    Object.entries(all).forEach(([roomCode, roomData]) => {
      const entry = parseRoomPulseEntry(gameKey, roomCode, roomData);
      if (entry) list.push(entry);
    });
  });
  return list.sort((a, b) => (b.sessionStart || 0) - (a.sessionStart || 0));
}

/** جلسات آخر 24 ساعة من إحصائيات الأكواد */
export function aggregateSessionsToday(codeStatsList) {
  const since = Date.now() - MS_DAY;
  let sessions = 0;
  let participants = 0;
  const byGame = { titles: 0, fameeri: 0, hesbah: 0 };

  (codeStatsList || []).forEach((stats) => {
    const recent = Array.isArray(stats?.recentSessions) ? stats.recentSessions : [];
    recent.forEach((s) => {
      const ts = Number(s.ts) || 0;
      if (ts < since) return;
      if ((Number(s.totalRounds) || 0) < 1) return;
      sessions += 1;
      participants += Number(s.playerCount) || 0;
      const gk = s.gameType === 'sniper' ? 'hesbah' : s.gameType;
      if (byGame[gk] != null) byGame[gk] += 1;
    });
  });

  return { sessions, participants, byGame };
}

export function getEffectiveCodeStatus(row) {
  if (!row) return 'unknown';
  if (row.status === 'expired') return 'expired';
  if (row.status === 'unused') return 'unused';
  if (row.status === 'active' && row.expiresAt && Date.now() > row.expiresAt) return 'expired';
  if (row.status === 'active') return 'active';
  return row.status || 'unknown';
}

/** أكواد تنتهي خلال 48 ساعة */
export function findExpiringCodes(rows, indexByCode = {}, withinMs = MS_48H) {
  const now = Date.now();
  const horizon = now + withinMs;

  return (rows || [])
    .map((row) => {
      const merged = indexByCode[row.code] ? { ...row, ...indexByCode[row.code] } : row;
      const eff = getEffectiveCodeStatus(merged);
      const expiresAt = Number(merged.expiresAt) || 0;
      if (eff !== 'active' || !expiresAt) return null;
      if (expiresAt <= now || expiresAt > horizon) return null;
      return {
        id: row.id,
        code: row.code,
        codeDisplay: row.code,
        expiresAt,
        remainingMs: expiresAt - now,
        duration: merged.duration,
        userId: merged.userId || null,
        adminNote: merged.adminNote || row.adminNote || '',
        phone: merged.phone || row.phone || '',
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.expiresAt - b.expiresAt);
}

export function formatRemainingShort(ms) {
  const m = Math.max(0, Number(ms) || 0);
  if (m < 60_000) return 'أقل من دقيقة';
  const hours = Math.floor(m / 3_600_000);
  const mins = Math.floor((m % 3_600_000) / 60_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const restH = hours % 24;
    return restH > 0 ? `${days} يوم و${restH} س` : `${days} يوم`;
  }
  if (hours > 0) return mins > 0 ? `${hours} س و${mins} د` : `${hours} ساعة`;
  return `${mins} دقيقة`;
}

export function formatPulseDateTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}
