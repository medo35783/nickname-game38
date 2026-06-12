import Av from '../../shared/Av';
import HesbahPlayerHud from './HesbahPlayerHud';
import HesbahTopNav from './HesbahTopNav';

function formatDelta(delta) {
  if (delta > 0) return `+${delta}`;
  return String(delta);
}

function resultMeta(row) {
  if (row.shieldProtected && row.delta > 0) return { cls: 'win', label: '🛡️ تأمين — ربح' };
  if (row.delta > 0) return { cls: 'win', label: '✓ ربح' };
  if (row.missed) return { cls: 'loss', label: '⏱ لم يُرسل' };
  if (row.delta < 0) return { cls: 'loss', label: '✕ خسارة' };
  return { cls: 'loss', label: '0 — بدون نقاط' };
}

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
      <div className="card hesbah-round-result-head">
        <div style={{ fontSize: 36 }}>📊</div>
        <div className="ptitle" style={{ fontSize: 20 }}>
          نتيجة الجولة {game?.currentQ}
        </div>
        <p className="hesbah-round-result-head__hint">الأخضر = ربح · الأحمر = صفر أو خسارة</p>
      </div>

      {Array.isArray(roundSummary) && roundSummary.length > 0 ? (
        <div className="card hesbah-round-result-list">
          {roundSummary.map((row) => {
            const meta = resultMeta(row);
            return (
              <div
                key={row.playerId}
                className={`hesbah-result-row hesbah-result-row--${meta.cls}`}
              >
                <Av p={row.player} sz={32} />
                <div className="hesbah-result-row__info">
                  <span className="hesbah-result-row__name">{row.name}</span>
                  <span className={`hesbah-result-row__tag hesbah-result-row__tag--${meta.cls}`}>
                    {meta.label}
                  </span>
                </div>
                <span className={`hesbah-result-row__delta hesbah-result-row__delta--${meta.cls}`}>
                  {formatDelta(row.delta)}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card hesbah-round-result-empty">
          <p>بانتظار نتائج الجولة…</p>
        </div>
      )}

      <button type="button" className="btn bg" onClick={onContinue}>
        متابعة →
      </button>
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
      hideTabs
    >
      {content}
    </HesbahPlayerHud>
  );
}
