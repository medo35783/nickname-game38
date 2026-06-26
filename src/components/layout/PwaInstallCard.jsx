import { usePwaInstall } from '../../hooks/usePwaInstall';
import { PWA_MANIFEST } from '../../core/pwaManifest';
import { PWA_ANDROID_INSTALL_STEPS, PWA_IOS_INSTALL_STEPS } from '../../core/pwaInstall';
import PlatformOsIcon from '../../shared/PlatformOsIcon';

export default function PwaInstallCard({ notify, compact = false }) {
  const { canInstall, isIos, isAndroid, installing, install, showCard } = usePwaInstall();

  if (!showCard) return null;

  const handleInstall = async () => {
    if (!canInstall) {
      notify?.('من Chrome: ⋮ ⬅️ تثبيت التطبيق', 'info');
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
    notify?.('تعذّر التثبيت — جرّب ⋮ ⬅️ تثبيت التطبيق من Chrome', 'error');
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

      {canInstall ? (
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

      {isAndroid ? (
        <>
          <p className="pwa-install-card__trust">
            تحذير Play Protect يظهر أحياناً لتطبيقات الويب الجديدة — ليس فيروساً. التطبيق يعمل داخل Chrome ولا يصل لبياناتك خارج الموقع.
          </p>
          {renderSteps('android', PWA_ANDROID_INSTALL_STEPS, 'Android')}
        </>
      ) : null}

      {!isIos && !isAndroid ? (
        <p className="pwa-install-card__hint">
          من متصفح الجوال: ⋮ ⬅️ تثبيت التطبيق أو إضافة للشاشة الرئيسية
        </p>
      ) : (
        <p className="pwa-install-card__hint">
          بعد التثبيت يفتح بملء الشاشة بدون شريط المتصفح
        </p>
      )}
    </div>
  );
}
