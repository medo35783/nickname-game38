/** رقم سري للمشرف — يحمي استعادة لوحة التحكم على جهاز جديد */

export const HOST_PIN_LEN = 4;

export function isValidHostPin(pin) {
  return new RegExp(`^\\d{${HOST_PIN_LEN}}$`).test(String(pin || '').trim());
}

export function hostPinValidationMessage() {
  return `أدخل رقمًا سريًا للمشرف (${HOST_PIN_LEN} أرقام)`;
}

export async function hashHostPin(pin, roomCode) {
  const text = `ng-host:v1:${roomCode}:${String(pin).trim()}`;
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyHostPin(pin, roomCode, hostPinHash) {
  if (!hostPinHash || !pin || !roomCode) return false;
  const h = await hashHostPin(pin, roomCode);
  return h === hostPinHash;
}

/**
 * @returns {Promise<{ ok: boolean, via?: string, reason?: string }>}
 */
export async function verifyHostRejoinAccess(roomData, roomCode, { uid, hostPin, hasLocalAdminSession }) {
  if (uid && roomData?.adminId === uid) {
    return { ok: true, via: 'owner' };
  }

  const hostPinHash = roomData?.game?.hostPinHash;
  if (hostPinHash) {
    if (!isValidHostPin(hostPin)) {
      return { ok: false, reason: hostPinValidationMessage() };
    }
    const match = await verifyHostPin(hostPin, roomCode, hostPinHash);
    if (match) return { ok: true, via: 'pin' };
    return { ok: false, reason: 'رقم المشرف السري غير صحيح' };
  }

  if (hasLocalAdminSession) {
    return { ok: true, via: 'legacy_session' };
  }

  return { ok: false, reason: 'not_host' };
}
