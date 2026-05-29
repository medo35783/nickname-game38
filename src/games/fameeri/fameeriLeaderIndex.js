/** فهرس uid → groupId لقواعد Firebase (هجمات السرعة) */
export function leaderByUidPath(qRoom, uid) {
  return `qrooms/${qRoom}/leaderByUid/${uid}`;
}

export function patchLeaderByUid(qRoom, uid, groupId) {
  if (!qRoom || !uid || !groupId) return {};
  return { [leaderByUidPath(qRoom, uid)]: groupId };
}
