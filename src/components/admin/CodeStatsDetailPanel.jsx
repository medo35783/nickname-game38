import { useState } from 'react';
import { deriveMarketingMetrics, buildMarketingPitch, formatEngagementMinutes } from '../../core/marketingStatsHelpers';

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
  if (gameType === 'hesbah') return '🎯';
  return '❓';
}

function gameTypeLabel(gameType) {
  if (gameType === 'fameeri') return 'القميري';
  if (gameType === 'titles') return 'الألقاب';
  if (gameType === 'hesbah') return 'الحسبة';
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
export default function CodeStatsDetailPanel({ loading, stats, codeLabel = null, onOpenReport }) {
  const [pitchCopied, setPitchCopied] = useState(false);

  if (loading) return <StatsSkeleton />;

  if (!stats || typeof stats !== 'object') {
    return (
      <div style={{ padding: '12px 8px', fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
        لا توجد إحصائيات بعد — ابدأ جلسة لتظهر البيانات
      </div>
    );
  }

  const m = deriveMarketingMetrics(stats);
  const totalReal = m.totalRealSessions;
  const totalDuration = Number(stats.totalDurationMinutes) || 0;
  const completed = m.completedGames;
  const avgDuration =
    totalReal > 0 ? Math.round((totalDuration / totalReal) * 10) / 10 : 0;
  const avgPlayers = m.avgPlayers;
  const titlesPlayed = m.gamesPlayed.titles;
  const fameeriPlayed = m.gamesPlayed.fameeri;
  const hesbahPlayed = m.gamesPlayed.hesbah;
  const completionRate = m.completionRate;
  const barColor =
    completionRate > 70 ? 'var(--green)' : completionRate >= 40 ? 'var(--gold)' : 'var(--red)';

  const recent = Array.isArray(stats.recentSessions) ? stats.recentSessions.slice(-5).reverse() : [];
  const lastActiveFormatted = formatLastActive(stats.lastActiveAt);

  const handleCopyPitch = async () => {
    const text = buildMarketingPitch(stats, { codeLabel });
    try {
      await navigator.clipboard.writeText(text);
      setPitchCopied(true);
      setTimeout(() => setPitchCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div style={{ padding: '8px 4px 4px' }}>
      <div
        style={{
          marginBottom: 12,
          padding: '12px 10px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(201,127,26,.12), rgba(37,111,168,.08))',
          border: '1px solid rgba(201,127,26,.22)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: 'var(--gold)' }}>📣 أرقام تسويقية</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {onOpenReport && (
              <button
                type="button"
                className="btn bgh bxs"
                style={{ width: 'auto', fontSize: 10, padding: '4px 10px', borderColor: 'var(--gold)', color: 'var(--gold)' }}
                onClick={onOpenReport}
              >
                📄 تقرير رسمي PDF
              </button>
            )}
            <button
              type="button"
              className="btn bgh bxs"
              style={{ width: 'auto', fontSize: 10, padding: '4px 10px' }}
              onClick={handleCopyPitch}
            >
              {pitchCopied ? '✅ تم النسخ' : '📋 نسخ نص العرض'}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {detailStatBox('مشاركات المتسابقين', m.totalParticipants, 'var(--gold)')}
          {detailStatBox('ذروة الحضور', m.peakPlayers, 'var(--purple)')}
          {detailStatBox('ظهور الرعاية', m.roundReach, 'var(--fameeri-primary)')}
          {detailStatBox('دقائق التفاعل', formatEngagementMinutes(m.totalEngagementMinutes, { short: true }), 'var(--blue)')}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5, fontWeight: 600 }}>
          B2B: {totalReal} جلسة · متوسط {avgPlayers} متسابق —
          رعاية: {m.totalRounds} جولة ({m.roundReach} ظهور) —
          جوائز: {m.couponReadySessions} جلسة مؤهلة
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
        {detailStatBox('جلسات حقيقية', totalReal, 'var(--gold)')}
        {detailStatBox('جولات مكتملة', m.totalRounds, 'var(--fameeri-primary)')}
        {detailStatBox('ألعاب مكتملة', completed, 'var(--green)')}
        {detailStatBox('تُركت مبكراً', Number(stats.abandonedGames) || 0, 'var(--red)')}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {detailStatBox('متوسط المدة', totalReal > 0 ? `${avgDuration} دقيقة` : '—', 'var(--blue)')}
        {detailStatBox('متوسط اللاعبين', totalReal > 0 ? avgPlayers : '—', 'var(--purple)')}
        {detailStatBox(
          'توزيع الألعاب',
          `ألقاب ${titlesPlayed} · قميري ${fameeriPlayed} · حسبة ${hesbahPlayed}`,
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
                {['اللعبة', 'الجولات', 'متسابقين', 'ظهور رعاية', 'تفاعل', 'التاريخ'].map((h) => (
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
                  <td style={{ padding: '7px 5px' }}>{s.playerCount ?? 0}</td>
                  <td style={{ padding: '7px 5px' }}>
                    {s.roundReach ?? (Number(s.totalRounds) || 0) * (Number(s.playerCount) || 0)}
                  </td>
                  <td style={{ padding: '7px 5px' }}>
                    {formatEngagementMinutes(
                      s.engagementMinutes ?? (Number(s.playerCount) || 0) * (Number(s.durationMinutes) || 0)
                    )}
                    {s.completed ? '' : ' · 🚪'}
                  </td>
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
