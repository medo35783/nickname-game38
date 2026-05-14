import { ref as dbRef, push, update } from 'firebase/database';
import { db } from '../../core/firebase';

/**
 * حسم جولة السرعة — إجابة صحيحة: يُفعّل هجوم مجموعة واحدة، الباقون يخسرون السلاح المعلن فقط.
 */
export async function applySpeedRoundCorrect({ qRoom, qGameState, qGroups, winnerGroupId, Q_WEAPONS }) {
  const claims = qGameState?.speedClaims || {};
  const ids = Object.keys(claims);
  if (!ids.length) return;
  if (ids.length > 1 && !winnerGroupId) return;
  const winId = winnerGroupId || ids[0];
  const atk = claims[winId];
  if (!atk) return;

  const u = {};
  const tg = qGroups[atk.targetId];

  if (tg?.shield === atk.tree) {
    u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${atk.weapon}`] =
      (qGroups[atk.attackerId]?.weapons?.[atk.weapon] || 1) - 1;
    u[`qrooms/${qRoom}/groups/${atk.targetId}/shield`] = null;
    const logRef = push(dbRef(db, `qrooms/${qRoom}/attacks`));
    u[`qrooms/${qRoom}/attacks/${logRef.key}`] = { ...atk, result: 'shielded', hunted: 0, timestamp: Date.now() };
    const ts = Date.now();
    u[`qrooms/${qRoom}/game/lastResult`] = {
      ...atk,
      result: 'success',
      hunted: 0,
      msg: '🛡️ الدرع صد الهجوم',
      timestamp: ts,
    };
    u[`qrooms/${qRoom}/game/showResult`] = true;
    u[`qrooms/${qRoom}/game/speedClaims`] = {};
    u[`qrooms/${qRoom}/game/speedBatchActive`] = false;
    u[`qrooms/${qRoom}/game/timer`] = null;
    await update(dbRef(db), u);
    return;
  }

  const wp = Q_WEAPONS.find((w) => w.id === atk.weapon)?.power || 0;
  const treeCount = tg?.trees?.[atk.tree] || 0;
  const hunted = Math.min(treeCount, wp);

  u[`qrooms/${qRoom}/groups/${atk.targetId}/trees/${atk.tree}`] = treeCount - hunted;
  u[`qrooms/${qRoom}/groups/${atk.targetId}/totalRemaining`] = (tg?.totalRemaining || 0) - hunted;
  u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${atk.weapon}`] =
    (qGroups[atk.attackerId]?.weapons?.[atk.weapon] || 1) - 1;

  let poisonMsg = null;
  if (qGameState?.cursedTree === atk.tree) {
    const atkW = { ...(qGroups[atk.attackerId]?.weapons || {}) };
    atkW[atk.weapon] = (atkW[atk.weapon] || 0) - 1;
    const order = ['showzel', 'omsagma', 'nabeeta'];
    const startIdx = order.indexOf(atk.weapon);
    let deducted = null;
    for (let wi = startIdx; wi < order.length; wi++) {
      if ((atkW[order[wi]] || 0) > 0) {
        u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${order[wi]}`] = atkW[order[wi]] - 1;
        deducted = Q_WEAPONS.find((w) => w.id === order[wi])?.name;
        break;
      }
    }
    poisonMsg = deducted ? `☠️ الشجرة المسمومة — خسرت ${deducted} إضافي` : '☠️ الشجرة المسمومة';
  }

  const ts = Date.now();
  const logRef = push(dbRef(db, `qrooms/${qRoom}/attacks`));
  u[`qrooms/${qRoom}/attacks/${logRef.key}`] = { ...atk, result: 'success', hunted, timestamp: ts };

  for (const gid of ids) {
    if (gid === winId) continue;
    const c = claims[gid];
    if (!c?.weapon) continue;
    u[`qrooms/${qRoom}/groups/${gid}/weapons/${c.weapon}`] = (qGroups[gid]?.weapons?.[c.weapon] || 1) - 1;
    const lr = push(dbRef(db, `qrooms/${qRoom}/attacks`));
    u[`qrooms/${qRoom}/attacks/${lr.key}`] = {
      ...c,
      result: 'fail',
      hunted: 0,
      msg: '⚡ السرعة — لم يُفعّل هجومك',
      timestamp: Date.now(),
    };
  }

  u[`qrooms/${qRoom}/game/lastResult`] = {
    ...atk,
    result: 'success',
    hunted,
    msg: hunted > 0 ? `🎯 ${hunted} قميري` : '🌳 الشجرة فارغة',
    poisonMsg,
    timestamp: ts,
  };
  u[`qrooms/${qRoom}/game/showResult`] = true;
  u[`qrooms/${qRoom}/game/speedClaims`] = {};
  u[`qrooms/${qRoom}/game/speedBatchActive`] = false;
  u[`qrooms/${qRoom}/game/timer`] = null;

  await update(dbRef(db), u);
}

/** إجابة خاطئة: كل من أرسل طلباً يخسر سلاحه المعلن */
export async function applySpeedRoundWrong({ qRoom, qGameState, qGroups }) {
  const claims = qGameState?.speedClaims || {};
  const ids = Object.keys(claims);
  if (!ids.length) return;

  const u = {};
  const ts = Date.now();
  let firstAtk = null;

  for (const gid of ids) {
    const c = claims[gid];
    if (!c?.weapon) continue;
    if (!firstAtk) firstAtk = c;
    u[`qrooms/${qRoom}/groups/${gid}/weapons/${c.weapon}`] = (qGroups[gid]?.weapons?.[c.weapon] || 1) - 1;
    const logRef = push(dbRef(db, `qrooms/${qRoom}/attacks`));
    u[`qrooms/${qRoom}/attacks/${logRef.key}`] = { ...c, result: 'fail', hunted: 0, timestamp: ts };
  }

  u[`qrooms/${qRoom}/game/lastResult`] = {
    ...(firstAtk || {}),
    result: 'fail',
    hunted: 0,
    msg: '❌ إجابة خاطئة — خسر الجميع سلاحهم في السرعة',
    timestamp: ts,
  };
  u[`qrooms/${qRoom}/game/showResult`] = true;
  u[`qrooms/${qRoom}/game/speedClaims`] = {};
  u[`qrooms/${qRoom}/game/speedBatchActive`] = false;
  u[`qrooms/${qRoom}/game/timer`] = null;

  await update(dbRef(db), u);
}
