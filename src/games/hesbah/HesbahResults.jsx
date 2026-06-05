import Av from '../../shared/Av';
import HesbahPlayerHud from './HesbahPlayerHud';
import HesbahTopNav from './HesbahTopNav';
export default function HesbahResults({
  roomCode,
  game,
  players,
  me,
  myId,
  roundSummary,
  onContinue,
  showHud = true,
  onExitRequest,
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
            <div key={row.playerId} className="hesbah-result-row">
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
      <p className="hesbah-player-hint">🏆 الترتيب الكامل من تبويب «الترتيب» أعلى الشاشة</p>
    </>
  );

  if (!showHud) {
    return (
      <div className="scr hesbah-theme hesbah-admin">
        {typeof onExitRequest === 'function' && (
          <div className="hesbah-sticky-chrome">
            <HesbahTopNav onBack={onExitRequest} />
          </div>
        )}
        {content}
      </div>
    );
  }

  return (
    <HesbahPlayerHud
      roomCode={roomCode}
      me={me}
      myId={myId}
      game={game}
      players={players}
      onExitRequest={onExitRequest}
    >
      {content}
    </HesbahPlayerHud>
  );
}
