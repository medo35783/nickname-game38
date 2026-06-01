import { normalizePoolToStructured } from '../games/fameeri/fameeriQuestionPool';

export function appendQuestionToPool(pool, question) {
  const structured = normalizePoolToStructured(pool);
  const diff = question.difficulty_level || 'medium';
  const bucket = structured[diff] ? diff : 'medium';
  structured[bucket] = [...structured[bucket], question];
  return structured;
}

export function removeQuestionFromPool(pool, questionId) {
  const structured = normalizePoolToStructured(pool);
  return {
    hard: structured.hard.filter((q) => q.id !== questionId),
    medium: structured.medium.filter((q) => q.id !== questionId),
    easy: structured.easy.filter((q) => q.id !== questionId),
  };
}

export function flattenSessionPool(pool) {
  const structured = normalizePoolToStructured(pool);
  return [...structured.hard, ...structured.medium, ...structured.easy];
}

export function mergeQuestionsIntoPool(pool, questions) {
  return questions.reduce((acc, q) => appendQuestionToPool(acc, q), normalizePoolToStructured(pool));
}

/** استبدال سؤال محفوظ (يحافظ على المعرّف) */
export function replaceQuestionInPool(pool, questionId, question) {
  const structured = removeQuestionFromPool(pool, questionId);
  return appendQuestionToPool(structured, { ...question, id: questionId });
}
