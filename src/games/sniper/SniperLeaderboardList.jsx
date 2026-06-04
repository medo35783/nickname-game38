import Av from '../../shared/Av';
import { SNIPER_ACCENT_CSS, SNIPER_SCORE_BG_CSS, SNIPER_BORDER_CSS } from './sniperHelpers';

export function sortedSniperPlayers(players) {
  return Object.entries(players || {})
    .map(([id, p]) => ({ ...p, id }))
    .filter((p) => !p.isHost)
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
}

export default function SniperLeaderboardList({ players, myId, highlightTop = 3 }) {
  const list = sortedSniperPlayers(players);
  const myRank = list.findIndex((p) => p.id === myId) + 1;

  return (
    <div>
      {myRank > 0 && (
        <div
          style={{
            textAlign: 'center',
            marginBottom: 12,
            padding: '8px 12px',
            borderRadius: 10,
            background: SNIPER_SCORE_BG_CSS,
            border: `1px solid ${SNIPER_BORDER_CSS}`,
            fontSize: 13,
            fontWeight: 800,
            color: SNIPER_ACCENT_CSS,
          }}
        >
          مركزك: {myRank} من {list.length}
        </div>
      )}
      {list.map((p, i) => {
        const isMe = p.id === myId;
        const isTop = i < highlightTop;
        return (
          <div
            key={p.id}
            className="sniper-result-row"
            style={{
              background: isMe ? SNIPER_SCORE_BG_CSS : isTop ? 'rgba(255, 200, 61, 0.12)' : undefined,
              borderRadius: 8,
              padding: '6px 8px',
              marginBottom: 4,
            }}
          >
            <span style={{ width: 22, fontWeight: 900, color: isTop ? 'var(--gold)' : 'var(--muted)' }}>{i + 1}</span>
            <Av p={p} sz={32} />
            <span style={{ flex: 1, fontWeight: isMe ? 900 : 600 }}>
              {p.name}
              {isMe && ' (أنت)'}
              {p.isOnFire && ' 🔥'}
            </span>
            <span style={{ fontWeight: 900, color: SNIPER_ACCENT_CSS }}>{p.totalScore || 0}</span>
          </div>
        );
      })}
    </div>
  );
}
