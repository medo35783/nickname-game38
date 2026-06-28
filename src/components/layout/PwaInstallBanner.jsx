import { useCallback, useState } from 'react';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import PwaInstallStepsModal from './PwaInstallStepsModal';

const BANNER_COPY = {
  samsung: '📱 لعبك أسرع؟ اضغط على سهم التحميل في أعلى المتصفح لتثبيت التطبيق فوراً!',
  ios: '🍏 ثبت لعيب زون على شاشتك للوصول السريع.. اضغط للخطوات',
  android: '🤖 العب بكامل الشاشة! ثبت التطبيق الآن.. اضغط للتفاصيل',
};

export default function PwaInstallBanner() {
  const {
    showBanner,
    bannerVariant,
    dismissBanner,
    canInstall,
    install,
    installing,
  } = usePwaInstall();

  const [modalOpen, setModalOpen] = useState(false);
  const [hiding, setHiding] = useState(false);

  const handleDismiss = useCallback(() => {
    setHiding(true);
    window.setTimeout(() => dismissBanner(), 260);
  }, [dismissBanner]);

  const handleBannerClick = async () => {
    if (bannerVariant === 'samsung') return;

    if (bannerVariant === 'ios') {
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
  const isActionable = bannerVariant !== 'samsung';

  return (
    <>
      <div
        className={`pwa-install-banner${hiding ? ' pwa-install-banner--hiding' : ''}`}
        role="region"
        aria-label="تثبيت التطبيق"
      >
        {isActionable ? (
          <button type="button" className="pwa-install-banner__body" onClick={handleBannerClick}>
            <span className="pwa-install-banner__text">{text}</span>
            <span className="pwa-install-banner__chev" aria-hidden>
              ‹
            </span>
          </button>
        ) : (
          <div className="pwa-install-banner__body pwa-install-banner__body--static">
            <span className="pwa-install-banner__text">{text}</span>
          </div>
        )}

        <button
          type="button"
          className="pwa-install-banner__close"
          onClick={handleDismiss}
          aria-label="إغلاق"
        >
          ×
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
