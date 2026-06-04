import Av from '../../shared/Av';
import SniperPlayerHud from './SniperPlayerHud';
export default function SniperResults({
  roomCode,
  game,
  players,
  me,
  myId,
  roundSummary,
  onContinue,
  showHud = true,
}) {
  const content = (
    <>
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 36 }}>📊</div>
        <div className="ptitle" style={{ fontSize: 20 }}>
          نتيجة الجولة {game?.currentQ}
        </div>
      </div>

      {Array.isArray(roundSummary) && roundSummary.length > 0 && (
        <div className="card">
          {roundSummary.map((row) => (
            <div key={row.playerId} className="sniper-result-row">
              <Av p={row.player} sz={32} />
              <span style={{ flex: 1 }}>{row.name}</span>
              <span style={{ fontWeight: 900, color: row.delta >= 0 ? '#22c55e' : 'var(--red)' }}>
                {row.delta >= 0 ? '+' : ''}
                {row.delta}
              </span>
            </div>
          ))}
        </div>
      )}

      <button type="button" className="btn bg" onClick={onContinue}>
        متابعة →
      </button>
      <p className="sniper-player-hint">🏆 الترتيب الكامل من تبويب «الترتيب» أعلى الشاشة</p>
    </>
  );

  if (!showHud) {
    return <div className="scr sniper-theme">{content}</div>;
  }

  return (
    <SniperPlayerHud roomCode={roomCode} me={me} myId={myId} game={game} players={players}>
      {content}
    </SniperPlayerHud>
  );
}
