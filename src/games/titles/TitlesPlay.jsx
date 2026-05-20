import { useState, useEffect, useMemo } from 'react';
import Av from '../../shared/Av';
import { fmtMs } from '../../core/helpers';
import LiveConnectionBar from './LiveConnectionBar';
import { attacksForPlayer, countAttackProgress } from './titlesRevealHelpers';

/** شاشة الهجوم للمتسابق — ويزارد خطوتين + انتظار حي. */
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
    extendTime,
    doReveal,
    firebaseConnected,
  } = props;

  void effectiveNickMode;
  void notify;

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
  const _proxyPlayerEarly = proxyPlayer;

  const playerAttackCounts = {};
  attacksList.forEach((a) => {
    if (a.attackerNick) playerAttackCounts[a.attackerNick] = (playerAttackCounts[a.attackerNick] || 0) + 1;
  });

  const effectiveAttackerNicks = _proxyPlayerEarly
    ? [_proxyPlayerEarly.nick, _proxyPlayerEarly.nick2].filter(Boolean)
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

  const myPlayerId = proxyPlayer?.id || props.myId || playersList.find((p) => p.nick === myNickLocal || p.nick2 === myNickLocal)?.id;

  const displayNames = (
    roundOrder.names?.length > 0
      ? roundOrder.names.map((id) => playersList.find((p) => p.id === id)).filter(Boolean)
      : playersList.filter((p) => p.status === 'active')
  ).filter((p) => p.id !== myPlayerId);

  const myAtks = useMemo(
    () => attacksForPlayer(attacks, { playerId: myId, nicks: effectiveAttackerNicks }),
    [attacks, myId, effectiveAttackerNicks]
  );

  const progress = countAttackProgress(activePlayers, attacks, attacksPerRound);

  const myP = proxyPlayer || playersList.find((p) => p.nick === myNickLocal || p.nick2 === myNickLocal);
  const isBanned =
    myP?.isBannedNextRound && myP.isBannedNextRound >= roundNum;

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

  const cdInfo = () => {
    if (countdown === null) return { label: '—', urgent: false };
    if (countdown <= 0) return { label: 'انتهى الوقت!', urgent: true };
    return { label: fmtMs(countdown), urgent: countdown < 5 * 60 * 1000 };
  };
  const cdi = cdInfo();

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

  const statusBanner = () => {
    if (isBanned)
      return { icon: '☠️', text: 'أنت محروم هذه الجولة — عقوبة المسموم', tone: 'red' };
    if (isSilentActive)
      return { icon: '🤫', text: 'جولة الصمت — النتائج مخفية حتى الجولة القادمة', tone: 'blue' };
    if (gameState?.silentPending && !isSilentActive)
      return { icon: '🤫', text: 'جولة صامتة سابقة — تُكشف مع هذه الجولة', tone: 'purple' };
    if (activePoisonNick)
      return { icon: '☠️', text: 'يوجد لقب مسموم — احذر من الهجوم الخاطئ', tone: 'purple' };
    if (attacksPerRound > 1)
      return {
        icon: attacksPerRound === 2 ? '⚔️' : '⚡',
        text: `${attacksPerRound === 2 ? 'جولة مزدوجة' : 'جولة المفاجئ'} — ${attacksPerRound} هجمات لك`,
        tone: 'gold',
      };
    return null;
  };
  const banner = statusBanner();

  const pickNick = (nick, isElim) => {
    if (isElim) return;
    setMyNick(nick);
    setMyGuess(null);
    setAttackStep(2);
  };

  return (
    <div className="scr">
      <LiveConnectionBar connected={firebaseConnected !== false} roomCode={roomCode} />

      <div className="play-top-bar">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div className="play-top-meta" style={{ flex: 1 }}>
            <span className="play-room">#{roomCode}</span>
            <span>جولة {roundNum}</span>
            <span className="play-active">{activePlayers.length} نشط</span>
          </div>
          <button
            type="button"
            className="btn bgh bxs play-stats-btn"
            title="الإحصائيات — الجولات السابقة والمجموع (الجولة الحالية بعد الكشف)"
            onClick={() => setGameScreen('stats')}
          >
            📊 إحصائيات
          </button>
        </div>
        {role === 'player' && myNickLocal && !proxyFor && (
          <div className="play-you">
            أنت: <strong>{joinName}</strong> · <span className="gold">"{myNickLocal}"</span>
          </div>
        )}
        {isKioskMode && _proxyPlayerEarly && (
          <div className="play-you">
            📱 {_proxyPlayerEarly.name} · <span className="gold">"{_proxyPlayerEarly.nick}"</span>
          </div>
        )}
      </div>

      {banner && (
        <div className={`play-status play-status-${banner.tone}`}>
          <span>{banner.icon}</span>
          <span>{banner.text}</span>
        </div>
      )}

      <div className={`tbar${cdi.urgent ? ' urg' : ''}`}>
        <div style={{ fontSize: 20 }}>{cdi.urgent ? '🔴' : '⏱️'}</div>
        <div style={{ flex: 1 }}>
          <div className={`tval${cdi.urgent ? ' urg' : ''}`}>{cdi.label}</div>
          <div className="tlbl">متبقي للجولة {roundNum}</div>
        </div>
        {role === 'admin' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {!isKioskMode && (
              <>
                <button type="button" className="btn bgh bxs" onClick={() => extendTime(30 * 60 * 1000)}>
                  +30د
                </button>
                <button type="button" className="btn br bxs" onClick={doReveal}>
                  كشف
                </button>
              </>
            )}
            <button
              type="button"
              className="btn bgh bxs"
              onClick={() => {
                setProxyFor(null);
                setIsProxyMode(false);
                setMyNick(null);
                setMyGuess(null);
                setGameScreen('admin_live');
              }}
            >
              👑
            </button>
          </div>
        )}
      </div>

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

      {proxyPlayer && (
        <div className="ann ag" style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>📱 إعارة جوال المشرف</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold)' }}>
            {proxyPlayer.name} — {proxyPlayer.nick}
          </div>
        </div>
      )}

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
                <div className={`play-wait-verdict${a.correct ? ' ok' : ''}`}>
                  {a.correct ? '✅ إصابة!' : '⏳ النتيجة عند الكشف'}
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
                  const isPoison = nick === activePoisonNick;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`nt play-nt${isElim ? ' nd' : ''}${myNick === nick ? ' nsel' : ''}${isPoison ? ' poisoned' : ''}`}
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
