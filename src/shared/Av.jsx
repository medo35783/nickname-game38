import { AV_COLORS } from '../core/constants';

export default function Av({ p, sz = 35, fs = 13 }) {
  const idx = (p?.colorIdx || 0) % AV_COLORS.length;
  const bg = !p
    ? '#333'
    : p.status === 'active'
      ? AV_COLORS[idx]
      : p.status === 'cheater'
        ? 'linear-gradient(135deg,#e63950,#a0102a)'
        : 'linear-gradient(135deg,#333,#1a1a1a)';
  return (
    <div className="pi-av" style={{width: sz, height: sz, fontSize: fs, background: bg, color: '#07070f'}}>
      {p?.initials}
    </div>
  );
}
