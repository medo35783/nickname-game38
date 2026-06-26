/** صفحات مركز التحكم — 6 مراحل + بنك مستقل */
export const ADMIN_PAGES = [
  { id: 'overview', icon: '🟢', label: 'نظرة عامة', short: 'نظرة' },
  { id: 'codes', icon: '🎟️', label: 'الأكواد', short: 'أكواد' },
  { id: 'marketing', icon: '📣', label: 'التسويق', short: 'تسويق' },
  { id: 'qbank', icon: '📚', label: 'بنك الأسئلة', short: 'بنك' },
  { id: 'content', icon: '📢', label: 'المحتوى', short: 'محتوى' },
  { id: 'users', icon: '👥', label: 'المستخدمين', short: 'مستخدمين' },
  { id: 'health', icon: '🔧', label: 'الصحة', short: 'صحة' },
];

export function getAdminPageMeta(pageId) {
  return ADMIN_PAGES.find((p) => p.id === pageId) || ADMIN_PAGES[0];
}
