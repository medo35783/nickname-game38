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
export function sniperGameQuestionText(q, questionSource) {
  if (!q) return '';
  if (q.adminOnly || questionSource === QSOURCE.EXTERNAL) return '';
  return (q.playerText || q.hostText || '').trim();
}

export function mapSniperQuestion(raw) {
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

export function flattenSniperPool(poolStructured) {
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
    .map(mapSniperQuestion)
    .filter((q) => q.hostText.trim() && !q.adminOnly);
}

export function countSniperPool(poolStructured) {
  return flattenSniperPool(poolStructured).length;
}

export function createQuestionCursor(poolFlat) {
  const order = shuffle(poolFlat.map((_, i) => i));
  let ptr = 0;
  return {
    next() {
      if (!order.length) return null;
      const item = poolFlat[order[ptr % order.length]];
      ptr += 1;
      return item;
    },
    remaining() {
      return Math.max(0, order.length - ptr);
    },
  };
}
