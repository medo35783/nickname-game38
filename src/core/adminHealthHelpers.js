import { PULSE_GAME_META, pulsePhaseLabel } from './adminPulseHelpers';
import {
  getRoomSessionStart,
  isRoomPhaseClosed,
  isAdminOrphanCandidate,
} from './roomLifecycle';

export { purgeRoomList } from './roomLifecycle';

const ROOM_CODE_RE = /^\d{4}$/;

export function isLegacyRoomCode(roomCode) {
  return !ROOM_CODE_RE.test(String(roomCode || ''));
}

/**
 * غرف نشطة لكن اشتراك مشرفها انتهى (أو بيانات قديمة بلا اشتراك).
 * للمراجعة اليدوية فقط — لا إغلاق تلقائي.
 */
export function collectStuckRooms(snapshots = {}) {
  const now = Date.now();
  const list = [];

  Object.entries(PULSE_GAME_META).forEach(([gameKey, meta]) => {
    const all = snapshots[meta.root] || {};
    Object.entries(all).forEach(([roomCode, roomData]) => {
      if (isRoomPhaseClosed(roomData)) return;
      if (!isAdminOrphanCandidate(roomData, now)) return;

      const sessionStart = getRoomSessionStart(roomData);
      const subExp = Number(roomData?.game?.subscriptionExpiresAt) || 0;
      const age = sessionStart ? now - sessionStart : 0;

      list.push({
        id: `${gameKey}-${roomCode}`,
        gameKey,
        gameIcon: meta.icon,
        gameLabel: meta.label,
        root: meta.root,
        roomCode,
        legacyCode: isLegacyRoomCode(roomCode),
        phase: roomData?.game?.phase || 'lobby',
        phaseLabel: pulsePhaseLabel(roomData?.game?.phase || 'lobby'),
        sessionStart,
        subscriptionExpiresAt: subExp || null,
        ageHours: Math.round(age / (60 * 60 * 1000)),
        orphanReason: subExp > 0 ? 'subscription_ended' : 'legacy',
      });
    });
  });

  return list.sort((a, b) => b.ageHours - a.ageHours);
}

/** غرف منتهية لكنها ما زالت في القاعدة */
export function collectEndedRooms(snapshots = {}) {
  const list = [];

  Object.entries(PULSE_GAME_META).forEach(([gameKey, meta]) => {
    const all = snapshots[meta.root] || {};
    Object.entries(all).forEach(([roomCode, roomData]) => {
      const phase = roomData?.game?.phase;
      if (phase !== 'ended' && phase !== 'cancelled') return;
      list.push({
        id: `${gameKey}-${roomCode}`,
        gameKey,
        gameIcon: meta.icon,
        gameLabel: meta.label,
        root: meta.root,
        roomCode,
        phase,
        phaseLabel: pulsePhaseLabel(phase),
      });
    });
  });

  return list;
}

export function countRoomRoots(snapshots = {}) {
  return {
    rooms: Object.keys(snapshots.rooms || {}).length,
    qrooms: Object.keys(snapshots.qrooms || {}).length,
    srooms: Object.keys(snapshots.srooms || {}).length,
    total:
      Object.keys(snapshots.rooms || {}).length +
      Object.keys(snapshots.qrooms || {}).length +
      Object.keys(snapshots.srooms || {}).length,
  };
}

export function formatRoomAge(hours) {
  if (hours < 24) return `${hours} ساعة`;
  const days = Math.floor(hours / 24);
  const rem = hours % 24;
  if (!rem) return `${days} يوم`;
  return `${days} يوم و ${rem} س`;
}
