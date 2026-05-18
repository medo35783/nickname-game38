import { useCallback, useState } from 'react';
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
 * تسجيل الدخول / إنشاء حساب بالبريد — يُعرض عند تعطيل الدخول المجهول أو كخيار اختياري.
 * @param {{ notify: (t: string, ty?: string) => void; variant?: 'default' | 'fallback' }} props
 */
export default function PlayerAuthScreen({ notify, variant = 'default' }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetErr = useCallback(() => {
    if (error) setError('');
  }, [error]);

  const handleRegister = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      try {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const name = displayName.trim().slice(0, 80);
        if (name) {
          await updateProfile(cred.user, { displayName: name });
        }
        notify('✅ تم إنشاء حسابك — مرحباً بك!', 'success');
      } catch (err) {
        setError(mapAuthError(err?.code));
      } finally {
        setLoading(false);
      }
    },
    [email, password, displayName, notify]
  );

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        notify('✅ تم تسجيل الدخول', 'success');
      } catch (err) {
        setError(mapAuthError(err?.code));
      } finally {
        setLoading(false);
      }
    },
    [email, password, notify]
  );

  return (
    <div className="scr" style={{ paddingBottom: 32 }}>
      <div style={{ textAlign: 'center', padding: '16px 0 12px' }}>
        <div style={{ fontSize: 52, lineHeight: 1.1, marginBottom: 6 }}>🎮</div>
        <div className="ptitle" style={{ fontSize: 22 }}>
          ساحة الألعاب — PFCC
        </div>
        <p className="psub" style={{ marginBottom: 0 }}>
          {variant === 'fallback'
            ? 'الدخول السريع غير متاح — فعّل «Anonymous» في Firebase أو سجّل بالبريد'
            : 'سجّل بالبريد لحفظ اشتراكك وسجلّك'}
        </p>
      </div>

      <div className="card ann ag" style={{ marginBottom: 14, textAlign: 'right' }}>
        <div className="ctitle" style={{ marginBottom: 8 }}>✨ لماذا التسجيل؟</div>
        <ul
          style={{
            margin: 0,
            padding: '0 18px 0 0',
            fontSize: 12,
            color: 'var(--muted)',
            lineHeight: 1.85,
          }}
        >
          <li>ربط أكواد الاشتراك بحسابك بين الأجهزة</li>
          <li>سجل اشتراكاتك السابقة داخل «حسابي»</li>
          <li>تجهيز مزايا قادمة: إحصائيات وشارات</li>
        </ul>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <button
          type="button"
          className={`btn bgh ${mode === 'login' ? 'bo' : ''}`}
          style={{
            flex: 1,
            borderColor: mode === 'login' ? 'var(--gold)' : undefined,
            background: mode === 'login' ? 'rgba(240,192,64,.1)' : undefined,
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
            background: mode === 'register' ? 'rgba(240,192,64,.1)' : undefined,
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
            البريد الإلكتروني
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
          <div className="ig" style={{ marginTop: 14 }}>
            <label className="lbl" htmlFor="pfcc-auth-name">
              اسم الظهور (اختياري)
            </label>
            <input
              id="pfcc-auth-name"
              type="text"
              className="inp"
              placeholder="مثال: أبو فيصل"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={loading}
            />
          </div>
        ) : null}

        <div className="ig" style={{ marginTop: 14 }}>
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
          <div className="err-msg" style={{ marginTop: 14 }}>
            ⚠️ {error}
          </div>
        ) : null}

        <button type="submit" className="btn bg mt2" disabled={loading}>
          {loading ? '⏳ جاري المعالجة…' : mode === 'login' ? 'تسجيل الدخول' : 'إنشاء الحساب'}
        </button>
      </form>

      <p className="psub" style={{ textAlign: 'center', marginTop: 16, fontSize: 11 }}>
        {variant === 'fallback'
          ? 'بعد الدخول يمكنك تفعيل الكود من الألعاب'
          : 'يمكنك أيضاً البدء كضيف ثم ربط البريد من «حسابي»'}
      </p>
    </div>
  );
}
