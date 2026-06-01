import { QSOURCE } from '../../question-bank/questionSession';
import { normalizePoolToStructured, poolStats, QUMAIRI_SET_QUOTAS } from './fameeriQuestionPool';

/** نص توصية المجموعة الكاملة */
export const FAMEERI_IDEAL_SET_LABEL =
  `${QUMAIRI_SET_QUOTAS.hard} صعب (شوزل) · ${QUMAIRI_SET_QUOTAS.medium} متوسط (أم صتمة) · ${QUMAIRI_SET_QUOTAS.easy} سهل (نبيطة)`;

const PER_SET_TOTAL = QUMAIRI_SET_QUOTAS.hard + QUMAIRI_SET_QUOTAS.medium + QUMAIRI_SET_QUOTAS.easy;

/** فرق/مجموعات اللعب في المسابقة (2–6) — لا علاقة لها بعدد أفراد كل فريق */
export const FAMEERI_PLAYER_GROUPS_MIN = 2;
export const FAMEERI_PLAYER_GROUPS_MAX = 6;
export const FAMEERI_PLAYER_GROUP_OPTIONS = [2, 3, 4, 5, 6];

export function clampPlannedPlayerGroups(groupCount) {
  const n = parseInt(groupCount, 10) || FAMEERI_PLAYER_GROUPS_MIN;
  return Math.min(FAMEERI_PLAYER_GROUPS_MAX, Math.max(FAMEERI_PLAYER_GROUPS_MIN, n));
}

/** احتياج الأسئلة حسب عدد فرق/مجموعات اللعب المتوقّع */
export function getFameeriNeededForGroups(groupCount) {
  const n = clampPlannedPlayerGroups(groupCount);
  return {
    groups: n,
    hard: n * QUMAIRI_SET_QUOTAS.hard,
    medium: n * QUMAIRI_SET_QUOTAS.medium,
    easy: n * QUMAIRI_SET_QUOTAS.easy,
    total: n * PER_SET_TOTAL,
  };
}

/** هل المخزون يغطي التوصية لعدد مجموعات معيّن؟ */
export function isPoolEnoughForGroups(pool, groupCount) {
  const needed = getFameeriNeededForGroups(groupCount);
  const stats = poolStats(normalizePoolToStructured(pool));
  return (
    stats.total >= needed.total &&
    stats.hard.total >= needed.hard &&
    stats.medium.total >= needed.medium &&
    stats.easy.total >= needed.easy
  );
}

/** رسالة تنبيه عند نقص الأسئلة عن التوصية */
export function getFameeriGroupsAdvisory(pool, groupCount) {
  const needed = getFameeriNeededForGroups(groupCount);
  const stats = poolStats(normalizePoolToStructured(pool));
  if (isPoolEnoughForGroups(pool, groupCount)) return null;
  return `لـ ${needed.groups} مجموعات تحتاج ${needed.hard} صعب · ${needed.medium} متوسط · ${needed.easy} سهل (${needed.total} سؤال) — عندك ${stats.hard.total} · ${stats.medium.total} · ${stats.easy.total}.`;
}

/** تنبيه اختياري — لا يمنع البدء */
export function getFameeriPoolAdvisory(pool) {
  const stats = poolStats(normalizePoolToStructured(pool));
  const { hard, medium, easy, total } = stats;
  const idealTotal = QUMAIRI_SET_QUOTAS.hard + QUMAIRI_SET_QUOTAS.medium + QUMAIRI_SET_QUOTAS.easy;

  if (
    total >= idealTotal &&
    hard.total >= QUMAIRI_SET_QUOTAS.hard &&
    medium.total >= QUMAIRI_SET_QUOTAS.medium &&
    easy.total >= QUMAIRI_SET_QUOTAS.easy
  ) {
    return null;
  }

  return `الموصى به ${idealTotal} سؤالاً (${FAMEERI_IDEAL_SET_LABEL}) — عندك ${hard.total} · ${medium.total} · ${easy.total}. يمكنك البدء لكن قد تنفد أسئلة بعض الأسلحة.`;
}

/** هل اكتمل الحد الأدنى لبدء التوزيع/اللعب؟ */
export function isFameeriQuestionSetupReady(source, pool) {
  if (!source) {
    return { ok: false, code: 'missing', message: 'اختر مصدر الأسئلة (البنك / أكتب بنفسي / الأسئلة معي)' };
  }
  if (source === QSOURCE.EXTERNAL) {
    return { ok: true, code: 'external' };
  }
  const total = poolStats(normalizePoolToStructured(pool)).total;
  if (!total) {
    return {
      ok: false,
      code: 'empty_pool',
      message:
        source === QSOURCE.CUSTOM
          ? 'أضف سؤالاً واحداً على الأقل واضغط «اعتماد للمسابقة»'
          : 'جهّز أسئلة من البنك واضغط «تجهيز مجموعة مسابقة»',
    };
  }
  const advisory = getFameeriPoolAdvisory(pool);
  return { ok: true, code: source, advisory };
}
