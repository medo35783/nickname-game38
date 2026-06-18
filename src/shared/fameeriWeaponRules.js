import { Q_WEAPONS } from '../core/constants';

export function fameeriWeaponTone(id) {
  if (id === 'showzel') return 'hard';
  if (id === 'omsagma') return 'medium';
  return 'easy';
}

/** شارات: عدد استخدامات كل سلاح */
export function fameeriWeaponStockChips() {
  return Q_WEAPONS.map((w) => ({
    icon: w.icon,
    label: `${w.name} ×${w.qty} · ${w.diff}`,
    tone: fameeriWeaponTone(w.id),
  }));
}

/** شارات: كم قميري يُصطاد عند الإصابة */
export function fameeriWeaponHuntChips() {
  return Q_WEAPONS.map((w) => ({
    icon: w.icon,
    label: `${w.name}: يصيد ${w.power} قميري`,
    tone: fameeriWeaponTone(w.id),
  }));
}
