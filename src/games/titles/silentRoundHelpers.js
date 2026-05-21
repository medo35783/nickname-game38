/** مساعدات جولة الصمت — تخزين مؤقت ثم إعلان مجمّع بفصل حسب رقم الجولة. */

/** Firebase يرفض undefined — نُزيلها أو نُبقي الحقول الاختيارية فقط عند وجود قيمة */
export function sanitizeForFirebase(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitizeForFirebase);
  const out = {};
  Object.entries(value).forEach(([k, v]) => {
    if (v !== undefined) out[k] = sanitizeForFirebase(v);
  });
  return out;
}

function silentExitFromPlayer(p, elimAtt, roundNum) {
  const rec = {
    playerId: p.id,
    nick: p.nick || '',
    name: p.name || '',
    attackers: elimAtt[p.id] || [],
    roundNum,
    initials: p.initials ?? null,
    colorIdx: typeof p.colorIdx === 'number' ? p.colorIdx : 0,
  };
  if (p.nick2) rec.nick2 = p.nick2;
  return rec;
}

export function buildSilentSnapshot(attacks, playersList, roundNum) {
  const currentAtks = Object.values(attacks || {});
  const elimAtt = {};
  const seenIds = new Set();
  currentAtks.forEach((a) => {
    if (a.correct && a.realOwnerId) {
      if (!elimAtt[a.realOwnerId]) elimAtt[a.realOwnerId] = [];
      elimAtt[a.realOwnerId].push(a.attackerNick);
      seenIds.add(a.realOwnerId);
    }
  });

  const silentExits = (playersList || [])
    .filter((p) => seenIds.has(p.id))
    .map((p) => silentExitFromPlayer(p, elimAtt, roundNum));

  const silentMissed = (playersList || [])
    .filter((p) => p.status === 'active' && !currentAtks.some((a) => a.attackerNick === p.nick))
    .map((p) => ({
      playerId: p.id,
      missedRounds: (p.missedRounds || 0) + 1,
      roundNum,
    }));

  return { silentExits, silentMissed, roundNum };
}

export function mergeSilentPending(prev, snapshot) {
  const base = prev || { silentExits: [], silentMissed: [] };
  const roundNums = new Set([
    ...(base.roundNums || []),
    ...(base.silentExits || []).map((e) => e.roundNum),
    snapshot.roundNum,
  ]);
  return sanitizeForFirebase({
    silentExits: [...(base.silentExits || []), ...(snapshot.silentExits || [])],
    silentMissed: [...(base.silentMissed || []), ...(snapshot.silentMissed || [])],
    roundNums: [...roundNums].filter((n) => n != null).sort((a, b) => a - b),
    lastRoundNum: snapshot.roundNum,
  });
}

/** يدمج كل خروج/خمول صامت في قائمة الكشف — كل خروج يحمل fromSilentRound */
export function applySilentPendingToReveal(pendingSilent, playersList, updates, exitList, roomCode) {
  if (!pendingSilent?.silentExits?.length && !pendingSilent?.silentMissed?.length) return;

  (pendingSilent.silentExits || []).forEach((ex) => {
    const p = playersList.find((pl) => pl.id === ex.playerId);
    if (p && p.status === 'active') {
      const attackersStr = (ex.attackers || []).join(' + ');
      updates[`rooms/${roomCode}/players/${p.id}/status`] = 'eliminated';
      updates[`rooms/${roomCode}/players/${p.id}/eliminatedBy`] = attackersStr;
      updates[`rooms/${roomCode}/players/${p.id}/eliminatedRound`] = ex.roundNum;
      exitList.push({
        nick: ex.nick,
        nick2: ex.nick2,
        name: ex.name,
        eliminatedBy: attackersStr,
        attackers: ex.attackers,
        initials: ex.initials,
        colorIdx: ex.colorIdx,
        fromSilentRound: ex.roundNum,
      });
    }
  });

  const missedByPlayer = {};
  (pendingSilent.silentMissed || []).forEach((m) => {
    const prev = missedByPlayer[m.playerId];
    if (!prev || m.missedRounds >= prev.missedRounds) {
      missedByPlayer[m.playerId] = m;
    }
  });
  Object.values(missedByPlayer).forEach((m) => {
    const p = playersList.find((pl) => pl.id === m.playerId);
    if (p && p.status === 'active') {
      const rn = m.roundNum ?? pendingSilent.lastRoundNum ?? pendingSilent.roundNum;
      updates[`rooms/${roomCode}/players/${p.id}/missedRounds`] = m.missedRounds;
      if (m.missedRounds >= 2) {
        updates[`rooms/${roomCode}/players/${p.id}/status`] = 'inactive';
        updates[`rooms/${roomCode}/players/${p.id}/eliminatedRound`] = rn;
        exitList.push({
          nick: p.nick,
          name: p.name,
          eliminatedBy: 'الخمول',
          attackers: [],
          initials: p.initials,
          colorIdx: p.colorIdx,
          inactive: true,
          fromSilentRound: rn,
        });
      }
    }
  });

  updates[`rooms/${roomCode}/game/silentPending`] = null;
}

/** ترتيب مشاهد الكشف: جولات صامتة أقدم أولاً ثم جولة الكشف الحالية */
export function sortRevealQueueBySilentRound(queue) {
  return [...(queue || [])].sort((a, b) => {
    const ra = a.fromSilentRound ?? 9999;
    const rb = b.fromSilentRound ?? 9999;
    if (ra !== rb) return ra - rb;
    return 0;
  });
}

export function silentPendingSummary(pending) {
  if (!pending?.silentExits?.length) return null;
  const byRound = {};
  pending.silentExits.forEach((ex) => {
    const r = ex.roundNum ?? '?';
    if (!byRound[r]) byRound[r] = 0;
    byRound[r] += 1;
  });
  return Object.entries(byRound)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([r, n]) => `ج${r}: ${n}`)
    .join(' · ');
}
