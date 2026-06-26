import { useEffect, useMemo, useState } from 'react';
import { subscribeActiveSponsors, pickSponsorForGame } from '../core/platformSponsors';
import { readActiveCodeSponsorFromLocal } from '../core/sponsorStatsHelpers';
import '../styles/sponsor-promo.css';

/**
 * شارة الراعي أثناء الجولات — كود مرتبط أولاً ثم راعي المنصة
 */
export default function SponsorRoundBadge({ gameKey, phase = null, className = '' }) {
  const [platformSponsors, setPlatformSponsors] = useState([]);
  const [codeSponsor, setCodeSponsor] = useState(() => readActiveCodeSponsorFromLocal());

  useEffect(() => {
    const unsub = subscribeActiveSponsors(setPlatformSponsors);
    return unsub;
  }, []);

  useEffect(() => {
    const refresh = () => setCodeSponsor(readActiveCodeSponsorFromLocal());
    refresh();
    window.addEventListener('storage', refresh);
    const t = setInterval(refresh, 8000);
    return () => {
      window.removeEventListener('storage', refresh);
      clearInterval(t);
    };
  }, []);

  const sponsor = useMemo(() => {
    if (codeSponsor?.id) return codeSponsor;
    return pickSponsorForGame(platformSponsors, gameKey);
  }, [codeSponsor, platformSponsors, gameKey]);

  if (!sponsor) return null;

  const hiddenPhases = ['lobby', 'ended', 'cancelled', 'home'];
  if (phase && hiddenPhases.includes(phase)) return null;

  return (
    <div className={`sponsor-round ${className}`.trim()} role="note" aria-label={`برعاية ${sponsor.name}`}>
      <span className="sponsor-round__label">برعاية</span>
      {sponsor.logoUrl ? (
        <img src={sponsor.logoUrl} alt={sponsor.name} className="sponsor-round__logo" />
      ) : (
        <strong className="sponsor-round__name">{sponsor.name}</strong>
      )}
      {sponsor.tagline ? <span className="sponsor-round__tag">{sponsor.tagline}</span> : null}
    </div>
  );
}
