import Av from '../../shared/Av';
import { fmtMs } from '../../core/helpers';

/** شاشة الهجوم (مكافئ لـ gameScreen === 'attack' في App). */
export default function TitlesPlay(props) {
  const {
    role,
    players,
    gameState,
    attacks,
    myNickLocal,
    myNick,
    setMyNick,
    myGuess,
    setMyGuess,
    mySubmitted,
    setMySubmitted,
    proxyFor,
    setProxyFor,
    isProxyMode,
    setIsProxyMode,
    countdown,
    flipCards,
    setFlipCards,
    exitAnnounce,
    effectiveNickMode,
    submitAttack,
    notify,
  } = props;

  void mySubmitted;
  void setMySubmitted;
  void isProxyMode;
  void flipCards;
  void setFlipCards;
  void exitAnnounce;
  void effectiveNickMode;
  void notify;

  const roomCode = props.roomCode ?? '';
  const joinName = props.joinName ?? '';
  const setGameScreen = props.setGameScreen ?? (() => {});
  const extendTime = props.extendTime ?? (() => {});
  const doReveal = props.doReveal ?? (() => {});
  const allRoundsData = props.allRoundsData ?? {};

  const playersList = Object.entries(players || {}).map(([id, p]) => ({ ...p, id }));
  const activePlayers = playersList.filter((p) => p.status === 'active');
  const elimPlayers = playersList.filter((p) => p.status !== 'active');
  const attacksList = Object.values(attacks || {});
  const submittedCount = attacksList.length;
  const roundNum = gameState?.roundNum || 0;
  const roundOrder = gameState?.roundOrder || { nicks: [], names: [] };
  const attacksPerRound = gameState?.attacksPerRound || 1;

  const activePoisonNick = gameState?.poisonNick || '';
  const isSilentActive = gameState?.silentActive || false;

  const playerAttackCounts = {};
  attacksList.forEach((a) => {
    if (a.attackerNick) playerAttackCounts[a.attackerNick] = (playerAttackCounts[a.attackerNick] || 0) + 1;
  });
  const allSubmitted =
    activePlayers.length > 0 &&
    activePlayers.every((p) => {
      const nicks = [p.nick, p.nick2].filter(Boolean);
      const done = nicks.reduce((sum, n) => sum + (playerAttackCounts[n] || 0), 0);
      return done >= attacksPerRound;
    });

  const myDoneCount = attacksList.filter((a) => a.attackerNick === myNickLocal).length;
  const myAttacksDone = myNickLocal ? myDoneCount >= attacksPerRound : false;

  const allRoundsList = Object.values(allRoundsData || {}).sort((a, b) => a.round - b.round);
  const allAttacksFlat = allRoundsList.flatMap((r) => Object.values(r.attacks || {}));

  const inactiveNicks = playersList.filter((p) => p.status === 'inactive').flatMap((p) => [p.nick, p.nick2].filter(Boolean));
  const activeNicks =
    roundOrder.nicks?.length > 0
      ? roundOrder.nicks
      : playersList.filter((p) => p.status === 'active').flatMap((p) => [p.nick, p.nick2].filter(Boolean));

  const proxyPlayer = proxyFor ? playersList.find((p) => p.id === proxyFor) : null;
  const effectivePlayer = proxyPlayer || playersList.find((p) => p.nick === myNickLocal || p.nick2 === myNickLocal);
  const myNicksList = effectivePlayer ? [effectivePlayer.nick, effectivePlayer.nick2].filter(Boolean) : [];

  const displayNicks = [...new Set([...activeNicks, ...inactiveNicks])];
  const visibleNicks = displayNicks.filter((n) => !myNicksList.includes(n));

  const myPlayerId = proxyPlayer?.id || props.myId || playersList.find((p) => p.nick === myNickLocal || p.nick2 === myNickLocal)?.id;

  const displayNames = (
    roundOrder.names?.length > 0
      ? roundOrder.names.map((id) => playersList.find((p) => p.id === id)).filter(Boolean)
      : playersList.filter((p) => p.status === 'active')
  ).filter((p) => p.id !== myPlayerId);

  const cdInfo = () => {
    if (countdown === null) return { label: '—', urgent: false };
    if (countdown <= 0) return { label: 'انتهى الوقت!', urgent: true };
    return { label: fmtMs(countdown), urgent: countdown < 5 * 60 * 1000 };
  };
  const cdi = cdInfo();

  return (
    <div className="scr">
      {/* Info bar — room + round + player info */}
      <div style={{ background: 'var(--card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 12px', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ color: 'var(--gold)', fontWeight: 700 }}>#{roomCode}</span>
            <span style={{ margin: '0 8px' }}>·</span>
            الجولة <strong style={{ color: 'var(--gold)' }}>{roundNum}</strong>
            <span style={{ margin: '0 8px' }}>·</span>
            نشطون: <strong style={{ color: 'var(--green)' }}>{activePlayers.length}</strong>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <button className="btn bgh bxs" style={{ padding: '3px 8px' }} onClick={() => setGameScreen('stats')}>
              📊
            </button>
          </div>
        </div>
        {/* Player's own info - مخفي عند الهجوم بالإنابة */}
        {role === 'player' && myNickLocal && !proxyFor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,.05)', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>أنت:</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{joinName}</span>
            <span style={{ fontSize: 10, color: 'var(--muted)' }}>·</span>
            <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>"{myNickLocal}"</span>
          </div>
        )}
        {/* رسالة للمشرف أثناء الهجوم بالإنابة */}
        {role === 'admin' && proxyFor && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 5, borderTop: '1px solid rgba(255,255,255,.05)', marginTop: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--purple)' }}>⚡ تهاجم بالإنابة عن:</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{proxyPlayer?.name}</span>
          </div>
        )}
      </div>

      {/* إشعارات الجولة — للجميع بدون كشف تفاصيل */}
      {isSilentActive && (
        <div
          style={{
            background: 'rgba(79,163,224,.08)',
            border: '1px solid rgba(79,163,224,.3)',
            borderRadius: 9,
            padding: '8px 12px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--blue)',
          }}
        >
          <span style={{ fontSize: 16 }}>🤫</span>
          <span>
            <strong>جولة الصمت</strong> — النتائج تُخفى حتى الجولة القادمة
          </span>
        </div>
      )}
      {gameState?.silentPending && !isSilentActive && (
        <div
          style={{
            background: 'rgba(155,89,182,.1)',
            border: '1.5px solid rgba(155,89,182,.4)',
            borderRadius: 10,
            padding: '10px 14px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--purple)',
          }}
        >
          <span style={{ fontSize: 18 }}>🤫</span>
          <span>
            <strong>جولة صامتة سابقة!</strong> — ستُكشف نتائجها مع هذه الجولة
          </span>
        </div>
      )}
      {/* بانر الحرمان من اللقب المسموم */}
      {(() => {
        const myP = playersList.find((p) => p.nick === myNickLocal || p.nick2 === myNickLocal);
        if (myP?.isBannedNextRound && myP.isBannedNextRound >= roundNum)
          return (
            <div
              style={{
                background: 'rgba(230,57,80,.1)',
                border: '1px solid rgba(230,57,80,.4)',
                borderRadius: 9,
                padding: '10px 12px',
                marginBottom: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--red)',
              }}
            >
              <span style={{ fontSize: 18 }}>☠️</span>
              <span>
                <strong>أنت محروم هذه الجولة!</strong> — عقوبة اللقب المسموم من الجولة الماضية
              </span>
            </div>
          );
        return null;
      })()}
      {activePoisonNick && (
        <div
          style={{
            background: 'rgba(155,89,182,.08)',
            border: '1px solid rgba(155,89,182,.3)',
            borderRadius: 9,
            padding: '8px 12px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            color: 'var(--purple)',
          }}
        >
          <span style={{ fontSize: 16 }}>☠️</span>
          <span>
            تحذير: <strong>يوجد لقب مسموم</strong> — إذا هاجمته وأخطأت تخسر جولة!
          </span>
        </div>
      )}
      {attacksPerRound > 1 && (
        <div
          style={{
            background: 'rgba(240,192,64,.08)',
            border: '1px solid rgba(240,192,64,.3)',
            borderRadius: 9,
            padding: '8px 12px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
          }}
        >
          <span>{attacksPerRound === 2 ? '⚔️' : '⚡'}</span>
          <span style={{ color: 'var(--gold)', fontWeight: 700 }}>
            {attacksPerRound === 2 ? 'جولة مزدوجة' : 'جولة الاندفاع'} — لديك <strong>{attacksPerRound}</strong> هجمات هذه الجولة
          </span>
        </div>
      )}

      {/* Timer */}
      <div className={`tbar${cdi.urgent ? ' urg' : ''}`}>
        <div style={{ fontSize: 20 }}>{cdi.urgent ? '🔴' : '⏱️'}</div>
        <div style={{ flex: 1 }}>
          <div className={`tval${cdi.urgent ? ' urg' : ''}`}>{cdi.label}</div>
          <div className="tlbl">متبقي للجولة {roundNum}</div>
        </div>
        {role === 'admin' && (
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn bgh bxs" onClick={() => extendTime(30 * 60 * 1000)}>
              +30د
            </button>
            <button className="btn br bxs" onClick={doReveal}>
              كشف
            </button>
            <button
              className="btn bgh bxs"
              onClick={() => {
                setIsProxyMode(false);
                setGameScreen('admin_live');
              }}
            >
              👑
            </button>
          </div>
        )}
      </div>

      {/* Counter */}
      <div className="counter-bar">
        <div style={{ fontSize: 16 }}>📨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {submittedCount}/{activePlayers.length * attacksPerRound} هجمة
            {attacksPerRound > 1 && (
              <span style={{ fontSize: 11, color: 'var(--gold)', marginRight: 6 }}> ({attacksPerRound} لكل لاعب)</span>
            )}
            {allSubmitted && <span style={{ color: 'var(--green)', fontSize: 12, marginRight: 6 }}>✓ اكتمل!</span>}
          </div>
          <div className="counter-track mt2">
            <div className="counter-fill" style={{ width: `${(submittedCount / Math.max(activePlayers.length * attacksPerRound, 1)) * 100}%` }} />
          </div>
        </div>
        {allSubmitted && role === 'admin' && (
          <button className="btn bv bxs" onClick={doReveal}>
            كشف ▶
          </button>
        )}
      </div>

      {/* Proxy banner */}
      {proxyPlayer && (
        <div className="ann ag" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>🎮 المشرف يهاجم نيابةً عن</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>
            {proxyPlayer.name} — {proxyPlayer.nick}
          </div>
          <button
            className="btn bgh bsm"
            style={{ width: 'auto', margin: '8px auto 0' }}
            onClick={() => {
              setProxyFor(null);
              setIsProxyMode(false);
              setMyNick(null);
              setMyGuess(null);
            }}
          >
            إلغاء
          </button>
        </div>
      )}

      {/* SUBMITTED */}
      {(myAttacksDone || myDoneCount >= attacksPerRound) && !proxyFor ? (
        <div className="card">
          <div className="waiting-box">
            <div className="waiting-icon">⏳</div>
            <div className="waiting-title">تم إرسال الهجوم!</div>
            <div className="waiting-sub">
              لقب مستهدف: <strong style={{ color: 'var(--gold)' }}>"{myNick}"</strong>
              <br />
              تخمين: <strong>{playersList.find((p) => p.id === myGuess)?.name || '—'}</strong>
              <br />
              <br />
              <span style={{ fontSize: 11 }}>انتظر كشف النتائج من المشرف أو انتهاء الوقت 🔓</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* NICK BOARD */}
          <div className="bwrap">
            <div className="blbl">🎭 لوحة الألقاب — اضغط لقباً للهجوم عليه</div>
            <div className="bgrid">
              {(role === 'admin' ? displayNicks : visibleNicks).map((nick, i) => {
                const owner = playersList.find((p) => p.nick === nick || p.nick2 === nick);
                const isEliminated = owner && (owner.status === 'eliminated' || owner.status === 'cheater');
                const isElim = isEliminated;
                return (
                  <div
                    key={i}
                    className={`nt${isElim ? ' nd' : myNick === nick ? ' nsel' : ''}`}
                    onClick={() => {
                      if (!isElim) {
                        setMyNick(nick);
                        setMyGuess(null);
                      }
                    }}
                  >
                    <div>{nick}</div>
                    {isElim && <div className="nt-sub">✕ ج{owner.eliminatedRound}</div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* NAMES */}
          <div className="card">
            <div className="ctitle">
              👥 قائمة الأسماء
              {myNick ? (
                <span style={{ color: 'var(--text)', fontWeight: 400, fontSize: 11 }}>
                  {' '}
                  — صاحب "<span style={{ color: 'var(--gold)' }}>{myNick}</span>" هو؟
                </span>
              ) : (
                <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: 11 }}> — اختر لقباً أولاً</span>
              )}
            </div>
            <div className="ngrid">
              {displayNames.map((p) => {
                const isElim = p.status !== 'active';
                return (
                  <div
                    key={p.id}
                    className={`nr${isElim ? ' nrd' : myGuess === p.id ? ' nrsel' : ''}`}
                    onClick={() => {
                      if (!isElim && myNick) setMyGuess(p.id);
                    }}
                  >
                    <Av p={p} sz={30} fs={11} />
                    <div className="nr-info">
                      <div className="nr-name" style={isElim ? { color: 'var(--dim)' } : {}}>
                        {p.name}
                      </div>
                      {isElim && (
                        <div className="nr-sub">
                          "{p.nick}"
                          {p.nick2 ? ` / "${p.nick2}"` : ''} — خرج ج{p.eliminatedRound}
                          {p.eliminatedBy ? ` · ${p.eliminatedBy}` : ''}
                        </div>
                      )}
                    </div>
                    {myGuess === p.id && <div style={{ color: 'var(--gold)', fontSize: 16 }}>✓</div>}
                  </div>
                );
              })}
            </div>
            {myNick && myGuess ? (
              <button className="btn bg mt3" onClick={() => submitAttack(proxyPlayer?.nick || null)}>
                🎯 تأكيد الهجوم على "{myNick}"
                {proxyPlayer && <span style={{ fontSize: 11, fontWeight: 400 }}> (نيابةً عن {proxyPlayer.name})</span>}
              </button>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, padding: '10px 0' }}>
                {!myNick ? '① اختر لقباً من اللوحة' : '② اختر الشخص الذي تخمّن أنه صاحب اللقب'}
              </div>
            )}
          </div>
        </>
      )}

      {/* Graveyard */}
      {elimPlayers.length > 0 && (
        <div className="card">
          <div className="ctitle">⚰️ مقبرة الألقاب ({elimPlayers.length})</div>
          <div className="sc">
            {/* Silent pending — show as mystery */}
            {gameState?.silentPending?.silentExits?.map((ex, i) => (
              <div key={i} className="grave" style={{ borderColor: 'rgba(79,163,224,.3)', background: 'rgba(79,163,224,.05)' }}>
                <div className="grave-name" style={{ color: 'var(--blue)' }}>
                  🤫 لقب مخفي
                </div>
                <div className="grave-info" style={{ color: 'var(--blue)' }}>
                  جولة الصمت {ex.roundNum} — سيُكشف لاحقاً
                </div>
              </div>
            ))}
            {[...elimPlayers].sort((a, b) => (b.eliminatedRound || 0) - (a.eliminatedRound || 0)).map((p) => (
              <div key={p.id} className="grave">
                <div className="grave-name">{p.name}</div>
                {/* لقب المكشوف فقط — الخارج بالخمول لا يُظهر لقبه */}
                {p.status === 'eliminated' && (
                  <div className="grave-nick">
                    {(() => {
                      const targetedNick = allAttacksFlat.find((a) => a.correct && a.realOwnerId === p.id)?.targetNick;
                      const shownNick = targetedNick || p.nick;
                      const otherTargeted = p.nick2 && allAttacksFlat.some((a) => a.correct && a.realOwnerId === p.id && a.targetNick === p.nick2);
                      return (
                        <>
                          "{shownNick}"
                          {otherTargeted ? ` / "${p.nick2}"` : ''}
                        </>
                      );
                    })()}
                  </div>
                )}
                {/* الخارج بالخمول — اسم فقط بدون لقب */}
                <div className="grave-info">
                  {p.status === 'cheater'
                    ? '🚫 خرج من المسابقة'
                    : p.status === 'inactive'
                      ? `😴 خرج لعدم الهجوم — ج${p.eliminatedRound}`
                      : `💥 خرج ج${p.eliminatedRound}${p.eliminatedBy ? ` — كشفه: ${p.eliminatedBy}` : ''}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
