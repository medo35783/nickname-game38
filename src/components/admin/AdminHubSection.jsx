import { useId } from 'react';

const STATUS_META = {
  ready: { label: 'جاهز', className: 'admin-hub-badge--ready' },
  partial: { label: 'جاهز جزئياً', className: 'admin-hub-badge--partial' },
  soon: { label: 'قريباً', className: 'admin-hub-badge--soon' },
  important: { label: 'مهم', className: 'admin-hub-badge--important' },
};

/**
 * قسم قابل للطي في مركز التحكم
 */
export default function AdminHubSection({
  icon,
  title,
  subtitle,
  status = 'soon',
  defaultOpen = false,
  children,
  className = '',
}) {
  const panelId = useId();
  const badge = STATUS_META[status] || STATUS_META.soon;

  return (
    <section className={`admin-hub-section ${className}`.trim()}>
      <details className="admin-hub-section__details" open={defaultOpen}>
        <summary className="admin-hub-section__head">
          <span className="admin-hub-section__chev" aria-hidden>
            ▾
          </span>
          <span className={`admin-hub-badge ${badge.className}`}>{badge.label}</span>
          <span className="admin-hub-section__icon" aria-hidden>
            {icon}
          </span>
          <span className="admin-hub-section__text">
            <span className="admin-hub-section__title">{title}</span>
            {subtitle ? <span className="admin-hub-section__sub">{subtitle}</span> : null}
          </span>
        </summary>
        <div className="admin-hub-section__body" id={panelId}>
          {children}
        </div>
      </details>
    </section>
  );
}
