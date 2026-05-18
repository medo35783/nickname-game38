import { useCallback, useEffect, useState } from 'react';
import {
  EmailAuthProvider,
  linkWithCredential,
  signOut,
} from 'firebase/auth';
import { onValue, ref } from 'firebase/database';
import { auth, db } from '../../firebase';
import { formatCodeForDisplay } from '../../firebaseHelpers';
import PlayerAuthScreen from '../auth/PlayerAuthScreen';

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
      return 'هذا البريد مربوط بحساب آخر';
    case 'auth/weak-password':
      return 'كلمة المرور ضعيفة (6 أحرف على الأقل)';
    case 'auth/invalid-email':
      return 'صيغة البريد غير صحيحة';
    default:
      return 'تعذّر الربط — حاول مرة أخرى';
  }
}

/**
 * صفحة «حسابي»: اشتراك، تفعيل كود، تسجيل اختياري.
 */
export default function AccountPage({
  notify,
  activeCode,
  isCodeValid,
  isAdmin,
  onActivateCode,
  onGoPricing,
}) {
  const user = auth.currentUser;
  const [historyList, setHistoryList] = useState([]);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkEmail, setLinkEmail] = useState('');
  const [linkPass, setLinkPass] = useState('');
  const [linkPass2, setLinkPass2] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkErr, setLinkErr] = useState('');

  useEffect(() => {
    if (!user?.uid) return undefined;
    const unsub = onValue(ref(db, `users/${user.uid}/subscriptionHistory`), (snap) => {
      const h = snap.val() || {};
      const rows = Object.entries(h).map(([id, row]) => ({ id, ...row }));
      rows.sort((a, b) => (b.recordedAt || 0) - (a.recordedAt || 0));
      setHistoryList(rows);
    });
    return () => unsub();
  }, [user?.uid]);

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
        notify('✅ تم ربط بريدك — نفس الاشتراك على هذا الحساب', 'success');
        setShowLinkForm(false);
        setLinkEmail('');
        setLinkPass('');
        setLinkPass2('');
      } catch (err) {
        setLinkErr(mapLinkError(err?.code));
      } finally {
        setLinkLoading(false);
      }
    },
    [user, linkEmail, linkPass, linkPass2, notify]
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
        <p className="psub">جاري التحميل…</p>
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
      {isAdmin ? (
        <p className="psub" style={{ marginBottom: 12 }}>
          مشرف — تبويب «الأكواد» متاح في الشريط السفلي
        </p>
      ) : (
        <p className="psub" style={{ marginBottom: 12 }}>
          {isGuest ? 'ضيف — يمكنك اللعب وتفعيل الكود بدون بريد' : user.email}
        </p>
      )}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="ctitle">{activeOk ? '🎫 اشتراكاتي' : '💎 الاشتراك'}</div>
        {activeOk ? (
          <div style={{ marginTop: 10, fontSize: 13 }}>
            <div style={{ fontWeight: 800, color: 'var(--green)' }}>نشط</div>
            <div style={{ fontFamily: 'monospace', marginTop: 6 }}>
              {formatCodeForDisplay(activeCode.code)}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
              ينتهي: {formatTs(activeCode.expiresAt)}
            </div>
          </div>
        ) : (
          <p className="psub" style={{ marginTop: 8, marginBottom: 0 }}>
            لا يوجد اشتراك نشط
          </p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {!activeOk ? (
            <button type="button" className="btn bg" onClick={onGoPricing}>
              اشترك الآن
            </button>
          ) : null}
          <button type="button" className="btn bo" onClick={onActivateCode}>
            {activeOk ? 'تفعيل كود جديد' : 'تفعيل كود'}
          </button>
        </div>
      </div>

      {historyList.length > 0 ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ctitle">📜 سجل التفعيلات</div>
          <ul
            style={{
              margin: '10px 0 0',
              padding: '0 16px 0 0',
              fontSize: 12,
              lineHeight: 1.75,
            }}
          >
            {historyList.map((row) => (
              <li key={row.id} style={{ marginBottom: 6 }}>
                <strong style={{ color: 'var(--gold)' }}>{row.code}</strong> — {row.duration} يوم — ينتهي{' '}
                {formatTs(row.expiresAt)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {isGuest ? (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ctitle" style={{ marginBottom: 8 }}>
            تسجيل بالبريد (اختياري)
          </div>
          <PlayerAuthScreen notify={notify} compact />
          {activeOk && !showLinkForm ? (
            <button
              type="button"
              className="btn bgh mt2"
              style={{ fontSize: 12 }}
              onClick={() => setShowLinkForm(true)}
            >
              ربط البريد دون تغيير الاشتراك الحالي
            </button>
          ) : null}
          {showLinkForm ? (
            <form onSubmit={handleLinkEmail} style={{ marginTop: 12 }}>
              <p className="psub" style={{ marginBottom: 10, fontSize: 11 }}>
                يحفظ نفس حساب الضيف ونفس الكود
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
                  value={linkEmail}
                  onChange={(e) => {
                    setLinkEmail(e.target.value);
                    if (linkErr) setLinkErr('');
                  }}
                  disabled={linkLoading}
                />
              </div>
              <div className="ig" style={{ marginTop: 10 }}>
                <label className="lbl" htmlFor="link-pass">
                  كلمة مرور
                </label>
                <input
                  id="link-pass"
                  type="password"
                  className="inp"
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                  value={linkPass}
                  onChange={(e) => {
                    setLinkPass(e.target.value);
                    if (linkErr) setLinkErr('');
                  }}
                  disabled={linkLoading}
                />
              </div>
              <div className="ig" style={{ marginTop: 10 }}>
                <label className="lbl" htmlFor="link-pass2">
                  تأكيد كلمة المرور
                </label>
                <input
                  id="link-pass2"
                  type="password"
                  className="inp"
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                  value={linkPass2}
                  onChange={(e) => setLinkPass2(e.target.value)}
                  disabled={linkLoading}
                />
              </div>
              {linkErr ? (
                <div className="err-msg" style={{ marginTop: 10 }}>
                  ⚠️ {linkErr}
                </div>
              ) : null}
              <button type="submit" className="btn bo mt2" disabled={linkLoading}>
                {linkLoading ? '⏳…' : 'ربط البريد'}
              </button>
            </form>
          ) : null}
        </div>
      ) : (
        <div className="card" style={{ marginBottom: 12 }}>
          <div className="ctitle">البريد</div>
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 6, wordBreak: 'break-all' }}>
            {user.email}
          </div>
          {user.displayName ? (
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{user.displayName}</div>
          ) : null}
        </div>
      )}

      {!isGuest ? (
        <button type="button" className="btn bo" onClick={handleSignOut}>
          تسجيل الخروج
        </button>
      ) : null}
    </div>
  );
}
