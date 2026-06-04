import { useState } from 'react';
import SniperLeaderboardList, { sortedSniperPlayers } from './SniperLeaderboardList';

/** ترتيب مضغوط للمشرف — يظهر طوال الجولة */
export default function SniperAdminLeaderboard({ players }) {
  const [expanded, setExpanded] = useState(false);
  const list = sortedSniperPlayers(players);
  const top = list.slice(0, 5);

  if (!list.length) {
    return (
      <section className="sniper-admin-lb" aria-label="الترتيب">
        <div className="sniper-admin-lb__empty">لا يوجد لاعبون بعد</div>
      </section>
    );
  }

  return (
    <section className="sniper-admin-lb" aria-label="الترتيب الحالي">
      <div className="sniper-admin-lb__head">
        <h3 className="sniper-admin-lb__title">🏆 الترتيب</h3>
        <span className="sniper-admin-lb__count">{list.length} لاعب</span>
      </div>
      {expanded ? (
        <div className="sniper-admin-lb__full">
          <SniperLeaderboardList players={players} highlightTop={3} />
        </div>
      ) : (
        <div className="sniper-admin-lb__list">
          {top.map((p, i) => (
            <div
              key={p.id}
              className={`sniper-admin-lb__row ${i < 3 ? `sniper-admin-lb__row--top${i + 1}` : ''}`}
            >
              <span className="sniper-admin-lb__rank">{i + 1}</span>
              <span className="sniper-admin-lb__name">
                {p.name}
                {p.isOnFire && ' 🔥'}
              </span>
              <span className="sniper-admin-lb__pts">{p.totalScore || 0}</span>
            </div>
          ))}
        </div>
      )}
      {list.length > 5 && (
        <button
          type="button"
          className="sniper-admin-lb__more"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '▲ عرض مختصر' : `▼ عرض الكل (${list.length})`}
        </button>
      )}
    </section>
  );
}
