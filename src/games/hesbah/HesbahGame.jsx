import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';
import { ref as dbRef, set, get, update, push, onValue, off, remove } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { genCode, playSound } from '../../core/helpers';
import '../../styles/hesbah.css';
import { buildGameSessionTracking, recordRoundCompleted, recordSessionEnd } from '../../core/sessionStats';
import { AV_COLORS } from '../../core/constants';
import QuickOnboarding from '../../components/onboarding/QuickOnboarding';
import { ROOM_CODE_PLACEHOLDER, PLAYER_DISPLAY_NAME_PLACEHOLDER } from '../../core/formLabels';
import HesbahSetup from './HesbahSetup';
import HesbahLobby from './HesbahLobby';
import HesbahPlay from './HesbahPlay';
import HesbahAdminLive from './HesbahAdminLive';
import HesbahResults from './HesbahResults';
import HesbahFinal from './HesbahFinal';
import HesbahConfirmModal from './HesbahConfirmModal';
import HesbahExitSheet from './HesbahExitSheet';
import HesbahPlayerHud from './HesbahPlayerHud';
import HesbahLeaderboardList from './HesbahLeaderboardList';
import HesbahTopNav from './HesbahTopNav';
import {
  readSavedHesbah,
  persistHesbahSession,
  clearHesbahSession,
  isActiveHesbahPlayer,
  findActivePlayerByName,
  findLeftPlayerByName,
  HESBAH_STORAGE_KEY,
  hesbahPlayerPayload,
  buildScoreBoard,
  questionDurationSec,
  clampCustomQuestionSecs,
  MIN_QUESTION_SECS,
  MAX_QUESTION_SECS,
  FINAL_VOTE_SECONDS,
  HOT_STREAK_START_Q,
  HOT_STREAK_NEED,
  HOT_STREAK_BONUS,
  computeFinalVoteWinner,
  groupDuplicateAnswers,
  normalizeAnswer,
  gradedPoints,
  BOARD_CELL,
  QB_GAME_TYPE,
} from './HesbahHelpers';
import { normalizePoolToStructured } from '../fameeri/fameeriQuestionPool';
import { QSOURCE } from '../../question-bank/questionSession';
import {
  flattenHesbahPool,
  createQuestionCursor,
  countHesbahPool,
  hesbahGameQuestionText,
} from './HesbahQuestions';
import { markHesbahQuestionAsUsed } from './hesbahBankProgress';

function poolStorageKey(room) {
  return `ng_hesbah_pool_${room}`;
}

const HesbahGame = forwardRef(function HesbahGame(
  { notify, setTab, setSelectedGame, canCreateRoom, onRequestActivation, onGameEnd, onHesbahHeaderMeta },
  ref
) {
  void setTab;
  const [savedSession, setSavedSession] = useState(() => readSavedHesbah());
  const [gameScreen, setGameScreen] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [role, setRole] = useState(null);
  const [myId, setMyId] = useState(null);
  const [joinInput, setJoinInput] = useState('');
  const [joinName, setJoinName] = useState(savedSession.myName || '');
  const [joinErr, setJoinErr] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [totalQSetup, setTotalQSetup] = useState(20);

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState({});
  const [answers, setAnswers] = useState({});
  const [hostAnswer, setHostAnswer] = useState(null);
  const [votes, setVotes] = useState({});

  const [answerText, setAnswerText] = useState('');
  const [chosenScore, setChosenScore] = useState(null);
  const [insuranceActive, setInsuranceActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [voteCountdown, setVoteCountdown] = useState(null);

  const [verdicts, setVerdicts] = useState({});
  const [duplicateMarked, setDuplicateMarked] = useState({});
  const [hostDraft, setHostDraft] = useState({ answer: '' });
  const [roundSummary, setRoundSummary] = useState([]);

  const qCursorRef = useRef(null);
  const qBankMetaRef = useRef(null);
  const [adminQMeta, setAdminQMeta] = useState(null);
  const [confirmEarlyEndOpen, setConfirmEarlyEndOpen] = useState(false);
  const [exitSheetOpen, setExitSheetOpen] = useState(false);
  const endPromptRef = useRef(false);
  const pendingOnboardingRef = useRef(null);

  useImperativeHandle(ref, () => ({
    handleHeaderBack: () => {
      if (roomCode && gameScreen !== 'setup' && gameScreen !== 'join') {
        setExitSheetOpen(true);
        return true;
      }
      if (gameScreen === 'join' || gameScreen === 'setup') {
        setGameScreen('home');
        return true;
      }
      return false;
    },
  }));

  const me = myId ? players[myId] : null;
  const phase = game?.phase || 'lobby';

  const prevQuestionRef = useRef(null);
  const prevSubmittedRef = useRef(undefined);
  const timeoutRoundRef = useRef(null);

  /** مسح حقل الإجابة عند بدء سؤال جديد (لجميع الأدوار) */
  useEffect(() => {
    if (!game || game.phase !== 'question') return;
    const q = game.currentQ || 0;
    if (prevQuestionRef.current !== null && prevQuestionRef.current !== q) {
      setAnswerText('');
      setChosenScore(null);
      setInsuranceActive(false);
    }
    prevQuestionRef.current = q;
  }, [game?.currentQ, game?.phase]);

  /** مسح الإجابة المحلية عند إعادة ضبط الجولة من Firebase */
  useEffect(() => {
    const sub = me?.submitted;
    if (sub === false && prevSubmittedRef.current === true) {
      setAnswerText('');
      setChosenScore(null);
      setInsuranceActive(false);
    }
    if (sub !== undefined) prevSubmittedRef.current = sub;
  }, [me?.submitted]);

  /** انتهى الوقت دون إرسال — تعليم الدرجة المختارة محلياً */
  useEffect(() => {
    if (role !== 'player' || !myId || !roomCode) return;
    if (game?.phase !== 'grading') {
      timeoutRoundRef.current = null;
      return;
    }
    if (me?.submitted) return;
    const rk = String(game.currentQ || 0);
    if (timeoutRoundRef.current === rk) return;
    timeoutRoundRef.current = rk;
    if (!chosenScore) return;
    const key = String(chosenScore);
    const st = me?.board?.[key];
    if (st === BOARD_CELL.AVAILABLE || st === BOARD_CELL.USED) {
      void update(dbRef(db, `srooms/${roomCode}/players/${myId}/board/${key}`), BOARD_CELL.TIMEOUT).catch(() => {});
    }
  }, [game?.phase, game?.currentQ, me?.submitted, me?.board, chosenScore, role, myId, roomCode]);

  const restorePoolCursor = useCallback((room) => {
    try {
      const raw = localStorage.getItem(poolStorageKey(room));
      if (!raw) return null;
      const { pool, bankMeta } = JSON.parse(raw);
      if (bankMeta) qBankMetaRef.current = bankMeta;
      const flat = flattenHesbahPool(normalizePoolToStructured(pool));
      if (!flat.length) return null;
      return createQuestionCursor(flat);
    } catch {
      return null;
    }
  }, []);

  const gameQuestionPatch = (q, questionSource = game?.questionSource) => ({
    questionText: hesbahGameQuestionText(q, questionSource),
    hostQuestionText: q.hostText || '',
    questionCategory: q.categoryLabel || q.category || 'عام',
    questionType: q.type || 'open_question',
    questionAdminOnly: !!q.adminOnly,
    questionWrittenText: !!q.writtenText,
  });

  /* ── Firebase listeners ── */
  useEffect(() => {
    if (!roomCode) return;
    const gRef = dbRef(db, `srooms/${roomCode}/game`);
    const pRef = dbRef(db, `srooms/${roomCode}/players`);
    const aRef = dbRef(db, `srooms/${roomCode}/answers`);
    const hRef = dbRef(db, `srooms/${roomCode}/hostAnswer`);
    const vRef = dbRef(db, `srooms/${roomCode}/votes`);

    const onG = (snap) => setGame(snap.val());
    const onP = (snap) => setPlayers(snap.val() || {});
    const onA = (snap) => setAnswers(snap.val() || {});
    const onH = (snap) => setHostAnswer(snap.val());
    const onV = (snap) => setVotes(snap.val() || {});

    onValue(gRef, onG);
    onValue(pRef, onP);
    onValue(aRef, onA);
    onValue(hRef, onH);
    onValue(vRef, onV);

    return () => {
      off(gRef, 'value', onG);
      off(pRef, 'value', onP);
      off(aRef, 'value', onA);
      off(hRef, 'value', onH);
      off(vRef, 'value', onV);
    };
  }, [roomCode]);

  useEffect(() => {
    const inRoom = !!roomCode && gameScreen !== 'setup' && gameScreen !== 'join';
    onHesbahHeaderMeta?.({ inRoom });
    return () => onHesbahHeaderMeta?.({ inRoom: false });
  }, [roomCode, gameScreen, onHesbahHeaderMeta]);

  /* ── Screen sync from phase ── */
  useEffect(() => {
    if (!roomCode || !game) return;
    if (game.finalVoteActive) {
      setGameScreen('play');
      return;
    }
    if (phase === 'lobby') setGameScreen('lobby');
    else if (phase === 'roundResult') setGameScreen('roundResult');
    else if (phase === 'leaderboard') setGameScreen('leaderboard');
    else if (phase === 'final') setGameScreen('final');
    else if (role === 'admin' && (phase === 'question' || phase === 'grading')) setGameScreen('adminLive');
    else if (phase === 'question' || phase === 'grading') setGameScreen('play');
  }, [phase, roomCode, game, role]);

  /* ── Question countdown ── */
  useEffect(() => {
    const dl = game?.deadline;
    if (!dl || phase !== 'question') {
      setCountdown(null);
      return;
    }
    const tick = () => {
      const rem = Math.ceil((dl - Date.now()) / 1000);
      setCountdown(Math.max(0, rem));
      if (rem <= 3 && rem > 0) playSound('countdown_last');
      else if (rem <= 10 && rem > 0) playSound('countdown');
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [game?.deadline, phase]);

  /* ── Auto grading when timer hits 0 (admin) ── */
  useEffect(() => {
    if (role !== 'admin' || phase !== 'question' || !game?.deadline) return;
    if (Date.now() < game.deadline) return;
    void update(dbRef(db, `srooms/${roomCode}/game`), { phase: 'grading' });
  }, [countdown, role, phase, game?.deadline, roomCode]);

  /* ── Final vote countdown (admin closes vote) ── */
  useEffect(() => {
    if (!game?.finalVoteActive || !game?.finalVoteDeadline) {
      setVoteCountdown(null);
      return;
    }
    const tick = () => {
      const rem = Math.ceil((game.finalVoteDeadline - Date.now()) / 1000);
      setVoteCountdown(Math.max(0, rem));
    };
    tick();
    const id = setInterval(tick, 300);
    return () => clearInterval(id);
  }, [game?.finalVoteActive, game?.finalVoteDeadline]);

  useEffect(() => {
    if (role !== 'admin' || !game?.finalVoteActive || voteCountdown !== 0) return;
    void closeFinalVote();
  }, [voteCountdown, game?.finalVoteActive, role]);

  const shareRoomInvite = async (preferWhatsApp = false) => {
    const inviteText = [
      '🎮 ساحة الألعاب — حَسْبة',
      `رمز الغرفة: ${roomCode}`,
      'https://nickname-game38.vercel.app/',
    ].join('\n');
    if (!preferWhatsApp && navigator.share) {
      try {
        await navigator.share({ title: 'حَسْبة', text: inviteText });
        notify('تم فتح المشاركة ✓', 'success');
        return;
      } catch (e) {
        if (e?.name === 'AbortError') return;
      }
    }
    const wa = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
    window.open(wa, '_blank', 'noopener,noreferrer');
  };

  const isPermissionErr = (err) => {
    const s = `${err?.code || ''} ${err?.message || ''}`.toLowerCase();
    return s.includes('permission');
  };

  const createRoom = async ({ source, pool, totalQ, bankMeta = null }) => {
    if (!canCreateRoom) {
      onRequestActivation?.();
      return;
    }
    setCreating(true);
    try {
      try {
        if (typeof auth.authStateReady === 'function') await auth.authStateReady();
      } catch {
        /* ignore */
      }
      const hostUid = auth.currentUser?.uid;
      if (!hostUid) {
        notify('لم يكتمل اتصال الحساب بعد. انتظر ثانيتين ثم أعد المحاولة، أو حدّث الصفحة.', 'error');
        return;
      }

      const code = genCode();
      const poolNorm = normalizePoolToStructured(pool || {});
      if (source !== QSOURCE.EXTERNAL && countHesbahPool(poolNorm) === 0) {
        notify('لا توجد أسئلة صالحة — حمّل البنك أو أضف أسئلة ثم أنشئ الغرفة', 'error');
        return;
      }
      const board = buildScoreBoard(totalQ);
      const adminPid = hostUid;
      await update(dbRef(db), {
        [`srooms/${code}/adminId`]: hostUid,
        [`srooms/${code}/game`]: {
          phase: 'lobby',
          currentQ: 0,
          totalQ,
          questionText: '',
          questionCategory: '',
          deadline: null,
          specialRound: null,
          hotStreak: {},
          finalVoteActive: false,
          finalVoteResult: null,
          hostParticipates: false,
          questionSecs: 20,
          questionSource: source,
          ...buildGameSessionTracking('hesbah'),
        },
        [`srooms/${code}/players/${adminPid}`]: {
          ...hesbahPlayerPayload('المشرف', 0),
          board,
          isHost: true,
        },
      });
      localStorage.setItem(poolStorageKey(code), JSON.stringify({ source, pool: poolNorm, bankMeta }));
      qBankMetaRef.current = bankMeta;
      qCursorRef.current = createQuestionCursor(flattenHesbahPool(poolNorm));
      setRoomCode(code);
      setRole('admin');
      setMyId(adminPid);
      persistHesbahSession({ roomCode: code, role: 'admin', myId: adminPid });
      setGameScreen('lobby');
      notify(`✅ الغرفة: ${code}`, 'gold');
    } catch (err) {
      console.error('[hesbah] createRoom', err);
      if (isPermissionErr(err)) {
        notify(
          'رفض الخادم حفظ الغرفة (صلاحيات). من Firebase Console → Realtime Database → Rules انسخ محتوى «firebase-database-rules.json» من المشروع واضغط Publish، ثم حدّث الصفحة.',
          'error'
        );
      } else {
        notify('تعذّر إنشاء الغرفة. تحقق من الإنترنت ثم أعد المحاولة.', 'error');
      }
    } finally {
      setCreating(false);
    }
  };

  const joinRoom = async () => {
    const code = joinInput.replace(/\D/g, '').slice(0, 4);
    const name = joinName.trim();
    if (code.length !== 4) {
      setJoinErr('رمز الغرفة 4 أرقام');
      return;
    }
    if (!name) {
      setJoinErr('أدخل اسمك');
      return;
    }
    setJoinLoading(true);
    setJoinErr('');
    try {
      const snap = await get(dbRef(db, `srooms/${code}`));
      if (!snap.exists()) {
        setJoinErr('الغرفة غير موجودة');
        return;
      }
      const data = snap.val();
      const totalQ = data.game?.totalQ || 20;
      const board = buildScoreBoard(totalQ);
      const colorIdx = Math.floor(Math.random() * AV_COLORS.length);
      let pid;

      const activeMatch = findActivePlayerByName(data.players, name);
      if (activeMatch) {
        pid = activeMatch[0];
      } else {
        const leftMatch = findLeftPlayerByName(data.players, name);
        if (leftMatch) {
          const [leftId] = leftMatch;
          await remove(dbRef(db, `srooms/${code}/players/${leftId}`));
          await remove(dbRef(db, `srooms/${code}/answers/${leftId}`));
          await remove(dbRef(db, `srooms/${code}/votes/${leftId}`));
        }
        const newRef = push(dbRef(db, `srooms/${code}/players`));
        pid = newRef.key;
        await set(newRef, { ...hesbahPlayerPayload(name, colorIdx), board });
      }

      setRoomCode(code);
      setRole('player');
      setMyId(pid);
      persistHesbahSession({ roomCode: code, role: 'player', myId: pid, myName: name });
      setSavedSession(readSavedHesbah());
      setGameScreen('lobby');
      notify(
        activeMatch ? '✅ عدت للغرفة — تُتابع من حيث نقاطك' : '✅ انضممت للغرفة — بداية جديدة',
        'success'
      );
    } catch {
      setJoinErr('خطأ في الاتصال');
    } finally {
      setJoinLoading(false);
    }
  };

  const reconnectToSavedRoom = async () => {
    const saved = readSavedHesbah();
    const code = saved.roomCode;
    const pid = saved.myId;
    const savedRole = saved.role;
    if (!code || !pid || !savedRole) return;

    try {
      const snap = await get(dbRef(db, `srooms/${code}`));
      if (!snap.exists()) {
        clearHesbahSession();
        setSavedSession({});
        notify('الغرفة لم تعد موجودة', 'error');
        return;
      }
      const data = snap.val();
      const player = data.players?.[pid];
      if (!isActiveHesbahPlayer(player)) {
        clearHesbahSession();
        setSavedSession({});
        notify('انتهت جلستك السابقة — انضم من جديد برمز الغرفة', 'info');
        return;
      }
      if (savedRole === 'admin' && data.adminId !== pid) {
        clearHesbahSession();
        setSavedSession({});
        notify('لا يمكن استعادة جلسة المشرف — أنشئ غرفة جديدة', 'info');
        return;
      }
      setRoomCode(code);
      setRole(savedRole);
      setMyId(pid);
      setGameScreen('lobby');
      notify('✅ عدت للغرفة', 'success');
    } catch {
      notify('تعذّر العودة للغرفة', 'error');
    }
  };

  const purgePlayerFromRoom = async (code, pid) => {
    if (!code || !pid) return;
    try {
      await update(dbRef(db, `srooms/${code}/players/${pid}`), {
        left: true,
        leftAt: Date.now(),
      });
    } catch {
      /* ignore */
    }
    try {
      await remove(dbRef(db, `srooms/${code}/players/${pid}`));
      await remove(dbRef(db, `srooms/${code}/answers/${pid}`));
      await remove(dbRef(db, `srooms/${code}/votes/${pid}`));
    } catch {
      /* left flag يبقى — joinRoom يتجاهل left */
    }
  };

  const drawNextQuestion = () => {
    if (!qCursorRef.current) qCursorRef.current = restorePoolCursor(roomCode);
    const q = qCursorRef.current?.next();
    if (!q) {
      setAdminQMeta(null);
      return {
        hostText: 'سؤال من المشرف',
        playerText: '',
        text: 'سؤال من المشرف',
        category: 'عام',
        categoryLabel: 'عام',
        type: 'open_question',
        adminOnly: false,
        writtenText: false,
        supervisor_notes: '',
      };
    }
    setAdminQMeta(q);
    if (q?.id && qBankMetaRef.current?.filterKey) {
      void markHesbahQuestionAsUsed(qBankMetaRef.current.filterKey, q.id);
    }
    return q;
  };

  const resetRoundAnswers = async () => {
    await remove(dbRef(db, `srooms/${roomCode}/answers`));
    await remove(dbRef(db, `srooms/${roomCode}/hostAnswer`));
    const resets = {};
    Object.keys(players).forEach((pid) => {
      resets[`srooms/${roomCode}/players/${pid}/submittedAnswer`] = null;
      resets[`srooms/${roomCode}/players/${pid}/chosenScore`] = null;
      resets[`srooms/${roomCode}/players/${pid}/insuranceUsed`] = false;
      resets[`srooms/${roomCode}/players/${pid}/submitted`] = false;
    });
    if (Object.keys(resets).length) await update(dbRef(db), resets);
    setVerdicts({});
    setDuplicateMarked({});
    setAnswerText('');
    setChosenScore(null);
    setInsuranceActive(false);
  };

  const startGame = async () => {
    if (!qCursorRef.current) qCursorRef.current = restorePoolCursor(roomCode);
    if (!qCursorRef.current && game?.questionSource !== QSOURCE.EXTERNAL) {
      notify('بنك الأسئلة غير متوفر — أعد إعداد البنك من اللوبي أو أنشئ غرفة جديدة', 'error');
      return;
    }
    const q = drawNextQuestion();
    const board = buildScoreBoard(game?.totalQ || 20);
    const playerPatches = {};
    Object.keys(players).forEach((pid) => {
      playerPatches[`srooms/${roomCode}/players/${pid}/board`] = board;
    });
    await update(dbRef(db), {
      ...playerPatches,
      [`srooms/${roomCode}/game/phase`]: 'question',
      [`srooms/${roomCode}/game/currentQ`]: 1,
      ...Object.fromEntries(
        Object.entries(gameQuestionPatch(q)).map(([k, v]) => [`srooms/${roomCode}/game/${k}`, v])
      ),
      [`srooms/${roomCode}/game/deadline`]: null,
      [`srooms/${roomCode}/game/specialRound`]: null,
      [`srooms/${roomCode}/game/roundSecs`]: null,
    });
    await resetRoundAnswers();
    notify('اضغط «بدء المؤقت» عندما تكون جاهزاً', 'gold');
  };

  const startQuestion = async (qNum, { ultimate = false, fixedScore = null } = {}) => {
    const q = drawNextQuestion();
    await update(dbRef(db, `srooms/${roomCode}/game`), {
      phase: 'question',
      currentQ: qNum,
      ...gameQuestionPatch(q),
      deadline: null,
      roundSecs: null,
      specialRound: ultimate ? null : null,
      finalVoteActive: false,
    });
    if (ultimate && fixedScore) {
      const patches = {};
      Object.keys(players).forEach((pid) => {
        patches[`srooms/${roomCode}/players/${pid}/chosenScore`] = fixedScore;
      });
      await update(dbRef(db), patches);
    }
    await resetRoundAnswers();
  };

  const startFinalVote = async () => {
    await update(dbRef(db, `srooms/${roomCode}/game`), {
      finalVoteActive: true,
      finalVoteDeadline: Date.now() + FINAL_VOTE_SECONDS * 1000,
      phase: 'lobby',
    });
    await remove(dbRef(db, `srooms/${roomCode}/votes`));
    setGameScreen('play');
  };

  const closeFinalVote = async () => {
    const winner = computeFinalVoteWinner(votes);
    await update(dbRef(db, `srooms/${roomCode}/game`), {
      finalVoteActive: false,
      finalVoteResult: winner,
      currentQ: (game?.totalQ || 0) + 1,
    });
    await startQuestion((game?.totalQ || 0) + 1, { ultimate: true, fixedScore: winner });
  };

  const onStartTimer = async () => {
    if (!roomCode || game?.phase !== 'question') return;
    if (game?.deadline && game.deadline > Date.now()) {
      notify('المؤقت يعمل بالفعل', 'error');
      return;
    }
    const sec = questionDurationSec(game);
    await update(dbRef(db, `srooms/${roomCode}/game`), {
      deadline: Date.now() + sec * 1000,
    });
    notify(`⏱️ بدأ المؤقت (${sec} ث)`, 'gold');
  };

  const onSetSpecial = async (mode) => {
    const labels = { blind: 'جولة عميان', speed: 'سرعة قصوى', double: 'كرت مضاعف' };
    const turningOff = game?.specialRound === mode;
    const nextMode = turningOff ? null : mode;
    const patch = { specialRound: nextMode };
    if (game?.deadline && game.deadline > Date.now()) {
      const sec = questionDurationSec({ ...game, specialRound: nextMode });
      patch.deadline = Date.now() + sec * 1000;
    }
    await update(dbRef(db, `srooms/${roomCode}/game`), patch);
    if (turningOff) {
      notify(`تم إلغاء ${labels[mode] || mode}`, 'gold');
      return;
    }
    const previewSec = questionDurationSec({ ...game, specialRound: nextMode });
    notify(
      game?.deadline && game.deadline > Date.now()
        ? `تم تفعيل ${labels[mode] || mode} — المؤقت ${previewSec}ث`
        : `تم تجهيز ${labels[mode] || mode} — يُطبَّق عند بدء المؤقت (${previewSec}ث)`,
      'gold'
    );
  };

  const onEndTimer = async () => {
    await update(dbRef(db, `srooms/${roomCode}/game`), { phase: 'grading', deadline: Date.now() });
  };

  const submitAnswer = async () => {
    if (!myId || me?.submitted) return;
    if (!game?.deadline || game.deadline <= Date.now()) {
      notify('انتظر حتى يبدأ المشرف المؤقت', 'gold');
      return;
    }
    const text = answerText.trim();
    const score = game?.finalVoteResult ? game.finalVoteResult : chosenScore;
    if (!text || !score) return;
    setSubmitting(true);
    try {
      const usedInsurance = insuranceActive && (me?.insuranceLeft || 0) > 0;
      const board = { ...(me.board || {}) };
      const key = String(score);
      if (!game?.finalVoteResult) board[key] = BOARD_CELL.USED;

      await update(dbRef(db, `srooms/${roomCode}/players/${myId}`), {
        submittedAnswer: text,
        chosenScore: score,
        insuranceUsed: usedInsurance,
        submitted: true,
        board,
        ...(usedInsurance ? { insuranceLeft: Math.max(0, (me.insuranceLeft || 0) - 1) } : {}),
      });
      await set(dbRef(db, `srooms/${roomCode}/answers/${myId}`), {
        answer: text,
        chosenScore: score,
        insuranceUsed: usedInsurance,
        ts: Date.now(),
      });
      notify('✅ تم الإرسال', 'success');
    } catch {
      notify('تعذّر الإرسال', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const setQuestionSecs = async (secs) => {
    if (!roomCode || game?.phase !== 'lobby') return;
    const n = clampCustomQuestionSecs(secs);
    if (!n) {
      notify(`المدة بين ${MIN_QUESTION_SECS} و ${MAX_QUESTION_SECS} ثانية`, 'error');
      return;
    }
    await update(dbRef(db, `srooms/${roomCode}/game`), { questionSecs: n });
    notify(`⏱️ المدة الافتراضية: ${n} ثانية`, 'gold');
  };

  const setRoundSecs = async (secs) => {
    if (!roomCode || game?.phase !== 'question' || game?.deadline) return;
    const n = clampCustomQuestionSecs(secs);
    if (!n) {
      notify(`المدة بين ${MIN_QUESTION_SECS} و ${MAX_QUESTION_SECS} ثانية`, 'error');
      return;
    }
    await update(dbRef(db, `srooms/${roomCode}/game`), { roundSecs: n });
    notify(`⏱️ مدة هذا السؤال: ${n} ثانية`, 'gold');
  };

  const clearRoundSecs = async () => {
    if (!roomCode) return;
    await update(dbRef(db, `srooms/${roomCode}/game`), { roundSecs: null });
    notify('↩️ مدة السؤال = الافتراضي', 'gold');
  };

  const setHostParticipates = async (value) => {
    if (!roomCode || game?.phase !== 'lobby') return;
    await update(dbRef(db, `srooms/${roomCode}/game`), { hostParticipates: !!value });
    if (!value) await remove(dbRef(db, `srooms/${roomCode}/hostAnswer`));
    notify(value ? '👑 ستشارك بإجابة عرضية (لا تُحسب)' : '👑 وضع الإدارة فقط — بدون إجابات', 'gold');
  };

  const onHostSubmit = async () => {
    if (!game?.hostParticipates) return;
    if (!hostDraft.answer?.trim()) return;
    await set(dbRef(db, `srooms/${roomCode}/hostAnswer`), {
      answer: hostDraft.answer.trim(),
      ts: Date.now(),
    });
    setHostDraft({ answer: '' });
    notify('تم إرسال إجابة العرض', 'success');
  };

  const applyGrading = async () => {
    const dupGroups = groupDuplicateAnswers(
      answers,
      players,
      game?.hostParticipates ? hostAnswer : null
    );
    const dupKeys = new Set(dupGroups.map((g) => normalizeAnswer(g.answer)));
    const spec = game?.specialRound;
    const currentQ = game?.currentQ || 1;
    const summary = [];
    const playerUpdates = {};
    const hotStreak = { ...(game?.hotStreak || {}) };

    Object.entries(answers).forEach(([pid, row]) => {
      const p = players[pid] || {};
      const key = normalizeAnswer(row.answer);
      const v = verdicts[pid];
      let delta = 0;
      let correct = false;
      const base = row.chosenScore || 0;

      if (dupKeys.has(key)) {
        const marked = duplicateMarked[key];
        if (marked) {
          delta = row.insuranceUsed ? Math.floor(base / 2) : 0;
        }
      } else if (v === 'correct') {
        correct = true;
        delta = gradedPoints(base, true, spec, row.insuranceUsed);
        const bKey = String(base);
        const board = { ...(p.board || {}) };
        board[bKey] = spec === 'double' ? BOARD_CELL.DOUBLE_WON : BOARD_CELL.WON;
        playerUpdates[`srooms/${roomCode}/players/${pid}/board`] = board;
        if (currentQ >= HOT_STREAK_START_Q) {
          const streak = (p.consecutiveCorrect || 0) + 1;
          let bonus = 0;
          let onFire = !!p.isOnFire;
          if (streak >= HOT_STREAK_NEED) onFire = true;
          if (onFire && streak >= HOT_STREAK_NEED + 1) bonus = HOT_STREAK_BONUS;
          playerUpdates[`srooms/${roomCode}/players/${pid}/consecutiveCorrect`] = streak;
          playerUpdates[`srooms/${roomCode}/players/${pid}/isOnFire`] = onFire;
          hotStreak[pid] = streak;
          delta += bonus;
        }
      } else if (v === 'wrong') {
        delta = gradedPoints(base, false, spec, false);
        const bKey = String(base);
        const board = { ...(p.board || {}) };
        board[bKey] = BOARD_CELL.BURNED;
        playerUpdates[`srooms/${roomCode}/players/${pid}/board`] = board;
        playerUpdates[`srooms/${roomCode}/players/${pid}/consecutiveCorrect`] = 0;
        playerUpdates[`srooms/${roomCode}/players/${pid}/isOnFire`] = false;
        hotStreak[pid] = 0;
      }

      if (dupKeys.has(key) && duplicateMarked[key]) {
        const bKey = String(base);
        const board = { ...(playerUpdates[`srooms/${roomCode}/players/${pid}/board`] || p.board || {}) };
        board[bKey] = BOARD_CELL.BURNED;
        playerUpdates[`srooms/${roomCode}/players/${pid}/board`] = board;
        playerUpdates[`srooms/${roomCode}/players/${pid}/consecutiveCorrect`] = 0;
        playerUpdates[`srooms/${roomCode}/players/${pid}/isOnFire`] = false;
        hotStreak[pid] = 0;
      }

      const isDupMarked = dupKeys.has(key) && duplicateMarked[key];
      if (delta !== 0 || v === 'correct' || v === 'wrong' || isDupMarked) {
        const newTotal = (p.totalScore || 0) + delta;
        playerUpdates[`srooms/${roomCode}/players/${pid}/totalScore`] = newTotal;
        summary.push({
          playerId: pid,
          name: p.name,
          player: p,
          delta,
          correct,
        });
      }
    });

    try {
      await update(dbRef(db), {
        ...playerUpdates,
        [`srooms/${roomCode}/game/phase`]: 'roundResult',
        [`srooms/${roomCode}/game/hotStreak`]: hotStreak,
        [`srooms/${roomCode}/game/specialRound`]: null,
      });
      setRoundSummary(summary);
      await recordRoundCompleted('hesbah', roomCode);
    } catch (err) {
      console.error('[hesbah] applyGrading', err);
      notify('تعذّر حفظ النتيجة. تحقق من الاتصال ثم أعد المحاولة.', 'error');
    }
  };

  const onShowResult = () => void applyGrading();
  const onLeaderboard = async () => {
    await update(dbRef(db, `srooms/${roomCode}/game`), { phase: 'leaderboard' });
  };

  const onNextQuestion = async () => {
    const total = game?.totalQ || 20;
    const cur = game?.currentQ || 0;
    if (game?.finalVoteResult && cur > total) {
      await update(dbRef(db, `srooms/${roomCode}/game`), { phase: 'final' });
      return;
    }
    if (cur >= total && !game?.finalVoteResult) {
      await startFinalVote();
      return;
    }
    await startQuestion(cur + 1);
  };

  const endGame = async () => {
    if (endPromptRef.current && phase === 'final') return;
    await recordSessionEnd('hesbah', roomCode, true);
    if (!endPromptRef.current) {
      endPromptRef.current = true;
      onGameEnd?.({ game: 'hesbah', roomCode });
    }
    playSound('victory');
  };

  const requestEarlyEnd = async () => {
    try {
      await update(dbRef(db, `srooms/${roomCode}/game`), {
        phase: 'final',
        endedEarly: true,
        endedAt: Date.now(),
      });
      notify('🏆 تم إعلان الفائز — استمتعوا بالاحتفال!', 'gold');
    } catch {
      notify('تعذّر إنهاء المسابقة', 'error');
    }
  };

  const canEarlyEnd =
    !!roomCode &&
    role === 'admin' &&
    phase !== 'final' &&
    phase !== 'lobby' &&
    (game?.currentQ || 0) >= 1;

  const onVote = async (value) => {
    if (!myId || votes[myId]) return;
    await set(dbRef(db, `srooms/${roomCode}/votes/${myId}`), value);
  };

  const leaveToArena = () => {
    clearHesbahSession();
    setSavedSession({});
    setRoomCode('');
    setRole(null);
    setMyId(null);
    setSelectedGame(null);
    setGameScreen('home');
  };

  const openExitSheet = () => setExitSheetOpen(true);

  const withdrawFromGame = async () => {
    setExitSheetOpen(false);
    const code = roomCode;
    const withdrawingRole = role;
    const pid = myId;

    try {
      if (pid && code) {
        await purgePlayerFromRoom(code, pid);
      }
      if (withdrawingRole === 'admin' && code) {
        await recordSessionEnd('hesbah', code, false);
      }
    } catch {
      /* ignore */
    }

    if (code) {
      try {
        localStorage.removeItem(poolStorageKey(code));
      } catch {
        /* ignore */
      }
    }

    clearHesbahSession();
    setSavedSession({});
    setRoomCode('');
    setRole(null);
    setMyId(null);
    setGame(null);
    setPlayers({});
    setGameScreen('home');
    setSelectedGame(null);
    notify(
      withdrawingRole === 'admin'
        ? 'غادرت الغرفة — اللاعبون ما زالوا متصلين'
        : 'انسحبت — عند العودة تبدأ من جديد بنفس الاسم',
      'info'
    );
  };

  useEffect(() => {
    if (phase === 'final' && role === 'admin') void endGame();
  }, [phase, role]);

  const renderMain = () => {
    if (showOnboarding) {
      return (
        <QuickOnboarding
          game="hesbah"
          role={showOnboarding}
          onDismiss={() => {
            const r = showOnboarding;
            setShowOnboarding(null);
            if (r === 'admin') setGameScreen('setup');
            else setGameScreen('join');
          }}
        />
      );
    }

    if (gameScreen === 'home') {
      return (
        <div className="scr hesbah-theme hesbah-setup-screen">
          <div className="hesbah-sticky-chrome">
            <HesbahTopNav onBack={() => setSelectedGame(null)} />
          </div>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 48 }}>🎯</div>
            <div className="ptitle">حَسْبة</div>
            <span className="hesbah-hero-badge">🎯 ساحة حَسْبة — كل درجة رهان</span>
            <div className="psub">اربط السؤال برقم درجة — صوّب بذكاء قبل أن يُسرق أحد درجتك</div>
          </div>
          {savedSession.roomCode && !roomCode && (
            <button type="button" className="btn bo" onClick={() => void reconnectToSavedRoom()}>
              🔙 العودة للغرفة ({savedSession.roomCode})
            </button>
          )}
          <button type="button" className="btn bg" onClick={() => (canCreateRoom ? setShowOnboarding('admin') : onRequestActivation?.())}>
            👑 إنشاء غرفة
          </button>
          <button type="button" className="btn bo mt2" onClick={() => setShowOnboarding('player')}>
            🎮 انضمام برمز الغرفة
          </button>
        </div>
      );
    }

    if (gameScreen === 'setup') {
      return (
        <HesbahSetup
          totalQ={totalQSetup}
          setTotalQ={setTotalQSetup}
          creating={creating}
          notify={notify}
          authUid={auth.currentUser?.uid}
          onGoAccount={() => setTab?.('account')}
          onBack={() => setGameScreen('home')}
          onCreateRoom={createRoom}
        />
      );
    }

    if (gameScreen === 'join') {
      return (
        <div className="scr hesbah-theme hesbah-setup-screen">
          <div className="hesbah-sticky-chrome">
            <HesbahTopNav onBack={() => setGameScreen('home')} />
          </div>
          <div className="ptitle">انضمام — حَسْبة</div>
          <div className="card">
            <label className="lbl">رمز الغرفة</label>
            <input
              className="inp big"
              maxLength={4}
              placeholder={ROOM_CODE_PLACEHOLDER}
              value={joinInput}
              onChange={(e) => { setJoinInput(e.target.value.replace(/\D/g, '')); setJoinErr(''); }}
            />
            <label className="lbl">اسمك</label>
            <input className="inp" placeholder={PLAYER_DISPLAY_NAME_PLACEHOLDER} value={joinName} onChange={(e) => setJoinName(e.target.value)} />
            {joinErr && <div className="err-msg">{joinErr}</div>}
            <button type="button" className="btn bg mt2" disabled={joinLoading} onClick={() => void joinRoom()}>
              {joinLoading ? '⏳' : '🚀 انضمام'}
            </button>
          </div>
        </div>
      );
    }

    if (gameScreen === 'lobby') {
      return (
        <HesbahLobby
          roomCode={roomCode}
          role={role}
          players={players}
          me={me}
          myId={myId}
          totalQ={game?.totalQ}
          hostParticipates={!!game?.hostParticipates}
          onHostParticipatesChange={(v) => void setHostParticipates(v)}
          questionSecs={game?.questionSecs ?? 20}
          onQuestionSecsChange={(s) => void setQuestionSecs(s)}
          onStart={() => void startGame()}
          onShare={shareRoomInvite}
          onExitRequest={openExitSheet}
        />
      );
    }

    if (gameScreen === 'play') {
      return (
        <HesbahPlay
          roomCode={roomCode}
          game={game}
          me={me}
          myId={myId}
          players={players}
          answers={answers}
          hostAnswer={hostAnswer}
          role={role}
          answerText={answerText}
          setAnswerText={setAnswerText}
          chosenScore={chosenScore}
          setChosenScore={setChosenScore}
          insuranceActive={insuranceActive}
          setInsuranceActive={setInsuranceActive}
          onSubmit={() => void submitAnswer()}
          submitting={submitting}
          finalVoteActive={game?.finalVoteActive}
          myVote={votes[myId]}
          onVote={(v) => void onVote(v)}
          voteCountdown={voteCountdown}
          onExitRequest={openExitSheet}
        />
      );
    }

    if (gameScreen === 'adminLive') {
      return (
        <HesbahAdminLive
          roomCode={roomCode}
          game={game}
          players={players}
          answers={answers}
          hostAnswer={hostAnswer}
          supervisorNotes={adminQMeta?.supervisor_notes || ''}
          countdown={countdown}
          onSetSpecial={onSetSpecial}
          hostParticipates={!!game?.hostParticipates}
          onHostSubmit={() => void onHostSubmit()}
          hostDraft={hostDraft}
          setHostDraft={setHostDraft}
          verdicts={verdicts}
          setVerdicts={setVerdicts}
          duplicateMarked={duplicateMarked}
          setDuplicateMarked={setDuplicateMarked}
          onShowResult={onShowResult}
          onLeaderboard={() => void onLeaderboard()}
          onNextQuestion={() => void onNextQuestion()}
          onStartTimer={() => void onStartTimer()}
          onEndTimer={() => void onEndTimer()}
          onRoundSecsChange={(s) => void setRoundSecs(s)}
          onClearRoundSecs={() => void clearRoundSecs()}
          onRequestEarlyEnd={() => void requestEarlyEnd()}
          canEarlyEnd={canEarlyEnd}
          onExitRequest={openExitSheet}
          notify={notify}
        />
      );
    }

    if (gameScreen === 'roundResult') {
      return (
        <HesbahResults
          roomCode={roomCode}
          game={game}
          players={players}
          me={me}
          myId={myId}
          roundSummary={roundSummary}
          showHud={role !== 'admin'}
          onExitRequest={openExitSheet}
          onContinue={() => (role === 'admin' ? void onLeaderboard() : setGameScreen('leaderboard'))}
        />
      );
    }

    if (gameScreen === 'leaderboard') {
      if (role === 'admin') {
        return (
          <div className="scr hesbah-theme hesbah-admin">
            <div className="hesbah-sticky-chrome">
              <HesbahTopNav onBack={openExitSheet} />
            </div>
            <HesbahLeaderboardList
              players={players}
              myId={myId}
              roomCode={roomCode}
              game={game}
            />
            <button type="button" className="btn bg" onClick={() => void onNextQuestion()}>
              ➡️ السؤال التالي
            </button>
            {canEarlyEnd && (
              <button type="button" className="btn br mt2" onClick={() => setConfirmEarlyEndOpen(true)}>
                🏁 إنهاء المسابقة وإعلان الفائز
              </button>
            )}
          </div>
        );
      }
      return (
        <HesbahPlayerHud
          roomCode={roomCode}
          me={me}
          myId={myId}
          game={game}
          players={players}
          initialTab="rank"
          onExitRequest={openExitSheet}
          rankFooter={
            <p className="hesbah-player-wait">⏳ انتظر المشرف للجولة التالية…</p>
          }
        />
      );
    }

    if (gameScreen === 'final' && role === 'player') {
      return (
        <HesbahPlayerHud
          roomCode={roomCode}
          me={me}
          myId={myId}
          game={game}
          players={players}
          onExitRequest={openExitSheet}
          hideTabs
        >
          <HesbahFinal
            players={players}
            roomCode={roomCode}
            game={game}
            notify={notify}
            hideExitBar
            onHome={leaveToArena}
          />
        </HesbahPlayerHud>
      );
    }

    if (gameScreen === 'final') {
      return (
        <div className="scr hesbah-theme hesbah-admin">
          <div className="hesbah-sticky-chrome">
            <HesbahTopNav onBack={openExitSheet} />
          </div>
          <HesbahFinal
            players={players}
            roomCode={roomCode}
            game={game}
            notify={notify}
            hideExitBar
            onHome={leaveToArena}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderMain()}
      <HesbahConfirmModal
        open={confirmEarlyEndOpen}
        title="إنهاء المسابقة؟"
        message={`هل أنت متأكد من إنهاء المسابقة وإعلان الفائز؟${
          (game?.currentQ || 0) < (game?.totalQ || 0)
            ? ` (تبقّى ${(game?.totalQ || 0) - (game?.currentQ || 0)} جولة)`
            : ''
        }`}
        confirmLabel="نعم، أعلن الفائز"
        cancelLabel="متابعة اللعب"
        danger
        onCancel={() => setConfirmEarlyEndOpen(false)}
        onConfirm={() => {
          setConfirmEarlyEndOpen(false);
          void requestEarlyEnd();
        }}
      />
      <HesbahExitSheet
        open={exitSheetOpen}
        role={role}
        roomCode={roomCode}
        phase={phase}
        onContinue={() => setExitSheetOpen(false)}
        onWithdraw={() => void withdrawFromGame()}
        onClose={() => setExitSheetOpen(false)}
      />
    </>
  );
});

export default HesbahGame;
