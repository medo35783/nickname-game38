import { mkInitials } from '../../core/helpers';
import { QSOURCE } from '../../question-bank/questionSession';

/** هوية حَسْبة — برتقالي/أزرق (مستقل عن القميري). للـ inline يُستخدم لون النهار؛ CSS يبدّل تلقائياً */
export const HESBAH_THEME = {
  accent: '#e65100',
  accentLight: '#ff8f00',
  secondary: '#1565c0',
  secondaryLight: '#42a5f5',
  gold: '#f9a825',
  accentDark: '#ffab00',
  secondaryDark: '#00e5ff',
};

export const HESBAH_ACCENT = HESBAH_THEME.accent;
/** يتبع الوضع النهاري/الليلي عبر CSS */
export const HESBAH_ACCENT_CSS = 'var(--hesbah-accent)';
export const HESBAH_GLOW_CSS = 'var(--hesbah-glow)';
export const HESBAH_BORDER_CSS = 'var(--hesbah-border)';
export const HESBAH_SCORE_BG_CSS = 'var(--hesbah-score-bg)';
export const HESBAH_STORAGE_KEY = 'ng_hesbah';
export const QB_GAME_TYPE = 'hesbah';

/** مفتاح سجل الأسئلة المستخدمة — يعتمد على التصنيفات والفلاتر المختارة. */
export function hesbahBankFilterKey({ categories = [], audience = '', difficulty = '' } = {}) {
  const cats = [...categories].sort().join(',');
  return `hesbah|${cats}|${audience || 'all'}|${difficulty || 'all'}`;
}

export const HESBAH_BRAND = {
  title: 'حَسْبة',
  tagline: 'حَسْبة ذكية — رهانك يحدد مصيرك',
  emoji: '🎯',
  arena: 'ساحة الألعاب',
};

/** تقدم الجولات (نفس عدد الأسئلة — المصطلح «جولة» في الواجهة) */
export function hesbahRoundDisplay(currentQ, totalQ) {
  const total = Number(totalQ) || 0;
  const cur = Number(currentQ) || 0;
  if (!total) return null;
  if (cur > 0) {
    return { value: `${cur}/${total}`, label: 'جولة', phase: 'playing' };
  }
  return { value: String(total), label: 'جولات اللعبة', phase: 'planned' };
}

/** تاريخ ووقت الجلسة — عربي للترويج والمشاركة */
export function formatHesbahDateTime(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return date.toLocaleString('ar-SA');
  }
}

export function sortedHesbahPlayers(players) {
  return Object.entries(players || {})
    .map(([id, p]) => ({ ...p, id }))
    .filter((p) => !p.isHost && isActiveHesbahPlayer(p))
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
}

export const TOTAL_Q_OPTIONS = [15, 20, 25, 30];
export const FINAL_VOTE_OPTIONS = [5, 10, 15, 20];
export const DEFAULT_QUESTION_SECS = 20;
export const TIMER_PRESET_SECS = [20, 30, 45, 60];
export const MIN_QUESTION_SECS = 5;
export const MAX_QUESTION_SECS = 300;
export const LIGHTNING_QUESTION_SECONDS = 5;
export const SPEED_QUESTION_SECONDS = 10;
export const FINAL_VOTE_SECONDS = 15;

/** أدوات الإثارة — للمشرف (كرت واحد نشط لكل جولة — بعد بدء المؤقت) */
export const HESBAH_SPECIAL_TOOLS = [
  {
    id: 'risk2x',
    icon: '🔥',
    title: 'كرت خطر 2X',
    tag: '2X−',
    short: 'خطأ أو تكرار = ضعف الخصم',
    desc: 'الإجابة الخاطئة أو المكررة تخصم ضعف نقاط درجتك — النار أكثر توهجاً!',
  },
  {
    id: 'risk',
    icon: '🔥',
    title: 'كرت خطر',
    tag: '±نقاط',
    short: 'خطأ أو تكرار = خصم الدرجة',
    desc: 'الإجابة الخاطئة أو المكررة تخصم نقاط الدرجة التي راهنت بها من مجموعك.',
  },
  {
    id: 'triple',
    icon: '💎',
    title: 'كرت ثلاثي',
    tag: 'X3',
    short: 'ثلاثة أضعاف الدرجة',
    desc: 'كل إجابة صحيحة تُحسب بثلاثة أضعاف الدرجة المختارة.',
  },
  {
    id: 'lucky',
    icon: '🎲',
    title: 'كرت حظ',
    tag: 'عشوائي',
    short: 'درجة تُسحب عند الإرسال',
    desc: 'لا يختار اللاعب درجته — النظام يسحب عشوائياً من درجاته المتبقية لحظة الإرسال.',
  },
  {
    id: 'siege',
    icon: '⚔️',
    title: 'كرت حصار',
    tag: 'عالي',
    short: 'أعلى درجة عالية تلقائياً',
    desc: 'لا يختار اللاعب درجته — عند الإرسال تُفرض أعلى درجة متبقية من الدرجات العالية.',
  },
  {
    id: 'dark',
    icon: '🕶️',
    title: 'كرت ظلام',
    tag: 'إخفاء',
    short: 'لا نتائج فورية',
    desc: 'لا تظهر البطاقات الحية للمتسابقين حتى ينتهي وقت الجولة.',
  },
];

/** أدوات المتسابق — مرة واحدة طيلة المسابقة */
export const HESBAH_PLAYER_POWERS = [
  {
    id: 'shield',
    icon: '🛡️',
    label: 'درع',
    timing: 'قبل الإرسال',
    tip: 'حماية من التكرار مع لاعب واحد',
    desc: 'إذا تكررت إجابتك مع شخص واحد فقط — تُحمى. أكثر من ذلك يُستهلك الدرع بلا حماية.',
  },
  {
    id: 'edit',
    icon: '✏️',
    label: 'تعديل',
    timing: 'بعد الإرسال',
    tip: 'غيّر إجابتك مرة واحدة',
    desc: 'غيّر إجابتك مرة بعد الإرسال قبل انتهاء المؤقت.',
  },
  {
    id: 'confidence',
    icon: '💪',
    label: 'ثقة',
    tag: 'X2',
    timing: 'قبل الإرسال',
    tip: 'صح = درجتك ×2',
    desc: 'إذا كانت إجابتك صحيحة — الدرجة المختارة ×2.',
  },
];

export const HESBAH_SPECIAL_LABELS = Object.fromEntries(
  HESBAH_SPECIAL_TOOLS.map((tool) => [tool.id, tool.title])
);

export function specialRoundTimerSecs() {
  return null;
}

export function isFixedTimerSpecial() {
  return false;
}

export function isScorelessPickSpecial(specialRound) {
  return specialRound === 'lucky' || specialRound === 'siege';
}

export function isDarkRound(specialRound) {
  return specialRound === 'dark';
}

export function allContestantsSubmitted(players, answers) {
  const contestants = Object.entries(players || {}).filter(
    ([, p]) => !p?.isHost && isActiveHesbahPlayer(p)
  );
  if (!contestants.length) return false;
  return contestants.every(([id, p]) => {
    const row = answers?.[id];
    return !!(row?.answer?.trim() || p.submitted);
  });
}

/** انتهى وقت الجولة (المؤقت توقّف) */
export function isTimerEnded(game) {
  return !!(game?.deadline && game.deadline <= Date.now());
}

/** البطاقات الحية للمتسابقين — كرت ظلام يخفيها حتى انتهاء وقت الجولة */
export function shouldRevealLiveFeed(game) {
  if (!isDarkRound(game?.specialRound)) return true;
  if (game?.phase === 'grading' || game?.phase === 'roundResult' || game?.phase === 'leaderboard') {
    return true;
  }
  if (game?.phase !== 'question') return true;
  if (isTimerWaiting(game)) return false;
  if (isTimerRunning(game)) return false;
  return isTimerEnded(game);
}

export function siegeMinScore(totalQ) {
  return Math.ceil((Number(totalQ) || 15) / 2);
}

export function pickRandomAvailableScore(board, totalQ) {
  const list = pickAvailableScores(board, totalQ);
  if (!list.length) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function pickHighestAvailableScore(board, totalQ, minScore = 1) {
  const list = pickAvailableScores(board, totalQ).filter((s) => s >= minScore);
  if (!list.length) return null;
  return Math.max(...list);
}
export const HOT_STREAK_START_Q = 6;
export const HOT_STREAK_NEED = 3;
export const HOT_STREAK_BONUS = 5;

export const BOARD_CELL = {
  AVAILABLE: 'available',
  USED: 'used',
  WON: 'won',
  DOUBLE_WON: 'double_won',
  TRIPLE_WON: 'triple_won',
  BURNED: 'burned',
  TIMEOUT: 'timeout',
};

/** وصف خلية اللوحة للعرض والـ CSS — الرقم يبقى ظاهراً والشارة توضّح الحالة */
export function boardCellMeta(state) {
  switch (state) {
    case BOARD_CELL.USED:
      return { className: 'hesbah-score-btn--pending', badge: '···', title: 'بانتظار التصحيح' };
    case BOARD_CELL.WON:
      return { className: 'hesbah-score-btn--won', badge: '✓', title: 'إجابة صحيحة!' };
    case BOARD_CELL.DOUBLE_WON:
      return { className: 'hesbah-score-btn--double', badge: '×2', title: 'صحيح — درجة مضاعفة!' };
    case BOARD_CELL.TRIPLE_WON:
      return { className: 'hesbah-score-btn--triple', badge: '×3', title: 'صحيح — ثلاثي!' };
    case BOARD_CELL.BURNED:
      return { className: 'hesbah-score-btn--burned', badge: '✕', title: 'إجابة خاطئة' };
    case BOARD_CELL.TIMEOUT:
      return { className: 'hesbah-score-btn--timeout', badge: '⏱', title: 'انتهى الوقت — لم تُرسل' };
    default:
      return { className: '', badge: null, title: 'متاحة' };
  }
}

export function isBoardCellSelectable(state) {
  return state === BOARD_CELL.AVAILABLE;
}

export function readSavedHesbah() {
  try {
    let raw = localStorage.getItem(HESBAH_STORAGE_KEY);
    if (!raw) raw = localStorage.getItem('ng_sniper');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function persistHesbahSession(patch) {
  const next = { ...readSavedHesbah(), ...patch };
  localStorage.setItem(HESBAH_STORAGE_KEY, JSON.stringify(next));
}

export function clearHesbahSession() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(HESBAH_STORAGE_KEY);
    localStorage.removeItem('ng_sniper');
  } catch {
    /* ignore */
  }
}

/** لاعب نشط — لم ينسحب من الغرفة */
export function isActiveHesbahPlayer(player) {
  return !!(player && !player.left && String(player.name || '').trim());
}

export function findActivePlayerByName(players, name) {
  const norm = String(name || '').trim();
  if (!norm) return null;
  return (
    Object.entries(players || {}).find(([, p]) => isActiveHesbahPlayer(p) && p.name?.trim() === norm) ||
    null
  );
}

export function findLeftPlayerByName(players, name) {
  const norm = String(name || '').trim();
  if (!norm) return null;
  return (
    Object.entries(players || {}).find(([, p]) => p?.left && p.name?.trim() === norm) || null
  );
}

export function buildScoreBoard(totalQ) {
  const board = {};
  for (let i = 1; i <= totalQ; i += 1) {
    board[String(i)] = BOARD_CELL.AVAILABLE;
  }
  return board;
}

export function hesbahPlayerPayload(name, colorIdx) {
  const idx = Number(colorIdx) || 0;
  return {
    name: name.trim(),
    avatar: String(idx),
    colorIdx: idx,
    initials: mkInitials(name),
    board: {},
    totalScore: 0,
    consecutiveCorrect: 0,
    isOnFire: false,
    shieldUsed: false,
    editUsed: false,
    confidenceUsed: false,
    submittedAnswer: null,
    chosenScore: null,
    shieldActive: false,
    confidenceActive: false,
    submitted: false,
  };
}

export function applyBoardToPlayers(players, totalQ) {
  const board = buildScoreBoard(totalQ);
  const out = {};
  Object.entries(players || {}).forEach(([id, p]) => {
    out[id] = {
      ...p,
      board: { ...board, ...(p.board || {}) },
    };
  });
  return out;
}

export function countdownColor(rem, max) {
  const ratio = rem / max;
  if (ratio > 0.5) return '#22c55e';
  if (ratio > 0.25) return '#eab308';
  return '#ef4444';
}

function parseSecs(value) {
  const n = parseInt(value, 10);
  if (n >= MIN_QUESTION_SECS && n <= MAX_QUESTION_SECS) return n;
  return null;
}

/** مدة السؤال الحالي: تخصيص الجولة ← الافتراضي من اللوبي */
export function resolveQuestionSecs(game) {
  const fixedTimer = specialRoundTimerSecs(game?.specialRound);
  if (fixedTimer) return fixedTimer;
  const round = parseSecs(game?.roundSecs);
  if (round) return round;
  const def = parseSecs(game?.questionSecs);
  if (def) return def;
  return DEFAULT_QUESTION_SECS;
}

export function activeRoundSecs(game) {
  const fixedTimer = specialRoundTimerSecs(game?.specialRound);
  if (fixedTimer) return fixedTimer;
  return parseSecs(game?.roundSecs) ?? parseSecs(game?.questionSecs) ?? DEFAULT_QUESTION_SECS;
}

/** مدة سؤال الجولة (ثوانٍ) — جولة السرعة ثابتة 10ث */
export function questionDurationSec(game) {
  if (!game || typeof game === 'string') {
    if (game === 'lightning') return LIGHTNING_QUESTION_SECONDS;
    if (game === 'speed') return SPEED_QUESTION_SECONDS;
    return DEFAULT_QUESTION_SECS;
  }
  return resolveQuestionSecs(game);
}

export function clampCustomQuestionSecs(value) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return null;
  return Math.min(MAX_QUESTION_SECS, Math.max(MIN_QUESTION_SECS, n));
}

/** المؤقت لم يُطلَق بعد (المشرف لم يضغط «بدء المؤقت») */
export function isTimerWaiting(game) {
  return game?.phase === 'question' && !game?.deadline;
}

/** المؤقت يعمل الآن */
export function isTimerRunning(game) {
  return !!(game?.deadline && game.deadline > Date.now());
}

/** مصدر «الأسئلة معي فقط» — شفهي دائماً */
export function isHesbahExternalSource(game) {
  return game?.questionSource === QSOURCE.EXTERNAL;
}

/** نص السؤال على جهاز المتسابق (مع إصلاح غرف قديمة) */
export function hesbahResolvePlayerQuestionText(game) {
  const direct = (game?.questionText || '').trim();
  if (direct) return direct;
  if (game?.questionAdminOnly || isHesbahExternalSource(game)) return '';
  return (game?.hostQuestionText || '').trim();
}

/**
 * عرض السؤال للمتسابق:
 * - معي فقط / تمثيل → مخفي دائماً
 * - عميان → اختر درجة قبل المؤقت، ينكشف السؤال بعد البدء
 * - بنك/يدوي → ذهبي قبل المؤقت، النص بعد البدء
 */
export function hesbahPlayerQuestionView(game) {
  const blind = game?.specialRound === 'blind';
  const oral = isHesbahExternalSource(game);
  const hostOnly = oral || !!game?.questionAdminOnly;
  const text = hesbahResolvePlayerQuestionText(game);
  const timerActive = isTimerRunning(game);

  if (hostOnly) {
    return { mode: 'masked', oral, blind, text: '' };
  }

  if (!timerActive) {
    if (blind) {
      return { mode: 'blind-pick', blind: true, oral: false, text: '' };
    }
    if (!text) {
      return { mode: 'masked', oral: false, blind: false, text: '', reason: 'empty' };
    }
    return { mode: 'pending', oral: false, blind: false, text: '' };
  }

  if (!text) {
    return { mode: 'masked', oral: false, blind, text: '', reason: 'empty' };
  }
  return { mode: 'visible', oral: false, blind, text };
}

/** وسوم السؤال في لوحة المشرف */
export function hesbahHostQuestionFlags(game) {
  const external = isHesbahExternalSource(game);
  const adminOnly = !!game?.questionAdminOnly;
  const hasPlayerText = !!hesbahResolvePlayerQuestionText(game);
  return {
    oralHidden: external || adminOnly,
    revealsOnTimer: !external && !adminOnly && hasPlayerText,
  };
}

export function normalizeAnswer(text) {
  return (text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[؟?!.,،؛:]/g, '');
}

/** مطابقة أوسع — يتجاهل الأرقام الزائدة (مثل: تين ≈ تين 66) */
export function normalizeAnswerLoose(text) {
  return normalizeAnswer(text)
    .replace(/\s*\d+\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** مفتاح تجميع التكرار والمطابقة مع المشرف */
export function answerDedupeKey(text) {
  return normalizeAnswerLoose(text) || normalizeAnswer(text);
}

/** مقارنة إجابة متسابق مع مرجع المشرف */
export function compareToHostAnswer(playerAnswer, hostAnswer) {
  if (!hostAnswer?.trim() || !playerAnswer?.trim()) return null;
  if (normalizeAnswer(playerAnswer) === normalizeAnswer(hostAnswer)) return 'exact';
  if (normalizeAnswerLoose(playerAnswer) === normalizeAnswerLoose(hostAnswer)) return 'similar';
  return null;
}

export function groupDuplicateAnswers(answersMap, players, hostAnswer = null) {
  const buckets = {};
  const pushItem = (item) => {
    const key = answerDedupeKey(item.answer);
    if (!key) return;
    if (!buckets[key]) {
      buckets[key] = { answer: item.answer, dedupeKey: key, items: [] };
    }
    buckets[key].items.push(item);
  };

  Object.entries(answersMap || {}).forEach(([pid, row]) => {
    pushItem({
      playerId: pid,
      name: players[pid]?.name || '—',
      answer: row?.answer,
      chosenScore: row.chosenScore,
      shieldActive: !!row.shieldActive,
      confidenceUsed: !!row.confidenceUsed,
      player: players[pid],
      isHost: false,
    });
  });

  if (hostAnswer?.answer?.trim()) {
    pushItem({
      playerId: '__host__',
      name: 'المشرف',
      answer: hostAnswer.answer,
      chosenScore: null,
      shieldActive: false,
      confidenceUsed: false,
      player: { name: 'المشرف', initials: '👑', colorIdx: 0 },
      isHost: true,
    });
  }

  return Object.values(buckets).filter((b) => b.items.length > 1);
}

/** الدرع يحمي عند التكرار مع شخص واحد فقط (مشرف أو لاعب آخر) */
export function shieldProtectsInDuplicateGroup(group) {
  return (group?.items?.length ?? 0) === 2;
}

export function isShieldProtectedDuplicate(row, group) {
  return !!row?.shieldActive && shieldProtectsInDuplicateGroup(group);
}

export function duplicateGroupShieldHint(group) {
  const shielded = (group?.items || []).filter((it) => !it.isHost && it.shieldActive);
  if (!shielded.length) return null;
  if (shieldProtectsInDuplicateGroup(group)) {
    const withHost = group.items.some((it) => it.isHost);
    return withHost
      ? '🛡️ تأمين مفعّل — تُحسب الدرجة رغم التكرار مع المشرف'
      : '🛡️ تأمين مفعّل — تُحسب الدرجة رغم التكرار';
  }
  return '🛡️ درع مفعّل — تكرار مع أكثر من شخص فلا حماية';
}

export function uniqueAnswerEntries(answersMap, players, duplicateKeys) {
  const dupSet = new Set(duplicateKeys);
  return Object.entries(answersMap || {})
    .filter(([pid, row]) => {
      const key = answerDedupeKey(row?.answer);
      return key && !dupSet.has(key);
    })
    .map(([pid, row]) => ({
      playerId: pid,
      answer: row.answer,
      chosenScore: row.chosenScore,
      shieldActive: !!row.shieldActive,
      confidenceUsed: !!row.confidenceUsed,
      player: players[pid],
    }));
}

export function computeFinalVoteWinner(votes) {
  const tally = { 5: 0, 10: 0, 15: 0, 20: 0 };
  Object.values(votes || {}).forEach((v) => {
    if (tally[v] !== undefined) tally[v] += 1;
  });
  let best = 10;
  let max = -1;
  FINAL_VOTE_OPTIONS.forEach((opt) => {
    if (tally[opt] > max) {
      max = tally[opt];
      best = opt;
    }
  });
  return best;
}

export function riskDeduction(base, specialRound) {
  if (specialRound === 'risk2x') return base * 2;
  if (specialRound === 'risk') return base;
  return 0;
}

export function isRiskSpecial(specialRound) {
  return specialRound === 'risk' || specialRound === 'risk2x';
}

export function gradedPoints(base, correct, specialRound, { confidenceUsed = false } = {}) {
  if (!correct) {
    return -riskDeduction(base, specialRound);
  }
  let mult = 1;
  if (specialRound === 'triple') mult = 3;
  let pts = base * mult;
  if (confidenceUsed) pts *= 2;
  return pts;
}

export function boardCellForCorrect(spec) {
  if (spec === 'triple') return BOARD_CELL.TRIPLE_WON;
  return BOARD_CELL.WON;
}

export function pickAvailableScores(board, totalQ) {
  const list = [];
  for (let i = 1; i <= totalQ; i += 1) {
    const st = board?.[String(i)] || board?.[i];
    if (isBoardCellSelectable(st)) list.push(i);
  }
  return list;
}

export function screenForPhase(phase, role) {
  if (phase === 'lobby') return 'lobby';
  if (phase === 'roundResult') return 'roundResult';
  if (phase === 'leaderboard') return 'leaderboard';
  if (phase === 'final') return 'final';
  if (role === 'admin' && (phase === 'question' || phase === 'grading')) return 'adminLive';
  if (phase === 'question' || phase === 'grading') return 'play';
  return 'lobby';
}
