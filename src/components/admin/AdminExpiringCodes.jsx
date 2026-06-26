import { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { db, ref, onValue, get, formatCodeForDisplay } from '../../core/firebaseHelpers';
import {
  findExpiringCodes,
  formatRemainingShort,
  formatPulseDateTime,
} from '../../core/adminPulseHelpers';
import { openRenewalWhatsApp } from '../../core/adminRenewalShare';

/**
 * أكواد تنتهي خلال 48 ساعة — تذكير واتساب (صفحة الأكواد)
 */
export default function AdminExpiringCodes({ notify, codeRows = [], indexByCode = {} }) {
  const [hostNames, setHostNames] = useState({});

  const expiringCodes = useMemo(
    () =>
      findExpiringCodes(codeRows, indexByCode).map((row) => ({
        ...row,
        codeDisplay: formatCodeForDisplay(row.code),
      })),
    [codeRows, indexByCode]
  );

  useEffect(() => {
    const uids = [...new Set(expiringCodes.map((c) => c.userId).filter(Boolean))];
    if (!uids.length) return undefined;

    let cancelled = false;
    (async () => {
      const next = {};
      await Promise.all(
        uids.map(async (uid) => {
          try {
            const snap = await get(ref(db, `users/${uid}/profile`));
            const p = snap.val() || {};
            next[uid] = (p.displayName || p.email || '').trim().slice(0, 80) || null;
          } catch {
            next[uid] = null;
          }
        })
      );
      if (!cancelled) setHostNames((prev) => ({ ...prev, ...next }));
    })();

    return () => {
      cancelled = true;
    };
  }, [expiringCodes]);

  const handleWhatsApp = useCallback(
    (row) => {
      if (!row.phone) {
        notify?.('لا يوجد رقم واتساب — يُسجّل عند تفعيل الكود', 'info');
        return;
      }
      const hostName = row.userId ? hostNames[row.userId] : null;
      const ok = openRenewalWhatsApp({
        code: row.code,
        expiresAt: row.expiresAt,
        hostName,
        adminNote: row.adminNote,
        phone: row.phone,
      });
      if (ok) notify?.('تم فتح واتساب للعميل', 'success');
      else notify?.('تعذّر فتح واتساب', 'error');
    },
    [hostNames, notify]
  );

  return (
    <div className="card admin-expiring-codes" style={{ marginBottom: 12 }}>
      <div className="ctitle">⏰ أكواد تنتهي قريباً</div>
      <p className="psub" style={{ marginBottom: 10, fontSize: 11 }}>
        خلال 48 ساعة — أرسل تذكير واتساب للتجديد
      </p>
      {expiringCodes.length === 0 ? (
        <p className="admin-pulse-empty">لا أكواد على وشك الانتهاء</p>
      ) : (
        <ul className="admin-pulse-list admin-pulse-list--codes">
          {expiringCodes.map((row) => {
            const host = row.userId ? hostNames[row.userId] : null;
            return (
              <li key={row.id} className="admin-pulse-code">
                <div className="admin-pulse-code__main">
                  <span className="admin-pulse-code__val">{row.codeDisplay}</span>
                  <span className="admin-pulse-code__time">{formatRemainingShort(row.remainingMs)}</span>
                </div>
                <div className="admin-pulse-code__sub">
                  {host ? `👤 ${host}` : row.adminNote || '—'}
                  {row.phone ? <span className="admin-pulse-code__wa"> · 📱 واتساب</span> : null}
                  <span className="admin-pulse-code__exp">{formatPulseDateTime(row.expiresAt)}</span>
                </div>
                <button
                  type="button"
                  className={`btn bgh bxs admin-pulse-wa-btn${row.phone ? ' admin-pulse-wa-btn--ready' : ''}`}
                  onClick={() => handleWhatsApp(row)}
                  title={row.phone ? 'إرسال تذكير مباشر' : 'لا يوجد رقم — يُسجّل عند التفعيل'}
                >
                  💬 واتساب
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
