/** ملخص المواجهة — مهاجم / هدف / شجرة / سلاح بدون أسهم */
export default function FameeriMatchSummary({
  attackerName,
  targetName,
  tree,
  weaponName,
  weaponIcon,
  size = 'md',
  variant = 'default',
}) {
  return (
    <div className={`fameeri-match-summary fameeri-match-summary--${size} fameeri-match-summary--${variant}`}>
      <div className="fameeri-match-summary__row">
        <div className="fameeri-match-chip fameeri-match-chip--atk">
          <span className="fameeri-match-chip__label">مهاجم</span>
          <span className="fameeri-match-chip__value">{attackerName || '—'}</span>
        </div>
        <div className="fameeri-match-chip fameeri-match-chip--tgt">
          <span className="fameeri-match-chip__label">هدف</span>
          <span className="fameeri-match-chip__value">{targetName || '—'}</span>
        </div>
      </div>
      {(tree || weaponName) && (
        <div className="fameeri-match-summary__row">
          {tree && (
            <div className="fameeri-match-chip fameeri-match-chip--tree">
              <span className="fameeri-match-chip__label">شجرة</span>
              <span className="fameeri-match-chip__value">🌳 {tree}</span>
            </div>
          )}
          {weaponName && (
            <div className="fameeri-match-chip fameeri-match-chip--wpn">
              <span className="fameeri-match-chip__label">سلاح</span>
              <span className="fameeri-match-chip__value">
                {weaponIcon ? `${weaponIcon} ` : ''}
                {weaponName}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
