import { BOARD_CELL, boardCellMeta, isBoardCellSelectable } from './sniperHelpers';

const LEGEND = [
  { cls: 'sniper-score-btn--won', label: '✓', text: 'صح' },
  { cls: 'sniper-score-btn--burned', label: '✕', text: 'خطأ' },
  { cls: 'sniper-score-btn--timeout', label: '⏱', text: 'وقت' },
  { cls: 'sniper-score-btn--double', label: '×2', text: 'مضاعف' },
];

export default function SniperScoreGrid({ totalQ, board, chosenScore, onPick, disabled }) {
  const count = totalQ || 15;

  return (
    <>
      <div className="sniper-score-grid" role="group" aria-label="اختر درجتك">
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
              aria-label={`درجة ${n}${meta.label && meta.label !== String(n) ? ` — ${meta.title}` : ''}`}
              className={[
                'sniper-score-btn',
                meta.className,
                isActive && selectable ? 'active' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={cellDisabled}
              onClick={() => onPick?.(n)}
            >
              <span className="sniper-score-btn__inner">{meta.label ?? n}</span>
            </button>
          );
        })}
      </div>
      <div className="sniper-score-legend" aria-hidden="true">
        {LEGEND.map((item) => (
          <span key={item.cls} className="sniper-score-legend__item">
            <span className={`sniper-score-legend__chip ${item.cls}`}>{item.label}</span>
            {item.text}
          </span>
        ))}
      </div>
    </>
  );
}
