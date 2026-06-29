import { ref, onValue, push, set, update, remove, get, increment } from 'firebase/database';
import { db } from '../firebase';

const ADS_PATH = 'platform/lobbyAds';

export const LOBBY_AD_VARIANTS = [
  { id: 'gold', label: 'ذهبي' },
  { id: 'blue', label: 'أزرق' },
  { id: 'burgundy', label: 'عنابي' },
];

function normalizeAd(id, raw, { hideInactive = true } = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const now = Date.now();
  const startsAt = Number(raw.startsAt) || 0;
  const expiresAt = Number(raw.expiresAt) || 0;
  if (startsAt && startsAt > now) return null;
  if (expiresAt && expiresAt < now) return null;
  if (hideInactive && raw.active === false) return null;

  return {
    id,
    title: String(raw.title || '').trim().slice(0, 80),
    body: String(raw.body || '').trim().slice(0, 300),
    imageUrl: String(raw.imageUrl || '').trim().slice(0, 120000),
    linkUrl: String(raw.linkUrl || '').trim().slice(0, 300),
    ctaLabel: String(raw.ctaLabel || '').trim().slice(0, 40),
    variant: LOBBY_AD_VARIANTS.some((v) => v.id === raw.variant) ? raw.variant : 'gold',
    active: raw.active !== false,
    sortOrder: Number(raw.sortOrder) || 0,
    startsAt: startsAt || null,
    expiresAt: expiresAt || null,
    clickCount: Number(raw.clickCount) || 0,
    createdAt: Number(raw.createdAt) || 0,
  };
}

export function subscribeLobbyAds(onData) {
  const r = ref(db, ADS_PATH);
  return onValue(
    r,
    (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val)
        .map(([id, row]) => normalizeAd(id, row))
        .filter((a) => a?.title)
        .sort((a, b) => (b.sortOrder || b.createdAt) - (a.sortOrder || a.createdAt));
      onData(list);
    },
    () => onData([])
  );
}

export async function fetchLobbyAdsAdmin() {
  const snap = await get(ref(db, ADS_PATH));
  const val = snap.val() || {};
  return Object.entries(val)
    .map(([id, row]) => normalizeAd(id, row, { hideInactive: false }))
    .filter(Boolean)
    .sort((a, b) => (b.sortOrder || b.createdAt) - (a.sortOrder || a.createdAt));
}

export async function saveLobbyAdItem(id, payload) {
  const data = {
    title: String(payload.title || '').trim().slice(0, 80),
    body: String(payload.body || '').trim().slice(0, 300),
    imageUrl: String(payload.imageUrl || '').trim().slice(0, 120000),
    linkUrl: String(payload.linkUrl || '').trim().slice(0, 300),
    ctaLabel: String(payload.ctaLabel || '').trim().slice(0, 40),
    variant: payload.variant || 'gold',
    active: payload.active !== false,
    sortOrder: Number(payload.sortOrder) || 0,
    startsAt: payload.startsAt ? Number(payload.startsAt) : null,
    expiresAt: payload.expiresAt ? Number(payload.expiresAt) : null,
    updatedAt: Date.now(),
  };
  if (!data.title) throw new Error('عنوان الإعلان مطلوب');

  if (id) {
    await update(ref(db, `${ADS_PATH}/${id}`), data);
    return id;
  }
  const newRef = push(ref(db, ADS_PATH));
  await set(newRef, { ...data, createdAt: Date.now() });
  return newRef.key;
}

export async function deleteLobbyAdItem(id) {
  if (!id) return;
  await remove(ref(db, `${ADS_PATH}/${id}`));
}

/** تسجيل نقرة CTA — للتحليل في لوحة الأدمن */
export async function recordLobbyAdClick(adId) {
  if (!adId) return;
  try {
    await update(ref(db, `${ADS_PATH}/${adId}`), {
      clickCount: increment(1),
      lastClickAt: Date.now(),
    });
  } catch {
    /* غير حرج */
  }
}
