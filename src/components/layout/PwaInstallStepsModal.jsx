import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  PWA_ANDROID_PLAY_PROTECT_NOTE,
  PWA_CHROME_INSTALL_STEPS,
  PWA_IOS_INSTALL_STEPS,
  PWA_SAMSUNG_INSTALL_STEPS,
} from '../../core/pwaInstall';
import { PWA_ICON_512_PATH } from '../../core/pwaManifest';
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
  const isSamsung = variant === 'samsung';
  const title = isIos ? 'تثبيت على iPhone' : isSamsung ? 'تثبيت Samsung Internet' : 'تثبيت Google Chrome';
  const steps = isIos ? PWA_IOS_INSTALL_STEPS : isSamsung ? PWA_SAMSUNG_INSTALL_STEPS : PWA_CHROME_INSTALL_STEPS;
  const browserLabel = isSamsung ? 'Samsung Internet' : 'Google Chrome';

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

        <div className="pwa-install-modal__brand">
          <img
            className="pwa-install-modal__icon"
            src={PWA_ICON_512_PATH}
            alt=""
            width={72}
            height={72}
            draggable={false}
          />
          <div className="pwa-install-modal__brand-text">
            <PlatformOsIcon os={isIos ? 'apple' : 'android'} size={18} />
            <h2 id="pwa-install-modal-title">{title}</h2>
          </div>
        </div>

        {isIos ? (
          <p className="pwa-install-modal__lead">
            اضغط على زر المشاركة (↑) أسفل المتصفح، ثم اختر «إضافة للشاشة الرئيسية».
          </p>
        ) : (
          <>
            {!isSamsung && canInstall ? (
              <button
                type="button"
                className="btn btn-arena pwa-install-modal__install-btn"
                onClick={onInstall}
                disabled={installing}
              >
                {installing ? '⏳ جاري التثبيت…' : '📲 تثبيت التطبيق الآن'}
              </button>
            ) : null}

            <p className="pwa-install-modal__browser-tag">{browserLabel}</p>
          </>
        )}

        <ol className="pwa-install-steps pwa-install-modal__steps" aria-label={`خطوات ${title}`}>
          {steps.map((step, index) => (
            <li key={step} className="pwa-install-steps__item">
              <span className="pwa-install-steps__num" aria-hidden>
                {index + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>

        {!isIos ? (
          <p className="pwa-install-modal__trust">{PWA_ANDROID_PLAY_PROTECT_NOTE}</p>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
