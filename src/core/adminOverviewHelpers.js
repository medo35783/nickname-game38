import { collectActiveRooms, aggregateSessionsToday } from './adminPulseHelpers';
import { isQuestionEligibleForBank } from '../question-bank/qbank.helpers';

/** الحالة الفعلية للكود (نشط لكن انتهت المدة → منتهي) */
export function getCodeEffectiveStatus(row) {
  if (!row) return 'unknown';
  if (row.status === 'expired') return 'expired';
  if (row.status === 'unused') return 'unused';
  if (row.status === 'active' && row.expiresAt && Date.now() > row.expiresAt) return 'expired';
  if (row.status === 'active') return 'active';
  return row.status || 'unknown';
}

export function getCodeSource(row) {
  return row?.source === 'promo' ? 'promo' : 'paid';
}

/**
 * KPI موحّدة لصفحة النظرة العامة
 */
export function computeOverviewKpi({ rows = [], indexByCode = {}, codeStatsById = {}, roomSnaps = {} }) {
  let activeCodes = 0;
  let promoActive = 0;
  let paidActive = 0;
  let unusedCodes = 0;
  let estimatedRevenue = 0;
  const activeHostIds = new Set();

  for (const row of rows) {
    const merged = indexByCode[row.code] ? { ...row, ...indexByCode[row.code] } : row;
    const source = getCodeSource(merged);
    const eff = getCodeEffectiveStatus(merged);

    if (eff === 'active') {
      activeCodes += 1;
      if (source === 'promo') promoActive += 1;
      else paidActive += 1;
      if (merged.userId) activeHostIds.add(merged.userId);
    }
    if (eff === 'unused') unusedCodes += 1;

    if (source === 'paid') {
      estimatedRevenue += Number(merged.price) || 0;
    }
  }

  const statsList = Object.values(codeStatsById).map((e) => e?.data).filter(Boolean);
  const today = aggregateSessionsToday(statsList);
  const activeRooms = collectActiveRooms(roomSnaps);

  return {
    activeRooms: activeRooms.length,
    sessionsToday: today.sessions,
    participantsToday: today.participants,
    activeCodes,
    promoActive,
    paidActive,
    unusedCodes,
    activeHosts: activeHostIds.size,
    estimatedRevenue,
    totalCodes: rows.length,
  };
}

export function countApprovedBankQuestions(questionBankVal) {
  const val = questionBankVal || {};
  return Object.values(val).filter(
    (q) => q?.status === 'approved' && isQuestionEligibleForBank(q)
  ).length;
}
