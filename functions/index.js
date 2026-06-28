const { initializeApp } = require('firebase-admin/app');
const { setGlobalOptions } = require('firebase-functions/v2');
const { onCall } = require('firebase-functions/v2/https');
const { activateSubscriptionCodeHandler } = require('./lib/activateSubscriptionCode');
const { syncAdminClaimHandler } = require('./lib/syncAdminClaim');

initializeApp();

const region = process.env.FUNCTIONS_REGION || 'us-central1';
setGlobalOptions({ region, maxInstances: 20 });

/**
 * تفعيل كود الاشتراك — server-side مع rate limiting
 * enforceAppCheck: فعّله بعد ضبط reCAPTCHA في Console
 */
exports.activateSubscriptionCode = onCall(
  {
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
    cors: true,
  },
  activateSubscriptionCodeHandler
);

/** مزامنة Custom Claim admin=true للمشرفين المسجّلين في RTDB */
exports.syncAdminClaim = onCall(
  {
    enforceAppCheck: process.env.ENFORCE_APP_CHECK === 'true',
    cors: true,
  },
  syncAdminClaimHandler
);
