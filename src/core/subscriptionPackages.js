/** مرجع السعر اليومي لحساب نسبة التوفير */
export const DAY_PRICE_REF = 15;

/** تفعيل أسعار الخصم المؤقتة — عطّله لإظهار السعر الأساسي فقط */
export const PACKAGE_PROMO_ACTIVE = true;

/** @typedef {'plan-burgundy' | 'plan-green' | 'plan-blue'} PlanClass */

/**
 * @typedef {object} SubscriptionPackage
 * @property {string} id
 * @property {string} icon
 * @property {string} name — مسمى رنان للباقة
 * @property {string} durationSub — المدة تحت المسمى
 * @property {string} durationLabel — للتوافق (البريد والأدمن)
 * @property {number} price
 * @property {number | null} [promoPrice]
 * @property {number} days
 * @property {PlanClass} planClass
 * @property {string | null} [badge]
 * @property {string[]} [badges]
 * @property {boolean} [badgeSide]
 * @property {boolean} [popular]
 * @property {boolean} [best]
 * @property {object} [cardStyle]
 * @property {string} [titlesHighlight] — ميزة الألقاب (باقات 3 و7 أيام)
 */

/** ميزة الألقاب المختصرة — تظهر في باقات 3 و7 أيام فقط */
export const TITLES_PACKAGE_HIGHLIGHT =
  'الألقاب حماسية وتكمل معك حتى النهاية — جولات بوقت المشرف، بلا مقاطعة فعالياتكم';

/** مزايا مشتركة — تُعرض مرة واحدة فوق الباقات */
export const SUBSCRIPTION_PLATFORM_FEATURES = [
  'الألقاب والقميري وحَسْبة',
  'تحكم كامل كمشرف',
  'إيقاف مؤقت والعودة للغرفة',
];

export const SUBSCRIPTION_FEATURES = SUBSCRIPTION_PLATFORM_FEATURES.map((line) => `✅ ${line}`);

/** @type {SubscriptionPackage[]} */
export const SUBSCRIPTION_PACKAGES = [
  {
    id: '1d',
    icon: '⚡',
    name: 'لمسة سريعة',
    durationSub: '24 ساعة',
    durationLabel: 'لمسة سريعة — 24 ساعة',
    price: 15,
    promoPrice: 9,
    days: 1,
    planClass: 'plan-burgundy',
    badge: 'تجربة سريعة',
    badgeSide: true,
    cardStyle: undefined,
  },
  {
    id: '3d',
    icon: '🎪',
    name: 'جمعة اللمة',
    durationSub: '3 أيام',
    durationLabel: 'جمعة اللمة — 3 أيام',
    price: 30,
    promoPrice: 18,
    days: 3,
    planClass: 'plan-green',
    badge: 'مثالي لعطلة نهاية الأسبوع',
    badgeSide: true,
    popular: true,
    cardStyle: {
      boxShadow: '0 4px 20px rgba(36, 143, 85, 0.12)',
    },
    titlesHighlight: TITLES_PACKAGE_HIGHLIGHT,
  },
  {
    id: '7d',
    icon: '💎',
    name: 'أسبوع البطولة',
    durationSub: '7 أيام',
    durationLabel: 'أسبوع البطولة — 7 أيام',
    price: 58,
    promoPrice: 35,
    days: 7,
    planClass: 'plan-blue',
    badges: ['الأفضل', 'الأوفر'],
    best: true,
    cardStyle: {
      boxShadow: '0 0 0 1.5px rgba(37, 111, 168, 0.42), 0 10px 32px rgba(37, 111, 168, 0.14)',
    },
    titlesHighlight: TITLES_PACKAGE_HIGHLIGHT,
  },
];

/** @param {SubscriptionPackage} pkg */
export function hasActivePromo(pkg) {
  return PACKAGE_PROMO_ACTIVE && pkg.promoPrice != null && pkg.promoPrice < pkg.price;
}

/** @param {SubscriptionPackage} pkg */
export function getEffectivePrice(pkg) {
  return hasActivePromo(pkg) ? pkg.promoPrice : pkg.price;
}

/** @param {SubscriptionPackage} pkg */
export function promoDiscountPercent(pkg) {
  if (!hasActivePromo(pkg)) return null;
  return Math.round(((pkg.price - pkg.promoPrice) / pkg.price) * 100);
}

/** للوحة الأدمن — السعر الفعلي (مع الخصم إن كان مفعّلاً) */
export const ADMIN_PACKAGE_OPTIONS = SUBSCRIPTION_PACKAGES.map((p) => {
  const effective = getEffectivePrice(p);
  return {
    id: p.id,
    duration: p.days,
    price: effective,
    labelShort: p.name,
    labelPrice: hasActivePromo(p) ? `${effective}ر (عرض)` : `${effective}ر`
  };
});

/** @returns {number | null} */
export function savingsPercent(days, price) {
  if (days <= 1) return null;
  const ref = days * DAY_PRICE_REF;
  if (ref <= 0) return null;
  return Math.round(((ref - price) / ref) * 100);
}
