import { useState, useEffect, useRef } from "react";
import './styles/base.css';
import { AV_COLORS, Q_TREES, Q_WEAPONS, Q_TOTAL, SUPPORT_EMAIL } from './core/constants';
import { genCode, fmtMs, shuffle, mkInitials } from './core/helpers';
import Stars from './shared/Stars';
import Notif from './shared/Notif';
import Av from './shared/Av';
import { db, ref, set, get, update, onValue, off, push, roomRef, playersRef, attacksRef, gameRef, qGameRef, qGroupsRef, qAttacksRef, qMembersRef } from './core/firebaseHelpers';

/* ══ HELPERS ══ */

/* ══════════════════════════════════════════════════
   FIREBASE HELPERS
══════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════
   COMPONENTS - شاشات مساعدة
══════════════════════════════════════════════════ */

// شاشة الترحيب (Onboarding)
function OnboardingScreen({ role, onDismiss }) {
  const steps = role === 'admin' ? [
    { icon: '👥', text: 'أضف المتسابقين أو دعهم ينضمون برمز الغرفة' },
    { icon: '⏱️', text: 'حدد وقت الجولة وفعّل الخيارات الخاصة' },
    { icon: '🔓', text: 'اكشف النتائج واعلن الفائز بنهاية المسابقة' }
  ] : [
    { icon: '🎭', text: 'اختر لقباً سرياً لا يمت بصلة لاهتماماتك' },
    { icon: '⚔️', text: 'هاجم الألقاب وخمّن أصحابها قبل أن يكشفوك' },
    { icon: '🏆', text: 'آخر لاعب باقٍ = الفائز!' }
  ];

  return (
    <div className="onb-bg">
      <div className="onb-card">
        <div className="onb-icon">{role === 'admin' ? '👑' : '🎮'}</div>
        <div className="onb-title">{role === 'admin' ? 'دليل المشرف' : 'دليل المتسابق'}</div>
        <div className="onb-sub">
          {role === 'admin' 
            ? 'أنت المدير الكامل للمسابقة — تحكم بكل شيء!' 
            : 'استعد للمنافسة — أخفِ هويتك واكشف الآخرين!'}
        </div>
        {steps.map((step, i) => (
          <div key={i} className="onb-step">
            <span className="onb-step-num">{i + 1}</span>
            <span className="onb-step-text">{step.icon} {step.text}</span>
          </div>
        ))}
        <button className="btn bg mt3" onClick={onDismiss}>
          ✅ فهمت، لنبدأ!
        </button>
      </div>
    </div>
  );
}

// إحصائيات "أنا" للمتسابق
function MyStatsCard({ myNickLocal, allAttacksFlat }) {
  const myAttacks = allAttacksFlat.filter(a => a.attackerNick === myNickLocal);
  const hits = myAttacks.filter(a => a.correct).length;
  const misses = myAttacks.filter(a => !a.correct).length;
  const accuracy = myAttacks.length > 0 ? Math.round((hits / myAttacks.length) * 100) : 0;

  return (
    <div className="card">
      <div className="ctitle">📊 إحصائياتي</div>
      <div className="sg sg4">
        <div className="sbox">
          <div className="snum">{myAttacks.length}</div>
          <div className="slbl">هجماتي</div>
        </div>
        <div className="sbox">
          <div className="snum" style={{color:'var(--green)'}}>{hits}</div>
          <div className="slbl">إصابات</div>
        </div>
        <div className="sbox">
          <div className="snum" style={{color:'var(--red)'}}>{misses}</div>
          <div className="slbl">أخطاء</div>
        </div>
        <div className="sbox">
          <div className="snum" style={{color:'var(--gold)'}}>{accuracy}%</div>
          <div className="slbl">دقة</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN APP
══════════════════════════════════════════════════ */
export default function App() {
  /* ── NAV ── */
  const [tab, setTab]           = useState('game');
  const [selectedGame, setSelectedGame] = useState(null); // null=الرئيسية، 'nicknames'، 'qumairi'
  const [gameScreen, setGameScreen] = useState('home');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(null); // 'admin' | 'player' | null
  const [isLoading, setIsLoading]   = useState(true);  // splash screen on startup

  /* ── SESSION ── */
  const [role, setRole]         = useState(null);     // 'admin' | 'player'
  const effectiveRole = role;
  const [myId, setMyId]         = useState(null);     // firebase player key
  const [myNickLocal, setMyNickLocal] = useState(''); // player's own nick

  /* ── ROOM (live from Firebase) ── */
  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [joinErr, setJoinErr]   = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinNick, setJoinNick] = useState('');
  const [joinNick2, setJoinNick2] = useState('');
  const [joinLoading, setJoinLoading] = useState(false); // prevent double submit
  const [roomNickMode, setRoomNickMode] = useState(1); // nickMode من الغرفة

  /* ── LIVE GAME STATE (synced from Firebase) ── */
  const [gameState, setGameState] = useState(null);   // rooms/{code}/game
  const [players, setPlayers]    = useState({});      // rooms/{code}/players
  const [attacks, setAttacks]    = useState({});      // rooms/{code}/currentRound/attacks
  const [allRoundsData, setAllRoundsData] = useState({}); // rooms/{code}/rounds

  /* ── ADMIN LOCAL ── */
  const [nickMode, setNickMode]  = useState(1);
  // nickMode الفعلي: من Firebase للمتسابقين، من الـ state للمشرف
  const effectiveNickMode = role==='admin' ? nickMode : (gameState?.nickMode||1);
  const [form, setForm]          = useState({name:'',nick:'',nick2:''});
  const [attackDur, setAttackDur] = useState({h:0, m:5, s:0}); // افتراضي 5 دقائق

  /* ── ATTACK SELECTION ── */
  const [myNick, setMyNick]      = useState(null);
  const [myGuess, setMyGuess]    = useState(null);
  const [mySubmitted, setMySubmitted] = useState(false);
  const [proxyFor, setProxyFor]  = useState(null);    // player id admin attacks for
  const [isProxyMode, setIsProxyMode] = useState(false); // وضع الإنابة الكامل (يُخفي الأسماء في الإحصائيات)

  /* ── UI ── */
  const [notifs, setNotifs]      = useState([]);
  const [modal, setModal]        = useState(null);
  const [statsTab, setStatsTab]  = useState('round');
  const [heatmapView, setHeatmapView] = useState('nicks'); // 'nicks' | 'names'
  const [suggForm, setSuggForm]  = useState({cat:'لعبة', text:''});

  /* ── QUMAIRI GAME STATE ── */
  const [qRoom, setQRoom]         = useState('');
  const [qRole, setQRole]         = useState(null);    // 'admin' | 'leader' | 'member'
  const [qGroupName, setQGroupName] = useState('');
  const [qGroupId, setQGroupId]   = useState(null);
  const [qMyName, setQMyName]     = useState('');      // اسم الفرد
  const [qMyId, setQMyId]         = useState(null);
  const [qGameState, setQGameState] = useState(null);
  const [qGroups, setQGroups]     = useState({});
  const [qMembers, setQMembers]   = useState({});      // أعضاء الغرفة
  const [qAttacks, setQAttacks]   = useState({});
  const [qJoinInput, setQJoinInput] = useState('');
  const [qJoinErr, setQJoinErr]   = useState('');
  const [qDistribution, setQDistribution] = useState({});
  const [qDistLocked, setQDistLocked] = useState(false);
  const [qAttackTarget, setQAttackTarget] = useState({group:'',tree:'',weapon:''});
  const [qReveal, setQReveal]     = useState(null);
  const [qJoinLoading, setQJoinLoading] = useState(false);
  const [qCustomTimer, setQCustomTimer] = useState('');
  const [qCountdown, setQCountdown] = useState(null); // عداد القميري الحقيقي
  const [qTurnOverlay, setQTurnOverlay] = useState(null); // {groupName, weapon}
  const [qShieldTree, setQShieldTree] = useState(null); // رقم الشجرة المحمية (0-10)
  const [qPoisonTree, setQPoisonTree] = useState(null); // رقم الشجرة المسمومة
  const [qSandstorm, setQSandstorm] = useState(false); // العاصفة الرملية
  const [qFastestMode, setQFastestMode] = useState(false); // خيار الأسرع
  const [qQuestion, setQQuestion] = useState(''); // سؤال المشرف
  const [qCorrectAnswer, setQCorrectAnswer] = useState(true); // الإجابة الصحيحة

  const [guideRole, setGuideRole] = useState('player'); // 'player' | 'admin'
  const [suggestions]            = useState([{id:1,cat:'تصميم',text:'وضع داكن أكثر',date:'2025-03-10'},{id:2,cat:'لعبة',text:'مؤقت صوتي عند النهاية',date:'2025-03-12'}]);
  const [countdown, setCountdown] = useState(null);

  /* ── SPECIAL GAME MODES ── */
  const [poisonNick, setPoisonNick]     = useState('');
  const [silentRound, setSilentRound]   = useState(false);
  const [specialRound, setSpecialRound] = useState(1);
  // اقرأ القيم من Firebase — تعريفها بعد الـ state
  const activePoisonNick   = gameState?.poisonNick   || poisonNick;
  const activeSpecialRound = gameState?.specialRound  || specialRound;
  const isSilentActive     = gameState?.silentActive  || silentRound;
  const [pendingSilent, setPendingSilent] = useState(null); // stored silent round data
  const [exitAnnounce, setExitAnnounce] = useState(null);  // cinematic exit {nick,name,eliminatedBy}
  const [flipCards, setFlipCards]       = useState({});    // {nick: flipped bool}

  /* ── REFS ── */
  const listenersRef = useRef([]);

  /* ── DERIVED ── */
  const playersList  = Object.entries(players).map(([id,p])=>({...p, id}));
  const activePlayers= playersList.filter(p=>p.status==='active');
  const elimPlayers  = playersList.filter(p=>p.status!=='active');
  const attacksList  = Object.values(attacks||{});
  const submittedCount = attacksList.length;
  const phase        = gameState?.phase || 'lobby';
  const roundNum     = gameState?.roundNum || 0;
  const roundOrder      = gameState?.roundOrder || {nicks:[], names:[]};
  const attacksPerRound = gameState?.attacksPerRound || 1; // هجمات مسموحة لكل لاعب
  const deadline     = gameState?.deadline || null;
  // allSubmitted: كل لاعب نشط أكمل عدد هجماته المطلوب
  const playerAttackCounts = {};
  attacksList.forEach(a=>{if(a.attackerNick)playerAttackCounts[a.attackerNick]=(playerAttackCounts[a.attackerNick]||0)+1;});
  const allSubmitted = activePlayers.length > 0 && activePlayers.every(p=>{
    const nicks=[p.nick,p.nick2].filter(Boolean);
    const done=nicks.reduce((sum,n)=>sum+(playerAttackCounts[n]||0),0);
    return done>=attacksPerRound;
  });
  // هل المتسابق الحالي أتم هجماته؟ — نحسب من Firebase لا من state محلي
  // هل أتممت هجماتي؟ — بناء على Firebase مباشرة
  const myDoneCount = attacksList.filter(a=>a.attackerNick===myNickLocal).length;
  const myAttacksDone = myNickLocal ? myDoneCount >= attacksPerRound : false;
  const allRoundsList= Object.values(allRoundsData||{}).sort((a,b)=>a.round-b.round);
  const allAttacksFlat = allRoundsList.flatMap(r=>Object.values(r.attacks||{}));
  // الأشرس — يُحسب دائماً من كل الجولات
  const attackerRankGlobal = playersList.map(p=>{
    const nicks=[p.nick,p.nick2].filter(Boolean);
    const atks=allAttacksFlat.filter(a=>nicks.includes(a.attackerNick));
    return{id:p.id,name:p.name,nick:p.nick,nick2:p.nick2,colorIdx:p.colorIdx,initials:p.initials,status:p.status,count:atks.length,hits:atks.filter(a=>a.correct).length};
  }).filter(p=>p.count>0).sort((a,b)=>b.hits-a.hits||b.count-a.count);
  const hasNews      = true;

  /* ══ AUTO-REJOIN on mount ══ */
  useEffect(()=>{ checkAutoRejoin(); },[]);

  /* ══ FIREBASE LISTENERS ══ */
  useEffect(()=>{
    if(!roomCode) return;
    // game state
    const gRef = gameRef(roomCode);
    const unsub1 = onValue(gRef, snap=>{ setGameState(snap.val()); });
    // players
    const pRef = playersRef(roomCode);
    const unsub2 = onValue(pRef, snap=>{ setPlayers(snap.val()||{}); });
    // attacks
    const aRef = attacksRef(roomCode);
    const unsub3 = onValue(aRef, snap=>{ setAttacks(snap.val()||{}); });
    // all rounds
    const rRef = ref(db, `rooms/${roomCode}/rounds`);
    const unsub4 = onValue(rRef, snap=>{ setAllRoundsData(snap.val()||{}); });

    return ()=>{ off(gRef); off(pRef); off(aRef); off(rRef); };
  }, [roomCode]);

  /* ══ QUMAIRI FIREBASE LISTENERS ══ */
  useEffect(()=>{
    if(!qRoom) return;
    const qgRef = ref(db, `qrooms/${qRoom}/game`);
    const qpRef = ref(db, `qrooms/${qRoom}/groups`);
    const qaRef = ref(db, `qrooms/${qRoom}/attacks`);
    const qmRef = ref(db, `qrooms/${qRoom}/members`);
    onValue(qgRef, snap=>setQGameState(snap.val()));
    onValue(qpRef, snap=>setQGroups(snap.val()||{}));
    onValue(qaRef, snap=>setQAttacks(snap.val()||{}));
    onValue(qmRef, snap=>setQMembers(snap.val()||{}));
    return ()=>{ off(qgRef); off(qpRef); off(qaRef); off(qmRef); };
  }, [qRoom]);

  /* ══ QUMAIRI AUTO-REJOIN ══ */
  useEffect(()=>{
    const saved = localStorage.getItem('ng_qumairi');
    if(!saved) return;
    try{
      const s = JSON.parse(saved);
      if(s.qRoom) setQRoom(s.qRoom);
      if(s.qRole) setQRole(s.qRole);
      if(s.qGroupId) setQGroupId(s.qGroupId);
      if(s.qGroupName) setQGroupName(s.qGroupName);
      if(s.qMyName) setQMyName(s.qMyName);
      if(s.qMyId) setQMyId(s.qMyId);
      if(s.qDistLocked) setQDistLocked(true);
      setSelectedGame('qumairi');
      // Navigate based on phase later
    }catch(e){localStorage.removeItem('ng_qumairi');}
  }, []);

  // Qumairi countdown timer — يحدّث كل ثانية بدقة
  const qTimerDeadline = qGameState?.timer?.deadline;
  useEffect(()=>{
    if(!qTimerDeadline){setQCountdown(null);return;}
    const dl = qTimerDeadline;
    const tick=()=>{
      const rem=Math.ceil((dl-Date.now())/1000);
      if(rem<=0){setQCountdown(0);}
      else{
        setQCountdown(rem);
        if(rem<=3) playSound('countdown_last');
        else if(rem<=10) playSound('countdown');
      }
    };
    tick();
    const t=setInterval(tick,1000);
    return()=>clearInterval(t);
  },[qTimerDeadline]);

  // Auto-navigate qumairi based on phase
  useEffect(()=>{
    if(!qRoom || !qGameState) return;
    const ph = qGameState.phase;
    if(ph==='lobby') setGameScreen('qumairi_lobby');
    else if(ph==='distributing') setGameScreen('qumairi_lobby');
    else if(ph==='playing') setGameScreen('qumairi_play');
    else if(ph==='ended') setGameScreen('qumairi_results');
  },[qGameState?.phase, qRoom]);

  // Qumairi — dramatic reveal sequence
  const lastResultRef = useRef(null);
  useEffect(()=>{
    // إذا المشرف ضغط متابعة — أخفِ كل شيء
    if(!qGameState?.showResult){setQReveal(null);return;}
    if(!qGameState?.lastResult) return;
    const lr = qGameState.lastResult;
    if(lastResultRef.current === lr.timestamp) return;
    lastResultRef.current = lr.timestamp;

    // مرحلة 1: صمت — ثانيتين
    setQReveal({phase:'suspense',tree:lr.tree,weapon:lr.weaponName,attackerName:lr.attackerName,targetName:lr.targetName,
      poisonMsg:lr.poisonMsg});

    // مرحلة 2: صوت السلاح — بعد ثانيتين
    setTimeout(()=>{
      if(lr.weapon==='showzel') playSound('explosion');
      else if(lr.weapon==='omsagma') playSound('suspense');
      else playSound('countdown_last');
      setQReveal(prev=>prev?{...prev,phase:'weapon'}:null);
    },2000);

    // مرحلة 3: النتيجة — بعد 3.5 ثواني
    setTimeout(()=>{
      if(!qGameState?.showResult) return;
      if(lr.result==='success' && lr.hunted>0){
        playSound('applause');
        setQReveal(prev=>prev?{...prev,phase:'result',type:'success',hunted:lr.hunted}:null);
      } else if(lr.result==='success' && lr.hunted===0){
        setQReveal(prev=>prev?{...prev,phase:'result',type:'empty'}:null);
      } else {
        setQReveal(prev=>prev?{...prev,phase:'result',type:'fail'}:null);
      }
    },3500);
  },[qGameState?.lastResult, qGameState?.showResult]);

  // Qumairi — show turn overlay
  useEffect(()=>{
    if(!qGameState?.currentAttack) { setQTurnOverlay(null); return; }
    const ca = qGameState.currentAttack;
    setQTurnOverlay({groupName:ca.attackerName,weapon:ca.weaponName});
  },[qGameState?.currentAttack]);

  /* ══ COUNTDOWN ══ */
  useEffect(()=>{
    if(!deadline){ setCountdown(null); return; }
    const tick=()=>{
      const rem = deadline - Date.now();
      if(rem<=0){
        setCountdown(0);
        // انتهى الوقت — لا كشف تلقائي، المشرف فقط يقرر
        // doReveal() محذوف عمداً
      } else {
        setCountdown(rem);
        // Countdown sounds
        const secs = Math.floor(rem/1000);
        if(secs<=3 && secs>0) playSound('countdown_last');
        else if(secs<=10 && secs>3) playSound('countdown');
      }
    };
    tick();
    const t = setInterval(tick, 500);
    return()=>clearInterval(t);
  },[deadline, phase]);

  /* ══ AUTO-NAVIGATE based on phase ══ */
  useEffect(()=>{
    if(!gameState) return;
    if(phase==='attacking')   {
      window._resultsPlayed=false; // reset results sound
      if(role==='admin' && !proxyFor) setGameScreen('admin_live');
      else setGameScreen('attack');
      setMyNick(null); setMyGuess(null); setMySubmitted(false);
      if(!proxyFor) setProxyFor(null);
    }
    if(phase==='revealing')   setGameScreen('results');
    if(phase==='ended')       { setGameScreen('winner'); setTimeout(()=>playSound('applause'),500); setTimeout(()=>playSound('applause'),1400); }
  },[phase]);

  /* ══ AUDIO ENGINE (Web Audio API — no files needed) ══ */
  const playSound = (type) => {
    try {
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const play = (freq, dur, vol=0.3, wave='sine', delay=0) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = wave; o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime+delay);
        g.gain.linearRampToValueAtTime(vol, ctx.currentTime+delay+0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+delay+dur);
        o.start(ctx.currentTime+delay);
        o.stop(ctx.currentTime+delay+dur+0.05);
      };
      if(type==='countdown') {
        // تك تك تنازلي — نبضة واحدة حادة
        play(880, 0.08, 0.25, 'square');
      } else if(type==='countdown_last') {
        // آخر 3 ثواني — أقوى وأعلى
        play(1100, 0.12, 0.4, 'square');
      } else if(type==='suspense') {
        // ترقب — نغمات متصاعدة
        [200,240,280,320,380].forEach((f,i)=>play(f,0.3,0.15,'sine',i*0.18));
        play(500,0.8,0.2,'sine',1.0);
      } else if(type==='explosion') {
        // انفجار كشف — ضربة + رنين
        play(150,0.15,0.5,'sawtooth');
        play(300,0.3,0.3,'square',0.05);
        play(600,0.4,0.2,'sine',0.1);
        play(900,0.5,0.15,'sine',0.2);
      } else if(type==='applause') {
        // تصفيق — نويز متقطع
        for(let i=0;i<12;i++){
          const o=ctx.createOscillator(),g=ctx.createGain(),bf=ctx.createBiquadFilter();
          o.type='sawtooth'; o.frequency.value=80+Math.random()*200;
          bf.type='bandpass'; bf.frequency.value=1000+Math.random()*2000; bf.Q.value=0.5;
          o.connect(bf); bf.connect(g); g.connect(ctx.destination);
          const t=ctx.currentTime+i*0.08;
          g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.15,t+0.02);
          g.gain.exponentialRampToValueAtTime(0.001,t+0.12);
          o.start(t); o.stop(t+0.15);
        }
      } else if(type==='poison_hit') {
        // ضربة مسمومة
        play(200,0.2,0.4,'sawtooth');
        play(100,0.4,0.3,'sine',0.1);
      }
    } catch(e) {}
  };

  /* ══ HELPERS ══ */
  const notify=(text,type='info')=>{const id=Date.now()+Math.random();setNotifs(p=>[...p,{id,text,type}]);setTimeout(()=>setNotifs(p=>p.filter(n=>n.id!==id)),3200);};
  const totalMs=()=>Math.max((Number(attackDur.h)*3600+Number(attackDur.m)*60+Number(attackDur.s))*1000,5*60*1000);
  const cdInfo=()=>{if(countdown===null)return{label:'—',urgent:false};if(countdown<=0)return{label:'انتهى الوقت!',urgent:true};return{label:fmtMs(countdown),urgent:countdown<5*60*1000};};
  
  // دالة تطبيع اللقب (منع التشابه: هاء/تاء مربوطة، همزة/ألف، ياء/ألف مقصورة)
  const normalizeName = (str) => {
    return str.trim().toLowerCase()
      .replace(/ة$/g, 'ه')      // تاء مربوطة → هاء
      .replace(/أ|إ|آ/g, 'ا')   // همزة → ألف عادي
      .replace(/ى/g, 'ي');      // ألف مقصورة → ياء
  };

  /* ══ ADMIN: CREATE ROOM ══ */
  const createRoom = async () => {
    // Clear any old session so players aren't stuck in old room
    localStorage.removeItem('ng_session');
    localStorage.removeItem('ng_admin_session');
    const code = genCode();
    setRoomCode(code);
    await set(roomRef(code), {
      game: { phase:'lobby', roundNum:0, createdAt: Date.now() },
      players: {},
    });
    // Save admin session
    localStorage.setItem('ng_admin_session', JSON.stringify({ roomCode: code }));
    setRole('admin');
    setGameScreen('admin');
    notify(`✅ الغرفة جاهزة: ${code}`, 'gold');
  };

  /* ══ ADMIN: ADD PLAYER ══ */
  const addPlayer = async () => {
    const {name, nick, nick2} = form;
    if(!name.trim()||!nick.trim()){notify('أدخل الاسم واللقب','error');return;}
    if(nickMode===2&&!nick2.trim()){notify('أدخل اللقب الثاني','error');return;}
    // استخدام تطبيع اللقب لمنع التشابه
    const allNicks = playersList.flatMap(p=>[p.nick,p.nick2].filter(Boolean));
    const normalizedNicks = allNicks.map(normalizeName);
    if(normalizedNicks.includes(normalizeName(nick))){notify(`⚠️ اللقب "${nick.trim()}" سبقك أحد عليه — اختر لقباً آخر`,'error');return;}
    if(nickMode===2&&normalizedNicks.includes(normalizeName(nick2))){notify(`⚠️ اللقب "${nick2.trim()}" سبقك أحد عليه — اختر لقباً آخر`,'error');return;}
    if(nickMode===2&&normalizeName(nick)===normalizeName(nick2)){notify('اللقبان متطابقان — يجب أن يختلفا','error');return;}
    const newRef = push(playersRef(roomCode));
    await set(newRef, {
      name:name.trim(), nick:nick.trim(),
      nick2: nickMode===2 ? nick2.trim() : null,
      initials: mkInitials(name.trim()),
      colorIdx: playersList.length % AV_COLORS.length,
      status:'active', missedRounds:0,
    });
    setForm({name:'',nick:'',nick2:''});
    notify(`✅ أضيف ${name.trim()}`, 'success');
  };

  /* ══ PLAYER: JOIN ROOM ══ */
  const joinRoom = async () => {
    if(joinLoading) return; // منع الضغط المزدوج
    setJoinErr('');
    if(joinInput.length!==4){setJoinErr('الرمز 4 أرقام');return;}
    if(!joinName.trim()||!joinNick.trim()){setJoinErr('أدخل اسمك ولقبك');return;}
    setJoinLoading(true);
    try {
      const snap = await get(roomRef(joinInput));
      if(!snap.exists()){setJoinErr('الغرفة غير موجودة');return;}
      const data = snap.val();
      const existingPlayers = Object.entries(data.players||{});
      const gamePhase = data.game?.phase || 'lobby';

      // Check if player already exists (rejoin)
      const existing = existingPlayers.find(([id,p])=>
        p.name?.trim()===joinName.trim() && p.nick?.trim()===joinNick.trim()
      );

      if(existing) {
        // REJOIN — player already registered
        const [existingId, existingData] = existing;
        setMyId(existingId);
        setMyNickLocal(existingData.nick);
        setRoomCode(joinInput);
        setRole('player');
        // Save to localStorage for auto-rejoin
        localStorage.setItem('ng_session', JSON.stringify({
          roomCode: joinInput, name: joinName.trim(), nick: joinNick.trim(), playerId: existingId
        }));
        if(gamePhase==='lobby') setGameScreen('waiting');
        else if(gamePhase==='attacking') setGameScreen('attack');
        else if(gamePhase==='revealing') setGameScreen('results');
        else if(gamePhase==='ended') setGameScreen('winner');
        notify('✅ تم الرجوع للعبة!', 'success');
        return;
      }

      // NEW JOIN — player not registered yet
      if(gamePhase!=='lobby'){
        setJoinErr('اللعبة بدأت — لا يمكن الانضمام لأول مرة');
        return;
      }
      // check nick not taken — استخدام تطبيع اللقب
      const existingNicks = existingPlayers.flatMap(([,p])=>[p.nick,p.nick2].filter(Boolean));
      const normalizedExisting = existingNicks.map(normalizeName);
      if(normalizedExisting.includes(normalizeName(joinNick))){setJoinErr(`⚠️ اللقب "${joinNick.trim()}" سبقك أحد عليه — اختر لقباً مختلفاً`);return;}
      // Validate nick2 if nickMode=2
      if(roomNickMode===2){
        if(!joinNick2.trim()){setJoinErr('أدخل لقبك الثاني');setJoinLoading(false);return;}
        if(normalizedExisting.includes(normalizeName(joinNick2))){setJoinErr('اللقب الثاني سبقك أحد عليه — اختر لقباً آخر');setJoinLoading(false);return;}
        if(normalizeName(joinNick)===normalizeName(joinNick2)){setJoinErr('اللقبان يجب أن يختلفا');setJoinLoading(false);return;}
      }
      const newRef = push(playersRef(joinInput));
      await set(newRef, {
        name:joinName.trim(), nick:joinNick.trim(),
        nick2: roomNickMode===2 ? joinNick2.trim() : null,
        initials:mkInitials(joinName.trim()),
        colorIdx: existingPlayers.length % AV_COLORS.length,
        status:'active', missedRounds:0,
      });
      setMyId(newRef.key);
      setMyNickLocal(joinNick.trim());
      setRoomCode(joinInput);
      setRole('player');
      // Clear old sessions and save new
      localStorage.removeItem('ng_admin_session');
      localStorage.setItem('ng_session', JSON.stringify({
        roomCode: joinInput, name: joinName.trim(), nick: joinNick.trim(), playerId: newRef.key
      }));
      setGameScreen('waiting');
      notify('✅ انضممت للعبة! انتظر المشرف', 'success');
    } catch(e) {
      setJoinErr('خطأ في الاتصال — تحقق من الإنترنت');
    } finally {
      setJoinLoading(false);
    }
  };

  /* ══ AUTO-REJOIN from localStorage ══ */
  const checkAutoRejoin = async () => {
    try {
      // Check admin session first
      const adminSaved = localStorage.getItem('ng_admin_session');
      if(adminSaved) {
        const adminSession = JSON.parse(adminSaved);
        const snap = await get(roomRef(adminSession.roomCode));
        if(snap.exists()) {
          const data = snap.val();
          const phase = data.game?.phase || 'lobby';
          // Don't rejoin ended game
          if(phase==='ended'){ localStorage.removeItem('ng_admin_session'); setIsLoading(false); return; }
          setRoomCode(adminSession.roomCode);
          setRole('admin');
          if(phase==='lobby') setGameScreen('admin');
          else if(phase==='attacking') setGameScreen('attack');
          else if(phase==='revealing') setGameScreen('results');
          setIsLoading(false);
          return;
        } else {
          localStorage.removeItem('ng_admin_session');
        }
      }
      // Check player session
      const saved = localStorage.getItem('ng_session');
      if(!saved) { setIsLoading(false); return; }
      const session = JSON.parse(saved);
      if(!session.roomCode||!session.name||!session.nick) return;
      const snap = await get(roomRef(session.roomCode));
      if(!snap.exists()) { localStorage.removeItem('ng_session'); return; }
      const data = snap.val();
      const existing = Object.entries(data.players||{}).find(([id,p])=>
        p.name?.trim()===session.name && p.nick?.trim()===session.nick
      );
      if(!existing) { localStorage.removeItem('ng_session'); return; }
      const [existingId] = existing;
      const phase = data.game?.phase || 'lobby';
      // Don't rejoin ended game
      if(phase==='ended'){ localStorage.removeItem('ng_session'); setIsLoading(false); return; }
      setMyId(existingId);
      setMyNickLocal(session.nick);
      setJoinName(session.name);
      setJoinNick(session.nick);
      setJoinInput(session.roomCode);
      setRoomCode(session.roomCode);
      setRole('player');
      if(phase==='lobby') setGameScreen('waiting');
      else if(phase==='attacking') setGameScreen('attack');
      else if(phase==='revealing') setGameScreen('results');
    } catch(e) { localStorage.removeItem('ng_session'); }
    finally { setIsLoading(false); }
  };

  /* ══ ADMIN: START GAME / LAUNCH ROUND ══ */
  const launchRound = async (rn) => {
    const dl = Date.now() + totalMs();
    const allNicks = shuffle(playersList.flatMap(p=>[p.nick,p.nick2].filter(Boolean)));
    const allNames = shuffle(playersList.map(p=>p.id));
    // clear previous attacks
    await set(ref(db, `rooms/${roomCode}/currentRound`), { attacks:{} });
    // امسح عقوبات اللقب المسموم — الجولة الممنوعة انتهت
    const banCleanup = {};
    playersList.forEach(p=>{
      // اللاعب كان ممنوع في جولة سابقة — امسح العقوبة
      if(p.isBannedNextRound && p.isBannedNextRound < rn){
        banCleanup[`rooms/${roomCode}/players/${p.id}/isBannedNextRound`] = null;
      }
    });
    if(Object.keys(banCleanup).length>0) await update(ref(db), banCleanup);

    const updates = {
      phase:'attacking',
      roundNum: rn,
      deadline: dl,
      roundOrder: { nicks:allNicks, names:allNames },
      attacksPerRound: activeSpecialRound, // عدد الهجمات الحقيقي
      specialRound: 1, // إعادة للوضع الافتراضي
      poisonNick: null
    };
    // لا تُعيد silentActive إذا كان مُفعّلاً بالفعل
    if (!isSilentActive) {
      updates.silentActive = false;
    }
    await update(gameRef(roomCode), updates);
    setSpecialRound(1); // إعادة local state
    notify(`🔔 الجولة ${rn} بدأت!`, 'gold');
  };

  const startGame = async () => {
    const minPlayers = nickMode===2 ? 4 : 6;
    if(activePlayers.length<minPlayers){notify(`يلزم ${minPlayers} لاعبين على الأقل`,'error');return;}
    // احفظ nickMode في Firebase عشان المتسابقين يعرفون
    await update(gameRef(roomCode), { nickMode });
    await launchRound(1);
  };

  /* ══ PLAYER: SUBMIT ATTACK ══ */
  const submitAttack = async (attackerNickOverride=null) => {
    if(!myNick||!myGuess){notify('اختر لقباً وحدد صاحبه','error');return;}

    const attackerNick = attackerNickOverride || myNickLocal || '(لاعب)';

    // تحقق من عقوبة اللقب المسموم
    const attackerData = playersList.find(p=>p.nick===attackerNick||p.nick2===attackerNick);
    if(attackerData?.isBannedNextRound && attackerData.isBannedNextRound >= roundNum){
      notify('☠️ أنت ممنوع من الهجوم هذه الجولة — عقوبة اللقب المسموم!','error');
      return;
    }

    // Block if attacker is eliminated or inactive
    const attackerPlayer = playersList.find(p=>p.nick===attackerNick||p.nick2===attackerNick);
    if(attackerPlayer && attackerPlayer.status!=='active'){
      notify('❌ لا يمكنك الهجوم — أنت خارج المسابقة','error');
      return;
    }

    // Block self-attack — attacker cannot target their own nick
    const realOwner = playersList.find(p=>p.nick===myNick||p.nick2===myNick);
    if(!realOwner){notify('لقب غير موجود!','error');return;}
    if(realOwner.nick===attackerNick||realOwner.nick2===attackerNick){
      notify('❌ لا يمكنك مهاجمة لقبك أنت!','error');
      return;
    }
    // Block self-attack by name/id
    if(attackerPlayer && myGuess===attackerPlayer.id){
      notify('❌ لا يمكنك تخمين نفسك!','error');
      return;
    }
    // منع تخمين نفسك بالاسم أو بالـ ID
    const guessedP = playersList.find(p=>p.id===myGuess);
    if(myId && myGuess===myId){
      notify('❌ لا يمكنك تخمين نفسك!','error');
      return;
    }
    if(guessedP && joinName.trim() && guessedP.name?.trim()===joinName.trim()){
      notify('❌ لا يمكنك تخمين نفسك!','error');
      return;
    }

    // احسب هجمات هذا اللاعب — قراءة مباشرة من Firebase بـ ID اللاعب
    const freshSnap = await get(attacksRef(roomCode));
    const freshAttacks = freshSnap.val() || {};
    const attackerPlayerId = attackerPlayer?.id;
    const myAttacksCount = Object.values(freshAttacks).filter(a=>{
      if(a.attackerPlayerId && attackerPlayerId) return a.attackerPlayerId===attackerPlayerId;
      const nicks = attackerPlayer ? [attackerPlayer.nick, attackerPlayer.nick2].filter(Boolean) : [attackerNick];
      return nicks.includes(a.attackerNick);
    }).length;
    if(myAttacksCount >= attacksPerRound){
      notify(`❌ وصلت للحد الأقصى — ${attacksPerRound} هجمة لكل لاعب في هذه الجولة`,'error');
      return;
    }

    const guessedPlayer = playersList.find(p=>p.id===myGuess);
    const correct = guessedPlayer?.id === realOwner.id;

    // احفظ attackerPlayerId ليكون الفحص دقيقاً (لاعب واحد = هوية واحدة حتى لو عنده لقبان)
    const actualAttackerId = attackerPlayer?.id || myId || null;
    // Firebase Transaction — يمنع Race Conditions والنقر المزدوج
    const attackData = {
      attackerNick,
      attackerId: myId || attackerNickOverride,
      attackerPlayerId: actualAttackerId,
      targetNick: myNick,
      guessedId: myGuess,
      guessedName: guessedPlayer?.name,
      realOwnerId: realOwner.id,
      realOwnerName: realOwner.name,
      correct,
      time: Date.now(),
    };
    const newAttackRef = push(attacksRef(roomCode));
    try {
      await set(newAttackRef, attackData);
    } catch(err) {
      notify('⚠️ فشل الإرسال — حاول مرة أخرى','error');
      return;
    }
    const myNewCount = myAttacksCount + 1;
    // لا نحتاج setMySubmitted — myAttacksDone يحسب من Firebase
    // دائماً أعد تهيئة الاختيار بعد كل هجمة
    setMyNick(null);
    setMyGuess(null);
    setProxyFor(null);
    if(attacksPerRound > 1){
      notify(`✅ هجمة ${myNewCount}/${attacksPerRound}${myNewCount < attacksPerRound ? ' — هاجم مرة أخرى!' : ' — اكتملت هجماتك!'}`, 'gold');
    } else {
      notify('✅ تم إرسال الهجوم!', 'gold');
    }
  };

  /* ══ ADMIN: REVEAL ══ */
  const doReveal = async () => {
    if(phase!=='attacking') return;
    const currentAttacks = Object.values(attacks||{});
    const notSent = activePlayers.filter(p=>!currentAttacks.some(a=>a.attackerNick===p.nick));
    if(notSent.length>0 && !modal){
      setModal({type:'confirm_reveal', notSent});
      return;
    }
    setModal(null);
    await processReveal(currentAttacks);
  };

  const processReveal = async (currentAttacks) => {
    playSound('suspense');

    // ══ اللقب المسموم — عقوبة في الجولة القادمة ══
    if(activePoisonNick) {
      const poisonMisses = currentAttacks.filter(a=>a.targetNick===activePoisonNick && !a.correct);
      if(poisonMisses.length>0) {
        setTimeout(()=>{ playSound('poison_hit'); notify(`☠️ ${poisonMisses.length} لاعب وقع في فخ اللقب المسموم — ممنوع من الجولة القادمة!`,'info'); },600);
        // احفظ العقوبة مباشرة في بيانات كل لاعب معاقب
        const banUpdates = {};
        const nextRound = (gameState?.roundNum||0) + 1;
        poisonMisses.forEach(atk=>{
          // احصل على ID اللاعب من الهجمة
          const pid = atk.attackerPlayerId || playersList.find(p=>p.nick===atk.attackerNick||p.nick2===atk.attackerNick)?.id;
          if(pid) banUpdates[`rooms/${roomCode}/players/${pid}/isBannedNextRound`] = nextRound;
        });
        if(Object.keys(banUpdates).length>0) await update(ref(db), banUpdates);
      }
    }

    // Deduplicate — two attacks on same player = ONE elimination, merge attacker names
    const seenElimIds = new Set();
    const elimAttackers = {}; // playerId -> [attacker nicks]
    currentAttacks.forEach(a=>{
      if(a.correct){
        if(!elimAttackers[a.realOwnerId]) elimAttackers[a.realOwnerId]=[];
        elimAttackers[a.realOwnerId].push(a.attackerNick);
        seenElimIds.add(a.realOwnerId);
      }
    });
    const elimIds = seenElimIds;

    // ══ SILENT ROUND: store attacks only, keep everyone active ══
    if(isSilentActive){
      const roundKey = `round_${roundNum}`;
      // Build silent exit data (for later reveal) but DON'T change player status
      const silentExits = playersList
        .filter(p=>elimIds.has(p.id))
        .map(p=>({
          playerId: p.id, nick:p.nick, nick2:p.nick2, name:p.name,
          attackers: elimAttackers[p.id]||[], roundNum,
          initials:p.initials, colorIdx:p.colorIdx
        }));
      // Also track missed rounds for silent
      const silentMissed = playersList
        .filter(p=>p.status==='active'&&!currentAttacks.some(a=>a.attackerNick===p.nick))
        .map(p=>({playerId:p.id, missedRounds:(p.missedRounds||0)+1}));

      const updates = {};
      updates[`rooms/${roomCode}/rounds/${roundKey}`]={
        round:roundNum, attacks:attacks||{}, endedAt:Date.now(), silent:true
      };
      updates[`rooms/${roomCode}/game/phase`]='attacking';
      updates[`rooms/${roomCode}/game/silentPending`]={ silentExits, silentMissed, roundNum };
      await update(ref(db), updates);
      setSilentRound(false); await update(gameRef(roomCode),{silentActive:false});
      // Launch next round immediately — silent results hidden
      notify(`🤫 جولة الصمت ${roundNum} — انتقلنا للجولة ${roundNum+1}`,'info');
      await launchRound(roundNum+1);
      return;
    }

    // ══ NORMAL ROUND ══
    const updates = {};
    const exitList = [];

    // ── دمج الجولة الصامتة السابقة إن وُجدت ──
    const pendingSilent = gameState?.silentPending;
    if(pendingSilent?.silentExits?.length > 0){
      pendingSilent.silentExits.forEach(ex=>{
        const p = playersList.find(pl=>pl.id===ex.playerId);
        if(p && p.status==='active'){
          const attackersStr = (ex.attackers||[]).join(' + ');
          updates[`rooms/${roomCode}/players/${p.id}/status`] = 'eliminated';
          updates[`rooms/${roomCode}/players/${p.id}/eliminatedBy`] = attackersStr;
          updates[`rooms/${roomCode}/players/${p.id}/eliminatedRound`] = ex.roundNum;
          exitList.push({nick:ex.nick, nick2:ex.nick2, name:ex.name, eliminatedBy:attackersStr, attackers:ex.attackers, initials:ex.initials, colorIdx:ex.colorIdx, fromSilentRound:ex.roundNum});
        }
      });
      // حدّث الخامل من الجولة الصامتة
      pendingSilent.silentMissed?.forEach(m=>{
        const p = playersList.find(pl=>pl.id===m.playerId);
        if(p && p.status==='active'){
          updates[`rooms/${roomCode}/players/${p.id}/missedRounds`] = m.missedRounds;
          if(m.missedRounds >= 2){
            updates[`rooms/${roomCode}/players/${p.id}/status`] = 'inactive';
            updates[`rooms/${roomCode}/players/${p.id}/eliminatedRound`] = pendingSilent.roundNum;
          }
        }
      });
      // امسح silentPending
      updates[`rooms/${roomCode}/game/silentPending`] = null;
    }

    for(const p of playersList){
      if(elimIds.has(p.id)){
        const attackers = elimAttackers[p.id]||[];
        const eliminatedByStr = attackers.join(' + ');

        // لقبان: تحقق إذا تم كشف كلا اللقبين
        if(p.nick2){
          const hitNicks = currentAttacks.filter(a=>a.correct&&a.realOwnerId===p.id).map(a=>a.targetNick);
          const nick1Hit = hitNicks.includes(p.nick);
          const nick2Hit = hitNicks.includes(p.nick2);
          if(!nick1Hit||!nick2Hit){
            // لقب واحد فقط كُشف — اللاعب يبقى لكن نضع علامة
            const revealedNick = nick1Hit ? p.nick : p.nick2;
            updates[`rooms/${roomCode}/players/${p.id}/revealedNick`]=revealedNick;
            exitList.push({nick:revealedNick, name:null, partial:true, eliminatedBy:eliminatedByStr, attackers, initials:p.initials, colorIdx:p.colorIdx});
            continue; // لا يخرج
          }
        }

        updates[`rooms/${roomCode}/players/${p.id}/status`]='eliminated';
        updates[`rooms/${roomCode}/players/${p.id}/eliminatedBy`]=eliminatedByStr;
        updates[`rooms/${roomCode}/players/${p.id}/eliminatedByList`]=attackers;
        updates[`rooms/${roomCode}/players/${p.id}/eliminatedRound`]=roundNum;
        exitList.push({
          nick:p.nick, nick2:p.nick2, name:p.name,
          eliminatedBy:eliminatedByStr, attackers,
          initials:p.initials, colorIdx:p.colorIdx
        });
      } else if(p.status==='active'){
        const submitted = currentAttacks.some(a=>a.attackerNick===p.nick);
        const nm = submitted ? 0 : (p.missedRounds||0)+1;
        updates[`rooms/${roomCode}/players/${p.id}/missedRounds`]=nm;
        // المعاقب بالمسموم لا يُطرد بالخمول
        if(nm>=2 && !p.isBannedNextRound){
          updates[`rooms/${roomCode}/players/${p.id}/status`]='inactive';
          updates[`rooms/${roomCode}/players/${p.id}/eliminatedRound`]=roundNum;
          exitList.push({nick:p.nick, name:p.name, eliminatedBy:'الخمول', attackers:[], initials:p.initials, colorIdx:p.colorIdx, inactive:true});
        }
      }
    }

    const roundKey = `round_${roundNum}`;
    updates[`rooms/${roomCode}/rounds/${roundKey}`]={ round:roundNum, attacks:attacks||{}, endedAt:Date.now() };
    // إذا بقي اثنان أو أقل بعد هذه الجولة — أنهِ المسابقة مباشرة
    const remainingAfter = playersList.filter(p=>p.status==='active'&&!elimIds.has(p.id)).length;
    updates[`rooms/${roomCode}/game/phase`] = remainingAfter<=2 ? 'ended' : 'revealing';
    await update(ref(db), updates);

    if(exitList.length>0){
      exitList.forEach((ex,i)=>{
        setTimeout(()=>{
          playSound('explosion');
          setExitAnnounce(ex);
          setTimeout(()=>setExitAnnounce(null), 3000);
        }, i*3200);
      });
    }

    // Init flip cards — ONE card per eliminated player (deduplicated)
    const fc = {};
    [...elimIds].forEach(id=>{
      const p = playersList.find(pl=>pl.id===id);
      if(p) fc[p.nick]=false;
    });
    setFlipCards(fc);
  };

  /* ══ ADMIN: NEXT ROUND ══ */
  const nextRound = async () => {
    const still = playersList.filter(p=>p.status==='active');
    if(still.length<=2){ await update(gameRef(roomCode),{phase:'ended'}); return; } // اثنان أو أقل = فائزان
    await launchRound(roundNum+1);
  };

  /* ══ ADMIN CONTROLS ══ */
  const extendTime = async (ms) => {
    await update(gameRef(roomCode),{deadline:(deadline||Date.now())+ms});
    notify(`⏱️ تمديد ${fmtMs(ms)}`,'gold');
  };
  const endGame = async () => {
    await update(gameRef(roomCode),{phase:'ended'});
    // Clear ALL sessions so no one auto-rejoins a finished game
    localStorage.removeItem('ng_session');
    localStorage.removeItem('ng_admin_session');
  };
  const elimCheat = async (pid) => {
    const p = playersList.find(pl=>pl.id===pid);
    await update(ref(db,`rooms/${roomCode}/players/${pid}`),{status:'cheater',eliminatedRound:roundNum,eliminatedBy:'المشرف'});
    notify(`🚫 أُخرج ${p?.name}`, 'error');
  };

  /* ══ DOWNLOAD PDF REPORT ══ */
  const downloadPDFReport = () => {
    const report = {
      gameType: 'لعبة الألقاب',
      roomCode,
      timestamp: new Date().toLocaleString('ar-SA'),
      players: playersList.map(p => ({
        name: p.name,
        nick: p.nick,
        nick2: p.nick2,
        status: p.status,
        eliminatedBy: p.eliminatedBy,
        eliminatedRound: p.eliminatedRound
      })),
      rounds: allRoundsList.map(r => ({
        round: r.round,
        attacks: Object.values(r.attacks||{}).length
      })),
      winner: activePlayers[0]?.name || 'لا يوجد'
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `تقرير_${roomCode}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('✅ تم تحميل التقرير', 'success');
  };

  /* ══ STATS ══ */
  const nickHeatmap=()=>{const c={};allAttacksFlat.forEach(a=>{if(a.targetNick)c[a.targetNick]=(c[a.targetNick]||0)+1;});return Object.entries(c).sort((a,b)=>b[1]-a[1]);};
  const nameHeatmap=()=>{const c={};allAttacksFlat.forEach(a=>{if(a.guessedName)c[a.guessedName]=(c[a.guessedName]||0)+1;});return Object.entries(c).sort((a,b)=>b[1]-a[1]);};
  const mostHuntedNick=()=>{const h=nickHeatmap();return h[0]?{nick:h[0][0],count:h[0][1]}:null;};
  const leastHuntedNick=()=>{const h=nickHeatmap();const l=h[h.length-1];return l&&h.length>1?{nick:l[0],count:l[1]}:null;};
  const mostTargeted=()=>{const h=nameHeatmap();return h[0]?{name:h[0][0],count:h[0][1]}:null;};
  const leastTargeted=()=>{const h=nameHeatmap();const l=h[h.length-1];return l&&h.length>1?{name:l[0],count:l[1]}:null;};

  const cdi = cdInfo();

  /* ════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════ */


  // Heatmap — only players with at least 1 attack on them (fix least targeted)
  const nickHeatmapActive=()=>{
    const c={};
    allAttacksFlat.forEach(a=>{if(a.targetNick)c[a.targetNick]=(c[a.targetNick]||0)+1;});
    // Only return nicks that have been attacked at least once
    return Object.entries(c).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  };
  const nameHeatmapActive=()=>{
    const c={};
    allAttacksFlat.forEach(a=>{if(a.guessedName)c[a.guessedName]=(c[a.guessedName]||0)+1;});
    return Object.entries(c).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]);
  };

  const renderGame = () => {

    /* ── ONBOARDING SCREEN ── */
    if(showOnboarding) {
      return <OnboardingScreen 
        role={showOnboarding} 
        onDismiss={() => {
          setShowOnboarding(null);
          if(showOnboarding === 'admin') createRoom();
          else setGameScreen('join');
        }}
      />;
    }

    /* ── HOME ── */
    if(gameScreen==='home'){
      // لو لعبة مختارة → ادخل عليها
      if(selectedGame==='nicknames') return(
        <div className="scr">
          <button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={()=>setSelectedGame(null)}>← ساحة الألعاب</button>
          <div style={{textAlign:'center',padding:'10px 0 12px'}}>
            <div style={{fontSize:46,marginBottom:6}}>🎭</div>
            <div className="ptitle" style={{fontSize:22}}>لعبة الألقاب</div>
            <div className="psub">أخفِ هويتك • الكل يهاجم معاً • اكشف الهويات</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button className="btn bg" onClick={()=>setShowOnboarding('admin')}>👑 إنشاء غرفة كمسؤول</button>
            <button className="btn bo" onClick={()=>setShowOnboarding('player')}>🎮 انضمام كلاعب برمز الغرفة</button>
          </div>
          <button className="btn bgh" style={{marginTop:4}} onClick={()=>setModal({type:'guide'})}>
            📖 كيف تلعب؟ — دليل للمشرف والمتسابق
          </button>
          <div className="div">قوانين اللعبة</div>
          {['🎭 اختر لقباً لا يمت بصلة لاهتماماتك','⚔️ الكل يهاجم في نفس الوقت — سرية تامة','🔓 النتائج تنكشف للجميع في لحظة واحدة','⏰ الوقت يحدده المشرف ويمكن تمديده','❌ جولتان بلا هجوم = خروج صامت بلا كشف لقبك','🚫 التعاون ممنوع — عقوبته الإخراج الفوري','👁️ الألقاب لا تُكشف كاملةً إلا في نهاية المسابقة'].map((r,i)=>(
            <div key={i} style={{padding:'7px 11px',marginBottom:4,background:'#0f0f22',borderRadius:8,fontSize:12,color:'var(--muted)',border:'1px solid rgba(255,255,255,.04)'}}>{r}</div>
          ))}
        </div>
      );

      if(selectedGame==='qumairi') return(
        <div className="scr">
          <button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={()=>setSelectedGame(null)}>← ساحة الألعاب</button>
          <div style={{textAlign:'center',padding:'10px 0 12px'}}>
            <div style={{fontSize:46,marginBottom:6}}>🦅</div>
            <div className="ptitle" style={{fontSize:22}}>صيد القميري</div>
            <div className="psub">وزّع قمائرك • هاجم الأشجار • احمِ مجموعتك</div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button className="btn bg" onClick={()=>setGameScreen('qumairi_admin')}>👑 إنشاء غرفة كمسؤول</button>
            <button className="btn bo" onClick={()=>setGameScreen('qumairi_join')}>🎮 انضمام كمجموعة برمز الغرفة</button>
          </div>
          <div className="div">نظرة سريعة</div>
          {['🦅 100 قميري لكل مجموعة توزّع على 11 شجرة','⚔️ ثلاثة أسلحة: شوزل، أم صتمة، نبيطة','🌳 اهجم أشجار الخصوم واصطد القميري حقهم','🏆 أكثر مجموعة بقي لها قميري تفوز','🔒 لا أحد يعرف توزيع مجموعتك السري'].map((r,i)=>(
            <div key={i} style={{padding:'7px 11px',marginBottom:4,background:'#0f0f22',borderRadius:8,fontSize:12,color:'var(--muted)',border:'1px solid rgba(255,255,255,.04)'}}>{r}</div>
          ))}

        </div>
      );

      // الشاشة الرئيسية — ساحة الألعاب
      return(
        <div className="scr">
          <div style={{textAlign:'center',padding:'18px 0 14px'}}>
            <div style={{fontSize:42,marginBottom:6}}>🏟️</div>
            <div className="ptitle" style={{fontSize:24}}>ساحة الألعاب</div>
            <div className="psub">ألعاب جماعية تفاعلية للرحلات والاجتماعات والمناسبات</div>
          </div>

          {/* بطاقة لعبة الألقاب */}
          <div onClick={()=>setSelectedGame('nicknames')} style={{background:'linear-gradient(135deg,rgba(240,192,64,.12),rgba(255,140,0,.06))',border:'2px solid rgba(240,192,64,.3)',borderRadius:16,padding:'18px 16px',marginBottom:12,cursor:'pointer',transition:'all .2s'}}
            onTouchStart={e=>e.currentTarget.style.transform='scale(.98)'}
            onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{fontSize:44}}>🎭</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--gold)'}}>لعبة الألقاب</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:3,lineHeight:1.6}}>أخفِ هويتك واكشف الآخرين قبل أن يكشفوك</div>
                <div style={{display:'flex',gap:5,marginTop:8,flexWrap:'wrap'}}>
                  {['6-50 لاعب','متعدد الجولات','إثارة وتشويق'].map(t=>(
                    <span key={t} className="tag tg" style={{fontSize:10}}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{fontSize:20,color:'var(--gold)'}}>←</div>
            </div>
          </div>

          {/* بطاقة لعبة القميري */}
          <div onClick={()=>setSelectedGame('qumairi')} style={{background:'linear-gradient(135deg,rgba(46,204,113,.1),rgba(26,138,80,.05))',border:'2px solid rgba(46,204,113,.25)',borderRadius:16,padding:'18px 16px',marginBottom:12,cursor:'pointer',transition:'all .2s'}}
            onTouchStart={e=>e.currentTarget.style.transform='scale(.98)'}
            onTouchEnd={e=>e.currentTarget.style.transform='scale(1)'}>
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div style={{fontSize:44}}>🦅</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--green)'}}>صيد القميري</div>
                <div style={{fontSize:12,color:'var(--muted)',marginTop:3,lineHeight:1.6}}>وزّع القميري على الأشجار واهجم مجموعات الخصوم</div>
                <div style={{display:'flex',gap:5,marginTop:8,flexWrap:'wrap'}}>
                  {['2-6 مجموعات','100 قميري','استراتيجية'].map(t=>(
                    <span key={t} className="tag tv" style={{fontSize:10}}>{t}</span>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4}}>
<div style={{fontSize:20,color:'var(--green)'}}>←</div>
              </div>
            </div>
          </div>

          {/* قريباً — ألعاب أخرى */}
          <div style={{background:'rgba(255,255,255,.03)',border:'1px dashed rgba(255,255,255,.1)',borderRadius:16,padding:'16px',marginBottom:12,textAlign:'center'}}>
            <div style={{fontSize:28,marginBottom:6}}>🎲</div>
            <div style={{fontSize:13,fontWeight:700,color:'var(--muted)'}}>المزيد من الألعاب قادمة!</div>
            <div style={{fontSize:11,color:'var(--dim)',marginTop:3}}>ترقبوا ألعاب جماعية جديدة ومثيرة</div>
          </div>

          <button className="btn bgh" style={{marginTop:4,fontSize:12}} onClick={()=>window.open(`mailto:${SUPPORT_EMAIL}?subject=اقتراح لعبة جديدة`)}>
            💡 اقترح لعبة جديدة
          </button>
        </div>
      );
    }


    /* ── WAITING (player joined, waiting for admin to start) ── */
    if(gameScreen==='waiting') return(
      <div className="scr">
        <button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={()=>setModal({type:'exit_game'})}>🚪 انسحاب</button>
        <div style={{textAlign:'center',padding:'40px 20px 20px'}}>
          <div style={{fontSize:64,marginBottom:12}}>⏳</div>
          <div className="ptitle">في انتظار المشرف</div>
          <div className="psub">
            انضممت للغرفة بنجاح!<br/>
            انتظر حتى يبدأ المشرف اللعبة
          </div>
        </div>
        <div className="card" style={{textAlign:'center'}}>
          <div style={{fontSize:13,color:'var(--muted)',marginBottom:8}}>رمز الغرفة</div>
          <div className="room-code-big" style={{fontSize:28,letterSpacing:6}}>{roomCode}</div>
          <div style={{fontSize:12,color:'var(--muted)',marginTop:8}}>
            <span className="online-dot"/> {activePlayers.length} لاعب في الغرفة الآن
          </div>
        </div>
        <div className="card">
          <div className="ctitle">👤 معلوماتك</div>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0'}}>
            <div style={{width:40,height:40,borderRadius:'50%',background:'linear-gradient(135deg,var(--gold),#ff8c00)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'#07070f',fontSize:15}}>{mkInitials(joinName)}</div>
            <div>
              <div style={{fontWeight:700,fontSize:14}}>{joinName}</div>
              <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>لقبك: <span style={{color:'var(--gold)',fontWeight:700}}>مخفي 🔒</span></div>
            </div>
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:8,padding:'8px 10px',background:'rgba(240,192,64,.06)',borderRadius:8,border:'1px solid rgba(240,192,64,.15)'}}>
            💡 لقبك لن يظهر لأحد حتى تبدأ اللعبة
          </div>
        </div>
        <div style={{textAlign:'center',color:'var(--muted)',fontSize:12,marginTop:8}}>
          الصفحة تتحدث تلقائياً عند بدء اللعبة 🔄
        </div>
      </div>
    );

    /* ── JOIN ── */
    if(gameScreen==='join') return(
      <div className="scr">
        <button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={()=>setGameScreen('home')}>← رجوع</button>
        <div className="ptitle">انضمام للعبة</div>
        <div className="psub">أدخل رمز الغرفة المرسل من المشرف</div>
        <div className="card">
          <div className="ig"><label className="lbl">🔢 رمز الغرفة (4 أرقام)</label>
            <input className={`inp big${joinErr?'err-b':''}`} placeholder="× × × × × ×" maxLength={4} value={joinInput} onChange={async e=>{
              const val=e.target.value.replace(/\D/g,'');
              setJoinInput(val);setJoinErr('');
              // اقرأ nickMode من الغرفة عند اكتمال الرمز
              if(val.length===4){
                try{
                  const s=await get(roomRef(val));
                  if(s.exists()) setRoomNickMode(s.val()?.game?.nickMode||1);
                }catch(e){}
              } else setRoomNickMode(1);
            }}/>
          </div>
        </div>
        <div className="card">
          <div className="ctitle">👤 بياناتك</div>
          <div className="ig"><label className="lbl">اسمك الكامل</label><input className="inp" placeholder="محمد عبدالله" value={joinName} onChange={e=>setJoinName(e.target.value)}/></div>
          <div className="ig"><label className="lbl">{nickMode===2?'لقبك الأول':'لقبك الذي اخترته'}</label><input className="inp" placeholder="القناص" value={joinNick} onChange={e=>setJoinNick(e.target.value)}/></div>
          {roomNickMode===2&&<div className="ig"><label className="lbl">لقبك الثاني</label><input className="inp" placeholder="الصقر" value={joinNick2} onChange={e=>setJoinNick2(e.target.value)}/></div>}
          {roomNickMode===2&&<div style={{background:'rgba(79,163,224,.08)',border:'1px solid rgba(79,163,224,.25)',borderRadius:8,padding:'7px 12px',fontSize:11,color:'var(--blue)',marginBottom:6}}>ℹ️ هذه اللعبة تستخدم نظام اللقبين</div>}
          <div style={{background:'rgba(240,192,64,.06)',border:'1px solid rgba(240,192,64,.2)',borderRadius:8,padding:'8px 12px',fontSize:11,color:'var(--muted)'}}>💡 اختر لقب{roomNickMode===2?'ين لا يمتان':'اً لا يمت'} بصلة لاهتماماتك!</div>
          <div style={{marginTop:8,background:'rgba(79,163,224,.06)',border:'1px solid rgba(79,163,224,.2)',borderRadius:8,padding:'8px 12px',fontSize:11,color:'var(--muted)'}}>🔄 إذا خرجت من اللعبة عن طريق الخطأ، أدخل نفس البيانات للرجوع</div>
          {joinErr&&<div className="err-msg">⚠️ {joinErr}</div>}
        </div>
        <button className="btn bg" onClick={joinRoom} disabled={joinLoading}>{joinLoading?'⏳ جارٍ الانضمام...':`🚀 انضمام`}</button>
      </div>
    );

    /* ── ADMIN SETUP ── */
    if(gameScreen==='admin') return(
      <div className="scr">
        <button className="btn bgh bsm" style={{width:'auto',marginBottom:12}}
          onClick={()=>setModal({type:'exit_game'})}>
          ← رجوع
        </button>
        <div className="card">
          <div className="ctitle">📡 رمز الغرفة <span className="online-dot"/></div>
          <div className="room-code-big">{roomCode}</div>
          <div style={{textAlign:'center',fontSize:11,color:'var(--muted)',marginBottom:10}}>
            أرسل هذا الرمز للمتسابقين — {activePlayers.length} منضم الآن
          </div>
          <button className="btn bo bsm" style={{width:'auto',margin:'0 auto'}} onClick={()=>{navigator.clipboard?.writeText(roomCode);notify('تم النسخ ✓','success');}}>📋 نسخ الرمز</button>
        </div>

        <div className="card">
          <div className="ctitle">⚙️ إعدادات اللعبة</div>
          <div className="lbl mb2">عدد الألقاب لكل لاعب</div>
          <div style={{display:'flex',gap:8,marginBottom:12}}>
            {[1,2].map(n=><button key={n} className={`btn ${nickMode===n?'bg':'bgh'}`} style={{flex:1}} onClick={async()=>{
              setNickMode(n);
              if(roomCode) await update(gameRef(roomCode),{nickMode:n});
            }}>{n===1?'لقب واحد':'لقبان'}</button>)}
          </div>
          <div className="lbl mb2">⏱️ مدة كل جولة</div>
          <div className="tpick">
            {[['h','ساعات'],['m','دقائق'],['s','ثواني']].map(([k,l])=>(
              <div key={k} className="tunit"><label>{l}</label>
                <input type="number" min="0" max={k==='h'?999:59} value={attackDur[k]} onChange={e=>setAttackDur(p=>({...p,[k]:e.target.value}))}/>
              </div>
            ))}
          </div>
          <div style={{fontSize:11,color:'var(--muted)',marginTop:7}}>مدة الجولة: <strong style={{color:'var(--gold)'}}>{fmtMs(totalMs())}</strong></div>
        </div>

        <div className="card">
          <div className="ctitle">➕ إضافة لاعب</div>
          <div className="ig"><label className="lbl">الاسم الكامل</label><input className="inp" placeholder="محمد عبدالله" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
          <div className="ig"><label className="lbl">اللقب {nickMode===2?'الأول':''}</label><input className="inp" placeholder="القناص" value={form.nick} onChange={e=>setForm(f=>({...f,nick:e.target.value}))}/></div>
          {nickMode===2&&<div className="ig"><label className="lbl">اللقب الثاني</label><input className="inp" placeholder="الصقر" value={form.nick2} onChange={e=>setForm(f=>({...f,nick2:e.target.value}))}/></div>}
          <button className="btn bg" onClick={addPlayer}>➕ إضافة</button>
        </div>

        {playersList.length>0&&<div className="card">
          <div className="ctitle">👥 المسجلون ({playersList.length})</div>
          <div className="sc">{playersList.map(p=>(
            <div key={p.id} className="pi"><Av p={p}/>
              <div className="pi-info"><div className="pi-name">{p.name}</div><div className="pi-nick">"{p.nick}"{p.nick2?<span style={{color:'rgba(240,192,64,.6)'}}> · "{p.nick2}"</span>:''}</div></div>
              <button className="btn bgh bxs" onClick={async()=>{await set(ref(db,`rooms/${roomCode}/players/${p.id}`),null);}}>✕</button>
            </div>
          ))}</div>
        </div>}

        <div className="sg">
          <div className="sbox"><div className="snum">{playersList.length}</div><div className="slbl">مسجلون</div></div>
          <div className="sbox"><div className="snum" style={{color:'var(--green)'}}>{activePlayers.length}</div><div className="slbl">نشطون</div></div>
        </div>
        {(()=>{const min=nickMode===2?4:6;return activePlayers.length<min&&playersList.length>0&&<div style={{fontSize:12,color:'var(--red)',textAlign:'center',marginBottom:9}}>يلزم {min-activePlayers.length} لاعب إضافي</div>;})()}
        <button className="btn bg" disabled={nickMode===2?activePlayers.length<4:activePlayers.length<6} onClick={startGame} style={{marginBottom:8}}>🚀 بدء اللعبة ({activePlayers.length}/{nickMode===2?4:6}+)</button>
        {phase!=='lobby'&&<button className="btn bb" onClick={()=>setGameScreen('attack')} style={{marginBottom:8}}>🎮 العودة للعبة</button>}
      </div>
    );

    /* ── ATTACK ── */
    if(gameScreen==='attack'){
      // كل الألقاب — النشطون + الخارجون بالخمول (بدون ربط اسم)
      // لوحة الألقاب — كل الألقاب النشطة + ألقاب الخارجين بالخمول (بدون تمييز)
      const inactiveNicks = playersList.filter(p=>p.status==='inactive').flatMap(p=>[p.nick,p.nick2].filter(Boolean));
      const activeNicks = roundOrder.nicks?.length>0 ? roundOrder.nicks : playersList.filter(p=>p.status==='active').flatMap(p=>[p.nick,p.nick2].filter(Boolean));
      
      // إخفاء لقبك من اللوحة (أو لقب الشخص المنوب عنه في حالة الإنابة)
      const proxyPlayer  = proxyFor ? playersList.find(p=>p.id===proxyFor) : null;
      const effectivePlayer = proxyPlayer || playersList.find(p=>p.nick===myNickLocal||p.nick2===myNickLocal);
      const myNicksList = effectivePlayer ? [effectivePlayer.nick, effectivePlayer.nick2].filter(Boolean) : [];
      
      const displayNicks = [...new Set([...activeNicks, ...inactiveNicks])];
      const visibleNicks = displayNicks.filter(n=>!myNicksList.includes(n));
      
      // قائمة الأسماء — تخفي اسم اللاعب نفسه (أو المنوب عنه) وأسماء الخارجين بالخمول
      const myPlayerId = proxyPlayer?.id || myId || playersList.find(p=>p.nick===myNickLocal||p.nick2===myNickLocal)?.id;
      
      // قائمة الأسماء: أخفِ نفسك فقط — الخامل يبقى مخفياً (اسمه ليس في القائمة)
      const displayNames = (roundOrder.names?.length>0
        ? roundOrder.names.map(id=>playersList.find(p=>p.id===id)).filter(Boolean)
        : playersList.filter(p=>p.status==='active')
      ).filter(p=> p.id !== myPlayerId);

      return(
        <div className="scr">
          {/* Info bar — room + round + player info */}
          <div style={{background:'var(--card2)',border:'1px solid var(--border)',borderRadius:10,padding:'9px 12px',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
              <div style={{fontSize:11,color:'var(--muted)'}}>
                <span style={{color:'var(--gold)',fontWeight:700}}>#{roomCode}</span>
                <span style={{margin:'0 8px'}}>·</span>
                الجولة <strong style={{color:'var(--gold)'}}>{roundNum}</strong>
                <span style={{margin:'0 8px'}}>·</span>
                نشطون: <strong style={{color:'var(--green)'}}>{activePlayers.length}</strong>
              </div>
              <div style={{display:'flex',gap:5}}>
                <button className="btn bgh bxs" style={{padding:'3px 8px'}} onClick={()=>setGameScreen('stats')}>📊</button>
              </div>
            </div>
            {/* Player's own info - مخفي عند الهجوم بالإنابة */}
            {role==='player'&&myNickLocal&&!proxyFor&&(
              <div style={{display:'flex',alignItems:'center',gap:6,paddingTop:5,borderTop:'1px solid rgba(255,255,255,.05)',marginTop:4}}>
                <span style={{fontSize:10,color:'var(--muted)'}}>أنت:</span>
                <span style={{fontSize:12,fontWeight:700,color:'var(--text)'}}>{joinName}</span>
                <span style={{fontSize:10,color:'var(--muted)'}}>·</span>
                <span style={{fontSize:11,color:'var(--gold)',fontWeight:700}}>"{myNickLocal}"</span>
              </div>
            )}
            {/* رسالة للمشرف أثناء الهجوم بالإنابة */}
            {role==='admin'&&proxyFor&&(
              <div style={{display:'flex',alignItems:'center',gap:6,paddingTop:5,borderTop:'1px solid rgba(255,255,255,.05)',marginTop:4}}>
                <span style={{fontSize:10,color:'var(--purple)'}}>⚡ تهاجم بالإنابة عن:</span>
                <span style={{fontSize:12,fontWeight:700,color:'var(--gold)'}}>{proxyPlayer?.name}</span>
              </div>
            )}
          </div>

          {/* إشعارات الجولة — للجميع بدون كشف تفاصيل */}
          {isSilentActive&&(
            <div style={{background:'rgba(79,163,224,.08)',border:'1px solid rgba(79,163,224,.3)',borderRadius:9,padding:'8px 12px',marginBottom:8,display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--blue)'}}>
              <span style={{fontSize:16}}>🤫</span>
              <span><strong>جولة الصمت</strong> — النتائج تُخفى حتى الجولة القادمة</span>
            </div>
          )}
          {gameState?.silentPending && !isSilentActive && (
            <div style={{background:'rgba(155,89,182,.1)',border:'1.5px solid rgba(155,89,182,.4)',borderRadius:10,padding:'10px 14px',marginBottom:8,display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--purple)'}}>
              <span style={{fontSize:18}}>🤫</span>
              <span><strong>جولة صامتة سابقة!</strong> — ستُكشف نتائجها مع هذه الجولة</span>
            </div>
          )}
          {/* بانر الحرمان من اللقب المسموم */}
          {(()=>{
            const myP = playersList.find(p=>p.nick===myNickLocal||p.nick2===myNickLocal);
            if(myP?.isBannedNextRound && myP.isBannedNextRound >= roundNum) return(
              <div style={{background:'rgba(230,57,80,.1)',border:'1px solid rgba(230,57,80,.4)',borderRadius:9,padding:'10px 12px',marginBottom:8,display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--red)'}}>
                <span style={{fontSize:18}}>☠️</span>
                <span><strong>أنت محروم هذه الجولة!</strong> — عقوبة اللقب المسموم من الجولة الماضية</span>
              </div>
            );
            return null;
          })()}
          {activePoisonNick&&(
            <div style={{background:'rgba(155,89,182,.08)',border:'1px solid rgba(155,89,182,.3)',borderRadius:9,padding:'8px 12px',marginBottom:8,display:'flex',alignItems:'center',gap:8,fontSize:12,color:'var(--purple)'}}>
              <span style={{fontSize:16}}>☠️</span>
              <span>تحذير: <strong>يوجد لقب مسموم</strong> — إذا هاجمته وأخطأت تخسر جولة!</span>
            </div>
          )}
          {attacksPerRound>1&&(
            <div style={{background:'rgba(240,192,64,.08)',border:'1px solid rgba(240,192,64,.3)',borderRadius:9,padding:'8px 12px',marginBottom:8,display:'flex',alignItems:'center',gap:8,fontSize:12}}>
              <span>{attacksPerRound===2?'⚔️':'⚡'}</span>
              <span style={{color:'var(--gold)',fontWeight:700}}>
                {attacksPerRound===2?'جولة مزدوجة':'جولة الاندفاع'} — لديك <strong>{attacksPerRound}</strong> هجمات هذه الجولة
              </span>
            </div>
          )}

          {/* Timer */}
          <div className={`tbar${cdi.urgent?' urg':''}`}>
            <div style={{fontSize:20}}>{cdi.urgent?'🔴':'⏱️'}</div>
            <div style={{flex:1}}><div className={`tval${cdi.urgent?' urg':''}`}>{cdi.label}</div><div className="tlbl">متبقي للجولة {roundNum}</div></div>
            {role==='admin'&&<div style={{display:'flex',gap:4}}>
              <button className="btn bgh bxs" onClick={()=>extendTime(30*60*1000)}>+30د</button>
              <button className="btn br bxs" onClick={doReveal}>كشف</button>
              <button className="btn bgh bxs" onClick={()=>{
                setIsProxyMode(false); // إلغاء وضع الإنابة عند العودة للتحكم
                setGameScreen('admin_live');
              }}>👑</button>
            </div>}
          </div>

          {/* Counter */}
          <div className="counter-bar">
            <div style={{fontSize:16}}>📨</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700}}>
                {submittedCount}/{activePlayers.length * attacksPerRound} هجمة
                {attacksPerRound>1&&<span style={{fontSize:11,color:'var(--gold)',marginRight:6}}> ({attacksPerRound} لكل لاعب)</span>}
                {allSubmitted&&<span style={{color:'var(--green)',fontSize:12,marginRight:6}}>✓ اكتمل!</span>}
              </div>
              <div className="counter-track mt2"><div className="counter-fill" style={{width:`${(submittedCount/Math.max(activePlayers.length*attacksPerRound,1))*100}%`}}/></div>
            </div>
            {allSubmitted&&role==='admin'&&<button className="btn bv bxs" onClick={doReveal}>كشف ▶</button>}
          </div>

          {/* Proxy banner */}
          {proxyPlayer&&<div className="ann ag" style={{marginBottom:10}}>
            <div style={{fontSize:12,color:'var(--muted)'}}>🎮 المشرف يهاجم نيابةً عن</div>
            <div style={{fontSize:16,fontWeight:700,color:'var(--gold)'}}>{proxyPlayer.name} — {proxyPlayer.nick}</div>
            <button className="btn bgh bsm" style={{width:'auto',margin:'8px auto 0'}} onClick={()=>{
              setProxyFor(null);
              setIsProxyMode(false); // إلغاء وضع المتسابق
              setMyNick(null);
              setMyGuess(null);
            }}>إلغاء</button>
          </div>}

          {/* SUBMITTED */}
          {(myAttacksDone||myDoneCount>=attacksPerRound)&&!proxyFor?(
            <div className="card">
              <div className="waiting-box">
                <div className="waiting-icon">⏳</div>
                <div className="waiting-title">تم إرسال الهجوم!</div>
                <div className="waiting-sub">
                  لقب مستهدف: <strong style={{color:'var(--gold)'}}>"{myNick}"</strong><br/>
                  تخمين: <strong>{playersList.find(p=>p.id===myGuess)?.name||'—'}</strong><br/><br/>
                  <span style={{fontSize:11}}>انتظر كشف النتائج من المشرف أو انتهاء الوقت 🔓</span>
                </div>
              </div>
            </div>
          ):(
            <>
              {/* NICK BOARD */}
              <div className="bwrap">
                <div className="blbl">🎭 لوحة الألقاب — اضغط لقباً للهجوم عليه</div>
                <div className="bgrid">
                  {(role==='admin'?displayNicks:visibleNicks).map((nick,i)=>{
                    const owner=playersList.find(p=>p.nick===nick||p.nick2===nick);
                    const isEliminated=owner&&(owner.status==='eliminated'||owner.status==='cheater');
                    const isInactive=owner&&owner.status==='inactive';
                    const isElim=isEliminated;
                    return(
                      <div key={i} className={`nt${isElim?' nd':myNick===nick?' nsel':''}`}
                        onClick={()=>{if(!isElim){setMyNick(nick);setMyGuess(null);}}}>
                        <div>{nick}</div>
                        {isElim&&<div className="nt-sub">✕ ج{owner.eliminatedRound}</div>}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* NAMES */}
              <div className="card">
                <div className="ctitle">
                  👥 قائمة الأسماء
                  {myNick?<span style={{color:'var(--text)',fontWeight:400,fontSize:11}}> — صاحب "<span style={{color:'var(--gold)'}}>{myNick}</span>" هو؟</span>
                    :<span style={{color:'var(--muted)',fontWeight:400,fontSize:11}}> — اختر لقباً أولاً</span>}
                </div>
                <div className="ngrid">
                  {displayNames.map(p=>{
                    const isElim=p.status!=='active';
                    return(
                      <div key={p.id} className={`nr${isElim?' nrd':myGuess===p.id?' nrsel':''}`}
                        onClick={()=>{if(!isElim&&myNick)setMyGuess(p.id);}}>
                        <Av p={p} sz={30} fs={11}/>
                        <div className="nr-info">
                          <div className="nr-name" style={isElim?{color:'var(--dim)'}:{}}>{p.name}</div>
                          {isElim&&<div className="nr-sub">"{p.nick}"{p.nick2?` / "${p.nick2}"`:''} — خرج ج{p.eliminatedRound}{p.eliminatedBy?` · ${p.eliminatedBy}`:''}</div>}
                        </div>
                        {myGuess===p.id&&<div style={{color:'var(--gold)',fontSize:16}}>✓</div>}
                      </div>
                    );
                  })}
                </div>
                {myNick&&myGuess?(
                  <button className="btn bg mt3" onClick={()=>submitAttack(proxyPlayer?.nick||null)}>
                    🎯 تأكيد الهجوم على "{myNick}"
                    {proxyPlayer&&<span style={{fontSize:11,fontWeight:400}}> (نيابةً عن {proxyPlayer.name})</span>}
                  </button>
                ):(
                  <div style={{textAlign:'center',color:'var(--muted)',fontSize:11,padding:'10px 0'}}>
                    {!myNick?'① اختر لقباً من اللوحة':'② اختر الشخص الذي تخمّن أنه صاحب اللقب'}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Graveyard */}
          {elimPlayers.length>0&&<div className="card">
            <div className="ctitle">⚰️ مقبرة الألقاب ({elimPlayers.length})</div>
            <div className="sc">
              {/* Silent pending — show as mystery */}
              {gameState?.silentPending?.silentExits?.map((ex,i)=>(
                <div key={i} className="grave" style={{borderColor:'rgba(79,163,224,.3)',background:'rgba(79,163,224,.05)'}}>
                  <div className="grave-name" style={{color:'var(--blue)'}}>🤫 لقب مخفي</div>
                  <div className="grave-info" style={{color:'var(--blue)'}}>جولة الصمت {ex.roundNum} — سيُكشف لاحقاً</div>
                </div>
              ))}
              {[...elimPlayers].sort((a,b)=>(b.eliminatedRound||0)-(a.eliminatedRound||0)).map(p=>(
                <div key={p.id} className="grave">
                  <div className="grave-name">{p.name}</div>
                  {/* لقب المكشوف فقط — الخارج بالخمول لا يُظهر لقبه */}
                  {p.status==='eliminated'&&<div className="grave-nick">
                    {(()=>{
                      const targetedNick=allAttacksFlat.find(a=>a.correct&&a.realOwnerId===p.id)?.targetNick;
                      const shownNick=targetedNick||p.nick;
                      const otherTargeted=p.nick2&&allAttacksFlat.some(a=>a.correct&&a.realOwnerId===p.id&&a.targetNick===p.nick2);
                      return <>"{shownNick}"{otherTargeted?` / "${p.nick2}"`:''}</>;
                    })()}
                  </div>}
                  {/* الخارج بالخمول — اسم فقط بدون لقب */}
                  <div className="grave-info">
                    {p.status==='cheater'?'🚫 خرج من المسابقة':
                     p.status==='inactive'?`😴 خرج لعدم الهجوم — ج${p.eliminatedRound}`:
                     `💥 خرج ج${p.eliminatedRound}${p.eliminatedBy?` — كشفه: ${p.eliminatedBy}`:''}`}
                  </div>
                </div>
              ))}
            </div>
          </div>}
        </div>
      );
    }

    /* ── ADMIN LIVE ── */
    if(gameScreen==='admin_live') return(
      <div className="scr">
        {/* ══ الشريط العلوي ══ */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <button className="btn bgh bxs" onClick={()=>setGameScreen('attack')}>← اللعبة</button>
          <div style={{fontFamily:'Cairo',fontSize:16,fontWeight:900,color:'var(--gold)'}}>
            الجولة {roundNum}
          </div>
          <button className="btn bgh bxs" onClick={()=>setGameScreen('stats')}>📊</button>
        </div>

        <div style={{display:'flex',gap:4,marginBottom:8}}>
          <div className="sbox" style={{flex:1}}><div className="snum" style={{fontSize:16,color:'var(--green)'}}>{activePlayers.length}</div><div className="slbl">نشطون</div></div>
          <div className="sbox" style={{flex:1}}><div className="snum" style={{fontSize:16,color:'var(--gold)'}}>{submittedCount}</div><div className="slbl">هاجموا</div></div>
          <div className="sbox" style={{flex:1}}><div className="snum" style={{fontSize:16,color:'var(--red)'}}>{elimPlayers.length}</div><div className="slbl">خارجون</div></div>
        </div>

        {/* ══ أدوات الإثارة — فوق دائماً ══ */}
        <div className="card" style={{background:'linear-gradient(135deg,rgba(240,192,64,.05),rgba(155,89,182,.03))',border:'1px solid rgba(240,192,64,.15)',marginBottom:8}}>
          <div className="ctitle" style={{fontSize:12}}>⚗️ أدوات الجولة القادمة</div>
          <div style={{display:'flex',gap:4,marginBottom:8}}>
            {[[1,'🗡️ عادية'],[2,'⚔️ مزدوجة'],[3,'⚡ اندفاع']].map(([n,label])=>(
              <button key={n} className={`btn ${activeSpecialRound===n?'bg':'bgh'} bxs`} style={{flex:1,fontSize:10}}
                onClick={async()=>{setSpecialRound(n);await update(gameRef(roomCode),{specialRound:n});}}>
                {label}
              </button>
            ))}
          </div>
          <div style={{display:'flex',gap:6,alignItems:'center',marginBottom:6}}>
            <span style={{fontSize:10,color:'var(--purple)',flexShrink:0}}>☠️</span>
            <select className="inp" style={{flex:1,fontSize:11,padding:'4px 8px'}} value={activePoisonNick}
              onChange={async e=>{const v=e.target.value;setPoisonNick(v);await update(gameRef(roomCode),{poisonNick:v||null});}}>
              <option value="">بدون مسموم</option>
              {playersList.filter(p=>p.status==='active').flatMap(p=>[p.nick,p.nick2].filter(Boolean)).map(n=>(
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div style={{display:'flex',gap:6}}>
            <button className={`btn ${isSilentActive?'bb':'bgh'} bxs`} style={{flex:1}} onClick={async()=>{
              const v=!isSilentActive;setSilentRound(v);await update(gameRef(roomCode),{silentActive:v});
            }}>{isSilentActive?'🤫 صمت مفعّل — إلغاء':'🔕 تفعيل الصمت'}</button>
          </div>
        </div>

        {/* ══ العداد والوقت ══ */}
        <div className={`tbar${cdi.urgent?' urg':''}`} style={{marginBottom:6}}>
          <div style={{fontSize:16}}>{cdi.urgent?'🔴':'⏱️'}</div>
          <div style={{flex:1}}>
            <div className={`tval${cdi.urgent?' urg':''}`}>{cdi.label}</div>
            <div className="tlbl">متبقي — الجولة {roundNum}</div>
          </div>
        </div>
        <div style={{display:'flex',gap:4,marginBottom:8}}>
          <button className="btn bg bxs" style={{flex:1}} onClick={()=>extendTime(5*60*1000)}>+5د</button>
          <button className="btn bg bxs" style={{flex:1}} onClick={()=>extendTime(15*60*1000)}>+15د</button>
          <button className="btn bg bxs" style={{flex:1}} onClick={()=>extendTime(30*60*1000)}>+30د</button>
          <input type="number" className="inp" style={{width:55,padding:'4px',textAlign:'center',fontSize:11}} placeholder="دقائق"
            onKeyDown={e=>{if(e.key==='Enter'){const m=parseInt(e.target.value);if(m>0){extendTime(m*60*1000);e.target.value='';}}}}/>
        </div>

        {/* ══ شريط التقدم ══ */}
        <div className="counter-bar" style={{marginBottom:8}}>
          <div style={{fontSize:14}}>📨</div>
          <div style={{flex:1}}>
            <div style={{fontSize:12,fontWeight:700}}>
              {submittedCount}/{activePlayers.length * attacksPerRound} هجمة
              {attacksPerRound>1&&<span style={{fontSize:10,color:'var(--gold)',marginRight:4}}> ({attacksPerRound} لكل لاعب)</span>}
              {allSubmitted&&<span style={{color:'var(--green)',fontSize:11}}> ✓</span>}
            </div>
            <div className="counter-track mt2"><div className="counter-fill" style={{width:`${(submittedCount/Math.max(activePlayers.length*attacksPerRound,1))*100}%`}}/></div>
          </div>
        </div>

        {/* ══ الزر الذكي ══ */}
        <div style={{marginBottom:10}}>
          {phase==='attacking'&&isSilentActive&&(
            <button className="btn bb" onClick={async()=>{
              const currentAtks=Object.values(attacks||{});
              const seenIds=new Set();const elimAtt={};
              currentAtks.forEach(a=>{if(a.correct){if(!elimAtt[a.realOwnerId])elimAtt[a.realOwnerId]=[];elimAtt[a.realOwnerId].push(a.attackerNick);seenIds.add(a.realOwnerId);}});
              const silentExits=playersList.filter(p=>seenIds.has(p.id)).map(p=>({playerId:p.id,nick:p.nick,nick2:p.nick2,name:p.name,attackers:elimAtt[p.id]||[],roundNum,initials:p.initials,colorIdx:p.colorIdx}));
              const silentMissed=playersList.filter(p=>p.status==='active'&&!currentAtks.some(a=>a.attackerNick===p.nick)).map(p=>({playerId:p.id,missedRounds:(p.missedRounds||0)+1}));
              const updates={};
              updates[`rooms/${roomCode}/rounds/round_${roundNum}`]={round:roundNum,attacks:attacks||{},endedAt:Date.now(),silent:true};
              const prev=gameState?.silentPending||{silentExits:[],silentMissed:[]};
              updates[`rooms/${roomCode}/game/silentPending`]={silentExits:[...(prev.silentExits||[]),...silentExits],silentMissed:[...(prev.silentMissed||[]),...silentMissed],roundNum};
              setSilentRound(false);await update(gameRef(roomCode),{silentActive:false});
              await set(ref(db,`rooms/${roomCode}/currentRound`),{attacks:{}});
              await update(ref(db),updates);
              await launchRound(roundNum+1);
              notify(`🤫 الجولة ${roundNum} مخفية — الجولة ${roundNum+1} بدأت`,'info');
            }}>🤫 ⏭️ الجولة التالية سراً</button>
          )}
          {phase==='attacking'&&!isSilentActive&&(
            <button className="btn bv" onClick={doReveal}>🔓 كشف نتائج الجولة {roundNum}</button>
          )}
          {phase==='revealing'&&activePlayers.length>2&&(
            <button className="btn bg" onClick={nextRound}>▶️ الجولة التالية ({roundNum+1})</button>
          )}
          {phase==='revealing'&&activePlayers.length<=2&&(
            <button className="btn br" onClick={endGame}>🏆 إعلان الفائز</button>
          )}
        </div>

        {/* ══ فاصل ══ */}
        <div className="div">حالة اللاعبين</div>

        {/* ══ حالة اللاعبين + هجوم بالنيابة ══ */}
        <div className="card" style={{marginBottom:8}}>
          {activePlayers.map(p=>{
            const pNicks=[p.nick,p.nick2].filter(Boolean);
            const pDone=pNicks.reduce((s,n)=>s+(playerAttackCounts[n]||0),0);
            const allDone=pDone>=attacksPerRound;
            const isBanned=p.isBannedNextRound&&p.isBannedNextRound>=roundNum;
            return(
              <div key={p.id} className="pi" style={{marginBottom:4}}>
                <Av p={p} sz={30} fs={11}/>
                <div className="pi-info">
                  <div style={{fontSize:12,fontWeight:700}}>{p.name} — <span style={{color:'var(--gold)'}}>{p.nick}</span></div>
                  <div style={{fontSize:10,color:isBanned?'var(--purple)':allDone?'var(--green)':pDone>0?'var(--gold)':'var(--muted)'}}>
                    {isBanned?'☠️ محروم (مسموم)':allDone?`✅ أكمل ${pDone}/${attacksPerRound}`:pDone>0?`⚡ ${pDone}/${attacksPerRound}`:'⏳ لم يرسل'}
                    {p.missedRounds>0&&!isBanned?` · ⚠️ غاب ${p.missedRounds}`:''}
                  </div>
                </div>
                <div style={{display:'flex',gap:3}}>
                  {!allDone&&!isBanned&&<button className="btn bb bxs" onClick={()=>{
                    setProxyFor(p.id);
                    setIsProxyMode(true); // تفعيل وضع المتسابق الكامل
                    setMyNick(null);
                    setMyGuess(null);
                    setMySubmitted(false);
                    setGameScreen('attack');
                  }}>🎮</button>}
                  <button className="btn br bxs" onClick={()=>elimCheat(p.id)}>غش</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ══ سجل الهجمات السري ══ */}
        <div className="card">
          <div className="ctitle">🕵️ سجل الهجمات</div>
          {attacksList.length===0?<div style={{textAlign:'center',color:'var(--muted)',fontSize:11,padding:10}}>لا هجمات بعد</div>:
            <div className="sc" style={{maxHeight:180}}>{attacksList.map((a,i)=>(
              <div key={i} style={{padding:'5px 8px',marginBottom:3,background:'#09091e',borderRadius:7,borderRight:`3px solid ${a.correct?'var(--green)':'var(--red)'}`,fontSize:11}}>
                <span style={{fontWeight:700}}>"{a.attackerNick}"</span> → <span>"{a.targetNick}"</span>
                <span style={{marginRight:6}}> خمّن: {a.guessedName}</span>
                <span style={{color:a.correct?'var(--green)':'var(--red)'}}>{a.correct?'✅':'❌'}</span>
              </div>
            ))}</div>}
        </div>

        {/* ══ إنهاء المسابقة ══ */}
        <div style={{margin:'8px 0',padding:'6px 10px',background:'rgba(255,255,255,.03)',borderRadius:7,textAlign:'center',fontSize:10,color:'var(--dim)',border:'1px dashed rgba(255,255,255,.08)'}}>
          ─── إنهاء المسابقة نهائياً ───
        </div>
        <button className="btn bgh" style={{border:'1px solid var(--red)',color:'var(--red)'}} onClick={()=>setModal({type:'confirm_end'})}>
          🛑 إنهاء المسابقة كاملاً
        </button>
      </div>
    );

    /* ── RESULTS ── */
    if(gameScreen==='results'){
      // صوت إعلان النتائج
      if(!window._resultsPlayed){window._resultsPlayed=true;playSound('suspense');setTimeout(()=>playSound('explosion'),500);}
      const lastRound = allRoundsList[allRoundsList.length-1];
      const atks = Object.values(lastRound?.attacks||attacks||{});
      // عند كشف جولة الصمت — أضف هجمات الجولة الصامتة أيضاً
      const silentRoundNum = gameState?.silentPending?.roundNum;
      const silentRoundData = silentRoundNum ? allRoundsList.find(r=>r.round===silentRoundNum) : null;
      const silentAtks = silentRoundData ? Object.values(silentRoundData.attacks||{}) : [];
      const allAtks = [...atks, ...silentAtks];
      const correct=allAtks.filter(a=>a.correct);
      const wrong=allAtks.filter(a=>!a.correct);
      const mh=mostHuntedNick(),lh=leastHuntedNick(),mt=mostTargeted(),lt=leastTargeted();
      const nickStats=atks.reduce((acc,a)=>{if(a.targetNick){acc[a.targetNick]=acc[a.targetNick]||{total:0,suc:0};acc[a.targetNick].total++;if(a.correct)acc[a.targetNick].suc++;}return acc;},{});
      return(
        <div className="scr">
          <div className="ptitle">🔓 كُشفت النتائج!</div>
          <div className="psub">الجولة {roundNum} — للجميع</div>

          {/* إعلان الجولة الصامتة السابقة */}
          {silentRoundData && (
            <div style={{
              background:'linear-gradient(135deg, rgba(155,89,182,.15), rgba(79,163,224,.1))',
              border:'2px solid rgba(155,89,182,.5)',
              borderRadius:12,
              padding:'14px',
              marginBottom:12,
              textAlign:'center',
              animation:'fi .5s ease'
            }}>
              <div style={{fontSize:28,marginBottom:6}}>🤫</div>
              <div style={{fontSize:15,fontWeight:900,color:'var(--purple)',marginBottom:4}}>
                كشف نتائج الجولة الصامتة رقم {silentRoundNum}!
              </div>
              <div style={{fontSize:12,color:'var(--text)',opacity:.9}}>
                النتائج المخفية ستظهر أدناه مع نتائج هذه الجولة
              </div>
            </div>
          )}

          {/* أرقام الجولة فقط */}
          <div className="sg sg3">
            <div className="sbox"><div className="snum">{atks.length}</div><div className="slbl">هجمات</div></div>
            <div className="sbox"><div className="snum" style={{color:'var(--green)'}}>{correct.length}</div><div className="slbl">إصابات ✅</div></div>
            <div className="sbox"><div className="snum" style={{color:'var(--red)'}}>{wrong.length}</div><div className="slbl">فشل ❌</div></div>
          </div>

          {/* بطاقات الكشف — للجميع، مبنية من Firebase مباشرة */}
          {correct.length>0&&<div className="card">
            <div className="ctitle">💥 كُشفت الهويات — اضغط البطاقة للكشف</div>
            {[...new Set(correct.map(a=>a.realOwnerId))].map((elimId)=>{
              const elim=playersList.find(p=>p.id===elimId);
              if(!elim) return null;
              const allAttackers=[...new Set(correct.filter(a=>a.realOwnerId===elimId).map(a=>a.attackerNick))];
              const flipped=flipCards[elim.nick]||false;
              return(
                <div key={elimId} className="flip-scene" onClick={()=>{
                  if(!flipped){ playSound('explosion'); }
                  setFlipCards(prev=>({...prev,[elim.nick]:!prev[elim.nick]}));
                }}>
                  <div className={`flip-card${flipped?' flipped':''}`}>
                    <div className="flip-front">
                      <div style={{fontSize:36,marginBottom:8}}>🎭</div>
                      <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--gold)'}}>"{elim.nick}"</div>
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>اضغط لكشف الهوية 👆</div>
                    </div>
                    <div className="flip-back">
                      <Av p={{...elim,status:'eliminated'}} sz={44} fs={16}/>
                      <div style={{fontFamily:'Cairo',fontSize:16,fontWeight:900,color:'var(--gold)',marginTop:8}}>"{elim.nick}"</div>
                      <div style={{fontSize:14,color:'var(--text)',marginTop:4}}>{elim.name}</div>
                      <div style={{fontSize:11,color:'var(--muted)',marginTop:6}}>
                        ⚔️ كُشف من قِبَل: <span style={{color:'var(--gold)'}}>{allAttackers.join(' + ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>}

          {/* لا يوجد خارجون */}
          {correct.length===0&&<div style={{textAlign:'center',padding:'16px 0',fontSize:13,color:'var(--green)'}}>
            ✅ لم يُكشف أحد هذه الجولة
          </div>}

          {/* إحصائيات "أنا" للمتسابق */}
          {role==='player' && myNickLocal && <MyStatsCard myNickLocal={myNickLocal} allAttacksFlat={allAttacksFlat} />}

          {/* ضحايا اللقب المسموم */}
          {(()=>{
            const poisoned=playersList.filter(p=>p.isBannedNextRound&&p.isBannedNextRound>roundNum-1);
            if(!activePoisonNick||poisoned.length===0) return null;
            return(
              <div style={{padding:'10px 14px',background:'rgba(155,89,182,.1)',border:'1px solid rgba(155,89,182,.3)',borderRadius:10,marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--purple)'}}>☠️ {poisoned.length} لاعب وقع في فخ اللقب المسموم — ممنوعون الجولة القادمة</div>
              </div>
            );
          })()}

          {/* ☠️ ضحايا المسموم */}
          {(()=>{
            const poisoned=playersList.filter(p=>p.isBannedNextRound&&p.isBannedNextRound>=roundNum);
            if(poisoned.length===0||!activePoisonNick) return null;
            return(
              <div style={{padding:'10px 14px',background:'rgba(155,89,182,.1)',border:'1px solid rgba(155,89,182,.3)',borderRadius:10,marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:700,color:'var(--purple)'}}>☠️ {poisoned.length} لاعب وقع في فخ اللقب المسموم — ممنوع الجولة القادمة</div>
              </div>
            );
          })()}

          <button className="btn bo mt2" onClick={()=>{setStatsTab('nicks');setGameScreen('stats');}}>
            🔥 اكتشف من استُهدف أكثر — الإحصائيات
          </button>
          <div style={{textAlign:'center',color:'var(--muted)',fontSize:11,marginTop:8}}>المشرف يتحكم بالجولة التالية من 👑 لوحة التحكم</div>
        </div>
      );
    }

    /* ── STATS ── */
    if(gameScreen==='stats'){
      // ── هيت ماب الجولة الحالية ──
      const roundNickMap={};
      attacksList.forEach(a=>{if(a.targetNick)roundNickMap[a.targetNick]=(roundNickMap[a.targetNick]||0)+1;});
      const roundNickSorted=Object.entries(roundNickMap).sort((a,b)=>b[1]-a[1]);
      const roundNameMap={};
      attacksList.forEach(a=>{if(a.guessedName)roundNameMap[a.guessedName]=(roundNameMap[a.guessedName]||0)+1;});
      const roundNameSorted=Object.entries(roundNameMap).sort((a,b)=>b[1]-a[1]);

      // ── هيت ماب كامل الجولات ──
      const allNickSorted=nickHeatmapActive();
      const allNameSorted=nameHeatmapActive();

      const attackerRank = attackerRankGlobal; // من الحساب العام

      // ── إحصاءات اللاعب الحالي ──
      const myPlayer = playersList.find(p=>p.nick===myNickLocal);
      const myAtks = allAttacksFlat.filter(a=>a.attackerNick===myNickLocal);
      const myHits = myAtks.filter(a=>a.correct);
      const myTargeted = allAttacksFlat.filter(a=>a.realOwnerId===myPlayer?.id);
      const myExposed = allAttacksFlat.filter(a=>a.realOwnerId===myPlayer?.id&&a.correct);
      const myAccuracy = myAtks.length>0?Math.round(myHits.length/myAtks.length*100):0;
      const myRank = attackerRank.findIndex(p=>p.nick===myNickLocal)+1;

      // تبويبات حسب الدور — «مسار اللعبة» يظهر فقط إذا effectiveRole === 'admin'
      const tabs = effectiveRole === 'admin'
        ? [['nicks','🎭 الألقاب'],['names','👥 الأسماء'],['fierce','⚔️ الأشرس'],['poison','☠️ المسموم'],['remaining','المتبقون'],...(effectiveRole === 'admin' ? [['log','📜 مسار اللعبة']] : [])]
        : [['nicks','🎭 الألقاب'],['fierce','⚔️ الأشرس'],['poison','☠️ المسموم'],['me','👤 أنا'],['remaining','المتبقون']];

      const HeatBar=({items,maxVal,showLabel=true})=>(
        <>{items.map(([label,count],i)=>(
          <div key={label} style={{marginBottom:9,maxWidth:'100%'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:3,gap:8}}>
              <span style={{fontWeight:700,fontSize:13,color:i===0?'var(--red)':i===1?'var(--gold)':i===2?'var(--blue)':'var(--text)',flex:1,minWidth:0}}>{i+1}. {label}</span>
              <span style={{fontSize:12,color:'var(--muted)',flexShrink:0}}>{count} هجمة</span>
            </div>
            <div style={{height:6,background:'rgba(255,255,255,.06)',borderRadius:3,overflow:'hidden'}}>
              <div style={{height:'100%',width:`${Math.round(count/maxVal*100)}%`,background:i===0?'var(--red)':i===1?'var(--gold)':i===2?'var(--blue)':'var(--muted)',borderRadius:3,transition:'width .4s'}}/>
            </div>
          </div>
        ))}</>
      );

      return(
        <div className="scr">
          <button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={()=>setGameScreen(phase==='revealing'||phase==='ended'?'results':'attack')}>← رجوع</button>

          {/* جولة الصمت — إخفاء كامل للإحصائيات للمتسابقين */}
          {gameState?.silentPending && role!=='admin' ? (
            <div style={{textAlign:'center',padding:'40px 20px'}}>
              <div style={{fontSize:48,marginBottom:12}}>🤫</div>
              <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--blue)',marginBottom:8}}>
                جولة الصمت
              </div>
              <div style={{fontSize:13,color:'var(--muted)',lineHeight:1.8}}>
                النتائج محفوظة — ستظهر الإحصائيات عند إعلان المشرف
              </div>
            </div>
          ) : (
          <>
          <div className="tabs" style={{flexWrap:'wrap',gap:4}}>
            {tabs.map(([k,l])=>(
              <button key={k} className={`tab${statsTab===k?' on':''}`} style={{flex:'none',padding:'7px 10px',fontSize:11}}
                onClick={()=>setStatsTab(k)}>{l}</button>
            ))}
          </div>

          {/* ══ 🎭 الألقاب ══ */}
          {statsTab==='nicks'&&<>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:12,textAlign:'center'}}>
              الألقاب من الأكثر استهدافاً للأقل — اضغط لقباً لترى من هاجمه
            </div>
            {/* هيت ماب الجولة الحالية — تظهر فقط بعد الكشف */}
            {phase==='revealing'&&roundNickSorted.length>0&&<>
              <div className="ctitle">الجولة الحالية</div>
              <HeatBar items={roundNickSorted} maxVal={roundNickSorted[0]?.[1]||1}/>
              <div className="div"/>
            </>}
            {phase==='attacking'&&<div style={{textAlign:'center',background:'rgba(240,192,64,.06)',border:'1px solid rgba(240,192,64,.15)',borderRadius:10,padding:'10px',fontSize:12,color:'var(--muted)',marginBottom:12}}>
              🔒 إحصائيات الجولة الحالية ستظهر بعد الإعلان
            </div>}
            <div className="ctitle">كامل الجولات</div>
            {allNickSorted.length===0
              ?<div style={{textAlign:'center',color:'var(--muted)',padding:18,fontSize:12}}>لا بيانات بعد</div>
              :<HeatBar items={allNickSorted} maxVal={allNickSorted[0]?.[1]||1}/>
            }
          </>}

          {/* ══ 👥 الأسماء ══ */}
          {statsTab==='names'&&<>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:12,textAlign:'center'}}>
              الأسماء من الأكثر استهدافاً للأقل
            </div>
            {phase==='revealing'&&roundNameSorted.length>0&&<>
              <div className="ctitle">الجولة الحالية</div>
              <HeatBar items={roundNameSorted} maxVal={roundNameSorted[0]?.[1]||1}/>
              <div className="div"/>
            </>}
            {phase==='attacking'&&<div style={{textAlign:'center',background:'rgba(240,192,64,.06)',border:'1px solid rgba(240,192,64,.15)',borderRadius:10,padding:'10px',fontSize:12,color:'var(--muted)',marginBottom:12}}>
              🔒 إحصائيات الجولة الحالية ستظهر بعد الإعلان
            </div>}
            <div className="ctitle">كامل الجولات</div>
            {allNameSorted.length===0
              ?<div style={{textAlign:'center',color:'var(--muted)',padding:18,fontSize:12}}>لا بيانات بعد</div>
              :<HeatBar items={allNameSorted} maxVal={allNameSorted[0]?.[1]||1}/>
            }
          </>}

          {/* ══ 👤 أنا — للمتسابق فقط ══ */}
          {statsTab==='me'&&role==='player'&&<>
            {/* بطاقة الهوية */}
            <div className="card" style={{textAlign:'center',padding:'18px 14px',background:'linear-gradient(135deg,rgba(240,192,64,.1),rgba(255,140,0,.05))'}}>
              {myPlayer&&<Av p={myPlayer} sz={52} fs={18}/>}
              <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--gold)',marginTop:8}}>{myPlayer?.name||joinName}</div>
              <div style={{fontSize:13,color:'var(--text)',marginTop:3}}>"{myNickLocal}"</div>
              <div style={{marginTop:6}}>
                {myPlayer?.status==='active'?<span className="badge bvd">✅ نشط</span>:<span className="badge brd">خرج ج{myPlayer?.eliminatedRound}</span>}
              </div>
            </div>

            {/* أرقامه الشخصية */}
            <div className="sg sg4" style={{marginBottom:10}}>
              {[[myAtks.length,'⚔️ هجماتي','var(--gold)'],[myHits.length,'🎯 إصاباتي','var(--green)'],[myTargeted.length,'👁️ استُهدفت','var(--blue)'],[myExposed.length,'🔓 انكشفت','var(--red)']].map(([n,l,col])=>(
                <div key={l} className="sbox"><div className="snum" style={{color:col,fontSize:18}}>{n}</div><div className="slbl" style={{fontSize:9}}>{l}</div></div>
              ))}
            </div>

            {/* شريط الدقة */}
            {myAtks.length>0&&<div className="card" style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:6,fontSize:13}}>
                <span style={{fontWeight:700}}>دقة هجماتي</span>
                <span style={{color:'var(--gold)',fontWeight:900}}>{myAccuracy}%</span>
              </div>
              <div style={{height:8,background:'rgba(255,255,255,.06)',borderRadius:4,overflow:'hidden'}}>
                <div style={{height:'100%',width:`${myAccuracy}%`,background:`linear-gradient(90deg,${myAccuracy>=60?'var(--green)':myAccuracy>=30?'var(--gold)':'var(--red)'},${myAccuracy>=60?'#1a8a50':'#b5720c'})`,borderRadius:4,transition:'width .6s'}}/>
              </div>
              <div style={{fontSize:11,color:'var(--muted)',marginTop:5}}>أصبت {myHits.length} من {myAtks.length} هجمات</div>
            </div>}

            {/* ترتيبي */}
            {myRank>0&&<div className="card" style={{textAlign:'center',marginBottom:10}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>ترتيبي بالهجمات</div>
              <div style={{fontFamily:'Cairo',fontSize:28,fontWeight:900,color:'var(--gold)'}}>{myRank}</div>
              <div style={{fontSize:11,color:'var(--muted)'}}>من {attackerRank.length} لاعب هاجم</div>
            </div>}

            {/* تاريخ هجماتي */}
            <div className="ctitle">سجل هجماتي الشخصي</div>
            {myAtks.length===0
              ?<div style={{textAlign:'center',color:'var(--muted)',padding:16,fontSize:12}}>لم تهاجم بعد</div>
              :allRoundsList.map(r=>{
                const rAtk=Object.values(r.attacks||{}).filter(a=>a.attackerNick===myNickLocal);
                if(rAtk.length===0) return null;
                return rAtk.map((a,i)=>(
                  <div key={i} style={{padding:'8px 12px',marginBottom:5,background:'#09091e',borderRadius:9,borderRight:`3px solid ${a.correct?'var(--green)':'var(--red)'}`,fontSize:12}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                      <span style={{color:'var(--muted)',fontSize:10}}>الجولة {r.round}</span>
                      <span style={{color:a.correct?'var(--green)':'var(--red)',fontWeight:700}}>{a.correct?'✅ إصابة':'❌ خطأ'}</span>
                    </div>
                    <div>هاجمت <strong style={{color:'var(--gold)'}}>"{a.targetNick}"</strong> وخمّنت <strong>{a.guessedName}</strong></div>
                  </div>
                ));
              })
            }
          </>}

          {/* ══ الأشرس هجوماً ══ */}
          {statsTab==='fierce'&&<>
            <div style={{fontSize:12,color:'var(--muted)',marginBottom:12,textAlign:'center'}}>
              {effectiveRole==='admin'?'الاسم واللقب — للمشرف فقط':'الألقاب فقط — بدون كشف الأسماء'}
            </div>
            {attackerRank.length===0
              ?<div style={{textAlign:'center',color:'var(--muted)',padding:18,fontSize:12}}>لا هجمات بعد</div>
              :attackerRank.map((p,i)=>(
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:9,padding:'10px 12px',background:'#09091e',borderRadius:9,marginBottom:5,border:`1px solid ${i===0?'rgba(240,192,64,.3)':i===1?'rgba(200,200,220,.15)':i===2?'rgba(230,57,80,.15)':'rgba(255,255,255,.05)'}`}}>
                <div style={{fontFamily:'Cairo',fontSize:16,fontWeight:900,width:26,textAlign:'center',color:i===0?'var(--gold)':i===1?'rgba(200,200,220,.8)':i===2?'var(--red)':'var(--muted)'}}>
                  {i===0?'👑':i===1?'🥈':i===2?'🥉':i+1}
                </div>
                {/* المشرف يرى الأفاتار والاسم واللقب، المتسابق يرى اللقب فقط بدون أفاتار */}
                {effectiveRole==='admin' && <Av p={p} sz={32} fs={12}/>}
                <div style={{flex:1}}>
                  
                  {effectiveRole==='admin'
                    ?<><div style={{fontWeight:700,fontSize:13}}>{p.name}</div>
                      <div style={{fontSize:11,color:'var(--gold)'}}>"{p.nick}"</div></>
                    :<div style={{fontWeight:700,fontSize:13,color:'var(--gold)'}}>"{p.nick}"</div>
                  }
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'Cairo',fontSize:16,fontWeight:900,color:'var(--gold)'}}>{p.count}</div>
                  <div style={{fontSize:9,color:'var(--muted)'}}>هجمة</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontFamily:'Cairo',fontSize:16,fontWeight:900,color:'var(--green)'}}>{p.hits}</div>
                  <div style={{fontSize:9,color:'var(--muted)'}}>إصابة</div>
                </div>
              </div>
            ))}
          </>}

          {/* ══ ☠️ ضحايا المسموم ══ */}
          {statsTab==='poison'&&<>
            {(()=>{
              const poisoned = playersList.filter(p=>p.isBannedNextRound);
              if(poisoned.length===0) return(
                <div style={{textAlign:'center',color:'var(--muted)',padding:20,fontSize:12}}>
                  <div style={{fontSize:40,marginBottom:8}}>☠️</div>
                  لا أحد وقع في فخ اللقب المسموم بعد
                </div>
              );
              return(
                <div>
                  <div style={{textAlign:'center',marginBottom:12}}>
                    <div style={{fontFamily:'Cairo',fontSize:28,fontWeight:900,color:'var(--purple)'}}>{poisoned.length}</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>لاعب وقع في الفخ</div>
                  </div>
                  {poisoned.map(p=>(
                    <div key={p.id} style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',background:'rgba(155,89,182,.08)',border:'1px solid rgba(155,89,182,.2)',borderRadius:9,marginBottom:5}}>
                      <span style={{fontSize:16}}>☠️</span>
                      <div style={{flex:1}}>
                        
                  {effectiveRole==='admin'
                          ?<><div style={{fontWeight:700,fontSize:13}}>{p.name}</div>
                            <div style={{fontSize:11,color:'var(--gold)'}}>"{p.nick}"</div></>
                          :<div style={{fontWeight:700,fontSize:13,color:'var(--gold)'}}>"{p.nick}"</div>
                        }
                      </div>
                      <div style={{fontSize:11,color:'var(--purple)'}}>ممنوع ج{p.isBannedNextRound}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </>}

          {/* ══ ☠️ ضحايا المسموم ══ */}
          {statsTab==='poison'&&<>
            {(()=>{
              const poisoned = playersList.filter(p=>p.isBannedNextRound);
              if(poisoned.length===0) return(
                <div style={{textAlign:'center',color:'var(--muted)',padding:18,fontSize:12}}>لم يقع أحد في فخ اللقب المسموم بعد</div>
              );
              return(
                <div>
                  <div style={{textAlign:'center',marginBottom:12}}>
                    <div style={{fontSize:36}}>☠️</div>
                    <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--purple)',marginTop:6}}>{poisoned.length} لاعب ممنوع</div>
                  </div>
                  {poisoned.map(p=>(
                    <div key={p.id} style={{padding:'10px 12px',marginBottom:5,background:'rgba(155,89,182,.08)',border:'1px solid rgba(155,89,182,.2)',borderRadius:9}}>
                      
                  {effectiveRole==='admin'
                        ?<div><span style={{fontWeight:700}}>{p.name}</span> — <span style={{color:'var(--gold)'}}>"{p.nick}"</span><span style={{fontSize:11,color:'var(--muted)',marginRight:8}}> ممنوع الجولة {p.isBannedNextRound}</span></div>
                        :<div><span style={{color:'var(--gold)',fontWeight:700}}>"{p.nick}"</span><span style={{fontSize:11,color:'var(--muted)',marginRight:8}}> — ممنوع من الهجوم</span></div>
                      }
                    </div>
                  ))}
                </div>
              );
            })()}
          </>}

          {/* ══ المتبقون ══ */}
          {statsTab==='remaining'&&<>
            <div className="sg sg3" style={{marginBottom:14}}>
              <div className="sbox"><div className="snum" style={{color:'var(--green)'}}>{activePlayers.length}</div><div className="slbl">نشطون</div></div>
              <div className="sbox"><div className="snum" style={{color:'var(--red)'}}>{elimPlayers.length}</div><div className="slbl">خارجون</div></div>
              <div className="sbox"><div className="snum">{playersList.length}</div><div className="slbl">الكل</div></div>
            </div>
            <div className="ctitle" style={{marginBottom:8}}>✅ ما زالوا في اللعبة</div>
            {activePlayers.map((p,i)=>(
              <div key={p.id} className="pi" style={{marginBottom:5}}>
                <div style={{width:26,height:26,borderRadius:'50%',background:'linear-gradient(135deg,var(--green),#1a8a50)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:'#07070f',flexShrink:0}}>{i+1}</div>
                <Av p={p} sz={30} fs={11}/>
                <div className="pi-info">
                  <div className="pi-name">{effectiveRole==='admin'?p.name:(p.initials||'?')}</div>
                  <div className="pi-sub" style={{color:effectiveRole==='admin'?'var(--gold)':'var(--muted)'}}>
                    {effectiveRole==='admin'?`"${p.nick}"${p.nick2?` · "${p.nick2}"`:''}`:' لقبه مخفي 🔒'}
                  </div>
                </div>
              </div>
            ))}
            {elimPlayers.length>0&&<>
              <div className="ctitle" style={{marginBottom:8,marginTop:14}}>⚰️ مقبرة الألقاب</div>
              {[...elimPlayers].sort((a,b)=>(b.eliminatedRound||0)-(a.eliminatedRound||0)).map(p=>(
                <div key={p.id} className="grave">
                  <div className="grave-name">{effectiveRole==='admin'?p.name:(p.initials||p.nick||'?')}</div>
                  {/* لقب المكشوف فقط — الخارج بالخمول لا يُظهر لقبه */}
                  {p.status==='eliminated'&&<div className="grave-nick">
                    {(()=>{
                      const targetedNick=allAttacksFlat.find(a=>a.correct&&a.realOwnerId===p.id)?.targetNick;
                      const shownNick=targetedNick||p.nick;
                      const otherTargeted=p.nick2&&allAttacksFlat.some(a=>a.correct&&a.realOwnerId===p.id&&a.targetNick===p.nick2);
                      return <>"{shownNick}"{otherTargeted?` / "${p.nick2}"`:''}</>;
                    })()}
                  </div>}
                  {/* الخارج بالخمول — اسم فقط بدون لقب */}
                  <div className="grave-info">
                    {p.status==='cheater'?'🚫 خرج من المسابقة':
                     p.status==='inactive'?`😴 خرج لعدم الهجوم — ج${p.eliminatedRound}`:
                     `💥 خرج ج${p.eliminatedRound}${p.eliminatedBy?` — كشفه: ${p.eliminatedBy}`:''}`}
                  </div>
                </div>
              ))}
            </>}
          </>}

          {/* ══ 🕵️ التقرير الكامل — للمشرف فقط ══ */}
          {statsTab==='log'&&effectiveRole==='admin'&&<>
            <div style={{fontSize:11,color:'var(--gold)',fontWeight:700,marginBottom:12}}>🕵️ السجل الكامل — للمشرف فقط</div>
            {renderFullLog(false)}
          </>}
          </>
          )}
        </div>
      );
    }

        /* ── WINNER ── */
    if(gameScreen==='winner'){
      const winners=activePlayers; // قد يكون 1 أو 2
      const totalCorrect=allAttacksFlat.filter(a=>a.correct).length;

      return(
        <div className="scr">
          {/* مرحلة الإعلان — الفائز */}
          <div style={{textAlign:'center',padding:'24px 0 16px'}}>
            <div style={{fontSize:80,animation:'bnc 1s infinite'}}>🏆</div>
            <div style={{fontFamily:'Cairo',fontSize:28,fontWeight:900,background:'linear-gradient(135deg,var(--gold),#ff8c00)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',marginTop:8}}>
              {winners.length===1?'الفائز':'الفائزون'}
            </div>
          </div>

          {/* بطاقات الفائزين — تصميم مختلف عن الكشف */}
          {winners.map((w,i)=>(
            <div key={w.id} style={{
              background:'linear-gradient(135deg,rgba(240,192,64,.2),rgba(255,200,50,.1))',
              border:'2px solid var(--gold)',
              borderRadius:20,padding:'24px 18px',marginBottom:12,textAlign:'center',
              boxShadow:'0 0 40px rgba(240,192,64,.15)',
              animation:'fi .6s ease'
            }}>
              <div style={{fontSize:50,marginBottom:6}}>{i===0?'👑':'🥈'}</div>
              <div style={{fontFamily:'Cairo',fontSize:24,fontWeight:900,color:'var(--gold)'}}>{w.name}</div>
              <div style={{fontSize:15,color:'var(--text)',marginTop:4}}>"{w.nick}"{w.nick2?<span style={{color:'rgba(240,192,64,.6)'}}> · "{w.nick2}"</span>:''}</div>
              <div style={{marginTop:10,fontSize:12,color:'var(--muted)'}}>صمد {roundNum} جولة بدون كشف</div>
            </div>
          ))}

          {/* ملخص المسابقة */}
          <div className="sg sg3" style={{marginBottom:12}}>
            <div className="sbox"><div className="snum">{roundNum}</div><div className="slbl">جولات</div></div>
            <div className="sbox"><div className="snum">{allAttacksFlat.length}</div><div className="slbl">هجمات</div></div>
            <div className="sbox"><div className="snum" style={{color:'var(--green)'}}>{totalCorrect}</div><div className="slbl">إصابات</div></div>
          </div>

          {/* الأشرس — بالألقاب فقط */}
          {attackerRankGlobal.length>0&&<div className="card">
            <div className="ctitle">⚔️ الأشرس هجوماً</div>
            {attackerRankGlobal.slice(0,5).map((p,i)=>(
              <div key={p.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',background:'#09091e',borderRadius:8,marginBottom:4}}>
                <span style={{fontFamily:'Cairo',fontSize:14,fontWeight:900,width:22,color:i===0?'var(--gold)':'var(--muted)'}}>{i===0?'👑':i+1}</span>
                <span style={{fontWeight:700,color:'var(--gold)',flex:1}}>"{p.nick}"</span>
                <span style={{fontSize:12,color:'var(--green)'}}>{p.hits} إصابة</span>
                <span style={{fontSize:12,color:'var(--muted)'}}>{p.count} هجمة</span>
              </div>
            ))}
          </div>}

          {/* التقرير الكامل */}
          <div className="card">
            <div className="ctitle">📜 تسلسل المسابقة</div>
            {renderFullLog(role!=='admin')}
          </div>

          <button className="btn bgh mt2" onClick={()=>setGameScreen('stats')}>📊 الإحصائيات الكاملة</button>
          {role==='admin'&&<button className="btn bg mt2" onClick={downloadPDFReport}>📄 تحميل التقرير</button>}
        </div>
      );
    }

    /* ══ QUMAIRI SCREENS ══ */
    const qSave=(extra={})=>{localStorage.setItem('ng_qumairi',JSON.stringify({qRoom,qRole,qGroupId,qGroupName,qMyName,qMyId,qDistLocked,...extra}));};
    const qGList=Object.entries(qGroups).map(([id,g])=>({...g,id}));
    const qMList=Object.entries(qMembers).map(([id,m])=>({...m,id}));
    const qMyGroup=qGList.find(g=>g.id===qGroupId);
    const qOtherGroups=qGList.filter(g=>g.id!==qGroupId);
    const qPhase=qGameState?.phase||'lobby';
    const qCurrentAttack=qGameState?.currentAttack;
    const qTimer=qGameState?.timer;
    const isLeader=qRole==='leader';
    const isAdmin=qRole==='admin';

    if(gameScreen==='qumairi_admin') return(<div className="scr"><button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={()=>{setGameScreen('home');setSelectedGame('qumairi');}}>← رجوع</button><div style={{textAlign:'center',padding:'10px 0'}}><div style={{fontSize:46}}>🦅</div></div><div className="ptitle">إنشاء غرفة — صيد القميري</div><div className="psub">أنت المشرف</div><button className="btn bg" onClick={async()=>{const code=genCode();setQRoom(code);setQRole('admin');await set(ref(db,`qrooms/${code}`),{game:{phase:'lobby',createdAt:Date.now()},groups:{},members:{},attacks:{}});localStorage.setItem('ng_qumairi',JSON.stringify({qRoom:code,qRole:'admin'}));setGameScreen('qumairi_lobby');notify(`✅ الغرفة: ${code}`,'gold');}}>🏟️ إنشاء الغرفة</button></div>);

    if(gameScreen==='qumairi_join') return(<div className="scr"><button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={()=>{setGameScreen('home');setSelectedGame('qumairi');}}>← رجوع</button><div style={{textAlign:'center',padding:'10px 0'}}><div style={{fontSize:46}}>🦅</div></div><div className="ptitle">انضمام — صيد القميري</div><div className="card"><div className="ig"><label className="lbl">🔢 رمز الغرفة</label><input className="inp big" placeholder="× × × × × ×" maxLength={4} value={qJoinInput} onChange={e=>{setQJoinInput(e.target.value.replace(/\D/g,''));setQJoinErr('');}}/></div><div className="ig"><label className="lbl">👤 اسمك</label><input className="inp" placeholder="محمد" value={qMyName} onChange={e=>setQMyName(e.target.value)}/></div>{qJoinErr&&<div className="err-msg">⚠️ {qJoinErr}</div>}<button className="btn bg mt2" disabled={qJoinLoading} onClick={async()=>{if(qJoinLoading)return;if(qJoinInput.length!==4){setQJoinErr('الرمز 4 أرقام');return;}if(!qMyName.trim()){setQJoinErr('أدخل اسمك');return;}setQJoinLoading(true);try{const snap=await get(ref(db,`qrooms/${qJoinInput}`));if(!snap.exists()){setQJoinErr('الغرفة غير موجودة');return;}const data=snap.val();if(data.game?.phase!=='lobby'){setQJoinErr('اللعبة بدأت');return;}const mRef=push(ref(db,`qrooms/${qJoinInput}/members`));await set(mRef,{name:qMyName.trim(),groupId:null,role:'member',joinedAt:Date.now()});setQMyId(mRef.key);setQRoom(qJoinInput);setQRole('member');localStorage.setItem('ng_qumairi',JSON.stringify({qRoom:qJoinInput,qRole:'member',qMyName:qMyName.trim(),qMyId:mRef.key}));setGameScreen('qumairi_lobby');notify('✅ انضممت','success');}catch(e){setQJoinErr('خطأ');}finally{setQJoinLoading(false);}}}>{qJoinLoading?'⏳':'🚀 انضمام'}</button></div></div>);

    if(gameScreen==='qumairi_lobby'){const unassigned=qMList.filter(m=>!m.groupId);const myMD=qMList.find(m=>m.id===qMyId);if(myMD&&qRole!=='admin'){if(myMD.role==='leader'&&qRole!=='leader'){setQRole('leader');qSave({qRole:'leader'});
}if(myMD.groupId&&myMD.groupId!==qGroupId){setQGroupId(myMD.groupId);const grp=qGList.find(g=>g.id===myMD.groupId);if(grp)setQGroupName(grp.name);qSave({qGroupId:myMD.groupId});
}}return(
<div className="scr"><button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={()=>{setGameScreen('home');setSelectedGame('qumairi');localStorage.removeItem('ng_qumairi');setQRoom('');setQRole(null);setQGroupId(null);}}>← رجوع</button><div className="ptitle" style={{fontSize:18}}>🦅 صيد القميري</div><div className="card" style={{textAlign:'center'}}><div style={{fontSize:12,color:'var(--muted)'}}>رمز الغرفة</div><div className="room-code-big" style={{fontSize:28}}>{qRoom}</div><button className="btn bo bxs" style={{width:'auto',margin:'6px auto 0'}} onClick={()=>{navigator.clipboard?.writeText(qRoom);notify('تم النسخ','success');}}>📋 نسخ</button></div>{isAdmin&&<><div className="card"><div className="ctitle">➕ إنشاء مجموعة</div><div style={{display:'flex',gap:6}}><input className="inp" placeholder="اسم المجموعة" value={qGroupName} onChange={e=>setQGroupName(e.target.value)} style={{flex:1}}/><button className="btn bg bsm" onClick={async()=>{if(!qGroupName.trim())return;if(qGList.length>=6)return;const initW={};Q_WEAPONS.forEach(w=>{initW[w.id]=w.qty;});
const nRef=push(ref(db,`qrooms/${qRoom}/groups`));await set(nRef,{name:qGroupName.trim(),trees:{},weapons:initW,totalRemaining:Q_TOTAL,distributed:false,shieldUsed:false});
setQGroupName('');notify('✅','success');}}>➕</button></div></div><div className="card"><div className="ctitle">👥 المجموعات ({qGList.length})</div>{qGList.map((g,gi)=>{const members=qMList.filter(m=>m.groupId===g.id);const leader=members.find(m=>m.role==='leader');return(
<div key={g.id} style={{marginBottom:10,padding:10,background:'#09091e',borderRadius:10}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontWeight:900,color:'var(--gold)'}}>{g.name}</span><span style={{fontSize:10,color:'var(--muted)'}}>{members.length} عضو{leader?` · 👑 ${leader.name}`:''}</span></div>{members.map(m=>(<div key={m.id} style={{display:'flex',alignItems:'center',gap:6,padding:'4px 0',fontSize:12}}><span>{m.role==='leader'?'👑':'👤'}</span><span style={{flex:1}}>{m.name}</span>{m.role!=='leader'&&<button className="btn bg bxs" onClick={async()=>{const updates={};members.forEach(mm=>{if(mm.role==='leader')updates[`qrooms/${qRoom}/members/${mm.id}/role`]='member';});
updates[`qrooms/${qRoom}/members/${m.id}/role`]='leader';await update(ref(db),updates);}}>👑</button>}</div>))}</div>)})}{unassigned.length>0&&<><div style={{fontSize:11,color:'var(--red)',fontWeight:700,marginTop:10,marginBottom:6}}>⏳ بدون مجموعة ({unassigned.length})</div>{unassigned.map(m=>(<div key={m.id} style={{display:'flex',alignItems:'center',gap:6,padding:'5px 0',fontSize:12}}><span>👤 {m.name}</span><div style={{display:'flex',gap:3}}>{qGList.map(g=>(<button key={g.id} className="btn bg bxs" style={{fontSize:9}} onClick={async()=>{await update(ref(db,`qrooms/${qRoom}/members/${m.id}`),{groupId:g.id});
}}>{g.name}</button>))}</div></div>))}</>}</div>{qPhase==='lobby'&&<button className="btn bg" disabled={qGList.length<2} onClick={async()=>{await update(ref(db,`qrooms/${qRoom}/game`),{phase:'distributing'});
notify('🌳 بدء التوزيع','gold');}}>🌳 بدء التوزيع</button>}{qPhase==='distributing'&&(()=>{const allDist=qGList.length>=2&&qGList.every(g=>g.distributed);return allDist?<button className="btn bg" onClick={async()=>{await update(ref(db,`qrooms/${qRoom}/game`),{phase:'playing',round:1,currentAttack:null,timer:null,turnGroup:qGList[0]?.id});
notify('⚔️ اللعبة بدأت','gold');}}>⚔️ بدء اللعبة</button>:<div style={{textAlign:'center',color:'var(--muted)',fontSize:12,padding:10}}>⏳ انتظار التوزيع</div>;})()}</>}{!isAdmin&&qPhase==='distributing'&&(()=>{if(!qGroupId||!qMyGroup) return <div className="card" style={{textAlign:'center',padding:20}}><div style={{fontSize:40}}>⏳</div><div style={{fontSize:14,color:'var(--muted)',marginTop:8}}>انتظر المشرف يحدد مجموعتك</div></div>;if(qMyGroup.distributed) return <div className="card" style={{textAlign:'center',padding:20}}><div style={{fontSize:40}}>✅</div><div style={{fontSize:15,fontWeight:900,color:'var(--green)',marginTop:8}}>تم التوزيع — انتظار الباقين</div></div>;if(!isLeader) return <div className="card" style={{textAlign:'center',padding:20}}><div style={{fontSize:40}}>⏳</div><div style={{fontSize:14,color:'var(--muted)',marginTop:8}}>القائد 👑 يوزع — انتظر</div></div>;const total=Object.values(qDistribution).reduce((s,v)=>s+(parseInt(v)||0),0);const remaining=Q_TOTAL-total;return(
<div className="card"><div className="ctitle">🌳 وزّع {Q_TOTAL} قميري</div><div style={{textAlign:'center',marginBottom:12}}><div style={{fontFamily:'Cairo',fontSize:32,fontWeight:900,color:remaining===0?'var(--green)':remaining<0?'var(--red)':'var(--gold)'}}>{remaining}</div><div style={{fontSize:11,color:'var(--muted)'}}>متبقي</div></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{Q_TREES.map(tree=>(<div key={tree} style={{background:'#09091e',borderRadius:10,padding:'10px 8px',textAlign:'center'}}><div style={{fontSize:22}}>🌳</div><div style={{fontSize:11,fontWeight:700,marginTop:2}}>{tree}</div><input type="number" min="0" max="100" className="inp" style={{marginTop:6,padding:'6px',fontSize:16,textAlign:'center',width:'100%'}} value={qDistribution[tree]||''} placeholder="0" onChange={e=>setQDistribution(prev=>({...prev,[tree]:e.target.value}))}/></div>))}</div><button className="btn bg mt3" disabled={remaining!==0} onClick={async()=>{const trees={};Q_TREES.forEach(t=>{trees[t]=parseInt(qDistribution[t])||0;});
await update(ref(db,`qrooms/${qRoom}/groups/${qGroupId}`),{trees,distributed:true,totalRemaining:Q_TOTAL});
notify('✅ تم التوزيع','success');}}>{remaining===0?'✅ تأكيد':`وزّع ${Math.abs(remaining)}`}</button></div>);})()}{!isAdmin&&qPhase==='lobby'&&<div className="card" style={{textAlign:'center',padding:20}}><div style={{fontSize:40}}>⏳</div><div style={{fontSize:14,color:'var(--muted)',marginTop:8}}>{qGroupId?`مجموعتك: ${qMyGroup?.name||'—'}`:'انتظر المشرف'}</div></div>}
</div>);}

    if(gameScreen==='qumairi_play'){const myAtks=Object.values(qAttacks||{}).filter(a=>a.attackerId===qGroupId||a.targetId===qGroupId).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));if(isAdmin){const turnGroupId=qGameState?.turnGroup;const turnGroup=qGList.find(g=>g.id===turnGroupId);return(
<div className="scr">{qReveal&&qReveal.phase==='result'&&(<div className={`q-reveal q-reveal-bg-${qReveal.type}`}><div className="q-scene">{qReveal.type==='success'&&<><div className="q-tree-big">🌳</div><div className="q-birds">{Array.from({length:Math.min(qReveal.hunted||0,20)}).map((_,i)=>(<span key={i} className="q-bird" style={{'--br':`${(Math.random()-.5)*40}deg`,animationDelay:`${i*.1}s`}}>🐦</span>))}</div><div className="q-num" style={{color:'var(--green)'}}>-{qReveal.hunted}</div><div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--gold)'}}>🎯 {qReveal.hunted} قميري</div></>}{qReveal.type==='empty'&&<><div className="q-empty-face">😂</div><div style={{fontFamily:'Cairo',fontSize:20,fontWeight:900,color:'var(--gold)',marginTop:10}}>الشجرة فاضية</div></>}{qReveal.type==='fail'&&<><div style={{fontSize:60}}>💨</div><div style={{fontFamily:'Cairo',fontSize:20,fontWeight:900,color:'var(--red)',marginTop:8}}>إجابة خاطئة</div></>}{qReveal.poisonMsg&&<div style={{marginTop:10,padding:'8px 14px',background:'rgba(155,89,182,.2)',border:'1px solid rgba(155,89,182,.5)',borderRadius:8,fontSize:13,color:'var(--purple)',fontWeight:700}}>{qReveal.poisonMsg}</div>}
</div><button className="btn bg mt3" style={{width:'auto',padding:'10px 30px'}} onClick={()=>{setQReveal(null);update(ref(db,`qrooms/${qRoom}/game`),{lastResult:null,showResult:false});
}}>▶️ متابعة</button></div>)}<div className="ptitle" style={{fontSize:18}}>👑 لوحة المشرف</div>{!qCurrentAttack&&!qReveal&&<div className="card"><div style={{display:'flex',gap:5,marginBottom:8}}><button className={`btn ${qGameState?.playMode!=='speed'?'bg':'bgh'} bxs`} style={{flex:1}} onClick={async()=>await update(ref(db,`qrooms/${qRoom}/game`),{playMode:'sequential'})}>📋 تسلسلي</button><button className={`btn ${qGameState?.playMode==='speed'?'bg':'bgh'} bxs`} style={{flex:1}} onClick={async()=>await update(ref(db,`qrooms/${qRoom}/game`),{playMode:'speed'})}>⚡ سرعة</button><button className={`btn ${qGameState?.playMode==='challenge'?'bb':'bgh'} bxs`} style={{flex:1}} onClick={async()=>await update(ref(db,`qrooms/${qRoom}/game`),{playMode:'challenge'})}>🏁 تحدي</button></div><div className="ctitle" style={{margin:0}}>⚔️ من يهاجم؟</div><div style={{display:'flex',gap:5,flexWrap:'wrap'}}>{qGList.map(g=>(<button key={g.id} className={`btn ${turnGroupId===g.id?'bg':'bgh'}`} style={{flex:1,minWidth:'30%',padding:'8px'}} onClick={async()=>{await update(ref(db,`qrooms/${qRoom}/game`),{turnGroup:g.id});
}}><div style={{fontSize:13,fontWeight:900}}>{g.name}</div><div style={{fontSize:9,opacity:.7}}>{g.totalRemaining} 🐦</div></button>))}</div></div>}
{qCurrentAttack&&<div className="card" style={{background:'rgba(230,57,80,.08)',border:'1px solid rgba(230,57,80,.3)'}}><div className="ctitle" style={{color:'var(--red)'}}>⚔️ هجوم</div><div style={{fontSize:13,marginBottom:8}}><strong style={{color:'var(--gold)'}}>{qCurrentAttack.attackerName}</strong> → <strong style={{color:'var(--red)'}}>{qCurrentAttack.targetName}</strong> / 🌳 {qCurrentAttack.tree} / {qCurrentAttack.weaponName}</div>{!qTimer&&<><div style={{display:'flex',gap:4,marginBottom:6}}>{[15,30,45,60].map(s=>(<button key={s} className="btn bg bsm" style={{flex:1}} onClick={async()=>{await update(ref(db,`qrooms/${qRoom}/game`),{timer:{deadline:Date.now()+s*1000}});
playSound('suspense');}}>{s}ث</button>))}</div><div style={{display:'flex',gap:4}}><input type="number" className="inp" style={{flex:1,padding:'5px',textAlign:'center',fontSize:13}} placeholder="مخصص" value={qCustomTimer} onChange={e=>setQCustomTimer(e.target.value)}/><button className="btn bg bsm" onClick={async()=>{const s=parseInt(qCustomTimer)||30;await update(ref(db,`qrooms/${qRoom}/game`),{timer:{deadline:Date.now()+s*1000}});
setQCustomTimer('');playSound('suspense');}}>⏱️</button></div></>}{qTimer&&<><div style={{textAlign:'center',marginBottom:8}}><div className="q-timer-huge" style={{fontSize:56}}>{qCountdown!==null?(qCountdown>0?qCountdown:'⏰'):'...'}</div></div><div style={{display:'flex',gap:8}}><button className="btn bv" style={{flex:1}} onClick={async()=>{const atk=qCurrentAttack;const tg=qGList.find(g=>g.id===atk.targetId);const u={};if(tg?.shield===atk.tree){u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${atk.weapon}`]=(qGroups[atk.attackerId]?.weapons?.[atk.weapon]||1)-1;u[`qrooms/${qRoom}/groups/${atk.targetId}/shield`]=null;const logRef=push(ref(db,`qrooms/${qRoom}/attacks`));u[`qrooms/${qRoom}/attacks/${logRef.key}`]={...atk,result:'shielded',hunted:0,timestamp:Date.now()};u[`qrooms/${qRoom}/game/currentAttack`]=null;u[`qrooms/${qRoom}/game/timer`]=null;u[`qrooms/${qRoom}/game/lastResult`]={...atk,result:'success',hunted:0,msg:'🛡️ الدرع صد الهجوم',timestamp:Date.now()};u[`qrooms/${qRoom}/game/showResult`]=true;await update(ref(db),u);return;}const treeCount=tg?.trees?.[atk.tree]||0;const wp=Q_WEAPONS.find(w=>w.id===atk.weapon)?.power||0;const hunted=Math.min(treeCount,wp);u[`qrooms/${qRoom}/groups/${atk.targetId}/trees/${atk.tree}`]=treeCount-hunted;u[`qrooms/${qRoom}/groups/${atk.targetId}/totalRemaining`]=(tg?.totalRemaining||0)-hunted;u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${atk.weapon}`]=(qGroups[atk.attackerId]?.weapons?.[atk.weapon]||1)-1;let poisonMsg=null;if(qGameState?.cursedTree===atk.tree){const atkW={...(qGroups[atk.attackerId]?.weapons||{})};atkW[atk.weapon]=(atkW[atk.weapon]||0)-1;const order=['showzel','omsagma','nabeeta'];const startIdx=order.indexOf(atk.weapon);let deducted=null;for(let wi=startIdx;wi<order.length;wi++){if((atkW[order[wi]]||0)>0){u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${order[wi]}`]=atkW[order[wi]]-1;deducted=Q_WEAPONS.find(w=>w.id===order[wi])?.name;break;}}poisonMsg=deducted?`☠️ الشجرة المسمومة — خسرت ${deducted} إضافي`:'☠️ الشجرة المسمومة';}const ts=Date.now();const logRef=push(ref(db,`qrooms/${qRoom}/attacks`));u[`qrooms/${qRoom}/attacks/${logRef.key}`]={...atk,result:'success',hunted,timestamp:ts};u[`qrooms/${qRoom}/game/currentAttack`]=null;u[`qrooms/${qRoom}/game/timer`]=null;u[`qrooms/${qRoom}/game/lastResult`]={...atk,result:'success',hunted,msg:hunted>0?`🎯 ${hunted} قميري`:'🌳 الشجرة فارغة',poisonMsg,poisonTarget:'all',timestamp:ts};u[`qrooms/${qRoom}/game/showResult`]=true;await update(ref(db),u);playSound('explosion');}}>✅ صح</button><button className="btn br" style={{flex:1}} onClick={async()=>{const atk=qCurrentAttack;const u={};u[`qrooms/${qRoom}/groups/${atk.attackerId}/weapons/${atk.weapon}`]=(qGroups[atk.attackerId]?.weapons?.[atk.weapon]||1)-1;const logRef=push(ref(db,`qrooms/${qRoom}/attacks`));u[`qrooms/${qRoom}/attacks/${logRef.key}`]={...atk,result:'fail',hunted:0,timestamp:Date.now()};u[`qrooms/${qRoom}/game/currentAttack`]=null;u[`qrooms/${qRoom}/game/timer`]=null;u[`qrooms/${qRoom}/game/lastResult`]={...atk,result:'fail',hunted:0,msg:'❌ إجابة خاطئة',timestamp:Date.now()};u[`qrooms/${qRoom}/game/showResult`]=true;await update(ref(db),u);playSound('countdown_last');}}>❌ خطأ</button></div></>}</div>}
<div className="card"><div className="ctitle">🎲 أدوات</div><div style={{marginBottom:8}}><div style={{fontSize:11,color:'var(--purple)',marginBottom:4}}>☠️ الشجرة المسمومة</div><select className="inp" style={{fontSize:12}} value={qGameState?.cursedTree||''} onChange={async e=>{await update(ref(db,`qrooms/${qRoom}/game`),{cursedTree:e.target.value||null});
}}><option value="">بدون</option>{Q_TREES.map(t=><option key={t} value={t}>{t}</option>)}</select></div><div><button className={`btn ${qGameState?.sandstorm?'bb':'bgh'} bsm`} onClick={async()=>{await update(ref(db,`qrooms/${qRoom}/game`),{sandstorm:!qGameState?.sandstorm});
}}>🌪️ {qGameState?.sandstorm?'إيقاف':'تفعيل'} العاصفة</button></div></div><div className="card"><div className="ctitle">📊 إحصائيات المجموعات</div>{qGList.map(g=>(<div key={g.id} style={{marginBottom:8,padding:8,background:'#09091e',borderRadius:8}}><div style={{display:'flex',justifyContent:'space-between'}}><span style={{fontWeight:700,color:'var(--gold)'}}>{g.name}</span><span style={{color:'var(--green)',fontWeight:900}}>{g.totalRemaining||0} 🐦</span></div><div style={{display:'flex',flexWrap:'wrap',gap:3,marginTop:4}}>{Q_TREES.map(t=><span key={t} style={{fontSize:9,padding:'1px 4px',borderRadius:4,background:g.trees?.[t]>0?'rgba(46,204,113,.1)':'rgba(255,255,255,.03)',color:g.trees?.[t]>0?'var(--green)':'var(--dim)'}}>{t}:{g.trees?.[t]||0}</span>)}</div></div>))}</div><div className="card"><div className="ctitle">📜 سجل المعركة</div><div className="sc" style={{maxHeight:200}}>{Object.values(qAttacks||{}).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)).map((a,i)=>(<div key={i} className="feed-item" style={{borderColor:a.result==='success'?'var(--green)':'var(--red)',fontSize:11}}><strong style={{color:'var(--gold)'}}>{a.attackerName}</strong> → <strong style={{color:'var(--red)'}}>{a.targetName}</strong> / {a.tree} — {a.result==='success'?`🎯 ${a.hunted}`:'❌ فشل'}</div>))}</div></div><button className="btn br mt2" onClick={async()=>{await update(ref(db,`qrooms/${qRoom}/game`),{phase:'ended'});
playSound('applause');}}>🏆 إنهاء</button><button className="btn bgh mt2" onClick={()=>{const lines=[];const add=t=>lines.push(t);add('='.repeat(40));add('    تقرير صيد القميري');add('='.repeat(40));add('غرفة: #'+qRoom);add('');[...qGList].sort((a,b)=>(b.totalRemaining||0)-(a.totalRemaining||0)).forEach((g,i)=>{add((i===0?'👑':(i+1)+'.')+' '+g.name+' — '+(g.totalRemaining||0)+' قميري');});
add('');Object.values(qAttacks||{}).sort((a,b)=>(a.timestamp||0)-(b.timestamp||0)).forEach(a=>{add(a.attackerName+' → '+a.targetName+' / '+a.tree+' — '+(a.result==='success'?a.hunted+' 🎯':'❌'));});
const content=lines.reduce((a,b)=>a+'\n'+b,'').slice(1);const blob=new Blob([content],{type:'text/plain;charset=utf-8'});
const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='تقرير-القميري-'+qRoom+'.txt';document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);notify('✅ تم','success');}}>📄 تقرير</button></div>);}return(
<div className="scr">{qReveal&&(<div className={`q-reveal ${qReveal.phase==='result'?`q-reveal-bg-${qReveal.type}`:'q-reveal-bg-pending'}`}><div className="q-scene">{qReveal.phase==='suspense'&&<><div className="q-tree-big">🌳</div><div style={{fontFamily:'Cairo',fontSize:16,color:'var(--gold)',marginTop:10}}>شجرة {qReveal.tree}</div><div className="q-suspense" style={{fontFamily:'Cairo',fontSize:18,color:'var(--muted)',marginTop:20}}>... حبس الأنفاس ...</div></>}{qReveal.phase==='weapon'&&<><div className="q-shake"><div className="q-tree-big">🌳</div></div><div className="q-weapon-flash" style={{fontSize:40,marginTop:12}}>{qReveal.weapon==='شوزل'?'💥':qReveal.weapon==='أم صتمة'?'🎯':'🪃'}</div></>}{qReveal.phase==='result'&&qReveal.type==='success'&&<><div className="q-tree-big">🌳</div><div className="q-birds">{Array.from({length:Math.min(qReveal.hunted||0,30)}).map((_,i)=>(<span key={i} className="q-bird" style={{'--br':`${(Math.random()-.5)*40}deg`,animationDelay:`${i*.1}s`}}>🐦</span>))}</div><div className="q-num" style={{color:'var(--green)'}}>-{qReveal.hunted}</div><div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--gold)'}}>تم اصطياد {qReveal.hunted} قميري</div><div style={{marginTop:8,padding:'8px 14px',background:'rgba(255,255,255,.05)',borderRadius:8,fontSize:12}}><div style={{color:'var(--gold)'}}>{qReveal.attackerName} → {qReveal.targetName}</div></div>{qReveal.poisonMsg&&<div style={{marginTop:8,padding:'8px 14px',background:'rgba(155,89,182,.2)',border:'1px solid rgba(155,89,182,.5)',borderRadius:8,fontSize:13,color:'var(--purple)',fontWeight:700}}>{qReveal.poisonMsg}</div>}
</>}{qReveal.phase==='result'&&qReveal.type==='empty'&&<><div className="q-empty-face">😂</div><div style={{fontFamily:'Cairo',fontSize:22,fontWeight:900,color:'var(--gold)',marginTop:12}}>الشجرة فاضية</div></>}{qReveal.phase==='result'&&qReveal.type==='fail'&&<><div style={{fontSize:60}}>💨</div><div style={{fontFamily:'Cairo',fontSize:22,fontWeight:900,color:'var(--red)',marginTop:8}}>إجابة خاطئة</div></>}</div></div>)}{qTurnOverlay&&!qReveal&&qCurrentAttack&&!qTimer&&(<div className="q-turn-overlay"><div style={{fontSize:70,animation:'treeBounce 1s ease infinite'}}>⚔️</div><div style={{fontFamily:'Cairo',fontSize:24,fontWeight:900,color:'var(--gold)',marginTop:12}}>{qTurnOverlay.groupName}</div><div style={{fontSize:14,color:'var(--muted)',marginTop:6}}>اختاروا هدفهم بسلاح {qTurnOverlay.weapon}</div></div>)}{qTimer&&!qReveal&&qCountdown!==null&&(<div className="q-turn-overlay"><div className="q-timer-huge">{qCountdown>0?qCountdown:'⏰'}</div><div style={{fontSize:14,color:'var(--gold)',marginTop:8}}>{qCurrentAttack?.attackerName} يهاجم {qCurrentAttack?.targetName}</div></div>)}<div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><div style={{fontSize:15,fontWeight:900,color:'var(--gold)'}}>{qMyGroup?.name||'—'} {isLeader?'👑':''}</div><div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--green)'}}>{qMyGroup?.totalRemaining||0} 🐦</div></div>{qGameState?.announcement&&(Date.now()-qGameState.announcement.timestamp<10000)&&(<div className="ann ag" style={{marginBottom:8}}><div style={{fontSize:13,fontWeight:700}}>{qGameState.announcement.msg}</div></div>)}{qCurrentAttack&&<div className="card" style={{background:qCurrentAttack.targetId===qGroupId?'rgba(230,57,80,.12)':'rgba(230,57,80,.06)',border:`1.5px solid ${qCurrentAttack.targetId===qGroupId?'rgba(230,57,80,.5)':'rgba(230,57,80,.2)'}`}}><div style={{fontSize:13,fontWeight:700,color:'var(--red)',marginBottom:4}}>⚔️ هجوم</div><div style={{fontSize:12}}><strong style={{color:'var(--gold)'}}>{qCurrentAttack.attackerName}</strong> يهاجم <strong style={{color:'var(--red)'}}>{qCurrentAttack.targetName}</strong></div>{qCurrentAttack.targetId===qGroupId&&!qMyGroup?.shieldUsed&&isLeader&&(<div style={{marginTop:8,padding:'10px',background:'rgba(155,89,182,.1)',border:'1.5px solid rgba(155,89,182,.4)',borderRadius:8}}><div style={{fontSize:13,fontWeight:900,color:'var(--red)',marginBottom:6}}>⚠️ أنت تتعرض للهجوم</div><button className="btn bp bsm" onClick={async()=>{const tree=qCurrentAttack.tree;await update(ref(db,`qrooms/${qRoom}/groups/${qGroupId}`),{shield:tree,shieldUsed:true});
await update(ref(db,`qrooms/${qRoom}/game`),{announcement:{msg:`🛡️ ${qMyGroup?.name} استخدمت الدرع`,timestamp:Date.now()}});
notify('🛡️ درع','success');}}>🛡️ تفعيل الدرع</button></div>)}</div>}
<div className="card"><div className="ctitle">🔫 الأسلحة</div><div style={{display:'flex',gap:6}}>{Q_WEAPONS.map(w=>(<div key={w.id} style={{flex:1,textAlign:'center',padding:8,background:'#09091e',borderRadius:8}}><div style={{fontSize:18}}>{w.icon}</div><div style={{fontSize:10,fontWeight:700}}>{w.name}</div><div style={{fontFamily:'Cairo',fontSize:16,fontWeight:900,color:qMyGroup?.weapons?.[w.id]>0?'var(--gold)':'var(--red)'}}>{qMyGroup?.weapons?.[w.id]||0}</div></div>))}</div></div>{isLeader&&!qCurrentAttack&&qGameState?.turnGroup===qGroupId&&<div className="card" style={{background:'linear-gradient(135deg,rgba(230,57,80,.08),rgba(200,40,60,.04))',border:'1.5px solid rgba(230,57,80,.3)'}}><div style={{textAlign:'center',marginBottom:10}}><div style={{fontSize:36}}>⚔️</div><div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--red)'}}>دورك — شن هجوم</div></div><div className="ig"><label className="lbl">المجموعة</label><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{qOtherGroups.map(g=>(<button key={g.id} className={`btn ${qAttackTarget.group===g.id?'bg':'bgh'} bsm`} onClick={()=>setQAttackTarget(p=>({...p,group:g.id,groupName:g.name}))}>{g.name}</button>))}</div></div>{qAttackTarget.group&&!qGameState?.sandstorm&&<div className="ig"><label className="lbl">الشجرة</label><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{Q_TREES.map(t=>(<button key={t} className={`btn ${qAttackTarget.tree===t?'bg':'bgh'} bxs`} onClick={()=>setQAttackTarget(p=>({...p,tree:t}))}>{t}</button>))}</div></div>}
{qAttackTarget.group&&qGameState?.sandstorm&&<div style={{padding:8,background:'rgba(240,192,64,.08)',borderRadius:8,marginBottom:6,fontSize:12,color:'var(--gold)'}}>🌪️ العاصفة — الشجرة عشوائية</div>}
{qAttackTarget.group&&<div className="ig"><label className="lbl">السلاح</label><div style={{display:'flex',gap:5}}>{Q_WEAPONS.filter(w=>(qMyGroup?.weapons?.[w.id]||0)>0).map(w=>(<button key={w.id} className={`btn ${qAttackTarget.weapon===w.id?'bg':'bgh'} bsm`} style={{flex:1}} onClick={()=>setQAttackTarget(p=>({...p,weapon:w.id,weaponName:w.name}))}>{w.icon} {w.name}</button>))}</div></div>}
{qAttackTarget.group&&qAttackTarget.weapon&&(qAttackTarget.tree||qGameState?.sandstorm)&&(<button className="btn br mt2" onClick={async()=>{const finalTree=qGameState?.sandstorm?Q_TREES[Math.floor(Math.random()*Q_TREES.length)]:qAttackTarget.tree;await update(ref(db,`qrooms/${qRoom}/game`),{currentAttack:{attackerId:qGroupId,attackerName:qMyGroup?.name,targetId:qAttackTarget.group,targetName:qAttackTarget.groupName,tree:finalTree,weapon:qAttackTarget.weapon,weaponName:qAttackTarget.weaponName,time:Date.now()}});
setQAttackTarget({group:'',tree:'',weapon:''});
notify('⚔️ هجوم','gold');}}>⚔️ هاجم</button>)}</div>}
{isLeader&&!qCurrentAttack&&qGameState?.turnGroup!==qGroupId&&!qReveal&&(<div className="card" style={{textAlign:'center',padding:14}}><div style={{fontSize:36}}>⏳</div><div style={{fontSize:14,color:'var(--muted)',marginTop:6}}>ليس دورك — انتظر</div></div>)}<div className="card"><div className="ctitle">📋 سجل مجموعتي</div>{myAtks.length===0?<div style={{textAlign:'center',color:'var(--muted)',fontSize:12,padding:8}}>لا أحداث</div>:myAtks.slice(0,15).map((a,i)=>(<div key={i} className="feed-item" style={{borderColor:a.attackerId===qGroupId?(a.result==='success'?'var(--green)':'var(--red)'):'var(--red)'}}>{a.attackerId===qGroupId?`${a.result==='success'?'🎯':'❌'} هاجمت ${a.targetName} / ${a.tree} — ${a.result==='success'?`اصطدت ${a.hunted}`:'فشل'}`:`🛡️ هاجمتكم ${a.attackerName} وخسرتم ${a.hunted} قميري`}</div>))}</div></div>);}

    if(gameScreen==='qumairi_results'){const sorted=[...qGList].sort((a,b)=>(b.totalRemaining||0)-(a.totalRemaining||0));return(<div className="scr"><div style={{textAlign:'center',padding:'16px 0'}}><div style={{fontSize:60,animation:'bnc 1s infinite'}}>🏆</div><div className="ptitle" style={{fontSize:24}}>نتائج صيد القميري</div></div><div className="sg sg3" style={{marginBottom:12}}><div className="sbox"><div className="snum">{sorted.length}</div><div className="slbl">مجموعات</div></div><div className="sbox"><div className="snum" style={{color:'var(--red)'}}>{Object.values(qAttacks||{}).filter(a=>a.result==='success').reduce((s,a)=>s+(a.hunted||0),0)}</div><div className="slbl">قميري صيدت</div></div><div className="sbox"><div className="snum" style={{color:'var(--green)'}}>{Object.keys(qAttacks||{}).length}</div><div className="slbl">هجمات</div></div></div>{[...sorted].reverse().map((g,i)=>{const rank=sorted.length-i;const isWinner=rank===1;return(<div key={g.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:isWinner?'linear-gradient(135deg,rgba(240,192,64,.2),rgba(255,140,0,.1))':'#09091e',border:isWinner?'2px solid var(--gold)':'1px solid rgba(255,255,255,.05)',borderRadius:14,marginBottom:8}}><div style={{fontFamily:'Cairo',fontSize:isWinner?28:20,fontWeight:900,width:34,color:isWinner?'var(--gold)':'var(--muted)'}}>{isWinner?'👑':rank}</div><div style={{flex:1}}><div style={{fontWeight:900,fontSize:isWinner?16:14}}>{g.name}</div></div><div style={{fontFamily:'Cairo',fontSize:isWinner?28:20,fontWeight:900,color:isWinner?'var(--gold)':'var(--text)'}}>{g.totalRemaining||0}</div></div>);})}<button className="btn bgh mt3" onClick={()=>{setGameScreen('home');setSelectedGame(null);setQRoom('');setQRole(null);setQGroupId(null);localStorage.removeItem('ng_qumairi');}}>🏟️ ساحة الألعاب</button></div>);}


    return null;
  };

  /* ══ OTHER TABS ══ */
  const renderNews=()=>(
    <div className="scr">
      <div className="ptitle">🔔 آخر الأخبار</div>
      <div className="psub">تحديثات التطبيق والميزات الجديدة</div>
      {[{id:1,date:'2025-03-29',title:'🎉 إطلاق النسخة التجريبية',body:'تم إطلاق لعبة الألقاب رسمياً مع دعم الغرف الحقيقية عبر Firebase!',isNew:true},{id:2,date:'2025-03-25',title:'⚡ نظام الهجوم المتزامن',body:'الكل يهاجم في نفس الوقت — سرية تامة ثم كشف مفاجئ.',isNew:true},{id:3,date:'2025-03-20',title:'📊 إحصائيات الإثارة',body:'أكثر لقب مطاردة وأقل اسم استهدافاً.',isNew:false}].map(n=>(
      <div key={n.id} className="news-item"><div className="news-date">{n.isNew&&<span className="news-new">جديد</span>}{n.date}</div><div className="news-title">{n.title}</div><div className="news-body">{n.body}</div></div>
    ))}</div>
  );

  const renderSuggest=()=>(
    <div className="scr">
      <div className="ptitle">💡 الاقتراحات</div>
      <div className="psub">شاركنا أفكارك — يُفتح تطبيق البريد تلقائياً</div>
      <div className="card">
        <div className="ctitle">📩 إرسال اقتراح</div>
        <div className="ig"><label className="lbl">التصنيف</label>
          <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
            {['لعبة','تصميم','إحصائيات','أسعار','أخرى'].map(c=>(
              <button key={c} className={`btn bsm ${suggForm.cat===c?'bg':'bgh'}`} style={{width:'auto'}} onClick={()=>setSuggForm(f=>({...f,cat:c}))}>{c}</button>
            ))}
          </div>
        </div>
        <div className="ig"><label className="lbl">اكتب اقتراحك</label>
          <textarea className="inp" placeholder="اقتراحك هنا..." value={suggForm.text} onChange={e=>setSuggForm(f=>({...f,text:e.target.value}))}/>
        </div>
        <button className="btn bg" onClick={()=>{
          if(!suggForm.text.trim()){notify('اكتب اقتراحك أولاً','error');return;}
          const sub=encodeURIComponent(`اقتراح [${suggForm.cat}] — لعبة الألقاب`);
          const bod=encodeURIComponent(`التصنيف: ${suggForm.cat}\n\nالاقتراح:\n${suggForm.text}`);
          window.open(`mailto:${SUPPORT_EMAIL}?subject=${sub}&body=${bod}`);
          setSuggForm(f=>({...f,text:''}));notify('✅ سيُفتح تطبيق البريد','success');
        }}>📤 فتح البريد للإرسال</button>
        <div style={{marginTop:10,padding:'9px 12px',background:'rgba(79,163,224,.07)',border:'1px solid rgba(79,163,224,.2)',borderRadius:8,fontSize:11,color:'var(--muted)',textAlign:'center'}}>
          إلى: <strong style={{color:'var(--blue)'}}>{SUPPORT_EMAIL}</strong>
        </div>
      </div>
      <div className="div">اقتراحات من المجتمع</div>
      {suggestions.map(s=><div key={s.id} className="sugg-item"><div className="sugg-cat">{s.cat}</div><div className="sugg-text">{s.text}</div><div className="sugg-date">{s.date}</div></div>)}
    </div>
  );

  const renderPricing=()=>(
    <div className="scr">
      <div className="ptitle">💎 باقات الاشتراك</div>
      <div className="psub">اشتراك شهري أو سنوي — الأسعار تُعلن قريباً</div>
      <div style={{display:'flex',gap:8,marginBottom:16}}>{['شهري','سنوي (وفّر 20%)'].map((t,i)=><button key={t} className={`btn ${i===1?'bo':'bgh'}`} style={{flex:1}}>{t}</button>)}</div>
      {[
        {cls:'plan-super',badge:{bg:'var(--purple)',c:'#fff',label:'⭐ الأشهر'},name:'سوبر 🚀',nameColor:'var(--purple)',feats:'✦ لاعبون غير محدودون\n✦ جلسات متزامنة متعددة\n✦ تقارير تفصيلية كاملة\n✦ دعم أولوية 24/7\n✦ جميع مميزات الذهبي والفضي'},
        {cls:'plan-gold',badge:{bg:'var(--gold)',c:'#07070f',label:'🏆 ذهبي'},name:'ذهبي ✨',nameColor:'var(--gold)',feats:'✦ حتى 50 لاعب\n✦ إحصائيات متقدمة\n✦ سجل تاريخ الجلسات\n✦ ألقاب وأيقونات مخصصة'},
        {cls:'plan-silver',badge:{bg:'rgba(200,200,220,.4)',c:'var(--text)',label:'🥈 فضي'},name:'فضي',nameColor:'rgba(210,210,230,.9)',feats:'✦ حتى 20 لاعب\n✦ إحصائيات أساسية\n✦ غرفة واحدة نشطة'},
      ].map((p,i)=>(
        <div key={i} className={`plan-card ${p.cls}`}>
          <div className="plan-badge" style={{background:p.badge.bg,color:p.badge.c}}>{p.badge.label}</div>
          <div className="plan-name" style={{color:p.nameColor}}>{p.name}</div>
          <div style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0 6px'}}>
            <span style={{fontSize:13,color:'var(--muted)'}}>السعر:</span>
            <span style={{background:'rgba(255,255,255,.08)',color:'var(--muted)',padding:'3px 12px',borderRadius:20,fontSize:12,fontWeight:700}}>يُعلن قريباً</span>
          </div>
          <div className="plan-feat">{p.feats.split('\n').map((f,j)=><div key={j}>{f}</div>)}</div>
        </div>
      ))}
      <div className="card" style={{textAlign:'center',padding:'14px'}}>
        <div style={{fontSize:13,fontWeight:700,color:'var(--text)',marginBottom:4}}>🎉 سجّل اهتمامك الآن</div>
        <div style={{fontSize:11,color:'var(--muted)',marginBottom:10}}>كن أول من يعرف عند إطلاق الأسعار</div>
        <button className="btn bg bsm" style={{width:'auto',margin:'0 auto'}} onClick={()=>window.open(`mailto:${SUPPORT_EMAIL}?subject=أريد الاشتراك — لعبة الألقاب&body=أرجو إشعاري عند إطلاق الباقات`)}>📧 أبلغني عند الإطلاق</button>
      </div>
    </div>
  );

  /* ══ MAIN ══ */
  /* ══ FULL LOG RENDERER ══ */
  const renderFullLog = (forEveryone=false) => {
    if(allRoundsList.length===0) return(
      <div style={{textAlign:'center',color:'var(--muted)',padding:24,fontSize:12}}>لا جولات منتهية بعد</div>
    );
    return(
      <div id="full-log">
        {/* ملخص سريع */}
        <div className="sg sg4" style={{marginBottom:14}}>
          <div className="sbox"><div className="snum">{allRoundsList.length}</div><div className="slbl">جولات</div></div>
          <div className="sbox"><div className="snum">{allAttacksFlat.length}</div><div className="slbl">هجمات</div></div>
          <div className="sbox"><div className="snum" style={{color:'var(--green)'}}>{allAttacksFlat.filter(a=>a.correct).length}</div><div className="slbl">إصابات</div></div>
          <div className="sbox"><div className="snum" style={{color:'var(--red)'}}>{allAttacksFlat.filter(a=>!a.correct).length}</div><div className="slbl">فشل</div></div>
        </div>

        {/* جولة جولة */}
        {allRoundsList.map((r,ri)=>{
          const ratks = Object.values(r.attacks||{}).sort((a,b)=>a.time-b.time);
          const hits  = ratks.filter(a=>a.correct);
          const misses= ratks.filter(a=>!a.correct);
          const inactivePlayers = playersList.filter(p=>p.status==='inactive'&&p.eliminatedRound===r.round);
          const cheaters = playersList.filter(p=>p.status==='cheater'&&p.eliminatedRound===r.round);

          return(
            <div key={ri} className="round-block">
              {/* رأس الجولة */}
              <div className="round-header">
                <div style={{fontFamily:'Cairo',fontSize:15,fontWeight:900,color:'var(--gold)'}}>
                  الجولة {r.round} {r.silent&&<span className="tag tb" style={{fontSize:10,marginRight:4}}>🤫 صمت</span>}
                </div>
                <div style={{display:'flex',gap:6}}>
                  <span className="tag tb">{ratks.length} هجمة</span>
                  <span className="tag tv">{hits.length} ✅</span>
                  <span className="tag tr">{misses.length} ❌</span>
                </div>
              </div>

              {/* ✅ الإصابات — مفصلة */}
              {hits.length>0&&<>
                <div style={{fontSize:11,color:'var(--green)',fontWeight:700,marginBottom:6}}>✅ الإصابات</div>
                {hits.map((a,i)=>{
                  const victim = playersList.find(p=>p.id===a.realOwnerId);
                  return(
                    <div key={i} className="attack-row attack-hit" style={{flexDirection:'column',alignItems:'flex-start',gap:4}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,width:'100%'}}>
                        <span style={{fontSize:14}}>💥</span>
                        <span style={{fontWeight:700,color:'var(--gold)'}}>"{a.attackerNick}"</span>
                        <span style={{color:'var(--muted)',fontSize:11}}>هاجم</span>
                        <span style={{fontWeight:700,color:'var(--text)'}}>"{a.targetNick}"</span>
                        <span className="tag tv" style={{marginRight:'auto',fontSize:9}}>✅ صح</span>
                      </div>
                      <div style={{fontSize:11,color:'var(--muted)',paddingRight:20}}>
                        خمّن: <strong style={{color:'var(--text)'}}>{a.guessedName}</strong>
                        {!forEveryone&&<> — الحقيقي: <strong style={{color:'var(--gold)'}}>{victim?.name} ({victim?.nick})</strong></>}
                      </div>
                    </div>
                  );
                })}
              </>}

              {/* ❌ الهجمات الخاطئة — مفصلة */}
              {misses.length>0&&<>
                <div style={{fontSize:11,color:'var(--red)',fontWeight:700,marginBottom:6,marginTop:10}}>❌ الهجمات الخاطئة</div>
                {misses.map((a,i)=>{
                  const realOwner = playersList.find(p=>p.id===a.realOwnerId);
                  return(
                    <div key={i} className="attack-row attack-miss" style={{flexDirection:'column',alignItems:'flex-start',gap:4}}>
                      <div style={{display:'flex',alignItems:'center',gap:6,width:'100%'}}>
                        <span style={{fontSize:14}}>🎯</span>
                        <span style={{fontWeight:700,color:'var(--gold)'}}>"{a.attackerNick}"</span>
                        <span style={{color:'var(--muted)',fontSize:11}}>هاجم</span>
                        <span style={{fontWeight:700,color:'var(--text)'}}>"{a.targetNick}"</span>
                        <span className="tag tr" style={{marginRight:'auto',fontSize:9}}>❌ خطأ</span>
                      </div>
                      <div style={{fontSize:11,color:'var(--muted)',paddingRight:20}}>
                        خمّن: <strong style={{color:'var(--red)'}}>{a.guessedName}</strong>
                        {!forEveryone&&realOwner&&<> — الحقيقي: <strong style={{color:'var(--gold)'}}>{realOwner.name} ({realOwner.nick})</strong></>}
                      </div>
                    </div>
                  );
                })}
              </>}

              {/* ⚠️ خمول وغش */}
              {(inactivePlayers.length>0||cheaters.length>0)&&<>
                <div style={{fontSize:11,color:'var(--muted)',fontWeight:700,marginBottom:5,marginTop:10}}>⚠️ أخرى</div>
                {inactivePlayers.map(p=>(
                  <div key={p.id} className="attack-row attack-inactive">
                    <span>😴</span>
                    <span style={{flex:1,fontWeight:700}}>{p.name}</span>
                    <span style={{color:'var(--muted)',fontSize:11}}>خرج لعدم الهجوم جولتين</span>
                  </div>
                ))}
                {cheaters.map(p=>(
                  <div key={p.id} className="attack-row" style={{background:'rgba(230,57,80,.07)',borderRight:'3px solid var(--red)'}}>
                    <span>🚫</span>
                    <span style={{flex:1,fontWeight:700}}>{p.name}</span>
                    <span style={{color:'var(--red)',fontSize:11}}>أُخرج بسبب الغش</span>
                  </div>
                ))}
              </>}

              {ratks.length===0&&inactivePlayers.length===0&&cheaters.length===0&&(
                <div style={{fontSize:11,color:'var(--muted)',textAlign:'center',padding:'8px 0'}}>لا أحداث في هذه الجولة</div>
              )}
            </div>
          );
        })}

        {/* زر الطباعة */}
        <button className="btn bo no-print" style={{marginTop:8}} onClick={()=>{
          const el=document.getElementById('full-log');
          if(!el) return;
          const w=window.open('','_blank');
          w.document.write(`<html dir="rtl"><head><title>تقرير لعبة الألقاب</title>
          <style>body{font-family:Arial,sans-serif;direction:rtl;padding:20px;color:#111}
          .round-block{border:1px solid #ddd;border-radius:8px;padding:12px;margin-bottom:14px;page-break-inside:avoid}
          .round-header{display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding-bottom:8px;margin-bottom:10px}
          .attack-row{display:flex;gap:8px;padding:6px 10px;border-radius:6px;margin-bottom:4px;font-size:13px;border-right:3px solid #ccc}
          .hit{background:#f0fff4;border-color:#2ecc71}.miss{background:#fff5f5;border-color:#e63950}
          .tag{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;margin:0 2px}
          .gold{color:#b8860b;font-weight:700}.green{color:#1a7a40;font-weight:700}.red{color:#a82020;font-weight:700}
          h2{color:#b8860b;margin:0 0 4px}</style></head><body>`);
          allRoundsList.forEach(r=>{
            const ratks=Object.values(r.attacks||{});
            const hits=ratks.filter(a=>a.correct);
            const misses=ratks.filter(a=>!a.correct);
            const missMap={};misses.forEach(a=>{missMap[a.targetNick]=(missMap[a.targetNick]||0)+1;});
            w.document.write(`<div class="round-block">
              <div class="round-header"><h2>الجولة ${r.round}${r.silent?' 🤫':''}</h2>
              <span>${ratks.length} هجمة | ${hits.length} ✅ | ${misses.length} ❌</span></div>`);
            if(hits.length>0){
              w.document.write('<div style="font-weight:700;color:#1a7a40;margin-bottom:6px">✅ الإصابات</div>');
              hits.forEach(a=>{
                const v=playersList.find(p=>p.id===a.realOwnerId);
                w.document.write(`<div class="attack-row hit">💥 <span class="gold">"${a.attackerNick}"</span> هاجم <span class="gold">"${a.targetNick}"</span> — خمّن: <strong>${a.guessedName}</strong> — الحقيقي: <strong class="green">${v?.name} (${v?.nick})</strong></div>`);
              });
            }
            if(misses.length>0){
              w.document.write('<div style="font-weight:700;color:#a82020;margin:8px 0 6px">❌ الهجمات الخاطئة</div>');
              misses.forEach(a=>{
                const ro=playersList.find(p=>p.id===a.realOwnerId);
                w.document.write(`<div class="attack-row miss">🎯 <span class="gold">"${a.attackerNick}"</span> هاجم <span class="gold">"${a.targetNick}"</span> — خمّن: <span class="red">${a.guessedName}</span> — الحقيقي: <strong>${ro?.name} (${ro?.nick})</strong></div>`);
              });
            }
            w.document.write('</div>');
          });
          w.document.write('</body></html>');
          w.document.close();
          w.print();
        }}>
          🖨️ طباعة / حفظ كـ PDF
        </button>
      </div>
    );
  };

  /* ══ PDF REPORT EXPORT ══ */
  const exportPDF = () => {
    const lines = [];
    const add = (t='') => lines.push(t);
    add('='.repeat(39));
    add('         تقرير لعبة الألقاب - مشرف فقط');
    add('='.repeat(39));
    add(`غرفة: #${roomCode}   جولات: ${allRoundsList.length}   لاعبون: ${playersList.length}`);
    add(`إجمالي الهجمات: ${allAttacksFlat.length}   إصابات: ${allAttacksFlat.filter(a=>a.correct).length}`);
    add('');
    add('── الفائزون ──────────────────────────');
    activePlayers.forEach(p=>add(`👑 ${p.name} — "${p.nick}"${p.nick2?` / "${p.nick2}"`:''}`));
    add('');
    add('── تفاصيل الجولات ────────────────────');
    allRoundsList.forEach(r=>{
      add(`
الجولة ${r.round}${r.silent?' [صمت]':''}`);
      add('-'.repeat(38));
      const ratks = Object.values(r.attacks||{});
      ratks.forEach(a=>{
        const status = a.correct?'✅ صحيح':'❌ خطأ';
        add(`  [${a.attackerNick}] ← "${a.targetNick}" | خمّن: ${a.guessedName||'—'} | حقيقي: ${a.realOwnerName||'—'} | ${status}`);
      });
      const elims = ratks.filter(a=>a.correct);
      if(elims.length>0){
        add('  ── خرج هذه الجولة:');
        elims.forEach(a=>{
          const v=playersList.find(p=>p.id===a.realOwnerId);
          add(`  💥 ${v?.name} (${v?.nick}) — كُشف من قِبَل: ${a.attackerNick}`);
        });
      }
    });
    add('');
    add('── حالة جميع اللاعبين ────────────────');
    playersList.forEach(p=>{
      const myAtks=allAttacksFlat.filter(a=>a.attackerNick===p.nick);
      const hits=myAtks.filter(a=>a.correct);
      const tgtd=allAttacksFlat.filter(a=>a.realOwnerId===p.id);
      const statusAr=p.status==='active'?'فائز':p.status==='cheater'?'غش':p.status==='inactive'?`خمول ج${p.eliminatedRound}`:`خرج ج${p.eliminatedRound}`;
      add(`  ${p.name} "${p.nick}" | الحالة: ${statusAr} | هجمات: ${myAtks.length} | إصابات: ${hits.length} | استُهدف: ${tgtd.length}${p.eliminatedBy?` | كُشف بواسطة: ${p.eliminatedBy}`:''}`);
    });
    add('');
    add('='.repeat(39));

    const content = lines.reduce((a,b)=>a+'\n'+b,'').slice(1);
    const blob = new Blob([content], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `تقرير-لعبة-الألقاب-${roomCode}.txt`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    notify('✅ تم تحميل التقرير','success');
  };

  /* ══ GUIDE RENDER ══ */
  const renderGuide=()=>(
    <div className="scr">
      {/* Hero */}
      <div className="guide-hero">
        <div style={{fontSize:52,marginBottom:8}}>🎭</div>
        <div style={{fontFamily:'Cairo',fontSize:22,fontWeight:900,background:'linear-gradient(135deg,var(--gold),#ff8c00)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          دليل لعبة الألقاب
        </div>
        <div style={{fontSize:12,color:'var(--muted)',marginTop:5,lineHeight:1.7}}>
          لعبة اجتماعية تعتمد على التخفي والتحليل<br/>
          اختر لقبك — هاجم — اكشف — وابقَ!
        </div>
      </div>

      {/* Role toggle */}
      <div className="role-toggle">
        <button className={`role-btn ${guideRole==='player'?'active':''}`} onClick={()=>setGuideRole('player')}>
          🎮 أنا متسابق
        </button>
        <button className={`role-btn ${guideRole==='admin'?'active':''}`} onClick={()=>setGuideRole('admin')}>
          👑 أنا المشرف
        </button>
      </div>

      {/* ══ دليل المتسابق ══ */}
      {guideRole==='player'&&<>
        <div style={{fontSize:13,color:'var(--gold)',fontWeight:700,marginBottom:10}}>خطواتك كمتسابق</div>

        <div className="step-card">
          <div className="step-num">1</div>
          <div className="step-body">
            <div className="step-title">ادخل رمز الغرفة وسجّل بياناتك</div>
            <div className="step-desc">المشرف يرسل لك رمزاً من 4 أرقام. أدخله ثم اكتب اسمك الكامل ولقبك السري.</div>
            <div className="step-tip">💡 اختر لقباً لا يمت بصلة لاهتماماتك — "القناص" لمن لا يصطاد مثلاً!</div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-num">2</div>
          <div className="step-body">
            <div className="step-title">انتظر في غرفة الانتظار</div>
            <div className="step-desc">بعد انضمامك ستنتظر حتى يبدأ المشرف اللعبة. لقبك مخفي عن الجميع تماماً.</div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-num">3</div>
          <div className="step-body">
            <div className="step-title">شاشة الهجوم — هاجم في الوقت المحدد</div>
            <div className="step-desc">ستظهر لك لوحتان في نفس الصفحة:</div>
            <div className="example-box">
              <strong style={{color:'var(--text)'}}>🎭 لوحة الألقاب</strong><br/>
              جميع الألقاب في مربعات ملونة<br/>
              الخارجون مظللون بعلامة ✕<br/><br/>
              <strong style={{color:'var(--text)'}}>👥 قائمة الأسماء</strong><br/>
              أسماء المتسابقين النشطين<br/>
              الخارجون مظللون مع لقبهم
            </div>
            <div className="step-tip">① اضغط لقباً تعتقد أنك تعرف صاحبه<br/>② اختر الاسم الذي تخمّنه<br/>③ اضغط "تأكيد الهجوم"</div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-num">4</div>
          <div className="step-body">
            <div className="step-title">انتظر الكشف مع الجميع</div>
            <div className="step-desc">بعد إرسال هجومك ستظهر شاشة انتظار. المشرف يقرر متى تُكشف النتائج — للجميع في نفس اللحظة.</div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-num">5</div>
          <div className="step-body">
            <div className="step-title">شاشة النتائج — بطاقات الكشف</div>
            <div className="step-desc">كل لقب مكشوف يظهر كبطاقة مقلوبة — اضغطها لتكشف الاسم الحقيقي مع صوت درامي!</div>
          </div>
        </div>

        <div className="div">القوانين المهمة</div>

        {[
          ['❌','جولتان بدون هجوم = خروج تلقائي بدون كشف لقبك'],
          ['🚫','التعاون مع لاعب آخر ممنوع — المشرف يراقب'],
          ['👁️','ألقابك لا تُكشف كاملةً إلا بعد انتهاء المسابقة'],
          ['🔄','لو خرجت من الجوال عن طريق الخطأ — أدخل نفس رمز الغرفة والاسم واللقب للرجوع'],
          ['☠️','انتبه من اللقب المسموم — المشرف قد يختار لقباً خاصاً، إذا هاجمته وأخطأت تخسر جولة'],
        ].map(([icon,text],i)=>(
          <div key={i} className="rule-row">
            <div className="rule-icon">{icon}</div>
            <div>{text}</div>
          </div>
        ))}

        <div style={{background:'rgba(46,204,113,.07)',border:'1px solid rgba(46,204,113,.2)',borderRadius:10,padding:'12px 14px',marginTop:12,fontSize:12,color:'var(--muted)',lineHeight:1.8}}>
          <strong style={{color:'var(--green)'}}>🏆 كيف تفوز؟</strong><br/>
          ابقَ آخر لاعب دون أن يُكشف لقبك. كلما أخرجت منافسين أكثر زادت فرصتك!
        </div>
      </>}

      {/* ══ دليل المشرف ══ */}
      {guideRole==='admin'&&<>
        <div style={{fontSize:13,color:'var(--gold)',fontWeight:700,marginBottom:10}}>مهامك كمشرف اللعبة</div>

        <div className="step-card">
          <div className="step-num">1</div>
          <div className="step-body">
            <div className="step-title">أنشئ الغرفة وأرسل الرمز</div>
            <div className="step-desc">اضغط "إنشاء غرفة كمسؤول" — ستحصل على رمز 4 أرقام. أرسله للمتسابقين ليدخلوا.</div>
            <div className="step-tip">يمكنك أيضاً إضافة اللاعبين يدوياً من لوحة الإعداد بدلاً من أن يدخلوا بأنفسهم</div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-num">2</div>
          <div className="step-body">
            <div className="step-title">حدّد الإعدادات قبل البدء</div>
            <div className="step-desc">عدد الألقاب (1 أو 2 لكل لاعب) ومدة كل جولة — من 5 دقائق إلى أيام.</div>
            <div className="example-box">
              <strong style={{color:'var(--text)'}}>مثال للوقت:</strong><br/>
              رحلة عائلية: 2-6 ساعات للجولة<br/>
              جلسة سريعة: 30-60 دقيقة<br/>
              مسابقة أيام: 24 ساعة للجولة
            </div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-num">3</div>
          <div className="step-body">
            <div className="step-title">ابدأ اللعبة — الكل ينتقل تلقائياً</div>
            <div className="step-desc">بعد اكتمال 6 لاعبين على الأقل، اضغط "بدء اللعبة". جميع الأجهزة تنتقل لشاشة الهجوم فوراً.</div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-num">4</div>
          <div className="step-body">
            <div className="step-title">راقب من لوحة التحكم 👑</div>
            <div className="step-desc">اضغط زر "👑 تحكم" لترى:</div>
            <div className="example-box">
              ✦ من أرسل هجومه ومن لم يرسل بعد<br/>
              ✦ سجل الهجمات السري (أنت فقط)<br/>
              ✦ تمديد الوقت +30د أو +ساعة<br/>
              ✦ الهجوم بالنيابة عن لاعب (جواله أُغلق)<br/>
              ✦ إخراج لاعب بسبب الغش
            </div>
          </div>
        </div>

        <div className="step-card">
          <div className="step-num">5</div>
          <div className="step-body">
            <div className="step-title">كشف النتائج — أنت من يقرر</div>
            <div className="step-desc">لما ترى الحماس مشتداً أو اكتمل الجميع، اضغط "كشف نتائج الجولة". النتائج تظهر للجميع في لحظة واحدة.</div>
            <div className="step-tip">⚠️ فرّق بين "كشف نتائج الجولة" و"إنهاء المسابقة كاملاً" — الثاني لا يمكن التراجع عنه!</div>
          </div>
        </div>

        <div className="div">أدوات الإثارة الخاصة</div>

        {[
          ['☠️','اللقب المسموم — من يهاجمه ويخطئ يُمنع من الهجوم الجولة القادمة'],
          ['🤫','جولة الصمت — النتائج تُخفى وتُكشف مع الجولة التالية دفعة واحدة'],
          ['⚔️','جولة مزدوجة — هجومان لكل لاعب في نفس الجولة'],
          ['⚡','جولة الاندفاع — ثلاثة هجمات لكل لاعب'],
          ['🎮','هجوم بالنيابة — المشرف يلعب عن متسابق بنفس شاشته تماماً'],
          ['🚫','إخراج للغش — إذا رأيت تعاوناً مشبوهاً'],
        ].map(([icon,text],i)=>(
          <div key={i} className="rule-row">
            <div className="rule-icon">{icon}</div>
            <div>{text}</div>
          </div>
        ))}
      </>}

      <div style={{height:20}}/>
    </div>
  );

  const navItems=[{id:'news',icon:'🔔',label:'أخبار',dot:hasNews},{id:'game',icon:'🎭',label:'اللعبة'},{id:'suggest',icon:'💡',label:'اقتراح'},{id:'pricing',icon:'💎',label:'الباقات'}];

  /* ── Loading splash ── */
  if(isLoading) return(
    <div style={{minHeight:'100vh',background:'#07071a',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
      <Stars/>
      <div style={{fontSize:64,animation:'bnc 1s infinite'}}>🎭</div>
      <div style={{fontFamily:'Cairo',fontSize:22,fontWeight:900,background:'linear-gradient(135deg,#f0c040,#ff8c00)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
        لعبة الألقاب
      </div>
      <div style={{display:'flex',gap:6,marginTop:8}}>
        {[0,1,2].map(i=>(
          <div key={i} style={{width:8,height:8,borderRadius:'50%',background:'#f0c040',opacity:.3,animation:`pls 1.2s infinite`,animationDelay:`${i*0.2}s`}}/>
        ))}
      </div>
    </div>
  );

  return(
    <div className="app">
      <Stars/>
      {notifs.map(n=><Notif key={n.id} msg={n}/>)}

      {modal?.type==='confirm_reveal'&&<div className="mbg"><div className="modal">
        <div className="micn">⚠️</div><div className="mtitle" style={{color:'var(--gold)'}}>كشف مبكر؟</div>
        <div className="msub">{modal.notSent.length} لاعب لم يرسل:<br/><span style={{color:'var(--red)'}}>{modal.notSent.map(p=>p.name).join('، ')}</span></div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn br" style={{flex:1}} onClick={()=>{setModal(null);processReveal(attacksList);}}>كشف الآن</button>
          <button className="btn bgh" style={{flex:1}} onClick={()=>setModal(null)}>انتظر</button>
        </div>
      </div></div>}
      {/* ══ CINEMATIC EXIT OVERLAY ══ */}
      {exitAnnounce&&(
        <div className="exit-screen" onClick={()=>setExitAnnounce(null)}>
          <div className="exit-icon">💥</div>
          <div className="exit-title">كُشفت الهوية!</div>
          <div className="exit-nick">"{exitAnnounce.nick}"</div>
          <div className="exit-name">{exitAnnounce.inactive?'خرج بسبب الخمول':`الشخص خلف اللقب: ${exitAnnounce.name}`}</div>
          {!exitAnnounce.inactive&&<div className="exit-killer">
            ⚔️ كُشف من قِبَل: <span style={{color:'var(--gold)',fontWeight:700}}>{exitAnnounce.eliminatedBy}</span>
          </div>}
          <div style={{marginTop:20,fontSize:11,color:'rgba(255,255,255,.3)'}}>اضغط للإغلاق</div>
        </div>
      )}

      {/* ══ LEADERBOARD MODAL ══ */}


      {/* ══ TUTORIAL MODAL ══ */}
      {modal?.type==='guide'&&(
        <div className="mbg" style={{alignItems:'flex-start',paddingTop:16,overflowY:'auto'}}>
          <div style={{background:'var(--card)',border:'1.5px solid var(--border)',borderRadius:16,padding:20,maxWidth:430,width:'100%',maxHeight:'90vh',overflowY:'auto'}}>

            {/* Header + close */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
              <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--gold)'}}>📖 دليل لعبة الألقاب</div>
              <button className="btn bgh bxs" onClick={()=>setModal(null)}>✕</button>
            </div>

            {/* Role toggle */}
            <div className="role-toggle" style={{marginBottom:16}}>
              <button className={`role-btn ${guideRole==='player'?'active':''}`} onClick={()=>setGuideRole('player')}>
                🎮 أنا متسابق
              </button>
              <button className={`role-btn ${guideRole==='admin'?'active':''}`} onClick={()=>setGuideRole('admin')}>
                👑 أنا المشرف
              </button>
            </div>

            {/* ══ متسابق ══ */}
            {guideRole==='player'&&<>
              {[
                {n:1, title:'ادخل رمز الغرفة وسجّل بياناتك', desc:'المشرف يرسل رمزاً من 4 أرقام. أدخله واكتب اسمك ولقبك السري.', tip:'اختر لقباً لا يمت بصلة لاهتماماتك — يجعل كشفك أصعب!'},
                {n:2, title:'انتظر في غرفة الانتظار', desc:'لقبك مخفي تماماً. انتظر حتى يبدأ المشرف اللعبة — ستنتقل تلقائياً.'},
                {n:3, title:'شاشة الهجوم', desc:'لوحة الألقاب فوق + قائمة الأسماء تحت. اختر لقباً تعرف صاحبه ثم اختر الاسم واضغط تأكيد.', tip:'الكل يهاجم في نفس الوقت سراً — لا أحد يرى هجومك!'},
                {n:4, title:'كشف النتائج', desc:'المشرف يقرر متى تُكشف. النتائج تظهر للجميع في نفس اللحظة — اضغط البطاقات لتكشف الهوية!'},
              ].map(s=>(
                <div key={s.n} className="step-card" style={{marginBottom:9}}>
                  <div className="step-num">{s.n}</div>
                  <div className="step-body">
                    <div className="step-title">{s.title}</div>
                    <div className="step-desc">{s.desc}</div>
                    {s.tip&&<div className="step-tip">💡 {s.tip}</div>}
                  </div>
                </div>
              ))}

              <div style={{marginTop:4,marginBottom:12,fontSize:12,color:'var(--gold)',fontWeight:700}}>⚠️ قوانين مهمة</div>
              {[
                ['❌','جولتان بدون هجوم = خروج صامت بدون كشف لقبك'],
                ['🚫','التعاون ممنوع — المشرف يراقب'],
                ['🔄','لو خرجت عن طريق الخطأ — أدخل نفس البيانات للرجوع'],
                ['🏆','الهدف: ابقَ آخر لاعب دون أن يُكشف لقبك'],
              ].map(([ic,tx],i)=>(
                <div key={i} className="rule-row">{ic} <span>{tx}</span></div>
              ))}
            </>}

            {/* ══ مشرف ══ */}
            {guideRole==='admin'&&<>
              {[
                {n:1, title:'أنشئ الغرفة', desc:'اضغط "إنشاء غرفة كمسؤول". أرسل الرمز الظاهر للمتسابقين أو أضفهم يدوياً.'},
                {n:2, title:'حدّد الإعدادات', desc:'عدد الألقاب (1 أو 2) ومدة كل جولة. الحد الأدنى 5 دقائق — لا حد أقصى.', tip:'رحلة 3 أيام؟ اجعل كل جولة 2-6 ساعات'},
                {n:3, title:'ابدأ اللعبة', desc:'بعد 6 لاعبين على الأقل، اضغط "بدء اللعبة". الجميع ينتقلون تلقائياً.'},
                {n:4, title:'راقب من زر 👑 تحكم', desc:'ترى من أرسل هجومه، السجل السري، وتمديد الوقت والهجوم بالنيابة.'},
                {n:5, title:'كشف النتائج', desc:'اضغط "كشف نتائج الجولة" متى أردت. النتائج تظهر للجميع معاً.', tip:'⚠️ "إنهاء المسابقة كاملاً" يختلف عن "كشف نتائج الجولة" — الأول لا رجعة فيه!'},
              ].map(s=>(
                <div key={s.n} className="step-card" style={{marginBottom:9}}>
                  <div className="step-num">{s.n}</div>
                  <div className="step-body">
                    <div className="step-title">{s.title}</div>
                    <div className="step-desc">{s.desc}</div>
                    {s.tip&&<div className="step-tip">💡 {s.tip}</div>}
                  </div>
                </div>
              ))}

              <div style={{marginTop:4,marginBottom:12,fontSize:12,color:'var(--gold)',fontWeight:700}}>🎲 أدوات الإثارة</div>
              {[
                ['☠️','اللقب المسموم — من يهاجمه ويخطئ يخسر جولة'],
                ['🤫','جولة الصمت — النتائج مخفية حتى تقرر أنت'],
                ['🎮','هجوم بالنيابة — إذا لاعب جواله أُغلق'],
                ['🚫','إخراج للغش — إذا رأيت تعاوناً مشبوهاً'],
              ].map(([ic,tx],i)=>(
                <div key={i} className="rule-row">{ic} <span>{tx}</span></div>
              ))}
            </>}

            <button className="btn bg" style={{marginTop:16}} onClick={()=>setModal(null)}>✅ فهمت!</button>
          </div>
        </div>
      )}

      {/* ══ EXIT MODAL ══ */}
      {modal?.type==='q_exit'&&(
        <div className="mbg"><div className="modal">
          <div className="micn">🦅</div>
          <div className="mtitle">الخروج من اللعبة؟</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button className="btn bg" onClick={()=>setModal(null)}>🎮 إكمال اللعبة</button>
            <button className="btn br" onClick={()=>{
              setModal(null);setGameScreen('home');setSelectedGame(null);
              setQRoom('');setQRole(null);setQGroupId(null);setQDistribution({});
              localStorage.removeItem('ng_qumairi');
              notify('تم الانسحاب','info');
            }}>🚪 انسحاب نهائي</button>
          </div>
        </div></div>
      )}

      {modal?.type==='exit_game'&&(
        <div className="mbg"><div className="modal">
          <div className="micn">🚪</div>
          <div className="mtitle">الرجوع للصفحة الرئيسية؟</div>
          <div className="msub">
            {role==='player'&&<>
              يمكنك العودة لاحقاً بنفس:<br/>
              <span style={{color:'var(--gold)',fontWeight:700}}>رمز الغرفة + اسمك + لقبك</span>
            </>}
            {role==='admin'&&<>
              المتسابقون سيبقون في انتظار عودتك.<br/>
              <span style={{color:'var(--gold)',fontWeight:700}}>يمكنك العودة تلقائياً بفتح الرابط</span>
            </>}
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button className="btn bg" onClick={()=>setModal(null)}>
              ← أكمل اللعبة
            </button>
            <button className="btn br" onClick={()=>{
              setModal(null);
              localStorage.removeItem('ng_session');
              localStorage.removeItem('ng_admin_session');
              setRole(null);
              setRoomCode('');
              setGameState(null);
              setPlayers({});
              setAttacks({});
              setAllRoundsData({});
              setMyId(null);
              setMyNickLocal('');
              setJoinName('');
              setJoinNick('');
              setJoinInput('');
              setGameScreen('home');
              setTab('game');
              notify('تم الخروج من اللعبة','info');
            }}>
              🚪 انسحاب من اللعبة
            </button>
          </div>
        </div></div>
      )}

      {modal?.type==='confirm_end'&&<div className="mbg"><div className="modal">
        <div className="micn">⚠️</div>
        <div className="mtitle" style={{color:'var(--red)'}}>إنهاء المسابقة كاملاً؟</div>
        <div className="msub">
          هذا سيُنهي المسابقة نهائياً<br/>
          وسيُعلن الفائزون الحاليون.<br/>
          <strong style={{color:'var(--red)'}}>لا يمكن التراجع!</strong>
        </div>
        <div style={{background:'rgba(230,57,80,.08)',border:'1px solid rgba(230,57,80,.2)',borderRadius:8,padding:'10px',marginBottom:14,fontSize:12,color:'var(--muted)',textAlign:'center'}}>
          إذا أردت فقط كشف نتائج الجولة الحالية<br/>
          اضغط <strong style={{color:'var(--green)'}}>رجوع</strong> واستخدم زر<br/>
          <strong style={{color:'var(--green)'}}>🔓 كشف نتائج الجولة</strong>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn br" style={{flex:1}} onClick={()=>{setModal(null);endGame();}}>
            نعم، أنهِ المسابقة
          </button>
          <button className="btn bv" style={{flex:1}} onClick={()=>setModal(null)}>
            ← رجوع
          </button>
        </div>
      </div></div>}

      <div className="hdr">
        {/* Right side — back/exit button when in a room */}
        {tab==='game'&&(roomCode||selectedGame)?(
          <button className="btn bgh bsm" style={{width:'auto',padding:'6px 12px',fontSize:12,color:'var(--muted)',border:'1px solid rgba(255,255,255,.1)'}}
            onClick={()=>{
              if(roomCode) setModal({type:'exit_game'});
              else if(gameScreen!=='home') setGameScreen('home');
              else setSelectedGame(null);
            }}>
            ← رجوع
          </button>
        ):(
          <div style={{width:60}}/>
        )}

        {/* Center logo */}
        <div className="logo" style={{position:'absolute',left:'50%',transform:'translateX(-50%)'}}>
          {tab==='news'?'🔔 أخبار':tab==='game'?(selectedGame==='nicknames'?'🎭 لعبة الألقاب':selectedGame==='qumairi'?'🦅 صيد القميري':'🏟️ ساحة الألعاب'):tab==='suggest'?'💡 اقتراح':'💎 الباقات'}
        </div>

        {/* Left side — admin control button */}
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          {tab==='game'&&roomCode&&role==='admin'&&phase!=='lobby'?(
            <button className="btn bg bsm" style={{width:'auto'}} onClick={()=>setGameScreen('admin_live')}>👑 تحكم</button>
          ):(
            <div style={{width:60}}/>
          )}
        </div>
      </div>

      <div className="main">
        {tab==='news'&&renderNews()}
        {tab==='game'&&(()=>{try{return renderGame();}catch(e){console.error('Render error:',e);return <div style={{padding:20,textAlign:'center',color:'var(--red)'}}><div style={{fontSize:40}}>⚠️</div><div style={{marginTop:8}}>خطأ في العرض — حدّث الصفحة</div><div style={{fontSize:11,color:'var(--muted)',marginTop:4}}>{e?.message}</div><button className="btn bg mt2" onClick={()=>window.location.reload()}>🔄 تحديث</button></div>;}})()}
        {tab==='suggest'&&renderSuggest()}
        {tab==='pricing'&&renderPricing()}
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
