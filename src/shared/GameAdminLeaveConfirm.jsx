/**
 * تأكيد خروج المشرف — خطوة ثانية بعد «خروج من الغرفة».
 */
export default function GameAdminLeaveConfirm({
  open,
  competitionStarted = true,
  onPauseOnly,
  onEndGame,
  onCancel,
}) {
  if (!open) return null;

  const endTitle = competitionStarted
    ? 'إنهاء المسابقة وإعلان الفائز'
    : 'إلغاء المسابقة';
  const endSub = competitionStarted
    ? 'ينتهي اللعب للجميع — المتسابقون يرون التقارير فقط'
    : 'لم تبدأ المسابقة بعد — إنهاء الغرفة دون إعلان فائز';
  const endIcon = competitionStarted ? '🏆' : '🚪';

  return (
    <div className="game-exit-overlay game-exit-overlay--admin" role="presentation" onClick={onCancel}>
      <div
        className="game-exit-sheet game-exit-sheet--admin game-admin-leave"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="game-admin-leave-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="game-exit-sheet__close" aria-label="إلغاء" onClick={onCancel}>
          ✕
        </button>

        <div className="game-exit-sheet__head">
          <span className="game-exit-sheet__emoji" aria-hidden>
            👑
          </span>
          <h2 id="game-admin-leave-title" className="game-exit-sheet__title">
            خروج المشرف
          </h2>
          <p className="game-exit-sheet__lead">
            اللاعبون <strong>يبقون في الغرفة</strong> — اختر أحد الخيارين:
          </p>
        </div>

        <div className="game-exit-sheet__choices">
          <button type="button" className="game-exit-card game-exit-card--pause" onClick={onPauseOnly}>
            <span className="game-exit-card__icon" aria-hidden>
              ⏸️
            </span>
            <span className="game-exit-card__body">
              <span className="game-exit-card__title">مغادرة الشاشة فقط</span>
              <span className="game-exit-card__sub">الغرفة تبقى مفتوحة — ترجع بضغطة «العودة للغرفة»</span>
            </span>
          </button>

          <button type="button" className="game-exit-card game-exit-card--end" onClick={onEndGame}>
            <span className="game-exit-card__icon" aria-hidden>
              {endIcon}
            </span>
            <span className="game-exit-card__body">
              <span className="game-exit-card__title">{endTitle}</span>
              <span className="game-exit-card__sub">{endSub}</span>
            </span>
          </button>
        </div>

        <button type="button" className="game-exit-sheet__back-btn" onClick={onCancel}>
          ↩ إلغاء — أتابع إدارة الغرفة
        </button>
      </div>
    </div>
  );
}
