/** مفاتيح التخزين وثوابت الدفع عبر Moyasar */
export const MOYASAR_STORAGE = {
  returnId: 'pfcc_moyasar_return_id',
  planDays: 'pfcc_moyasar_plan_days',
  openPackages: 'pfcc_open_packages',
  returnAt: 'pfcc_moyasar_return_at',
  failedPrefix: 'pfcc_moyasar_failed_',
  /** localStorage — يبقى بعد إغلاق الصفحة */
  pendingPayment: 'pfcc_moyasar_pending_v1',
  paymentSuccess: 'pfcc_moyasar_success_v1',
  paymentError: 'pfcc_moyasar_error_v1',
};

/** بعد هذه المدة لا نعيد محاولة تفعيل نفس العملية تلقائياً */
const RETURN_TTL_MS = 48 * 60 * 60 * 1000;
const SUCCESS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const PLAN_AMOUNT_HALALAS = { 1: 900, 3: 1800, 7: 3500 };

function readJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    if (!value) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore */ }
}

/** عملية دفع معلّقة — تبقى حتى ينجح التفعيل */
export function storePendingPayment(paymentId, planDays) {
  if (!paymentId) return;
  const oldSuccess = readPaymentSuccess();
  if (oldSuccess?.paymentId && oldSuccess.paymentId !== paymentId) {
    clearPaymentSuccess();
  }
  writeJson(MOYASAR_STORAGE.pendingPayment, {
    paymentId,
    planDays: Number(planDays) || null,
    savedAt: Date.now(),
  });
}

export function readPendingPayment() {
  const row = readJson(MOYASAR_STORAGE.pendingPayment);
  if (!row?.paymentId) return null;
  if (row.savedAt && Date.now() - row.savedAt > RETURN_TTL_MS) {
    clearPendingPayment();
    return null;
  }
  return row;
}

export function clearPendingPayment() {
  writeJson(MOYASAR_STORAGE.pendingPayment, null);
}

/** آخر كود ناجح — يُعرض حتى يغلقه المستخدم */
export function storePaymentSuccess({ code, expiresAt, paymentId, duration }) {
  if (!code) return;
  writeJson(MOYASAR_STORAGE.paymentSuccess, {
    code,
    expiresAt,
    paymentId: paymentId || null,
    duration: duration || null,
    savedAt: Date.now(),
  });
  clearPendingPayment();
  clearPaymentError();
}

export function readPaymentSuccess() {
  const row = readJson(MOYASAR_STORAGE.paymentSuccess);
  if (!row?.code || !row?.expiresAt) return null;
  if (row.savedAt && Date.now() - row.savedAt > SUCCESS_TTL_MS) {
    clearPaymentSuccess();
    return null;
  }
  if (Number(row.expiresAt) <= Date.now()) {
    clearPaymentSuccess();
    return null;
  }
  return row;
}

/** هل النجاح المحفوظ يخص نفس عملية الدفع المعلّقة؟ */
export function isStoredSuccessForPending() {
  const pending = readPendingPayment();
  const success = readPaymentSuccess();
  const pendingId = pending?.paymentId || null;
  if (!pendingId) return Boolean(success);
  if (!success?.paymentId) return false;
  return success.paymentId === pendingId;
}

export function clearPaymentSuccess() {
  writeJson(MOYASAR_STORAGE.paymentSuccess, null);
}

export function storePaymentError(message, paymentId) {
  writeJson(MOYASAR_STORAGE.paymentError, {
    message: message || 'تعذّر تجهيز الكود',
    paymentId: paymentId || null,
    savedAt: Date.now(),
  });
}

export function readPaymentError() {
  const row = readJson(MOYASAR_STORAGE.paymentError);
  if (!row?.message) return null;
  if (row.savedAt && Date.now() - row.savedAt > RETURN_TTL_MS) {
    clearPaymentError();
    return null;
  }
  return row;
}

export function clearPaymentError() {
  writeJson(MOYASAR_STORAGE.paymentError, null);
}

export function isReturnFailed(paymentId) {
  if (!paymentId) return false;
  try {
    return sessionStorage.getItem(`${MOYASAR_STORAGE.failedPrefix}${paymentId}`) === '1';
  } catch {
    return false;
  }
}

/** يمنع حلقة لا نهائية في نفس الجلسة فقط */
export function markReturnFailed(paymentId) {
  if (!paymentId) return;
  try {
    sessionStorage.setItem(`${MOYASAR_STORAGE.failedPrefix}${paymentId}`, '1');
  } catch { /* ignore */ }
}

export function clearReturnFailed(paymentId) {
  if (!paymentId) return;
  try {
    sessionStorage.removeItem(`${MOYASAR_STORAGE.failedPrefix}${paymentId}`);
  } catch { /* ignore */ }
}

export function storePaymentReturn(paymentId, planDays) {
  sessionStorage.setItem(MOYASAR_STORAGE.returnId, paymentId);
  sessionStorage.setItem(MOYASAR_STORAGE.returnAt, String(Date.now()));
  if (planDays) storePlanDays(planDays);
  storePendingPayment(paymentId, planDays || readStoredPlanDays());
}

export function getPendingReturnId() {
  try {
    const pending = readPendingPayment();
    if (pending?.paymentId) return pending.paymentId;

    const returnId = sessionStorage.getItem(MOYASAR_STORAGE.returnId);
    if (!returnId) return null;

    if (isReturnFailed(returnId)) {
      return returnId;
    }

    const startedAt = Number(sessionStorage.getItem(MOYASAR_STORAGE.returnAt));
    if (startedAt && Date.now() - startedAt > RETURN_TTL_MS) {
      return returnId;
    }

    return returnId;
  } catch {
    return null;
  }
}

export function shouldAutoOpenPackages() {
  return Boolean(readPendingPayment())
    || Boolean(readPaymentSuccess())
    || Boolean(readPaymentError())
    || Boolean(sessionStorage.getItem(MOYASAR_STORAGE.returnId))
    || sessionStorage.getItem(MOYASAR_STORAGE.openPackages) === '1';
}

export function readStoredPlanDays() {
  const pending = readPendingPayment();
  if (pending?.planDays) return pending.planDays;
  const fromSession = Number(sessionStorage.getItem(MOYASAR_STORAGE.planDays));
  if (fromSession) return fromSession;
  return Number(localStorage.getItem(MOYASAR_STORAGE.planDays)) || 0;
}

export function storePlanDays(planDays) {
  const value = String(planDays);
  sessionStorage.setItem(MOYASAR_STORAGE.planDays, value);
  localStorage.setItem(MOYASAR_STORAGE.planDays, value);
}

export function clearMoyasarPaymentStorage() {
  sessionStorage.removeItem(MOYASAR_STORAGE.returnId);
  sessionStorage.removeItem(MOYASAR_STORAGE.planDays);
  sessionStorage.removeItem(MOYASAR_STORAGE.openPackages);
  sessionStorage.removeItem(MOYASAR_STORAGE.returnAt);
  localStorage.removeItem(MOYASAR_STORAGE.planDays);
}

export function buildMoyasarCallbackUrl(planDays) {
  const base = `${window.location.origin}${window.location.pathname}`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}pfcc_plan=${planDays}`;
}
