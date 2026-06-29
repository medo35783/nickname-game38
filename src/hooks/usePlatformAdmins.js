import { useCallback, useEffect, useState } from 'react';
import { db, ref, get } from '../core/firebaseHelpers';

const ADMIN_ROOTS = ['admins', 'admin'];

/**
 * قائمة مشرفي المنصة (صلاحية التحكم) — من admins/ و admin/
 */
export function usePlatformAdmins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const byUid = new Map();
      await Promise.all(
        ADMIN_ROOTS.map(async (root) => {
          const snap = await get(ref(db, root));
          const val = snap.val() || {};
          await Promise.all(
            Object.entries(val).map(async ([uid, row]) => {
              if (byUid.has(uid)) return;
              let displayName = row?.displayName || row?.email || null;
              let email = row?.email || null;
              try {
                const prof = (await get(ref(db, `users/${uid}/profile`))).val() || {};
                displayName = prof.displayName || displayName || prof.email;
                email = prof.email || email;
              } catch {
                /* optional profile */
              }
              byUid.set(uid, {
                uid,
                displayName: (displayName || 'مشرف منصة').trim(),
                email,
                root,
              });
            })
          );
        })
      );
      setAdmins([...byUid.values()]);
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { admins, loading, reload };
}
