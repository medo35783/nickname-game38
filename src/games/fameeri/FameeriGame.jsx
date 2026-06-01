import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { ref as dbRef, set, get, update, push, onValue, off } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { Q_TREES, Q_WEAPONS, Q_TOTAL } from '../../core/constants';
import { genCode, playSound } from '../../core/helpers';
import { recordRoundCompleted, recordSessionEnd, buildGameSessionTracking } from '../../core/sessionStats';
import FameeriRevealOverlay from './FameeriRevealOverlay';
import { openFameeriPrintableReport } from './fameeriPrintReport';
import { patchLeaderByUid } from './fameeriLeaderIndex';
import QuickOnboarding from '../../components/onboarding/QuickOnboarding';
import FameeriGuideModal from './FameeriGuideModal';
import { ROOM_CODE_PLACEHOLDER, GROUP_MEMBER_NAME_PLACEHOLDER } from '../../core/formLabels';
import WhatsAppLogoIcon from '../../components/icons/WhatsAppLogoIcon';
import PlayerQuestionView from '../../question-bank/PlayerQuestionView';
import { QSOURCE, toPublicQuestion, isAnswerCorrect, optionLabel } from '../../question-bank/questionSession';
import { markQuestionAsUsed } from './fameeriBankProgress';
import { saveAdminSession, loadAdminSession, clearAdminSessionLocal } from './fameeriSessionStore';
import { buildAdminAnswerContext } from './fameeriAdminAnswers';
import {
  drawQuestionForWeapon,
  findInStructuredPool,
  normalizePoolToStructured,
  poolStats,
  difficultyLabelAr,
} from './fameeriQuestionPool';
import FameeriSpectatorView from './FameeriSpectatorView';
import FameeriGroupChat from './FameeriGroupChat';
import FameeriAdminLobby from './FameeriAdminLobby';
import FameeriAdminPlay from './FameeriAdminPlay';
import FameeriPlayerPlay from './FameeriPlayerPlay';
import FameeriPlayerLeaderNotice from './FameeriPlayerLeaderNotice';

/** نوع اللعبة في بنك الأسئلة المركزي (قيمة البنك للقميري). */
const QB_GAME_TYPE = 'qumayri';
const FAMEERI_ACCENT = 'var(--fameeri-primary)';

function readSavedFameeri() {
  try {
    const raw = localStorage.getItem('ng_qumairi');
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function qumairiScreenForPhase(phase) {
  if (phase === 'playing') return 'qumairi_play';
  if (phase === 'ended') return 'qumairi_results';
  return 'qumairi_lobby';
}

/** يعثر على عضو سابق: بالمعرّف المحفوظ، أو uid، أو الاسم */
function findExistingQumairiMember(members, { memberId, uid, name }) {
  if (!members || typeof members !== 'object') return null;
  if (memberId && members[memberId]) return [memberId, members[memberId]];
  const entries = Object.entries(members);
  if (uid) {
    const byUid = entries.find(([, m]) => m.ownerUid === uid);
    if (byUid) return byUid;
  }
  const trimmed = name?.trim();
  if (trimmed) {
    const byName = entries.find(([, m]) => m.name?.trim() === trimmed);
    if (byName) return byName;
  }
  return null;
}

const FameeriGame = forwardRef(function FameeriGame(
  { notify, setTab, setSelectedGame, canCreateRoom, onRequestActivation, onGameEnd, onGoAccount },
  ref
) {
  void setTab;
  const [qSaved] = useState(readSavedFameeri);
  const [gameScreen, setGameScreen] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const pendingOnboardingRef = useRef(null);
  const sessionRestoredRef = useRef(false);
  const [qExitModal, setQExitModal] = useState(false);

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
    const saved = readSavedFameeri();
    if (saved.qRoom) setQJoinInput(saved.qRoom);
    if (saved.qMyName) setQMyName(saved.qMyName);
    setShowOnboarding('player');
  };

  const createQumairiRoom = async () => {
    if (!canCreateRoom) {
      notify('لا يمكن إنشاء غرفة بدون اشتراك نشط. فعّل كودك أو جدّده من تبويب «الباقات».', 'error');
      onRequestActivation();
      return;
    }
    try {
      if (typeof auth.authStateReady === 'function') await auth.authStateReady();
    } catch {
      /* ignore */
    }
    const code = genCode();
    setQRoom(code);
    setQRole('admin');
    await set(dbRef(db, `qrooms/${code}`), {
      ...(auth.currentUser?.uid ? { adminId: auth.currentUser.uid } : {}),
      game: {
        phase: 'lobby',
        createdAt: Date.now(),
        ...buildGameSessionTracking('fameeri'),
      },
      groups: {},
      members: {},
      attacks: {},
    });
    localStorage.setItem('ng_qumairi', JSON.stringify({ qRoom: code, qRole: 'admin' }));
    setGameScreen('qumairi_lobby');
    notify(`✅ الغرفة: ${code}`, 'gold');
  };

  /* ── QUMAIRI GAME STATE ── */
  const [qRoom, setQRoom] = useState(() => qSaved.qRoom || '');
  const [qRole, setQRole] = useState(() => qSaved.qRole ?? null);
  const [qGroupName, setQGroupName] = useState(() => qSaved.qGroupName || '');
  const [qGroupId, setQGroupId] = useState(() => qSaved.qGroupId ?? null);
  const [qMyName, setQMyName] = useState(() => qSaved.qMyName || '');
  const [qMyId, setQMyId] = useState(() => qSaved.qMyId ?? null);
  const [qGameState, setQGameState] = useState(null);
  const [qGroups, setQGroups]     = useState({});
  const [qMembers, setQMembers]   = useState({});      // أعضاء الغرفة
  const [qAttacks, setQAttacks]   = useState({});
  const [qJoinInput, setQJoinInput] = useState('');
  const [qJoinErr, setQJoinErr]   = useState('');
  const [qDistribution, setQDistribution] = useState({});
  const [qDistLocked, setQDistLocked] = useState(() => !!qSaved.qDistLocked);
  const [qAttackTarget, setQAttackTarget] = useState({group:'',tree:'',weapon:''});
  const [qReveal, setQReveal]     = useState(null);
  const [qJoinLoading, setQJoinLoading] = useState(false);
  const [qDistSubmitting, setQDistSubmitting] = useState(false);
  const [qCustomTimer, setQCustomTimer] = useState('');
  const [qCountdown, setQCountdown] = useState(null); // عداد القميري الحقيقي
  const [qTurnOverlay, setQTurnOverlay] = useState(null); // {groupName, weapon}
  const [qShieldTree, setQShieldTree] = useState(null); // رقم الشجرة المحمية (0-10)
  const [qPoisonTree, setQPoisonTree] = useState(null); // رقم الشجرة المسمومة
  const [qSandstorm, setQSandstorm] = useState(false); // العاصفة الرملية
  const [qFastestMode, setQFastestMode] = useState(false); // خيار الأسرع
  const [qQuestion, setQQuestion] = useState(''); // سؤال المشرف
  const [qCorrectAnswer, setQCorrectAnswer] = useState(true); // الإجابة الصحيحة
  const [speedWinSelect, setSpeedWinSelect] = useState(''); // فائز جولة السرعة (عند وجود أكثر من طلب)
  const [speedRoundSecs, setSpeedRoundSecs] = useState(35); // مؤقت حسم السرعة (ثانية، حد أقصى 35)
  const [shieldActivating, setShieldActivating] = useState(false);
  const [shieldCountdown, setShieldCountdown] = useState(null);

  /* ── جلسة الأسئلة (المرحلة 1: الربط بالبنك) ── */
  const [qSource, setQSource] = useState(null);   // مصدر الأسئلة المختار محليًا
  const [qPool, setQPool] = useState({ hard: [], medium: [], easy: [] });
  const [qBankMeta, setQBankMeta] = useState(null);
  const [qSetupOpen, setQSetupOpen] = useState(false);
  const qPoolCursorsRef = useRef({ hard: 0, medium: 0, easy: 0 });
  const qDrawingRef = useRef(false);

  const lastResultRef = useRef(null);
  const fameeriEndGamePromptSentRef = useRef(false);

  useEffect(() => {
    fameeriEndGamePromptSentRef.current = false;
  }, [qRoom]);

  /* ══ QUMAIRI FIREBASE LISTENERS ══ */
  useEffect(()=>{
    if(!qRoom) return;
    const qgRef = dbRef(db, `qrooms/${qRoom}/game`);
    const qpRef = dbRef(db, `qrooms/${qRoom}/groups`);
    const qaRef = dbRef(db, `qrooms/${qRoom}/attacks`);
    const qmRef = dbRef(db, `qrooms/${qRoom}/members`);
    onValue(qgRef, snap=>setQGameState(snap.val()));
    onValue(qpRef, snap=>setQGroups(snap.val()||{}));
    onValue(qaRef, snap=>setQAttacks(snap.val()||{}));
    onValue(qmRef, snap=>setQMembers(snap.val()||{}));
    return ()=>{ off(qgRef); off(qpRef); off(qaRef); off(qmRef); };
  }, [qRoom]);

  /** تصحيح دور المشرف إن كان uid قد تأخر عن القراءة الأولى */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) return;
      let saved = '';
      try {
        const raw = localStorage.getItem('ng_qumairi');
        if (!raw) return;
        const p = JSON.parse(raw);
        if (p.qRole === 'admin' || !p.qRoom) return;
        saved = p.qRoom;
      } catch {
        return;
      }
      try {
        const snap = await get(dbRef(db, `qrooms/${saved}`));
        if (!snap.exists()) return;
        const d = snap.val();
        if (!d?.adminId || d.adminId !== user.uid) return;
        localStorage.setItem(
          'ng_qumairi',
          JSON.stringify({
            ...readSavedFameeri(),
            qRoom: saved,
            qRole: 'admin',
          })
        );
        setQRoom(saved);
        setQRole('admin');
        setQMyId(null);
      } catch {
        /* ignore */
      }
    });
    return () => unsub();
  }, []);

  // Qumairi countdown timer — يحدّث كل ثانية بدقة
  useEffect(()=>{
    const dl = qGameState?.timer?.deadline;
    if(!dl){setQCountdown(null);return;}
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
  },[qGameState?.timer?.deadline]);

  const shieldWindow = qGameState?.shieldWindow;

  useEffect(() => {
    const dl = shieldWindow?.deadline;
    if (!dl) {
      setShieldCountdown(null);
      return;
    }
    const tick = () => {
      const rem = Math.ceil((dl - Date.now()) / 1000);
      setShieldCountdown(rem <= 0 ? 0 : rem);
    };
    tick();
    const t = setInterval(tick, 250);
    return () => clearInterval(t);
  }, [shieldWindow?.deadline]);

  // Auto-navigate qumairi based on phase
  useEffect(() => {
    if (!qRoom || !qGameState) return;
    const roomScreens = ['qumairi_lobby', 'qumairi_play', 'qumairi_results'];
    if (!roomScreens.includes(gameScreen)) return;
    const target = qumairiScreenForPhase(qGameState.phase);
    if (gameScreen !== target) setGameScreen(target);
  }, [qGameState?.phase, qRoom, gameScreen]);

  // Qumairi — dramatic reveal sequence
  useEffect(()=>{
    // إذا المشرف ضغط متابعة — أخفِ كل شيء
    if(!qGameState?.showResult){setQReveal(null);return;}
    if(!qGameState?.lastResult) return;
    const lr = qGameState.lastResult;
    if(lastResultRef.current === lr.timestamp) return;
    lastResultRef.current = lr.timestamp;

    // مرحلة 1: صمت — ثانيتين
    setQReveal({
      phase: 'suspense',
      tree: lr.tree,
      weapon: lr.weapon,
      weaponName: lr.weaponName,
      attackerName: lr.attackerName,
      targetName: lr.targetName,
      poisonMsg: lr.poisonMsg,
    });

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
      if(lr.result==='shielded'){
        playSound('explosion');
        setQReveal(prev=>prev?{...prev,phase:'result',type:'shielded'}:null);
      } else if(lr.result==='success' && lr.hunted>0){
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

  useImperativeHandle(
    ref,
    () => ({
      handleHeaderBack() {
        if (qRoom) {
          setQExitModal(true);
          return true;
        }
        if (gameScreen !== 'home') {
          setGameScreen('home');
          return true;
        }
        return false;
      },
    }),
    [qRoom, gameScreen]
  );

  const qSave = (extra = {}) => {
    localStorage.setItem(
      'ng_qumairi',
      JSON.stringify({
        qRoom,
        qRole,
        qGroupId,
        qGroupName,
        qMyName,
        qMyId,
        qDistLocked,
        ...extra,
      })
    );
  };

  const restoreQumairiSession = async (roomCodeOverride) => {
    const saved = readSavedFameeri();
    const roomCode = roomCodeOverride || saved.qRoom;
    if (!roomCode) return false;

    try {
      if (typeof auth.authStateReady === 'function') await auth.authStateReady();
      const snap = await get(dbRef(db, `qrooms/${roomCode}`));
      if (!snap.exists()) {
        localStorage.removeItem('ng_qumairi');
        setQRoom('');
        setQRole(null);
        notify('الغرفة لم تعد موجودة', 'error');
        return false;
      }
      const data = snap.val();
      const phase = data.game?.phase || 'lobby';
      if (saved.qRole === 'spectator') {
        setQRoom(roomCode);
        setQRole('spectator');
        setQMyId(null);
        setQGroupId(null);
        setGameScreen('qumairi_spectator');
        return true;
      }
      if (phase === 'ended') {
        localStorage.removeItem('ng_qumairi');
        setQRoom('');
        setQRole(null);
        notify('انتهت هذه الجولة', 'info');
        return false;
      }

      const uid = auth.currentUser?.uid;
      if (saved.qRole === 'admin' || (uid && data.adminId === uid)) {
        setQRoom(roomCode);
        setQRole('admin');
        setQMyId(null);
        setQGroupId(null);
        localStorage.setItem('ng_qumairi', JSON.stringify({ qRoom: roomCode, qRole: 'admin' }));
        setGameScreen(qumairiScreenForPhase(phase));
        notify('✅ عدت للغرفة كمشرف', 'gold');
        return true;
      }

      const existing = findExistingQumairiMember(data.members, {
        memberId: saved.qRoom === roomCode ? saved.qMyId : null,
        uid,
        name: saved.qMyName || qMyName,
      });

      if (!existing) {
        if (saved.qMyId && saved.qRoom === roomCode) {
          localStorage.removeItem('ng_qumairi');
          setQRoom('');
          setQRole(null);
        }
        return false;
      }

      const [memberId, memberData] = existing;
      const role = memberData.role === 'leader' ? 'leader' : 'member';
      setQRoom(roomCode);
      setQMyId(memberId);
      setQRole(role);
      setQMyName(memberData.name || saved.qMyName || '');
      if (memberData.groupId) {
        setQGroupId(memberData.groupId);
        const grpName = data.groups?.[memberData.groupId]?.name || '';
        if (grpName) setQGroupName(grpName);
      } else {
        setQGroupId(null);
        setQGroupName('');
      }
      localStorage.setItem(
        'ng_qumairi',
        JSON.stringify({
          qRoom: roomCode,
          qRole: role,
          qMyId: memberId,
          qMyName: memberData.name || saved.qMyName || '',
          qGroupId: memberData.groupId || null,
          qGroupName: data.groups?.[memberData.groupId]?.name || '',
        })
      );
      setGameScreen(qumairiScreenForPhase(phase));
      notify('✅ عدت للغرفة!', 'success');
      return true;
    } catch {
      notify('تعذر الاتصال بالغرفة', 'error');
      return false;
    }
  };

  const joinQumairiRoom = async () => {
    if (qJoinLoading) return;
    if (qJoinInput.length !== 4) {
      setQJoinErr('الرمز 4 أرقام');
      return;
    }
    setQJoinLoading(true);
    setQJoinErr('');
    try {
      if (typeof auth.authStateReady === 'function') await auth.authStateReady();
      const snap = await get(dbRef(db, `qrooms/${qJoinInput}`));
      if (!snap.exists()) {
        setQJoinErr('الغرفة غير موجودة');
        return;
      }
      const data = snap.val();
      const phase = data.game?.phase || 'lobby';
      const uid = auth.currentUser?.uid;

      if (uid && data.adminId === uid) {
        setQRoom(qJoinInput);
        setQRole('admin');
        setQMyId(null);
        setQGroupId(null);
        localStorage.setItem('ng_qumairi', JSON.stringify({ qRoom: qJoinInput, qRole: 'admin' }));
        setGameScreen(qumairiScreenForPhase(phase));
        notify('✅ دخلت كمشرف — صاحب الغرفة', 'gold');
        return;
      }

      const saved = readSavedFameeri();
      const existing = findExistingQumairiMember(data.members, {
        memberId: saved.qRoom === qJoinInput ? saved.qMyId : null,
        uid,
        name: qMyName,
      });

      if (existing) {
        const [memberId, memberData] = existing;
        const role = memberData.role === 'leader' ? 'leader' : 'member';
        setQRoom(qJoinInput);
        setQMyId(memberId);
        setQRole(role);
        setQMyName(memberData.name || qMyName.trim());
        if (memberData.groupId) {
          setQGroupId(memberData.groupId);
          const grpName = data.groups?.[memberData.groupId]?.name || '';
          if (grpName) setQGroupName(grpName);
        } else {
          setQGroupId(null);
          setQGroupName('');
        }
        localStorage.setItem(
          'ng_qumairi',
          JSON.stringify({
            qRoom: qJoinInput,
            qRole: role,
            qMyId: memberId,
            qMyName: memberData.name || qMyName.trim(),
            qGroupId: memberData.groupId || null,
            qGroupName: data.groups?.[memberData.groupId]?.name || '',
          })
        );
        setGameScreen(qumairiScreenForPhase(phase));
        notify('✅ عدت للغرفة!', 'success');
        return;
      }

      if (phase !== 'lobby') {
        setQJoinErr('اللعبة بدأت — لا يمكن الانضمام لأول مرة. أدخل نفس اسمك إن كنت مسجّلاً سابقاً');
        return;
      }

      if (!qMyName.trim()) {
        setQJoinErr('أدخل اسمك');
        return;
      }

      const mRef = push(dbRef(db, `qrooms/${qJoinInput}/members`));
      await set(mRef, {
        name: qMyName.trim(),
        groupId: null,
        role: 'member',
        joinedAt: Date.now(),
        ...(uid ? { ownerUid: uid } : {}),
      });
      setQMyId(mRef.key);
      setQRoom(qJoinInput);
      setQRole('member');
      localStorage.setItem(
        'ng_qumairi',
        JSON.stringify({
          qRoom: qJoinInput,
          qRole: 'member',
          qMyName: qMyName.trim(),
          qMyId: mRef.key,
        })
      );
      setGameScreen('qumairi_lobby');
      notify('✅ انضممت — انتظر المشرف يضعك في مجموعة', 'success');
    } catch {
      setQJoinErr('خطأ في الاتصال');
    } finally {
      setQJoinLoading(false);
    }
  };

  useEffect(() => {
    if (sessionRestoredRef.current) return;
    const saved = readSavedFameeri();
    if (!saved.qRoom) return;
    sessionRestoredRef.current = true;
    void restoreQumairiSession(saved.qRoom);
  }, []);

  // الدخول كشاشة عرض (بروجكتر) — قراءة فقط، بلا انضمام كعضو
  const joinAsSpectator = async () => {
    const code = String(qJoinInput || '').trim();
    if (code.length !== 4) {
      setQJoinErr('الرمز 4 أرقام');
      return;
    }
    setQJoinLoading(true);
    setQJoinErr('');
    try {
      const snap = await get(dbRef(db, `qrooms/${code}`));
      if (!snap.exists()) {
        setQJoinErr('الغرفة غير موجودة');
        return;
      }
      setQRoom(code);
      setQRole('spectator');
      setQMyId(null);
      setQGroupId(null);
      localStorage.setItem('ng_qumairi', JSON.stringify({ qRoom: code, qRole: 'spectator' }));
      setGameScreen('qumairi_spectator');
      notify('📺 دخلت كشاشة عرض', 'gold');
    } catch {
      setQJoinErr('خطأ في الاتصال');
    } finally {
      setQJoinLoading(false);
    }
  };

  const qGList = Object.entries(qGroups).map(([id, g]) => ({ ...g, id }));
  const qMList = Object.entries(qMembers).map(([id, m]) => ({ ...m, id }));
  const qMyGroup = qGList.find((g) => g.id === qGroupId);
  const qOtherGroups = qGList.filter((g) => g.id !== qGroupId);
  const qPhase = qGameState?.phase || 'lobby';
  const qCurrentAttack = qGameState?.currentAttack;
  const qMySpeedClaim = qGameState?.speedClaims?.[qGroupId];
  const qTimer = qGameState?.timer;
  const isAdmin = qRole === 'admin';
  const isSpectator = qRole === 'spectator';
  const qMyMember = qMyId ? qMList.find((m) => m.id === qMyId) : null;
  const isLeader = !isAdmin && qMyMember?.role === 'leader';

  /* ── جلسة الأسئلة: استرجاع، سحب، إظهار، اعتماد ── */
  const qActiveQuestion = qGameState?.currentQuestion || null;
  const qEffectiveSource = qGameState?.questionSource || qSource || null;
  const qActiveAnswer = qActiveQuestion?.id
    ? findInStructuredPool(qPool, qActiveQuestion.id)?.correct_answer || ''
    : '';

  const qKey = qActiveQuestion ? qActiveQuestion.id || qActiveQuestion.text || null : null;
  const qPlayMode = qGameState?.playMode || 'sequential';
  const qIsSpeedRound = qPlayMode === 'speed' && !!qGameState?.speedBatchActive;
  const qIsSequentialAttack = qPlayMode !== 'speed' && !!qCurrentAttack;
  const qCanAnswerGroup =
    qIsSpeedRound || (qIsSequentialAttack && qCurrentAttack?.attackerId === qGroupId);
  const qCanAnswer =
    !!qActiveQuestion &&
    !!qActiveQuestion.revealOptions &&
    !qActiveQuestion.adminOnly &&
    !!qGroupId &&
    qCanAnswerGroup &&
    Array.isArray(qActiveQuestion.options) &&
    qActiveQuestion.options.length > 0;
  /** سؤال مفتوح أثناء المؤقت — لا نستخدم overlay كاملًا حتى لا يُحجب النقر */
  const qAnswerPhaseDuringTimer =
    !!qActiveQuestion?.revealToPlayers &&
    !!qActiveQuestion?.revealOptions &&
    !qActiveQuestion?.adminOnly;
  const qMyPick = qKey && qMyMember?.answerPick?.q === qKey ? qMyMember.answerPick.opt : null;
  const qGroupFinal = qKey && qMyGroup?.finalAnswer?.q === qKey ? qMyGroup.finalAnswer.opt : null;
  const qGroupTally = (() => {
    const c = {};
    if (!qKey || !qGroupId) return c;
    qMList.forEach((m) => {
      if (m.groupId === qGroupId && m.answerPick?.q === qKey) c[m.answerPick.opt] = (c[m.answerPick.opt] || 0) + 1;
    });
    return c;
  })();
  const qAdminGroupAnswers =
    qActiveQuestion && qKey
      ? qGList
          .filter((g) => g.finalAnswer?.q === qKey)
          .map((g) => {
            const opt = g.finalAnswer.opt;
            const options = qActiveQuestion.options || [];
            const letter = typeof opt === 'number' && opt >= 0 ? optionLabel(opt) : null;
            const optText =
              typeof opt === 'number' && options[opt] != null ? options[opt] : opt != null ? String(opt) : '';
            return {
              id: g.id,
              name: g.name,
              opt,
              letter,
              optText,
              by: g.finalAnswer.by,
              correct: isAnswerCorrect(opt, options, qActiveAnswer),
              isAttacker: qCurrentAttack?.attackerId === g.id,
            };
          })
      : [];

  const qAdminAnswerContext = buildAdminAnswerContext({
    qKey,
    qActiveQuestion,
    qActiveAnswer,
    qGList,
    qMList,
    qCurrentAttack,
    isSpeed: qPlayMode === 'speed' && !!qGameState?.speedBatchActive,
    speedAnsweringGroupId: (() => {
      const ids = Object.keys(qGameState?.speedClaims || {});
      if (ids.length === 1) return ids[0];
      return speedWinSelect || null;
    })(),
  });

  const qAdminPendingGroups = qAdminAnswerContext?.manualOnly
    ? []
    : qAdminAnswerContext?.pendingNames?.length
      ? qAdminAnswerContext.pendingNames
      : qActiveQuestion && qKey
        ? qGList.filter((g) => g.finalAnswer?.q !== qKey).map((g) => g.name)
        : [];

  // استرجاع مخزون المشرف (محلي + Firebase للمسجّلين) عند العودة للغرفة
  useEffect(() => {
    if (!qRoom || !isAdmin) return undefined;
    let cancelled = false;

    void loadAdminSession(qRoom).then((saved) => {
      if (cancelled || !saved) return;
      if (saved.poolStructured) {
        setQPool(saved.poolStructured);
      }
      if (saved.source) setQSource(saved.source);
      if (saved.bankMeta) setQBankMeta(saved.bankMeta);
      qPoolCursorsRef.current = saved.poolCursors || { hard: 0, medium: 0, easy: 0 };
    });

    return () => {
      cancelled = true;
    };
  }, [qRoom, isAdmin]);

  const applyQuestionSetup = async ({ source, pool, poolStructured, bankMeta }) => {
    setQSource(source);
    const structured = normalizePoolToStructured(poolStructured || pool);
    setQPool(structured);
    setQBankMeta(bankMeta || null);
    qPoolCursorsRef.current = { hard: 0, medium: 0, easy: 0 };
    saveAdminSession(qRoom, {
      source,
      poolStructured: structured,
      bankMeta: bankMeta || null,
      poolCursors: qPoolCursorsRef.current,
    });
    try {
      await update(dbRef(db, `qrooms/${qRoom}/game`), { questionSource: source, currentQuestion: null });
    } catch {
      /* ignore */
    }
    setQSetupOpen(false);
    const stats = poolStats(structured);
    if (stats.total) notify(`✅ مخزون: ${stats.hard.total} صعب · ${stats.medium.total} متوسط · ${stats.easy.total} سهل`, 'success');
  };

  const drawNextQuestion = async (weaponId) => {
    const structured = normalizePoolToStructured(qPool);
    const total = structured.hard.length + structured.medium.length + structured.easy.length;
    if (!isAdmin || qDrawingRef.current || !total) return;
    if (!weaponId) {
      notify('حدّد الهجوم أولاً لربط السؤال بالسلاح', 'info');
      return;
    }
    qDrawingRef.current = true;
    try {
      const { question, cursors, diff, exhausted } = drawQuestionForWeapon(
        structured,
        qPoolCursorsRef.current,
        weaponId
      );
      if (!question || exhausted) {
        notify(`⚠️ نفدت أسئلة ${difficultyLabelAr(diff)} في هذه المجموعة`, 'error');
        return;
      }
      qPoolCursorsRef.current = cursors;
      saveAdminSession(qRoom, {
        source: qSource,
        poolStructured: structured,
        bankMeta: qBankMeta,
        poolCursors: cursors,
      });
      if (qSource === QSOURCE.BANK && qBankMeta?.filterKey && question.id) {
        void markQuestionAsUsed(qBankMeta.filterKey, question.id);
      }
      await update(dbRef(db, `qrooms/${qRoom}/game`), {
        currentQuestion: {
          ...toPublicQuestion(question),
          revealToPlayers: false,
          revealOptions: false,
          matchedWeapon: weaponId,
          matchedDifficulty: diff,
        },
        answerVerdict: null,
      });
    } catch {
      notify('تعذر سحب السؤال', 'error');
    } finally {
      qDrawingRef.current = false;
    }
  };

  const toggleQuestionReveal = async (field) => {
    if (!qActiveQuestion) return;
    const patch = { [field]: !qActiveQuestion[field] };
    if (field === 'revealToPlayers' && qActiveQuestion.revealToPlayers) patch.revealOptions = false;
    try {
      await update(dbRef(db, `qrooms/${qRoom}/game/currentQuestion`), patch);
    } catch {
      /* ignore */
    }
  };

  /** إخفاء السؤال والخيارات عن المتسابقين دفعة واحدة */
  const hideQuestionFromPlayers = async () => {
    if (!qActiveQuestion) return;
    try {
      if (qActiveQuestion.adminOnly) {
        await update(dbRef(db, `qrooms/${qRoom}/game/currentQuestion`), { revealToPlayers: false });
        notify('⏸️ تم إيقاف التحدي', 'success');
        return;
      }
      await update(dbRef(db, `qrooms/${qRoom}/game/currentQuestion`), {
        revealToPlayers: false,
        revealOptions: false,
      });
      notify('🔒 تم إخفاء السؤال والخيارات عن المجموعات', 'success');
    } catch {
      notify('تعذر الإخفاء', 'error');
    }
  };

  // اقتراح عضو لإجابة (يُسجَّل في عقدته)
  const suggestAnswer = async (opt) => {
    if (!qRoom || !qMyId || !qKey) return;
    try {
      if (typeof auth.authStateReady === 'function') await auth.authStateReady();
      const uid = auth.currentUser?.uid;
      if (!uid) {
        notify('سجّل الدخول من «حسابي» ثم أعد المحاولة', 'error');
        return;
      }
      if (!qMyMember?.ownerUid) {
        await update(dbRef(db, `qrooms/${qRoom}/members/${qMyId}`), { ownerUid: uid });
      }
      await update(dbRef(db, `qrooms/${qRoom}/members/${qMyId}/answerPick`), { q: qKey, opt });
    } catch {
      notify('تعذر تسجيل اقتراحك — تحقق من الاتصال', 'error');
    }
  };

  // اعتماد القائد للإجابة النهائية (يُسجَّل في عقدة المجموعة ويظهر للمشرف)
  const confirmAnswer = async (opt) => {
    if (!qRoom || !qGroupId || !qKey || !isLeader) return;
    try {
      if (typeof auth.authStateReady === 'function') await auth.authStateReady();
      const uid = auth.currentUser?.uid;
      if (!uid) {
        notify('سجّل الدخول من «حسابي» ثم أعد المحاولة', 'error');
        return;
      }
      if (!qMyMember?.ownerUid) {
        await update(dbRef(db, `qrooms/${qRoom}/members/${qMyId}`), { ownerUid: uid });
      }
      const groupBase = `qrooms/${qRoom}/groups/${qGroupId}`;
      await update(dbRef(db), {
        [`${groupBase}/finalAnswer`]: { q: qKey, opt, by: qMyName || '' },
        [`${groupBase}/leaderUid`]: uid,
        [`${groupBase}/leaderMemberId`]: qMyId,
        ...patchLeaderByUid(qRoom, uid, qGroupId),
      });
      notify('📤 تم إرسال واعتماد إجابة مجموعتك للمشرف', 'success');
    } catch (err) {
      const denied =
        err?.code === 'PERMISSION_DENIED' ||
        String(err?.message || '').toLowerCase().includes('permission');
      notify(
        denied
          ? 'رفض السيرفر — اطلب من المشرف إعادة تعيينك قائداً 👑'
          : 'تعذر اعتماد الإجابة — تحقق من الاتصال',
        'error'
      );
    }
  };

  const resolveDrawWeapon = () => {
    if (qCurrentAttack?.weapon) return qCurrentAttack.weapon;
    const claims = qGameState?.speedClaims || {};
    const ids = Object.keys(claims);
    if (!ids.length) return null;
    const winId =
      qGameState?.speedBatchActive && ids.length === 1
        ? ids[0]
        : speedWinSelect && claims[speedWinSelect]
          ? speedWinSelect
          : ids[0];
    return claims[winId]?.weapon || null;
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (!qEffectiveSource || qEffectiveSource === QSOURCE.EXTERNAL) return;
    if (qActiveQuestion) return;
    const structured = normalizePoolToStructured(qPool);
    const total = structured.hard.length + structured.medium.length + structured.easy.length;
    if (!total) return;
    const speed = qGameState?.playMode === 'speed';
    const needs = speed ? !!qGameState?.speedBatchActive : !!qCurrentAttack;
    if (!needs) return;
    const weapon = resolveDrawWeapon();
    if (weapon) void drawNextQuestion(weapon);
  }, [
    isAdmin,
    qEffectiveSource,
    qActiveQuestion,
    qGameState?.playMode,
    qGameState?.speedBatchActive,
    qCurrentAttack,
    qPool,
    speedWinSelect,
  ]);

  const assignGroupLeader = async (groupId, member) => {
    const members = qMList.filter((m) => m.groupId === groupId);
    const updates = {};
    members.forEach((mm) => {
      if (mm.role === 'leader') updates[`qrooms/${qRoom}/members/${mm.id}/role`] = 'member';
    });
    updates[`qrooms/${qRoom}/members/${member.id}/role`] = 'leader';
    updates[`qrooms/${qRoom}/groups/${groupId}/leaderMemberId`] = member.id;
    updates[`qrooms/${qRoom}/groups/${groupId}/leaderUid`] = member.ownerUid || null;
    if (member.ownerUid) Object.assign(updates, patchLeaderByUid(qRoom, member.ownerUid, groupId));
    try {
      await update(dbRef(db), updates);
      notify('✅ تم تعيين القائد', 'success');
    } catch {
      notify('تعذر تعيين القائد', 'error');
    }
  };

  const submitQumairiDistribution = async () => {
    const total = Object.values(qDistribution).reduce((s, v) => s + (parseInt(v, 10) || 0), 0);
    if (total !== Q_TOTAL) {
      notify(`يجب توزيع ${Q_TOTAL} قميري بالضبط`, 'error');
      return;
    }
    if (!qRoom || !qGroupId) {
      notify('لم تُحدد مجموعتك بعد — انتظر المشرف', 'error');
      return;
    }
    try {
      if (typeof auth.authStateReady === 'function') await auth.authStateReady();
    } catch {
      /* ignore */
    }
    const uid = auth.currentUser?.uid;
    if (!uid) {
      notify('سجّل الدخول من «حسابي» ثم أعد المحاولة', 'error');
      return;
    }
    if (qMyMember?.role !== 'leader') {
      notify('التأكيد للقائد 👑 فقط', 'error');
      return;
    }

    const trees = {};
    Q_TREES.forEach((t) => {
      trees[t] = parseInt(qDistribution[t], 10) || 0;
    });

    setQDistSubmitting(true);
    try {
      if (qMyId && !qMyMember?.ownerUid) {
        await update(dbRef(db, `qrooms/${qRoom}/members/${qMyId}`), { ownerUid: uid });
      }

      const groupBase = `qrooms/${qRoom}/groups/${qGroupId}`;
      await update(dbRef(db), {
        [`${groupBase}/trees`]: trees,
        [`${groupBase}/treesInitial`]: trees,
        [`${groupBase}/distributed`]: true,
        [`${groupBase}/totalRemaining`]: Q_TOTAL,
        [`${groupBase}/leaderUid`]: uid,
        [`${groupBase}/leaderMemberId`]: qMyId,
        ...patchLeaderByUid(qRoom, uid, qGroupId),
      });
      setQDistLocked(true);
      qSave({ qDistLocked: true });
      notify('✅ تم التوزيع', 'success');
    } catch (err) {
      console.error('submitQumairiDistribution', err);
      const denied =
        err?.code === 'PERMISSION_DENIED' ||
        String(err?.message || '').toLowerCase().includes('permission');
      notify(
        denied
          ? 'رفض السيرفر الحفظ — اطلب من المشرف إعادة تعيينك قائداً 👑 أو انشر قواعد Firebase المحدّثة'
          : 'تعذر حفظ التوزيع — تحقق من الاتصال',
        'error'
      );
    } finally {
      setQDistSubmitting(false);
    }
  };

  /** ربط القائد بمجموعته في Firebase (للغرف القديمة قبل leaderUid) */
  useEffect(() => {
    if (!isLeader || !qRoom || !qGroupId || !qMyId) return;
    if (qPhase !== 'distributing' && qPhase !== 'playing') return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const g = qGroups[qGroupId];
    if (g?.leaderUid === uid && g?.leaderMemberId === qMyId) {
      update(dbRef(db), patchLeaderByUid(qRoom, uid, qGroupId)).catch(() => {});
      return;
    }
    const groupBase = `qrooms/${qRoom}/groups/${qGroupId}`;
    update(dbRef(db), {
      [`${groupBase}/leaderUid`]: uid,
      [`${groupBase}/leaderMemberId`]: qMyId,
      ...patchLeaderByUid(qRoom, uid, qGroupId),
    }).catch(() => {});
  }, [isLeader, qPhase, qRoom, qGroupId, qMyId, qGroups]);

  const submitFameeriAttack = async () => {
    if (!qRoom || !qGroupId || !qMyGroup?.name) return;
    const finalTree = qGameState?.sandstorm
      ? Q_TREES[Math.floor(Math.random() * Q_TREES.length)]
      : qAttackTarget.tree;
    if (!qAttackTarget.group || !qAttackTarget.weapon || (!finalTree && !qGameState?.sandstorm)) return;

    const base = {
      attackerId: qGroupId,
      attackerName: qMyGroup.name,
      targetId: qAttackTarget.group,
      targetName: qAttackTarget.groupName,
      tree: finalTree,
      weapon: qAttackTarget.weapon,
      weaponName: qAttackTarget.weaponName,
      time: Date.now(),
    };

    try {
      if (typeof auth.authStateReady === 'function') await auth.authStateReady();
      if (!auth.currentUser?.uid) {
        notify('سجّل الدخول من «حسابي» ثم أعد المحاولة', 'error');
        return;
      }
      if (qGameState?.playMode === 'speed' && !qGameState?.speedBatchActive) {
        await set(dbRef(db, `qrooms/${qRoom}/game/speedClaims/${qGroupId}`), base);
        notify('✅ تم إرسال هجومك — انتظر قرار المشرف', 'success');
      } else {
        await update(dbRef(db, `qrooms/${qRoom}/game`), { currentAttack: base });
        notify('✅ تم إرسال الهجوم — انتظر المشرف', 'success');
      }
      setQAttackTarget({ group: '', tree: '', weapon: '' });
    } catch (err) {
      console.error('submitFameeriAttack', err);
      const denied =
        err?.code === 'PERMISSION_DENIED' ||
        String(err?.message || '').toLowerCase().includes('permission');
      notify(
        denied
          ? 'رفض السيرفر الهجوم — تأكد أنك قائد 👑 واطلب من المشرف نشر قواعد Firebase'
          : 'تعذر إرسال الهجوم — تحقق من الاتصال',
        'error'
      );
    }
  };

  const activateShield = async () => {
    if (!isLeader || !qRoom || !qGroupId || qMyGroup?.shieldUsed || !shieldWindow) return;
    const atk =
      qCurrentAttack ||
      (shieldWindow?.winnerGroupId && qGameState?.speedClaims?.[shieldWindow.winnerGroupId]);
    if (!atk || atk.targetId !== qGroupId) return;
    setShieldActivating(true);
    try {
      const tree = atk.tree;
      await update(dbRef(db, `qrooms/${qRoom}/groups/${qGroupId}`), {
        shield: tree,
        shieldUsed: true,
      });
      await update(dbRef(db, `qrooms/${qRoom}/game`), {
        announcement: {
          msg: `🛡️ ${qMyGroup?.name} فعّلت الدرع على 🌳${tree}`,
          timestamp: Date.now(),
        },
      });
      notify('🛡️ تم تفعيل الدرع!', 'success');
      playSound('explosion');
    } catch {
      notify('تعذر تفعيل الدرع', 'error');
    } finally {
      setShieldActivating(false);
    }
  };

  useEffect(() => {
    if (!qMyMember || qRole === 'admin') return;
    if (qMyMember.role === 'leader' && qRole !== 'leader') {
      setQRole('leader');
      qSave({ qRole: 'leader' });
    } else if (qMyMember.role === 'member' && qRole === 'leader') {
      setQRole('member');
      qSave({ qRole: 'member' });
    }
    if (qMyMember.groupId && qMyMember.groupId !== qGroupId) {
      setQGroupId(qMyMember.groupId);
      const grp = qGList.find((g) => g.id === qMyMember.groupId);
      if (grp) setQGroupName(grp.name);
      qSave({ qGroupId: qMyMember.groupId, qGroupName: grp?.name || '' });
    }
  }, [qMyMember?.role, qMyMember?.groupId, qMyId, qRoom, qRole, qGroupId]);

  // فهرس uid → groupId لتفعيل بوابة محادثة المجموعة (وضع اللاعبين على الجوالات)
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid || !qRoom || !qGroupId || qRole === 'admin' || qRole === 'spectator') return;
    void set(dbRef(db, `qrooms/${qRoom}/memberByUid/${uid}`), qGroupId).catch(() => {});
  }, [qRoom, qGroupId, qRole]);

  useEffect(() => {
    const ids = Object.keys(qGameState?.speedClaims || {});
    if (!ids.length) {
      setSpeedWinSelect('');
      return;
    }
    if (ids.length === 1) {
      setSpeedWinSelect(ids[0]);
      return;
    }
    setSpeedWinSelect((prev) => (ids.includes(prev) ? prev : ''));
  }, [qGameState?.speedClaims]);

  useEffect(() => {
    const ph = qGameState?.phase || 'lobby';
    if (ph !== 'ended' || !qRoom || !onGameEnd) return;
    if (qRole === 'admin' || qRole === 'spectator') return;
    if (fameeriEndGamePromptSentRef.current) return;
    fameeriEndGamePromptSentRef.current = true;

    const gList = Object.entries(qGroups).map(([id, g]) => ({ ...g, id }));
    const sorted = [...gList].sort((a, b) => (b.totalRemaining || 0) - (a.totalRemaining || 0));
    const winnerName = sorted[0]?.name || '—';

    let playerStats = null;
    if (qGroupId && sorted.length) {
      const rank = sorted.findIndex((g) => g.id === qGroupId) + 1;
      const attacks = Object.values(qAttacks || {});
      const myOff = attacks.filter((a) => a.attackerId === qGroupId);
      const hits = myOff.filter((a) => a.result === 'success').reduce((s, a) => s + (a.hunted || 0), 0);
      const good = myOff.filter((a) => a.result === 'success').length;
      const accuracy = myOff.length ? Math.round((good / myOff.length) * 100) : 0;
      const t0 = qGameState?.createdAt;
      const timeSec = t0 ? Math.round((Date.now() - t0) / 1000) : undefined;
      playerStats = { rank, hits, accuracy, time: timeSec };
    }

    onGameEnd({ winner: winnerName, playerStats });
  }, [qGameState, qRoom, qRole, qGroupId, qGroups, qAttacks, onGameEnd]);

  const shareRoomInvite = async ({ gameName, roomCode, preferWhatsApp = false }) => {
    const roomLink = 'https://nickname-game38.vercel.app/';
    const inviteText = [
      '🎮 ساحة الألعاب',
      'مسابقات جماعية سريعة وممتعة.',
      'برمز واحد.. تشتعل اللمة ومرحها يزود',
      '',
      `اللعبة: ${gameName}`,
      `رمز الغرفة: ${roomCode}`,
      `رابط الدخول: ${roomLink}`,
    ].join('\n');

    if (!preferWhatsApp && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'ساحة الألعاب',
          text: inviteText,
          url: roomLink,
        });
        notify('تم فتح المشاركة ✓', 'success');
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
    if (typeof window !== 'undefined') {
      const w = window.open(waUrl, '_blank', 'noopener,noreferrer');
      if (w) {
        notify('تم فتح واتساب ✓', 'success');
        return;
      }
    }

    try {
      await navigator.clipboard?.writeText(inviteText);
      notify('تم نسخ دعوة الغرفة ✓', 'success');
    } catch {
      notify('تعذر فتح المشاركة حالياً', 'error');
    }
  };

  const renderMain = () => {
    if (showOnboarding) {
      return (
        <QuickOnboarding
          game="fameeri"
          role={showOnboarding}
          onDismiss={() => {
            const r = showOnboarding;
            setShowOnboarding(null);
            if (r === 'admin') void createQumairiRoom();
            else setGameScreen('qumairi_join');
          }}
        />
      );
    }

    if (showGuide) {
      return <FameeriGuideModal onClose={() => setShowGuide(false)} />;
    }

    if (gameScreen === 'home') {
      return (
        <div className="scr">
          <button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={()=>setSelectedGame(null)}>← ساحة الألعاب</button>
          <div className="fameeri-hero" style={{ textAlign: 'center', padding: '10px 0 12px' }}>
            <div style={{ fontSize: 46, marginBottom: 6 }}>🦅</div>
            <div className="ptitle" style={{ fontSize: 22 }}>صيد القميري</div>
            <div className="psub" style={{ color: 'var(--fameeri-muted)' }}>
              وزّع القميري على الأشجار واهجم مجموعات الخصوم
            </div>
          </div>
          {readSavedFameeri().qRoom && (
            <button
              type="button"
              className="btn bo"
              style={{ marginBottom: 8 }}
              onClick={() => void restoreQumairiSession(readSavedFameeri().qRoom)}
            >
              🔙 العودة للغرفة ({readSavedFameeri().qRoom})
            </button>
          )}
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <button type="button" className="btn bg" onClick={handleAdminEntry}>👑 إنشاء غرفة كمسؤول</button>
            <button type="button" className="btn bo" onClick={handlePlayerEntry}>🎮 انضمام كمجموعة برمز الغرفة</button>
            <button type="button" className="btn bgh" onClick={() => { setQJoinInput(''); setQJoinErr(''); setGameScreen('qumairi_spectator_join'); }}>📺 شاشة عرض (بروجكتر)</button>
          </div>
          <button type="button" className="btn bgh" style={{ marginTop: 4 }} onClick={() => setShowGuide(true)}>
            📖 كيف تلعب؟ — دليل المشرف والمجموعة
          </button>
          <div className="div">قوانين سريعة</div>
          {['🔢 رمز الغرفة 4 أرقام من المشرف','🦅 100 قميري لكل مجموعة على 11 شجرة','⚔️ شوزل، أم صتمة، نبيطة — لكل سلاح كمية محدودة','🌳 هاجم أشجار الخصوم واصطد قميري الخصم','🏆 من يبقى له قميري أكثر يفوز','🔒 توزيع مجموعتك سري — لا تكشفه'].map((r,i)=>(
            <div key={i} className="game-rule-row">{r}</div>
          ))}
        </div>
      );
    }

    /* ══ QUMAIRI SCREENS ══ */
    if (gameScreen === 'qumairi_spectator_join') {
      return (
        <div className="scr">
          <button type="button" className="btn bgh bsm" style={{ width: 'auto', marginBottom: 12 }} onClick={() => setGameScreen('home')}>
            ← رجوع
          </button>
          <div className="ptitle">📺 شاشة العرض</div>
          <div className="psub" style={{ marginBottom: 10 }}>
            افتح هذه الشاشة على بروجكتر أو تلفزيون. تعرض سير اللعبة للجميع بدون كشف الأرصدة السرية.
          </div>
          <div className="card">
            <div className="ig">
              <label className="lbl">🔢 رمز الغرفة (4 أرقام)</label>
              <input
                className="inp big"
                placeholder={ROOM_CODE_PLACEHOLDER}
                maxLength={4}
                value={qJoinInput}
                onChange={(e) => {
                  setQJoinInput(e.target.value.replace(/\D/g, ''));
                  setQJoinErr('');
                }}
              />
            </div>
            {qJoinErr && <div className="err-msg">⚠️ {qJoinErr}</div>}
            <button type="button" className="btn bg mt2" disabled={qJoinLoading} onClick={() => void joinAsSpectator()}>
              {qJoinLoading ? '⏳' : '📺 عرض اللعبة'}
            </button>
          </div>
        </div>
      );
    }

    if (gameScreen === 'qumairi_spectator') {
      return (
        <FameeriSpectatorView
          roomCode={qRoom}
          gameState={qGameState}
          groups={qGList}
          reveal={qReveal}
          countdown={qCountdown}
          accent={FAMEERI_ACCENT}
          onExit={() => { clearAdminSessionLocal(qRoom); localStorage.removeItem('ng_qumairi'); setQRoom(''); setQRole(null); setGameScreen('home'); }}
        />
      );
    }

    if (gameScreen === 'qumairi_join') {
      return (
        <div className="scr">
          <button type="button" className="btn bgh bsm" style={{ width: 'auto', marginBottom: 12 }} onClick={() => setGameScreen('home')}>
            ← رجوع
          </button>
          <div className="ptitle">انضمام للغرفة</div>
          <div className="psub" style={{ marginBottom: 10 }}>
            مسجّل سابقاً؟ أدخل نفس الاسم والرمز للعودة — حتى أثناء تنظيم المشرف
          </div>
          <div className="card">
            <div className="ig">
              <label className="lbl">🔢 رمز الغرفة (4 أرقام)</label>
              <input
                className="inp big"
                placeholder={ROOM_CODE_PLACEHOLDER}
                maxLength={4}
                value={qJoinInput}
                onChange={(e) => {
                  setQJoinInput(e.target.value.replace(/\D/g, ''));
                  setQJoinErr('');
                }}
              />
            </div>
            <div className="ig">
              <label className="lbl">👤 اسمك</label>
              <input
                className="inp"
                placeholder={GROUP_MEMBER_NAME_PLACEHOLDER}
                value={qMyName}
                onChange={(e) => setQMyName(e.target.value)}
              />
            </div>
            {qJoinErr && <div className="err-msg">⚠️ {qJoinErr}</div>}
            <button type="button" className="btn bg mt2" disabled={qJoinLoading} onClick={() => void joinQumairiRoom()}>
              {qJoinLoading ? '⏳' : '🚀 انضمام / عودة'}
            </button>
          </div>
        </div>
      );
    }

    if(gameScreen==='qumairi_lobby'){return(
<div className="scr"><button className="btn bgh bsm" style={{width:'auto',marginBottom:12}} onClick={()=>setQExitModal(true)}>← رجوع</button>{isAdmin?<FameeriAdminLobby qRoom={qRoom} qPhase={qPhase} qGameState={qGameState} qGList={qGList} qMList={qMList} qGroupName={qGroupName} setQGroupName={setQGroupName} notify={notify} accent={FAMEERI_ACCENT} shareRoomInvite={shareRoomInvite} qSetupOpen={qSetupOpen} setQSetupOpen={setQSetupOpen} qEffectiveSource={qEffectiveSource} qPool={qPool} qBankMeta={qBankMeta} applyQuestionSetup={applyQuestionSetup} assignGroupLeader={assignGroupLeader} QB_GAME_TYPE={QB_GAME_TYPE} authUid={auth.currentUser?.uid} onGoAccount={onGoAccount} />:<><div className="card" style={{textAlign:'center'}}><div style={{fontSize:12,color:'var(--muted)'}}>رمز الغرفة</div><div className="room-code-big" style={{fontSize:28}}>{qRoom}</div></div></>}{!isAdmin&&qPhase==='distributing'&&(()=>{if(!qGroupId||!qMyGroup) return <div className="card" style={{textAlign:'center',padding:20}}><div style={{fontSize:40}}>⏳</div><div style={{fontSize:14,color:'var(--muted)',marginTop:8}}>انتظر المشرف يحدد مجموعتك</div></div>;if(qMyGroup.distributed) return <div className="card" style={{textAlign:'center',padding:20}}><div style={{fontSize:40}}>✅</div><div style={{fontSize:15,fontWeight:900,color:'var(--green)',marginTop:8}}>تم التوزيع — انتظار الباقين</div></div>;if(!isLeader) return <div className="card" style={{textAlign:'center',padding:20}}><div style={{fontSize:40}}>⏳</div><div style={{fontSize:14,color:'var(--muted)',marginTop:8}}>القائد 👑 يوزع — انتظر</div></div>;const total=Object.values(qDistribution).reduce((s,v)=>s+(parseInt(v)||0),0);const remaining=Q_TOTAL-total;return(<><FameeriPlayerLeaderNotice groupName={qMyGroup?.name} phase="distributing" /><div className="card"><div className="ctitle">🌳 وزّع {Q_TOTAL} قميري</div><div style={{textAlign:'center',marginBottom:12}}><div style={{fontFamily:'Cairo',fontSize:32,fontWeight:900,color:remaining===0?'var(--green)':remaining<0?'var(--red)':'var(--fameeri-primary)'}}>{remaining}</div><div style={{fontSize:11,color:'var(--muted)'}}>متبقي</div></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{Q_TREES.map(tree=>(<div key={tree} style={{background:'var(--surface)',borderRadius:10,padding:'10px 8px',textAlign:'center'}}><div style={{fontSize:22}}>🌳</div><div style={{fontSize:11,fontWeight:700,marginTop:2}}>{tree}</div><input type="number" min="0" max="100" className="inp" style={{marginTop:6,padding:'6px',fontSize:16,textAlign:'center',width:'100%'}} value={qDistribution[tree]||''} placeholder="0" onChange={e=>setQDistribution(prev=>({...prev,[tree]:e.target.value}))}/></div>))}</div><button type="button" className="btn bg mt3" disabled={remaining!==0||qDistSubmitting} onClick={()=>void submitQumairiDistribution()}>{qDistSubmitting?'⏳ جاري الحفظ…':remaining===0?'✅ تأكيد':`وزّع ${Math.abs(remaining)}`}</button></div></>);})()}{!isAdmin&&qPhase==='lobby'&&(<>{isLeader&&qGroupId&&<FameeriPlayerLeaderNotice groupName={qMyGroup?.name} phase="lobby" />}<div className="card" style={{textAlign:'center',padding:20}}><div style={{fontSize:40}}>{isLeader&&qGroupId?'👑':'⏳'}</div><div style={{fontSize:14,color:'var(--muted)',marginTop:8}}>{qGroupId?(isLeader?`قائد مجموعة ${qMyGroup?.name||'—'}`:`مجموعتك: ${qMyGroup?.name||'—'}`):'انتظر المشرف'}</div></div></>)}{!isAdmin&&qGroupId&&<FameeriGroupChat qRoom={qRoom} groupId={qGroupId} me={{uid:auth.currentUser?.uid,name:qMyName}} accent={FAMEERI_ACCENT} />}
</div>);}

    if (gameScreen === 'qumairi_play') {
      const myAtks = Object.values(qAttacks || {})
        .filter((a) => a.attackerId === qGroupId || a.targetId === qGroupId)
        .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const shieldAttack =
        qCurrentAttack ||
        (shieldWindow?.winnerGroupId && qGameState?.speedClaims?.[shieldWindow.winnerGroupId]) ||
        null;

      if (isAdmin) {
        return (
          <div className="scr">
            <button className="btn bgh bsm" style={{ width: 'auto', marginBottom: 12 }} onClick={() => setQExitModal(true)}>
              ← رجوع
            </button>
            <FameeriAdminPlay
              qRoom={qRoom}
              qGameState={qGameState}
              qGList={qGList}
              qGroups={qGroups}
              qAttacks={qAttacks}
              qReveal={qReveal}
              setQReveal={setQReveal}
              qCountdown={qCountdown}
              qActiveQuestion={qActiveQuestion}
              qActiveAnswer={qActiveAnswer}
              qAdminGroupAnswers={qAdminGroupAnswers}
              qAdminAnswerContext={qAdminAnswerContext}
              qAdminPendingGroups={qAdminPendingGroups}
              toggleQuestionReveal={toggleQuestionReveal}
              hideQuestionFromPlayers={hideQuestionFromPlayers}
              drawNextQuestion={drawNextQuestion}
              qPool={qPool}
              speedWinSelect={speedWinSelect}
              setSpeedWinSelect={setSpeedWinSelect}
              speedRoundSecs={speedRoundSecs}
              setSpeedRoundSecs={setSpeedRoundSecs}
              qCustomTimer={qCustomTimer}
              setQCustomTimer={setQCustomTimer}
              notify={notify}
              accent={FAMEERI_ACCENT}
              recordRoundCompleted={recordRoundCompleted}
              onEndGame={async () => {
                if (qRoom) recordSessionEnd('fameeri', qRoom, true).catch(() => {});
                await update(dbRef(db, `qrooms/${qRoom}/game`), { phase: 'ended' });
                playSound('applause');
              }}
              onOpenReport={() => {
                openFameeriPrintableReport({ qRoom, qGList, qAttacks });
                notify('✅ تم فتح التقرير — للحفظ كـ PDF استخدم طباعة ثم «حفظ كـ PDF»', 'success');
              }}
            />
          </div>
        );
      }

      return (
        <FameeriPlayerPlay
          qReveal={qReveal}
          qTurnOverlay={qTurnOverlay}
          qTimer={qTimer}
          qCountdown={qCountdown}
          qCurrentAttack={qCurrentAttack}
          qGameState={qGameState}
          qAnswerPhaseDuringTimer={qAnswerPhaseDuringTimer}
          qMyGroup={qMyGroup}
          qGroupId={qGroupId}
          isLeader={isLeader}
          qActiveQuestion={qActiveQuestion}
          qCanAnswer={qCanAnswer}
          qMyPick={qMyPick}
          qGroupFinal={qGroupFinal}
          qGroupTally={qGroupTally}
          suggestAnswer={suggestAnswer}
          confirmAnswer={confirmAnswer}
          accent={FAMEERI_ACCENT}
          qRoom={qRoom}
          qMyName={qMyName}
          authUid={auth.currentUser?.uid}
          qAttacks={qAttacks}
          qOtherGroups={qOtherGroups}
          qAttackTarget={qAttackTarget}
          setQAttackTarget={setQAttackTarget}
          submitFameeriAttack={submitFameeriAttack}
          qMySpeedClaim={qMySpeedClaim}
          shieldWindow={shieldWindow}
          shieldCountdown={shieldCountdown}
          shieldUsed={qMyGroup?.shieldUsed}
          shieldAttack={shieldAttack}
          onActivateShield={activateShield}
          shieldActivating={shieldActivating}
          myAtks={myAtks}
        />
      );
    }

    if(gameScreen==='qumairi_results'){const sorted=[...qGList].sort((a,b)=>(b.totalRemaining||0)-(a.totalRemaining||0));return(<div className="scr"><div style={{textAlign:'center',padding:'16px 0'}}><div style={{fontSize:60,animation:'bnc 1s infinite'}}>🏆</div><div className="ptitle" style={{fontSize:24}}>نتائج الجولة</div></div><div className="sg sg3" style={{marginBottom:12}}><div className="sbox"><div className="snum">{sorted.length}</div><div className="slbl">مجموعات</div></div><div className="sbox"><div className="snum" style={{color:'var(--red)'}}>{Object.values(qAttacks||{}).filter(a=>a.result==='success').reduce((s,a)=>s+(a.hunted||0),0)}</div><div className="slbl">قميري صيدت</div></div><div className="sbox"><div className="snum" style={{color:'var(--green)'}}>{Object.keys(qAttacks||{}).length}</div><div className="slbl">هجمات</div></div></div>{[...sorted].reverse().map((g,i)=>{const rank=sorted.length-i;const isWinner=rank===1;return(<div key={g.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:isWinner?'linear-gradient(135deg,rgba(240,192,64,.2),rgba(255,140,0,.1))':'var(--surface)',border:isWinner?'2px solid var(--fameeri-primary)':'1px solid var(--border-faint)',borderRadius:14,marginBottom:8}}><div style={{fontFamily:'Cairo',fontSize:isWinner?28:20,fontWeight:900,width:34,color:isWinner?'var(--fameeri-primary)':'var(--muted)'}}>{isWinner?'👑':rank}</div><div style={{flex:1}}><div style={{fontWeight:900,fontSize:isWinner?16:14}}>{g.name}</div></div><div style={{fontFamily:'Cairo',fontSize:isWinner?28:20,fontWeight:900,color:isWinner?'var(--fameeri-primary)':'var(--text)'}}>{g.totalRemaining||0}</div></div>);})}<button className="btn bgh mt3" onClick={()=>{setGameScreen('home');setSelectedGame(null);setQRoom('');setQRole(null);setQGroupId(null);clearAdminSessionLocal(qRoom);localStorage.removeItem('ng_qumairi');}}>🏟️ ساحة الألعاب</button></div>);}
    return null;
  };

  return (
    <div className="fameeri-theme">
      {qRoom && (qReveal || qTurnOverlay || qTimer) && (
        <button
          type="button"
          onClick={() => setQExitModal(true)}
          style={{
            position: 'fixed',
            top: 10,
            insetInlineStart: 10,
            zIndex: 360,
            background: 'rgba(0,0,0,.55)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,.3)',
            borderRadius: 999,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(4px)',
          }}
        >
          ✕ خروج
        </button>
      )}
      {qExitModal && (
        <div className="mbg" style={{ zIndex: 400 }}>
          <div className="modal">
            <div className="micn">🦅</div>
            <div className="mtitle">{isAdmin ? 'الخروج من إدارة المسابقة؟' : 'الانسحاب من المسابقة؟'}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 }}>
              {isAdmin
                ? 'تغادر الشاشة فقط، ويمكنك العودة لاحقًا بنفس الجهاز ما دامت الغرفة قائمة.'
                : 'الانسحاب يُخرجك من المسابقة نهائيًا ويعيدك لساحة الألعاب — دون أي حاجة لحذف بيانات المتصفح.'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button className="btn bg" onClick={() => setQExitModal(false)}>
                ↩️ العودة للّعبة
              </button>
              <button
                className="btn br"
                onClick={() => {
                  setQExitModal(false);
                  if (isAdmin && qRoom) recordSessionEnd('fameeri', qRoom, false).catch(() => {});
                  setGameScreen('home');
                  setSelectedGame(null);
                  setQRoom('');
                  setQRole(null);
                  setQGroupId(null);
                  setQDistribution({});
                  clearAdminSessionLocal(qRoom);
                  localStorage.removeItem('ng_qumairi');
                  notify('تم الخروج من المسابقة', 'info');
                }}
              >
                🚪 انسحاب وخروج
              </button>
            </div>
          </div>
        </div>
      )}
      {renderMain()}
    </div>
  );
});

export default FameeriGame;
