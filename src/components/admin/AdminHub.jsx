import { useState } from 'react';
import GameTopNav from '../../shared/GameTopNav';
import { useAdminCodesSnapshot } from '../../hooks/useAdminCodesSnapshot';
import AdminPulsePanel from './AdminPulsePanel';
import AdminExpiringCodes from './AdminExpiringCodes';
import AdminCodesPanel from './AdminCodesPanel';
import AdminPlatformMarketing from './AdminPlatformMarketing';
import AdminPrizePanel from './AdminPrizePanel';
import QBankManager from '../../question-bank/QBankManager';
import AdminContentPanel from './AdminContentPanel';
import AdminUsersPanel from './AdminUsersPanel';
import AdminHealthPanel from './AdminHealthPanel';
import AdminAlertsStrip from './AdminAlertsStrip';
import AdminOverviewKpi from './AdminOverviewKpi';
import AdminQuickActions from './AdminQuickActions';
import { useAdminAlerts } from '../../hooks/useAdminAlerts';
import { ADMIN_PAGES, getAdminPageMeta } from './adminHubPages';
import '../../styles/admin-hub.css';

function SoonPlaceholder({ icon, text }) {
  return (
    <div className="admin-hub-soon">
      <span className="admin-hub-soon__icon" aria-hidden>
        {icon}
      </span>
      <p>{text}</p>
    </div>
  );
}

function AdminPageHeader({ pageId }) {
  const meta = getAdminPageMeta(pageId);
  const subtitles = {
    overview: 'النبض اللحظي — غرف نشطة وجلسات اليوم',
    codes: 'توليد · قائمة · إحصائيات · ملاحظات · تجديد',
    marketing: 'ملخص المنصة · تقرير B2B · لوحة الجوائز',
    qbank: 'إدارة الأسئلة المركزية للألعاب',
    content: 'أخبار · رعاة الجولات · إعلانات اللوبي',
    users: 'المشرفون · بحث · تجديد · الاقتراحات',
    health: 'صحة المنصة · غرف · أمان · إعدادات',
  };

  return (
    <header className="admin-page-head">
      <div className="admin-page-head__icon" aria-hidden>
        {meta.icon}
      </div>
      <div>
        <h2 className="admin-page-head__title">{meta.label}</h2>
        <p className="admin-page-head__sub">{subtitles[pageId] || ''}</p>
      </div>
    </header>
  );
}

/**
 * مركز التحكم — صفحات مستقلة تحت مظلة واحدة
 */
export default function AdminHub({ notify, onBack }) {
  const snapshot = useAdminCodesSnapshot();
  const { alerts } = useAdminAlerts({
    codeRows: snapshot.rows,
    indexByCode: snapshot.indexByCode,
    codeStatsById: snapshot.codeStatsById,
  });
  const [page, setPage] = useState('overview');
  const isPfccAdmin =
    typeof localStorage !== 'undefined' && localStorage.getItem('pfcc_is_admin') === 'true';

  return (
    <div className="scr admin-hub">
      <GameTopNav onBack={onBack} variant="arena" />

      <header className="admin-hub-hero admin-hub-hero--compact">
        <div className="admin-hub-hero__icon" aria-hidden>
          👑
        </div>
        <div>
          <h1 className="admin-hub-hero__title">مركز التحكم</h1>
          <p className="admin-hub-hero__sub">صفحة لكل مهمة — بدون ما تطول الشاشة</p>
        </div>
      </header>

      <nav className="admin-hub-nav" aria-label="أقسام التحكم">
        {ADMIN_PAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`admin-hub-nav__btn ${page === item.id ? 'is-active' : ''}`}
            onClick={() => setPage(item.id)}
            aria-current={page === item.id ? 'page' : undefined}
          >
            <span className="admin-hub-nav__icon" aria-hidden>
              {item.icon}
            </span>
            <span className="admin-hub-nav__label">{item.short}</span>
          </button>
        ))}
      </nav>

      <main className="admin-hub-page">
        {page !== 'overview' && page !== 'codes' && page !== 'qbank' && (
          <AdminPageHeader pageId={page} />
        )}

        {page === 'overview' && (
          <>
            <AdminPageHeader pageId="overview" />
            <AdminAlertsStrip alerts={alerts} onNavigate={setPage} />
            <AdminOverviewKpi
              rows={snapshot.rows}
              indexByCode={snapshot.indexByCode}
              codeStatsById={snapshot.codeStatsById}
            />
            <AdminQuickActions onNavigate={setPage} />
            <AdminPulsePanel codeStatsById={snapshot.codeStatsById} />
          </>
        )}

        {page === 'codes' && (
          <>
            <AdminExpiringCodes
              notify={notify}
              codeRows={snapshot.rows}
              indexByCode={snapshot.indexByCode}
            />
            <AdminCodesPanel notify={notify} layout="page" sharedSnapshot={snapshot} />
          </>
        )}

        {page === 'marketing' && (
          <>
            <AdminPlatformMarketing notify={notify} codeStatsById={snapshot.codeStatsById} />
            <AdminPrizePanel
              notify={notify}
              codeRows={snapshot.rows}
              codeStatsById={snapshot.codeStatsById}
            />
          </>
        )}

        {page === 'qbank' &&
          (isPfccAdmin ? (
            <QBankManager notify={notify} layout="page" />
          ) : (
            <SoonPlaceholder icon="📚" text="بنك الأسئلة يتطلب صلاحية مشرف المنصة." />
          ))}

        {page === 'content' && (
          <AdminContentPanel
            notify={notify}
            codeRows={snapshot.rows}
            codeStatsById={snapshot.codeStatsById}
          />
        )}

        {page === 'users' && (
          <AdminUsersPanel
            notify={notify}
            codeRows={snapshot.rows}
            indexByCode={snapshot.indexByCode}
            codeStatsById={snapshot.codeStatsById}
          />
        )}

        {page === 'health' && <AdminHealthPanel notify={notify} />}
      </main>
    </div>
  );
}
