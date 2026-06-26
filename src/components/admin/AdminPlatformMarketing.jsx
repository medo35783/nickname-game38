import { useCallback, useState } from 'react';
import { aggregateMarketingMetrics, formatEngagementMinutes } from '../../core/marketingStatsHelpers';
import MarketingReportDialog from './MarketingReportDialog';

function statBox(label, value, colorVar) {
  return (
    <div className="admin-mkt-stat">
      <div className="admin-mkt-stat__val" style={{ color: colorVar }}>
        {value}
      </div>
      <div className="admin-mkt-stat__lbl">{label}</div>
    </div>
  );
}

function mergeByGameStats(a = {}, b = {}) {
  const keys = ['titles', 'fameeri', 'hesbah'];
  const out = { ...a };
  keys.forEach((k) => {
    const x = a[k] || {};
    const y = b[k] || {};
    if (!x.sessions && !y.sessions) return;
    out[k] = {
      sessions: (x.sessions || 0) + (y.sessions || 0),
      realSessions: (x.realSessions || 0) + (y.realSessions || 0),
      rounds: (x.rounds || 0) + (y.rounds || 0),
      participants: (x.participants || 0) + (y.participants || 0),
      engagementMinutes: (x.engagementMinutes || 0) + (y.engagementMinutes || 0),
      roundReach: (x.roundReach || 0) + (y.roundReach || 0),
      completed: (x.completed || 0) + (y.completed || 0),
      peakPlayers: Math.max(x.peakPlayers || 0, y.peakPlayers || 0),
    };
  });
  return out;
}

/**
 * ملخص الأرقام التسويقية + تقرير B2B
 */
export default function AdminPlatformMarketing({ notify, codeStatsById }) {
  const [reportDialog, setReportDialog] = useState(null);

  const statsList = Object.values(codeStatsById || {})
    .map((entry) => entry?.data)
    .filter(Boolean);
  const platformMarketing = aggregateMarketingMetrics(statsList);

  const openPlatformReport = useCallback(() => {
    const syntheticStats = statsList.length
      ? {
          ...statsList.reduce(
            (acc, s) => ({
              totalRealSessions: (acc.totalRealSessions || 0) + (Number(s.totalRealSessions) || 0),
              totalPlayerCount: (acc.totalPlayerCount || 0) + (Number(s.totalPlayerCount) || 0),
              totalRounds: (acc.totalRounds || 0) + (Number(s.totalRounds) || 0),
              totalEngagementMinutes:
                (acc.totalEngagementMinutes || 0) + (Number(s.totalEngagementMinutes) || 0),
              roundReach: (acc.roundReach || 0) + (Number(s.roundReach) || 0),
              completedGames: (acc.completedGames || 0) + (Number(s.completedGames) || 0),
              abandonedGames: (acc.abandonedGames || 0) + (Number(s.abandonedGames) || 0),
              totalDurationMinutes:
                (acc.totalDurationMinutes || 0) + (Number(s.totalDurationMinutes) || 0),
              peakPlayers: Math.max(acc.peakPlayers || 0, Number(s.peakPlayers) || 0),
              lastActiveAt: Math.max(acc.lastActiveAt || 0, Number(s.lastActiveAt) || 0),
              gamesPlayed: {
                titles: (acc.gamesPlayed?.titles || 0) + (Number(s.gamesPlayed?.titles) || 0),
                fameeri: (acc.gamesPlayed?.fameeri || 0) + (Number(s.gamesPlayed?.fameeri) || 0),
                hesbah: (acc.gamesPlayed?.hesbah || 0) + (Number(s.gamesPlayed?.hesbah) || 0),
              },
              byGame: mergeByGameStats(acc.byGame, s.byGame),
              recentSessions: [
                ...(acc.recentSessions || []),
                ...(Array.isArray(s.recentSessions) ? s.recentSessions : []),
              ]
                .sort((a, b) => (a.ts || 0) - (b.ts || 0))
                .slice(-20),
              uniqueParticipantLabels: [
                ...new Set([
                  ...(acc.uniqueParticipantLabels || []),
                  ...(Array.isArray(s.uniqueParticipantLabels) ? s.uniqueParticipantLabels : []),
                ]),
              ].slice(0, 120),
            }),
            {}
          ),
        }
      : null;

    setReportDialog({
      reportScope: 'platform',
      stats: syntheticStats,
      platformAggregate: platformMarketing,
    });
  }, [statsList, platformMarketing]);

  const handleCopyPitch = async () => {
    const lines = [
      '📊 تقرير تفاعل المنصة — لعيب زون',
      '',
      '🏢 B2B:',
      `• ${platformMarketing.totalRealSessions} جلسة لعب حقيقية`,
      `• ${platformMarketing.totalParticipants} مشاركة تراكمية`,
      `• ذروة حضور: ${platformMarketing.peakPlayers} متسابق`,
      '',
      '🎯 رعاية الجولات:',
      `• ${platformMarketing.totalRounds} جولة · ${platformMarketing.roundReach} ظهور`,
      '',
      '🎁 جوائز:',
      `• ${platformMarketing.couponReadySessions} جلسة مؤهلة`,
      `• ${Math.round(platformMarketing.totalEngagementMinutes)} دقيقة تفاعل`,
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      notify?.('تم نسخ نص العرض', 'success');
    } catch {
      notify?.('تعذّر النسخ', 'error');
    }
  };

  return (
    <div className="admin-mkt">
      <p className="admin-mkt-lead">
        أرقام مجمّعة من {platformMarketing.codesWithActivity || 0} كود نشط — للرعاة والمؤسسات
      </p>
      <div className="admin-mkt-grid">
        {statBox('مشاركات', platformMarketing.totalParticipants, 'var(--brand-blue)')}
        {statBox('ذروة حضور', platformMarketing.peakPlayers, 'var(--purple)')}
        {statBox('جولات رعاية', platformMarketing.totalRounds, 'var(--fameeri-primary)')}
        {statBox('ظهور رعاية', platformMarketing.roundReach, 'var(--green)')}
        {statBox(
          'تفاعل',
          formatEngagementMinutes(platformMarketing.totalEngagementMinutes, { short: true }),
          'var(--blue)'
        )}
        {statBox('جلسات جوائز', platformMarketing.couponReadySessions, 'var(--brand-orange)')}
      </div>
      <div className="admin-mkt-actions">
        <button type="button" className="btn bg" onClick={openPlatformReport}>
          📄 تقرير B2B رسمي (PDF)
        </button>
        <button type="button" className="btn bgh" onClick={handleCopyPitch}>
          📋 نسخ نص العرض
        </button>
      </div>

      <MarketingReportDialog
        open={Boolean(reportDialog)}
        onClose={() => setReportDialog(null)}
        stats={reportDialog?.stats}
        reportScope={reportDialog?.reportScope || 'platform'}
        platformAggregate={reportDialog?.platformAggregate}
        notify={notify}
      />
    </div>
  );
}
