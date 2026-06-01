/**
 * طبقة جلسة الأسئلة المشتركة — قابلة لإعادة الاستخدام في أي لعبة تستعين ببنك الأسئلة.
 * تتولى: مصادر الأسئلة (بنك/كتابة يدوية/خارجي)، بناء المخزون، سحب السؤال التالي،
 * الإسقاط الآمن للمتسابقين (بدون الإجابة الصحيحة)، وتحديد أسئلة المشرف فقط (التمثيل).
 *
 * ملاحظة أمان: الإجابة الصحيحة تبقى عند المشرف فقط (محليًا) ولا تُكتب أبدًا في غرفة اللعب
 * حتى لا يطّلع عليها المتسابقون عبر قاعدة البيانات.
 */

export const QSOURCE = {
  BANK: 'bank',
  CUSTOM: 'custom',
  EXTERNAL: 'external',
};

export const QSOURCE_LABELS = {
  bank: 'من البنك المركزي',
  custom: 'أكتب أسئلتي بنفسي',
  external: 'الأسئلة معي فقط (بدون عرض)',
};

/** تصنيفات تظهر للمشرف فقط ولا تُكشف للمتسابقين (مثل التمثيل والأمثال). */
export const ADMIN_ONLY_CATEGORIES = ['acting_proverbs'];

export const QB_CATEGORY_LABELS = {
  religious: 'ديني',
  geography: 'جغرافيا',
  plants: 'نباتات',
  animals: 'حيوانات',
  sports: 'رياضة',
  acting_proverbs: 'تمثيل وأمثال',
  general: 'عام',
};

export const QB_DIFFICULTY_LABELS = {
  easy: 'سهل',
  medium: 'متوسط',
  hard: 'صعب',
};

export const QB_TYPE_LABELS = {
  multiple_choice: 'اختيار من متعدد',
  true_false: 'صح أو خطأ',
  open_question: 'سؤال مفتوح',
};

export const QB_AUDIENCE_LABELS = {
  general: 'عام',
  family: 'عائلي',
  kids: 'أطفال',
};

export const TRUE_FALSE_OPTIONS = ['صح', 'خطأ'];

export function isAdminOnlyCategory(category) {
  return ADMIN_ONLY_CATEGORIES.includes(category);
}

export function isAdminOnlyQuestion(question) {
  return isAdminOnlyCategory(question?.category);
}

function genId(prefix = 'q') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * يحوّل سؤالًا كاملًا (يحتوي الإجابة) إلى نسخة آمنة تُعرض للمتسابقين/شاشة العرض،
 * بدون الإجابة الصحيحة ودون كشف الخيار الصحيح.
 */
export function toPublicQuestion(question, { revealToPlayers = false, revealOptions = false } = {}) {
  if (!question) return null;

  const adminOnly = isAdminOnlyQuestion(question);
  const type = question.type || 'open_question';

  let options = [];
  if (type === 'multiple_choice') {
    options = Array.isArray(question.options) ? question.options.filter(Boolean).slice(0, 4) : [];
  } else if (type === 'true_false') {
    options = [...TRUE_FALSE_OPTIONS];
  }

  return {
    id: question.id || null,
    text: question.question_text || question.text || '',
    type,
    category: question.category || null,
    options,
    adminOnly,
    // أسئلة المشرف فقط لا تُكشف للمتسابقين مهما كان
    revealToPlayers: adminOnly ? false : !!revealToPlayers,
    revealOptions: adminOnly ? false : !!revealOptions,
    drawnAt: Date.now(),
  };
}

/** يبني مخزونًا من أسئلة كتبها المشرف يدويًا. */
export function buildCustomPool(items) {
  return (items || [])
    .filter((item) => item && String(item.question_text || '').trim())
    .map((item) => ({
      id: item.id || genId('custom'),
      question_text: String(item.question_text || '').trim(),
      type: item.type || 'open_question',
      options: Array.isArray(item.options) ? item.options.filter(Boolean) : [],
      correct_answer: String(item.correct_answer || '').trim(),
      category: item.category || 'general',
      difficulty_level: item.difficulty_level || 'medium',
      audience: item.audience || 'general',
    }));
}

/** يطبّع أسئلة قادمة من البنك إلى شكل المخزون الموحّد. */
export function normalizeBankPool(items) {
  return (items || []).map((item) => ({
    id: item.id || genId('bank'),
    question_text: String(item.question_text || '').trim(),
    type: item.type || 'open_question',
    options: Array.isArray(item.options) ? item.options.filter(Boolean) : [],
    correct_answer: String(item.correct_answer || '').trim(),
    category: item.category || 'general',
    difficulty_level: item.difficulty_level || 'medium',
    audience: item.audience || 'general',
  }));
}

export function questionForId(pool, id) {
  if (!id) return null;
  return (pool || []).find((question) => question.id === id) || null;
}

export function answerForId(pool, id) {
  return questionForId(pool, id)?.correct_answer || '';
}

/** تسميات الخيارات للمشرف (أ، ب، ج، د) */
export const QB_OPTION_LABELS = ['أ', 'ب', 'ج', 'د'];

export function optionLabel(index) {
  if (index == null || index < 0) return '—';
  return QB_OPTION_LABELS[index] || String(index + 1);
}

/** فهرس الإجابة الصحيحة ضمن مصفوفة الخيارات (-1 إن لم تُطابق) */
export function getCorrectOptionIndex(options, correctAnswer) {
  if (!Array.isArray(options) || correctAnswer == null || correctAnswer === '') return -1;
  const norm = String(correctAnswer).trim();

  const byText = options.findIndex((o) => String(o).trim() === norm);
  if (byText >= 0) return byText;

  const letterIdx = QB_OPTION_LABELS.indexOf(norm);
  if (letterIdx >= 0 && letterIdx < options.length) return letterIdx;

  const num = Number(norm);
  if (!Number.isNaN(num) && num >= 0 && num < options.length) return num;

  return -1;
}

/** هل اختيار المجموعة (فهرس أو نص) يطابق الإجابة الصحيحة؟ */
export function isAnswerCorrect(pick, options, correctAnswer) {
  const correctIdx = getCorrectOptionIndex(options, correctAnswer);
  if (pick == null || pick === '') return false;
  if (typeof pick === 'number' && correctIdx >= 0) return pick === correctIdx;
  const pickNum = Number(pick);
  if (!Number.isNaN(pickNum) && correctIdx >= 0 && pickNum === correctIdx) return true;
  const txt =
    typeof pick === 'number' && options?.[pick] != null ? String(options[pick]).trim() : String(pick).trim();
  return txt !== '' && txt === String(correctAnswer || '').trim();
}

/* ── حفظ/استرجاع الجلسة محليًا (مرونة عند تحديث صفحة المشرف) ── */

export function sessionStorageKey(roomCode) {
  return `ng_qsession_${roomCode}`;
}

export function saveSession(roomCode, data) {
  if (!roomCode || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(sessionStorageKey(roomCode), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function loadSession(roomCode) {
  if (!roomCode || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(sessionStorageKey(roomCode));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession(roomCode) {
  if (!roomCode || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(sessionStorageKey(roomCode));
  } catch {
    /* ignore */
  }
}
