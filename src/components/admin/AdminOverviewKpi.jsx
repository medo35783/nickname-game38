import { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { db, ref, onValue } from '../../core/firebaseHelpers';
import {
  computeOverviewKpi,
  countApprovedBankQuestions,
} from '../../core/adminOverviewHelpers';

function kpiTile(value, label, tone = 'default') {
  return (
    <div className={`admin-kpi-tile admin-kpi-tile--${tone}`}>
      <div className="admin-kpi-tile__val">{value}</div>
      <div className="admin-kpi-tile__lbl">{label}</div>
    </div>
  );
}

function fmtNum(n) {
  return Number(n || 0).toLocaleString('en-US');
}

/**
 * شبكة KPI — نظرة عامة مركز التحكم
 */
export default function AdminOverviewKpi({ rows = [], indexByCode = {}, codeStatsById = {} }) {
  const [roomSnaps, setRoomSnaps] = useState({ rooms: {}, qrooms: {}, srooms: {} });
  const [bankCount, setBankCount] = useState(null);

  useEffect(() => {
    let alive = true;
    const unsubs = [];

    const authUnsub = onAuthStateChanged(auth, (user) => {
      unsubs.forEach((fn) => fn());
      unsubs.length = 0;
      if (!user) return;

      ['rooms', 'qrooms', 'srooms'].forEach((rootKey) => {
        unsubs.push(
          onValue(ref(db, rootKey), (snap) => {
            if (!alive) return;
            setRoomSnaps((prev) => ({ ...prev, [rootKey]: snap.val() || {} }));
          })
        );
      });

      unsubs.push(
        onValue(ref(db, 'questionBank'), (snap) => {
          if (!alive) return;
          setBankCount(countApprovedBankQuestions(snap.val()));
        })
      );
    });

    return () => {
      alive = false;
      authUnsub();
      unsubs.forEach((fn) => fn());
    };
  }, []);

  const kpi = useMemo(
    () => computeOverviewKpi({ rows, indexByCode, codeStatsById, roomSnaps }),
    [rows, indexByCode, codeStatsById, roomSnaps]
  );

  return (
    <section className="admin-overview-kpi" aria-label="مؤشرات المنصة">
      <div className="admin-overview-kpi__head">
        <strong>📈 مؤشرات سريعة</strong>
        <span className="admin-overview-kpi__hint">تحديث مباشر</span>
      </div>
      <div className="admin-kpi-grid">
        {kpiTile(kpi.activeRooms, 'غرف الآن', 'live')}
        {kpiTile(fmtNum(kpi.sessionsToday), 'جلسات اليوم', 'gold')}
        {kpiTile(fmtNum(kpi.activeCodes), 'أكواد نشطة', 'green')}
        {kpiTile(fmtNum(kpi.activeHosts), 'مشرفون نشطون', 'blue')}
        {kpiTile(bankCount == null ? '…' : fmtNum(bankCount), 'أسئلة البنك', 'purple')}
        {kpiTile(`${fmtNum(kpi.estimatedRevenue)} ر.س`, 'إيراد الأكواد المدفوعة', 'brand')}
      </div>
      <div className="admin-overview-kpi__sub">
        <span>🎁 ترويجي نشط: {fmtNum(kpi.promoActive)}</span>
        <span>💳 مدفوع نشط: {fmtNum(kpi.paidActive)}</span>
        <span>📦 غير مستخدم: {fmtNum(kpi.unusedCodes)}</span>
        <span>👥 مشاركات اليوم: {fmtNum(kpi.participantsToday)}</span>
      </div>
    </section>
  );
}
