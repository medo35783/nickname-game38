import { ref, get, update } from 'firebase/database';
import { db } from '../firebase';
import { fetchMyContributions, summarizeContributions } from '../question-bank/qbank.helpers';
import { computeEligibleAchievements } from './arenaAchievements';

/**
 * مزامنة إحصائيات مساهمات بنك المعرفة ومنح الإنجازات المستحقة
 * @returns {Promise<string[]>} معرّفات الإنجازات الجديدة
 */
export async function refreshKnowledgeContributionStats(userId) {
  if (!userId) return [];

  const profileRef = ref(db, `users/${userId}/profile`);
  const snap = await get(profileRef);
  if (!snap.exists()) return [];

  const prev = snap.val() || {};
  const rows = await fetchMyContributions({ uid: userId }).catch(() => []);
  const kbStats = summarizeContributions(rows);

  const merged = { ...prev, ...kbStats };
  const existing = Array.isArray(prev.achievements) ? prev.achievements : [];
  const eligible = computeEligibleAchievements(merged);
  const achievements = [...new Set([...existing, ...eligible])];
  const toAdd = achievements.filter((id) => !existing.includes(id));

  const patch = { ...kbStats };
  if (toAdd.length) patch.achievements = achievements;

  await update(profileRef, patch);
  return toAdd;
}
