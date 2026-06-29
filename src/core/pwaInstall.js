/** أدوات تثبيت PWA — كشف الجهاز وحالة التثبيت */

/** شعار Apple — يظهر كـ  على أجهزة Apple في واتساب */
export const PWA_SHARE_APPLE_MARK = '\uF8FF';

export function formatPwaShareAndroidLine() {
  return 'Android: من متصفح Chrome ⬅️ اضغط ⋮ ⬅️ تثبيت التطبيق.';
}

export function formatPwaShareIosLine() {
  return `${PWA_SHARE_APPLE_MARK} iPhone: من متصفح Safari ⬅️ اضغط مشاركة ↑ ⬅️ إضافة للشاشة الرئيسية.`;
}

export function isPwaStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  );
}

export function isIosDevice() {
  if (typeof navigator === 'undefined') return false;
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isAndroidDevice() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  if (/android/i.test(ua)) return true;
  if (navigator.userAgentData?.platform === 'Android') return true;
  return false;
}

export function isSamsungInternetBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /SamsungBrowser/i.test(navigator.userAgent);
}

/** نوع رسالة بانر التثبيت — Samsung أولاً ثم iOS ثم Android */
export function getPwaBannerVariant() {
  if (isSamsungInternetBrowser()) return 'samsung';
  if (isIosDevice()) return 'ios';
  if (isAndroidDevice()) return 'android';
  return 'other';
}

export const PWA_INSTALLED_STORAGE_KEY = 'la3ibz-pwa-installed';

export function isPwaInstalledPersisted() {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(PWA_INSTALLED_STORAGE_KEY) === '1';
}

export function markPwaInstalledPersisted() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(PWA_INSTALLED_STORAGE_KEY, '1');
  }
}

export function isMobileDevice() {
  if (isIosDevice() || isAndroidDevice()) return true;
  if (typeof window === 'undefined') return false;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.matchMedia('(max-width: 900px)').matches;
  return coarse && narrow;
}

/** خطوات التثبيت — للواجهة (بطاقة حسابي) */
export const PWA_IOS_INSTALL_STEPS = [
  'من متصفح Safari ⬅️ اضغط مشاركة ↑ ⬅️ إضافة للشاشة الرئيسية',
  'اضغط «إضافة» — يظهر التطبيق بأيقونة لعيب زون',
];

export const PWA_CHROME_INSTALL_STEPS = [
  'اضغط ⋮ (القائمة) أعلى المتصفح',
  'اختر «إضافة إلى الشاشة الرئيسية»',
  'اضغط «تثبيت» — يظهر لعيب زون على شاشتك',
];

export const PWA_SAMSUNG_INSTALL_STEPS = [
  'ابحث عن أيقونة التثبيت ⬇️ في شريط العنوان أعلى المتصفح',
  'اضغط عليها ثم أكّد «إضافة»',
];

export const PWA_ANDROID_PLAY_PROTECT_NOTE =
  'إذا ظهر تحذير Play Protect: اختر «تثبيت على أي حال» — التطبيق آمن بالكامل.';

/** @deprecated استخدم PWA_CHROME_INSTALL_STEPS */
export const PWA_ANDROID_INSTALL_STEPS = PWA_CHROME_INSTALL_STEPS;

/** سطور مختصرة للمشاركة (واتساب / دعوة الغرفة) */
export function getPwaInstallShareLines() {
  return [
    '',
    '📲 لعبك أسرع؟ ثبّت التطبيق على شاشتك (مرة واحدة):',
    formatPwaShareAndroidLine(),
    formatPwaShareIosLine(),
  ];
}
