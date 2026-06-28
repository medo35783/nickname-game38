import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { db, ref, onValue, off } from '../../core/firebaseHelpers';
import { formatPulseDateTime } from '../../core/adminPulseHelpers';
import {
  securityEventLabel,
  securityEventTone,
  SECURITY_EVENT_TYPES,
} from '../../core/securityEvents';

const MAX_EVENTS = 80;

/**
 * مراقبة الأحداث الأمنية — المستوى الثاني
 */
export default function AdminSecurityEvents({ notify }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    let eventsRef = null;
    let handler = null;

    const authUnsub = onAuthStateChanged(auth, (user) => {
      if (eventsRef && handler) off(eventsRef, 'value', handler);
      if (!user) {
        setLoading(false);
        setEvents([]);
        return;
      }

      setLoading(true);
      eventsRef = ref(db, 'security/events');
      handler = (snap) => {
        if (!alive) return;
        const raw = snap.val() || {};
        const list = Object.entries(raw)
          .map(([id, ev]) => ({ id, ...ev }))
          .filter((ev) => ev?.at)
          .sort((a, b) => b.at - a.at)
          .slice(0, MAX_EVENTS);
        setEvents(list);
        setLoading(false);
      };
      onValue(eventsRef, handler, () => {
        if (!alive) return;
        setLoading(false);
        notify?.('تعذّر قراءة سجل الأمان — انشر قواعد Firebase', 'error');
      });
    });

    return () => {
      alive = false;
      authUnsub();
      if (eventsRef && handler) off(eventsRef, 'value', handler);
    };
  }, [notify]);

  const stats = useMemo(() => {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const recent = events.filter((e) => e.at >= dayAgo);
    return {
      total: events.length,
      last24h: recent.length,
      lockouts: recent.filter((e) => e.type === SECURITY_EVENT_TYPES.CODE_ACTIVATE_LOCKOUT).length,
      codeFails: recent.filter((e) => e.type === SECURITY_EVENT_TYPES.CODE_ACTIVATE_FAIL).length,
      loginFails: recent.filter((e) => e.type === SECURITY_EVENT_TYPES.AUTH_LOGIN_FAIL).length,
    };
  }, [events]);

  return (
    <section className="admin-health-block admin-security-events">
      <div className="admin-health-block__head">
        <h3>🛡️ مراقبة الأمان</h3>
        <span className="admin-health-block__meta">آخر {MAX_EVENTS} حدث</span>
      </div>

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
    </section>
  );
}
