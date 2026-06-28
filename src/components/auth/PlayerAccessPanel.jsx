import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../../firebase';
import {
  activateCode,
  ensurePlayerProfile,
  formatCodeForDisplay,
  normalizeSubscriptionCode,
  normalizeWhatsappPhone,
  saveCodePhone,
} from '../../firebaseHelpers';
import { ARENA_WELCOME_BONUS } from '../../core/arena.constants';
import {
  buildDeviceInfo,
  CODE_TAB_PERKS,
  mapActivationError,
} from './playerAccessHelpers';
import {
  clearLoginAttempts,
  formatCooldownSeconds,
  getLoginCooldownMs,
  recordLoginFailure,
  validateRegisterPassword,
} from '../../core/authRateLimit';
import '../../styles/code-activation.css';

const ACCESS_MODES = ['code', 'login', 'register'];

function normalizeMode(mode) {
  return ACCESS_MODES.includes(mode) ? mode : 'code';
}

function mapAuthError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'هذا البريد مسجّل مسبقاً — جرّب تسجيل الدخول';
    case 'auth/credential-already-in-use':
      return 'هذا البريد مربوط بحساب آخر — جرّب تسجيل الدخول';
    case 'auth/invalid-email':
      return 'صيغة البريد غير صحيحة';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة — 8 أحرف على الأقل مع حروف وأرقام';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'البريد أو كلمة المرور غير صحيحة';
    case 'auth/too-many-requests':
      return 'محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة';
    default:
      return 'حدث خطأ، حاول مرة أخرى';
  }
}

function mapResetError(code) {
  switch (code) {
    case 'auth/invalid-email':
      return 'أدخل بريداً صحيحاً أولاً';
    case 'auth/user-not-found':
      return 'لا يوجد حساب بهذا البريد';
    case 'auth/too-many-requests':
      return 'محاولات كثيرة — انتظر قليلاً';
    default:
      return 'تعذّر إرسال الرابط — حاول لاحقاً';
  }
}

/**
 * لوحة موحّدة: تفعيل كود | دخول | تسجيل
 */
export default function PlayerAccessPanel({
  notify,
  compact = false,
  onSuccess,
  initialMode = 'code',
  onCodeActivated,
  codeAlreadyActive = false,
  activeCodeId = null,
}) {
  const [mode, setMode] = useState(() => normalizeMode(initialMode));
  const [codeInput, setCodeInput] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [codeJustActivated, setCodeJustActivated] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const deviceInfo = useMemo(() => buildDeviceInfo(), []);
  const normalizedCode = useMemo(() => normalizeSubscriptionCode(codeInput), [codeInput]);

  const resetAuthErr = useCallback(() => {
    if (error) setError('');
    if (resetMsg) setResetMsg('');
  }, [error, resetMsg]);

  const switchMode = useCallback(
    (next) => {
      setMode(normalizeMode(next));
      resetAuthErr();
      setCodeError('');
    },
    [resetAuthErr]
  );

  useEffect(() => {
    setMode(normalizeMode(initialMode));
    setError('');
    setResetMsg('');
    setCodeError('');
  }, [initialMode]);

  const afterAuth = useCallback(() => {
    onSuccess?.();
  }, [onSuccess]);

  const handleActivateCode = useCallback(async () => {
    if (codeLoading) return;
    setCodeError('');

    if (!normalizedCode || !/^[A-Z0-9]{6}$/.test(formatCodeForDisplay(normalizedCode))) {
      setCodeError('أدخل 6 أحرف أو أرقام');
      return;
    }

    const user = auth.currentUser;
    if (!user) {
      const msg = 'جاري الاتصال… أعد المحاولة بعد ثوانٍ';
      setCodeError(msg);
      notify?.(msg, 'error');
      return;
    }

    setCodeLoading(true);
    try {
      const codeData = await activateCode(normalizedCode, user.uid, deviceInfo);
      setCodeJustActivated(true);
      onCodeActivated?.(codeData);
      notify?.('✅ تم تفعيل الكود', 'success');
    } catch (e) {
      const msg = mapActivationError(e?.message);
      setCodeError(msg);
      notify?.(msg, 'error');
    } finally {
      setCodeLoading(false);
    }
  }, [codeLoading, normalizedCode, deviceInfo, notify, onCodeActivated]);

  const handleRegister = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setResetMsg('');

      const name = displayName.trim();
      if (!name) {
        setError('الاسم مطلوب');
        setLoading(false);
        return;
      }
      if (!email.trim()) {
        setError('البريد مطلوب');
        setLoading(false);
        return;
      }
      if (!normalizeWhatsappPhone(phone)) {
        setError('رقم الجوال مطلوب — مثال: 05xxxxxxxx');
        setLoading(false);
        return;
      }
      const passErr = validateRegisterPassword(password);
      if (passErr) {
        setError(passErr);
        setLoading(false);
        return;
      }

      try {
        const user = auth.currentUser;
        if (user?.isAnonymous) {
          const cred = EmailAuthProvider.credential(email.trim(), password);
          await linkWithCredential(user, cred);
          await updateProfile(user, { displayName: name.slice(0, 80) });
          await ensurePlayerProfile(user.uid, {
            email: user.email,
            displayName: name,
            phone,
          });
          if (activeCodeId) {
            await saveCodePhone(activeCodeId, phone);
          }
          if (!user.emailVerified) {
            try {
              await sendEmailVerification(user);
              notify?.('✉️ أرسلنا رابط تأكيد لبريدك', 'info');
            } catch {
              /* optional */
            }
          }
          notify?.(`✅ تم التسجيل — +${ARENA_WELCOME_BONUS} نقطة ترحيب`, 'success');
        } else {
          const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
          await updateProfile(cred.user, { displayName: name.slice(0, 80) });
          await ensurePlayerProfile(cred.user.uid, {
            email: cred.user.email,
            displayName: name,
            phone,
          });
          try {
            await sendEmailVerification(cred.user);
            notify?.('✉️ أرسلنا رابط تأكيد لبريدك', 'info');
          } catch {
            /* optional */
          }
          notify?.('✅ تم إنشاء حسابك', 'success');
        }
        afterAuth();
      } catch (err) {
        setError(mapAuthError(err?.code));
      } finally {
        setLoading(false);
      }
    },
    [email, password, displayName, phone, activeCodeId, notify, afterAuth]
  );

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setResetMsg('');

      const cooldownMs = getLoginCooldownMs();
      if (cooldownMs > 0) {
        setError(`انتظر ${formatCooldownSeconds(cooldownMs)} ثانية قبل المحاولة مجدداً`);
        setLoading(false);
        return;
      }

      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        clearLoginAttempts();
        notify?.('✅ تم تسجيل الدخول', 'success');
        afterAuth();
      } catch (err) {
        recordLoginFailure(auth.currentUser?.uid);
        const afterCooldown = getLoginCooldownMs();
        if (afterCooldown > 0) {
          setError(
            `محاولات متكررة — انتظر ${formatCooldownSeconds(afterCooldown)} ثانية`
          );
        } else {
          setError(mapAuthError(err?.code));
        }
      } finally {
        setLoading(false);
      }
    },
    [email, password, notify, afterAuth]
  );

  const handleForgotPassword = useCallback(async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('أدخل بريدك أولاً ثم اضغط «نسيت كلمة المرور»');
      return;
    }
    setResetLoading(true);
    setError('');
    setResetMsg('');
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setResetMsg(
        '✉️ تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني. (تفقّد صندوق الوارد أو البريد غير الهام).'
      );
      notify?.('تم إرسال رابط إعادة التعيين', 'success');
    } catch (err) {
      setError(mapResetError(err?.code));
    } finally {
      setResetLoading(false);
    }
  }, [email, notify]);

  const showCodeSuccess = codeAlreadyActive || codeJustActivated;

  return (
    <div className="auth-screen auth-screen--brand player-access-panel">
      {!compact ? (
        <p className="psub" style={{ textAlign: 'center', marginBottom: 12 }}>
          فعّل كودك أو سجّل دخولك — بدون تعقيد
        </p>
      ) : null}

      <div className="auth-mode-tabs player-access-tabs" role="tablist" aria-label="الدخول والاشتراك">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'code'}
          className={`btn bgh auth-mode-btn${mode === 'code' ? ' is-on' : ''}`}
          onClick={() => switchMode('code')}
        >
          🔑 تفعيل كود
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'login'}
          className={`btn bgh auth-mode-btn${mode === 'login' ? ' is-on' : ''}`}
          onClick={() => switchMode('login')}
        >
          دخول
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={`btn bgh auth-mode-btn${mode === 'register' ? ' is-on' : ''}`}
          onClick={() => switchMode('register')}
        >
          تسجيل
        </button>
      </div>

      {mode === 'code' ? (
        <div className="player-access-panel__body" role="tabpanel">
          {showCodeSuccess ? (
            <div className="player-access-code-done">
              <div className="player-access-code-done__icon" aria-hidden>
                ✅
              </div>
              <p className="player-access-code-done__title">
                {codeJustActivated ? 'تم تفعيل الكود!' : 'اشتراكك مفعّل'}
              </p>
              <p className="psub" style={{ fontSize: 11, marginBottom: 10, textAlign: 'center' }}>
                يمكنك اللعب الآن — أو سجّل حساباً لحفظ اشتراكك ومميزاتك
              </p>
              <button type="button" className="btn btn-bbrand" onClick={() => switchMode('register')}>
                تسجيل جديد — احفظ اشتراكك
              </button>
              <button type="button" className="code-act-signup__link" onClick={() => switchMode('login')}>
                لديك حساب؟ سجّل دخول
              </button>
            </div>
          ) : (
            <>
              <div className="ig">
                <label className="lbl" htmlFor="pap-code-inp">
                  كود الاشتراك (6 أحرف)
                </label>
                <input
                  id="pap-code-inp"
                  className={`inp big${codeError ? ' err-b' : ''}`}
                  placeholder="مثال: KYEFA8"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  maxLength={6}
                  value={codeInput}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                    setCodeInput(v);
                    if (codeError) setCodeError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleActivateCode();
                  }}
                  disabled={codeLoading}
                />
              </div>

              {codeError ? <div className="err-msg">⚠️ {codeError}</div> : null}

              <button
                type="button"
                className="btn btn-bbrand mt2"
                disabled={codeLoading}
                onClick={() => void handleActivateCode()}
              >
                {codeLoading ? '⏳ جاري التحقق…' : '✅ تفعيل الكود'}
              </button>

              <p className="code-act-notes__single" style={{ marginTop: 12 }}>
                ℹ️ يبدأ العداد من لحظة التفعيل — لا حاجة للتسجيل للعب الآن
              </p>
            </>
          )}

          <div className="player-access-perks">
            <p className="player-access-perks__title">لماذا تسجّل حساباً؟</p>
            <ul className="arena-prompt__benefits code-act-signup__perks">
              {CODE_TAB_PERKS.map((b) => (
                <li key={b.text}>
                  <span aria-hidden>{b.icon}</span>
                  {b.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {mode === 'login' ? (
        <form className="player-access-panel__body player-access-form" role="tabpanel" onSubmit={handleLogin}>
          <p className="psub" style={{ fontSize: 11, marginBottom: 10 }}>
            للمسجّلين سابقاً — أدخل بريدك وكلمة المرور
          </p>

          <div className="ig">
            <label className="lbl" htmlFor="pap-auth-email">
              البريد
            </label>
            <input
              id="pap-auth-email"
              type="email"
              className={`inp${error ? ' err-b' : ''}`}
              placeholder="you@example.com"
              autoComplete="email"
              dir="ltr"
              style={{ textAlign: 'left' }}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                resetAuthErr();
              }}
              disabled={loading}
              required
            />
          </div>

          <div className="ig" style={{ marginTop: 12 }}>
            <label className="lbl" htmlFor="pap-auth-password">
              كلمة المرور
            </label>
            <input
              id="pap-auth-password"
              type="password"
              className={`inp${error ? ' err-b' : ''}`}
              placeholder="••••••••"
              autoComplete="current-password"
              dir="ltr"
              style={{ textAlign: 'left' }}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                resetAuthErr();
              }}
              disabled={loading}
              required
              minLength={6}
            />
          </div>

          <button
            type="button"
            className="auth-forgot-link"
            onClick={() => void handleForgotPassword()}
            disabled={loading || resetLoading}
          >
            {resetLoading ? '⏳ جاري الإرسال…' : 'نسيت كلمة المرور؟'}
          </button>

          {error ? (
            <div className="err-msg" style={{ marginTop: 12 }}>
              ⚠️ {error}
            </div>
          ) : null}

          {resetMsg ? (
            <div className="auth-reset-msg" style={{ marginTop: 12 }}>
              {resetMsg}
            </div>
          ) : null}

          <button type="submit" className="btn btn-bbrand mt2" disabled={loading}>
            {loading ? '⏳…' : 'تسجيل الدخول'}
          </button>
        </form>
      ) : null}

      {mode === 'register' ? (
        <form className="player-access-panel__body player-access-form" role="tabpanel" onSubmit={handleRegister}>
          <p className="psub" style={{ fontSize: 11, marginBottom: 10 }}>
            دقيقة واحدة — احفظ اشتراكك وشاراتك بين الأجهزة
          </p>

          <div className="ig">
            <label className="lbl" htmlFor="pap-auth-name">
              الاسم
            </label>
            <input
              id="pap-auth-name"
              type="text"
              className="inp"
              maxLength={80}
              placeholder="اسمك الكامل"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                resetAuthErr();
              }}
              disabled={loading}
              required
            />
          </div>

          <div className="ig" style={{ marginTop: 12 }}>
            <label className="lbl" htmlFor="pap-auth-phone">
              رقم الجوال / واتساب
            </label>
            <input
              id="pap-auth-phone"
              type="tel"
              className="inp"
              placeholder="05xxxxxxxx"
              autoComplete="tel"
              dir="ltr"
              style={{ textAlign: 'left' }}
              inputMode="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                resetAuthErr();
              }}
              disabled={loading}
              required
            />
          </div>

          <div className="ig" style={{ marginTop: 12 }}>
            <label className="lbl" htmlFor="pap-reg-email">
              البريد
            </label>
            <input
              id="pap-reg-email"
              type="email"
              className={`inp${error ? ' err-b' : ''}`}
              placeholder="you@example.com"
              autoComplete="email"
              dir="ltr"
              style={{ textAlign: 'left' }}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                resetAuthErr();
              }}
              disabled={loading}
              required
            />
          </div>

          <div className="ig" style={{ marginTop: 12 }}>
            <label className="lbl" htmlFor="pap-reg-password">
              كلمة المرور
            </label>
            <input
              id="pap-reg-password"
              type="password"
              className={`inp${error ? ' err-b' : ''}`}
              placeholder="••••••••"
              autoComplete="new-password"
              dir="ltr"
              style={{ textAlign: 'left' }}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                resetAuthErr();
              }}
              disabled={loading}
              required
              minLength={8}
            />
          </div>

          {error ? (
            <div className="err-msg" style={{ marginTop: 12 }}>
              ⚠️ {error}
            </div>
          ) : null}

          <button type="submit" className="btn btn-bbrand mt2" disabled={loading}>
            {loading ? '⏳…' : 'تسجيل'}
          </button>
        </form>
      ) : null}
    </div>
  );
}
