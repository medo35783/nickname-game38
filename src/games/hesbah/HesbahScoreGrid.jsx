import { BOARD_CELL, boardCellMeta, isBoardCellSelectable } from './HesbahHelpers';

/** دليل حالات الخلايا — متوافق مع أدوات الإثارة الحالية */
const BOARD_LEGEND = [
  { cls: 'hesbah-score-btn--won', label: '✓', text: 'صح' },
  { cls: 'hesbah-score-btn--burned', label: '✕', text: 'خطأ/تكرار' },
  { cls: 'hesbah-score-btn--timeout', label: '⏱', text: 'وقت' },
  { cls: 'hesbah-score-btn--pending', label: '···', text: 'بانتظار' },
  { cls: 'hesbah-score-btn--triple', label: 'X3', text: 'كرت ثلاثي' },
];

export default function HesbahScoreGrid({
  totalQ,
  board,
  chosenScore,
  onPick,
  disabled,
  minScore = 1,
  compact = false,
  showLegend = true,
}) {
  const count = totalQ || 15;

  return (
    <div className={`hesbah-score-board ${compact ? 'hesbah-score-board--compact' : ''}`}>
      <div className="hesbah-score-grid" role="group" aria-label="اختر درجتك">
        {Array.from({ length: count }, (_, i) => i + 1).map((n) => {
          const st = board?.[String(n)] || BOARD_CELL.AVAILABLE;
          const meta = boardCellMeta(st);
          const selectable = isBoardCellSelectable(st) && n >= minScore;
          const isActive = chosenScore === n;
          const lockedBySiege = isBoardCellSelectable(st) && n < minScore;
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
                lockedBySiege ? 'hesbah-score-btn--siege-locked' : '',
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

      {showLegend && (
        <div className="hesbah-score-legend hesbah-score-legend--mini" aria-label="دليل اللوحة">
          {BOARD_LEGEND.map((item) => (
            <span key={item.cls} className="hesbah-score-legend__item">
              <span className={`hesbah-score-legend__chip ${item.cls}`}>{item.label}</span>
              <span className="hesbah-score-legend__text">{item.text}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
