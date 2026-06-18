import { useEffect, useState } from 'react';
import Av from './Av';
import { getArenaWeekId, subscribeWeeklyHallOfFame } from '../core/arenaLeaderboard';
import '../styles/arena-badge.css';

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * قاعة المجد — أفضل 10 لاعبين هذا الأسبوع
 */
export default function ArenaHallOfFame({ onGoAccount, isGuest = true }) {
  const [rows, setRows] = useState([]);
  const [ready, setReady] = useState(false);
  const weekId = getArenaWeekId();

  useEffect(() => {
    setReady(false);
    const unsub = subscribeWeeklyHallOfFame((list) => {
      setRows(list);
      setReady(true);
    });
    return () => unsub();
  }, []);

  return (
    <section className="arena-hof" aria-label="قاعة المجد">
      <div className="arena-hof__head">
        <div className="arena-hof__title">🏆 قاعة المجد</div>
        <div className="arena-hof__week">هذا الأسبوع · {weekId}</div>
      </div>

      {!ready ? (
        <div className="arena-hof__empty">جاري التحميل…</div>
      ) : rows.length === 0 ? (
        <div className="arena-hof__empty">
          لا متصدرين بعد — سجّل دخولك وتنافس لتظهر هنا!
          {isGuest && typeof onGoAccount === 'function' ? (
            <div style={{ marginTop: 10 }}>
              <button type="button" className="btn bg bsm" style={{ width: 'auto' }} onClick={onGoAccount}>
                👤 سجّل دخول
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        rows.map((row, idx) => {
          const rank = idx + 1;
          const player = {
            arenaIcon: row.avatarIcon,
            arenaFrame: row.avatarFrame,
            arenaName: row.displayName,
          };
          return (
            <div key={row.uid || idx} className="arena-hof__row">
              <span className={`arena-hof__rank arena-hof__rank--${rank <= 3 ? rank : ''}`}>
                {rank <= 3 ? MEDALS[idx] : rank}
              </span>
              <Av p={player} sz={36} />
              <div className="arena-hof__info">
                <div className="arena-hof__name">{row.displayName || '—'}</div>
              </div>
              <span className="arena-hof__pts">+{row.weeklyPoints || 0}</span>
            </div>
          );
        })
      )}
    </section>
  );
}
