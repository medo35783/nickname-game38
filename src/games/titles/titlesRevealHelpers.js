/** مساعدات كشف النتائج المتزامن (المشرف يضغط متابعة — الجميع يرون نفس المشهد). */

/** هل أرسل اللاعب هجوماً هذه الجولة؟ (هوية واحدة حتى مع لقبين) */
export function playerSubmittedAttack(attacks, player) {
  if (!player) return false;
  const list = Object.values(attacks || {});
  const nicks = [player.nick, player.nick2].filter(Boolean);
  return list.some(
    (a) =>
      (player.id && a.attackerPlayerId === player.id) || nicks.includes(a.attackerNick)
  );
}

/** الألقاب التي يمكن استهدافها — تستثني المكشوفة مسبقاً */
export function attackableNicksForPlayer(player) {
  if (!player || player.status !== 'active') return [];
  const nicks = [player.nick, player.nick2].filter(Boolean);
  if (player.revealedNick) return nicks.filter((n) => n !== player.revealedNick);
  return nicks;
}

/** كل الألقاب المكشوفة للاعب (جولة سابقة + هذه الجولة) */
export function getRevealedNicks(player, roundHits = []) {
  const nicks = [player?.nick, player?.nick2].filter(Boolean);
  const fromHits = (roundHits || [])
    .map((h) => (typeof h === 'string' ? h : h.targetNick))
    .filter((n) => nicks.includes(n));
  const prev = player?.revealedNick ? [player.revealedNick] : [];
  return [...new Set([...prev, ...fromHits])];
}

/** في وضع اللقبين: هل كُشف اللقبان معاً؟ */
export function isDualTitleFullyRevealed(player, roundHits = []) {
  if (!player?.nick2) return roundHits.length > 0;
  const revealed = getRevealedNicks(player, roundHits);
  return revealed.includes(player.nick) && revealed.includes(player.nick2);
}

/** اللقب المخفي المتبقي (وضع لقبين) */
export function hiddenNickForPlayer(player, roundHits = []) {
  if (!player?.nick2) return null;
  const revealed = getRevealedNicks(player, roundHits);
  return [player.nick, player.nick2].find((n) => !revealed.includes(n)) || null;
}

/** ألقاب اللاعب */
export function playerNicksList(player) {
  return [player?.nick, player?.nick2].filter(Boolean);
}

/** الألقاب المكشوفة للاعب (من الحالة + أرشيف الجولات) */
export function revealedNicksForStats(player, allRoundsList = []) {
  const nicks = playerNicksList(player);
  if (!player || !nicks.length) return [];
  const fromArchive = new Set();
  (allRoundsList || []).forEach((r) => {
    Object.values(r.attacks || {}).forEach((a) => {
      if (a.correct && a.realOwnerId === player.id && nicks.includes(a.targetNick)) {
        fromArchive.add(a.targetNick);
      }
    });
  });
  if (player.status !== 'active') {
    return fromArchive.size ? [...fromArchive] : nicks;
  }
  return getRevealedNicks(player, []);
}

/** تفاصيل خروج لقب معيّن */
export function nickExitMeta(player, nick, allRoundsList = []) {
  const nicks = playerNicksList(player);
  if (!nick || !nicks.includes(nick)) return null;
  let best = null;
  (allRoundsList || []).forEach((r) => {
    Object.values(r.attacks || {}).forEach((a) => {
      if (a.correct && a.realOwnerId === player.id && a.targetNick === nick) {
        if (!best || r.round >= best.round) {
          best = { round: r.round, by: a.attackerNick };
        }
      }
    });
  });
  if (best) return best;
  if (player?.eliminatedRound && (player.eliminatedBy || player.eliminatedByList?.length)) {
    return {
      round: player.eliminatedRound,
      by: player.eliminatedBy || player.eliminatedByList?.join(' + '),
    };
  }
  return null;
}

/** اللقب الذي كُشف لأول مرة هذه الجولة (للإعلان) */
export function nickRevealedThisRound(player, roundHits = []) {
  const hitNicks = (roundHits || []).map((h) => h.targetNick).filter(Boolean);
  const prev = player?.revealedNick;
  const newlyHit = hitNicks.filter((n) => n === player.nick || n === player.nick2);
  if (!newlyHit.length) return null;
  return newlyHit.find((n) => n !== prev) || null;
}

/** عدد الألقاب المتبقية في الساحة (المخفية لنشطين) */
export function remainingTitlesCount(playersList) {
  return (playersList || [])
    .filter((p) => p.status === 'active')
    .reduce((sum, p) => sum + attackableNicksForPlayer(p).length, 0);
}

/** ملخص سريع للوحة المتبقون — متسابقون + ألقاب */
export function remainingBoardStats(playersList, silentExitCount = 0) {
  const list = playersList || [];
  const active = list.filter((p) => p.status === 'active');
  const titlesLeft = remainingTitlesCount(active);
  const titlesTotal = list.reduce((sum, p) => sum + playerNicksList(p).length, 0);

  return {
    playersActive: active.length,
    playersOut: list.filter((p) => p.status !== 'active').length + (silentExitCount || 0),
    titlesLeft,
    titlesGone: Math.max(0, titlesTotal - titlesLeft),
  };
}

/** هل تنتهي المسابقة؟ — يبقى لقب أو لقبان فقط في الساحة */
export function shouldEndGameByRemainingTitles(playersList) {
  const n = remainingTitlesCount(playersList);
  return n >= 1 && n <= 2;
}

/** محاكاة حالة اللاعبين بعد الكشف — لحساب الألقاب المتبقية */
export function playersAfterReveal(playersList, updates, leavingIds, roomPath) {
  return (playersList || []).map((p) => {
    if (leavingIds.has(p.id)) return { ...p, status: 'eliminated' };
    if (p.status !== 'active') return p;
    const revKey = `${roomPath}/players/${p.id}/revealedNick`;
    if (updates[revKey] !== undefined) {
      return { ...p, revealedNick: updates[revKey] };
    }
    return p;
  });
}

/** وضع اللقبين يشترط تمويهاً واحداً على الأقل */
export function isDecoyRequired(nickMode) {
  return Number(nickMode) === 2;
}

export function attacksForPlayer(attacks, { playerId, nicks }) {
  const nk = (nicks || []).filter(Boolean);
  return Object.values(attacks || {})
    .filter((a) => {
      const byPlayerId = Boolean(playerId && a.attackerPlayerId && a.attackerPlayerId === playerId);
      const byNick = nk.includes(a.attackerNick);
      return byPlayerId || byNick;
    })
    .sort((a, b) => (a.time || 0) - (b.time || 0));
}

export function uniqueAttackerNicks(attackers) {
  return [...new Set((attackers || []).map((n) => String(n).trim()).filter(Boolean))];
}

/** أسماء المُكشِفين في سطر واحد — للبطاقة */
export function formatRevealAttackersLine(attackers) {
  const list = uniqueAttackerNicks(attackers);
  if (list.length === 0) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} و ${list[1]}`;
  return `${list[0]} و ${list[1]} و ${list.length - 2} آخرين`;
}

/** عدد المهاجمين الذين أصابوا اللقب المعروض (شخصان+ على نفس اللقب = سهمان) */
export function arrowCountOnNick(item) {
  const nick = item?.nick;
  if (!nick) return 0;
  const hits = Array.isArray(item.hits) ? item.hits : [];
  if (hits.length > 0) {
    const onNick = hits.filter((h) => h.targetNick === nick);
    return uniqueAttackerNicks(onNick.map((h) => h.attackerNick)).length;
  }
  return uniqueAttackerNicks(item.attackers).length;
}

/** جملة الإعلان عند إصابات متعددة على نفس اللقب */
export function multiArrowAnnounce(count, targetNick) {
  const n = Number(count) || 0;
  const q = `"${targetNick}"`;
  if (n === 2) return `🏹🏹 إصابة مزدوجة! سهمان أصابا ${q}`;
  if (n >= 3) return `🏹 ${n} أسهم أصابت ${q}!`;
  return '';
}

import { sortRevealQueueBySilentRound } from './silentRoundHelpers';

export function buildRevealQueue(exitList) {
  const items = (exitList || [])
    .filter((ex) => !ex.inactive)
    .map((ex) => {
      const attackers = uniqueAttackerNicks(
        ex.attackers || (ex.eliminatedBy ? String(ex.eliminatedBy).split(' + ') : [])
      );
      const item = {
        type: ex.partial ? 'partial' : 'elim',
        nick: ex.nick,
        nick2: ex.nick2 || null,
        name: ex.name || null,
        attackers,
        hits: Array.isArray(ex.hits) ? ex.hits : [],
        fromSilentRound: ex.fromSilentRound || null,
      };
      item.arrowCount = arrowCountOnNick(item);
      return item;
    });
  return sortRevealQueueBySilentRound(items);
}

/** سينكشف لقب واحد / لقبان / N ألقاب — صياغة صحيحة مع العدد */
export function revealNickCountPhrase(count) {
  const n = Number(count) || 0;
  if (n === 1) return 'سينكشف لقب واحد';
  if (n === 2) return 'سينكشف لقبان';
  if (n > 2) return `سينكشف ${n} ألقاب`;
  return '';
}

/** عنوان تشويقي للمتسابق قبل بدء مشاهد الكشف */
export function revealPlayerTeaser(count) {
  const n = Number(count) || 0;
  if (n === 0) return { headline: '', sub: '' };
  if (n === 1) {
    return {
      headline: 'هل أنت مستعد لمعرفة من خرج؟',
      sub: revealNickCountPhrase(1),
    };
  }
  if (n === 2) {
    return {
      headline: 'من سيغادر الساحة هذه الجولة؟',
      sub: revealNickCountPhrase(2),
    };
  }
  return {
    headline: 'اللحظة الحاسمة… من سينكشف؟',
    sub: revealNickCountPhrase(n),
  };
}

/** تلميح المشرف — يذكر زر المتابعة */
export function revealAdminQueueHint(count) {
  const line = revealNickCountPhrase(count);
  return line ? `${line} — اضغط «متابعة» للإعلان` : '';
}

export function countAttackProgress(activePlayers, attacks, attacksPerRound) {
  const list = Object.values(attacks || {});
  const total = Math.max(activePlayers.length * attacksPerRound, 1);
  const submitted = list.length;
  const remainingPlayers = activePlayers.filter((p) => {
    const done = attacksForPlayer(attacks, {
      playerId: p.id,
      nicks: [p.nick, p.nick2].filter(Boolean),
    }).length;
    return done < attacksPerRound;
  }).length;
  return { submitted, total, remainingPlayers, allSubmitted: remainingPlayers === 0 };
}
