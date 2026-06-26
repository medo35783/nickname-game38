import { ref, onValue, push, set, update, remove, get } from 'firebase/database';
import { db } from '../firebase';
import { VOICE_NEWS, formatVoiceNewsDate } from './voiceNews';

const NEWS_PATH = 'platform/news';

export { formatVoiceNewsDate };

function normalizeItem(id, raw, { hideExpired = true } = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const expiresAt = Number(raw.expiresAt) || 0;
  if (hideExpired && expiresAt && expiresAt < Date.now()) return null;
  return {
    id,
    title: String(raw.title || '').trim(),
    body: String(raw.body || '').trim(),
    date: raw.date || new Date().toISOString().slice(0, 10),
    isNew: !!raw.isNew,
    sortOrder: Number(raw.sortOrder) || 0,
    expiresAt: expiresAt || null,
    createdAt: Number(raw.createdAt) || 0,
  };
}

/** أخبار من Firebase مع fallback للثابت */
export function mergeNewsWithFallback(firebaseList) {
  const fromDb = (firebaseList || []).filter((n) => n?.title && n?.body);
  if (fromDb.length) {
    return [...fromDb].sort((a, b) => (b.sortOrder || b.createdAt || 0) - (a.sortOrder || a.createdAt || 0));
  }
  return VOICE_NEWS.map((n) => ({ ...n, sortOrder: 0, createdAt: 0 }));
}

export function subscribePlatformNews(onData) {
  const r = ref(db, NEWS_PATH);

  const applySnapshot = (snap) => {
    const val = snap.val() || {};
    const list = Object.entries(val)
      .map(([id, row]) => normalizeItem(id, row))
      .filter(Boolean);
    onData(mergeNewsWithFallback(list));
  };

  const onError = () => {
    onData(mergeNewsWithFallback([]));
  };

  return onValue(r, applySnapshot, onError);
}

export async function fetchPlatformNewsAdmin() {
  const snap = await get(ref(db, NEWS_PATH));
  const val = snap.val() || {};
  return Object.entries(val)
    .map(([id, row]) => normalizeItem(id, { ...row, expiresAt: row?.expiresAt }, { hideExpired: false }))
    .filter(Boolean)
    .sort((a, b) => (b.sortOrder || b.createdAt || 0) - (a.sortOrder || a.createdAt || 0));
}

export async function savePlatformNewsItem(id, payload) {
  const data = {
    title: String(payload.title || '').trim().slice(0, 120),
    body: String(payload.body || '').trim().slice(0, 2000),
    date: payload.date || new Date().toISOString().slice(0, 10),
    isNew: !!payload.isNew,
    sortOrder: Number(payload.sortOrder) || 0,
    expiresAt: payload.expiresAt ? Number(payload.expiresAt) : null,
    updatedAt: Date.now(),
  };
  if (!data.title || !data.body) throw new Error('العنوان والنص مطلوبان');

  if (id) {
    await update(ref(db, `${NEWS_PATH}/${id}`), data);
    return id;
  }
  const newRef = push(ref(db, NEWS_PATH));
  await set(newRef, { ...data, createdAt: Date.now() });
  return newRef.key;
}

export async function deletePlatformNewsItem(id) {
  if (!id) return;
  await remove(ref(db, `${NEWS_PATH}/${id}`));
}
