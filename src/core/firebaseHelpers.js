import { ref, set, get, update, onValue, off, push, remove } from "firebase/database";
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { buildActiveCodeSponsorPayload } from './sponsorStatsHelpers';
import { USE_CLOUD_ACTIVATION } from './securityMode';
import {
  assertCodeActivationAllowed,
  clearCodeActivationAttempts,
  recordCodeActivationFailure,
} from './codeActivationRateLimit';

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

export { ref, set, get, update, onValue, off, push, remove, db };

export {
  resolveUserId,
  resolveCodeId,
  buildGameSessionTracking,
  persistActiveCodeLocal,
} from './sessionStats';

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

/** يُحوّل رقم واتساب محلي (05…) إلى صيغة wa.me (966…) */
export function normalizeWhatsappPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('966') && digits.length >= 12) return digits.slice(0, 15);
  if (digits.startsWith('05') && digits.length >= 10) return `966${digits.slice(1)}`;
  if (digits.startsWith('5') && digits.length === 9) return `966${digits}`;
  if (digits.length >= 9 && digits.length <= 15) return digits;
  return '';
}

/**
 * توليد كود عشوائي فريد
 * @returns {string} كود بصيغة CODE-XXXXXX
 */
export function generateUniqueCode() {
  return formatStoredCode(generateCodeSuffix());
}

/** مدة انتهاء الكود من لحظة التفعيل */
export function computeCodeExpiresAt(codeData, now = Date.now()) {
  const hours = Number(codeData?.durationHours);
  if (Number.isFinite(hours) && hours > 0) {
    return now + hours * 60 * 60 * 1000;
  }
  const days = Number(codeData?.duration) || 0;
  return now + days * 24 * 60 * 60 * 1000;
}

/** عرض مدة الاشتراك (أيام أو ساعات للترويج) */
export function formatSubscriptionDuration(activeCode) {
  const hours = Number(activeCode?.durationHours);
  if (Number.isFinite(hours) && hours > 0) {
    return hours === 1 ? '1 ساعة' : `${hours} ساعات`;
  }
  const days = Number(activeCode?.duration);
  if (days > 0) {
    return days === 1 ? '1 يوم' : `${days} أيام`;
  }
  return '—';
}

function buildActivationMetaFields(codeData) {
  const meta = {};
  if (codeData?.source) meta.source = codeData.source;
  const hours = Number(codeData?.durationHours);
  if (Number.isFinite(hours) && hours > 0) meta.durationHours = hours;
  if (codeData?.promoNote) meta.promoNote = codeData.promoNote;
  return meta;
}

/**
 * إنشاء كود جديد في قاعدة البيانات
 * @param {number} duration - المدة بالأيام (1, 3, 7) — 0 للترويج بالساعات
 * @param {number} price - السعر بالريال
 * @param {{ source?: string, promoNote?: string, durationHours?: number }} [meta]
 * @returns {Promise<object>} الكود المُنشأ
 */
export async function createCode(duration, price, meta = {}) {
  try {
    const code = generateUniqueCode();
    const codeRef = push(ref(db, 'codes'));
    const codeId = codeRef.key;
    const source = meta.source === 'promo' ? 'promo' : 'paid';
    const codeData = {
      code,
      duration: Number(duration) || 0,
      price: Number(price) || 0,
      source,
      status: 'unused',
      createdAt: Date.now(),
      activatedAt: null,
      expiresAt: null,
      userId: null,
      devices: {},
    };

    if (meta.durationHours) {
      codeData.durationHours = Number(meta.durationHours);
    }
    if (meta.promoNote) {
      codeData.promoNote = String(meta.promoNote).trim().slice(0, 120);
    }

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

function mapCallableActivationError(err) {
  const code = String(err?.code || '');
  const msg = String(err?.message || '').trim();

  if (code.includes('resource-exhausted')) {
    return msg || 'محاولات كثيرة — انتظر قليلاً';
  }
  if (code.includes('permission-denied')) {
    return msg || 'الكود مُفعّل على حساب آخر';
  }
  if (code.includes('failed-precondition')) {
    return msg || 'الكود غير متاح للتفعيل';
  }
  if (code.includes('not-found') || code.includes('invalid-argument')) {
    return 'الكود غير صحيح';
  }
  if (code.includes('unauthenticated')) {
    return 'جاري الاتصال… أعد المحاولة بعد ثوانٍ';
  }
  if (code.includes('unavailable') || code.includes('internal')) {
    return msg || 'خدمة التفعيل غير متاحة — حاول لاحقاً';
  }
  return msg || 'حدث خطأ، يرجى المحاولة مرة أخرى';
}

/**
 * تفعيل كود — spark: من المتصفح | blaze: Cloud Function (الدرع السحابي)
 */
export async function activateCode(code, userId, deviceInfo, options = {}) {
  if (USE_CLOUD_ACTIVATION) {
    return activateCodeViaCloud(code, userId, deviceInfo, options);
  }
  return activateCodeClient(code, userId, deviceInfo, options);
}

async function activateCodeViaCloud(code, userId, deviceInfo, options = {}) {
  if (!userId) {
    throw new Error('الجلسة غير جاهزة — أعد تحميل الصفحة');
  }
  if (!deviceInfo?.fingerprint) {
    throw new Error('معلومات الجهاز ناقصة');
  }

  try {
    const fn = httpsCallable(functions, 'activateSubscriptionCode');
    const { data } = await fn({
      code: normalizeSubscriptionCode(code),
      deviceInfo,
      phone: options.phone || null,
    });
    return data;
  } catch (error) {
    console.error('خطأ في تفعيل الكود (cloud):', error);
    throw new Error(mapCallableActivationError(error));
  }
}

async function activateCodeClient(code, userId, deviceInfo, options = {}) {
  assertCodeActivationAllowed(userId);
  const storedCode = normalizeSubscriptionCode(code);
  if (!/^CODE-[A-Z0-9]{6}$/.test(storedCode)) {
    throw new Error('الكود غير صحيح');
  }
  if (!userId) {
    throw new Error('الجلسة غير جاهزة — أعد تحميل الصفحة');
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
      throw new Error('تم تجاوز الحد الأقصى للأجهزة (2)');
    }

    const now = Date.now();
    const isFirstActivation = foundCodeData.status === 'unused';
    const expiresAt = isFirstActivation
      ? computeCodeExpiresAt(foundCodeData, now)
      : foundCodeData.expiresAt;

    devices[deviceInfo.fingerprint] = {
      ...deviceInfo,
      activatedAt: now,
    };

    const activationMeta = buildActivationMetaFields(foundCodeData);

    const activeSummary = {
      codeId: foundCodeId,
      code: storedCode,
      activatedAt: isFirstActivation ? now : foundCodeData.activatedAt ?? now,
      expiresAt,
      duration: foundCodeData.duration,
      price: foundCodeData.price,
      ...activationMeta,
      ...buildActiveCodeSponsorPayload(foundCodeData),
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
      ...activationMeta,
    };

    const phone = normalizeWhatsappPhone(options.phone);

    const updates = {
      [`codeIndex/${storedCode}`]: indexUpdate,
      [`users/${userId}/activeCode`]: activeSummary,
      [`codes/${foundCodeId}/status`]: 'active',
      [`codes/${foundCodeId}/activatedAt`]: activeSummary.activatedAt,
      [`codes/${foundCodeId}/expiresAt`]: expiresAt,
      [`codes/${foundCodeId}/userId`]: userId,
      [`codes/${foundCodeId}/devices`]: devices,
    };

    if (phone && isFirstActivation) {
      updates[`codes/${foundCodeId}/phone`] = phone;
    }

    if (isFirstActivation) {
      const histKey = push(ref(db, `users/${userId}/subscriptionHistory`)).key;
      updates[`users/${userId}/subscriptionHistory/${histKey}`] = {
        code: formatCodeForDisplay(storedCode),
        codeId: foundCodeId,
        duration: Number(foundCodeData.duration) || 0,
        ...activationMeta,
        activatedAt: activeSummary.activatedAt,
        expiresAt,
        recordedAt: now,
      };
    }

    await update(ref(db), updates);

    clearCodeActivationAttempts(userId);

    return {
      ...foundCodeData,
      id: foundCodeId,
      code: storedCode,
      status: 'active',
      activatedAt: activeSummary.activatedAt,
      expiresAt,
      userId,
      devices,
      phone: phone || foundCodeData.phone || null,
      ...buildActiveCodeSponsorPayload(foundCodeData),
    };
  } catch (error) {
    console.error('خطأ في تفعيل الكود:', error);
    if (error?.code === 'PERMISSION_DENIED') {
      throw new Error('صلاحية التفعيل مرفوضة — انشر قواعد firebase-database-rules.json');
    }
    const msg = error?.message || '';
    if (
      userId &&
      !msg.includes('محاولات كثيرة') &&
      !msg.includes('الجلسة غير جاهزة') &&
      !msg.includes('معلومات الجهاز')
    ) {
      await recordCodeActivationFailure(userId, msg);
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
  const phone = normalizeWhatsappPhone(userLike?.phone);

  if (!snap.exists()) {
    const payload = {
      email,
      displayName,
      createdAt: now,
      lastLoginAt: now,
      totalLogins: 1,
      gamesHosted: 0,
    };
    if (phone) payload.phone = phone;
    await set(profileRef, payload);
    return;
  }

  const prev = snap.val() || {};
  const patch = {
    email,
    lastLoginAt: now,
    totalLogins: (Number(prev.totalLogins) || 0) + 1,
    displayName: displayName || prev.displayName || '',
    gamesHosted: Number(prev.gamesHosted) || 0,
    createdAt: prev.createdAt || now,
  };
  if (phone) patch.phone = phone;
  await update(profileRef, patch);
}

/** حفظ رقم واتساب على الكود (لقاعدة العملاء وتذكير التجديد) */
export async function saveCodePhone(codeId, phone) {
  const normalized = normalizeWhatsappPhone(phone);
  if (!codeId || !normalized) return;
  await update(ref(db), { [`codes/${codeId}/phone`]: normalized });
}

export const codesRef = () => ref(db, 'codes');
export const codeRef = (codeId) => ref(db, `codes/${codeId}`);
export const userCodeRef = (userId) => ref(db, `users/${userId}/activeCode`);
export const adminsRef = () => ref(db, 'admins');
