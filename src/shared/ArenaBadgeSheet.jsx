import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import '../styles/arena-badge.css';

/**
 * نافذة منبثقة موحّدة — أيقونة الشارة والإنجازات
 */
export default function ArenaBadgeSheet({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  bodyClassName = '',
  placement = 'bottom',
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('arena-sheet-open');
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      document.body.classList.remove('arena-sheet-open');
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`arena-sheet-overlay${placement === 'center' ? ' arena-sheet-overlay--center' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        className={`arena-sheet${placement === 'center' ? ' arena-sheet--center' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="arena-sheet-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="arena-sheet__glow" aria-hidden />
        {placement === 'bottom' ? <div className="arena-sheet__handle" aria-hidden /> : null}
        <header className="arena-sheet__head">
          <div className="arena-sheet__head-text">
            {icon ? <span className="arena-sheet__head-icon">{icon}</span> : null}
            <div>
              <h2 id="arena-sheet-title" className="arena-sheet__title">
                {title}
              </h2>
              {subtitle ? <p className="arena-sheet__sub">{subtitle}</p> : null}
            </div>
          </div>
          <button type="button" className="arena-sheet__close" aria-label="إغلاق" onClick={onClose}>
            ✕
          </button>
        </header>
        <div className={`arena-sheet__body${bodyClassName ? ` ${bodyClassName}` : ''}`}>{children}</div>
        {footer ? <footer className="arena-sheet__foot">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}
