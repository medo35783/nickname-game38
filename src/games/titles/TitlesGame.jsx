import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { db, ref, set, get, update, onValue, off, push, remove, roomRef, playersRef, attacksRef, gameRef } from '../../core/firebaseHelpers';
import { recordRoundCompleted, recordSessionEnd, buildGameSessionTracking } from '../../core/sessionStats';
import { fetchArenaFieldsForJoin } from '../../core/arenaProfile';
import { genCode, fmtMs, shuffle, mkInitials } from '../../core/helpers';
import { AV_COLORS } from '../../core/constants';
import Av from '../../shared/Av';
import TitlesSetup from './TitlesSetup';
import TitlesLobby from './TitlesLobby';
import TitlesPlay from './TitlesPlay';
import TitlesResults from './TitlesResults';
import {
  buildRevealQueue,
  attacksForPlayer,
  attackableNicksForPlayer,
  isDualTitleFullyRevealed,
  isDecoyRequired,
  nickRevealedThisRound,
  playerSubmittedAttack,
  playersAfterReveal,
  remainingTitlesCount,
  shouldEndGameByRemainingTitles,
} from './titlesRevealHelpers';
import {
  buildSilentSnapshot,
  mergeSilentPending,
  applySilentPendingToReveal,
  sanitizeForFirebase,
} from './silentRoundHelpers';
import { normalizeNickMode } from './titlesNickMode';
import { openTitlesPrintableReport } from './titlesPrintReport';
import TitlesHostCockpit from './host/TitlesHostCockpit';
import TitlesHostPrep from './host/TitlesHostPrep';
import TitlesGameSummary from './TitlesGameSummary';
import { buildRoundAlert } from './roundAlertHelpers';
import QuickOnboarding from '../../components/onboarding/QuickOnboarding';
import TitlesGuideModal from './TitlesGuideModal';
import StatsRemainingPanel from './stats/StatsRemainingPanel';
import GameExitSheet from '../../shared/GameExitSheet';
import GameCancelledScreen from '../../shared/GameCancelledScreen';
import { hasTitlesCompetitionStarted, isGameCancelled } from '../../shared/gameCompetition';
import GameTopNav, { GameSessionChecking } from '../../shared/GameTopNav';
import { formatOtherSessionsHint, getOtherActiveSessions, getSavedRoomForGame } from '../../shared/gameSessionRegistry';

const TitlesGameInner = forwardRef(function TitlesGameInner(
  { notify, setTab, setSelectedGame, onHeaderMeta, canCreateRoom, onRequestActivation, onGameEnd },
  fwdRef
) {
  const [gameScreen, setGameScreen] = useState('home');
  /** يمنع عرض أزرار «الرئيسية» قبل انتهاء التحقق من جلسة localStorage + Firebase */
  const [sessionGate, setSessionGate] = useState('checking');
  const [exitSheetOpen, setExitSheetOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(null);
  const pendingOnboardingRef = useRef(null);

  useEffect(() => {
    if (!canCreateRoom || pendingOnboardingRef.current !== 'admin') return;
    pendingOnboardingRef.current = null;
    setShowOnboarding('admin');
  }, [canCreateRoom]);

  const handleAdminEntry = () => {
    if (!canCreateRoom) {
      pendingOnboardingRef.current = 'admin';
      onRequestActivation();
      return;
    }
    setShowOnboarding('admin');
  };

  const handlePlayerEntry = () => {
    setShowOnboarding('player');
  };

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
  const [joinPreviewNickMode, setJoinPreviewNickMode] = useState(1);
  const [joinPreviewLoading, setJoinPreviewLoading] = useState(false);

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
  const [statsTab, setStatsTab] = useState('overview');
  const [heatmapView, setHeatmapView] = useState('nicks');

  const [countdown, setCountdown] = useState(null);
  const [firebaseConnected, setFirebaseConnected] = useState(true);

  const [poisonNick, setPoisonNick] = useState('');
  const [silentRound, setSilentRound] = useState(false);
  const [specialRound, setSpecialRound] = useState(1);
  const [pendingSilent, setPendingSilent] = useState(null);
  const [exitAnnounce, setExitAnnounce] = useState(null);
  const [flipCards, setFlipCards] = useState({});
  const titlesPhaseRef = useRef(null);
  const titlesEndGamePromptSentRef = useRef(false);
  const nickModeWriteAtRef = useRef(0);
  const joinNickModeCacheRef = useRef({});

  useEffect(() => {
    titlesPhaseRef.current = null;
    titlesEndGamePromptSentRef.current = false;
  }, [roomCode]);

  /* ── أثناء "إعارة جوال المشرف للمتسابق" تُعامَل الواجهة كأنها للمتسابق نفسه ── */
  const proxiedPlayer = (() => {
    if (role !== 'admin' || !proxyFor) return null;
    return Object.entries(players || {})
      .map(([id, p]) => ({ ...p, id }))
      .find((p) => p.id === proxyFor) || null;
  })();
  const isKioskMode = role === 'admin' && !!proxiedPlayer;
  const effectiveRole = isKioskMode ? 'player' : role;
  const effectiveMyNick = isKioskMode ? proxiedPlayer?.nick || '' : myNickLocal;
  const effectiveMyId = isKioskMode ? proxiedPlayer?.id || null : myId;
  const effectiveNickMode =
    role === 'admin' ? nickMode : normalizeNickMode(gameState?.nickMode);

  const updateRoomNickMode = useCallback(
    async (nextMode) => {
      const mode = normalizeNickMode(nextMode);
      setNickMode(mode);
      nickModeWriteAtRef.current = Date.now();
      if (mode === 1) {
        setForm((f) => ({ ...f, nick2: '' }));
      }
      if (!roomCode) return;
      joinNickModeCacheRef.current[roomCode] = mode;
      try {
        await update(gameRef(roomCode), { nickMode: mode });
      } catch {
        notify('تعذّر حفظ وضع الألقاب — أعد المحاولة', 'error');
      }
    },
    [roomCode, notify]
  );
  const activePoisonNick = gameState?.poisonNick || poisonNick;
  const activeSpecialRound = gameState?.specialRound || specialRound;
  const phase = gameState?.phase || 'lobby';
  /** صمت الجولة الحالية فقط — silentRound = تجهيز للجولة القادمة */
  const isSilentActive =
    phase === 'attacking' ? Boolean(gameState?.silentActive) : Boolean(silentRound);

  const playersList  = Object.entries(players).map(([id,p])=>({...p, id}));
  const activePlayers= playersList.filter(p=>p.status==='active');
  const elimPlayers  = playersList.filter(p=>p.status!=='active');
  const attacksList  = Object.values(attacks||{});
  const submittedCount = attacksList.length;
  const roundNum     = gameState?.roundNum || 0;
  const roundOrder      = gameState?.roundOrder || {nicks:[], names:[]};
  const attacksPerRound = gameState?.attacksPerRound || 1; // هجمات مسموحة لكل لاعب
  const deadline     = gameState?.deadline || null;
  // allSubmitted: كل لاعب نشط أكمل عدد هجماته المطلوب
  const playerAttackCounts = {};
  attacksList.forEach(a=>{if(a.attackerNick)playerAttackCounts[a.attackerNick]=(playerAttackCounts[a.attackerNick]||0)+1;});
  const allSubmitted = activePlayers.length > 0 && activePlayers.every((p) => {
    const done = attacksForPlayer(attacks, {
      playerId: p.id,
      nicks: [p.nick, p.nick2].filter(Boolean),
    }).length;
    return done >= attacksPerRound;
  });
  // هل المتسابق الحالي أتم هجماته؟ — نحسب من Firebase لا من state محلي
  const myPlayerForDone = myId ? playersList.find((p) => p.id === myId) : null;
  const myAttackNicks = myPlayerForDone
    ? [myPlayerForDone.nick, myPlayerForDone.nick2].filter(Boolean)
    : [myNickLocal].filter(Boolean);
  const myDoneCount = attacksList.filter(
    (a) =>
      myAttackNicks.includes(a.attackerNick) ||
      (myId && a.attackerPlayerId === myId)
  ).length;
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

  const audioCtxRef = useRef(null);
  const playSound = useCallback((type) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') void ctx.resume();
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
  }, []);

  const totalMs=()=>Math.max((Number(attackDur.h)*3600+Number(attackDur.m)*60+Number(attackDur.s))*1000,5*60*1000);
  const cdInfo=()=>{if(countdown===null)return{label:'—',urgent:false};if(countdown<=0)return{label:'انتهى الوقت!',urgent:true};return{label:fmtMs(countdown),urgent:countdown<5*60*1000};};
  
  // دالة تطبيع اللقب (منع التشابه: هاء/تاء مربوطة، همزة/ألف، ياء/ألف مقصورة)
  const normalizeName = (str) => {
    return str.trim().toLowerCase()
      .replace(/ة$/g, 'ه')      // تاء مربوطة → هاء
      .replace(/أ|إ|آ/g, 'ا')   // همزة → ألف عادي
      .replace(/ى/g, 'ي');      // ألف مقصورة → ياء
  };

  const trackTitlesRoundDone = () => {
    if (roomCode) recordRoundCompleted('titles', roomCode).catch(() => {});
  };

  const resetTitlesRoomState = () => {
    setModal(null);
    setShowOnboarding(null);
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
    setJoinNick2('');
    setJoinInput('');
    setJoinErr('');
    setJoinLoading(false);
    setGameScreen('home');
  };

  const openExitSheet = () => setExitSheetOpen(true);

  /** انسحاب مؤقت — يحفظ الغرفة للعودة التلقائية */
  const withdrawToTitlesHome = () => {
    setExitSheetOpen(false);
    if (role === 'admin' && roomCode) {
      recordSessionEnd('titles', roomCode, false).catch(() => {});
      localStorage.setItem('ng_admin_session', JSON.stringify({ roomCode }));
      localStorage.removeItem('ng_session');
    } else if (role === 'player' && roomCode) {
      localStorage.setItem(
        'ng_session',
        JSON.stringify({
          roomCode,
          playerId: myId,
          myId,
          nick: myNickLocal,
          myNick: myNickLocal,
        })
      );
      localStorage.removeItem('ng_admin_session');
    } else {
      localStorage.removeItem('ng_session');
      localStorage.removeItem('ng_admin_session');
    }
    resetTitlesRoomState();
    notify('يمكنك العودة للغرفة من شاشة اللعبة', 'info');
  };

  const withdrawToArena = () => {
    setExitSheetOpen(false);
    if (role === 'admin' && roomCode) {
      recordSessionEnd('titles', roomCode, false).catch(() => {});
    }
    localStorage.removeItem('ng_session');
    localStorage.removeItem('ng_admin_session');
    resetTitlesRoomState();
    setSelectedGame(null);
    notify('عدت لساحة الألعاب', 'info');
  };

  const withdrawFromCompetition = async () => {
    setExitSheetOpen(false);
    const pid = myId;
    const code = roomCode;
    localStorage.removeItem('ng_session');
    localStorage.removeItem('ng_admin_session');
    resetTitlesRoomState();
    notify('انسحبت من المسابقة — يمكنك العودة برمز الغرفة ونفس اسمك', 'info');
    if (!pid || !code) return;
    try {
      await update(ref(db, `rooms/${code}/players/${pid}`), { status: 'withdrawn' });
    } catch {
      remove(ref(db, `rooms/${code}/players/${pid}`)).catch(() => {});
    }
  };

  const cancelCompetitionFromExit = async () => {
    setExitSheetOpen(false);
    const code = roomCode;
    resetTitlesRoomState();
    if (!code) return;
    try {
      recordSessionEnd('titles', code, true).catch(() => {});
      await update(gameRef(code), {
        phase: 'ended',
        cancelled: true,
        endedAt: Date.now(),
      });
      localStorage.removeItem('ng_session');
      localStorage.removeItem('ng_admin_session');
      notify('تم إلغاء المسابقة — المتسابقون سيُخرجون', 'info');
    } catch {
      notify('تعذّر إلغاء المسابقة — حاول مجدداً', 'error');
    }
  };

  /** مسح جلسة الألقاب بالكامل */
  const clearTitlesSessionAndGoHome = () => {
    localStorage.removeItem('ng_session');
    localStorage.removeItem('ng_admin_session');
    resetTitlesRoomState();
  };

  const reconnectToSavedRoom = async () => {
    setSessionGate('checking');
    try {
      if (typeof auth.authStateReady === 'function') await auth.authStateReady();
      const saved = getSavedRoomForGame('titles');
      if (!saved?.roomCode) {
        notify('لا توجد غرفة محفوظة', 'info');
        return;
      }
      const snap = await get(roomRef(saved.roomCode));
      if (!snap.exists()) {
        localStorage.removeItem('ng_session');
        localStorage.removeItem('ng_admin_session');
        notify('الغرفة لم تعد موجودة', 'error');
        return;
      }
      const roomData = snap.val();
      if (roomData?.game?.phase === 'ended') {
        localStorage.removeItem('ng_session');
        localStorage.removeItem('ng_admin_session');
        notify('انتهت هذه المسابقة', 'info');
        return;
      }
      const uid = auth.currentUser?.uid;
      if (saved.role === 'admin' || (uid && roomData?.adminId === uid)) {
        localStorage.setItem('ng_admin_session', JSON.stringify({ roomCode: saved.roomCode }));
        localStorage.removeItem('ng_session');
        setRoomCode(saved.roomCode);
        setRole('admin');
        setMyId(null);
        applyTitlesAdminScreens(roomData?.game?.phase || 'lobby');
        notify('✅ عدت للغرفة كمشرف', 'gold');
        return;
      }
      const pRaw = localStorage.getItem('ng_session');
      if (pRaw) {
        const ps = JSON.parse(pRaw);
        if (ps?.roomCode === saved.roomCode) {
          setRoomCode(saved.roomCode);
          setRole('player');
          setMyId(ps.playerId || ps.myId || null);
          setMyNickLocal(ps.nick || ps.myNick || '');
          setGameScreen('lobby');
          notify('✅ عدت للغرفة!', 'success');
        }
      }
    } catch {
      notify('تعذّر العودة للغرفة', 'error');
    } finally {
      setSessionGate('ready');
    }
  };

  /* ══ ADMIN: CREATE ROOM ══ */
  const createRoom = async () => {
    if (!canCreateRoom) {
      notify('لا يمكن إنشاء غرفة بدون اشتراك نشط. فعّل كودك أو جدّده من تبويب «الباقات».', 'error');
      onRequestActivation();
      return;
    }
    // Clear any old session so players aren't stuck in old room
    localStorage.removeItem('ng_session');
    localStorage.removeItem('ng_admin_session');
    try {
      if (typeof auth.authStateReady === 'function') await auth.authStateReady();
    } catch {
      /* تجاهل */
    }
    const hostUid = auth.currentUser?.uid;
    if (!hostUid) {
      notify('لم يكتمل اتصال الحساب بعد. انتظر ثانيتين ثم أنشِئ الغرفة من جديد، أو حدّث الصفحة.', 'error');
      setRoomCode('');
      return;
    }

    const isPermissionErr = (err) => {
      const s = `${err?.code || ''} ${err?.message || ''}`.toLowerCase();
      return s.includes('permission');
    };

    let firstCode = genCode();
    setRoomCode(firstCode);

    let savedCode = null;
    let lastErr = null;
    let lastWasCollision = false;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const tryCode = attempt === 0 ? firstCode : genCode();
      if (attempt > 0) setRoomCode(tryCode);

      try {
        const existing = await get(roomRef(tryCode));
        if (existing.exists()) {
          lastWasCollision = true;
          lastErr = new Error('room_taken');
          continue;
        }
        lastWasCollision = false;
        await update(ref(db), {
          [`rooms/${tryCode}/adminId`]: hostUid,
          [`rooms/${tryCode}/game`]: {
            phase: 'lobby',
            roundNum: 0,
            createdAt: Date.now(),
            nickMode: normalizeNickMode(nickMode),
            ...buildGameSessionTracking('titles'),
          },
          [`rooms/${tryCode}/players`]: {},
        });
        savedCode = tryCode;
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        lastWasCollision = false;
        break;
      }
    }

    if (!savedCode) {
      console.error(lastErr);
      setRoomCode('');
      setRole(null);
      setGameScreen('home');
      if (lastErr && isPermissionErr(lastErr)) {
        notify(
          'رفض الخادم حفظ الغرفة (صلاحيات). من Firebase Console → Realtime Database → Rules انسخ محتوى «firebase-database-rules.json» من المشروع واضغط Publish، ثم حدّث الصفحة وأعد المحاولة.',
          'error'
        );
      } else if (lastWasCollision) {
        notify('لم يتاح رمز غرفة فاضٍ بعد عدة محاولات. أعد المحاولة بعد قليل.', 'error');
      } else {
        notify('تعذّر حفظ الغرفة. تحقق من الإنترنت ثم أعد المحاولة.', 'error');
      }
      return;
    }

    localStorage.setItem('ng_admin_session', JSON.stringify({ roomCode: savedCode }));
    setRoomCode(savedCode);
    setRole('admin');
    setGameScreen('host');
    notify(`✅ الغرفة جاهزة: ${savedCode}`, 'gold');
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
  const applyTitlesAdminScreens = (gamePhase) => {
    if (gamePhase === 'lobby' || gamePhase === 'attacking') setGameScreen('host');
    else if (gamePhase === 'revealing') setGameScreen('results');
    else if (gamePhase === 'ended') setGameScreen('summary');
    else setGameScreen('host');
  };

  const joinRoom = async () => {
    if(joinLoading) return; // منع الضغط المزدوج
    setJoinErr('');
    if(joinInput.length!==4){setJoinErr('الرمز 4 أرقام');return;}

    setJoinLoading(true);
    try {
      if (typeof auth.authStateReady === 'function') {
        await auth.authStateReady();
      }
      const snap = await get(roomRef(joinInput));
      if(!snap.exists()){setJoinErr('الغرفة غير موجودة');return;}
      const data = snap.val();
      const gamePhase = data.game?.phase || 'lobby';
      const hostUid = auth.currentUser?.uid;

      if (gamePhase === 'ended') {
        setJoinErr('انتهت هذه اللعبة');
        localStorage.removeItem('ng_admin_session');
        localStorage.removeItem('ng_session');
        return;
      }

      /** صاحب الغرفة (مطابق مع قواعد RTDB لـ rooms.adminId) */
      if (hostUid && data.adminId === hostUid) {
        localStorage.removeItem('ng_session');
        localStorage.setItem('ng_admin_session', JSON.stringify({ roomCode: joinInput }));
        setRoomCode(joinInput);
        setRole('admin');
        setMyId(null);
        setMyNickLocal('');
        applyTitlesAdminScreens(gamePhase);
        notify('✅ تم الدخول كمشرف — صاحب الغرفة', 'gold');
        return;
      }

      /** غرف قديمة بلا adminId: اعتماد جلسة الجهاز فقط */
      const adminRaw = localStorage.getItem('ng_admin_session');
      if (adminRaw) {
        try {
          const adminSess = JSON.parse(adminRaw);
          if (adminSess?.roomCode === joinInput) {
            localStorage.removeItem('ng_session');
            setRoomCode(joinInput);
            setRole('admin');
            setMyId(null);
            setMyNickLocal('');
            applyTitlesAdminScreens(gamePhase);
            notify('✅ تم الدخول كمشرف — لوحة التحكم جاهزة', 'gold');
            return;
          }
        } catch {
          /* نكمل كمسار لاعب */
        }
      }

      if(!joinName.trim()||!joinNick.trim()){setJoinErr('أدخل اسمك ولقبك');return;}
      const existingPlayers = Object.entries(data.players||{});

      // Check if player already exists (rejoin)
      const existing = existingPlayers.find(([id,p])=>
        p.name?.trim()===joinName.trim() && p.nick?.trim()===joinNick.trim()
      );

      if(existing) {
        // REJOIN — player already registered
        const [existingId, existingData] = existing;
        try {
          const rejoinPatch = {};
          if (existingData.status === 'withdrawn') rejoinPatch.status = 'active';
          const arenaFields = await fetchArenaFieldsForJoin();
          Object.assign(rejoinPatch, arenaFields);
          if (Object.keys(rejoinPatch).length) {
            await update(ref(db, `rooms/${joinInput}/players/${existingId}`), rejoinPatch);
          }
        } catch {
          /* قد يمنعها قواعد Firebase — لا تعطل العودة */
        }
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
        else if(gamePhase==='ended') setGameScreen('summary');
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
      const roomNickMode = normalizeNickMode(data.game?.nickMode);
      if (roomNickMode === 2) {
        if (!joinNick2.trim()) {
          setJoinErr('أدخل لقبك الثاني');
          setJoinLoading(false);
          return;
        }
        if (normalizedExisting.includes(normalizeName(joinNick2))) {
          setJoinErr('اللقب الثاني سبقك أحد عليه — اختر لقباً آخر');
          setJoinLoading(false);
          return;
        }
        if (normalizeName(joinNick) === normalizeName(joinNick2)) {
          setJoinErr('اللقبان يجب أن يختلفا');
          setJoinLoading(false);
          return;
        }
      }
      const arenaFields = await fetchArenaFieldsForJoin();
      const newRef = push(playersRef(joinInput));
      await set(newRef, {
        name: joinName.trim(),
        nick: joinNick.trim(),
        nick2: roomNickMode === 2 ? joinNick2.trim() : null,
        initials:mkInitials(joinName.trim()),
        colorIdx: existingPlayers.length % AV_COLORS.length,
        status:'active', missedRounds:0,
        ...(hostUid ? { ownerUid: hostUid } : {}),
        ...arenaFields,
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
    const decoyNicks = Array.isArray(gameState?.decoyNicks) ? gameState.decoyNicks : [];
    const allNicks = shuffle([
      ...playersList.flatMap((p) => attackableNicksForPlayer(p)),
      ...decoyNicks,
    ]);
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

    const spec = gameState?.specialRound ?? specialRound ?? 1;
    const poisonForRound = gameState?.poisonNick || poisonNick || null;
    const silentForRound = Boolean(silentRound);
    const roundAlert = buildRoundAlert({
      poisonNick: poisonForRound,
      silentActive: silentForRound,
      specialRound: spec,
    });
    const updates = {
      phase:'attacking',
      roundNum: rn,
      deadline: dl,
      roundOrder: { nicks:allNicks, names:allNames },
      attacksPerRound: spec,
      specialRound: 1,
      poisonNick: poisonForRound || null,
      roundAlert,
      revealQueue: null,
      revealStep: null,
      revealStats: null,
      silentActive: silentForRound,
      endGameAfterReveal: null,
    };
    await update(gameRef(roomCode), updates);
    setSilentRound(false);
    setSpecialRound(1);
    notify(
      silentForRound ? `🤫 الجولة ${rn} — وضع الصمت` : `🔔 الجولة ${rn} بدأت!`,
      silentForRound ? 'info' : 'gold'
    );
  };

  const startGame = async () => {
    const minPlayers = nickMode===2 ? 4 : 6;
    if(activePlayers.length<minPlayers){notify(`يلزم ${minPlayers} لاعبين على الأقل`,'error');return;}
    const decoyNicks = Array.isArray(gameState?.decoyNicks) ? gameState.decoyNicks : [];
    if (isDecoyRequired(nickMode) && decoyNicks.length === 0) {
      notify('⚠️ وضع اللقبين يشترط إضافة لقب تمويه واحد على الأقل قبل البدء', 'error');
      return;
    }
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
    // وضع اللقبين: لا هجوم بلقب مكشوف (خرج من الساحة)
    if(attackerPlayer){
      const allowedAttackerNicks = attackableNicksForPlayer(attackerPlayer);
      if(!allowedAttackerNicks.includes(attackerNick)){
        notify('❌ لا يمكنك الهجوم بهذا اللقب — اللقب المكشوف خارج الساحة','error');
        return;
      }
    }

    // Block self-attack — attacker cannot target their own nick
    const realOwner = playersList.find(p=>p.nick===myNick||p.nick2===myNick);
    const decoyNicks = Array.isArray(gameState?.decoyNicks) ? gameState.decoyNicks : [];
    const isDecoyAttack = !realOwner && decoyNicks.includes(myNick);
    if(!realOwner && !isDecoyAttack){notify('لقب غير موجود!','error');return;}
    if(realOwner && (realOwner.nick===attackerNick||realOwner.nick2===attackerNick)){
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
    /* لو الهدف لقب تمويه فالهجمة دائماً فاشلة (لا يوجد صاحب حقيقي) */
    const correct = isDecoyAttack ? false : guessedPlayer?.id === realOwner.id;

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
      realOwnerId: isDecoyAttack ? null : realOwner.id,
      realOwnerName: isDecoyAttack ? null : realOwner.name,
      isDecoy: isDecoyAttack || false,
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
    /* أثناء الهجوم بالنيابة لا تُلغى الجلسة بعد كل هجمة — يبقى المشرف بمنظور المتسابق حتى 👑 */
    if (!(role === 'admin' && proxyFor)) {
      setProxyFor(null);
    }
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
    const notSent = activePlayers.filter((p) => !playerSubmittedAttack(currentAttacks, p));
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

    // ══ NORMAL + إعلان جولات الصمت المخزّنة ══
    const updates = {};
    const exitList = [];

    let pendingSilent = gameState?.silentPending;
    if (isSilentActive) {
      const snapshot = buildSilentSnapshot(attacks, playersList, roundNum);
      pendingSilent = mergeSilentPending(pendingSilent, snapshot);
      updates[`rooms/${roomCode}/rounds/round_${roundNum}`] = {
        round: roundNum,
        attacks: attacks || {},
        endedAt: Date.now(),
        silent: true,
      };
      updates[`rooms/${roomCode}/game/silentPending`] = sanitizeForFirebase(pendingSilent);
      updates[`rooms/${roomCode}/game/silentActive`] = false;
      setSilentRound(false);
    }

    const silentAppliedIds = new Set();
    if (
      pendingSilent?.silentExits?.length > 0 ||
      pendingSilent?.silentMissed?.length > 0 ||
      pendingSilent?.silentPartialReveals?.length > 0
    ) {
      applySilentPendingToReveal(pendingSilent, playersList, updates, exitList, roomCode);
      (pendingSilent.silentExits || []).forEach((ex) => silentAppliedIds.add(ex.playerId));
    }

    const correctHitsFor = (playerId) =>
      currentAttacks
        .filter((a) => a.correct && a.realOwnerId === playerId)
        .map((a) => ({ attackerNick: a.attackerNick, targetNick: a.targetNick }));
    const playerNicksForReveal = (p) => [p.nick, p.nick2].filter(Boolean);
    const newlyRevealedNicksFor = (p, hits) => {
      const nicks = playerNicksForReveal(p);
      const prev = p.revealedNick ? [p.revealedNick] : [];
      return [
        ...new Set(
          hits
            .map((h) => h.targetNick)
            .filter((nick) => nicks.includes(nick) && !prev.includes(nick))
        ),
      ];
    };
    const attackersForNick = (hits, nick) => [
      ...new Set(
        hits
          .filter((h) => h.targetNick === nick)
          .map((h) => h.attackerNick)
          .filter(Boolean)
      ),
    ];
    const revealItemForNick = (p, hits, nick, partial = false) => {
      const attackers = attackersForNick(hits, nick);
      return {
        nick,
        name: p.name,
        partial,
        eliminatedBy: attackers.join(' + '),
        attackers,
        hits: hits.filter((h) => h.targetNick === nick),
        initials: p.initials,
        colorIdx: p.colorIdx,
      };
    };

    for(const p of playersList){
      if(silentAppliedIds.has(p.id)) continue;
      if(elimIds.has(p.id)){
        const hits = correctHitsFor(p.id);
        const newlyRevealedNicks = newlyRevealedNicksFor(p, hits);

        // لقبان: يخرج فقط إذا كُشف اللقبان (هذه الجولة أو جولة سابقة)
        if (p.nick2 && !isDualTitleFullyRevealed(p, hits)) {
          const justRevealed = newlyRevealedNicks[0] || nickRevealedThisRound(p, hits);
          if (!justRevealed) continue;
          updates[`rooms/${roomCode}/players/${p.id}/revealedNick`] = justRevealed;
          exitList.push(revealItemForNick(p, hits, justRevealed, true));
          continue;
        }

        const finalRevealedNick =
          (p.nick2 && p.revealedNick && newlyRevealedNicks.find((nick) => nick !== p.revealedNick)) ||
          (p.nick2 && newlyRevealedNicks[newlyRevealedNicks.length - 1]) ||
          nickRevealedThisRound(p, hits) ||
          hits.find((h) => playerNicksForReveal(p).includes(h.targetNick))?.targetNick ||
          p.nick;
        const finalAttackers = attackersForNick(hits, finalRevealedNick);
        const eliminatedByStr = finalAttackers.join(' + ');
        if (p.nick2 && !p.revealedNick && newlyRevealedNicks.length > 1) {
          newlyRevealedNicks
            .slice(0, -1)
            .forEach((nick) => exitList.push(revealItemForNick(p, hits, nick, true)));
        }
        updates[`rooms/${roomCode}/players/${p.id}/status`] = 'eliminated';
        updates[`rooms/${roomCode}/players/${p.id}/revealedNick`] = null;
        updates[`rooms/${roomCode}/players/${p.id}/eliminatedBy`]=eliminatedByStr;
        updates[`rooms/${roomCode}/players/${p.id}/eliminatedByList`]=finalAttackers;
        updates[`rooms/${roomCode}/players/${p.id}/eliminatedRound`]=roundNum;
        exitList.push(revealItemForNick(p, hits, finalRevealedNick, false));
      } else if (p.status === 'active') {
        const submitted = playerSubmittedAttack(currentAttacks, p);
        const nm = submitted ? 0 : (p.missedRounds || 0) + 1;
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
    if (!updates[`rooms/${roomCode}/rounds/${roundKey}`]) {
      updates[`rooms/${roomCode}/rounds/${roundKey}`] = { round: roundNum, attacks: attacks || {}, endedAt: Date.now() };
    }
    const leavingIds = new Set([...silentAppliedIds]);
    for (const p of playersList) {
      if (silentAppliedIds.has(p.id)) continue;
      if (elimIds.has(p.id)) {
        const hits = correctHitsFor(p.id);
        if (!p.nick2 || isDualTitleFullyRevealed(p, hits)) {
          leavingIds.add(p.id);
        }
      }
    }
    exitList
      .filter((ex) => ex.inactive)
      .forEach((ex) => {
        const p = playersList.find((pl) => pl.nick === ex.nick);
        if (p) leavingIds.add(p.id);
      });
    const roomPath = `rooms/${roomCode}`;
    const postRevealPlayers = playersAfterReveal(playersList, updates, leavingIds, roomPath);
    const remainingTitles = remainingTitlesCount(postRevealPlayers);
    const remainingPlayers = postRevealPlayers.filter((p) => p.status === 'active').length;
    /** مشهد الفائز عند بقاء لقب أو لقبين فقط في الساحة */
    const gameEndsAfterReveal = shouldEndGameByRemainingTitles(postRevealPlayers);
    const revealQueue = buildRevealQueue(exitList);
    const correctN = currentAttacks.filter((a) => a.correct).length;

    updates[`rooms/${roomCode}/game/phase`] = 'revealing';
    updates[`rooms/${roomCode}/game/revealQueue`] = revealQueue;
    updates[`rooms/${roomCode}/game/revealStep`] = 0;
    updates[`rooms/${roomCode}/game/endGameAfterReveal`] = gameEndsAfterReveal;
    updates[`rooms/${roomCode}/game/silentActive`] = false;
    setSilentRound(false);
    updates[`rooms/${roomCode}/game/revealStats`] = {
      attacks: currentAttacks.length,
      correct: correctN,
      wrong: currentAttacks.length - correctN,
      remainingTitles,
      remainingActive: remainingPlayers,
    };

    await update(ref(db), sanitizeForFirebase(updates));
    setFlipCards({});
  };

  const advanceRevealStep = async () => {
    if (!roomCode || role !== 'admin' || phase !== 'revealing') return;
    const queue = gameState?.revealQueue || [];
    const step = typeof gameState?.revealStep === 'number' ? gameState.revealStep : 0;
    const endsAfter = Boolean(gameState?.endGameAfterReveal);
    const maxStep = queue.length + (endsAfter ? 2 : 1);
    if (step >= maxStep) return;
    await update(gameRef(roomCode), { revealStep: step + 1 });
  };

  /** جولة صمت: احفظ النتائج مخفية وابدأ الجولة التالية دون إعلان */
  const declareWinner = async () => {
    if (role !== 'admin' || !roomCode) return;
    trackTitlesRoundDone();
    recordSessionEnd('titles', roomCode, true).catch(() => {});
    await update(gameRef(roomCode), {
      phase: 'ended',
      endGameAfterReveal: null,
      revealQueue: null,
      revealStep: null,
      revealStats: null,
    });
    notify('🏆 تم إعلان الفائز!', 'gold');
  };

  const advanceSilentRound = async () => {
    if (phase !== 'attacking' || !isSilentActive) return;
    try {
      setSilentRound(false);
      const snapshot = buildSilentSnapshot(attacks, playersList, roundNum);
      const merged = mergeSilentPending(gameState?.silentPending, snapshot);
      const updates = {};
      updates[`rooms/${roomCode}/rounds/round_${roundNum}`] = {
        round: roundNum,
        attacks: attacks || {},
        endedAt: Date.now(),
        silent: true,
      };
      updates[`rooms/${roomCode}/game/silentPending`] = merged;
      updates[`rooms/${roomCode}/game/silentActive`] = false;
      await update(ref(db), sanitizeForFirebase(updates));
      await set(ref(db, `rooms/${roomCode}/currentRound`), { attacks: {} });
      trackTitlesRoundDone();
      await launchRound(roundNum + 1);
      const summary = merged.silentExits?.length
        ? `${merged.silentExits.length} خروج مخزّن`
        : 'لا خروج هذه الجولة';
      notify(`🤫 بدأت الجولة ${roundNum + 1} — بدون كشف (${summary})`, 'success');
    } catch (e) {
      console.error(e);
      notify('تعذّر بدء الجولة — تحقق من الاتصال وحاول مرة أخرى', 'error');
    }
  };

  /* ══ ADMIN: NEXT ROUND ══ */
  const nextRound = async () => {
    const titlesLeft = remainingTitlesCount(playersList);
    if (titlesLeft <= 2) {
      notify(
        titlesLeft === 0
          ? '🏁 لا يوجد ألقاب متبقية — انتهت المسابقة'
          : `🏁 بقي ${titlesLeft === 1 ? 'لقب واحد' : 'لقبان'} فقط — انتهت المسابقة حسب القواعد`,
        'gold'
      );
      trackTitlesRoundDone();
      recordSessionEnd('titles', roomCode, true).catch(() => {});
      await update(gameRef(roomCode), { phase: 'ended' });
      return;
    }
    trackTitlesRoundDone();
    await launchRound(roundNum + 1);
  };

  /* ══ ADMIN CONTROLS ══ */
  const extendTime = async (ms) => {
    await update(gameRef(roomCode),{deadline:(deadline||Date.now())+ms});
    notify(`⏱️ تمديد ${fmtMs(ms)}`,'gold');
  };
  const cancelCompetition = async () => {
    if (roomCode) recordSessionEnd('titles', roomCode, true).catch(() => {});
    await update(gameRef(roomCode), {
      phase: 'ended',
      cancelled: true,
      endedAt: Date.now(),
    });
    localStorage.removeItem('ng_session');
    localStorage.removeItem('ng_admin_session');
    notify('تم إلغاء المسابقة — المتسابقون سيُخرجون', 'info');
  };

  const endGame = async () => {
    if (!hasTitlesCompetitionStarted(gameState, allRoundsData)) {
      await cancelCompetition();
      return;
    }
    if (gameState?.phase === 'attacking' || gameState?.phase === 'revealing') {
      await recordRoundCompleted('titles', roomCode).catch(() => {});
    }
    if (roomCode) recordSessionEnd('titles', roomCode, true).catch(() => {});
    await update(gameRef(roomCode), { phase: 'ended', endedAt: Date.now() });
    // Clear ALL sessions so no one auto-rejoins a finished game
    localStorage.removeItem('ng_session');
    localStorage.removeItem('ng_admin_session');
  };

  const titlesCompetitionStarted = hasTitlesCompetitionStarted(gameState, allRoundsData);
  const elimCheat = async (pid) => {
    const p = playersList.find(pl=>pl.id===pid);
    await update(ref(db,`rooms/${roomCode}/players/${pid}`),{status:'cheater',eliminatedRound:roundNum,eliminatedBy:'المشرف'});
    notify(`🚫 أُخرج ${p?.name}`, 'error');
  };

  const downloadPDFReport = () => {
    const ok = openTitlesPrintableReport({
      roomCode,
      playersList,
      allRoundsList,
      allAttacksFlat,
      gameState,
    });
    if (ok) {
      notify('تم فتح التقرير — اضغط «طباعة / حفظ PDF» ثم اختر حفظ كـ PDF', 'success');
    } else {
      notify(
        'تعذّر فتح نافذة جديدة (حظر النوافذ المنبثقة). سُنزّل ملف HTML — افتحه واطبعه.',
        'error'
      );
    }
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
                      <div className="attack-meta">
                        خمّن: <strong className="attack-guess">{a.guessedName}</strong>
                        {!forEveryone&&<> — الحقيقي: <strong style={{color:'var(--gold)'}}>{victim?.name} ({a.targetNick})</strong></>}
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
                      <div className="attack-meta">
                        خمّن: <strong className="attack-guess" style={{color:'var(--red)'}}>{a.guessedName}</strong>
                        {!forEveryone&&realOwner&&<> — الحقيقي: <strong style={{color:'var(--gold)'}}>{realOwner.name} ({a.targetNick})</strong></>}
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

        {role === 'admin' && (
          <button
            type="button"
            className="btn bo no-print"
            style={{ marginTop: 8 }}
            onClick={downloadPDFReport}
          >
            🖨️ طباعة / حفظ كـ PDF
          </button>
        )}
      </div>
    );
  };

  /* ══ AUTO-REJOIN on mount ══ */
  useEffect(() => {
    const restoreSession = async () => {
      try {
        if (typeof auth.authStateReady === 'function') {
          await auth.authStateReady();
        }

        const applyAdminFromRoom = (roomCode, ph) => {
          setRoomCode(roomCode);
          setRole('admin');
          setMyId(null);
          setMyNickLocal('');
          applyTitlesAdminScreens(ph || 'lobby');
        };

        const clearLsForRoom = (roomCode) => {
          try {
            const pRaw = localStorage.getItem('ng_session');
            const aRaw = localStorage.getItem('ng_admin_session');
            if (pRaw && JSON.parse(pRaw)?.roomCode === roomCode) localStorage.removeItem('ng_session');
            if (aRaw && JSON.parse(aRaw)?.roomCode === roomCode) localStorage.removeItem('ng_admin_session');
          } catch {
            /* تجاهل */
          }
        };

        /**
         * نقرأ جلسة المشرف أولاً دائماً من localStorage الحالي (لا نعتمد على قيم قديمة من الإغلاق)
         * حتى لا يُستعاد دور «لاعب» بعد createRoom بسبب سباق async.
         */
        const loadRoomSession = async (roomCode, mode) => {
          const snap = await get(roomRef(roomCode));
          if (!snap.exists()) {
            clearLsForRoom(roomCode);
            return false;
          }
          const roomData = snap.val();
          const phase = roomData?.game?.phase;
          const uid = auth.currentUser?.uid;

          if (phase === 'ended') {
            clearLsForRoom(roomCode);
            return false;
          }

          if (uid && roomData?.adminId === uid) {
            localStorage.removeItem('ng_session');
            localStorage.setItem('ng_admin_session', JSON.stringify({ roomCode }));
            applyAdminFromRoom(roomCode, phase);
            return true;
          }

          if (mode === 'admin') {
            applyAdminFromRoom(roomCode, phase);
            return true;
          }

          if (mode === 'player') {
            const pRaw = localStorage.getItem('ng_session');
            if (!pRaw) return false;
            let ps;
            try {
              ps = JSON.parse(pRaw);
            } catch {
              return false;
            }
            if (ps?.roomCode !== roomCode) return false;
            /** إن وُجدت جلسة مشرف أحدث لنفس الرمز، لا تُعدّ لاعباً */
            const aRaw = localStorage.getItem('ng_admin_session');
            if (aRaw) {
              try {
                if (JSON.parse(aRaw)?.roomCode === roomCode) {
                  applyAdminFromRoom(roomCode, phase);
                  return true;
                }
              } catch {
                /* تجاهل */
              }
            }
            setRoomCode(roomCode);
            setRole('player');
            setMyId(ps.playerId || ps.myId || null);
            setMyNickLocal(ps.nick || ps.myNick || '');
            setGameScreen('lobby');
            return true;
          }
          return false;
        };

        const adminRaw = localStorage.getItem('ng_admin_session');
        if (adminRaw) {
          try {
            const ac = JSON.parse(adminRaw);
            if (ac?.roomCode && (await loadRoomSession(ac.roomCode, 'admin'))) return;
          } catch {
            /* تجاهل */
          }
        }

        const playerRaw = localStorage.getItem('ng_session');
        if (playerRaw) {
          try {
            const pc = JSON.parse(playerRaw);
            if (pc?.roomCode && (await loadRoomSession(pc.roomCode, 'player'))) return;
          } catch {
            /* تجاهل */
          }
        }
      } catch (e) {
        void e;
      } finally {
        setSessionGate('ready');
      }
    };
    restoreSession();
  }, []);

  /** بعد تهيئة anonymous auth قد يتأخر uid — تصحيح دور المشرف عند ظهوره */
  useEffect(() => {
    if (sessionGate !== 'ready') return;

    const tryClaimHostRole = async (user) => {
      if (!user?.uid) return;

      /** حالة تأخر auth بعد «انضمام» أو جلسة لاعب خاطئة لنفس غرفة المشرف */
      let code = '';
      try {
        const admin = localStorage.getItem('ng_admin_session');
        const player = localStorage.getItem('ng_session');
        if (admin) code = JSON.parse(admin)?.roomCode || '';
        if (!code && player) code = JSON.parse(player)?.roomCode || '';
      } catch {
        return;
      }
      if (!code) return;

      try {
        const snap = await get(roomRef(code));
        if (!snap.exists()) return;
        const pdata = snap.val();
        const ph = pdata?.game?.phase;
        if (ph === 'ended' || !pdata?.adminId || pdata.adminId !== user.uid) return;

        const admRaw = localStorage.getItem('ng_admin_session');
        const playRaw = localStorage.getItem('ng_session');
        let admRoom = null;
        let playRoom = null;
        try {
          admRoom = admRaw ? JSON.parse(admRaw)?.roomCode : null;
        } catch {
          admRoom = null;
        }
        try {
          playRoom = playRaw ? JSON.parse(playRaw)?.roomCode : null;
        } catch {
          playRoom = null;
        }

        if (admRoom !== code && playRoom !== code) return;

        /** جلسة مشرف سليمة ولا يوجد تعارض لاعب لهذه الغرفة */
        if (admRoom === code && !playRaw) return;

        const hadMislinkedPlayerSession = !!(playRaw && playRoom === code);

        localStorage.removeItem('ng_session');
        localStorage.setItem('ng_admin_session', JSON.stringify({ roomCode: code }));
        setRoomCode(code);
        setRole('admin');
        setMyId(null);
        setMyNickLocal('');
        applyTitlesAdminScreens(ph || 'lobby');

        if (hadMislinkedPlayerSession) {
          notify('✅ تم التعرف على صلاحياتك كمشرف الغرفة', 'gold');
        }
      } catch {
        /* تجاهل */
      }
    };

    const unsub = onAuthStateChanged(auth, (user) => {
      void tryClaimHostRole(user);
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionGate]);

  useEffect(() => {
    const connRef = ref(db, '.info/connected');
    const unsubConn = onValue(connRef, (snap) => setFirebaseConnected(snap.val() === true));
    return () => off(connRef);
  }, []);

  useEffect(() => {
    if (gameScreen !== 'join' || joinInput.length !== 4) {
      setJoinPreviewLoading(false);
      if (joinInput.length < 4) {
        setJoinPreviewNickMode(1);
      }
      return undefined;
    }

    const cached = joinNickModeCacheRef.current[joinInput];
    if (cached) {
      setJoinPreviewNickMode(cached);
    }
    setJoinPreviewLoading(true);

    const gRef = gameRef(joinInput);
    const unsub = onValue(
      gRef,
      (snap) => {
        const mode = normalizeNickMode(snap.val()?.nickMode);
        joinNickModeCacheRef.current[joinInput] = mode;
        setJoinPreviewNickMode(mode);
        setJoinPreviewLoading(false);
      },
      () => {
        setJoinPreviewNickMode(cached || 1);
        setJoinPreviewLoading(false);
      }
    );
    return () => off(gRef);
  }, [gameScreen, joinInput]);

  useEffect(() => {
    if (!roomCode || !gameState) return;
    const serverMode = normalizeNickMode(gameState.nickMode);
    if (Date.now() - nickModeWriteAtRef.current < 1500) return;
    setNickMode((prev) => (prev === serverMode ? prev : serverMode));
  }, [roomCode, gameState?.nickMode]);

  useEffect(() => {
    if (joinPreviewNickMode !== 2) setJoinNick2('');
  }, [joinPreviewNickMode]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && roomCode) {
        get(gameRef(roomCode)).catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [roomCode]);

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
  useEffect(() => {
    if (!gameState) return;
    const prev = titlesPhaseRef.current;
    if (phase === prev) return;
    titlesPhaseRef.current = phase;

    if (phase === 'lobby') {
      if (role === 'admin' && !proxyFor) setGameScreen('host');
      else setGameScreen('lobby');
      return;
    }
    if (phase === 'attacking') {
      window._resultsPlayed = false;
      if (role === 'admin' && !proxyFor) setGameScreen('host');
      else setGameScreen('attack');
      setMyNick(null);
      setMyGuess(null);
      setMySubmitted(false);
      if (!proxyFor) setProxyFor(null);
      return;
    }
    if (phase === 'revealing') {
      if (gameScreen !== 'host_prep' && gameScreen !== 'stats') setGameScreen('results');
      return;
    }
    if (phase === 'ended') {
      setGameScreen(isGameCancelled(gameState) ? 'cancelled' : 'summary');
      setStatsTab('overview');
      if (!isGameCancelled(gameState)) {
        setTimeout(() => playSound('applause'), 500);
        setTimeout(() => playSound('applause'), 1400);
      }

      if (
        role === 'player' &&
        onGameEnd &&
        !titlesEndGamePromptSentRef.current &&
        !isGameCancelled(gameState)
      ) {
        titlesEndGamePromptSentRef.current = true;
        const winnerName = activePlayers.map((p) => p.name).join(' ، ') || '—';
        const myPlayer = myId ? playersList.find((p) => p.id === myId) : null;
        const statNicks = myPlayer ? [myPlayer.nick, myPlayer.nick2].filter(Boolean) : [myNickLocal].filter(Boolean);
        const myAtks = allAttacksFlat.filter((a) => statNicks.includes(a.attackerNick));
        const hits = myAtks.filter((a) => a.correct).length;
        const accuracy = myAtks.length > 0 ? Math.round((hits / myAtks.length) * 100) : 0;
        const rankRows = playersList
          .map((p) => {
            const nk = [p.nick, p.nick2].filter(Boolean);
            const atks = allAttacksFlat.filter((a) => nk.includes(a.attackerNick));
            return {
              id: p.id,
              hits: atks.filter((a) => a.correct).length,
              count: atks.length,
            };
          })
          .sort((a, b) => b.hits - a.hits || b.count - a.count);
        const rankIdx = myId ? rankRows.findIndex((r) => r.id === myId) : -1;
        const rank = rankIdx >= 0 ? rankIdx + 1 : playersList.length ? playersList.length : null;
        const started = gameState?.createdAt;
        const timeSec = started ? Math.round((Date.now() - started) / 1000) : undefined;
        onGameEnd({
          game: 'titles',
          roomCode: joinInput || roomCode,
          winner: winnerName,
          playerStats: {
            rank,
            hits,
            accuracy,
            time: timeSec,
          },
        });
      }
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, gameState, role, proxyFor]);

  useEffect(() => {
    if (gameScreen !== 'stats') return;
    const playerTabs = ['remaining', 'nicks', 'names', 'fierce', 'poison', 'me'];
    const adminTabs = [
      'remaining',
      'nicks',
      'names',
      'fierce',
      'poison',
      ...(phase === 'ended' && role === 'admin' ? ['decoys'] : []),
      'log',
    ];
    const allowed = effectiveRole === 'admin' ? adminTabs : playerTabs;
    if (!allowed.includes(statsTab)) setStatsTab('remaining');
  }, [gameScreen, statsTab, effectiveRole, phase, role]);

  useEffect(() => {
    if (!onHeaderMeta) return;
    onHeaderMeta({
      inRoom: !!roomCode,
      gameScreen,
      showAdminBtn: !!(
        roomCode &&
        role === 'admin' &&
        phase !== 'lobby' &&
        gameScreen !== 'host' &&
        gameScreen !== 'host_prep'
      ),
    });
  }, [roomCode, role, phase, gameScreen, onHeaderMeta]);

  useImperativeHandle(
    fwdRef,
    () => ({
      handleHeaderBack() {
        if (sessionGate === 'checking') return true;
        if (modal?.type) {
          setModal(null);
          return true;
        }
        if (roomCode) {
          setExitSheetOpen(true);
          return true;
        }
        if (gameScreen === 'join') {
          setGameScreen('home');
          return true;
        }
        return false;
      },
      openAdminPanel() {
        if (role !== 'admin' || !roomCode) return false;
        setIsProxyMode(false);
        setProxyFor(null);
        const ph = gameState?.phase || phase;
        if (ph === 'revealing') setGameScreen('host_prep');
        else setGameScreen('host');
        return true;
      },
    }),
    [sessionGate, roomCode, gameScreen, modal, role]
  );

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
    {modal?.type === 'guide' && <TitlesGuideModal onClose={() => setModal(null)} />}


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


  const renderStatsScreen = (opts = {}) => {
      const embedded = opts.embedded === true;

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

      /** تدرج لوني يشبه الخريطة الحرارية — من أزرق بارد إلى ذهبي/أحمر ساخن */
      const heatBarFillStyle = (count, maxVal) => {
        const r = maxVal > 0 ? Math.min(1, count / maxVal) : 0;
        const hue = 215 - r * 168;
        const light = 38 + r * 22;
        const sat = 72 + r * 22;
        const c0 = `hsl(${hue + 18}deg, ${sat}%, ${light - 6}%)`;
        const c1 = `hsl(${hue}deg, ${sat + 8}%, ${light}%)`;
        const c2 = `hsl(${Math.max(8, hue - 28)}deg, ${Math.min(98, sat + 12)}%, ${Math.min(72, light + 16)}%)`;
        return {
          width: `${Math.max(count > 0 ? 6 : 0, Math.round(r * 100))}%`,
          background: `linear-gradient(90deg, ${c0}, ${c1}, ${c2})`,
          borderRadius: 999,
          minHeight: 10,
          boxShadow:
            r > 0.62
              ? `0 0 16px hsla(${Math.max(0, hue - 20)}deg, 95%, 55%, 0.42), inset 0 1px 0 rgba(255,255,255,.22)`
              : 'inset 0 1px 0 rgba(255,255,255,.12)',
          transition: 'width .45s ease, box-shadow .35s ease',
        };
      };

      /** صفوف هجوم → خرائط مرتبة لكل جولة (من الأرشيف) */
      const nickHeatFromAttacks = (atkList) => {
        const m = {};
        atkList.forEach((a) => {
          if (a.targetNick) m[a.targetNick] = (m[a.targetNick] || 0) + 1;
        });
        return Object.entries(m).sort((a, b) => b[1] - a[1]);
      };
      const nameHeatFromAttacks = (atkList) => {
        const m = {};
        atkList.forEach((a) => {
          if (a.guessedName) m[a.guessedName] = (m[a.guessedName] || 0) + 1;
        });
        return Object.entries(m).sort((a, b) => b[1] - a[1]);
      };

      const lastArchivedRound = allRoundsList.length ? allRoundsList[allRoundsList.length - 1].round : 0;
      const showLiveRoundNickHeat =
        phase === 'revealing' &&
        roundNickSorted.length > 0 &&
        lastArchivedRound < roundNum;
      const showLiveRoundNameHeat =
        phase === 'revealing' &&
        roundNameSorted.length > 0 &&
        lastArchivedRound < roundNum;

      // ── إحصاءات اللاعب الحالي (مع دعم وضع إعارة الجوال) ──
      const myPlayer =
        playersList.find(p=>p.id===effectiveMyId) ||
        playersList.find(p=>p.nick===effectiveMyNick||p.nick2===effectiveMyNick);
      const myNicksForStats = myPlayer ? [myPlayer.nick, myPlayer.nick2].filter(Boolean) : [effectiveMyNick].filter(Boolean);
      const myAtks = allAttacksFlat.filter(a=>myNicksForStats.includes(a.attackerNick));
      const myHits = myAtks.filter(a=>a.correct);
      const myTargeted = allAttacksFlat.filter(a=>a.realOwnerId===myPlayer?.id);
      const myExposed = allAttacksFlat.filter(a=>a.realOwnerId===myPlayer?.id&&a.correct);
      const myAccuracy = myAtks.length>0?Math.round(myHits.length/myAtks.length*100):0;
      const myRank = myPlayer ? attackerRank.findIndex(p=>p.id===myPlayer.id)+1 : 0;

      const tabs = effectiveRole === 'admin'
        ? [
            ['remaining', '✅ المتبقون'],
            ['nicks', '🎭 الألقاب'],
            ['names', '👥 الأسماء'],
            ['fierce', '⚔️ الأشرس'],
            ['poison', '☠️ المسموم'],
            ...(phase === 'ended' && role === 'admin' ? [['decoys', '🎭 التمويه']] : []),
            ['log', '📍 مسار اللعبة'],
          ]
        : [
            ['remaining', '✅ المتبقون'],
            ['nicks', '🎭 الألقاب'],
            ['names', '👥 الأسماء'],
            ['fierce', '⚔️ الأشرس'],
            ['poison', '☠️ المسموم'],
            ['me', '👤 أنا'],
          ];

      const LuxHeatBar = ({ items, maxVal }) => (
        <>
          {items.map(([label, count], i) => (
            <div key={`${label}-${i}`} className={`stats-heat-item${i === 0 ? ' top' : ''}`}>
              <div className="stats-heat-item-head">
                <span className="stats-heat-item-label">
                  <span className="stats-heat-rank">{i + 1}</span> {label}
                </span>
                <span className="stats-heat-item-count">{count} هجمة</span>
              </div>
              <div className="stats-heat-track">
                <div style={{ height: '100%', ...heatBarFillStyle(count, maxVal) }} />
              </div>
            </div>
          ))}
        </>
      );

      const roundHeatCardShell = (roundLabel, subRight, inner) => (
        <div className="stats-round-heat">
          <div className="stats-round-heat-head">
            <span className="stats-round-heat-title">{roundLabel}</span>
            <span className="stats-round-heat-sub">{subRight}</span>
          </div>
          {inner}
        </div>
      );

      return(
        <div className={embedded ? '' : 'scr'}>
          {!embedded && (
          <button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={()=>{
            if(phase==='ended') setGameScreen('summary');
            else if(phase==='revealing'&&role==='admin') setGameScreen('host_prep');
            else if(phase==='revealing') setGameScreen('results');
            else if(phase==='attacking'&&role==='admin') setGameScreen('host');
            else setGameScreen('attack');
          }}>← رجوع</button>
          )}

          {/* جولة الصمت — إخفاء كامل للإحصائيات للمتسابقين */}
          {gameState?.silentPending && role === 'player' ? (
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

          {effectiveRole === 'admin' && statsTab !== 'log' && statsTab !== 'remaining' && (
            <div className="stats-tab-hint">
              📈 رسوم وإحصائيات — للتفصيل جولة بجولة انتقل إلى <strong>«مسار اللعبة»</strong>
            </div>
          )}

          {/* ══ 🎭 الألقاب ══ */}
          {statsTab==='nicks'&&<>
            <div className="stats-desc">
              خريطة حرارية: <strong>الجولة الحالية</strong> ثم المجموع الكلي لكل الجولات
            </div>
            {phase==='attacking'&&<div className="stats-lock-banner">
              🔒 الجولة الجارية لا تُعرض هنا حتى الإعلان — أدناه آخر جولة منتهية ثم المجموع الكلي
            </div>}
            {(()=>{
              let items=[];
              let label='';
              let sub='';
              if(showLiveRoundNickHeat&&roundNickSorted.length>0){
                items=roundNickSorted;
                label=`الجولة ${roundNum}`;
                sub=`${attacksList.length} هجمة`;
              }else if(allRoundsList.length>0){
                const lastR=allRoundsList[allRoundsList.length-1];
                const ratks=Object.values(lastR.attacks||{});
                items=nickHeatFromAttacks(ratks);
                if(items.length>0){
                  const hits=ratks.filter(a=>a.correct).length;
                  label=`الجولة ${lastR.round}${lastR.silent?' 🤫':''}`;
                  sub=effectiveRole==='admin'
                    ? `${ratks.length} هجمة · ✅${hits} · ❌${ratks.length-hits}`
                    : `${ratks.length} هجمة`;
                }
              }
              if(items.length===0) return null;
              return(
                <>
                  <div className="ctitle" style={{marginBottom:10}}>🔥 الجولة الحالية</div>
                  {roundHeatCardShell(label,sub,<LuxHeatBar items={items} maxVal={items[0]?.[1]||1}/>)}
                </>
              );
            })()}
            <div className="ctitle" style={{marginTop:4}}>🏅 المجموع الكلي (كل الجولات)</div>
            {allNickSorted.length===0
              ?<div className="stats-empty">لا بيانات بعد</div>
              :<LuxHeatBar items={allNickSorted} maxVal={allNickSorted[0]?.[1]||1}/>
            }
          </>}


          {/* ══ 👥 الأسماء ══ */}
          {statsTab==='names'&&<>
            <div className="stats-desc">
              أكثر الأسماء التي خُمِّن عليها — <strong>الجولة الحالية</strong> ثم المجموع الكلي
            </div>
            {phase==='attacking'&&<div className="stats-lock-banner">
              🔒 الجولة الجارية لا تُعرض هنا حتى الإعلان — أدناه آخر جولة منتهية ثم المجموع الكلي
            </div>}
            {(()=>{
              let items=[];
              let label='';
              let sub='';
              if(showLiveRoundNameHeat&&roundNameSorted.length>0){
                items=roundNameSorted;
                label=`الجولة ${roundNum}`;
                sub=`${attacksList.length} هجمة`;
              }else if(allRoundsList.length>0){
                const lastR=allRoundsList[allRoundsList.length-1];
                const ratks=Object.values(lastR.attacks||{});
                items=nameHeatFromAttacks(ratks);
                if(items.length>0){
                  const hits=ratks.filter(a=>a.correct).length;
                  label=`الجولة ${lastR.round}${lastR.silent?' 🤫':''}`;
                  sub=effectiveRole==='admin'
                    ? `${ratks.length} هجمة · ✅${hits} · ❌${ratks.length-hits}`
                    : `${ratks.length} هجمة`;
                }
              }
              if(items.length===0) return null;
              return(
                <>
                  <div className="ctitle" style={{marginBottom:10}}>🔥 الجولة الحالية</div>
                  {roundHeatCardShell(label,sub,<LuxHeatBar items={items} maxVal={items[0]?.[1]||1}/>)}
                </>
              );
            })()}
            <div className="ctitle" style={{marginTop:4}}>🏅 المجموع الكلي (كل الجولات)</div>
            {allNameSorted.length===0
              ?<div className="stats-empty">لا بيانات بعد</div>
              :<LuxHeatBar items={allNameSorted} maxVal={allNameSorted[0]?.[1]||1}/>
            }
          </>}


          {/* ══ 👤 أنا — للمتسابق فقط (يشمل وضع إعارة الجوال) ══ */}
          {statsTab==='me'&&effectiveRole==='player'&&<>
            {/* بطاقة الهوية */}
            <div className="card" style={{textAlign:'center',padding:'18px 14px',background:'linear-gradient(135deg,rgba(240,192,64,.1),rgba(255,140,0,.05))'}}>
              {myPlayer&&<Av p={myPlayer} sz={52} fs={18}/>}
              <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--gold)',marginTop:8}}>{myPlayer?.name||joinName}</div>
              <div style={{fontSize:13,color:'var(--text)',marginTop:3}}>"{effectiveMyNick}"</div>
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
              <div className="stats-progress-track">
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
                const rAtk=Object.values(r.attacks||{}).filter(a=>myNicksForStats.includes(a.attackerNick));
                if(rAtk.length===0) return null;
                return rAtk.map((a,i)=>(
                  <div key={i} style={{padding:'8px 12px',marginBottom:5,background:'var(--surface)',borderRadius:9,borderRight:`3px solid ${a.correct?'var(--green)':'var(--red)'}`,fontSize:12}}>
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
            <div className="stats-desc">
              {effectiveRole==='admin'?'الاسم واللقب — للمشرف فقط':'الألقاب فقط — بدون كشف الأسماء'}
            </div>
            {attackerRank.length===0
              ?<div className="stats-empty">لا هجمات بعد</div>
              :attackerRank.map((p,i)=>(
              <div key={p.id} className={`stats-rank-card${i===0?' stats-rank-card--gold':i===1?' stats-rank-card--silver':i===2?' stats-rank-card--bronze':''}`}>
                <div className={`stats-rank-medal${i===0?' stats-rank-medal--gold':i===1?' stats-rank-medal--silver':i===2?' stats-rank-medal--bronze':''}`}>
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
                <div className="stats-empty">
                  <div style={{fontSize:36,marginBottom:8}}>☠️</div>
                  لم يقع أحد في فخ اللقب المسموم بعد
                </div>
              );
              return(
                <div>
                  <div style={{textAlign:'center',marginBottom:12}}>
                    <div style={{fontFamily:'Cairo',fontSize:18,fontWeight:900,color:'var(--purple)',marginTop:6}}>{poisoned.length} لاعب ممنوع</div>
                    <div style={{fontSize:11,color:'var(--muted)'}}>من الجولات السابقة</div>
                  </div>
                  {poisoned.map(p=>(
                    <div key={p.id} className="stats-poison-card" style={{padding:'10px 12px',marginBottom:5,borderRadius:9}}>
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

          {/* ══ التمويه — للمشرف فقط بعد انتهاء المسابقة ══ */}
          {statsTab === 'decoys' && role === 'admin' && phase === 'ended' && (
            <>
              {(() => {
                const decoyNicksList = Array.isArray(gameState?.decoyNicks) ? gameState.decoyNicks : [];
                const decoyAtks = allAttacksFlat.filter(
                  (a) => a.isDecoy || decoyNicksList.includes(a.targetNick)
                );
                if (decoyNicksList.length === 0) {
                  return (
                    <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 24, fontSize: 13 }}>
                      لم تُضف ألقاب تمويه في هذه المسابقة.
                    </div>
                  );
                }
                return (
                  <>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--muted)',
                        marginBottom: 14,
                        textAlign: 'center',
                        lineHeight: 1.7,
                      }}
                    >
                      ألقاب وهمية — لا صاحب حقيقي. الهجمات عليها تُسجّل كفشل دائماً.
                    </div>
                    <div className="ctitle" style={{ color: 'var(--purple)', marginBottom: 10 }}>
                      قائمة التمويه
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                      {decoyNicksList.map((n) => {
                        const hits = decoyAtks.filter((a) => a.targetNick === n).length;
                        return (
                          <div
                            key={n}
                            style={{
                              padding: '8px 12px',
                              background: 'linear-gradient(135deg,rgba(155,89,182,.12),rgba(79,163,224,.06))',
                              border: '1px solid rgba(155,89,182,.35)',
                              borderRadius: 12,
                              fontSize: 12,
                              color: 'var(--purple)',
                              fontWeight: 700,
                            }}
                          >
                            🎭 &quot;{n}&quot;
                            {hits > 0 && (
                              <span style={{ fontSize: 10, color: 'var(--muted)', marginRight: 6 }}>
                                {' '}
                                — {hits} هجمة
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {decoyAtks.length > 0 ? (
                      <>
                        <div className="ctitle" style={{ marginBottom: 8 }}>
                          سجل الهجمات على التمويه
                        </div>
                        <div className="sc" style={{ maxHeight: 280 }}>
                          {decoyAtks.map((a, i) => (
                            <div
                              key={i}
                              style={{
                                padding: '8px 10px',
                                marginBottom: 4,
                                background: 'var(--surface)',
                                borderRadius: 8,
                                borderRight: '3px solid var(--purple)',
                                fontSize: 11,
                              }}
                            >
                              <span style={{ fontWeight: 700 }}>&quot;{a.attackerNick}&quot;</span> → &quot;
                              {a.targetNick}&quot;
                              <span style={{ marginRight: 6 }}> خمّن: {a.guessedName}</span>
                              <span style={{ color: 'var(--red)' }}>❌ تمويه</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, padding: 12 }}>
                        لم يُهاجَم أي تمويه في المسابقة.
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}

          {/* ══ المتبقون + المقبرة ══ */}
          {statsTab === 'remaining' && (
            <StatsRemainingPanel
              isAdmin={effectiveRole === 'admin'}
              activePlayers={activePlayers}
              elimPlayers={elimPlayers}
              playersList={playersList}
              allRoundsList={allRoundsList}
              silentExits={gameState?.silentPending?.silentExits}
              nickMode={effectiveNickMode}
            />
          )}

          {/* ══ 📍 مسار اللعبة — للمشرف فقط ══ */}
          {statsTab === 'log' && effectiveRole === 'admin' && (
            <>
              <div style={{fontSize:11,color:'var(--gold)',fontWeight:700,marginBottom:12,textAlign:'center',lineHeight:1.6}}>
                📍 مسار المسابقة — تفصيل كل جولة (للمشرف فقط)
              </div>
              {renderFullLog(false)}
            </>
          )}
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
    proxyFor,
    advanceRevealStep,
    declareWinner,
    firebaseConnected,
    onPrepNextRound: () => setGameScreen('host_prep'),
    onExitRequest: openExitSheet,
  };

  const mainEl = (() => {
    if (showOnboarding) {
      return (
        <QuickOnboarding
          game="titles"
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

    if (sessionGate === 'checking') {
      return <GameSessionChecking emoji="🎭" />;
    }

    if (gameScreen === 'home') {
      return (
        <div className="scr">
          <GameTopNav onBack={() => setSelectedGame(null)} variant="arena" />
          {getOtherActiveSessions('titles').length > 0 && (
            <div className="game-multi-session-hint">
              لديك جلسة نشطة في: {formatOtherSessionsHint(getOtherActiveSessions('titles'))}
            </div>
          )}
          {getSavedRoomForGame('titles') && !roomCode && (
            <button type="button" className="btn bo" style={{ marginBottom: 8 }} onClick={() => void reconnectToSavedRoom()}>
              🔙 العودة للغرفة ({getSavedRoomForGame('titles').roomCode})
            </button>
          )}
          <div style={{ textAlign: 'center', padding: '10px 0 12px' }}>
            <div style={{ fontSize: 46, marginBottom: 6 }}>🎭</div>
            <div className="ptitle" style={{ fontSize: 22 }}>
              لعبة الألقاب
            </div>
            <div className="psub">أخفِ هويتك • الكل يهاجم معاً • اكشف الهويات</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button type="button" className="btn bg" onClick={handleAdminEntry}>
              👑 أنا مشرف — إنشاء غرفة
            </button>
            <button type="button" className="btn bo" onClick={handlePlayerEntry}>
              🎮 انضمام برمز الغرفة
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
            <div key={i} className="game-rule-row">
              {r}
            </div>
          ))}
        </div>
      );
    }

    if (gameScreen === 'join') {
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
          joinRoomNickMode={joinPreviewNickMode}
          joinRoomModeLoading={joinPreviewLoading}
          joinRoom={joinRoom}
        />
      );
    }

    const openHostStats = () => {
      setStatsTab('overview');
      setGameScreen('stats');
    };

    if (gameScreen === 'host_prep' && role === 'admin') {
      const remTitles =
        typeof gameState?.revealStats?.remainingTitles === 'number'
          ? gameState.revealStats.remainingTitles
          : remainingTitlesCount(playersList);
      return (
        <div className="scr">
          <GameTopNav onBack={openExitSheet} sticky />
        <TitlesHostPrep
          roundNum={roundNum}
          playersList={playersList}
          activePlayers={activePlayers}
          gameState={gameState}
          roomCode={roomCode}
          nickMode={effectiveNickMode}
          onNickModeChange={updateRoomNickMode}
          attackDur={attackDur}
          setAttackDur={setAttackDur}
          specialRound={specialRound}
          setSpecialRound={setSpecialRound}
          poisonNick={poisonNick}
          setPoisonNick={setPoisonNick}
          silentRound={silentRound}
          setSilentRound={setSilentRound}
          remainingTitles={remTitles}
          onStartNextRound={nextRound}
          onOpenStats={openHostStats}
          setGameScreen={setGameScreen}
        />
        </div>
      );
    }

    if (gameScreen === 'host' && role === 'admin') {
      return (
        <div className="scr">
          <GameTopNav onBack={openExitSheet} sticky />
          <TitlesHostCockpit
            roomCode={roomCode}
            phase={phase}
            roundNum={roundNum}
            players={players}
            gameState={gameState}
            attacks={attacks}
            countdown={countdown}
            nickMode={effectiveNickMode}
            onNickModeChange={updateRoomNickMode}
            attackDur={attackDur}
            setAttackDur={setAttackDur}
            specialRound={specialRound}
            setSpecialRound={setSpecialRound}
            poisonNick={poisonNick}
            setPoisonNick={setPoisonNick}
            silentRound={silentRound}
            setSilentRound={setSilentRound}
            form={form}
            setForm={setForm}
            onAddManualPlayer={() => addPlayer()}
            startRound={startGameForLobby}
            doReveal={doReveal}
            extendTime={extendTime}
            endGame={endGame}
            setModal={setModal}
            setGameScreen={setGameScreen}
            setProxyFor={setProxyFor}
            setIsProxyMode={setIsProxyMode}
            setMyNick={setMyNick}
            setMyGuess={setMyGuess}
            setMySubmitted={setMySubmitted}
            notify={notify}
            allSubmitted={allSubmitted}
            attacksPerRound={attacksPerRound}
            onOpenStats={openHostStats}
            onAdvanceSilentRound={advanceSilentRound}
          />
        </div>
      );
    }

    if (gameScreen === 'lobby') {
      return (
        <div className="scr">
          <GameTopNav onBack={openExitSheet} sticky />
          <TitlesLobby
            roomCode={roomCode}
            role={role}
            players={players}
            gameState={gameState}
            nickMode={effectiveNickMode}
            onNickModeChange={updateRoomNickMode}
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
            myId={myId}
          />
        </div>
      );
    }

    if (gameScreen === 'attack') {
      return (
        <div className="scr">
          <GameTopNav onBack={openExitSheet} sticky />
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
          firebaseConnected={firebaseConnected}
        />
        </div>
      );
    }

    if (gameScreen === 'results') {
      return <TitlesResults {...sharedProps} />;
    }

    if (gameScreen === 'cancelled') {
      return (
        <div className="scr">
          <GameTopNav onBack={openExitSheet} sticky />
          <GameCancelledScreen
            gameLabel="مسابقة الألقاب"
            roomCode={roomCode}
            onHome={() => {
              localStorage.removeItem('ng_session');
              localStorage.removeItem('ng_admin_session');
              resetTitlesRoomState();
              setSelectedGame(null);
            }}
          />
        </div>
      );
    }

    if (gameScreen === 'summary') {
      return (
        <TitlesGameSummary
          role={role}
          players={players}
          gameState={gameState}
          allRoundsData={allRoundsData}
          renderStatsPanel={(opts) => renderStatsScreen(opts)}
          downloadPDFReport={downloadPDFReport}
          setTab={setTab}
          setSelectedGame={setSelectedGame}
          onCreateAccount={() => setTab('account')}
        />
      );
    }

    if (gameScreen === 'stats') {
      return renderStatsScreen();
    }


    return null;
  })();

  return (
    <>
      <GameExitSheet
        open={exitSheetOpen}
        game="titles"
        role={role === 'admin' ? 'admin' : 'player'}
        roomCode={roomCode}
        phase={phase}
        onContinue={() => setExitSheetOpen(false)}
        onPause={withdrawToTitlesHome}
        onQuit={role === 'admin' ? () => void cancelCompetitionFromExit() : () => void withdrawFromCompetition()}
        onArena={withdrawToArena}
        onClose={() => setExitSheetOpen(false)}
      />
      {renderOverlays()}
      {mainEl}
    </>
  );});

const TitlesGame = forwardRef(function TitlesGame(
  { notify, setTab, setSelectedGame, onHeaderMeta, canCreateRoom, onRequestActivation, onGameEnd },
  ref
) {
  return (
    <TitlesGameInner
      ref={ref}
      notify={notify}
      setTab={setTab}
      setSelectedGame={setSelectedGame}
      onHeaderMeta={onHeaderMeta}
      canCreateRoom={canCreateRoom}
      onRequestActivation={onRequestActivation}
      onGameEnd={onGameEnd}
    />
  );
});
export default TitlesGame;
