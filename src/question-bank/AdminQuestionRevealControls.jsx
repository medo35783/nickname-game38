import { isWrittenTextQuestion } from './questionSession';

/**
 * أزرار إظهار/إخفاء السؤال للمجموعات — متاحة في أي وقت (قبل أو بعد المؤقت).
 */
export default function AdminQuestionRevealControls({
  current,
  onToggleRevealQuestion,
  onToggleRevealOptions,
  onHideAll,
  compact = false,
}) {
  if (!current || current.adminOnly) return null;

  const hasOptions = Array.isArray(current.options) && current.options.length > 0;
  const writtenText = isWrittenTextQuestion(current) || !!current.writtenText;

  return (
    <div className={`admin-q-reveal-controls${compact ? ' admin-q-reveal-controls--compact' : ''}`}>
      {!compact && (
        <>
          <div className="admin-q-reveal-status" aria-live="polite">
            <span className={`admin-q-reveal-pill${current.revealToPlayers ? ' on' : ''}`}>
              {current.revealToPlayers ? '👁️ السؤال ظاهر' : '🔒 السؤال مخفي'}
            </span>
            {(hasOptions || writtenText) && (
              <span className={`admin-q-reveal-pill${current.revealOptions ? ' on' : ''}`}>
                {current.revealOptions
                  ? writtenText
                    ? '👁️ حقل الإجابة ظاهر'
                    : '👁️ الخيارات ظاهرة'
                  : writtenText
                    ? '🔒 حقل الإجابة مخفي'
                    : '🔒 الخيارات مخفية'}
              </span>
            )}
          </div>
          <p className="admin-q-reveal-hint">
            مخفي افتراضياً — اضغط <strong>«إظهار السؤال»</strong> و/أو <strong>«إظهار الخيارات»</strong> عندما تريد.
            المؤقت وحكم ✅/❌ متاحان دون إظهار أي شيء للمجموعات.
          </p>
        </>
      )}
      {compact && (
        <p className="admin-q-reveal-hint admin-q-reveal-hint--compact">
          {current.revealToPlayers || current.revealOptions
            ? 'المجموعات ترى ما فعّلته — يمكنك الإخفاء في أي وقت'
            : 'السؤال مخفي عن المجموعات — الإظهار اختياري؛ المؤقت والحكم متاحان دائماً'}
        </p>
      )}
      <div className="admin-q-reveal-btns">
        <button
          type="button"
          className={`btn ${current.revealToPlayers ? 'bg' : 'bgh'} bsm`}
          onClick={onToggleRevealQuestion}
        >
          {current.revealToPlayers ? '🙈 إخفاء السؤال' : '👁️ إظهار السؤال'}
        </button>
        {(hasOptions || writtenText) && (
          <button
            type="button"
            className={`btn ${current.revealOptions ? 'bg' : 'bgh'} bsm`}
            disabled={!current.revealToPlayers}
            onClick={onToggleRevealOptions}
          >
            {current.revealOptions
              ? writtenText
                ? '🙈 إخفاء حقل الإجابة'
                : '🙈 إخفاء الخيارات'
              : writtenText
                ? '✍️ إظهار حقل الإجابة'
                : '👁️ إظهار الخيارات'}
          </button>
        )}
        {(current.revealToPlayers || current.revealOptions) && typeof onHideAll === 'function' && (
          <button type="button" className="btn br bsm" onClick={onHideAll}>
            🚫 إخفاء الكل
          </button>
        )}
      </div>
    </div>
  );
}
