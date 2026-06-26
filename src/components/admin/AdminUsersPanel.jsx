import { useMemo, useState } from 'react';
import { formatCodeForDisplay } from '../../core/firebaseHelpers';
import { useAdminSupervisors, filterSupervisors } from '../../hooks/useAdminSupervisors';
import AdminFeedbackInbox from './AdminFeedbackInbox';

const FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'active-code', label: 'كود نشط' },
  { id: 'active', label: 'حاضرون' },
  { id: 'absent', label: 'غائبون +30 يوم' },
  { id: 'trial', label: 'تجريبي (يوم)' },
];

/**
 * المرحلة 4 — المشرفون وصندوق الاقتراحات
 */
export default function AdminUsersPanel({ notify, codeRows = [], indexByCode = {} }) {
  const { rows, loading, reload } = useAdminSupervisors(codeRows, indexByCode);
  const [filter, setFilter] = useState('all');
  const [section, setSection] = useState('supervisors');

  const visible = useMemo(() => filterSupervisors(rows, filter), [rows, filter]);

  const absentCount = rows.filter((r) => r.absent).length;
  const activeCount = rows.filter((r) => !r.absent).length;

  return (
    <div className="admin-users-panel">
      <div className="admin-subtabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={section === 'supervisors'}
          className={`admin-subtab${section === 'supervisors' ? ' admin-subtab--on' : ''}`}
          onClick={() => setSection('supervisors')}
        >
          👥 المشرفون
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={section === 'feedback'}
          className={`admin-subtab${section === 'feedback' ? ' admin-subtab--on' : ''}`}
          onClick={() => setSection('feedback')}
        >
          💡 الاقتراحات
        </button>
      </div>

      {section === 'feedback' ? (
        <AdminFeedbackInbox notify={notify} />
      ) : (
        <>
          <div className="admin-pulse-stats-row">
            <div className="admin-pulse-stat admin-pulse-stat--gold">
              <div className="admin-pulse-stat__val">{rows.length}</div>
              <div className="admin-pulse-stat__lbl">مشرفون</div>
            </div>
            <div className="admin-pulse-stat admin-pulse-stat--blue">
              <div className="admin-pulse-stat__val">{activeCount}</div>
              <div className="admin-pulse-stat__lbl">حاضرون</div>
            </div>
            <div className="admin-pulse-stat">
              <div className="admin-pulse-stat__val">{absentCount}</div>
              <div className="admin-pulse-stat__lbl">غائبون</div>
            </div>
          </div>

          <div className="admin-filter-chips">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`admin-pulse-chip${filter === f.id ? ' admin-pulse-chip--on' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
            <button type="button" className="btn btn--sm btn--ghost" onClick={reload}>
              تحديث
            </button>
          </div>

          {loading ? (
            <p className="admin-pulse-empty">جاري تحميل المشرفين…</p>
          ) : !visible.length ? (
            <p className="admin-pulse-empty">لا يوجد مشرفون في هذا التصنيف.</p>
          ) : (
            <ul className="admin-pulse-list admin-supervisor-list">
              {visible.map((row) => (
                <li
                  key={row.uid}
                  className={`admin-supervisor-card${row.absent ? ' admin-supervisor-card--absent' : ''}`}
                >
                  <div className="admin-supervisor-card__head">
                    <strong>{row.displayName}</strong>
                    {row.absent ? (
                      <span className="admin-hub-badge admin-hub-badge--important">غائب</span>
                    ) : (
                      <span className="admin-hub-badge admin-hub-badge--ready">نشط</span>
                    )}
                  </div>
                  <div className="admin-supervisor-card__meta">
                    <span className="admin-pulse-code__val">{formatCodeForDisplay(row.code)}</span>
                    <span>{row.duration === 1 ? 'تجريبي' : `${row.duration} أيام`}</span>
                    <span>{row.codeStatus === 'active' ? '● كود فعّال' : row.codeStatus}</span>
                  </div>
                  <div className="admin-supervisor-card__stats">
                    <span>آخر دخول: {row.lastLoginLabel}</span>
                    <span>جلسات: {row.sessionsTotal}</span>
                    <span>استضاف: {row.gamesHosted}</span>
                  </div>
                  {row.email ? (
                    <a className="admin-supervisor-card__email" href={`mailto:${row.email}`}>
                      {row.email}
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
