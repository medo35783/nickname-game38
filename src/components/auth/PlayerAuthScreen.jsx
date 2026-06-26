import { useCallback, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../../firebase';
import { ensurePlayerProfile, normalizeWhatsappPhone } from '../../firebaseHelpers';
import '../../styles/code-activation.css';

function mapAuthError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'هذا البريد مسجّل مسبقاً — جرّب تسجيل الدخول';
    case 'auth/invalid-email':
      return 'صيغة البريد غير صحيحة';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة (6 أحرف على الأقل)';
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
 * تسجيل دخول / حساب جديد — بعد تفعيل الكود.
 */
export default function PlayerAuthScreen({
  notify,
  compact = false,
  onSuccess,
  initialMode = 'login',
}) {
  const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMsg, setResetMsg] = useState('');

  const resetErr = useCallback(() => {
    if (error) setError('');
    if (resetMsg) setResetMsg('');
  }, [error, resetMsg]);

  const afterAuth = useCallback(() => {
    onSuccess?.();
  }, [onSuccess]);

  useEffect(() => {
    setMode(initialMode === 'register' ? 'register' : 'login');
  }, [initialMode]);

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
      if (!password || password.length < 6) {
        setError('كلمة المرور مطلوبة (6 أحرف على الأقل)');
        setLoading(false);
        return;
      }

      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(cred.user, { displayName: name.slice(0, 80) });
        await ensurePlayerProfile(cred.user.uid, {
          email: cred.user.email,
          displayName: name,
          phone,
        });
        notify('✅ تم إنشاء حسابك', 'success');
        afterAuth();
      } catch (err) {
        setError(mapAuthError(err?.code));
      } finally {
        setLoading(false);
      }
    },
    [email, password, displayName, phone, notify, afterAuth]
  );

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      setResetMsg('');
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        notify('✅ تم تسجيل الدخول', 'success');
        afterAuth();
      } catch (err) {
        setError(mapAuthError(err?.code));
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
      setResetMsg('✉️ أرسلنا رابط استعادة كلمة المرور — راجع بريدك (والبريد المزعج)');
      notify('تم إرسال رابط الاستعادة', 'success');
    } catch (err) {
      setError(mapResetError(err?.code));
    } finally {
      setResetLoading(false);
    }
  }, [email, notify]);

  return (
    <div className="auth-screen auth-screen--brand">
      {!compact ? (
        <p className="psub" style={{ textAlign: 'center', marginBottom: 12 }}>
          سجّل دخولك أو أنشئ حساباً جديداً
        </p>
      ) : null}

      <div className="auth-mode-tabs" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          className={`btn bgh auth-mode-btn${mode === 'login' ? ' is-on' : ''}`}
          style={{ flex: 1 }}
          onClick={() => {
            setMode('login');
            resetErr();
          }}
        >
          تسجيل دخول
        </button>
        <button
          type="button"
          className={`btn bgh auth-mode-btn${mode === 'register' ? ' is-on' : ''}`}
          style={{ flex: 1 }}
          onClick={() => {
            setMode('register');
            resetErr();
          }}
        >
          تسجيل جديد
        </button>
      </div>

      <form className="card" onSubmit={mode === 'login' ? handleLogin : handleRegister}>
        {mode === 'register' ? (
          <div className="ig">
            <label className="lbl" htmlFor="pfcc-auth-name">
              الاسم
            </label>
            <input
              id="pfcc-auth-name"
              type="text"
              className="inp"
              maxLength={80}
              placeholder="اسمك الكامل"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                resetErr();
              }}
              disabled={loading}
              required
            />
          </div>
        ) : null}

        {mode === 'register' ? (
          <div className="ig" style={{ marginTop: 12 }}>
            <label className="lbl" htmlFor="pfcc-auth-phone">
              رقم الجوال / واتساب
            </label>
            <input
              id="pfcc-auth-phone"
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
                resetErr();
              }}
              disabled={loading}
              required
            />
            <p className="code-act-phone-hint">
              📱 لتذكيرك قبل انتهاء الاشتراك وبناء قاعدة عملائك
            </p>
          </div>
        ) : null}

        <div className="ig" style={{ marginTop: mode === 'register' ? 12 : 0 }}>
          <label className="lbl" htmlFor="pfcc-auth-email">
            البريد
          </label>
          <input
            id="pfcc-auth-email"
            type="email"
            className={`inp${error ? ' err-b' : ''}`}
            placeholder="you@example.com"
            autoComplete="email"
            dir="ltr"
            style={{ textAlign: 'left' }}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              resetErr();
            }}
            disabled={loading}
            required
          />
        </div>

        <div className="ig" style={{ marginTop: 12 }}>
          <label className="lbl" htmlFor="pfcc-auth-password">
            كلمة المرور
          </label>
          <input
            id="pfcc-auth-password"
            type="password"
            className={`inp${error ? ' err-b' : ''}`}
            placeholder="••••••••"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            dir="ltr"
            style={{ textAlign: 'left' }}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              resetErr();
            }}
            disabled={loading}
            required
            minLength={6}
          />
        </div>

        {mode === 'login' ? (
          <button
            type="button"
            className="auth-forgot-link"
            onClick={() => void handleForgotPassword()}
            disabled={loading || resetLoading}
          >
            {resetLoading ? '⏳ جاري الإرسال…' : 'نسيت كلمة المرور؟'}
          </button>
        ) : null}

        {error ? (
          <div className="err-msg" style={{ marginTop: 12 }}>
            ⚠️ {error}
          </div>
        ) : null}

        {resetMsg ? (
          <div
            className="auth-reset-msg"
            style={{ marginTop: 12 }}
          >
            {resetMsg}
          </div>
        ) : null}

        <button type="submit" className="btn btn-bbrand mt2" disabled={loading}>
          {loading ? '⏳…' : mode === 'login' ? 'تسجيل الدخول' : 'تسجيل'}
        </button>
      </form>
    </div>
  );
}
