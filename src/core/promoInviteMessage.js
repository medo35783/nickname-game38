import { PLATFORM_NAME, PLATFORM_SITE_URL } from './constants';

/** رسالة واتساب جاهزة لدعوة تجربة مجانية */
export function buildPromoWhatsAppMessage(code, { durationHours = 6, promoNote = '' } = {}) {
  const hoursLabel = durationHours === 1 ? 'ساعة واحدة' : `${durationHours} ساعات`;
  const noteLine = promoNote ? `\n📍 ${promoNote}` : '';
  return [
    `🎮 دعوة لتجربة ${PLATFORM_NAME}!`,
    '',
    `✨ جرّب ألعابنا مجاناً لمدة ${hoursLabel}`,
    `🎟️ كودك: ${code}`,
    '',
    '⚠️ لا تستخدم الكود إلا عند التفعيل — يبدأ العداد من لحظة التفعيل فقط',
    noteLine,
    '',
    `🔗 ${PLATFORM_SITE_URL}`,
  ].filter(Boolean).join('\n');
}

export function buildPromoWhatsAppUrl(code, options = {}) {
  const text = encodeURIComponent(buildPromoWhatsAppMessage(code, options));
  return `https://wa.me/?text=${text}`;
}
