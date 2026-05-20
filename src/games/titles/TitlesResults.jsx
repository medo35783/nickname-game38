import { useState } from 'react';
import Av from '../../shared/Av';
import TitlesRevealScene from './TitlesRevealScene';
import LiveConnectionBar from './LiveConnectionBar';


/**
 * شاشتا النتائج والفائز للعبة الألقاب.
 * - phase === 'revealing' => شاشة كشف الألقاب (results)
 * - phase === 'ended'     => شاشة الفائز (winner)
 */
export default function TitlesResults(props) {
  const {
    role,
    players,
    gameState,
    attacks,
    allRoundsData,
    myNickLocal,
    roomCode,
    statsTab,
    setStatsTab,
    heatmapView,
    setHeatmapView,
    effectiveNickMode,
    doReveal,
    nextRound,
    endGame,
    notify,
    setModal,
    proxyFor,
    advanceRevealStep,
    firebaseConnected,
  } = props;

  void statsTab;
  void heatmapView;
  void setHeatmapView;
  void effectiveNickMode;
  void doReveal;
  void nextRound;
  void endGame;
  void notify;
  void setModal;

  const setGameScreen = props.setGameScreen ?? (() => {});
  const playSound = props.playSound ?? (() => {});
  const renderFullLog = props.renderFullLog ?? (() => null);
  const downloadPDFReport = props.downloadPDFReport ?? (() => {});

  /* ── حالة الكروت القابلة للقلب (محلية إذا لم تُمرَّر) ── */
  const [localFlipCards, setLocalFlipCards] = useState({});
  const flipCards = props.flipCards ?? localFlipCards;
  const setFlipCards = props.setFlipCards ?? setLocalFlipCards;

  /* ── DERIVED ── */
  const phase = gameState?.phase;
  const roundNum = gameState?.roundNum || 0;
  const activePoisonNick = gameState?.poisonNick || '';

  const playersList = Object.entries(players || {}).map(([id, p]) => ({ ...p, id }));
  const activePlayers = playersList.filter((p) => p.status === 'active');

  const allRoundsList = Object.values(allRoundsData || {}).sort((a, b) => a.round - b.round);
  const allAttacksFlat = allRoundsList.flatMap((r) => Object.values(r.attacks || {}));

  const attackerRankGlobal = playersList
    .map((p) => {
      const nicks = [p.nick, p.nick2].filter(Boolean);
      const atks = allAttacksFlat.filter((a) => nicks.includes(a.attackerNick));
      return {
        id: p.id,
        name: p.name,
        nick: p.nick,
        nick2: p.nick2,
        colorIdx: p.colorIdx,
        initials: p.initials,
        status: p.status,
        count: atks.length,
        hits: atks.filter((a) => a.correct).length,
      };
    })
    .filter((p) => p.count > 0)
    .sort((a, b) => b.hits - a.hits || b.count - a.count);

  /* ══════════════════════════════════════════════
     شاشة كشف النتائج  (phase === 'revealing')
  ══════════════════════════════════════════════ */
  if (phase === 'revealing') {
    return (
      <div className="scr">
        <LiveConnectionBar connected={firebaseConnected !== false} roomCode={roomCode} />
        <TitlesRevealScene
          role={role}
          gameState={gameState}
          attacks={attacks}
          players={players}
          myId={props.myId}
          myNickLocal={myNickLocal}
          playSound={playSound}
          advanceRevealStep={advanceRevealStep}
          nextRound={nextRound}
          endGame={endGame}
          setGameScreen={setGameScreen}
          setStatsTab={setStatsTab}
        />
      </div>
    );
  }


  /* ══════════════════════════════════════════════
     شاشة الفائز  (phase === 'ended')
  ══════════════════════════════════════════════ */
  if (phase === 'ended') {
    const winners = activePlayers;
    const totalCorrect = allAttacksFlat.filter((a) => a.correct).length;

    return (
      <div className="scr">
        {/* مرحلة الإعلان — الفائز */}
        <div style={{ textAlign: 'center', padding: '24px 0 16px' }}>
          <div style={{ fontSize: 80, animation: 'bnc 1s infinite' }}>🏆</div>
          <div
            style={{
              fontFamily: 'Cairo',
              fontSize: 28,
              fontWeight: 900,
              background: 'linear-gradient(135deg,var(--gold),#ff8c00)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginTop: 8,
            }}
          >
            {winners.length === 1 ? 'الفائز' : 'الفائزون'}
          </div>
        </div>

        {/* بطاقات الفائزين — تصميم مختلف عن الكشف */}
        {winners.map((w, i) => (
          <div
            key={w.id}
            style={{
              background: 'linear-gradient(135deg,rgba(240,192,64,.2),rgba(255,200,50,.1))',
              border: '2px solid var(--gold)',
              borderRadius: 20,
              padding: '24px 18px',
              marginBottom: 12,
              textAlign: 'center',
              boxShadow: '0 0 40px rgba(240,192,64,.15)',
              animation: 'fi .6s ease',
            }}
          >
            <div style={{ fontSize: 50, marginBottom: 6 }}>{i === 0 ? '👑' : '🥈'}</div>
            <div style={{ fontFamily: 'Cairo', fontSize: 24, fontWeight: 900, color: 'var(--gold)' }}>{w.name}</div>
            <div style={{ fontSize: 15, color: 'var(--text)', marginTop: 4 }}>
              "{w.nick}"
              {w.nick2 ? <span style={{ color: 'rgba(240,192,64,.6)' }}> · "{w.nick2}"</span> : ''}
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>صمد {roundNum} جولة بدون كشف</div>
          </div>
        ))}

        {/* ملخص المسابقة */}
        <div className="sg sg3" style={{ marginBottom: 12 }}>
          <div className="sbox">
            <div className="snum">{roundNum}</div>
            <div className="slbl">جولات</div>
          </div>
          <div className="sbox">
            <div className="snum">{allAttacksFlat.length}</div>
            <div className="slbl">هجمات</div>
          </div>
          <div className="sbox">
            <div className="snum" style={{ color: 'var(--green)' }}>{totalCorrect}</div>
            <div className="slbl">إصابات</div>
          </div>
        </div>

        {/* الأشرس — بالألقاب فقط */}
        {attackerRankGlobal.length > 0 && (
          <div className="card">
            <div className="ctitle">⚔️ الأشرس هجوماً</div>
            {attackerRankGlobal.slice(0, 5).map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  background: '#09091e',
                  borderRadius: 8,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: 'Cairo',
                    fontSize: 14,
                    fontWeight: 900,
                    width: 22,
                    color: i === 0 ? 'var(--gold)' : 'var(--muted)',
                  }}
                >
                  {i === 0 ? '👑' : i + 1}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--gold)', flex: 1 }}>"{p.nick}"</span>
                <span style={{ fontSize: 12, color: 'var(--green)' }}>{p.hits} إصابة</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.count} هجمة</span>
              </div>
            ))}
          </div>
        )}

        {/* 🎭 كشف ألقاب التمويه — في نهاية المسابقة */}
        {(() => {
          const decoyNicks = Array.isArray(gameState?.decoyNicks) ? gameState.decoyNicks : [];
          if (decoyNicks.length === 0) return null;
          const decoyAttacks = allAttacksFlat.filter((a) => a.isDecoy);
          return (
            <div
              className="card"
              style={{
                background: 'linear-gradient(135deg,rgba(155,89,182,.1),rgba(79,163,224,.05))',
                border: '1.5px solid rgba(155,89,182,.4)',
              }}
            >
              <div className="ctitle" style={{ color: 'var(--purple)' }}>
                🎭 كُشف السر — ألقاب التمويه ({decoyNicks.length})
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10, lineHeight: 1.6 }}>
                هذه الألقاب لم يكن لها صاحب حقيقي — كانت لخداع المهاجمين فقط!
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {decoyNicks.map((n) => {
                  const hits = decoyAttacks.filter((a) => a.targetNick === n).length;
                  return (
                    <div
                      key={n}
                      style={{
                        display: 'inline-flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                        padding: '8px 14px',
                        background: 'linear-gradient(145deg,rgba(155,89,182,.22),rgba(79,163,224,.1))',
                        border: '1px solid rgba(155,89,182,.55)',
                        borderRadius: 14,
                        minWidth: 72,
                      }}
                    >
                      <span style={{ fontSize: 12, color: 'var(--purple)', fontWeight: 800 }}>
                        🎭 &quot;{n}&quot;
                      </span>
                      <span style={{ fontSize: 10, color: 'rgba(200,160,255,.95)', fontWeight: 700 }}>تمويه 🎭</span>
                      {hits > 0 && (
                        <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 700 }}>سقط فيه {hits}</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {decoyAttacks.length > 0 && (
                <div style={{ fontSize: 11, color: 'var(--gold)', textAlign: 'center', marginTop: 4 }}>
                  وقع المهاجمون في فخّ التمويه {decoyAttacks.length} مرة — أحسنتم 👏
                </div>
              )}
            </div>
          );
        })()}

        {/* التقرير الكامل */}
        <div className="card">
          <div className="ctitle">📜 تسلسل المسابقة</div>
          {renderFullLog(role !== 'admin')}
        </div>

        <button className="btn bgh mt2" onClick={() => setGameScreen('stats')}>
          📊 الإحصائيات الكاملة
        </button>
        {role === 'admin' && (
          <button className="btn bg mt2" onClick={downloadPDFReport}>
            📄 تقرير كامل + طباعة PDF
          </button>
        )}
      </div>
    );
  }

  return null;
}
