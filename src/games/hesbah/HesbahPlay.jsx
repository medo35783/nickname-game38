import HesbahCountdown from './HesbahCountdown';
import HesbahQuestionPanel from './HesbahQuestionPanel';
import HesbahPlayerHud from './HesbahPlayerHud';
import HesbahScoreGrid from './HesbahScoreGrid';
import HesbahPlayerPowerBar from './HesbahPlayerPowers';
import HesbahHostSpecialBanner from './HesbahHostSpecialBanner';
import { LiveAnswerCard, useHesbahLiveAnswers } from './HesbahLiveAnswers';
import {
  questionDurationSec,
  isTimerRunning,
  isTimerWaiting,
  hesbahPlayerQuestionView,
  FINAL_VOTE_OPTIONS,
  FINAL_VOTE_SECONDS,
  HESBAH_ACCENT_CSS,
  isScorelessPickSpecial,
  shouldRevealLiveFeed,
  isDarkRound,
} from './HesbahHelpers';

function playStatusChip({ timerWaiting, timerActive, scorelessRound, activeScore, submitted, editPending }) {
  if (editPending) return { key: 'edit', text: '✏️ عدّل إجابتك ثم أعد الإرسال', cls: 'is-edit' };
  if (timerWaiting && !scorelessRound) return { key: 'pick', text: '① اختر درجتك من اللوحة', cls: 'is-pick' };
  if (timerActive && activeScore) return { key: 'score', text: `🎯 درجتك: ${activeScore}`, cls: 'is-score' };
  if (timerActive && !activeScore && !submitted) return { key: 'warn', text: '⚠️ اختر درجة من اللوحة', cls: 'is-warn' };
  if (timerActive && !submitted) return { key: 'answer', text: '② اكتب إجابتك', cls: 'is-answer' };
  if (submitted) return { key: 'sent', text: '✅ تم الإرسال', cls: 'is-sent' };
  return null;
}

export default function HesbahPlay({
  roomCode,
  game,
  me,
  myId,
  players,
  answers,
  hostAnswer,
  answerText,
  setAnswerText,
  chosenScore,
  setChosenScore,
  shieldActive,
  setShieldActive,
  confidenceActive,
  setConfidenceActive,
  editPending,
  onSubmit,
  onEditAnswer,
  submitting,
  finalVoteActive,
  myVote,
  onVote,
  voteCountdown,
  onExitRequest,
  onOpenGuide,
}) {
  const phase = game?.phase;
  const isFinalBet = !!game?.finalVoteResult && game?.currentQ > (game?.totalQ || 0);
  const qView = hesbahPlayerQuestionView(game);
  const maxSec = questionDurationSec(game);
  const submitted = !!me?.submitted;
  const timerWaiting = isTimerWaiting(game);
  const timerActive = isTimerRunning(game);
  const remaining = game?.deadline
    ? Math.max(0, Math.ceil((game.deadline - Date.now()) / 1000))
    : null;
  const scorelessRound = isScorelessPickSpecial(game?.specialRound);
  const showScoreGrid = !isFinalBet && !scorelessRound;
  const canPickScore = !submitted && !editPending;
  const activeScore = chosenScore ?? me?.chosenScore ?? null;
  const scoreForSubmit = editPending ? me?.chosenScore : activeScore;
  const showAnswerSection = !isFinalBet;
  const inputLocked = !timerActive && !editPending;
  const displayAnswer = editPending || !submitted
    ? answerText
    : (answerText || me?.submittedAnswer || '');
  const gridCompact = true;
  const canSubmit =
    (timerActive || editPending) &&
    (!submitted || editPending) &&
    !!answerText.trim() &&
    (isFinalBet || scorelessRound || !!scoreForSubmit);

  const statusChip = playStatusChip({
    timerWaiting,
    timerActive,
    scorelessRound,
    activeScore,
    submitted,
    editPending,
  });
  const showHostSpecial = timerActive && !!game?.specialRound;

  const { liveCards } = useHesbahLiveAnswers(
    answers,
    players,
    hostAnswer,
    !!game?.hostParticipates
  );
  const revealLive = shouldRevealLiveFeed(game, players, answers);

  const hud = (body) => (
    <HesbahPlayerHud
      roomCode={roomCode}
      me={me}
      myId={myId}
      game={game}
      players={players}
      onExitRequest={onExitRequest}
      onOpenGuide={onOpenGuide}
      compactAlerts
    >
      {body}
    </HesbahPlayerHud>
  );

  if (finalVoteActive && phase !== 'final') {
    return hud(
      <div className="hesbah-play-round card">
        <div style={{ textAlign: 'center' }}>
          <div className="ctitle">🗳️ السؤال الحاسم</div>
          <HesbahCountdown remaining={voteCountdown} maxSeconds={FINAL_VOTE_SECONDS} size={56} />
        </div>
        <div className="hesbah-vote-grid">
          {FINAL_VOTE_OPTIONS.map((v) => {
            const labels = { 5: 'سهل', 10: 'وسط', 15: 'صعب', 20: 'حاسم' };
            return (
              <button
                key={v}
                type="button"
                className={`btn ${myVote === v ? 'bg' : 'bgh'}`}
                disabled={!!myVote}
                onClick={() => onVote(v)}
              >
                {labels[v]} · {v}
              </button>
            );
          })}
        </div>
        {myVote && (
          <p className="hesbah-play-done" style={{ color: HESBAH_ACCENT_CSS }}>
            ✅ صوّتت بـ {myVote}
          </p>
        )}
      </div>
    );
  }

  if (phase === 'grading') {
    return hud(
      <div className="hesbah-play-round card hesbah-play-round--center">
        <div style={{ fontSize: 36 }}>⏳</div>
        <p className="hesbah-play-done">انتهى الوقت — المشرف يصحّح</p>
      </div>
    );
  }

  return hud(
    <div className="hesbah-play-round card">
      {showHostSpecial && (
        <HesbahHostSpecialBanner specialRound={game.specialRound} />
      )}

      {statusChip && (
        <div className={`hesbah-play-status ${statusChip.cls}`}>{statusChip.text}</div>
      )}

      <HesbahQuestionPanel
        role="player"
        compact
        playerMode={qView.mode}
        maskReason={qView.reason}
        questionText={qView.text}
        blind={qView.blind}
        oral={qView.oral}
        isFinalBet={isFinalBet}
        finalBetScore={game?.finalVoteResult}
        aside={
          <HesbahCountdown
            remaining={remaining}
            maxSeconds={maxSec}
            waiting={timerWaiting}
            size={48}
          />
        }
      />

      {scorelessRound && timerWaiting && (
        <p className="hesbah-play-scoreless-hint">
          {game?.specialRound === 'lucky'
            ? '🎲 حظ — اكتب إجابتك بعد بدء المؤقت'
            : '⚔️ حصار — اكتب إجابتك بعد بدء المؤقت'}
        </p>
      )}

      {/* ① الإجابة */}
      {showAnswerSection && (
        <section className="hesbah-play-flow hesbah-play-flow--answer">
          <input
            className="inp hesbah-play-answer-inp"
            placeholder={
              editPending
                ? 'عدّل إجابتك…'
                : inputLocked && !submitted
                  ? timerWaiting && !scorelessRound
                    ? 'اختر درجتك ثم انتظر المؤقت…'
                    : 'بانتظار بدء المؤقت…'
                  : 'اكتب إجابتك…'
            }
            value={displayAnswer}
            disabled={(submitted && !editPending) || inputLocked}
            readOnly={inputLocked && !editPending}
            onChange={(e) => setAnswerText(e.target.value)}
          />

          {canSubmit && (
            <button
              type="button"
              className="btn bg hesbah-play-submit"
              disabled={submitting}
              onClick={onSubmit}
            >
              {submitting
                ? '⏳ جارٍ الإرسال…'
                : editPending
                  ? '📤 إرسال التعديل'
                  : '📤 إرسال'}
            </button>
          )}
        </section>
      )}

      {/* ② أدوات الإثارة — بعد بدء المؤقت فقط */}
      {timerActive && !isFinalBet && (
        <HesbahPlayerPowerBar
          me={me}
          timerActive={timerActive}
          submitted={submitted}
          shieldActive={shieldActive}
          confidenceActive={confidenceActive}
          onToggleShield={() => setShieldActive((v) => !v)}
          onToggleConfidence={() => setConfidenceActive((v) => !v)}
          onEdit={onEditAnswer}
          editPending={editPending}
        />
      )}

      {/* ③ لوحة الأرقام */}
      {showScoreGrid && (
        <section className="hesbah-play-flow hesbah-play-flow--board">
          <HesbahScoreGrid
            totalQ={game?.totalQ}
            board={me?.board}
            chosenScore={activeScore}
            disabled={!canPickScore}
            compact={gridCompact}
            onPick={setChosenScore}
          />
        </section>
      )}

      {/* البطاقات الحية */}
      {submitted && !editPending && (
        <section className={`hesbah-play-flow hesbah-play-flow--live ${isDarkRound(game?.specialRound) ? 'is-dark' : ''}`}>
          <div className="hesbah-play-section__head">
            <span className="hesbah-play-section__title">📡 البطاقات الحية</span>
          </div>
          {!revealLive ? (
            <p className="hesbah-play-hint hesbah-play-hint--dark">
              🕶️ ظلام — النتائج بعد اكتمال الإجابات أو انتهاء الوقت
            </p>
          ) : liveCards.length === 0 ? (
            <p className="hesbah-play-wait">بانتظار إجابات الآخرين…</p>
          ) : (
            <div className="hesbah-play-live-list">
              {liveCards.map((c) => (
                <LiveAnswerCard key={c.id} entry={c} isHost={c.isHost} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
