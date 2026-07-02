/** هل شارك اللاعب فعلياً (وليس مجرد حضور في اللوبي)؟ */

export function hasMeaningfulTitlesParticipation({ hits = 0, attacks = 0 } = {}) {
  return (Number(hits) || 0) > 0 || (Number(attacks) || 0) > 0;
}

export function hasMeaningfulHesbahParticipation(player) {
  if (!player) return false;
  return (Number(player.totalScore) || 0) > 0 || (Number(player.answeredRounds) || 0) >= 1;
}

export function hasMeaningfulFameeriParticipation({ attacks = 0, hits = 0 } = {}) {
  return (Number(attacks) || 0) > 0 || (Number(hits) || 0) > 0;
}
