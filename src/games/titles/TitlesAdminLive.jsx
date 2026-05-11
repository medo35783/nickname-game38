import { useMemo } from 'react';
import Av from '../../shared/Av';
import { fmtMs, shuffle } from '../../core/helpers';
import { db, ref, set, update, gameRef } from '../../core/firebaseHelpers';

/**
 * شاشة تحكم المشرف أثناء اللعب (مكافئ gameScreen === 'admin_live' في App).
 * Props الأساسية من App؛ يمكن تمرير setMyNick / setMyGuess / setMySubmitted و attackDur عند الربط.
 */
export default function TitlesAdminLive(props) {
  const {
    players,
    gameState,
    attacks,
    allRoundsData: _allRoundsData,
    roomCode,
    proxyFor: _proxyFor,
    setProxyFor,
    isProxyMode: _isProxyMode,
    setIsProxyMode,
    countdown,
    effectiveNickMode: _effectiveNickMode,
    doReveal,
    endGame,
    setModal,
    setGameScreen,
    notify,
  } = props;

  const setMyNick = props.setMyNick ?? (() => {});
  const setMyGuess = props.setMyGuess ?? (() => {});
  const setMySubmitted = props.setMySubmitted ?? (() => {});
  const attackDur = props.attackDur ?? { h: 0, m: 5, s: 0 };

  const playersList = useMemo(
    () => Object.entries(players || {}).map(([id, p]) => ({ ...p, id })),
    [players]
  );
  const activePlayers = useMemo(
    () => playersList.filter((p) => p.status === 'active'),
    [playersList]
  );
  const elimPlayers = useMemo(
    () => playersList.filter((p) => p.status !== 'active'),
    [playersList]
  );
  const attacksList = useMemo(() => Object.values(attacks || {}), [attacks]);
  const submittedCount = attacksList.length;
  const phase = gameState?.phase || 'lobby';
  const roundNum = gameState?.roundNum || 0;
  const attacksPerRound = gameState?.attacksPerRound || 1;
  const deadline = gameState?.deadline || null;

  const playerAttackCounts = {};
  attacksList.forEach((a) => {
    if (a.attackerNick) {
      playerAttackCounts[a.attackerNick] = (playerAttackCounts[a.attackerNick] || 0) + 1;
    }
  });
  const allSubmitted =
    activePlayers.length > 0 &&
    activePlayers.every((p) => {
      const nicks = [p.nick, p.nick2].filter(Boolean);
      const done = nicks.reduce((sum, n) => sum + (playerAttackCounts[n] || 0), 0);
      return done >= attacksPerRound;
    });

  const activePoisonNick = gameState?.poisonNick || '';
  const activeSpecialRound = gameState?.specialRound ?? 1;
  const isSilentActive = gameState?.silentActive || false;

  const cdi = useMemo(() => {
    if (countdown === null) return { label: '—', urgent: false };
    if (countdown <= 0) return { label: 'انتهى الوقت!', urgent: true };
    return { label: fmtMs(countdown), urgent: countdown < 5 * 60 * 1000 };
  }, [countdown]);

  const totalMs = () =>
    Math.max(
      (Number(attackDur.h) * 3600 + Number(attackDur.m) * 60 + Number(attackDur.s)) * 1000,
      5 * 60 * 1000
    );

  const extendTime = async (ms) => {
    await update(gameRef(roomCode), { deadline: (deadline || Date.now()) + ms });
    notify(`⏱️ تمديد ${fmtMs(ms)}`, 'gold');
  };

  const launchRound = async (rn) => {
    const dl = Date.now() + totalMs();
    const allNicks = shuffle(playersList.flatMap((p) => [p.nick, p.nick2].filter(Boolean)));
    const allNames = shuffle(playersList.map((p) => p.id));
    await set(ref(db, `rooms/${roomCode}/currentRound`), { attacks: {} });
    const banCleanup = {};
    playersList.forEach((p) => {
      if (p.isBannedNextRound && p.isBannedNextRound < rn) {
        banCleanup[`rooms/${roomCode}/players/${p.id}/isBannedNextRound`] = null;
      }
    });
    if (Object.keys(banCleanup).length > 0) await update(ref(db), banCleanup);

    const spec = gameState?.specialRound ?? 1;
    const silentOn = gameState?.silentActive || false;
    const updates = {
      phase: 'attacking',
      roundNum: rn,
      deadline: dl,
      roundOrder: { nicks: allNicks, names: allNames },
      attacksPerRound: spec,
      specialRound: 1,
      poisonNick: null,
    };
    if (!silentOn) {
      updates.silentActive = false;
    }
    await update(gameRef(roomCode), updates);
    notify(`🔔 الجولة ${rn} بدأت!`, 'gold');
  };

  const nextRound = async () => {
    const still = playersList.filter((p) => p.status === 'active');
    if (still.length <= 2) {
      await update(gameRef(roomCode), { phase: 'ended' });
      return;
    }
    await launchRound(roundNum + 1);
  };

  const elimCheat = async (pid) => {
    const p = playersList.find((pl) => pl.id === pid);
    await update(ref(db, `rooms/${roomCode}/players/${pid}`), {
      status: 'cheater',
      eliminatedRound: roundNum,
      eliminatedBy: 'المشرف',
    });
    notify(`🚫 أُخرج ${p?.name}`, 'error');
  };

  return (
    <div className="scr">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <button className="btn bgh bxs" onClick={() => setGameScreen('attack')}>
          ← اللعبة
        </button>
        <div style={{ fontFamily: 'Cairo', fontSize: 16, fontWeight: 900, color: 'var(--gold)' }}>
          الجولة {roundNum}
        </div>
        <button className="btn bgh bxs" onClick={() => setGameScreen('stats')}>
          📊
        </button>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <div className="sbox" style={{ flex: 1 }}>
          <div className="snum" style={{ fontSize: 16, color: 'var(--green)' }}>
            {activePlayers.length}
          </div>
          <div className="slbl">نشطون</div>
        </div>
        <div className="sbox" style={{ flex: 1 }}>
          <div className="snum" style={{ fontSize: 16, color: 'var(--gold)' }}>
            {submittedCount}
          </div>
          <div className="slbl">هاجموا</div>
        </div>
        <div className="sbox" style={{ flex: 1 }}>
          <div className="snum" style={{ fontSize: 16, color: 'var(--red)' }}>
            {elimPlayers.length}
          </div>
          <div className="slbl">خارجون</div>
        </div>
      </div>

      <div
        className="card"
        style={{
          background: 'linear-gradient(135deg,rgba(240,192,64,.05),rgba(155,89,182,.03))',
          border: '1px solid rgba(240,192,64,.15)',
          marginBottom: 8,
        }}
      >
        <div className="ctitle" style={{ fontSize: 12 }}>
          ⚗️ أدوات الجولة القادمة
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {[
            [1, '🗡️ عادية'],
            [2, '⚔️ مزدوجة'],
            [3, '⚡ اندفاع'],
          ].map(([n, label]) => (
            <button
              key={n}
              className={`btn ${activeSpecialRound === n ? 'bg' : 'bgh'} bxs`}
              style={{ flex: 1, fontSize: 10 }}
              onClick={async () => {
                await update(gameRef(roomCode), { specialRound: n });
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--purple)', flexShrink: 0 }}>☠️</span>
          <select
            className="inp"
            style={{ flex: 1, fontSize: 11, padding: '4px 8px' }}
            value={activePoisonNick}
            onChange={async (e) => {
              const v = e.target.value;
              await update(gameRef(roomCode), { poisonNick: v || null });
            }}
          >
            <option value="">بدون مسموم</option>
            {playersList
              .filter((p) => p.status === 'active')
              .flatMap((p) => [p.nick, p.nick2])
              .filter(Boolean)
              .map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            className={`btn ${isSilentActive ? 'bb' : 'bgh'} bxs`}
            style={{ flex: 1 }}
            onClick={async () => {
              const v = !isSilentActive;
              await update(gameRef(roomCode), { silentActive: v });
            }}
          >
            {isSilentActive ? '🤫 صمت مفعّل — إلغاء' : '🔕 تفعيل الصمت'}
          </button>
        </div>
      </div>

      <div className={`tbar${cdi.urgent ? ' urg' : ''}`} style={{ marginBottom: 6 }}>
        <div style={{ fontSize: 16 }}>{cdi.urgent ? '🔴' : '⏱️'}</div>
        <div style={{ flex: 1 }}>
          <div className={`tval${cdi.urgent ? ' urg' : ''}`}>{cdi.label}</div>
          <div className="tlbl">متبقي — الجولة {roundNum}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
        <button className="btn bg bxs" style={{ flex: 1 }} onClick={() => extendTime(5 * 60 * 1000)}>
          +5د
        </button>
        <button className="btn bg bxs" style={{ flex: 1 }} onClick={() => extendTime(15 * 60 * 1000)}>
          +15د
        </button>
        <button className="btn bg bxs" style={{ flex: 1 }} onClick={() => extendTime(30 * 60 * 1000)}>
          +30د
        </button>
        <input
          type="number"
          className="inp"
          style={{ width: 55, padding: '4px', textAlign: 'center', fontSize: 11 }}
          placeholder="دقائق"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const m = parseInt(e.target.value, 10);
              if (m > 0) {
                extendTime(m * 60 * 1000);
                e.target.value = '';
              }
            }
          }}
        />
      </div>

      <div className="counter-bar" style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 14 }}>📨</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700 }}>
            {submittedCount}/{activePlayers.length * attacksPerRound} هجمة
            {attacksPerRound > 1 && (
              <span style={{ fontSize: 10, color: 'var(--gold)', marginRight: 4 }}>
                {' '}
                ({attacksPerRound} لكل لاعب)
              </span>
            )}
            {allSubmitted && <span style={{ color: 'var(--green)', fontSize: 11 }}> ✓</span>}
          </div>
          <div className="counter-track mt2">
            <div
              className="counter-fill"
              style={{
                width: `${(submittedCount / Math.max(activePlayers.length * attacksPerRound, 1)) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        {phase === 'attacking' && isSilentActive && (
          <button
            className="btn bb"
            onClick={async () => {
              const currentAtks = Object.values(attacks || {});
              const seenIds = new Set();
              const elimAtt = {};
              currentAtks.forEach((a) => {
                if (a.correct) {
                  if (!elimAtt[a.realOwnerId]) elimAtt[a.realOwnerId] = [];
                  elimAtt[a.realOwnerId].push(a.attackerNick);
                  seenIds.add(a.realOwnerId);
                }
              });
              const silentExits = playersList
                .filter((p) => seenIds.has(p.id))
                .map((p) => ({
                  playerId: p.id,
                  nick: p.nick,
                  nick2: p.nick2,
                  name: p.name,
                  attackers: elimAtt[p.id] || [],
                  roundNum,
                  initials: p.initials,
                  colorIdx: p.colorIdx,
                }));
              const silentMissed = playersList
                .filter((p) => p.status === 'active' && !currentAtks.some((a) => a.attackerNick === p.nick))
                .map((p) => ({ playerId: p.id, missedRounds: (p.missedRounds || 0) + 1 }));
              const updates = {};
              updates[`rooms/${roomCode}/rounds/round_${roundNum}`] = {
                round: roundNum,
                attacks: attacks || {},
                endedAt: Date.now(),
                silent: true,
              };
              const prev = gameState?.silentPending || { silentExits: [], silentMissed: [] };
              updates[`rooms/${roomCode}/game/silentPending`] = {
                silentExits: [...(prev.silentExits || []), ...silentExits],
                silentMissed: [...(prev.silentMissed || []), ...silentMissed],
                roundNum,
              };
              await update(gameRef(roomCode), { silentActive: false });
              await set(ref(db, `rooms/${roomCode}/currentRound`), { attacks: {} });
              await update(ref(db), updates);
              await launchRound(roundNum + 1);
              notify(`🤫 الجولة ${roundNum} مخفية — الجولة ${roundNum + 1} بدأت`, 'info');
            }}
          >
            🤫 ⏭️ الجولة التالية سراً
          </button>
        )}
        {phase === 'attacking' && !isSilentActive && (
          <button className="btn bv" onClick={doReveal}>
            🔓 كشف نتائج الجولة {roundNum}
          </button>
        )}
        {phase === 'revealing' && activePlayers.length > 2 && (
          <button className="btn bg" onClick={nextRound}>
            ▶️ الجولة التالية ({roundNum + 1})
          </button>
        )}
        {phase === 'revealing' && activePlayers.length <= 2 && (
          <button className="btn br" onClick={endGame}>
            🏆 إعلان الفائز
          </button>
        )}
      </div>

      <div className="div">حالة اللاعبين</div>

      <div className="card" style={{ marginBottom: 8 }}>
        {activePlayers.map((p) => {
          const pNicks = [p.nick, p.nick2].filter(Boolean);
          const pDone = pNicks.reduce((s, n) => s + (playerAttackCounts[n] || 0), 0);
          const allDone = pDone >= attacksPerRound;
          const isBanned = p.isBannedNextRound && p.isBannedNextRound >= roundNum;
          return (
            <div key={p.id} className="pi" style={{ marginBottom: 4 }}>
              <Av p={p} sz={30} fs={11} />
              <div className="pi-info">
                <div style={{ fontSize: 12, fontWeight: 700 }}>
                  {p.name} — <span style={{ color: 'var(--gold)' }}>{p.nick}</span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: isBanned ? 'var(--purple)' : allDone ? 'var(--green)' : pDone > 0 ? 'var(--gold)' : 'var(--muted)',
                  }}
                >
                  {isBanned
                    ? '☠️ محروم (مسموم)'
                    : allDone
                      ? `✅ أكمل ${pDone}/${attacksPerRound}`
                      : pDone > 0
                        ? `⚡ ${pDone}/${attacksPerRound}`
                        : '⏳ لم يرسل'}
                  {p.missedRounds > 0 && !isBanned ? ` · ⚠️ غاب ${p.missedRounds}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 3 }}>
                {!allDone && !isBanned && (
                  <button
                    className="btn bb bxs"
                    onClick={() => {
                      setProxyFor(p.id);
                      setIsProxyMode(true);
                      setMyNick(null);
                      setMyGuess(null);
                      setMySubmitted(false);
                      setGameScreen('attack');
                    }}
                  >
                    🎮
                  </button>
                )}
                <button className="btn br bxs" onClick={() => elimCheat(p.id)}>
                  غش
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="ctitle">🕵️ سجل الهجمات</div>
        {attacksList.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 11, padding: 10 }}>لا هجمات بعد</div>
        ) : (
          <div className="sc" style={{ maxHeight: 180 }}>
            {attacksList.map((a, i) => (
              <div
                key={i}
                style={{
                  padding: '5px 8px',
                  marginBottom: 3,
                  background: '#09091e',
                  borderRadius: 7,
                  borderRight: `3px solid ${a.correct ? 'var(--green)' : 'var(--red)'}`,
                  fontSize: 11,
                }}
              >
                <span style={{ fontWeight: 700 }}>"{a.attackerNick}"</span> → <span>"{a.targetNick}"</span>
                <span style={{ marginRight: 6 }}> خمّن: {a.guessedName}</span>
                <span style={{ color: a.correct ? 'var(--green)' : 'var(--red)' }}>{a.correct ? '✅' : '❌'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          margin: '8px 0',
          padding: '6px 10px',
          background: 'rgba(255,255,255,.03)',
          borderRadius: 7,
          textAlign: 'center',
          fontSize: 10,
          color: 'var(--dim)',
          border: '1px dashed rgba(255,255,255,.08)',
        }}
      >
        ─── إنهاء المسابقة نهائياً ───
      </div>
      <button
        className="btn bgh"
        style={{ border: '1px solid var(--red)', color: 'var(--red)' }}
        onClick={() => setModal({ type: 'confirm_end' })}
      >
        🛑 إنهاء المسابقة كاملاً
      </button>
    </div>
  );
}
