/** مفاتيح التخزين وثوابت الدفع عبر Moyasar */
export const MOYASAR_STORAGE = {
  returnId: 'pfcc_moyasar_return_id',
  planDays: 'pfcc_moyasar_plan_days',
  openPackages: 'pfcc_open_packages',
};

export const PLAN_AMOUNT_HALALAS = { 1: 900, 3: 1800, 7: 3500 };

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
  localStorage.removeItem(MOYASAR_STORAGE.planDays);
}

export function buildMoyasarCallbackUrl(planDays) {
  const base = `${window.location.origin}${window.location.pathname}`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}pfcc_plan=${planDays}`;
}
