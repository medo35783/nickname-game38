/**
 * شارات الباقة — زاوية أو جانبية (نص طويل) أو مزدوجة (أفضل + أوفر)
 *
 * @param {{ badges: { text: string; tone: 'gold' | 'best' | 'side' }[] }} props
 */
export default function PackagePlanBadges({ badges }) {
  if (!badges?.length) return null;

  return (
    <div className={`pkg-badges-wrap${badges.length > 1 ? ' pkg-badges-multi' : ''}`}>
      {badges.map((b) => (
        <span
          key={b.text}
          className={`plan-badge badge pkg-plan-badge pkg-plan-badge--${b.tone}`}
        >
          {b.text}
        </span>
      ))}
    </div>
  );
}

/** @param {import('../../core/subscriptionPackages').SubscriptionPackage} pkg */
export function badgesForPackage(pkg) {
  if (Array.isArray(pkg.badges) && pkg.badges.length > 0) {
    return pkg.badges.map((text) => ({ text, tone: 'best' }));
  }
  if (pkg.badge) {
    return [{ text: pkg.badge, tone: pkg.badgeSide ? 'side' : pkg.best ? 'best' : 'gold' }];
  }
  return [];
}
