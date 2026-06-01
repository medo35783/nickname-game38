/**
 * كشف تحدي التمثيل/الأمثال — ليس سؤال جولة على الجوالات.
 * revealToPlayers = «التحدي بدأ» (شاشة العرض + تنبيه)، وليس إظهار السؤال للمتسابقين.
 */
export default function AdminActingRevealControls({
  current,
  onStartChallenge,
  onEndChallenge,
  compact = false,
}) {
  if (!current?.adminOnly) return null;

  const live = !!current.revealToPlayers;

  return (
    <div className={`admin-q-acting-reveal${compact ? ' admin-q-acting-reveal--compact' : ''}`}>
      <div className="admin-q-acting-reveal__warn">
        ⚠️ <strong>تحدي تمثيل / مثل</strong> — ليس سؤال جولة على الجوالات. اقرأ التحدي شفهياً للمجموعة.
      </div>
      <p className="admin-q-acting-reveal__hint">
        {live
          ? 'التحدي جاري — انتظر أن يختار القائد شخصاً ويمثل، ثم شغّل المؤقت.'
          : 'اضغط «بدء التحدي» بعد قراءة التعليمات للمجموعة المهاجمة.'}
      </p>
      <p className="admin-q-acting-reveal__hint admin-q-acting-reveal__hint--sub">
        عند ✅ صح تظهر الإجابة (المثل) على شاشة العرض للجميع.
      </p>
      <div className="admin-q-reveal-btns">
        {!live ? (
          <button type="button" className="btn bg bsm" onClick={onStartChallenge}>
            🎭 بدء التحدي — اقرأ للمجموعة
          </button>
        ) : (
          <button type="button" className="btn bgh bsm" onClick={onEndChallenge}>
            ⏸️ إيقاف التحدي
          </button>
        )}
        {live && (
          <span className="admin-q-reveal-pill on">🎭 التحدي نشط</span>
        )}
      </div>
    </div>
  );
}
