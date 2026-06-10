/** مكافأة الترحيب عند أول تسجيل بالبريد */
export const ARENA_WELCOME_BONUS = 300;

/** نقاط الجولة للضيف (تُحفظ فقط بعد التسجيل) */
export const ARENA_RANK_POINTS = {
  1: 120,
  2: 60,
  3: 60,
  default: 30,
};

/** مكافأة المشرف عند إنهاء جلسة */
export const ARENA_HOST_BASE = 80;
export const ARENA_HOST_PER_PLAYER = 15;

export const ARENA_TIER_THRESHOLDS = [
  { id: 'legend', label: 'أسطورة', min: 3000, frame: 'legend' },
  { id: 'gold', label: 'ذهبي', min: 1500, frame: 'gold' },
  { id: 'silver', label: 'فضي', min: 500, frame: 'silver' },
  { id: 'bronze', label: 'برونزي', min: 0, frame: 'bronze' },
];

/** أيقونات الشارة — تُفتح تدريجياً بالنقاط */
export const ARENA_ICONS_UNLOCKS = [
  { minPoints: 0, label: 'أساسية', icons: ['🎮', '⚽', '🎯', '🦅', '🎭', '🔥', '🐺', '✨', '🎲', '🏹'] },
  { minPoints: 500, label: 'فضية — 500+', icons: ['🏆', '👑', '⭐', '🛡️', '⚡', '🎪', '⚔️', '🧿', '🎗️', '🔱'] },
  { minPoints: 1500, label: 'ذهبية — 1,500+', icons: ['💎', '🏟️', '🦁', '🌟', '🎖️', '🦾', '🔮', '🌙', '💫', '🐉'] },
  { minPoints: 3000, label: 'أسطورية — 3,000+', icons: ['👁️', '🌌', '💠', '🏅', '⚜️', '🧞', '🦂', '🌠'] },
];

export const ARENA_DEFAULT_ICON = '🎮';

/** مزايا تسويقية — بطاقة شارة الساحة */
export const ARENA_SIGNUP_BENEFITS = [
  { icon: '☁️', text: 'أسئلتك تتذكّر — لا تتكرر بين جلساتك' },
  { icon: '🦅', text: 'اسمك وأيقونتك تظهر في كل لعبة' },
  { icon: '⭐', text: 'نقاط الساحة تتراكم وتفتح أيقونات حصرية' },
  { icon: '📱', text: 'استكمل من أي جهاز — جوال أو لابتوب' },
];

export function computeArenaTier(points) {
  const pts = Number(points) || 0;
  for (const tier of ARENA_TIER_THRESHOLDS) {
    if (pts >= tier.min) return tier;
  }
  return ARENA_TIER_THRESHOLDS[ARENA_TIER_THRESHOLDS.length - 1];
}

export function iconsUnlockedForPoints(points) {
  const pts = Number(points) || 0;
  const icons = [];
  for (const row of ARENA_ICONS_UNLOCKS) {
    if (pts >= row.minPoints) icons.push(...row.icons);
  }
  return [...new Set(icons)];
}

export function nextTierProgress(points) {
  const pts = Number(points) || 0;
  const current = computeArenaTier(pts);
  const tiersAsc = [...ARENA_TIER_THRESHOLDS].reverse();
  const idx = tiersAsc.findIndex((t) => t.id === current.id);
  const next = tiersAsc[idx + 1];
  if (!next) {
    return { current, next: null, progress: 1, remaining: 0 };
  }
  const span = next.min - current.min;
  const progress = span > 0 ? Math.min(1, (pts - current.min) / span) : 0;
  return {
    current,
    next,
    progress,
    remaining: Math.max(0, next.min - pts),
  };
}

export function arenaPointsForRank(rank) {
  const r = Number(rank);
  if (r === 1) return ARENA_RANK_POINTS[1];
  if (r === 2 || r === 3) return ARENA_RANK_POINTS[2];
  return ARENA_RANK_POINTS.default;
}
