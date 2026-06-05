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

export const QB_GAME_TYPES = ['qumayri', 'titles', 'hesbah', 'all'];

export const QB_AUDIENCES = ['general', 'family', 'kids'];

const QUESTION_BANK_PATH = 'question-bank/';

function getSessionCreator() {
  if (typeof localStorage === 'undefined') return 'system';
  return localStorage.getItem('ng_session') || 'system';
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

export async function approveQuestion(questionId) {
  await update(ref(db, `${QUESTION_BANK_PATH}${questionId}`), {
    status: 'approved',
  });
}

export async function deleteQuestion(questionId) {
  await update(ref(db), {
    [`${QUESTION_BANK_PATH}${questionId}`]: null,
  });
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

  const questions = toQuestionsArray(snapshot).filter((question) => {
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
