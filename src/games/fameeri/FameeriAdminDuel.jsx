/** عرض بصري: مهاجِم ↔ هدف — أسماء المجموعات بلون محايد لتجنّب لبس أسماء الألوان */
export default function FameeriAdminDuel({
  attackerName,
  targetName,
  tree,
  weaponName,
  weaponIcon,
  size = 'md',
}) {
  return (
    <div className={`fameeri-admin-duel fameeri-admin-duel--${size}`}>
      <div className="fameeri-admin-duel__side fameeri-admin-duel__side--atk">
        <span className="fameeri-admin-duel__role">مهاجِم</span>
        <span className="fameeri-admin-duel__name">{attackerName}</span>
      </div>
      <div className="fameeri-admin-duel__mid" aria-hidden="true">
        <span className="fameeri-admin-duel__swords">⚔️</span>
        {tree && (
          <span className="fameeri-admin-duel__meta">
            🌳 {tree}
            {weaponName && (
              <>
                {' · '}
                {weaponIcon} {weaponName}
              </>
            )}
          </span>
        )}
      </div>
      <div className="fameeri-admin-duel__side fameeri-admin-duel__side--tgt">
        <span className="fameeri-admin-duel__role">هدف</span>
        <span className="fameeri-admin-duel__name">{targetName}</span>
      </div>
    </div>
  );
}
