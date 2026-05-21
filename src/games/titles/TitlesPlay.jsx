import { useState, useEffect, useMemo } from 'react';
import Av from '../../shared/Av';
import LiveConnectionBar from './LiveConnectionBar';
import TitlesPlayCockpitShell from './play/TitlesPlayCockpitShell';
import { attacksForPlayer, countAttackProgress } from './titlesRevealHelpers';
import { roundAlertMessages } from './roundAlertHelpers';

/** شاشة الهجوم للمتسابق — كابينة + ويزارد خطوتين + انتظار حي. */
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
    proxyFor,
    setProxyFor,
    setIsProxyMode,
    countdown,
    effectiveNickMode,
    submitAttack,
    notify,
    roomCode,
    joinName,
    myId,
    setGameScreen,
    firebaseConnected,
  } = props;

  void effectiveNickMode;

  const [attackStep, setAttackStep] = useState(1);
  const [waitMsgIdx, setWaitMsgIdx] = useState(0);

  const playersList = Object.entries(players || {}).map(([id, p]) => ({ ...p, id }));
  const activePlayers = playersList.filter((p) => p.status === 'active');
  const attacksList = Object.values(attacks || {});
  const roundNum = gameState?.roundNum || 0;
  const roundOrder = gameState?.roundOrder || { nicks: [], names: [] };
  const attacksPerRound = gameState?.attacksPerRound || 1;
  const activePoisonNick = gameState?.poisonNick || '';
  const isSilentActive = gameState?.silentActive || false;

  const isKioskMode = role === 'admin' && !!proxyFor;
  const proxyPlayer = proxyFor ? playersList.find((p) => p.id === proxyFor) : null;

  const playerAttackCounts = {};
  attacksList.forEach((a) => {
    if (a.attackerNick) playerAttackCounts[a.attackerNick] = (playerAttackCounts[a.attackerNick] || 0) + 1;
  });

  const effectiveAttackerNicks = proxyPlayer
    ? [proxyPlayer.nick, proxyPlayer.nick2].filter(Boolean)
    : myNickLocal
      ? [myNickLocal]
      : [];

  const myDoneCount = attacksList.filter((a) => effectiveAttackerNicks.includes(a.attackerNick)).length;
  const myAttacksDone = effectiveAttackerNicks.length > 0 ? myDoneCount >= attacksPerRound : false;

  const inactiveNicks = playersList.filter((p) => p.status === 'inactive').flatMap((p) => [p.nick, p.nick2].filter(Boolean));
  const activeNicks =
    roundOrder.nicks?.length > 0
      ? roundOrder.nicks
      : playersList.filter((p) => p.status === 'active').flatMap((p) => [p.nick, p.nick2].filter(Boolean));

  const effectivePlayer = proxyPlayer || playersList.find((p) => p.nick === myNickLocal || p.nick2 === myNickLocal);
  const myNicksList = effectivePlayer ? [effectivePlayer.nick, effectivePlayer.nick2].filter(Boolean) : [];

  const displayNicks = [...new Set([...activeNicks, ...inactiveNicks])];
  const visibleNicks = displayNicks.filter((n) => !myNicksList.includes(n));

  const myPlayerId =
    proxyPlayer?.id || myId || playersList.find((p) => p.nick === myNickLocal || p.nick2 === myNickLocal)?.id;

  const displayNames = (
    roundOrder.names?.length > 0
      ? roundOrder.names.map((id) => playersList.find((p) => p.id === id)).filter(Boolean)
      : playersList.filter((p) => p.status === 'active')
  ).filter((p) => p.id !== myPlayerId);

  const myAtks = useMemo(
    () => attacksForPlayer(attacks, { playerId: myPlayerId, nicks: effectiveAttackerNicks }),
    [attacks, myPlayerId, effectiveAttackerNicks]
  );

  const progress = countAttackProgress(activePlayers, attacks, attacksPerRound);

  const myP = effectivePlayer;
  const isBanned = myP?.isBannedNextRound && myP.isBannedNextRound >= roundNum;

  const displayName = isKioskMode
    ? effectivePlayer?.name || '—'
    : joinName || effectivePlayer?.name || '—';

  useEffect(() => {
    if (gameState?.phase === 'attacking') {
      setAttackStep(1);
      setMyNick(null);
      setMyGuess(null);
    }
  }, [gameState?.phase, roundNum, setMyNick, setMyGuess]);

  useEffect(() => {
    if (!myAttacksDone) return;
    const t = setInterval(() => setWaitMsgIdx((i) => i + 1), 6000);
    return () => clearInterval(t);
  }, [myAttacksDone]);

  const waitMessages = useMemo(() => {
    const msgs = ['انتظر كشف المشرف 🔓'];
    if (!progress.allSubmitted) {
      msgs.push(`📨 ${progress.submitted}/${progress.total} أرسلوا هجماتهم`);
      if (progress.remainingPlayers > 0) {
        msgs.push(`⏳ باقي ${progress.remainingPlayers} لاعب${progress.remainingPlayers === 1 ? '' : 'ين'}`);
      }
    } else {
      msgs.push('✓ اكتملت الهجمات — المشرف سيكشف قريباً');
    }
    return msgs;
  }, [progress]);

  const roundAlerts = roundAlertMessages(gameState?.roundAlert);
  const statusBanner = () => {
    if (isBanned)
      return { icon: '☠️', text: 'أنت محروم هذه الجولة — عقوبة المسموم', tone: 'red' };
    if (gameState?.silentPending && !isSilentActive)
      return { icon: '🤫', text: 'جولة صامتة سابقة — تُكشف مع هذه الجولة', tone: 'purple' };
    return null;
  };
  const banner = statusBanner();

  const pickNick = (nick, isElim) => {
    if (isElim) return;
    setMyNick(nick);
    setMyGuess(null);
    setAttackStep(2);
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(roomCode);
    notify?.('تم نسخ الرمز ✓', 'success');
  };

  const returnToHost = () => {
    setProxyFor(null);
    setIsProxyMode(false);
    setMyNick(null);
    setMyGuess(null);
    setGameScreen('host');
  };

  return (
    <div className="scr play-attack-scr">
      <LiveConnectionBar connected={firebaseConnected !== false} roomCode={roomCode} />

      <TitlesPlayCockpitShell
        roomCode={roomCode}
        activeCount={activePlayers.length}
        roundNum={roundNum}
        displayName={displayName}
        identityNicks={myNicksList}
        countdown={countdown}
        onOpenStats={() => setGameScreen('stats')}
        onCopyCode={copyCode}
        isKioskMode={isKioskMode}
        onReturnToHost={returnToHost}
      />

      {roundAlerts.map((a, i) => (
        <div key={i} className={`play-status play-status-${a.tone}`}>
          <span>{a.icon}</span>
          <span>{a.text}</span>
        </div>
      ))}
      {banner && (
        <div className={`play-status play-status-${banner.tone}`}>
          <span>{banner.icon}</span>
          <span>{banner.text}</span>
        </div>
      )}

      {!myAttacksDone && (
        <div className="play-wizard-steps">
          <span className={attackStep === 1 ? 'on' : myNick ? 'done' : ''}>① اللقب</span>
          <span className="play-wizard-line" />
          <span className={attackStep === 2 ? 'on' : ''}>② التخمين</span>
        </div>
      )}

      <div className="counter-bar">
        <div style={{ fontSize: 16 }}>📨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {progress.submitted}/{progress.total} هجمة
            {progress.allSubmitted && (
              <span style={{ color: 'var(--green)', fontSize: 12, marginRight: 6 }}> ✓ اكتمل!</span>
            )}
          </div>
          <div className="counter-track mt2">
            <div
              className="counter-fill"
              style={{ width: `${(progress.submitted / progress.total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {myAttacksDone ? (
        <div className="card play-wait-card">
          <div className="waiting-box">
            <div className="waiting-icon">✅</div>
            <div className="waiting-title">تم إرسال هجومك!</div>
            {myAtks.map((a, i) => (
              <div key={i} className="play-wait-summary">
                <div className="play-wait-row">
                  <span className="lbl">🎭 اللقب</span>
                  <strong className="gold">"{a.targetNick}"</strong>
                </div>
                <div className="play-wait-row">
                  <span className="lbl">👤 التخمين</span>
                  <strong>{a.guessedName || '—'}</strong>
                </div>
                <div className="play-wait-verdict">
                  ⏳ النتيجة عند الكشف
                </div>
              </div>
            ))}
            <p className="play-wait-rotate">{waitMessages[waitMsgIdx % waitMessages.length]}</p>
            {attacksPerRound > 1 && myDoneCount < attacksPerRound && (
              <p className="trs-muted">يمكنك إرسال هجمة أخرى</p>
            )}
          </div>
        </div>
      ) : (
        <>
          {attackStep === 1 && (
            <div className="bwrap">
              <div className="blbl">🎭 الخطوة ١ — اختر لقباً للهجوم</div>
              <div className="bgrid play-bgrid">
                {(role === 'admin' && !isKioskMode ? displayNicks : visibleNicks).map((nick, i) => {
                  const owner = playersList.find((p) => p.nick === nick || p.nick2 === nick);
                  const isElim =
                    owner && (owner.status === 'eliminated' || owner.status === 'cheater');
                  const showPoisonHint = role === 'admin' && !isKioskMode && nick === activePoisonNick;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`nt play-nt${isElim ? ' nd' : ''}${myNick === nick ? ' nsel' : ''}${showPoisonHint ? ' poisoned' : ''}`}
                      disabled={!!isElim}
                      onClick={() => pickNick(nick, isElim)}
                    >
                      <div>{nick}</div>
                      {isElim && <div className="nt-sub">✕ ج{owner.eliminatedRound}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {attackStep === 2 && (
            <>
              <div className="play-selected-nick">
                <span>الهدف:</span>
                <strong>"{myNick}"</strong>
                <button type="button" className="btn bgh bxs" onClick={() => setAttackStep(1)}>
                  تغيير
                </button>
              </div>
              <div className="card">
                <div className="ctitle">👥 الخطوة ٢ — من صاحب هذا اللقب؟</div>
                <div className="ngrid play-ngrid">
                  {displayNames.map((p) => {
                    const isElim = p.status !== 'active';
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={`nr play-nr${isElim ? ' nrd' : ''}${myGuess === p.id ? ' nrsel' : ''}`}
                        disabled={isElim || !myNick}
                        onClick={() => myNick && setMyGuess(p.id)}
                      >
                        <Av p={p} sz={36} fs={12} />
                        <div className="nr-info">
                          <div className="nr-name">{p.name}</div>
                          {isElim && <div className="nr-sub">خرج ج{p.eliminatedRound}</div>}
                        </div>
                        {myGuess === p.id && <span className="play-check">✓</span>}
                      </button>
                    );
                  })}
                </div>
                {myNick && myGuess ? (
                  <button
                    type="button"
                    className="btn bg mt3 play-confirm-btn"
                    onClick={() => submitAttack(proxyPlayer?.nick || null)}
                  >
                    🎯 تأكيد الهجوم على "{myNick}"
                  </button>
                ) : (
                  <p className="play-hint">اختر الاسم ثم اضغط تأكيد</p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
