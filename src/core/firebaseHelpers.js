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

/**
 * توليد كود عشوائي فريد
 * @returns {string} كود بصيغة CODE-XXXXXX
 */
export function generateUniqueCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون O,0,I,1
  let code = 'CODE-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
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
    
    await set(codeRef, codeData);
    return { id: codeRef.key, ...codeData };
  } catch (error) {
    console.error('خطأ في إنشاء الكود:', error);
    throw error;
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
  try {
    // البحث عن الكود
    const codesRef = ref(db, 'codes');
    const snapshot = await get(codesRef);
    
    if (!snapshot.exists()) {
      throw new Error('الكود غير موجود');
    }
    
    let foundCodeId = null;
    let foundCodeData = null;
    
    snapshot.forEach((child) => {
      if (child.val().code === code) {
        foundCodeId = child.key;
        foundCodeData = child.val();
      }
    });
    
    if (!foundCodeId) {
      throw new Error('الكود غير صحيح');
    }
    
    if (foundCodeData.status === 'expired') {
      throw new Error('الكود منتهي الصلاحية');
    }
    
    // التحقق من عدد الأجهزة
    const devices = foundCodeData.devices || {};
    const deviceCount = Object.keys(devices).length;
    
    if (deviceCount >= 2 && !devices[deviceInfo.fingerprint]) {
      throw new Error('تم تجاوز الحد الأقصى للأجهزة');
    }
    
    // تفعيل الكود
    const now = Date.now();
    const expiresAt = now + (foundCodeData.duration * 24 * 60 * 60 * 1000);
    
    const updates = {
      [`codes/${foundCodeId}/status`]: 'active',
      [`codes/${foundCodeId}/activatedAt`]: now,
      [`codes/${foundCodeId}/expiresAt`]: expiresAt,
      [`codes/${foundCodeId}/userId`]: userId,
      [`codes/${foundCodeId}/devices/${deviceInfo.fingerprint}`]: {
        ...deviceInfo,
        activatedAt: now
      }
    };
    
    await update(ref(db), updates);
    
    return {
      ...foundCodeData,
      id: foundCodeId,
      status: 'active',
      activatedAt: now,
      expiresAt
    };
  } catch (error) {
    console.error('خطأ في تفعيل الكود:', error);
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
// Refs للأكواد
// ═══════════════════════════════════════════
export const codesRef = () => ref(db, 'codes');
export const codeRef = (codeId) => ref(db, `codes/${codeId}`);
export const userCodeRef = (userId) => ref(db, `users/${userId}/activeCode`);
export const adminsRef = () => ref(db, 'admins');
