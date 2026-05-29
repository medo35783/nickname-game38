import { Q_WEAPONS } from '../../core/constants';
import { groupWeaponsTotal } from './fameeriAdminHelpers';

/** شريط مجموعات مدمج — بدون تكرار البطاقات الكبيرة */
export default function FameeriAdminRibbon({
  groups,
  turnGroupId,
  onSelectTurn,
  selectable = false,
}) {
  return (
    <div className="fameeri-admin-ribbon">
      {groups.map((g) => {
        const isTurn = turnGroupId === g.id;
        const wTotal = groupWeaponsTotal(g);
        const inner = (
          <>
            <div className="fameeri-admin-ribbon__top">
              {isTurn && <span className="fameeri-admin-ribbon__turn">⚔️</span>}
              <span className="fameeri-group-name">{g.name}</span>
              <span className="fameeri-admin-ribbon__birds">{g.totalRemaining ?? 0} 🐦</span>
            </div>
            <div className="fameeri-admin-ribbon__wpns">
              {Q_WEAPONS.map((w) => {
                const q = g.weapons?.[w.id] ?? 0;
                return (
                  <span key={w.id} className={`fameeri-admin-ribbon__wpn${q <= 0 ? ' empty' : ''}`} title={w.name}>
                    {w.icon}
                    {q}
                  </span>
                );
              })}
              <span className="fameeri-admin-ribbon__wpn-total">({wTotal})</span>
            </div>
            <div className="fameeri-admin-ribbon__shield">
              {g.shield ? `🛡️ ${g.shield}` : g.shieldUsed ? '🛡️—' : '🛡️✓'}
            </div>
          </>
        );

        if (selectable && onSelectTurn) {
          return (
            <button
              key={g.id}
              type="button"
              className={`fameeri-admin-ribbon__item${isTurn ? ' on' : ''}`}
              onClick={() => onSelectTurn(g.id)}
            >
              {inner}
            </button>
          );
        }

        return (
          <div key={g.id} className={`fameeri-admin-ribbon__item${isTurn ? ' on' : ''}`}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}
