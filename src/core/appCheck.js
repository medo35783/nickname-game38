import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

/**
 * Firebase App Check — يحمي Auth و Callable Functions من الطلبات خارج التطبيق.
 * 1) Firebase Console → App Check → reCAPTCHA v3
 * 2) VITE_RECAPTCHA_SITE_KEY في .env
 * 3) للتطوير: VITE_APPCHECK_DEBUG_TOKEN من Console
 */
export function setupAppCheck(app) {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    if (import.meta.env.DEV) {
      console.warn('[App Check] أضف VITE_RECAPTCHA_SITE_KEY لتفعيل الحماية');
    }
    return;
  }

  if (import.meta.env.DEV && import.meta.env.VITE_APPCHECK_DEBUG_TOKEN) {
    // eslint-disable-next-line no-undef
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}
