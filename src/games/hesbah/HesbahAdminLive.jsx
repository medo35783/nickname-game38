import { useEffect, useMemo, useState } from 'react';
import Av from '../../shared/Av';
import LiveConnectionBar from '../titles/LiveConnectionBar';
import HesbahCountdown from './HesbahCountdown';
import HesbahRoomMeta from './HesbahRoomMeta';
import HesbahAdminTools from './HesbahAdminTools';
import HesbahAdminLeaderboard from './HesbahAdminLeaderboard';
import {
  groupDuplicateAnswers,
  uniqueAnswerEntries,
  normalizeAnswer,
  questionDurationSec,
  activeRoundSecs,
  HESBAH_SPECIAL_TOOLS,
  HESBAH_ACCENT_CSS,
  HESBAH_SCORE_BG_CSS,
  HESBAH_BORDER_CSS,
  hesbahHostQuestionFlags,
} from './HesbahHelpers';
import HesbahQuestionPanel from './HesbahQuestionPanel';
import HesbahTimerPicker from './HesbahTimerPicker';
import { HesbahPanelTitle, HESBAH_HOST_ANSWER_HELP, HESBAH_LIVE_HOST_HELP, HESBAH_LIVE_OPS_HELP, HESBAH_ROSTER_HELP } from './HesbahHelpTip';
import HesbahLiveAnswersPanel, {
  HesbahParticipantRoster,
  useHesbahLiveAnswers,
} from './HesbahLiveAnswers';
import HesbahConfirmModal from './HesbahConfirmModal';
import HesbahTopNav from './HesbahTopNav';

const PHASE_LABELS = {
  question: 'جولة سؤال',
  grading: 'تصحيح',
  roundResult: 'نتيجة',
  leaderboard: 'ترتيب',
};

function activeSpecialLabel(id) {
  return HESBAH_SPECIAL_TOOLS.find((t) => t.id === id)?.title;
}

export default function HesbahAdminLive({
  roomCode,
  game,
  players,
  answers,
  supervisorNotes = '',
  hostAnswer,
  countdown,
  onSetSpecial,
  onHostSubmit,
  hostDraft,
  setHostDraft,
  verdicts,
  setVerdicts,
  duplicateMarked,
  setDuplicateMarked,
  onShowResult,
  onLeaderboard,
  onNextQuestion,
  onStartTimer,
  onEndTimer,
  onRoundSecsChange,
  onClearRoundSecs,
  onRequestEarlyEnd,
  canEarlyEnd = false,
  onExitRequest,
  hostParticipates,
}) {
  const [adminTab, setAdminTab] = useState('round');
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const phase = game?.phase || 'question';
  const grading = phase === 'grading';
  const timerWaiting = phase === 'question' && !game?.deadline;
  const timerRunning = !!(game?.deadline && game.deadline > Date.now());
  const maxSec = questionDurationSec(game);
  const roundSecsUi = activeRoundSecs(game);
  const hasRoundOverride = game?.roundSecs != null && game?.specialRound !== 'speed';
  const totalQ = game?.totalQ || 15;
  const currentQ = game?.currentQ || 1;
  const special = game?.specialRound;
  const progressPct = Math.min(100, Math.round((currentQ / totalQ) * 100));
  const hostQuestion =
    game?.hostQuestionText?.trim() || game?.questionText?.trim() || '';
  const hostFlags = hesbahHostQuestionFlags(game);

  useEffect(() => {
    if (phase === 'question' || phase === 'grading') setAdminTab('round');
  }, [phase, currentQ]);

  const dupGroups = useMemo(
    () => groupDuplicateAnswers(answers, players, hostParticipates ? hostAnswer : null),
    [answers, players, hostAnswer, hostParticipates]
  );
  const dupKeys = useMemo(
    () => new Set(dupGroups.map((g) => normalizeAnswer(g.answer))),
    [dupGroups]
  );
  const uniques = useMemo(
    () => uniqueAnswerEntries(answers, players, dupKeys),
    [answers, players, dupKeys]
  );

  const allGraded = useMemo(() => {
    const ids = Object.keys(answers || {});
    if (!ids.length) return true;
    return ids.every((id) => {
      const key = normalizeAnswer(answers[id]?.answer);
      if (dupKeys.has(key)) return duplicateMarked[key] !== undefined;
      return verdicts[id] === 'correct' || verdicts[id] === 'wrong';
    });
  }, [answers, dupKeys, duplicateMarked, verdicts]);

  const toggleVerdict = (pid, v) => {
    setVerdicts((prev) => ({
      ...prev,
      [pid]: prev[pid] === v ? null : v,
    }));
  };

  const markDuplicate = (answerKey, marked) => {
    setDuplicateMarked((prev) => ({ ...prev, [answerKey]: marked }));
  };

  const { liveCards, roster, hostSent } = useHesbahLiveAnswers(
    answers,
    players,
    hostAnswer,
    hostParticipates
  );

  const timerNeedsStart = timerWaiting && phase === 'question';

  const timerColumn = (
    <div
      className={`hesbah-admin-split__col hesbah-admin-split__timer ${
        timerNeedsStart ? 'hesbah-admin-split__timer--attention' : ''
      }`}
    >
      <HesbahPanelTitle>⏱ المؤقت</HesbahPanelTitle>
      {timerWaiting ? (
        <>
          {hostFlags.oralHidden ? (
            <p className="hesbah-admin-timer-hint hesbah-admin-timer-hint--oral">🎙️ بدون نص للاعبين — استمعوا لك</p>
          ) : hostFlags.revealsOnTimer ? (
            <p className="hesbah-admin-timer-hint">📱 السؤال يظهر للاعبين بعد «بدء المؤقت»</p>
          ) : null}
          <p className="hesbah-admin-micro">افتراضي {game?.questionSecs ?? 20} ث</p>
          {game?.specialRound !== 'speed' && (
            <>
              <HesbahTimerPicker compact activeSecs={roundSecsUi} onSelect={onRoundSecsChange} />
              {hasRoundOverride && (
                <button type="button" className="btn bgh bsm hesbah-admin-reset-secs" onClick={onClearRoundSecs}>
                  ↩ افتراضي
                </button>
              )}
            </>
          )}
          <button
            type="button"
            className="btn bg hesbah-admin-start-timer hesbah-admin-start-timer--attention"
            onClick={onStartTimer}
          >
            ▶ بدء المؤقت ({maxSec} ث)
          </button>
        </>
      ) : (
        <div className="hesbah-admin-timer-live">
          <HesbahCountdown
            remaining={countdown}
            maxSeconds={maxSec}
            size={44}
            waiting={false}
          />
          <p className="hesbah-admin-micro">
            {timerRunning ? 'العدّ جارٍ' : 'انتهى الوقت'}
          </p>
        </div>
      )}
    </div>
  );

  const hostColumn = hostParticipates && (
    <div className="hesbah-admin-split__col hesbah-admin-split__host">
      <HesbahPanelTitle help={HESBAH_HOST_ANSWER_HELP} helpLabel="إجابة العرض">
        👑 إجابتك
      </HesbahPanelTitle>
      <input
        className="inp hesbah-admin-host-inp"
        placeholder="إجابتك…"
        value={hostDraft.answer}
        onChange={(e) => setHostDraft((d) => ({ ...d, answer: e.target.value }))}
      />
      <button
        type="button"
        className="btn bgh bsm hesbah-admin-host-send"
        disabled={!hostDraft.answer?.trim()}
        onClick={onHostSubmit}
      >
        📤 إرسال
      </button>
    </div>
  );

  return (
    <div className="scr hesbah-theme hesbah-admin">
      <div className="hesbah-sticky-chrome">
        <LiveConnectionBar connected roomCode={roomCode} />
        {typeof onExitRequest === 'function' && (
          <HesbahTopNav onBack={onExitRequest} />
        )}
        <nav className="hesbah-admin-tabs hesbah-player-tabs" aria-label="لوحة المشرف">
          <button
            type="button"
            className={`hesbah-admin-tabs__btn ${adminTab === 'round' ? 'is-active' : ''}`}
            onClick={() => setAdminTab('round')}
          >
            🎯 الجولة
          </button>
          <button
            type="button"
            className={`hesbah-admin-tabs__btn ${adminTab === 'rank' ? 'is-active' : ''}`}
            onClick={() => setAdminTab('rank')}
          >
            🏆 الترتيب
          </button>
        </nav>
      </div>

      <header className="hesbah-admin-hero">
        <div className="hesbah-admin-hero__top">
          <div className="hesbah-admin-hero__left">
            <div className="hesbah-admin-hero__badge">{PHASE_LABELS[phase] || phase}</div>
            {roomCode && (
              <HesbahRoomMeta roomCode={roomCode} className="hesbah-room-meta--hero" />
            )}
          </div>
          {timerWaiting && phase === 'question' && (
            <span className="hesbah-admin-hero__timer-pill hesbah-admin-hero__timer-pill--wait">
              ⏸ لم يبدأ
            </span>
          )}
          {timerRunning && (
            <span className="hesbah-admin-hero__timer-pill">⏱ {countdown ?? maxSec} ث</span>
          )}
        </div>
        <div className="hesbah-admin-hero__progress" aria-hidden>
          <div className="hesbah-admin-hero__progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="hesbah-admin-hero__meta">
          <span className="hesbah-admin-hero__q">
            جولة <strong>{currentQ}</strong>
            <span className="hesbah-admin-hero__sep">/</span>
            {totalQ}
          </span>
          {special && (
            <span className="hesbah-admin-hero__special">{activeSpecialLabel(special)}</span>
          )}
          {canEarlyEnd && (
            <button
              type="button"
              className="hesbah-admin-early-end"
              onClick={() => setConfirmEndOpen(true)}
            >
              🏁 إنهاء وإعلان الفائز
            </button>
          )}
        </div>
      </header>

      {adminTab === 'rank' ? (
        <HesbahAdminLeaderboard players={players} roomCode={roomCode} game={game} />
      ) : (
        <>
          {phase === 'question' && (
            <section className="hesbah-admin-panel hesbah-admin-tools-panel">
              <HesbahAdminTools
                activeSpecial={special}
                timerRunning={timerRunning}
                onSetSpecial={onSetSpecial}
                onEndTimer={onEndTimer}
              />
            </section>
          )}

          <HesbahQuestionPanel
            role="host"
            questionText={hostQuestion}
            hostOralHidden={hostFlags.oralHidden}
            supervisorNotes={supervisorNotes}
            status={
              timerRunning || grading ? (
                <div
                  className={`hesbah-admin-status ${
                    grading ? 'hesbah-admin-status--grade' : 'hesbah-admin-status--run'
                  }`}
                >
                  {grading ? '✋ تصحيح' : '⏱ جارٍ'}
                </div>
              ) : null
            }
          />

          {phase === 'question' && (
            <section className="hesbah-admin-panel hesbah-admin-controls">
              <div
                className={`hesbah-admin-split ${!hostParticipates ? 'hesbah-admin-split--solo' : ''}`}
              >
                {timerColumn}
                {hostColumn}
              </div>
            </section>
          )}

          {phase === 'question' && (
            <HesbahParticipantRoster
              roster={roster}
              help={HESBAH_ROSTER_HELP}
              hostPending={hostParticipates && !hostSent}
            />
          )}

          {phase === 'question' && !hostParticipates && (
            <HesbahLiveAnswersPanel
              highlight
              title="📡 مباشر"
              help={HESBAH_LIVE_OPS_HELP}
              cards={liveCards}
              emptyMessage={
                timerRunning
                  ? 'بانتظار أول إجابة…'
                  : 'بعد بدء المؤقت تظهر الإجابات هنا مباشرة'
              }
            />
          )}

          {phase === 'question' && hostParticipates && hostSent && (
            <HesbahLiveAnswersPanel
              title="📡 حيّ"
              help={HESBAH_LIVE_HOST_HELP}
              cards={liveCards}
              emptyMessage="بانتظار إجابات الآخرين…"
            />
          )}

          {grading && (
            <>
              {hostParticipates && hostAnswer?.answer?.trim() && (
                <section
                  className="hesbah-admin-panel hesbah-admin-ref"
                  style={{
                    borderColor: HESBAH_ACCENT_CSS,
                    background: HESBAH_SCORE_BG_CSS,
                  }}
                >
                  <h3 className="hesbah-admin-panel__title">👑 مرجع المشرف</h3>
                  <p className="hesbah-admin-ref__answer">{hostAnswer.answer}</p>
                </section>
              )}

              {dupGroups.length > 0 && (
                <section className="hesbah-admin-panel">
                  <h3 className="hesbah-admin-panel__title">🔁 إجابات مكررة</h3>
                  {dupGroups.map((g) => {
                    const key = normalizeAnswer(g.answer);
                    const marked = duplicateMarked[key];
                    return (
                      <div
                        key={key}
                        className={`hesbah-grade-box hesbah-admin-grade ${marked ? 'is-marked-dup' : ''}`}
                      >
                        <div className="hesbah-admin-grade__answer">{g.answer}</div>
                        <div className="hesbah-admin-grade__who">
                          {g.items.map((it) =>
                            it.isHost
                              ? `👑 ${it.name} (عرض)`
                              : `${it.name} · درجة ${it.chosenScore ?? '—'}`
                          ).join(' · ')}
                        </div>
                        {g.items.some((it) => it.isHost) && (
                          <div className="hesbah-admin-grade__warn">⚠ تطابق مع المشرف</div>
                        )}
                        <button
                          type="button"
                          className={`btn bsm ${marked ? 'bg' : 'bgh'}`}
                          style={marked ? { background: 'var(--red)' } : undefined}
                          onClick={() => markDuplicate(key, !marked)}
                        >
                          {marked ? '✓ مكرر — صفر' : 'اعتماد كتكرار'}
                        </button>
                      </div>
                    );
                  })}
                </section>
              )}

              <section className="hesbah-admin-panel">
                <h3 className="hesbah-admin-panel__title">✨ إجابات فريدة</h3>
                {uniques.length === 0 ? (
                  <p className="hesbah-admin-panel__hint">لا توجد إجابات فريدة</p>
                ) : (
                  uniques.map((u) => {
                    const v = verdicts[u.playerId];
                    return (
                      <div
                        key={u.playerId}
                        className={`hesbah-grade-box hesbah-admin-grade ${
                          v === 'correct' ? 'is-correct' : v === 'wrong' ? 'is-wrong' : ''
                        }`}
                      >
                        <div className="hesbah-admin-grade__row">
                          <Av p={u.player} sz={36} />
                          <div>
                            <div className="hesbah-admin-grade__name">{u.player?.name}</div>
                            <div className="hesbah-admin-grade__answer">{u.answer}</div>
                            <div className="hesbah-admin-grade__score">درجة: {u.chosenScore}</div>
                          </div>
                        </div>
                        <div className="hesbah-admin-grade__actions">
                          <button
                            type="button"
                            className={`btn bsm ${v === 'correct' ? 'bg' : 'bgh'}`}
                            onClick={() => toggleVerdict(u.playerId, 'correct')}
                          >
                            ✅ صحيح
                          </button>
                          <button
                            type="button"
                            className={`btn bsm ${v === 'wrong' ? 'bg' : 'bgh'}`}
                            style={v === 'wrong' ? { background: 'var(--red)' } : undefined}
                            onClick={() => toggleVerdict(u.playerId, 'wrong')}
                          >
                            ❌ خطأ
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </section>

              {!allGraded && (
                <p className="hesbah-admin-footnote">صنّف الكل ثم أظهر النتيجة</p>
              )}
              <button type="button" className="btn bg hesbah-admin-cta" disabled={!allGraded} onClick={onShowResult}>
                📊 إظهار النتيجة
              </button>
            </>
          )}

          {phase === 'roundResult' && (
            <button type="button" className="btn bg hesbah-admin-cta" onClick={onLeaderboard}>
              🏆 عرض الترتيب للجميع
            </button>
          )}

          {phase === 'leaderboard' && (
            <>
              <button type="button" className="btn bg hesbah-admin-cta" onClick={onNextQuestion}>
                ➡ السؤال التالي
              </button>
              {canEarlyEnd && (
                <button
                  type="button"
                  className="btn br hesbah-admin-cta hesbah-admin-cta--end"
                  onClick={() => setConfirmEndOpen(true)}
                >
                  🏁 إنهاء المسابقة وإعلان الفائز
                </button>
              )}
            </>
          )}
        </>
      )}

      <HesbahConfirmModal
        open={confirmEndOpen}
        title="إنهاء المسابقة؟"
        message={`هل أنت متأكد من إنهاء المسابقة وإعلان الفائز؟${currentQ < totalQ ? ` (تبقّى ${totalQ - currentQ} جولة)` : ''}`}
        confirmLabel="نعم، أعلن الفائز"
        cancelLabel="متابعة اللعب"
        danger
        onCancel={() => setConfirmEndOpen(false)}
        onConfirm={() => {
          setConfirmEndOpen(false);
          onRequestEarlyEnd?.();
        }}
      />
    </div>
  );
}
