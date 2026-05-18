import { useState, useRef, useEffect, useCallback } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "./firebase";
import Packages from './pages/Packages';
import { SUPPORT_EMAIL } from './core/constants';
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

const COMMUNITY_SUGGESTIONS = [
  { id: 1, cat: 'تصميم', text: 'وضع داكن أكثر', date: '2025-03-10' },
  { id: 2, cat: 'لعبة', text: 'مؤقت صوتي عند النهاية', date: '2025-03-12' },
];

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
  const [voiceType, setVoiceType] = useState('suggest');
  const [suggForm, setSuggForm] = useState({ cat: 'لعبة', text: '' });

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

  const renderGame = () => {
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

  const renderVoice = () => {
    const typeConfig = {
      suggest: { icon: '💡', label: 'اقتراح', emailSubject: `اقتراح [${suggForm.cat}] — PFCC Playground`, cats: ['لعبة', 'تصميم', 'إحصائيات', 'أسعار', 'أخرى'] },
      bug: { icon: '🐛', label: 'مشكلة', emailSubject: `مشكلة [${suggForm.cat}] — PFCC Playground`, cats: ['لعبة الألقاب', 'صيد القميري', 'تسجيل دخول', 'أخرى'] },
      ask: { icon: '💬', label: 'استفسار', emailSubject: `استفسار — PFCC Playground`, cats: ['عام', 'الأسعار', 'طريقة اللعب', 'أخرى'] },
    };

    const cfg = typeConfig[voiceType];

    return (
      <div className="scr">
        <div className="ptitle" style={{ marginBottom: 4 }}>📣 تحديثات</div>
        <div className="psub" style={{ marginBottom: 12 }}>آخر ما يصير في PFCC Playground</div>
        {[
          { id: 1, date: '2025-03-29', title: '🎉 إطلاق النسخة التجريبية', body: 'تم إطلاق لعبة الألقاب رسمياً مع دعم الغرف الحقيقية عبر Firebase!', isNew: true },
          { id: 2, date: '2025-03-25', title: '⚡ نظام الهجوم المتزامن', body: 'الكل يهاجم في نفس الوقت — سرية تامة ثم كشف مفاجئ.', isNew: true },
          { id: 3, date: '2025-03-20', title: '📊 إحصائيات الإثارة', body: 'أكثر لقب مطاردة وأقل اسم استهدافاً.', isNew: false },
        ].map(n => (
          <div key={n.id} className="news-item">
            <div className="news-date">{n.isNew && <span className="news-new">جديد</span>}{n.date}</div>
            <div className="news-title">{n.title}</div>
            <div className="news-body">{n.body}</div>
          </div>
        ))}

        <div className="div" style={{ margin: '18px 0 14px' }}>تواصل معنا</div>

        <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
          {Object.entries(typeConfig).map(([key, val]) => (
            <button
              key={key}
              className={`btn bsm ${voiceType === key ? 'bg' : 'bgh'}`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '8px 4px' }}
              onClick={() => {
                setVoiceType(key);
                setSuggForm(f => ({ ...f, cat: typeConfig[key].cats[0] }));
              }}
            >
              <span style={{ fontSize: 18 }}>{val.icon}</span>
              <span style={{ fontSize: 10 }}>{val.label}</span>
            </button>
          ))}
        </div>

        <div className="card">
          <div className="ctitle">{cfg.icon} {cfg.label} جديد</div>
          <div className="ig">
            <label className="lbl">التصنيف</label>
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {cfg.cats.map(c => (
                <button key={c} className={`btn bsm ${suggForm.cat === c ? 'bg' : 'bgh'}`} style={{ width: 'auto' }} onClick={() => setSuggForm(f => ({ ...f, cat: c }))}>{c}</button>
              ))}
            </div>
          </div>
          <div className="ig">
            <label className="lbl">اكتب رسالتك</label>
            <textarea className="inp" placeholder="اكتب هنا..." value={suggForm.text} onChange={e => setSuggForm(f => ({ ...f, text: e.target.value }))} />
          </div>
          <button className="btn bg" onClick={() => {
            if (!suggForm.text.trim()) { notify('اكتب رسالتك أولاً', 'error'); return; }
            const sub = encodeURIComponent(cfg.emailSubject);
            const bod = encodeURIComponent(`النوع: ${cfg.label}\nالتصنيف: ${suggForm.cat}\n\n${suggForm.text}`);
            window.open(`mailto:${SUPPORT_EMAIL}?subject=${sub}&body=${bod}`);
            setSuggForm(f => ({ ...f, text: '' }));
            notify('✅ سيُفتح تطبيق البريد', 'success');
          }}>📤 إرسال عبر البريد</button>
          <div style={{ marginTop: 10, padding: '9px 12px', background: 'rgba(79,163,224,.07)', border: '1px solid rgba(79,163,224,.2)', borderRadius: 8, fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
            إلى: <strong style={{ color: 'var(--blue)' }}>{SUPPORT_EMAIL}</strong>
          </div>
        </div>

        {COMMUNITY_SUGGESTIONS.length > 0 && (
          <>
            <div className="div">من المجتمع</div>
            {COMMUNITY_SUGGESTIONS.map(s => (
              <div key={s.id} className="sugg-item">
                <div className="sugg-cat">{s.cat}</div>
                <div className="sugg-text">{s.text}</div>
                <div className="sugg-date">{s.date}</div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  };

  const navItems = [
    { id: 'game', icon: '🏟️', label: 'الألعاب' },
    { id: 'voice', icon: '💬', label: 'صوّتك', dot: false },
    ...(isAdmin ? [{ id: 'codes', icon: '🎫', label: 'الأكواد' }] : []),
    { id: 'pricing', icon: '💎', label: 'الباقات' },
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
          <p className="psub" style={{ textAlign: 'center', marginBottom: 12 }}>
            تعذّر الدخول التلقائي — فعّل Anonymous في Firebase أو سجّل بالبريد
          </p>
          <PlayerAuthScreen notify={notify} />
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
          {tab === 'voice'
            ? '💬 صوّتك'
            : tab === 'game'
              ? selectedGame === 'qumairi'
                ? '🦅 صيد القميري'
                : '🏟️ ساحة الألعاب'
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
        {showCodeActivation ? (
          <CodeActivation
            notify={notify}
            onActivationSuccess={(codeData) => {
              setActiveCode(codeData);
              setShowCodeActivation(false);
            }}
            onBack={() => setShowCodeActivation(false)}
          />
        ) : null}
        {!showCodeActivation && tab==='voice'&&renderVoice()}
        {!showCodeActivation && tab==='game'&&(()=>{try{return renderGame();}catch(e){console.error('Render error:',e);return <div style={{padding:20,textAlign:'center',color:'var(--red)'}}><div style={{fontSize:40}}>⚠️</div><div style={{marginTop:8}}>خطأ في العرض — حدّث الصفحة</div><div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{e?.message}</div><button className="btn bg mt2" onClick={()=>window.location.reload()}>🔄 تحديث</button></div>;}})()}
        {!showCodeActivation && tab === 'codes' && isAdmin && (
          <AdminCodesPanel notify={notify} />
        )}
        {!showCodeActivation && tab === 'account' && (
          <AccountPage
            notify={notify}
            activeCode={activeCode}
            isCodeValid={isCodeValid}
            isAdmin={isAdmin}
            onActivateCode={() => setShowCodeActivation(true)}
            onGoPricing={() => setTab('pricing')}
          />
        )}
        {!showCodeActivation && tab==='pricing'&&<Packages />}
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
