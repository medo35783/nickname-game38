import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { db, ref, onValue, off } from '../core/firebaseHelpers';
import { SECURITY_EVENT_TYPES } from '../core/securityEvents';

const MAX_EVENTS = 80;

/**
 * سجل أحداث الأمان — للوحة الصحة
 */
export function useSecurityEvents(notify) {
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

  return { events, loading, stats, maxEvents: MAX_EVENTS };
}
