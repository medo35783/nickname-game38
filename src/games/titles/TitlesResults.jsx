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
    declareWinner,
    firebaseConnected,
    onPrepNextRound,
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
          declareWinner={declareWinner}
          nextRound={nextRound}
          endGame={endGame}
          setGameScreen={setGameScreen}
          setStatsTab={setStatsTab}
          onPrepNextRound={onPrepNextRound}
        />
      </div>
    );
  }


  if (phase === 'ended') {
    return null;
  }

  return null;
}
