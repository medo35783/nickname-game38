import { usePwaInstall } from '../../hooks/usePwaInstall';
import { PWA_MANIFEST } from '../../core/pwaManifest';

const IOS_STEPS = [
  'اضغط زر المشاركة ↑ في أسفل Safari',
  'اختر «إضافة إلى الشاشة الرئيسية»',
  'اضغط «إضافة» — يظهر التطبيق بأيقونة لعيب زون',
];

const ANDROID_MANUAL_STEPS = [
  'من قائمة المتصفح ⋮ اختر «تثبيت التطبيق»',
  'أو «إضافة إلى الشاشة الرئيسية»',
  'يفتح كتطبيق بدون شريط المتصفح',
];

export default function PwaInstallCard({ notify }) {
  const { canInstall, isIos, isAndroid, installing, install, showCard } = usePwaInstall();

  if (!showCard) return null;

  const handleInstall = async () => {
    const ok = await install();
    if (ok) {
      notify?.('✅ تم التثبيت — افتح لعيب زون من شاشتك الرئيسية', 'success');
    }
  };

  return (
    <div className="card pwa-install-card" style={{ marginBottom: 12 }}>
      <div className="ctitle">📲 إضافة للشاشة الرئيسية</div>
      <p className="psub pwa-install-card__lead">
        ثبّت {PWA_MANIFEST.short_name} على جوالك ليفتح كتطبيق — أسرع وأنسب للجلسات
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

      {isIos ? (
        <ol className="pwa-install-steps" aria-label="خطوات التثبيت على iPhone">
          {IOS_STEPS.map((step) => (
            <li key={step} className="pwa-install-steps__item">
              {step}
            </li>
          ))}
        </ol>
      ) : null}

      {isAndroid && !canInstall ? (
        <ol className="pwa-install-steps" aria-label="خطوات التثبيت على أندرويد">
          {ANDROID_MANUAL_STEPS.map((step) => (
            <li key={step} className="pwa-install-steps__item">
              {step}
            </li>
          ))}
        </ol>
      ) : null}

      <p className="pwa-install-card__hint">
        بعد التثبيت يفتح بملء الشاشة بدون شريط المتصفح
      </p>
    </div>
  );
}
