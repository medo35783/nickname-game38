import { useState } from 'react';
import AdminNewsManager from './AdminNewsManager';
import AdminSponsorsManager from './AdminSponsorsManager';
import AdminLobbyAdsManager from './AdminLobbyAdsManager';

const TABS = [
  { id: 'news', label: 'الأخبار', icon: '📰' },
  { id: 'sponsors', label: 'رعاة الجولات', icon: '🤝' },
  { id: 'lobby', label: 'إعلانات اللوبي', icon: '📢' },
];

/**
 * المرحلة 3 — المحتوى والتسويق
 */
export default function AdminContentPanel({ notify, codeRows = [], codeStatsById = {} }) {
  const [tab, setTab] = useState('news');

  return (
    <div className="admin-content-panel">
      <div className="admin-subtabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`admin-subtab${tab === t.id ? ' admin-subtab--on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            <span aria-hidden>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'news' && <AdminNewsManager notify={notify} />}

      {tab === 'sponsors' && (
        <AdminSponsorsManager
          notify={notify}
          codeRows={codeRows}
          codeStatsById={codeStatsById}
        />
      )}

      {tab === 'lobby' && <AdminLobbyAdsManager notify={notify} />}
    </div>
  );
}
