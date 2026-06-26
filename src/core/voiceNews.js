/**
 * محطات منصة لعيب زون — الأحدث أولاً (للعرض في صوتك)
 * التسلسل الزمني: الألقاب → القميري → بنك المعرفة → حَسْبة → الشارات → قاعة المجد
 */
export const VOICE_NEWS = [
  {
    id: 'hof',
    date: '2026-05-18',
    title: '🏆 قاعة المجد',
    body: 'لوحة متصدرين أسبوعية — تنافس على المركز الأول بين أبطال الساحة.',
    isNew: true,
  },
  {
    id: 'arena',
    date: '2026-04-12',
    title: '🏟️ شارة الساحة',
    body: 'سجّل شارتك، اجمع نقاطاً، وافتح إنجازات وأيقونات حصرية.',
    isNew: true,
  },
  {
    id: 'hesbah',
    date: '2026-02-08',
    title: '🎯 لعبة حَسْبة',
    body: 'معرفة جماعية — تأمين، اشتعال، ورهان حاسم على التتويج.',
    isNew: false,
  },
  {
    id: 'qbank',
    date: '2025-09-14',
    title: '📚 بنك المعرفة',
    body: 'اقترح أسئلتك — تُراجع وتُضاف لألعاب المنصة من مساهمات المجتمع.',
    isNew: false,
  },
  {
    id: 'fameeri',
    date: '2025-06-22',
    title: '🦅 لعبة القميري',
    body: 'حرب استراتيجية — وزّع القميري واهجم مجموعات الخصوم.',
    isNew: false,
  },
  {
    id: 'titles',
    date: '2025-03-29',
    title: '🎭 لعبة الألقاب',
    body: 'أخفِ هويتك واكشف الآخرين — غرف حقيقية مع أصدقائك.',
    isNew: false,
  },
];

/** تاريخ مقروء بالعربية */
export function formatVoiceNewsDate(iso) {
  try {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return iso;
  }
}
