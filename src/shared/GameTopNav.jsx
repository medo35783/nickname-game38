import { ARENA_BACK_LABEL } from '../core/constants';
import { GameExitTrigger } from './GameExitSheet';

/**
 * شريط علوي موحّد — زر رجوع واحد للمشرف والمتسابق.
 */
export default function GameTopNav({
  onBack,
  label,
  sticky = false,
  variant = 'nav',
}) {
  const resolvedLabel = label ?? (variant === 'arena' ? ARENA_BACK_LABEL : 'رجوع');
  if (typeof onBack !== 'function') return null;

  const wrapClass = sticky ? 'game-sticky-chrome' : 'game-top-nav';

  return (
    <div className={wrapClass}>
      <GameExitTrigger variant={variant} label={resolvedLabel} onClick={onBack} />
    </div>
  );
}

/** شاشة تحقق الجلسة — تمنع وميض الانضمام/الدخول */
export function GameSessionChecking({ emoji = '🎮', label = 'جاري التحقق من جلستك…' }) {
  return (
    <div
      className="scr game-session-check"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 220,
        padding: 24,
      }}
    >
      <div className="game-session-check__emoji">{emoji}</div>
      <div className="game-session-check__label">{label}</div>
    </div>
  );
}

/** شارة الجولة — متجاوبة لكل الأجهزة */
export function GameRoundBadge({ current, total, label = 'جولة' }) {
  if (current == null) return null;
  const showTotal = total != null && total > 0;
  return (
    <span className="game-round-badge" aria-label={`${label} ${current}${showTotal ? ` من ${total}` : ''}`}>
      <span className="game-round-badge__label">{label}</span>
      <span className="game-round-badge__num">{current}</span>
      {showTotal && (
        <>
          <span className="game-round-badge__sep">/</span>
          <span className="game-round-badge__total">{total}</span>
        </>
      )}
    </span>
  );
}
