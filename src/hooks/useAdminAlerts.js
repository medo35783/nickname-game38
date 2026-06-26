import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { db, ref, onValue } from '../core/firebaseHelpers';
import { subscribePlatformFeedback } from '../core/platformFeedback';
import { subscribePrizeAwards, deriveUnregisteredPrizeSessions } from '../core/prizeAwards';
import { buildAdminAlerts } from '../core/adminAlertsHelpers';

/**
 * تنبيهات مركز التحكم — اشتراكات مشتركة
 */
export function useAdminAlerts({ codeRows = [], indexByCode = {}, codeStatsById = {} } = {}) {
  const [feedbackItems, setFeedbackItems] = useState([]);
  const [roomSnaps, setRoomSnaps] = useState({ rooms: {}, qrooms: {}, srooms: {} });
  const [awards, setAwards] = useState([]);

  useEffect(() => {
    const unsubFb = subscribePlatformFeedback(setFeedbackItems);
    const unsubPr = subscribePrizeAwards(setAwards);
    return () => {
      unsubFb();
      unsubPr();
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const unsubs = [];

    const authUnsub = onAuthStateChanged(auth, (user) => {
      unsubs.forEach((fn) => fn());
      unsubs.length = 0;
      if (!user || !alive) return;

      ['rooms', 'qrooms', 'srooms'].forEach((rootKey) => {
        const r = ref(db, rootKey);
        unsubs.push(
          onValue(r, (snap) => {
            if (!alive) return;
            setRoomSnaps((prev) => ({ ...prev, [rootKey]: snap.val() || {} }));
          })
        );
      });
    });

    return () => {
      alive = false;
      authUnsub();
      unsubs.forEach((fn) => fn());
    };
  }, []);

  const prizeEligibleCount = useMemo(
    () => deriveUnregisteredPrizeSessions(codeRows, codeStatsById, awards).length,
    [codeRows, codeStatsById, awards]
  );

  const alerts = useMemo(
    () =>
      buildAdminAlerts({
        feedbackItems,
        codeRows,
        indexByCode,
        roomSnaps,
        prizeEligibleCount,
      }),
    [feedbackItems, codeRows, indexByCode, roomSnaps, prizeEligibleCount]
  );

  return { alerts, alertCount: alerts.length, prizeEligibleCount };
}
