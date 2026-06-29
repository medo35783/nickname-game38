import { useState } from 'react';
import { formatCodeForDisplay } from '../../core/firebaseHelpers';
import { openRenewalWhatsApp } from '../../core/adminRenewalShare';
import { extendCodeExpiration } from '../../core/adminCodeAdminActions';
import { formatExpiryLabel } from '../../core/adminUsersHelpers';
import CodeAdminNote from './CodeAdminNote';

const EXTEND_OPTIONS = [
  { days: 1, label: '+1 يوم' },
  { days: 3, label: '+3 أيام' },
  { days: 7, label: '+7 أيام' },
];

/**
 * بطاقة مشرف غرفة — موسّعة مع إجراءات
 */
export default function AdminSupervisorCard({
  row,
  expanded,
  onToggle,
  notify,
  onUpdated,
}) {
  const [extending, setExtending] = useState(false);

  const handleWhatsApp = () => {
    const ok = openRenewalWhatsApp({
      code: row.code,
      expiresAt: row.expiresAt,
      hostName: row.displayName,
      adminNote: row.adminNote,
      phone: row.phone,
    });
    if (ok) notify?.('تم فتح واتساب', 'success');
    else notify?.('تعذّر فتح واتساب', 'error');
  };

  const handleExtend = async (days) => {
    if (!row.codeId || extending) return;
    if (!window.confirm(`تمديد الكود ${formatCodeForDisplay(row.code)} لمدة ${days} يوم؟`)) return;
    setExtending(true);
    try {
      const newExp = await extendCodeExpiration(row.codeId, days, row.uid);
      notify?.(`تم التمديد حتى ${formatExpiryLabel(newExp)}`, 'success');
      onUpdated?.();
    } catch (e) {
      notify?.(e.message || 'فشل التمديد', 'error');
    } finally {
      setExtending(false);
    }
  };

  return (
    <li
      className={`admin-supervisor-card${row.absent ? ' admin-supervisor-card--absent' : ''}${
        expanded ? ' admin-supervisor-card--open' : ''
      }`}
    >
      <button type="button" className="admin-supervisor-card__toggle" onClick={onToggle}>
        <div className="admin-supervisor-card__head">
          <strong>{row.displayName}</strong>
          <div className="admin-supervisor-card__badges">
            <span className="admin-hub-badge admin-hub-badge--partial">مشرف غرفة</span>
            {row.absent ? (
              <span className="admin-hub-badge admin-hub-badge--important">غائب</span>
            ) : (
              <span className="admin-hub-badge admin-hub-badge--ready">حاضر</span>
            )}
          </div>
        </div>
        <div className="admin-supervisor-card__meta">
          <span className="admin-pulse-code__val">{formatCodeForDisplay(row.code)}</span>
          <span>{row.duration === 1 ? 'تجريبي' : `${row.duration} أيام`}</span>
          <span>{row.codeStatus === 'active' ? '● كود فعّال' : row.codeStatus}</span>
        </div>
        <div className="admin-supervisor-card__stats">
          <span>آخر دخول: {row.lastLoginLabel}</span>
          <span>جلسات: {row.sessionsTotal}</span>
          <span>ينتهي: {formatExpiryLabel(row.expiresAt)}</span>
        </div>
        <span className="admin-supervisor-card__chevron" aria-hidden>
          {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded ? (
        <div className="admin-supervisor-card__detail">
          {row.email ? (
            <a className="admin-supervisor-card__email" href={`mailto:${row.email}`}>
              ✉️ {row.email}
            </a>
          ) : null}
          {row.phone ? <div className="admin-supervisor-card__line">📱 واتساب: {row.phone}</div> : null}
          {row.sponsorName ? (
            <div className="admin-supervisor-card__line">🤝 راعٍ مرتبط: {row.sponsorName}</div>
          ) : (
            <div className="admin-supervisor-card__line admin-supervisor-card__line--muted">
              بدون راعٍ حصري على الكود
            </div>
          )}

          {row.gamesUsed?.length ? (
            <div className="admin-supervisor-card__line">
              🎮 ألعاب: {row.gamesUsed.join(' · ')}
            </div>
          ) : (
            <div className="admin-supervisor-card__line admin-supervisor-card__line--muted">
              لم تُسجّل ألعاب بعد
            </div>
          )}

          {row.recentSessions?.length ? (
            <div className="admin-supervisor-card__sessions">
              <div className="admin-supervisor-card__sessions-title">آخر الجلسات</div>
              <ul>
                {row.recentSessions.map((s, i) => (
                  <li key={`${s.ts}-${i}`}>
                    {s.gameLabel} · غرفة {s.roomCode} · {s.playerCount} لاعب · {s.dateLabel}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <CodeAdminNote
            codeId={row.codeId}
            initialNote={row.adminNote}
            notify={notify}
          />

          <div className="admin-supervisor-card__actions">
            <button type="button" className="btn btn--sm btn--gold" onClick={handleWhatsApp}>
              💬 واتساب تجديد
            </button>
            {EXTEND_OPTIONS.map((opt) => (
              <button
                key={opt.days}
                type="button"
                className="btn btn--sm btn--ghost"
                disabled={extending}
                onClick={() => handleExtend(opt.days)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </li>
  );
}
