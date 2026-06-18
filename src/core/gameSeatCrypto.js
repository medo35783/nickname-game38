/** تشفير رقم المقعد — SHA-256 في المتصفح */

export async function hashPin(pin, roomCode, seatId) {
  const text = `ng-seat:v1:${roomCode}:${seatId}:${String(pin).trim()}`;
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSessionToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 32);
}

export async function verifyPin(pin, roomCode, seatId, pinHash) {
  if (!pinHash || !pin || !seatId) return false;
  const h = await hashPin(pin, roomCode, seatId);
  return h === pinHash;
}
