/** مفاتيح التخزين وثوابت الدفع عبر Moyasar */
export const MOYASAR_STORAGE = {
  returnId: 'pfcc_moyasar_return_id',
  planDays: 'pfcc_moyasar_plan_days',
  openPackages: 'pfcc_open_packages',
  returnAt: 'pfcc_moyasar_return_at',
  failedPrefix: 'pfcc_moyasar_failed_',
};

/** بعد هذه المدة لا نعيد محاولة تفعيل نفس العملية تلقائياً */
const RETURN_TTL_MS = 2 * 60 * 60 * 1000;

export const PLAN_AMOUNT_HALALAS = { 1: 900, 3: 1800, 7: 3500 };

export function isReturnFailed(paymentId) {
  if (!paymentId) return false;
  try {
    return sessionStorage.getItem(`${MOYASAR_STORAGE.failedPrefix}${paymentId}`) === '1';
  } catch {
    return false;
  }
}

export function markReturnFailed(paymentId) {
  if (!paymentId) return;
  try {
    sessionStorage.setItem(`${MOYASAR_STORAGE.failedPrefix}${paymentId}`, '1');
  } catch { /* ignore */ }
}

export function storePaymentReturn(paymentId) {
  sessionStorage.setItem(MOYASAR_STORAGE.returnId, paymentId);
  sessionStorage.setItem(MOYASAR_STORAGE.returnAt, String(Date.now()));
}

export function getPendingReturnId() {
  try {
    const returnId = sessionStorage.getItem(MOYASAR_STORAGE.returnId);
    if (!returnId) return null;

    if (isReturnFailed(returnId)) {
      clearMoyasarPaymentStorage();
      return null;
    }

    const startedAt = Number(sessionStorage.getItem(MOYASAR_STORAGE.returnAt));
    if (startedAt && Date.now() - startedAt > RETURN_TTL_MS) {
      markReturnFailed(returnId);
      clearMoyasarPaymentStorage();
      return null;
    }

    return returnId;
  } catch {
    return null;
  }
}

export function shouldAutoOpenPackages() {
  return Boolean(getPendingReturnId()) || sessionStorage.getItem(MOYASAR_STORAGE.openPackages) === '1';
}

export function readStoredPlanDays() {
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
