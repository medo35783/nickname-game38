import { ref, get, set, push, update } from "firebase/database";

/**
 * توليد سلسلة عشوائية من 6 أحرف/أرقام (A-Z و 0-9) وتنسيقها كـ CODE-XXXXXX
 * @returns {Promise<string>}
 */
export async function generateUniqueCode() {
  try {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let suffix = "";
    for (let i = 0; i < 6; i += 1) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `CODE-${suffix}`;
  } catch (err) {
    console.error("generateUniqueCode:", err);
    throw err;
  }
}

/**
 * التحقق من عدم تكرار الكود بين السجلات الحالية تحت /codes/
 * @param {import('firebase/database').Database} db
 * @param {string} candidate
 * @returns {Promise<boolean>} true إذا كان الكود غير مستخدم
 */
async function isCodeStringAvailable(db, candidate) {
  const snap = await get(ref(db, "codes"));
  if (!snap.exists()) return true;
  const all = snap.val() || {};
  return !Object.values(all).some((entry) => entry && entry.code === candidate);
}

/**
 * إنشاء كود اشتراك جديد تحت /codes/{codeId}/ بحالة "unused"
 * @param {import('firebase/database').Database} db
 * @param {number} duration عدد أيام الاشتراك (مثلاً 1، 3، 7)
 * @param {number} price السعر بالريال (مثلاً 19، 38، 57)
 * @returns {Promise<{ success: boolean, codeId?: string, code?: string, error?: string }>}
 */
export async function createCode(db, duration, price) {
  try {
    const codesListRef = ref(db, "codes");
    let codeString = "";
    let attempts = 0;
    const maxAttempts = 50;

    while (attempts < maxAttempts) {
      attempts += 1;
      codeString = await generateUniqueCode();
      const free = await isCodeStringAvailable(db, codeString);
      if (free) break;
    }

    if (!codeString || attempts >= maxAttempts) {
      return { success: false, error: "تعذر توليد كود فريد، حاول مجدداً" };
    }

    const newRef = push(codesListRef);
    const codeId = newRef.key;
    const now = Date.now();

    const payload = {
      code: codeString,
      duration,
      price,
      status: "unused",
      createdAt: now,
      activatedAt: null,
      expiresAt: null,
      userId: null,
      devices: {},
    };

    await set(newRef, payload);
    return { success: true, codeId, code: codeString };
  } catch (err) {
    console.error("createCode:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * البحث عن سجل الكود حسب النص الظاهر (حقل code) تحت /codes/
 * @param {import('firebase/database').Database} db
 * @param {string} code
 * @returns {Promise<{ codeId: string, data: object } | null>}
 */
async function findCodeRecordByString(db, code) {
  const snap = await get(ref(db, "codes"));
  if (!snap.exists()) return null;
  const all = snap.val() || {};
  const entry = Object.entries(all).find(([, v]) => v && v.code === code);
  if (!entry) return null;
  return { codeId: entry[0], data: entry[1] };
}

/**
 * تفعيل كود لمستخدم معين وتسجيل الجهاز ضمن devices
 * @param {import('firebase/database').Database} db
 * @param {string} code نص الكود كما يدخله المستخدم (مثل CODE-ABC123)
 * @param {string} userId معرف المستخدم
 * @param {{ fingerprint: string, userAgent?: string, platform?: string }} deviceInfo
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function activateCode(db, code, userId, deviceInfo) {
  try {
    if (!deviceInfo || !deviceInfo.fingerprint) {
      return { success: false, error: "معلومات الجهاز ناقصة (fingerprint مطلوب)" };
    }

    const found = await findCodeRecordByString(db, code);
    if (!found) {
      return { success: false, error: "الكود غير موجود" };
    }

    const { codeId, data } = found;

    if (data.status === "expired" || (data.expiresAt && data.expiresAt <= Date.now())) {
      return { success: false, error: "الكود منتهي الصلاحية" };
    }

    if (data.status !== "unused") {
      return { success: false, error: "الكود غير متاح للتفعيل" };
    }

    const now = Date.now();
    const durationDays = Number(data.duration) || 0;
    const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;

    const fp = deviceInfo.fingerprint;
    const devices = { ...(data.devices || {}) };
    devices[fp] = {
      userAgent: deviceInfo.userAgent ?? "",
      platform: deviceInfo.platform ?? "",
      activatedAt: now,
    };

    const codePath = `codes/${codeId}`;
    const userPath = `users/${userId}/activeCode`;

    const activeCodeSummary = {
      codeId,
      code: data.code,
      activatedAt: now,
      expiresAt,
      duration: data.duration,
    };

    await update(ref(db), {
      [`${codePath}/status`]: "active",
      [`${codePath}/activatedAt`]: now,
      [`${codePath}/expiresAt`]: expiresAt,
      [`${codePath}/userId`]: userId,
      [`${codePath}/devices`]: devices,
      [userPath]: activeCodeSummary,
    });

    return { success: true };
  } catch (err) {
    console.error("activateCode:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * جلب كائن الاشتراك النشط للمستخدم من /users/{userId}/activeCode
 * @param {import('firebase/database').Database} db
 * @param {string} userId
 * @returns {Promise<{ success: boolean, activeCode: object | null, error?: string }>}
 */
export async function getActiveUserCode(db, userId) {
  try {
    const snap = await get(ref(db, `users/${userId}/activeCode`));
    if (!snap.exists()) {
      return { success: true, activeCode: null };
    }
    return { success: true, activeCode: snap.val() };
  } catch (err) {
    console.error("getActiveUserCode:", err);
    return { success: false, activeCode: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * التحقق من أن بيانات الكود تسمح بالاستخدام (نشط وغير منتهي)
 * @param {object | null | undefined} codeData
 * @returns {Promise<boolean>}
 */
export async function isCodeValid(codeData) {
  try {
    if (!codeData || typeof codeData !== "object") return false;
    if (codeData.status !== "active") return false;
    const exp = codeData.expiresAt;
    if (typeof exp !== "number" || exp <= Date.now()) return false;
    return true;
  } catch (err) {
    console.error("isCodeValid:", err);
    return false;
  }
}
