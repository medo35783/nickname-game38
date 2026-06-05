/** بطاقة السؤال — نفس الإطار للمشرف والمتسابق */
function maskedPlayerCopy({ blind, oral, reason }) {
  if (blind) {
    return {
      icon: '🙈',
      title: 'جولة عميان',
      hint: 'يظهر التصنيف فقط — استمع للمشرف واختر درجتك',
      note: 'محتوى السؤال مخفي عن شاشتك',
    };
  }
  if (oral) {
    return {
      icon: '🎙️',
      title: 'الأسئلة مع المشرف',
      hint: 'اخترت «الأسئلة معي فقط» — استمع للمشرف ثم أجب',
      note: 'لا يُعرض نص السؤال على شاشتك',
    };
  }
  if (reason === 'empty') {
    return {
      icon: '📋',
      title: 'بانتظار السؤال',
      hint: 'لا يوجد نص للعرض — استمع للمشرف',
      note: null,
    };
  }
  return {
    icon: '🔒',
    title: 'سؤال للمشرف',
    hint: 'استمع للتعليمات ثم اكتب إجابتك',
    note: 'محتوى السؤال مخفي عن شاشتك',
  };
}

function pendingPlayerCopy(blindPick) {
  if (blindPick) {
    return {
      icon: '🙈',
      title: 'جولة عميان',
      hint: 'اختر درجتك الآن — ينكشف السؤال عند بدء المؤقت',
      note: null,
    };
  }
  return {
    icon: '⏳',
    title: 'السؤال جاهز',
    hint: 'يظهر نص السؤال هنا عند بدء المؤقت',
    note: null,
  };
}

export default function HesbahQuestionPanel({
  role = 'host',
  questionText = '',
  playerMode,
  maskReason,
  blind = false,
  oral = false,
  hostOralHidden = false,
  status,
  aside,
  isFinalBet,
  finalBetScore,
  supervisorNotes,
}) {
  const isHost = role === 'host';
  const mode = isHost ? 'host' : playerMode || 'visible';
  const masked = mode === 'masked';
  const pending = mode === 'pending' || mode === 'blind-pick';
  const blindPick = mode === 'blind-pick';
  const showText = isHost ? !!questionText?.trim() : mode === 'visible' && !!questionText?.trim();
  const copy = masked ? maskedPlayerCopy({ blind, oral, reason: maskReason }) : null;
  const pendingCopy = pending ? pendingPlayerCopy(blindPick) : null;
  const emptyHost = isHost && !questionText?.trim();

  const panelClass = [
    'hesbah-question-panel',
    isHost ? 'hesbah-question-panel--host' : 'hesbah-question-panel--player',
    masked ? 'hesbah-question-panel--masked' : '',
    pending ? 'hesbah-question-panel--pending' : '',
    blindPick ? 'hesbah-question-panel--blind-pick' : '',
    showText && !isHost ? 'hesbah-question-panel--visible' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <div className="hesbah-question-panel__main">
      <div className="hesbah-question-panel__head">
        <span className="hesbah-question-panel__label">
          <span className="hesbah-question-panel__label-tag">❓ السؤال</span>
        </span>
        {isHost && <span className="hesbah-question-panel__role-badge">للمشرف</span>}
        {!isHost && <span className="hesbah-question-panel__role-badge hesbah-question-panel__role-badge--player">للمتسابق</span>}
      </div>

      {status}

      {showText && !emptyHost && (
        <p className="hesbah-question-panel__text">{questionText.trim()}</p>
      )}

      {emptyHost && (
        <p className="hesbah-question-panel__text hesbah-question-panel__text--empty">
          لا يوجد نص سؤال — تحقق من بنك الأسئلة أو اقرأ من ملاحظات المشرف
        </p>
      )}

      {masked && copy && (
        <div className="hesbah-question-panel__masked" aria-hidden="true">
          <span className="hesbah-question-panel__masked-icon">{copy.icon}</span>
          <p className="hesbah-question-panel__masked-title">{copy.title}</p>
          <p className="hesbah-question-panel__masked-hint">{copy.hint}</p>
          {copy.note && <p className="hesbah-question-panel__masked-note">{copy.note}</p>}
        </div>
      )}

      {pending && pendingCopy && (
        <div className="hesbah-question-panel__pending">
          <span className="hesbah-question-panel__pending-icon">{pendingCopy.icon}</span>
          <p className="hesbah-question-panel__pending-title">{pendingCopy.title}</p>
          <p className="hesbah-question-panel__pending-hint">{pendingCopy.hint}</p>
          <p className="hesbah-question-panel__pending-note">{pendingCopy.note}</p>
        </div>
      )}

      {isFinalBet && finalBetScore != null && (
        <p className="hesbah-question-panel__final">🎲 رهان حاسم: {finalBetScore} نقطة للجميع</p>
      )}

      {isHost && hostOralHidden && (
        <p className="hesbah-question-panel__host-note">🎙️ الأسئلة معك — لا نص على شاشة اللاعبين</p>
      )}
      {masked && oral && (
        <span className="hesbah-question-panel__tag hesbah-question-panel__tag--oral">مع المشرف</span>
      )}

      {isHost && supervisorNotes?.trim() && (
        <p className="hesbah-question-panel__notes">{supervisorNotes.trim()}</p>
      )}
    </div>
  );

  return (
    <section className={panelClass}>
      {aside ? (
        <div className="hesbah-question-panel__row">
          <div className="hesbah-question-panel__aside">{aside}</div>
          {inner}
        </div>
      ) : (
        inner
      )}
    </section>
  );
}
