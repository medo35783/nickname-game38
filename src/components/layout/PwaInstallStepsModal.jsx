import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PWA_ANDROID_INSTALL_STEPS, PWA_IOS_INSTALL_STEPS } from '../../core/pwaInstall';
import PlatformOsIcon from '../../shared/PlatformOsIcon';

export default function PwaInstallStepsModal({ open, variant, onClose, onInstall, canInstall, installing }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) {
      setVisible(false);
      return undefined;
    }

    setVisible(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isIos = variant === 'ios';
  const steps = isIos ? PWA_IOS_INSTALL_STEPS : PWA_ANDROID_INSTALL_STEPS;
  const title = isIos ? 'تثبيت على iPhone' : 'تثبيت على Android';

  const modal = (
    <div
      className={`pwa-install-modal${visible ? ' pwa-install-modal--open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="pwa-install-modal__sheet">
        <button type="button" className="pwa-install-modal__close" onClick={onClose} aria-label="إغلاق">
          ×
        </button>

        <div className="pwa-install-modal__head">
          <PlatformOsIcon os={isIos ? 'apple' : 'android'} size={22} />
          <h2 id="pwa-install-modal-title">{title}</h2>
        </div>

        {isIos ? (
          <p className="pwa-install-modal__lead">
            اضغط على زر المشاركة (↑) أسفل المتصفح، ثم اختر «إضافة للشاشة الرئيسية».
          </p>
        ) : (
          <>
            {canInstall ? (
              <button
                type="button"
                className="btn btn-arena pwa-install-modal__install-btn"
                onClick={onInstall}
                disabled={installing}
              >
                {installing ? '⏳ جاري التثبيت…' : '📲 تثبيت التطبيق الآن'}
              </button>
            ) : null}
            <p className="pwa-install-modal__lead">
              افتح القائمة (⋮) ثم اختر «تثبيت التطبيق».
            </p>
            <p className="pwa-install-modal__trust">
              إذا ظهر تحذير Play Protect روتيني، اختر تثبيت على أي حال — التطبيق آمن بالكامل.
            </p>
          </>
        )}

        <ol className="pwa-install-steps pwa-install-modal__steps" aria-label={`خطوات ${title}`}>
          {steps.map((step) => (
            <li key={step} className="pwa-install-steps__item">
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
