import { Q_WEAPONS } from '../../core/constants';
import FameeriAdminDuel from './FameeriAdminDuel';

/**
 * عرض موحّد للهجوم — مشرف، متسابق، بروجكتر.
 * يعتمد على FameeriAdminDuel مع شارة واضحة وتلميحات اختيارية للدور.
 */
export default function FameeriAttackDisplay({
  attack,
  size = 'lg',
  badge = '⚔️ هجوم جاري',
  isTarget = false,
  isAttacker = false,
  treeCount = null,
  showTargetWarn = true,
  className = '',
}) {
  if (!attack) return null;

  const wDef = Q_WEAPONS.find((w) => w.id === attack.weapon);
  const duelSize = size === 'xl' ? 'lg' : size;
  const danger = isTarget;

  return (
    <div
      className={`fameeri-attack-display fameeri-attack-display--${size}${danger ? ' danger' : ''}${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
    >
      <div className="fameeri-attack-display__badge">{badge}</div>

      {(isAttacker || isTarget) && (
        <div className="fameeri-attack-display__roles">
          {isAttacker && <span className="fameeri-attack-display__you fameeri-attack-display__you--atk">⚔️ أنت المهاجِم</span>}
          {isTarget && <span className="fameeri-attack-display__you fameeri-attack-display__you--tgt">🎯 أنت الهدف</span>}
        </div>
      )}

      <FameeriAdminDuel
        attackerName={attack.attackerName}
        targetName={attack.targetName}
        tree={attack.tree}
        weaponName={attack.weaponName}
        weaponIcon={wDef?.icon}
        size={duelSize}
      />

      {isTarget && treeCount !== null && (
        <div className="fameeri-attack-display__tree-qty">
          🐦 على شجرة «{attack.tree}»: <strong>{treeCount}</strong> قميري الآن
        </div>
      )}

      {isTarget && showTargetWarn && (
        <div className="fameeri-attack-display__warn">🛡️ راقب نافذة الدرع بعد إعلان «صح»</div>
      )}
    </div>
  );
}
