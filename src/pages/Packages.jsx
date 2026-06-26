import { SUPPORT_EMAIL, PLATFORM_NAME } from '../core/constants';
import GameTopNav from '../shared/GameTopNav';
import { SUBSCRIPTION_PACKAGES, SUBSCRIPTION_FEATURES, getEffectivePrice } from '../core/subscriptionPackages';
import PackagePlanCard from '../components/codes/PackagePlanCard';
import PackagesLegalNotice from '../components/codes/PackagesLegalNotice';

/**
 * @param {object} props
 * @param {(pkg: import('../core/subscriptionPackages').SubscriptionPackage) => void} [props.onSubscribe]
 * @param {() => void} [props.onBack]
 */
export default function Packages({ onSubscribe, onBack }) {
  const handleSubscribe = (pkg) => {
    if (onSubscribe) {
      onSubscribe(pkg);
      return;
    }
    const subject = encodeURIComponent(`اشتراك ${pkg.name} — ${PLATFORM_NAME}`);
    const price = getEffectivePrice(pkg);
    const body = encodeURIComponent(
      `أرغب بالاشتراك في باقة ${pkg.name} (${pkg.durationSub}) (${price} ريال).\n\nالاسم:\nرقم الجوال:`
    );
    window.open(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  };

  const openCodes = () => {
    window.dispatchEvent(new CustomEvent('pfcc-open-code-activation'));
  };

  return (
    <div className="scr packages-scr">
      {onBack ? <GameTopNav onBack={onBack} variant="arena" /> : null}

      <header className="pkg-hero">
        <p className="pkg-hero__eyebrow">وصول كامل للمنصة</p>
        <h1 className="pkg-hero__title">باقات الاشتراك</h1>
        <p className="pkg-hero__sub">
          اشترِ بالأيام — بدون التزام. المزايا واحدة؛ اختر المدة التي تناسبك.
        </p>
      </header>

      <div className="pkg-includes">
        {SUBSCRIPTION_FEATURES.map((line) => (
          <span key={line} className="pkg-include-chip">
            {line.replace(/^✅\s*/, '')}
          </span>
        ))}
      </div>

      <div className="pkg-offer-banner" role="note">
        <div className="pkg-offer-banner__glow" aria-hidden="true" />
        <div className="pkg-offer-banner__main">
          <span className="pkg-offer-banner__badge">عرض محدود</span>
          <h2 className="pkg-offer-banner__title">عروض إطلاق ترحيبية</h2>
          <p className="pkg-offer-banner__sub">
            أسعار خاصة للمستخدمين الأوائل — قد تتغيّر أو تنتهي في أي وقت دون إشعار مسبق.
          </p>
        </div>
        <span className="pkg-offer-banner__pct" aria-hidden="true">
          -40%
        </span>
      </div>

      <p className="pkg-tiers-label">اختر مدة الاشتراك</p>

      <div className="pkg-tiers">
        {SUBSCRIPTION_PACKAGES.map((pkg) => (
          <PackagePlanCard key={pkg.id} pkg={pkg} onSubscribe={handleSubscribe} />
        ))}
      </div>

      <PackagesLegalNotice />

      <footer className="pkg-footer">
        <div className="pkg-trust">
          <span className="pkg-trust__icon" aria-hidden="true">
            🔒
          </span>
          <div>
            <div className="pkg-trust__title">دفع آمن وتفعيل فوري</div>
            <p className="pkg-trust__sub">
              لا نخزّن بيانات بطاقتك. التفعيل فوري بكود الاشتراك بعد إتمام الدفع.
            </p>
          </div>
        </div>

        <div className="pkg-code-row">
          <span className="pkg-code-row__text">لديك كود اشتراك؟</span>
          <button type="button" className="btn bo bsm" onClick={openCodes}>
            🔑 تفعيل الكود
          </button>
        </div>
      </footer>
    </div>
  );
}
