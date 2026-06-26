/**
 * شريط تنبيهات — نظرة عامة
 */
export default function AdminAlertsStrip({ alerts = [], onNavigate }) {
  if (!alerts.length) {
    return (
      <div className="admin-alerts admin-alerts--clear">
        <span aria-hidden>✅</span>
        <span>لا تنبيهات عاجلة — كل شيء تحت السيطرة</span>
      </div>
    );
  }

  return (
    <div className="admin-alerts">
      {alerts.map((a) => (
        <button
          key={a.id}
          type="button"
          className={`admin-alerts__item admin-alerts__item--${a.tone}`}
          onClick={() => onNavigate?.(a.page)}
        >
          <span className="admin-alerts__icon" aria-hidden>
            {a.icon}
          </span>
          <span className="admin-alerts__text">
            <strong>{a.title}</strong>
            <span>{a.sub}</span>
          </span>
          <span className="admin-alerts__go" aria-hidden>
            ←
          </span>
        </button>
      ))}
    </div>
  );
}
