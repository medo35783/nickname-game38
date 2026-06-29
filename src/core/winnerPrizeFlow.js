import { fetchActiveSponsorsOnce, filterSponsorsForGame } from './platformSponsors';
import { readActiveCodeSponsorFromLocal } from './sponsorStatsHelpers';
import { claimCouponFromPool, isSessionPrizeEligible, readSponsorCouponMeta } from './couponPool';
import { fetchPrizeAwards, registerPrizeSession, updatePrizeAward } from './prizeAwards';

function sessionKey(codeId, sessionTs) {
  return `${codeId || 'guest'}_${sessionTs || 0}`;
}

function resolveCodeMeta() {
  if (typeof localStorage === 'undefined') return { codeId: '', code: '' };
  try {
    const raw = JSON.parse(localStorage.getItem('code_active_pfcc') || '{}');
    return { codeId: raw.id || raw.codeId || '', code: raw.code || '' };
  } catch {
    return { codeId: '', code: '' };
  }
}

async function findExistingAward(sessionKeyValue) {
  const awards = await fetchPrizeAwards();
  return awards.find((a) => a.sessionKey === sessionKeyValue) || null;
}

/**
 * يُنشئ جائزة للفائز عند انتهاء الجلسة — شهادة دائماً، كود خصم فقط إن بقي مخزون
 */
export async function tryAwardWinnerPrize({
  gameType,
  roomCode,
  winnerName,
  playerCount,
  totalRounds,
  completed = true,
  adminName = '—',
  participantLabels = [],
  sessionTs = Date.now(),
  sponsorOverride = null,
} = {}) {
  const name = String(winnerName || '').trim();
  if (!name || !isSessionPrizeEligible({ playerCount, totalRounds, completed })) return null;

  const { codeId, code } = resolveCodeMeta();
  const key = sessionKey(codeId, sessionTs);
  const existing = await findExistingAward(key);
  if (existing?.winnerName) return existing;

  let sponsor = sponsorOverride || readActiveCodeSponsorFromLocal();
  if (!sponsor?.id) {
    const platform = filterSponsorsForGame(await fetchActiveSponsorsOnce(), gameType);
    sponsor = platform[0] || null;
  }

  let couponCode = existing?.couponCode || null;
  let prizeOffer = existing?.prizeOffer || '';
  let sponsorName = sponsor?.name || null;
  let sponsorLogoUrl = sponsor?.logoUrl || null;
  let sponsorId = sponsor?.id || null;

  if (sponsorId && !couponCode) {
    const meta = await readSponsorCouponMeta(sponsorId);
    prizeOffer = meta?.prizeOffer || prizeOffer;
    if (meta?.autoAwardWinner !== false && (meta?.couponPoolRemaining || 0) > 0) {
      couponCode = await claimCouponFromPool(sponsorId);
    }
  }

  const payload = {
    sessionKey: key,
    codeId,
    code,
    sessionTs,
    roomCode: roomCode || '—',
    gameType,
    adminName,
    playerCount,
    totalRounds,
    participantLabels,
    sponsorId,
    sponsorName,
    sponsorLogoUrl,
    prizeOffer: couponCode ? prizeOffer : '',
    couponCode: couponCode || '',
    winnerName: name,
  };

  if (existing?.id) {
    await updatePrizeAward(existing.id, {
      winnerName: name,
      status: 'awarded',
      couponCode: couponCode || existing.couponCode || '',
      prizeOffer: payload.prizeOffer,
    });
    return { ...existing, ...payload, id: existing.id, status: 'awarded' };
  }

  const id = await registerPrizeSession({ ...payload, status: 'awarded' });
  return { ...payload, id, status: 'awarded' };
}
