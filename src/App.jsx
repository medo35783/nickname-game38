import { useState, useRef, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";
import News from './pages/News';
import Suggestions from './pages/Suggestions';
import Packages from './pages/Packages';
import Home from './pages/Home';
import AdminCodesPanel from './components/admin/AdminCodesPanel';
import PlayerAuthScreen from './components/auth/PlayerAuthScreen';
import AccountPage from './components/account/AccountPage';
import TitlesGame from './games/titles/TitlesGame';
import FameeriGame from './games/fameeri/FameeriGame';
import './styles/base.css';
import Stars from './shared/Stars';
import Notif from './shared/Notif';
import CodeActivation from './components/codes/CodeActivation';
import SubscriptionTimer from './components/codes/SubscriptionTimer';
import EndGameJoinPrompt from './components/codes/EndGameJoinPrompt';
import { getActiveUserCode, isCodeValid, adminProfileExistsForUid, ensurePlayerProfile } from './firebaseHelpers';

/** عدد النقرات على الشعار لفتح لوحة Admin (مخفية عن الجميع) */
const ADMIN_LOGO_TAPS = 7;
const ADMIN_LOGO_TAP_MS = 2000;

/* ══════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════ */
export default function App() {
  const [authReady, setAuthReady] = useState(false);

  /* ── NAV ── */
  const [tab, setTab]           = useState('game');
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameScreen, setGameScreen] = useState('home');

  /* ── UI ── */
  const [notifs, setNotifs]      = useState([]);

  const fameeriRef = useRef(null);
  const titlesRef = useRef(null);

  /* ── معلومات تأتي من TitlesGame لرسم زر 👑 في الهيدر ── */
  const [titlesMeta, setTitlesMeta] = useState({ inRoom: false, showAdminBtn: false, gameScreen: 'home' });
  const [isAdmin, setIsAdmin] = useState(false);
  const adminLogoTapRef = useRef({ count: 0, last: 0 });
  const [activeCode, setActiveCode] = useState(null);
  const [showCodeActivation, setShowCodeActivation] = useState(false);
  const [showEndGamePrompt, setShowEndGamePrompt] = useState(false);
  const [endGameData, setEndGameData] = useState(null);

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
        try {
          await signInAnonymously(auth);
        } catch (e) {
          console.warn('Anonymous sign-in skipped:', e?.code || e);
          finish();
        }
        return;
      }

      try {
        if (user.email) {
          await ensurePlayerProfile(user.uid, {
            email: user.email,
            displayName: user.displayName || '',
          });
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
        setActiveCode(code && isCodeValid(code) ? code : null);

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
    const handleOpenPackages = () => setTab('pricing');
    window.addEventListener('pfcc-open-packages', handleOpenPackages);
    return () => window.removeEventListener('pfcc-open-packages', handleOpenPackages);
  }, []);

  const notify = useCallback((text, type = 'info') => {
    const id = Date.now() + Math.random();
    setNotifs((p) => [...p, { id, text, type }]);
    setTimeout(() => setNotifs((p) => p.filter((n) => n.id !== id)), 3200);
  }, []);

  const openAdminGate = useCallback(() => {
    const u = auth.currentUser;
    if (!u) {
      notify('جاري تهيئة الجلسة… حاول بعد لحظة', 'info');
      return;
    }
    if (u.isAnonymous) {
      notify('للوحة: افتح «حسابي» ثم «دخول مشرف بالبريد»', 'info');
      setTab('account');
      return;
    }
    adminProfileExistsForUid(u.uid).then((ok) => {
      if (ok) {
        setTab('codes');
        notify('🎫 لوحة الأكواد', 'success');
      } else {
        notify('هذا الحساب ليس مشرفاً في النظام', 'error');
      }
    });
  }, [notify]);

  const goToTab = useCallback((id) => {
    setTab(id);
  }, []);

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

  const onGameEnd = useCallback((data) => {
    if (isAdmin || (activeCode && isCodeValid(activeCode))) return;
    setEndGameData(data ?? null);
    setTimeout(() => {
      setShowEndGamePrompt(true);
    }, 2000);
  }, [isAdmin, activeCode]);

  /* ── DERIVED ── */
  const hasNews      = true;

  const renderGame = () => {
    if (showCodeActivation) {
      return (
        <CodeActivation
          notify={notify}
          onActivationSuccess={(codeData) => {
            setActiveCode(codeData);
            setShowCodeActivation(false);
            if (auth.currentUser?.isAnonymous) {
              notify('💡 لحفظ الاشتراك بين الأجهزة: «حسابي» ← احفظ اشتراكك', 'info');
            }
          }}
          onBack={() => setShowCodeActivation(false)}
        />
      );
    }

    if(selectedGame === 'nicknames') return (
      <TitlesGame
        ref={titlesRef}
        notify={notify}
        setTab={setTab}
        setSelectedGame={setSelectedGame}
        onHeaderMeta={setTitlesMeta}
        canCreateRoom={Boolean(activeCode && isCodeValid(activeCode))}
        onRequestActivation={() => setShowCodeActivation(true)}
        onGameEnd={onGameEnd}
      />
    );

    if (selectedGame === 'qumairi') {
      return (
        <FameeriGame
          ref={fameeriRef}
          notify={notify}
          setTab={setTab}
          setSelectedGame={setSelectedGame}
          canCreateRoom={Boolean(activeCode && isCodeValid(activeCode))}
          onRequestActivation={() => setShowCodeActivation(true)}
          onGameEnd={onGameEnd}
        />
      );
    }

    if(gameScreen==='home'){
      return <Home setSelectedGame={setSelectedGame} />;
    }

    return null;
  };

  const navItems = [
    { id: 'game', icon: '🏟️', label: 'الألعاب' },
    { id: 'news', icon: '🔔', label: 'أخبار', dot: hasNews },
    ...(isAdmin ? [{ id: 'codes', icon: '🎫', label: 'الأكواد' }] : []),
    { id: 'pricing', icon: '💎', label: 'الباقات' },
    { id: 'suggest', icon: '💡', label: 'اقتراح' },
    { id: 'account', icon: '👤', label: 'حسابي' },
  ];

  if (!authReady) {
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

  if (!auth.currentUser) {
    return (
      <div className="app" style={{ minHeight: '100vh' }}>
        <Stars />
        {notifs.map((n) => (
          <Notif key={n.id} msg={n} />
        ))}
        <div className="main" style={{ paddingTop: 8 }}>
          <PlayerAuthScreen notify={notify} variant="fallback" />
        </div>
      </div>
    );
  }

  return(
    <div className="app">
      <Stars/>
      {notifs.map(n=><Notif key={n.id} msg={n}/>)}

      <div className="hdr">
        {tab !== 'game' || selectedGame || gameScreen !== 'home' ? (
          <button
            className="btn bgh bsm"
            style={{ width: 'auto', padding: '6px 12px', fontSize: 12, color: 'var(--muted)', border: '1px solid rgba(255,255,255,.1)' }}
            onClick={() => {
              if (tab !== 'game') {
                goToTab('game');
                return;
              }
              if (selectedGame === 'qumairi') {
                if (fameeriRef.current?.handleHeaderBack?.()) return;
                setSelectedGame(null);
                return;
              }
              if (selectedGame === 'nicknames') {
                if (titlesRef.current?.handleHeaderBack?.()) return;
                setSelectedGame(null);
                return;
              }
              if (gameScreen !== 'home') setGameScreen('home');
              else setSelectedGame(null);
            }}
          >
            ← رجوع
          </button>
        ) : (
          <div style={{ width: 60 }} />
        )}

        <div
          className="logo"
          role="presentation"
          style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', userSelect: 'none' }}
          onClick={handleLogoSecretTap}
        >
          {tab === 'news'
            ? '🔔 أخبار'
            : tab === 'game'
              ? selectedGame === 'qumairi'
                ? '🦅 صيد القميري'
                : '🏟️ ساحة الألعاب'
              : tab === 'suggest'
                ? '💡 اقتراح'
                : tab === 'pricing'
                  ? '💎 الباقات'
                  : tab === 'codes'
                    ? '🎫 الأكواد'
                    : tab === 'account'
                      ? '👤 حسابي'
                      : '🏟️ ساحة الألعاب'}
        </div>

        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {activeCode?.expiresAt && isCodeValid(activeCode) && (
            <SubscriptionTimer
              activeCode={activeCode}
              onExpired={() => {
                setActiveCode(null);
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
        {tab==='news'&&<News />}
        {tab==='game'&&(()=>{try{return renderGame();}catch(e){console.error('Render error:',e);return <div style={{padding:20,textAlign:'center',color:'var(--red)'}}><div style={{fontSize:40}}>⚠️</div><div style={{marginTop:8}}>خطأ في العرض — حدّث الصفحة</div><div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{e?.message}</div><button className="btn bg mt2" onClick={()=>window.location.reload()}>🔄 تحديث</button></div>;}})()}
        {tab === 'codes' && isAdmin && (
          <AdminCodesPanel notify={notify} />
        )}
        {tab === 'account' && (
          <AccountPage notify={notify} activeCode={activeCode} isCodeValid={isCodeValid} />
        )}
        {tab==='suggest'&&<Suggestions notify={notify} />}
        {tab==='pricing'&&<Packages />}
      </div>

      <nav className="bnav">
        {navItems.map(item=>(
          <button key={item.id} className={`bnav-item${tab===item.id?' active':''}`} onClick={()=>goToTab(item.id)}>
            <div className="bnav-icon">{item.icon}</div>
            <div className="bnav-label">{item.label}</div>
            {item.dot&&<div className="bnav-dot"/>}
          </button>
        ))}
      </nav>

      {showEndGamePrompt && (
        <EndGameJoinPrompt
          winner={endGameData?.winner}
          playerStats={endGameData?.playerStats}
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
            notify('🎁 التجربة المجانية مُفعّلة!', 'success');
            setShowEndGamePrompt(false);
            setEndGameData(null);
          }}
          onNewGame={() => {
            setShowEndGamePrompt(false);
            setEndGameData(null);
            setSelectedGame(null);
          }}
        />
      )}
    </div>
  );
}
