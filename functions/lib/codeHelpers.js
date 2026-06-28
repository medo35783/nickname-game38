const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function formatStoredCode(suffix) {
  return `CODE-${suffix}`;
}

function normalizeSubscriptionCode(raw) {
  const t = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  if (/^[A-Z0-9]{6}$/.test(t)) return formatStoredCode(t);
  if (/^CODE-[A-Z0-9]{6}$/.test(t)) return t;
  return t;
}

function formatCodeForDisplay(code) {
  if (!code) return '';
  const t = String(code).trim().toUpperCase();
  if (t.startsWith('CODE-')) return t.slice(5);
  return t;
}

function normalizeWhatsappPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('966') && digits.length >= 12) return digits.slice(0, 15);
  if (digits.startsWith('05') && digits.length >= 10) return `966${digits.slice(1)}`;
  if (digits.startsWith('5') && digits.length === 9) return `966${digits}`;
  if (digits.length >= 9 && digits.length <= 15) return digits;
  return '';
}

function buildActiveCodeSponsorPayload(codeRow = {}) {
  if (!codeRow?.sponsorId) return {};
  return {
    sponsorId: String(codeRow.sponsorId),
    sponsorName: String(codeRow.sponsorName || '').trim().slice(0, 80) || null,
    sponsorLogoUrl: String(codeRow.sponsorLogoUrl || '').trim().slice(0, 120000) || null,
    sponsorTagline: String(codeRow.sponsorTagline || '').trim().slice(0, 120) || null,
  };
}

function isPlatformAdminFromToken(token) {
  return token?.admin === true;
}

async function adminExistsInRtdb(db, uid) {
  if (!uid) return false;
  const [a, b] = await Promise.all([
    db.ref(`admins/${uid}`).get(),
    db.ref(`admin/${uid}`).get(),
  ]);
  return a.exists() || b.exists();
}

module.exports = {
  CODE_CHARS,
  normalizeSubscriptionCode,
  formatCodeForDisplay,
  normalizeWhatsappPhone,
  buildActiveCodeSponsorPayload,
  isPlatformAdminFromToken,
  adminExistsInRtdb,
};
