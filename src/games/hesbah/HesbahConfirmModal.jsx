/** نافذة تأكيد بسيطة — للمشرف */
export default function HesbahConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div className="hesbah-modal-overlay" role="presentation" onClick={onCancel}>
      <div
        className="hesbah-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hesbah-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="hesbah-modal__icon">{danger ? '⚠️' : '❓'}</div>
        <h2 id="hesbah-modal-title" className="hesbah-modal__title">
          {title}
        </h2>
        <p className="hesbah-modal__msg">{message}</p>
        <div className="hesbah-modal__actions">
          <button type="button" className="btn bgh" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${danger ? 'br' : 'bg'}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
