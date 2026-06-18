import { fameeriWeaponHuntChips, fameeriWeaponStockChips } from '../../shared/fameeriWeaponRules';

/** شارات الأسلحة — للدليل الكامل */
export default function FameeriWeaponChips({ variant = 'stock', className = '' }) {
  const chips = variant === 'hunt' ? fameeriWeaponHuntChips() : fameeriWeaponStockChips();

  return (
    <div className={`game-quick-rules__chips fameeri-weapon-chips ${className}`.trim()}>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={`game-quick-rules__chip game-quick-rules__chip--${chip.tone || 'neutral'}`}
        >
          <span aria-hidden="true">{chip.icon}</span>
          {chip.label}
        </span>
      ))}
    </div>
  );
}
