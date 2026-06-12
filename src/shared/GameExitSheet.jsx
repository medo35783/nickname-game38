import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ARENA_BACK_LABEL } from '../core/constants';
import { getGameBrand } from './gameBrands';

/**
 * ورقة خروج موحّدة — 3 خيارات أثناء اللعب، خياران بعد انتهاء المسابقة.
 */
export default function GameExitSheet({
  open,
  game = 'titles',
  role = 'player',
  roomCode,
  phase,
  onContinue,
  onPause,
  onQuit,
  onArena,
  onClose,
}) {
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmQuit(false);
      setBusy(false);
    }
  }, [open]);

  const runAction = async (action) => {
    if (busy || typeof action !== 'function') return;
    setBusy(true);
    try {
      await Promise.resolve(action());
    } catch {
      /* الإشعار يُعالَج في اللعبة */
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const brand = getGameBrand(game);
  const isAdmin = role === 'admin';
  const gameEnded = phase === 'final' || phase === 'ended';

  const handleOverlayClick = () => {
    if (busy) return;
    if (confirmQuit) setConfirmQuit(false);
    else onClose?.();
  };

  const sheet = confirmQuit ? (
    <div className="game-exit-overlay" role="presentation" onClick={handleOverlayClick}>
      <div
        className={`game-exit-sheet game-exit-sheet--${game} game-exit-sheet--confirm`}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="game-exit-confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="game-exit-sheet__close"
          aria-label="رجوع للخيارات"
          disabled={busy}
          onClick={() => setConfirmQuit(false)}
        >
          ✕
        </button>

        <div className="game-exit-sheet__head">
          <span className="game-exit-sheet__emoji" aria-hidden>
            {isAdmin ? '⚠️' : '🚪'}
          </span>
          <h2 id="game-exit-confirm-title" className="game-exit-sheet__title">
            {isAdmin ? 'إلغاء المسابقة؟' : 'انسحاب من المسابقة؟'}
          </h2>
          <p className="game-exit-sheet__lead">
            {isAdmin
              ? 'المتسابقون سيُخرجون من الغرفة — لا يمكن العودة لهذه الغرفة.'
              : 'ستُسجَّل كمنسحب — يمكنك العودة لاحقاً برمز الغرفة ونفس اسمك.'}
          </p>
        </div>

        <div className="game-exit-sheet__choices">
          <button
            type="button"
            className="game-exit-card game-exit-card--end"
            disabled={busy}
            onClick={() => void runAction(onQuit)}
          >
            <span className="game-exit-card__icon" aria-hidden>
              {isAdmin ? '🛑' : '👋'}
            </span>
            <span className="game-exit-card__body">
              <span className="game-exit-card__title">
                {busy ? 'جاري التنفيذ…' : isAdmin ? 'نعم، إلغاء المسابقة' : 'نعم، انسحاب'}
              </span>
            </span>
          </button>
        </div>

        <button
          type="button"
          className="game-exit-sheet__back-btn"
          disabled={busy}
          onClick={() => setConfirmQuit(false)}
        >
          ↩ لا — أرجع للخيارات
        </button>
      </div>
    </div>
  ) : (
    <div className="game-exit-overlay" role="presentation" onClick={handleOverlayClick}>
      <div
        className={`game-exit-sheet game-exit-sheet--${game}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="game-exit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="game-exit-sheet__close"
          aria-label="إغلاق والبقاء"
          disabled={busy}
          onClick={() => onClose?.()}
        >
          ✕
        </button>

        <div className="game-exit-sheet__head">
          <span className="game-exit-sheet__emoji" aria-hidden>
            {isAdmin && !gameEnded ? '👑' : brand.emoji}
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
          <button
            type="button"
            className="game-exit-card game-exit-card--continue"
            disabled={busy}
            onClick={() => void runAction(onContinue)}
          >
            <span className="game-exit-card__icon" aria-hidden>
              {gameEnded ? '📊' : '✅'}
            </span>
            <span className="game-exit-card__body">
              <span className="game-exit-card__title">
                {gameEnded ? 'أبقَ على التقارير' : isAdmin ? 'أتابع إدارة الغرفة' : 'أتابع اللعب'}
              </span>
              <span className="game-exit-card__sub">
                {gameEnded ? 'شاهد الملخص والنتائج' : 'إغلاق النافذة والبقاء هنا'}
              </span>
            </span>
          </button>

          {!gameEnded && (
            <>
              <button
                type="button"
                className="game-exit-card game-exit-card--pause"
                disabled={busy}
                onClick={() => void runAction(onPause)}
              >
                <span className="game-exit-card__icon" aria-hidden>
                  ⏸️
                </span>
                <span className="game-exit-card__body">
                  <span className="game-exit-card__title">
                    {isAdmin ? 'مغادرة الشاشة فقط' : 'مغادرة مؤقتة'}
                  </span>
                  <span className="game-exit-card__sub">
                    {isAdmin
                      ? 'الغرفة تبقى مفتوحة — ترجع بـ «العودة للغرفة»'
                      : 'تبقى مسجّلاً — ارجع بـ «العودة للغرفة»'}
                  </span>
                </span>
              </button>

              <button
                type="button"
                className="game-exit-card game-exit-card--end"
                disabled={busy}
                onClick={() => setConfirmQuit(true)}
              >
                <span className="game-exit-card__icon" aria-hidden>
                  {isAdmin ? '🛑' : '👋'}
                </span>
                <span className="game-exit-card__body">
                  <span className="game-exit-card__title">
                    {isAdmin ? 'إلغاء المسابقة' : 'انسحاب من المسابقة'}
                  </span>
                  <span className="game-exit-card__sub">
                    {isAdmin
                      ? 'إغلاق الغرفة — المتسابقون يُخرجون'
                      : 'تُسجَّل كمنسحب — يمكنك العودة بالرمز والاسم'}
                  </span>
                </span>
              </button>
            </>
          )}

          {gameEnded && (
            <button
              type="button"
              className="game-exit-card game-exit-card--arena"
              disabled={busy}
              onClick={() => void runAction(onArena)}
            >
              <span className="game-exit-card__icon" aria-hidden>
                🏟️
              </span>
              <span className="game-exit-card__body">
                <span className="game-exit-card__title">{ARENA_BACK_LABEL}</span>
                <span className="game-exit-card__sub">المسابقة انتهت — يمكنك المغادرة</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(sheet, document.body);
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
