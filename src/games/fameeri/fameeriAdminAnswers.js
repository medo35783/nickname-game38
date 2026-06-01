import { isAnswerCorrect, optionLabel } from '../../question-bank/questionSession';

function pickText(options, opt) {
  if (opt == null || opt === '') return '—';
  if (typeof opt === 'number' && options?.[opt] != null) return String(options[opt]);
  return String(opt);
}

function enrichGroupAnswer(g, { qKey, options, qActiveAnswer, qMList, qCurrentAttack, speedAnsweringGroupId, mustAnswer }) {
  const fa = g.finalAnswer?.q === qKey ? g.finalAnswer : null;
  const opt = fa?.opt;
  const letter = typeof opt === 'number' && opt >= 0 ? optionLabel(opt) : null;
  const optText = pickText(options, opt);
  const submitted = fa != null;
  const correct = submitted ? isAnswerCorrect(opt, options, qActiveAnswer) : null;
  const isAttacker = qCurrentAttack
    ? g.id === qCurrentAttack.attackerId
    : !!speedAnsweringGroupId && g.id === speedAnsweringGroupId;

  const memberPicks = (qMList || [])
    .filter((m) => m.groupId === g.id && m.answerPick?.q === qKey)
    .map((m) => ({
      name: m.name,
      role: m.role,
      letter: typeof m.answerPick.opt === 'number' ? optionLabel(m.answerPick.opt) : null,
      optText: pickText(options, m.answerPick.opt),
      correct: isAnswerCorrect(m.answerPick.opt, options, qActiveAnswer),
    }));

  return {
    id: g.id,
    name: g.name,
    isAttacker,
    isTarget: qCurrentAttack ? g.id === qCurrentAttack.targetId : false,
    mustAnswer,
    submitted,
    opt,
    letter,
    optText,
    by: fa?.by || null,
    correct,
    memberPicks,
  };
}

/**
 * يبني سياق إجابات المشرف — من يجب أن يجيب، ماذا اختار القائد، والحكم التلقائي.
 */
export function buildAdminAnswerContext({
  qKey,
  qActiveQuestion,
  qActiveAnswer,
  qGList,
  qMList,
  qCurrentAttack,
  isSpeed = false,
  speedAnsweringGroupId = null,
}) {
  if (!qKey || !qActiveQuestion) return null;

  /** تمثيل/أمثال — المشرف يحكم يدوياً دون انتظار اعتماد القائد */
  if (qActiveQuestion.adminOnly) {
    const groups = qGList.map((g) => ({
      id: g.id,
      name: g.name,
      isAttacker: qCurrentAttack ? g.id === qCurrentAttack.attackerId : false,
      isTarget: qCurrentAttack ? g.id === qCurrentAttack.targetId : false,
      mustAnswer: qCurrentAttack ? g.id === qCurrentAttack.attackerId : false,
      submitted: false,
      memberPicks: [],
    }));
    const attacker = groups.find((g) => g.isAttacker) || null;
    return {
      groups,
      answering: attacker ? [attacker] : [],
      attacker,
      primary: attacker,
      pendingNames: [],
      autoVerdict: null,
      manualOnly: true,
    };
  }

  const options = Array.isArray(qActiveQuestion.options) ? qActiveQuestion.options : [];

  const answeringIds = (() => {
    if (isSpeed) return qGList.map((g) => g.id);
    if (qCurrentAttack?.attackerId) return [qCurrentAttack.attackerId];
    return [];
  })();

  const groups = qGList.map((g) =>
    enrichGroupAnswer(g, {
      qKey,
      options,
      qActiveAnswer,
      qMList,
      qCurrentAttack,
      speedAnsweringGroupId,
      mustAnswer: answeringIds.includes(g.id),
    })
  );

  const answering = groups.filter((g) => g.mustAnswer);
  const attacker = groups.find((g) => g.isAttacker) || null;
  const primary = attacker || answering.find((g) => g.submitted) || answering[0] || null;

  return {
    groups,
    answering,
    attacker,
    primary,
    pendingNames: answering.filter((g) => !g.submitted).map((g) => g.name),
    autoVerdict: primary?.submitted ? primary.correct : null,
  };
}
