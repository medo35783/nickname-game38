/** مفتاح حفظ تفضيل المستخدم (light | dark). غيابه = يتبع الجهاز */
export const THEME_STORAGE_KEY = 'ng_theme';

export function getSystemTheme() {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** @returns {'light'|'dark'|null} */
export function getStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

export function getEffectiveTheme() {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

/** تعيين وضع صريح (يتوقف عن متابعة الجهاز) */
export function setThemePreference(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  applyTheme(theme);
}

/** العودة لمزامنة إعداد الجهاز */
export function clearThemePreference() {
  try {
    localStorage.removeItem(THEME_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  applyTheme(getSystemTheme());
}

export function initTheme() {
  applyTheme(getEffectiveTheme());
}
