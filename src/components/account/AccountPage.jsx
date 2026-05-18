import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EmailAuthProvider,
  linkWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { auth, db } from '../../firebase';
import { adminProfileExistsForUid, formatCodeForDisplay } from '../../firebaseHelpers';

function formatTs(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '—';
  }
}

function mapLinkError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'هذا البريد مربوط بحساب آخر — جرّب «دخول مشرف» إن كان لك، أو بريداً مختلفاً';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة (6 أحرف على الأقل)';
    case 'auth/invalid-email':
      return 'صيغة البريد غير صحيحة';
    case 'auth/requires-recent-login':
      return 'انتهت صلاحية الجلسة — سجّل خروجاً وأعد المحاولة';
    default:
      return 'تعذّر الربط — حاول مرة أخرى';
  }
}

function mapLoginErr(code) {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'البريد أو كلمة المرور غير صحيحة';
    default:
      return 'تعذّر تسجيل الدخول';
  }
}

/**
 * صفحة «حسابي»: ضيف + ربط بريد اختياري، أو حساب كامل بعد الربط/الدخول.
 * @param {{ notify: (t: string, ty?: string) => void; activeCode: object | null; isCodeValid: (c: object | null) => boolean }} props
 */
export default function AccountPage({ notify, activeCode, isCodeValid }) {
  const user = auth.currentUser;
  const [profile, setProfile] = useState(null);
  const [historyList, setHistoryList] = useState([]);

  const [linkEmail, setLinkEmail] = useState('');
  const [linkPass, setLinkPass] = useState('');
  const [linkPass2, setLinkPass2] = useState('');
  const [linkName, setLinkName] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkErr, setLinkErr] = useState('');

  const [admEmail, setAdmEmail] = useState('');
  const [admPass, setAdmPass] = useState('');
  const [admLoading, setAdmLoading] = useState(false);
  const [admErr, setAdmErr] = useState('');

  useEffect(() => {
    if (!user?.uid) return undefined;
    const base = ref(db, `users/${user.uid}`);
    const unsub = onValue(base, (snap) => {
      const v = snap.val() || {};
      setProfile(v.profile || null);
      const h = v.subscriptionHistory || {};
      const rows = Object.entries(h).map(([id, row]) => ({ id, ...row }));
      rows.sort((a, b) => (b.recordedAt || 0) - (a.recordedAt || 0));
      setHistoryList(rows);
    });
    return () => unsub();
  }, [user?.uid]);

  const stats = useMemo(() => {
    const totalSubs = historyList.length;
    const logins = profile?.totalLogins ?? 0;
    const hosted = profile?.gamesHosted ?? 0;
    return { totalSubs, logins, hosted };
  }, [historyList.length, profile]);

  const handleLinkEmail = useCallback(
    async (e) => {
      e.preventDefault();
      setLinkErr('');
      if (!user?.isAnonymous) return;
      if (linkPass !== linkPass2) {
        setLinkErr('كلمتا المرور غير متطابقتين');
        return;
      }
      setLinkLoading(true);
      try {
        const cred = EmailAuthProvider.credential(linkEmail.trim(), linkPass);
        await linkWithCredential(user, cred);
        const name = linkName.trim().slice(0, 80);
        if (name && auth.currentUser) {
          await updateProfile(auth.currentUser, { displayName: name });
        }
        notify('✅ تم ربط بريدك — اشتراكك محفوظ على هذا الحساب', 'success');
        setLinkEmail('');
        setLinkPass('');
        setLinkPass2('');
        setLinkName('');
      } catch (err) {
        setLinkErr(mapLinkError(err?.code));
      } finally {
        setLinkLoading(false);
      }
    },
    [user, linkEmail, linkPass, linkPass2, linkName, notify]
  );

  const handleAdminLogin = useCallback(
    async (e) => {
      e.preventDefault();
      setAdmErr('');
      setAdmLoading(true);
      try {
        await signInWithEmailAndPassword(auth, admEmail.trim(), admPass);
        const uid = auth.currentUser?.uid;
        const ok = uid ? await adminProfileExistsForUid(uid) : false;
        if (ok) {
          notify('✅ تم دخول المشرف', 'success');
        } else {
          notify('تم الدخول — هذا الحساب ليس مسجّلاً كمشرف في قاعدة البيانات', 'info');
        }
        setAdmEmail('');
        setAdmPass('');
      } catch (err) {
        setAdmErr(mapLoginErr(err?.code));
      } finally {
        setAdmLoading(false);
      }
    },
    [admEmail, admPass, notify]
  );

  const handleSignOut = async () => {
    try {
      localStorage.removeItem('pfcc_is_admin');
      localStorage.removeItem('pfcc_admin_uid');
      await signOut(auth);
      notify('تم تسجيل الخروج', 'info');
    } catch (e) {
      console.error(e);
      notify('تعذّر تسجيل الخروج', 'error');
    }
  };

  if (!user) {
    return (
      <div className="scr">
        <p className="psub">لا يوجد مستخدم</p>
      </div>
    );
  }

  const activeOk = activeCode && isCodeValid(activeCode);
  const isGuest = user.isAnonymous;

  return (
    <div className="scr" style={{ paddingBottom: 28 }}>
      <div className="ptitle" style={{ fontSize: 20 }}>
        👤 حسابي
      </div>
      <p className="psub" style={{ marginBottom: 12 }}>
        {isGuest ? 'وضع ضيف — فعّل الكود مباشرة، واربط البريد لاحقاً إن أحببت' : 'بياناتك واشتراكاتك'}
      </p>

      {isGuest ? (
        <div className="card ann ag" style={{ marginBottom: 12, textAlign: 'right' }}>
          <div className="ctitle" style={{ marginBottom: 8 }}>⚡ دخول سريع</div>
          <p className="psub" style={{ margin: 0, lineHeight: 1.75 }}>
            لا تحتاج بريداً للشراء أو التفعيل. إذا أردت حفظ الاشتراك بين الأجهزة أو رؤية السجل كاملاً، استخدم «احفظ
            اشتراكك» أدناه — نفس الحساب ونفس الكود بعد الربط.
          </p>
        </div>
      ) : null}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ctitle">البريد</div>
        <div style={{ fontSize: 14, fontWeight: 800, wordBreak: 'break-all', marginTop: 6 }}>
          {user.email || (
            <span style={{ color: 'var(--muted)', fontWeight: 700 }}>ضيف — لم يُربط بريد بعد</span>
          )}
        </div>
        {profile?.displayName ? (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>الاسم: {profile.displayName}</div>
        ) : null}
        {profile?.createdAt ? (
          <div style={{ fontSize: 11, color: 'var(--dim)', marginTop: 8 }}>
            عضو منذ {formatTs(profile.createdAt)}
          </div>
        ) : null}
      </div>

      {isGuest ? (
        <form className="card" style={{ marginBottom: 12 }} onSubmit={handleLinkEmail}>
          <div className="ctitle" style={{ marginBottom: 10 }}>
            💾 احفظ اشتراكك (اختياري)
          </div>
          <p className="psub" style={{ marginBottom: 12 }}>
            نفس حسابك الحالي — لن يتغيّر الكود بعد ربط البريد.
          </p>
          <div className="ig">
            <label className="lbl" htmlFor="link-email">
              البريد
            </label>
            <input
              id="link-email"
              type="email"
              className={`inp${linkErr ? ' err-b' : ''}`}
              dir="ltr"
              style={{ textAlign: 'left' }}
              autoComplete="email"
              value={linkEmail}
              onChange={(e) => {
                setLinkEmail(e.target.value);
                if (linkErr) setLinkErr('');
              }}
              disabled={linkLoading}
            />
          </div>
          <div className="ig" style={{ marginTop: 12 }}>
            <label className="lbl" htmlFor="link-name">
              اسم الظهور (اختياري)
            </label>
            <input
              id="link-name"
              type="text"
              className="inp"
              maxLength={80}
              value={linkName}
              onChange={(e) => setLinkName(e.target.value)}
              disabled={linkLoading}
            />
          </div>
          <div className="ig" style={{ marginTop: 12 }}>
            <label className="lbl" htmlFor="link-pass">
              كلمة مرور جديدة
            </label>
            <input
              id="link-pass"
              type="password"
              className="inp"
              dir="ltr"
              style={{ textAlign: 'left' }}
              autoComplete="new-password"
              value={linkPass}
              onChange={(e) => {
                setLinkPass(e.target.value);
                if (linkErr) setLinkErr('');
              }}
              disabled={linkLoading}
            />
          </div>
          <div className="ig" style={{ marginTop: 12 }}>
            <label className="lbl" htmlFor="link-pass2">
              تأكيد كلمة المرور
            </label>
            <input
              id="link-pass2"
              type="password"
              className="inp"
              dir="ltr"
              style={{ textAlign: 'left' }}
              autoComplete="new-password"
              value={linkPass2}
              onChange={(e) => {
                setLinkPass2(e.target.value);
                if (linkErr) setLinkErr('');
              }}
              disabled={linkLoading}
            />
          </div>
          {linkErr ? (
            <div className="err-msg" style={{ marginTop: 12 }}>
              ⚠️ {linkErr}
            </div>
          ) : null}
          <button type="submit" className="btn bg mt2" disabled={linkLoading}>
            {linkLoading ? '⏳ جاري الربط…' : 'ربط البريد وحفظ الاشتراك'}
          </button>
        </form>
      ) : null}

      {isGuest ? (
        <form className="card" style={{ marginBottom: 12 }} onSubmit={handleAdminLogin}>
          <div className="ctitle" style={{ marginBottom: 8 }}>🔐 دخول مشرف بالبريد</div>
          <p className="psub" style={{ marginBottom: 12 }}>
            يستبدل جلسة الضيف — للوصول إلى لوحة الأكواد فقط إن كان بريدك مسجّلاً كمشرف.
          </p>
          <div className="ig">
            <label className="lbl" htmlFor="adm-email">
              البريد
            </label>
            <input
              id="adm-email"
              type="email"
              className={`inp${admErr ? ' err-b' : ''}`}
              dir="ltr"
              style={{ textAlign: 'left' }}
              autoComplete="username"
              value={admEmail}
              onChange={(e) => {
                setAdmEmail(e.target.value);
                if (admErr) setAdmErr('');
              }}
              disabled={admLoading}
            />
          </div>
          <div className="ig" style={{ marginTop: 12 }}>
            <label className="lbl" htmlFor="adm-pass">
              كلمة المرور
            </label>
            <input
              id="adm-pass"
              type="password"
              className={`inp${admErr ? ' err-b' : ''}`}
              dir="ltr"
              style={{ textAlign: 'left' }}
              autoComplete="current-password"
              value={admPass}
              onChange={(e) => {
                setAdmPass(e.target.value);
                if (admErr) setAdmErr('');
              }}
              disabled={admLoading}
            />
          </div>
          {admErr ? (
            <div className="err-msg" style={{ marginTop: 12 }}>
              ⚠️ {admErr}
            </div>
          ) : null}
          <button type="submit" className="btn bo mt2" disabled={admLoading}>
            {admLoading ? '⏳…' : 'دخول المشرف'}
          </button>
        </form>
      ) : null}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ctitle">📊 ملخّص</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10 }}>
          <div style={{ textAlign: 'center', padding: 8, borderRadius: 10, background: 'rgba(255,255,255,.04)' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--gold)' }}>{stats.logins}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>دخول</div>
          </div>
          <div style={{ textAlign: 'center', padding: 8, borderRadius: 10, background: 'rgba(255,255,255,.04)' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--blue)' }}>{stats.totalSubs}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>تفعيلات</div>
          </div>
          <div style={{ textAlign: 'center', padding: 8, borderRadius: 10, background: 'rgba(255,255,255,.04)' }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--green)' }}>{stats.hosted}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>غرف (قريباً)</div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ctitle">🎫 الاشتراك الحالي</div>
        {activeOk ? (
          <div style={{ marginTop: 8, fontSize: 13 }}>
            <div style={{ fontWeight: 800, color: 'var(--green)' }}>نشط</div>
            <div style={{ fontFamily: 'monospace', marginTop: 6 }}>الكود: {formatCodeForDisplay(activeCode.code)}</div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              ينتهي: {formatTs(activeCode.expiresAt)}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
            لا يوجد اشتراك نشط — فعّل كوداً من الألعاب أو الباقات
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ctitle">📜 سجل التفعيلات</div>
        {historyList.length === 0 ? (
          <p className="psub" style={{ marginTop: 8, marginBottom: 0 }}>
            لا يوجد سجل بعد — بعد تفعيل أول كود يظهر هنا
          </p>
        ) : (
          <ul style={{ margin: '10px 0 0', padding: '0 16px 0 0', fontSize: 12, color: 'var(--text)', lineHeight: 1.75 }}>
            {historyList.map((row) => (
              <li key={row.id} style={{ marginBottom: 8 }}>
                <strong style={{ color: 'var(--gold)' }}>{row.code}</strong> — {row.duration} يوم — بدأ{' '}
                {formatTs(row.activatedAt)} — ينتهي {formatTs(row.expiresAt)}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card ann ag" style={{ textAlign: 'right', marginBottom: 12 }}>
        <div className="ctitle" style={{ marginBottom: 6 }}>🚀 قريباً</div>
        <ul style={{ margin: 0, padding: '0 18px 0 0', fontSize: 12, color: 'var(--muted)', lineHeight: 1.8 }}>
          <li>شارات حسب عدد الجولات والألعاب</li>
          <li>عدد الغرف التي استضفتها</li>
          <li>ربط إحصائيات اللعب بحسابك</li>
        </ul>
      </div>

      <button type="button" className="btn bo" onClick={handleSignOut}>
        🚪 تسجيل الخروج
      </button>
    </div>
  );
}
