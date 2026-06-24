import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/** غلاف موحّد لدليل اللعب — يُعرض فوق الشاشة (portal) */
export default function GameGuideModalShell({
  title,
  titleId = 'game-guide-title',
  onClose,
  game = null,
  accentVar = '--gold',
  children,
}) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const portalGameClass = game ? ` game-guide-portal--${game}` : '';

  const content = (
    <div
      className={`game-guide-portal${portalGameClass}`.trim()}
      style={{ '--guide-accent': `var(${accentVar})` }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div className="game-guide-modal" onClick={(e) => e.stopPropagation()}>
        <header className="game-guide-modal__head">
          <h2 id={titleId} className="game-guide-modal__title">
            {title}
          </h2>
          <button type="button" className="btn bgh bxs game-guide-modal__close" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </header>

        <div className="game-guide-modal__body">{children}</div>

        <button type="button" className="btn bg game-guide-modal__done" onClick={onClose}>
          ✅ فهمت!
        </button>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}
