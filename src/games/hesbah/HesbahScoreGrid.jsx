import { BOARD_CELL, boardCellMeta, isBoardCellSelectable } from './hesbahHelpers';

const LEGEND = [
  { cls: 'hesbah-score-btn--won', label: '✓', text: 'صح' },
  { cls: 'hesbah-score-btn--burned', label: '✕', text: 'خطأ أو تكرار' },
  { cls: 'hesbah-score-btn--timeout', label: '⏱', text: 'وقت' },
  { cls: 'hesbah-score-btn--double', label: '×2', text: 'مضاعف' },
];

export default function HesbahScoreGrid({ totalQ, board, chosenScore, onPick, disabled }) {
  const count = totalQ || 15;

  return (
    <>
      <div className="hesbah-score-grid" role="group" aria-label="اختر درجتك">
        {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
          const st = board?.[String(n)] || BOARD_CELL.AVAILABLE;
          const meta = boardCellMeta(st);
          const selectable = isBoardCellSelectable(st);
          const isActive = chosenScore === n;
          const cellDisabled = disabled || !selectable;

          return (
            <button
              key={n}
              type="button"
              title={meta.title}
              aria-label={`درجة ${n}${meta.badge ? ` — ${meta.title}` : ''}`}
              className={[
                'hesbah-score-btn',
                meta.className,
                isActive && selectable ? 'active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={cellDisabled}
              onClick={() => onPick?.(n)}
            >
              <span className="hesbah-score-btn__inner">
                <span className="hesbah-score-btn__num">{n}</span>
                {meta.badge && (
                  <span className="hesbah-score-btn__badge" aria-hidden="true">
                    {meta.badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div className="hesbah-score-legend">
        {LEGEND.map((item) => (
          <span key={item.cls} className="hesbah-score-legend__item">
            <span className={`hesbah-score-legend__chip ${item.cls}`}>{item.label}</span>
            {item.text}
          </span>
        ))}
      </div>
    </>
  );
}
