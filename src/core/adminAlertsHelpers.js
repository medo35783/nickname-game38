/**
 * تنبيهات مركز التحكم — اقتراحات · أكواد · غرف عالقة
 */
import { findExpiringCodes } from './adminPulseHelpers';
import { collectStuckRooms } from './adminHealthHelpers';

export function buildAdminAlerts({
  feedbackItems = [],
  codeRows = [],
  indexByCode = {},
  roomSnaps = {},
  prizeEligibleCount = 0,
}) {
  const alerts = [];

  const newFeedback = feedbackItems.filter((f) => f.status === 'new').length;
  if (newFeedback > 0) {
    alerts.push({
      id: 'feedback',
      icon: '💡',
      tone: 'important',
      title: `${newFeedback} اقتراح جديد`,
      sub: 'صندوق الاقتراحات في المستخدمين',
      page: 'users',
    });
  }

  const expiring = findExpiringCodes(codeRows, indexByCode);
  if (expiring.length > 0) {
    alerts.push({
      id: 'codes',
      icon: '⏰',
      tone: 'warn',
      title: `${expiring.length} كود ينتهي قريباً`,
      sub: 'خلال 48 ساعة — راجع صفحة الأكواد',
      page: 'codes',
    });
  }

  const stuck = collectStuckRooms(roomSnaps);
  if (stuck.length > 0) {
    alerts.push({
      id: 'health',
      icon: '🔥',
      tone: 'important',
      title: `${stuck.length} غرفة عالقة`,
      sub: 'أكثر من 24 ساعة — الصحة التقنية',
      page: 'health',
    });
  }

  if (prizeEligibleCount > 0) {
    alerts.push({
      id: 'prizes',
      icon: '🎁',
      tone: 'gold',
      title: `${prizeEligibleCount} جلسة مؤهلة للجائزة`,
      sub: 'لوحة الجوائز B2B — التسويق',
      page: 'marketing',
    });
  }

  return alerts;
}

export function totalAlertCount(alerts) {
  return alerts.length;
}
