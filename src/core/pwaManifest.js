/** إعدادات PWA — manifest مشترك بين Vite والواجهة */
export const PWA_MANIFEST = {
  name: 'لعيب زون — La3ib Zone',
  short_name: 'لعيب زون',
  description: 'لعيب زون | جَوّك، جمعتك، وتحديك — ألعاب جماعية تفاعلية للرحلات والاجتماعات والمناسبات',
  theme_color: '#0a1628',
  background_color: '#0a1628',
  display: 'standalone',
  orientation: 'portrait',
  scope: '/',
  start_url: '/',
  lang: 'ar',
  dir: 'rtl',
  categories: ['games', 'social', 'entertainment'],
  icons: [
    {
      src: '/brand/la3ibz-favicon.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/brand/la3ibz-favicon.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any',
    },
    {
      src: '/brand/la3ibz-icon-mark.png',
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
