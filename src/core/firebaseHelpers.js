import { ref, set, get, update, onValue, off, push } from "firebase/database";
import { db } from './firebase';

// ── لعبة الألقاب ──
export const roomRef    = code => ref(db, `rooms/${code}`);
export const playersRef = code => ref(db, `rooms/${code}/players`);
export const attacksRef = code => ref(db, `rooms/${code}/currentRound/attacks`);
export const gameRef    = code => ref(db, `rooms/${code}/game`);

// ── لعبة القميري ──
export const qRoomRef   = code => ref(db, `qrooms/${code}`);
export const qGameRef   = code => ref(db, `qrooms/${code}/game`);
export const qGroupsRef = code => ref(db, `qrooms/${code}/groups`);
export const qAttacksRef= code => ref(db, `qrooms/${code}/attacks`);
export const qMembersRef= code => ref(db, `qrooms/${code}/members`);

export { ref, set, get, update, onValue, off, push, db };

// ═══════════════════════════════════════════
// نظام الأكواد والاشتراكات
// ═══════════════════════════════════════════

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون O,0,I,1

/** يولّد 6 أحرف/أرقام فقط */
export function generateCodeSuffix() {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  }
  return suffix;
}

/** تنسيق كامل للتخزين في قاعدة البيانات */
export function formatStoredCode(suffix) {
  return `CODE-${suffix}`;
}

/** عرض للمستخدم: 6 أحرف فقط */
export function formatCodeForDisplay(code) {
  if (!code) return '';
  const t = String(code).trim().toUpperCase();
  if (t.startsWith('CODE-')) return t.slice(5);
  return t;
}

/**
 * يقبل KYEFA8 أو CODE-KYEFA8 ويرجع CODE-KYEFA8 للبحث في DB
 */
export function normalizeSubscriptionCode(raw) {
  const t = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (/^[A-Z0-9]{6}$/.test(t)) return formatStoredCode(t);
  if (/^CODE-[A-Z0-9]{6}$/.test(t)) return t;
  return t;
}

/**
 * توليد كود عشوائي فريد
 * @returns {string} كود بصيغة CODE-XXXXXX
 */
export function generateUniqueCode() {
  return formatStoredCode(generateCodeSuffix());
}

/**
 * إنشاء كود جديد في قاعدة البيانات
 * @param {number} duration - المدة بالأيام (1, 3, 7)
 * @param {number} price - السعر بالريال
 * @returns {Promise<object>} الكود المُنشأ
 */
export async function createCode(duration, price) {
  try {
    const code = generateUniqueCode();
    const codeRef = push(ref(db, 'codes'));
    const codeId = codeRef.key;
    const codeData = {
      code,
      duration,
      price,
      status: 'unused',
      createdAt: Date.now(),
      activatedAt: null,
      expiresAt: null,
      userId: null,
      devices: {}
    };

    const indexPayload = { codeId, ...codeData };

    await set(codeRef, codeData);
    await update(ref(db), {
      [`codeIndex/${code}`]: indexPayload,
      [`adminCodeIndex/${code}`]: true,
    });

    return { id: codeId, ...codeData };
  } catch (error) {
    console.error('خطأ في إنشاء الكود:', error);
    throw error;
  }
}

/** إنشاء فهرس للأكواد القديمة دون الكتابة فوق سجل مُفعّل */
export async function ensureCodeIndexesFromRows(rows) {
  if (!rows?.length) return;
  const indexSnap = await get(ref(db, 'codeIndex'));
  const existing = indexSnap.val() || {};
  const updates = {};
  for (const row of rows) {
    const code = row?.code;
    if (!code || !row.id) continue;
    updates[`adminCodeIndex/${code}`] = true;
    if (existing[code]) continue;
    updates[`codeIndex/${code}`] = {
      codeId: row.id,
      code,
      duration: row.duration ?? 0,
      price: row.price ?? 0,
      status: row.status ?? 'unused',
      createdAt: row.createdAt ?? Date.now(),
      activatedAt: row.activatedAt ?? null,
      expiresAt: row.expiresAt ?? null,
      userId: row.userId ?? null,
      devices: row.devices ?? {},
    };
  }
  if (Object.keys(updates).length) {
    await update(ref(db), updates);
  }
}

/**
 * تفعيل كود للمستخدم
 * @param {string} code - الكود المراد تفعيله
 * @param {string} userId - معرف المستخدم
 * @param {object} deviceInfo - معلومات الجهاز
 * @returns {Promise<object>} بيانات الكود المُفعّل
 */
export async function activateCode(code, userId, deviceInfo) {
  const storedCode = normalizeSubscriptionCode(code);
  if (!/^CODE-[A-Z0-9]{6}$/.test(storedCode)) {
    throw new Error('الكود غير صحيح');
  }
  if (!userId) {
    throw new Error('يجب تسجيل الدخول قبل التفعيل');
  }
  if (!deviceInfo?.fingerprint) {
    throw new Error('معلومات الجهاز ناقصة');
  }

  try {
    const indexSnap = await get(ref(db, `codeIndex/${storedCode}`));
    let foundCodeId = null;
    let foundCodeData = null;

    if (indexSnap.exists()) {
      const idx = indexSnap.val();
      foundCodeId = idx.codeId;
      foundCodeData = { ...idx, id: foundCodeId };
    } else {
      const codesSnap = await get(ref(db, 'codes'));
      if (!codesSnap.exists()) {
        throw new Error('الكود غير موجود');
      }
      codesSnap.forEach((child) => {
        if (child.val()?.code === storedCode) {
          foundCodeId = child.key;
          foundCodeData = { ...child.val(), id: child.key };
        }
      });
    }

    if (!foundCodeId || !foundCodeData) {
      throw new Error('الكود غير صحيح');
    }

    if (foundCodeData.status === 'expired') {
      throw new Error('الكود منتهي الصلاحية');
    }

    if (foundCodeData.status === 'active') {
      if (foundCodeData.userId && foundCodeData.userId !== userId) {
        throw new Error('الكود مُفعّل على حساب آخر');
      }
      if (foundCodeData.expiresAt && foundCodeData.expiresAt <= Date.now()) {
        throw new Error('الكود منتهي الصلاحية');
      }
    } else if (foundCodeData.status !== 'unused') {
      throw new Error('الكود غير متاح للتفعيل');
    }

    const devices = { ...(foundCodeData.devices || {}) };
    const deviceCount = Object.keys(devices).length;
    if (deviceCount >= 2 && !devices[deviceInfo.fingerprint]) {
      throw new Error('تم تجاوز الحد الأقصى للأجهزة');
    }

    const now = Date.now();
    const isFirstActivation = foundCodeData.status === 'unused';
    const expiresAt = isFirstActivation
      ? now + (Number(foundCodeData.duration) || 0) * 24 * 60 * 60 * 1000
      : foundCodeData.expiresAt;

    devices[deviceInfo.fingerprint] = {
      ...deviceInfo,
      activatedAt: now,
    };

    const activeSummary = {
      codeId: foundCodeId,
      code: storedCode,
      activatedAt: isFirstActivation ? now : foundCodeData.activatedAt ?? now,
      expiresAt,
      duration: foundCodeData.duration,
    };

    const indexUpdate = {
      codeId: foundCodeId,
      code: storedCode,
      duration: foundCodeData.duration,
      price: foundCodeData.price,
      status: 'active',
      createdAt: foundCodeData.createdAt,
      activatedAt: activeSummary.activatedAt,
      expiresAt,
      userId,
      devices,
    };

    const updates = {
      [`codeIndex/${storedCode}`]: indexUpdate,
      [`users/${userId}/activeCode`]: activeSummary,
    };

    if (isFirstActivation) {
      const histKey = push(ref(db, `users/${userId}/subscriptionHistory`)).key;
      updates[`users/${userId}/subscriptionHistory/${histKey}`] = {
        code: formatCodeForDisplay(storedCode),
        codeId: foundCodeId,
        duration: Number(foundCodeData.duration) || 0,
        activatedAt: activeSummary.activatedAt,
        expiresAt,
        recordedAt: now,
      };
    }

    await update(ref(db), updates);

    return {
      ...foundCodeData,
      id: foundCodeId,
      code: storedCode,
      status: 'active',
      activatedAt: activeSummary.activatedAt,
      expiresAt,
      userId,
      devices,
    };
  } catch (error) {
    console.error('خطأ في تفعيل الكود:', error);
    if (error?.code === 'PERMISSION_DENIED') {
      throw new Error('صلاحية التفعيل مرفوضة — انشر قواعد firebase-database-rules.json من Firebase Console');
    }
    throw error;
  }
}

/**
 * الحصول على الكود النشط للمستخدم
 * @param {string} userId - معرف المستخدم
 * @returns {Promise<object|null>} بيانات الكود أو null
 */
export async function getActiveUserCode(userId) {
  try {
    const userCodeRef = ref(db, `users/${userId}/activeCode`);
    const snapshot = await get(userCodeRef);
    
    if (snapshot.exists()) {
      const codeData = snapshot.val();
      if (isCodeValid(codeData)) {
        return codeData;
      }
    }
    
    return null;
  } catch (error) {
    console.error('خطأ في الحصول على الكود:', error);
    return null;
  }
}

/**
 * التحقق من صلاحية الكود
 * @param {object} codeData - بيانات الكود
 * @returns {boolean} هل الكود صالح
 */
export function isCodeValid(codeData) {
  if (!codeData || !codeData.expiresAt) return false;
  return Date.now() < codeData.expiresAt;
}

/**
 * حفظ الكود النشط في بيانات المستخدم
 * @param {string} userId - معرف المستخدم
 * @param {object} codeData - بيانات الكود
 */
export async function saveUserActiveCode(userId, codeData) {
  try {
    const userCodeRef = ref(db, `users/${userId}/activeCode`);
    await set(userCodeRef, {
      codeId: codeData.id,
      code: codeData.code,
      activatedAt: codeData.activatedAt,
      expiresAt: codeData.expiresAt,
      duration: codeData.duration
    });
  } catch (error) {
    console.error('خطأ في حفظ الكود:', error);
    throw error;
  }
}

// ═══════════════════════════════════════════
// Refs للأكواد + مسارات المشرفين في RTDB (`admins` الاسم الصحيح، `admin` لتوافق البيانات الموجودة)
// ═══════════════════════════════════════════
const RTDB_ADMIN_ROOT_KEYS = ['admins', 'admin'];

/** يتحقق من وجود سجل مشرف للمستخدم تحت `admins/{uid}` أو `admin/{uid}` */
export async function adminProfileExistsForUid(uid) {
  if (!uid) return false;
  for (const key of RTDB_ADMIN_ROOT_KEYS) {
    const snap = await get(ref(db, `${key}/${uid}`));
    if (snap.exists()) return true;
  }
  return false;
}

/**
 * إنشاء/تحديث ملف اللاعب (بريد، أول دخول، عدّاد دخول) — يُستدعى بعد تسجيل الدخول بالإيميل
 * @param {string} userId
 * @param {{ email?: string | null, displayName?: string | null }} userLike
 */
export async function ensurePlayerProfile(userId, userLike) {
  const email = (userLike?.email || '').trim();
  if (!email || !userId) return;

  const profileRef = ref(db, `users/${userId}/profile`);
  const snap = await get(profileRef);
  const now = Date.now();
  const displayName = (userLike?.displayName || '').trim().slice(0, 80);

  if (!snap.exists()) {
    await set(profileRef, {
      email,
      displayName,
      createdAt: now,
      lastLoginAt: now,
      totalLogins: 1,
      gamesHosted: 0,
    });
    return;
  }

  const prev = snap.val() || {};
  await update(profileRef, {
    email,
    lastLoginAt: now,
    totalLogins: (Number(prev.totalLogins) || 0) + 1,
    displayName: displayName || prev.displayName || '',
    gamesHosted: Number(prev.gamesHosted) || 0,
    createdAt: prev.createdAt || now,
  });
}

export const codesRef = () => ref(db, 'codes');
export const codeRef = (codeId) => ref(db, `codes/${codeId}`);
export const userCodeRef = (userId) => ref(db, `users/${userId}/activeCode`);
export const adminsRef = () => ref(db, 'admins');
