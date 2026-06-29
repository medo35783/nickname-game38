/**
 * بطاقة إعلان لوبي واحدة — مشتركة بين العرض والمعاينة
 */
export default function LobbyAdCard({ ad, className = '', onClick }) {
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

  const cardClass = `lobby-promo__card lobby-promo__card--${ad.variant || 'gold'} ${className}`.trim();

  if (ad.linkUrl) {
    return (
      <a
        className={cardClass}
        href={ad.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {inner}
      </a>
    );
  }

  return (
    <article className={cardClass} onClick={onClick} role={onClick ? 'button' : undefined}>
      {inner}
    </article>
  );
}
