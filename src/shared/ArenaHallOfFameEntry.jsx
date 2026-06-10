import { useEffect, useState } from 'react';
import { getArenaWeekId, subscribeWeeklyHallOfFame } from '../core/arenaLeaderboard';
import ArenaHallOfFame from './ArenaHallOfFame';
import '../styles/arena-badge.css';

/**
 * مدخل مضغوط لقاعة المجد — يفتح نافذة كاملة عند الضغط
 */
export default function ArenaHallOfFameEntry({ onGoAccount, isGuest = true }) {
  const [open, setOpen] = useState(false);
  const [topName, setTopName] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = subscribeWeeklyHallOfFame((rows) => {
      setTopName(rows[0]?.displayName || '');
      setReady(true);
    }, 1);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const hint = !ready
    ? 'جاري التحميل…'
    : topName
      ? `المتصدر: ${topName}`
      : 'افتح وشاهد أفضل اللاعبين';

  return (
    <>
      <button type="button" className="arena-hof-entry" onClick={() => setOpen(true)}>
        <span className="arena-hof-entry__icon" aria-hidden>
          🏆
        </span>
        <span className="arena-hof-entry__body">
          <span className="arena-hof-entry__title">قاعة المجد</span>
          <span className="arena-hof-entry__sub">{hint}</span>
        </span>
        <span className="arena-hof-entry__chevron" aria-hidden>
          ‹
        </span>
      </button>

      {open ? (
        <div className="arena-hof-modal" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="arena-hof-modal__panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="btn bgh bxs arena-hof-modal__close"
              aria-label="إغلاق"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
            <ArenaHallOfFame onGoAccount={onGoAccount} isGuest={isGuest} />
            <div className="arena-hof-modal__week">{getArenaWeekId()}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
