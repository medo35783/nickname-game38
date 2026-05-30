import { ref, get, set } from 'firebase/database';
import { auth, db } from '../../firebase';

const USED_STORAGE_KEY = 'ng_qumairi_bank_used';

/** مفتاح Firebase آمن من filterKey */
export function encodeFilterKey(filterKey) {
  return String(filterKey || 'default').replace(/[.#$/[\]]/g, '_');
}

function readLocalUsedIds(filterKey) {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(USED_STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (data.filterKey !== filterKey) return [];
    return Array.isArray(data.usedIds) ? data.usedIds : [];
  } catch {
    return [];
  }
}

function writeLocalUsedIds(filterKey, usedIds) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      USED_STORAGE_KEY,
      JSON.stringify({ filterKey, usedIds: [...new Set(usedIds)], updatedAt: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

/** حساب مسجّل ببريد (ليس ضيفاً مجهولاً) */
export function isRegisteredHost() {
  const user = auth.currentUser;
  return !!(user?.uid && !user.isAnonymous && user.email);
}

/**
 * يحمّل معرّفات الأسئلة التي ظهرت فعلاً في مسابقات سابقة.
 * الأولوية: Firebase (حساب مسجّل) ثم localStorage (نفس الجهاز).
 */
export async function loadUsedQuestionIds(filterKey) {
  if (!filterKey) return [];

  const uid = auth.currentUser?.uid;
  const registered = isRegisteredHost();

  if (uid && registered) {
    try {
      if (typeof auth.authStateReady === 'function') await auth.authStateReady();
      const key = encodeFilterKey(filterKey);
      const snap = await get(ref(db, `users/${uid}/qumairiBankUsed/${key}`));
      if (snap.exists()) {
        const data = snap.val();
        if (data?.filterKey === filterKey && Array.isArray(data.usedIds)) {
          writeLocalUsedIds(filterKey, data.usedIds);
          return data.usedIds;
        }
      }
      const local = readLocalUsedIds(filterKey);
      if (local.length) {
        await saveUsedQuestionIds(filterKey, local);
        return local;
      }
      return [];
    } catch {
      return readLocalUsedIds(filterKey);
    }
  }

  return readLocalUsedIds(filterKey);
}

/** يحفظ السجل — Firebase للمسجّلين + نسخة محلية دائماً */
export async function saveUsedQuestionIds(filterKey, usedIds) {
  if (!filterKey) return;
  const unique = [...new Set(usedIds)];
  writeLocalUsedIds(filterKey, unique);

  const uid = auth.currentUser?.uid;
  if (!uid || !isRegisteredHost()) return;

  try {
    if (typeof auth.authStateReady === 'function') await auth.authStateReady();
    const key = encodeFilterKey(filterKey);
    await set(ref(db, `users/${uid}/qumairiBankUsed/${key}`), {
      filterKey,
      usedIds: unique,
      updatedAt: Date.now(),
    });
  } catch {
    /* ignore */
  }
}

/** يُسجَّل السؤال عند عرضه فقط — الأسئلة غير المُعرَضة تبقى متاحة لاحقاً */
export async function markQuestionAsUsed(filterKey, questionId) {
  if (!filterKey || !questionId) return;
  const current = await loadUsedQuestionIds(filterKey);
  if (current.includes(questionId)) return;
  await saveUsedQuestionIds(filterKey, [...current, questionId]);
}

export async function clearUsedQuestionIds(filterKey) {
  if (!filterKey) return;

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(USED_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.filterKey === filterKey) localStorage.removeItem(USED_STORAGE_KEY);
      }
    } catch {
      /* ignore */
    }
  }

  const uid = auth.currentUser?.uid;
  if (!uid || !isRegisteredHost()) return;

  try {
    if (typeof auth.authStateReady === 'function') await auth.authStateReady();
    const key = encodeFilterKey(filterKey);
    await set(ref(db, `users/${uid}/qumairiBankUsed/${key}`), null);
  } catch {
    /* ignore */
  }
}
