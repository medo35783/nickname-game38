import {
  PLATFORM_NAME,
  PLATFORM_NAME_EN,
  PLATFORM_SITE_URL,
  PLATFORM_SLOGAN,
} from '../core/constants';
import { getPwaInstallShareLines } from '../core/pwaInstall';

export function getPlatformSiteUrl() {
  return PLATFORM_SITE_URL;
}

export function buildRoomInviteText({ gameName, roomCode, includePwaHint = true } = {}) {
  const roomLink = getPlatformSiteUrl().replace(/\/$/, '');
  const code = roomCode ? String(roomCode).trim() : '';
  const codeBold = code ? `*${code}*` : '';

  const lines = [
    `🎮 *${PLATFORM_NAME}* — ${PLATFORM_NAME_EN}`,
    `${PLATFORM_SLOGAN}! 🎯`,
    '',
  ];

  if (gameName) {
    lines.push(`👑 تحدي جديد في لعبة: ${gameName}`);
  }
  if (code) {
    lines.push(`🔑 رمز الغرفة: ${codeBold}`);
  }

  if (gameName || code) {
    lines.push('');
    lines.push('🛑 طريقة الدخول السريع:');
    lines.push(`1️⃣ افتح الرابط: ${roomLink}`);
    lines.push(
      code
        ? `2️⃣ اختر اللعبة وأدخل الرمز: ${codeBold}`
        : '2️⃣ اختر اللعبة من القائمة',
    );
  }

  if (includePwaHint) {
    lines.push(...getPwaInstallShareLines());
  }

  return lines.join('\n');
}

export function getRoomInviteShareTitle(gameName) {
  return gameName ? `${PLATFORM_NAME} — ${gameName}` : PLATFORM_NAME;
}

/** @returns {'share'|'whatsapp'|'clipboard'|'none'} */
export async function shareRoomInviteMessage({
  gameName,
  roomCode,
  preferWhatsApp = false,
  notify,
} = {}) {
  const roomLink = getPlatformSiteUrl();
  const inviteText = buildRoomInviteText({ gameName, roomCode });
  const title = getRoomInviteShareTitle(gameName);

  if (!preferWhatsApp && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text: inviteText, url: roomLink });
      notify?.('تم فتح المشاركة ✓', 'success');
      return 'share';
    } catch (err) {
      if (err?.name === 'AbortError') return 'none';
    }
  }

  const waUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
  if (typeof window !== 'undefined') {
    const w = window.open(waUrl, '_blank', 'noopener,noreferrer');
    if (w) {
      notify?.('تم فتح واتساب ✓', 'success');
      return 'whatsapp';
    }
  }

  try {
    await navigator.clipboard?.writeText(inviteText);
    notify?.('تم نسخ دعوة الغرفة ✓', 'success');
    return 'clipboard';
  } catch {
    notify?.('تعذر فتح المشاركة حالياً', 'error');
    return 'none';
  }
}
