import { openPrizeCertificateReport } from '../core/prizeCertificateReport';
import '../styles/winner-prize-certificate.css';

/**
 * بطاقة شهادة الفائز — معاينة في شاشة النتائج + تحميل PDF
 */
export default function WinnerPrizeCertificate({
  award,
  loading = false,
  isWinnerView = true,
  notify,
}) {
  if (loading) {
    return (
      <div className="winner-prize-card winner-prize-card--loading">
        <span className="winner-prize-card__spinner" aria-hidden />
        جاري تجهيز الشهادة…
      </div>
    );
  }

  if (!award?.winnerName) return null;

  const showCoupon = Boolean(award.couponCode?.trim());
  const canSeeCoupon = isWinnerView && showCoupon;

  const handlePdf = () => {
    const ok = openPrizeCertificateReport(award);
    if (ok) notify?.('افتح «طباعة» ثم «حفظ كـ PDF»', 'success');
    else notify?.('اسمح بالنوافذ المنبثقة', 'error');
  };

  return (
    <div className="winner-prize-card">
      <div className="winner-prize-card__ribbon">شهادة فوز رسمية</div>
      <div className="winner-prize-card__trophy" aria-hidden>
        🏆
      </div>
      <div className="winner-prize-card__title">مبروك {award.winnerName}!</div>

      {award.sponsorName ? (
        <div className="winner-prize-card__sponsor">
          {award.sponsorLogoUrl ? (
            <img src={award.sponsorLogoUrl} alt="" className="winner-prize-card__sponsor-logo" />
          ) : null}
          <span>برعاية {award.sponsorName}</span>
        </div>
      ) : null}

      {canSeeCoupon ? (
        <div className="winner-prize-card__coupon">
          <div className="winner-prize-card__coupon-label">🎁 جائزة الراعي</div>
          {award.prizeOffer ? <div className="winner-prize-card__coupon-offer">{award.prizeOffer}</div> : null}
          <div className="winner-prize-card__coupon-code">{award.couponCode}</div>
        </div>
      ) : showCoupon && !isWinnerView ? (
        <p className="winner-prize-card__hint">الفائز فقط يرى كود الجائزة</p>
      ) : null}

      <button type="button" className="btn btn--gold winner-prize-card__pdf" onClick={handlePdf}>
        📄 تحميل شهادة PDF
      </button>
    </div>
  );
}
