import SniperCountdown from './SniperCountdown';
import SniperQuestionPanel from './SniperQuestionPanel';
import SniperPlayerHud from './SniperPlayerHud';
import SniperScoreGrid from './SniperScoreGrid';
import { LiveAnswerCard, useSniperLiveAnswers } from './SniperLiveAnswers';
import {
  questionDurationSec,
  isTimerRunning,
  isTimerWaiting,
  sniperPlayerQuestionView,
  FINAL_VOTE_OPTIONS,
  FINAL_VOTE_SECONDS,
  SNIPER_ACCENT_CSS,
} from './sniperHelpers';

export default function SniperPlay({
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
  insuranceActive,
  setInsuranceActive,
  onSubmit,
  submitting,
  finalVoteActive,
  myVote,
  onVote,
  voteCountdown,
}) {
  const phase = game?.phase;
  const isFinalBet = !!game?.finalVoteResult && game?.currentQ > (game?.totalQ || 0);
  const qView = sniperPlayerQuestionView(game);
  const maxSec = questionDurationSec(game);
  const submitted = !!me?.submitted;
  const timerWaiting = isTimerWaiting(game);
  const timerActive = isTimerRunning(game);
  const remaining = game?.deadline
    ? Math.max(0, Math.ceil((game.deadline - Date.now()) / 1000))
    : null;
  const inputLocked = timerWaiting && !submitted;
  const canUseInsurance = (me?.insuranceLeft || 0) > 0 && !submitted && timerActive;

  const { liveCards } = useSniperLiveAnswers(
    answers,
    players,
    hostAnswer,
    !!game?.hostParticipates
  );

  const hud = (body) => (
    <SniperPlayerHud roomCode={roomCode} me={me} myId={myId} game={game} players={players}>
      {body}
    </SniperPlayerHud>
  );

  if (finalVoteActive && phase !== 'final') {
    return hud(
      <>
        <div className="card" style={{ textAlign: 'center' }}>
          <div className="ctitle">🗳️ السؤال الحاسم — صوّت للدرجة</div>
          <SniperCountdown remaining={voteCountdown} maxSeconds={FINAL_VOTE_SECONDS} size={64} />
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>الأغلبية تحدد قيمة الرهان الأخير</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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
        {myVote && <div style={{ textAlign: 'center', fontSize: 12, color: SNIPER_ACCENT_CSS }}>✅ صوّتت بـ {myVote}</div>}
      </>
    );
  }

  if (phase === 'grading') {
    return hud(
      <div className="card" style={{ textAlign: 'center', padding: 24 }}>
        <div style={{ fontSize: 40 }}>⏳</div>
        <div style={{ fontSize: 15, fontWeight: 800, marginTop: 10 }}>انتهى الوقت — المشرف يصحّح</div>
      </div>
    );
  }

  return hud(
    <>
      <SniperQuestionPanel
        role="player"
        playerMode={qView.mode}
        maskReason={qView.reason}
        questionText={qView.text}
        blind={qView.blind}
        oral={qView.oral}
        isFinalBet={isFinalBet}
        finalBetScore={game?.finalVoteResult}
        aside={
          <SniperCountdown remaining={remaining} maxSeconds={maxSec} waiting={timerWaiting} />
        }
      />

      <div className="card">
        {timerWaiting && (
          <p className="sniper-play-hint">
            🎯 اختر درجتك أولاً — يظهر السؤال وتُكتب الإجابة بعد بدء المؤقت
          </p>
        )}
        {!isFinalBet && (
          <>
            <div className="ctitle">🎯 اختر درجتك</div>
            <SniperScoreGrid
              totalQ={game?.totalQ}
              board={me?.board}
              chosenScore={chosenScore}
              disabled={submitted}
              onPick={setChosenScore}
            />
          </>
        )}
        <div className="ctitle" style={{ marginTop: isFinalBet ? 0 : 12 }}>✍️ إجابتك</div>
        {inputLocked && (
          <p className="sniper-input-locked">🔒 الإجابة تُفتح بعد بدء المؤقت</p>
        )}
        <input
          className="inp"
          placeholder={inputLocked ? 'بانتظار بدء المؤقت…' : 'اكتب إجابتك…'}
          value={answerText}
          disabled={submitted || timerWaiting}
          readOnly={timerWaiting}
          onChange={(e) => setAnswerText(e.target.value)}
        />
        {canUseInsurance && (
          <button
            type="button"
            className={`btn ${insuranceActive ? 'bg' : 'bgh'} mt2`}
            style={{ width: '100%' }}
            onClick={() => setInsuranceActive((v) => !v)}
          >
            🛡️ تأمين ({me.insuranceLeft} متبقية) {insuranceActive ? '— مفعّل' : ''}
          </button>
        )}
        {!submitted && (
          <button
            type="button"
            className="btn bg mt2"
            disabled={
              submitting ||
              !timerActive ||
              !answerText.trim() ||
              (!isFinalBet && !chosenScore)
            }
            onClick={onSubmit}
          >
            {submitting ? '⏳' : '📤 إرسال'}
          </button>
        )}
      </div>

      {submitted && (
        <div className="card">
          <div className="ctitle">📡 البطاقات الحية</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {liveCards.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>بانتظار إجابات الآخرين…</div>
            ) : (
              liveCards.map((c) => <LiveAnswerCard key={c.id} entry={c} isHost={c.isHost} />)
            )}
          </div>
        </div>
      )}
    </>
  );
}
