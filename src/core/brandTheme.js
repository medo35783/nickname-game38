/** هوية لعيب زون — ألوان الشعار + ثيم المنصة والألعاب */

export const BRAND_PALETTE = {
  green: '#248f55',
  blue: '#256fa8',
  orange: '#c97f1a',
  red: '#b82538',
  navy: '#122a4a',
  navyHi: '#1a3860',
  burgundy: '#7a1e30',
  burgundyHi: '#962438',
};

/** ألوان كل لعبة — مستمدة من BRAND_PALETTE */
export const GAME_THEMES = {
  titles: {
    id: 'titles',
    emoji: '🎭',
    name: 'الألقاب',
    primary: BRAND_PALETTE.burgundyHi,
    secondary: BRAND_PALETTE.navy,
    accent: BRAND_PALETTE.blue,
  },
  fameeri: {
    id: 'fameeri',
    emoji: '🦅',
    name: 'القميري',
    primary: BRAND_PALETTE.green,
    secondary: BRAND_PALETTE.orange,
    accent: BRAND_PALETTE.navyHi,
  },
  hesbah: {
    id: 'hesbah',
    emoji: '🎯',
    name: 'حَسْبة',
    primary: BRAND_PALETTE.blue,
    secondary: BRAND_PALETTE.orange,
    accent: BRAND_PALETTE.burgundyHi,
  },
};

/** ربط مسار اللعبة في التطبيق → ثيمها */
export const GAME_ROUTE_THEMES = {
  nicknames: GAME_THEMES.titles,
  qumairi: GAME_THEMES.fameeri,
  hesbah: GAME_THEMES.hesbah,
};
