const { HttpsError } = require('firebase-functions/v2/https');
const { adminExistsInRtdb } = require('./codeHelpers');

async function syncAdminClaimHandler(request) {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'يجب تسجيل الدخول');
  }

  const adminAuth = require('firebase-admin').auth();
  const db = require('firebase-admin').database();

  const isAdmin = await adminExistsInRtdb(db, uid);
  const userRecord = await adminAuth.getUser(uid);
  const currentClaims = userRecord.customClaims || {};
  const hadAdmin = currentClaims.admin === true;

  if (isAdmin && !hadAdmin) {
    await adminAuth.setCustomUserClaims(uid, { ...currentClaims, admin: true });
    return { admin: true, refreshed: true };
  }

  if (!isAdmin && hadAdmin) {
    await adminAuth.setCustomUserClaims(uid, { ...currentClaims, admin: false });
    return { admin: false, refreshed: true };
  }

  return { admin: isAdmin, refreshed: false };
}

module.exports = { syncAdminClaimHandler };
