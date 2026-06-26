/**
 * مقاييس تسويقية مشتقة من codes/{id}/stats — B2B، رعاية الجولات، كوبونات الجوائز.
 */

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function round1(v) {
  return Math.round(v * 10) / 10;
}

/** يستنتج المقاييس التسويقية من كائن stats (يدعم البيانات القديمة) */
export function deriveMarketingMetrics(stats) {
  if (!stats || typeof stats !== 'object') {
    return {
      totalRealSessions: 0,
      totalParticipants: 0,
      peakPlayers: 0,
      avgPlayers: 0,
      totalRounds: 0,
      totalEngagementMinutes: 0,
      roundReach: 0,
      completionRate: 0,
      completedGames: 0,
      avgRoundsPerSession: 0,
      avgEngagementPerSession: 0,
      couponReadySessions: 0,
      gamesPlayed: { titles: 0, fameeri: 0, hesbah: 0 },
    };
  }

  const totalReal = num(stats.totalRealSessions);
  const totalParticipants = num(stats.totalPlayerCount);
  const totalRounds = num(stats.totalRounds);
  const completed = num(stats.completedGames);
  const engagement = num(stats.totalEngagementMinutes);
  const roundReach = num(stats.roundReach);
  const peakPlayers = num(stats.peakPlayers);

  const recent = Array.isArray(stats.recentSessions) ? stats.recentSessions : [];
  const couponReadySessions = recent.filter(
    (s) => s.completed && num(s.playerCount) >= 5 && num(s.totalRounds) >= 2
  ).length;

  return {
    totalRealSessions: totalReal,
    totalParticipants,
    peakPlayers,
    avgPlayers: totalReal > 0 ? round1(totalParticipants / totalReal) : round1(num(stats.avgPlayers)),
    totalRounds,
    totalEngagementMinutes: round1(engagement),
    roundReach,
    completionRate: totalReal > 0 ? Math.round((completed / totalReal) * 100) : 0,
    completedGames: completed,
    avgRoundsPerSession: totalReal > 0 ? round1(totalRounds / totalReal) : 0,
    avgEngagementPerSession: totalReal > 0 ? round1(engagement / totalReal) : 0,
    couponReadySessions,
    gamesPlayed: {
      titles: num(stats.gamesPlayed?.titles),
      fameeri: num(stats.gamesPlayed?.fameeri),
      hesbah: num(stats.gamesPlayed?.hesbah),
    },
  };
}

/** يجمع مقاييس عدة أكواد — للوحة الأدمن */
export function aggregateMarketingMetrics(statsList) {
  const list = (statsList || []).filter(Boolean);
  if (!list.length) return deriveMarketingMetrics(null);

  let peakPlayers = 0;
  let couponReadySessions = 0;
  const merged = {
    totalRealSessions: 0,
    totalPlayerCount: 0,
    totalRounds: 0,
    totalEngagementMinutes: 0,
    roundReach: 0,
    completedGames: 0,
    abandonedGames: 0,
    gamesPlayed: { titles: 0, fameeri: 0, hesbah: 0 },
  };

  list.forEach((stats) => {
    const m = deriveMarketingMetrics(stats);
    merged.totalRealSessions += m.totalRealSessions;
    merged.totalPlayerCount += m.totalParticipants;
    merged.totalRounds += m.totalRounds;
    merged.totalEngagementMinutes += m.totalEngagementMinutes;
    merged.roundReach += m.roundReach;
    merged.completedGames += m.completedGames;
    merged.abandonedGames += num(stats.abandonedGames);
    merged.gamesPlayed.titles += m.gamesPlayed.titles;
    merged.gamesPlayed.fameeri += m.gamesPlayed.fameeri;
    merged.gamesPlayed.hesbah += m.gamesPlayed.hesbah;
    peakPlayers = Math.max(peakPlayers, m.peakPlayers);
    couponReadySessions += m.couponReadySessions;
  });

  return {
    ...deriveMarketingMetrics(merged),
    peakPlayers,
    couponReadySessions,
    codesWithActivity: list.filter((s) => num(s.totalRealSessions) > 0).length,
  };
}

function fmt(n) {
  return new Intl.NumberFormat('ar-SA').format(Math.round(n));
}

/**
 * نص عرض تسويقي جاهز — للنسخ في عروض المؤسسات / الرعاة / الكوبونات
 */
export function buildMarketingPitch(stats, { codeLabel = null } = {}) {
  const m = deriveMarketingMetrics(stats);
  if (m.totalRealSessions === 0 && m.totalRounds === 0) {
    return 'لا توجد بيانات كافية بعد — ابدأ جلسة لعب لتوليد أرقام العرض.';
  }

  const header = codeLabel ? `📊 تقرير تفاعل — ${codeLabel}` : '📊 تقرير تفاعل المنصة';
  const lines = [
    header,
    '',
    '🏢 حزم المؤسسات (B2B):',
    `• ${fmt(m.totalRealSessions)} جلسة لعب حقيقية`,
    `• ${fmt(m.totalParticipants)} مشاركة تراكمية للمتسابقين`,
    `• ذروة حضور: ${fmt(m.peakPlayers)} متسابق في جلسة واحدة`,
    `• متوسط الحضور: ${m.avgPlayers} متسابق / جلسة`,
    `• معدل إكمال الجلسات: ${m.completionRate}%`,
    '',
    '🎯 رعاية الجولات:',
    `• ${fmt(m.totalRounds)} جولة مكتملة قابلة للرعاية`,
    `• ${fmt(m.roundReach)} ظهور رعاية (جولة × متسابق)`,
    `• متوسط ${m.avgRoundsPerSession} جولة لكل جلسة`,
    '',
    '🎁 كوبونات الجوائز:',
    `• ${fmt(m.totalEngagementMinutes)} دقيقة حضور متسابقين (تفاعل فعلي)`,
    `• ${fmt(m.couponReadySessions)} جلسة مؤهلة للجوائز (5+ لاعبين، جولتان+، مكتملة)`,
    `• الألقاب ${m.gamesPlayed.titles} · القميري ${m.gamesPlayed.fameeri} · الحسبة ${m.gamesPlayed.hesbah}`,
  ];

  return lines.join('\n');
}

export function formatEngagementMinutes(minutes, { short = false } = {}) {
  const m = num(minutes);
  if (short) {
    if (m < 60) return `${round1(m)} د`;
    const hours = Math.floor(m / 60);
    const rest = Math.round(m % 60);
    return rest > 0 ? `${hours} س ${rest} د` : `${hours} س`;
  }
  if (m < 60) return `${round1(m)} دقيقة`;
  const hours = Math.floor(m / 60);
  const rest = Math.round(m % 60);
  return rest > 0 ? `${hours} ساعة و${rest} دقيقة` : `${hours} ساعة`;
}

export const REPORT_PURPOSES = {
  sponsorship: {
    id: 'sponsorship',
    label: '① رعاية الجولات',
    subtitle: 'شعار الراعي يظهر أثناء كل جولة — مقياس الظهور والجمهور الحقيقي',
    titleSuffix: 'تقرير رعاية الجولات',
    docTitle: 'كشف ظهور الرعاية والجمهور',
  },
  prize: {
    id: 'prize',
    label: '② جائزة الجولة برعاية',
    subtitle: 'كوبون أو خصم للفائز — جلسات مؤهلة ومشاركون فعليون',
    titleSuffix: 'تقرير جائزة الجولة',
    docTitle: 'كشف الجلسات المؤهلة للجوائز',
  },
  full: {
    id: 'full',
    label: 'تقرير شراكة شامل',
    subtitle: 'رعاية الجولات + جوائز + أرقام كاملة',
    titleSuffix: 'تقرير شراكة B2B',
    docTitle: 'تقرير تأثير الفعاليات والتفاعل الجماعي',
  },
};

/** جلسات مؤهلة للجوائز من السجل الأخير */
export function derivePrizeReadySessions(recent = []) {
  return (Array.isArray(recent) ? recent : []).filter(
    (s) => s.completed && num(s.playerCount) >= 5 && num(s.totalRounds) >= 2
  );
}

/** كشف الجلسات مع المشرفين والمتسابقين — للتقرير الرسمي */
export function deriveSessionRoster(stats) {
  const recent = Array.isArray(stats?.recentSessions) ? [...stats.recentSessions].reverse() : [];
  return recent.map((s) => {
    const gk = normalizeGameKey(s.gameType);
    const meta = gk ? GAME_REPORT_META[gk] : null;
    const rounds = num(s.totalRounds);
    const players = num(s.playerCount);
    const labels = Array.isArray(s.participantLabels) ? s.participantLabels.filter(Boolean) : [];
    const prizeReady = s.completed && players >= 5 && rounds >= 2;
    return {
      gameLabel: meta ? `${meta.icon} ${meta.label}` : s.gameType || '—',
      roomCode: s.roomCode || '—',
      adminName: s.adminName || '—',
      participantLabels: labels,
      participantSummary: labels.length ? labels.join(' · ') : `${players} متسابق`,
      playerCount: players,
      totalRounds: rounds,
      roundReach: num(s.roundReach) || rounds * players,
      engagementMinutes: round1(num(s.engagementMinutes) || players * num(s.durationMinutes)),
      completed: !!s.completed,
      prizeReady,
      sponsorName: s.sponsorName || null,
      sponsorImpressions: num(s.sponsorImpressions) || (s.sponsorId ? num(s.roundReach) : 0),
      ts: s.ts || null,
      dateLabel: s.ts
        ? new Date(s.ts).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
        : '—',
    };
  });
}

export const GAME_REPORT_META = {
  titles: {
    key: 'titles',
    icon: '🎭',
    label: 'الألقاب',
    color: '#b8860b',
    accent: '#f5ecd4',
    tagline: 'أخف هويتك واكشف الآخرين — مسابقة ألقاب جماعية تفاعلية',
  },
  fameeri: {
    key: 'fameeri',
    icon: '🦅',
    label: 'القميري',
    color: '#256fa8',
    accent: '#e8f2fb',
    tagline: 'صيد القمري — استراتيجية ومعرفة في أجواء الصحراء',
  },
  hesbah: {
    key: 'hesbah',
    icon: '🎯',
    label: 'الحسبة',
    color: '#248f55',
    accent: '#e8f7ef',
    tagline: 'تحدي الحساب السريع — سرعة ودقة جماعية',
  },
};

function normalizeGameKey(gameType) {
  if (gameType === 'sniper') return 'hesbah';
  if (gameType === 'titles' || gameType === 'fameeri' || gameType === 'hesbah') return gameType;
  return null;
}

/** تفصيل الأرقام لكل لعبة — يعتمد on byGame مع fallback من recentSessions */
export function deriveGameBreakdown(stats) {
  const keys = ['titles', 'fameeri', 'hesbah'];
  const byGame = stats?.byGame && typeof stats.byGame === 'object' ? stats.byGame : {};
  const recent = Array.isArray(stats?.recentSessions) ? stats.recentSessions : [];
  const fromRecent = {};

  recent.forEach((s) => {
    const k = normalizeGameKey(s.gameType);
    if (!k) return;
    if (!fromRecent[k]) {
      fromRecent[k] = {
        sessions: 0,
        realSessions: 0,
        rounds: 0,
        participants: 0,
        engagementMinutes: 0,
        roundReach: 0,
        completed: 0,
        peakPlayers: 0,
      };
    }
    const rounds = num(s.totalRounds);
    const players = num(s.playerCount);
    const duration = num(s.durationMinutes);
    const engagement = num(s.engagementMinutes) || players * duration;
    const reach = num(s.roundReach) || rounds * players;
    fromRecent[k].sessions += 1;
    if (rounds > 0) fromRecent[k].realSessions += 1;
    fromRecent[k].rounds += rounds;
    fromRecent[k].participants += players;
    fromRecent[k].engagementMinutes += engagement;
    fromRecent[k].roundReach += reach;
    if (s.completed) fromRecent[k].completed += 1;
    fromRecent[k].peakPlayers = Math.max(fromRecent[k].peakPlayers, players);
  });

  return keys.map((key) => {
    const stored = byGame[key] || {};
    const fallback = fromRecent[key] || {};
    const hasStored = Object.keys(stored).length > 0;
    const source = hasStored ? stored : fallback;
    const gp = num(stats?.gamesPlayed?.[key]);
    return {
      ...GAME_REPORT_META[key],
      sessions: num(source.sessions) || gp,
      realSessions: num(source.realSessions),
      rounds: num(source.rounds),
      participants: num(source.participants),
      engagementMinutes: round1(num(source.engagementMinutes)),
      roundReach: num(source.roundReach),
      completed: num(source.completed),
      peakPlayers: num(source.peakPlayers),
      hasDetailedData: hasStored || fallback.sessions > 0,
    };
  });
}

function formatReportDate(ts) {
  try {
    return new Date(ts).toLocaleString('ar-SA', { dateStyle: 'long', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function formatShortDate(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleDateString('ar-SA', { dateStyle: 'medium' });
  } catch {
    return '—';
  }
}

/**
 * نموذج بيانات التقرير الرسمي — يُمرَّر لمولّد HTML/PDF
 */
export function buildMarketingReportModel(stats, options = {}) {
  const {
    recipientName = '',
    recipientType = 'general',
    codeLabel = null,
    codeMeta = null,
    reportScope = codeLabel ? 'code' : 'platform',
    customNote = '',
    platformAggregate = null,
    reportPurpose = 'full',
    sponsorMeta = null,
  } = options;

  const purposeMeta = REPORT_PURPOSES[reportPurpose] || REPORT_PURPOSES.full;

  const metrics = reportScope === 'platform' && platformAggregate
    ? platformAggregate
    : deriveMarketingMetrics(stats);
  const games = deriveGameBreakdown(stats);
  const recent = Array.isArray(stats?.recentSessions)
    ? [...stats.recentSessions].reverse().slice(0, 12)
    : [];
  const sessionRoster = deriveSessionRoster(stats);
  const prizeReadySessions = derivePrizeReadySessions(stats?.recentSessions);
  const uniqueParticipants = Array.isArray(stats?.uniqueParticipantLabels)
    ? stats.uniqueParticipantLabels
    : sessionRoster.flatMap((s) => s.participantLabels).filter((v, i, a) => a.indexOf(v) === i);

  const recipientLabels = {
    school: 'مدرسة / مؤسسة تعليمية',
    company: 'شركة / مؤسسة',
    sponsor: 'راعٍ / شريك تسويقي',
    general: 'جهة مهتمة',
  };

  const reportId = `LZ-${Date.now().toString(36).toUpperCase()}-${codeLabel ? codeLabel.replace(/[^A-Z0-9]/gi, '').slice(-6) : 'PLT'}`;

  return {
    reportId,
    generatedAt: Date.now(),
    generatedAtLabel: formatReportDate(Date.now()),
    recipientName: recipientName.trim(),
    recipientType,
    recipientTypeLabel: recipientLabels[recipientType] || recipientLabels.general,
    codeLabel,
    codeMeta,
    reportScope,
    scopeLabel: reportScope === 'platform' ? 'تقرير مجمّع للمنصة' : `تقرير كود الاشتراك ${codeLabel || ''}`,
    customNote: customNote.trim(),
    reportPurpose,
    purposeMeta,
    sponsorMeta: sponsorMeta
      ? {
          name: String(sponsorMeta.name || '').trim(),
          logoUrl: String(sponsorMeta.logoUrl || '').trim(),
          tagline: String(sponsorMeta.tagline || '').trim(),
          prizeOffer: String(sponsorMeta.prizeOffer || '').trim(),
        }
      : null,
    metrics,
    games,
    recent,
    sessionRoster,
    prizeReadySessions,
    uniqueParticipants,
    uniqueParticipantCount: uniqueParticipants.length,
    periodStart: stats?.firstSessionAt || (recent.length ? recent[recent.length - 1]?.ts : null),
    periodEnd: stats?.lastActiveAt || null,
    periodStartLabel: formatShortDate(stats?.firstSessionAt || (recent.length ? recent[recent.length - 1]?.ts : null)),
    periodEndLabel: formatShortDate(stats?.lastActiveAt),
    totalDurationMinutes: round1(num(stats?.totalDurationMinutes)),
    abandonedGames: num(stats?.abandonedGames),
    totalSponsorImpressions: num(stats?.totalSponsorImpressions),
    sponsorImpressionsBySponsor: stats?.sponsorImpressions || {},
  };
}
