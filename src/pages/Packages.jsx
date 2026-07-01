import { useCallback, useEffect, useRef, useState } from 'react';
import { auth } from '../firebase';
import GameTopNav from '../shared/GameTopNav';
import PackagePlanCard from '../components/codes/PackagePlanCard';
import PackageCheckout from '../components/codes/PackageCheckout';
import PackagePaySuccess from '../components/codes/PackagePaySuccess';
import PackagesLegalNotice from '../components/codes/PackagesLegalNotice';
import { SUBSCRIPTION_FEATURES } from '../core/subscriptionPackages';
import { persistActiveCodeLocal } from '../core/firebaseHelpers';
import {
  MOYASAR_STORAGE,
  buildMoyasarCallbackUrl,
  clearMoyasarPaymentStorage,
  readStoredPlanDays,
  storePlanDays,
} from '../core/moyasarPayment';

const MOYASAR_JS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.js';
const MOYASAR_CSS = 'https://cdn.moyasar.com/mpf/1.14.0/moyasar.css';
const SUPPORT_EMAIL = 'play@la3ibz.com';
const ACTIVATE_RETRIES = 8;
const ACTIVATE_RETRY_MS = 2000;

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
  const [phase, setPhase] = useState(() => (
    sessionStorage.getItem(MOYASAR_STORAGE.returnId) ? 'processing' : 'browse'
  ));
  const [successData, setSuccessData] = useState(null);
  const [pendingMsg, setPendingMsg] = useState(() => (
    sessionStorage.getItem(MOYASAR_STORAGE.returnId)
      ? 'تم الدفع بنجاح — جاري تجهيز كودك...'
      : ''
  ));
  const [globalError, setGlobalError] = useState('');

  const openCodes = () => window.dispatchEvent(new CustomEvent('pfcc-open-code-activation'));

  const activateOnServer = useCallback(async (paymentId, planDays) => {
    let idToken = null;
    try {
      idToken = await auth.currentUser?.getIdToken();
    } catch { /* ignore */ }

    const res = await fetch('/api/activateCode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentId, planDays: planDays || undefined, idToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      const err = new Error(data.error || 'activate_failed');
      err.status = res.status;
      throw err;
    }
    return data;
  }, []);

  const handlePaymentSuccess = useCallback(async (paymentId, planDays) => {
    if (activatingRef.current) return;
    activatingRef.current = true;

    setPhase('processing');
    setPayError('');
    setGlobalError('');
    setPendingMsg('تم الدفع بنجاح — جاري تجهيز كودك...');
    scrollToTop();

    for (let attempt = 0; attempt < ACTIVATE_RETRIES; attempt += 1) {
      try {
        if (attempt > 0) {
          setPendingMsg(`جاري تجهيز كودك... (محاولة ${attempt + 1}/${ACTIVATE_RETRIES})`);
          await wait(ACTIVATE_RETRY_MS);
        }

        const data = await activateOnServer(paymentId, planDays);
        const codeData = {
          codeId: data.code,
          id: data.code,
          code: data.code,
          expiresAt: data.expiresAt,
          activatedAt: data.activatedAt || Date.now(),
          duration: data.duration || planDays,
          paymentId: data.paymentId || paymentId,
          source: 'moyasar',
        };
        persistActiveCodeLocal(codeData);
        onSubscriptionActivated?.(codeData);
        clearMoyasarPaymentStorage();
        setSuccessData({ code: data.code, expiresAt: data.expiresAt });
        setPhase('success');
        activatingRef.current = false;
        scrollToTop();
        return;
      } catch (err) {
        if (err?.status === 409) continue;
        if (attempt === ACTIVATE_RETRIES - 1) break;
      }
    }

    activatingRef.current = false;
    setPendingMsg('');
    setGlobalError(`تواصل معنا على ${SUPPORT_EMAIL} مع رقم العملية: ${paymentId}`);
    setPhase('browse');
  }, [activateOnServer, onSubscriptionActivated]);

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
            sessionStorage.setItem(MOYASAR_STORAGE.returnId, payment.id);
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
    setGlobalError('');
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
    const returnId = sessionStorage.getItem(MOYASAR_STORAGE.returnId);
    if (!returnId) return;

    const planDays = readStoredPlanDays();
    handlePaymentSuccess(returnId, planDays || undefined);
  }, [handlePaymentSuccess]);

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
        onPlay={onBack}
        onGoAccount={onGoAccount}
      />
    );
  }

  if (phase === 'processing') {
    return (
      <div className="scr packages-scr">
        <div className="pkg-pay-success">
          <p className="pkg-pay-success__icon" aria-hidden="true">⏳</p>
          <p className="pkg-pay-success__title">{pendingMsg || 'جاري تفعيل اشتراكك...'}</p>
          <p className="pkg-pay-success__exp">لا تغلق الصفحة — سيظهر كودك خلال ثوانٍ</p>
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

      {globalError ? <p className="pkg-moyasar-error" role="alert">{globalError}</p> : null}

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
