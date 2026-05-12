import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { db, ref, set, get, update, onValue, off, push, roomRef, playersRef, attacksRef, gameRef } from '../../core/firebaseHelpers';
import { genCode, fmtMs, shuffle, mkInitials } from '../../core/helpers';
import { AV_COLORS } from '../../core/constants';
import Av from '../../shared/Av';
import TitlesSetup from './TitlesSetup';
import TitlesLobby from './TitlesLobby';
import TitlesPlay from './TitlesPlay';
import TitlesResults from './TitlesResults';
import TitlesAdminLive from './TitlesAdminLive';

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

const TitlesGameInner = forwardRef(function TitlesGameInner(
  { notify, setTab, setSelectedGame, onHeaderMeta },
  fwdRef
) {
  const [gameScreen, setGameScreen] = useState('home');
  const [showTutorial, setShowTutorial] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(null);

  const [role, setRole] = useState(null);
  const [myId, setMyId] = useState(null);
  const [myNickLocal, setMyNickLocal] = useState('');

  const [roomCode, setRoomCode] = useState('');
  const [joinInput, setJoinInput] = useState('');
  const [joinErr, setJoinErr] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinNick, setJoinNick] = useState('');
  const [joinNick2, setJoinNick2] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [roomNickMode, setRoomNickMode] = useState(1);

  const [gameState, setGameState] = useState(null);
  const [players, setPlayers] = useState({});
  const [attacks, setAttacks] = useState({});
  const [allRoundsData, setAllRoundsData] = useState({});

  const [nickMode, setNickMode] = useState(1);
  const [form, setForm] = useState({ name: '', nick: '', nick2: '' });
  const [attackDur, setAttackDur] = useState({ h: 0, m: 5, s: 0 });

  const [myNick, setMyNick] = useState(null);
  const [myGuess, setMyGuess] = useState(null);
  const [mySubmitted, setMySubmitted] = useState(false);
  const [proxyFor, setProxyFor] = useState(null);
  const [isProxyMode, setIsProxyMode] = useState(false);

  const [modal, setModal] = useState(null);
  const [statsTab, setStatsTab] = useState('round');
  const [heatmapView, setHeatmapView] = useState('nicks');

  const [guideRole, setGuideRole] = useState('player');
  const [countdown, setCountdown] = useState(null);

  const [poisonNick, setPoisonNick] = useState('');
  const [silentRound, setSilentRound] = useState(false);
  const [specialRound, setSpecialRound] = useState(1);
  const [pendingSilent, setPendingSilent] = useState(null);
  const [exitAnnounce, setExitAnnounce] = useState(null);
  const [flipCards, setFlipCards] = useState({});

  const effectiveRole = role;
  const effectiveNickMode = role === 'admin' ? nickMode : gameState?.nickMode || 1;
  const activePoisonNick = gameState?.poisonNick || poisonNick;
  const activeSpecialRound = gameState?.specialRound || specialRound;
  const isSilentActive = gameState?.silentActive || silentRound;

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
    setGameScreen('lobby');
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
        if(gamePhase==='lobby') setGameScreen('lobby');
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
      setGameScreen('lobby');
      notify('✅ انضممت للعبة! انتظر المشرف', 'success');
    } catch(e) {
      setJoinErr('خطأ في الاتصال — تحقق من الإنترنت');
    } finally {
      setJoinLoading(false);
    }
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


  const nickHeatmap = () => {
    const c = {};
    allAttacksFlat.forEach((a) => {
      if (a.targetNick) c[a.targetNick] = (c[a.targetNick] || 0) + 1;
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  };
  const nameHeatmap = () => {
    const c = {};
    allAttacksFlat.forEach((a) => {
      if (a.guessedName) c[a.guessedName] = (c[a.guessedName] || 0) + 1;
    });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  };
  const nickHeatmapActive = () => {
    const c = {};
    allAttacksFlat.forEach((a) => {
      if (a.targetNick) c[a.targetNick] = (c[a.targetNick] || 0) + 1;
    });
    return Object.entries(c)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  };
  const nameHeatmapActive = () => {
    const c = {};
    allAttacksFlat.forEach((a) => {
      if (a.guessedName) c[a.guessedName] = (c[a.guessedName] || 0) + 1;
    });
    return Object.entries(c)
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
  };


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

  /* ══ AUTO-REJOIN on mount ══ */
  useEffect(() => {
    try {
      const admin = localStorage.getItem('ng_admin_session');
      const player = localStorage.getItem('ng_session');
      if (admin) {
        const s = JSON.parse(admin);
        if (s.roomCode) {
          setRoomCode(s.roomCode);
          setRole('admin');
          setGameScreen('lobby');
        }
      } else if (player) {
        const s = JSON.parse(player);
        if (s.roomCode) {
          setRoomCode(s.roomCode);
          setRole('player');
          // Fix: keys are 'playerId' and 'nick', not 'myId' and 'myNick'
          setMyId(s.playerId || s.myId || null);
          setMyNickLocal(s.nick || s.myNick || '');
          // Don't force 'attack' — let the phase useEffect decide the screen
          // after Firebase data arrives. Set lobby as safe default.
          setGameScreen('lobby');
        }
      }
    } catch(e) {}
  }, []);
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
  useEffect(()=>{
    if(!gameState) return;
    if(phase==='lobby')       setGameScreen('lobby');
    if(phase==='attacking')   {
      window._resultsPlayed=false; // reset results sound
      if(role==='admin' && !proxyFor) setGameScreen('admin_live');
      else setGameScreen('attack');
      setMyNick(null); setMyGuess(null); setMySubmitted(false);
      if(!proxyFor) setProxyFor(null);
    }
    if(phase==='revealing')   setGameScreen('results');
    if(phase==='ended')       { setGameScreen('winner'); setTimeout(()=>playSound('applause'),500); setTimeout(()=>playSound('applause'),1400); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[phase, gameState]);

  useEffect(() => {
    if (!onHeaderMeta) return;
    onHeaderMeta({
      inRoom: !!roomCode,
      showAdminBtn: !!(roomCode && role === 'admin' && phase !== 'lobby'),
    });
  }, [roomCode, role, phase, onHeaderMeta]);

  useImperativeHandle(fwdRef, () => ({
    tryTitlesExit: () => {
      if (roomCode) setModal({ type: 'exit_game' });
    },
  }));

  const renderOverlays = () => (
    <>
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
    </>
  );


  const renderStatsScreen = () => {

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

      // تبويبات حسب الدور — «مسار اللعبة» يظهر فقط للمشرف
      const tabs = effectiveRole === 'admin'
        ? [['nicks','🎭 الألقاب'],['names','👥 الأسماء'],['fierce','⚔️ الأشرس'],['poison','☠️ المسموم'],['remaining','✅ المتبقون'],['log','📋 مسار اللعبة']]
        : [['nicks','🎭 الألقاب'],['names','👥 الأسماء'],['fierce','⚔️ الأشرس'],['poison','☠️ المسموم'],['me','👤 أنا']];

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
  };

  const startGameForLobby = startGame;

  const sharedProps = {
    notify,
    setGameScreen,
    roomCode,
    role,
    players,
    gameState,
    attacks,
    allRoundsData,
    myNickLocal,
    joinName,
    myId,
    countdown,
    flipCards,
    setFlipCards,
    statsTab,
    setStatsTab,
    heatmapView,
    setHeatmapView,
    effectiveNickMode,
    doReveal,
    nextRound,
    endGame,
    setModal,
    playSound,
    renderFullLog,
    downloadPDFReport,
  };

  const mainEl = (() => {
    if (showOnboarding) {
      return (
        <OnboardingScreen
          role={showOnboarding}
          onDismiss={() => {
            const r = showOnboarding;
            setShowOnboarding(null);
            if (r === 'admin') void createRoom();
            else setGameScreen('join');
          }}
        />
      );
    }

    if (gameScreen === 'home') {
      return (
        <div className="scr">
          <button
            type="button"
            className="btn bgh bsm"
            style={{ width: 'auto', marginBottom: 12 }}
            onClick={() => setSelectedGame(null)}
          >
            ← ساحة الألعاب
          </button>
          <div style={{ textAlign: 'center', padding: '10px 0 12px' }}>
            <div style={{ fontSize: 46, marginBottom: 6 }}>🎭</div>
            <div className="ptitle" style={{ fontSize: 22 }}>
              لعبة الألقاب
            </div>
            <div className="psub">أخفِ هويتك • الكل يهاجم معاً • اكشف الهويات</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button type="button" className="btn bg" onClick={() => setShowOnboarding('admin')}>
              👑 إنشاء غرفة كمسؤول
            </button>
            <button type="button" className="btn bo" onClick={() => setShowOnboarding('player')}>
              🎮 انضمام كلاعب برمز الغرفة
            </button>
          </div>
          <button type="button" className="btn bgh" style={{ marginTop: 4 }} onClick={() => setModal({ type: 'guide' })}>
            📖 كيف تلعب؟ — دليل للمشرف والمتسابق
          </button>
          <div className="div">قوانين اللعبة</div>
          {[
            '🎭 اختر لقباً لا يمت بصلة لاهتماماتك',
            '⚔️ الكل يهاجم في نفس الوقت — سرية تامة',
            '🔓 النتائج تنكشف للجميع في لحظة واحدة',
            '⏰ الوقت يحدده المشرف ويمكن تمديده',
            '❌ جولتان بلا هجوم = خروج صامت بلا كشف لقبك',
            '🚫 التعاون ممنوع — عقوبته الإخراج الفوري',
            '👁️ الألقاب لا تُكشف كاملةً إلا في نهاية المسابقة',
          ].map((r, i) => (
            <div
              key={i}
              style={{
                padding: '7px 11px',
                marginBottom: 4,
                background: '#0f0f22',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--muted)',
                border: '1px solid rgba(255,255,255,.04)',
              }}
            >
              {r}
            </div>
          ))}
        </div>
      );
    }

    if (gameScreen === 'create' || gameScreen === 'join') {
      return (
        <TitlesSetup
          gameScreen={gameScreen}
          setGameScreen={setGameScreen}
          joinInput={joinInput}
          setJoinInput={setJoinInput}
          joinErr={joinErr}
          setJoinErr={setJoinErr}
          joinName={joinName}
          setJoinName={setJoinName}
          joinNick={joinNick}
          setJoinNick={setJoinNick}
          joinNick2={joinNick2}
          setJoinNick2={setJoinNick2}
          joinLoading={joinLoading}
          form={form}
          setForm={setForm}
          nickMode={nickMode}
          createRoom={createRoom}
          joinRoom={joinRoom}
          notify={notify}
        />
      );
    }

    if (gameScreen === 'lobby') {
      return (
        <div className="scr">
          <button
            type="button"
            className="btn bgh bsm"
            style={{ width: 'auto', marginBottom: 12 }}
            onClick={() => setModal({ type: 'exit_game' })}
          >
            ← رجوع
          </button>
          <TitlesLobby
            roomCode={roomCode}
            role={role}
            players={players}
            gameState={gameState}
            nickMode={nickMode}
            setNickMode={setNickMode}
            attackDur={attackDur}
            setAttackDur={setAttackDur}
            specialRound={specialRound}
            setSpecialRound={setSpecialRound}
            poisonNick={poisonNick}
            setPoisonNick={setPoisonNick}
            silentRound={silentRound}
            setSilentRound={setSilentRound}
            startRound={startGameForLobby}
            notify={notify}
          />
          {role === 'admin' && phase === 'lobby' && (
            <div className="card">
              <div className="ctitle">➕ إضافة لاعب</div>
              <div className="ig">
                <label className="lbl">الاسم الكامل</label>
                <input
                  className="inp"
                  placeholder="محمد عبدالله"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="ig">
                <label className="lbl">اللقب {nickMode === 2 ? 'الأول' : ''}</label>
                <input
                  className="inp"
                  placeholder="القناص"
                  value={form.nick}
                  onChange={(e) => setForm((f) => ({ ...f, nick: e.target.value }))}
                />
              </div>
              {nickMode === 2 && (
                <div className="ig">
                  <label className="lbl">اللقب الثاني</label>
                  <input
                    className="inp"
                    placeholder="الصقر"
                    value={form.nick2}
                    onChange={(e) => setForm((f) => ({ ...f, nick2: e.target.value }))}
                  />
                </div>
              )}
              <button type="button" className="btn bg" onClick={() => void addPlayer()}>
                ➕ إضافة
              </button>
            </div>
          )}
          {role === 'admin' && phase !== 'lobby' && (
            <button type="button" className="btn bb" onClick={() => setGameScreen('attack')} style={{ marginBottom: 8 }}>
              🎮 العودة للعبة
            </button>
          )}
        </div>
      );
    }

    if (gameScreen === 'attack') {
      return (
        <TitlesPlay
          role={role}
          players={players}
          gameState={gameState}
          attacks={attacks}
          myNickLocal={myNickLocal}
          myNick={myNick}
          setMyNick={setMyNick}
          myGuess={myGuess}
          setMyGuess={setMyGuess}
          mySubmitted={mySubmitted}
          setMySubmitted={setMySubmitted}
          proxyFor={proxyFor}
          setProxyFor={setProxyFor}
          isProxyMode={isProxyMode}
          setIsProxyMode={setIsProxyMode}
          countdown={countdown}
          flipCards={flipCards}
          setFlipCards={setFlipCards}
          exitAnnounce={exitAnnounce}
          effectiveNickMode={effectiveNickMode}
          submitAttack={submitAttack}
          notify={notify}
          roomCode={roomCode}
          joinName={joinName}
          myId={myId}
          setGameScreen={setGameScreen}
          extendTime={extendTime}
          doReveal={doReveal}
          allRoundsData={allRoundsData}
        />
      );
    }

    if (gameScreen === 'admin_live') {
      return (
        <TitlesAdminLive
          players={players}
          gameState={gameState}
          attacks={attacks}
          allRoundsData={allRoundsData}
          roomCode={roomCode}
          proxyFor={proxyFor}
          setProxyFor={setProxyFor}
          isProxyMode={isProxyMode}
          setIsProxyMode={setIsProxyMode}
          countdown={countdown}
          effectiveNickMode={effectiveNickMode}
          doReveal={doReveal}
          endGame={endGame}
          setModal={setModal}
          setGameScreen={setGameScreen}
          notify={notify}
          setMyNick={setMyNick}
          setMyGuess={setMyGuess}
          setMySubmitted={setMySubmitted}
          attackDur={attackDur}
        />
      );
    }

    if (gameScreen === 'results' || gameScreen === 'winner') {
      return <TitlesResults {...sharedProps} />;
    }

    if (gameScreen === 'stats') {
      return renderStatsScreen();
    }


    return null;
  })();

  return (
    <>
      {renderOverlays()}
      {mainEl}
    </>
  );});

export default function TitlesGame({ notify, setTab, setSelectedGame, titlesRef, onTitlesHeaderMeta }) {
  return (
    <TitlesGameInner
      ref={titlesRef}
      notify={notify}
      setTab={setTab}
      setSelectedGame={setSelectedGame}
      onHeaderMeta={onTitlesHeaderMeta}
    />
  );
}
