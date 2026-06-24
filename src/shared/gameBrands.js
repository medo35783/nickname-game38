import { GAME_THEMES } from '../core/brandTheme';

/** هوية كل لعبة — للخروج والتنقل الموحّد */
export const GAME_BRANDS = {
  titles: {
    ...GAME_THEMES.titles,
    storageKeys: ['ng_session', 'ng_admin_session'],
  },
  fameeri: {
    ...GAME_THEMES.fameeri,
    storageKeys: ['ng_qumairi'],
  },
  hesbah: {
    ...GAME_THEMES.hesbah,
    storageKeys: ['ng_hesbah'],
  },
};

export function getGameBrand(game) {
  return GAME_BRANDS[game] || { emoji: '🎮', name: 'اللعبة' };
}
