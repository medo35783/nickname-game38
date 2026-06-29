import { useCallback, useEffect, useMemo, useState } from 'react';
import { db, ref, get } from '../core/firebaseHelpers';
import {
  deriveSupervisorUids,
  isSupervisorAbsent,
  formatLastLogin,
  filterSupervisors,
  deriveGamesUsedFromStats,
  deriveRecentSessions,
} from '../core/adminUsersHelpers';

/**
 * يجمع بيانات المشرفين من الأكواد المفعّلة + ملفات users/
 */
export function useAdminSupervisors(codeRows = [], indexByCode = {}, codeStatsById = {}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const codeById = useMemo(
    () => Object.fromEntries(codeRows.map((r) => [r.id, r])),
    [codeRows]
  );

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
        const codeRow = codeById[meta.codeId] || {};
        const codeStats = codeStatsById[meta.codeId]?.data || null;

        try {
          const [profileSnap, userStatsSnap, activeSnap] = await Promise.all([
            get(ref(db, `users/${meta.uid}/profile`)),
            codeStats ? Promise.resolve(null) : get(ref(db, `users/${meta.uid}/stats`)),
            get(ref(db, `users/${meta.uid}/activeCode`)),
          ]);
          const profile = profileSnap.val() || {};
          const userStats = codeStats || userStatsSnap?.val() || {};
          const activeCode = activeSnap.val() || null;
          const lastLoginAt = profile.lastLoginAt || null;

          return {
            ...meta,
            displayName: (profile.displayName || profile.email || 'مشرف').trim(),
            email: profile.email || null,
            phone: codeRow.phone || profile.phone || null,
            lastLoginAt,
            lastLoginLabel: formatLastLogin(lastLoginAt),
            absent: isSupervisorAbsent(lastLoginAt),
            gamesHosted: Number(profile.gamesHosted) || 0,
            totalLogins: Number(profile.totalLogins) || 0,
            sessionsTotal: Number(userStats.totalRealSessions ?? userStats.sessionsTotal) || 0,
            codeStatus: activeCode?.codeId === meta.codeId ? 'active' : meta.status,
            activeCode: activeCode?.code || null,
            adminNote: codeRow.adminNote || '',
            sponsorId: codeRow.sponsorId || null,
            sponsorName: codeRow.sponsorName || null,
            gamesUsed: deriveGamesUsedFromStats(userStats),
            recentSessions: deriveRecentSessions(userStats, 3),
            roleType: 'host',
          };
        } catch {
          return {
            ...meta,
            displayName: 'مشرف',
            email: null,
            phone: codeRow.phone || null,
            lastLoginAt: null,
            lastLoginLabel: '—',
            absent: true,
            gamesHosted: 0,
            totalLogins: 0,
            sessionsTotal: 0,
            codeStatus: meta.status,
            activeCode: null,
            adminNote: codeRow.adminNote || '',
            sponsorId: codeRow.sponsorId || null,
            sponsorName: codeRow.sponsorName || null,
            gamesUsed: deriveGamesUsedFromStats(codeStats),
            recentSessions: deriveRecentSessions(codeStats, 3),
            roleType: 'host',
          };
        }
      })
    );

    setRows(enriched);
    setLoading(false);
  }, [uidMeta, codeById, codeStatsById]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { rows, loading, reload, filterSupervisors };
}

export { filterSupervisors };
