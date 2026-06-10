const ARENA_CELEBRATION = 'arena-celebration';

/** بث احتفال ترقية / إنجاز — يستمع له App */
export function emitArenaCelebration(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ARENA_CELEBRATION, { detail }));
}

/** @param {(detail: object) => void} handler */
export function onArenaCelebration(handler) {
  if (typeof window === 'undefined') return () => {};
  const fn = (e) => handler(e.detail || {});
  window.addEventListener(ARENA_CELEBRATION, fn);
  return () => window.removeEventListener(ARENA_CELEBRATION, fn);
}
