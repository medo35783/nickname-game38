import { PLATFORM_NAME, PLATFORM_SITE_URL, PLATFORM_SLOGAN } from './constants';

/** قوالب إعلانات اللوبي — تُملأ في النموذج بضغطة واحدة */
export const LOBBY_AD_TEMPLATES = [
  {
    id: 'welcome',
    label: '👋 ترحيب بالمنصة',
    title: `مرحباً في ${PLATFORM_NAME}`,
    body: `${PLATFORM_SLOGAN} — ألعاب جماعية للرحلات والاجتماعات والمناسبات.`,
    ctaLabel: '',
    linkUrl: '',
    variant: 'blue',
    sortOrder: 200,
    active: true,
  },
  {
    id: 'pwa',
    label: '📲 حمّل التطبيق',
    title: 'ثبّت لعيب زون على جوالك',
    body: 'وصول أسرع بدون متصفح — أضف التطبيق للشاشة الرئيسية واستمتع بالألعاب.',
    ctaLabel: 'زيارة المنصة',
    linkUrl: PLATFORM_SITE_URL,
    variant: 'gold',
    sortOrder: 190,
    active: true,
  },
];

/** قالب راعٍ تجريبي للعرض أثناء الإطلاق */
export const DEMO_SPONSOR_TEMPLATE = {
  name: 'راعٍ تجريبي',
  tagline: 'برعاية شركائنا',
  prizeOffer: 'خصم 15% للفائز',
  games: ['titles', 'fameeri', 'hesbah'],
  active: true,
  sortOrder: 50,
  contractPrice: 0,
  couponCodesText: 'DEMO15\nLA3IBZ20',
  autoAwardWinner: false,
  prizeOfferNote: 'فعّل التسليم التلقائي بعد الاتفاق الحقيقي',
};
