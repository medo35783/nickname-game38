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
  const key = gameKey === 'nicknames' ? 'titles' : gameKey === 'qumairi' ? 'fameeri' : gameKey;
  return (sponsors || []).find((s) => s.games.includes(key)) || null;
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
