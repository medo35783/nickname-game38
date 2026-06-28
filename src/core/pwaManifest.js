import { PLATFORM_SITE_URL } from './constants.js';

const PWA_ORIGIN = PLATFORM_SITE_URL.replace(/\/$/, '');

/** أيقونات PWA — مُولَّدة بمنطقة أمان (الشعار كامل على الشاشة الرئيسية) */
export const PWA_ICON_192_PATH = '/brand/la3ibz-pwa-192.png';
export const PWA_ICON_512_PATH = '/brand/la3ibz-pwa-512.png';
export const PWA_ICON_MASKABLE_192_PATH = '/brand/la3ibz-pwa-maskable-192.png';
export const PWA_ICON_MASKABLE_512_PATH = '/brand/la3ibz-pwa-maskable-512.png';

/** إعدادات PWA — manifest مشترك بين Vite والواجهة */
export const PWA_MANIFEST = {
  name: 'لعيب زون — La3ib Zone',
  short_name: 'لعيب زون',
  description: 'لعيب زون | جَوّك، جمعتك، وتحديك — ألعاب جماعية تفاعلية للرحلات والاجتماعات والمناسبات',
  theme_color: '#eef3f9',
  background_color: '#eef3f9',
  display: 'standalone',
  display_override: ['standalone', 'browser'],
  orientation: 'portrait',
  scope: `${PWA_ORIGIN}/`,
  start_url: `${PWA_ORIGIN}/?source=pwa`,
  lang: 'ar',
  dir: 'rtl',
  categories: ['games', 'social', 'entertainment'],
  prefer_related_applications: false,
  icons: [
    {
      src: PWA_ICON_192_PATH,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: PWA_ICON_512_PATH,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: PWA_ICON_MASKABLE_192_PATH,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable',
    },
    {
      src: PWA_ICON_MASKABLE_512_PATH,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};

export const PWA_THEME_COLORS = {
  dark: '#0a1628',
  light: '#eef3f9',
};
