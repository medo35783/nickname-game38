/** رمز الغرفة — 6 أرقام (المستوى الثاني) */
export const ROOM_CODE_LEN = 6;

export const ROOM_CODE_RE = /^\d{6}$/;

/** غرف قديمة بـ 4 أرقام */
export const LEGACY_ROOM_CODE_RE = /^\d{4}$/;

export function isValidRoomCode(code) {
  return ROOM_CODE_RE.test(String(code || '').trim());
}

export function isLegacyRoomCode(code) {
  const c = String(code || '').trim();
  return LEGACY_ROOM_CODE_RE.test(c) || !ROOM_CODE_RE.test(c);
}

export function normalizeRoomCodeInput(raw) {
  return String(raw || '')
    .replace(/\D/g, '')
    .slice(0, ROOM_CODE_LEN);
}

export function roomCodeValidationMessage() {
  return `الرمز ${ROOM_CODE_LEN} أرقام`;
}
