import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import {
  db,
  ref,
  onValue,
  get,
  codesRef,
  ensureCodeIndexesFromRows,
  adminProfileExistsForUid,
} from '../core/firebaseHelpers';
import { aggregateMarketingMetrics } from '../core/marketingStatsHelpers';

/**
 * لقطة مشتركة لأكواد الأدمن — للنبض والتسويق ولوحة الأكواد
 */
export function useAdminCodesSnapshot() {
  const [rows, setRows] = useState([]);
  const [indexByCode, setIndexByCode] = useState({});
  const [codeStatsById, setCodeStatsById] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let codesUnsub = null;
    let indexUnsub = null;

    const authUnsub = onAuthStateChanged(auth, async (user) => {
      if (codesUnsub) codesUnsub();
      if (indexUnsub) indexUnsub();
      codesUnsub = null;
      indexUnsub = null;

      if (!user) {
        setRows([]);
        setIndexByCode({});
        setLoading(false);
        return;
      }

      const isAdmin = await adminProfileExistsForUid(user.uid);
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      setLoading(true);
      codesUnsub = onValue(codesRef(), (snap) => {
        const val = snap.val() || {};
        const list = Object.entries(val).map(([id, data]) => ({ id, ...data }));
        list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setRows(list);
        setLoading(false);
        ensureCodeIndexesFromRows(list).catch(() => {});
      });

      indexUnsub = onValue(ref(db, 'codeIndex'), (snap) => {
        setIndexByCode(snap.val() || {});
      });
    });

    return () => {
      authUnsub();
      if (codesUnsub) codesUnsub();
      if (indexUnsub) indexUnsub();
    };
  }, []);

  const reloadAllStats = useCallback(async () => {
    if (!rows.length) return;
    const entries = await Promise.all(
      rows.map(async (row) => {
        try {
          const snap = await get(ref(db, `codes/${row.id}/stats`));
          return [row.id, snap.val() || null];
        } catch {
          return [row.id, null];
        }
      })
    );
    const next = {};
    entries.forEach(([id, data]) => {
      next[id] = { data, loadedAt: Date.now() };
    });
    setCodeStatsById(next);
  }, [rows]);

  useEffect(() => {
    if (!rows.length) {
      setCodeStatsById({});
      return;
    }
    reloadAllStats();
  }, [rows, reloadAllStats]);

  const platformMarketing = useMemo(() => {
    const list = Object.values(codeStatsById).map((e) => e?.data).filter(Boolean);
    return aggregateMarketingMetrics(list);
  }, [codeStatsById]);

  return {
    rows,
    indexByCode,
    codeStatsById,
    platformMarketing,
    loading,
    reloadAllStats,
    setCodeStatsById,
  };
}
