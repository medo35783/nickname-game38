/** مرجع السعر اليومي لحساب نسبة التوفير */
export const DAY_PRICE_REF = 15;

/** تفعيل أسعار الخصم المؤقتة — عطّله لإظهار السعر الأساسي فقط */
export const PACKAGE_PROMO_ACTIVE = true;

/** @typedef {'plan-silver' | 'plan-gold' | 'plan-super'} PlanClass */

/**
 * @typedef {object} SubscriptionPackage
 * @property {string} id
 * @property {string} icon
 * @property {string} durationLabel
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
 * @property {string[]} feats
 */

/** @type {SubscriptionPackage[]} */
export const SUBSCRIPTION_PACKAGES = [
  {
    id: '1d',
    icon: '🌟',
    durationLabel: 'يوم واحد',
    price: 15,
    promoPrice: 9,
    days: 1,
    planClass: 'plan-silver',
    badge: null,
    cardStyle: { transform: 'none' },
    feats: [
      '24 ساعة وصول كامل',
      'تفعيل فوري بعد الدفع',
      'غرف وألعاب غير محدودة',
      'تحكم كامل كمشرف'
    ]
  },
  {
    id: '3d',
    icon: '⭐',
    durationLabel: '3 أيام',
    price: 30,
    promoPrice: 18,
    days: 3,
    planClass: 'plan-gold',
    badge: 'مثالي لعطلة نهاية الأسبوع',
    badgeSide: true,
    popular: true,
    cardStyle: {
      boxShadow: '0 0 0 2px rgba(240, 192, 64, 0.45), 0 12px 40px rgba(240, 192, 64, 0.12)',
      transform: 'scale(1.02)'
    },
    feats: [
      '72 ساعة وصول كامل',
      'أفضل توازن سعر ومدة',
      'إحصائياتك محفوظة',
      'تفعيل فوري بعد الدفع'
    ]
  },
  {
    id: '7d',
    icon: '💎',
    durationLabel: '7 أيام',
    price: 58,
    promoPrice: 35,
    days: 7,
    planClass: 'plan-super',
    badges: ['الأفضل', 'الأوفر'],
    best: true,
    cardStyle: {
      boxShadow: '0 0 0 2px rgba(155, 89, 182, 0.55), 0 14px 44px rgba(155, 89, 182, 0.18)',
      transform: 'scale(1.03)'
    },
    feats: [
      '7 أيام وصول كامل',
      'أقصى وفر مقارنة باليومي',
      'أسبوع كامل مع أصدقائك',
      'أولوية في الميزات الجديدة'
    ]
  }
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
    labelShort: p.durationLabel,
    labelPrice: hasActivePromo(p) ? `${effective}ر (عرض)` : `${effective}ر`
  };
});

export const SUBSCRIPTION_FEATURES = [
  '✅ إنشاء غرف غير محدودة',
  '✅ كن المشرف وتحكم باللعبة',
  '✅ حفظ إحصائياتك وإنجازاتك',
  '✅ أولوية في الميزات الجديدة'
];

/** @returns {number | null} */
export function savingsPercent(days, price) {
  if (days <= 1) return null;
  const ref = days * DAY_PRICE_REF;
  if (ref <= 0) return null;
  return Math.round(((ref - price) / ref) * 100);
}
