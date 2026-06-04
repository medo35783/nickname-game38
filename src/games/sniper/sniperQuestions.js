import { shuffle } from '../../core/helpers';
import { flattenSessionPool } from '../../question-bank/customQuestionPool';
import { QB_CATEGORY_LABELS } from '../../question-bank/questionSession';

export function flattenSniperPool(poolStructured) {
  const flat = flattenSessionPool(poolStructured);
  return flat
    .map((q, i) => ({
      id: q.id || `sq_${i}`,
      text: q.text || q.question_text || q.question || '',
      type: q.type || 'open_question',
      category: q.category || 'general',
      categoryLabel: QB_CATEGORY_LABELS[q.category] || q.category || 'عام',
      supervisor_notes: q.supervisor_notes || '',
    }))
    .filter((q) => q.text.trim());
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
