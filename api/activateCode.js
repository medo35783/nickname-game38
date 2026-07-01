import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const PLAN_AMOUNTS = { 1: 900, 3: 1800, 7: 3500 };
const AMOUNT_TO_DAYS = { 900: 1, 1800: 3, 3500: 7 };
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_DB_URL = 'https://nickname-game-default-rtdb.firebaseio.com';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('missing_firebase_config');
    initializeApp({
      credential: cert(JSON.parse(raw)),
      databaseURL: process.env.FIREBASE_DATABASE_URL || DEFAULT_DB_URL,
    });
  }
  return getDatabase();
}

function generateCodeId() {
  const block = (len) =>
    Array.from({ length: len }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  return `PLAY-${block(4)}-${block(4)}`;
}

async function fetchMoyasarPayment(paymentId) {
  const secret = process.env.MOYASAR_SECRET_KEY;
  if (!secret) throw new Error('missing_moyasar_secret');

  const auth = Buffer.from(`${secret}:`).toString('base64');
  const res = await fetch(`https://api.moyasar.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  if (!res.ok) return null;
  return res.json();
}

/** يعيد الدفع بعد تأكيد الحالة paid — مع إعادة محاولة لأن ميسر قد يتأخر بعد 3DS */
async function verifyMoyasarPayment(paymentId, expectedAmount = null) {
  const delays = [0, 1200, 2400, 4000, 6000, 8000];

  for (let i = 0; i < delays.length; i += 1) {
    if (delays[i] > 0) await sleep(delays[i]);

    const payment = await fetchMoyasarPayment(paymentId);
    if (!payment) continue;
    if (payment.status !== 'paid') continue;
    if (payment.currency !== 'SAR') return null;
    if (expectedAmount != null && Number(payment.amount) !== expectedAmount) return null;
    return payment;
  }

  return null;
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
    recovered: true,
  });
  return true;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const { paymentId, planDays: clientPlanDays } = req.body || {};

    if (!paymentId || typeof paymentId !== 'string') {
      res.status(400).json({ error: 'invalid_payment' });
      return;
    }

    const db = getAdminDb();
    const paymentRef = db.ref(`payments/${paymentId}`);
    const existing = await paymentRef.get();
    if (existing.exists()) {
      await returnExistingCode(res, db, paymentId);
      return;
    }

    const verified = await verifyMoyasarPayment(paymentId);
    if (!verified) {
      res.status(402).json({ error: 'invalid_payment' });
      return;
    }

    const days = resolvePlanDays(clientPlanDays, verified.amount);
    if (!days) {
      res.status(400).json({ error: 'invalid_plan' });
      return;
    }

    const codeId = await createUniqueCodeId(db);
    const now = Date.now();
    const expiresAt = now + days * 24 * 60 * 60 * 1000;

    await db.ref().update({
      [`payments/${paymentId}`]: { used: true, codeId, createdAt: now, planDays: days },
      [`codes/${codeId}`]: {
        code: codeId,
        planDays: days,
        createdAt: now,
        expiresAt,
        paymentId,
        active: true,
        sessions: 0,
        source: 'moyasar',
      },
    });

    res.status(200).json({ success: true, code: codeId, expiresAt });
  } catch (err) {
    console.error('activateCode:', err);
    res.status(500).json({ error: 'server_error' });
  }
}
