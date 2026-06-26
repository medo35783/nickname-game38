import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, ref, get } from '../core/firebaseHelpers';
import {
  deriveSupervisorUids,
  isSupervisorAbsent,
  formatLastLogin,
  filterSupervisors,
} from '../core/adminUsersHelpers';

/**
 * يجمع بيانات المشرفين من الأكواد المفعّلة + ملفات users/
 */
export function useAdminSupervisors(codeRows = [], indexByCode = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const uidMeta = useMemo(
    () => deriveSupervisorUids(codeRows, indexByCode),
    [codeRows, indexByCode]
  );

  const reload = useCallback(async () => {
    if (!uidMeta.length) {
      setRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const enriched = await Promise.all(
      uidMeta.map(async (meta) => {
        try {
          const [profileSnap, statsSnap, activeSnap] = await Promise.all([
            get(ref(db, `users/${meta.uid}/profile`)),
            get(ref(db, `users/${meta.uid}/stats`)),
            get(ref(db, `users/${meta.uid}/activeCode`)),
          ]);
          const profile = profileSnap.val() || {};
          const stats = statsSnap.val() || {};
          const activeCode = activeSnap.val() || null;
          const lastLoginAt = profile.lastLoginAt || null;

          return {
            ...meta,
            displayName: (profile.displayName || profile.email || 'مشرف').trim(),
            email: profile.email || null,
            lastLoginAt,
            lastLoginLabel: formatLastLogin(lastLoginAt),
            absent: isSupervisorAbsent(lastLoginAt),
            gamesHosted: Number(profile.gamesHosted) || 0,
            totalLogins: Number(profile.totalLogins) || 0,
            sessionsTotal: Number(stats.sessionsTotal) || 0,
            codeStatus: activeCode?.codeId === meta.codeId ? 'active' : meta.status,
            activeCode: activeCode?.code || null,
          };
        } catch {
          return {
            ...meta,
            displayName: 'مشرف',
            email: null,
            lastLoginAt: null,
            lastLoginLabel: '—',
            absent: true,
            gamesHosted: 0,
            totalLogins: 0,
            sessionsTotal: 0,
            codeStatus: meta.status,
            activeCode: null,
          };
        }
      })
    );

    setRows(enriched);
    setLoading(false);
  }, [uidMeta]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, loading, reload, filterSupervisors };
}

export { filterSupervisors };
