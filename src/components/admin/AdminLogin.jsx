import { useState, useCallback } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { adminProfileExistsForUid } from '../../firebaseHelpers';

/**
 * شاشة تسجيل دخول المشرف (Email/Password + التحقق من وجود UID تحت admins/ أو admin/)
 * @param {{ onLoginSuccess: () => void; notify: (text: string, type?: string) => void }} props
 */
export default function AdminLogin({ onLoginSuccess, notify }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const uid = userCredential.user.uid;

        const isAdmin = await adminProfileExistsForUid(uid);
        if (!isAdmin) {
          throw new Error('ليس لديك صلاحيات مشرف');
        }

        localStorage.setItem('pfcc_is_admin', 'true');
        localStorage.setItem('pfcc_admin_uid', uid);

        notify('✅ تم تسجيل الدخول بنجاح', 'success');
        onLoginSuccess();
      } catch (err) {
        if (err?.code === 'auth/user-not-found') {
          setError('البريد الإلكتروني غير موجود');
        } else if (err?.code === 'auth/wrong-password') {
          setError('كلمة المرور غير صحيحة');
        } else if (err?.message?.includes('صلاحيات')) {
          setError(err.message);
        } else {
          setError('حدث خطأ، يرجى المحاولة مرة أخرى');
        }
      } finally {
        setLoading(false);
      }
    },
    [email, password, notify, onLoginSuccess]
  );

  return (
    <div className="scr">
      <div style={{ textAlign: 'center', padding: '12px 0 18px' }}>
        <div style={{ fontSize: 48, lineHeight: 1.2, marginBottom: 8 }}>🔐</div>
        <div className="ptitle" style={{ fontSize: 22 }}>
          تسجيل دخول المشرف
        </div>
        <p className="psub" style={{ marginBottom: 0 }}>
          أدخل بيانات الحساب المصرّح به في لوحة التحكم
        </p>
      </div>

      <form className="card" onSubmit={handleLogin}>
        <div className="ig">
          <label className="lbl" htmlFor="admin-login-email">
            البريد الإلكتروني
          </label>
          <input
            id="admin-login-email"
            type="email"
            className={`inp${error ? ' err-b' : ''}`}
            placeholder="you@example.com"
            autoComplete="email"
            dir="ltr"
            style={{ textAlign: 'left' }}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError('');
            }}
            disabled={loading}
          />
        </div>

        <div className="ig" style={{ marginTop: 14 }}>
          <label className="lbl" htmlFor="admin-login-password">
            كلمة المرور
          </label>
          <input
            id="admin-login-password"
            type="password"
            className={`inp${error ? ' err-b' : ''}`}
            placeholder="••••••••"
            autoComplete="current-password"
            dir="ltr"
            style={{ textAlign: 'left' }}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError('');
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
          {loading ? '⏳ جاري التحقق…' : 'تسجيل الدخول'}
        </button>
      </form>
    </div>
  );
}
