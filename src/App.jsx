import { useState, useRef, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { ARENA_BACK_LABEL, VOICE_BACK_LABEL, ACCOUNT_BACK_LABEL, PLATFORM_NAME } from './core/constants';
import { GAME_ROUTE_THEMES } from './core/brandTheme';
import Packages from './pages/Packages';
import Home from './pages/Home';
import VoicePage from './pages/VoicePage';
import QuestionContribute from './question-bank/QuestionContribute';
import { fetchBankStats } from './question-bank/qbank.helpers';
import './styles/knowledge-chest.css';
import AdminHub from './components/admin/AdminHub';
import PlayerAccessPanel from './components/auth/PlayerAccessPanel';
import AccountPage from './components/account/AccountPage';
import { renderPlatformGame, handlePlatformGameBack } from './games/platformGameRouter';
import './styles/base.css';
import './styles/packages.css';
import './styles/game-ui.css';
import Stars from './shared/Stars';
import Notif from './shared/Notif';
import CodeActivation from './components/codes/CodeActivation';
import SubscriptionTimer from './components/codes/SubscriptionTimer';
import EndGameJoinPrompt from './components/codes/EndGameJoinPrompt';
import SiteFooter from './components/layout/SiteFooter';
import ThemeToggle from './components/layout/ThemeToggle';
import PwaInstallBanner from './components/layout/PwaInstallBanner';
import { useTheme } from './hooks/useTheme';
import { getActiveUserCode, isCodeValid, adminProfileExistsForUid, ensurePlayerProfile, persistActiveCodeLocal, readLocalSubscription } from './firebaseHelpers';
import { refreshAdminClaim } from './core/adminAuth';
import { MOYASAR_STORAGE, shouldAutoOpenPackages } from './core/moyasarPayment';
import { ensureArenaProfile } from './core/arenaProfile';
import { arenaPointsForRank } from './core/arena.constants';
import { rewardCurrentPlayerIfRegistered } from './core/arenaRewards';
import { onArenaCelebration } from './core/arenaEvents';
import { subscribePlatformSettings } from './core/platformSettings';
import { subscribeCommunityPosts } from './core/platformCommunity';
import useArenaProfile from './hooks/useArenaProfile';
import ArenaLevelUpModal from './shared/ArenaLevelUpModal';
import La3ibzBrandMark from './shared/La3ibzBrandMark';
import La3ibzBrandIcon from './shared/La3ibzBrandIcon';
import GameTopNav from './shared/GameTopNav';
import './styles/arena-badge.css';
import './styles/pwa-install-banner.css';
import { formatOtherSessionsHint, getAllActiveSessions } from './shared/gameSessionRegistry';

/** عدد النقرات على الشعار لفتح لوحة Admin (مخفية عن الجميع) */
const ADMIN_LOGO_TAPS = 7;
const ADMIN_LOGO_TAP_MS = 2000;

const CONTRIBUTE_BACK_LABELS = {
  voice: VOICE_BACK_LABEL,
  game: ARENA_BACK_LABEL,
  account: ACCOUNT_BACK_LABEL,
};

/* ══════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════ */
export default function App() {
  const { theme, followSystem, setTheme, setFollowSystemMode, toggleTheme } = useTheme();
  const [authReady, setAuthReady] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  /* ── NAV ── */
  const [tab, setTab]           = useState(() => {
    try {
      if (shouldAutoOpenPackages()) {
        return 'pricing';
      }
    } catch { /* ignore */ }
    return 'game';
  });
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameScreen, setGameScreen] = useState('home');

  /* ── UI ── */
  const [notifs, setNotifs]      = useState([]);

  const fameeriRef = useRef(null);
  const titlesRef = useRef(null);
  const hesbahRef = useRef(null);

  /* ── معلومات تأتي من TitlesGame لرسم زر 👑 في الهيدر ── */
  const [titlesMeta, setTitlesMeta] = useState({ inRoom: false, showAdminBtn: false, gameScreen: 'home' });
  const [hesbahMeta, setHesbahMeta] = useState({ inRoom: false });
  const [fameeriMeta, setFameeriMeta] = useState({ inRoom: false });
  const [isAdmin, setIsAdmin] = useState(false);
  const adminLogoTapRef = useRef({ count: 0, last: 0 });
  const [activeCode, setActiveCode] = useState(null);
  const [showCodeActivation, setShowCodeActivation] = useState(false);
  const [showEndGamePrompt, setShowEndGamePrompt] = useState(false);
  const [endGameData, setEndGameData] = useState(null);
  const [arenaCelebration, setArenaCelebration] = useState(null);
  const [voicePortal, setVoicePortal] = useState(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountAuthMode, setAccountAuthMode] = useState('code');
  const [pendingAuthMode, setPendingAuthMode] = useState(null);
  const [bankTotal, setBankTotal] = useState(null);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeReturnTab, setContributeReturnTab] = useState('game');
  const accountMenuRef = useRef(null);
  const [platformSettings, setPlatformSettings] = useState(null);
  const [communitySuggestions, setCommunitySuggestions] = useState([]);

  const openContribute = useCallback((fromTab = 'game') => {
    setContributeReturnTab(fromTab);
    setContributeOpen(true);
    if (fromTab === 'game') {
      setTab('game');
      setSelectedGame(null);
      setGameScreen('home');
    }
  }, []);

  const closeContribute = useCallback(() => {
    setContributeOpen(false);
    setTab(contributeReturnTab);
    setGameScreen('home');
  }, [contributeReturnTab]);

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        setAuthReady(true);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const hashAdmin =
        typeof window !== 'undefined' && window.location.hash?.toLowerCase() === '#admin';

      if (!user) {
        setIsAdmin(false);
        setActiveCode(null);
        persistActiveCodeLocal(null);
        setAuthFailed(false);
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.warn('Anonymous sign-in skipped:', e?.code || e);
          setAuthFailed(true);
          finish();
        }
        return;
      }

      setAuthFailed(false);

      try {
        if (user.email) {
          await ensurePlayerProfile(user.uid, {
            email: user.email,
            displayName: user.displayName || '',
          });
          const arenaPatch = await ensureArenaProfile(user.uid, {
            email: user.email,
            displayName: user.displayName || '',
          });
          if (arenaPatch?.isNewArenaProfile) {
            notify('🏟️ مرحباً في الساحة — +300 نقطة ترحيب!', 'gold');
          }
        }

        const adm = await adminProfileExistsForUid(user.uid);
        setIsAdmin(adm);
        if (adm) {
          void refreshAdminClaim();
          localStorage.setItem('pfcc_is_admin', 'true');
          localStorage.setItem('pfcc_admin_uid', user.uid);
        } else {
          localStorage.removeItem('pfcc_is_admin');
          localStorage.removeItem('pfcc_admin_uid');
        }

        const code = await getActiveUserCode(user.uid);
        const localCode = readLocalSubscription();
        let validCode = code && isCodeValid(code) ? code : null;
        if (!validCode && localCode && isCodeValid(localCode)) {
          validCode = localCode;
        }
        setActiveCode(validCode);
        persistActiveCodeLocal(validCode);

        if (hashAdmin) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          if (adm) {
            setTab('codes');
          }
        }
      } catch (e) {
        console.error('Auth bootstrap:', e);
      }

      finish();
    });

    const safety = setTimeout(finish, 8000);

    return () => {
      clearTimeout(safety);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const unsub = subscribePlatformSettings(setPlatformSettings);
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeCommunityPosts(setCommunitySuggestions);
    return unsub;
  }, []);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const handleDocClick = (event) => {
      if (!accountMenuRef.current?.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('click', handleDocClick);
    return () => document.removeEventListener('click', handleDocClick);
  }, [accountMenuOpen]);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(MOYASAR_STORAGE.openPackages)) {
        sessionStorage.removeItem(MOYASAR_STORAGE.openPackages);
        setTab('pricing');
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const handleOpenPackages = () => setTab('pricing');
    const handleOpenCodeActivation = () => {
      setAccountMenuOpen(false);
      setShowCodeActivation(false);
      setContributeOpen(false);
      setPendingAuthMode(null);
      setAccountAuthMode('code');
      setTab('account');
    };
    window.addEventListener('pfcc-open-packages', handleOpenPackages);
    window.addEventListener('pfcc-open-code-activation', handleOpenCodeActivation);
    return () => {
      window.removeEventListener('pfcc-open-packages', handleOpenPackages);
      window.removeEventListener('pfcc-open-code-activation', handleOpenCodeActivation);
    };
  }, []);

  const notify = useCallback((text, type = 'info') => {
    const id = Date.now() + Math.random();
    setNotifs((p) => [...p, { id, text, type }]);
    setTimeout(() => setNotifs((p) => p.filter((n) => n.id !== id)), 3200);
  }, []);

  const openVoiceSuggest = useCallback((preset = {}) => {
    setVoicePortal(preset.portal || preset.type || 'suggest');
    setSelectedGame(null);
    setGameScreen('home');
    setTab('voice');
    notify('💬 صوتك — مجتمع الساحة', 'info');
  }, [notify]);

  const openAdminGate = useCallback(() => {
    const u = auth.currentUser;
    if (!u) {
      notify('جاري التحميل…', 'info');
      return;
    }
    adminProfileExistsForUid(u.uid).then((ok) => {
      if (ok) {
        setTab('codes');
        notify('🎫 لوحة الأكواد', 'success');
      } else if (u.isAnonymous) {
        notify('سجّل بالبريد من «حسابي» (نفس تسجيل الدخول للجميع)', 'info');
        setTab('account');
      } else {
        notify('هذا الحساب ليس مشرفاً', 'error');
      }
    });
  }, [notify]);

  const goToTab = useCallback((id) => {
    setTab(id);
    if (id !== 'game') {
      setGameScreen('home');
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchBankStats()
      .then((stats) => {
        if (active) setBankTotal(stats?.total ?? null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, [gameScreen, tab, contributeOpen]);

  const handleLogoSecretTap = useCallback(() => {
    const now = Date.now();
    if (now - adminLogoTapRef.current.last > ADMIN_LOGO_TAP_MS) {
      adminLogoTapRef.current.count = 0;
    }
    adminLogoTapRef.current.last = now;
    adminLogoTapRef.current.count += 1;
    if (adminLogoTapRef.current.count >= ADMIN_LOGO_TAPS) {
      adminLogoTapRef.current.count = 0;
      openAdminGate();
    }
  }, [openAdminGate]);

  useEffect(() => onArenaCelebration(setArenaCelebration), []);

  const onGameEnd = useCallback(async (data) => {
    if (isAdmin || (activeCode && isCodeValid(activeCode))) return;

    let arenaResult = null;
    const rank = data?.playerStats?.rank;
    if (rank != null && data?.game) {
      const dedupeKey = `pfcc_arena_${data.game}_${data.roomCode || ''}_${rank}`;
      if (typeof sessionStorage !== 'undefined' && !sessionStorage.getItem(dedupeKey)) {
        try {
          arenaResult = await rewardCurrentPlayerIfRegistered({
            gameType: data.game,
            rank,
            roomCode: data.roomCode,
          });
          if (arenaResult?.pointsAwarded > 0) sessionStorage.setItem(dedupeKey, '1');
          if (arenaResult && (arenaResult.tierUpgraded || arenaResult.newAchievements?.length)) {
            setArenaCelebration(arenaResult);
          }
        } catch (e) {
          console.warn('[arena]', e);
        }
      }
    }

    setEndGameData({
      ...(data ?? {}),
      arenaReward: arenaResult?.pointsAwarded ?? 0,
      arenaShare: arenaResult
        ? {
            displayName: arenaResult.displayName,
            avatarIcon: arenaResult.avatarIcon,
            avatarFrame: arenaResult.newTier,
            tierLabel: arenaResult.newTierLabel,
            totalPoints: arenaResult.totalPoints,
            arenaReward: arenaResult.pointsAwarded,
            rank,
            winner: data?.winner,
            gameType: data?.game,
            roomCode: data?.roomCode,
          }
        : null,
    });
    // حَسْبة: الترغيب بالتسجيل مضمّن أسفل شاشة التتويج — لا نغطيها بنافذة منبثقة
    if (data?.game === 'hesbah') return;
    setTimeout(() => {
      setShowEndGamePrompt(true);
    }, 2000);
  }, [isAdmin, activeCode]);

  /** مشرف المنصة يفتح الغرف بدون تفعيل كود اشتراك؛ باقي المستخدمين يحتاجون activeCode صالحاً */
  const canHostRoom = isAdmin || Boolean(activeCode && isCodeValid(activeCode));

  /** التذييل أثناء التصفح فقط — يختفي داخل غرف الألعاب */
  const showSiteFooter = !selectedGame;

  /** زر «رجوع» في الهيدر — الألقاب والقميري وحَسْبة يديران الخروج داخلياً فقط */
  const hidePlatformBack =
    selectedGame === 'nicknames' ||
    selectedGame === 'qumairi' ||
    selectedGame === 'hesbah';

  /** زر الرجوع في الهيدر — داخل تبويب الألعاب فقط؛ التبويبات الرئيسية (صوتك، الأكواد، الباقات، حسابي) بدون رجوع بالهيدر */
  const showHeaderBack =
    tab === 'game' &&
    (selectedGame || gameScreen !== 'home') &&
    !hidePlatformBack;

  const renderGame = () => {
    const mounted = renderPlatformGame(selectedGame, {
      titlesRef,
      fameeriRef,
      hesbahRef,
      notify,
      setTab,
      setSelectedGame,
      onHeaderMeta: setTitlesMeta,
      onHesbahHeaderMeta: setHesbahMeta,
      onFameeriHeaderMeta: setFameeriMeta,
      canHostRoom,
      onRequestActivation: () => setShowCodeActivation(true),
      onGameEnd,
      onGoAccount: () => setTab('account'),
      endGameJoin:
        selectedGame === 'hesbah' && endGameData?.game === 'hesbah' ? endGameData : null,
      isGuest,
      onEndGameArenaSignup: () => {
        setAccountAuthMode('register');
        setTab('account');
        notify('🏟️ افتح شارة الساحة — سجّل في 30 ثانية', 'gold');
      },
      onEndGameTryFree: () => {
        setTab('account');
        notify('📝 أنشئ حسابك لتصبح مشرف مسابقة', 'gold');
      },
      onEndGamePackages: () => setTab('pricing'),
    });
    if (mounted) return mounted;

    if (gameScreen === 'home') {
      return (
        <Home setSelectedGame={setSelectedGame} onOpenVoiceSuggest={openVoiceSuggest} notify={notify} />
      );
    }

    return null;
  };

  const navItems = [
    { id: 'game', icon: 'brand', label: 'الألعاب' },
    { id: 'voice', icon: '💬', label: 'صوّتك', dot: false },
    ...(isAdmin ? [{ id: 'codes', icon: '👑', label: 'التحكم' }] : []),
    { id: 'pricing', icon: '💎', label: 'الباقات' },
  ];

  const arena = useArenaProfile();
  const user = auth.currentUser;
  const isGuest = arena.isGuest;
  const accountDisplayName = isGuest
    ? null
    : `${arena.avatarIcon} ${arena.displayName}`;
  const accountBtnClass = isGuest
    ? 'hdr-account-btn hdr-account-btn--guest'
    : 'hdr-account-btn hdr-account-btn--arena';

  const openAccountTab = useCallback((mode = 'code') => {
    setAccountMenuOpen(false);
    setShowCodeActivation(false);
    setContributeOpen(false);
    setPendingAuthMode(null);
    setAccountAuthMode(mode === 'register' || mode === 'login' ? mode : 'code');
    setTab('account');
  }, []);

  const finishCodeActivation = useCallback(
    (codeData, authModeAfter = null) => {
      if (codeData) {
        setActiveCode(codeData);
        persistActiveCodeLocal(codeData);
      }
      setShowCodeActivation(false);
      setPendingAuthMode(null);
      if (authModeAfter === 'login' || authModeAfter === 'register') {
        setAccountAuthMode(authModeAfter);
        setTab('account');
        notify('✅ تم تفعيل الكود — أكمل تسجيل الدخول', 'success');
        return;
      }
      notify('✅ تم تفعيل الكود — تابع من اللعبة', 'success');
    },
    [notify]
  );

  const openLoginAfterCode = useCallback(() => {
    setShowCodeActivation(false);
    setAccountAuthMode('login');
    setTab('account');
    setPendingAuthMode(null);
  }, []);

  const handleHeaderSignOut = async () => {
    try {
      localStorage.removeItem('pfcc_is_admin');
      localStorage.removeItem('pfcc_admin_uid');
      await signOut(auth);
      notify('تم تسجيل الخروج', 'info');
      setAccountMenuOpen(false);
    } catch (e) {
      console.error(e);
      notify('تعذّر تسجيل الخروج', 'error');
    }
  };

  if (!authReady || (!auth.currentUser && !authFailed)) {
    return (
      <div style={{ minHeight: "100vh", background: "#07071a", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Stars />
        <div style={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <div style={{ fontSize: 64, animation: "bnc 1s infinite" }}>🎮</div>
          <div style={{ color: "var(--muted)", marginTop: 16 }}>جاري التحميل...</div>
        </div>
      </div>
    );
  }

  if (!auth.currentUser && authFailed) {
    return (
      <div className="app" style={{ minHeight: '100vh' }}>
        <Stars />
        {notifs.map((n) => (
          <Notif key={n.id} msg={n} />
        ))}
        <div className="main" style={{ paddingTop: 8 }}>
          <p className="psub" style={{ textAlign: 'center', marginBottom: 12 }}>
            تعذّر الدخول التلقائي — فعّل Anonymous في Firebase أو سجّل بالبريد
          </p>
          <PlayerAccessPanel notify={notify} initialMode="login" />
        </div>
      </div>
    );
  }

  const activeGameTheme = selectedGame ? GAME_ROUTE_THEMES[selectedGame]?.id : null;
  const appGameClass =
    selectedGame === 'hesbah'
      ? ' app--in-hesbah'
      : selectedGame === 'qumairi'
        ? ' app--in-fameeri'
        : selectedGame === 'nicknames'
          ? ' app--in-titles'
          : '';

  const activeSessions = getAllActiveSessions().filter((s) => {
    if (tab !== 'game') return true;
    const map = { nicknames: 'titles', qumairi: 'fameeri', hesbah: 'hesbah' };
    return map[selectedGame] !== s.game;
  });

  return(
    <div
      className={`app${showSiteFooter ? ' app--with-footer' : ''}${appGameClass}`}
      data-game={activeGameTheme || undefined}
    >
      <Stars/>
      {notifs.map(n=><Notif key={n.id} msg={n}/>)}

      <div className="hdr">
        <div className="hdr-right">
          <div className="hdr-account-wrap" ref={accountMenuRef}>
            <button
              type="button"
              className={accountBtnClass}
              onClick={() => setAccountMenuOpen((v) => !v)}
              title={isGuest ? 'تفعيل كود | دخول | تسجيل' : `${arena.points} نقطة ساحة`}
              aria-label={isGuest ? 'تفعيل كود | دخول | تسجيل' : undefined}
            >
              {isGuest ? (
                <span className="hdr-account-guest">
                  <span className="hdr-account-guest__seg">تفعيل كود</span>
                  <span className="hdr-account-guest__pipe" aria-hidden>|</span>
                  <span className="hdr-account-guest__seg">دخول</span>
                  <span className="hdr-account-guest__pipe" aria-hidden>|</span>
                  <span className="hdr-account-guest__seg">تسجيل</span>
                  <span className="hdr-account-guest__chev" aria-hidden>▾</span>
                </span>
              ) : (
                <>
                  {accountDisplayName}
                  {arena.points > 0 ? (
                    <span className="hdr-account-pts"> · {arena.points}</span>
                  ) : null}
                </>
              )}
            </button>
            {accountMenuOpen ? (
              <div className="hdr-account-menu">
                {isGuest ? (
                  <>
                    <button type="button" className="hdr-account-item hdr-account-item--primary" onClick={() => openAccountTab('code')}>
                      🔑 تفعيل كود
                    </button>
                    <button type="button" className="hdr-account-item" onClick={() => openAccountTab('login')}>
                      دخول
                    </button>
                    <button type="button" className="hdr-account-item" onClick={() => openAccountTab('register')}>
                      تسجيل
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="hdr-account-item" onClick={() => openAccountTab('login')}>
                      حسابي
                    </button>
                    <button type="button" className="hdr-account-item danger" onClick={handleHeaderSignOut}>
                      تسجيل خروج
                    </button>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="hdr-center">
          <La3ibzBrandMark
            variant="header"
            onClick={handleLogoSecretTap}
            role="presentation"
          />
        </div>

        <div className="hdr-left">
          {showHeaderBack ? (
            <button
              className="btn bgh bsm"
              style={{ width: 'auto', padding: '6px 12px', fontSize: 12, color: 'var(--muted)', border: '1px solid var(--border-subtle)' }}
              onClick={() => {
                handlePlatformGameBack(selectedGame, { fameeriRef, titlesRef, hesbahRef }, {
                  setSelectedGame,
                  setGameScreen,
                  gameScreen,
                });
              }}
            >
              ← رجوع
            </button>
          ) : null}

          <ThemeToggle theme={theme} onToggle={toggleTheme} variant="compact" />
          {activeCode?.expiresAt && isCodeValid(activeCode) && (
            <SubscriptionTimer
              activeCode={activeCode}
              onExpired={() => {
                setActiveCode(null);
                persistActiveCodeLocal(null);
                setShowCodeActivation(true);
                notify('⏰ انتهى اشتراكك! جدّد الآن', 'error');
              }}
            />
          )}
          {tab==='game' && selectedGame==='nicknames' && titlesMeta.showAdminBtn ? (
            <button
              className="btn bg bsm"
              style={{width:'auto',padding:'6px 12px',fontSize:12}}
              onClick={()=>titlesRef.current?.openAdminPanel?.()}
            >
              👑 تحكم
            </button>
          ) : (
            <div style={{width:60}}/>
          )}
        </div>
      </div>

      <div className="app-chrome-banners">
        {activeSessions.length > 0 ? (
          <div className="game-multi-session-hint app-active-sessions-strip" role="status">
            جلسة نشطة: {formatOtherSessionsHint(activeSessions)}
          </div>
        ) : null}
        <PwaInstallBanner />
      </div>

      <div className="main">
        {platformSettings?.maintenanceMode && !isAdmin ? (
          <div className="maintenance-banner" role="status">
            <span aria-hidden>🛠️</span>
            <p>{platformSettings.maintenanceMessage || 'المنصة تحت الصيانة — نعود قريباً'}</p>
          </div>
        ) : null}
        {showCodeActivation ? (
          <CodeActivation
            notify={notify}
            pendingAuthMode={pendingAuthMode}
            onActivationSuccess={finishCodeActivation}
            onRequestLogin={openLoginAfterCode}
            onBack={() => {
              setShowCodeActivation(false);
              setPendingAuthMode(null);
            }}
          />
        ) : null}
        {!showCodeActivation && contributeOpen ? (
          <QuestionContribute
            notify={notify}
            onBack={closeContribute}
            backLabel={CONTRIBUTE_BACK_LABELS[contributeReturnTab] || ARENA_BACK_LABEL}
          />
        ) : null}
        {!showCodeActivation && !contributeOpen && tab === 'voice' && (
          <VoicePage
            notify={notify}
            onBack={() => goToTab('game')}
            onOpenContribute={() => openContribute('voice')}
            onGoAccount={() => openAccountTab('register')}
            isGuest={isGuest}
            bankTotal={bankTotal}
            initialPortal={voicePortal}
            communitySuggestions={communitySuggestions}
          />
        )}
        {!showCodeActivation && !contributeOpen && tab==='game'&&(()=>{try{return renderGame();}catch(e){console.error('Render error:',e);return <div style={{padding:20,textAlign:'center',color:'var(--red)'}}><div style={{fontSize:40}}>⚠️</div><div style={{marginTop:8}}>خطأ في العرض — حدّث الصفحة</div><div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{e?.message}</div><button className="btn bg mt2" onClick={()=>window.location.reload()}>🔄 تحديث</button></div>;}})()}
        {!showCodeActivation && !contributeOpen && tab === 'codes' && isAdmin && (
          <AdminHub notify={notify} onBack={() => goToTab('game')} />
        )}
        {!showCodeActivation && !contributeOpen && tab === 'account' && (
          <AccountPage
            notify={notify}
            onBack={() => goToTab('game')}
            activeCode={activeCode}
            isCodeValid={isCodeValid}
            isAdmin={isAdmin}
            onActivateCode={() => openAccountTab('code')}
            onCodeActivated={(codeData) => {
              if (codeData) {
                setActiveCode(codeData);
                persistActiveCodeLocal(codeData);
              }
            }}
            onGoPricing={() => setTab('pricing')}
            onOpenContribute={() => openContribute('account')}
            theme={theme}
            followSystem={followSystem}
            onSetTheme={setTheme}
            onFollowSystem={setFollowSystemMode}
            initialAuthMode={accountAuthMode}
          />
        )}
        {!showCodeActivation && !contributeOpen && tab==='pricing'&&(
          <Packages
            onBack={() => goToTab('game')}
            isGuest={isGuest}
            onGoAccount={() => {
              setAccountAuthMode('register');
              setTab('account');
              notify('سجّل لحفظ اشتراكك على كل أجهزتك', 'info');
            }}
            onSubscriptionActivated={(codeData) => {
              if (codeData) {
                setActiveCode(codeData);
                persistActiveCodeLocal(codeData);
                notify('تم تفعيل اشتراكك — استمتع باللعب!', 'success');
              }
            }}
          />
        )}
      </div>

      {showSiteFooter && <SiteFooter />}

      <nav className="bnav">
        {navItems.map(item=>(
          <button key={item.id} className={`bnav-item${tab===item.id?' active':''}`} data-nav={item.id} onClick={()=>goToTab(item.id)}>
            <div className="bnav-icon">
              {item.icon === 'brand' ? (
                <La3ibzBrandIcon size="nav" alt={PLATFORM_NAME} />
              ) : (
                item.icon
              )}
            </div>
            <div className="bnav-label">{item.label}</div>
            {item.dot&&<div className="bnav-dot"/>}
          </button>
        ))}
      </nav>

      <ArenaLevelUpModal
        celebration={arenaCelebration}
        onClose={() => setArenaCelebration(null)}
      />

      {showEndGamePrompt && (
        <EndGameJoinPrompt
          winner={endGameData?.winner}
          playerStats={endGameData?.playerStats}
          arenaReward={endGameData?.arenaReward}
          arenaShare={
            endGameData?.arenaShare ||
            (!isGuest && endGameData?.playerStats?.rank != null
              ? {
                  displayName: arena.displayName,
                  avatarIcon: arena.avatarIcon,
                  avatarFrame: arena.avatarFrame,
                  tierLabel: arena.tier?.label,
                  totalPoints: arena.points,
                  arenaReward:
                    endGameData?.arenaReward ||
                    arenaPointsForRank(endGameData.playerStats.rank),
                  rank: endGameData.playerStats.rank,
                  winner: endGameData?.winner,
                  gameType: endGameData?.game,
                  roomCode: endGameData?.roomCode,
                }
              : null)
          }
          isGuest={isGuest}
          notify={notify}
          onArenaSignup={() => {
            setShowEndGamePrompt(false);
            setEndGameData(null);
            setAccountAuthMode('register');
            setTab('account');
            notify('🏟️ افتح شارة الساحة — سجّل في 30 ثانية', 'gold');
          }}
          onClose={() => {
            setShowEndGamePrompt(false);
            setEndGameData(null);
          }}
          onSubscribe={(pkg) => {
            console.log('Selected package:', pkg);
            notify('قريباً: ربط بوابة الدفع', 'info');
            setShowEndGamePrompt(false);
            setEndGameData(null);
          }}
          onTryFree={() => {
            setShowEndGamePrompt(false);
            setEndGameData(null);
            setTab('account');
            notify('📝 أنشئ حسابك لتصبح مشرف مسابقة', 'gold');
          }}
          onNewGame={() => {
            setShowEndGamePrompt(false);
            setEndGameData(null);
            setSelectedGame(null);
          }}
          onContribute={() => {
            setShowEndGamePrompt(false);
            setEndGameData(null);
            openContribute('game');
          }}
        />
      )}
    </div>
  );
}
