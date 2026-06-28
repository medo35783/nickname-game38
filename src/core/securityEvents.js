import { push, ref } from './firebaseHelpers';
import { db } from '../firebase';

/** أنواع الأحداث المسموح بها من العميل (Spark) */
export const SECURITY_EVENT_TYPES = {
  CODE_ACTIVATE_FAIL: 'code_activate_fail',
  CODE_ACTIVATE_LOCKOUT: 'code_activate_lockout',
  AUTH_LOGIN_FAIL: 'auth_login_fail',
};

/**
 * يسجّل حدث أمني — Spark فقط (Blaze يكتب عبر Cloud Functions).
 * يفشل بصمت إن لم تُنشر قواعد الكتابة بعد.
 */
export async function logSecurityEvent(type, payload = {}) {
  if (!Object.values(SECURITY_EVENT_TYPES).includes(type)) return;
  try {
    await push(ref(db, 'security/events'), {
      type,
      at: Date.now(),
      uid: payload.uid || null,
      ...payload,
    });
  } catch {
    /* تجاهل — قد تكون القواعد غير منشورة */
  }
}

export function securityEventLabel(type) {
  switch (type) {
    case SECURITY_EVENT_TYPES.CODE_ACTIVATE_FAIL:
      return 'فشل تفعيل كود';
    case SECURITY_EVENT_TYPES.CODE_ACTIVATE_LOCKOUT:
      return 'حظر تفعيل أكواد';
    case SECURITY_EVENT_TYPES.AUTH_LOGIN_FAIL:
      return 'فشل تسجيل دخول';
    default:
      return type || 'حدث';
  }
}

export function securityEventTone(type) {
  if (type === SECURITY_EVENT_TYPES.CODE_ACTIVATE_LOCKOUT) return 'important';
  if (type === SECURITY_EVENT_TYPES.CODE_ACTIVATE_FAIL) return 'warn';
  return 'muted';
}
