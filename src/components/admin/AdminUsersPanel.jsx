import { useMemo, useState } from 'react';
import { useAdminSupervisors, filterSupervisors } from '../../hooks/useAdminSupervisors';
import { usePlatformAdmins } from '../../hooks/usePlatformAdmins';
import {
  searchSupervisors,
  paginateList,
  SUPERVISOR_PAGE_SIZES,
} from '../../core/adminUsersHelpers';
import AdminFeedbackInbox from './AdminFeedbackInbox';
import AdminSupervisorCard from './AdminSupervisorCard';

const FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'active-code', label: 'كود نشط' },
  { id: 'active', label: 'حاضرون' },
  { id: 'absent', label: 'غائبون +30 يوم' },
  { id: 'trial', label: 'تجريبي (يوم)' },
];

/**
 * المشرفون v2 — بحث · بطاقة موسّعة · واتساب · تمديد · ملاحظة
 */
export default function AdminUsersPanel({
  notify,
  codeRows = [],
  indexByCode = {},
  codeStatsById = {},
}) {
  const { rows, loading, reload } = useAdminSupervisors(codeRows, indexByCode, codeStatsById);
  const { admins: platformAdmins, loading: adminsLoading } = usePlatformAdmins();
  const [filter, setFilter] = useState('all');
  const [section, setSection] = useState('supervisors');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedUid, setExpandedUid] = useState(null);

  const filtered = useMemo(() => {
    const base = filterSupervisors(rows, filter);
    return searchSupervisors(base, search);
  }, [rows, filter, search]);

  const pagination = useMemo(
    () => paginateList(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  const absentCount = rows.filter((r) => r.absent).length;
  const activeCount = rows.filter((r) => !r.absent).length;

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleFilterChange = (id) => {
    setFilter(id);
    setPage(1);
  };

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
          <div className="admin-platform-admins">
            <div className="admin-platform-admins__head">
              <strong>👑 مشرفو المنصة</strong>
              <span className="admin-pulse-card__count">{platformAdmins.length}</span>
            </div>
            <p className="admin-platform-admins__hint">
              صلاحية مركز التحكم — مختلف عن «مشرف الغرفة» الذي يستضيف بكود اشتراك.
            </p>
            {adminsLoading ? (
              <p className="admin-pulse-empty">جاري التحميل…</p>
            ) : !platformAdmins.length ? (
              <p className="admin-pulse-empty">لا سجلات في admins/</p>
            ) : (
              <ul className="admin-platform-admins__list">
                {platformAdmins.map((a) => (
                  <li key={a.uid}>
                    <span className="admin-hub-badge admin-hub-badge--gold">منصة</span>
                    <strong>{a.displayName}</strong>
                    {a.email ? <span className="admin-platform-admins__email">{a.email}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="admin-pulse-stats-row">
            <div className="admin-pulse-stat admin-pulse-stat--gold">
              <div className="admin-pulse-stat__val">{rows.length}</div>
              <div className="admin-pulse-stat__lbl">مشرفو غرف</div>
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

          <div className="admin-users-search">
            <input
              className="inp"
              type="search"
              placeholder="بحث: اسم · بريد · كود · ملاحظة"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              aria-label="بحث المشرفين"
            />
          </div>

          <div className="admin-filter-chips">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`admin-pulse-chip${filter === f.id ? ' admin-pulse-chip--on' : ''}`}
                onClick={() => handleFilterChange(f.id)}
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
          ) : !filtered.length ? (
            <p className="admin-pulse-empty">لا يوجد مشرفون في هذا التصنيف.</p>
          ) : (
            <>
              <p className="admin-users-count">
                عرض {pagination.items.length} من {pagination.total} مشرف
              </p>
              <ul className="admin-pulse-list admin-supervisor-list">
                {pagination.items.map((row) => (
                  <AdminSupervisorCard
                    key={row.uid}
                    row={row}
                    expanded={expandedUid === row.uid}
                    onToggle={() => setExpandedUid((id) => (id === row.uid ? null : row.uid))}
                    notify={notify}
                    onUpdated={reload}
                  />
                ))}
              </ul>

              {pagination.totalPages > 1 ? (
                <div className="admin-users-pagination">
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    السابق
                  </button>
                  <span>
                    {pagination.page} / {pagination.totalPages}
                  </span>
                  <button
                    type="button"
                    className="btn btn--sm btn--ghost"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    التالي
                  </button>
                  <select
                    className="inp admin-users-page-size"
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    {SUPERVISOR_PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n} / صفحة
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
