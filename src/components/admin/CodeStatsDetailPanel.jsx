function formatRelativeTime(ts) {
  if (!ts) return '—';
  const diff = Date.now() - Number(ts);
  if (diff < 60_000) return 'الآن';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `منذ ${days} يوم`;
}

function formatLastActive(ts) {
  if (!ts) return null;
  try {
    return new Date(ts).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return null;
  }
}

function gameTypeIcon(gameType) {
  if (gameType === 'fameeri') return '🦅';
  if (gameType === 'titles') return '🎭';
  return '❓';
}

function gameTypeLabel(gameType) {
  if (gameType === 'fameeri') return 'القميري';
  if (gameType === 'titles') return 'الألقاب';
  return gameType || '—';
}

function detailStatBox(label, value, colorVar) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 88,
        padding: '10px 8px',
        borderRadius: 10,
        background: 'rgba(0,0,0,.2)',
        border: '1px solid rgba(255,255,255,.06)',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 900, color: colorVar, fontFamily: 'Cairo, sans-serif' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 4, fontWeight: 700, lineHeight: 1.35 }}>{label}</div>
    </div>
  );
}

function StatsSkeleton() {
  const pulse = {
    background: 'linear-gradient(90deg, rgba(255,255,255,.04) 25%, rgba(255,255,255,.1) 50%, rgba(255,255,255,.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'codeStatsShimmer 1.2s ease-in-out infinite',
    borderRadius: 8,
    height: 52,
  };
  return (
    <div style={{ padding: '4px 0' }}>
      <style>{`@keyframes codeStatsShimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }`}</style>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ ...pulse, flex: 1, minWidth: 88 }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ ...pulse, flex: 1, minWidth: 100 }} />
        ))}
      </div>
      <div style={{ ...pulse, height: 14, width: '40%', marginBottom: 10 }} />
      <div style={{ ...pulse, height: 80, width: '100%' }} />
    </div>
  );
}

/**
 * لوحة إحصائيات جلسات كود واحد (تُحمّل عند الطلب).
 */
export default function CodeStatsDetailPanel({ loading, stats }) {
  if (loading) return <StatsSkeleton />;

  if (!stats || typeof stats !== 'object') {
    return (
      <div style={{ padding: '12px 8px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
        لا توجد إحصائيات بعد — ابدأ جلسة لتظهر البيانات
      </div>
    );
  }

  const totalReal = Number(stats.totalRealSessions) || 0;
  const totalDuration = Number(stats.totalDurationMinutes) || 0;
  const totalPlayers = Number(stats.totalPlayerCount) || 0;
  const completed = Number(stats.completedGames) || 0;
  const avgDuration =
    totalReal > 0 ? Math.round((totalDuration / totalReal) * 10) / 10 : 0;
  const avgPlayers =
    totalReal > 0 ? Math.round((totalPlayers / totalReal) * 10) / 10 : Number(stats.avgPlayers) || 0;
  const titlesPlayed = Number(stats.gamesPlayed?.titles) || 0;
  const fameeriPlayed = Number(stats.gamesPlayed?.fameeri) || 0;
  const completionRate = totalReal > 0 ? Math.round((completed / totalReal) * 100) : 0;
  const barColor =
    completionRate > 70 ? 'var(--green)' : completionRate >= 40 ? 'var(--gold)' : 'var(--red)';

  const recent = Array.isArray(stats.recentSessions) ? stats.recentSessions.slice(-5).reverse() : [];
  const lastActiveFormatted = formatLastActive(stats.lastActiveAt);

  return (
    <div style={{ padding: '8px 4px 4px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {detailStatBox('جلسات حقيقية', totalReal, 'var(--gold)')}
        {detailStatBox('جولات مكتملة', Number(stats.totalRounds) || 0, 'var(--fameeri-primary)')}
        {detailStatBox('ألعاب مكتملة', completed, 'var(--green)')}
        {detailStatBox('تُركت مبكراً', Number(stats.abandonedGames) || 0, 'var(--red)')}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {detailStatBox('متوسط المدة', totalReal > 0 ? `${avgDuration} دقيقة` : '—', 'var(--blue)')}
        {detailStatBox('متوسط اللاعبين', totalReal > 0 ? avgPlayers : '—', 'var(--purple)')}
        {detailStatBox(
          'توزيع الألعاب',
          `الألقاب: ${titlesPlayed} | القميري: ${fameeriPlayed}`,
          'var(--text)'
        )}
      </div>

      <div style={{ fontSize: 12, marginBottom: 10, fontWeight: 700 }}>
        {lastActiveFormatted ? (
          <>
            <span style={{ color: 'var(--muted)' }}>آخر نشاط: </span>
            <span style={{ color: 'var(--text)' }}>{lastActiveFormatted}</span>
            <span style={{ color: 'var(--dim)', marginInlineStart: 8, fontSize: 11 }}>
              ({formatRelativeTime(stats.lastActiveAt)})
            </span>
          </>
        ) : (
          <span style={{ color: 'var(--muted)' }}>لم يُستخدم بعد</span>
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: 'var(--muted)',
            marginBottom: 6,
          }}
        >
          <span>معدل إكمال الجلسات: {completionRate}%</span>
        </div>
        <div
          style={{
            height: 8,
            borderRadius: 999,
            background: 'rgba(255,255,255,.08)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${Math.min(100, completionRate)}%`,
              height: '100%',
              borderRadius: 999,
              background: barColor,
              transition: 'width .35s ease',
            }}
          />
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--muted)', marginBottom: 6 }}>آخر الجلسات</div>
      {recent.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--dim)', textAlign: 'center', padding: 8 }}>لا جلسات مسجّلة بعد</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ color: 'var(--muted)', textAlign: 'right' }}>
                {['اللعبة', 'الجولات', 'مكتملة؟', 'اللاعبين', 'المدة', 'التاريخ'].map((h) => (
                  <th
                    key={h}
                    style={{ padding: '6px 5px', borderBottom: '1px solid rgba(255,255,255,.08)', fontWeight: 700 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map((s, i) => (
                <tr key={`${s.ts}-${i}`} style={{ borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <td style={{ padding: '7px 5px' }}>
                    {gameTypeIcon(s.gameType)} {gameTypeLabel(s.gameType)}
                  </td>
                  <td style={{ padding: '7px 5px', fontWeight: 800 }}>{s.totalRounds ?? 0}</td>
                  <td style={{ padding: '7px 5px' }}>{s.completed ? '✅' : '🚪 غادر مبكراً'}</td>
                  <td style={{ padding: '7px 5px' }}>{s.playerCount ?? 0}</td>
                  <td style={{ padding: '7px 5px' }}>{Math.round(Number(s.durationMinutes) || 0)} د</td>
                  <td style={{ padding: '7px 5px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                    {formatRelativeTime(s.ts)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
