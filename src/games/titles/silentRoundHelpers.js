/** مساعدات جولة الصمت — تخزين مؤقت ثم إعلان مجمّع بفصل حسب رقم الجولة. */

import {
  isDualTitleFullyRevealed,
  nickRevealedThisRound,
  playerSubmittedAttack,
} from './titlesRevealHelpers';

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

function playerNicks(player) {
  return [player?.nick, player?.nick2].filter(Boolean);
}

function newlyRevealedNicksFor(player, hits) {
  const prev = player?.revealedNick ? [player.revealedNick] : [];
  return [
    ...new Set(
      (hits || [])
        .map((h) => h.targetNick)
        .filter((nick) => playerNicks(player).includes(nick) && !prev.includes(nick))
    ),
  ];
}

function attackersForNick(hits, nick) {
  return [
    ...new Set(
      (hits || [])
        .filter((h) => h.targetNick === nick)
        .map((h) => h.attackerNick)
        .filter(Boolean)
    ),
  ];
}

function silentExitFromPlayer(p, attackers, roundNum, nick) {
  const rec = {
    playerId: p.id,
    nick: nick || p.nick || '',
    name: p.name || '',
    attackers: attackers || [],
    roundNum,
    initials: p.initials ?? null,
    colorIdx: typeof p.colorIdx === 'number' ? p.colorIdx : 0,
  };
  return rec;
}

export function buildSilentSnapshot(attacks, playersList, roundNum) {
  const currentAtks = Object.values(attacks || {});
  const seenIds = new Set();
  currentAtks.forEach((a) => {
    if (a.correct && a.realOwnerId) {
      seenIds.add(a.realOwnerId);
    }
  });

  const silentExits = [];
  const silentPartialReveals = [];

  (playersList || []).forEach((p) => {
    if (!seenIds.has(p.id)) return;
    const hits = currentAtks.filter((a) => a.correct && a.realOwnerId === p.id);
    const newlyRevealedNicks = newlyRevealedNicksFor(p, hits);
    if (p.nick2 && !isDualTitleFullyRevealed(p, hits)) {
      const justRevealed = newlyRevealedNicks[0] || nickRevealedThisRound(p, hits);
      if (justRevealed) {
        silentPartialReveals.push({
          playerId: p.id,
          revealedNick: justRevealed,
          name: p.name || '',
          attackers: attackersForNick(hits, justRevealed),
          roundNum,
          initials: p.initials ?? null,
          colorIdx: typeof p.colorIdx === 'number' ? p.colorIdx : 0,
        });
      }
      return;
    }
    const finalRevealedNick =
      (p.nick2 && p.revealedNick && newlyRevealedNicks.find((nick) => nick !== p.revealedNick)) ||
      (p.nick2 && newlyRevealedNicks[newlyRevealedNicks.length - 1]) ||
      nickRevealedThisRound(p, hits) ||
      hits.find((h) => playerNicks(p).includes(h.targetNick))?.targetNick ||
      p.nick;
    silentExits.push(silentExitFromPlayer(p, attackersForNick(hits, finalRevealedNick), roundNum, finalRevealedNick));
  });

  const silentMissed = (playersList || [])
    .filter((p) => p.status === 'active' && !playerSubmittedAttack(currentAtks, p))
    .map((p) => ({
      playerId: p.id,
      missedRounds: (p.missedRounds || 0) + 1,
      roundNum,
    }));

  return { silentExits, silentMissed, silentPartialReveals, roundNum };
}

export function mergeSilentPending(prev, snapshot) {
  const base = prev || { silentExits: [], silentMissed: [], silentPartialReveals: [] };
  const roundNums = new Set([
    ...(base.roundNums || []),
    ...(base.silentExits || []).map((e) => e.roundNum),
    snapshot.roundNum,
  ]);
  return sanitizeForFirebase({
    silentExits: [...(base.silentExits || []), ...(snapshot.silentExits || [])],
    silentMissed: [...(base.silentMissed || []), ...(snapshot.silentMissed || [])],
    silentPartialReveals: [
      ...(base.silentPartialReveals || []),
      ...(snapshot.silentPartialReveals || []),
    ],
    roundNums: [...roundNums].filter((n) => n != null).sort((a, b) => a - b),
    lastRoundNum: snapshot.roundNum,
  });
}

/** يدمج كل خروج/خمول صامت في قائمة الكشف — كل خروج يحمل fromSilentRound */
export function applySilentPendingToReveal(pendingSilent, playersList, updates, exitList, roomCode) {
  if (
    !pendingSilent?.silentExits?.length &&
    !pendingSilent?.silentMissed?.length &&
    !pendingSilent?.silentPartialReveals?.length
  ) {
    return;
  }

  (pendingSilent.silentPartialReveals || []).forEach((pr) => {
    const p = playersList.find((pl) => pl.id === pr.playerId);
    if (p && p.status === 'active' && pr.revealedNick) {
      updates[`rooms/${roomCode}/players/${p.id}/revealedNick`] = pr.revealedNick;
      exitList.push({
        nick: pr.revealedNick,
        name: pr.name || p.name || null,
        partial: true,
        eliminatedBy: '',
        attackers: pr.attackers || [],
        hits: [],
        initials: pr.initials ?? p.initials,
        colorIdx: pr.colorIdx ?? p.colorIdx,
        fromSilentRound: pr.roundNum,
      });
    }
  });

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
