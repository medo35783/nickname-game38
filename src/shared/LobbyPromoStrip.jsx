import { useCallback, useEffect, useState } from 'react';
import { subscribeLobbyAds, recordLobbyAdClick } from '../core/platformLobbyAds';
import LobbyAdCard from './LobbyAdCard';
import '../styles/sponsor-promo.css';

const ROTATE_MS = 5500;

/**
 * بانرات ترويجية — كاروسيل تلقائي في الصفحة الرئيسية
 */
export default function LobbyPromoStrip() {
  const [ads, setAds] = useState([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const unsub = subscribeLobbyAds(setAds);
    return unsub;
  }, []);

  useEffect(() => {
    setIndex(0);
  }, [ads.length]);

  useEffect(() => {
    if (ads.length <= 1) return undefined;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % ads.length);
    }, ROTATE_MS);
    return () => clearInterval(timer);
  }, [ads.length]);

  const handleClick = useCallback((ad) => {
    if (ad?.linkUrl) void recordLobbyAdClick(ad.id);
  }, []);

  if (!ads.length) return null;

  const ad = ads[index] || ads[0];

  return (
    <section className="lobby-promo lobby-promo--carousel" aria-label="عروض وإعلانات">
      <div className="lobby-promo__viewport">
        <LobbyAdCard
          key={ad.id}
          ad={ad}
          className="lobby-promo__card--slide"
          onClick={() => handleClick(ad)}
        />
      </div>

      {ads.length > 1 ? (
        <div className="lobby-promo__dots" role="tablist" aria-label="تنقل الإعلانات">
          {ads.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`إعلان ${i + 1}`}
              className={`lobby-promo__dot${i === index ? ' lobby-promo__dot--on' : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
