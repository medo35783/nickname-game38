import { HESBAH_BRAND } from './HesbahHelpers';

/**
 * خيار الرجوع — UX واضح: أكمل أو انسحب (مشرف / متسابق).
 */
export default function HesbahExitSheet({
  open,
  role = 'player',
  roomCode,
  phase,
  onContinue,
  onWithdraw,
  onClose,
}) {
  if (!open) return null;

  const isAdmin = role === 'admin';
  const inFinal = phase === 'final';

  const continueCopy = isAdmin
    ? {
        icon: '👑',
        title: inFinal ? 'ابقَ في الاحتفال' : 'أكمل إدارة اللعبة',
        sub: inFinal
          ? 'تبقى على شاشة النتائج والمشاركة'
          : 'الغرفة مفتوحة واللاعبون ينتظرونك',
      }
    : {
        icon: '🎯',
        title: inFinal ? 'ابقَ في الاحتفال' : 'أكمل اللعب',
        sub: inFinal
          ? 'شاهد الترتيب وشارك النتائج'
          : 'ترجع للجولة — نقاطك ودرجاتك محفوظة',
      };

  const withdrawCopy = isAdmin
    ? {
        icon: '🏟️',
        title: 'انسحاب من الغرفة',
        sub: 'تغادر الشاشة — الغرفة تبقى للاعبين ويمكنك العودة لاحقاً',
      }
    : {
        icon: '🚪',
        title: 'انسحاب من اللعبة',
        sub: 'تخرج نهائياً — إذا عدت بنفس الاسم تبدأ من الصفر',
      };

  return (
    <div className="hesbah-exit-overlay" role="presentation" onClick={onClose}>
      <div
        className="hesbah-exit-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hesbah-exit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="hesbah-exit-sheet__close" aria-label="إغلاق" onClick={onClose}>
          ✕
        </button>

        <div className="hesbah-exit-sheet__head">
          <span className="hesbah-exit-sheet__emoji">{HESBAH_BRAND.emoji}</span>
          <h2 id="hesbah-exit-title" className="hesbah-exit-sheet__title">
            ماذا تريد أن تفعل؟
          </h2>
          {roomCode && (
            <span className="hesbah-exit-sheet__room">
              غرفة <strong>{roomCode}</strong>
            </span>
          )}
        </div>

        <div className="hesbah-exit-sheet__choices">
          <button
            type="button"
            className="hesbah-exit-choice hesbah-exit-choice--continue"
            onClick={onContinue}
          >
            <span className="hesbah-exit-choice__ring" aria-hidden />
            <span className="hesbah-exit-choice__icon">{continueCopy.icon}</span>
            <span className="hesbah-exit-choice__title">{continueCopy.title}</span>
            <span className="hesbah-exit-choice__sub">{continueCopy.sub}</span>
          </button>

          <button
            type="button"
            className="hesbah-exit-choice hesbah-exit-choice--leave"
            onClick={onWithdraw}
          >
            <span className="hesbah-exit-choice__ring" aria-hidden />
            <span className="hesbah-exit-choice__icon">{withdrawCopy.icon}</span>
            <span className="hesbah-exit-choice__title">{withdrawCopy.title}</span>
            <span className="hesbah-exit-choice__sub">{withdrawCopy.sub}</span>
          </button>
        </div>

        <button type="button" className="hesbah-exit-sheet__cancel btn bgh bsm" onClick={onClose}>
          ↩ إلغاء — البقاء حيث أنا
        </button>
      </div>
    </div>
  );
}

/** زر رجوع — بارز وواضح (لا يُخبّأ داخل بطاقات اللعب) */
export function HesbahExitTrigger({ onClick, label = 'رجوع', variant = 'default' }) {
  const className = [
    'hesbah-exit-trigger',
    variant === 'nav' ? 'hesbah-exit-trigger--nav' : '',
    variant === 'bar' ? 'hesbah-exit-trigger--bar' : '',
    variant === 'compact' ? 'hesbah-exit-trigger--compact' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type="button" className={className} onClick={onClick} aria-label={label}>
      <span className="hesbah-exit-trigger__icon" aria-hidden>
        ←
      </span>
      <span className="hesbah-exit-trigger__label">{label}</span>
    </button>
  );
}
