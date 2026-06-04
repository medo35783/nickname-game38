import { countdownColor } from './sniperHelpers';

export default function SniperCountdown({ remaining, maxSeconds = 20, size = 72, waiting = false }) {
  const max = Math.max(1, maxSeconds);
  const waitingState = waiting || remaining === null || remaining === undefined;
  const rem = waitingState ? max : Math.max(0, remaining);
  const pct = waitingState ? 1 : rem / max;
  const r = size / 2 - 6;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const color = waitingState ? 'var(--muted)' : countdownColor(rem, max);

  return (
    <div
      className="sniper-countdown"
      style={{ width: size, height: size, position: 'relative', flexShrink: 0 }}
      aria-label={`${rem} ثانية`}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="6" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset .35s linear, stroke .3s' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Cairo',
          fontWeight: 900,
          fontSize: size * 0.28,
          color,
        }}
      >
        {waitingState ? '⏸' : rem}
      </div>
    </div>
  );
}
