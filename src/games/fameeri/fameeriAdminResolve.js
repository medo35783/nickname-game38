import { ref as dbRef, update, push, get } from 'firebase/database';
import { db } from '../../firebase';
import { Q_WEAPONS } from '../../core/constants';
import { applySpeedRoundCorrect } from './fameeriSpeedRound';

/** مدة نافذة تفعيل الدرع بعد إجابة «صح» (ثوانٍ) */
export const SHIELD_WINDOW_SEC = 10;

/** جلب حالة المجموعات من Firebase — يُستخدم قبل حسم الدرع لتجنّب بيانات قديمة */
async function fetchFreshGroupsData(qRoom) {
  const snap = await get(dbRef(db, `qrooms/${qRoom}/groups`));
  if (!snap.exists()) return { qGroups: {}, qGList: [] };
  const qGroups = snap.val();
  const qGList = Object.entries(qGroups).map(([id, g]) => ({ id, ...g }));
  return { qGroups, qGList };
}

/** بناء إعلان الحكم للجميع */
export function buildAnswerVerdict(attack, correct, { revealedAnswer } = {}) {
  if (!attack?.attackerName) return null;
  const ok = !!correct;
  const verdict = {
    correct: ok,
    attackerName: attack.attackerName,
    targetName: attack.targetName,
    weaponName: attack.weaponName,
    tree: attack.tree,
    msg: ok
      ? revealedAnswer
        ? `✅ إجابة صحيحة — ${revealedAnswer}`
        : '✅ المشرف: إجابة صحيحة — الهجوم يُحسب!'
      : '❌ المشرف: إجابة خاطئة — الهجوم لا يُحسب',
    timestamp: Date.now(),
  };
  if (ok && revealedAnswer) verdict.revealedAnswer = revealedAnswer;
  return verdict;
}

/** بدء مؤقت الهجوم — الإظهار للمجموعات يبقى بقرار المشرف فقط */
export async function startAttackTimer(qRoom, seconds) {
  await update(dbRef(db, `qrooms/${qRoom}/game`), {
    timer: { deadline: Date.now() + seconds * 1000 },
    answerVerdict: null,
  });
}

/** بعد «صح» — يمنح المدافع 10 ثوانٍ لتفعيل الدرع (مرة واحدة) */
export async function beginShieldWindow(qRoom, { winnerGroupId, attack, revealedAnswer } = {}) {
  const patch = {
    timer: null,
    shieldWindow: { deadline: Date.now() + SHIELD_WINDOW_SEC * 1000 },
  };
  if (winnerGroupId) patch.shieldWindow.winnerGroupId = winnerGroupId;
  const verdict = buildAnswerVerdict(attack, true, { revealedAnswer });
  if (verdict) patch.answerVerdict = verdict;
  await update(dbRef(db, `qrooms/${qRoom}/game`), patch);
}

/** إنهاء نافذة الدرع وحسم الهجوم — يُستدعى تلقائياً عند انتهاء المدة */
export async function finalizeShieldWindowIfDue({
  qRoom,
  qGameState,
  qGList,
  qGroups,
  recordRoundCompleted,
}) {
  const sw = qGameState?.shieldWindow;
  if (!sw?.deadline || Date.now() < sw.deadline - 50) return;

  const still = await get(dbRef(db, `qrooms/${qRoom}/game/shieldWindow`));
  if (!still.exists()) return;

  const { qGroups: freshGroups, qGList: freshGList } = await fetchFreshGroupsData(qRoom);

  const claims = qGameState?.speedClaims || {};
  const claimIds = Object.keys(claims);
  const isSpeed = qGameState?.playMode === 'speed' && claimIds.length > 0;

  if (isSpeed) {
    const winId = sw.winnerGroupId || claimIds[0];
    if (!winId) return;
    await applySpeedRoundCorrect({
      qRoom,
      qGameState,
      qGroups: freshGroups,
      winnerGroupId: winId,
      Q_WEAPONS,
    });
  } else if (qGameState?.currentAttack) {
    await resolveAttackSuccess({
      qRoom,
      qCurrentAttack: qGameState.currentAttack,
      qGList: freshGList,
      qGroups: freshGroups,
      qGameState,
    });
  } else {
    await update(dbRef(db, `qrooms/${qRoom}/game`), { shieldWindow: null });
  }
}

/** حسم الهجوم — إجابة صحيحة */
export async function resolveAttackSuccess({ qRoom, qCurrentAttack, qGList, qGroups, qGameState }) {
  const atk = qCurrentAttack;
  const tg = qGList.find((g) => g.id === atk.targetId);
  const u = {};

  if (tg?.shield === atk.tree) {
    u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${atk.weapon}`] =
      (qGroups[atk.attackerId]?.weapons?.[atk.weapon] || 1) - 1;
    u[`qrooms/${qRoom}/groups/${atk.targetId}/shield`] = null;
    const logRef = push(dbRef(db, `qrooms/${qRoom}/attacks`));
    u[`qrooms/${qRoom}/attacks/${logRef.key}`] = { ...atk, result: 'shielded', hunted: 0, timestamp: Date.now() };
    u[`qrooms/${qRoom}/game/currentAttack`] = null;
    u[`qrooms/${qRoom}/game/timer`] = null;
    u[`qrooms/${qRoom}/game/currentQuestion`] = null;
    u[`qrooms/${qRoom}/game/lastResult`] = {
      ...atk,
      result: 'shielded',
      hunted: 0,
      msg: '🛡️ الدرع صد الهجوم',
      timestamp: Date.now(),
    };
    u[`qrooms/${qRoom}/game/showResult`] = true;
    u[`qrooms/${qRoom}/game/shieldWindow`] = null;
    u[`qrooms/${qRoom}/game/answerVerdict`] = null;
    await update(dbRef(db), u);
    return;
  }

  const treeCount = tg?.trees?.[atk.tree] || 0;
  const wp = Q_WEAPONS.find((w) => w.id === atk.weapon)?.power || 0;
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
  u[`qrooms/${qRoom}/game/currentAttack`] = null;
  u[`qrooms/${qRoom}/game/timer`] = null;
  u[`qrooms/${qRoom}/game/lastResult`] = {
    ...atk,
    result: 'success',
    hunted,
    msg: hunted > 0 ? `🎯 ${hunted} قميري` : '🌳 الشجرة فارغة',
    poisonMsg,
    poisonTarget: 'all',
    timestamp: ts,
  };
  u[`qrooms/${qRoom}/game/currentQuestion`] = null;
  u[`qrooms/${qRoom}/game/showResult`] = true;
  u[`qrooms/${qRoom}/game/shieldWindow`] = null;
  u[`qrooms/${qRoom}/game/answerVerdict`] = null;
  await update(dbRef(db), u);
}

/** إلغاء الهجوم الحالي دون حسم — للمشرف عند التعلّق أو الخطأ */
export async function cancelCurrentAttack(qRoom) {
  await update(dbRef(db, `qrooms/${qRoom}/game`), {
    currentAttack: null,
    timer: null,
    currentQuestion: null,
    answerVerdict: null,
    shieldWindow: null,
    speedBatchActive: false,
  });
}

/** حسم الهجوم — إجابة خاطئة */
export async function resolveAttackFail({ qRoom, qCurrentAttack, qGroups }) {
  const atk = qCurrentAttack;
  const u = {};
  const verdict = buildAnswerVerdict(atk, false);
  if (verdict) u[`qrooms/${qRoom}/game/answerVerdict`] = verdict;
  u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${atk.weapon}`] =
    (qGroups[atk.attackerId]?.weapons?.[atk.weapon] || 1) - 1;
  const logRef = push(dbRef(db, `qrooms/${qRoom}/attacks`));
  u[`qrooms/${qRoom}/attacks/${logRef.key}`] = { ...atk, result: 'fail', hunted: 0, timestamp: Date.now() };
  u[`qrooms/${qRoom}/game/currentAttack`] = null;
  u[`qrooms/${qRoom}/game/timer`] = null;
  u[`qrooms/${qRoom}/game/lastResult`] = {
    ...atk,
    result: 'fail',
    hunted: 0,
    msg: '❌ إجابة خاطئة',
    timestamp: Date.now(),
  };
  u[`qrooms/${qRoom}/game/currentQuestion`] = null;
  u[`qrooms/${qRoom}/game/showResult`] = true;
  await update(dbRef(db), u);
}

/** متابعة بعد كشف النتيجة — تدوير الدور */
export async function continueAfterReveal({ qRoom, qGameState, qGList, lrSnap, recordRoundCompleted }) {
  const patch = { lastResult: null, showResult: false, answerVerdict: null };
  const pm = qGameState?.playMode || 'sequential';
  const anchor = lrSnap?.attackerId || qGameState?.turnGroup;
  let roundCompleted = false;

  if (pm !== 'speed' && anchor && qGList.length) {
    const ids = qGList.map((g) => g.id);
    const ix = ids.indexOf(anchor);
    const nIx = (ix >= 0 ? ix + 1 : 0) % ids.length;
    patch.turnGroup = ids[nIx];
    if (ix >= 0 && nIx === 0 && ix === ids.length - 1) {
      patch.round = (qGameState.round || 1) + 1;
      roundCompleted = true;
    }
  }
  if (pm !== 'speed' && pm !== 'sequential') {
    patch.playMode = 'sequential';
  }

  await update(dbRef(db, `qrooms/${qRoom}/game`), patch);
  if (roundCompleted && qRoom && recordRoundCompleted) {
    recordRoundCompleted('fameeri', qRoom).catch(() => {});
  }
}
