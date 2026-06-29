import { db } from '../firebase';
import { ref, push, update, get, query, orderByChild, equalTo } from 'firebase/database';

export const QB_CATEGORIES = [
  'religious',
  'geography',
  'plants',
  'animals',
  'sports',
  'acting_proverbs',
  'five_items',
  'general',
];

export const QB_DIFFICULTIES = ['easy', 'medium', 'hard'];

export const QB_TYPES = ['multiple_choice', 'true_false', 'open_question', 'written_text'];

export const QB_GAME_TYPES = ['qumayri', 'hesbah', 'all'];

/** ألعاب البنك في الواجهة — بدون الألقاب (لعبة تخمين، لا أسئلة) */
export const QB_BANK_GAME_TYPES = ['qumayri', 'hesbah', 'all'];

export const QB_AUDIENCES = ['general', 'family', 'kids'];

/** أسماء قديمة / بديلة → القيمة المعتمدة في البنك */
const QB_GAME_TYPE_ALIASES = {
  sniper: 'hesbah',
  qumairi: 'qumayri',
  nicknames: 'titles',
  fameeri: 'qumayri',
  'حسبة': 'hesbah',
  'حَسْبة': 'hesbah',
  'حَسبة': 'hesbah',
  'القميري': 'qumayri',
  'كل الألعاب': 'all',
};

/** أسئلة الألقاب خارج بنك الأسئلة */
export function isQuestionEligibleForBank(question) {
  const types = normalizeGameTypes(question?.gameTypes);
  if (!types.length) return true;
  return !types.includes('titles');
}

/** توحيد gameTypes (sniper → hesbah، إلخ) وإزالة التكرار */
export function normalizeGameTypes(gameTypes) {
  const list = Array.isArray(gameTypes)
    ? gameTypes
    : String(gameTypes || '')
        .split(/[|،,؛;]/)
        .map((item) => item.trim())
        .filter(Boolean);

  const out = [];
  for (const raw of list) {
    const trimmed = String(raw || '').trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    const mapped = QB_GAME_TYPE_ALIASES[trimmed]
      || QB_GAME_TYPE_ALIASES[lower]
      || lower;
    if (QB_GAME_TYPES.includes(mapped) && !out.includes(mapped)) {
      out.push(mapped);
    }
  }
  return out;
}

/** التحقق من gameTypes مع دعم الأسماء القديمة */
export function assertGameTypesValid(rawGameTypes) {
  const rawList = Array.isArray(rawGameTypes) ? rawGameTypes : [];
  if (!rawList.length) return 'الألعاب مفقودة';

  const normalized = normalizeGameTypes(rawList);
  if (!normalized.length) return 'قيمة اللعبة غير صحيحة';
  if (normalized.includes('titles')) return 'الألقاب لا تستخدم بنك الأسئلة';

  const hasUnknown = rawList.some((raw) => {
    const token = String(raw || '').trim();
    if (!token) return true;
    return normalizeGameTypes([token]).length === 0;
  });
  if (hasUnknown) return 'قيمة اللعبة غير صحيحة';

  return null;
}

const QUESTION_BANK_PATH = 'question-bank/';

export const QB_SOURCE = {
  ADMIN: 'admin',
  COMMUNITY: 'community',
};

export const CONTRIBUTION_POINTS = {
  SUBMIT: 10,
  APPROVED: 50,
};

const LAST_PLAYED_GAME_KEY = 'ng_last_played_game';
const CONTRIBUTION_IDS_KEY = 'ng_contribution_ids';

function getSessionCreator() {
  if (typeof localStorage === 'undefined') return 'system';
  return localStorage.getItem('ng_session') || 'system';
}

export function getLastPlayedGame() {
  if (typeof localStorage === 'undefined') return 'qumayri';
  return localStorage.getItem(LAST_PLAYED_GAME_KEY) || 'qumayri';
}

export function setLastPlayedGame(gameType) {
  if (typeof localStorage === 'undefined' || !gameType) return;
  localStorage.setItem(LAST_PLAYED_GAME_KEY, gameType);
}

function rememberContributionId(id) {
  if (typeof localStorage === 'undefined' || !id) return;
  try {
    const raw = localStorage.getItem(CONTRIBUTION_IDS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    if (!list.includes(id)) {
      list.unshift(id);
      localStorage.setItem(CONTRIBUTION_IDS_KEY, JSON.stringify(list.slice(0, 100)));
    }
  } catch {
    localStorage.setItem(CONTRIBUTION_IDS_KEY, JSON.stringify([id]));
  }
}

export function getStoredContributionIds() {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CONTRIBUTION_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function matchesContributor(question, { uid, sessionId }) {
  if (uid && question.contributor_uid === uid) return true;
  if (sessionId && question.created_by === sessionId) return true;
  return false;
}

export function summarizeContributions(questions = []) {
  const rows = Array.isArray(questions) ? questions : [];
  const approved = rows.filter((q) => q.status === 'approved').length;
  const pending = rows.filter((q) => q.status === 'pending').length;
  const rejected = rows.filter((q) => q.status === 'rejected').length;

  return {
    kbSubmitted: rows.length,
    kbApproved: approved,
    kbPending: pending,
    kbRejected: rejected,
  };
}

export function calcContributionPoints(questions) {
  let points = 0;
  (questions || []).forEach((q) => {
    if (q.status === 'pending') points += CONTRIBUTION_POINTS.SUBMIT;
    if (q.status === 'approved') points += CONTRIBUTION_POINTS.SUBMIT + CONTRIBUTION_POINTS.APPROVED;
  });
  return points;
}

function toQuestionsArray(snapshot) {
  if (!snapshot.exists()) return [];

  return Object.entries(snapshot.val() || {}).map(([id, data]) => ({
    id,
    ...data,
  }));
}

function questionMatchesGameType(question, gameType) {
  if (gameType === 'all') return true;
  const gameTypes = Array.isArray(question.gameTypes) ? question.gameTypes : [];
  if (gameTypes.includes('all')) return true;
  if (gameTypes.includes(gameType)) return true;
  if (gameType === 'hesbah' && gameTypes.includes('sniper')) return true;
  return false;
}

function matchesAdminFilters(question, filters) {
  if (filters.category && question.category !== filters.category) return false;
  if (filters.difficulty_level && question.difficulty_level !== filters.difficulty_level) return false;
  if (filters.status && question.status !== filters.status) return false;
  if (filters.audience && (question.audience || 'general') !== filters.audience) return false;
  if (filters.gameType && !questionMatchesGameType(question, filters.gameType)) return false;

  return true;
}

function matchesGameFilters(question, { gameType, category, difficulty_level, audience }) {
  if (category && question.category !== category) return false;
  if (difficulty_level && question.difficulty_level !== difficulty_level) return false;
  if (audience && (question.audience || 'general') !== audience) return false;
  return questionMatchesGameType(question, gameType);
}

function shuffleArray(arr) {
  const shuffled = [...arr];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export async function suggestQuestion(data) {
  const questionData = {
    ...data,
    gameTypes: normalizeGameTypes(data.gameTypes),
    status: 'pending',
    createdAt: Date.now(),
    created_by: getSessionCreator(),
  };

  const questionRef = push(ref(db, QUESTION_BANK_PATH));
  await update(questionRef, questionData);

  return {
    id: questionRef.key,
    ...questionData,
  };
}

export async function getAdminQuestions(filters = {}) {
  const snapshot = await get(ref(db, QUESTION_BANK_PATH));
  const questions = toQuestionsArray(snapshot);

  return questions.filter((question) => matchesAdminFilters(question, filters));
}

export async function approveQuestion(questionId, extra = {}) {
  await update(ref(db, `${QUESTION_BANK_PATH}${questionId}`), {
    status: 'approved',
    approvedAt: Date.now(),
    ...extra,
  });
}

export async function rejectQuestion(questionId, reason = '') {
  await update(ref(db, `${QUESTION_BANK_PATH}${questionId}`), {
    status: 'rejected',
    rejection_reason: String(reason || '').trim(),
    reviewedAt: Date.now(),
  });
}

export async function deleteQuestion(questionId) {
  await update(ref(db), {
    [`${QUESTION_BANK_PATH}${questionId}`]: null,
  });
}

/** إرسال سؤال من المجتمع — يبقى pending حتى اعتماد الأدمن */
export async function submitCommunityQuestion(data, contributor = {}) {
  const sessionId = getSessionCreator();
  const questionData = {
    ...data,
    gameTypes: normalizeGameTypes(data.gameTypes),
    status: 'pending',
    source: QB_SOURCE.COMMUNITY,
    createdAt: Date.now(),
    created_by: sessionId,
    contributor_uid: contributor.uid || null,
    contributor_name: contributor.name || 'مشارك',
    times_used: 0,
  };

  const questionRef = push(ref(db, QUESTION_BANK_PATH));
  await update(questionRef, questionData);
  rememberContributionId(questionRef.key);

  return {
    id: questionRef.key,
    ...questionData,
  };
}

/** إحصائيات البنك المعتمد + فجوات التصنيفات */
export async function fetchBankStats() {
  const approvedQuestionsQuery = query(
    ref(db, QUESTION_BANK_PATH),
    orderByChild('status'),
    equalTo('approved')
  );
  const snapshot = await get(approvedQuestionsQuery);
  const approved = toQuestionsArray(snapshot);
  const categoryCounts = {};

  QB_CATEGORIES.forEach((cat) => {
    categoryCounts[cat] = 0;
  });

  approved.forEach((question) => {
    if (question.category && categoryCounts[question.category] != null) {
      categoryCounts[question.category] += 1;
    }
  });

  return {
    total: approved.length,
    categoryCounts,
  };
}

/** مساهمات المستخدم الحالي */
export async function fetchMyContributions({ uid, sessionId } = {}) {
  const snapshot = await get(ref(db, QUESTION_BANK_PATH));
  const all = toQuestionsArray(snapshot);
  const storedIds = getStoredContributionIds();
  const sid = sessionId || getSessionCreator();

  return all
    .filter((q) =>
      q.source === QB_SOURCE.COMMUNITY &&
      (matchesContributor(q, { uid, sessionId: sid }) || storedIds.includes(q.id))
    )
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

/** أبرز المساهمين — حسب الأسئلة المعتمدة من المجتمع */
export async function fetchTopContributors(limit = 5) {
  const approvedQuestionsQuery = query(
    ref(db, QUESTION_BANK_PATH),
    orderByChild('status'),
    equalTo('approved')
  );
  const snapshot = await get(approvedQuestionsQuery);
  const counts = {};

  toQuestionsArray(snapshot)
    .filter((q) => q.source === QB_SOURCE.COMMUNITY && q.contributor_name)
    .forEach((q) => {
      const key = q.contributor_uid || q.contributor_name;
      if (!counts[key]) {
        counts[key] = { name: q.contributor_name, count: 0, uid: q.contributor_uid || null };
      }
      counts[key].count += 1;
    });

  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function fetchGameQuestions({
  gameType,
  category,
  difficulty_level,
  audience,
  count = 10,
} = {}) {
  const approvedQuestionsQuery = query(
    ref(db, QUESTION_BANK_PATH),
    orderByChild('status'),
    equalTo('approved')
  );
  const snapshot = await get(approvedQuestionsQuery);
  const questions = toQuestionsArray(snapshot).filter((question) =>
    matchesGameFilters(question, { gameType, category, difficulty_level, audience })
  );

  return shuffleArray(questions).slice(0, count);
}

/**
 * نسخة موسّعة تدعم اختيار عدة تصنيفات دفعة واحدة (لجلسات اللعب التي تجمع تصنيفات متعددة).
 * تُرجع الأسئلة المعتمدة المطابقة للعبة والتصنيفات/الصعوبة/الفئة بعد خلطها.
 */
export async function fetchGameQuestionsAdvanced({
  gameType,
  categories = [],
  difficulty_level,
  audience,
  count = 40,
} = {}) {
  const approvedQuestionsQuery = query(
    ref(db, QUESTION_BANK_PATH),
    orderByChild('status'),
    equalTo('approved')
  );
  const snapshot = await get(approvedQuestionsQuery);
  const activeCategories = Array.isArray(categories) ? categories.filter(Boolean) : [];

  const questions = toQuestionsArray(snapshot)
    .filter(isQuestionEligibleForBank)
    .filter((question) => {
    if (difficulty_level && question.difficulty_level !== difficulty_level) return false;
    if (audience && (question.audience || 'general') !== audience) return false;
    if (!questionMatchesGameType(question, gameType)) return false;
    if (activeCategories.length && !activeCategories.includes(question.category)) return false;
    return true;
  });

  return shuffleArray(questions).slice(0, count);
}

/** تصنيفات لها أسئلة معتمدة مخصّصة للعبة (أو «كل الألعاب») — للعرض في إعداد المصدر. */
export async function fetchGameAvailableCategories({ gameType, audience } = {}) {
  const approvedQuestionsQuery = query(
    ref(db, QUESTION_BANK_PATH),
    orderByChild('status'),
    equalTo('approved')
  );
  const snapshot = await get(approvedQuestionsQuery);
  const categoryCounts = {};

  toQuestionsArray(snapshot).forEach((question) => {
    if (!isQuestionEligibleForBank(question)) return;
    if (!matchesGameFilters(question, { gameType, audience: audience || undefined })) return;
    const cat = question.category;
    if (!cat || !QB_CATEGORIES.includes(cat)) return;
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });

  return QB_CATEGORIES.filter((cat) => categoryCounts[cat]).map((cat) => ({
    id: cat,
    count: categoryCounts[cat],
  }));
}
