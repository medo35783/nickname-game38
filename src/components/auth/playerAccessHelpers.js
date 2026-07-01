import { ARENA_WELCOME_BONUS } from '../../core/arena.constants';

export const CODE_TAB_PERKS = [
  { icon: '🔐', text: 'اشتراكك محفوظ — ارجع للعب بدون إدخال الكود' },
  { icon: '📚', text: 'أسئلتك لا تتكرر بين جلساتك' },
  { icon: '🏅', text: `شارات ونقاط الساحة — +${ARENA_WELCOME_BONUS} نقطة ترحيب` },
];

/** بصمة جهاز بسيطة لمسار RTDB */
export function buildDeviceInfo() {
  const raw = `${navigator.userAgent}${screen.width}${screen.height}`;
  let encoded;
  try {
    encoded = btoa(raw);
  } catch {
    encoded = btoa(raw.replace(/[^\x00-\x7F]/g, '_'));
  }
  const fingerprint = encoded.replace(/[.#$\[\]/]/g, '_');
  return {
    fingerprint,
    userAgent: navigator.userAgent,
    width: screen.width,
    height: screen.height,
  };
}

export function mapActivationError(message) {
  const m = (message || '').trim();
  if (m.includes('PERMISSION_DENIED') || m.includes('permission')) {
    return 'تعذّر حفظ التفعيل — تحقق من اتصال Firebase';
  }
  if (m.includes('الكود غير صحيح') || m.includes('الكود غير موجود')) {
    return 'الكود غير صحيح';
  }
  if (m.includes('منتهي')) {
    return 'الكود منتهي الصلاحية';
  }
  if (m.includes('الحد الأقصى للأجهزة') || m.includes('تجاوز')) {
    return 'تم تجاوز الحد الأقصى للأجهزة (2)';
  }
  if (m.includes('مُفعّل على حساب آخر')) {
    return 'الكود مُفعّل على جهاز/حساب آخر';
  }
  if (m.includes('صلاحية التفعيل')) {
    return m;
  }
  if (m.includes('تسجيل الدخول')) {
    return 'جاري الاتصال… أعد المحاولة بعد ثوانٍ';
  }
  return 'حدث خطأ، يرجى المحاولة مرة أخرى';
}
