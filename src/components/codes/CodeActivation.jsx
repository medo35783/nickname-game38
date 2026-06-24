import { useCallback, useMemo, useState } from 'react';
import { activateCode, normalizeSubscriptionCode, formatCodeForDisplay } from '../../firebaseHelpers';
import { auth } from '../../firebase';
import { PLATFORM_NAME, ARENA_BACK_LABEL } from '../../core/constants';
import GameTopNav from '../../shared/GameTopNav';

/** بصمة جهاز بسيطة: userAgent + أبعاد الشاشة → base64 (آمن لمسار RTDB) */
function buildDeviceInfo() {
  const raw = `${navigator.userAgent}${screen.width}${screen.height}`;
  let encoded;
  try {
    encoded = btoa(raw);
  } catch {
    encoded = btoa(raw.replace(/[^\x00-\x7F]/g, '_'));
  }
  const fingerprint = encoded.replace(/[.#$\[\]/]/g, '_');
  return {
    fingerprint,
    userAgent: navigator.userAgent,
    width: screen.width,
    height: screen.height
  };
}

function mapActivationError(message) {
  const m = (message || '').trim();
  if (m.includes('الكود غير صحيح') || m.includes('الكود غير موجود')) {
    return 'الكود غير صحيح';
  }
  if (m.includes('منتهي')) {
    return 'الكود منتهي الصلاحية';
  }
  if (m.includes('الحد الأقصى للأجهزة') || m.includes('تجاوز')) {
    return 'تم تجاوز الحد الأقصى للأجهزة (2)';
  }
  if (m.includes('مُفعّل على حساب آخر')) {
    return 'الكود مُفعّل على جهاز/حساب آخر';
  }
  if (m.includes('صلاحية التفعيل')) {
    return m;
  }
  if (m.includes('تسجيل الدخول')) {
    return 'جاري الاتصال… أعد المحاولة بعد ثوانٍ';
  }
  return 'حدث خطأ، يرجى المحاولة مرة أخرى';
}

/** شاشة تفعيل كود الاشتراك للمستخدمين العاديين. */
export default function CodeActivation({ onActivationSuccess, notify, onBack, backLabel = ARENA_BACK_LABEL }) {
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const deviceInfo = useMemo(() => buildDeviceInfo(), []);

  const normalizedCode = useMemo(() => normalizeSubscriptionCode(codeInput), [codeInput]);

  const handleActivate = useCallback(async () => {
    if (loading) return;
    setError('');
    if (!normalizedCode || !/^[A-Z0-9]{6}$/.test(formatCodeForDisplay(normalizedCode))) {
      setError('أدخل 6 أحرف أو أرقام');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      const msg = 'جاري الاتصال… أعد المحاولة بعد ثوانٍ';
      setError(msg);
      notify(msg, 'error');
      return;
    }

    setLoading(true);
    try {
      const codeData = await activateCode(normalizedCode, user.uid, deviceInfo);
      onActivationSuccess(codeData);
    } catch (e) {
      const msg = mapActivationError(e?.message);
      setError(msg);
      notify(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [loading, normalizedCode, deviceInfo, notify, onActivationSuccess]);

  const goPackages = useCallback(() => {
    window.dispatchEvent(new CustomEvent('pfcc-open-packages'));
    onBack?.();
  }, [onBack]);

  const freeTrial = useCallback(() => {
    notify('🎁 التجربة المجانية قريباً — تابعنا!', 'info');
  }, [notify]);

  return (
    <div className="scr">
      {onBack ? <GameTopNav onBack={onBack} variant="arena" label={backLabel} /> : null}
      <div style={{ textAlign: 'center', padding: '12px 0 14px' }}>
        <div className="ptitle" style={{ fontSize: 22 }}>
          🎮 مرحباً بك في {PLATFORM_NAME}!
        </div>
        <p className="psub" style={{ marginBottom: 14 }}>
          أدخل كود الاشتراك (6 أحرف) — لا يتطلب تسجيل بريد
        </p>
      </div>

      <div className="card">
        <div className="ig">
          <label className="lbl" htmlFor="pfcc-code-inp">
            كود الاشتراك (6 أحرف)
          </label>
          <input
            id="pfcc-code-inp"
            className={`inp big${error ? ' err-b' : ''}`}
            placeholder="مثال: KYEFA8"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={6}
            value={codeInput}
            onChange={(e) => {
              const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
              setCodeInput(v);
              if (error) setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleActivate();
            }}
            disabled={loading}
          />
        </div>
        {error ? <div className="err-msg">⚠️ {error}</div> : null}

        <button
          type="button"
          className="btn bg mt2"
          disabled={loading}
          onClick={handleActivate}
        >
          {loading ? '⏳ جاري التحقق…' : '✅ تفعيل الكود'}
        </button>
      </div>

      <div className="card ann ag" style={{ textAlign: 'right' }}>
        <div className="ctitle" style={{ marginBottom: 8 }}>
          ℹ️ ملاحظات مهمة
        </div>
        <ul
          style={{
            margin: 0,
            padding: '0 18px 0 0',
            fontSize: 12,
            color: 'var(--muted)',
            lineHeight: 1.85
          }}
        >
          <li>الكود يعمل على جهازين كحد أقصى</li>
          <li>صالح لحين التفعيل</li>
          <li>يبدأ العداد من لحظة التفعيل</li>
        </ul>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button type="button" className="btn bo" onClick={goPackages}>
          💳 شراء اشتراك جديد
        </button>
        <button type="button" className="btn bo" onClick={freeTrial}>
          🎁 تجربة مجانية
        </button>
      </div>
    </div>
  );
}