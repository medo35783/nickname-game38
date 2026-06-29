import { ref, runTransaction, get } from 'firebase/database';
import { db } from '../firebase';

const SPONSORS_PATH = 'platform/sponsors';

/** جلسة مؤهلة للجائزة — 5+ لاعبين وجولتان+ */
export function isSessionPrizeEligible({ playerCount, totalRounds, completed = true } = {}) {
  if (completed === false) return false;
  const players = Number(playerCount) || 0;
  const rounds = Number(totalRounds) || 0;
  return players >= 5 && rounds >= 2;
}

/** تحليل أكواد من نص (سطر لكل كود أو مفصولة بفاصلة) */
export function parseCouponCodesText(text = '') {
  const raw = String(text || '')
    .split(/[\n,;]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length >= 3 && s.length <= 40);
  return [...new Set(raw)];
}

/** سحب كود واحد من مخزون الراعي — transaction ذري */
export async function claimCouponFromPool(sponsorId) {
  if (!sponsorId) return null;
  const r = ref(db, `${SPONSORS_PATH}/${sponsorId}`);
  let claimed = null;

  const result = await runTransaction(r, (current) => {
    if (!current || typeof current !== 'object') return current;
    const codes = Array.isArray(current.couponCodes)
      ? current.couponCodes.filter(Boolean)
      : [];
    const remaining = Number(current.couponPoolRemaining);
    const poolLeft = Number.isFinite(remaining) ? remaining : codes.length;
    if (!codes.length || poolLeft <= 0) return;

    claimed = codes[0];
    return {
      ...current,
      couponCodes: codes.slice(1),
      couponPoolRemaining: Math.max(0, poolLeft - 1),
      couponsDelivered: (Number(current.couponsDelivered) || 0) + 1,
      updatedAt: Date.now(),
    };
  });

  if (!result.committed || !claimed) return null;
  return claimed;
}

export async function readSponsorCouponMeta(sponsorId) {
  if (!sponsorId) return null;
  const snap = await get(ref(db, `${SPONSORS_PATH}/${sponsorId}`));
  const raw = snap.val();
  if (!raw) return null;
  const codes = Array.isArray(raw.couponCodes) ? raw.couponCodes.filter(Boolean) : [];
  const remaining = Number(raw.couponPoolRemaining);
  return {
    couponPoolTotal: Number(raw.couponPoolTotal) || codes.length,
    couponPoolRemaining: Number.isFinite(remaining) ? remaining : codes.length,
    couponsDelivered: Number(raw.couponsDelivered) || 0,
    autoAwardWinner: raw.autoAwardWinner !== false,
    prizeOffer: String(raw.prizeOffer || '').trim(),
    hasCouponAgreement: codes.length > 0 || (Number(raw.couponPoolTotal) || 0) > 0,
  };
}
