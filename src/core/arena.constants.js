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
  { icon: '🔐', text: 'ارجع للعبة بدون رقم سري — مقعدك مربوط بحسابك' },
  { icon: '☁️', text: 'أسئلتك تتذكّر — لا تتكرر بين جلساتك' },
  { icon: '🦅', text: 'اسمك وأيقونتك تظهر في كل لعبة' },
  { icon: '⭐', text: '80+ إنجاز — للمتسابقين والمشرفين' },
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

/** كيف تكسب نقاط الساحة */
export const ARENA_POINTS_EARNING = [
  { icon: '👑', label: 'المركز الأول', points: ARENA_RANK_POINTS[1], role: 'player' },
  { icon: '🥈', label: 'المركز الثاني أو الثالث', points: ARENA_RANK_POINTS[2], role: 'player' },
  { icon: '🎮', label: 'المشاركة في الجولة', points: ARENA_RANK_POINTS.default, role: 'player' },
  {
    icon: '🎛️',
    label: 'إنهاء جلسة كمشرف',
    points: `${ARENA_HOST_BASE} + ${ARENA_HOST_PER_PLAYER}×لاعب`,
    role: 'host',
  },
  { icon: '🎁', label: 'مكافأة الترحيب (مرة واحدة)', points: ARENA_WELCOME_BONUS, role: 'all' },
];

/** مقابل النقاط — ما الذي تفتحه */
export const ARENA_POINTS_REWARDS = [
  {
    minPoints: 0,
    tierId: 'bronze',
    label: 'برونزي',
    icon: '🥉',
    frame: 'إطار برونزي',
    iconCount: 10,
    perks: ['شارتك تظهر في كل لعبة', '10 أيقونات أساسية', 'تتبع إنجازاتك'],
  },
  {
    minPoints: 500,
    tierId: 'silver',
    label: 'فضي',
    icon: '⚪',
    frame: 'إطار فضي لامع',
    iconCount: 20,
    perks: ['+10 أيقونات فضية', 'إنجاز مستوى فضي', 'ظهور أبرز في قاعة المجد'],
  },
  {
    minPoints: 1500,
    tierId: 'gold',
    label: 'ذهبي',
    icon: '🥇',
    frame: 'إطار ذهبي فاخر',
    iconCount: 30,
    perks: ['+10 أيقونات ذهبية', 'إنجاز مستوى ذهبي', 'مكانة VIP في الساحة'],
  },
  {
    minPoints: 3000,
    tierId: 'legend',
    label: 'أسطورة',
    icon: '💫',
    frame: 'إطار أسطوري متوهّج',
    iconCount: 38,
    perks: ['+8 أيقونات أسطورية', 'إنجاز أسطورة الساحة', 'قمة قاعة المجد'],
  },
];
