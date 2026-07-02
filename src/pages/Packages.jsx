import { useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '../firebase';
import GameTopNav from '../shared/GameTopNav';
import PackagePlanCard from '../components/codes/PackagePlanCard';
import PackageCheckout from '../components/codes/PackageCheckout';
import PackagePaySuccess from '../components/codes/PackagePaySuccess';
import PackagesLegalNotice from '../components/codes/PackagesLegalNotice';
import PackagePaymentSupport from '../components/codes/PackagePaymentSupport';
import LegalModal from '../components/layout/LegalModal';
import { SUBSCRIPTION_FEATURES } from '../core/subscriptionPackages';
import { persistActiveCodeLocal, activateCode, formatCodeForDisplay } from '../core/firebaseHelpers';
import { buildDeviceInfo } from '../components/auth/playerAccessHelpers';
import {
  buildMoyasarCallbackUrl,
  clearMoyasarPaymentStorage,
  clearPaymentError,
  clearPaymentSuccess,
  clearReturnFailed,
  getPendingReturnId,
  isStoredSuccessForPending,
  readPaymentError,
  readPaymentSuccess,
  readPendingPayment,
  readStoredPlanDays,
  storePaymentError,
  storePaymentReturn,
  storePaymentSuccess,
  storePendingPayment,
  storePlanDays,
} from '../core/moyasarPayment';

const MOYASAR_JS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
const MOYASAR_CSS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';
const ACTIVATE_RETRIES = 20;
const ACTIVATE_RETRY_MIN_MS = 2500;
const ACTIVATE_RETRY_MAX_MS = 7000;

/** انتظار متزايد بين المحاولات — حتى ~90 ثانية إجمالاً */
function getActivateRetryDelay(attempt) {
  return Math.min(ACTIVATE_RETRY_MIN_MS + attempt * 700, ACTIVATE_RETRY_MAX_MS);
}

function processingSubtext(attempt) {
  if (attempt <= 2) return 'لا تغلق الصفحة — سيظهر كودك خلال ثوانٍ';
  if (attempt <= 10) return 'قد يستغرق حتى دقيقة — خاصةً عند أول دفع بعد النشر';
  return 'ما زلنا نحاول — لا تغلق الصفحة ولا تحدّثها';
}

function mapActivateError(err) {
  const code = err?.code || err?.message || '';
  if (code === 'api_unavailable') {
    return import.meta.env.DEV
      ? 'الدفع نجح — لكن السيرفر المحلي لا يولّد الأكواد. شغّل: npx vercel dev — أو جرّب على رابط Vercel.'
      : 'تعذّر الاتصال بسيرفر التفعيل — حدّث الصفحة أو جرّب لاحقاً.';
  }
  if (code === 'moyasar_auth_failed') {
    return 'إعداد ميسر على السيرver غير صحيح: MOYASAR_SECRET_KEY لازم يكون sk_test ويطابق pk_test — حدّث Vercel ثم Redeploy.';
  }
  if (code === 'missing_moyasar_secret') {
    return 'MOYASAR_SECRET_KEY غير موجود على Vercel — أضفه ثم Redeploy.';
  }
  if (code === 'payment_failed' || err?.moyasarStatus === 'failed') {
    return 'لم يكتمل الدفع — البطاقة مرفوضة أو غير مقبولة في وضع الاختبار. جرّب بطاقة 4111 1111 1111 1111 أو بطاقة أخرى.';
  }
  if (code === 'not_paid_yet' || err?.status === 402 || code === 'invalid_payment') {
    return 'تعذّر تأكيد الدفع من ميسر — انتظر 30 ثانية ثم أعد فتح الباقات.';
  }
  if (err?.status === 500 || code === 'server_error' || code === 'missing_firebase_config' || code === 'invalid_firebase_config') {
    if (code === 'invalid_firebase_config') {
      return 'FIREBASE_SERVICE_ACCOUNT_JSON على Vercel غير صالح (JSON مكسور) — أعد لصقه سطراً واحداً ثم Redeploy.';
    }
    return 'خطأ إعداد السيرver (Firebase) — تحقق من FIREBASE_SERVICE_ACCOUNT_JSON على Vercel ثم Redeploy.';
  }
  return null;
}

function shouldRetryActivate(err) {
  const code = err?.code || '';
  if (code === 'moyasar_auth_failed' || code === 'missing_moyasar_secret') return false;
  if (code === 'payment_failed' || err?.moyasarStatus === 'failed') return false;
  if (code === 'api_unavailable') return false;
  if (err?.status === 401) return false;
  if (code === 'not_paid_yet' || err?.status === 402 || code === 'invalid_payment') return true;
  if (code === 'invalid_firebase_config' || code === 'missing_firebase_config') return true;
  if (err?.status === 500 || code === 'server_error') return true;
  return true;
}

export const PAYMENT_PLANS = [
  { id: '1d', icon: '⚡', name: 'لمسة سريعة', durationSub: '1 يوم', days: 1, planDays: 1, price: 9, amountHalalas: 900, planClass: 'plan-burgundy', badge: 'تجربة سريعة', badgeSide: true },
  { id: '3d', icon: '🎪', name: 'جمعة اللمة', durationSub: '3 أيام', days: 3, planDays: 3, price: 18, amountHalalas: 1800, planClass: 'plan-green', popular: true, badge: 'مثالي لعطلة نهاية الأسبوع', badgeSide: true },
  { id: '7d', icon: '💎', name: 'أسبوع البطولة', durationSub: '7 أيام', days: 7, planDays: 7, price: 35, amountHalalas: 3500, planClass: 'plan-blue', best: true, badges: ['الأفضل', 'الأوفر'] },
];

let moyasarLoadPromise = null;

function loadMoyasarAssets() {
  if (window.Moyasar) return Promise.resolve();
  if (moyasarLoadPromise) return moyasarLoadPromise;
  moyasarLoadPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-moyasar-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = MOYASAR_CSS;
      link.dataset.moyasarCss = '1';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = MOYASAR_JS;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('تعذر تحميل بوابة الدفع'));
    document.body.appendChild(script);
  });
  return moyasarLoadPromise;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resolveInitialPhase() {
  const pending = readPendingPayment() || getPendingReturnId();
  if (pending && !isStoredSuccessForPending()) return 'processing';
  if (isStoredSuccessForPending()) return 'success';
  if (readPaymentError()) return 'browse';
  return 'browse';
}

function resolveInitialSuccess() {
  if (!isStoredSuccessForPending()) return null;
  const saved = readPaymentSuccess();
  if (!saved) return null;
  return { code: saved.code, expiresAt: saved.expiresAt };
}

function resolveInitialError() {
  const saved = readPaymentError();
  if (!saved) return null;
  return { message: saved.message, paymentId: saved.paymentId };
}

async function waitForAuth(maxMs = 6000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    if (auth.currentUser) return auth.currentUser;
    await wait(250);
  }
  return auth.currentUser;
}

async function bindPurchasedCode(code) {
  const user = await waitForAuth();
  if (!user || !code) return;
  try {
    await activateCode(code, user.uid, buildDeviceInfo());
  } catch (e) {
    const msg = String(e?.message || '');
    if (!msg.includes('مُفعّل') && !msg.includes('الكود غير')) {
      console.warn('bindPurchasedCode:', e);
    }
  }
}

export default function Packages({
  onBack,
  onSubscriptionActivated,
  onGoAccount,
  isGuest = false,
}) {
  const formRef = useRef(null);
  const activatingRef = useRef(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [highlightId, setHighlightId] = useState(null);
  const [payError, setPayError] = useState('');
  const [loadingPay, setLoadingPay] = useState(false);
  const [phase, setPhase] = useState(resolveInitialPhase);
  const [successData, setSuccessData] = useState(resolveInitialSuccess);
  const [pendingMsg, setPendingMsg] = useState(() => (
    resolveInitialPhase() === 'processing'
      ? 'جاري التحقق من الدفع وتجهيز كودك...'
      : ''
  ));
  const [processingHint, setProcessingHint] = useState(() => (
    resolveInitialPhase() === 'processing' ? processingSubtext(0) : ''
  ));
  const [globalError, setGlobalError] = useState(resolveInitialError);
  const [refundOpen, setRefundOpen] = useState(false);

  const openCodes = () => window.dispatchEvent(new CustomEvent('pfcc-open-code-activation'));

  const activateOnServer = useCallback(async (paymentId, planDays) => {
    let idToken = null;
    try {
      idToken = await auth.currentUser?.getIdToken();
    } catch { /* ignore */ }

    let res;
    try {
      res = await fetch('/api/activateCode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId, planDays: planDays || undefined, idToken }),
      });
    } catch {
      const err = new Error('api_unavailable');
      err.code = 'api_unavailable';
      throw err;
    }

    const raw = await res.text();
    let data = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      const err = new Error('api_unavailable');
      err.code = 'api_unavailable';
      err.status = res.status;
      throw err;
    }

    if (!res.ok || !data.success) {
      const err = new Error(data.error || 'activate_failed');
      err.status = res.status;
      err.code = data.error;
      err.moyasarStatus = data.moyasarStatus;
      throw err;
    }
    return data;
  }, []);

  const finishWithSuccess = useCallback(async (data, paymentId, planDays) => {
    const codeData = {
      codeId: data.code,
      id: data.code,
      code: formatCodeForDisplay(data.code),
      expiresAt: data.expiresAt,
      activatedAt: data.activatedAt || Date.now(),
      duration: data.duration || planDays,
      paymentId: data.paymentId || paymentId,
      source: 'moyasar',
    };
    persistActiveCodeLocal(codeData);
    await bindPurchasedCode(data.code);
    onSubscriptionActivated?.(codeData);
    storePaymentSuccess({
      code: formatCodeForDisplay(data.code),
      expiresAt: data.expiresAt,
      paymentId: data.paymentId || paymentId,
      duration: codeData.duration,
    });
    clearMoyasarPaymentStorage();
    clearReturnFailed(paymentId);
    setSuccessData({ code: formatCodeForDisplay(data.code), expiresAt: data.expiresAt });
    setGlobalError(null);
    setPhase('success');
    activatingRef.current = false;
    scrollToTop();
  }, [onSubscriptionActivated]);

  const handlePaymentSuccess = useCallback(async (paymentId, planDays, { force = false } = {}) => {
    if (activatingRef.current && !force) return;
    activatingRef.current = true;

    const saved = readPaymentSuccess();
    if (saved?.paymentId && saved.paymentId !== paymentId) {
      clearPaymentSuccess();
    }

    storePendingPayment(paymentId, planDays || readStoredPlanDays());
    clearReturnFailed(paymentId);
    setPhase('processing');
    setPayError('');
    setGlobalError(null);
    clearPaymentError();
    setSuccessData(null);
    setPendingMsg('جاري التحقق من الدفع وتجهيز كودك...');
    setProcessingHint(processingSubtext(0));
    scrollToTop();

    await waitForAuth();

    let lastErr = null;
    for (let attempt = 0; attempt < ACTIVATE_RETRIES; attempt += 1) {
      try {
        if (attempt > 0) {
          setPendingMsg(`جاري تجهيز كودك... (محاولة ${attempt + 1}/${ACTIVATE_RETRIES})`);
          setProcessingHint(processingSubtext(attempt));
          await wait(getActivateRetryDelay(attempt - 1));
        }

        const data = await activateOnServer(paymentId, planDays);
        await finishWithSuccess(data, paymentId, planDays);
        return;
      } catch (err) {
        lastErr = err;
        if (err?.status === 409) {
          await wait(800);
          continue;
        }
        if (!shouldRetryActivate(err)) break;
        if (attempt === ACTIVATE_RETRIES - 1) break;
      }
    }

    activatingRef.current = false;
    const hint = mapActivateError(lastErr);
    const errorPayload = {
      message: hint || 'تم الدفع — لكن تعذّر تجهيز الكود تلقائياً. اضغط «إعادة تفعيل الكود» أو تواصل معنا.',
      paymentId,
    };
    storePaymentError(errorPayload.message, paymentId);
    setPendingMsg('');
    setProcessingHint('');
    setGlobalError(errorPayload);
    setPhase('browse');
  }, [activateOnServer, finishWithSuccess]);

  const mountMoyasarForm = useCallback(async (plan) => {
    const publishableKey = import.meta.env.VITE_MOYASAR_PUBLISHABLE_KEY;
    if (!publishableKey) {
      setPayError('بوابة الدفع غير مهيّأة بعد — تواصل مع الدعم.');
      return;
    }
    setLoadingPay(true);
    setPayError('');
    try {
      await loadMoyasarAssets();
      if (formRef.current) formRef.current.innerHTML = '';
      storePlanDays(plan.planDays);
      window.Moyasar.init({
        element: formRef.current,
        amount: plan.amountHalalas,
        currency: 'SAR',
        description: `${plan.name} — ${plan.durationSub}`,
        publishable_api_key: publishableKey,
        callback_url: buildMoyasarCallbackUrl(plan.planDays),
        supported_networks: ['visa', 'mastercard', 'mada'],
        methods: ['creditcard'],
        on_completed: async (payment) => {
          if (payment?.status === 'paid' && payment?.id) {
            await handlePaymentSuccess(payment.id, plan.planDays);
          } else if (payment?.id) {
            storePaymentReturn(payment.id, plan.planDays);
          }
        },
        on_failure: () => setPayError('فشل الدفع — تحقق من بيانات البطاقة أو جرّب بطاقة أخرى.'),
      });
    } catch {
      setPayError('تعذر فتح نموذج الدفع — أعد المحاولة.');
    } finally {
      setLoadingPay(false);
    }
  }, [handlePaymentSuccess]);

  const handleSubscribe = useCallback(async (plan) => {
    setHighlightId(plan.id);
    setGlobalError(null);
    setTimeout(async () => {
      setSelectedPlan(plan);
      setPhase('checkout');
      scrollToTop();
      await mountMoyasarForm(plan);
      setHighlightId(null);
    }, 280);
  }, [mountMoyasarForm]);

  const handleCheckoutBack = useCallback(() => {
    if (formRef.current) formRef.current.innerHTML = '';
    setSelectedPlan(null);
    setPhase('browse');
    setPayError('');
    scrollToTop();
  }, []);

  useEffect(() => {
    const pending = readPendingPayment();
    const returnId = getPendingReturnId();
    const paymentId = pending?.paymentId || returnId;
    if (!paymentId) return;

    if (isStoredSuccessForPending()) return;

    const planDays = pending?.planDays || readStoredPlanDays();
    handlePaymentSuccess(paymentId, planDays || undefined);
  }, [handlePaymentSuccess]);

  const handleRetryActivation = useCallback(() => {
    const pending = readPendingPayment();
    const paymentId = pending?.paymentId || globalError?.paymentId || getPendingReturnId();
    if (!paymentId) return;
    const planDays = pending?.planDays || readStoredPlanDays();
    handlePaymentSuccess(paymentId, planDays || undefined, { force: true });
  }, [globalError?.paymentId, handlePaymentSuccess]);

  const handleDismissSuccess = useCallback(() => {
    clearPaymentSuccess();
    setSuccessData(null);
    setPhase('browse');
    onBack?.();
  }, [onBack]);

  const handleGoAccountFromSuccess = useCallback(() => {
    clearPaymentSuccess();
    onGoAccount?.();
  }, [onGoAccount]);

  const copyCode = () => {
    if (!successData?.code) return;
    navigator.clipboard?.writeText(successData.code);
  };

  if (phase === 'success' && successData) {
    return (
      <PackagePaySuccess
        code={successData.code}
        expiresAt={successData.expiresAt}
        isGuest={isGuest}
        onCopy={copyCode}
        onPlay={handleDismissSuccess}
        onGoAccount={isGuest ? handleGoAccountFromSuccess : onGoAccount}
      />
    );
  }

  if (phase === 'processing') {
    return (
      <div className="scr packages-scr">
        <div className="pkg-pay-success">
          <p className="pkg-pay-success__icon" aria-hidden="true">⏳</p>
          <p className="pkg-pay-success__title">{pendingMsg || 'جاري تفعيل اشتراكك...'}</p>
          <p className="pkg-pay-success__exp">{processingHint || 'لا تغلق الصفحة — قد يستغرق حتى دقيقة'}</p>
        </div>
      </div>
    );
  }

  if (phase === 'checkout' && selectedPlan) {
    return (
      <div className="scr packages-scr pkg-checkout-scr">
        {onBack ? <GameTopNav onBack={handleCheckoutBack} variant="arena" /> : null}
        <PackageCheckout
          plan={selectedPlan}
          formRef={formRef}
          loadingPay={loadingPay}
          payError={payError}
          onBack={handleCheckoutBack}
        />
        <PackagesLegalNotice />
      </div>
    );
  }

  return (
    <div className="scr packages-scr">
      {onBack ? <GameTopNav onBack={onBack} variant="arena" /> : null}

      <header className="pkg-hero">
        <p className="pkg-hero__eyebrow">وصول كامل للمنصة</p>
        <h1 className="pkg-hero__title">باقات الاشتراك</h1>
        <p className="pkg-hero__sub">اشترِ بالأيام — بدون التزام. الدفع الآمن عبر Moyasar.</p>
      </header>

      <div className="pkg-code-row pkg-code-row--top">
        <span className="pkg-code-row__text">لديك كود اشتراك؟</span>
        <button type="button" className="btn bo bsm" onClick={openCodes}>🔑 تفعيل الكود</button>
      </div>

      <div className="pkg-includes">
        {SUBSCRIPTION_FEATURES.map((line) => (
          <span key={line} className="pkg-include-chip">{line.replace(/^✅\s*/, '')}</span>
        ))}
      </div>

      {globalError ? (
        <PackagePaymentSupport
          message={globalError.message}
          paymentId={globalError.paymentId}
          onRetry={handleRetryActivation}
          onOpenRefund={() => setRefundOpen(true)}
        />
      ) : null}

      {refundOpen ? <LegalModal documentId="refund" onClose={() => setRefundOpen(false)} /> : null}

      <p className="pkg-tiers-label">اختر مدة الاشتراك</p>

      <div className="pkg-tiers">
        {PAYMENT_PLANS.map((pkg) => (
          <PackagePlanCard
            key={pkg.id}
            pkg={pkg}
            onSubscribe={handleSubscribe}
            ctaLabel="اشترك"
            highlighted={highlightId === pkg.id}
          />
        ))}
      </div>

      <PackagesLegalNotice />

      <footer className="pkg-footer">
        <div className="pkg-trust">
          <span className="pkg-trust__icon" aria-hidden="true">🔒</span>
          <div>
            <div className="pkg-trust__title">دفع آمن وتفعيل فوري</div>
            <p className="pkg-trust__sub">لا نخزّن بيانات بطاقتك. التفعيل فوري بكود الاشتراك بعد إتمام الدفع.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
