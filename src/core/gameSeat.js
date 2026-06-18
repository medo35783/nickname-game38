import { hashPin, generateSessionToken, verifyPin } from './gameSeatCrypto';

export { hashPin, generateSessionToken, verifyPin };

export const GAME_SEAT_PIN_LEN = 4;

export function isValidPin(pin) {
  return new RegExp(`^\\d{${GAME_SEAT_PIN_LEN}}$`).test(String(pin || '').trim());
}

export function pinValidationMessage() {
  return `أدخل رقمًا سريًا من ${GAME_SEAT_PIN_LEN} أرقام`;
}

/** @returns {[string, object] | null} */
export function findSeatByOwnerUid(entries, uid) {
  if (!uid || !entries?.length) return null;
  return entries.find(([, s]) => s?.ownerUid === uid) || null;
}

/** @returns {[string, object] | null} */
export function findSeatById(entries, seatId) {
  if (!seatId || !entries?.length) return null;
  return entries.find(([id]) => id === seatId) || null;
}

export function findTitlesSeatByIdentity(entries, name, nick) {
  const n = String(name || '').trim();
  const k = String(nick || '').trim();
  if (!n || !k) return null;
  return entries.find(([, p]) => p?.name?.trim() === n && p?.nick?.trim() === k) || null;
}

export function findSeatByName(entries, name) {
  const n = String(name || '').trim();
  if (!n) return null;
  return entries.find(([, s]) => s?.name?.trim() === n) || null;
}

export function isRegistrationLocked(phase, lobbyPhases = ['lobby']) {
  return !lobbyPhases.includes(phase || 'lobby');
}

export function guestDeviceLockKey(gameId, roomCode) {
  return `ng_guest_lock:${gameId}:${roomCode}`;
}

export function readGuestDeviceLock(gameId, roomCode) {
  try {
    const raw = localStorage.getItem(guestDeviceLockKey(gameId, roomCode));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeGuestDeviceLock(gameId, roomCode, seatId) {
  if (!gameId || !roomCode || !seatId) return;
  localStorage.setItem(
    guestDeviceLockKey(gameId, roomCode),
    JSON.stringify({ seatId, at: Date.now() })
  );
}

export function clearGuestDeviceLock(gameId, roomCode) {
  localStorage.removeItem(guestDeviceLockKey(gameId, roomCode));
}

export function welcomeSeenKey(gameId, seatId) {
  return `ng_welcome_seen:${gameId}:${seatId}`;
}

export function hasSeenWelcomePrompt(gameId, seatId) {
  if (!gameId || !seatId) return true;
  return localStorage.getItem(welcomeSeenKey(gameId, seatId)) === '1';
}

export function markWelcomePromptSeen(gameId, seatId) {
  if (!gameId || !seatId) return;
  localStorage.setItem(welcomeSeenKey(gameId, seatId), '1');
}

/**
 * هل يمكن للضيف إنشاء مقعد جديد في هذه الغرفة على هذا الجهاز؟
 */
export function guestCanCreateNewSeat(gameId, roomCode, seatId) {
  const lock = readGuestDeviceLock(gameId, roomCode);
  if (!lock?.seatId) return true;
  return lock.seatId === seatId;
}

/**
 * @returns {Promise<{ ok: boolean, reason?: string }>}
 */
export async function verifyGuestSeatAccess(seat, seatId, roomCode, { pin, sessionToken }) {
  if (!seat) return { ok: false, reason: 'المقعد غير موجود' };
  if (seat.ownerUid) return { ok: false, reason: 'هذا المقعد مربوط بحساب — سجّل دخولك' };

  if (sessionToken && seat.sessionToken && sessionToken === seat.sessionToken) {
    return { ok: true };
  }

  if (seat.pinHash) {
    if (!isValidPin(pin)) return { ok: false, reason: pinValidationMessage() };
    const match = await verifyPin(pin, roomCode, seatId, seat.pinHash);
    if (!match) return { ok: false, reason: 'الرقم السري غير صحيح' };
    return { ok: true };
  }

  // مقاعد قديمة / يدوية بلا PIN
  return { ok: true };
}

/**
 * حقول الأمان عند إنشاء مقعد جديد
 * @returns {Promise<{ sessionToken: string, pinHash?: string }>}
 */
export async function buildNewSeatSecurity(roomCode, seatId, { isGuest, pin }) {
  const sessionToken = generateSessionToken();
  if (!isGuest) return { sessionToken };
  if (!isValidPin(pin)) throw new Error(pinValidationMessage());
  const pinHash = await hashPin(pin, roomCode, seatId);
  return { sessionToken, pinHash };
}

/** رسائل خطأ موحّدة */
export const SEAT_ERRORS = {
  duplicateAccount: 'لديك مقعد مسجّل في هذه الغرفة — عد إليه بنفس حسابك',
  guestLocked: 'لديك مقعد ضيف في هذه الغرفة — أدخل رقمك السري للعودة إليه',
  registrationClosed: 'المسابقة بدأت — لا يمكن الانضمام لأول مرة',
  pinRequired: pinValidationMessage(),
  pinWrong: 'الرقم السري غير صحيح',
  identityTaken: 'هذا المقعد محجوز — أدخل رقمك السري للعودة',
};
