import {
  PLATFORM_NAME,
  PLATFORM_NAME_EN,
  PLATFORM_SITE_URL,
  PLATFORM_SLOGAN,
} from '../core/constants';

export function getPlatformSiteUrl() {
  return PLATFORM_SITE_URL;
}

export function buildRoomInviteText({ gameName, roomCode } = {}) {
  const roomLink = getPlatformSiteUrl();
  const gameLine = gameName ? `🎯 *انضم للعبة: ${gameName}*` : null;
  const codeLine = roomCode ? `🔑 رمز الغرفة: *${roomCode}*` : null;

  return [
    `🎮 *${PLATFORM_NAME}* — ${PLATFORM_NAME_EN}`,
    PLATFORM_SLOGAN,
    '',
    gameLine,
    codeLine,
    gameLine || codeLine ? '' : null,
    '1️⃣ افتح الرابط',
    '2️⃣ اختر اللعبة',
    '3️⃣ أدخل الرمز',
    '',
    roomLink,
  ]
    .filter((line) => line !== null && line !== undefined)
    .join('\n');
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
