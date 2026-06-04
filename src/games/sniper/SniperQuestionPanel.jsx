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

export default function SniperQuestionPanel({
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
    'sniper-question-panel',
    isHost ? 'sniper-question-panel--host' : 'sniper-question-panel--player',
    masked ? 'sniper-question-panel--masked' : '',
    pending ? 'sniper-question-panel--pending' : '',
    blindPick ? 'sniper-question-panel--blind-pick' : '',
    showText && !isHost ? 'sniper-question-panel--visible' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const inner = (
    <div className="sniper-question-panel__main">
      <div className="sniper-question-panel__head">
        <span className="sniper-question-panel__label">
          <span className="sniper-question-panel__label-tag">❓ السؤال</span>
        </span>
        {isHost && <span className="sniper-question-panel__role-badge">للمشرف</span>}
        {!isHost && <span className="sniper-question-panel__role-badge sniper-question-panel__role-badge--player">للمتسابق</span>}
      </div>

      {status}

      {showText && !emptyHost && (
        <p className="sniper-question-panel__text">{questionText.trim()}</p>
      )}

      {emptyHost && (
        <p className="sniper-question-panel__text sniper-question-panel__text--empty">
          لا يوجد نص سؤال — تحقق من بنك الأسئلة أو اقرأ من ملاحظات المشرف
        </p>
      )}

      {masked && copy && (
        <div className="sniper-question-panel__masked" aria-hidden="true">
          <span className="sniper-question-panel__masked-icon">{copy.icon}</span>
          <p className="sniper-question-panel__masked-title">{copy.title}</p>
          <p className="sniper-question-panel__masked-hint">{copy.hint}</p>
          {copy.note && <p className="sniper-question-panel__masked-note">{copy.note}</p>}
        </div>
      )}

      {pending && pendingCopy && (
        <div className="sniper-question-panel__pending">
          <span className="sniper-question-panel__pending-icon">{pendingCopy.icon}</span>
          <p className="sniper-question-panel__pending-title">{pendingCopy.title}</p>
          <p className="sniper-question-panel__pending-hint">{pendingCopy.hint}</p>
          <p className="sniper-question-panel__pending-note">{pendingCopy.note}</p>
        </div>
      )}

      {isFinalBet && finalBetScore != null && (
        <p className="sniper-question-panel__final">🎲 رهان حاسم: {finalBetScore} نقطة للجميع</p>
      )}

      {isHost && hostOralHidden && (
        <p className="sniper-question-panel__host-note">🎙️ الأسئلة معك — لا نص على شاشة اللاعبين</p>
      )}
      {masked && oral && (
        <span className="sniper-question-panel__tag sniper-question-panel__tag--oral">مع المشرف</span>
      )}

      {isHost && supervisorNotes?.trim() && (
        <p className="sniper-question-panel__notes">{supervisorNotes.trim()}</p>
      )}
    </div>
  );

  return (
    <section className={panelClass}>
      {aside ? (
        <div className="sniper-question-panel__row">
          <div className="sniper-question-panel__aside">{aside}</div>
          {inner}
        </div>
      ) : (
        inner
      )}
    </section>
  );
}
