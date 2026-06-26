import { ref, onValue, push, set, update, get } from 'firebase/database';
import { db } from '../firebase';
import { derivePrizeReadySessions } from './marketingStatsHelpers';

const PRIZE_PATH = 'platform/prizeAwards';

export const PRIZE_STATUS = {
  eligible: { label: 'مؤهلة', tone: 'partial' },
  awarded: { label: 'فائز محدد', tone: 'gold' },
  delivered: { label: 'تم التسليم', tone: 'ready' },
};

function sessionKey(codeId, sessionTs) {
  return `${codeId}_${sessionTs}`;
}

function normalizeAward(id, raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    id,
    sessionKey: raw.sessionKey || '',
    codeId: raw.codeId || '',
    code: raw.code || '',
    sessionTs: Number(raw.sessionTs) || 0,
    roomCode: raw.roomCode || '—',
    gameType: raw.gameType || '',
    adminName: raw.adminName || '—',
    playerCount: Number(raw.playerCount) || 0,
    totalRounds: Number(raw.totalRounds) || 0,
    participantLabels: Array.isArray(raw.participantLabels) ? raw.participantLabels : [],
    sponsorId: raw.sponsorId || null,
    sponsorName: raw.sponsorName || null,
    sponsorLogoUrl: raw.sponsorLogoUrl || null,
    prizeOffer: raw.prizeOffer || '',
    winnerName: raw.winnerName || '',
    status: raw.status || 'eligible',
    notes: raw.notes || '',
    createdAt: Number(raw.createdAt) || 0,
    updatedAt: Number(raw.updatedAt) || 0,
    deliveredAt: Number(raw.deliveredAt) || null,
  };
}

/** جلسات مؤهلة لم تُسجَّل بعد كجوائز */
export function deriveUnregisteredPrizeSessions(codeRows = [], codeStatsById = {}, awards = []) {
  const claimed = new Set(awards.map((a) => a.sessionKey || sessionKey(a.codeId, a.sessionTs)));
  const pool = [];

  codeRows.forEach((row) => {
    const stats = codeStatsById[row.id]?.data;
    if (!stats) return;
    const ready = derivePrizeReadySessions(stats.recentSessions);
    ready.forEach((s) => {
      const key = sessionKey(row.id, s.ts);
      if (claimed.has(key)) return;
      pool.push({
        sessionKey: key,
        codeId: row.id,
        code: row.code,
        sessionTs: s.ts,
        roomCode: s.roomCode || '—',
        gameType: s.gameType,
        adminName: s.adminName || '—',
        playerCount: Number(s.playerCount) || 0,
        totalRounds: Number(s.totalRounds) || 0,
        participantLabels: Array.isArray(s.participantLabels) ? s.participantLabels : [],
        sponsorId: row.sponsorId || s.sponsorId || null,
        sponsorName: row.sponsorName || s.sponsorName || null,
        prizeOffer: row.prizeOffer || '',
        sponsorLogoUrl: row.sponsorLogoUrl || null,
        dateLabel: s.ts
          ? new Date(s.ts).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
          : '—',
      });
    });
  });

  return pool.sort((a, b) => (b.sessionTs || 0) - (a.sessionTs || 0));
}

export function subscribePrizeAwards(onData) {
  const r = ref(db, PRIZE_PATH);
  return onValue(
    r,
    (snap) => {
      const val = snap.val() || {};
      const list = Object.entries(val)
        .map(([id, row]) => normalizeAward(id, row))
        .filter(Boolean)
        .sort((a, b) => (b.sessionTs || b.createdAt) - (a.sessionTs || a.createdAt));
      onData(list);
    },
    () => onData([])
  );
}

export async function fetchPrizeAwards() {
  const snap = await get(ref(db, PRIZE_PATH));
  const val = snap.val() || {};
  return Object.entries(val)
    .map(([id, row]) => normalizeAward(id, row))
    .filter(Boolean);
}

export async function registerPrizeSession(sessionRow) {
  const key = sessionRow.sessionKey || sessionKey(sessionRow.codeId, sessionRow.sessionTs);
  const data = {
    sessionKey: key,
    codeId: sessionRow.codeId,
    code: sessionRow.code,
    sessionTs: sessionRow.sessionTs,
    roomCode: sessionRow.roomCode,
    gameType: sessionRow.gameType,
    adminName: sessionRow.adminName,
    playerCount: sessionRow.playerCount,
    totalRounds: sessionRow.totalRounds,
    participantLabels: sessionRow.participantLabels || [],
    sponsorId: sessionRow.sponsorId || null,
    sponsorName: sessionRow.sponsorName || null,
    prizeOffer: sessionRow.prizeOffer || '',
    sponsorLogoUrl: sessionRow.sponsorLogoUrl || null,
    winnerName: '',
    status: 'eligible',
    notes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const newRef = push(ref(db, PRIZE_PATH));
  await set(newRef, data);
  return newRef.key;
}

export async function updatePrizeAward(id, patch) {
  if (!id) return;
  const next = { updatedAt: Date.now() };
  if (patch.winnerName !== undefined) next.winnerName = String(patch.winnerName || '').trim().slice(0, 80);
  if (patch.status) next.status = patch.status;
  if (patch.notes !== undefined) next.notes = String(patch.notes || '').slice(0, 300);
  if (patch.status === 'awarded' && patch.winnerName) next.status = 'awarded';
  if (patch.status === 'delivered') {
    next.status = 'delivered';
    next.deliveredAt = Date.now();
  }
  await update(ref(db, `${PRIZE_PATH}/${id}`), next);
}
