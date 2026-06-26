import { ARENA_SIGNUP_BENEFITS, ARENA_WELCOME_BONUS } from '../core/arena.constants';

/**
 * بطاقة تسويقية — تشجيع التسجيل الاختياري (شارة الساحة)
 *
 * @param {'full' | 'compact' | 'mini'} variant
 */
export default function ArenaSignupPrompt({
  variant = 'full',
  localQuestionCount = 0,
  pendingPoints = 0,
  onSignup,
  onDismiss,
  dismissLabel = 'تخطّ — العب كضيف',
  title = 'افتح شارة الساحة',
}) {
  const isMini = variant === 'mini';
  const isCompact = variant === 'compact';

  return (
    <div className={`arena-prompt arena-prompt--${variant}`}>
      <div className="arena-prompt__head">
        <span className="arena-prompt__emoji" aria-hidden>
          🏟️
        </span>
        <div>
          <div className="arena-prompt__title">{title}</div>
          {!isMini && (
            <div className="arena-prompt__sub">
              اختياري — سجّل في 30 ثانية واحصل على مزايا دائمة
            </div>
          )}
        </div>
      </div>

      {localQuestionCount > 0 && (
        <div className="arena-prompt__local-hint">
          📱 سجّلت <strong>{localQuestionCount}</strong> سؤالاً على هذا الجهاز — اربط بريدك وخذها
          معك لأي مكان ☁️
        </div>
      )}

      {pendingPoints > 0 && (
        <div className="arena-prompt__pending">
          ⭐ ربحت <strong>+{pendingPoints}</strong> نقطة ساحة — سجّل الآن لتثبتها
        </div>
      )}

      {!isMini && (
        <ul className="arena-prompt__benefits">
          {ARENA_SIGNUP_BENEFITS.map((b) => (
            <li key={b.text}>
              <span aria-hidden>{b.icon}</span>
              {b.text}
            </li>
          ))}
        </ul>
      )}

      {typeof onSignup === 'function' && (
        <button type="button" className="btn btn-bbrand arena-prompt__cta" onClick={onSignup}>
          {isMini ? '👤 سجّل دخول' : `سجّل الآن — +${ARENA_WELCOME_BONUS} 🎁`}
        </button>
      )}

      {typeof onDismiss === 'function' && !isMini && (
        <button type="button" className="arena-prompt__skip" onClick={onDismiss}>
          {dismissLabel}
        </button>
      )}
    </div>
  );
}
