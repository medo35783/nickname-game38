import { ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { db } from '../firebase';

const SPONSORS_PATH = 'platform/sponsors';

export const SPONSOR_GAME_OPTIONS = [
  { id: 'titles', label: 'الألقاب', icon: '🎭' },
  { id: 'fameeri', label: 'القميري', icon: '🦅' },
  { id: 'hesbah', label: 'الحسبة', icon: '🎯' },
];

function normalizeSponsor(id, raw) {
  if (!raw || typeof raw !== 'object') return null;
  const now = Date.now();
  const startsAt = Number(raw.startsAt) || 0;
  const expiresAt = Number(raw.expiresAt) || 0;
  if (startsAt && startsAt > now) return null;
  if (expiresAt && expiresAt < now) return null;
  if (raw.active === false) return null;

  const games = Array.isArray(raw.games)
    ? raw.games.filter((g) => SPONSOR_GAME_OPTIONS.some((o) => o.id === g))
    : ['titles', 'fameeri', 'hesbah'];

  return {
    id,
    name: String(raw.name || '').trim().slice(0, 80),
    logoUrl: String(raw.logoUrl || '').trim().slice(0, 120000),
    tagline: String(raw.tagline || '').trim().slice(0, 120),
    prizeOffer: String(raw.prizeOffer || '').trim().slice(0, 120),
    games,
    active: raw.active !== false,
    sortOrder: Number(raw.sortOrder) || 0,
    contractPrice: Number(raw.contractPrice) || 0,
    couponPoolTotal: Number(raw.couponPoolTotal) || 0,
    couponPoolRemaining: Number.isFinite(Number(raw.couponPoolRemaining))
      ? Number(raw.couponPoolRemaining)
      : (Array.isArray(raw.couponCodes) ? raw.couponCodes.filter(Boolean).length : 0),
    couponCodes: Array.isArray(raw.couponCodes) ? raw.couponCodes.filter(Boolean) : [],
    couponsDelivered: Number(raw.couponsDelivered) || 0,
    autoAwardWinner: raw.autoAwardWinner !== false,
    startsAt: startsAt || null,
    expiresAt: expiresAt || null,
    createdAt: Number(raw.createdAt) || 0,
  };
}

function normalizeSponsorAdmin(id, raw) {
  if (!raw || typeof raw !== 'object') return null;
  const games = Array.isArray(raw.games)
    ? raw.games.filter((g) => SPONSOR_GAME_OPTIONS.some((o) => o.id === g))
    : [];
  return {
    id,
    name: String(raw.name || '').trim(),
    logoUrl: String(raw.logoUrl || '').trim(),
    tagline: String(raw.tagline || '').trim(),
    prizeOffer: String(raw.prizeOffer || '').trim(),
    games: games.length ? games : ['titles', 'fameeri', 'hesbah'],
    active: raw.active !== false,
    sortOrder: Number(raw.sortOrder) || 0,
    contractPrice: Number(raw.contractPrice) || 0,
    couponPoolTotal: Number(raw.couponPoolTotal) || 0,
    couponPoolRemaining: Number.isFinite(Number(raw.couponPoolRemaining))
      ? Number(raw.couponPoolRemaining)
      : (Array.isArray(raw.couponCodes) ? raw.couponCodes.filter(Boolean).length : 0),
    couponCodes: Array.isArray(raw.couponCodes) ? raw.couponCodes.filter(Boolean) : [],
    couponsDelivered: Number(raw.couponsDelivered) || 0,
    autoAwardWinner: raw.autoAwardWinner !== false,
    startsAt: Number(raw.startsAt) || null,
    expiresAt: Number(raw.expiresAt) || null,
    createdAt: Number(raw.createdAt) || 0,
  };
}

export function subscribeActiveSponsors(onData) {
  const r = ref(db, SPONSORS_PATH);
  return onValue(
    r,
    (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val)
        .map(([id, row]) => normalizeSponsor(id, row))
        .filter((s) => s?.name)
        .sort((a, b) => (b.sortOrder || b.createdAt) - (a.sortOrder || a.createdAt));
      onData(list);
    },
    () => onData([])
  );
}

export async function fetchSponsorsAdmin() {
  const snap = await get(ref(db, SPONSORS_PATH));
  const val = snap.val() || {};
  return Object.entries(val)
    .map(([id, row]) => normalizeSponsorAdmin(id, row))
    .filter(Boolean)
    .sort((a, b) => (b.sortOrder || b.createdAt) - (a.sortOrder || a.createdAt));
}

export function pickSponsorForGame(sponsors, gameKey) {
  const pool = filterSponsorsForGame(sponsors, gameKey);
  return pool[0] || null;
}

/** تناوب round-robin بين الرعاة النشطين لنفس اللعبة */
export function pickSponsorForRound(sponsors, gameKey, roundNumber = 1) {
  const pool = filterSponsorsForGame(sponsors, gameKey);
  if (!pool.length) return null;
  const sorted = [...pool].sort((a, b) => {
    const orderDiff = (Number(b.sortOrder) || 0) - (Number(a.sortOrder) || 0);
    if (orderDiff !== 0) return orderDiff;
    return (Number(a.createdAt) || 0) - (Number(b.createdAt) || 0);
  });
  const rn = Math.max(1, Number(roundNumber) || 1);
  return sorted[(rn - 1) % sorted.length];
}

export function normalizeGameKeyForSponsor(gameKey) {
  if (gameKey === 'nicknames' || gameKey === 'titles') return 'titles';
  if (gameKey === 'qumayri' || gameKey === 'qumairi' || gameKey === 'fameeri') return 'fameeri';
  if (gameKey === 'sniper' || gameKey === 'hesbah') return 'hesbah';
  return gameKey;
}

export function filterSponsorsForGame(sponsors, gameKey) {
  const key = normalizeGameKeyForSponsor(gameKey);
  return (sponsors || []).filter((s) => Array.isArray(s.games) && s.games.includes(key));
}

/** راعٍ حصري من الكود — وإلا تناوب المنصة */
export function resolveSponsorForRound({ codeSponsor, platformSponsors, gameKey, roundNumber }) {
  if (codeSponsor?.id) return codeSponsor;
  return pickSponsorForRound(platformSponsors, gameKey, roundNumber);
}

export async function fetchActiveSponsorsOnce() {
  const snap = await get(ref(db, SPONSORS_PATH));
  const val = snap.val() || {};
  return Object.entries(val)
    .map(([id, row]) => normalizeSponsor(id, row))
    .filter((s) => s?.name)
    .sort((a, b) => (b.sortOrder || b.createdAt) - (a.sortOrder || a.createdAt));
}

export async function saveSponsorItem(id, payload) {
  const data = {
    name: String(payload.name || '').trim().slice(0, 80),
    logoUrl: String(payload.logoUrl || '').trim().slice(0, 120000),
    tagline: String(payload.tagline || '').trim().slice(0, 120),
    prizeOffer: String(payload.prizeOffer || '').trim().slice(0, 120),
    games: Array.isArray(payload.games) ? payload.games.slice(0, 3) : ['titles', 'fameeri', 'hesbah'],
    active: payload.active !== false,
    sortOrder: Number(payload.sortOrder) || 0,
    contractPrice: Math.max(0, Number(payload.contractPrice) || 0),
    couponPoolTotal: Math.max(0, Number(payload.couponPoolTotal) || 0),
    couponPoolRemaining:
      payload.couponPoolRemaining !== undefined
        ? Math.max(0, Number(payload.couponPoolRemaining) || 0)
        : Math.max(0, (Array.isArray(payload.couponCodes) ? payload.couponCodes.length : 0)),
    couponCodes: Array.isArray(payload.couponCodes)
      ? payload.couponCodes.map((c) => String(c).trim().toUpperCase()).filter(Boolean).slice(0, 500)
      : [],
    couponsDelivered: Math.max(0, Number(payload.couponsDelivered) || 0),
    autoAwardWinner: payload.autoAwardWinner !== false,
    startsAt: payload.startsAt ? Number(payload.startsAt) : null,
    expiresAt: payload.expiresAt ? Number(payload.expiresAt) : null,
    updatedAt: Date.now(),
  };
  if (!data.name) throw new Error('اسم الراعي مطلوب');

  if (id) {
    await update(ref(db, `${SPONSORS_PATH}/${id}`), data);
    return id;
  }
  const newRef = push(ref(db, SPONSORS_PATH));
  await set(newRef, { ...data, createdAt: Date.now() });
  return newRef.key;
}

export async function deleteSponsorItem(id) {
  if (!id) return;
  await remove(ref(db, `${SPONSORS_PATH}/${id}`));
}
