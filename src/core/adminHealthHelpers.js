import { PULSE_GAME_META, pulsePhaseLabel } from './adminPulseHelpers';
import {
  getRoomSessionStart,
  isRoomPhaseClosed,
  isAdminOrphanCandidate,
} from './roomLifecycle';

export { purgeRoomList } from './roomLifecycle';

import { isLegacyRoomCode } from './roomCode';

export { isLegacyRoomCode };

function countPlayers(roomData, playersKey) {
  const bucket = roomData?.[playersKey];
  if (!bucket || typeof bucket !== 'object') return 0;
  return Object.keys(bucket).length;
}

function describeRoomHost(subExp, now = Date.now()) {
  if (!subExp) {
    return { label: 'مشرف منصة / بدون كود', tone: 'admin' };
  }
  if (now > subExp) {
    return { label: 'اشتراك منتهٍ', tone: 'expired' };
  }
  return { label: 'كود اشتراك نشط', tone: 'ok' };
}

/**
 * كل الغرف غير المنتهية — للإنهاء/الحذف الفوري من لوحة الصحة
 */
export function collectOpenRooms(snapshots = {}) {
  const now = Date.now();
  const list = [];

  Object.entries(PULSE_GAME_META).forEach(([gameKey, meta]) => {
    const all = snapshots[meta.root] || {};
    Object.entries(all).forEach(([roomCode, roomData]) => {
      if (isRoomPhaseClosed(roomData)) return;

      const sessionStart = getRoomSessionStart(roomData);
      const subExp = Number(roomData?.game?.subscriptionExpiresAt) || 0;
      const host = describeRoomHost(subExp, now);
      const ageHours = sessionStart ? Math.round((now - sessionStart) / (60 * 60 * 1000)) : 0;

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
        ageHours,
        playerCount: countPlayers(roomData, meta.playersKey),
        hostLabel: host.label,
        hostTone: host.tone,
        isOrphanCandidate: isAdminOrphanCandidate(roomData, now),
      });
    });
  });

  return list.sort((a, b) => (b.sessionStart || 0) - (a.sessionStart || 0));
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

/** تقدير حجم بيانات الغرف في RTDB (تقريبي — من اللقطة المحلية) */
export function estimateRtdbFootprint(snapshots = {}) {
  const roots = ['rooms', 'qrooms', 'srooms'];
  let bytes = 0;
  roots.forEach((key) => {
    const obj = snapshots[key] || {};
    try {
      bytes += new Blob([JSON.stringify(obj)]).size;
    } catch {
      bytes += Object.keys(obj).length * 12_000;
    }
  });
  return {
    bytes,
    label: formatRtdbSize(bytes),
    roomTotal: countRoomRoots(snapshots).total,
  };
}

export function formatRtdbSize(bytes) {
  const n = Number(bytes) || 0;
  if (n < 1024) return `${n} بايت`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} ك.ب`;
  return `${(n / (1024 * 1024)).toFixed(2)} م.ب`;
}

/** حالة الصحة العامة للوحة */
export function deriveHealthStatus({ maintenanceMode, stuckCount, security24h }) {
  if (maintenanceMode) {
    return { tone: 'warn', label: 'صيانة' };
  }
  if (stuckCount > 0 || security24h >= 5) {
    return { tone: 'caution', label: 'يحتاج مراجعة' };
  }
  if (security24h > 0) {
    return { tone: 'caution', label: 'تنبيهات أمنية' };
  }
  return { tone: 'ok', label: 'تعمل' };
}
