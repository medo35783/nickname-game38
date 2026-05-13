import { useState, useRef } from "react";
import News from './pages/News';
import Suggestions from './pages/Suggestions';
import Packages from './pages/Packages';
import Home from './pages/Home';
import TitlesGame from './games/titles/TitlesGame';
import FameeriGame from './games/fameeri/FameeriGame';
import './styles/base.css';
import Stars from './shared/Stars';
import Notif from './shared/Notif';

/* ══════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════ */
export default function App() {
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

  /* ── DERIVED ── */
  const hasNews      = true;

  const notify=(text,type='info')=>{const id=Date.now()+Math.random();setNotifs(p=>[...p,{id,text,type}]);setTimeout(()=>setNotifs(p=>p.filter(n=>n.id!==id)),3200);};
  const renderGame = () => {
    if(selectedGame === 'nicknames') return (
      <TitlesGame
        ref={titlesRef}
        notify={notify}
        setTab={setTab}
        setSelectedGame={setSelectedGame}
        onHeaderMeta={setTitlesMeta}
      />
    );

    if (selectedGame === 'qumairi') {
      return (
        <FameeriGame
          ref={fameeriRef}
          notify={notify}
          setTab={setTab}
          setSelectedGame={setSelectedGame}
        />
      );
    }

    if(gameScreen==='home'){
      return <Home setSelectedGame={setSelectedGame} />;
    }

    return null;
  };

  const navItems=[{id:'news',icon:'🔔',label:'أخبار',dot:hasNews},{id:'game',icon:'🎭',label:'اللعبة'},{id:'suggest',icon:'💡',label:'اقتراح'},{id:'pricing',icon:'💎',label:'الباقات'}];

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
          {tab==='news'?'🔔 أخبار':tab==='game'?(selectedGame==='qumairi'?'🦅 صيد القميري':'🏟️ ساحة الألعاب'):tab==='suggest'?'💡 اقتراح':'💎 الباقات'}
        </div>

        <div style={{display:'flex',gap:6,alignItems:'center'}}>
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
    </div>
  );
}
