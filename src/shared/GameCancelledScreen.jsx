/**
 * شاشة إلغاء المسابقة — عند الإنهاء قبل بدء اللعب (بدون فائز).
 */
export default function GameCancelledScreen({
  gameLabel = 'المسابقة',
  roomCode,
  onHome,
  hint,
}) {
  return (
    <div className="scr game-cancelled-screen">
      <div className="game-cancelled-screen__hero">
        <div className="game-cancelled-screen__icon" aria-hidden>
          🚪
        </div>
        <h1 className="game-cancelled-screen__title">تم إلغاء {gameLabel}</h1>
        <p className="game-cancelled-screen__lead">
          أُغلقت الغرفة — <strong>لا يوجد فائز</strong>
        </p>
        {roomCode && (
          <span className="game-cancelled-screen__room">
            رمز الغرفة <strong>{roomCode}</strong>
          </span>
        )}
        {hint && <p className="game-cancelled-screen__hint">{hint}</p>}
      </div>

      {typeof onHome === 'function' && (
        <button type="button" className="btn bgh game-cancelled-screen__home" onClick={onHome}>
          🏟️ العودة لساحة الألعاب
        </button>
      )}
    </div>
  );
}
