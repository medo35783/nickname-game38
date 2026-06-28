import { logSecurityEvent, SECURITY_EVENT_TYPES } from './securityEvents';

const STORAGE_KEY = 'pfcc_code_activate_attempts';
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

function readState(uid) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return all[uid] || { failCount: 0, windowStart: Date.now() };
  } catch {
    return { failCount: 0, windowStart: Date.now() };
  }
}

function writeState(uid, state) {
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    all[uid] = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

function freshWindow(state) {
  if (Date.now() - (state.windowStart || 0) > WINDOW_MS) {
    return { failCount: 0, windowStart: Date.now() };
  }
  return state;
}

/** @returns {string} رسالة خطأ إن كان محظوراً، أو '' */
export function getCodeActivationLockMessage(uid) {
  if (!uid) return '';
  const state = freshWindow(readState(uid));
  if ((state.failCount || 0) >= MAX_FAILURES) {
    return 'محاولات كثيرة — انتظر 15 دقيقة ثم أعد المحاولة';
  }
  return '';
}

export function assertCodeActivationAllowed(uid) {
  const msg = getCodeActivationLockMessage(uid);
  if (msg) throw new Error(msg);
}

export async function recordCodeActivationFailure(uid, reason = '') {
  if (!uid) return;
  const state = freshWindow(readState(uid));
  state.failCount = (state.failCount || 0) + 1;
  writeState(uid, state);

  await logSecurityEvent(SECURITY_EVENT_TYPES.CODE_ACTIVATE_FAIL, {
    uid,
    reason: String(reason || '').slice(0, 80),
    failCount: state.failCount,
  });

  if (state.failCount >= MAX_FAILURES) {
    await logSecurityEvent(SECURITY_EVENT_TYPES.CODE_ACTIVATE_LOCKOUT, {
      uid,
      failCount: state.failCount,
    });
  }
}

export function clearCodeActivationAttempts(uid) {
  if (!uid) return;
  try {
    const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    delete all[uid];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}
