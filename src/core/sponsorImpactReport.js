/**
 * تقرير راعٍ مستقل — PDF بكل جلسات وظهورات راعٍ محدد
 */
import { openMarketingImpactReport } from './marketingImpactReport';

/** يبني stats مصفّاة لراعٍ واحد — من sponsorImpressions + الأكواد المربوطة */
export function buildSponsorFilteredStats(codeRows = [], codeStatsById = {}, sponsorId) {
  if (!sponsorId) return null;

  const linkedCodes = codeRows.filter((r) => r.sponsorId === sponsorId);
  const linkedCodeIds = new Set(linkedCodes.map((r) => r.id));
  const allCodeIds = new Set([
    ...Object.keys(codeStatsById || {}),
    ...codeRows.map((r) => r.id),
  ]);

  let merged = null;
  let bucketTotals = { sessions: 0, rounds: 0, roundReach: 0 };

  allCodeIds.forEach((codeId) => {
    const stats = codeStatsById[codeId]?.data;
    if (!stats) return;

    const bucket = stats.sponsorImpressions?.[sponsorId];
    if (bucket) {
      bucketTotals.sessions += Number(bucket.sessions) || 0;
      bucketTotals.rounds += Number(bucket.rounds) || 0;
      bucketTotals.roundReach += Number(bucket.roundReach) || 0;
    }

    const isLinked = linkedCodeIds.has(codeId);
    const recent = (Array.isArray(stats.recentSessions) ? stats.recentSessions : []).filter(
      (s) =>
        s.sponsorId === sponsorId ||
        isLinked ||
        (bucket && (Number(s.sponsorImpressions) > 0 || Number(s.roundReach) > 0))
    );

    if (!recent.length && !bucket && !isLinked) return;

    const slice = {
      ...stats,
      recentSessions: recent.map((s) => ({ ...s, codeId })),
      uniqueParticipantLabels: recent
        .flatMap((s) => s.participantLabels || [])
        .filter((v, i, a) => a.indexOf(v) === i),
    };

    if (!merged) {
      merged = { ...slice, recentSessions: [...slice.recentSessions] };
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
      recentSessions: [...(merged.recentSessions || []), ...slice.recentSessions]
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

  if (!merged && !bucketTotals.sessions && !bucketTotals.rounds) return null;

  if (!merged) {
    merged = {
      totalRealSessions: 0,
      totalPlayerCount: 0,
      totalRounds: 0,
      totalEngagementMinutes: 0,
      roundReach: 0,
      completedGames: 0,
      abandonedGames: 0,
      totalSponsorImpressions: 0,
      peakPlayers: 0,
      recentSessions: [],
      uniqueParticipantLabels: [],
      sponsorImpressions: { [sponsorId]: bucketTotals },
    };
  }

  if (bucketTotals.rounds || bucketTotals.roundReach) {
    merged.totalRounds = Math.max(merged.totalRounds || 0, bucketTotals.rounds);
    merged.roundReach = Math.max(merged.roundReach || 0, bucketTotals.roundReach);
    merged.totalSponsorImpressions = Math.max(
      merged.totalSponsorImpressions || 0,
      bucketTotals.roundReach
    );
    merged.sponsorImpressions = {
      ...(merged.sponsorImpressions || {}),
      [sponsorId]: {
        ...(merged.sponsorImpressions?.[sponsorId] || {}),
        ...bucketTotals,
      },
    };
  }

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
