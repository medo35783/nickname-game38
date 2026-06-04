import { useEffect, useState } from 'react';
import Av from '../../shared/Av';
import { playSound } from '../../core/helpers';
import { SNIPER_ACCENT_CSS, SNIPER_THEME } from './sniperHelpers';

function ConfettiBurst() {
  const [bits] = useState(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      color: [
        SNIPER_THEME.accent,
        SNIPER_THEME.gold,
        SNIPER_THEME.secondary,
        SNIPER_THEME.accentDark,
        SNIPER_THEME.secondaryDark,
      ][i % 5],
    }))
  );
  return (
    <div className="sniper-confetti" aria-hidden>
      {bits.map((b) => (
        <span
          key={b.id}
          style={{
            left: `${b.left}%`,
            background: b.color,
            animationDelay: `${b.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function SniperFinal({ players, onHome, showLeaderboardPopup }) {
  const list = Object.entries(players || {})
    .map(([id, p]) => ({ ...p, id }))
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  const top3 = list.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  useEffect(() => {
    playSound('applause');
  }, []);

  return (
    <div className="scr sniper-theme sniper-final">
      <ConfettiBurst />
      <button
        type="button"
        className="sniper-trophy-fab"
        title="الترتيب"
        onClick={showLeaderboardPopup}
      >
        🏆
      </button>

      <div style={{ textAlign: 'center', padding: '12px 0 20px', position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: 48 }}>🏆</div>
        <div className="ptitle" style={{ fontSize: 26 }}>
          تتويج القناص
        </div>
      </div>

      <div className="sniper-podium">
        {podiumOrder.map((p, idx) => {
          const rank = p === top3[0] ? 1 : p === top3[1] ? 2 : 3;
          const heights = { 1: 120, 2: 88, 3: 72 };
          return (
            <div key={p.id} className="sniper-podium-slot" style={{ order: idx }}>
              <Av p={p} sz={rank === 1 ? 52 : 40} />
              <div style={{ fontWeight: 900, fontSize: 13, marginTop: 6 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: SNIPER_ACCENT_CSS }}>{p.totalScore} نقطة</div>
              <div
                className="sniper-podium-bar"
                style={{
                  height: heights[rank],
                  background:
                    rank === 1
                      ? 'linear-gradient(180deg, var(--sniper-gold), var(--sniper-accent), var(--sniper-secondary))'
                      : 'var(--surface)',
                }}
              >
                {rank}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ position: 'relative', zIndex: 2 }}>
        {list.map((p, i) => (
          <div key={p.id} className="sniper-result-row">
            <span style={{ width: 22, color: 'var(--muted)' }}>{i + 1}</span>
            <Av p={p} sz={30} />
            <span style={{ flex: 1 }}>{p.name}</span>
            <span style={{ fontWeight: 900 }}>{p.totalScore}</span>
          </div>
        ))}
      </div>

      <button type="button" className="btn bgh" style={{ position: 'relative', zIndex: 2 }} onClick={onHome}>
        🏟️ العودة لساحة الألعاب
      </button>
    </div>
  );
}
