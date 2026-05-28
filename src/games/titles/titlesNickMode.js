/** يطبّع وضع الألقاب إلى 1 أو 2 فقط. */
export function normalizeNickMode(value) {
  return Number(value) === 2 ? 2 : 1;
}
