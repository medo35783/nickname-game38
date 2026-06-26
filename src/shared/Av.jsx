import { AV_COLORS } from '../core/constants';

const ARENA_FRAME_BG = {
  bronze: 'linear-gradient(145deg, rgba(205,127,50,.35), rgba(139,90,43,.2))',
  silver: 'linear-gradient(145deg, rgba(192,192,210,.3), rgba(120,120,140,.15))',
  gold: 'linear-gradient(145deg, rgba(201,127,26,.35), rgba(212,146,10,.18))',
  legend: 'linear-gradient(145deg, rgba(150,36,56,.35), rgba(201,127,26,.15))',
};

export default function Av({ p, sz = 35, fs = 13 }) {
  const hasArena = Boolean(p?.arenaIcon);
  const idx = (p?.colorIdx || 0) % AV_COLORS.length;
  const bg = hasArena
    ? ARENA_FRAME_BG[p.arenaFrame] || ARENA_FRAME_BG.bronze
    : !p
      ? '#333'
      : p.status === 'active'
        ? AV_COLORS[idx]
        : p.status === 'cheater'
          ? 'linear-gradient(135deg,#e63950,#a0102a)'
          : 'linear-gradient(135deg,#333,#1a1a1a)';

  const iconSize = hasArena ? Math.round(sz * 0.52) : fs;

  return (
    <div
      className={`pi-av${hasArena ? ` pi-av--arena pi-av--arena-${p.arenaFrame || 'bronze'}` : ''}`}
      style={{ width: sz, height: sz, fontSize: hasArena ? iconSize : fs, background: bg, color: 'var(--on-gold)' }}
      title={hasArena && p.arenaName ? p.arenaName : undefined}
    >
      {hasArena ? p.arenaIcon : p?.initials}
    </div>
  );
}
