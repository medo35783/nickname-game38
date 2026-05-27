import Av from '../../../shared/Av';
import {
  nickExitMeta,
  playerNicksList,
  remainingBoardStats,
  revealedNicksForStats,
} from '../titlesRevealHelpers';

/** تبويب المتبقون + المقبرة */
export default function StatsRemainingPanel({
  isAdmin,
  activePlayers,
  elimPlayers,
  playersList,
  allRoundsList,
  silentExits,
  nickMode = 1,
}) {
  const silentCount = silentExits?.length || 0;
  const board = remainingBoardStats(playersList, silentCount);
  const dualMode = Number(nickMode) === 2;
  const outPlayers = [...elimPlayers].sort((a, b) => (b.eliminatedRound || 0) - (a.eliminatedRound || 0));

  return (
    <>
      <div
        className={`stats-rem-hud${dualMode ? '' : ' stats-rem-hud--single'}`}
        aria-label="حالة الساحة"
      >
        <div className="stats-rem-hud-cell">
          <span className="stats-rem-hud-num">{board.playersActive}</span>
          <span className="stats-rem-hud-lbl">👥 متسابق</span>
        </div>
        {dualMode && (
          <div className="stats-rem-hud-cell accent-gold">
            <span className="stats-rem-hud-num">{board.titlesLeft}</span>
            <span className="stats-rem-hud-lbl">🎭 لقب سري</span>
          </div>
        )}
        {(dualMode ? board.playersOut > 0 : true) && (
          <div className="stats-rem-hud-cell accent-red">
            <span className="stats-rem-hud-num">{board.playersOut}</span>
            <span className="stats-rem-hud-lbl">💀 خارج</span>
          </div>
        )}
        {dualMode && board.titlesGone > 0 && (
          <div className="stats-rem-hud-cell accent-muted">
            <span className="stats-rem-hud-num">{board.titlesGone}</span>
            <span className="stats-rem-hud-lbl">🔓 انكشف</span>
          </div>
        )}
      </div>

      <div className="stats-rem-sec-title">🎮 في الساحة</div>
      {activePlayers.length === 0 ? (
        <p className="stats-rem-empty">لا أحد</p>
      ) : (
        <div className="stats-rem-list">
          {activePlayers.map((p) => (
            <ActivePlayerRow key={p.id} player={p} isAdmin={isAdmin} allRoundsList={allRoundsList} />
          ))}
        </div>
      )}

      {(silentCount > 0 || outPlayers.length > 0) && (
        <>
          <div className="stats-rem-sec-title stats-rem-sec-title--grave">
            💀 خرجوا من اللعبة
            <span className="stats-rem-sec-count"> ({outPlayers.length + silentCount})</span>
          </div>
          <div className="stats-rem-list stats-rem-list--grave">
            {silentExits?.map((ex, i) => (
              <div key={`silent-${i}`} className="stats-rem-row stats-rem-row--out stats-rem-row--silent">
                <div className="stats-rem-row-body">
                  <div className="stats-rem-name">🤫 لقب مخفي</div>
                  <div className="stats-exit-line">جولة الصمت {ex.roundNum} — سيُكشف لاحقاً</div>
                </div>
              </div>
            ))}
            {outPlayers.map((p) => (
              <EliminatedPlayerRow key={p.id} player={p} allRoundsList={allRoundsList} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ActivePlayerRow({ player, isAdmin, allRoundsList }) {
  const nicks = playerNicksList(player);
  const revealed = revealedNicksForStats(player, allRoundsList);

  return (
    <div className="stats-rem-row pi">
      {isAdmin && <Av p={player} sz={32} fs={11} />}
      <div className="pi-info">
        <div className="pi-name">{player.name}</div>
        <div className="stats-rem-nicks">
          {nicks.map((n) => {
            const isRev = revealed.includes(n);
            if (isAdmin) {
              return (
                <span key={n} className={`stats-nick-chip${isRev ? ' is-revealed' : ''}`}>
                  &quot;{n}&quot;
                </span>
              );
            }
            return (
              <span key={n} className={`stats-nick-chip${isRev ? ' is-revealed' : ' is-locked'}`}>
                {isRev ? `"${n}"` : '🔒'}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** صف خروج — نفس شكل المشرف: اسم + اللقبان + تفصيل كل لقب */
function EliminatedPlayerRow({ player, allRoundsList }) {
  const nicks = playerNicksList(player);
  const revealed = revealedNicksForStats(player, allRoundsList);
  const showNicks = nicks.length ? nicks : revealed;

  const statusLine =
    player.status === 'cheater'
      ? '🚫 غش'
      : player.status === 'inactive'
        ? `😴 خمول · ج${player.eliminatedRound || '?'}`
        : null;

  return (
    <div className="stats-rem-row pi stats-rem-row--out">
      <Av p={player} sz={32} fs={11} />
      <div className="pi-info">
        <div className="pi-name">{player.name}</div>
        {showNicks.length > 0 && (
          <div className="pi-nick stats-pi-nicks-out">
            {showNicks.map((n, i) => (
              <span key={n}>
                {i > 0 && <span className="stats-nick-sep"> · </span>}
                &quot;{n}&quot;
              </span>
            ))}
          </div>
        )}
        {statusLine && <div className="pi-sub">{statusLine}</div>}
        {player.status === 'eliminated' && showNicks.length > 0 && (
          <div className="stats-exit-list">
            {showNicks.map((n) => (
              <NickExitDetail key={n} nick={n} player={player} allRoundsList={allRoundsList} />
            ))}
          </div>
        )}
        {player.status === 'inactive' && showNicks.length > 0 && (
          <div className="stats-exit-list">
            {showNicks.map((n) => (
              <NickExitDetail key={n} nick={n} player={player} allRoundsList={allRoundsList} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NickExitDetail({ nick, player, allRoundsList }) {
  const meta = nickExitMeta(player, nick, allRoundsList);
  const round = meta?.round ?? player.eliminatedRound;

  return (
    <div className="stats-exit-line">
      <span className="stats-exit-nick">&quot;{nick}&quot;</span>
      {round != null && (
        <>
          <span className="stats-exit-sep"> — </span>
          <span className="stats-exit-round">ج{round}</span>
        </>
      )}
      {meta?.by && (
        <>
          <span className="stats-exit-sep"> · </span>
          <span className="stats-exit-lbl">أخرجه </span>
          <span className="stats-exit-by">&quot;{meta.by}&quot;</span>
        </>
      )}
    </div>
  );
}
