function formatArabicDate(ts) {
  return new Intl.DateTimeFormat('ar-SA', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(ts));
}

/**
 * شاشة نجاح الدفع — كود + أزرار اللعب والتسجيل
 */
export default function PackagePaySuccess({
  code,
  expiresAt,
  onPlay,
  onGoAccount,
  isGuest,
  onCopy,
}) {
  return (
    <div className="scr packages-scr">
      <div className="pkg-pay-success">
        <p className="pkg-pay-success__icon" aria-hidden="true">✅</p>
        <h2 className="pkg-pay-success__title">تم الاشتراك بنجاح!</h2>
        <p className="pkg-pay-success__label">كودك — انقر للنسخ</p>
        <button type="button" className="pkg-pay-success__code" onClick={onCopy}>
          {code}
        </button>
        <p className="pkg-pay-success__exp">صالح حتى: {formatArabicDate(expiresAt)}</p>
        <p className="pkg-pay-success__hint">
          {isGuest
            ? 'اشتراكك مفعّل على هذا الجهاز — سجّل حساباً لحفظه على أجهزة أخرى'
            : 'تم حفظ اشتراكك في حسابك — يمكنك مراجعته من «حسابي»'}
        </p>
        <button type="button" className="btn bg pkg-pay-success__cta" onClick={onPlay}>
          ابدأ اللعب الآن
        </button>
        {isGuest && onGoAccount ? (
          <button type="button" className="btn bo pkg-pay-success__secondary" onClick={onGoAccount}>
            احفظ اشتراكك — سجّل مجاناً
          </button>
        ) : null}
      </div>
    </div>
  );
}
