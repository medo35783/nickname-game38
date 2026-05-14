import { useCallback, useMemo, useState } from 'react';
import { activateCode, saveUserActiveCode } from '../../firebaseHelpers';
import { db } from '../../firebase';

const SUBSCRIBER_UID_KEY = 'pfcc_subscriber_uid';

function getOrCreateSubscriberUserId() {
  try {
    let id = localStorage.getItem(SUBSCRIBER_UID_KEY);
    if (!id) {
      id = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
      localStorage.setItem(SUBSCRIBER_UID_KEY, id);
    }
    return id;
  } catch {
    return `guest_${Date.now()}`;
  }
}

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
  return 'حدث خطأ، يرجى المحاولة مرة أخرى';
}

/** شاشة تفعيل كود الاشتراك للمستخدمين العاديين. */
export default function CodeActivation({ onActivationSuccess, notify, onBack }) {
  void db;

  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const deviceInfo = useMemo(() => buildDeviceInfo(), []);

  const normalizedCode = useMemo(() => {
    const t = codeInput.trim().toUpperCase();
    return t.replace(/\s+/g, '');
  }, [codeInput]);

  const handleActivate = useCallback(async () => {
    if (loading) return;
    setError('');
    if (!normalizedCode) {
      setError('الكود غير صحيح');
      return;
    }

    setLoading(true);
    try {
      const userId = getOrCreateSubscriberUserId();
      const codeData = await activateCode(normalizedCode, userId, deviceInfo);
      await saveUserActiveCode(userId, codeData);
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
    notify('👆 اختر تبويب «الباقات» من الشريط السفلي', 'info');
  }, [notify]);

  const freeTrial = useCallback(() => {
    notify('🎁 التجربة المجانية قريباً — تابعنا!', 'info');
  }, [notify]);

  return (
    <div className="scr">
      {onBack ? (
        <div style={{ marginBottom: '16px' }}>
          <button type="button" className="btn bgh bsm" onClick={onBack} style={{ width: 'auto' }}>
            ← رجوع
          </button>
        </div>
      ) : null}
      <div style={{ textAlign: 'center', padding: '12px 0 14px' }}>
        <div className="ptitle" style={{ fontSize: 22 }}>
          🎮 مرحباً بك في PFCC!
        </div>
        <p className="psub" style={{ marginBottom: 14 }}>
          لبدء اللعب، يرجى تفعيل كود الاشتراك
        </p>
      </div>

      <div className="card">
        <div className="ig">
          <label className="lbl" htmlFor="pfcc-code-inp">
            كود الاشتراك
          </label>
          <input
            id="pfcc-code-inp"
            className={`inp big${error ? ' err-b' : ''}`}
            placeholder="CODE-XXXXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value);
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
