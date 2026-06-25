import {
  getEffectivePrice,
  hasActivePromo,
  promoDiscountPercent,
  savingsPercent,
} from '../../core/subscriptionPackages';
import PackagePlanBadges, { badgesForPackage } from './PackagePlanBadges';
import PackageLegalConsent from './PackageLegalConsent';

/**
 * @param {object} props
 * @param {import('../../core/subscriptionPackages').SubscriptionPackage} props.pkg
 * @param {(pkg: import('../../core/subscriptionPackages').SubscriptionPackage) => void} props.onSubscribe
 * @param {string} [props.ctaLabel]
 */
export default function PackagePlanCard({ pkg, onSubscribe, ctaLabel }) {
  const promo = hasActivePromo(pkg);
  const effective = getEffectivePrice(pkg);
  const save = savingsPercent(pkg.days, effective);
  const perDay = (effective / pkg.days).toFixed(1);
  const promoPct = promoDiscountPercent(pkg);
  const displayName = pkg.name ?? pkg.durationLabel;
  const durationSub = pkg.durationSub ?? '';

  return (
    <article
      className={`pkg-tier plan-card ${pkg.planClass}${pkg.best ? ' pkg-tier--featured' : ''}${pkg.popular ? ' pkg-tier--popular' : ''}`}
      style={pkg.cardStyle}
    >
      <PackagePlanBadges badges={badgesForPackage(pkg)} />

      <div className="pkg-tier__body">
        <div className="pkg-tier__head">
          <span className="pkg-tier__icon" aria-hidden="true">
            {pkg.icon}
          </span>
          <div className="pkg-tier__titles">
            <h3 className="pkg-tier__name">{displayName}</h3>
            {durationSub ? <span className="pkg-tier__days">{durationSub}</span> : null}
          </div>
        </div>

        <div className="pkg-tier__price-row">
          {promo && (
            <>
              <span className="pkg-tier__price-old">{pkg.price}</span>
              {promoPct != null && <span className="pkg-tier__promo-pct">-{promoPct}%</span>}
            </>
          )}
          <span className="pkg-tier__price-num">{effective}</span>
          <span className="pkg-tier__price-unit">ر.س</span>
        </div>

        {promo && <p className="pkg-tier__promo-note">عرض مؤقت</p>}

        <div className="pkg-tier__meta">
          <span className="pkg-tier__perday">≈ {perDay} ر.س / يوم</span>
          {save != null && save > 0 ? (
            <span className="pkg-tier__save">وفر {save}%</span>
          ) : null}
        </div>

        {pkg.titlesHighlight ? (
          <p className="pkg-tier__titles-hl">
            <span className="pkg-tier__titles-hl-icon" aria-hidden="true">
              🎭
            </span>
            {pkg.titlesHighlight}
          </p>
        ) : null}
      </div>

      <button type="button" className="btn bg pkg-tier__cta" onClick={() => onSubscribe(pkg)}>
        {ctaLabel ?? `اشترك — ${effective} ر.س`}
      </button>

      <PackageLegalConsent />
    </article>
  );
}
