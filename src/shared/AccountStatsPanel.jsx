import { useMemo, useState } from 'react';
import ArenaBadgeSheet from './ArenaBadgeSheet';
import { fmt, formatPlayTime } from './accountFormatters';
import { GamesSheetContent, RecentSheetContent, SubscriptionHistoryList } from './accountStatsSheets';
import { GAME_META } from './AccountSubscriptionPanel';
import '../styles/account-subscription.css';

function Num({ children }) {
  return (
    <span className="acct-num" lang="en">
      {children}
    </span>
  );
}

function StatTile({ icon, value, label, accent = 'blue' }) {
  return (
    <div className={`acct-stat-tile acct-stat-tile--${accent}`}>
      <span className="acct-stat-tile__icon">{icon}</span>
      <span className="acct-stat-tile__val">
        <Num>{value}</Num>
      </span>
      <span className="acct-stat-tile__lbl">{label}</span>
    </div>
  );
}

function useStatsData(profile, userStats, gamesHosted) {
  return useMemo(() => {
    const gp = userStats?.gamesPlayed || profile?.gamesByType || {};
    const hostedByType = profile?.hostedByType || {};
    const wins = Number(profile?.wins) || 0;
    const podiums = Number(profile?.podiums) || 0;
    const gamesPlayedProfile = Number(profile?.gamesPlayed) || 0;
    const totalGames =
      (gp.titles || 0) + (gp.fameeri || 0) + (gp.hesbah || 0) ||
      Number(userStats?.completedGames) ||
      gamesPlayedProfile ||
      0;
    const totalRounds = Number(userStats?.totalRounds) || Number(profile?.totalRoundsHosted) || 0;
    const totalPlayers = Number(userStats?.totalPlayerCount) || Number(profile?.totalPlayersHosted) || 0;
    const avgPlayers =
      userStats?.avgPlayers > 0
        ? Math.round(userStats.avgPlayers * 10) / 10
        : totalPlayers && gamesHosted
          ? Math.round((totalPlayers / gamesHosted) * 10) / 10
          : 0;
    const playMinutes = Number(userStats?.totalDurationMinutes) || 0;
    const recent = Array.isArray(userStats?.recentSessions)
      ? [...userStats.recentSessions].reverse()
      : [];
    const gameRows = ['titles', 'fameeri', 'hesbah']
      .map((key) => {
        const played = gp[key] || 0;
        const hosted = hostedByType[key] || 0;
        return { key, played, hosted, ...GAME_META[key] };
      })
      .filter((row) => row.played > 0 || row.hosted > 0);

    return {
      wins,
      podiums,
      totalGames,
      totalRounds,
      totalPlayers,
      avgPlayers,
      playMinutes,
      recent,
      gameRows,
      hasAny: totalGames > 0 || gamesHosted > 0 || wins > 0 || totalRounds > 0,
    };
  }, [profile, userStats, gamesHosted]);
}

const SHEET_BODY = 'arena-sheet__body--account';

/**
 * ملخص إحصائيات اللعب — التفاصيل في نوافذ عند النقر
 */
export default function AccountStatsPanel({
  profile,
  userStats,
  gamesHosted,
  historyList = [],
  activeCode,
}) {
  const data = useStatsData(profile, userStats, gamesHosted);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const chips = [
    data.gameRows.length > 0
      ? { id: 'games', icon: '🎮', label: 'حسب اللعبة', sub: `${fmt(data.gameRows.length)} ألعاب`, onClick: () => setGamesOpen(true) }
      : null,
    data.recent.length > 0
      ? { id: 'recent', icon: '📋', label: 'آخر الجلسات', sub: `${fmt(data.recent.length)} جلسة`, onClick: () => setRecentOpen(true) }
      : null,
    historyList.length > 0
      ? { id: 'history', icon: '📜', label: 'سجل التفعيلات', sub: `${fmt(historyList.length)} سجل`, onClick: () => setHistoryOpen(true) }
      : null,
  ].filter(Boolean);

  if (!data.hasAny && !historyList.length) {
    return (
      <section className="acct-stats acct-stats--empty">
        <div className="acct-stats__empty-icon">📊</div>
        <h3 className="acct-stats__empty-title">إحصائياتك تبدأ من أول جلسة</h3>
        <p className="acct-stats__empty-sub">العب أو استضف — ستظهر هنا ملخص نشاطك.</p>
      </section>
    );
  }

  return (
    <>
      <section className="acct-stats acct-stats--compact-summary">
        <div className="acct-stats__head">
          <h3 className="acct-stats__title">إحصائيات اللعب</h3>
          <span className="acct-stats__live">مباشر</span>
        </div>

        {data.hasAny ? (
          <>
            <div className="acct-stats__hero acct-stats__hero--3">
              <StatTile icon="🎮" value={fmt(data.totalGames)} label="جلسات لعب" accent="blue" />
              <StatTile icon="🎛️" value={fmt(gamesHosted)} label="استضافة" accent="purple" />
              <StatTile icon="👑" value={fmt(data.wins)} label="مراكز أولى" accent="green" />
            </div>

            {data.playMinutes > 0 ? (
              <div className="acct-stats__time">
                <span className="acct-stats__time-icon">⏱️</span>
                <div className="acct-stats__time-body">
                  <span className="acct-stats__time-lbl">وقت اللعب الإجمالي</span>
                  <strong className="acct-stats__time-val">{formatPlayTime(data.playMinutes)}</strong>
                </div>
              </div>
            ) : null}

            <div className="acct-stats__chips">
              {data.totalRounds > 0 ? (
                <span className="acct-stats__chip">
                  🔄 <Num>{fmt(data.totalRounds)}</Num> جولة
                </span>
              ) : null}
              {data.totalPlayers > 0 ? (
                <span className="acct-stats__chip">
                  👥 <Num>{fmt(data.totalPlayers)}</Num> لاعب
                </span>
              ) : null}
              {data.podiums > 0 ? (
                <span className="acct-stats__chip">
                  🥈 <Num>{fmt(data.podiums)}</Num> منصة
                </span>
              ) : null}
              {data.avgPlayers > 0 ? (
                <span className="acct-stats__chip">
                  📊 <Num>{fmt(data.avgPlayers)}</Num> متوسط/جلسة
                </span>
              ) : null}
            </div>
          </>
        ) : null}

        {chips.length > 0 ? (
          <div className="acct-stats-explore">
            {chips.map((chip) => (
              <button key={chip.id} type="button" className="acct-stats-explore__btn" onClick={chip.onClick}>
                <span className="acct-stats-explore__icon">{chip.icon}</span>
                <span className="acct-stats-explore__body">
                  <strong>{chip.label}</strong>
                  <small>{chip.sub}</small>
                </span>
                <span className="acct-stats-explore__chev">‹</span>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <ArenaBadgeSheet
        open={gamesOpen}
        onClose={() => setGamesOpen(false)}
        title="حسب اللعبة"
        subtitle="لعب واستضافة لكل لعبة"
        icon="🎮"
        placement="center"
        bodyClassName={SHEET_BODY}
        footer={<button type="button" className="btn bo" onClick={() => setGamesOpen(false)}>إغلاق</button>}
      >
        <GamesSheetContent gameRows={data.gameRows} />
      </ArenaBadgeSheet>

      <ArenaBadgeSheet
        open={recentOpen}
        onClose={() => setRecentOpen(false)}
        title="آخر الجلسات"
        subtitle={`${fmt(data.recent.length)} جلسة مسجّلة`}
        icon="📋"
        bodyClassName={SHEET_BODY}
        footer={<button type="button" className="btn bo" onClick={() => setRecentOpen(false)}>إغلاق</button>}
      >
        <RecentSheetContent recent={data.recent} />
      </ArenaBadgeSheet>

      <ArenaBadgeSheet
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="سجل التفعيلات"
        subtitle={`${fmt(historyList.length)} كود سابق`}
        icon="📜"
        placement="center"
        bodyClassName={SHEET_BODY}
        footer={<button type="button" className="btn bo" onClick={() => setHistoryOpen(false)}>إغلاق</button>}
      >
        <SubscriptionHistoryList historyList={historyList} activeCode={activeCode} />
      </ArenaBadgeSheet>
    </>
  );
}
