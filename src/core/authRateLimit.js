import { logSecurityEvent, SECURITY_EVENT_TYPES } from './securityEvents';

const STORAGE_KEY = 'pfcc_login_attempts';

function readState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** ملّي ثانية متبقية قبل السماح بمحاولة دخول جديدة */
export function getLoginCooldownMs() {
  const { until = 0 } = readState();
  if (!until || Date.now() >= until) return 0;
  return until - Date.now();
}

export function formatCooldownSeconds(ms) {
  return Math.max(1, Math.ceil(ms / 1000));
}

/** بعد فشل — يُرجع timestamp نهاية الانتظار (0 = بدون انتظار) */
export function recordLoginFailure(uid) {
  const state = readState();
  const count = (state.count || 0) + 1;
  let until = 0;
  if (count >= 3) {
    const delays = [30_000, 60_000, 120_000, 300_000];
    const idx = Math.min(count - 3, delays.length - 1);
    until = Date.now() + delays[idx];
  }
  writeState({ count, until });
  if (uid) {
    void logSecurityEvent(SECURITY_EVENT_TYPES.AUTH_LOGIN_FAIL, { uid, failCount: count });
  }
  return until;
}

export function clearLoginAttempts() {
  localStorage.removeItem(STORAGE_KEY);
}

/** كلمة مرور أقوى: 8+ حروف وأرقام */
export function validateRegisterPassword(password) {
  if (!password || password.length < 8) {
    return 'كلمة المرور 8 أحرف على الأقل';
  }
  if (!/[A-Za-z\u0600-\u06FF]/.test(password) || !/[0-9]/.test(password)) {
    return 'استخدم حروفاً وأرقاماً معاً';
  }
  return '';
}
