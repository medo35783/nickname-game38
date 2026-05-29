import { Q_WEAPONS } from '../../core/constants';
import { groupWeaponsTotal, initialWeaponsTotal } from './fameeriAdminHelpers';
import FameeriGroupForest from './FameeriGroupForest';

function WeaponPill({ weapon, qty }) {
  const empty = (qty || 0) <= 0;
  return (
    <div className={`fameeri-admin-wpn${empty ? ' empty' : ''}`} title={`${weapon.name} — ${qty}/${weapon.qty}`}>
      <span className="fameeri-admin-wpn__ico">{weapon.icon}</span>
      <span className="fameeri-admin-wpn__qty">{qty ?? 0}</span>
      <span className="fameeri-admin-wpn__name">{weapon.name}</span>
    </div>
  );
}

/** بطاقة تفصيلية — تبويب الإحصائيات */
export default function FameeriAdminGroupDetail({
  group,
  turnGroupId,
  cursedTree,
  rank,
  attacks,
  highlightTree,
}) {
  const isTurn = turnGroupId === group.id;
  const wTotal = groupWeaponsTotal(group);
  const wMax = initialWeaponsTotal();
  const shieldActive = !!group.shield;
  const shieldUsed = !!group.shieldUsed;

  return (
    <div className={`fameeri-admin-detail${isTurn ? ' turn' : ''}${rank === 1 ? ' leader' : ''}`}>
      <div className="fameeri-admin-detail__head">
        <div className="fameeri-admin-detail__title-row">
          {rank === 1 && <span className="fameeri-admin-detail__rank">👑</span>}
          {isTurn && <span className="fameeri-admin-intel__turn-badge">⚔️ الدور</span>}
          <span className="fameeri-group-name">{group.name}</span>
        </div>
        <div className="fameeri-admin-detail__score">
          <span className="fameeri-admin-intel__birds">{group.totalRemaining ?? 0}</span>
          <span>🐦</span>
        </div>
      </div>

      <div className="fameeri-admin-detail__section">
        <div className="fameeri-admin-detail__label">🔫 الأسلحة ({wTotal}/{wMax})</div>
        <div className="fameeri-admin-wpn-row">
          {Q_WEAPONS.map((w) => (
            <WeaponPill key={w.id} weapon={w} qty={group.weapons?.[w.id]} />
          ))}
        </div>
      </div>

      <div className="fameeri-admin-detail__tags">
        {shieldActive && (
          <span className="fameeri-admin-intel__tag shield">🛡️ درع على 🌳{group.shield}</span>
        )}
        {!shieldActive && shieldUsed && (
          <span className="fameeri-admin-intel__tag used">🛡️ استُخدم الدرع</span>
        )}
        {!shieldActive && !shieldUsed && (
          <span className="fameeri-admin-intel__tag avail">🛡️ الدرع متاح</span>
        )}
        {cursedTree && (
          <span className="fameeri-admin-intel__tag warn">☠️ مسموم: {cursedTree}</span>
        )}
        {wTotal === 0 && <span className="fameeri-admin-intel__tag warn">⚠️ لا أسلحة</span>}
      </div>

      <FameeriGroupForest
        group={group}
        groupId={group.id}
        attacks={attacks}
        highlightTree={highlightTree}
        shieldTree={group.shield}
        underAttackTree={highlightTree}
        title={`🌳 توزيع ${group.name}`}
        showHint={false}
        compact
        embedded
      />
    </div>
  );
}
