import { ref, get, remove, db } from './firebaseHelpers';
import { genCode } from './helpers';

/** سماح بعد انتهاء الاشتراك قبل ظهور الغرفة في لوحة المراجعة */
export const ADMIN_ORPHAN_GRACE_MS = 24 * 60 * 60 * 1000;

/** غرف قديمة بلا بيانات اشتراك — أطول من أقصى باقة (7 أيام) + يوم */
export const LEGACY_ORPHAN_MS = 8 * 24 * 60 * 60 * 1000;

export function getRoomSessionStart(roomData) {
  return (
    Number(roomData?.game?.sessionStart) ||
    Number(roomData?.game?.createdAt) ||
    Number(roomData?.createdAt) ||
    0
  );
}

export function isRoomPhaseClosed(roomData) {
  const phase = roomData?.game?.phase;
  return phase === 'ended' || phase === 'cancelled';
}

/** تاريخ انتهاء اشتراك المشرف عند إنشاء الغرفة (من localStorage) */
export function readHostSubscriptionExpiresAt() {
  return readHostSubscriptionMeta()?.expiresAt ?? null;
}

/** لقطة اشتراك المشرف عند إنشاء الغرفة — تُقفل على الغرفة ولا تتمدد */
export function readHostSubscriptionMeta() {
  try {
    const active = JSON.parse(localStorage.getItem('code_active_pfcc') || '{}');
    const expiresAt = Number(active.expiresAt);
    const activatedAt = Number(active.activatedAt);
    const codeId = active.codeId || active.id || null;
    if (!expiresAt || expiresAt <= Date.now()) return null;
    return {
      expiresAt,
      activatedAt: activatedAt > 0 ? activatedAt : null,
      codeId: codeId ? String(codeId) : null,
    };
  } catch {
    return null;
  }
}

export function hostMustBindSubscription() {
  try {
    const active = JSON.parse(localStorage.getItem('code_active_pfcc') || '{}');
    return Boolean(active.codeId || active.id);
  } catch {
    return false;
  }
}

export function getRoomSubscriptionExpiresAt(roomData) {
  return Number(roomData?.game?.subscriptionExpiresAt) || 0;
}

export function isRoomSubscriptionActive(roomData, now = Date.now()) {
  const exp = getRoomSubscriptionExpiresAt(roomData);
  if (!exp) return true;
  return now < exp;
}

export const ROOM_SUBSCRIPTION_EXPIRED_MSG =
  'انتهى وقت اشتراك هذه الغرفة — لا يمكن استئناف اللعب. أنهِ المسابقة من قائمة الخروج أو جدّد الكود لغرف جديدة.';

/**
 * يمنع اللعب/الانضمام خارج نافذة الاشتراك المقفولة على الغرفة.
 * لا يُغلق المسابقة تلقائياً — يمنع الاستغلال فقط.
 */
export function assertRoomSubscriptionForPlay(roomData, now = Date.now()) {
  if (isRoomPhaseClosed(roomData)) return { ok: true };

  const exp = getRoomSubscriptionExpiresAt(roomData);
  if (!exp) return { ok: true };

  if (now >= exp) {
    return { ok: false, expired: true, message: ROOM_SUBSCRIPTION_EXPIRED_MSG };
  }

  const activatedAt = Number(roomData?.game?.subscriptionActivatedAt);
  if (activatedAt > 0 && now < activatedAt) {
    return {
      ok: false,
      message: 'لم يبدأ وقت اشتراك هذه الغرفة بعد — انتظر تفعيل الباقة.',
    };
  }

  return { ok: true };
}

/**
 * للوحة الأدمن فقط — غرفة «يتيمة» مرشّحة للمراجعة اليدوية.
 * لا تُستخدم لإغلاق أو حذف تلقائي أبداً.
 */
export function isAdminOrphanCandidate(roomData, now = Date.now()) {
  if (isRoomPhaseClosed(roomData)) return false;

  const subExp = Number(roomData?.game?.subscriptionExpiresAt);
  if (subExp > 0) {
    return now > subExp + ADMIN_ORPHAN_GRACE_MS;
  }

  const start = getRoomSessionStart(roomData);
  if (!start) return false;
  return now - start > LEGACY_ORPHAN_MS;
}

/** يُعاد استخدام الرمز فقط إذا أنهى المشرف المسابقة صراحة */
export function isRoomReclaimable(roomData) {
  return isRoomPhaseClosed(roomData);
}

/** يحرّر رمز غرفة منتهية/ملغاة فقط — لا يلمس غرفاً نشطة */
export async function tryReclaimStaleRoom(root, roomCode, roomData) {
  if (!isRoomReclaimable(roomData)) return 'taken';
  try {
    await remove(ref(db, `${root}/${roomCode}`));
    return 'reclaimed';
  } catch {
    return 'taken';
  }
}

/** يبحث عن رمز 6 أرقام — يعيد استخدام رموز الغرف المنتهية فقط */
export async function allocateFreeRoomCode(root, maxAttempts = 12) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = genCode();
    const snap = await get(ref(db, `${root}/${code}`));
    if (!snap.exists()) return code;
    const reclaimed = await tryReclaimStaleRoom(root, code, snap.val());
    if (reclaimed === 'reclaimed') return code;
  }
  return null;
}

export async function purgeRoomList(rooms = []) {
  let deleted = 0;
  let failed = 0;
  for (const room of rooms) {
    try {
      await remove(ref(db, `${room.root}/${room.roomCode}`));
      deleted += 1;
    } catch {
      failed += 1;
    }
  }
  return { deleted, failed };
}
