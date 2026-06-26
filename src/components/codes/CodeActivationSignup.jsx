import { useCallback, useState } from 'react';
import { EmailAuthProvider, linkWithCredential, updateProfile } from 'firebase/auth';
import { auth } from '../../firebase';
import { ensurePlayerProfile, saveCodePhone, normalizeWhatsappPhone } from '../../firebaseHelpers';
import { ARENA_WELCOME_BONUS } from '../../core/arena.constants';

const SIGNUP_PERKS = [
  { icon: '🔐', text: 'ارجع للعبة بدون كود — اشتراكك محفوظ في حسابك' },
  { icon: '📚', text: 'حفظ أسئلتك — لا تتكرر لنفس اللاعبين بين جلساتك' },
  { icon: '🏅', text: 'شارات مخصصة تظهر في كل الألعاب' },
  { icon: '⭐', text: `نقاط الساحة والإنجازات — ابدأ بـ +${ARENA_WELCOME_BONUS} نقطة ترحيب` },
  { icon: '📱', text: 'تذكير واتساب قبل انتهاء اشتراكك' },
];

function mapRegisterError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'هذا البريد مربوط بحساب آخر — جرّب تسجيل الدخول';
    case 'auth/invalid-email':
      return 'صيغة البريد غير صحيحة';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة (6 أحرف على الأقل)';
    default:
      return 'تعذّر التسجيل — حاول مرة أخرى';
  }
}

/**
 * بعد تفعيل الكود — دعوة للتسجيل ثم نموذج كامل (اسم · جوال · بريد · كلمة مرور)
 */
export default function CodeActivationSignup({
  codeId,
  notify,
  onDone,
  onRequestLogin,
}) {
  const [showForm, setShowForm] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const finish = useCallback(() => {
    onDone?.();
  }, [onDone]);

  const handleRegister = useCallback(
    async (e) => {
      e.preventDefault();
      if (loading) return;
      setError('');

      const name = displayName.trim();
      if (!name) {
        setError('الاسم مطلوب');
        return;
      }
      if (!email.trim()) {
        setError('البريد مطلوب');
        return;
      }
      if (!normalizeWhatsappPhone(phone)) {
        setError('رقم الجوال مطلوب — مثال: 05xxxxxxxx');
        return;
      }
      if (!password || password.length < 6) {
        setError('كلمة المرور مطلوبة (6 أحرف على الأقل)');
        return;
      }

      const user = auth.currentUser;
      if (!user?.isAnonymous) {
        finish();
        return;
      }

      setLoading(true);
      try {
        const cred = EmailAuthProvider.credential(email.trim(), password);
        await linkWithCredential(user, cred);
        await updateProfile(user, { displayName: name.slice(0, 80) });
        await ensurePlayerProfile(user.uid, {
          email: user.email,
          displayName: name,
          phone,
        });
        if (codeId) {
          await saveCodePhone(codeId, phone);
        }
        notify?.(`✅ تم التسجيل — +${ARENA_WELCOME_BONUS} نقطة ترحيب`, 'success');
        finish();
      } catch (err) {
        setError(mapRegisterError(err?.code));
      } finally {
        setLoading(false);
      }
    },
    [loading, email, password, displayName, phone, codeId, notify, finish]
  );

  if (showForm) {
    return (
      <div className="card code-act-signup code-act-signup--form">
        <div className="ctitle" style={{ marginBottom: 8 }}>
          ✨ تسجيل جديد
        </div>
        <p className="psub" style={{ fontSize: 11, marginBottom: 12 }}>
          نفس الجهاز — اشتراكك يبقى مفعّلاً
        </p>

        <form onSubmit={handleRegister}>
          <div className="ig">
            <label className="lbl" htmlFor="cas-name">
              الاسم
            </label>
            <input
              id="cas-name"
              type="text"
              className={`inp${error && !displayName.trim() ? ' err-b' : ''}`}
              maxLength={80}
              placeholder="اسمك الكامل"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                if (error) setError('');
              }}
              disabled={loading}
              required
            />
          </div>

          <div className="ig" style={{ marginTop: 10 }}>
            <label className="lbl" htmlFor="cas-phone">
              رقم الجوال / واتساب
            </label>
            <input
              id="cas-phone"
              type="tel"
              className={`inp${error && !normalizeWhatsappPhone(phone) ? ' err-b' : ''}`}
              placeholder="05xxxxxxxx"
              autoComplete="tel"
              dir="ltr"
              style={{ textAlign: 'left' }}
              inputMode="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError('');
              }}
              disabled={loading}
              required
            />
            <p className="code-act-phone-hint">
              📱 لتذكيرك قبل انتهاء الاشتراك وبناء قاعدة عملائك
            </p>
          </div>

          <div className="ig" style={{ marginTop: 10 }}>
            <label className="lbl" htmlFor="cas-email">
              البريد
            </label>
            <input
              id="cas-email"
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
              required
            />
          </div>

          <div className="ig" style={{ marginTop: 10 }}>
            <label className="lbl" htmlFor="cas-pass">
              كلمة المرور
            </label>
            <input
              id="cas-pass"
              type="password"
              className="inp"
              placeholder="6 أحرف على الأقل"
              autoComplete="new-password"
              dir="ltr"
              style={{ textAlign: 'left' }}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              disabled={loading}
              required
              minLength={6}
            />
          </div>

          {error ? (
            <div className="err-msg" style={{ marginTop: 10 }}>
              ⚠️ {error}
            </div>
          ) : null}

          <button type="submit" className="btn btn-bbrand mt2" disabled={loading}>
            {loading ? '⏳ جاري التسجيل…' : '✅ تسجيل'}
          </button>

          {onRequestLogin ? (
            <button
              type="button"
              className="code-act-signup__link"
              onClick={() => onRequestLogin()}
              disabled={loading}
            >
              لديك حساب؟ سجّل دخول
            </button>
          ) : null}

          <button
            type="button"
            className="code-act-signup__skip"
            onClick={finish}
            disabled={loading}
          >
            ذكرني لاحقاً
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="card code-act-signup arena-prompt arena-prompt--compact">
      <div className="code-act-signup__success" aria-hidden>
        ✅
      </div>
      <div className="arena-prompt__title" style={{ textAlign: 'center', marginBottom: 4 }}>
        تم تفعيل الكود!
      </div>
      <p className="arena-prompt__sub" style={{ textAlign: 'center', marginBottom: 10 }}>
        سجّل الآن واستفد من مميزات الحساب — 30 ثانية
      </p>

      <ul className="arena-prompt__benefits code-act-signup__perks">
        {SIGNUP_PERKS.map((b) => (
          <li key={b.text}>
            <span aria-hidden>{b.icon}</span>
            {b.text}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="btn btn-bbrand arena-prompt__cta"
        onClick={() => setShowForm(true)}
      >
        تسجيل جديد — +{ARENA_WELCOME_BONUS} 🎁
      </button>

      {onRequestLogin ? (
        <button type="button" className="code-act-signup__link" onClick={() => onRequestLogin()}>
          لديك حساب؟ سجّل دخول
        </button>
      ) : null}

      <button type="button" className="arena-prompt__skip" onClick={finish}>
        ذكرني لاحقاً
      </button>
    </div>
  );
}
