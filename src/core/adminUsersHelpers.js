/**
 * مساعدات قائمة المشرفين — لوحة الأدمن
 */

import { formatCodeForDisplay } from './firebaseHelpers';

const MS_30D = 30 * 24 * 60 * 60 * 1000;

export const SUPERVISOR_PAGE_SIZES = [10, 20, 30];

const GAME_LABELS = {
  titles: '🎭 الألقاب',
  fameeri: '🦅 القميري',
  hesbah: '🎯 الحسبة',
};

export function deriveSupervisorUids(codeRows = [], indexByCode = {}) {
  const byUid = new Map();

  codeRows.forEach((row) => {
    const idx = indexByCode[row.code] || {};
    const uid = row.userId || idx.userId;
    if (!uid) return;

    const activatedAt = Number(row.activatedAt || idx.activatedAt || row.createdAt) || 0;
    const existing = byUid.get(uid);
    if (!existing || activatedAt > existing.activatedAt) {
      byUid.set(uid, {
        uid,
        code: row.code,
        codeId: row.id,
        status: row.status || idx.status || 'unknown',
        duration: row.duration ?? idx.duration,
        expiresAt: row.expiresAt || idx.expiresAt || null,
        activatedAt,
      });
    }
  });

  return [...byUid.values()].sort((a, b) => (b.activatedAt || 0) - (a.activatedAt || 0));
}

export function isSupervisorAbsent(lastLoginAt) {
  if (!lastLoginAt) return true;
  return Date.now() - Number(lastLoginAt) > MS_30D;
}

export function daysSinceLogin(lastLoginAt) {
  if (!lastLoginAt) return null;
  return Math.floor((Date.now() - Number(lastLoginAt)) / MS_30D);
}

export function formatLastLogin(lastLoginAt) {
  if (!lastLoginAt) return 'لم يسجّل دخولاً';
  const d = new Date(Number(lastLoginAt));
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function filterSupervisors(rows, filter) {
  if (filter === 'all') return rows;
  if (filter === 'active') return rows.filter((r) => !r.absent);
  if (filter === 'absent') return rows.filter((r) => r.absent);
  if (filter === 'trial') return rows.filter((r) => r.duration === 1);
  if (filter === 'active-code') return rows.filter((r) => r.codeStatus === 'active');
  return rows;
}

/** بحث بالاسم / البريد / الكود */
export function searchSupervisors(rows = [], query = '') {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return rows;
  const qCompact = q.replace(/\s/g, '');
  return rows.filter((r) => {
    const name = String(r.displayName || '').toLowerCase();
    const email = String(r.email || '').toLowerCase();
    const code = String(r.code || '').toLowerCase();
    const codeDisp = formatCodeForDisplay(r.code).toLowerCase().replace(/\s/g, '');
    const note = String(r.adminNote || '').toLowerCase();
    return (
      name.includes(q) ||
      email.includes(q) ||
      code.includes(qCompact) ||
      codeDisp.includes(qCompact) ||
      note.includes(q)
    );
  });
}

export function paginateList(items = [], page = 1, pageSize = 20) {
  const p = Math.max(1, Number(page) || 1);
  const size = Math.max(1, Number(pageSize) || 20);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(p, totalPages);
  const start = (safePage - 1) * size;
  return {
    items: items.slice(start, start + size),
    page: safePage,
    pageSize: size,
    total,
    totalPages,
  };
}

/** ألعاب استُخدمت فعلياً من إحصائيات الكود */
export function deriveGamesUsedFromStats(stats) {
  if (!stats || typeof stats !== 'object') return [];
  const gp = stats.gamesPlayed || {};
  const byGame = stats.byGame || {};
  return Object.keys(GAME_LABELS)
    .filter((k) => {
      const n = Number(gp[k]) || Number(byGame[k]?.sessions) || Number(byGame[k]?.realSessions) || 0;
      return n > 0;
    })
    .map((k) => GAME_LABELS[k]);
}

/** آخر جلسات من stats الكود */
export function deriveRecentSessions(stats, limit = 3) {
  const recent = Array.isArray(stats?.recentSessions) ? stats.recentSessions : [];
  return [...recent]
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, limit)
    .map((s) => {
      const gk = s.gameType === 'sniper' ? 'hesbah' : s.gameType;
      return {
        gameLabel: GAME_LABELS[gk] || s.gameType || '—',
        roomCode: s.roomCode || '—',
        playerCount: Number(s.playerCount) || 0,
        totalRounds: Number(s.totalRounds) || 0,
        ts: s.ts,
        dateLabel: s.ts
          ? new Date(s.ts).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })
          : '—',
      };
    });
}

export function formatExpiryLabel(expiresAt) {
  if (!expiresAt) return '—';
  const d = new Date(Number(expiresAt));
  if (Number.isNaN(d.getTime())) return '—';
  const expired = d.getTime() < Date.now();
  const label = d.toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
  return expired ? `${label} (منتهي)` : label;
}
