import { shuffle } from '../../core/helpers';
import { flattenSessionPool } from '../../question-bank/customQuestionPool';
import {
  QSOURCE,
  QB_CATEGORY_LABELS,
  isAdminOnlyQuestion,
  isWrittenTextQuestion,
} from '../../question-bank/questionSession';

function resolveHostText(q) {
  const questionText = (q.question_text || q.text || q.question || '').trim();
  const notes = (q.supervisor_notes || '').trim();
  if (questionText) return questionText;
  if (isWrittenTextQuestion(q) && notes) return notes;
  return notes || questionText;
}

/** نص يُعرض للمتسابقين (بعد بدء المؤقت) — تمثيل/مشرف فقط يُستثنى */
export function playerVisibleQuestionText(q) {
  if (!q) return '';
  if (isAdminOnlyQuestion(q)) return '';
  return (q.question_text || q.text || q.question || '').trim();
}

/** نص يُحفظ في Firebase للمتسابقين (بنك / يدوي) */
export function hesbahGameQuestionText(q, questionSource) {
  if (!q) return '';
  if (q.adminOnly || questionSource === QSOURCE.EXTERNAL) return '';
  return (q.playerText || q.hostText || '').trim();
}

export function mapHesbahQuestion(raw) {
  const hostText = resolveHostText(raw);
  const playerText = playerVisibleQuestionText(raw);
  const type = raw.type || 'open_question';
  return {
    id: raw.id,
    text: hostText,
    hostText,
    playerText,
    type,
    category: raw.category || 'general',
    categoryLabel: QB_CATEGORY_LABELS[raw.category] || raw.category || 'عام',
    supervisor_notes: raw.supervisor_notes || '',
    adminOnly: isAdminOnlyQuestion(raw),
    writtenText: isWrittenTextQuestion({ type }),
  };
}

export function flattenHesbahPool(poolStructured) {
  const flat = flattenSessionPool(poolStructured);
  return flat
    .map((q, i) => ({
      id: q.id || `sq_${i}`,
      text: q.question_text || q.text || q.question || '',
      question_text: q.question_text || q.text || q.question || '',
      type: q.type || 'open_question',
      category: q.category || 'general',
      categoryLabel: QB_CATEGORY_LABELS[q.category] || q.category || 'عام',
      supervisor_notes: q.supervisor_notes || '',
      correct_answer: q.correct_answer || '',
      options: q.options || [],
    }))
    .map(mapHesbahQuestion)
    .filter((q) => q.hostText.trim() && !q.adminOnly);
}

/** إزالة تكرار النص داخل جلسة واحدة (نفس السؤال بمعرّفات مختلفة). */
export function dedupeHesbahPool(poolFlat) {
  const seen = new Set();
  return poolFlat.filter((q) => {
    const key = (q.hostText || q.text || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** اختيار أسئلة الجلسة من البنك: بدون تكرار نص، خلط عشوائي، بعدد الجولات. */
export function pickHesbahSessionQuestions(rawList, want) {
  const target = Math.max(1, parseInt(want, 10) || 30);
  const seen = new Set();
  const unique = [];
  for (const q of rawList || []) {
    const key = (q.question_text || q.text || q.question || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(q);
  }
  return shuffle(unique).slice(0, target);
}

export function countHesbahPool(poolStructured) {
  return dedupeHesbahPool(flattenHesbahPool(poolStructured)).length;
}

export function createQuestionCursor(poolFlat, { startPtr = 0, savedOrder = null } = {}) {
  const unique = dedupeHesbahPool(poolFlat);
  const order =
    Array.isArray(savedOrder) && savedOrder.length === unique.length
      ? savedOrder
      : shuffle(unique.map((_, i) => i));
  let ptr = Math.max(0, Math.min(startPtr, order.length));
  return {
    next() {
      if (ptr >= order.length) return null;
      const item = unique[order[ptr]];
      ptr += 1;
      return item;
    },
    remaining() {
      return Math.max(0, order.length - ptr);
    },
    total() {
      return order.length;
    },
    snapshot() {
      return { ptr, order, total: order.length };
    },
  };
}
