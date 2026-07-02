/** هل بدأت المسابقة فعلياً (أكثر من مجرد لوبي/انتظار)؟ */

export function hasHesbahCompetitionStarted(game) {
  return (game?.currentQ || 0) >= 1;
}

export function hasFameeriCompetitionStarted(qGameState, qAttacks) {
  const phase = qGameState?.phase || 'lobby';
  if (phase === 'playing') return true;
  if (Object.keys(qAttacks || {}).length > 0) return true;
  return false;
}

export function hasTitlesCompetitionStarted(gameState, allRoundsData) {
  const phase = gameState?.phase || 'lobby';
  if (phase === 'attacking' || phase === 'revealing') return true;
  if ((gameState?.roundNum || 0) >= 1) return true;
  return Object.keys(allRoundsData || {}).length > 0;
}

export function isGameCancelled(gameState) {
  return Boolean(
    gameState?.cancelled || gameState?.endedBeforeStart || gameState?.closedFromLobby
  );
}
