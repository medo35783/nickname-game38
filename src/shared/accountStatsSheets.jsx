import { fmt, formatAccountDateShort, formatPlayTime, formatRelativeTime } from './accountFormatters';
import { GAME_META } from './AccountSubscriptionPanel';
import '../styles/account-subscription.css';

const SESSION_GAME_META = {
  titles: GAME_META.titles,
  fameeri: GAME_META.fameeri,
  hesbah: GAME_META.hesbah,
  sniper: GAME_META.hesbah,
};

function Num({ children }) {
  return (
    <span className="acct-num" lang="en">
      {children}
    </span>
  );
}

/**
 * حسب اللعبة — صفوف مضغوطة بألوان كل لعبة
 */
export function GamesSheetContent({ gameRows = [] }) {
  if (!gameRows.length) {
    return <p className="acct-sheet-empty">لا توجد جلسات مسجّلة بعد.</p>;
  }

  return (
    <div className="acct-sheet-games">
      {gameRows.map((row) => (
        <article key={row.key} className={`acct-sheet-game acct-sheet-game--${row.color}`}>
          <div className="acct-sheet-game__brand">
            <span className="acct-sheet-game__icon" aria-hidden>
              {row.icon}
            </span>
            <span className="acct-sheet-game__name">{row.label}</span>
          </div>
          <div className="acct-sheet-game__metrics">
            <div className="acct-sheet-game__metric">
              <span className="acct-sheet-game__metric-val">
                <Num>{fmt(row.played)}</Num>
              </span>
              <span className="acct-sheet-game__metric-lbl">لعب</span>
            </div>
            <span className="acct-sheet-game__sep" aria-hidden />
            <div className="acct-sheet-game__metric">
              <span className="acct-sheet-game__metric-val">
                <Num>{fmt(row.hosted)}</Num>
              </span>
              <span className="acct-sheet-game__metric-lbl">استضافة</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

/**
 * آخر الجلسات — خط زمني مضغوط
 */
export function RecentSheetContent({ recent = [] }) {
  if (!recent.length) {
    return <p className="acct-sheet-empty">لا توجد جلسات حديثة.</p>;
  }

  return (
    <div className="acct-sheet-sessions">
      {recent.map((session, i) => {
        const meta = SESSION_GAME_META[session.gameType] || {
          icon: '🎮',
          label: session.gameType || 'لعبة',
          color: 'blue',
        };
        const completed = Boolean(session.completed);
        const duration =
          session.durationMinutes > 0
            ? formatPlayTime(session.durationMinutes, { short: true })
            : '—';

        return (
          <article key={`${session.ts}-${i}`} className="acct-sheet-session">
            <div className="acct-sheet-session__rail" aria-hidden>
              <span className={`acct-sheet-session__dot${completed ? ' acct-sheet-session__dot--ok' : ''}`} />
              {i < recent.length - 1 ? <span className="acct-sheet-session__line" /> : null}
            </div>
            <div className="acct-sheet-session__card">
              <div className="acct-sheet-session__top">
                <div className="acct-sheet-session__game">
                  <span className="acct-sheet-session__game-icon">{meta.icon}</span>
                  <div>
                    <strong>{meta.label}</strong>
                    {session.ts ? (
                      <span className="acct-sheet-session__when">{formatRelativeTime(session.ts)}</span>
                    ) : null}
                  </div>
                </div>
                <span className={`acct-sheet-session__pill${completed ? ' acct-sheet-session__pill--ok' : ''}`}>
                  {completed ? 'مكتملة' : 'غير مكتملة'}
                </span>
              </div>
              <div className="acct-sheet-session__facts">
                <span className="acct-sheet-session__fact">
                  <small>جولات</small>
                  <strong>
                    <Num>{fmt(session.totalRounds)}</Num>
                  </strong>
                </span>
                <span className="acct-sheet-session__fact">
                  <small>لاعبون</small>
                  <strong>
                    <Num>{fmt(session.playerCount ?? 0)}</Num>
                  </strong>
                </span>
                <span className="acct-sheet-session__fact">
                  <small>المدة</small>
                  <strong>{duration}</strong>
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

/**
 * سجل التفعيلات — بطاقات بشريط حالة
 */
export function SubscriptionHistoryList({ historyList = [], activeCode }) {
  if (!historyList.length) {
    return <p className="acct-sheet-empty">لا يوجد سجل تفعيلات بعد.</p>;
  }

  const activeId = activeCode?.codeId;

  return (
    <div className="acct-sheet-codes">
      {historyList.map((row, idx) => {
        const isCurrent = activeId && row.codeId === activeId;
        const expired = row.expiresAt && Date.now() >= row.expiresAt;
        const stateClass = isCurrent ? 'current' : expired ? 'expired' : 'past';

        return (
          <article key={row.id} className={`acct-sheet-code acct-sheet-code--${stateClass}`}>
            <div className="acct-sheet-code__accent" aria-hidden />
            <div className="acct-sheet-code__body">
              <div className="acct-sheet-code__top">
                <strong className="acct-sheet-code__value">{row.code}</strong>
                <span className={`acct-sheet-code__badge acct-sheet-code__badge--${stateClass}`}>
                  {isCurrent ? 'الحالي' : expired ? 'منتهي' : `#${idx + 1}`}
                </span>
              </div>
              <div className="acct-sheet-code__grid">
                <div className="acct-sheet-code__cell">
                  <span className="acct-sheet-code__cell-lbl">المدة</span>
                  <span className="acct-sheet-code__cell-val">
                    <Num>{fmt(row.duration)}</Num> يوم
                  </span>
                </div>
                <div className="acct-sheet-code__cell">
                  <span className="acct-sheet-code__cell-lbl">ينتهي</span>
                  <span className="acct-sheet-code__cell-val">{formatAccountDateShort(row.expiresAt)}</span>
                </div>
                {row.activatedAt ? (
                  <div className="acct-sheet-code__cell acct-sheet-code__cell--wide">
                    <span className="acct-sheet-code__cell-lbl">فعّل</span>
                    <span className="acct-sheet-code__cell-val">{formatAccountDateShort(row.activatedAt)}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
