import { Q_WEAPONS } from '../../core/constants';

/** حجم مجموعة واحدة في البنك = عدد مرات استخدام كل سلاح تقريباً */
export const QUMAIRI_SET_QUOTAS = { hard: 3, medium: 5, easy: 10 };

export const WEAPON_DIFFICULTY = {
  showzel: 'hard',
  omsagma: 'medium',
  nabeeta: 'easy',
};

const DIFF_ORDER = ['hard', 'medium', 'easy'];

export function difficultyForWeapon(weaponId) {
  return WEAPON_DIFFICULTY[weaponId] || 'medium';
}

export function difficultyLabelAr(level) {
  if (level === 'hard') return 'صعب (شوزل)';
  if (level === 'easy') return 'سهل (نبيطة)';
  return 'متوسط (أم صتمة)';
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function bankFilterKey({ categories = [], audience = '' } = {}) {
  const cats = [...categories].sort().join(',');
  return `qumayri|${cats}|${audience || 'all'}`;
}

/** تقسيم الأسئلة حسب الصعوبة مع استبعاد المستخدم سابقاً */
export function partitionByDifficulty(questions, usedIds = []) {
  const used = new Set(usedIds);
  const buckets = { hard: [], medium: [], easy: [] };
  (questions || []).forEach((q) => {
    if (!q?.id || used.has(q.id)) return;
    const d = q.difficulty_level || 'medium';
    if (buckets[d]) buckets[d].push(q);
    else buckets.medium.push(q);
  });
  return buckets;
}

/** كم «مجموعة كاملة» متاحة: 3 صعب + 5 متوسط + 10 سهل */
export function countCompleteBankSets(buckets) {
  const h = buckets.hard?.length || 0;
  const m = buckets.medium?.length || 0;
  const e = buckets.easy?.length || 0;
  return Math.min(
    Math.floor(h / QUMAIRI_SET_QUOTAS.hard),
    Math.floor(m / QUMAIRI_SET_QUOTAS.medium),
    Math.floor(e / QUMAIRI_SET_QUOTAS.easy)
  );
}

/**
 * يبني مخزون جلسة من مجموعة واحدة (أو أكثر) دون تكرار معرّفات سابقة.
 * @returns {{ poolStructured, usedIds, setCount, setsTaken, shortages }}
 */
export function buildSessionPoolFromBank(questions, { usedIds = [], setsToTake = 1 } = {}) {
  const buckets = partitionByDifficulty(questions, usedIds);
  const availableSets = countCompleteBankSets(buckets);
  const take = Math.min(Math.max(1, setsToTake), availableSets);

  const poolStructured = { hard: [], medium: [], easy: [] };
  const newUsed = [...usedIds];

  if (take < 1) {
    return {
      poolStructured,
      usedIds: newUsed,
      setCount: availableSets,
      setsTaken: 0,
      shortages: {
        hard: buckets.hard.length,
        medium: buckets.medium.length,
        easy: buckets.easy.length,
        need: QUMAIRI_SET_QUOTAS,
      },
    };
  }

  const shuffled = {
    hard: shuffle(buckets.hard),
    medium: shuffle(buckets.medium),
    easy: shuffle(buckets.easy),
  };

  for (let s = 0; s < take; s += 1) {
    DIFF_ORDER.forEach((diff) => {
      const quota = QUMAIRI_SET_QUOTAS[diff];
      const chunk = shuffled[diff].splice(0, quota);
      poolStructured[diff].push(...chunk);
      chunk.forEach((q) => newUsed.push(q.id));
    });
  }

  const remaining = partitionByDifficulty(questions, newUsed);
  const setCount = countCompleteBankSets(remaining);

  return {
    poolStructured,
    usedIds: newUsed,
    setCount,
    setsTaken: take,
    shortages: null,
  };
}

/** تحويل قائمة مسطحة قديمة إلى مخزون منظم */
export function normalizePoolToStructured(pool) {
  if (!pool) return { hard: [], medium: [], easy: [] };
  if (pool.hard || pool.medium || pool.easy) {
    return {
      hard: [...(pool.hard || [])],
      medium: [...(pool.medium || [])],
      easy: [...(pool.easy || [])],
    };
  }
  if (!Array.isArray(pool)) return { hard: [], medium: [], easy: [] };
  const structured = { hard: [], medium: [], easy: [] };
  pool.forEach((q) => {
    const d = q.difficulty_level || 'medium';
    if (structured[d]) structured[d].push(q);
    else structured.medium.push(q);
  });
  return structured;
}

export function flattenStructuredPool(poolStructured) {
  const p = normalizePoolToStructured(poolStructured);
  return [...p.hard, ...p.medium, ...p.easy];
}

export function findInStructuredPool(poolStructured, questionId) {
  if (!questionId) return null;
  const p = normalizePoolToStructured(poolStructured);
  for (const diff of DIFF_ORDER) {
    const hit = p[diff].find((q) => q.id === questionId);
    if (hit) return hit;
  }
  return null;
}

/** سحب السؤال التالي حسب سلاح الهجوم */
export function drawQuestionForWeapon(poolStructured, cursors, weaponId) {
  const diff = difficultyForWeapon(weaponId);
  const pool = normalizePoolToStructured(poolStructured);
  const list = pool[diff] || [];
  const idx = cursors?.[diff] ?? 0;
  if (idx >= list.length) {
    return { question: null, cursors, diff, exhausted: true };
  }
  const question = list[idx];
  return {
    question,
    diff,
    exhausted: false,
    cursors: { ...cursors, [diff]: idx + 1 },
  };
}

export function poolStats(poolStructured) {
  const p = normalizePoolToStructured(poolStructured);
  return {
    hard: { total: p.hard.length, label: 'شوزل' },
    medium: { total: p.medium.length, label: 'أم صتمة' },
    easy: { total: p.easy.length, label: 'نبيطة' },
    total: p.hard.length + p.medium.length + p.easy.length,
  };
}

export function weaponQuotaHint() {
  return Q_WEAPONS.map((w) => `${w.name} (${w.diff})`).join(' · ');
}
