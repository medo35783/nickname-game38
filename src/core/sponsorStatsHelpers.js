/**
 * ربط أكواد الاشتراك بالرعاة + تجميع إحصائيات الظهور
 */

export function sponsorFieldsFromCode(codeRow = {}) {
  if (!codeRow?.sponsorId) return null;
  return {
    sponsorId: String(codeRow.sponsorId),
    sponsorName: String(codeRow.sponsorName || '').trim().slice(0, 80) || null,
    sponsorLogoUrl: String(codeRow.sponsorLogoUrl || '').trim().slice(0, 120000) || null,
    sponsorTagline: String(codeRow.sponsorTagline || '').trim().slice(0, 120) || null,
  };
}

/** حقول الراعي للكود النشط (تُنسخ عند التفعيل) */
export function buildActiveCodeSponsorPayload(codeRow) {
  const s = sponsorFieldsFromCode(codeRow);
  if (!s) return {};
  return s;
}

/** من localStorage — للعرض أثناء الجولة */
export function readActiveCodeSponsorFromLocal() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = JSON.parse(localStorage.getItem('code_active_pfcc') || '{}');
    if (!raw.sponsorId) return null;
    return {
      id: raw.sponsorId,
      name: raw.sponsorName || 'الراعي',
      logoUrl: raw.sponsorLogoUrl || '',
      tagline: raw.sponsorTagline || '',
    };
  } catch {
    return null;
  }
}

function bumpSponsorBucket(prev = {}, sessionData) {
  const sid = sessionData.sponsorId;
  if (!sid) return prev;
  const name = sessionData.sponsorName || prev[sid]?.sponsorName || 'راعٍ';
  const cur = prev[sid] || { sponsorName: name, sessions: 0, rounds: 0, roundReach: 0 };
  const rounds = Number(sessionData.totalRounds) || 0;
  const reach = Number(sessionData.roundReach) || rounds * (Number(sessionData.playerCount) || 0);
  return {
    ...prev,
    [sid]: {
      sponsorName: name,
      sessions: (cur.sessions || 0) + 1,
      rounds: (cur.rounds || 0) + rounds,
      roundReach: (cur.roundReach || 0) + reach,
    },
  };
}

/** يُستدعى من computeNextStats */
export function mergeSponsorStats(prev = {}, sessionData = {}) {
  if (!sessionData.sponsorId) return prev && typeof prev === 'object' ? prev : {};
  return bumpSponsorBucket(prev && typeof prev === 'object' ? prev : {}, sessionData);
}

/** تجميع عبر كل الأكواد — لوحة الرعاة */
export function aggregateSponsorImpressions(codeRows = [], codeStatsById = {}) {
  const bySponsor = {};

  codeRows.forEach((row) => {
    const stats = codeStatsById[row.id]?.data;
    const bucket = stats?.sponsorImpressions;
    if (bucket && typeof bucket === 'object') {
      Object.entries(bucket).forEach(([sid, val]) => {
        if (!bySponsor[sid]) {
          bySponsor[sid] = {
            sponsorId: sid,
            sponsorName: val.sponsorName || row.sponsorName || 'راعٍ',
            codes: new Set(),
            sessions: 0,
            rounds: 0,
            roundReach: 0,
          };
        }
        bySponsor[sid].sessions += Number(val.sessions) || 0;
        bySponsor[sid].rounds += Number(val.rounds) || 0;
        bySponsor[sid].roundReach += Number(val.roundReach) || 0;
        bySponsor[sid].codes.add(row.id);
      });
      return;
    }

    if (!row.sponsorId || !stats) return;
    const sid = row.sponsorId;
    if (!bySponsor[sid]) {
      bySponsor[sid] = {
        sponsorId: sid,
        sponsorName: row.sponsorName || 'راعٍ',
        codes: new Set(),
        sessions: 0,
        rounds: 0,
        roundReach: 0,
      };
    }
    bySponsor[sid].sessions += Number(stats.totalRealSessions) || 0;
    bySponsor[sid].rounds += Number(stats.totalRounds) || 0;
    bySponsor[sid].roundReach += Number(stats.roundReach) || 0;
    bySponsor[sid].codes.add(row.id);
  });

  return Object.values(bySponsor)
    .map((s) => ({ ...s, codeCount: s.codes.size, codes: undefined }))
    .sort((a, b) => b.roundReach - a.roundReach);
}

/** جلسات راعٍ من recentSessions عبر الأكواد */
export function collectSponsorSessionLog(codeRows = [], codeStatsById = {}, sponsorId = null) {
  const log = [];
  codeRows.forEach((row) => {
    if (sponsorId && row.sponsorId !== sponsorId) return;
    const stats = codeStatsById[row.id]?.data;
    const recent = Array.isArray(stats?.recentSessions) ? stats.recentSessions : [];
    recent.forEach((s) => {
      if (sponsorId && s.sponsorId && s.sponsorId !== sponsorId) return;
      if (!sponsorId && !s.sponsorId && !row.sponsorId) return;
      log.push({
        ...s,
        code: row.code,
        sponsorName: s.sponsorName || row.sponsorName || '—',
        sponsorImpressions: s.sponsorImpressions ?? s.roundReach ?? 0,
      });
    });
  });
  return log.sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 30);
}
