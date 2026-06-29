/**
 * إجراءات سريعة — نظرة عامة مركز التحكم
 */
export default function AdminQuickActions({ onNavigate }) {
  const actions = [
    { id: 'codes', icon: '🎟️', label: 'توليد أكواد', page: 'codes' },
    { id: 'promo', icon: '🎁', label: 'أكواد ترويجية', page: 'codes' },
    { id: 'marketing', icon: '📣', label: 'تقرير B2B', page: 'marketing' },
    { id: 'qbank', icon: '📚', label: 'بنك الأسئلة', page: 'qbank' },
    { id: 'content', icon: '📢', label: 'رعاة ولوبي', page: 'content' },
    { id: 'health', icon: '🛠️', label: 'صحة المنصة', page: 'health' },
  ];

  return (
    <section className="admin-quick-actions" aria-label="إجراءات سريعة">
      <div className="admin-overview-kpi__head">
        <strong>⚡ إجراءات سريعة</strong>
      </div>
      <div className="admin-quick-actions__grid">
        {actions.map(({ id, icon, label, page }) => (
          <button
            key={id}
            type="button"
            className="admin-quick-actions__btn"
            onClick={() => typeof onNavigate === 'function' && onNavigate(page)}
          >
            <span className="admin-quick-actions__icon" aria-hidden>
              {icon}
            </span>
            <span className="admin-quick-actions__label">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
