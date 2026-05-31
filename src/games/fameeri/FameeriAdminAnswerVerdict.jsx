import { getCorrectOptionIndex, optionLabel } from '../../question-bank/questionSession';

/**
 * لوحة حكم تلقائي — يظهر للمشرف اختيار القائد والحكم (صح/خطأ) دون اكتشاف يدوي.
 */
export default function FameeriAdminAnswerVerdict({
  answerCtx,
  qActiveAnswer,
  qActiveQuestion,
  accent = 'var(--fameeri-primary)',
}) {
  if (!answerCtx?.answering?.length) return null;

  const options = qActiveQuestion?.options || [];
  const correctIdx = getCorrectOptionIndex(options, qActiveAnswer);
  const correctLetter = correctIdx >= 0 ? optionLabel(correctIdx) : null;

  const { answering, primary, pendingNames } = answerCtx;

  return (
    <div className="fameeri-cmd-auto card" style={{ borderColor: accent }}>
      <div className="fameeri-cmd-auto__head">⚖️ حكم الإجابة — للمشرف</div>

      {answering.map((g) => {
        const isPrimary = primary?.id === g.id;
        if (!g.mustAnswer) return null;

        if (!g.submitted) {
          return (
            <div key={g.id} className="fameeri-cmd-auto__row wait">
              <div className="fameeri-cmd-auto__team">
                {g.isAttacker ? '⚔️ ' : ''}
                {g.name}
                {g.isAttacker && <span className="fameeri-cmd-auto__role">المهاجِم</span>}
              </div>
              <div className="fameeri-cmd-auto__status">⏳ بانتظار اعتماد القائد</div>
              {g.memberPicks.length > 0 && (
                <div className="fameeri-cmd-auto__picks">
                  <span className="fameeri-cmd-auto__picks-label">اقتراحات الأعضاء:</span>
                  {g.memberPicks.map((p, i) => (
                    <span key={i} className={`fameeri-cmd-auto__pick-chip${p.correct ? ' ok' : ' miss'}`}>
                      {p.role === 'leader' ? '👑 ' : ''}
                      {p.name}: {p.letter ? `${p.letter} ` : ''}
                      {p.optText}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        }

        const ok = g.correct;
        return (
          <div
            key={g.id}
            className={`fameeri-cmd-auto__row${ok ? ' ok' : ' miss'}${isPrimary ? ' primary' : ''}`}
          >
            <div className={`fameeri-cmd-auto__verdict-badge${ok ? ' ok' : ' miss'}`}>
              {ok ? '✅ إجابة صحيحة' : '❌ إجابة خاطئة'}
            </div>
            <div className="fameeri-cmd-auto__team">
              {g.isAttacker ? '⚔️ ' : ''}
              {g.name}
              {g.isAttacker && <span className="fameeri-cmd-auto__role">المهاجِم</span>}
            </div>
            <div className="fameeri-cmd-auto__leader-pick">
              <span className="fameeri-cmd-auto__leader-label">👑 القائد {g.by ? g.by : ''} اعتمد:</span>
              <span className="fameeri-cmd-auto__leader-value">
                {g.letter && <span className="fameeri-cmd-auto__letter">{g.letter}</span>}
                {g.optText}
              </span>
            </div>
            {g.memberPicks.length > 1 && (
              <div className="fameeri-cmd-auto__picks">
                <span className="fameeri-cmd-auto__picks-label">اقتراحات قبل الاعتماد:</span>
                {g.memberPicks.map((p, i) => (
                  <span key={i} className={`fameeri-cmd-auto__pick-chip${p.correct ? ' ok' : ' miss'}`}>
                    {p.name}: {p.letter ? `${p.letter} ` : ''}
                    {p.optText}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {qActiveAnswer && (
        <div className="fameeri-cmd-auto__correct-key">
          <span>🔑 الإجابة المعتمدة:</span>
          {correctLetter && <span className="fameeri-cmd-auto__letter">{correctLetter}</span>}
          <strong>{qActiveAnswer}</strong>
        </div>
      )}

      {answerCtx.autoVerdict != null && (
        <div className={`fameeri-cmd-auto__hint${answerCtx.autoVerdict ? ' ok' : ' miss'}`}>
          {answerCtx.autoVerdict
            ? '→ اضغط ✅ صح بالأسفل لتأكيد نجاح الهجوم'
            : '→ اضغط ❌ خطأ بالأسفل لتأكيد فشل الهجوم'}
        </div>
      )}

      {pendingNames.length > 0 && answerCtx.autoVerdict == null && (
        <div className="fameeri-cmd-auto__hint wait">
          ⏳ لم يعتمد القائد بعد — {pendingNames.join(' · ')}
        </div>
      )}
    </div>
  );
}
