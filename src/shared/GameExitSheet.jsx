import { ARENA_BACK_LABEL } from '../core/constants';
import { getGameBrand } from './gameBrands';

/**
 * ورقة خروج — واضحة وفخمة (نفس الشاشة للمشرف والمتسابق).
 */
export default function GameExitSheet({
  open,
  game = 'titles',
  role = 'player',
  roomCode,
  phase,
  onContinue,
  onLeave,
  onClose,
}) {
  if (!open) return null;

  const brand = getGameBrand(game);
  const isAdmin = role === 'admin';
  const gameEnded = phase === 'final' || phase === 'ended';

  const continueCopy = gameEnded
    ? {
        icon: '📊',
        title: 'أبقَ على التقارير',
        sub: 'شاهد الملخص والنتائج',
      }
    : {
        icon: '✅',
        title: isAdmin ? 'أتابع إدارة الغرفة' : 'أتابع اللعب',
        sub: 'إغلاق النافذة والبقاء هنا',
      };

  const leaveCopy = gameEnded
    ? {
        icon: '🏟️',
        title: ARENA_BACK_LABEL,
        sub: 'المسابقة انتهت — يمكنك المغادرة',
      }
    : {
        icon: '🚪',
        title: isAdmin ? 'خروج من الغرفة' : ARENA_BACK_LABEL,
        sub: isAdmin
          ? 'مغادرة شاشة أو إنهاء المسابقة'
          : 'مغادرة الغرفة والرجوع لساحة الألعاب',
      };

  return (
    <div className="game-exit-overlay" role="presentation" onClick={onClose}>
      <div
        className={`game-exit-sheet game-exit-sheet--${game}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-exit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="game-exit-sheet__close" aria-label="إغلاق والبقاء" onClick={onClose}>
          ✕
        </button>

        <div className="game-exit-sheet__head">
          <span className="game-exit-sheet__emoji" aria-hidden>
            {brand.emoji}
          </span>
          <h2 id="game-exit-title" className="game-exit-sheet__title">
            {gameEnded ? 'المسابقة انتهت' : 'ماذا تريد أن تفعل؟'}
          </h2>
          {roomCode && (
            <span className="game-exit-sheet__room">
              رمز الغرفة <strong>{roomCode}</strong>
            </span>
          )}
        </div>

        <div className="game-exit-sheet__choices">
          <button type="button" className="game-exit-card game-exit-card--continue" onClick={onContinue}>
            <span className="game-exit-card__icon" aria-hidden>
              {continueCopy.icon}
            </span>
            <span className="game-exit-card__body">
              <span className="game-exit-card__title">{continueCopy.title}</span>
              <span className="game-exit-card__sub">{continueCopy.sub}</span>
            </span>
          </button>

          <button
            type="button"
            className={`game-exit-card ${gameEnded ? 'game-exit-card--arena' : 'game-exit-card--leave'}`}
            onClick={onLeave}
          >
            <span className="game-exit-card__icon" aria-hidden>
              {leaveCopy.icon}
            </span>
            <span className="game-exit-card__body">
              <span className="game-exit-card__title">{leaveCopy.title}</span>
              <span className="game-exit-card__sub">{leaveCopy.sub}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** زر رجوع موحّد */
export function GameExitTrigger({ onClick, label = 'رجوع', variant = 'default' }) {
  const className = [
    'game-exit-trigger',
    variant === 'nav' ? 'game-exit-trigger--nav' : '',
    variant === 'bar' ? 'game-exit-trigger--bar' : '',
    variant === 'compact' ? 'game-exit-trigger--compact' : '',
    variant === 'arena' ? 'game-exit-trigger--arena' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={className} onClick={onClick} aria-label={label}>
      <span className="game-exit-trigger__icon" aria-hidden>
        ←
      </span>
      <span className="game-exit-trigger__label">{label}</span>
    </button>
  );
}
