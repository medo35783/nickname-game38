const { HttpsError } = require('firebase-functions/v2/https');
const {
  normalizeSubscriptionCode,
  formatCodeForDisplay,
  normalizeWhatsappPhone,
  buildActiveCodeSponsorPayload,
} = require('./codeHelpers');

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;

async function readRateLimit(db, uid) {
  const snap = await db.ref(`security/rateLimits/codeActivate/${uid}`).get();
  const data = snap.val() || { failCount: 0, windowStart: Date.now() };
  if (Date.now() - data.windowStart > WINDOW_MS) {
    return { failCount: 0, windowStart: Date.now() };
  }
  return data;
}

async function writeRateLimit(db, uid, data) {
  await db.ref(`security/rateLimits/codeActivate/${uid}`).set(data);
}

async function recordFailure(db, uid) {
  const data = await readRateLimit(db, uid);
  data.failCount = (data.failCount || 0) + 1;
  if (data.failCount >= MAX_FAILURES) {
    await db.ref('security/events').push({
      type: 'code_activate_lockout',
      uid,
      failCount: data.failCount,
      at: Date.now(),
    });
  }
  await writeRateLimit(db, uid, data);
  return data.failCount;
}

async function clearRateLimit(db, uid) {
  await db.ref(`security/rateLimits/codeActivate/${uid}`).remove();
}

function assertNotLocked(data) {
  if ((data.failCount || 0) >= MAX_FAILURES) {
    throw new HttpsError(
      'resource-exhausted',
      'محاولات كثيرة — انتظر 15 دقيقة ثم أعد المحاولة'
    );
  }
}

async function findCodeRecord(db, storedCode) {
  const indexSnap = await db.ref(`codeIndex/${storedCode}`).get();
  if (indexSnap.exists()) {
    const idx = indexSnap.val();
    return { foundCodeId: idx.codeId, foundCodeData: { ...idx, id: idx.codeId } };
  }

  const codesSnap = await db.ref('codes').get();
  if (!codesSnap.exists()) {
    return { foundCodeId: null, foundCodeData: null };
  }

  let foundCodeId = null;
  let foundCodeData = null;
  codesSnap.forEach((child) => {
    if (child.val()?.code === storedCode) {
      foundCodeId = child.key;
      foundCodeData = { ...child.val(), id: child.key };
    }
  });
  return { foundCodeId, foundCodeData };
}

async function activateSubscriptionCodeHandler(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'سجّل الدخول أو انتظر تحميل الجلسة');
  }

  const db = require('firebase-admin').database();
  const rateData = await readRateLimit(db, uid);
  assertNotLocked(rateData);

  const rawCode = request.data?.code;
  const deviceInfo = request.data?.deviceInfo;
  const phoneOpt = request.data?.phone;

  const storedCode = normalizeSubscriptionCode(rawCode);
  if (!/^CODE-[A-Z0-9]{6}$/.test(storedCode)) {
    await recordFailure(db, uid);
    throw new HttpsError('invalid-argument', 'الكود غير صحيح');
  }
  if (!deviceInfo?.fingerprint) {
    throw new HttpsError('invalid-argument', 'معلومات الجهاز ناقصة');
  }

  try {
    const { foundCodeId, foundCodeData } = await findCodeRecord(db, storedCode);
    if (!foundCodeId || !foundCodeData) {
      await recordFailure(db, uid);
      throw new HttpsError('not-found', 'الكود غير صحيح');
    }

    if (foundCodeData.status === 'expired') {
      await recordFailure(db, uid);
      throw new HttpsError('failed-precondition', 'الكود منتهي الصلاحية');
    }

    if (foundCodeData.status === 'active') {
      if (foundCodeData.userId && foundCodeData.userId !== uid) {
        await recordFailure(db, uid);
        throw new HttpsError('permission-denied', 'الكود مُفعّل على حساب آخر');
      }
      if (foundCodeData.expiresAt && foundCodeData.expiresAt <= Date.now()) {
        await recordFailure(db, uid);
        throw new HttpsError('failed-precondition', 'الكود منتهي الصلاحية');
      }
    } else if (foundCodeData.status !== 'unused') {
      await recordFailure(db, uid);
      throw new HttpsError('failed-precondition', 'الكود غير متاح للتفعيل');
    }

    const devices = { ...(foundCodeData.devices || {}) };
    const deviceCount = Object.keys(devices).length;
    if (deviceCount >= 2 && !devices[deviceInfo.fingerprint]) {
      throw new HttpsError('resource-exhausted', 'تم تجاوز الحد الأقصى للأجهزة (2)');
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
      userId: uid,
      devices,
    };

    const phone = normalizeWhatsappPhone(phoneOpt);

    const updates = {
      [`codeIndex/${storedCode}`]: indexUpdate,
      [`users/${uid}/activeCode`]: activeSummary,
      [`codes/${foundCodeId}/status`]: 'active',
      [`codes/${foundCodeId}/activatedAt`]: activeSummary.activatedAt,
      [`codes/${foundCodeId}/expiresAt`]: expiresAt,
      [`codes/${foundCodeId}/userId`]: uid,
      [`codes/${foundCodeId}/devices`]: devices,
    };

    if (phone && isFirstActivation) {
      updates[`codes/${foundCodeId}/phone`] = phone;
    }

    if (isFirstActivation) {
      const histKey = db.ref(`users/${uid}/subscriptionHistory`).push().key;
      updates[`users/${uid}/subscriptionHistory/${histKey}`] = {
        code: formatCodeForDisplay(storedCode),
        codeId: foundCodeId,
        duration: Number(foundCodeData.duration) || 0,
        activatedAt: activeSummary.activatedAt,
        expiresAt,
        recordedAt: now,
      };
    }

    await db.ref().update(updates);
    await clearRateLimit(db, uid);

    return {
      ...foundCodeData,
      id: foundCodeId,
      code: storedCode,
      status: 'active',
      activatedAt: activeSummary.activatedAt,
      expiresAt,
      userId: uid,
      devices,
      phone: phone || foundCodeData.phone || null,
      ...buildActiveCodeSponsorPayload(foundCodeData),
    };
  } catch (err) {
    if (err instanceof HttpsError) throw err;
    console.error('activateSubscriptionCode', err);
    throw new HttpsError('internal', 'حدث خطأ في التفعيل — حاول لاحقاً');
  }
}

module.exports = { activateSubscriptionCodeHandler, WINDOW_MS, MAX_FAILURES };
