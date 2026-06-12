import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo } from 'react';
import { ref as dbRef, set, get, update, push, onValue, off, remove } from 'firebase/database';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { genCode, playSound } from '../../core/helpers';
import '../../styles/hesbah.css';
import { buildGameSessionTracking, recordRoundCompleted, recordSessionEnd } from '../../core/sessionStats';
import { fetchArenaFieldsForJoin } from '../../core/arenaProfile';
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
import HesbahPlayerLeaderboard from './HesbahPlayerLeaderboard';
import HesbahTopNav from './HesbahTopNav';
import HesbahGuideModal from './HesbahGuideModal';
import { GameSessionChecking } from '../../shared/GameTopNav';
import GameCancelledScreen from '../../shared/GameCancelledScreen';
import { hasHesbahCompetitionStarted, isGameCancelled } from '../../shared/gameCompetition';
import { formatOtherSessionsHint, getOtherActiveSessions } from '../../shared/gameSessionRegistry';
import {
  readSavedHesbah,
  persistHesbahSession,
  clearHesbahSession,
  isActiveHesbahPlayer,
  findActivePlayerByName,
  findLeftPlayerByName,
  HESBAH_STORAGE_KEY,
  hesbahPlayerPayload,
  sortedHesbahPlayers,
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
  answerDedupeKey,
  isShieldProtectedDuplicate,
  gradedPoints,
  BOARD_CELL,
  boardCellForCorrect,
  pickRandomAvailableScore,
  pickHighestAvailableScore,
  siegeMinScore,
  HESBAH_SPECIAL_LABELS,
  isScorelessPickSpecial,
  isRiskSpecial,
  riskDeduction,
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
  const [sessionGate, setSessionGate] = useState(() => (readSavedHesbah().roomCode ? 'checking' : 'ready'));
  const [gameScreen, setGameScreen] = useState('home');
  const [showOnboarding, setShowOnboarding] = useState(null);
  const [showGuide, setShowGuide] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [role, setRole] = useState(null);
  const [myId, setMyId] = useState(null);
  const [joinInput, setJoinInput] = useState('');
  const [joinName, setJoinName] = useState(savedSession.myName || '');
  const [joinErr, setJoinErr] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [totalQSetup, setTotalQSetup] = useState(null);

  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState({});
  const [answers, setAnswers] = useState({});
  const [hostAnswer, setHostAnswer] = useState(null);
  const [votes, setVotes] = useState({});

  const [answerText, setAnswerText] = useState('');
  const [chosenScore, setChosenScore] = useState(null);
  const [shieldActive, setShieldActive] = useState(false);
  const [confidenceActive, setConfidenceActive] = useState(false);
  const [editPending, setEditPending] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [voteCountdown, setVoteCountdown] = useState(null);

  const [verdicts, setVerdicts] = useState({});
  const [duplicateMarked, setDuplicateMarked] = useState({});
  const [hostDraft, setHostDraft] = useState({ answer: '' });
  const [playerRoundView, setPlayerRoundView] = useState('result');

  const qCursorRef = useRef(null);
  const qBankMetaRef = useRef(null);
  const [adminQMeta, setAdminQMeta] = useState(null);
  const [confirmEarlyEndOpen, setConfirmEarlyEndOpen] = useState(false);
  const [exitSheetOpen, setExitSheetOpen] = useState(false);
  const endPromptRef = useRef(false);
  const hesbahPlayerEndRef = useRef(false);
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

  const roundSummary = useMemo(() => {
    const raw = game?.roundSummary;
    if (!Array.isArray(raw)) return [];
    return raw.map((row) => ({
      ...row,
      player: players[row.playerId] || {
        name: row.name || '—',
        initials: (row.name || '?').slice(0, 2),
        colorIdx: 0,
      },
    }));
  }, [game?.roundSummary, players]);

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
      setShieldActive(false);
      setConfidenceActive(false);
      setEditPending(false);
    }
    prevQuestionRef.current = q;
  }, [game?.currentQ, game?.phase]);

  /** مسح الإجابة المحلية عند إعادة ضبط الجولة من Firebase — لا يُطبَّق أثناء وضع التعديل */
  useEffect(() => {
    const sub = me?.submitted;
    if (sub === false && prevSubmittedRef.current === true && !editPending) {
      setAnswerText('');
      setChosenScore(null);
      setShieldActive(false);
      setConfidenceActive(false);
      setEditPending(false);
    }
    if (sub !== undefined) prevSubmittedRef.current = sub;
  }, [me?.submitted, editPending]);

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
      const { pool, bankMeta, cursorState } = JSON.parse(raw);
      if (bankMeta) qBankMetaRef.current = bankMeta;
      const flat = flattenHesbahPool(normalizePoolToStructured(pool));
      if (!flat.length) return null;
      return createQuestionCursor(flat, {
        startPtr: cursorState?.ptr ?? 0,
        savedOrder: cursorState?.order,
      });
    } catch {
      return null;
    }
  }, []);

  const persistPoolCursor = useCallback((room) => {
    if (!room || !qCursorRef.current?.snapshot) return;
    try {
      const raw = localStorage.getItem(poolStorageKey(room));
      if (!raw) return;
      const data = JSON.parse(raw);
      data.cursorState = qCursorRef.current.snapshot();
      localStorage.setItem(poolStorageKey(room), JSON.stringify(data));
    } catch {
      /* ignore */
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

  /* ── متسابق: نتيجة الجولة ثم الترتيب بعد «متابعة» ── */
  useEffect(() => {
    if (!roomCode || !game) return;
    if (phase === 'leaderboard') setPlayerRoundView('rank');
    else if (phase === 'question' || phase === 'grading' || phase === 'lobby' || phase === 'final' || phase === 'ended') {
      setPlayerRoundView('result');
    }
  }, [phase, roomCode, game?.currentQ]);

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
    else if (phase === 'ended') setGameScreen(isGameCancelled(game) ? 'cancelled' : 'final');
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
    if (!totalQ) {
      notify('اختر عدد الأسئلة أولاً', 'error');
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
      const poolSize = countHesbahPool(poolNorm);
      if (source !== QSOURCE.EXTERNAL && poolSize === 0) {
        notify('لا توجد أسئلة صالحة — حمّل البنك أو أضف أسئلة ثم أنشئ الغرفة', 'error');
        return;
      }
      if (source !== QSOURCE.EXTERNAL && poolSize < totalQ) {
        notify(`البنك ${poolSize} سؤالاً فقط — تحتاج ${totalQ}. أعد إعداد الأسئلة.`, 'error');
        return;
      }
      const board = buildScoreBoard(totalQ);
      const adminPid = hostUid;
      const arenaFields = await fetchArenaFieldsForJoin();
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
          ...arenaFields,
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
      if (source !== QSOURCE.EXTERNAL && poolSize < totalQ) {
        notify(
          `⚠️ البنك ${poolSize} سؤالاً والمسابقة ${totalQ} جولة — لن يُكرَّر السؤال؛ عند النفاد «سؤال من المشرف»`,
          'gold'
        );
      }
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
        const arenaFields = await fetchArenaFieldsForJoin();
        await set(newRef, { ...hesbahPlayerPayload(name, colorIdx), ...arenaFields, board });
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
    const cursor = qCursorRef.current;
    const q = cursor?.next();
    if (!q) {
      setAdminQMeta(null);
      if (cursor?.total?.() > 0 && cursor.remaining?.() === 0) {
        notify('⚠️ نفد بنك الأسئلة — السؤال التالي «من المشرف»', 'gold');
      }
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
    persistPoolCursor(roomCode);
    return q;
  };

  const resetRoundAnswers = async () => {
    await remove(dbRef(db, `srooms/${roomCode}/answers`));
    await remove(dbRef(db, `srooms/${roomCode}/hostAnswer`));
    const resets = {};
    Object.keys(players).forEach((pid) => {
      resets[`srooms/${roomCode}/players/${pid}/submittedAnswer`] = null;
      resets[`srooms/${roomCode}/players/${pid}/chosenScore`] = null;
      resets[`srooms/${roomCode}/players/${pid}/shieldActive`] = false;
      resets[`srooms/${roomCode}/players/${pid}/confidenceActive`] = false;
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
      [`srooms/${roomCode}/game/roundSummary`]: null,
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
      roundSummary: null,
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
    setShieldActive(false);
    setConfidenceActive(false);
    setEditPending(false);
  };

  const onSetSpecial = async (mode) => {
    if (game?.phase !== 'question') return;
    if (game?.deadline && game.deadline <= Date.now()) {
      notify('انتهى وقت الجولة', 'gold');
      return;
    }
    const labels = HESBAH_SPECIAL_LABELS;
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
        : `تم اختيار ${labels[mode] || mode} — يظهر للمتسابقين عند بدء المؤقت`,
      'gold'
    );
  };

  const onEndTimer = async () => {
    await update(dbRef(db, `srooms/${roomCode}/game`), { phase: 'grading', deadline: Date.now() });
  };

  const submitAnswer = async () => {
    if (!myId) return;
    if (!game?.deadline || game.deadline <= Date.now()) {
      notify('انتهى الوقت', 'gold');
      return;
    }

    const text = answerText.trim();
    if (!text) return;

    if (editPending && me?.submitted) {
      setSubmitting(true);
      try {
        await update(dbRef(db, `srooms/${roomCode}/players/${myId}`), {
          submittedAnswer: text,
        });
        const prev = answers?.[myId] || {};
        await update(dbRef(db, `srooms/${roomCode}/answers/${myId}`), {
          ...prev,
          answer: text,
          edited: true,
          editedAt: Date.now(),
        });
        setEditPending(false);
        notify('✅ تم تحديث إجابتك', 'success');
      } catch {
        notify('تعذّر إرسال التعديل', 'error');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (me?.submitted) return;
    let score = game?.finalVoteResult ? game.finalVoteResult : chosenScore;
    if (!game?.finalVoteResult && game?.specialRound === 'lucky') {
      const rolled = pickRandomAvailableScore(me?.board, game?.totalQ);
      if (!rolled) {
        notify('لا توجد درجات متاحة للسحب', 'error');
        return;
      }
      score = rolled;
    } else if (!game?.finalVoteResult && game?.specialRound === 'siege') {
      const min = siegeMinScore(game?.totalQ);
      const rolled = pickHighestAvailableScore(me?.board, game?.totalQ, min);
      if (!rolled) {
        notify(`⚔️ حصار — لا توجد درجات ${min}+ متاحة`, 'error');
        return;
      }
      score = rolled;
    } else if (!game?.finalVoteResult && !isScorelessPickSpecial(game?.specialRound) && !score) {
      return;
    }
    if (!text || !score) return;
    setSubmitting(true);
    try {
      const useShield = shieldActive && !me?.shieldUsed;
      const useConfidence = confidenceActive && !me?.confidenceUsed;
      const board = { ...(me.board || {}) };
      const key = String(score);
      if (!game?.finalVoteResult) board[key] = BOARD_CELL.USED;

      await update(dbRef(db, `srooms/${roomCode}/players/${myId}`), {
        submittedAnswer: text,
        chosenScore: score,
        shieldActive: useShield,
        confidenceActive: useConfidence,
        submitted: true,
        board,
        ...(useShield ? { shieldUsed: true } : {}),
        ...(useConfidence ? { confidenceUsed: true } : {}),
      });
      await set(dbRef(db, `srooms/${roomCode}/answers/${myId}`), {
        answer: text,
        chosenScore: score,
        shieldActive: useShield,
        confidenceUsed: useConfidence,
        ts: Date.now(),
      });
      setEditPending(false);
      notify('✅ تم الإرسال', 'success');
    } catch {
      notify('تعذّر الإرسال', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onEditAnswer = async () => {
    if (!myId || !me?.submitted || me?.editUsed || editPending) return;
    if (!game?.deadline || game.deadline <= Date.now()) {
      notify('انتهى وقت التعديل', 'gold');
      return;
    }
    try {
      const prevText = me?.submittedAnswer || answerText;
      await update(dbRef(db, `srooms/${roomCode}/players/${myId}`), {
        editUsed: true,
      });
      setAnswerText(prevText);
      setEditPending(true);
      notify('✏️ عدّل إجابتك ثم اضغط إرسال التعديل', 'gold');
    } catch {
      notify('تعذّر التعديل', 'error');
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
    const dupKeys = new Set(dupGroups.map((g) => g.dedupeKey || answerDedupeKey(g.answer)));
    const dupGroupForKey = (answerKey) =>
      dupGroups.find((g) => (g.dedupeKey || answerDedupeKey(g.answer)) === answerKey);
    const spec = game?.specialRound;
    const currentQ = game?.currentQ || 1;
    const summary = [];
    const playerUpdates = {};
    const hotStreak = { ...(game?.hotStreak || {}) };

    Object.entries(answers).forEach(([pid, row]) => {
      const p = players[pid] || {};
      const key = answerDedupeKey(row.answer);
      const v = verdicts[pid];
      let delta = 0;
      let correct = false;
      const base = row.chosenScore || 0;
      const bKey = String(base);
      const isDupMarked = dupKeys.has(key) && duplicateMarked[key];

      const dupGroup = dupGroupForKey(key);
      const shieldProtects = isDupMarked && isShieldProtectedDuplicate(row, dupGroup);

      if (isDupMarked && shieldProtects) {
        correct = true;
        delta = gradedPoints(base, true, spec, { confidenceUsed: !!row.confidenceUsed });
        const board = { ...(playerUpdates[`srooms/${roomCode}/players/${pid}/board`] || p.board || {}) };
        board[bKey] = boardCellForCorrect(spec);
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
      } else if (isDupMarked) {
        delta = -riskDeduction(base, spec);
        const board = { ...(playerUpdates[`srooms/${roomCode}/players/${pid}/board`] || p.board || {}) };
        board[bKey] = BOARD_CELL.BURNED;
        playerUpdates[`srooms/${roomCode}/players/${pid}/board`] = board;
        playerUpdates[`srooms/${roomCode}/players/${pid}/consecutiveCorrect`] = 0;
        playerUpdates[`srooms/${roomCode}/players/${pid}/isOnFire`] = false;
        hotStreak[pid] = 0;
      } else if (v === 'correct') {
        correct = true;
        delta = gradedPoints(base, true, spec, { confidenceUsed: !!row.confidenceUsed });
        const board = { ...(p.board || {}) };
        board[bKey] = boardCellForCorrect(spec);
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
        delta = gradedPoints(base, false, spec);
        const board = { ...(p.board || {}) };
        board[bKey] = BOARD_CELL.BURNED;
        playerUpdates[`srooms/${roomCode}/players/${pid}/board`] = board;
        playerUpdates[`srooms/${roomCode}/players/${pid}/consecutiveCorrect`] = 0;
        playerUpdates[`srooms/${roomCode}/players/${pid}/isOnFire`] = false;
        hotStreak[pid] = 0;
      }

      if (delta !== 0 || v === 'correct' || v === 'wrong' || isDupMarked) {
        const newTotal = (p.totalScore || 0) + delta;
        playerUpdates[`srooms/${roomCode}/players/${pid}/totalScore`] = newTotal;
        summary.push({
          playerId: pid,
          name: p.name,
          player: p,
          delta,
          correct,
          shieldProtected: shieldProtects,
          risk2x: spec === 'risk2x' && (v === 'wrong' || (isDupMarked && !shieldProtects)),
        });
      }
    }); 

    Object.entries(players).forEach(([pid, p]) => {
      if (p.isHost || !isActiveHesbahPlayer(p)) return;
      if (summary.some((s) => s.playerId === pid)) return;
      summary.push({
        playerId: pid,
        name: p.name,
        delta: 0,
        correct: false,
        missed: true,
      });
    });

    summary.sort((a, b) => b.delta - a.delta);

    const roundSummaryPayload = summary.map(({ playerId, name, delta, correct, risk2x, missed }) => ({
      playerId,
      name,
      delta,
      correct: !!correct,
      risk2x: !!risk2x,
      missed: !!missed,
    }));

    try {
      await update(dbRef(db), {
        ...playerUpdates,
        [`srooms/${roomCode}/game/phase`]: 'roundResult',
        [`srooms/${roomCode}/game/hotStreak`]: hotStreak,
        [`srooms/${roomCode}/game/specialRound`]: null,
        [`srooms/${roomCode}/game/roundSummary`]: roundSummaryPayload,
      });
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

  const cancelCompetition = async () => {
    try {
      await recordSessionEnd('hesbah', roomCode, true);
      await update(dbRef(db, `srooms/${roomCode}/game`), {
        phase: 'ended',
        cancelled: true,
        endedAt: Date.now(),
      });
      clearHesbahSession();
      notify('تم إلغاء المسابقة — المتسابقون سيُخرجون', 'info');
    } catch {
      notify('تعذّر إلغاء المسابقة', 'error');
    }
  };

  const cancelCompetitionFromExit = async () => {
    setExitSheetOpen(false);
    await cancelCompetition();
    resetHesbahRoomState();
  };

  const requestEarlyEnd = async () => {
    if (!hasHesbahCompetitionStarted(game)) {
      await cancelCompetition();
      return;
    }
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

  const competitionStarted = hasHesbahCompetitionStarted(game);

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

  const resetHesbahRoomState = () => {
    setRoomCode('');
    setRole(null);
    setMyId(null);
    setGame(null);
    setPlayers({});
    setAnswers({});
    setHostAnswer(null);
    setVotes({});
    setAnswerText('');
    setChosenScore(null);
    setInsuranceActive(false);
    setGameScreen('home');
  };

  const pauseFromGame = async () => {
    setExitSheetOpen(false);
    const code = roomCode;
    const pid = myId;
    const savedRole = role;
    const savedName = players[pid]?.name || joinName;

    if (savedRole === 'admin' && code) {
      recordSessionEnd('hesbah', code, false).catch(() => {});
      persistHesbahSession({ roomCode: code, role: 'admin', myId: pid, myName: savedName });
    } else if (savedRole === 'player' && code && pid) {
      persistHesbahSession({ roomCode: code, role: 'player', myId: pid, myName: savedName });
    }

    setSavedSession(readSavedHesbah());
    resetHesbahRoomState();
    notify('يمكنك العودة للغرفة من شاشة اللعبة', 'info');
  };

  const withdrawFromCompetition = async () => {
    setExitSheetOpen(false);
    const code = roomCode;
    const pid = myId;

    clearHesbahSession();
    setSavedSession({});
    resetHesbahRoomState();
    notify('انسحبت من المسابقة — يمكنك العودة برمز الغرفة ونفس اسمك', 'info');

    if (pid && code) {
      purgePlayerFromRoom(code, pid).catch(() => {});
    }
  };

  const withdrawToArena = async () => {
    setExitSheetOpen(false);
    const code = roomCode;
    const withdrawingRole = role;
    const pid = myId;

    try {
      if (withdrawingRole === 'player' && pid && code) {
        await purgePlayerFromRoom(code, pid);
      } else if (withdrawingRole === 'admin' && code) {
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

    leaveToArena();
    notify('عدت لساحة الألعاب', 'info');
  };

  useEffect(() => {
    if (phase === 'final' && role === 'admin') void endGame();
  }, [phase, role]);

  useEffect(() => {
    if (phase !== 'final' || role !== 'player' || !onGameEnd || !roomCode) return;
    if (isGameCancelled(game)) return;
    if (hesbahPlayerEndRef.current) return;
    hesbahPlayerEndRef.current = true;

    const ranked = sortedHesbahPlayers(players);
    const rankIdx = ranked.findIndex((p) => p.id === myId);
    const rank = rankIdx >= 0 ? rankIdx + 1 : ranked.length || null;
    const winnerName = ranked[0]?.name || '—';

    onGameEnd({
      game: 'hesbah',
      roomCode,
      winner: winnerName,
      playerStats: rank != null ? { rank } : null,
    });
  }, [phase, role, onGameEnd, roomCode, players, myId, game]);

  /** عودة تلقائية للغرفة المحفوظة — مثل الألقاب والقميري */
  useEffect(() => {
    if (sessionGate !== 'checking') return undefined;
    let cancelled = false;
    void (async () => {
      await reconnectToSavedRoom();
      if (!cancelled) setSessionGate('ready');
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderMain = () => {
    if (sessionGate === 'checking') {
      return <GameSessionChecking emoji="🎯" />;
    }
    if (showGuide) {
      return <HesbahGuideModal onClose={() => setShowGuide(false)} />;
    }
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
            <HesbahTopNav onBack={() => setSelectedGame(null)} variant="arena" />
          </div>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: 48 }}>🎯</div>
            <div className="ptitle">حَسْبة</div>
            <span className="hesbah-hero-badge">🎯 ساحة حَسْبة — كل درجة رهان</span>
            <div className="psub">اربط السؤال برقم درجة — صوّب بذكاء قبل أن يُسرق أحد درجتك</div>
          </div>
          {getOtherActiveSessions('hesbah').length > 0 && (
            <div className="game-multi-session-hint">
              لديك جلسة نشطة في: {formatOtherSessionsHint(getOtherActiveSessions('hesbah'))}
            </div>
          )}
          {savedSession.roomCode && !roomCode && (
            <button type="button" className="btn bo" onClick={() => void reconnectToSavedRoom()}>
              🔙 العودة للغرفة ({savedSession.roomCode})
            </button>
          )}
          <div className="card" style={{ marginTop: 8 }}>
            <button type="button" className="btn bg" onClick={() => (canCreateRoom ? setShowOnboarding('admin') : onRequestActivation?.())}>
              👑 إنشاء غرفة
            </button>
            <button type="button" className="btn bo mt2" onClick={() => setShowOnboarding('player')}>
              🎮 انضمام برمز الغرفة
            </button>
            <button type="button" className="btn bgh mt2" onClick={() => setShowGuide(true)}>
              📖 كيف تلعب؟ — دليل المشرف والمتسابق
            </button>
            <div className="div">قوانين سريعة</div>
            {[
              '🎯 كل درجة على لوحتك تُستخدم مرة واحدة — اخترها بذكاء',
              '🔒 لا ترى إجابات أحد حتى ترسل — ضد التكرار',
              '✍️ الإجابة الكتابية — التكرار أو الجهل أكثر أسباب الخطأ',
              '⚡ كروت إثارة للمشرف + درع وتعديل وثقة للمتسابق (مرة للمسابقة)',
              '🗳️ بعد آخر جولة: تصويت على قيمة السؤال الحاسم',
              '🏆 أعلى مجموع نقاط يفوز',
            ].map((r, i) => (
              <div key={i} className="game-rule-row">
                {r}
              </div>
            ))}
          </div>
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
            <button type="button" className="btn bgh mt2" onClick={() => setShowGuide(true)}>
              📖 كيف تلعب؟
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
          onOpenGuide={() => setShowGuide(true)}
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
          shieldActive={shieldActive}
          setShieldActive={setShieldActive}
          confidenceActive={confidenceActive}
          setConfidenceActive={setConfidenceActive}
          editPending={editPending}
          onEditAnswer={() => void onEditAnswer()}
          onSubmit={() => void submitAnswer()}
          submitting={submitting}
          finalVoteActive={game?.finalVoteActive}
          myVote={votes[myId]}
          onVote={(v) => void onVote(v)}
          voteCountdown={voteCountdown}
          onExitRequest={openExitSheet}
          onOpenGuide={() => setShowGuide(true)}
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
          onOpenGuide={() => setShowGuide(true)}
        />
      );
    }

    if (gameScreen === 'roundResult') {
      if (role === 'player' && playerRoundView === 'rank') {
        return (
          <HesbahPlayerLeaderboard
            roomCode={roomCode}
            players={players}
            myId={myId}
            game={game}
            onExitRequest={openExitSheet}
          />
        );
      }
      return (
        <HesbahResults
          roomCode={roomCode}
          game={game}
          players={players}
          me={me}
          myId={myId}
          roundSummary={roundSummary}
          showHud={role === 'player'}
          onExitRequest={openExitSheet}
          onContinue={() => (role === 'admin' ? void onLeaderboard() : setPlayerRoundView('rank'))}
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
              <button type="button" className="btn br game-admin-end-btn mt2" onClick={() => setConfirmEarlyEndOpen(true)}>
                🏁 إنهاء اللعبة وإعلان الفائز
              </button>
            )}
          </div>
        );
      }
      return (
        <HesbahPlayerLeaderboard
          roomCode={roomCode}
          players={players}
          myId={myId}
          game={game}
          onExitRequest={openExitSheet}
        />
      );
    }

    if (gameScreen === 'cancelled') {
      return (
        <div className="scr hesbah-theme hesbah-admin">
          <div className="hesbah-sticky-chrome">
            <HesbahTopNav onBack={openExitSheet} />
          </div>
          <GameCancelledScreen
            gameLabel="مسابقة حَسْبة"
            roomCode={roomCode}
            onHome={leaveToArena}
            hint="يمكن للمشرف إنشاء غرفة جديدة في أي وقت"
          />
        </div>
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
        onPause={() => void pauseFromGame()}
        onQuit={role === 'admin' ? () => void cancelCompetitionFromExit() : () => void withdrawFromCompetition()}
        onArena={() => void withdrawToArena()}
        onClose={() => setExitSheetOpen(false)}
      />
    </>
  );
});

export default HesbahGame;
