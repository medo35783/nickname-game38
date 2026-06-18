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
import ThemeToggle from '../layout/ThemeToggle';
import AccountKnowledgeBank from '../../shared/AccountKnowledgeBank';
import ArenaBadge from '../../shared/ArenaBadge';
import ArenaSignupPrompt from '../../shared/ArenaSignupPrompt';
import ArenaIconPicker from '../../shared/ArenaIconPicker';
import ArenaAchievementsGrid, { countUnlockedAchievements } from '../../shared/ArenaAchievementsGrid';
import ArenaPointsRewardsCard from '../../shared/ArenaPointsRewardsCard';
import ArenaBadgeSheet from '../../shared/ArenaBadgeSheet';
import ArenaHallOfFame from '../../shared/ArenaHallOfFame';
import useArenaProfile from '../../hooks/useArenaProfile';
import { ARENA_WELCOME_BONUS } from '../../core/arena.constants';
import { ARENA_ACHIEVEMENT_LIST } from '../../core/arenaAchievements';
import '../../styles/knowledge-chest.css';
import '../../styles/arena-badge.css';

const ACCOUNT_TABS = [
  { id: 'sub', label: 'الاشتراك', icon: '🎫' },
  { id: 'badge', label: 'الشارة', icon: '🏟️' },
  { id: 'more', label: 'المزيد', icon: '⚙️' },
];

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

function AccountStatsSummary({ stats, points, gamesHosted }) {
  if (!stats && !points && !gamesHosted) return null;
  const gp = stats?.gamesPlayed || {};
  const totalGames =
    (gp.titles || 0) + (gp.fameeri || 0) + (gp.hesbah || 0) || stats?.completedGames || 0;

  return (
    <div className="account-stats sg sg3" style={{ marginTop: 12, marginBottom: 0 }}>
      <div className="sbox">
        <div className="snum" style={{ fontSize: 18, color: 'var(--gold)' }}>
          {points || 0}
        </div>
        <div className="slbl">نقاط الساحة</div>
      </div>
      <div className="sbox">
        <div className="snum" style={{ fontSize: 18 }}>
          {totalGames}
        </div>
        <div className="slbl">جلسات ألعاب</div>
      </div>
      <div className="sbox">
        <div className="snum" style={{ fontSize: 18 }}>
          {gamesHosted || 0}
        </div>
        <div className="slbl">استضافة</div>
      </div>
    </div>
  );
}

/**
 * صفحة حسابي — تبويبات: اشتراك | شارة | المزيد
 */
export default function AccountPage({
  notify,
  activeCode,
  isCodeValid,
  isAdmin,
  onActivateCode,
  onGoPricing,
  onOpenContribute,
  theme = 'dark',
  followSystem = true,
  onSetTheme,
  onFollowSystem,
  initialAuthMode = 'login',
}) {
  const user = auth.currentUser;
  const [tab, setTab] = useState('sub');
  const {
    isRegistered,
    isGuest,
    localQuestionCount,
    refreshLocalCount,
    displayName,
    avatarIcon,
    avatarFrame,
    points,
    tier,
    tierProgress,
    setAvatarIcon,
    setDisplayName,
    gamesHosted,
    achievements,
  } = useArenaProfile();

  const [historyList, setHistoryList] = useState([]);
  const [userStats, setUserStats] = useState(null);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [iconSheetOpen, setIconSheetOpen] = useState(false);
  const [achSheetOpen, setAchSheetOpen] = useState(false);
  const [iconDraft, setIconDraft] = useState('');
  const [iconSaving, setIconSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameSaving, setNameSaving] = useState(false);
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

  useEffect(() => {
    if (!user?.uid || isGuest) {
      setUserStats(null);
      return undefined;
    }
    const unsub = onValue(ref(db, `users/${user.uid}/stats`), (snap) => {
      setUserStats(snap.val() || null);
    });
    return () => unsub();
  }, [user?.uid, isGuest]);

  useEffect(() => {
    refreshLocalCount();
  }, [refreshLocalCount, isGuest]);

  useEffect(() => {
    if (!editingName) setNameDraft(displayName);
  }, [displayName, editingName]);

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
        notify(`✅ تم ربط بريدك — +${ARENA_WELCOME_BONUS} نقطة ترحيب`, 'success');
        setShowLinkForm(false);
        setLinkEmail('');
        setLinkPass('');
        setLinkPass2('');
        setTab('badge');
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

  useEffect(() => {
    if (iconSheetOpen) setIconDraft(avatarIcon);
  }, [iconSheetOpen, avatarIcon]);

  const handleSaveIcon = async () => {
    if (!iconDraft || iconDraft === avatarIcon) {
      setIconSheetOpen(false);
      return;
    }
    setIconSaving(true);
    try {
      const ok = await setAvatarIcon(iconDraft);
      if (ok) {
        notify('✅ تم حفظ شارتك — ستبقى معك دائماً', 'success');
        setIconSheetOpen(false);
      } else {
        notify('تعذّر الحفظ — الأيقونة مقفلة أو غير متاحة', 'error');
      }
    } finally {
      setIconSaving(false);
    }
  };

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      notify('أدخل اسماً', 'error');
      return;
    }
    setNameSaving(true);
    try {
      const ok = await setDisplayName(trimmed);
      if (ok) {
        notify('✅ تم تحديث الاسم', 'success');
        setEditingName(false);
      }
    } finally {
      setNameSaving(false);
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

  return (
    <div className="scr account-page" style={{ paddingBottom: 28 }}>
      <div className="account-page__head">
        <div className="ptitle" style={{ fontSize: 20, marginBottom: 4 }}>
          👤 حسابي
        </div>
        {isRegistered ? (
          <p className="psub account-page__email" style={{ marginBottom: 0, fontSize: 12 }}>
            {user.email}
          </p>
        ) : (
          <p className="psub" style={{ marginBottom: 0, fontSize: 12 }}>
            ضيف — يمكنك اللعب بدون بريد
          </p>
        )}
      </div>

      <nav className="tabs account-tabs" aria-label="أقسام الحساب">
        {ACCOUNT_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab${tab === t.id ? ' on' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </nav>

      {tab === 'sub' && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="ctitle">{activeOk ? '🎫 اشتراكي النشط' : '💎 الاشتراك'}</div>
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
                لا يوجد اشتراك نشط — فعّل كوداً أو اشترك من الباقات
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

          {isRegistered ? (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="ctitle">📊 إحصائياتك</div>
              <AccountStatsSummary stats={userStats} points={points} gamesHosted={gamesHosted} />
              {userStats?.avgPlayers > 0 ? (
                <p className="psub" style={{ marginTop: 10, marginBottom: 0, fontSize: 11 }}>
                  متوسط اللاعبين في جلساتك: {Math.round(userStats.avgPlayers)}
                </p>
              ) : null}
            </div>
          ) : null}

          {historyList.length > 0 ? (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="ctitle">📜 سجل التفعيلات</div>
              <ul className="account-history-list">
                {historyList.map((row) => (
                  <li key={row.id}>
                    <strong style={{ color: 'var(--gold)' }}>{row.code}</strong> — {row.duration} يوم — ينتهي{' '}
                    {formatTs(row.expiresAt)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {isGuest ? (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="ctitle">تسجيل بالبريد (اختياري)</div>
              <PlayerAuthScreen notify={notify} compact initialMode={initialAuthMode} />
            </div>
          ) : (
            <button type="button" className="btn bo" onClick={handleSignOut}>
              تسجيل الخروج
            </button>
          )}
        </>
      )}

      {tab === 'badge' && (
        <>
          {isRegistered ? (
            <>
              <div className="card arena-account-card" style={{ marginBottom: 12 }}>
                <ArenaBadge
                  icon={avatarIcon}
                  frame={avatarFrame}
                  points={points}
                  name={editingName ? nameDraft : displayName}
                  tierLabel={tier.label}
                  size={64}
                  compact
                />
                <div className="account-name-edit">
                  {editingName ? (
                    <>
                      <input
                        type="text"
                        className="inp"
                        maxLength={80}
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        placeholder="اسمك في الساحة"
                        disabled={nameSaving}
                      />
                      <div className="account-name-edit__actions">
                        <button
                          type="button"
                          className="btn bg bsm"
                          disabled={nameSaving}
                          onClick={() => void handleSaveName()}
                        >
                          {nameSaving ? '⏳' : 'حفظ'}
                        </button>
                        <button
                          type="button"
                          className="btn bgh bsm"
                          disabled={nameSaving}
                          onClick={() => {
                            setEditingName(false);
                            setNameDraft(displayName);
                          }}
                        >
                          إلغاء
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn bgh bsm account-name-edit__btn"
                      onClick={() => setEditingName(true)}
                    >
                      ✏️ تعديل الاسم
                    </button>
                  )}
                </div>
                {tierProgress.next ? (
                  <div className="arena-tier-bar">
                    <div className="arena-tier-bar__labels">
                      <span>{tier.label}</span>
                      <span>
                        {tierProgress.remaining > 0
                          ? `${tierProgress.remaining} للـ${tierProgress.next.label}`
                          : tierProgress.next.label}
                      </span>
                    </div>
                    <div className="arena-tier-bar__track">
                      <div
                        className="arena-tier-bar__fill"
                        style={{ width: `${Math.round(tierProgress.progress * 100)}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="psub" style={{ marginTop: 10, marginBottom: 0, fontSize: 11 }}>
                    🏆 أسطورة الساحة
                  </p>
                )}
              </div>

              <ArenaPointsRewardsCard points={points} />

              <div className="arena-badge-actions">
                <button
                  type="button"
                  className="arena-badge-action arena-badge-action--icon"
                  onClick={() => setIconSheetOpen(true)}
                >
                  <span className="arena-badge-action__glyph">{avatarIcon}</span>
                  <span className="arena-badge-action__body">
                    <span className="arena-badge-action__title">أيقونة الشارة</span>
                    <span className="arena-badge-action__sub">اختر و احفظ شارتك</span>
                  </span>
                  <span className="arena-badge-action__chev">‹</span>
                </button>

                <button
                  type="button"
                  className="arena-badge-action arena-badge-action--ach"
                  onClick={() => setAchSheetOpen(true)}
                >
                  <span className="arena-badge-action__glyph">🏅</span>
                  <span className="arena-badge-action__body">
                    <span className="arena-badge-action__title">الإنجازات</span>
                    <span className="arena-badge-action__sub">
                      {countUnlockedAchievements(achievements)} / {ARENA_ACHIEVEMENT_LIST.length} مفتوح
                    </span>
                  </span>
                  <span className="arena-badge-action__chev">‹</span>
                </button>
              </div>

              <ArenaBadgeSheet
                open={iconSheetOpen}
                onClose={() => {
                  if (!iconSaving) {
                    setIconDraft(avatarIcon);
                    setIconSheetOpen(false);
                  }
                }}
                title="أيقونة الشارة"
                subtitle="اختر شارتك ثم اضغط حفظ — تبقى معك في كل الألعاب"
                icon="🦅"
                footer={
                  <div className="arena-sheet__actions">
                    <button
                      type="button"
                      className="btn bg"
                      disabled={iconSaving || !iconDraft}
                      onClick={() => void handleSaveIcon()}
                    >
                      {iconSaving ? '⏳ جاري الحفظ…' : '💾 حفظ الشارة'}
                    </button>
                    <button
                      type="button"
                      className="btn bgh"
                      disabled={iconSaving}
                      onClick={() => {
                        setIconDraft(avatarIcon);
                        setIconSheetOpen(false);
                      }}
                    >
                      إلغاء
                    </button>
                  </div>
                }
              >
                <div className="arena-sheet-preview">
                  <ArenaBadge
                    icon={iconDraft || avatarIcon}
                    frame={avatarFrame}
                    points={points}
                    name={displayName}
                    tierLabel={tier.label}
                    size={72}
                  />
                  <p className="arena-sheet-preview__hint">معاينة شارتك</p>
                </div>
                <ArenaIconPicker
                  points={points}
                  value={iconDraft || avatarIcon}
                  onChange={setIconDraft}
                  notify={notify}
                  variant="sheet"
                />
              </ArenaBadgeSheet>

              <ArenaBadgeSheet
                open={achSheetOpen}
                onClose={() => setAchSheetOpen(false)}
                title="إنجازات الساحة"
                subtitle={`${countUnlockedAchievements(achievements)} من ${ARENA_ACHIEVEMENT_LIST.length} — تابع اللعب والاستضافة لفتح الباقي`}
                icon="🏅"
                bodyClassName="arena-sheet__body--achievements"
                footer={
                  <button
                    type="button"
                    className="btn bg"
                    onClick={() => setAchSheetOpen(false)}
                  >
                    حسناً
                  </button>
                }
              >
                <div className="arena-ach-progress" aria-hidden>
                  <div className="arena-ach-progress__track">
                    <div
                      className="arena-ach-progress__fill"
                      style={{
                        width: `${Math.round(
                          (countUnlockedAchievements(achievements) / ARENA_ACHIEVEMENT_LIST.length) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="arena-ach-progress__label">
                    {countUnlockedAchievements(achievements)} / {ARENA_ACHIEVEMENT_LIST.length}
                  </span>
                </div>
                <ArenaAchievementsGrid unlockedIds={achievements} variant="luxury" />
              </ArenaBadgeSheet>

              <ArenaHallOfFame isGuest={false} />
            </>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <ArenaSignupPrompt variant="full" localQuestionCount={localQuestionCount} />
              <button
                type="button"
                className="btn bo mt2"
                style={{ width: '100%' }}
                onClick={() => setTab('sub')}
              >
                🎫 الذهاب للاشتراك
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'more' && (
        <>
          <div className="card" style={{ marginBottom: 12 }}>
            <div className="ctitle">🌓 المظهر</div>
            <ThemeToggle
              variant="account"
              theme={theme}
              followSystem={followSystem}
              onSetTheme={onSetTheme}
              onFollowSystem={onFollowSystem}
            />
          </div>

          <AccountKnowledgeBank onOpenContribute={onOpenContribute} />

          {isGuest && activeOk && !showLinkForm ? (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="ctitle">ربط البريد</div>
              <p className="psub" style={{ fontSize: 11, marginBottom: 10 }}>
                يحفظ نفس الاشتراك وينقل سجل أسئلتك
              </p>
              <button
                type="button"
                className="btn bgh"
                style={{ fontSize: 12 }}
                onClick={() => setShowLinkForm(true)}
              >
                ربط البريد دون تغيير الكود
              </button>
            </div>
          ) : null}

          {isGuest && showLinkForm ? (
            <div className="card" style={{ marginBottom: 12 }}>
              <form onSubmit={handleLinkEmail}>
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
                    onChange={(e) => setLinkPass(e.target.value)}
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
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
