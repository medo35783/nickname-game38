/**
 * مساعدات قائمة المشرفين — لوحة الأدمن
 */

const MS_30D = 30 * 24 * 60 * 60 * 1000;

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
