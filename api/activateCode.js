import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getDatabase } from 'firebase-admin/database';

const PLAN_AMOUNTS = { 1: 900, 3: 1800, 7: 3500 };
const AMOUNT_TO_DAYS = { 900: 1, 1800: 3, 3500: 7 };
const PLAN_NAMES = { 1: 'لمسة سريعة', 3: 'جمعة اللمة', 7: 'أسبوع البطولة' };
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_DB_URL = 'https://nickname-game-default-rtdb.firebaseio.com';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function cleanSecret(raw) {
  if (!raw) return '';
  return String(raw).trim().replace(/^["']|["']$/g, '');
}

function parseServiceAccountJson(raw) {
  if (!raw) return null;
  let trimmed = String(raw).trim().replace(/^\uFEFF/, '');
  trimmed = trimmed.replace(/^["']|["']$/g, '');

  const attempts = [trimmed];
  if (trimmed.includes('\\n')) {
    attempts.push(trimmed.replace(/\\n/g, '\n'));
  }

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed?.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      if (parsed?.client_email && parsed?.project_id) return parsed;
    } catch {
      /* try next */
    }
  }

  throw new Error('invalid_firebase_config');
}

let adminInitPromise = null;

function getAdminApp() {
  if (getApps().length) return;

  if (!adminInitPromise) {
    adminInitPromise = (async () => {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      if (!raw) throw new Error('missing_firebase_config');
      initializeApp({
        credential: cert(parseServiceAccountJson(raw)),
        databaseURL: process.env.FIREBASE_DATABASE_URL || DEFAULT_DB_URL,
      });
    })();
  }

  return adminInitPromise;
}

async function getAdminDb() {
  await getAdminApp();
  return getDatabase();
}

async function getAdminAuth() {
  await getAdminApp();
  return getAuth();
}

function generateCodeId() {
  return Array.from(
    { length: 8 },
    () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)],
  ).join('');
}

async function verifyUserToken(idToken) {
  if (!idToken || typeof idToken !== 'string') return null;
  try {
    const authAdmin = await getAdminAuth();
    const decoded = await authAdmin.verifyIdToken(idToken);
    return decoded.uid;
  } catch {
    return null;
  }
}

async function fetchMoyasarPayment(paymentId) {
  const secret = cleanSecret(process.env.MOYASAR_SECRET_KEY);
  if (!secret) return { ok: false, reason: 'missing_moyasar_secret' };

  const authHeader = Buffer.from(`${secret}:`).toString('base64');
  const res = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${authHeader}` },
  });

  if (res.status === 401 || res.status === 403) {
    return { ok: false, reason: 'moyasar_auth_failed', status: res.status };
  }
  if (!res.ok) {
    return { ok: false, reason: 'moyasar_fetch_failed', status: res.status };
  }

  return { ok: true, payment: await res.json() };
}

/** تأكيد paid — محاولات سريعة على السيرver؛ الباقي يعيده العميل */
async function verifyMoyasarPayment(paymentId) {
  const delays = [0, 1000, 2500];
  let lastStatus = null;

  for (let i = 0; i < delays.length; i += 1) {
    if (delays[i] > 0) await sleep(delays[i]);

    const result = await fetchMoyasarPayment(paymentId);
    if (result.reason === 'missing_moyasar_secret') {
      return { ok: false, reason: 'missing_moyasar_secret' };
    }
    if (result.reason === 'moyasar_auth_failed') {
      return { ok: false, reason: 'moyasar_auth_failed' };
    }
    if (!result.ok) continue;

    const payment = result.payment;
    lastStatus = payment?.status || null;
    if (payment?.status !== 'paid') continue;
    if (payment?.currency !== 'SAR') return { ok: false, reason: 'invalid_currency' };
    return { ok: true, payment };
  }

  if (lastStatus === 'failed') {
    return { ok: false, reason: 'payment_failed', status: lastStatus };
  }
  return { ok: false, reason: 'not_paid_yet', status: lastStatus };
}

async function withDbRetry(fn, retries = 3) {
  let lastErr;
  for (let i = 0; i < retries; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < retries - 1) await sleep(400 * (i + 1));
    }
  }
  throw lastErr;
}

function resolvePlanDays(clientPlanDays, paymentAmount) {
  const amount = Number(paymentAmount);
  const fromAmount = AMOUNT_TO_DAYS[amount];
  const days = Number(clientPlanDays);

  if (fromAmount && days && PLAN_AMOUNTS[days] === amount) return days;
  if (fromAmount) return fromAmount;
  if (days && PLAN_AMOUNTS[days]) return days;
  return null;
}

async function createUniqueCodeId(db) {
  for (let i = 0; i < 12; i += 1) {
    const codeId = generateCodeId();
    const snap = await db.ref(`codes/${codeId}`).get();
    if (!snap.exists()) return codeId;
  }
  throw new Error('code_generation_failed');
}

function buildCodeRecord(codeId, days, now, expiresAt, paymentId, userId) {
  return {
    code: codeId,
    planDays: days,
    duration: days,
    price: PLAN_AMOUNTS[days] ? PLAN_AMOUNTS[days] / 100 : 0,
    createdAt: now,
    activatedAt: now,
    expiresAt,
    paymentId,
    status: 'active',
    source: 'moyasar',
    userId: userId || null,
    sessions: 0,
  };
}

function buildActiveSummary(codeId, days, now, expiresAt, paymentId) {
  return {
    codeId,
    code: codeId,
    activatedAt: now,
    expiresAt,
    duration: days,
    paymentId,
    source: 'moyasar',
  };
}

function buildHistoryEntry(codeId, days, now, expiresAt, paymentId, amountHalalas) {
  return {
    code: codeId.length <= 16 ? codeId : codeId.slice(0, 16),
    codeId,
    duration: days,
    planName: PLAN_NAMES[days] || `${days} يوم`,
    amountSar: amountHalalas / 100,
    paymentId,
    source: 'moyasar',
    activatedAt: now,
    expiresAt,
    recordedAt: now,
  };
}

function buildUserBindUpdates(db, uid, codeId, codeRecord, historyEntry) {
  const histKey = db.ref(`users/${uid}/subscriptionHistory`).push().key;
  return {
    [`users/${uid}/activeCode`]: buildActiveSummary(
      codeId,
      codeRecord.duration,
      codeRecord.activatedAt,
      codeRecord.expiresAt,
      codeRecord.paymentId,
    ),
    [`users/${uid}/subscriptionHistory/${histKey}`]: historyEntry,
  };
}

async function returnExistingCode(res, db, paymentId) {
  const paymentSnap = await db.ref(`payments/${paymentId}`).get();
  if (!paymentSnap.exists()) {
    res.status(409).json({ error: 'duplicate' });
    return true;
  }

  const paymentData = paymentSnap.val();
  if (!paymentData?.codeId) {
    res.status(409).json({ error: 'duplicate' });
    return true;
  }

  const codeSnap = await db.ref(`codes/${paymentData.codeId}`).get();
  if (!codeSnap.exists()) {
    res.status(409).json({ error: 'duplicate' });
    return true;
  }

  const code = codeSnap.val();
  res.status(200).json({
    success: true,
    code: paymentData.codeId,
    expiresAt: code.expiresAt,
    activatedAt: code.activatedAt || paymentData.createdAt,
    duration: code.duration || code.planDays || paymentData.planDays,
    paymentId,
    recovered: true,
  });
  return true;
}

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const { paymentId, planDays: clientPlanDays, idToken } = req.body || {};

    if (!paymentId || typeof paymentId !== 'string') {
      res.status(400).json({ error: 'invalid_payment' });
      return;
    }

    const userId = await verifyUserToken(idToken);
    const db = await getAdminDb();
    const paymentRef = db.ref(`payments/${paymentId}`);
    const existing = await withDbRetry(() => paymentRef.get());

    if (existing.exists()) {
      await returnExistingCode(res, db, paymentId);
      return;
    }

    const verified = await verifyMoyasarPayment(paymentId);
    if (!verified.ok) {
      const status = verified.reason === 'moyasar_auth_failed' ? 401
        : verified.reason === 'missing_moyasar_secret' ? 500
          : 402;
      res.status(status).json({
        error: verified.reason || 'invalid_payment',
        moyasarStatus: verified.status || null,
      });
      return;
    }

    const days = resolvePlanDays(clientPlanDays, verified.payment.amount);
    if (!days) {
      res.status(400).json({ error: 'invalid_plan' });
      return;
    }

    const codeId = await createUniqueCodeId(db);
    const now = Date.now();
    const expiresAt = now + days * 24 * 60 * 60 * 1000;
    const codeRecord = buildCodeRecord(codeId, days, now, expiresAt, paymentId, userId);
    const historyEntry = buildHistoryEntry(
      codeId,
      days,
      now,
      expiresAt,
      paymentId,
      Number(verified.payment.amount),
    );

    const updates = {
      [`payments/${paymentId}`]: { used: true, codeId, createdAt: now, planDays: days, userId: userId || null },
      [`codes/${codeId}`]: codeRecord,
    };

    if (userId) {
      Object.assign(updates, buildUserBindUpdates(db, userId, codeId, codeRecord, historyEntry));
    }

    await withDbRetry(() => db.ref().update(updates));

    res.status(200).json({
      success: true,
      code: codeId,
      expiresAt,
      activatedAt: now,
      duration: days,
      paymentId,
    });
  } catch (err) {
    console.error('activateCode:', err);
    const msg = err?.message || '';
    if (msg === 'missing_firebase_config' || msg === 'invalid_firebase_config') {
      res.status(500).json({ error: msg });
      return;
    }
    res.status(500).json({ error: 'server_error' });
  }
}
