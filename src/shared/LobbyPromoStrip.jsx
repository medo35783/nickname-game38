import { useEffect, useState } from 'react';
import { subscribeLobbyAds } from '../core/platformLobbyAds';
import '../styles/sponsor-promo.css';

/**
 * بانرات ترويجية — الصفحة الرئيسية
 */
export default function LobbyPromoStrip() {
  const [ads, setAds] = useState([]);

  useEffect(() => {
    const unsub = subscribeLobbyAds(setAds);
    return unsub;
  }, []);

  if (!ads.length) return null;

  return (
    <section className="lobby-promo" aria-label="عروض وإعلانات">
      <div className="lobby-promo__track">
        {ads.map((ad) => {
          const inner = (
            <>
              {ad.imageUrl ? <img src={ad.imageUrl} alt="" className="lobby-promo__img" /> : null}
              <div className="lobby-promo__body">
                <h3 className="lobby-promo__title">{ad.title}</h3>
                {ad.body ? <p className="lobby-promo__text">{ad.body}</p> : null}
                {ad.ctaLabel && ad.linkUrl ? (
                  <span className="lobby-promo__cta">{ad.ctaLabel} ←</span>
                ) : null}
              </div>
            </>
          );

          const className = `lobby-promo__card lobby-promo__card--${ad.variant}`;

          if (ad.linkUrl) {
            return (
              <a
                key={ad.id}
                className={className}
                href={ad.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {inner}
              </a>
            );
          }

          return (
            <article key={ad.id} className={className}>
              {inner}
            </article>
          );
        })}
      </div>
    </section>
  );
}
