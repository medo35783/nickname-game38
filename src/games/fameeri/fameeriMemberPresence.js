import { onDisconnect, ref as dbRef, update } from 'firebase/database';

const HEARTBEAT_MS = 25_000;

/** حالة حضور العضو للمشرف */
export function memberPresenceStatus(member, presenceMap) {
  const p = presenceMap?.[member.id];
  if (!member.ownerUid) {
    return { tone: 'na', label: 'بدون حساب', dot: 'muted' };
  }
  if (!p) {
    return { tone: 'unknown', label: 'لم يُسجّل دخوله', dot: 'muted' };
  }
  if (p.online) {
    const age = Date.now() - (p.lastSeen || 0);
    if (age > 90_000) {
      return { tone: 'stale', label: 'ربما انقطع', dot: 'warn' };
    }
    return { tone: 'online', label: 'متصل الآن', dot: 'online' };
  }
  if (p.lastSeen) {
    const mins = Math.max(1, Math.round((Date.now() - p.lastSeen) / 60_000));
    return { tone: 'offline', label: mins < 60 ? `غائب · منذ ${mins} د` : 'غائب', dot: 'offline' };
  }
  return { tone: 'offline', label: 'غائب', dot: 'offline' };
}

/** يربط حضور اللاعب بـ Firebase — يُستدعى من FameeriGame */
export function bindFameeriMemberPresence(db, roomCode, memberId) {
  if (!roomCode || !memberId) return () => {};

  const path = `qrooms/${roomCode}/presence/${memberId}`;
  const presenceRef = dbRef(db, path);

  const touch = () =>
    update(presenceRef, { online: true, lastSeen: Date.now() }).catch(() => {});

  touch();
  const disconnect = onDisconnect(presenceRef);
  void disconnect.update({ online: false, lastSeen: Date.now() });

  const interval = setInterval(touch, HEARTBEAT_MS);

  return () => {
    clearInterval(interval);
    void disconnect.cancel();
    void update(presenceRef, { online: false, lastSeen: Date.now() }).catch(() => {});
  };
}
