/** مساعدات كشف النتائج المتزامن (المشرف يضغط متابعة — الجميع يرون نفس المشهد). */

export function attacksForPlayer(attacks, { playerId, nicks }) {
  const nk = (nicks || []).filter(Boolean);
  return Object.values(attacks || {})
    .filter((a) => {
      if (playerId && a.attackerPlayerId) return a.attackerPlayerId === playerId;
      return nk.includes(a.attackerNick);
    })
    .sort((a, b) => (a.time || 0) - (b.time || 0));
}

export function uniqueAttackerNicks(attackers) {
  return [...new Set((attackers || []).map((n) => String(n).trim()).filter(Boolean))];
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
    const nicks = [p.nick, p.nick2].filter(Boolean);
    const done = nicks.reduce((sum, n) => sum + list.filter((a) => a.attackerNick === n).length, 0);
    return done < attacksPerRound;
  }).length;
  return { submitted, total, remainingPlayers, allSubmitted: remainingPlayers === 0 };
}
