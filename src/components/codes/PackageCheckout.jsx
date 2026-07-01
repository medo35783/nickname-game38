import { getEffectivePrice } from '../../core/subscriptionPackages';
import { SUBSCRIPTION_FEATURES } from '../../core/subscriptionPackages';

/**
 * شاشة دفع مركّزة — ملخص الباقة + نموذج Moyasar
 */
export default function PackageCheckout({
  plan,
  formRef,
  loadingPay,
  payError,
  onBack,
}) {
  const price = getEffectivePrice(plan);

  return (
    <section className="pkg-checkout" aria-label={`الدفع — ${plan.name}`}>
      <button type="button" className="pkg-checkout__back btn bo bsm" onClick={onBack}>
        ← رجوع لاختيار باقة
      </button>

      <div className={`pkg-checkout__summary ${plan.planClass}`}>
        <div className="pkg-checkout__summary-head">
          <span className="pkg-checkout__icon" aria-hidden="true">{plan.icon}</span>
          <div>
            <h2 className="pkg-checkout__name">{plan.name}</h2>
            <p className="pkg-checkout__duration">{plan.durationSub}</p>
          </div>
          <div className="pkg-checkout__price">
            <span className="pkg-checkout__price-num">{price}</span>
            <span className="pkg-checkout__price-unit">ر.س</span>
          </div>
        </div>
        <ul className="pkg-checkout__features">
          {SUBSCRIPTION_FEATURES.slice(0, 3).map((line) => (
            <li key={line}>{line.replace(/^✅\s*/, '')}</li>
          ))}
        </ul>
      </div>

      <div className="pkg-checkout__pay">
        <h3 className="pkg-checkout__pay-title">أدخل بيانات البطاقة</h3>
        {loadingPay ? <p className="pkg-moyasar-loading">جاري تحميل نموذج الدفع...</p> : null}
        <div ref={formRef} className="pkg-moyasar-form" />
        {payError ? <p className="pkg-moyasar-error" role="alert">{payError}</p> : null}
      </div>
    </section>
  );
}
