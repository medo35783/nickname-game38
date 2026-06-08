import { GAME_BRANDS } from './gameBrands';

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** غرفة محفوظة لكل لعبة (إن وُجدت جلسة نشطة) */
export function getSavedRoomForGame(gameId) {
  if (gameId === 'titles') {
    const admin = readJson('ng_admin_session');
    if (admin?.roomCode) return { game: 'titles', roomCode: admin.roomCode, role: 'admin' };
    const player = readJson('ng_session');
    if (player?.roomCode) return { game: 'titles', roomCode: player.roomCode, role: 'player' };
    return null;
  }
  if (gameId === 'fameeri') {
    const saved = readJson('ng_qumairi');
    if (saved?.qRoom) return { game: 'fameeri', roomCode: saved.qRoom, role: saved.qRole || 'player' };
    return null;
  }
  if (gameId === 'hesbah') {
    const saved = readJson('ng_hesbah');
    if (saved?.roomCode) return { game: 'hesbah', roomCode: saved.roomCode, role: saved.role || 'player' };
    return null;
  }
  return null;
}

/** كل الجلسات النشطة المحفوظة محلياً */
export function getAllActiveSessions() {
  return ['titles', 'fameeri', 'hesbah']
    .map((id) => getSavedRoomForGame(id))
    .filter(Boolean);
}

/** جلسات ألعاب أخرى غير اللعبة الحالية */
export function getOtherActiveSessions(currentGameId) {
  return getAllActiveSessions().filter((s) => s.game !== currentGameId);
}

export function formatOtherSessionsHint(sessions) {
  if (!sessions?.length) return '';
  return sessions
    .map((s) => {
      const brand = GAME_BRANDS[s.game];
      return `${brand?.emoji || ''} ${brand?.name || s.game} (${s.roomCode})`;
    })
    .join(' • ');
}
