import { mkInitials } from '../../core/helpers';

/** هوية قناص الدرجات — برتقالي/أزرق (مستقل عن القميري). للـ inline يُستخدم لون النهار؛ CSS يبدّل تلقائياً */
export const SNIPER_THEME = {
  accent: '#e65100',
  accentLight: '#ff8f00',
  secondary: '#1565c0',
  secondaryLight: '#42a5f5',
  gold: '#f9a825',
  accentDark: '#ffab00',
  secondaryDark: '#00e5ff',
};

export const SNIPER_ACCENT = SNIPER_THEME.accent;
/** يتبع الوضع النهاري/الليلي عبر CSS */
export const SNIPER_ACCENT_CSS = 'var(--sniper-accent)';
export const SNIPER_GLOW_CSS = 'var(--sniper-glow)';
export const SNIPER_BORDER_CSS = 'var(--sniper-border)';
export const SNIPER_SCORE_BG_CSS = 'var(--sniper-score-bg)';
export const SNIPER_STORAGE_KEY = 'ng_sniper';
export const QB_GAME_TYPE = 'sniper';

export const TOTAL_Q_OPTIONS = [15, 20, 25, 30];
export const FINAL_VOTE_OPTIONS = [5, 10, 15, 20];
export const DEFAULT_QUESTION_SECS = 20;
export const TIMER_PRESET_SECS = [20, 30, 45, 60];
export const MIN_QUESTION_SECS = 5;
export const MAX_QUESTION_SECS = 300;
export const SPEED_QUESTION_SECONDS = 10;
export const FINAL_VOTE_SECONDS = 15;

/** أدوات الإثارة — للمشرف (شرح + تفعيل) */
export const SNIPER_SPECIAL_TOOLS = [
  {
    id: 'blind',
    icon: '🙈',
    title: 'جولة عميان',
    tag: 'إخفاء',
    short: 'اللاعبون يرون التصنيف فقط',
    desc: 'يختفي نص السؤال عن الشاشة — يظهر التصنيف فقط. اقرأ السؤال بصوتك للجميع. ممتاز للمفاجأة أو الأسئلة السمعية.',
  },
  {
    id: 'speed',
    icon: '⚡',
    title: 'سرعة قصوى',
    tag: '10 ث',
    short: `مؤقت ثابت ${SPEED_QUESTION_SECONDS} ثوانٍ`,
    desc: `يُقفل مدة السؤال على ${SPEED_QUESTION_SECONDS} ثوانٍ مهما كانت الإعدادات. يضغط على اللاعبين ويرفع الإثارة.`,
  },
  {
    id: 'double',
    icon: '✖️2',
    title: 'كرت مضاعف',
    tag: '×2',
    short: 'ضعف نقاط الإجابة الصحيحة',
    desc: 'كل إجابة صحيحة تُحسب بضعف الدرجة التي اختارها اللاعب. الخطأ يبقى صفراً — لا يضاعف الخسارة.',
  },
];
export const HOT_STREAK_START_Q = 6;
export const HOT_STREAK_NEED = 3;
export const HOT_STREAK_BONUS = 5;

export const BOARD_CELL = {
  AVAILABLE: 'available',
  USED: 'used',
  BURNED: 'burned',
};

export function readSavedSniper() {
  try {
    const raw = localStorage.getItem(SNIPER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function persistSniperSession(patch) {
  const next = { ...readSavedSniper(), ...patch };
  localStorage.setItem(SNIPER_STORAGE_KEY, JSON.stringify(next));
}

export function buildScoreBoard(totalQ) {
  const board = {};
  for (let i = 1; i <= totalQ; i += 1) {
    board[String(i)] = BOARD_CELL.AVAILABLE;
  }
  return board;
}

export function sniperPlayerPayload(name, colorIdx) {
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
    insuranceLeft: 2,
    submittedAnswer: null,
    chosenScore: null,
    insuranceUsed: false,
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
  if (game?.specialRound === 'speed') return SPEED_QUESTION_SECONDS;
  const round = parseSecs(game?.roundSecs);
  if (round) return round;
  const def = parseSecs(game?.questionSecs);
  if (def) return def;
  return DEFAULT_QUESTION_SECS;
}

export function activeRoundSecs(game) {
  if (game?.specialRound === 'speed') return SPEED_QUESTION_SECONDS;
  return parseSecs(game?.roundSecs) ?? parseSecs(game?.questionSecs) ?? DEFAULT_QUESTION_SECS;
}

/** مدة سؤال الجولة (ثوانٍ) — جولة السرعة ثابتة 10ث */
export function questionDurationSec(game) {
  if (!game || typeof game === 'string') {
    return game === 'speed' ? SPEED_QUESTION_SECONDS : DEFAULT_QUESTION_SECS;
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

export function normalizeAnswer(text) {
  return (text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[؟?!.,،؛:]/g, '');
}

export function groupDuplicateAnswers(answersMap, players, hostAnswer = null) {
  const buckets = {};
  const pushItem = (item) => {
    const key = normalizeAnswer(item.answer);
    if (!key) return;
    if (!buckets[key]) buckets[key] = { answer: item.answer, items: [] };
    buckets[key].items.push(item);
  };

  Object.entries(answersMap || {}).forEach(([pid, row]) => {
    pushItem({
      playerId: pid,
      name: players[pid]?.name || '—',
      answer: row?.answer,
      chosenScore: row.chosenScore,
      insuranceUsed: !!row.insuranceUsed,
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
      insuranceUsed: false,
      player: { name: 'المشرف', initials: '👑', colorIdx: 0 },
      isHost: true,
    });
  }

  return Object.values(buckets).filter((b) => b.items.length > 1);
}

export function uniqueAnswerEntries(answersMap, players, duplicateKeys) {
  const dupSet = new Set(duplicateKeys);
  return Object.entries(answersMap || {})
    .filter(([pid, row]) => {
      const key = normalizeAnswer(row?.answer);
      return key && !dupSet.has(key);
    })
    .map(([pid, row]) => ({
      playerId: pid,
      answer: row.answer,
      chosenScore: row.chosenScore,
      insuranceUsed: !!row.insuranceUsed,
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

export function scoreMultiplier(specialRound) {
  return specialRound === 'double' ? 2 : 1;
}

export function gradedPoints(base, correct, specialRound, insuranceUsed) {
  const mult = scoreMultiplier(specialRound);
  if (!correct) return 0;
  if (insuranceUsed) return Math.floor((base * mult) / 2);
  return base * mult;
}

export function pickAvailableScores(board, totalQ) {
  const list = [];
  for (let i = 1; i <= totalQ; i += 1) {
    const st = board?.[String(i)] || board?.[i];
    if (st === BOARD_CELL.AVAILABLE) list.push(i);
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
