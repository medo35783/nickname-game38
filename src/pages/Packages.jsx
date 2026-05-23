import { SUPPORT_EMAIL } from '../core/constants';
import {
  SUBSCRIPTION_PACKAGES,
  SUBSCRIPTION_FEATURES,
  savingsPercent
} from '../core/subscriptionPackages';
import PackagePlanBadges, { badgesForPackage } from '../components/codes/PackagePlanBadges';

/**
 * @param {object} props
 * @param {(pkg: import('../core/subscriptionPackages').SubscriptionPackage) => void} [props.onSubscribe]
 */
export default function Packages({ onSubscribe }) {
  const handleSubscribe = (pkg) => {
    if (onSubscribe) {
      onSubscribe(pkg);
      return;
    }
    const subject = encodeURIComponent(`اشتراك ${pkg.durationLabel} — لعبة الألقاب`);
    const body = encodeURIComponent(
      `أرغب بالاشتراك في باقة ${pkg.durationLabel} (${pkg.price} ريال).\n\nالاسم:\nرقم الجوال:`
    );
    window.open(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  };

  const openCodes = () => {
    window.dispatchEvent(new CustomEvent('pfcc-open-code-activation'));
  };

  return (
    <div className="scr packages-scr">
      <div className="ptitle">💎 باقات الاشتراك</div>
      <p className="psub" style={{ marginBottom: 14 }}>
        اشترِ بالأيام — بدون التزام شهري. كل الباقات تشمل نفس المميزات.
      </p>

      <div className="pkg-launch-banner card ann ag">
        <div className="pkg-launch-icon">🎉</div>
        <div className="pkg-launch-title">أسعار إطلاق ترحيبية</div>
        <p className="pkg-launch-sub">
          تسعير تجريبي للمستخدمين الأوائل — لفترة محدودة وقد يُحدَّث لاحقاً دون إشعار مسبق.
        </p>
        <span className="tag tv pkg-launch-tag">عرض المؤسسين</span>
      </div>

      <div className="card2 pkg-features-block">
        {SUBSCRIPTION_FEATURES.map((line) => (
          <div key={line} className="pkg-feature-line">
            {line}
          </div>
        ))}
      </div>

      <div className="ctitle" style={{ marginBottom: 10, justifyContent: 'center' }}>
        اختر مدة الاشتراك
      </div>

      <div className="pkg-cards-col">
        {SUBSCRIPTION_PACKAGES.map((pkg) => {
          const save = savingsPercent(pkg.days, pkg.price);
          const perDay = (pkg.price / pkg.days).toFixed(1);

          return (
            <div
              key={pkg.id}
              className={`plan-card ${pkg.planClass} pkg-plan-card`}
              style={pkg.cardStyle}
            >
              <PackagePlanBadges badges={badgesForPackage(pkg)} />

              <div className="pkg-plan-head">
                <span className="pkg-plan-icon">{pkg.icon}</span>
                <div className="plan-name">{pkg.durationLabel}</div>
                <div className="pkg-days-pill">{pkg.days} {pkg.days === 1 ? 'يوم' : 'أيام'}</div>
                <div className="pkg-price-row">
                  <span className="pkg-price-num">{pkg.price}</span>
                  <span className="pkg-price-currency">ريال</span>
                </div>
                <div className="pkg-per-day">≈ {perDay} ريال / يوم</div>
                {save != null && save > 0 ? (
                  <div className="tag tv pkg-save-tag">وفر {save}% مقارنة باليومي</div>
                ) : (
                  <div className="tag tm pkg-save-tag">بداية ممتازة للتجربة</div>
                )}
              </div>

              <ul className="pkg-feat-list">
                {pkg.feats.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>

              <button type="button" className="btn bg" onClick={() => handleSubscribe(pkg)}>
                🛒 اشترك — {pkg.durationLabel}
              </button>
            </div>
          );
        })}
      </div>

      <div className="card pkg-trust-card">
        <div style={{ fontSize: 22, marginBottom: 6 }}>🔒</div>
        <div className="pkg-trust-title">دفع آمن وتفعيل فوري</div>
        <p className="psub" style={{ marginBottom: 0, fontSize: 12 }}>
          لا نخزّن بيانات بطاقتك. التفعيل يتم عبر كود اشتراك بعد إتمام الدفع.
        </p>
      </div>

      <div className="card2 pkg-code-hint" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
          لديك كود اشتراك؟
        </div>
        <button type="button" className="btn bo bsm" onClick={openCodes}>
          🔑 تفعيل الكود
        </button>
      </div>
    </div>
  );
}
