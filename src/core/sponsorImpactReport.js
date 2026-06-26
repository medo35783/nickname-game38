/**
 * تقرير راعٍ مستقل — PDF بكل جلسات وظهورات راعٍ محدد
 */
import { openMarketingImpactReport } from './marketingImpactReport';

function gameKey(type) {
  if (type === 'sniper') return 'hesbah';
  return type;
}

/** يبني stats مصفّاة لراعٍ واحد من أكواد المنصة */
export function buildSponsorFilteredStats(codeRows = [], codeStatsById = {}, sponsorId) {
  if (!sponsorId) return null;

  const linkedCodes = codeRows.filter((r) => r.sponsorId === sponsorId);
  if (!linkedCodes.length) return null;

  let merged = null;

  linkedCodes.forEach((row) => {
    const stats = codeStatsById[row.id]?.data;
    if (!stats) return;

    const recent = (Array.isArray(stats.recentSessions) ? stats.recentSessions : []).filter(
      (s) => !s.sponsorId || s.sponsorId === sponsorId
    );

    const slice = {
      ...stats,
      recentSessions: recent,
      uniqueParticipantLabels: recent.flatMap((s) => s.participantLabels || []).filter((v, i, a) => a.indexOf(v) === i),
    };

    if (!merged) {
      merged = { ...slice, recentSessions: [...recent] };
      return;
    }

    merged = {
      totalRealSessions: (merged.totalRealSessions || 0) + (Number(stats.totalRealSessions) || 0),
      totalPlayerCount: (merged.totalPlayerCount || 0) + (Number(stats.totalPlayerCount) || 0),
      totalRounds: (merged.totalRounds || 0) + (Number(stats.totalRounds) || 0),
      totalEngagementMinutes:
        (merged.totalEngagementMinutes || 0) + (Number(stats.totalEngagementMinutes) || 0),
      roundReach: (merged.roundReach || 0) + (Number(stats.roundReach) || 0),
      completedGames: (merged.completedGames || 0) + (Number(stats.completedGames) || 0),
      abandonedGames: (merged.abandonedGames || 0) + (Number(stats.abandonedGames) || 0),
      totalSponsorImpressions:
        (merged.totalSponsorImpressions || 0) + (Number(stats.totalSponsorImpressions) || 0),
      peakPlayers: Math.max(merged.peakPlayers || 0, Number(stats.peakPlayers) || 0),
      lastActiveAt: Math.max(merged.lastActiveAt || 0, Number(stats.lastActiveAt) || 0),
      firstSessionAt: Math.min(
        merged.firstSessionAt || Infinity,
        Number(stats.firstSessionAt) || Infinity
      ),
      recentSessions: [...(merged.recentSessions || []), ...recent]
        .sort((a, b) => (a.ts || 0) - (b.ts || 0))
        .slice(-24),
      uniqueParticipantLabels: [
        ...new Set([
          ...(merged.uniqueParticipantLabels || []),
          ...(slice.uniqueParticipantLabels || []),
        ]),
      ].slice(0, 120),
      sponsorImpressions: {
        ...(merged.sponsorImpressions || {}),
        ...(stats.sponsorImpressions || {}),
      },
    };
  });

  if (!merged) return null;
  if (merged.firstSessionAt === Infinity) merged.firstSessionAt = null;
  return merged;
}

export function openSponsorImpactReport(sponsor, codeRows, codeStatsById, notify) {
  const stats = buildSponsorFilteredStats(codeRows, codeStatsById, sponsor.id);
  if (!stats || !(Number(stats.totalRealSessions) > 0 || Number(stats.totalRounds) > 0)) {
    notify?.('لا توجد جلسات مسجّلة لهذا الراعي بعد', 'error');
    return false;
  }

  const ok = openMarketingImpactReport(stats, {
    recipientName: sponsor.name,
    recipientType: 'sponsor',
    reportPurpose: 'sponsorship',
    reportScope: 'platform',
    sponsorMeta: {
      name: sponsor.name,
      logoUrl: sponsor.logoUrl,
      tagline: sponsor.tagline,
      prizeOffer: sponsor.prizeOffer,
    },
    customNote: `تقرير راعٍ مستقل — ${sponsor.name}`,
  });

  if (ok) notify?.('تم فتح تقرير الراعي — اختر طباعة / PDF', 'success');
  else notify?.('تعذّر فتح النافذة — اسمح بالنوافذ المنبثقة', 'error');
  return ok;
}
