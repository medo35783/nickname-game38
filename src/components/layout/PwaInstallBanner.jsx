import { useState } from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import PwaInstallStepsModal from './PwaInstallStepsModal';

const BANNER_COPY = {
  samsung: '📱 لعبك أسرع؟ اضغط على سهم التحميل في أعلى المتصفح لتثبيت التطبيق فوراً!',
  ios: '🍏 ثبت لعيب زون على شاشتك للوصول السريع.. اضغط للخطوات',
  android: '🤖 العب بكامل الشاشة! ثبت التطبيق الآن.. اضغط للتفاصيل',
};

export default function PwaInstallBanner() {
  const { showBanner, bannerVariant, canInstall, install, installing } = usePwaInstall();
  const [modalOpen, setModalOpen] = useState(false);

  const handleBannerClick = async () => {
    if (bannerVariant === 'ios' || bannerVariant === 'samsung') {
      setModalOpen(true);
      return;
    }

    if (bannerVariant === 'android') {
      if (canInstall) {
        const result = await install();
        if (result.ok) return;
      }
      setModalOpen(true);
    }
  };

  const handleModalInstall = async () => {
    const result = await install();
    if (result.ok) setModalOpen(false);
  };

  if (!showBanner) return null;

  const text = BANNER_COPY[bannerVariant] || BANNER_COPY.android;

  return (
    <>
      <div className="pwa-install-banner" role="region" aria-label="تثبيت التطبيق">
        <button type="button" className="pwa-install-banner__body" onClick={handleBannerClick}>
          <span className="pwa-install-banner__text">{text}</span>
          <span className="pwa-install-banner__chev" aria-hidden>
            ‹
          </span>
        </button>
      </div>

      <PwaInstallStepsModal
        open={modalOpen}
        variant={bannerVariant}
        onClose={() => setModalOpen(false)}
        onInstall={handleModalInstall}
        canInstall={canInstall}
        installing={installing}
      />
    </>
  );
}
