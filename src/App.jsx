import { useState, useRef, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { ARENA_BACK_LABEL, VOICE_BACK_LABEL, ACCOUNT_BACK_LABEL } from './core/constants';
import Packages from './pages/Packages';
import Home from './pages/Home';
import VoicePage from './pages/VoicePage';
import QuestionContribute from './question-bank/QuestionContribute';
import { fetchBankStats } from './question-bank/qbank.helpers';
import './styles/knowledge-chest.css';
import AdminCodesPanel from './components/admin/AdminCodesPanel';
import QBankManager from './question-bank/QBankManager';
import PlayerAuthScreen from './components/auth/PlayerAuthScreen';
import AccountPage from './components/account/AccountPage';
import { renderPlatformGame, handlePlatformGameBack } from './games/platformGameRouter';
import './styles/base.css';
import './styles/game-ui.css';
import Stars from './shared/Stars';
import Notif from './shared/Notif';
import CodeActivation from './components/codes/CodeActivation';
import SubscriptionTimer from './components/codes/SubscriptionTimer';
import EndGameJoinPrompt from './components/codes/EndGameJoinPrompt';
import SiteFooter from './components/layout/SiteFooter';
import ThemeToggle from './components/layout/ThemeToggle';
import { useTheme } from './hooks/useTheme';
import { getActiveUserCode, isCodeValid, adminProfileExistsForUid, ensurePlayerProfile, persistActiveCodeLocal } from './firebaseHelpers';
import { getEffectivePrice } from './core/subscriptionPackages';
import { ensureArenaProfile } from './core/arenaProfile';
import { arenaPointsForRank } from './core/arena.constants';
import { rewardCurrentPlayerIfRegistered } from './core/arenaRewards';
import { onArenaCelebration } from './core/arenaEvents';
import useArenaProfile from './hooks/useArenaProfile';
import ArenaLevelUpModal from './shared/ArenaLevelUpModal';
import './styles/arena-badge.css';

/** عدد النقرات على الشعار لفتح لوحة Admin (مخفية عن الجميع) */
const ADMIN_LOGO_TAPS = 7;
const ADMIN_LOGO_TAP_MS = 2000;

const CONTRIBUTE_BACK_LABELS = {
  voice: VOICE_BACK_LABEL,
  game: ARENA_BACK_LABEL,
  account: ACCOUNT_BACK_LABEL,
};

const COMMUNITY_SUGGESTIONS = [
  { id: 1, cat: 'تصميم', text: 'وضع داكن أكثر', date: '2025-03-10' },
  { id: 2, cat: 'لعبة', text: 'مؤقت صوتي عند النهاية', date: '2025-03-12' },
];

/* ══════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════ */
export default function App() {
  const { theme, followSystem, setTheme, setFollowSystemMode, toggleTheme } = useTheme();
  const [authReady, setAuthReady] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);

  /* ── NAV ── */
  const [tab, setTab]           = useState('game');
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
  const [adminPanelTab, setAdminPanelTab] = useState('codes');
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [accountAuthMode, setAccountAuthMode] = useState('login');
  const [bankTotal, setBankTotal] = useState(null);
  const [contributeOpen, setContributeOpen] = useState(false);
  const [contributeReturnTab, setContributeReturnTab] = useState('game');
  const accountMenuRef = useRef(null);

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
          localStorage.setItem('pfcc_is_admin', 'true');
          localStorage.setItem('pfcc_admin_uid', user.uid);
        } else {
          localStorage.removeItem('pfcc_is_admin');
          localStorage.removeItem('pfcc_admin_uid');
        }

        const code = await getActiveUserCode(user.uid);
        const validCode = code && isCodeValid(code) ? code : null;
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
    const handleOpenPackages = () => setTab('pricing');
    const handleOpenCodeActivation = () => {
      setTab('account');
      setShowCodeActivation(true);
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
    setTimeout(() => {
      setShowEndGamePrompt(true);
    }, 2000);
  }, [isAdmin, activeCode]);

  /** مشرف المنصة يفتح الغرف بدون تفعيل كود اشتراك؛ باقي المستخدمين يحتاجون activeCode صالحاً */
  const canHostRoom = isAdmin || Boolean(activeCode && isCodeValid(activeCode));

  /** التذييل أثناء التصفح فقط — يختفي داخل غرف الألعاب */
  const showSiteFooter = !selectedGame;

  /** زر «رجوع» في الهيدر — الألقاب والقميري يديران الخروج داخلياً فقط */
  const hidePlatformBack =
    selectedGame === 'nicknames' ||
    selectedGame === 'qumairi' ||
    (selectedGame === 'hesbah' && hesbahMeta.inRoom);

  const showHeaderBack =
    contributeOpen
    || (
      (tab !== 'game' || selectedGame || (gameScreen !== 'home' && tab === 'game'))
      && !hidePlatformBack
    );

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
    });
    if (mounted) return mounted;

    if (gameScreen === 'home') {
      return (
        <Home setSelectedGame={setSelectedGame} onOpenVoiceSuggest={openVoiceSuggest} />
      );
    }

    return null;
  };

  const navItems = [
    { id: 'game', icon: '🏟️', label: 'الألعاب' },
    { id: 'voice', icon: '💬', label: 'صوّتك', dot: false },
    ...(isAdmin ? [{ id: 'codes', icon: '🎫', label: 'الأكواد' }] : []),
    { id: 'pricing', icon: '💎', label: 'الباقات' },
  ];

  const arena = useArenaProfile();
  const user = auth.currentUser;
  const isGuest = arena.isGuest;
  const accountDisplayName = isGuest
    ? 'افتح شارتك'
    : `${arena.avatarIcon} ${arena.displayName}`;
  const accountBtnClass = isGuest
    ? 'hdr-account-btn hdr-account-btn--guest'
    : 'hdr-account-btn hdr-account-btn--arena';

  const openAccountTab = (mode = 'login') => {
    setAccountAuthMode(mode);
    setTab('account');
    setAccountMenuOpen(false);
  };

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
          <PlayerAuthScreen notify={notify} />
        </div>
      </div>
    );
  }

  return(
    <div className={`app${showSiteFooter ? ' app--with-footer' : ''}${selectedGame === 'hesbah' ? ' app--in-hesbah' : ''}`}>
      <Stars/>
      {notifs.map(n=><Notif key={n.id} msg={n}/>)}

      <div className="hdr">
        <div className="hdr-right">
          <div className="hdr-account-wrap" ref={accountMenuRef}>
            <button
              type="button"
              className={accountBtnClass}
              onClick={() => setAccountMenuOpen((v) => !v)}
              title={isGuest ? 'سجّل واحصل على شارة الساحة' : `${arena.points} نقطة ساحة`}
            >
              {isGuest ? `👤 ${accountDisplayName}` : (
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
                    <button type="button" className="hdr-account-item" onClick={() => openAccountTab('login')}>
                      تسجيل دخول
                    </button>
                    <button type="button" className="hdr-account-item" onClick={() => openAccountTab('register')}>
                      تسجيل جديد
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
          <div
            className="logo"
            role="presentation"
            style={{ userSelect: 'none' }}
            onClick={handleLogoSecretTap}
          >
            {contributeOpen
              ? '📚 بنك المعرفة'
              : tab === 'voice'
              ? '💬 صوّتك'
              : tab === 'game'
                ? '🏟️ ساحة الألعاب'
                : tab === 'pricing'
                    ? '💎 الباقات'
                    : tab === 'codes'
                      ? '🎫 الأكواد'
                      : tab === 'account'
                        ? '👤 حسابي'
                        : '🏟️ ساحة الألعاب'}
          </div>
        </div>

        <div className="hdr-left">
          {showHeaderBack ? (
            <button
              className="btn bgh bsm"
              style={{ width: 'auto', padding: '6px 12px', fontSize: 12, color: 'var(--muted)', border: '1px solid var(--border-subtle)' }}
              onClick={() => {
                if (contributeOpen) {
                  closeContribute();
                  return;
                }
                if (tab !== 'game') {
                  goToTab('game');
                  return;
                }
                if (
                  handlePlatformGameBack(selectedGame, { fameeriRef, titlesRef, hesbahRef }, {
                    setSelectedGame,
                    setGameScreen,
                    gameScreen,
                  })
                ) {
                  return;
                }
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

      <div className="main">
        {showCodeActivation ? (
          <CodeActivation
            notify={notify}
            onActivationSuccess={(codeData) => {
              setActiveCode(codeData);
              persistActiveCodeLocal(codeData);
              setShowCodeActivation(false);
              notify('✅ تم تفعيل الكود — تابع من اللعبة', 'success');
            }}
            onBack={() => setShowCodeActivation(false)}
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
            onOpenContribute={() => openContribute('voice')}
            onGoAccount={() => openAccountTab('register')}
            isGuest={isGuest}
            bankTotal={bankTotal}
            initialPortal={voicePortal}
            communitySuggestions={COMMUNITY_SUGGESTIONS}
          />
        )}
        {!showCodeActivation && !contributeOpen && tab==='game'&&(()=>{try{return renderGame();}catch(e){console.error('Render error:',e);return <div style={{padding:20,textAlign:'center',color:'var(--red)'}}><div style={{fontSize:40}}>⚠️</div><div style={{marginTop:8}}>خطأ في العرض — حدّث الصفحة</div><div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{e?.message}</div><button className="btn bg mt2" onClick={()=>window.location.reload()}>🔄 تحديث</button></div>;}})()}
        {!showCodeActivation && !contributeOpen && tab === 'codes' && isAdmin && (
          <div className="scr">
            <div className="tabs">
              <button
                type="button"
                className={`tab ${adminPanelTab === 'codes' ? 'on' : ''}`}
                onClick={() => setAdminPanelTab('codes')}
              >
                الأكواد
              </button>
              <button
                type="button"
                className={`tab ${adminPanelTab === 'qbank' ? 'on' : ''}`}
                onClick={() => setAdminPanelTab('qbank')}
              >
                بنك الأسئلة
              </button>
            </div>

            {adminPanelTab === 'codes' && <AdminCodesPanel notify={notify} />}
            {adminPanelTab === 'qbank' &&
              typeof localStorage !== 'undefined' &&
              localStorage.getItem('pfcc_is_admin') === 'true' && (
                <QBankManager notify={notify} />
              )}
          </div>
        )}
        {!showCodeActivation && !contributeOpen && tab === 'account' && (
          <AccountPage
            notify={notify}
            activeCode={activeCode}
            isCodeValid={isCodeValid}
            isAdmin={isAdmin}
            onActivateCode={() => setShowCodeActivation(true)}
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
            onSubscribe={(pkg) => {
              notify(`قريباً: الدفع لباقة ${pkg.durationLabel} (${getEffectivePrice(pkg)} ريال)`, 'info');
            }}
          />
        )}
      </div>

      {showSiteFooter && <SiteFooter />}

      <nav className="bnav">
        {navItems.map(item=>(
          <button key={item.id} className={`bnav-item${tab===item.id?' active':''}`} onClick={()=>goToTab(item.id)}>
            <div className="bnav-icon">{item.icon}</div>
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
