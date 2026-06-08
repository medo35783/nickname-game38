/** هوية كل لعبة — للخروج والتنقل الموحّد */
export const GAME_BRANDS = {
  titles: { id: 'titles', emoji: '🎭', name: 'الألقاب', storageKeys: ['ng_session', 'ng_admin_session'] },
  fameeri: { id: 'fameeri', emoji: '🦅', name: 'القميري', storageKeys: ['ng_qumairi'] },
  hesbah: { id: 'hesbah', emoji: '🎯', name: 'حَسْبة', storageKeys: ['ng_hesbah'] },
};

export function getGameBrand(game) {
  return GAME_BRANDS[game] || { emoji: '🎮', name: 'اللعبة' };
}
