import { formatPulseDateTime } from '../../core/adminPulseHelpers';
import {
  securityEventLabel,
  securityEventTone,
} from '../../core/securityEvents';
import { exportSecurityEventsCsv } from '../../core/securityEventsExport';
import { useSecurityEvents } from '../../hooks/useSecurityEvents';

/**
 * مراقبة الأحداث الأمنية — مع تصدير CSV
 */
export default function AdminSecurityEvents({ notify, embedded = false }) {
  const { events, loading, stats, maxEvents } = useSecurityEvents(notify);

  const handleExport = () => {
    if (!events.length) {
      notify?.('لا أحداث للتصدير', 'info');
      return;
    }
    exportSecurityEventsCsv(events);
    notify?.('تم تنزيل CSV', 'success');
  };

  const content = (
    <>
      <div className="admin-security-stats">
        <div className="admin-security-stat">
          <span className="admin-security-stat__num">{stats.last24h}</span>
          <span className="admin-security-stat__lbl">آخر 24 ساعة</span>
        </div>
        <div className="admin-security-stat">
          <span className="admin-security-stat__num">{stats.codeFails}</span>
          <span className="admin-security-stat__lbl">فشل أكواد</span>
        </div>
        <div className="admin-security-stat">
          <span className="admin-security-stat__num">{stats.lockouts}</span>
          <span className="admin-security-stat__lbl">حظر تفعيل</span>
        </div>
        <div className="admin-security-stat">
          <span className="admin-security-stat__num">{stats.loginFails}</span>
          <span className="admin-security-stat__lbl">فشل دخول</span>
        </div>
      </div>

      <div className="admin-security-toolbar">
        <button type="button" className="btn btn--sm btn--ghost" onClick={handleExport} disabled={!events.length}>
          📥 تصدير CSV
        </button>
      </div>

      {loading ? (
        <p className="admin-muted">جاري تحميل السجل…</p>
      ) : events.length === 0 ? (
        <p className="admin-muted">لا أحداث مسجّلة بعد — طبيعي إن لم تُنشر القواعد الجديدة.</p>
      ) : (
        <ul className="admin-security-list">
          {events.map((ev) => (
            <li key={ev.id} className={`admin-security-item admin-security-item--${securityEventTone(ev.type)}`}>
              <div className="admin-security-item__main">
                <strong>{securityEventLabel(ev.type)}</strong>
                {ev.reason ? <span className="admin-security-item__reason">{ev.reason}</span> : null}
              </div>
              <div className="admin-security-item__meta">
                <time>{formatPulseDateTime(ev.at)}</time>
                {ev.uid ? <code>{ev.uid.slice(0, 8)}…</code> : null}
                {ev.failCount ? <span>×{ev.failCount}</span> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  if (embedded) return content;

  return (
    <section className="admin-health-block admin-security-events">
      <div className="admin-health-block__head">
        <h3>🛡️ مراقبة الأمان</h3>
        <span className="admin-health-block__meta">آخر {maxEvents} حدث</span>
      </div>
      {content}
    </section>
  );
}
