import { Q_TREES } from '../../core/constants';

/** يسترجع التوزيع الأصلي (قبل الصيد) — من treesInitial أو من سجل الهجمات */
export function resolveTreesInitial(group, attacks, groupId) {
  if (group?.treesInitial && typeof group.treesInitial === 'object') {
    return group.treesInitial;
  }
  const current = group?.trees || {};
  const initial = {};
  Q_TREES.forEach((t) => {
    initial[t] = current[t] || 0;
  });
  if (!groupId || !attacks) return initial;

  Object.values(attacks || {}).forEach((a) => {
    if (a.targetId === groupId && a.result === 'success' && (a.hunted || 0) > 0) {
      initial[a.tree] = (initial[a.tree] || 0) + a.hunted;
    }
  });
  return initial;
}

/** مجموع القميري على الأشجار */
export function sumTrees(trees) {
  if (!trees) return 0;
  return Q_TREES.reduce((s, t) => s + (parseInt(trees[t], 10) || 0), 0);
}

/** خسائر القميري لكل شجرة (من التوزيع الأصلي إلى الحالي) */
export function computeTreeLosses(initial, current) {
  const losses = [];
  Q_TREES.forEach((tree) => {
    const start = parseInt(initial?.[tree], 10) || 0;
    const now = parseInt(current?.[tree], 10) || 0;
    const lost = Math.max(0, start - now);
    if (lost > 0) losses.push({ tree, lost, start, now });
  });
  return losses;
}
