import { useState } from 'react';

/**
 * قسم قابل للطي — لوحة الصحة
 */
export default function AdminCollapsibleSection({
  title,
  icon,
  badge = null,
  hint = null,
  defaultOpen = true,
  tone = '',
  actions = null,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className={`admin-collapse admin-collapse--${tone}${open ? ' admin-collapse--open' : ''}`}>
      <div className="admin-collapse__head">
        <button
          type="button"
          className="admin-collapse__toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="admin-collapse__icon" aria-hidden>
            {icon}
          </span>
          <strong className="admin-collapse__title">{title}</strong>
          {badge != null ? <span className="admin-collapse__badge">{badge}</span> : null}
          <span className="admin-collapse__chevron" aria-hidden>
            {open ? '▲' : '▼'}
          </span>
        </button>
        {actions ? <div className="admin-collapse__actions">{actions}</div> : null}
      </div>
      {hint ? <p className="admin-collapse__hint">{hint}</p> : null}
      {open ? <div className="admin-collapse__body">{children}</div> : null}
    </section>
  );
}
