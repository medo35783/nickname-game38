/**
 * وضع الأمان — spark (إطلاق بدون Blaze) | blaze (سيرفر + قواعد مشدّدة)
 *
 * للترقية مستقبلاً: قل «فعّل الدرع السحابي»
 * أو ضع VITE_SECURITY_MODE=blaze في .env ثم deploy functions + database
 */
export const SECURITY_CODENAME = 'الدرع السحابي';

export const SECURITY_MODE = import.meta.env.VITE_SECURITY_MODE === 'blaze' ? 'blaze' : 'spark';

/** true = activateSubscriptionCode Cloud Function */
export const USE_CLOUD_ACTIVATION = SECURITY_MODE === 'blaze';
