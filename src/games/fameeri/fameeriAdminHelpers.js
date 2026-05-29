import { Q_WEAPONS } from '../../core/constants';

/** إجمالي الأسلحة المتبقية لمجموعة */
export function groupWeaponsTotal(group) {
  return Q_WEAPONS.reduce((s, w) => s + (group?.weapons?.[w.id] || 0), 0);
}

/** إجمالي الأسلحة الابتدائية */
export function initialWeaponsTotal() {
  return Q_WEAPONS.reduce((s, w) => s + w.qty, 0);
}

/** ترتيب الهجمات من الأحدث للأقدم */
export function sortedAttacks(qAttacks) {
  return Object.values(qAttacks || {}).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/** وصف نتيجة الهجوم للمشرف */
export function attackResultMeta(a) {
  if (a.result === 'success') {
    const n = a.hunted ?? 0;
    return { label: n > 0 ? `صاد ${n} قميري` : 'نجاح — الشجرة فارغة', tone: 'ok', icon: '🎯' };
  }
  if (a.result === 'shielded') {
    return { label: 'صدّ الدرع الهجوم', tone: 'shield', icon: '🛡️' };
  }
  return { label: 'إجابة خاطئة — فشل الهجوم', tone: 'fail', icon: '❌' };
}

/** تصفية السجل — all | atk:gid | def:gid */
export function filterAttacks(attacks, filterKey) {
  if (!filterKey) return attacks;
  const [mode, gid] = filterKey.split(':');
  if (!gid) return attacks;
  return attacks.filter((a) => {
    if (mode === 'atk') return a.attackerId === gid;
    if (mode === 'def') return a.targetId === gid;
    return a.attackerId === gid || a.targetId === gid;
  });
}

/** وقت نسبي بسيط */
export function fmtAttackTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
}
