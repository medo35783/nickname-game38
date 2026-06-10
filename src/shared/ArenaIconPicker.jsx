import { ARENA_ICONS_UNLOCKS, iconsUnlockedForPoints } from '../core/arena.constants';

/**
 * منتقي أيقونة الشارة — معاينة + اختيار (بدون حفظ تلقائي)
 */
export default function ArenaIconPicker({ points = 0, value, onChange, notify, variant = 'sheet' }) {
  const unlocked = iconsUnlockedForPoints(points);

  const handlePick = (icon, locked) => {
    if (locked) {
      notify?.('افتح هذه الأيقونة بجمع نقاط الساحة', 'info');
      return;
    }
    onChange?.(icon);
  };

  return (
    <div className={`arena-icon-picker${variant === 'sheet' ? ' arena-icon-picker--sheet' : ''}`}>
      {ARENA_ICONS_UNLOCKS.map((row) => (
        <div key={row.minPoints} className={`arena-icon-picker__row arena-icon-picker__row--t${row.minPoints}`}>
          <div className="arena-icon-picker__row-label">{row.label}</div>
          <div className="arena-icon-picker__grid">
            {row.icons.map((icon) => {
              const locked = !unlocked.includes(icon);
              const selected = value === icon;
              return (
                <button
                  key={icon}
                  type="button"
                  className={`arena-icon-picker__btn${selected ? ' arena-icon-picker__btn--on' : ''}${locked ? ' arena-icon-picker__btn--locked' : ''}`}
                  onClick={() => handlePick(icon, locked)}
                  aria-label={locked ? `${icon} مقفلة` : `اختر ${icon}`}
                  aria-pressed={selected}
                >
                  <span className="arena-icon-picker__emoji">{icon}</span>
                  {locked ? <span className="arena-icon-picker__lock">🔒</span> : null}
                  {selected ? <span className="arena-icon-picker__check">✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
