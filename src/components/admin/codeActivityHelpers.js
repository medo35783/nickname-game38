const MS_DAY = 24 * 60 * 60 * 1000;
const MS_WEEK = 7 * MS_DAY;

/** مؤشر النشاط من stats.lastActiveAt */
export function getCodeActivityInfo(stats) {
  if (!stats || !stats.lastActiveAt) {
    return { label: 'لم يُستخدم', color: 'var(--dim)', pulse: false };
  }
  const age = Date.now() - Number(stats.lastActiveAt);
  if (age <= MS_DAY) {
    return { label: 'نشط اليوم', color: 'var(--green)', pulse: true };
  }
  if (age <= MS_WEEK) {
    return { label: 'نشط هذا الأسبوع', color: 'var(--gold)', pulse: false };
  }
  return { label: 'غير نشط', color: 'var(--dim)', pulse: false };
}

/** ملخص سطر الجدول: X جلسة · Y جولة */
export function formatCodeMiniStats(stats) {
  if (!stats) return '—';
  if (stats.totalRealSessions == null && stats.totalRounds == null) return '—';
  const sessions = Number(stats.totalRealSessions) || 0;
  const rounds = Number(stats.totalRounds) || 0;
  return `${sessions} جلسة · ${rounds} جولة`;
}
