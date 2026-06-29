import { usePwaInstall } from '../../hooks/usePwaInstall';
import { PWA_MANIFEST } from '../../core/pwaManifest';
import {
  PWA_ANDROID_PLAY_PROTECT_NOTE,
  PWA_CHROME_INSTALL_STEPS,
  PWA_IOS_INSTALL_STEPS,
  PWA_SAMSUNG_INSTALL_STEPS,
  isSamsungInternetBrowser,
} from '../../core/pwaInstall';
import PlatformOsIcon from '../../shared/PlatformOsIcon';

export default function PwaInstallCard({ notify, compact = false }) {
  const { canInstall, isIos, isAndroid, installing, install, showCard } = usePwaInstall();
  const isSamsung = isSamsungInternetBrowser();

  if (!showCard) return null;

  const handleInstall = async () => {
    if (!canInstall) {
      notify?.('من Chrome: ⋮ ⬅️ إضافة للشاشة الرئيسية', 'info');
      return;
    }

    const result = await install();
    if (result.ok) {
      notify?.('✅ تم التثبيت — افتح لعيب زون من شاشتك الرئيسية', 'success');
      return;
    }
    if (result.reason === 'dismissed') {
      notify?.('ألغيت التثبيت — يمكنك المحاولة لاحقاً', 'info');
      return;
    }
    notify?.('تعذّر التثبيت — جرّب ⋮ ⬅️ إضافة للشاشة الرئيسية', 'error');
  };

  const renderSteps = (os, steps, label) => (
    <>
      <div className="pwa-install-platform__head">
        <PlatformOsIcon os={os} size={18} />
        <span>{label}</span>
      </div>
      <ol className="pwa-install-steps" aria-label={`خطوات التثبيت على ${label}`}>
        {steps.map((step) => (
          <li key={step} className="pwa-install-steps__item">
            {step}
          </li>
        ))}
      </ol>
    </>
  );

  return (
    <div className={`card pwa-install-card${compact ? ' pwa-install-card--compact' : ''}`} style={{ marginBottom: 12 }}>
      <div className="ctitle">📲 إضافة للشاشة الرئيسية</div>
      <p className="psub pwa-install-card__lead">
        لعبك أسرع؟ ثبّت {PWA_MANIFEST.short_name} على شاشتك (مرة واحدة)
      </p>

      {canInstall && !isSamsung ? (
        <button
          type="button"
          className="btn btn-arena pwa-install-card__btn"
          onClick={handleInstall}
          disabled={installing}
        >
          {installing ? '⏳ جاري التثبيت…' : '📲 تثبيت التطبيق الآن'}
        </button>
      ) : null}

      {isIos ? renderSteps('apple', PWA_IOS_INSTALL_STEPS, 'iPhone') : null}

      {isAndroid && isSamsung ? renderSteps('android', PWA_SAMSUNG_INSTALL_STEPS, 'Samsung Internet') : null}

      {isAndroid && !isSamsung ? (
        <>
          {renderSteps('android', PWA_CHROME_INSTALL_STEPS, 'Google Chrome')}
          <p className="pwa-install-card__trust">{PWA_ANDROID_PLAY_PROTECT_NOTE}</p>
        </>
      ) : null}

      {!isIos && !isAndroid ? (
        <p className="pwa-install-card__hint">
          من متصفح الجوال: ⋮ ⬅️ إضافة للشاشة الرئيسية
        </p>
      ) : (
        <p className="pwa-install-card__hint">
          بعد التثبيت يفتح بملء الشاشة بدون شريط المتصفح
        </p>
      )}
    </div>
  );
}
