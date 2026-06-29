import { db, ref, get, update } from './firebaseHelpers';

const DAY_MS = 24 * 60 * 60 * 1000;

/** تمديد اشتراك الكود بعدة أيام */
export async function extendCodeExpiration(codeId, extraDays, uid = null) {
  const days = Math.max(1, Math.min(90, Number(extraDays) || 0));
  if (!codeId || !days) throw new Error('بيانات التمديد غير صالحة');

  const snap = await get(ref(db, `codes/${codeId}`));
  const code = snap.val();
  if (!code) throw new Error('الكود غير موجود');

  const base = Math.max(Date.now(), Number(code.expiresAt) || Date.now());
  const newExpires = base + days * DAY_MS;

  const updates = {
    [`codes/${codeId}/expiresAt`]: newExpires,
    [`codes/${codeId}/extendedAt`]: Date.now(),
    [`codes/${codeId}/extendedDays`]: (Number(code.extendedDays) || 0) + days,
  };

  const ownerUid = uid || code.userId;
  if (ownerUid) {
    updates[`users/${ownerUid}/activeCode/expiresAt`] = newExpires;
  }

  await update(ref(db), updates);
  return newExpires;
}
