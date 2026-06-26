import { useCallback, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../../firebase';

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

/**
 * تسجيل دخول / حساب جديد بالبريد — اختياري، نفس النموذج للجميع (لاعب أو مشرف).
 */
export default function PlayerAuthScreen({ notify, compact = false, onSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode === 'register' ? 'register' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetErr = useCallback(() => {
    if (error) setError('');
  }, [error]);

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
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const name = displayName.trim().slice(0, 80);
        if (name) await updateProfile(cred.user, { displayName: name });
        notify('✅ تم إنشاء حسابك', 'success');
        afterAuth();
      } catch (err) {
        setError(mapAuthError(err?.code));
      } finally {
        setLoading(false);
      }
    },
    [email, password, displayName, notify, afterAuth]
  );

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
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

  return (
    <div>
      {!compact ? (
        <p className="psub" style={{ textAlign: 'center', marginBottom: 12 }}>
          اختياري — افتح شارة الساحة (+300 نقطة ترحيب)
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          className={`btn bgh ${mode === 'login' ? 'bo' : ''}`}
          style={{
            flex: 1,
            borderColor: mode === 'login' ? 'var(--gold)' : undefined,
            background: mode === 'login' ? 'rgba(201,127,26,.1)' : undefined,
          }}
          onClick={() => {
            setMode('login');
            resetErr();
          }}
        >
          دخول
        </button>
        <button
          type="button"
          className={`btn bgh ${mode === 'register' ? 'bo' : ''}`}
          style={{
            flex: 1,
            borderColor: mode === 'register' ? 'var(--gold)' : undefined,
            background: mode === 'register' ? 'rgba(201,127,26,.1)' : undefined,
          }}
          onClick={() => {
            setMode('register');
            resetErr();
          }}
        >
          حساب جديد
        </button>
      </div>

      <form className="card" onSubmit={mode === 'login' ? handleLogin : handleRegister}>
        <div className="ig">
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
          />
        </div>

        {mode === 'register' ? (
          <div className="ig" style={{ marginTop: 12 }}>
            <label className="lbl" htmlFor="pfcc-auth-name">
              الاسم (اختياري)
            </label>
            <input
              id="pfcc-auth-name"
              type="text"
              className="inp"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
            />
          </div>
        ) : null}

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
          />
        </div>

        {error ? (
          <div className="err-msg" style={{ marginTop: 12 }}>
            ⚠️ {error}
          </div>
        ) : null}

        <button type="submit" className="btn bg mt2" disabled={loading}>
          {loading ? '⏳…' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
        </button>
      </form>
    </div>
  );
}
