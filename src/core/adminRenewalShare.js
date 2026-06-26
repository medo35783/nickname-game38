import { PLATFORM_NAME, PLATFORM_SITE_URL } from './constants';
import { formatCodeForDisplay, normalizeWhatsappPhone } from './firebaseHelpers';

/** رسالة تذكير تجديد — تُفتح في واتساب (بدون رقم = يختار المستخدم جهة الإرسال) */
export function buildRenewalReminderText({ code, expiresAt, hostName, adminNote }) {
  const display = formatCodeForDisplay(code) || code || '—';
  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })
    : 'قريباً';
  const greeting = hostName ? `مرحباً ${hostName}،` : 'مرحباً،';

  const lines = [
    greeting,
    '',
    `تذكير من *${PLATFORM_NAME}* 🎮`,
    '',
    `كود اشتراكك (*${display}*) ينتهي: ${expiryLabel}`,
    '',
    'جدّد الآن واستمر بفعالياتك وجلساتك مع فريقك!',
    '',
    `🔗 ${PLATFORM_SITE_URL.replace(/\/$/, '')}`,
  ];

  if (adminNote?.trim()) {
    lines.push('', `📝 ${adminNote.trim()}`);
  }

  return lines.join('\n');
}

export function openRenewalWhatsApp(options) {
  const text = buildRenewalReminderText(options);
  const phone = normalizeWhatsappPhone(options?.phone);
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  const url = `${base}?text=${encodeURIComponent(text)}`;
  if (typeof window === 'undefined') return false;
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  return !!w;
}
