import { ARENA_TIER_THRESHOLDS } from './arena.constants';

/** @typedef {'general'|'player'|'host'|'points'|'loyalty'} ArenaAchievementCategory */

/** @typedef {{ id: string, icon: string, label: string, desc: string, category: ArenaAchievementCategory, rarity?: string }} ArenaAchievementDef */

export const ARENA_ACHIEVEMENT_CATEGORIES = [
  { id: 'all', label: 'الكل', icon: '🏅' },
  { id: 'player', label: 'متسابق', icon: '🎮' },
  { id: 'host', label: 'مشرف', icon: '🎛️' },
  { id: 'points', label: 'نقاط', icon: '⭐' },
  { id: 'loyalty', label: 'وفاء', icon: '💎' },
  { id: 'general', label: 'عام', icon: '🏟️' },
];

function milestone(id, icon, label, desc, category, rarity = 'common') {
  return { id, icon, label, desc, category, rarity };
}

function buildAchievementCatalog() {
  /** @type {Record<string, ArenaAchievementDef>} */
  const map = {
    member: milestone('member', '🏟️', 'عضو الساحة', 'انضممت لشارة الساحة', 'general', 'common'),
    first_game: milestone('first_game', '🎯', 'أول جولة', 'لعبت أول جولة مسجّلة', 'player', 'common'),

    first_win: milestone('first_win', '👑', 'بطل الجولة', 'حققت المركز الأول', 'player', 'common'),
    wins_3: milestone('wins_3', '🏆', 'بطل متكرر', '3 مرات الأول', 'player', 'common'),
    wins_5: milestone('wins_5', '🔥', 'ساحة حارقة', '5 مرات الأول', 'player', 'rare'),
    wins_10: milestone('wins_10', '⚔️', 'محارب شرس', '10 مرات الأول', 'player', 'rare'),
    wins_25: milestone('wins_25', '🦁', 'أسد الساحة', '25 مرة الأول', 'player', 'epic'),
    wins_50: milestone('wins_50', '🦅', 'نسر البطولة', '50 مرة الأول', 'player', 'epic'),
    wins_100: milestone('wins_100', '👁️', 'أسطورة الميدان', '100 مرة الأول', 'player', 'legendary'),
    wins_200: milestone('wins_200', '🌌', 'أسطورة خالدة', '200 مرة الأول', 'player', 'legendary'),

    podium: milestone('podium', '🥈', 'على المنصة', 'حققت مركزاً متقدماً', 'player', 'common'),
    podiums_5: milestone('podiums_5', '🥉', 'منصّة متكررة', '5 مرات في أفضل 3', 'player', 'common'),
    podiums_10: milestone('podiums_10', '🎖️', 'منافس دائم', '10 مرات في أفضل 3', 'player', 'rare'),
    podiums_25: milestone('podiums_25', '🏅', 'نجم المنصة', '25 مرة في أفضل 3', 'player', 'epic'),
    podiums_50: milestone('podiums_50', '💠', 'ملك المنصة', '50 مرة في أفضل 3', 'player', 'legendary'),

    games_5: milestone('games_5', '🎲', 'لاعب نشيط', '5 جولات لعب', 'player', 'common'),
    games_10: milestone('games_10', '🃏', 'محب الألعاب', '10 جولات لعب', 'player', 'common'),
    games_25: milestone('games_25', '🎪', 'روح الساحة', '25 جولة لعب', 'player', 'rare'),
    games_50: milestone('games_50', '🎭', 'وجه مألوف', '50 جولة لعب', 'player', 'rare'),
    games_100: milestone('games_100', '🛡️', 'محارب مخضرم', '100 جولة لعب', 'player', 'epic'),
    games_200: milestone('games_200', '⚡', 'أسطورة اللعب', '200 جولة لعب', 'player', 'epic'),
    games_500: milestone('games_500', '🌠', 'أسطورة لا تُشبع', '500 جولة لعب', 'player', 'legendary'),

    play_titles: milestone('play_titles', '🏷️', 'لاعب الألقاب', 'أول جولة في الألقاب', 'player', 'common'),
    play_fameeri: milestone('play_fameeri', '🧠', 'لاعب القميري', 'أول جولة في القميري', 'player', 'common'),
    play_hesbah: milestone('play_hesbah', '🎯', 'لاعب حسابة', 'أول جولة في حسابة', 'player', 'common'),

    vet_titles_10: milestone('vet_titles_10', '📛', 'خبير الألقاب', '10 جولات ألقاب', 'player', 'rare'),
    vet_fameeri_10: milestone('vet_fameeri_10', '🧩', 'خبير القميري', '10 جولات قميري', 'player', 'rare'),
    vet_hesbah_10: milestone('vet_hesbah_10', '🔢', 'خبير حسابة', '10 جولات حسابة', 'player', 'rare'),

    vet_titles_25: milestone('vet_titles_25', '🏷️', 'أسطورة الألقاب', '25 جولة ألقاب', 'player', 'epic'),
    vet_fameeri_25: milestone('vet_fameeri_25', '🧠', 'أسطورة القميري', '25 جولة قميري', 'player', 'epic'),
    vet_hesbah_25: milestone('vet_hesbah_25', '🎯', 'أسطورة حسابة', '25 جولة حسابة', 'player', 'epic'),

    master_titles: milestone('master_titles', '👑', 'ملك الألقاب', '50 جولة ألقاب', 'player', 'legendary'),
    master_fameeri: milestone('master_fameeri', '💎', 'ملك القميري', '50 جولة قميري', 'player', 'legendary'),
    master_hesbah: milestone('master_hesbah', '🏹', 'ملك حسابة', '50 جولة حسابة', 'player', 'legendary'),

    triple_crown: milestone('triple_crown', '🔱', 'التاج الثلاثي', 'فزت مرة في كل لعبة', 'player', 'epic'),

    host_rookie: milestone('host_rookie', '🎛️', 'مضيف مبتدئ', 'أنهيت أول جلسة كمشرف', 'host', 'common'),
    host_5: milestone('host_5', '📋', 'مضيف نشيط', '5 جلسات استضافة', 'host', 'common'),
    host_pro: milestone('host_pro', '📣', 'مضيف محترف', '10 جلسات استضافة', 'host', 'rare'),
    host_25: milestone('host_25', '🎙️', 'مضيف بارز', '25 جلسة استضافة', 'host', 'rare'),
    host_50: milestone('host_50', '🎬', 'مخرج الساحة', '50 جلسة استضافة', 'host', 'epic'),
    host_100: milestone('host_100', '🏛️', 'سفير الساحة', '100 جلسة استضافة', 'host', 'epic'),
    host_200: milestone('host_200', '🌟', 'أسطورة الاستضافة', '200 جلسة استضافة', 'host', 'legendary'),
    host_500: milestone('host_500', '👁️', 'حاكم الساحة', '500 جلسة استضافة', 'host', 'legendary'),

    host_players_50: milestone('host_players_50', '👥', 'جمع صغير', 'استضفت 50 لاعباً', 'host', 'common'),
    host_players_200: milestone('host_players_200', '🤝', 'جمع كبير', 'استضفت 200 لاعباً', 'host', 'rare'),
    host_players_500: milestone('host_players_500', '🏟️', 'ساحة مزدحمة', 'استضفت 500 لاعباً', 'host', 'epic'),
    host_players_1000: milestone('host_players_1000', '🌍', 'مجتمع الساحة', 'استضفت 1,000 لاعب', 'host', 'epic'),
    host_players_2500: milestone('host_players_2500', '🛸', 'ساحة عالمية', 'استضفت 2,500 لاعب', 'host', 'legendary'),
    host_players_5000: milestone('host_players_5000', '🌌', 'إمبراطور الساحة', 'استضفت 5,000 لاعب', 'host', 'legendary'),

    crowd_8: milestone('crowd_8', '🎉', 'جلسة حماسية', '8+ لاعبين في جلسة', 'host', 'common'),
    crowd_10: milestone('crowd_10', '🔊', 'جلسة صاخبة', '10+ لاعبين في جلسة', 'host', 'rare'),
    crowd_15: milestone('crowd_15', '📢', 'جلسة ضخمة', '15+ لاعبين في جلسة', 'host', 'epic'),
    crowd_20: milestone('crowd_20', '🎆', 'جلسة أسطورية', '20 لاعباً في جلسة', 'host', 'legendary'),

    host_rounds_25: milestone('host_rounds_25', '🔄', 'مشرف مثابر', '25 جولة استضافة', 'host', 'common'),
    host_rounds_100: milestone('host_rounds_100', '♾️', 'ماراثون الجولات', '100 جولة استضافة', 'host', 'rare'),
    host_rounds_500: milestone('host_rounds_500', '📊', 'أسطورة الجولات', '500 جولة استضافة', 'host', 'epic'),
    host_rounds_1000: milestone('host_rounds_1000', '🗂️', 'أرشيف الساحة', '1,000 جولة استضافة', 'host', 'legendary'),

    host_all_games: milestone('host_all_games', '🎪', 'مشرف شامل', 'استضفت كل الألعاب', 'host', 'epic'),
    host_marathon: milestone('host_marathon', '⏱️', 'ماراثون المشرف', 'جلسة 30+ دقيقة', 'host', 'rare'),
    host_epic: milestone('host_epic', '🌙', 'ليلة الساحة', 'جلسة 60+ دقيقة', 'host', 'legendary'),

    hosted_titles_10: milestone('hosted_titles_10', '🏷️', 'مشرف الألقاب', '10 جلسات ألقاب', 'host', 'rare'),
    hosted_fameeri_10: milestone('hosted_fameeri_10', '🧠', 'مشرف القميري', '10 جلسات قميري', 'host', 'rare'),
    hosted_hesbah_10: milestone('hosted_hesbah_10', '🎯', 'مشرف حسابة', '10 جلسات حسابة', 'host', 'rare'),

    points_100: milestone('points_100', '✨', 'بداية التألق', '100 نقطة ساحة', 'points', 'common'),
    silver_tier: milestone('silver_tier', '⚪', 'مستوى فضي', '500 نقطة — إطار فضي', 'points', 'rare'),
    points_1000: milestone('points_1000', '💫', 'ألف نقطة', '1,000 نقطة ساحة', 'points', 'rare'),
    gold_tier: milestone('gold_tier', '🥇', 'مستوى ذهبي', '1,500 نقطة — إطار ذهبي', 'points', 'epic'),
    points_2500: milestone('points_2500', '🔮', 'نقاط ماسية', '2,500 نقطة ساحة', 'points', 'epic'),
    legend_tier: milestone('legend_tier', '💫', 'أسطورة الساحة', '3,000 نقطة — إطار أسطوري', 'points', 'legendary'),
    points_5000: milestone('points_5000', '🌟', 'خمسة آلاف', '5,000 نقطة ساحة', 'points', 'legendary'),
    points_10000: milestone('points_10000', '🌌', 'عشرة آلاف', '10,000 نقطة ساحة', 'points', 'legendary'),

    login_7: milestone('login_7', '📅', 'أسبوع معنا', '7 زيارات للساحة', 'loyalty', 'common'),
    login_30: milestone('login_30', '🗓️', 'شهر وفاء', '30 زيارة للساحة', 'loyalty', 'rare'),
    login_100: milestone('login_100', '💎', 'وفاء ذهبي', '100 زيارة للساحة', 'loyalty', 'epic'),
    login_365: milestone('login_365', '🏆', 'سنة في الساحة', '365 زيارة للساحة', 'loyalty', 'legendary'),

    weekly_star: milestone('weekly_star', '⭐', 'نجم الأسبوع', 'دخلت أفضل 3 هذا الأسبوع', 'loyalty', 'epic'),
  };

  return map;
}

/** @type {Record<string, ArenaAchievementDef>} */
export const ARENA_ACHIEVEMENTS = buildAchievementCatalog();

export const ARENA_ACHIEVEMENT_LIST = Object.values(ARENA_ACHIEVEMENTS);

const TIER_ORDER = Object.fromEntries(
  [...ARENA_TIER_THRESHOLDS].reverse().map((t, i) => [t.id, i])
);

export function tierRank(tierId) {
  return TIER_ORDER[tierId] ?? 0;
}

export function didTierUpgrade(prevTier, nextTier) {
  return tierRank(nextTier) > tierRank(prevTier || 'bronze');
}

function normalizeGameType(gameType) {
  if (!gameType) return null;
  return gameType === 'sniper' ? 'hesbah' : gameType;
}

function readTypeCount(obj, type) {
  if (!type) return 0;
  return Number(obj?.[type]) || 0;
}

/** @returns {ReturnType<typeof getArenaStatsFromProfile>} */
export function getArenaStatsFromProfile(profile = {}) {
  return {
    wins: Number(profile.wins) || 0,
    podiums: Number(profile.podiums) || 0,
    gamesPlayed: Number(profile.gamesPlayed) || 0,
    gamesByType: {
      titles: readTypeCount(profile.gamesByType, 'titles'),
      fameeri: readTypeCount(profile.gamesByType, 'fameeri'),
      hesbah: readTypeCount(profile.gamesByType, 'hesbah'),
    },
    winsByType: {
      titles: readTypeCount(profile.winsByType, 'titles'),
      fameeri: readTypeCount(profile.winsByType, 'fameeri'),
      hesbah: readTypeCount(profile.winsByType, 'hesbah'),
    },
    gamesHosted: Number(profile.gamesHosted) || 0,
    totalPlayersHosted: Number(profile.totalPlayersHosted) || 0,
    maxPlayersInSession: Number(profile.maxPlayersInSession) || 0,
    totalRoundsHosted: Number(profile.totalRoundsHosted) || 0,
    maxSessionMinutes: Number(profile.maxSessionMinutes) || 0,
    hostedByType: {
      titles: readTypeCount(profile.hostedByType, 'titles'),
      fameeri: readTypeCount(profile.hostedByType, 'fameeri'),
      hesbah: readTypeCount(profile.hostedByType, 'hesbah'),
    },
    arenaPoints: Number(profile.arenaPoints) || 0,
    totalLogins: Number(profile.totalLogins) || 0,
  };
}

/**
 * كل الإنجازات المستحقة حسب الإحصائيات الحالية
 * @param {object} profile
 */
export function computeEligibleAchievements(profile = {}) {
  const s = getArenaStatsFromProfile(profile);
  const ids = [];

  const reach = (id, ok) => {
    if (ok && ARENA_ACHIEVEMENTS[id]) ids.push(id);
  };

  reach('first_game', s.gamesPlayed >= 1);

  reach('first_win', s.wins >= 1);
  reach('wins_3', s.wins >= 3);
  reach('wins_5', s.wins >= 5);
  reach('wins_10', s.wins >= 10);
  reach('wins_25', s.wins >= 25);
  reach('wins_50', s.wins >= 50);
  reach('wins_100', s.wins >= 100);
  reach('wins_200', s.wins >= 200);

  reach('podium', s.podiums >= 1);
  reach('podiums_5', s.podiums >= 5);
  reach('podiums_10', s.podiums >= 10);
  reach('podiums_25', s.podiums >= 25);
  reach('podiums_50', s.podiums >= 50);

  reach('games_5', s.gamesPlayed >= 5);
  reach('games_10', s.gamesPlayed >= 10);
  reach('games_25', s.gamesPlayed >= 25);
  reach('games_50', s.gamesPlayed >= 50);
  reach('games_100', s.gamesPlayed >= 100);
  reach('games_200', s.gamesPlayed >= 200);
  reach('games_500', s.gamesPlayed >= 500);

  reach('play_titles', s.gamesByType.titles >= 1);
  reach('play_fameeri', s.gamesByType.fameeri >= 1);
  reach('play_hesbah', s.gamesByType.hesbah >= 1);

  reach('vet_titles_10', s.gamesByType.titles >= 10);
  reach('vet_fameeri_10', s.gamesByType.fameeri >= 10);
  reach('vet_hesbah_10', s.gamesByType.hesbah >= 10);

  reach('vet_titles_25', s.gamesByType.titles >= 25);
  reach('vet_fameeri_25', s.gamesByType.fameeri >= 25);
  reach('vet_hesbah_25', s.gamesByType.hesbah >= 25);

  reach('master_titles', s.gamesByType.titles >= 50);
  reach('master_fameeri', s.gamesByType.fameeri >= 50);
  reach('master_hesbah', s.gamesByType.hesbah >= 50);

  reach(
    'triple_crown',
    s.winsByType.titles >= 1 && s.winsByType.fameeri >= 1 && s.winsByType.hesbah >= 1
  );

  reach('host_rookie', s.gamesHosted >= 1);
  reach('host_5', s.gamesHosted >= 5);
  reach('host_pro', s.gamesHosted >= 10);
  reach('host_25', s.gamesHosted >= 25);
  reach('host_50', s.gamesHosted >= 50);
  reach('host_100', s.gamesHosted >= 100);
  reach('host_200', s.gamesHosted >= 200);
  reach('host_500', s.gamesHosted >= 500);

  reach('host_players_50', s.totalPlayersHosted >= 50);
  reach('host_players_200', s.totalPlayersHosted >= 200);
  reach('host_players_500', s.totalPlayersHosted >= 500);
  reach('host_players_1000', s.totalPlayersHosted >= 1000);
  reach('host_players_2500', s.totalPlayersHosted >= 2500);
  reach('host_players_5000', s.totalPlayersHosted >= 5000);

  reach('crowd_8', s.maxPlayersInSession >= 8);
  reach('crowd_10', s.maxPlayersInSession >= 10);
  reach('crowd_15', s.maxPlayersInSession >= 15);
  reach('crowd_20', s.maxPlayersInSession >= 20);

  reach('host_rounds_25', s.totalRoundsHosted >= 25);
  reach('host_rounds_100', s.totalRoundsHosted >= 100);
  reach('host_rounds_500', s.totalRoundsHosted >= 500);
  reach('host_rounds_1000', s.totalRoundsHosted >= 1000);

  reach(
    'host_all_games',
    s.hostedByType.titles >= 1 && s.hostedByType.fameeri >= 1 && s.hostedByType.hesbah >= 1
  );
  reach('host_marathon', s.maxSessionMinutes >= 30);
  reach('host_epic', s.maxSessionMinutes >= 60);

  reach('hosted_titles_10', s.hostedByType.titles >= 10);
  reach('hosted_fameeri_10', s.hostedByType.fameeri >= 10);
  reach('hosted_hesbah_10', s.hostedByType.hesbah >= 10);

  reach('points_100', s.arenaPoints >= 100);
  reach('silver_tier', s.arenaPoints >= 500);
  reach('points_1000', s.arenaPoints >= 1000);
  reach('gold_tier', s.arenaPoints >= 1500);
  reach('points_2500', s.arenaPoints >= 2500);
  reach('legend_tier', s.arenaPoints >= 3000);
  reach('points_5000', s.arenaPoints >= 5000);
  reach('points_10000', s.arenaPoints >= 10000);

  reach('login_7', s.totalLogins >= 7);
  reach('login_30', s.totalLogins >= 30);
  reach('login_100', s.totalLogins >= 100);
  reach('login_365', s.totalLogins >= 365);

  return ids;
}

/**
 * يحدد إنجازات جديدة بناءً على الحالة بعد منح النقاط
 * @param {object} prev — ملف profile السابق
 * @param {object} next — القيم المحسوبة بعد المنح
 */
export function detectNewAchievements(prev = {}, next = {}, meta = {}) {
  const existing = new Set(Array.isArray(prev.achievements) ? prev.achievements : []);
  const eligible = computeEligibleAchievements(next);
  const found = [];

  for (const id of eligible) {
    if (existing.has(id) || found.includes(id)) continue;
    found.push(id);
  }

  if (meta.grantMember && !existing.has('member') && !found.includes('member')) {
    found.unshift('member');
  }

  return found;
}

export function achievementDefsForIds(ids = []) {
  return ids.map((id) => ARENA_ACHIEVEMENTS[id]).filter(Boolean);
}

export function countAchievementsByCategory(unlockedIds = [], category = 'all') {
  const unlocked = new Set(unlockedIds);
  const list =
    category === 'all'
      ? ARENA_ACHIEVEMENT_LIST
      : ARENA_ACHIEVEMENT_LIST.filter((a) => a.category === category);
  const open = list.filter((a) => unlocked.has(a.id)).length;
  return { open, total: list.length };
}

/** يحسب دلتا الإحصائيات عند منح نقاط */
export function computeArenaStatDelta(prev = {}, meta = {}) {
  const type = normalizeGameType(meta.gameType);
  const delta = {};

  if (meta.type === 'player_rank') {
    delta.gamesPlayed = (Number(prev.gamesPlayed) || 0) + 1;
    delta.gamesByType = {
      titles: readTypeCount(prev.gamesByType, 'titles'),
      fameeri: readTypeCount(prev.gamesByType, 'fameeri'),
      hesbah: readTypeCount(prev.gamesByType, 'hesbah'),
    };
    if (type && delta.gamesByType[type] != null) {
      delta.gamesByType[type] += 1;
    }

    const rank = Number(meta.rank);
    if (rank === 1) {
      delta.wins = (Number(prev.wins) || 0) + 1;
      delta.winsByType = {
        titles: readTypeCount(prev.winsByType, 'titles'),
        fameeri: readTypeCount(prev.winsByType, 'fameeri'),
        hesbah: readTypeCount(prev.winsByType, 'hesbah'),
      };
      if (type && delta.winsByType[type] != null) {
        delta.winsByType[type] += 1;
      }
    }
    if (rank >= 1 && rank <= 3) {
      delta.podiums = (Number(prev.podiums) || 0) + 1;
    }
  }

  if (meta.type === 'host_complete') {
    const pc = Math.max(0, Number(meta.playerCount) || 0);
    const rounds = Math.max(0, Number(meta.totalRounds) || 0);
    const dur = Math.max(0, Number(meta.durationMinutes) || 0);

    delta.gamesHosted = (Number(prev.gamesHosted) || 0) + 1;
    delta.totalPlayersHosted = (Number(prev.totalPlayersHosted) || 0) + pc;
    delta.maxPlayersInSession = Math.max(Number(prev.maxPlayersInSession) || 0, pc);
    delta.totalRoundsHosted = (Number(prev.totalRoundsHosted) || 0) + rounds;
    delta.maxSessionMinutes = Math.max(Number(prev.maxSessionMinutes) || 0, dur);
    delta.hostedByType = {
      titles: readTypeCount(prev.hostedByType, 'titles'),
      fameeri: readTypeCount(prev.hostedByType, 'fameeri'),
      hesbah: readTypeCount(prev.hostedByType, 'hesbah'),
    };
    if (type && delta.hostedByType[type] != null) {
      delta.hostedByType[type] += 1;
    }
  }

  return delta;
}
