import { Q_TREES, Q_TOTAL } from '../../core/constants';
import { resolveTreesInitial, sumTrees } from './fameeriForestHelpers.js';

/** غابة المجموعة — توزيع القميري على الأشجار + خصم بعد الهجوم */
export default function FameeriGroupForest({
  group,
  groupId,
  attacks,
  highlightTree,
  hitFlash,
  shieldTree,
  underAttackTree,
  title,
  showHint = true,
  compact = false,
  embedded = false,
}) {
  if (!group?.distributed && !group?.trees) {
    return (
      <div className="card fameeri-forest fameeri-forest--pending">
        <div className="ctitle">🌳 غابة مجموعتك</div>
        <div className="fameeri-forest__pending">⏳ لم يُكتمل التوزيع بعد</div>
      </div>
    );
  }

  const trees = group.trees || {};
  const initial = resolveTreesInitial(group, attacks, groupId);
  const totalOnTrees = sumTrees(trees);
  const totalRemaining = group.totalRemaining ?? totalOnTrees;
  const totalLost = Q_TOTAL - (totalRemaining || 0);

  return (
    <div className={`${embedded ? '' : 'card '}fameeri-forest${compact ? ' fameeri-forest--compact' : ''}${embedded ? ' fameeri-forest--embedded' : ''}`}>
      <div className="fameeri-forest__head">
        <div className="ctitle">{title || '🌳 غابة مجموعتك'}</div>
        <div className="fameeri-forest__summary">
          <span className="fameeri-forest__total">
            <strong>{totalRemaining}</strong>
            <span> / {Q_TOTAL} 🐦</span>
          </span>
          {totalLost > 0 && (
            <span className="fameeri-forest__lost-total">صُيد {totalLost}</span>
          )}
        </div>
      </div>
      {showHint && (
        <div className="fameeri-forest__hint">🔒 توزيعكم سري — لا تشاركوه مع الخصم</div>
      )}

      <div className="fameeri-forest-grid">
        {Q_TREES.map((tree) => {
          const count = parseInt(trees[tree], 10) || 0;
          const start = parseInt(initial[tree], 10) || 0;
          const lostFromStart = Math.max(0, start - count);
          const isHit = hitFlash?.tree === tree;
          const isTarget = underAttackTree === tree;
          const isShield = shieldTree === tree;
          const isHighlight = highlightTree === tree;
          const empty = count === 0;

          let cellClass = 'fameeri-forest-cell';
          if (empty) cellClass += ' empty';
          if (lostFromStart > 0 && !empty) cellClass += ' depleted';
          if (isHit) cellClass += ' hit';
          if (isTarget) cellClass += ' targeted';
          if (isShield) cellClass += ' shielded';
          if (isHighlight) cellClass += ' highlight';

          return (
            <div key={tree} className={cellClass} title={`${tree}: ${count} قميري`}>
              {isTarget && <span className="fameeri-forest-cell__badge attack">⚔️</span>}
              {isShield && <span className="fameeri-forest-cell__badge shield">🛡️</span>}
              {isHit && (
                <span className="fameeri-forest-cell__flash">-{hitFlash.lost}</span>
              )}
              <span className="fameeri-forest-cell__ico">🌳</span>
              <span className="fameeri-forest-cell__name">{tree}</span>
              <span className="fameeri-forest-cell__count">{count}</span>
              {lostFromStart > 0 && (
                <span className="fameeri-forest-cell__was">كان {start}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
