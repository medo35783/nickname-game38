import { useCallback, useMemo, useState } from 'react';
import {
  activateCode,
  normalizeSubscriptionCode,
  sanitizeSubscriptionCodeInput,
  isValidSubscriptionCodeInput,
  isPlayCodeInput,
} from '../../firebaseHelpers';
import { auth } from '../../firebase';
import { PLATFORM_NAME, ARENA_BACK_LABEL } from '../../core/constants';
import GameTopNav from '../../shared/GameTopNav';
import CodeActivationSignup from './CodeActivationSignup';
import '../../styles/code-activation.css';

import { buildDeviceInfo, mapActivationError } from '../auth/playerAccessHelpers';
/**
 * شاشة تفعيل كود الاشتراك — الخطوة الأولى قبل التسجيل أو الدخول.
 */
export default function CodeActivation({
  onActivationSuccess,
  notify,
  onBack,
  backLabel = ARENA_BACK_LABEL,
  onRequestLogin,
  pendingAuthMode = null,
}) {
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activatedData, setActivatedData] = useState(null);

  const deviceInfo = useMemo(() => buildDeviceInfo(), []);

  const normalizedCode = useMemo(() => normalizeSubscriptionCode(codeInput), [codeInput]);

  const finishActivation = useCallback(
    (codeData, authModeAfter = null) => {
      onActivationSuccess(codeData ?? activatedData, authModeAfter ?? pendingAuthMode);
    },
    [onActivationSuccess, activatedData, pendingAuthMode]
  );

  const handleLoginRequest = useCallback(() => {
    if (activatedData) {
      finishActivation(activatedData, 'login');
      return;
    }
    onRequestLogin?.();
  }, [activatedData, finishActivation, onRequestLogin]);

  const handleActivate = useCallback(async () => {
    if (loading) return;
    setError('');

    if (!isValidSubscriptionCodeInput(codeInput)) {
      setError('أدخل كوداً صالحاً: 6 أحرف أو PLAY-XXXX-XXXX');
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

      if (user.isAnonymous) {
        setActivatedData(codeData);
      } else {
        onActivationSuccess(codeData, pendingAuthMode);
      }
    } catch (e) {
      const msg = mapActivationError(e?.message);
      setError(msg);
      notify(msg, 'error');
    } finally {
      setLoading(false);
    }
  }, [loading, normalizedCode, deviceInfo, notify, onActivationSuccess, pendingAuthMode]);

  const goPackages = useCallback(() => {
    window.dispatchEvent(new CustomEvent('pfcc-open-packages'));
    onBack?.();
  }, [onBack]);

  if (activatedData) {
    return (
      <div className="scr code-activation-scr">
        {onBack ? <GameTopNav onBack={() => finishActivation()} variant="arena" label={backLabel} /> : null}
        <CodeActivationSignup
          codeId={activatedData.id}
          notify={notify}
          onDone={() => finishActivation()}
          onRequestLogin={handleLoginRequest}
        />
      </div>
    );
  }

  return (
    <div className="scr code-activation-scr">
      {onBack ? <GameTopNav onBack={onBack} variant="arena" label={backLabel} /> : null}
      <div style={{ textAlign: 'center', padding: '12px 0 14px' }}>
        <div className="ptitle" style={{ fontSize: 22 }}>
          🎮 مرحباً بك في {PLATFORM_NAME}!
        </div>
        <p className="psub" style={{ marginBottom: 14 }}>
          أدخل كود اشتراكك للوصول الكامل للمنصة
        </p>
      </div>

      <div className="card">
        <div className="ig">
          <label className="lbl" htmlFor="pfcc-code-inp">
            كود الاشتراك
          </label>
          <input
            id="pfcc-code-inp"
            className={`inp big${isPlayCodeInput(codeInput) ? ' inp-code-play' : ''}${error ? ' err-b' : ''}`}
            placeholder="KYEFA8 أو PLAY-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={isPlayCodeInput(codeInput) ? 14 : 6}
            value={codeInput}
            onChange={(e) => {
              setCodeInput(sanitizeSubscriptionCodeInput(e.target.value));
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
          className="btn btn-bbrand mt2"
          disabled={loading}
          onClick={handleActivate}
        >
          {loading ? '⏳ جاري التحقق…' : '✅ تفعيل الكود'}
        </button>
      </div>

      <div className="card ann ag code-act-notes" style={{ textAlign: 'right' }}>
        <p className="code-act-notes__single">
          ℹ️ صالح لحين التفعيل — يبدأ العداد من لحظة التفعيل
        </p>
      </div>

      <button type="button" className="btn bo-bbrand" onClick={goPackages}>
        💳 شراء اشتراك جديد
      </button>
    </div>
  );
}
