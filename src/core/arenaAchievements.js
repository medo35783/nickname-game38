import { ARENA_TIER_THRESHOLDS } from './arena.constants';

/** @typedef {{ id: string, icon: string, label: string, desc: string }} ArenaAchievementDef */

/** @type {Record<string, ArenaAchievementDef>} */
export const ARENA_ACHIEVEMENTS = {
  member: { id: 'member', icon: '🏟️', label: 'عضو الساحة', desc: 'انضممت لشارة الساحة' },
  first_win: { id: 'first_win', icon: '👑', label: 'بطل الجولة', desc: 'حققت المركز الأول' },
  podium: { id: 'podium', icon: '🥈', label: 'على المنصة', desc: 'حققت مركزاً متقدماً' },
  host_rookie: { id: 'host_rookie', icon: '🎛️', label: 'مضيف مبتدئ', desc: 'أنهيت أول جلسة كمشرف' },
  host_pro: { id: 'host_pro', icon: '📣', label: 'مضيف محترف', desc: 'أنهيت 10 جلسات كمشرف' },
  silver_tier: { id: 'silver_tier', icon: '⚪', label: 'مستوى فضي', desc: 'وصلت 500 نقطة ساحة' },
  gold_tier: { id: 'gold_tier', icon: '🥇', label: 'مستوى ذهبي', desc: 'وصلت 1,500 نقطة' },
  legend_tier: { id: 'legend_tier', icon: '💫', label: 'أسطورة الساحة', desc: 'وصلت 3,000 نقطة' },
  weekly_star: { id: 'weekly_star', icon: '⭐', label: 'نجم الأسبوع', desc: 'دخلت أفضل 3 هذا الأسبوع' },
};

const TIER_ORDER = Object.fromEntries(
  [...ARENA_TIER_THRESHOLDS].reverse().map((t, i) => [t.id, i])
);

export function tierRank(tierId) {
  return TIER_ORDER[tierId] ?? 0;
}

export function didTierUpgrade(prevTier, nextTier) {
  return tierRank(nextTier) > tierRank(prevTier || 'bronze');
}

/**
 * يحدد إنجازات جديدة بناءً على الحالة بعد منح النقاط
 * @param {object} prev — ملف profile السابق
 * @param {object} next — القيم المحسوبة بعد المنح
 * @param {object} meta — سياق الحدث
 */
export function detectNewAchievements(prev = {}, next = {}, meta = {}) {
  const existing = new Set([
    ...(Array.isArray(prev.achievements) ? prev.achievements : []),
    ...(Array.isArray(prev.badges) ? [] : []),
  ]);
  const found = [];

  const add = (id) => {
    if (!ARENA_ACHIEVEMENTS[id] || existing.has(id) || found.includes(id)) return;
    found.push(id);
  };

  const rank = Number(meta.rank);
  if (rank === 1) add('first_win');
  if (rank >= 2 && rank <= 3) add('podium');

  const gamesHosted = Number(next.gamesHosted) || 0;
  if (meta.type === 'host_complete' && gamesHosted >= 1) add('host_rookie');
  if (gamesHosted >= 10) add('host_pro');

  const pts = Number(next.arenaPoints) || 0;
  if (pts >= 500) add('silver_tier');
  if (pts >= 1500) add('gold_tier');
  if (pts >= 3000) add('legend_tier');

  return found;
}

export function achievementDefsForIds(ids = []) {
  return ids.map((id) => ARENA_ACHIEVEMENTS[id]).filter(Boolean);
}

export const ARENA_ACHIEVEMENT_LIST = Object.values(ARENA_ACHIEVEMENTS);
