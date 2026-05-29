import {
  QB_CATEGORY_LABELS,
  QB_TYPE_LABELS,
  getCorrectOptionIndex,
  isAnswerCorrect,
  optionLabel,
} from './questionSession';

/**
 * بطاقة السؤال عند المشرف أثناء اللعب — مكوّن مشترك.
 * تعرض السؤال والإجابة الصحيحة (للمشرف فقط) مع مفاتيح إظهار للمتسابقين وزر سحب سؤال آخر.
 */
export default function AdminQuestionView({
  current,
  answer,
  onToggleRevealQuestion,
  onToggleRevealOptions,
  onDrawNext,
  groupAnswers = [],
  pendingGroups = [],
  accent = 'var(--gold)',
}) {
  if (!current) return null;

  const adminOnly = current.adminOnly;
  const hasOptions = Array.isArray(current.options) && current.options.length > 0;
  const correctIdx = hasOptions ? getCorrectOptionIndex(current.options, answer) : -1;
  const optText = (i) =>
    hasOptions && i != null && current.options[i] != null ? current.options[i] : '—';

  const answeredCount = groupAnswers.length;
  const matchCount = groupAnswers.filter((ga) =>
    isAnswerCorrect(ga.opt, current.options, answer)
  ).length;

  return (
    <div className="admin-q-card card" style={{ borderColor: accent }}>
      <div className="admin-q-card__head">
        <div className="ctitle" style={{ margin: 0 }}>
          ❓ السؤال الحالي
        </div>
        <div className="admin-q-card__tags">
          <span className="admin-q-tag">{QB_CATEGORY_LABELS[current.category] || current.category || '—'}</span>
          <span className="admin-q-tag">{QB_TYPE_LABELS[current.type] || current.type}</span>
        </div>
      </div>

      <p className="admin-q-card__text">{current.text || '—'}</p>

      {hasOptions && (
        <div className="admin-q-options" role="list" aria-label="خيارات السؤال">
          {current.options.map((opt, i) => {
            const isCorrect = i === correctIdx;
            return (
              <div
                key={i}
                role="listitem"
                className={`admin-q-option${isCorrect ? ' admin-q-option--correct' : ''}`}
              >
                <span className="admin-q-option__letter" aria-hidden>
                  {optionLabel(i)}
                </span>
                <span className="admin-q-option__text">{opt}</span>
                {isCorrect && <span className="admin-q-option__badge">✓ الصحيحة</span>}
              </div>
            );
          })}
        </div>
      )}

      <div className="admin-q-answer-key" aria-label="الإجابة الصحيحة للمشرف">
        <div className="admin-q-answer-key__label">🔑 الإجابة الصحيحة — للمشرف فقط</div>
        <div className="admin-q-answer-key__value">
          {correctIdx >= 0 && (
            <span className="admin-q-answer-key__letter">{optionLabel(correctIdx)}</span>
          )}
          <span>{answer || '—'}</span>
        </div>
        {hasOptions && correctIdx < 0 && answer && (
          <div className="admin-q-answer-key__warn">⚠️ لم يُطابق نص الإجابة أي خيار — راجع المخزون</div>
        )}
      </div>

      {(answeredCount > 0 || pendingGroups.length > 0) && (
        <div className="admin-q-groups">
          <div className="admin-q-groups__head">
            <span className="admin-q-groups__title">📝 إجابات المجموعات</span>
            {answeredCount > 0 && (
              <span className="admin-q-groups__stats">
                {matchCount}/{answeredCount} صحيحة
              </span>
            )}
          </div>

          {groupAnswers.map((ga) => {
            const txt = optText(ga.opt);
            const correct = isAnswerCorrect(ga.opt, current.options, answer);
            const letter =
              typeof ga.opt === 'number' && ga.opt >= 0 ? optionLabel(ga.opt) : null;
            return (
              <div
                key={ga.id}
                className={`admin-q-group-row${correct ? ' admin-q-group-row--match' : ' admin-q-group-row--miss'}`}
              >
                <div className="admin-q-group-row__main">
                  <span className="admin-q-group-row__name">{ga.name}</span>
                  {ga.by && <span className="admin-q-group-row__by">👑 {ga.by}</span>}
                </div>
                <div className="admin-q-group-row__answer">
                  {letter && <span className="admin-q-group-row__letter">{letter}</span>}
                  <span className="admin-q-group-row__text">{txt}</span>
                  <span className="admin-q-group-row__verdict" aria-label={correct ? 'صحيحة' : 'خاطئة'}>
                    {correct ? '✓' : '✗'}
                  </span>
                </div>
              </div>
            );
          })}

          {pendingGroups.length > 0 && (
            <div className="admin-q-pending">
              <span className="admin-q-pending__label">⏳ بانتظار اعتماد:</span>
              <span className="admin-q-pending__names">{pendingGroups.join(' · ')}</span>
            </div>
          )}

          <p className="admin-q-groups__hint">القرار النهائي لك — اضغط ✅ صح أو ❌ خطأ أسفل شاشة الهجوم</p>
        </div>
      )}

      {adminOnly ? (
        <div className="admin-q-admin-only">
          🎭 سؤال للمشرف فقط — لا يظهر للمتسابقين. أعطه لعضو من المجموعة ليمثّله لزملائه.
        </div>
      ) : (
        <div className="admin-q-reveal-btns">
          <button
            type="button"
            className={`btn ${current.revealToPlayers ? 'bg' : 'bgh'} bsm`}
            onClick={onToggleRevealQuestion}
          >
            {current.revealToPlayers ? '🙈 إخفاء السؤال' : '👁️ إظهار السؤال'}
          </button>
          {hasOptions && current.revealToPlayers && (
            <button
              type="button"
              className={`btn ${current.revealOptions ? 'bg' : 'bgh'} bsm`}
              onClick={onToggleRevealOptions}
            >
              {current.revealOptions ? '🙈 إخفاء الخيارات' : '👁️ إظهار الخيارات'}
            </button>
          )}
        </div>
      )}

      {onDrawNext && (
        <button type="button" className="btn bgh bxs admin-q-draw" onClick={onDrawNext}>
          ↻ سؤال آخر
        </button>
      )}
    </div>
  );
}
