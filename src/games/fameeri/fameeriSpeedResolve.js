import { isAnswerCorrect, optionLabel } from '../../question-bank/questionSession';

const WEAPON_RANK = { showzel: 0, omsagma: 1, nabeeta: 2 };

/** سلاح أصعب بين الطلبات — لسحب السؤال قبل معرفة الفائز */
export function pickSpeedQuestionWeapon(claims = {}) {
  const ids = Object.keys(claims);
  if (!ids.length) return null;
  const weapons = ids.map((id) => claims[id]?.weapon).filter(Boolean);
  if (!weapons.length) return null;
  return weapons.sort((a, b) => (WEAPON_RANK[a] ?? 9) - (WEAPON_RANK[b] ?? 9))[0];
}

function enrichClaimant(group, claim, { qKey, options, correctAnswer }) {
  const fa = group?.finalAnswer?.q === qKey ? group.finalAnswer : null;
  const opt = fa?.opt;
  const submitted = fa != null;
  const submittedAt = fa?.submittedAt || 0;
  const letter = typeof opt === 'number' && opt >= 0 ? optionLabel(opt) : null;
  const optText =
    typeof opt === 'number' && options?.[opt] != null ? String(options[opt]) : opt != null ? String(opt) : '';
  const correct = submitted ? isAnswerCorrect(opt, options, correctAnswer) : null;

  return {
    groupId: group.id,
    name: group.name,
    claim,
    submitted,
    submittedAt,
    opt,
    letter,
    optText,
    correct,
    by: fa?.by || null,
  };
}

/**
 * حسم الفائز في السرعة:
 * - إجابة مختلفة → الصحيحة تفوز (بغض النظر عن الوقت)
 * - نفس الإجابة الصحيحة → الأسرع يفوز
 * - الجميع أخطأ → لا فائز (خطأ)
 */
export function resolveSpeedWinner({ claimIds = [], qGList = [], qKey, options = [], correctAnswer }) {
  const claimants = claimIds
    .map((gid) => {
      const g = qGList.find((x) => x.id === gid);
      if (!g) return null;
      return enrichClaimant(g, null, { qKey, options, correctAnswer });
    })
    .filter(Boolean);

  if (!claimIds.length || !qKey) {
    return {
      winnerId: null,
      reason: 'no_claims',
      reasonAr: 'لا توجد طلبات سرعة',
      claimants: [],
      autoVerdict: null,
      canJudgeOk: false,
      canJudgeFail: false,
      pendingNames: [],
    };
  }

  // إعادة البناء مع بيانات الطلب
  const withClaims = claimIds.map((gid) => {
    const g = qGList.find((x) => x.id === gid);
    const claim = null; // يُمرَّر من الخارج إن لزم
    return g ? enrichClaimant(g, claim, { qKey, options, correctAnswer }) : null;
  }).filter(Boolean);

  const pendingNames = withClaims.filter((c) => !c.submitted).map((c) => c.name);
  const submitted = withClaims.filter((c) => c.submitted);

  if (pendingNames.length > 0) {
    return {
      winnerId: null,
      reason: 'pending',
      reasonAr: `بانتظار اعتماد: ${pendingNames.join(' · ')}`,
      claimants: withClaims,
      autoVerdict: null,
      canJudgeOk: false,
      canJudgeFail: submitted.some((c) => c.correct === false),
      pendingNames,
    };
  }

  const correctOnes = submitted.filter((c) => c.correct);
  const wrongOnes = submitted.filter((c) => !c.correct);

  if (!correctOnes.length) {
    return {
      winnerId: null,
      reason: 'all_wrong',
      reasonAr: '❌ الجميع أخطأ — اضغط «خطأ»',
      claimants: withClaims,
      autoVerdict: false,
      canJudgeOk: false,
      canJudgeFail: true,
      pendingNames: [],
    };
  }

  if (correctOnes.length === 1) {
    const w = correctOnes[0];
    return {
      winnerId: w.groupId,
      reason: 'only_correct',
      reasonAr: `✅ ${w.name} الإجابة الصحيحة — اضغط «صح»`,
      claimants: withClaims,
      autoVerdict: true,
      canJudgeOk: true,
      canJudgeFail: false,
      pendingNames: [],
      winnerName: w.name,
    };
  }

  // أكثر من إجابة صحيحة — نادر؛ الأسرع يفوز
  const fastest = [...correctOnes].sort((a, b) => a.submittedAt - b.submittedAt)[0];
  const sameOpt = correctOnes.every((c) => c.opt === correctOnes[0].opt);

  if (wrongOnes.length > 0) {
    return {
      winnerId: fastest.groupId,
      reason: 'correct_beats_wrong',
      reasonAr: `✅ ${fastest.name} أصاب والباقي أخطأ — اضغط «صح»`,
      claimants: withClaims,
      autoVerdict: true,
      canJudgeOk: true,
      canJudgeFail: false,
      pendingNames: [],
      winnerName: fastest.name,
    };
  }

  if (sameOpt) {
    return {
      winnerId: fastest.groupId,
      reason: 'fastest_same_answer',
      reasonAr: `⚡ ${fastest.name} الأسرع بنفس الإجابة — اضغط «صح»`,
      claimants: withClaims,
      autoVerdict: true,
      canJudgeOk: true,
      canJudgeFail: false,
      pendingNames: [],
      winnerName: fastest.name,
    };
  }

  return {
    winnerId: fastest.groupId,
    reason: 'fastest_correct',
    reasonAr: `✅ ${fastest.name} الأسرع بإجابة صحيحة — اضغط «صح»`,
    claimants: withClaims,
    autoVerdict: true,
    canJudgeOk: true,
    canJudgeFail: false,
    pendingNames: [],
    winnerName: fastest.name,
  };
}

/** يبني صفوف العرض للمشرف مع بيانات الطلب */
export function buildSpeedAdminRows({ claimIds, qGList, speedClaims, qKey, options, correctAnswer }) {
  const resolution = resolveSpeedWinner({ claimIds, qGList, qKey, options, correctAnswer });
  const rows = claimIds.map((gid) => {
    const g = qGList.find((x) => x.id === gid);
    const claim = speedClaims?.[gid];
    const row = g ? enrichClaimant(g, claim, { qKey, options, correctAnswer }) : null;
    if (!row || !claim) return null;
    return { ...row, claim };
  }).filter(Boolean);

  return { ...resolution, rows };
}
