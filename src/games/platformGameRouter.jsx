import TitlesGame from './titles/TitlesGame';
import FameeriGame from './fameeri/FameeriGame';
import SniperGame from './sniper/SniperGame';

/**
 * موجّه ألعاب المنصة — يُستورد من App دون توسيع renderGame يدوياً لكل لعبة جديدة.
 */
export function renderPlatformGame(selectedGame, props) {
  const {
    titlesRef,
    fameeriRef,
    sniperRef,
    notify,
    setTab,
    setSelectedGame,
    onHeaderMeta,
    canHostRoom,
    onRequestActivation,
    onGameEnd,
    onGoAccount,
  } = props;

  if (selectedGame === 'nicknames') {
    return (
      <TitlesGame
        ref={titlesRef}
        notify={notify}
        setTab={setTab}
        setSelectedGame={setSelectedGame}
        onHeaderMeta={onHeaderMeta}
        canCreateRoom={canHostRoom}
        onRequestActivation={onRequestActivation}
        onGameEnd={onGameEnd}
      />
    );
  }

  if (selectedGame === 'qumairi') {
    return (
      <FameeriGame
        ref={fameeriRef}
        notify={notify}
        setTab={setTab}
        setSelectedGame={setSelectedGame}
        canCreateRoom={canHostRoom}
        onRequestActivation={onRequestActivation}
        onGameEnd={onGameEnd}
        onGoAccount={onGoAccount}
      />
    );
  }

  if (selectedGame === 'sniper') {
    return (
      <SniperGame
        ref={sniperRef}
        notify={notify}
        setTab={setTab}
        setSelectedGame={setSelectedGame}
        canCreateRoom={canHostRoom}
        onRequestActivation={onRequestActivation}
        onGameEnd={onGameEnd}
      />
    );
  }

  return null;
}

export function handlePlatformGameBack(selectedGame, refs, fallbacks) {
  const { setSelectedGame, setGameScreen, gameScreen } = fallbacks;
  if (selectedGame === 'qumairi') {
    if (refs.fameeriRef?.current?.handleHeaderBack?.()) return true;
    setSelectedGame(null);
    return true;
  }
  if (selectedGame === 'nicknames') {
    if (refs.titlesRef?.current?.handleHeaderBack?.()) return true;
    setSelectedGame(null);
    return true;
  }
  if (selectedGame === 'sniper') {
    if (refs.sniperRef?.current?.handleHeaderBack?.()) return true;
    setSelectedGame(null);
    return true;
  }
  if (gameScreen !== 'home') {
    setGameScreen('home');
    return true;
  }
  setSelectedGame(null);
  return true;
}
