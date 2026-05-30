import { ref, get, set } from 'firebase/database';
import { auth, db } from '../../firebase';
import { sessionStorageKey } from '../../question-bank/questionSession';
import { isRegisteredHost } from './fameeriBankProgress';
import { normalizePoolToStructured } from './fameeriQuestionPool';

function readLocalSession(roomCode) {
  if (!roomCode || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(sessionStorageKey(roomCode));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function writeLocalSession(roomCode, data) {
  if (!roomCode || typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(sessionStorageKey(roomCode), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function normalizeSessionPayload(roomCode, data) {
  if (!data || typeof data !== 'object') return null;
  const poolStructured = normalizePoolToStructured(data.poolStructured || data.pool);
  const hasPool =
    poolStructured.hard.length + poolStructured.medium.length + poolStructured.easy.length > 0;
  if (!hasPool && !data.source) return null;

  return {
    roomCode,
    source: data.source || null,
    poolStructured,
    bankMeta: data.bankMeta || null,
    poolCursors: data.poolCursors || { hard: 0, medium: 0, easy: 0 },
    updatedAt: Number(data.updatedAt) || Date.now(),
  };
}

async function readCloudSession(roomCode) {
  const uid = auth.currentUser?.uid;
  if (!roomCode || !uid || !isRegisteredHost()) return null;

  try {
    if (typeof auth.authStateReady === 'function') await auth.authStateReady();
    const snap = await get(ref(db, `users/${uid}/qumairiSessions/${roomCode}`));
    if (!snap.exists()) return null;
    return normalizeSessionPayload(roomCode, snap.val());
  } catch {
    return null;
  }
}

async function writeCloudSession(roomCode, payload) {
  const uid = auth.currentUser?.uid;
  if (!roomCode || !payload || !uid || !isRegisteredHost()) return;

  try {
    if (typeof auth.authStateReady === 'function') await auth.authStateReady();
    await set(ref(db, `users/${uid}/qumairiSessions/${roomCode}`), payload);
  } catch {
    /* ignore */
  }
}

/** يختار الأحدث بين النسخة المحلية والسحابية */
function pickNewerSession(local, cloud) {
  if (!local) return cloud;
  if (!cloud) return local;
  return (local.updatedAt || 0) >= (cloud.updatedAt || 0) ? local : cloud;
}

/**
 * يحمّل مخزون جلسة المشرف (pool + cursors + مصدر الأسئلة).
 * مسجّل: Firebase + local — يُختار الأحدث. ضيف: local فقط.
 */
export async function loadAdminSession(roomCode) {
  if (!roomCode) return null;

  const localRaw = readLocalSession(roomCode);
  const local = localRaw ? normalizeSessionPayload(roomCode, localRaw) : null;
  const cloud = await readCloudSession(roomCode);
  const picked = pickNewerSession(local, cloud);

  if (!picked) return null;

  writeLocalSession(roomCode, picked);
  if (cloud && (!local || picked === cloud)) {
    /* already cloud */
  } else if (picked && isRegisteredHost()) {
    void writeCloudSession(roomCode, picked);
  }

  return picked;
}

/** يحفظ مخزون الجلسة — local فوراً + Firebase للمسجّلين */
export function saveAdminSession(roomCode, data) {
  if (!roomCode || !data) return;

  const payload = normalizeSessionPayload(roomCode, {
    ...data,
    updatedAt: Date.now(),
  });
  if (!payload) return;

  writeLocalSession(roomCode, payload);
  void writeCloudSession(roomCode, payload);
}

/** يمسح النسخة المحلية فقط (عند الخروج — السحابة تبقى للاستكمال لاحقاً) */
export function clearAdminSessionLocal(roomCode) {
  if (!roomCode || typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(sessionStorageKey(roomCode));
  } catch {
    /* ignore */
  }
}

/** يمسح المحلي والسحابي — عند تجهيز جلسة جديدة أو إنهاء نهائي */
export async function clearAdminSession(roomCode) {
  clearAdminSessionLocal(roomCode);

  const uid = auth.currentUser?.uid;
  if (!roomCode || !uid || !isRegisteredHost()) return;

  try {
    if (typeof auth.authStateReady === 'function') await auth.authStateReady();
    await set(ref(db, `users/${uid}/qumairiSessions/${roomCode}`), null);
  } catch {
    /* ignore */
  }
}
