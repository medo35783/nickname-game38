import { useState, useRef, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInAnonymously, signOut } from "firebase/auth";
import { auth } from "./firebase";
import News from './pages/News';
import Suggestions from './pages/Suggestions';
import Packages from './pages/Packages';
import Home from './pages/Home';
import AdminCodesPanel from './components/admin/AdminCodesPanel';
import AdminLogin from './components/admin/AdminLogin';
import TitlesGame from './games/titles/TitlesGame';
import FameeriGame from './games/fameeri/FameeriGame';
import './styles/base.css';
import Stars from './shared/Stars';
import Notif from './shared/Notif';
import CodeActivation from './components/codes/CodeActivation';
import SubscriptionTimer from './components/codes/SubscriptionTimer';
import EndGameJoinPrompt from './components/codes/EndGameJoinPrompt';
import { getActiveUserCode, isCodeValid, adminProfileExistsForUid } from './firebaseHelpers';

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
  const [activeCode, setActiveCode] = useState(null);
  const [showCodeActivation, setShowCodeActivation] = useState(false);
  const [showEndGamePrompt, setShowEndGamePrompt] = useState(false);
  const [endGameData, setEndGameData] = useState(null);

  useEffect(() => {
    let done = false;
    const finishAuthInit = () => {
      if (!done) {
        done = true;
        setAuthReady(true);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User authenticated:", user.uid);
        finishAuthInit();
        return;
      }

      try {
        await signInAnonymously(auth);
      } catch (error) {
        // auth/admin-restricted-operation = Anonymous غير مفعّل في Firebase Console
        console.warn("Anonymous sign-in skipped:", error?.code || error);
        finishAuthInit();
      }
    });

    const safety = setTimeout(finishAuthInit, 6000);

    return () => {
      clearTimeout(safety);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authReady) return;

    const checkAdmin = async () => {
      const storedAdmin = localStorage.getItem('pfcc_is_admin');
      const adminUid = localStorage.getItem('pfcc_admin_uid');

      if (storedAdmin === 'true' && adminUid) {
        try {
          const ok = await adminProfileExistsForUid(adminUid);
          if (ok) {
            setIsAdmin(true);
          } else {
            localStorage.removeItem('pfcc_is_admin');
            localStorage.removeItem('pfcc_admin_uid');
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('Admin check error:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }

      const userId = localStorage.getItem('pfcc_subscriber_uid');
      if (userId) {
        const code = await getActiveUserCode(userId);
        if (code && isCodeValid(code)) {
          setActiveCode(code);
        }
      }
    };

    checkAdmin();
  }, [authReady]);

  useEffect(() => {
    const handleOpenPackages = () => setTab('pricing');
    window.addEventListener('pfcc-open-packages', handleOpenPackages);
    return () => window.removeEventListener('pfcc-open-packages', handleOpenPackages);
  }, []);

  const onGameEnd = useCallback((data) => {
    if (isAdmin || (activeCode && isCodeValid(activeCode))) return;
    setEndGameData(data ?? null);
    setTimeout(() => {
      setShowEndGamePrompt(true);
    }, 2000);
  }, [isAdmin, activeCode]);

  /* ── DERIVED ── */
  const hasNews      = true;

  const notify=(text,type='info')=>{const id=Date.now()+Math.random();setNotifs(p=>[...p,{id,text,type}]);setTimeout(()=>setNotifs(p=>p.filter(n=>n.id!==id)),3200);};
  const renderGame = () => {
    if (showCodeActivation) {
      return (
        <CodeActivation
          notify={notify}
          onActivationSuccess={(codeData) => {
            setActiveCode(codeData);
            setShowCodeActivation(false);
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
        canCreateRoom={isAdmin || (activeCode && isCodeValid(activeCode))}
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
          canCreateRoom={isAdmin || (activeCode && isCodeValid(activeCode))}
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
    ...(!isAdmin ? [{ id: 'admin-login', icon: '🔐', label: 'مشرف' }] : [])
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

  return(
    <div className="app">
      <Stars/>
      {notifs.map(n=><Notif key={n.id} msg={n}/>)}

      <div className="hdr">
        {tab==='game'&&(selectedGame||gameScreen!=='home')?(
          <button className="btn bgh bsm" style={{width:'auto',padding:'6px 12px',fontSize:12,color:'var(--muted)',border:'1px solid rgba(255,255,255,.1)'}}
            onClick={()=>{
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
              if(gameScreen!=='home') setGameScreen('home');
              else setSelectedGame(null);
            }}>
            ← رجوع
          </button>
        ):(
          <div style={{width:60}}/>
        )}

        <div className="logo" style={{position:'absolute',left:'50%',transform:'translateX(-50%)'}}>
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
                    : tab === 'admin-login'
                      ? '🔐 مشرف'
                      : '🏟️ ساحة الألعاب'}
        </div>

        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {isAdmin && (
            <button
              type="button"
              className="btn bgh bsm"
              onClick={async () => {
                localStorage.removeItem('pfcc_is_admin');
                localStorage.removeItem('pfcc_admin_uid');
                setIsAdmin(false);
                setTab('game');
                try {
                  await signOut(auth);
                } catch (e) {
                  console.error(e);
                }
                notify('تم تسجيل الخروج', 'info');
              }}
              style={{ fontSize: 11 }}
            >
              🚪 خروج
            </button>
          )}
          {!isAdmin && activeCode?.expiresAt && isCodeValid(activeCode) && (
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
        {tab === 'admin-login' && !isAdmin && (
          <AdminLogin
            notify={notify}
            onLoginSuccess={() => {
              setIsAdmin(true);
              setTab('codes');
            }}
          />
        )}
        {tab==='game'&&(()=>{try{return renderGame();}catch(e){console.error('Render error:',e);return <div style={{padding:20,textAlign:'center',color:'var(--red)'}}><div style={{fontSize:40}}>⚠️</div><div style={{marginTop:8}}>خطأ في العرض — حدّث الصفحة</div><div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{e?.message}</div><button className="btn bg mt2" onClick={()=>window.location.reload()}>🔄 تحديث</button></div>;}})()}
        {tab === 'codes' && isAdmin && (
          <AdminCodesPanel notify={notify} />
        )}
        {tab==='suggest'&&<Suggestions notify={notify} />}
        {tab==='pricing'&&<Packages />}
      </div>

      <nav className="bnav">
        {navItems.map(item=>(
          <button key={item.id} className={`bnav-item${tab===item.id?' active':''}`} onClick={()=>setTab(item.id)}>
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
